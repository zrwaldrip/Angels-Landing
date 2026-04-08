-- Run this script in the Supabase SQL Editor to add the new Campaign columns
-- Project: Angels Landing v2 / Lighthouse
-- Purpose: Support richer campaign metrics (staff recommendations)

ALTER TABLE "Campaigns"
ADD COLUMN IF NOT EXISTS "RecurringRate" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "TopChannel" TEXT,
ADD COLUMN IF NOT EXISTS "MlrSignificant" BOOLEAN;
