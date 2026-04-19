import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// SYSTEM PROMPT: This is the "soul" of the NutriBot
const SYSTEM_PROMPT = `You are Tsukumo NutriBot, an expert AI nutritionist integrated with a real-time health monitoring system.

Your knowledge base covers:
- Clinical nutrition science (macro and micronutrients)
- Ayurvedic food principles (Agni, Doshas, food combinations)
- Evidence-based dietary interventions for: cardiac health, diabetes, kidney stones, respiratory health, burnout
- Real-time biomarker interpretation (Glucose, SpO2, Heart Rate, HbA1c, LDL)

Communication Rules:
- Be warm, concise, and non-alarmist (unless this is a critical alert)
- Always provide 3-5 actionable food suggestions
- Reference the patient's actual data when available
- Qualify suggestions with "This is AI-generated guidance, not a medical prescription"
- For critical alerts: be direct, urgent, and recommend seeing a doctor immediately

Response Format:
1. Brief interpretation of the current health state
2. Top nutritional suggestions (with emojis for readability)
3. Foods to AVOID right now
4. A motivational close
`;

export async function generateNutritionSuggestion(
  vitals: PatientVitals,
  context: string,
  userQuery?: string
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
      console.warn("No GEMINI_API_KEY found, returning fallback response.");
      return generateFallbackSuggestion(vitals);
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
  });

  const prompt = buildNutritionPrompt(vitals, context, userQuery);

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error('Gemini API Error:', e);
    return generateFallbackSuggestion(vitals);
  }
}

function buildNutritionPrompt(
  vitals: PatientVitals,
  context: string,
  userQuery?: string
): string {
  return `
## Current Patient Vitals (Live from IoT Sensors)
- Heart Rate: ${vitals.heartRate} BPM
- Blood Oxygen (SpO2): ${vitals.spo2}%
- Respiratory Rate: ${vitals.respRate}/min
- Fasting Glucose: ${vitals.glucose} mg/dL
- Systolic BP: ${vitals.sysBP} mmHg
- Activity Level: ${vitals.activity} METs

## ML Risk Predictions (Tsukumo AI)
- Cardiac Risk: ${vitals.cardiac_risk === 1 ? '🔴 HIGH' : '🟢 NORMAL'}
- Diabetes Risk: ${vitals.diabetes_risk === 1 ? '🔴 HIGH' : '🟢 NORMAL'}
- Kidney Stones Risk: ${vitals.kidney_risk === 1 ? '🔴 DETECTED' : '🟢 CLEAR'}
- Respiratory Risk: ${vitals.resp_risk === 1 ? '🟡 ANOMALY' : '🟢 NORMAL'}
- Burnout Risk: ${vitals.burnout_risk === 1 ? '🟡 HIGH' : '🟢 BALANCED'}

## Context / Detected Situation
${context}

## User Query (if any)
${userQuery || 'Provide a proactive health-aware nutritional briefing for today.'}

Please provide targeted nutritional recommendations based on the above live data.
`;
}

// Lightweight fallback if API is unavailable
function generateFallbackSuggestion(vitals: PatientVitals): string {
  const suggestions: string[] = [];

  if (vitals.glucose > 180) {
    suggestions.push('🥗 Eat fiber-rich foods: oats, leafy greens to slow glucose absorption.');
    suggestions.push('🚫 Avoid: white rice, sugary beverages, processed bread.');
  }
  if (vitals.spo2 < 94) {
    suggestions.push('🫐 Eat iron & B12-rich foods: spinach, lentils, eggs to support oxygen transport.');
    suggestions.push('💧 Hydrate well — dehydration can lower SpO2 readings.');
  }
  if (vitals.heartRate > 100) {
    suggestions.push('🍌 Potassium-rich foods: banana, avocado — help regulate heart rhythm.');
    suggestions.push('🚫 Avoid: caffeine, alcohol, high-sodium snacks right now.');
  }

  return suggestions.length > 0
    ? `*Tsukumo NutriBot (Offline Mode)*\n\n${suggestions.join('\n')}`
    : '✅ Your current vitals look stable! Stay hydrated and keep up the balanced diet.';
}

export type PatientVitals = {
  heartRate: number;
  spo2: number;
  respRate: number;
  glucose: number;
  sysBP: number;
  activity: number;
  cardiac_risk: number;
  diabetes_risk: number;
  kidney_risk: number;
  resp_risk: number;
  burnout_risk: number;
};
