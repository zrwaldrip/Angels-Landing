-- Run on Supabase (PostgreSQL) if tables were not created by EF migrations.
-- EF / SQLite uses quoted PascalCase; adjust to match your Supabase schema if different.

CREATE TABLE IF NOT EXISTS "SocialEngagementInsights" (
    "SocialEngagementInsightId" SERIAL PRIMARY KEY,
    "FactorKey" TEXT NULL,
    "DisplayName" TEXT NULL,
    "Coefficient" DOUBLE PRECISION NULL,
    "PValue" DOUBLE PRECISION NULL,
    "RankOrder" INTEGER NULL,
    "ComputedAt" TEXT NULL,
    "ModelVersion" TEXT NULL,
    -- Meta fields duplicated on each factor row (single-table snapshot)
    "Caveats" TEXT NULL,
    "OlsR2" DOUBLE PRECISION NULL,
    "OlsAdjR2" DOUBLE PRECISION NULL,
    "PredictiveMaeHoldout" DOUBLE PRECISION NULL,
    "PredictiveR2Holdout" DOUBLE PRECISION NULL
);

-- If the table already existed, ensure meta columns exist too
ALTER TABLE "SocialEngagementInsights"
    ADD COLUMN IF NOT EXISTS "Caveats" TEXT NULL;
ALTER TABLE "SocialEngagementInsights"
    ADD COLUMN IF NOT EXISTS "OlsR2" DOUBLE PRECISION NULL;
ALTER TABLE "SocialEngagementInsights"
    ADD COLUMN IF NOT EXISTS "OlsAdjR2" DOUBLE PRECISION NULL;
ALTER TABLE "SocialEngagementInsights"
    ADD COLUMN IF NOT EXISTS "PredictiveMaeHoldout" DOUBLE PRECISION NULL;
ALTER TABLE "SocialEngagementInsights"
    ADD COLUMN IF NOT EXISTS "PredictiveR2Holdout" DOUBLE PRECISION NULL;

ALTER TABLE "SocialMediaPosts"
    ADD COLUMN IF NOT EXISTS "PredictedEngagementRate" DOUBLE PRECISION NULL;
ALTER TABLE "SocialMediaPosts"
    ADD COLUMN IF NOT EXISTS "EngagementScoredAt" TEXT NULL;
