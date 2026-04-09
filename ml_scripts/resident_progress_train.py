"""
Train resident stalling classifier from Supabase (mirrors resident-progress-classifier.ipynb).
Used by nightly_scorer.py; returns None to trigger committed joblib fallback.
"""
from __future__ import annotations

import json
from typing import Any, Tuple

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier
from supabase import Client

from nightly_scorer import build_features, fetch_table

MIN_ROWS = 12
MIN_PER_CLASS = 3


def _risk_labels(residents_df: pd.DataFrame) -> pd.DataFrame:
    risk_map = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
    out = residents_df.copy()
    out["initial_risk_num"] = out["InitialRiskLevel"].map(risk_map)
    out["current_risk_num"] = out["CurrentRiskLevel"].map(risk_map)
    mask = out["initial_risk_num"].notna() & out["current_risk_num"].notna()
    out = out.loc[mask].copy()
    out["label"] = (out["current_risk_num"] - out["initial_risk_num"]).apply(
        lambda x: 0 if x < 0 else 1
    )
    return out


def train_and_calibrate_from_supabase(
    supabase: Client,
) -> Tuple[Any, float] | None:
    """
    Returns (fitted CalibratedClassifierCV, threshold) or None to use joblib fallback.
    """
    residents_full = fetch_table(supabase, "Residents")
    if residents_full.empty or len(residents_full) < MIN_ROWS:
        print("Resident train: not enough Residents rows; using joblib fallback.")
        return None

    labeled = _risk_labels(residents_full)
    if labeled.empty or labeled["label"].nunique() < 2:
        print("Resident train: need mixed labels; using joblib fallback.")
        return None
    vc = labeled["label"].value_counts()
    if vc.min() < MIN_PER_CLASS:
        print("Resident train: too few samples in minority class; using joblib fallback.")
        return None

    feature_df = build_features(labeled, supabase)
    labels = labeled[["ResidentId", "label"]].rename(columns={"ResidentId": "resident_id"})
    merged = feature_df.merge(labels, on="resident_id", how="inner")
    if len(merged) < MIN_ROWS:
        print("Resident train: merged feature matrix too small; using joblib fallback.")
        return None

    y = merged["label"].astype(int)
    X = merged.drop(columns=["resident_id", "label"])

    numeric_features = X.select_dtypes(include=["int64", "float64", "int32"]).columns
    categorical_features = X.select_dtypes(include=["object", "bool"]).columns

    transformers: list = []
    if len(numeric_features) > 0:
        transformers.append(("num", StandardScaler(), numeric_features))
    if len(categorical_features) > 0:
        transformers.append(
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_features)
        )
    if not transformers:
        print("Resident train: no feature columns; using joblib fallback.")
        return None

    preprocessor = ColumnTransformer(transformers=transformers)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    pipelines = {
        "Logistic Regression": Pipeline(
            [("pre", preprocessor), ("clf", LogisticRegression(random_state=42, max_iter=2000))]
        ),
        "Decision Tree": Pipeline(
            [("pre", preprocessor), ("clf", DecisionTreeClassifier(random_state=42))]
        ),
        "Random Forest": Pipeline(
            [("pre", preprocessor), ("clf", RandomForestClassifier(random_state=42))]
        ),
    }
    grids = {
        "Logistic Regression": {"clf__C": [0.01, 0.1, 1.0, 10.0]},
        "Decision Tree": {"clf__max_depth": [2, 3, 5], "clf__min_samples_leaf": [2, 5]},
        "Random Forest": {"clf__max_depth": [2, 3, 5], "clf__n_estimators": [50, 100]},
    }

    best_models: dict[str, Any] = {}
    best_cv_scores: dict[str, float] = {}
    for name in pipelines:
        gs = GridSearchCV(pipelines[name], grids[name], cv=cv, scoring="recall", n_jobs=-1)
        gs.fit(X, y)
        best_models[name] = gs.best_estimator_
        best_cv_scores[name] = float(gs.best_score_)
        preds = best_models[name].predict(X)
        print(
            f"  [{name}] CV recall={best_cv_scores[name]:.3f} "
            f"acc={accuracy_score(y, preds):.3f} f1={f1_score(y, preds, zero_division=0):.3f}"
        )

    winning_name = max(best_cv_scores, key=best_cv_scores.get)
    winning_pipeline = best_models[winning_name]
    print(f"  Winner: {winning_name} (CV recall={best_cv_scores[winning_name]:.3f})")

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.25, stratify=y, random_state=42
    )
    cal_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cal_tune = CalibratedClassifierCV(winning_pipeline, cv=cal_cv, method="sigmoid")
    cal_tune.fit(X_train, y_train)

    classes_tune = cal_tune.classes_
    stall_col = int(np.where(classes_tune == 1)[0][0])
    val_p = cal_tune.predict_proba(X_val)[:, stall_col]

    best_t, best_f1 = 0.5, -1.0
    for t in np.linspace(0.30, 0.70, 81):
        pred = (val_p >= t).astype(int)
        f1v = f1_score(y_val, pred, zero_division=0)
        if f1v > best_f1:
            best_f1, best_t = f1v, t

    threshold = round(float(best_t), 4)
    print(f"  Tuned threshold (max F1 on holdout): {threshold:.4f}, val F1={best_f1:.3f}")

    final_cal = CalibratedClassifierCV(winning_pipeline, cv=cal_cv, method="sigmoid")
    final_cal.fit(X, y)
    print(f"  Fitted calibrated model on full training set ({len(X)} rows).")

    meta = {"threshold": threshold, "model": winning_name, "n_train": len(X)}
    try:
        with open("models/resident_progress_threshold.json", "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
    except OSError:
        pass

    return final_cal, threshold
