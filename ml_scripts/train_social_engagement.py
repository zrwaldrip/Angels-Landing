#!/usr/bin/env python3
"""
Optional one-shot trainer: same outputs as the notebooks + GitHub scorer.

For IS455 / case submission, the **canonical pipelines** are in:
  - `ml-pipeline/social_engagement_explanatory.ipynb`
  - `ml-pipeline/social_engagement_predictive.ipynb`

Run from repo root:  python ml_scripts/train_social_engagement.py
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from social_engagement_features import CATEGORICAL, get_x_y  # noqa: E402


def _engagement_rf_pipeline(X: pd.DataFrame) -> Pipeline:
    num_cols = [c for c in X.columns if c not in CATEGORICAL]
    preprocess = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL),
            ("num", StandardScaler(), num_cols),
        ]
    )
    return Pipeline(
        steps=[
            ("prep", preprocess),
            (
                "rf",
                RandomForestRegressor(
                    n_estimators=160,
                    max_depth=14,
                    min_samples_leaf=3,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )


def fit_engagement_pipeline_from_dataframe(df: pd.DataFrame) -> Pipeline | None:
    """
    Train predictive pipeline from a raw posts DataFrame (CSV or Supabase-mapped).
    Returns None if too few labeled rows — caller should load joblib fallback.
    """
    X, y, _ = get_x_y(df)
    if len(X) < 50:
        print(f"Social engagement train: need >= 50 posts with engagement_rate; got {len(X)}.")
        return None
    pipe = _engagement_rf_pipeline(X)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)
    mae = mean_absolute_error(y_test, pred)
    r2 = r2_score(y_test, pred)
    print(f"Social engagement holdout MAE={mae:.5f}  R2={r2:.4f}")
    pipe.fit(X, y)
    print(f"Social engagement refit on full labeled set ({len(X)} rows).")
    return pipe


def _ols_design(X: pd.DataFrame) -> pd.DataFrame:
    return sm.add_constant(pd.get_dummies(X, columns=CATEGORICAL, drop_first=True), has_constant="add")


def _friendly_name(col: str) -> str:
    return (
        col.replace("x0_", "")
        .replace("_", " ")
        .replace("T.", " = ")
        .strip()
    )


def train_and_export(
    csv_path: Path, out_model: Path, out_insights_json: Path, out_predictions_json: Path | None
) -> None:
    df = pd.read_csv(csv_path)
    X, y, post_ids = get_x_y(df)
    if len(X) < 50:
        raise SystemExit(f"Not enough rows after cleaning: {len(X)}")

    # --- Explanatory OLS on dummy-expanded design ---
    X_dm = _ols_design(X)
    ols = sm.OLS(y.astype(float), X_dm.astype(float)).fit()

    rows = []
    for name, coef in ols.params.items():
        if name == "const":
            continue
        pv = float(ols.pvalues.get(name, np.nan))
        rows.append(
            {
                "factorKey": name,
                "displayName": _friendly_name(name),
                "coefficient": float(coef),
                "pValue": pv,
            }
        )
    rows.sort(key=lambda r: abs(r["coefficient"]), reverse=True)
    for i, r in enumerate(rows, start=1):
        r["rankOrder"] = i

    version = "ols_explanatory_v1"
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = {
        "modelVersion": version,
        "computedAt": now,
        "caveats": (
            "Coefficients are associational (observational posts), not proof of causation. "
            "Interpret as conditional associations after controlling for other modeled fields."
        ),
        "olsR2": float(ols.rsquared),
        "olsAdjR2": float(ols.rsquared_adj),
        "factors": rows[:40],
    }

    out_insights_json.parent.mkdir(parents=True, exist_ok=True)
    out_insights_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote insights JSON: {out_insights_json}")

    # --- Predictive sklearn Pipeline ---
    pipe = _engagement_rf_pipeline(X)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)
    mae = mean_absolute_error(y_test, pred)
    r2 = r2_score(y_test, pred)
    print(f"Holdout MAE={mae:.5f}  R2={r2:.4f}")

    # Refit on full data for deployment artifact
    pipe.fit(X, y)
    pred_all = pipe.predict(X)

    out_model.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, out_model)
    print(f"Wrote model: {out_model}")

    payload["predictiveMaeHoldout"] = float(mae)
    payload["predictiveR2Holdout"] = float(r2)
    out_insights_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    if out_predictions_json is not None:
        scored_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        pred_rows = [
            {
                "postId": int(pid),
                "predictedEngagementRate": float(pr),
                "engagementScoredAt": scored_at,
            }
            for pid, pr in zip(post_ids.astype(int), pred_all)
        ]
        out_predictions_json.parent.mkdir(parents=True, exist_ok=True)
        out_predictions_json.write_text(json.dumps(pred_rows, indent=2), encoding="utf-8")
        print(f"Wrote batch predictions: {out_predictions_json}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--csv",
        type=Path,
        default=_REPO_ROOT
        / "backend"
        / "AngelsLandingv2.API"
        / "SeedData"
        / "social_media_posts.csv",
        help="Path to social_media_posts.csv",
    )
    ap.add_argument(
        "--out-model",
        type=Path,
        default=_REPO_ROOT / "models" / "social_engagement_predictor.pkl",
    )
    ap.add_argument(
        "--out-json",
        type=Path,
        default=_REPO_ROOT
        / "backend"
        / "AngelsLandingv2.API"
        / "SeedData"
        / "social_engagement_insights.json",
    )
    ap.add_argument(
        "--out-predictions-json",
        type=Path,
        default=_REPO_ROOT
        / "backend"
        / "AngelsLandingv2.API"
        / "SeedData"
        / "social_engagement_post_predictions.json",
    )
    args = ap.parse_args()
    if not args.csv.is_file():
        raise SystemExit(f"CSV not found: {args.csv}")
    train_and_export(args.csv, args.out_model, args.out_json, args.out_predictions_json)


if __name__ == "__main__":
    main()
