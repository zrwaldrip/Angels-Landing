#!/usr/bin/env python3
"""
Batch-score SocialMediaPosts with models/social_engagement_predictor.pkl (GitHub Action).
Updates Supabase: PredictedEngagementRate, EngagementScoredAt on each row.
Run from repo root:  python ml_scripts/social_engagement_scorer.py
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

import joblib
import pandas as pd
from supabase import create_client

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from social_engagement_features import (  # noqa: E402
    supabase_records_to_dataframe,
    features_for_prediction,
)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
MODEL_PATH = os.environ.get("SOCIAL_ENGAGEMENT_MODEL_PATH", os.path.join(_REPO_ROOT, "models", "social_engagement_predictor.pkl"))


def fetch_all_posts(supabase):
    all_data = []
    start = 0
    limit = 1000
    while True:
        resp = supabase.table("SocialMediaPosts").select("*").range(start, start + limit - 1).execute()
        if not resp.data:
            break
        all_data.extend(resp.data)
        if len(resp.data) < limit:
            break
        start += limit
    return all_data


def run():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY required.")
        raise SystemExit(1)

    if not os.path.isfile(MODEL_PATH):
        print(f"ERROR: Model not found: {MODEL_PATH}")
        raise SystemExit(1)

    pipe = joblib.load(MODEL_PATH)
    print(f"Loaded model from {MODEL_PATH}")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    records = fetch_all_posts(supabase)
    if not records:
        print("No SocialMediaPosts rows.")
        return

    raw_df = supabase_records_to_dataframe(records)
    if "engagement_rate" not in raw_df.columns:
        raw_df["engagement_rate"] = 0.0

    X, post_ids = features_for_prediction(raw_df)
    preds = pipe.predict(X)
    scored_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    n = 0
    for rec, yhat in zip(records, preds):
        pid = rec.get("PostId")
        if pid is None:
            continue
        supabase.table("SocialMediaPosts").update(
            {
                "PredictedEngagementRate": float(yhat),
                "EngagementScoredAt": scored_at,
            }
        ).eq("PostId", pid).execute()
        n += 1

    print(f"Updated {n} posts at {scored_at}")


if __name__ == "__main__":
    run()
