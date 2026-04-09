"""
Shared feature engineering for social media engagement models.
Used by the predictive notebook and social_engagement_scorer.py.
CSV / training uses snake_case column names matching lighthouse_csv_v7/social_media_posts.csv.

Predictors are actionable post-design fields only (platform, timing, format, caption choices,
CTA, topic, boost). Audience-scale measures (impressions, follower counts) and other non-levers
are excluded so coefficients and forecasts align with what staff can change when composing a post.
"""
from __future__ import annotations

import pandas as pd

# Columns that must never be used as predictors (labels, leakage, IDs, raw text)
DROP_FOR_MODELING = {
    "post_id",
    "platform_post_id",
    "post_url",
    "created_at",
    "caption",
    "hashtags",
    "campaign_name",
    "impressions",
    "reach",
    "likes",
    "comments",
    "shares",
    "saves",
    "click_throughs",
    "video_views",
    "engagement_rate",
    "profile_visits",
    "donation_referrals",
    "estimated_donation_value_php",
    "watch_time_seconds",
    "avg_view_duration_seconds",
    "subscriber_count_at_post",
    "forwards",
}

CATEGORICAL = [
    "platform",
    "day_of_week",
    "post_type",
    "media_type",
    "call_to_action_type",
    "content_topic",
]

NUMERIC_BASE = [
    "post_hour",
    "num_hashtags",
    "mentions_count",
    "caption_length",
]

# Binary flags included in X (same order as concatenated in get_x_y)
ACTIONABLE_BINARY = ["has_call_to_action", "is_boosted"]


def _coerce_bool_series(s: pd.Series) -> pd.Series:
    if s.dtype == bool:
        return s.astype(int)
    return s.map(lambda x: 1 if x is True or str(x).lower() == "true" else 0)


def enrich_raw_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce columns needed for the actionable feature matrix."""
    out = df.copy()

    for c in CATEGORICAL:
        if c not in out.columns:
            out[c] = ""
        out[c] = out[c].fillna("").astype(str).str.strip()
        out.loc[out[c] == "", c] = "(missing)"

    for c in NUMERIC_BASE:
        if c not in out.columns:
            out[c] = 0
        out[c] = pd.to_numeric(out[c], errors="coerce").fillna(0)

    if "has_call_to_action" in out.columns:
        out["has_call_to_action"] = _coerce_bool_series(out["has_call_to_action"])
    else:
        out["has_call_to_action"] = 0

    if "is_boosted" in out.columns:
        out["is_boosted"] = _coerce_bool_series(out["is_boosted"])
    else:
        out["is_boosted"] = 0

    return out


def _feature_column_list() -> list[str]:
    return CATEGORICAL + NUMERIC_BASE + ACTIONABLE_BINARY


def get_x_y(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    """Return X, y, and aligned post_id (for exporting batch predictions)."""
    enriched = enrich_raw_dataframe(df)
    y = pd.to_numeric(enriched["engagement_rate"], errors="coerce")
    mask = y.notna()
    enriched = enriched.loc[mask]
    y = y.loc[mask]
    post_ids = enriched["post_id"] if "post_id" in enriched.columns else pd.Series(range(len(enriched)), index=enriched.index)

    feature_cols = _feature_column_list()
    X = enriched[feature_cols].copy()
    return X, y, post_ids


def features_only_from_enriched(enriched: pd.DataFrame) -> pd.DataFrame:
    """Build the same feature matrix as get_x_y without requiring engagement_rate."""
    feature_cols = _feature_column_list()
    return enriched[feature_cols].copy()


def features_for_prediction(raw_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Return X and post_ids for scoring (keeps rows even if engagement_rate missing)."""
    enriched = enrich_raw_dataframe(raw_df)
    if "post_id" not in enriched.columns:
        enriched["post_id"] = range(len(enriched))
    post_ids = enriched["post_id"]
    X = features_only_from_enriched(enriched)
    return X, post_ids


# Supabase / EF PascalCase → CSV snake_case
SUPABASE_TO_CSV = {
    "PostId": "post_id",
    "Platform": "platform",
    "PlatformPostId": "platform_post_id",
    "PostUrl": "post_url",
    "CreatedAt": "created_at",
    "DayOfWeek": "day_of_week",
    "PostHour": "post_hour",
    "PostType": "post_type",
    "MediaType": "media_type",
    "Caption": "caption",
    "Hashtags": "hashtags",
    "NumHashtags": "num_hashtags",
    "MentionsCount": "mentions_count",
    "HasCallToAction": "has_call_to_action",
    "CallToActionType": "call_to_action_type",
    "ContentTopic": "content_topic",
    "SentimentTone": "sentiment_tone",
    "CaptionLength": "caption_length",
    "FeaturesResidentStory": "features_resident_story",
    "CampaignName": "campaign_name",
    "IsBoosted": "is_boosted",
    "BoostBudgetPhp": "boost_budget_php",
    "Impressions": "impressions",
    "Reach": "reach",
    "Likes": "likes",
    "Comments": "comments",
    "Shares": "shares",
    "Saves": "saves",
    "ClickThroughs": "click_throughs",
    "VideoViews": "video_views",
    "EngagementRate": "engagement_rate",
    "ProfileVisits": "profile_visits",
    "DonationReferrals": "donation_referrals",
    "EstimatedDonationValuePhp": "estimated_donation_value_php",
    "FollowerCountAtPost": "follower_count_at_post",
    "WatchTimeSeconds": "watch_time_seconds",
    "AvgViewDurationSeconds": "avg_view_duration_seconds",
    "SubscriberCountAtPost": "subscriber_count_at_post",
    "Forwards": "forwards",
}


def supabase_records_to_dataframe(records: list[dict]) -> pd.DataFrame:
    rows = []
    for r in records:
        row = {}
        for pascal, snake in SUPABASE_TO_CSV.items():
            if pascal in r:
                row[snake] = r[pascal]
        rows.append(row)
    return pd.DataFrame(rows)
