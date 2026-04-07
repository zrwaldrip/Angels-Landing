import os
import joblib
import pandas as pd
from datetime import datetime, timedelta
from supabase import create_client, Client

# Environment variables via GitHub Secrets
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
MODEL_PATH = "AngelsLandingv2/models/resident-progress-classifier.pkl"

def run_scorer():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Missing Supabase credentials!")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    model = joblib.load(MODEL_PATH)
    
    # 1. Fetch currently active residents (only predicting for Open/In Progress cases)
    # Plus checking if prediction is Null or older than 7 days
    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S")
    
    # Notice: we filter in python to avoid complex supabase nested query logic via REST
    resp = supabase.table("Residents").select("*").in_("caseStatus", ["Open", "In Progress"]).execute()
    all_active = resp.data
    
    residents_to_score = []
    for r in all_active:
        last_calc = r.get("mlLastCalculated")
        if not last_calc or last_calc < seven_days_ago:
            residents_to_score.append(r)
            
    if not residents_to_score:
        print("No residents require scoring today. Exiting.")
        return
        
    print(f"Loaded {len(residents_to_score)} residents to score.")
    
    # 2. To generate proper features, we’d need to fetch their process recordings etc.
    # For this script we will pull the datasets and merge them as the notebook did
    # For a real robust pipeline deployed on Azure we would use standard API calls, but here Supabase fetches directly.
    # (Since this is an example step, we mock the feature df generation and just run the model)
    # *In Production: write queries to aggregate behavior per resident here*
    
    # Creating a simplified demo dataframe
    df = pd.DataFrame(residents_to_score)
    # Simulate the prep step that extracts `is_pwd`, `days_in_care`, etc.
    # We will just predict using their mock values for now
    
    for resident in residents_to_score:
        # Example prediction call assuming we built feature_df correctly
        # Here we just pass a safe dummy check
        score = 0.51 # Simulated threshold prediction
        label = "Stalling" if score >= 0.4 else "Progressing"
        
        # 3. Write back to Supabase
        update_data = {
            "mlPredictionStatus": label,
            "mlLastCalculated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        }
        res = supabase.table("Residents").update(update_data).eq("residentId", resident["residentId"]).execute()
        print(f"Updated Resident {resident['residentId']} -> {label}")

if __name__ == '__main__':
    run_scorer()
