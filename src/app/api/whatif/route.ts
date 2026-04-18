import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE = 'http://127.0.0.1:5000';

/**
 * POST /api/whatif
 *
 * Proxies a Monte Carlo What-If request to the Python Flask service.
 *
 * Body (JSON) — two supported shapes:
 *   1. Flat patient data (legacy-compatible):
 *      { age, sysBP, bmi, glucose, ... }
 *
 *   2. Explicit envelope:
 *      { patient: { age, sysBP, ... }, n: 5000, weeks: 24 }
 *
 * On success: returns the full engine result:
 *   { scenarios, trajectory, feature_sensitivity, summary }
 *
 * If the Flask service is offline, returns a lightweight mock
 * result so the UI stays functional during development.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // ── Attempt live call to Flask ────────────────────────────────────────────
  try {
    const flaskRes = await fetch(`${ML_SERVICE}/whatif`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      // 30-second hard timeout for large MC runs
      signal:  AbortSignal.timeout(30_000),
    });

    if (flaskRes.ok) {
      const data = await flaskRes.json();
      return NextResponse.json(data);
    }

    const errText = await flaskRes.text();
    console.error('[whatif] Flask returned error:', flaskRes.status, errText);
    throw new Error('Flask returned non-OK status');
  } catch (err) {
    console.warn('[whatif] Flask offline or errored — returning mock result.', err);
  }

  // ── Offline mock ──────────────────────────────────────────────────────────
  // Mirrors the shape of WhatIfEngine.run() so UI components work
  // without the Python service running.
  const MOCK_SCENARIOS = [
    { scenario: 'Current Trajectory',          risk_type: 'cardiac',  mean_risk: 0.27, p05: 0.14, p25: 0.21, p50: 0.27, p75: 0.33, p95: 0.41, color: '#7b7bff', description: 'No changes — baseline.' },
    { scenario: 'Run 3× / Week',               risk_type: 'cardiac',  mean_risk: 0.19, p05: 0.10, p25: 0.15, p50: 0.19, p75: 0.23, p95: 0.30, color: '#2ecc71', description: 'Aerobic exercise 3×/week.' },
    { scenario: 'Cut Sodium to 2,300 mg/day',  risk_type: 'cardiac',  mean_risk: 0.22, p05: 0.12, p25: 0.17, p50: 0.22, p75: 0.27, p95: 0.34, color: '#3498db', description: 'DASH-diet sodium target.' },
    { scenario: 'Sleep 8 hrs / Night',         risk_type: 'cardiac',  mean_risk: 0.24, p05: 0.13, p25: 0.19, p50: 0.24, p75: 0.30, p95: 0.37, color: '#9b59b6', description: 'Optimal sleep duration.' },
    { scenario: 'Full Lifestyle Optimisation', risk_type: 'cardiac',  mean_risk: 0.14, p05: 0.07, p25: 0.11, p50: 0.14, p75: 0.18, p95: 0.24, color: '#2ecc71', description: 'Exercise + sodium + sleep.' },
    { scenario: 'No Sodium Reduction',         risk_type: 'cardiac',  mean_risk: 0.31, p05: 0.17, p25: 0.25, p50: 0.31, p75: 0.38, p95: 0.46, color: '#e74c3c', description: 'Dietary sodium drift.' },
    { scenario: 'Resume Smoking (10 cigs/day)',risk_type: 'cardiac',  mean_risk: 0.38, p05: 0.23, p25: 0.31, p50: 0.38, p75: 0.45, p95: 0.54, color: '#c0392b', description: 'Smoking relapse.' },

    { scenario: 'Current Trajectory',          risk_type: 'diabetes', mean_risk: 0.32, p05: 0.18, p25: 0.26, p50: 0.32, p75: 0.39, p95: 0.48, color: '#7b7bff', description: 'No changes — baseline.' },
    { scenario: 'Run 3× / Week',               risk_type: 'diabetes', mean_risk: 0.21, p05: 0.11, p25: 0.16, p50: 0.21, p75: 0.26, p95: 0.33, color: '#2ecc71', description: 'Aerobic exercise 3×/week.' },
    { scenario: 'Cut Sodium to 2,300 mg/day',  risk_type: 'diabetes', mean_risk: 0.28, p05: 0.15, p25: 0.22, p50: 0.28, p75: 0.35, p95: 0.43, color: '#3498db', description: 'DASH-diet sodium target.' },
    { scenario: 'Sleep 8 hrs / Night',         risk_type: 'diabetes', mean_risk: 0.27, p05: 0.14, p25: 0.21, p50: 0.27, p75: 0.34, p95: 0.42, color: '#9b59b6', description: 'Optimal sleep duration.' },
    { scenario: 'Full Lifestyle Optimisation', risk_type: 'diabetes', mean_risk: 0.15, p05: 0.07, p25: 0.11, p50: 0.15, p75: 0.19, p95: 0.26, color: '#2ecc71', description: 'Exercise + sodium + sleep.' },
    { scenario: 'No Sodium Reduction',         risk_type: 'diabetes', mean_risk: 0.37, p05: 0.20, p25: 0.29, p50: 0.37, p75: 0.45, p95: 0.54, color: '#e74c3c', description: 'Dietary sodium drift.' },
    { scenario: 'Resume Smoking (10 cigs/day)',risk_type: 'diabetes', mean_risk: 0.34, p05: 0.19, p25: 0.27, p50: 0.34, p75: 0.41, p95: 0.50, color: '#c0392b', description: 'Smoking relapse.' },
  ];

  // Build a simple 24-week trajectory mock
  const TRAJ_SCENARIOS = ['Current Trajectory', 'Run 3× / Week', 'Full Lifestyle Optimisation', 'No Sodium Reduction'];
  const BASE_RISKS: Record<string, number> = {
    'Current Trajectory':          0.27,
    'Run 3× / Week':               0.19,
    'Full Lifestyle Optimisation': 0.14,
    'No Sodium Reduction':         0.31,
  };

  const trajectory = Array.from({ length: 25 }, (_, week) => {
    const entry: Record<string, unknown> = { week };
    for (const sc of TRAJ_SCENARIOS) {
      const base    = BASE_RISKS[sc];
      const drift   = sc === 'No Sodium Reduction' ? 0.001 * week : -0.002 * week;
      const mean    = Math.min(0.9, Math.max(0.02, base + drift));
      entry[sc] = { mean, p10: mean - 0.06, p90: mean + 0.06 };
    }
    return entry;
  });

  const mock = {
    _mock:     true,
    scenarios: MOCK_SCENARIOS,
    trajectory,
    feature_sensitivity: {
      cardiac: {
        sysBP: 0.018, age: 0.015, totChol: 0.010,
        glucose: 0.009, bmi: 0.007, currentSmoker: 0.012,
        cigarettes_per_day: 0.008, heartRate: 0.005,
        diaBP: 0.004, HDLChol: -0.006, prevalentHyp: 0.011,
      },
      diabetes: {
        glucose: 0.022, bmi: 0.018, age: 0.012,
        sodium_mg_per_day: 0.009, sysBP: 0.008,
        sleep_hours: -0.007, physical_activity_met: -0.010,
        totChol: 0.006, diaBP: 0.005, HDLChol: -0.004,
      },
    },
    summary:
      'Mock: Baseline cardiac 27% | Running 3×/week → 19% (−8%) | Full optimisation → 14% (−13%). ' +
      'Baseline diabetes 32% | Full optimisation → 15% (−17%).',
  };

  return NextResponse.json(mock);
}

/** GET /api/whatif — health probe */
export async function GET() {
  try {
    const res = await fetch(`${ML_SERVICE}/health`, { signal: AbortSignal.timeout(3_000) });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ flask_online: true, ...data });
    }
  } catch {
    // intentional
  }
  return NextResponse.json({ flask_online: false, whatif_loaded: false });
}
