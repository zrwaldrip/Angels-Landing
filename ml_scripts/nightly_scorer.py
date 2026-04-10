import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from supabase import create_client, Client
from functools import reduce

# Environment variables via GitHub Secrets
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
MODEL_PATH = "models/resident-progress-classifier.pkl"
# Optional: written by resident-progress-classifier.ipynb next to the pkl
THRESHOLD_META_PATH = "models/resident_progress_threshold.json"
DEFAULT_THRESHOLD = 0.5


def load_stall_threshold() -> float:
    """Load F1-tuned threshold from notebook export; fall back if missing."""
    if not os.path.isfile(THRESHOLD_META_PATH):
        return DEFAULT_THRESHOLD
    try:
        with open(THRESHOLD_META_PATH, encoding="utf-8") as f:
            meta = json.load(f)
        return float(meta["threshold"])
    except (OSError, ValueError, KeyError, TypeError):
        return DEFAULT_THRESHOLD


def stall_probability(model, row: pd.DataFrame) -> float:
    """
    P(label == 1) where 1 = stalling. Uses model.classes_ so class order never inverts.
    """
    proba = model.predict_proba(row)[0]
    classes = getattr(model, "classes_", None)
    if classes is None:
        return float(proba[-1])
    classes = np.asarray(classes)
    pos = np.where(classes == 1)[0]
    if pos.size:
        return float(proba[int(pos[0])])
    return float(proba[-1])


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


def build_features(residents_df: pd.DataFrame, supabase: Client) -> pd.DataFrame:
    """
    Replicate feature engineering from resident-progress-classifier.ipynb
    using live Supabase data.

    Supabase column names follow EF Core PascalCase conventions (e.g. ResidentId,
    SessionDurationMinutes). Output feature names are snake_case to match the
    column names the trained model pipeline was fitted on.
    """

    # --- Static features from Residents ---
    static_df = residents_df[[
        'ResidentId', 'IsPwd', 'HasSpecialNeeds', 'FamilyIs4ps',
        'FamilySoloParent', 'FamilyIndigenous', 'FamilyInformalSettler',
        'DateOfAdmission'
    ]].copy()

    static_df['DateOfAdmission'] = pd.to_datetime(static_df['DateOfAdmission'], errors='coerce')
    static_df['days_in_care'] = (
        (pd.Timestamp('today') - static_df['DateOfAdmission']).dt.days
        .fillna(0).astype(int)
    )

    static_df = static_df.rename(columns={
        'ResidentId':           'resident_id',
        'IsPwd':                'is_pwd',
        'HasSpecialNeeds':      'has_special_needs',
        'FamilyIs4ps':          'family_is_4ps',
        'FamilySoloParent':     'family_solo_parent',
        'FamilyIndigenous':     'family_indigenous',
        'FamilyInformalSettler':'family_informal_settler',
    }).drop(columns=['DateOfAdmission'])

    # --- Counseling features from ProcessRecordings ---
    pr = fetch_table(supabase, "ProcessRecordings")
    if not pr.empty:
        state_score = {
            'Happy': 2, 'Hopeful': 1, 'Calm': 1,
            'Distressed': -2, 'Angry': -1, 'Anxious': -1, 'Sad': -1, 'Withdrawn': -1
        }
        pr['session_improvement'] = (
            pr['EmotionalStateEnd'].map(state_score)
            - pr['EmotionalStateObserved'].map(state_score)
        )
        counseling_features = pr.groupby('ResidentId').agg(
            avg_session_duration  = ('SessionDurationMinutes', 'mean'),
            progress_rate         = ('ProgressNoted', 'mean'),
            avg_state_improvement = ('session_improvement', 'mean')
        ).reset_index().rename(columns={'ResidentId': 'resident_id'})
    else:
        counseling_features = pd.DataFrame(
            columns=['resident_id', 'avg_session_duration', 'progress_rate', 'avg_state_improvement']
        )

    # --- Education features from EducationRecords ---
    edu = fetch_table(supabase, "EducationRecords")
    if not edu.empty:
        education_features = edu.groupby('ResidentId').agg(
            avg_attendance_rate = ('AttendanceRate', 'mean')
        ).reset_index().rename(columns={'ResidentId': 'resident_id'})
    else:
        education_features = pd.DataFrame(columns=['resident_id', 'avg_attendance_rate'])

    # --- Health features from HealthWellbeingRecords ---
    health = fetch_table(supabase, "HealthWellbeingRecords")
    if not health.empty:
        health_features = health.groupby('ResidentId').agg(
            avg_general_health = ('GeneralHealthScore', 'mean')
        ).reset_index().rename(columns={'ResidentId': 'resident_id'})
    else:
        health_features = pd.DataFrame(columns=['resident_id', 'avg_general_health'])

    # --- Incident features from IncidentReports ---
    inc = fetch_table(supabase, "IncidentReports")
    if not inc.empty:
        inc['severity_num'] = inc['Severity'].map({'Low': 1, 'Medium': 2, 'High': 3})
        incident_features = inc.groupby('ResidentId').agg(
            incident_count = ('IncidentId', 'count'),
            avg_severity   = ('severity_num', 'mean')
        ).reset_index().rename(columns={'ResidentId': 'resident_id'})
    else:
        incident_features = pd.DataFrame(columns=['resident_id', 'incident_count', 'avg_severity'])

    # --- Intervention plan features from InterventionPlans ---
    ip = fetch_table(supabase, "InterventionPlans")
    if not ip.empty:
        plan_features = ip.groupby('ResidentId').agg(
            pct_achieved = ('Status', lambda x: (x == 'Achieved').mean())
        ).reset_index().rename(columns={'ResidentId': 'resident_id'})
    else:
        plan_features = pd.DataFrame(columns=['resident_id', 'pct_achieved'])

    # --- Home visitation features from HomeVisitations ---
    hv = fetch_table(supabase, "HomeVisitations")
    if not hv.empty:
        hv['coop_score'] = hv['FamilyCooperationLevel'].map({
            'Highly Cooperative': 2, 'Cooperative': 1, 'Neutral': 0, 'Uncooperative': -1
        })
        visit_features = hv.groupby('ResidentId').agg(
            avg_family_coop = ('coop_score', 'mean')
        ).reset_index().rename(columns={'ResidentId': 'resident_id'})
    else:
        visit_features = pd.DataFrame(columns=['resident_id', 'avg_family_coop'])

    # --- Merge all feature tables (left join on resident_id) ---
    dfs = [
        static_df.set_index('resident_id'),
        counseling_features.set_index('resident_id'),
        education_features.set_index('resident_id'),
        health_features.set_index('resident_id'),
        incident_features.set_index('resident_id'),
        plan_features.set_index('resident_id'),
        visit_features.set_index('resident_id'),
    ]
    model_df = reduce(lambda a, b: a.join(b, how='left'), dfs).reset_index()

    # Fill NaN: residents with no records in a table get 0 (no incidents, no sessions, etc.)
    numeric_cols = model_df.select_dtypes(include=[np.number]).columns
    model_df[numeric_cols] = model_df[numeric_cols].fillna(0)

    return model_df


def _use_joblib_only() -> bool:
    return os.environ.get("ML_USE_JOBLIB_ONLY", "").strip().lower() in ("1", "true", "yes")


def run_scorer():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Missing SUPABASE_URL or SUPABASE_KEY environment variables.")
        raise SystemExit(1)

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    model = None
    threshold = DEFAULT_THRESHOLD
    if _use_joblib_only():
        print("ML_USE_JOBLIB_ONLY set: loading committed joblib artifact.")
    else:
        from resident_progress_train import train_and_calibrate_from_supabase

        trained = train_and_calibrate_from_supabase(supabase)
        if trained is not None:
            model, threshold = trained
            print("Using resident classifier trained from Supabase this run.")
        else:
            print("Training from Supabase unavailable; falling back to committed joblib.")

    if model is None:
        if not os.path.isfile(MODEL_PATH):
            print(f"ERROR: Model not found at {MODEL_PATH}")
            raise SystemExit(1)
        model = joblib.load(MODEL_PATH)
        threshold = load_stall_threshold()
        print(f"Loaded model from {MODEL_PATH}")
    print(
        f"Decision threshold P(Stalling) >= {threshold} "
        f"(from training or {THRESHOLD_META_PATH} or default {DEFAULT_THRESHOLD})"
    )

    # Fetch active residents; score every active resident each run
    resp = supabase.table("Residents").select("*").eq("CaseStatus", "Active").execute()
    all_active = resp.data or []

    residents_to_score = all_active

    if not residents_to_score:
        print("No active residents found. Exiting.")
        return

    print(f"Scoring {len(residents_to_score)} active residents...")

    # Build feature dataframe from Supabase data
    residents_df = pd.DataFrame(residents_to_score)
    feature_df = build_features(residents_df, supabase)

    scored, skipped = 0, 0
    for resident in residents_to_score:
        resident_id = resident["ResidentId"]
        row = feature_df[feature_df['resident_id'] == resident_id].drop(
            columns=['resident_id'], errors='ignore'
        )

        if row.empty:
            print(f"  ⚠  Resident {resident_id}: no feature row found, skipping.")
            skipped += 1
            continue

        prob = stall_probability(model, row)
        label = "Stalling" if prob >= threshold else "OK"

        supabase.table("Residents").update({
            "MlPredictionStatus": label,
            "MlLastCalculated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        }).eq("ResidentId", resident_id).execute()

        print(f"  ✓  Resident {resident_id} → {label}  (P(Stalling)={prob:.3f})")
        scored += 1

    print(f"\nFinished. Scored: {scored} | Skipped: {skipped}")


if __name__ == '__main__':
    run_scorer()
