-- Run this in the Supabase SQL Editor to create the FeatureImportances table
-- Project: Angels Landing v2 / Lighthouse
-- Purpose: Stores decision tree feature importances written by campaign_scorer.py
--          and displayed on the Campaign Analysis page.

CREATE TABLE IF NOT EXISTS "FeatureImportances" (
    "Id"           SERIAL PRIMARY KEY,
    "Feature"      TEXT,
    "Importance"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "CalculatedAt" TEXT
);
