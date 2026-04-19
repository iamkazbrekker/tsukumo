import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini - will beDone per-request in POST to handle key reloads

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
          type: "OBJECT",
          properties: {
            scenario: { type: "STRING", description: "The health scenario to simulate (e.g., lifestyle changes, heart risk)." }
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

export async function POST(req: Request) {
  let message = "";
  let history = [];

  try {
    const body = await req.json();
    message = body.message;
    history = body.history || [];

    // 1. Initialize Gemini with current ENV to handle reloads
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("ChatBot: Entering HEURISTIC_FALLBACK mode (Missing API Key)");
      return heuristicAnalysis(message, history);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    console.log("ChatBot: Initiating REASONING mode with Gemini 1.5");

    // 2. Fetch current health context (from drive-monitor logic)
    let contextStr = "Currently no live data is available.";
    try {
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
      const host = req.headers.get('host') || 'localhost:3000';
      const driveRes = await fetch(`${protocol}://${host}/api/drive-monitor`, { 
        cache: 'no-store',
        signal: AbortSignal.timeout(2000)
      });
      
      const data = await driveRes.json();
      if (data && !data.error) {
        const v = data.patient_data;
        const p = data.predictions;
        contextStr = `Current Vitals: HR: ${v.heartRate} BPM, BP: ${v.sysBP}/${v.diaBP}, SpO2: ${v.spo2}%, Glucose: ${v.glucose} mg/dL, BMI: ${v.bmi}. 
ML Risks: Cardiac: ${p.cardiac_arrest_risk === 1 ? 'HIGH' : 'LOW'}, Diabetes: ${p.diabetes_risk === 1 ? 'HIGH' : 'LOW'}, Resp: ${p.respiratory_risk === 1 ? 'HIGH' : 'LOW'}.
Lifestyle: Sleep: ${v.sleep_hours}hr, Stress: ${v.stress_level}, Activity: ${v.activityMETs} METs.`;
      }
    } catch (e) {
      console.warn("Could not fetch live context for AI reasoning, using default.");
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      tools: TOOLS,
      systemInstruction: SYSTEM_INSTRUCTION + "\n\nCURRENT PATIENT CONTEXT:\n" + contextStr
    });

    const firstUserIndex = history.findIndex((m: any) => m.role === 'user');
    const validHistory = firstUserIndex === -1 ? [] : history.slice(firstUserIndex);

    const chat = model.startChat({
      history: validHistory.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content || "" }]
      }))
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const call = response.getFunctionCalls()?.[0];

    let action = null;
    let text = response.text();

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
    console.error('Gemini Execution Error:', error);
    return heuristicAnalysis(message, history);
  }
}

function heuristicAnalysis(message: string, history: any[]) {
  const query = (message || "").toLowerCase();
  let action = null;
  let response = "";
  let suggestions: string[] = [];

  const lastAssistantMsg = history.filter(m => m.role === 'assistant').pop()?.content || "";

  if (query.includes("vitals") || query.includes("heart rate") || query.includes("bp") || query.includes("status") || query.includes("pulse")) {
    action = { type: "FETCH_VITALS" };
    response = "I'm analyzing your real-time biometric stream. Your Cardiac Rhythm and Respiratory Center markers are being processed. One moment.";
  } else if (query.includes("what if") || query.includes("simulate") || query.includes("scenario") || query.includes("projection")) {
    action = { type: "RUN_WHATIF" };
    response = "Initializing the Monte Carlo simulation engine. I'll project your health trajectories based on current markers.";
  } else if (query.includes("dr. elena") || query.includes("dr. marcus") || query.includes("dr. arvind") || query.includes("dr. sita") || query.includes("dr. sarah") || query.includes("dr. ravi") || query.includes("dr. maya") || query.includes("dr. kian")) {
    const doctorName = message.includes("(") ? message.split("(")[0].trim() : message;
    action = { type: "BOOK_APPOINTMENT", props: { doctor: doctorName } };
    response = `Excellent choice. I am enabling the booking portal. Initializing clinical dispatch for ${doctorName}. One moment.`;
  } else if (query.includes("appointment") || query.includes("book") || query.includes("consult") || query.includes("cardio") || query.includes("heart") || query.includes("nephro") || query.includes("kidney") || query.includes("pulmono") || query.includes("lung") || query.includes("resp") || query.includes("diabetes") || query.includes("metabolic") || query.includes("stomach")) {
    if (query.includes("cardio") || query.includes("heart")) {
        response = "I have identified the Sacred Path (Cardiac) specialists. Who would you like to consult?";
        suggestions = ["Dr. Elena (Cardiology)", "Dr. Marcus (Cardiac Surgeon)"];
    } else if (query.includes("nephro") || query.includes("kidney")) {
        response = "I have located the Vital Essence (Renal) experts. Please choose a healer:";
        suggestions = ["Dr. Arvind (Renal Expert)", "Dr. Sita (Nephrology)"];
    } else if (query.includes("pulmono") || query.includes("lung") || query.includes("resp")) {
        response = "The Vital Breath (Respiratory) specialists are available. Who shall I contact?";
        suggestions = ["Dr. Sarah (Pulmonary)", "Dr. Ravi (Respiratory)"];
    } else if (query.includes("diabetes") || query.includes("metabolic") || query.includes("stomach")) {
        response = "The Jatharagni (Metabolic) specialists are ready. Please select a practitioner:";
        suggestions = ["Dr. Maya (Endocrinologist)", "Dr. Kian (Metabolic Health)"];
    } else {
        response = "To coordinate your clinical dispatch, I must know the path of healing you seek. What type of specialist do you need?";
        suggestions = ["Cardiologist", "Nephrologist", "Pulmonologist", "Endocrinologist"];
    }
  } else if (query.includes("hospital") || query.includes("nearby") || query.includes("clinic")) {
    action = { type: "SEARCH_HOSPITALS" };
    response = "Scanning the local medical nexus for nearby facilities and medical centers.";
  } else if (query.includes("cht") || query.includes("health twin") || query.includes("analysis") || query.includes("data")) {
    action = { type: "OPEN_CHT" };
    response = "Opening your Cognitive Health Twin (CHT) for a deep Graph RAG analysis of your physiological markers.";
  } else if (query.includes("food") || query.includes("diet") || query.includes("eat") || query.includes("lifestyle") || query.includes("recommend") || query.includes("heart") || query.includes("health") || query.includes("improve")) {
    response = "Based on your current markers, I suggest focusing on low-glycemic 'Fire-Element' foods to balance your Jatharagni. Practice mindfulness and maintain METs above 2.5 to stabilize your Cardiac Rhythm.";
  } else {
    response = "I am Michi, your Tsukumo AI assistant. I can help analyze vitals, provide diet and lifestyle recommendations, or run Monte Carlo simulations.";
  }

  return NextResponse.json({ 
    response, 
    action,
    suggestions,
    mode: "HEURISTIC_FALLBACK"
  });
}
