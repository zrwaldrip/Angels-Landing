import os
import re
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from supabase import create_client, Client

# Environment variables via GitHub Secrets
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
MODEL_PATH   = "models/propensity_to_donate_pipeline.pkl"
RESCORE_AFTER_DAYS = 7


def fetch_table(supabase: Client, table: str) -> pd.DataFrame:
    all_data = []
    start = 0
    limit = 1000
    while True:
        resp = supabase.table(table).select("*").range(start, start + limit - 1).execute()
        if not resp.data:
            break
        all_data.extend(resp.data)
        if len(resp.data) < limit:
            break
        start += limit
    return pd.DataFrame(all_data) if all_data else pd.DataFrame()


def to_snake(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [re.sub(r'(?<!^)(?=[A-Z])', '_', c).lower() for c in df.columns]
    return df


def build_features(supporters_df: pd.DataFrame, donations_df: pd.DataFrame) -> pd.DataFrame:
    """
    Build RFM features for each supporter using their full donation history.
    Mirrors the rolling-window feature engineering from model_training_evaluation.ipynb
    but uses today as the single observation date (production scoring).
    """
    obs_date = pd.Timestamp.now()

    donations_df['donation_date'] = pd.to_datetime(donations_df['donation_date'], errors='coerce')
    donations_df = donations_df.dropna(subset=['donation_date', 'estimated_value'])

    if donations_df.empty:
        return pd.DataFrame()

    rfm = donations_df.groupby('supporter_id').agg(
        recency        = ('donation_date',  lambda x: (obs_date - x.max()).days),
        frequency      = ('donation_id',    'count'),
        monetary_total = ('estimated_value', 'sum'),
        monetary_avg   = ('estimated_value', 'mean'),
        is_recurring   = ('is_recurring',    lambda x: int(x.any())),
    ).reset_index()

    # Merge static supporter features
    sup_static = supporters_df[[
        'supporter_id', 'supporter_type', 'relationship_type',
        'acquisition_channel', 'region'
    ]].copy()

    features = rfm.merge(sup_static, on='supporter_id', how='left')
    return features


def run_scorer():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Missing SUPABASE_URL or SUPABASE_KEY environment variables.")
        raise SystemExit(1)

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    model = joblib.load(MODEL_PATH)
    print(f"Loaded model from {MODEL_PATH}")

    # Fetch supporters that need re-scoring
    seven_days_ago = (datetime.now() - timedelta(days=RESCORE_AFTER_DAYS)).strftime("%Y-%m-%dT%H:%M:%S")
    resp = supabase.table("Supporters").select("*").eq("Status", "Active").execute()
    all_active = resp.data or []

    supporters_to_score = [
        s for s in all_active
        if not s.get("PropensityLastCalculated")
        or s.get("PropensityLastCalculated") < seven_days_ago
    ]

    if not supporters_to_score:
        print("No supporters require scoring today. Exiting.")
        return

    print(f"Scoring {len(supporters_to_score)} of {len(all_active)} active supporters...")

    # Fetch all donations for feature building
    donations_raw = fetch_table(supabase, "Donations")
    donations_df  = to_snake(donations_raw)

    supporters_raw = pd.DataFrame(all_active)
    supporters_df  = to_snake(supporters_raw)

    feature_df = build_features(supporters_df, donations_df)
    if feature_df.empty:
        print("No features could be built. Exiting.")
        return

    scored, skipped = 0, 0
    for supporter in supporters_to_score:
        supporter_id = supporter["SupporterId"]
        row = feature_df[feature_df['supporter_id'] == supporter_id].drop(
            columns=['supporter_id'], errors='ignore'
        )

        if row.empty:
            print(f"  ⚠  Supporter {supporter_id}: no donation history, skipping.")
            skipped += 1
            continue

        prob = float(model.predict_proba(row)[0][1])

        supabase.table("Supporters").update({
            "PropensityScore":          round(prob, 4),
            "PropensityLastCalculated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        }).eq("SupporterId", supporter_id).execute()

        print(f"  ✓  Supporter {supporter_id}  PropensityScore={prob:.3f}")
        scored += 1

    print(f"\nFinished. Scored: {scored} | Skipped: {skipped}")


if __name__ == '__main__':
    run_scorer()
