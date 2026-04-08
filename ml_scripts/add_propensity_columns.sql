-- Run this in the Supabase SQL Editor to add propensity scoring columns to Supporters
-- These are written by propensity_scorer.py on each nightly run

ALTER TABLE "Supporters"
  ADD COLUMN IF NOT EXISTS "PropensityScore"          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "PropensityLastCalculated" TEXT;
