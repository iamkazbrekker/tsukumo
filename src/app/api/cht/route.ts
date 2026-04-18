import { NextResponse } from 'next/server';

/**
 * Cognitive Health Twin API route.
 * Proxies to the Python FastAPI backend for:
 * - Full CHT data (PHM + Graph RAG + Agents)
 * - Knowledge Graph visualization data
 * - PHM timeline
 * - SHAP explainability
 * - Agent narrative
 */

const BACKEND_URL = 'http://127.0.0.1:8000';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || 'cht-full';
  const patientId = searchParams.get('patient_id') || 'patient_001';

  try {
    let url = '';

    switch (endpoint) {
      case 'cht-full':
        url = `${BACKEND_URL}/cht-full/${patientId}`;
        break;
      case 'knowledge-graph':
        url = `${BACKEND_URL}/knowledge-graph?patient_id=${patientId}`;
        break;
      case 'phm-timeline':
        url = `${BACKEND_URL}/phm-timeline/${patientId}`;
        break;
      case 'explainability':
        url = `${BACKEND_URL}/explainability/${patientId}`;
        break;
      case 'agent-narrative':
        url = `${BACKEND_URL}/agent-narrative/${patientId}`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.warn('CHT Backend not reachable:', error.message);

    // Return mock/fallback data structure so the frontend doesn't break
    return NextResponse.json({
      error: 'CHT backend not reachable',
      fallback: true,
      phm: {
        health_tier: 3,
        tier_name: 'Pre-clinical',
        tier_color: '#f97316',
        tier_description: 'Emerging risk patterns (demo mode)',
        composite_phm_score: 0.42,
        rul_days: 45,
        rul_confidence: 0.72,
        feature_importances: {
          heart_rate: 0.22,
          blood_pressure_systolic: 0.18,
          glucose_level: 0.25,
          spo2: 0.15,
          sleep_hours: 0.12,
          stress_level: 0.08,
        },
        trends: {
          heart_rate: { direction: 'worsening', pct_change: 12.5, current: 140, baseline: 75 },
          glucose_level: { direction: 'worsening', pct_change: 18.2, current: 160, baseline: 95 },
          spo2: { direction: 'worsening', pct_change: -8.1, current: 85, baseline: 97 },
          sleep_hours: { direction: 'worsening', pct_change: -27.8, current: 5.2, baseline: 7.2 },
          stress_level: { direction: 'worsening', pct_change: 240, current: 0.85, baseline: 0.25 },
        },
        timeline: [],
        alerts: [
          'Multi-vital deterioration detected',
          'Glycemic variability elevated',
          'Sleep debt accumulating',
        ],
      },
      graph_rag: {
        narrative: {
          short_summary: 'Composite risk elevated with multiple biomarkers beyond threshold. Primary driver: metabolic pattern with concurrent cardiovascular stress. (Demo fallback — start the Python backend for full analysis)',
          full_narrative: 'Demo mode — full narrative requires the Python CHT backend.',
        },
        analysis: {
          severity: 'HIGH',
          primary_concern: 'Fasting Glucose at 160 mg/dL (high — 27.0% beyond threshold)',
          clinical_flags: [
            '⚠️ Metabolic Syndrome Pattern: concurrent hyperglycemia + elevated BMI',
            '⚠️ Cardiovascular Stress: concurrent tachycardia + hypertension',
            '⚠️ Neuroendocrine Strain: high stress with sleep deprivation → cortisol cascade risk',
          ],
        },
      },
      graph_visualization: { nodes: [], edges: [] },
    });
  }
}
