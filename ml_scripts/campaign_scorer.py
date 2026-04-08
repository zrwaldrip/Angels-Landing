import os
import pandas as pd
import numpy as np
from datetime import datetime
from supabase import create_client, Client

# Environment variables via GitHub Secrets (same as nightly_scorer.py)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Campaign verdict thresholds (mirrored from campaign_analysis.ipynb)
VERDICT_HIGH = 0.6
VERDICT_MID  = 0.3


def fetch_table(supabase: Client, table: str) -> pd.DataFrame:
    """Fetch all rows from a Supabase table as a DataFrame."""
    resp = supabase.table(table).select("*").execute()
    return pd.DataFrame(resp.data) if resp.data else pd.DataFrame()


def build_campaign_scores(donations_df: pd.DataFrame, supporters_df: pd.DataFrame) -> pd.DataFrame:
    """
    Replicate the campaign effectiveness leaderboard from campaign_analysis.ipynb
    using live Supabase data.

    Returns a DataFrame with one row per campaign containing:
    CampaignName, TotalValue, DonorCount, MeanValue, CompositeScore, Rank, Verdict
    """
    if donations_df.empty:
        print("No donations data available. Exiting.")
        return pd.DataFrame()

    df = donations_df.copy()

    # Normalise column names to snake_case (Supabase returns PascalCase)
    df.columns = [c[0].lower() + c[1:] for c in df.columns]
    df.rename(columns=lambda c: ''.join(['_' + ch.lower() if ch.isupper() else ch for ch in c]).lstrip('_'),
              inplace=True)

    # Fill missing campaign names (no campaign = "No Campaign")
    df['campaign_name'] = df['campaign_name'].fillna('No Campaign')

    # Merge in supporter metadata for donor type info
    if not supporters_df.empty:
        sup = supporters_df.copy()
        sup.columns = [c[0].lower() + c[1:] for c in sup.columns]
        sup.rename(columns=lambda c: ''.join(['_' + ch.lower() if ch.isupper() else ch for ch in c]).lstrip('_'),
                   inplace=True)
        df = df.merge(
            sup[['supporter_id', 'supporter_type', 'acquisition_channel']],
            on='supporter_id',
            how='left'
        )

    # --- Campaign-level aggregation ---
    campaign_summary = df.groupby('campaign_name').agg(
        total_value  = ('estimated_value', 'sum'),
        mean_value   = ('estimated_value', 'mean'),
        donor_count  = ('supporter_id', 'nunique'),
    ).reset_index()

    # --- Composite score: 50% normalised total value + 50% normalised donor count ---
    def norm(series: pd.Series) -> pd.Series:
        rng = series.max() - series.min()
        return (series - series.min()) / rng if rng > 0 else pd.Series([0.5] * len(series), index=series.index)

    campaign_summary['composite_score'] = (
        0.5 * norm(campaign_summary['total_value']) +
        0.5 * norm(campaign_summary['donor_count'])
    )

    # --- Rank and verdict ---
    campaign_summary = campaign_summary.sort_values('composite_score', ascending=False).reset_index(drop=True)
    campaign_summary['rank'] = range(1, len(campaign_summary) + 1)
    campaign_summary['verdict'] = campaign_summary['composite_score'].apply(
        lambda s: 'Moving the needle' if s > VERDICT_HIGH
                  else 'Mixed results'  if s > VERDICT_MID
                  else 'Noise / baseline'
    )

    return campaign_summary


def run_scorer():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Missing SUPABASE_URL or SUPABASE_KEY environment variables.")
        raise SystemExit(1)

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Fetching donations and supporters from Supabase...")
    donations_df   = fetch_table(supabase, "Donations")
    supporters_df  = fetch_table(supabase, "Supporters")
    print(f"  Donations: {len(donations_df)} rows | Supporters: {len(supporters_df)} rows")

    scores_df = build_campaign_scores(donations_df, supporters_df)
    if scores_df.empty:
        print("No campaign scores produced. Exiting.")
        return

    print(f"\nScoring {len(scores_df)} campaigns...")
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    upserted = 0

    for _, row in scores_df.iterrows():
        record = {
            "CampaignName":     row['campaign_name'],
            "TotalValue":       round(float(row['total_value']), 2),
            "DonorCount":       int(row['donor_count']),
            "MeanValue":        round(float(row['mean_value']), 2),
            "CompositeScore":   round(float(row['composite_score']), 4),
            "Rank":             int(row['rank']),
            "Verdict":          row['verdict'],
            "MlLastCalculated": now,
        }

        # Upsert on CampaignName (unique column) so re-runs update rather than insert
        supabase.table("Campaigns").upsert(
            record,
            on_conflict="CampaignName"
        ).execute()

        print(f"  #{row['rank']:>2}  {row['campaign_name']:<25}  score={row['composite_score']:.3f}  verdict={row['verdict']}")
        upserted += 1

    print(f"\nFinished. Upserted {upserted} campaign scores into Campaigns table.")


if __name__ == '__main__':
    run_scorer()
