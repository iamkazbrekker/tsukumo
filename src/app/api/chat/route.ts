import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part, SchemaType } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `You are Michi, the Autonomous Clinical Agent for the Tsukumo Health Platform.
Your goal is to assist the user by analyzing their health data and taking proactive actions.
You provide personalized food and lifestyle recommendations based on the user's current biometric data.
You have access to specific tools to interact with the dashboard.
When a user asks for health status, simulations, clinical help, or lifestyle advice, ALWAYS use the relevant tool or refer to the provide context.
Tsukumo uses Thangka-inspired aesthetics and multi-organ ML models (Cardiac, Renal, Respiratory, Metabolic).
Be professional, empathetic, and slightly mystical in your tone (e.g., using terms like 'Sacred Path' or 'Vital Breath').

PROTOCOL FOR APPOINTMENT BOOKING:
1. When a user wants to book an appointment, first ask what type of doctor they need (Cardiologist, Nephrologist, Pulmonologist).
2. Once they provide a type, suggest 2-3 specific doctors (e.g., Dr. Elena/Dr. Marcus for Heart, Dr. Arvind/Dr. Sita for Kidney, Dr. Sarah/Dr. Ravi for Lungs).
3. Once they choose a doctor, call 'book_appointment' tool.`;

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "fetch_vitals",
        description: "Fetch and analyze the user's real-time biometric stream and vital signs.",
      },
      {
        name: "run_simulation",
        description: "Initialize the Monte Carlo 'What-If' simulation engine to project health trajectories.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            scenario: { type: SchemaType.STRING, description: "The health scenario to simulate (e.g., lifestyle changes, heart risk)." }
          }
        }
      },
      {
        name: "book_appointment",
        description: "Initiate a clinical dispatch to book an appointment with a specialist healer.",
      },
      {
        name: "open_health_twin",
        description: "Open the Cognitive Health Twin (CHT) for deep-tissue Graph RAG analysis.",
      },
      {
        name: "search_medical_nexus",
        description: "Scan the local medical nexus for nearby hospitals and facilities.",
      }
    ]
  }
];

interface ChatMessage {
  role: string;
  content: string;
}

export async function POST(req: NextRequest) {
  let message = "";
  let history: ChatMessage[] = [];

  try {
    const body = await req.json();
    message = body.message;
    history = body.history || [];
    console.log("ChatBot: Processing request:", message);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("ChatBot: API Key missing, falling back to heuristics.");
      return heuristicAnalysis(message, history);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let contextStr = "Currently no live data is available.";
    
    try {
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
      const host = req.headers.get('host') || 'localhost:3000';
      const driveRes = await fetch(`${protocol}://${host}/api/drive-monitor`, { cache: 'no-store' });
      const data = await driveRes.json();
      if (data && !data.error) {
        const v = data.patient_data;
        const p = data.predictions;
        contextStr = `Current Vitals: HR: ${v.heartRate} BPM, BP: ${v.sysBP}/${v.diaBP}, SpO2: ${v.spo2}%, Glucose: ${v.glucose} mg/dL, BMI: ${v.bmi}. 
ML Risks: Cardiac: ${p.cardiac_arrest_risk === 1 ? 'HIGH' : 'LOW'}, Diabetes: ${p.diabetes_risk === 1 ? 'HIGH' : 'LOW'}, Resp: ${p.respiratory_risk === 1 ? 'HIGH' : 'LOW'}.`;
      }
    } catch (e) {
      console.warn("Context fetch failed, using default.");
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      tools: TOOLS as any,
      systemInstruction: SYSTEM_INSTRUCTION + "\n\nCONTEXT:\n" + contextStr
    });

    const firstUserIndex = history.findIndex(m => m.role === 'user');
    const validHistory = firstUserIndex === -1 ? [] : history.slice(firstUserIndex);

    const chat = model.startChat({
      history: validHistory.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content || "" }] as Part[]
      }))
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const call = response.functionCalls()?.[0];

    let action = null;
    let text = "";
    try {
      text = response.text();
    } catch (e) {
      console.log("No text part in response.");
    }

    if (call) {
      switch (call.name) {
        case 'fetch_vitals': action = { type: 'FETCH_VITALS' }; break;
        case 'run_simulation': action = { type: 'RUN_WHATIF', props: call.args }; break;
        case 'book_appointment': action = { type: 'BOOK_APPOINTMENT', props: call.args }; break;
        case 'open_health_twin': action = { type: 'OPEN_CHT' }; break;
        case 'search_medical_nexus': action = { type: 'SEARCH_HOSPITALS' }; break;
      }
      if (!text) {
        text = `Acknowledged. I am executing the ${call.name.replace(/_/g, ' ')} protocol.`;
      }
    }

    return NextResponse.json({ 
      response: text, 
      action,
      mode: "REASONING"
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return heuristicAnalysis(message, history);
  }
}

function heuristicAnalysis(message: string, history: ChatMessage[]) {
  const query = (message || "").toLowerCase().trim();
  let action = null;
  let response = "";
  let suggestions: string[] = [];

  // ── Greetings & General ───────────────────────────────────────────────────
  if (query.match(/^(hi|hello|hey|namaste|greetings|good morning|good evening|how are you|who are you|what can you do)\b/)) {
    response = "Namaste 🙏 I am Michi, your Tsukumo health assistant. I can help you: check your live vitals, run health simulations, book a specialist, analyze your health data, or suggest a diet and lifestyle plan. What would you like to explore?";

  // ── Vitals / Status ───────────────────────────────────────────────────────
  } else if (query.includes("vitals") || query.includes("heart rate") || query.includes("blood pressure") || query.includes("bp") || query.match(/\bstatus\b/) || query.includes("pulse") || query.includes("spo2") || query.includes("oxygen") || query.includes("glucose") || query.includes("bmi")) {
    action = { type: "FETCH_VITALS" };
    response = "I'm pulling your real-time biometric stream now. Cardiac rhythm, respiratory rate, and systemic markers are being processed. One moment...";

  // ── Simulation ────────────────────────────────────────────────────────────
  } else if (query.includes("what if") || query.includes("simulate") || query.includes("simulation") || query.includes("scenario") || query.includes("projection") || query.includes("monte carlo") || query.includes("trajectory")) {
    action = { type: "RUN_WHATIF" };
    response = "Initiating the Monte Carlo simulation engine. I'll model your health trajectories across multiple lifestyle scenarios over the next 24 weeks.";

  // ── Specific Doctor Selection (must check BEFORE general booking) ─────────
  } else if (query.includes("dr. elena") || query.includes("dr. marcus") || query.includes("dr. arvind") || query.includes("dr. sita") || query.includes("dr. sarah") || query.includes("dr. ravi") || query.includes("dr. maya") || query.includes("dr. kian")) {
    const doctorName = message.includes("(") ? message.split("(")[0].trim() : message;
    action = { type: "BOOK_APPOINTMENT", props: { doctor: doctorName } };
    response = `Excellent choice. Opening the booking portal for ${doctorName}. One moment...`;

  // ── Appointment Intent (generic booking phrases only) ───────────────────────
  } else if (query.includes("book") || query.includes("appointment") || query.includes("consult") || query.includes("see a doctor") || query.includes("need a doctor") || query.includes("specialist")) {
    response = "To coordinate your clinical dispatch, I must know the path of healing you seek. What type of specialist do you need?";
    suggestions = ["Cardiologist", "Nephrologist", "Pulmonologist", "Endocrinologist"];

  // ── Specialty Selection (chip selections map here directly) ──────────────────
  } else if (query.includes("cardiologist") || query.includes("cardiology") || query.includes("cardiac specialist") || query.includes("heart doctor") || query.includes("heart specialist")) {
    response = "I have identified the Sacred Path (Cardiac) specialists. Who would you like to consult?";
    suggestions = ["Dr. Elena (Cardiology)", "Dr. Marcus (Cardiac Surgeon)"];
  } else if (query.includes("nephrologist") || query.includes("nephrology") || query.includes("kidney specialist") || query.includes("kidney doctor") || query.includes("renal")) {
    response = "I have located the Vital Essence (Renal) experts. Please choose a healer:";
    suggestions = ["Dr. Arvind (Renal Expert)", "Dr. Sita (Nephrology)"];
  } else if (query.includes("pulmonologist") || query.includes("pulmonology") || query.includes("lung specialist") || query.includes("lung doctor") || query.includes("respiratory specialist")) {
    response = "The Vital Breath (Respiratory) specialists are available. Who shall I contact?";
    suggestions = ["Dr. Sarah (Pulmonary)", "Dr. Ravi (Respiratory)"];
  } else if (query.includes("endocrinologist") || query.includes("endocrinology") || query.includes("diabetes specialist") || query.includes("metabolic specialist")) {
    response = "The Jatharagni (Metabolic) specialists are ready. Please select a practitioner:";
    suggestions = ["Dr. Maya (Endocrinologist)", "Dr. Kian (Metabolic Health)"];

  // ── Hospital / Location ───────────────────────────────────────────────────
  } else if (query.includes("hospital") || query.includes("nearby") || query.includes("clinic") || query.includes("medical center")) {
    action = { type: "SEARCH_HOSPITALS" };
    response = "Scanning the local medical nexus for nearby facilities and medical centers in your area.";

  // ── Health Twin / CHT ─────────────────────────────────────────────────────
  } else if (query.includes("health twin") || query.includes("cht") || query.includes("cognitive") || query.includes("deep analysis") || query.includes("graph analysis") || query.includes("rag")) {
    action = { type: "OPEN_CHT" };
    response = "Opening your Cognitive Health Twin (CHT) for a deep Graph RAG analysis of your physiological markers.";

  // ── Diet & Nutrition ──────────────────────────────────────────────────────
  } else if (query.includes("food") || query.includes("diet") || query.includes("eat") || query.includes("nutrition") || query.includes("meal") || query.includes("calories") || query.includes("weight")) {
    response = "Based on your risk profile, I recommend focusing on **low-glycemic, anti-inflammatory foods**: leafy greens, fatty fish (salmon 2×/week), oats with flaxseed, and berries for anthocyanin support. Limit saturated fats and processed sodium. For a full tailored plan linked to your live risk scores, open the 'Wellness' tab in the dashboard.";

  // ── Lifestyle & Exercise ──────────────────────────────────────────────────
  } else if (query.includes("exercise") || query.includes("workout") || query.includes("lifestyle") || query.includes("sleep") || query.includes("stress") || query.includes("activity") || query.includes("improve")) {
    response = "For optimal health maintenance: aim for **30 min brisk walking daily** at 60% max HR, prioritize **7-8 hours of sleep**, and practice **4-7-8 breathing** to reduce cortisol. Your current stress and activity levels are factored into your live Jatharagni score in the dashboard.";

  // ── Risk Questions ────────────────────────────────────────────────────────
  } else if (query.includes("risk") || query.includes("prediction") || query.includes("danger") || query.includes("am i okay") || query.includes("is it serious") || query.includes("how am i doing") || query.includes("my health")) {
    action = { type: "FETCH_VITALS" };
    response = "Let me pull your current risk scores from the ML prediction engine. I'll give you a full multi-organ assessment in a moment.";

  // ── Symptoms ──────────────────────────────────────────────────────────────
  } else if (query.includes("chest pain") || query.includes("breathless") || query.includes("dizzy") || query.includes("fatigue") || query.includes("headache") || query.includes("pain") || query.includes("symptom") || query.includes("feeling")) {
    response = "I'm noting these symptoms. For any acute or severe symptoms, please seek immediate medical attention. Would you like me to **book a consultation** with a specialist, or **analyze your current vitals** to understand your risk level better?";
    suggestions = ["Analyze My Vitals", "Book a Specialist"];

  // ── Greetings / Small Talk ────────────────────────────────────────────────
  } else if (query.includes("thank") || query.includes("thanks") || query.includes("good job") || query.includes("great")) {
    response = "You're welcome! Your wellbeing is my sacred purpose. Is there anything else I can help you with on the Tsukumo platform?";

  // ── Unknown / General ─────────────────────────────────────────────────────
  } else {
    const suggestions_list = ["Check My Vitals", "Run a Simulation", "Book an Appointment", "Health Diet Advice"];
    response = `I understand you're asking about "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}". I'm best suited to help with real-time health monitoring, risk analysis, appointments, and wellness planning. Here are some things I can do for you:`;
    suggestions = suggestions_list;
  }

  return NextResponse.json({ 
    response, 
    action,
    suggestions,
    mode: "HEURISTIC_FALLBACK"
  });
}
