import os
import pandas as pd
import numpy as np
import statsmodels.formula.api as smf
from datetime import datetime
from supabase import create_client, Client

# Environment variables via GitHub Secrets (same as nightly_scorer.py)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Campaign verdict thresholds (mirrored from campaign_analysis.ipynb)
VERDICT_HIGH = 0.6
VERDICT_MID  = 0.3


def fetch_table(supabase: Client, table: str) -> pd.DataFrame:
    """Fetch all rows from a Supabase table using pagination."""
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

    # Drop donations with no campaign — these are untagged and not a real campaign
    df = df[df['campaign_name'].notna() & (df['campaign_name'].str.strip() != '')]

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

    # --- New Metrics ---
    # 1. Top Channel 
    if 'acquisition_channel' in df.columns:
        channel_revenue = df.groupby(['campaign_name', 'acquisition_channel'])['estimated_value'].sum().reset_index()
        top_channels = channel_revenue.sort_values('estimated_value', ascending=False).drop_duplicates('campaign_name')
        top_channels = top_channels.rename(columns={'acquisition_channel': 'top_channel'}).drop(columns=['estimated_value'])
    else:
        top_channels = pd.DataFrame(columns=['campaign_name', 'top_channel'])

    # 2. Recurring Rate
    if 'is_recurring' in df.columns:
        df['is_recurring'] = df['is_recurring'].fillna(False).astype(bool)
        recurring_rates = df.groupby('campaign_name')['is_recurring'].mean().reset_index()
        recurring_rates = recurring_rates.rename(columns={'is_recurring': 'recurring_rate'})
    else:
        recurring_rates = pd.DataFrame(columns=['campaign_name', 'recurring_rate'])

    # --- Campaign-level aggregation ---
    campaign_summary = df.groupby('campaign_name').agg(
        total_value  = ('estimated_value', 'sum'),
        mean_value   = ('estimated_value', 'mean'),
        donor_count  = ('supporter_id', 'nunique'),
    ).reset_index()

    campaign_summary = campaign_summary.merge(top_channels, on='campaign_name', how='left')
    campaign_summary = campaign_summary.merge(recurring_rates, on='campaign_name', how='left')

    # 3. Significance (OLS)
    try:
        model = smf.ols("estimated_value ~ C(campaign_name)", data=df).fit()
        pvals = model.pvalues
        sig_dict = {}
        for campaign in campaign_summary['campaign_name']:
            col_name = f"C(campaign_name)[T.{campaign}]"
            if col_name in pvals and pvals[col_name] < 0.05:
                sig_dict[campaign] = True
            else:
                sig_dict[campaign] = False
        campaign_summary['mlr_significant'] = campaign_summary['campaign_name'].map(sig_dict)
    except Exception as e:
        print(f"Warning: MLR failed to run: {e}")
        campaign_summary['mlr_significant'] = False

    # --- Composite score: Rank Scaling ---
    campaign_summary['composite_score'] = (
        0.5 * campaign_summary['total_value'].rank(pct=True) +
        0.5 * campaign_summary['donor_count'].rank(pct=True)
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
            "RecurringRate":    float(row.get('recurring_rate', 0)),
            "TopChannel":       str(row.get('top_channel', '')),
            "MlrSignificant":   bool(row.get('mlr_significant', False)),
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
