import { PatientVitals } from '../ai/geminiClient';
import express from 'express';

const TSUKUMO_BASE = process.env.TSUKUMO_API_BASE || 'http://localhost:3000';

export async function fetchLatestVitals(): Promise<PatientVitals> {
  // Using node-fetch explicitly or global fetch if Node > 18
  const res = await fetch(`${TSUKUMO_BASE}/api/drive-monitor`);
  const data = await res.json();

  const p = data.patient_data || {};
  const preds = data.predictions || {};

  return {
    heartRate:    p.heartRate || 72,
    spo2:         p.spo2 || 98,
    respRate:     p.resp_rate || 14,
    glucose:      p.glucose || 95,
    sysBP:        p.sysBP || 120,
    activity:     p.activity || 0.1,
    cardiac_risk:  preds.cardiac_arrest_risk || 0,
    diabetes_risk: preds.diabetes_risk || 0,
    kidney_risk:   preds.kidney_stones_risk || 0,
    resp_risk:     preds.respiratory_risk || 0,
    burnout_risk:  preds.burnout_risk || 0,
  };
}

export function startWebhookServer(onCritical: (data: any) => void) {
  const app = express();
  app.use(express.json());

  // Tsukumo can POST here when a critical event is detected
  app.post('/webhook/health-alert', (req, res) => {
    console.log('📬 Received Tsukumo webhook:', req.body);
    onCritical(req.body);
    res.json({ received: true });
  });

  app.listen(4000, () => {
    console.log('🔌 Webhook server listening on port 4000');
  });
}
