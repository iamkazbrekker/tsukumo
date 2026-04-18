import os
import pickle
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load Models Safely
def load_model(path):
    try:
        with open(path, 'rb') as f:
            return pickle.load(f)
    except Exception as e:
        print(f"Warning: Failed to load {path} - {e}")
        return None

# Resolve absolute path relative to ml_service location
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDIAC_MODEL_PATH = os.path.join(BASE_DIR, 'public', 'cardiac-arrest.pkl')
DIABETES_MODEL_PATH = os.path.join(BASE_DIR, 'public', 'diabetes.pkl')

cardiac_model = load_model(CARDIAC_MODEL_PATH)
diabetes_model = load_model(DIABETES_MODEL_PATH)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "cardiac_loaded": cardiac_model is not None, "diabetes_loaded": diabetes_model is not None})

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON data provided"}), 400

    results = {}
    
    # We expect data to be a dictionary representing a row, or list of rows
    try:
        df = pd.DataFrame([data])
        
        if cardiac_model:
            # You may need to map specific subset of columns for each model based on their training
            cardiac_pred = cardiac_model.predict(df)[0]
            results['cardiac_arrest_risk'] = int(cardiac_pred)
            
        if diabetes_model:
            diabetes_pred = diabetes_model.predict(df)[0]
            results['diabetes_risk'] = int(diabetes_pred)
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"predictions": results, "input": data})

if __name__ == '__main__':
    print("Starting ML Service on port 5000...")
    app.run(port=5000, debug=True)
