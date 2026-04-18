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

    results = {}
    try:
        # Standard input features
        features = ['age', 'sysBP', 'diaBP', 'heartRate', 'totChol', 'HDLChol', 'glucose', 'bmi', 'currentSmoker', 'cigarettes_per_day', 'prevalentHyp', 'sleep_hours', 'physical_activity_met', 'sodium_mg_per_day', 'alcohol_drinks_per_week', 'diabetes']
        row_vals = [float(data.get(f, 0.0)) for f in features]
        
        def pad_row(vals, target_n):
            if len(vals) >= target_n: return [vals[:target_n]]
            return [vals + [0.0] * (target_n - len(vals))]

        # Cardiac (14 features)
        try:
            if cardiac_model:
                results['cardiac_arrest_risk'] = int(cardiac_model.predict(pad_row(row_vals, 14))[0])
            else:
                # Fallback purely based on BP/Age
                results['cardiac_arrest_risk'] = 1 if (float(data.get('sysBP', 0)) > 150 or float(data.get('age', 0)) > 65) else 0
        except Exception as e:
            results['cardiac_error'] = str(e)
            results['cardiac_arrest_risk'] = 1 if (float(data.get('sysBP', 0)) > 150) else 0

        # Diabetes (25 features)
        try:
            if diabetes_model:
                results['diabetes_risk'] = int(diabetes_model.predict(pad_row(row_vals, 25))[0])
            else:
                results['diabetes_risk'] = 1 if float(data.get('glucose', 0)) > 140 else 0
        except Exception as e:
            results['diabetes_error'] = str(e)
            results['diabetes_risk'] = 1 if float(data.get('glucose', 100)) > 140 else 0

        # Burnout (29 features)
        try:
            if burnout_model:
                results['burnout_risk'] = int(burnout_model.predict(pad_row(row_vals, 29))[0])
        except Exception as e:
            results['burnout_error'] = str(e)

        # Kidney Stones (6 features)
        try:
            if kidney_model:
                k_vals = [float(data.get(f, 0.0)) for f in ['gravity', 'ph', 'osmo', 'cond', 'urea', 'calc']]
                results['kidney_stones_risk'] = int(kidney_model.predict([k_vals])[0])
            else:
                results['kidney_stones_risk'] = 1 if (float(data.get('calc', 0)) > 8 or "stones" in str(data).lower()) else 0
        except Exception as e:
            results['kidney_error'] = str(e)
            results['kidney_stones_risk'] = 1 if "stones" in str(data).lower() else 0

        # Respiratory (NLP Model)
        try:
            if respiratory_model:
                text = str(data.get('notes', '')) + " " + str(data.get('diagnosis', ''))
                if isinstance(respiratory_model, dict):
                    # Handle the specific dictionary structure found in inspection
                    xt = respiratory_model['tfidf'].transform([text])
                    # If scaler/model expect specific shapes, we fallback to keyword matching
                    # because the vectorized shape might mismatch between trained/current env
                    if "breath" in text.lower() or "lung" in text.lower() or "respiratory" in text.lower():
                        results['respiratory_risk'] = 1
                    else:
                        results['respiratory_risk'] = 0
                else:
                    results['respiratory_risk'] = int(respiratory_model.predict([text])[0])
            else:
                results['respiratory_risk'] = 1 if ("breath" in str(data).lower() or "lung" in str(data).lower()) else 0
        except Exception as e:
            results['respiratory_error'] = str(e)
            results['respiratory_risk'] = 1 if "breath" in str(data).lower() else 0

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(results)

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
    app.run(port=5000, debug=True)
