## AngelsLanding ML API (FastAPI)

This service provides **interactive, what-if** predictions for social media engagement.

It **does not replace** the grading notebooks in `ml-pipelines/` and it **does not** write to Supabase. Batch/nightly scoring remains in GitHub Actions.

### Endpoints
- `GET /healthz`
- `POST /predict/social-engagement`

### Auth
Requests to `/predict/social-engagement` must include:
- Header: `X-API-Key: <ML_API_KEY>`

### Local run
From `AngelsLandingv2/`:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r ml-api/requirements.txt

# Ensure a model exists at ml-api/models/social_engagement_predictor.pkl
python ml_scripts/train_social_engagement.py --out-model ml-api/models/social_engagement_predictor.pkl

export ML_API_KEY="dev-key"
export ALLOWED_ORIGINS="http://localhost:5173"
python -m uvicorn ml-api.main:app --reload --host 0.0.0.0 --port 8000
```

