import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from whatif_engine import WhatIfEngine

e = WhatIfEngine()
r = e.run({
    'age': 45, 'sysBP': 140, 'bmi': 28.5, 'glucose': 160,
    'totChol': 215, 'HDLChol': 45, 'diaBP': 90, 'heartRate': 85,
    'cigarettes_per_day': 0, 'sleep_hours': 6, 'physical_activity_met': 1.5,
    'sodium_mg_per_day': 3800, 'alcohol_drinks_per_week': 4,
    'prevalentHyp': 1, 'diabetes': 0, 'currentSmoker': 0
}, n=500)

print("=== Scenario Results ===")
for s in r['scenarios'][:6]:
    print(f"  {s['scenario'][:30]:<30} {s['risk_type']:<8} {s['mean_risk']:.1%}")

print(f"\nTrajectory weeks    : {len(r['trajectory'])}")
print(f"Sensitivity (top-3) : {list(r['feature_sensitivity']['cardiac'].keys())[:3]}")
print(f"\nSummary excerpt: {r['summary'][:120]}")
print(f"\n✅  WhatIfEngine v{e.VERSION} OK")
