"""
whatif_engine.py  (zero dependency fallback)
=============================================
Monte Carlo What-If simulation engine.

Hard dependencies : NONE (pure Python stdlib)
Optional          : numpy  — used when available for speed
                    sklearn — needed only when real .pkl models are passed in

Works on Python 3.15 out-of-the-box with no installed packages.
"""

from __future__ import annotations

import math
import random
import warnings
from dataclasses import dataclass, field
from functools import partial
from typing import Callable, Dict, List, Optional, Tuple

warnings.filterwarnings("ignore")

# ── Optional numpy import ─────────────────────────────────────────────────────
try:
    import numpy as np
    _HAS_NUMPY = True
except ImportError:
    np = None          # type: ignore[assignment]
    _HAS_NUMPY = False


def _arr(lst) -> list:
    """Return np.array if numpy available, otherwise a plain list."""
    return np.asarray(lst, dtype=float) if _HAS_NUMPY else list(lst)


def _normal_samples(mean: float, std: float, n: int, rng) -> list:
    """Draw n normal samples using standard random.gauss if numpy absent."""
    if _HAS_NUMPY:
        return rng.normal(mean, std, n)
    return [rng.gauss(mean, std) for _ in range(n)]


def _clip_arr(arr, lo: float, hi: float) -> list:
    if _HAS_NUMPY:
        return np.clip(arr, lo, hi)
    return [max(lo, min(hi, v)) for v in arr]


def _mean(arr) -> float:
    if not arr: return 0.0
    valid = [v for v in arr if not math.isnan(np.nan if _HAS_NUMPY and math.isnan(v) else v)]
    return sum(valid) / len(valid) if valid else 0.0


def _percentile(arr, p: float) -> float:
    # Always use pure-Python path — numpy's percentile has a bug on Python 3.15
    s = sorted(float(v) for v in arr)
    n = len(s)
    if n == 0:
        return 0.0
    k = (p / 100.0) * (n - 1)
    lo, hi = int(k), min(int(k) + 1, n - 1)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


# ── Population Priors ─────────────────────────────────────────────────────────
NHANES_PRIORS: Dict[str, Tuple] = {
    "age":                       (47.8,  18.0,  18,   90),
    "bmi":                       (29.6,   7.0,  15,   60),
    "sysBP":                     (124.0, 19.0,  80,  220),
    "diaBP":                     ( 76.0, 12.0,  50,  130),
    "heartRate":                 ( 73.0, 13.0,  40,  140),
    "totChol":                   (197.0, 40.0, 100,  400),
    "HDLChol":                   ( 54.0, 16.0,  20,  110),
    "glucose":                   (104.0, 30.0,  60,  400),
    "cigarettes_per_day":        (  3.5,  7.0,   0,   60),
    "sleep_hours":               (  6.9,  1.4,   3,   12),
    "physical_activity_met":     (  2.8,  1.6,   1,   12),
    "sodium_mg_per_day":         (3440.0,900.0, 500, 8000),
    "alcohol_drinks_per_week":   (  3.1,  5.5,   0,   50),
    "prevalentHyp":              (  0.45, 0.497, 0,    1),
    "diabetes":                  (  0.11, 0.31,  0,    1),
    "currentSmoker":             (  0.14, 0.35,  0,    1),
    "gravity":                   (1.015, 0.005, 1.000, 1.035),
    "ph":                        (6.0, 1.0, 4.5, 8.0),
    "osmo":                      (600, 200, 50, 1200),
    "cond":                      (20.0, 5.0, 5.0, 40.0),
    "urea":                      (300, 100, 50, 800),
    "calc":                      (3.5, 2.0, 0.5, 15.0),
}

BINARY_FEATURES = {"prevalentHyp", "diabetes", "currentSmoker"}

CARDIAC_FEATURES = [
    "age", "sysBP", "diaBP", "heartRate", "totChol", "HDLChol",
    "glucose", "bmi", "currentSmoker", "cigarettes_per_day", "prevalentHyp",
]
DIABETES_FEATURES = [
    "age", "bmi", "glucose", "sysBP", "diaBP", "totChol",
    "HDLChol", "sleep_hours", "physical_activity_met", "sodium_mg_per_day",
]
KIDNEY_FEATURES = [
    "gravity", "ph", "osmo", "cond", "urea", "calc"
]
RESPIRATORY_FEATURES = [
    "age", "bmi", "currentSmoker", "cigarettes_per_day"  # Proxy features for testing
]


# ── Patient profile ───────────────────────────────────────────────────────────

@dataclass
class PatientProfile:
    age:                     float = 45.0
    bmi:                     float = 28.5
    sysBP:                   float = 140.0
    diaBP:                   float = 90.0
    heartRate:               float = 85.0
    totChol:                 float = 215.0
    HDLChol:                 float = 45.0
    glucose:                 float = 160.0
    cigarettes_per_day:      float = 0.0
    sleep_hours:             float = 6.0
    physical_activity_met:   float = 1.5
    sodium_mg_per_day:       float = 3800.0
    alcohol_drinks_per_week: float = 4.0
    prevalentHyp:            float = 1.0
    diabetes:                float = 0.0
    currentSmoker:           float = 0.0
    gravity:                 float = 1.015
    ph:                      float = 6.0
    osmo:                    float = 600.0
    cond:                    float = 20.0
    urea:                    float = 300.0
    calc:                    float = 3.5

    @classmethod
    def from_dict(cls, d: dict) -> "PatientProfile":
        valid = {f.name for f in cls.__dataclass_fields__.values()}  # type: ignore[attr-defined]
        return cls(**{k: float(v) for k, v in d.items() if k in valid})


# ── Scenario ──────────────────────────────────────────────────────────────────

@dataclass
class Scenario:
    name:        str
    description: str
    color:       str
    deltas:      Dict[str, Callable] = field(default_factory=dict)


# ── Module-level delta functions (picklable) ─────────────────────────────────
def _d_add(vals, offset):
    return [max(0.001, v + offset) for v in vals]

def _d_cap(vals, cap):
    return [min(v, cap) for v in vals]

def _d_floor(vals, floor):
    return [max(v, floor) for v in vals]

def _d_ones(vals):
    return [1.0] * len(vals)


def _build_scenarios() -> List[Scenario]:
    return [
        Scenario("Current Trajectory",
                 "No changes \u2014 baseline measured values.", "#7b7bff", {}),

        Scenario("Run 3\u00d7 / Week",
                 "Adds \u22489 MET-hrs/week aerobic exercise. Reduces SBP ~5 mmHg, BMI ~0.8.",
                 "#2ecc71", {
                     "physical_activity_met": partial(_d_add, offset=9.0),
                     "sysBP":                 partial(_d_add, offset=-5.0),
                     "bmi":                   partial(_d_add, offset=-0.8),
                     "heartRate":             partial(_d_add, offset=-4.0),
                     "glucose":               partial(_d_add, offset=-8.0),
                     "totChol":               partial(_d_add, offset=-6.0),
                     "HDLChol":               partial(_d_add, offset=4.0),
                 }),

        Scenario("Cut Sodium to 2,300 mg/day",
                 "DASH-diet target. Lowers SBP ~5.5 mmHg.",
                 "#3498db", {
                     "sodium_mg_per_day": partial(_d_cap, cap=2300.0),
                     "sysBP":             partial(_d_add, offset=-5.5),
                     "diaBP":             partial(_d_add, offset=-2.5),
                 }),

        Scenario("Sleep 8 hrs / Night",
                 "Optimal sleep. Linked to -3 mmHg SBP, -5 mg/dL glucose.",
                 "#9b59b6", {
                     "sleep_hours": partial(_d_floor, floor=8.0),
                     "sysBP":       partial(_d_add, offset=-3.0),
                     "glucose":     partial(_d_add, offset=-5.0),
                 }),

        Scenario("Full Lifestyle Optimisation",
                 "Exercise + reduced sodium + optimal sleep combined.",
                 "#00e5ff", {
                     "physical_activity_met": partial(_d_add, offset=9.0),
                     "sodium_mg_per_day":     partial(_d_cap, cap=2300.0),
                     "sleep_hours":           partial(_d_floor, floor=8.0),
                     "sysBP":                 partial(_d_add, offset=-13.0),
                     "diaBP":                 partial(_d_add, offset=-5.0),
                     "bmi":                   partial(_d_add, offset=-0.8),
                     "heartRate":             partial(_d_add, offset=-4.0),
                     "glucose":               partial(_d_add, offset=-13.0),
                     "totChol":               partial(_d_add, offset=-6.0),
                     "HDLChol":               partial(_d_add, offset=4.0),
                 }),

        Scenario("No Sodium Reduction",
                 "Sodium increases +500 mg/day (worst-case dietary drift).",
                 "#e74c3c", {
                     "sodium_mg_per_day": partial(_d_add, offset=500.0),
                     "sysBP":             partial(_d_add, offset=4.0),
                     "diaBP":             partial(_d_add, offset=2.0),
                 }),

        Scenario("Resume Smoking (10 cigs/day)",
                 "Smoking relapse. Raises cardiac risk substantially.",
                 "#c0392b", {
                     "currentSmoker":      partial(_d_ones),
                     "cigarettes_per_day": partial(_d_floor, floor=10.0),
                     "sysBP":              partial(_d_add, offset=7.0),
                     "totChol":            partial(_d_add, offset=12.0),
                     "HDLChol":            partial(_d_add, offset=-5.0),
                 }),

        Scenario("Aggressive Hydration Protocol",
                 "Increased fluid intake targeting kidney stone prophylaxis.",
                 "#3498db", {
                     "gravity":            partial(_d_cap, cap=1.005),
                     "osmo":               partial(_d_add, offset=-150.0),
                     "cond":               partial(_d_add, offset=-5.0),
                     "urea":               partial(_d_add, offset=-80.0),
                     "calc":               partial(_d_add, offset=-1.5),
                 }),
    ]


SCENARIOS: List[Scenario] = _build_scenarios()


# ── Built-in logistic risk scorer (no sklearn) ────────────────────────────────

class _LogisticScorer:
    """
    Simple logistic regression scorer built from Framingham-style
    coefficients. Used when the real .pkl model is not available.
    No sklearn required.
    """

    # Framingham-inspired coefficient table
    _CARDIAC_COEFS = {
        "age":               0.049,
        "sysBP":             0.018,
        "totChol":           0.011,
        "cigarettes_per_day":0.020,
        "currentSmoker":     0.300,
        "bmi":               0.012,
        "glucose":           0.008,
        "prevalentHyp":      0.220,
        "heartRate":         0.006,
        "diaBP":             0.009,
        "HDLChol":          -0.015,
        "_intercept":       -7.5,
    }

    _DIABETES_COEFS = {
        "glucose":               0.035,
        "bmi":                   0.028,
        "age":                   0.022,
        "sodium_mg_per_day":     0.0004,
        "sysBP":                 0.012,
        "sleep_hours":          -0.080,
        "physical_activity_met":-0.060,
        "totChol":               0.004,
        "diaBP":                 0.006,
        "HDLChol":              -0.012,
        "_intercept":           -6.5,
    }

    _KIDNEY_COEFS = {
        "gravity":               2.5,
        "osmo":                  0.002,
        "cond":                  0.03,
        "urea":                  0.004,
        "calc":                  0.15,
        "_intercept":           -5.0,
    }

    _RESPIRATORY_COEFS = {
        "age":                   0.03,
        "currentSmoker":         0.4,
        "cigarettes_per_day":    0.02,
        "bmi":                   0.01,
        "_intercept":           -6.0,
    }

    def __init__(self, coefs: dict, features: List[str]):
        self._coefs    = coefs
        self._features = features
        self._intercept = coefs.get("_intercept", 0.0)

    @staticmethod
    def _sigmoid(z: float) -> float:
        if math.isnan(z): return 0.0
        return 1.0 / (1.0 + math.exp(-max(-500, min(500, z))))

    def predict_proba_row(self, row: dict) -> float:
        z = self._intercept
        for feat in self._features:
            coef = self._coefs.get(feat, 0.0)
            val = row.get(feat, 0.0)
            if not math.isnan(val):
                z += coef * val
        return self._sigmoid(z)

    def score_cohort(self, cohort: dict) -> list:
        n = len(next(iter(cohort.values())))
        return [
            self.predict_proba_row({f: cohort[f][i] for f in self._features})
            for i in range(n)
        ]


_CARDIAC_SCORER     = _LogisticScorer(_LogisticScorer._CARDIAC_COEFS,     CARDIAC_FEATURES)
_DIABETES_SCORER    = _LogisticScorer(_LogisticScorer._DIABETES_COEFS,    DIABETES_FEATURES)
_KIDNEY_SCORER      = _LogisticScorer(_LogisticScorer._KIDNEY_COEFS,      KIDNEY_FEATURES)
_RESPIRATORY_SCORER = _LogisticScorer(_LogisticScorer._RESPIRATORY_COEFS, RESPIRATORY_FEATURES)


# ── Cohort generation ─────────────────────────────────────────────────────────

def _make_cohort(profile: PatientProfile, n: int, seed: int) -> dict:
    if _HAS_NUMPY:
        rng = np.random.default_rng(seed)
    else:
        rng = random.Random(seed)

    cols = {}
    for feat, (pop_mean, pop_std, lo, hi) in NHANES_PRIORS.items():
        raw     = _normal_samples(pop_mean, pop_std, n, rng)
        user    = getattr(profile, feat, pop_mean)
        shifted = [v + (user - pop_mean) for v in raw] if not _HAS_NUMPY else raw + (user - pop_mean)
        clipped = _clip_arr(shifted, lo, hi)
        if feat in BINARY_FEATURES:
            cols[feat] = [1.0 if v > 0.5 else 0.0 for v in clipped]
        else:
            cols[feat] = list(clipped) if not _HAS_NUMPY else clipped
    return cols


def _apply_scenario(cohort: dict, deltas: dict) -> dict:
    out = {k: (list(v) if not _HAS_NUMPY else v.copy()) for k, v in cohort.items()}
    for feat, fn in deltas.items():
        if feat in out:
            lo, hi     = NHANES_PRIORS[feat][2], NHANES_PRIORS[feat][3]
            out[feat]  = _clip_arr(fn(out[feat]), lo, hi)
    return out


def _score_cohort(model, cohort: dict, features: List[str]) -> list:
    """Score a cohort dict using either a real sklearn model or the built-in scorer."""
    if model is None:
        return []

    if hasattr(model, "predict_proba") or hasattr(model, "predict"):
        if _HAS_NUMPY:
            try:
                X = np.column_stack([cohort[f] for f in features]).astype(float)
                if hasattr(model, "predict_proba"):
                    return list(model.predict_proba(X)[:, 1])
                return list(model.predict(X).astype(float))
            except:
                pass # text models or dimension mismatches fallback below
        else:
            # No numpy → sklearn won't work; fall through to built-in scorer
            pass

    # Built-in logistic scorer
    if features == CARDIAC_FEATURES:
        return _CARDIAC_SCORER.score_cohort(cohort)
    elif features == DIABETES_FEATURES:
        return _DIABETES_SCORER.score_cohort(cohort)
    elif features == KIDNEY_FEATURES:
        return _KIDNEY_SCORER.score_cohort(cohort)
    return _RESPIRATORY_SCORER.score_cohort(cohort)


# ── Main engine ───────────────────────────────────────────────────────────────

class WhatIfEngine:
    """
    Monte Carlo What-If simulation engine.

    Zero hard dependencies (pure Python stdlib fallback).
    Pickle-safe.
    """

    VERSION = "3.1.0"   # Added kidney & respiratory to ecosystem

    def __init__(
        self,
        priors:                Dict[str, tuple] = None,
        scenarios:             List[Scenario]   = None,
        cardiac_features:      List[str]        = None,
        diabetes_features:     List[str]        = None,
        kidney_features:       List[str]        = None,
        respiratory_features:  List[str]        = None,
    ):
        self.priors               = priors               or NHANES_PRIORS
        self.scenarios            = scenarios            or SCENARIOS
        self.cardiac_features     = cardiac_features     or CARDIAC_FEATURES
        self.diabetes_features    = diabetes_features    or DIABETES_FEATURES
        self.kidney_features      = kidney_features      or KIDNEY_FEATURES
        self.respiratory_features = respiratory_features or RESPIRATORY_FEATURES

    def run(
        self,
        patient_data:      dict,
        cardiac_model      = None,
        diabetes_model     = None,
        kidney_model       = None,
        respiratory_model  = None,
        n:                 int  = 5_000,
        seed:              int  = 42,
        trajectory_weeks:  int  = 24,
    ) -> dict:
        """Full Monte Carlo simulation pipeline. Returns a JSON-serialisable dict."""
        profile  = PatientProfile.from_dict(patient_data)
        baseline = _make_cohort(profile, n=n, seed=seed)

        # Use the built-in scorer when no real model is supplied
        c_model = cardiac_model   # None → built-in scorer used in _score_cohort
        d_model = diabetes_model
        k_model = kidney_model
        r_model = respiratory_model

        scenario_results = []
        base_c: Optional[list] = None
        base_d: Optional[list] = None
        base_k: Optional[list] = None
        base_r: Optional[list] = None

        for sc in self.scenarios:
            cohort = _apply_scenario(baseline, sc.deltas)

            for risk_type, model, features in [
                ("cardiac",     c_model, self.cardiac_features),
                ("diabetes",    d_model, self.diabetes_features),
                ("kidney",      k_model, self.kidney_features),
                ("respiratory", r_model, self.respiratory_features),
            ]:
                try:
                    probs = _score_cohort(model, cohort, features)
                except Exception as err:
                    print(f"  ⚠ {sc.name}/{risk_type}: {err}")
                    probs = []

                # Always fall back to built-in scorer on empty result
                if not probs:
                    try:
                        probs = _score_cohort(None, cohort, features)
                    except Exception:
                        probs = [0.0] * n

                if sc.name == "Current Trajectory":
                    if risk_type == "cardiac":
                        base_c = probs
                    elif risk_type == "diabetes":
                        base_d = probs
                    elif risk_type == "kidney":
                        base_k = probs
                    else:
                        base_r = probs

                base_probs = base_c if risk_type == "cardiac" else base_d if risk_type == "diabetes" else base_k if risk_type == "kidney" else base_r
                base_mean  = _mean(base_probs) if base_probs else 0.0
                prob_drop  = sum(1 for p in probs if p < (base_mean - 0.05)) / len(probs) if probs else 0.0

                scenario_results.append({
                    "scenario":       sc.name,
                    "description":    sc.description,
                    "color":          sc.color,
                    "risk_type":      risk_type,
                    "mean_risk":      _mean(probs),
                    "p05":            _percentile(probs, 5),
                    "p25":            _percentile(probs, 25),
                    "p50":            _percentile(probs, 50),
                    "p75":            _percentile(probs, 75),
                    "p95":            _percentile(probs, 95),
                    "prob_drop_5pct": prob_drop,
                })

        trajectory = self._trajectory(
            baseline, c_model, self.cardiac_features,
            n_weeks=trajectory_weeks, seed=seed,
        )

        tornado_c = self._sensitivity(baseline, c_model, self.cardiac_features, n)
        tornado_d = self._sensitivity(baseline, d_model, self.diabetes_features, n)
        tornado_k = self._sensitivity(baseline, k_model, self.kidney_features, n)
        tornado_r = self._sensitivity(baseline, r_model, self.respiratory_features, n)

        return {
            "scenarios":           scenario_results,
            "trajectory":          trajectory,
            "feature_sensitivity": {
                "cardiac": tornado_c, 
                "diabetes": tornado_d,
                "kidney": tornado_k,
                "respiratory": tornado_r
            },
            "summary":             self._summary(scenario_results),
        }

    def _trajectory(self, baseline, model, features, n_weeks=24, seed=99) -> list:
        n   = min(1_000, len(next(iter(baseline.values()))))
        if _HAS_NUMPY:
            rng = np.random.default_rng(seed)
            idx_np = rng.choice(len(next(iter(baseline.values()))), size=n, replace=False)
            idx = idx_np.tolist()          # plain list → safe for list indexing
            sub = {k: [v[i] for i in idx] for k, v in baseline.items()}
        else:
            rng = random.Random(seed)
            full_n = len(next(iter(baseline.values())))
            idx = rng.sample(range(full_n), n)
            sub = {k: [v[i] for i in idx] for k, v in baseline.items()}

        key_scs = self.scenarios[:4]
        out = []

        for week in range(n_weeks + 1):
            frac  = week / n_weeks
            entry: dict = {"week": week}

            for sc in key_scs:
                cohort = {k: (list(v) if not _HAS_NUMPY else v.copy()) for k, v in sub.items()}
                for feat, fn in sc.deltas.items():
                    if feat in cohort:
                        lo, hi = self.priors[feat][2], self.priors[feat][3]
                        orig   = sub[feat]
                        target = _clip_arr(fn(list(orig) if not _HAS_NUMPY else orig), lo, hi)
                        cohort[feat] = [
                            o + frac * (t - o)
                            for o, t in zip(orig, target)
                        ] if not _HAS_NUMPY else (
                            orig + frac * (np.clip(fn(orig), lo, hi) - orig)
                        )

                try:
                    probs = _score_cohort(model, cohort, features)
                except Exception:
                    probs = _score_cohort(None, cohort, features)

                entry[sc.name] = {
                    "mean": _mean(probs),
                    "p10":  _percentile(probs, 10),
                    "p90":  _percentile(probs, 90),
                }

            out.append(entry)

        return out

    def _sensitivity(self, baseline, model, features, n) -> dict:
        n_boot = min(1_000, n)
        if _HAS_NUMPY:
            rng = np.random.default_rng(77)
            idx_np = rng.choice(n, size=n_boot, replace=False)
            idx = idx_np.tolist()
            sub = {f: [baseline[f][i] for i in idx] for f in features}
        else:
            rng = random.Random(77)
            idx = rng.sample(range(n), n_boot)
            sub = {f: [baseline[f][i] for i in idx] for f in features}

        result = {}
        for feat in features:
            sd = self.priors.get(feat, (0, 1, 0, 1))[1]
            lo, hi = self.priors[feat][2], self.priors[feat][3]

            hi_coh = dict(sub)
            hi_coh[feat] = _clip_arr([v + sd for v in sub[feat]], lo, hi)
            lo_coh = dict(sub)
            lo_coh[feat] = _clip_arr([v - sd for v in sub[feat]], lo, hi)

            try:
                hi_p = _mean(_score_cohort(model, hi_coh, features))
                lo_p = _mean(_score_cohort(model, lo_coh, features))
            except Exception:
                hi_p = lo_p = 0.0

            result[feat] = round((hi_p - lo_p) / (2 * sd + 1e-9), 6)

        return dict(sorted(result.items(), key=lambda x: abs(x[1]), reverse=True))

    def _summary(self, results: list) -> str:
        def get(sc: str, rt: str):
            for r in results:
                if r["scenario"] == sc and r["risk_type"] == rt:
                    return r
            return None

        bc = get("Current Trajectory", "cardiac")
        bd = get("Current Trajectory", "diabetes")
        bk = get("Current Trajectory", "kidney")
        br = get("Current Trajectory", "respiratory")
        if not bc or not bd:
            return "Simulation complete."

        lines = [
            f"Baseline — Cardiac: {bc['mean_risk']:.1%} | "
            f"Diabetes: {bd['mean_risk']:.1%} | "
            f"Kidney: {(bk['mean_risk'] if bk else 0):.1%} | "
            f"Resp: {(br['mean_risk'] if br else 0):.1%}"
        ]
        seen: set = set()
        for r in results:
            sc = r["scenario"]
            if sc == "Current Trajectory" or sc in seen:
                continue
            seen.add(sc)
            rc = get(sc, "cardiac")
            rk = get(sc, "kidney")
            if rc and rk:
                lines.append(
                    f"• {sc}: Cardiac {rc['mean_risk']:.1%} ({rc['mean_risk'] - bc['mean_risk']:+.1%}), "
                    f"Kidney {rk['mean_risk']:.1%} ({rk['mean_risk'] - (bk['mean_risk'] if bk else 0):+.1%})"
                )
        return " | ".join(lines)
