#!/usr/bin/env python3
"""
Local smoke test for the social engagement ML flow (no Supabase required).

From the AngelsLandingv2 repo root:

    python ml_scripts/verify_social_engagement_local.py

Checks:
  - models/social_engagement_predictor.pkl loads
  - SeedData/social_engagement_insights.json parses
  - sklearn predict() on all posts matches CSV rows; reports MAE vs actual engagement_rate
  - optional: --sqlite-db path updates local AngelsLandingv2.sqlite (same columns the API reads)

After --sqlite-db, restart the API (or open the DB) and GET /api/admin-reports/social-engagement
as an admin user to see factors + actual vs predicted rows.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

_REPO = Path(__file__).resolve().parent.parent
_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

from social_engagement_features import get_x_y  # noqa: E402


def resolve_csv() -> Path:
    for p in [
        _REPO / "backend" / "AngelsLandingv2.API" / "SeedData" / "social_media_posts.csv",
        _REPO / "lighthouse_csv_v7" / "social_media_posts.csv",
        _REPO.parent / "lighthouse_csv_v7" / "social_media_posts.csv",
    ]:
        if p.is_file():
            return p
    raise FileNotFoundError("social_media_posts.csv not found")


def main() -> None:
    ap = argparse.ArgumentParser(description="Verify social engagement artifacts locally.")
    ap.add_argument(
        "--sqlite-db",
        type=Path,
        default=None,
        help="If set, UPDATE SocialMediaPosts with predicted rates (local SQLite from dotnet)",
    )
    args = ap.parse_args()

    model_path = _REPO / "models" / "social_engagement_predictor.pkl"
    insights_path = _REPO / "backend" / "AngelsLandingv2.API" / "SeedData" / "social_engagement_insights.json"

    print("Repo root:", _REPO)
    if not model_path.is_file():
        print("FAIL: missing", model_path)
        print("  Run: python ml_scripts/train_social_engagement.py")
        print("  or execute ml-pipeline/social_engagement_predictive.ipynb")
        raise SystemExit(1)
    print("OK  model:", model_path)

    if not insights_path.is_file():
        print("WARN: missing", insights_path, "(run explanatory notebook or train script)")
    else:
        data = json.loads(insights_path.read_text(encoding="utf-8"))
        n_factors = len(data.get("factors", []))
        print(f"OK  insights JSON: {n_factors} factors, olsR2={data.get('olsR2')!s}")

    pipe = joblib.load(model_path)
    csv_path = resolve_csv()
    print("OK  CSV:", csv_path)

    df = pd.read_csv(csv_path)
    X, y, post_ids = get_x_y(df)
    pred = pipe.predict(X)
    mae = float(np.mean(np.abs(pred - y.values)))
    r2 = 1 - np.sum((y.values - pred) ** 2) / np.sum((y.values - y.values.mean()) ** 2)
    print(f"OK  in-sample MAE vs actual engagement_rate: {mae:.6f}  (R2≈{r2:.4f} on training set — not holdout)")

    if args.sqlite_db:
        db = args.sqlite_db.resolve()
        if not db.is_file():
            print("FAIL: sqlite db not found:", db)
            raise SystemExit(1)
        from datetime import datetime, timezone

        scored = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        conn = sqlite3.connect(db)
        try:
            n = 0
            for pid, pr in zip(post_ids.astype(int), pred):
                cur = conn.execute(
                    """
                    UPDATE "SocialMediaPosts"
                    SET "PredictedEngagementRate" = ?, "EngagementScoredAt" = ?
                    WHERE "PostId" = ?
                    """,
                    (float(pr), scored, int(pid)),
                )
                n += cur.rowcount
            conn.commit()
        finally:
            conn.close()
        print(f"OK  sqlite updated rows (rowcount sum): {n} — db: {db}")
        print("    Restart the API and open Reports as admin to see actual vs predicted.")
    else:
        print()
        print("Optional: write predictions into local SQLite for full UI test:")
        print(f'  python ml_scripts/verify_social_engagement_local.py --sqlite-db "{_REPO / "backend" / "AngelsLandingv2.API" / "AngelsLandingv2.sqlite"}"')


if __name__ == "__main__":
    main()
