from __future__ import annotations

import os
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent

# Reuse the exact same feature engineering as notebooks/scorers.
sys.path.insert(0, str(REPO_ROOT / "ml_scripts"))
from social_engagement_features import enrich_raw_dataframe, features_only_from_enriched  # noqa: E402


class SocialEngagementPredictRequest(BaseModel):
    platform: str = Field(default="(missing)")
    day_of_week: str = Field(default="(missing)")
    post_type: str = Field(default="(missing)")
    media_type: str = Field(default="(missing)")
    call_to_action_type: str = Field(default="(missing)")
    content_topic: str = Field(default="(missing)")
    post_hour: int = Field(default=12, ge=0, le=23)
    num_hashtags: int = Field(default=0, ge=0, le=50)
    mentions_count: int = Field(default=0, ge=0, le=50)
    caption_length: int = Field(default=0, ge=0, le=5000)
    has_call_to_action: bool = Field(default=False)
    is_boosted: bool = Field(default=False)


class SocialEngagementPredictResponse(BaseModel):
    predictedEngagementRate: float


def _get_allowed_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", "").strip()
    if not raw:
        return []
    return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]


@lru_cache(maxsize=1)
def _load_model():
    model_path = os.environ.get("MODEL_PATH", str(HERE / "models" / "social_engagement_predictor.pkl"))
    p = Path(model_path).expanduser().resolve()
    if not p.is_file():
        raise RuntimeError(f"Model file not found at {p}")
    return joblib.load(p)


def _require_api_key(x_api_key: str | None) -> None:
    expected = os.environ.get("ML_API_KEY", "").strip()
    if not expected:
        # If not set, refuse to serve predictions (safer default).
        raise HTTPException(status_code=500, detail="ML_API_KEY not configured")
    if not x_api_key or x_api_key.strip() != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


app = FastAPI(title="AngelsLanding ML API", version="1.0.0")

allowed_origins = _get_allowed_origins()
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        max_age=600,
    )


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    # Don’t load the model for health checks (faster cold start checks).
    return {"ok": True}


@app.post("/predict/social-engagement", response_model=SocialEngagementPredictResponse)
def predict_social_engagement(
    payload: SocialEngagementPredictRequest,
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
) -> SocialEngagementPredictResponse:
    _require_api_key(x_api_key)

    # Build a single-row DF in the “raw” schema, then run the shared enrichment.
    raw_df = pd.DataFrame(
        [
            {
                "platform": payload.platform,
                "day_of_week": payload.day_of_week,
                "post_type": payload.post_type,
                "media_type": payload.media_type,
                "call_to_action_type": payload.call_to_action_type,
                "content_topic": payload.content_topic,
                "post_hour": payload.post_hour,
                "num_hashtags": payload.num_hashtags,
                "mentions_count": payload.mentions_count,
                "caption_length": payload.caption_length,
                "has_call_to_action": payload.has_call_to_action,
                "is_boosted": payload.is_boosted,
            }
        ]
    )
    enriched = enrich_raw_dataframe(raw_df)
    X = features_only_from_enriched(enriched)

    model = _load_model()
    yhat = float(model.predict(X)[0])
    return SocialEngagementPredictResponse(predictedEngagementRate=yhat)

