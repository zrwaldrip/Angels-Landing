"""
Train donor propensity pipeline from Supabase using rolling 90-day windows
(donor-propensity-classifier.ipynb). Used by propensity_scorer.py.
"""
from __future__ import annotations

from datetime import timedelta
from typing import Any

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from supabase import Client

from propensity_scorer import fetch_table, to_snake

WINDOW_DAYS = 90
MIN_DATASET_ROWS = 50


def build_rolling_dataset(
    supporters_df: pd.DataFrame, donations_df: pd.DataFrame
) -> pd.DataFrame | None:
    """Same logic as donor-propensity-classifier.ipynb."""
    donations_df = donations_df.copy()
    if "donation_date" not in donations_df.columns:
        return None
    donations_df["donation_date"] = pd.to_datetime(
        donations_df["donation_date"], errors="coerce"
    )
    donations_df = donations_df.dropna(subset=["donation_date", "estimated_value"])
    if donations_df.empty:
        return None

    min_date = donations_df["donation_date"].min() + timedelta(days=WINDOW_DAYS)
    max_date = donations_df["donation_date"].max() - timedelta(days=WINDOW_DAYS)
    if pd.isna(min_date) or pd.isna(max_date) or min_date >= max_date:
        return None

    observation_dates = pd.date_range(start=min_date, end=max_date, freq=f"{WINDOW_DAYS}D")
    rows: list[pd.DataFrame] = []

    for obs_date in observation_dates:
        future_end = obs_date + timedelta(days=WINDOW_DAYS)
        prior = donations_df[donations_df["donation_date"] < obs_date]
        future = donations_df[
            (donations_df["donation_date"] >= obs_date)
            & (donations_df["donation_date"] < future_end)
        ]["supporter_id"].unique()

        if prior.empty:
            continue

        rfm = prior.groupby("supporter_id").agg(
            recency=("donation_date", lambda x: (obs_date - x.max()).days),
            frequency=("donation_date", "size"),
            monetary_total=("estimated_value", "sum"),
            monetary_avg=("estimated_value", "mean"),
            is_recurring=("is_recurring", lambda x: int(x.any())),
        ).reset_index()

        rfm["target_donated_next_90_days"] = rfm["supporter_id"].isin(future).astype(int)
        rfm["obs_date"] = obs_date
        rows.append(rfm)

    if not rows:
        return None

    dataset = pd.concat(rows, ignore_index=True)
    sup_static = supporters_df[
        [
            "supporter_id",
            "supporter_type",
            "relationship_type",
            "acquisition_channel",
            "region",
        ]
    ].copy()
    dataset = dataset.merge(sup_static, on="supporter_id", how="left")
    dataset = dataset.drop(columns=["supporter_id", "obs_date"])
    return dataset


def train_pipeline_from_supabase(supabase: Client) -> Any | None:
    """
    GridSearchCV on 80% holdout, then refit best estimator on full rolling dataset.
    Returns fitted pipeline or None → joblib fallback.
    """
    donations_raw = fetch_table(supabase, "Donations")
    supporters_raw = fetch_table(supabase, "Supporters")
    if donations_raw.empty or supporters_raw.empty:
        print("Propensity train: missing Donations or Supporters; using joblib fallback.")
        return None

    donations_df = to_snake(donations_raw)
    supporters_df = to_snake(supporters_raw)

    dataset = build_rolling_dataset(supporters_df, donations_df)
    if dataset is None or len(dataset) < MIN_DATASET_ROWS:
        print(
            f"Propensity train: rolling dataset too small ({len(dataset) if dataset is not None else 0}); "
            "using joblib fallback."
        )
        return None

    y = dataset["target_donated_next_90_days"]
    X = dataset.drop(columns=["target_donated_next_90_days"])

    numeric_features = X.select_dtypes(include=["int64", "float64", "int32"]).columns.tolist()
    categorical_features = X.select_dtypes(include=["object"]).columns.tolist()

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ]
    )
    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", RandomForestClassifier(random_state=42)),
        ]
    )

    param_grid = {
        "classifier__n_estimators": [50, 100, 200],
        "classifier__max_depth": [None, 3, 5, 10],
        "classifier__min_samples_leaf": [1, 2, 5],
    }
    # StratifiedKFold only (notebook uses RepeatedStratifiedKFold — too slow for nightly CI)
    best_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    X_train, _, y_train, _ = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    grid_search = GridSearchCV(
        pipeline, param_grid, cv=best_cv, scoring="roc_auc", n_jobs=-1
    )
    grid_search.fit(X_train, y_train)
    print(
        f"  Propensity GridSearch best_params={grid_search.best_params_} "
        f"CV ROC AUC={grid_search.best_score_:.4f}"
    )

    best = grid_search.best_estimator_
    best.fit(X, y)
    print(f"  Propensity refit on full rolling data: {len(X)} rows.")
    return best
