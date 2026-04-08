-- Run this in the Supabase SQL Editor to create the Campaigns table
-- Project: Angels Landing v2 / Lighthouse
-- Purpose: Stores ML-scored campaign effectiveness metrics from campaign_scorer.py

CREATE TABLE IF NOT EXISTS "Campaigns" (
    "CampaignId"       SERIAL PRIMARY KEY,
    "CampaignName"     TEXT UNIQUE NOT NULL,
    "TotalValue"       DOUBLE PRECISION,
    "DonorCount"       INTEGER,
    "MeanValue"        DOUBLE PRECISION,
    "CompositeScore"   DOUBLE PRECISION,
    "Rank"             INTEGER,
    "Verdict"          TEXT,
    "MlLastCalculated" TEXT
);

-- Index for fast lookup by name (used by upsert in campaign_scorer.py)
CREATE INDEX IF NOT EXISTS "IX_Campaigns_CampaignName" ON "Campaigns" ("CampaignName");
