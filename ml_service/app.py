import os
import sys
import pickle
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app)

def load_model(path):
    try:
        try:
            return joblib.load(path)
        except:
            with open(path, 'rb') as f:
                return pickle.load(f)
    except Exception as e:
        print(f"Warning: Failed to load {path} - {e}")
        return None

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR           = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDIAC_MODEL_PATH = os.path.join(BASE_DIR, 'public', 'cardiac-arrest.pkl')
DIABETES_MODEL_PATH= os.path.join(BASE_DIR, 'public', 'diabetes.pkl')
BURNOUT_MODEL_PATH = os.path.join(BASE_DIR, 'public', 'burnout_risk_model.pkl')
KIDNEY_MODEL_PATH  = os.path.join(BASE_DIR, 'public', 'rf_kidney_stones.pkl')
RESP_MODEL_PATH    = os.path.join(BASE_DIR, 'public', 'respiratory_model.pkl')
WHATIF_ENGINE_PATH = os.path.join(BASE_DIR, 'public', 'whatif_model.pkl')

cardiac_model     = load_model(CARDIAC_MODEL_PATH)
diabetes_model    = load_model(DIABETES_MODEL_PATH)
burnout_model     = load_model(BURNOUT_MODEL_PATH)
kidney_model      = load_model(KIDNEY_MODEL_PATH)
respiratory_model = load_model(RESP_MODEL_PATH)

try:
    from whatif_engine import WhatIfEngine as _WhatIfEngineCls
    _cached = load_model(WHATIF_ENGINE_PATH)
    # Check for specific attributes to ensure it's not a stale pickle
    is_valid = _cached is not None and hasattr(_cached, 'run') and hasattr(_cached, 'kidney_features')
    whatif_engine = _cached if is_valid else _WhatIfEngineCls()
    print(f"WhatIfEngine ready (pkl_cache={'yes' if is_valid else 'no'}, v{whatif_engine.VERSION})")
except Exception as e:
    whatif_engine = None
    print(f"Warning: WhatIfEngine unavailable: {e}")

# ── /health ───────────────────────────────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status":          "healthy",
        "cardiac_loaded":  cardiac_model  is not None,
        "diabetes_loaded": diabetes_model is not None,
        "burnout_loaded":  burnout_model  is not None,
        "kidney_loaded":   kidney_model   is not None,
        "resp_loaded":     respiratory_model is not None,
        "whatif_loaded":   whatif_engine  is not None,
    })

# ── /predict ──────────────────────────────────────────────────────────────────
@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    results = {
        'cardiac_arrest_risk': 0,
        'diabetes_risk': 0,
        'burnout_risk': 0,
        'kidney_stones_risk': 0,
        'respiratory_risk': 0
    }
    
    try:
        # Standard input features
        features = ['age', 'sysBP', 'diaBP', 'heartRate', 'totChol', 'HDLChol', 'glucose', 'bmi', 'currentSmoker', 'cigarettes_per_day', 'prevalentHyp', 'sleep_hours', 'physical_activity_met', 'sodium_mg_per_day', 'alcohol_drinks_per_week', 'diabetes']
        row_vals = [float(data.get(f, 0.0)) for f in features]
        
        def pad_row(vals, target_n):
            if len(vals) >= target_n: return [vals[:target_n]]
            return [vals + [0.0] * (target_n - len(vals))]

        # Cardiac
        if cardiac_model:
            c_pred = int(cardiac_model.predict(pad_row(row_vals, 14))[0])
            # If BP and HR are perfect, ignore the model's 1-prediction
            if c_pred == 1 and float(data.get('sysBP', 0)) < 140 and float(data.get('heartRate', 0)) < 110:
                c_pred = 0
            results['cardiac_arrest_risk'] = c_pred
        else:
            results['cardiac_arrest_risk'] = 1 if (float(data.get('sysBP', 0)) > 155 or float(data.get('heartRate', 0)) > 130) else 0

        # Diabetes
        if diabetes_model:
            d_pred = int(diabetes_model.predict(pad_row(row_vals, 25))[0])
            if d_pred == 1 and float(data.get('glucose', 0)) < 130:
                d_pred = 0
            results['diabetes_risk'] = d_pred
        else:
            results['diabetes_risk'] = 1 if float(data.get('glucose', 0)) > 140 else 0

        # Burnout
        results['burnout_risk'] = 1 if float(data.get('activity', 0)) > 0.9 else 0

        # Kidney Stones
        if kidney_model:
            import pandas as pd
            k_default = {'gravity':1.015, 'ph':6.5, 'osmo':600, 'cond':20, 'urea':300, 'calc':3}
            k_vals = [float(data.get(f, k_default[f])) for f in ['gravity', 'ph', 'osmo', 'cond', 'urea', 'calc']]
            k_df = pd.DataFrame([k_vals], columns=['gravity', 'ph', 'osmo', 'cond', 'urea', 'calc'])
            results['kidney_stones_risk'] = int(kidney_model.predict(k_df)[0])

        # Respiratory
        text = str(data.get('notes', '')) + " " + str(data.get('diagnosis', ''))
        if "breath" in text.lower() or "lung" in text.lower():
            results['respiratory_risk'] = 1
        else:
            results['respiratory_risk'] = 0

        # --- Holistic Agent Reasoning ---
        # Calculate composite risk for the dashboard
        c_risk = (results['cardiac_arrest_risk'] * 0.6) + (results['respiratory_risk'] * 0.3) + (results['burnout_risk'] * 0.1)
        
        prepped_booking = None
        monologue = ["ML Service: Scan complete. Vitals healthy."]
        
        if c_risk > 0.5 or results['cardiac_arrest_risk'] == 1:
            monologue = ["Alert: Biological variance requires clinical check."]
            prepped_booking = {
                "specialty": "Heart",
                "urgency": "High",
                "reason": "Elevated predicted cardiac risk from live IoT stream.",
                "recommended_window": "ASAP (Within 2 hours)"
            }
        
        print(f"PREDICT: HR={data.get('heartRate')}, CardiacRisk={results['cardiac_arrest_risk']}, Composite={c_risk}")
        
        return jsonify({
            "status": "success",
            "predictions": results,
            "composite_risk": float(c_risk),
            "prepped_booking": prepped_booking,
            "internal_monologue": monologue,
            "stress_level": 0.1 + (results['burnout_risk'] * 0.4)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── /whatif ───────────────────────────────────────────────────────────────────
@app.route('/whatif', methods=['POST'])
def whatif():
    """
    Monte Carlo What-If endpoint.

    Request body (JSON)
    -------------------
    {
      "patient": { ...PatientProfile fields... },
      "n":       5000,          // optional — cohort size (default 5000)
      "weeks":   24             // optional — trajectory horizon (default 24)
    }

    Response
    --------
    {
      "scenarios":            [...],   // per-scenario risk summaries
      "trajectory":           [...],   // week-by-week cardiac risk trajectory
      "feature_sensitivity":  {...},   // tornado data per model
      "summary":              "..."    // human-readable text
    }
    """
    if whatif_engine is None:
        return jsonify({"error": "WhatIf engine not available"}), 503

    body = request.json or {}
    patient_data = body.get("patient", body)   # accept flat or nested payload
    n            = int(body.get("n", 5000))
    weeks        = int(body.get("weeks", 24))

    try:
        result = whatif_engine.run(
            patient_data       = patient_data,
            cardiac_model      = cardiac_model,
            diabetes_model     = diabetes_model,
            kidney_model       = kidney_model,
            respiratory_model  = respiratory_model,
            n                  = n,
            trajectory_weeks = weeks,
        )
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ── entry point ───────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("Starting ML Service on port 5000…")
    app.run(host='0.0.0.0', port=5000)
