"""
save_whatif_model.py
====================
Serialises the WhatIfEngine to public/whatif_model.pkl.

Requirements: numpy only (no pandas).

Usage
-----
    cd ml_service
    python save_whatif_model.py
"""

import os
import pickle
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from whatif_engine import WhatIfEngine, NHANES_PRIORS, SCENARIOS, CARDIAC_FEATURES, DIABETES_FEATURES

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(BASE_DIR, "public", "whatif_model.pkl")

def main():
    print("Building WhatIfEngine…")
    engine = WhatIfEngine(
        priors            = NHANES_PRIORS,
        scenarios         = SCENARIOS,
        cardiac_features  = CARDIAC_FEATURES,
        diabetes_features = DIABETES_FEATURES,
    )
    print(f"  Engine v{engine.VERSION} — {len(engine.scenarios)} scenarios")

    print(f"Saving → {OUTPUT_PATH}")
    with open(OUTPUT_PATH, "wb") as f:
        pickle.dump(engine, f, protocol=pickle.HIGHEST_PROTOCOL)

    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"✅  Saved ({size_kb:.1f} KB)")
    print()
    print("  Restart ml_service/app.py — it will load whatif_model.pkl on the next start.")

if __name__ == "__main__":
    main()
