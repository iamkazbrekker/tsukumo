import { PatientVitals } from '../ai/geminiClient';
import dotenv from 'dotenv';
dotenv.config();

export type SpikeEvent = {
  level: 'critical' | 'warning' | 'info';
  organ: string;
  message: string;
  vitals: PatientVitals;
  recommendation: string;
};

// Thresholds — pulled from env for flexibility
const THRESHOLDS = {
  HR: {
    critical: Number(process.env.HR_CRITICAL_HIGH) || 130,
    warn: Number(process.env.HR_WARN_HIGH) || 100,
    low: 45,
  },
  SPO2: {
    critical: Number(process.env.SPO2_CRITICAL_LOW) || 90,
    warn: Number(process.env.SPO2_WARN_LOW) || 94,
  },
  RESP: {
    critical: Number(process.env.RESP_CRITICAL_HIGH) || 28,
    warn: 20,
  },
  GLUCOSE: {
    critical: Number(process.env.GLUCOSE_CRITICAL_HIGH) || 250,
    warn: Number(process.env.GLUCOSE_WARN_HIGH) || 180,
    low: 70,
  },
};

// Historical window for spike comparison (rolling average)
const vitalHistory: number[] = [];
const WINDOW_SIZE = 5;

function rollingAvg(history: number[], newVal: number): number {
  vitalHistory.push(newVal);
  if (vitalHistory.length > WINDOW_SIZE) vitalHistory.shift();
  return vitalHistory.reduce((a, b) => a + b, 0) / vitalHistory.length;
}

export function detectSpikes(vitals: PatientVitals): SpikeEvent[] {
  const events: SpikeEvent[] = [];

  // ── Heart Rate ─────────────────────────────────────────────────────────────
  if (vitals.heartRate >= THRESHOLDS.HR.critical) {
    events.push({
      level: 'critical',
      organ: 'Heart',
      message: `🚨 CRITICAL: Heart rate at ${vitals.heartRate} BPM! Tachycardic crisis detected.`,
      vitals,
      recommendation: 'Sit or lie down immediately. Avoid stimulants. Call doctor if sustained.',
    });
  } else if (vitals.heartRate >= THRESHOLDS.HR.warn) {
    events.push({
      level: 'warning',
      organ: 'Heart',
      message: `⚠️ Heart rate elevated at ${vitals.heartRate} BPM.`,
      vitals,
      recommendation: 'Take slow deep breaths. Avoid caffeine. Rest for 10 minutes.',
    });
  } else if (vitals.heartRate <= THRESHOLDS.HR.low) {
    events.push({
      level: 'warning',
      organ: 'Heart',
      message: `⚠️ Heart rate unusually low: ${vitals.heartRate} BPM (Bradycardia risk).`,
      vitals,
      recommendation: 'Ensure adequate hydration. If symptomatic (dizziness), consult a doctor.',
    });
  }

  // ── Blood Oxygen ───────────────────────────────────────────────────────────
  if (vitals.spo2 <= THRESHOLDS.SPO2.critical) {
    events.push({
      level: 'critical',
      organ: 'Lungs',
      message: `🚨 CRITICAL HYPOXIA: SpO2 at ${vitals.spo2}%! Oxygen dangerously low.`,
      vitals,
      recommendation: 'Sit upright. Take slow deep breaths. CALL EMERGENCY SERVICES NOW.',
    });
  } else if (vitals.spo2 <= THRESHOLDS.SPO2.warn) {
    events.push({
      level: 'warning',
      organ: 'Lungs',
      message: `⚠️ Blood oxygen slightly low: ${vitals.spo2}% SpO2.`,
      vitals,
      recommendation: 'Move to fresh air, breathe slowly and deeply. Avoid lying flat.',
    });
  }

  // ── Respiratory Rate ───────────────────────────────────────────────────────
  if (vitals.respRate >= THRESHOLDS.RESP.critical) {
    events.push({
      level: 'critical',
      organ: 'Lungs',
      message: `🚨 CRITICAL: Respiratory rate at ${vitals.respRate}/min! Breathing distress.`,
      vitals,
      recommendation: 'Use pursed-lip breathing technique. Use inhaler if prescribed. Call doctor.',
    });
  } else if (vitals.respRate >= THRESHOLDS.RESP.warn) {
    events.push({
      level: 'warning',
      organ: 'Lungs',
      message: `⚠️ Rapid breathing detected: ${vitals.respRate} breaths/min.`,
      vitals,
      recommendation: 'Practice 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s.',
    });
  }

  // ── Glucose ────────────────────────────────────────────────────────────────
  if (vitals.glucose >= THRESHOLDS.GLUCOSE.critical) {
    events.push({
      level: 'critical',
      organ: 'Metabolic',
      message: `🚨 HYPERGLYCEMIA: Glucose at ${vitals.glucose} mg/dL! Dangerous spike.`,
      vitals,
      recommendation: 'Avoid ALL sugars. Drink water. Take prescribed insulin if available. CALL DOCTOR.',
    });
  } else if (vitals.glucose >= THRESHOLDS.GLUCOSE.warn) {
    events.push({
      level: 'warning',
      organ: 'Metabolic',
      message: `⚠️ Elevated blood glucose: ${vitals.glucose} mg/dL.`,
      vitals,
      recommendation: 'Avoid simple carbs. Take a 15-minute slow walk to help glucose uptake.',
    });
  } else if (vitals.glucose < THRESHOLDS.GLUCOSE.low) {
    events.push({
      level: 'critical',
      organ: 'Metabolic',
      message: `🚨 HYPOGLYCEMIA: Glucose at ${vitals.glucose} mg/dL! Blood sugar dangerously low.`,
      vitals,
      recommendation: 'Eat 15g fast carbs NOW: orange juice, glucose tablets, or 3 tsp sugar in water.',
    });
  }

  // ── ML Model Risk Overrides ────────────────────────────────────────────────
  if (vitals.cardiac_risk === 1 && events.filter(e => e.organ === 'Heart').length === 0) {
    events.push({
      level: 'warning',
      organ: 'Heart',
      message: `⚠️ ML Model detects elevated cardiac risk pattern (even if HR appears normal).`,
      vitals,
      recommendation: 'Rest, avoid exertion. Check BP if possible. Anti-inflammatory foods recommended.',
    });
  }

  if (vitals.kidney_risk === 1) {
    events.push({
      level: 'warning',
      organ: 'Kidneys',
      message: `💎 Renal model detects possible kidney stone formation risk.`,
      vitals,
      recommendation: 'Increase water intake to 3L/day. Avoid high-oxalate foods (spinach, nuts, chocolate).',
    });
  }

  return events;
}
