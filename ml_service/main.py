import os
import sys
import pickle
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
from tenacity import retry, stop_after_attempt, wait_fixed

# Configure logging for "Internal Monologue"
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TsukumoAgent")

# Ensure ml_service directory is in path for local imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from knowledge_graph import KnowledgeGraph
from agents import AgentOrchestrator
from phm_pipeline import PHMPipeline

app = FastAPI(title="TSUKUMO Cognitive Health Twin Backend")
logger.info("TSUKUMO Cognitive Health Twin v3.0 Starting...")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS SETUP ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AGENTIC_AI_DIR = os.path.join(os.path.dirname(BASE_DIR), "Agentic AI")

def load_model(name):
    path = os.path.join(AGENTIC_AI_DIR, name)
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception as e:
        logger.warning(f"Failed to load {name}: {e}")
        return None

# Load ML models
heart_model = load_model("rf_model (1).pkl")
mental_health_model = load_model("burnout_risk_model.pkl")

# --- COGNITIVE HEALTH TWIN COMPONENTS ---
knowledge_graph = KnowledgeGraph()
agent_orchestrator = AgentOrchestrator(knowledge_graph)
phm_pipeline = PHMPipeline(window_days=90)

logger.info("Cognitive Health Twin components initialized:")
logger.info(f"  Knowledge Graph: {len(knowledge_graph.nodes)} nodes, {len(knowledge_graph.edges)} edges")
logger.info(f"  Agent Orchestrator: 3 agents (Retriever, Analyst, Summarizer)")
logger.info(f"  PHM Pipeline: 90-day window with synthetic history")

# --- DATA MODELS ---
class VitalsInput(BaseModel):
    heart_rate: float
    blood_pressure_systolic: float
    blood_pressure_diastolic: float
    spo2: float
    age: int
    gender: int  # 1 for Male, 0 for Female
    sleep_hours: float
    stress_level: Optional[float] = None
    glucose_level: Optional[float] = None
    bmi: Optional[float] = None

class BookingConfirmation(BaseModel):
    booking_id: str
    preferred_time_window: str

# --- AGENT TOOLS ---
@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
async def book_healer_appointment_api(specialty: str, urgency: str, preferred_time_window: str, context_summary: str):
    """
    Simulates a connection to a healthcare provider API (like Practo).
    """
    logger.info(f"[Agent Tool] Connecting to Healer Provider API for {specialty}...")
    
    # Simulate API latency
    await asyncio.sleep(1)
    
    # Simulate random failure for retry logic demonstration (10% chance)
    if np.random.rand() < 0.1:
        logger.error("[Agent Tool] API Connection Failed. Triggering Retry...")
        raise Exception("API Timeout")

    booking_id = f"TSUKUMO-{np.random.randint(1000, 9999)}"
    healers = {
        "Heart": "Dr. Arisatya (Senior Cardiologist)",
        "Lung": "Dr. Vayu (Pulmonologist)",
        "Mental": "Dr. Prana (Cognitive Counselor)",
        "Kidney": "Dr. Varuna (Renal Specialist)"
    }
    
    healer_name = healers.get(specialty, "Dr. Charaka")
    appointment_time = (datetime.now() + timedelta(days=1)).isoformat()

    return {
        "booking_id": booking_id,
        "status": "Confirmed",
        "healer_name": healer_name,
        "time": appointment_time,
        "specialty": specialty,
        "urgency": urgency,
        "context": context_summary
    }

# --- AGENT REASONING LOGIC ---
class AppointmentAgent:
    def __init__(self):
        self.monologue = []

    def add_thought(self, thought: str):
        self.monologue.append(f"[{datetime.now().strftime('%H:%M:%S')}] {thought}")
        logger.info(f"Thought: {thought}")

    async def evaluate_vitals(self, vitals: VitalsInput):
        self.monologue = []
        self.add_thought("Initiating holistic physiological analysis...")
        
        # 1. Cardiac Factor
        heart_risk = 0.0
        if heart_model:
            try:
                # Features: age, gender, heart_rate, bp_systolic, bp_diastolic
                df = pd.DataFrame([[vitals.age, vitals.gender, vitals.heart_rate, vitals.blood_pressure_systolic, vitals.blood_pressure_diastolic]])
                heart_risk = float(heart_model.predict_proba(df)[0][1])
                self.add_thought(f"ML Model identifies cardiac risk: {heart_risk:.2f}")
            except Exception as e:
                self.add_thought(f"Model inference failed ({e}), falling back to heuristic.")
                heart_risk = 0.85 if vitals.heart_rate > 120 or vitals.blood_pressure_systolic > 160 else 0.1
        else:
            heart_risk = 0.85 if vitals.heart_rate > 110 and vitals.blood_pressure_systolic > 150 else 0.1
            self.add_thought(f"Heuristic cardiac risk: {heart_risk:.2f}")

        # 2. Respiratory Factor (SpO2)
        lung_risk = 0.0
        if vitals.spo2 < 90:
            lung_risk = 0.95
        elif vitals.spo2 < 94:
            lung_risk = 0.6
        elif vitals.spo2 < 96:
            lung_risk = 0.3
        else:
            lung_risk = 0.05
        self.add_thought(f"Respiratory analysis (SpO2 {vitals.spo2}%): Factor score {lung_risk:.2f}")

        # 3. Mental Fatigue Factor (Sleep)
        mental_risk = 0.0
        if vitals.sleep_hours < 4:
            mental_risk = 0.9
        elif vitals.sleep_hours < 6:
            mental_risk = 0.6
        elif vitals.sleep_hours < 7:
            mental_risk = 0.3
        else:
            mental_risk = 0.1
        self.add_thought(f"Sleep/Fatigue analysis ({vitals.sleep_hours}h): Factor score {mental_risk:.2f}")

        # 4. Stress Factor (Direct Input)
        stress_score = vitals.stress_level if vitals.stress_level is not None else 0.1
        self.add_thought(f"Direct neural stress baseline: {stress_score:.2f}")

        # --- HOLISTIC COMBINATION ---
        # Weighted aggregate: Cardiac(40%), Respiratory(30%), Mental(20%), Stress(10%)
        composite_risk = (heart_risk * 0.4) + (lung_risk * 0.3) + (mental_risk * 0.2) + (stress_score * 0.1)
        self.add_thought(f"Calculated Composite Health Conflict Score: {composite_risk:.2f}")

        prepped_booking = None
        
        # Determine if collective factors warrant a High Risk flag
        # Threshold: 0.4 for composite (multi-factor strain), or any individual factor > 0.7
        if composite_risk > 0.45 or heart_risk > 0.75 or lung_risk > 0.8 or stress_score > 0.8:
            self.add_thought("Collective physiological strain exceeds baseline safety thresholds.")
            
            # Identify highest contributor for specialty determination
            risks = {"Heart": heart_risk, "Lung": lung_risk, "Mental": mental_risk}
            primary_specialty = max(risks, key=risks.get)
            
            reasons = []
            if heart_risk > 0.4: reasons.append("cardiac variance")
            if lung_risk > 0.4: reasons.append("breath restriction")
            if mental_risk > 0.4: reasons.append("synaptic fatigue")
            if stress_score > 0.6: reasons.append("extreme neural stress")
            
            reason_str = ", ".join(reasons) if reasons else "systemic disharmony"
            
            prepped_booking = {
                "specialty": primary_specialty,
                "urgency": "High" if composite_risk > 0.5 or heart_risk > 0.8 or lung_risk > 0.8 or stress_score > 0.8 else "Medium",
                "reason": f"Collective Alert: {reason_str.capitalize()}. Holistic Stress Index: {composite_risk:.2f}",
                "recommended_window": "ASAP (Within 2 hours)" if composite_risk > 0.5 or heart_risk > 0.8 or lung_risk > 0.8 else "Today"
            }

            # --- TRIGGER COGNITIVE HEALTH TWIN ---
            self.add_thought("Triggering Cognitive Health Twin — Agentic Graph RAG pipeline...")

        else:
            self.add_thought("Biological markers show collective stability. Proceeding with routine monitoring.")

        return {
            "prepped_booking": prepped_booking,
            "monologue": self.monologue,
            "composite_risk": float(composite_risk),
            "stress_level": float(stress_score)
        }

agent = AppointmentAgent()

# --- ENDPOINTS ---
@app.post("/vitals")
async def process_vitals(vitals: VitalsInput):
    """
    Main endpoint: processes vitals through all three systems:
    1. Appointment Agent (composite risk)
    2. PHM Pipeline (temporal analysis)
    3. Agentic Graph RAG (knowledge reasoning) — if risk elevated
    """
    # 1. Original agent evaluation
    result = await agent.evaluate_vitals(vitals)
    
    # 2. PHM Pipeline — ingest and analyze temporal data
    vitals_dict = {
        "heart_rate": vitals.heart_rate,
        "blood_pressure_systolic": vitals.blood_pressure_systolic,
        "blood_pressure_diastolic": vitals.blood_pressure_diastolic,
        "spo2": vitals.spo2,
        "sleep_hours": vitals.sleep_hours,
        "stress_level": vitals.stress_level or 0.1,
    }
    if vitals.glucose_level is not None:
        vitals_dict["glucose_level"] = vitals.glucose_level
    if vitals.bmi is not None:
        vitals_dict["bmi"] = vitals.bmi

    phm_result = phm_pipeline.ingest("patient_001", vitals_dict)
    
    # 3. Agentic Graph RAG — run if risk is elevated
    cht_data = None
    if result["composite_risk"] > 0.3 or phm_result.health_tier >= 3:
        full_vitals = {**vitals_dict, "age": vitals.age}
        cht_data = agent_orchestrator.run_pipeline("patient_001", full_vitals, result["composite_risk"])
    
    response = {
        "status": "success",
        "timestamp": datetime.now().isoformat(),
        "prepped_booking": result["prepped_booking"],
        "internal_monologue": result["monologue"],
        "composite_risk": result["composite_risk"],
        "stress_level": result["stress_level"],
        "phm": phm_result.to_dict(),
        "cht": cht_data,
    }
    
    return response

@app.post("/confirm-booking")
async def confirm_booking(confirmation: BookingConfirmation):
    """
    Finalizes the booking after user confirmation.
    """
    # In a real app, we'd retrieve the prepped data from a session/db
    # Here we use dummy data for the simulation based on the ID format
    specialty = "Heart" if "HEART" in confirmation.booking_id.upper() else "Mental"
    if "LUNG" in confirmation.booking_id.upper(): specialty = "Lung"
    
    try:
        result = await book_healer_appointment_api(
            specialty=specialty,
            urgency="High", 
            preferred_time_window=confirmation.preferred_time_window,
            context_summary="User confirmed booking via Tsukumo Dashboard."
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Booking failed after retries: {str(e)}")

@app.get("/knowledge-graph")
async def get_knowledge_graph(patient_id: str = "patient_001"):
    """Return the knowledge graph structure for visualization."""
    return knowledge_graph.to_visualization_data(patient_id)

@app.get("/phm-timeline/{patient_id}")
async def get_phm_timeline(patient_id: str):
    """Return PHM temporal data for a patient."""
    result = phm_pipeline.analyze(patient_id)
    return result.to_dict()

@app.get("/explainability/{patient_id}")
async def get_explainability(patient_id: str):
    """Return SHAP-like feature importances."""
    result = phm_pipeline.analyze(patient_id)
    return {
        "feature_importances": result.feature_importances,
        "health_tier": result.health_tier,
        "tier_name": result.tier_name,
        "composite_phm_score": result.composite_phm_score,
    }

@app.get("/agent-narrative/{patient_id}")
async def get_agent_narrative(patient_id: str):
    """Return the Summarizer Agent's narrative for a patient."""
    history = phm_pipeline.patient_history.get(patient_id, [])
    if not history:
        return {"narrative": "No patient data available."}
    
    latest_vitals = history[-1].vitals
    phm_result = phm_pipeline.analyze(patient_id)
    cht_data = agent_orchestrator.run_pipeline(patient_id, latest_vitals, phm_result.composite_phm_score)
    
    return {
        "narrative": cht_data.get("narrative", {}),
        "analysis": cht_data.get("analysis", {}),
        "retrieval": cht_data.get("retrieval", {}),
    }

@app.get("/cht-full/{patient_id}")
async def get_cht_full(patient_id: str):
    """
    Full Cognitive Health Twin data endpoint.
    Returns combined PHM + Graph RAG + Agent data.
    """
    # PHM analysis
    phm_result = phm_pipeline.analyze(patient_id)
    
    # Get latest vitals
    history = phm_pipeline.patient_history.get(patient_id, [])
    if not history:
        return {"error": "No patient data available"}
    
    latest_vitals = history[-1].vitals
    
    # Agent pipeline
    cht_data = agent_orchestrator.run_pipeline(patient_id, latest_vitals, phm_result.composite_phm_score)
    
    return {
        "patient_id": patient_id,
        "timestamp": datetime.now().isoformat(),
        "phm": phm_result.to_dict(),
        "graph_rag": cht_data,
        "graph_visualization": knowledge_graph.to_visualization_data(patient_id),
    }

@app.get("/health")
def health():
    return {
        "status": "Cognitive Health Twin Online",
        "components": {
            "knowledge_graph": f"{len(knowledge_graph.nodes)} nodes, {len(knowledge_graph.edges)} edges",
            "phm_pipeline": "active",
            "agent_orchestrator": "3 agents ready",
            "ml_models": {
                "cardiac": heart_model is not None,
                "mental_health": mental_health_model is not None,
            }
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
