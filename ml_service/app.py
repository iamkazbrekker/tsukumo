import os
import sys
import pickle
from flask import Flask, request, jsonify
from flask_cors import CORS

# ── Allow importing the engine from the same directory ────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app)

# ── Generic pickle loader ─────────────────────────────────────────────────────
def load_model(path):
    try:
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
WHATIF_ENGINE_PATH = os.path.join(BASE_DIR, 'public', 'whatif_model.pkl')

# ── Load everything at startup ────────────────────────────────────────────────
cardiac_model  = load_model(CARDIAC_MODEL_PATH)
diabetes_model = load_model(DIABETES_MODEL_PATH)
burnout_model  = load_model(BURNOUT_MODEL_PATH)
# Always import the engine from source (no pkl needed — no fitted weights).
# The pkl path is kept as an optional precomputed cache for faster cold starts.
try:
    from whatif_engine import WhatIfEngine as _WhatIfEngineCls
    _cached = load_model(WHATIF_ENGINE_PATH)
    whatif_engine = _cached if (_cached is not None and hasattr(_cached, 'run')) else _WhatIfEngineCls()
    print(f"✅  WhatIfEngine ready (pkl_cache={'yes' if _cached else 'no'}, v{whatif_engine.VERSION})")
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
        # Convert dictionary to a 2D list for sklearn without pandas
        # Assuming the models require specific feature order, we fallback to just passing a 2D array built from dict
        # The exact feature order should ideally match the model's training order.
        # We will extract features dynamically if possible, or just build a basic array.
        row = []
        if type(data) is dict:
           # Attempting to safely extract values sorted by key or standard list
           # Some sklearn models accept a list of dicts directly if Pipeline has DictVectorizer, 
           # otherwise they accept 2D numerical arrays.
           features = ['age', 'sysBP', 'diaBP', 'heartRate', 'totChol', 'HDLChol', 'glucose', 'bmi', 'currentSmoker', 'cigarettes_per_day', 'prevalentHyp', 'sleep_hours', 'physical_activity_met', 'sodium_mg_per_day', 'alcohol_drinks_per_week', 'diabetes']
           row = [[float(data.get(f, 0.0)) for f in features]]
        else:
           # fallback unstructured
           row = [[float(v) for v in data.values()]]

        if cardiac_model:
            cardiac_pred = cardiac_model.predict(row)[0]
            results['cardiac_arrest_risk'] = int(cardiac_pred)

        if diabetes_model:
            diabetes_pred = diabetes_model.predict(row)[0]
            results['diabetes_risk'] = int(diabetes_pred)

        if burnout_model:
            # Burnout might use different features, pass bare array as well
            burnout_pred = burnout_model.predict(row)[0]
            results['burnout_risk'] = int(burnout_pred)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"predictions": results, "input": data})

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
            patient_data   = patient_data,
            cardiac_model  = cardiac_model,
            diabetes_model = diabetes_model,
            n              = n,
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
