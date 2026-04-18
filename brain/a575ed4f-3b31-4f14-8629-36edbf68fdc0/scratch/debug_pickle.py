import pickle
import os

path = r"f:\tsukumo\Agentic AI\rf_model (1).pkl"
try:
    with open(path, "rb") as f:
        data = f.read(100)
        print(f"First 100 bytes: {data}")
        f.seek(0)
        # Try to load with different protocols or just see the error
        try:
            model = pickle.load(f)
            print("Successfully loaded model!")
        except Exception as e:
            print(f"Error loading pickle: {e}")
except Exception as e:
    print(f"System error: {e}")
