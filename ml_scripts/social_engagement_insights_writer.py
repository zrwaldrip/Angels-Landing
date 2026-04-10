#!/usr/bin/env python3
"""
Recompute explanatory (OLS) social engagement insights from live Supabase data.

Writes a latest-only snapshot into the single Supabase table:
  - SocialEngagementInsights (one row per factor; meta duplicated on each row)

Run from repo root:
  python ml_scripts/social_engagement_insights_writer.py
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import statsmodels.api as sm
from supabase import create_client

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from social_engagement_features import (  # noqa: E402
    CATEGORICAL,
    get_x_y,
    supabase_records_to_dataframe,
)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

MODEL_VERSION = os.environ.get("SOCIAL_ENGAGEMENT_OLS_VERSION", "ols_explanatory_v1")
TOP_N = int(os.environ.get("SOCIAL_ENGAGEMENT_OLS_TOP_N", "40"))
MIN_P = float(os.environ.get("SOCIAL_ENGAGEMENT_OLS_MIN_P", "0.05"))

CAVEATS = (
    "Coefficients are associational (observational posts), not proof of causation. "
    "Interpret as conditional associations after controlling for other modeled fields."
)


def _ols_design(X: pd.DataFrame) -> pd.DataFrame:
    return sm.add_constant(
        pd.get_dummies(X, columns=CATEGORICAL, drop_first=True),
        has_constant="add",
    )


_CATEGORICAL_LABELS: dict[str, str] = {
    "platform": "Platform",
    "day_of_week": "Day of week",
    "post_type": "Post type",
    "media_type": "Media type",
    "call_to_action_type": "Call-to-action type",
    "content_topic": "Content topic",
}

_NUMERIC_LABELS: dict[str, str] = {
    "post_hour": "Post hour (0–23)",
    "num_hashtags": "Hashtag count",
    "mentions_count": "Mention count",
    "caption_length": "Caption length",
    "has_call_to_action": "Has a call-to-action",
    "is_boosted": "Is boosted (paid)",
}


def _friendly_name(col: str) -> str:
    # Statsmodels + pandas get_dummies names generally look like: "{field}_{category}".
    # We want stakeholder-facing labels while preserving enough detail to interpret baselines.
    if col in _NUMERIC_LABELS:
        return _NUMERIC_LABELS[col]

    for field, label in _CATEGORICAL_LABELS.items():
        prefix = f"{field}_"
        if col.startswith(prefix):
            value = col[len(prefix):]
            value = value.replace("_", " ").strip()
            if value == "":
                return label
            return f"{label} = {value}"

    # Fallback: make it readable without pretending it's a curated label.
    return (
        col.replace("x0_", "")
        .replace("T.", " = ")
        .replace("_", " ")
        .strip()
    )


def fetch_all_posts(supabase):
    all_data: list[dict] = []
    start = 0
    limit = 1000
    while True:
        resp = (
            supabase.table("SocialMediaPosts")
            .select("*")
            .range(start, start + limit - 1)
            .execute()
        )
        if not resp.data:
            break
        all_data.extend(resp.data)
        if len(resp.data) < limit:
            break
        start += limit
    return all_data


def delete_all_existing_insights(supabase) -> None:
    # Supabase delete requires a filter; this removes all rows with PK > 0.
    supabase.table("SocialEngagementInsights").delete().gt("SocialEngagementInsightId", 0).execute()


def run() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY required.")
        raise SystemExit(1)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    records = fetch_all_posts(supabase)
    if not records:
        print("No SocialMediaPosts rows; nothing to compute.")
        return

    raw_df = supabase_records_to_dataframe(records)
    if "engagement_rate" not in raw_df.columns:
        print("No engagement_rate column present in fetched rows; cannot fit OLS.")
        return

    X, y, _post_ids = get_x_y(raw_df)
    if len(X) < 50:
        print(f"Not enough usable rows after cleaning: {len(X)}")
        return

    X_dm = _ols_design(X)
    ols = sm.OLS(y.astype(float), X_dm.astype(float)).fit()

    rows = []
    for name, coef in ols.params.items():
        if name == "const":
            continue
        pv = float(ols.pvalues.get(name, np.nan))
        if np.isnan(pv) or pv >= MIN_P:
            continue
        rows.append(
            {
                "FactorKey": name,
                "DisplayName": _friendly_name(name),
                "Coefficient": float(coef),
                "PValue": pv,
            }
        )

    rows.sort(key=lambda r: abs(r["Coefficient"]), reverse=True)
    rows = rows[:TOP_N]
    for i, r in enumerate(rows, start=1):
        r["RankOrder"] = i

    computed_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    meta = {
        "ComputedAt": computed_at,
        "ModelVersion": MODEL_VERSION,
        "Caveats": CAVEATS,
        "OlsR2": float(ols.rsquared),
        "OlsAdjR2": float(ols.rsquared_adj),
        # predictive metrics are computed elsewhere; keep null here
        "PredictiveMaeHoldout": None,
        "PredictiveR2Holdout": None,
    }

    delete_all_existing_insights(supabase)
    if not rows:
        print(f"No statistically significant OLS factors at p<{MIN_P}; cleared insights at {computed_at}")
        return

    payload = [{**r, **meta} for r in rows]
    supabase.table("SocialEngagementInsights").insert(payload).execute()
    print(f"Wrote {len(payload)} insight rows (p<{MIN_P}) at {computed_at}")


if __name__ == "__main__":
    run()

