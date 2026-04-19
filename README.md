# 🌿 Tsukumo Health Platform

> **Thangka-Inspired Autonomous Healthcare Intelligence**  
> A real-time, multi-organ IoT health monitoring platform powered by agentic AI, predictive machine learning, and ambient clinical dispatch — surfaced across a visual dashboard, an embedded AI assistant (Michi), and a proactive WhatsApp agent (NutriBot).

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Services](#services)
  - [Next.js Dashboard](#1-nextjs-dashboard-port-3000)
  - [ML Microservice](#2-ml-microservice-port-5000)
  - [Tsukumo NutriBot](#3-tsukumo-nutribot-port-4000)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Installation & Setup](#installation--setup)
- [Running Locally](#running-locally)
- [Key Workflows](#key-workflows)
- [ML Models](#ml-models)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)

---

## Overview

Tsukumo is a **full-stack autonomous health intelligence platform** built to demonstrate the convergence of IoT telemetry, multi-organ ML prediction, agentic AI reasoning, and real-time clinical dispatch.

It continuously streams synthetic patient data, infers organ-level disease risk through trained ensemble models, and surfaces actionable insights across three interfaces:

1. A **richly-designed Next.js dashboard** with Thangka-inspired visuals
2. **Michi** — an embedded AI assistant (powered by Gemini 1.5 Flash) that can autonomously trigger dashboard actions via function calling
3. **Tsukumo NutriBot** — a WhatsApp agent that sends proactive health alerts and AI-generated nutrition advice

---

## Features

### 🖥️ Dashboard
- Real-time IoT biometric stream (HR, SpO2, BP, Glucose, BMI, Respiratory Rate)
- Multi-organ risk prediction panels: Cardiac · Renal · Respiratory · Metabolic
- Thangka organ-map UI with dynamic aura effects based on risk level
- Emergency override mode with 30-second autonomous simulation
- CHT (Cognitive Health Twin) — Graph RAG analysis of physiological data
- Monte Carlo What-If simulator for health trajectory projection
- Appointment booking portal with ICS calendar generation and email dispatch
- Hospital discovery via Google Maps Places API
- Notification scroll with severity-coded alerts

### 🤖 Michi (AI Chat Assistant)
- Dual-mode: **Gemini 1.5 Flash** function calling (when API key is set) or **heuristic fallback**
- Autonomously triggers 5 dashboard actions: Vitals analysis, Simulation, Booking, CHT, Hospital search
- Stateful 3-step appointment booking: specialty → doctor → confirm
- Dietary and lifestyle advice tied to live risk data
- Symptom awareness with graceful escalation suggestions

### 📱 NutriBot (WhatsApp)
- WhatsApp Web integration via Baileys SDK (QR auth — no phone number required)
- Proactive spike monitor: polls dashboard every 30 seconds
- Alerts patient and caregiver on critical readings
- AI-generated personalised nutrition guidance per organ system
- Webhook server for push alerts from the dashboard
- Commands: `!status`, `!suggest`, `!heart`, `!lungs`, `!kidneys`

### 🧠 ML Prediction Engine
- 5 trained scikit-learn models: Cardiac, Diabetes, Burnout, Kidney Stones, Respiratory
- Composite risk score with sanity overrides for false positives
- Monte Carlo simulation across 5000 cohorts over a 24-week horizon
- Feature sensitivity (tornado chart) analysis
- `/health` endpoint to verify model load status

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                         Browser / Patient                               │
│  ┌──────────────────────┐         ┌─────────────────────────────────┐  │
│  │   Tsukumo Dashboard  │◄───────►│     Michi AI Chatbot            │  │
│  │   (React / Next.js)  │         │     (ChatBot.tsx)               │  │
│  └──────────────────────┘         └─────────────────────────────────┘  │
└───────────────────────┬────────────────────────┬───────────────────────┘
                        │ HTTP                   │ /api/chat
          ┌─────────────▼──────────────────────────────────────────────┐
          │              Next.js Server (:3000)                         │
          │  /api/drive-monitor  /api/chat   /api/recommend             │
          │  /api/whatif         /api/cht    /api/notify                │
          │  /api/confirm-booking            /api/auth/*                │
          └──────────────┬────────────────────────┬─────────────────────┘
                         │ HTTP :5000             │ Webhook :4000
          ┌──────────────▼──────────┐  ┌──────────▼───────────────────┐
          │   Flask ML Service      │  │   Tsukumo NutriBot           │
          │                         │  │   (Baileys + Express)        │
          │  /predict  /whatif      │  │                              │
          │  /confirm-booking       │  │  Spike Monitor               │
          │  /health                │  │  Webhook Server :4000        │
          │                         │  │  WhatsApp ← Gemini AI        │
          │  Cardiac Model          │  └──────────────┬───────────────┘
          │  Diabetes Model         │                 │
          │  Kidney Model           │                 │ WhatsApp messages
          │  Respiratory Model      │          ┌──────▼──────┐
          │  WhatIf Engine          │          │   Patient   │
          └─────────────────────────┘          └─────────────┘

External: Google Gemini API · Resend Email · Google Maps API · MongoDB
```

---

## Project Structure

```
tsukumo/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Main dashboard (2500+ lines)
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css               # Global Thangka-inspired styles
│   │   └── api/
│   │       ├── chat/route.ts         # Michi AI endpoint (Gemini + heuristic)
│   │       ├── drive-monitor/route.ts # IoT stream + ML prediction pipeline
│   │       ├── recommend/route.ts     # Diet/lifestyle recommendation engine
│   │       ├── whatif/route.ts        # Proxy to Flask Monte Carlo
│   │       ├── cht/route.ts           # Cognitive Health Twin analysis
│   │       ├── confirm-booking/route.ts # Booking → ICS → Email
│   │       ├── notify/route.ts        # Resend email dispatch
│   │       ├── auth/                  # OTP send/verify
│   │       ├── vitals/route.ts
│   │       ├── records/route.ts
│   │       ├── nutrition/route.ts
│   │       └── ingest/route.ts
│   ├── components/
│   │   └── ChatBot.tsx               # Michi chatbot UI component
│   ├── middleware.ts                  # Auth cookie guard for /dashboard
│   └── models/                       # Mongoose models
│
├── ml_service/
│   ├── app.py                        # Flask API entry point
│   ├── whatif_engine.py              # Monte Carlo simulation engine
│   ├── knowledge_graph.py            # Graph RAG for CHT analysis
│   ├── agents.py                     # Multi-agent clinical reasoning
│   ├── phm_pipeline.py               # Predictive Health Monitoring pipeline
│   ├── doctors_db.py                 # Specialist registry
│   ├── main.py                       # Extended Flask routes
│   └── requirements.txt
│
├── tsukumo-nutribot/
│   └── src/
│       ├── bot.ts                    # WhatsApp socket + QR auth
│       ├── handlers/
│       │   └── messageHandler.ts     # Command routing + AI responses
│       ├── monitors/
│       │   ├── spikeMonitor.ts       # Polling + alert dispatch
│       │   └── spikeDetector.ts      # Threshold + rolling-window detection
│       ├── integrations/
│       │   └── tsukumoClient.ts      # Vitals fetch + webhook server (:4000)
│       ├── ai/
│       │   └── geminiClient.ts       # Gemini nutrition suggestion generator
│       └── utils/
│           └── messaging.ts          # WhatsApp message formatters
│
├── public/
│   ├── *.pkl                         # Trained ML model files
│   ├── synthetic_iot_data/           # 1-year IoT streaming CSV
│   ├── assets/thangka/               # UI images (Michi logo, overlays)
│   └── bg-image.png
│
├── drive_incoming/
│   └── stream_index.json             # Current position in the IoT stream
│
├── scripts/                          # Seed scripts
├── .env.local                        # Root environment variables
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## Services

### 1. Next.js Dashboard (Port 3000)

The primary patient-facing interface. Built with **Next.js 16**, **React 19**, and **TailwindCSS 4**.

**Key Responsibilities:**
- Polls `/api/drive-monitor` every **3 seconds** to stream IoT patient data
- Maintains all dashboard state (vitals, predictions, modals, chat actions)
- Handles authentication via OTP and the `tsukumo_auth` cookie
- Dispatches `chatActions` from Michi to mutate UI state
- Renders the Thangka organ map, risk meters, and emergency overlays

**Authentication Flow:**
```
POST /api/auth/send-otp → OTP email/SMS
POST /api/auth/verify-otp → Set-Cookie: tsukumo_auth
GET  /dashboard (protected by middleware)
```

---

### 2. ML Microservice (Port 5000)

A **Python Flask** API serving 5 trained scikit-learn models with real-time inference.

**Endpoints:**

| Route | Method | Description |
|---|---|---|
| `/health` | GET | Lists model load status for all 5 models |
| `/predict` | POST | Multi-organ risk inference from vitals JSON |
| `/whatif` | POST | Monte Carlo simulation (N cohorts, W weeks) |
| `/confirm-booking` | POST | ICS generation + email dispatch via Next.js notify |

**Loaded Models at Startup:**

| Model | File | Predicts |
|---|---|---|
| Cardiac | `public/cardiac-arrest.pkl` | Acute cardiac event risk |
| Diabetes | `public/diabetes.pkl` | Blood glucose / diabetes risk |
| Burnout | `public/burnout_risk_model.pkl` | Physical burnout from activity |
| Kidney Stones | `public/rf_kidney_stones.pkl` | Renal stone formation |
| Respiratory | `public/respiratory_model.pkl` | Respiratory distress |
| WhatIf Engine | `public/whatif_model.pkl` | Monte Carlo simulator |

> **Sanity Overrides:** The prediction pipeline includes threshold-based overrides to suppress model false positives (e.g., cardiac risk=1 is overridden to 0 if HR < 110 and BP < 140).

---

### 3. Tsukumo NutriBot (Port 4000)

A **Node.js TypeScript** WhatsApp agent using the **Baileys** library.

**Startup Sequence:**
1. Reads `auth_session/` for saved credentials
2. If none → generates a QR code in the terminal
3. User scans the QR with WhatsApp mobile → session persisted
4. `initProactiveMonitor(sock)` begins polling every 30 seconds
5. Webhook server starts on port 4000

**WhatsApp Commands:**

| Command | Description |
|---|---|
| `!status` | Fetch and display real-time vitals summary |
| `!suggest` | AI nutrition plan based on current vitals |
| `!heart` | Cardiac-specific nutritional guidance |
| `!lungs` | Respiratory-specific nutrition support |
| `!kidneys` | Renal health food recommendations |
| Any text | Freeform conversation handled by Gemini AI |

**Spike Detection Thresholds (configurable via `.env`):**

| Metric | Warning | Critical |
|---|---|---|
| Heart Rate | > 100 BPM | > 130 BPM |
| SpO2 | < 94% | < 90% |
| Respiratory Rate | — | > 28/min |
| Glucose | > 180 mg/dL | > 250 mg/dL |

---

## API Reference

### Next.js Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `GET /api/drive-monitor` | GET | None | Streams next IoT row → ML prediction |
| `POST /api/chat` | POST | None | Michi AI (Gemini or heuristic) |
| `POST /api/recommend` | POST | None | Diet/lifestyle protocol generation |
| `POST /api/whatif` | POST | None | Proxy to Flask Monte Carlo |
| `POST /api/cht` | POST | None | Cognitive Health Twin Graph RAG |
| `POST /api/confirm-booking` | POST | None | Appointment + ICS + email |
| `POST /api/notify` | POST | None | Resend email with ICS attachment |
| `POST /api/auth/send-otp` | POST | None | Send OTP for login |
| `POST /api/auth/verify-otp` | POST | None | Verify OTP and set auth cookie |
| `GET /api/vitals` | GET | None | Current patient vitals |
| `POST /api/ingest` | POST | None | Manual vitals ingestion |
| `GET /api/records` | GET | Cookie | Patient records from MongoDB |

### Chat API — Michi (`POST /api/chat`)

**Request:**
```json
{
  "message": "Book a cardiologist appointment",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:**
```json
{
  "response": "I have identified the Sacred Path specialists...",
  "action": { "type": "BOOK_APPOINTMENT", "props": { "doctor": "Dr. Elena" } },
  "suggestions": ["Dr. Elena (Cardiology)", "Dr. Marcus (Cardiac Surgeon)"],
  "mode": "HEURISTIC_FALLBACK"
}
```

**Action Types:**

| Type | Dashboard Effect |
|---|---|
| `FETCH_VITALS` | Opens CHT health analysis modal |
| `RUN_WHATIF` | Opens Monte Carlo simulation panel |
| `BOOK_APPOINTMENT` | Opens booking modal with doctor pre-filled |
| `OPEN_CHT` | Opens Cognitive Health Twin drawer |
| `SEARCH_HOSPITALS` | Adds nearby hospital notification |

---

## Environment Variables

### `.env.local` (Project Root)

```env
# Required
GEMINI_API_KEY=your_gemini_api_key

# Email dispatch for appointment confirmations
RESEND_API_KEY=your_resend_api_key
NOTIFICATION_EMAIL=patient@example.com

# Hospital discovery (optional — falls back to mock location)
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Patient records (optional)
MONGODB_URI=mongodb://localhost:27017/tsukumo
JWT_SECRET=your_jwt_secret
```

### `tsukumo-nutribot/.env`

```env
# Required
GEMINI_API_KEY=your_gemini_api_key

# WhatsApp targets (JID format: countrycode+number@s.whatsapp.net)
PATIENT_WHATSAPP_NUMBER=91XXXXXXXXXX@s.whatsapp.net
ALERT_WHATSAPP_NUMBER=91XXXXXXXXXX@s.whatsapp.net

# Service URLs
TSUKUMO_API_BASE=http://localhost:3000
FLASK_ML_BASE=http://localhost:5000

# Spike detection thresholds (optional — uses defaults if not set)
HR_CRITICAL_HIGH=130
HR_WARN_HIGH=100
SPO2_CRITICAL_LOW=90
SPO2_WARN_LOW=94
RESP_CRITICAL_HIGH=28
GLUCOSE_CRITICAL_HIGH=250
GLUCOSE_WARN_HIGH=180
```

---

## Installation & Setup

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **MongoDB** (local or Atlas, optional — for patient records)
- Trained `.pkl` model files in `/public/` (see [ML Models](#ml-models))
- Synthetic IoT CSV in `/public/synthetic_iot_data/`

### Step 1 — Clone & Install Dashboard

```bash
git clone https://github.com/iamkazbrekker/tsukumo.git
cd tsukumo
npm install
```

### Step 2 — Configure Environment

```bash
# Copy and fill in your keys
cp .env.local.example .env.local
```

Edit `.env.local` with your `GEMINI_API_KEY` and `RESEND_API_KEY`.

### Step 3 — Set Up ML Service

```bash
cd ml_service
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### Step 4 — Set Up NutriBot (Optional)

```bash
cd tsukumo-nutribot
npm install
cp .env.example .env
```

Edit `tsukumo-nutribot/.env` with your WhatsApp numbers and Gemini key.

---

## Running Locally

Start all three services in separate terminal windows:

### Terminal 1 — ML Microservice
```bash
cd ml_service
.venv/Scripts/activate  # or source .venv/bin/activate on macOS/Linux
python app.py
# ✅ Flask running on http://localhost:5000
```

### Terminal 2 — Next.js Dashboard
```bash
# In project root
npm run dev
# ✅ Next.js running on http://localhost:3000
```

### Terminal 3 — NutriBot (Optional)
```bash
cd tsukumo-nutribot
npm start
# 📱 QR code will appear — scan with WhatsApp
# ✅ Webhook server on http://localhost:4000
```

### Health Checks

| Service | URL | Expected |
|---|---|---|
| Dashboard | `http://localhost:3000` | Login page |
| ML Service | `http://localhost:5000/health` | `{"status": "healthy", ...}` |
| Drive Monitor | `http://localhost:3000/api/drive-monitor` | JSON with `patient_data`, `predictions` |
| Bot Webhook | `http://localhost:4000` | Express server running |

> **Note:** The ML service must be running before the dashboard, as `/api/drive-monitor` calls Flask on every poll. If Flask is down, the system falls back to threshold-based heuristic predictions.

---

## Key Workflows

### 1. Real-Time Vitals Streaming

```
Dashboard polls /api/drive-monitor (every 3s)
  → Reads next row from synthetic_iot_data CSV (tracked by stream_index.json)
  → POSTs vitals to Flask /predict
  → Receives predictions + composite_risk + internal_monologue
  → Updates dashboard UI: aura, risk meters, organ panels
  → If composite_risk > 0.5 → fires webhook to NutriBot (:4000)
```

### 2. Michi Appointment Booking

```
User: "I need a cardiologist"
  → Heuristic: appointment intent → chips: [Cardiologist ...]

User clicks "Cardiologist"
  → sendMessage("Cardiologist")
  → Specialty branch → chips: [Dr. Elena, Dr. Marcus]

User clicks "Dr. Elena (Cardiology)"
  → Doctor branch → action: BOOK_APPOINTMENT { doctor: "Dr. Elena" }
  → ChatBot.tsx fires onAction → page.tsx sets preppedBooking
  → Booking modal opens with "Dr. Elena" pre-filled

User confirms
  → POST /api/confirm-booking → Flask /confirm-booking
  → Google Maps: find nearest hospital
  → Generate ICS calendar event
  → POST /api/notify → Resend: email + ICS to patient
  → Success overlay displayed
```

### 3. NutriBot Critical Alert

```
Spike monitor polls /api/drive-monitor (every 30s)
  → SpikeDetector checks rolling window thresholds
  → HR > 130 OR SpO2 < 90 → spike detected

  → sendRichAlert to patient WhatsApp
  → If critical: sendRichAlert to caregiver WhatsApp
  → After 5s: Gemini generates emergency nutrition guidance
  → sendText nutrition guidance to patient
```

---

## ML Models

The platform uses 5 independently trained scikit-learn models. Each `.pkl` file must be placed in the `/public/` folder.

| Model File | Algorithm | Features | Predicts |
|---|---|---|---|
| `cardiac-arrest.pkl` | Random Forest / XGBoost | age, sysBP, diaBP, heartRate, totChol, HDLChol, glucose, BMI, smoking, hyp | Binary cardiac arrest risk |
| `diabetes.pkl` | Gradient Boosting | 25 metabolic features | Binary diabetes risk |
| `burnout_risk_model.pkl` | Logistic Regression | activity MET level | Binary burnout risk |
| `rf_kidney_stones.pkl` | Random Forest | gravity, pH, osmo, cond, urea, calc | Binary kidney stone risk |
| `respiratory_model.pkl` | NLP + Classifier | clinical notes text | Binary respiratory risk |
| `whatif_model.pkl` | Monte Carlo Engine | All features + scenario deltas | Risk trajectory N × W weeks |

### Monte Carlo Simulation (`POST /whatif`)

```json
// Request
{
  "patient": { "age": 45, "sysBP": 145, "heartRate": 88 ... },
  "n": 5000,
  "weeks": 24
}

// Response
{
  "scenarios": [...],        // per-scenario risk summaries
  "trajectory": [...],       // week-by-week cardiac risk curve
  "feature_sensitivity": {}, // tornado chart data
  "summary": "..."           // human-readable narrative
}
```

---

## Tech Stack

### Dashboard (Next.js App)

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Styling | TailwindCSS 4 + Vanilla CSS |
| AI SDK | `@google/generative-ai` ^0.24 (Gemini 1.5 Flash) |
| Email | Resend ^6 |
| Database | MongoDB (Mongoose ^9) |
| Runtime | Node.js ≥ 18 |

### ML Microservice

| Layer | Technology |
|---|---|
| Framework | Flask + Flask-CORS |
| ML | scikit-learn, XGBoost |
| Numerics | NumPy, SciPy, Pandas |
| Simulation | Custom Monte Carlo in Python |
| Environment | Python 3.10+, virtualenv |

### NutriBot

| Layer | Technology |
|---|---|
| WhatsApp | Baileys ^7 (WhatsApp Web API) |
| AI | `@google/generative-ai` ^0.24 (Gemini) |
| Server | Express 5 (webhook receiver) |
| Scheduler | node-cron ^4 |
| Language | TypeScript (ts-node) |

---

## Project Conventions

- **Michi Persona:** All AI responses use Thangka/healing terminology — "Sacred Path" (cardiac), "Vital Breath" (respiratory), "Vital Essence" (renal), "Jatharagni" (metabolic).
- **IoT Stream:** The dashboard always reads the next row from a fixed CSV and wraps around when it reaches the end. The pointer is persisted in `drive_incoming/stream_index.json`.
- **Emergency Override:** The 30-second emergency simulation is purely manual — it never triggers automatically from ML predictions.
- **Auth:** The platform uses a cookie-based OTP flow. The cookie `tsukumo_auth` guards all `/dashboard` routes via Next.js middleware.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Follow the existing TypeScript and Python conventions
4. Run `npm run build` and ensure **zero TypeScript errors** before submitting
5. Open a pull request with a clear description

---

## License

This project is for research and demonstration purposes. All patient data used is **fully synthetic** — generated via the Synthea framework and does not represent any real individuals.

---

<div align="center">

**Tsukumo Health Platform**  
*Autonomous Clinical Intelligence · Thangka Aesthetic · Multi-Organ AI*

Built with ❤️ using Next.js · Python Flask · Google Gemini · Baileys

</div>
