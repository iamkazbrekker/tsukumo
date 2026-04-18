import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_heart_risk():
    print("\n[Test 1] Testing Heart Risk Trigger...")
    payload = {
        "heart_rate": 130,
        "blood_pressure_systolic": 160,
        "blood_pressure_diastolic": 95,
        "spo2": 95,
        "age": 45,
        "gender": 1,
        "sleep_hours": 7
    }
    response = requests.post(f"{BASE_URL}/vitals", json=payload)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

def test_lung_risk():
    print("\n[Test 2] Testing Lung Risk Trigger...")
    payload = {
        "heart_rate": 72,
        "blood_pressure_systolic": 120,
        "blood_pressure_diastolic": 80,
        "spo2": 85,
        "age": 30,
        "gender": 0,
        "sleep_hours": 8
    }
    response = requests.post(f"{BASE_URL}/vitals", json=payload)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

def test_mental_health_risk():
    print("\n[Test 3] Testing Mental Health Risk Trigger...")
    payload = {
        "heart_rate": 95,
        "blood_pressure_systolic": 120,
        "blood_pressure_diastolic": 80,
        "spo2": 95,
        "age": 25,
        "gender": 1,
        "sleep_hours": 3
    }
    response = requests.post(f"{BASE_URL}/vitals", json=payload)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    try:
        test_heart_risk()
        test_lung_risk()
        test_mental_health_risk()
    except Exception as e:
        print(f"Error: {e}")
