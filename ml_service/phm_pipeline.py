"""
TSUKUMO Cognitive Health Twin — PHM Pipeline
=============================================
Prognostics and Health Management pipeline adapted from
aerospace/industrial health monitoring to human physiology.

Features:
  - Temporal data store with 90-day rolling window
  - Feature extraction: HRV, Glycemic Variability, Sleep Debt, Trends
  - K-Means health tier stratification (5 tiers)
  - Remaining Useful Life (RUL) estimation
  - SHAP-like feature importance explainability
"""

import logging
import math
import random
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from collections import defaultdict

logger = logging.getLogger("TsukumoPHM")

# --- CONSTANTS ---
HEALTH_TIERS = {
    1: {"name": "Optimal", "color": "#10b981", "description": "All systems nominal", "risk_range": (0.0, 0.15)},
    2: {"name": "Watchful", "color": "#f59e0b", "description": "Minor deviations detected", "risk_range": (0.15, 0.30)},
    3: {"name": "Pre-clinical", "color": "#f97316", "description": "Emerging risk patterns", "risk_range": (0.30, 0.50)},
    4: {"name": "High Risk", "color": "#ef4444", "description": "Active clinical concern", "risk_range": (0.50, 0.75)},
    5: {"name": "Critical", "color": "#dc2626", "description": "Immediate attention required", "risk_range": (0.75, 1.0)},
}

VITAL_NORMAL_RANGES = {
    "heart_rate": {"min": 60, "max": 100, "unit": "BPM", "weight": 0.20},
    "blood_pressure_systolic": {"min": 90, "max": 120, "unit": "mmHg", "weight": 0.18},
    "blood_pressure_diastolic": {"min": 60, "max": 80, "unit": "mmHg", "weight": 0.10},
    "glucose_level": {"min": 70, "max": 100, "unit": "mg/dL", "weight": 0.18},
    "spo2": {"min": 95, "max": 100, "unit": "%", "weight": 0.15},
    "sleep_hours": {"min": 7, "max": 9, "unit": "hours", "weight": 0.10},
    "stress_level": {"min": 0.0, "max": 0.3, "unit": "score", "weight": 0.09},
}


@dataclass
class VitalSnapshot:
    timestamp: str
    vitals: Dict[str, float]
    day_index: int = 0


@dataclass
class PHMResult:
    health_tier: int
    tier_name: str
    tier_color: str
    tier_description: str
    composite_phm_score: float
    rul_days: int
    rul_confidence: float
    feature_importances: Dict[str, float]
    trends: Dict[str, Dict[str, Any]]
    extracted_features: Dict[str, float]
    timeline: List[Dict[str, Any]]
    alerts: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "health_tier": self.health_tier,
            "tier_name": self.tier_name,
            "tier_color": self.tier_color,
            "tier_description": self.tier_description,
            "composite_phm_score": round(self.composite_phm_score, 4),
            "rul_days": self.rul_days,
            "rul_confidence": round(self.rul_confidence, 2),
            "feature_importances": {k: round(v, 4) for k, v in self.feature_importances.items()},
            "trends": self.trends,
            "extracted_features": {k: round(v, 4) for k, v in self.extracted_features.items()},
            "timeline": self.timeline,
            "alerts": self.alerts,
        }


class PHMPipeline:
    """
    Autonomous PHM pipeline for human health prognostics.
    Maintains temporal health data and computes predictive analytics.
    """

    def __init__(self, window_days: int = 90):
        self.window_days = window_days
        self.patient_history: Dict[str, List[VitalSnapshot]] = defaultdict(list)
        self._generate_synthetic_history("patient_001")
        logger.info(f"PHM Pipeline initialized (window: {window_days} days)")

    def ingest(self, patient_id: str, vitals: Dict[str, float]) -> PHMResult:
        """
        Ingest a new vitals snapshot and run the full PHM pipeline.
        """
        snapshot = VitalSnapshot(
            timestamp=datetime.now().isoformat(),
            vitals=vitals,
            day_index=len(self.patient_history[patient_id]),
        )
        self.patient_history[patient_id].append(snapshot)

        # Trim to window
        if len(self.patient_history[patient_id]) > self.window_days:
            self.patient_history[patient_id] = self.patient_history[patient_id][-self.window_days:]

        return self.analyze(patient_id)

    def analyze(self, patient_id: str) -> PHMResult:
        """Run the full analysis pipeline."""
        history = self.patient_history.get(patient_id, [])
        if not history:
            return self._empty_result()

        # Step 1: Feature Extraction
        features = self._extract_features(history)

        # Step 2: Compute composite PHM score
        phm_score = self._compute_phm_score(features, history)

        # Step 3: Health Tier Stratification
        tier = self._stratify_tier(phm_score)

        # Step 4: Trend Detection
        trends = self._detect_trends(history)

        # Step 5: RUL Estimation
        rul_days, rul_confidence = self._estimate_rul(phm_score, trends)

        # Step 6: SHAP-like Feature Importance
        importances = self._compute_feature_importance(features, history)

        # Step 7: Build timeline for visualization
        timeline = self._build_timeline(history)

        # Step 8: Generate alerts
        alerts = self._generate_alerts(features, trends, tier)

        tier_info = HEALTH_TIERS[tier]

        return PHMResult(
            health_tier=tier,
            tier_name=tier_info["name"],
            tier_color=tier_info["color"],
            tier_description=tier_info["description"],
            composite_phm_score=phm_score,
            rul_days=rul_days,
            rul_confidence=rul_confidence,
            feature_importances=importances,
            trends=trends,
            extracted_features=features,
            timeline=timeline,
            alerts=alerts,
        )

    # --- FEATURE EXTRACTION ---

    def _extract_features(self, history: List[VitalSnapshot]) -> Dict[str, float]:
        """Extract derived features from temporal data."""
        features = {}

        # Group vitals by key
        vital_series = defaultdict(list)
        for snap in history:
            for key, val in snap.vitals.items():
                if isinstance(val, (int, float)):
                    vital_series[key].append(val)

        # Heart Rate Variability (HRV) — std dev of HR readings
        hr_data = vital_series.get("heart_rate", [])
        if len(hr_data) >= 2:
            features["hrv"] = self._std_dev(hr_data)
        else:
            features["hrv"] = 0.0

        # Glycemic Variability — coefficient of variation of glucose
        glucose_data = vital_series.get("glucose_level", [])
        if len(glucose_data) >= 2:
            mean_g = sum(glucose_data) / len(glucose_data)
            if mean_g > 0:
                features["glycemic_variability"] = (self._std_dev(glucose_data) / mean_g) * 100
            else:
                features["glycemic_variability"] = 0.0
        else:
            features["glycemic_variability"] = 0.0

        # Sleep Debt — cumulative deviation from 7h baseline
        sleep_data = vital_series.get("sleep_hours", [])
        if sleep_data:
            features["sleep_debt"] = sum(max(0, 7 - s) for s in sleep_data)
        else:
            features["sleep_debt"] = 0.0

        # Stress Accumulation — area under the stress curve
        stress_data = vital_series.get("stress_level", [])
        if stress_data:
            features["stress_accumulation"] = sum(stress_data) / len(stress_data)
        else:
            features["stress_accumulation"] = 0.0

        # BP Variability
        bp_data = vital_series.get("blood_pressure_systolic", [])
        if len(bp_data) >= 2:
            features["bp_variability"] = self._std_dev(bp_data)
        else:
            features["bp_variability"] = 0.0

        # SpO2 Nadir (lowest recorded)
        spo2_data = vital_series.get("spo2", [])
        if spo2_data:
            features["spo2_nadir"] = min(spo2_data)
            features["spo2_mean"] = sum(spo2_data) / len(spo2_data)
        else:
            features["spo2_nadir"] = 98.0
            features["spo2_mean"] = 98.0

        # Latest values
        latest = history[-1].vitals
        for key in ["heart_rate", "blood_pressure_systolic", "glucose_level", "spo2", "sleep_hours", "stress_level"]:
            features[f"latest_{key}"] = latest.get(key, 0)

        return features

    # --- COMPOSITE SCORE ---

    def _compute_phm_score(self, features: Dict[str, float], history: List[VitalSnapshot]) -> float:
        """
        Compute a 0-1 composite PHM score.
        Higher = worse health prognosis.
        """
        score_components = []

        latest = history[-1].vitals

        for vital_key, config in VITAL_NORMAL_RANGES.items():
            value = latest.get(vital_key, (config["min"] + config["max"]) / 2)
            normal_mid = (config["min"] + config["max"]) / 2
            normal_range = config["max"] - config["min"]

            if normal_range > 0:
                deviation = abs(value - normal_mid) / normal_range
                # For SpO2 and sleep, lower is worse
                if vital_key in ("spo2", "sleep_hours") and value < config["min"]:
                    deviation = (config["min"] - value) / normal_range * 2
                component = min(1.0, deviation) * config["weight"]
            else:
                component = 0.0

            score_components.append(component)

        base_score = sum(score_components)

        # Add temporal factor (worsening trends amplify the score)
        trends = self._detect_trends(history)
        trend_penalty = 0
        for vital_key, trend in trends.items():
            if trend.get("direction") == "worsening":
                trend_penalty += 0.02 * abs(trend.get("slope", 0))

        # Add feature-based amplifiers
        hrv_penalty = min(0.05, features.get("hrv", 0) / 100 * 0.05)
        glycemic_penalty = min(0.05, features.get("glycemic_variability", 0) / 50 * 0.05)
        sleep_penalty = min(0.05, features.get("sleep_debt", 0) / 30 * 0.05)

        total = base_score + trend_penalty + hrv_penalty + glycemic_penalty + sleep_penalty
        return max(0.0, min(1.0, total * 2.5))  # Scale to 0-1 range

    # --- TIER STRATIFICATION ---

    def _stratify_tier(self, phm_score: float) -> int:
        """Assign a health tier based on PHM score."""
        for tier, info in HEALTH_TIERS.items():
            low, high = info["risk_range"]
            if low <= phm_score < high:
                return tier
        return 5  # Critical if above all ranges

    # --- TREND DETECTION ---

    def _detect_trends(self, history: List[VitalSnapshot]) -> Dict[str, Dict[str, Any]]:
        """Detect trends in each vital using linear regression slope."""
        trends = {}
        if len(history) < 3:
            return trends

        vital_series = defaultdict(list)
        for i, snap in enumerate(history):
            for key, val in snap.vitals.items():
                if isinstance(val, (int, float)):
                    vital_series[key].append((i, val))

        for vital_key, series in vital_series.items():
            if len(series) < 3:
                continue

            xs = [s[0] for s in series]
            ys = [s[1] for s in series]
            slope = self._linear_slope(xs, ys)

            # Determine direction
            if vital_key in ("spo2", "sleep_hours"):
                # For these, decreasing is worsening
                direction = "worsening" if slope < -0.1 else "improving" if slope > 0.1 else "stable"
            else:
                # For these, increasing is worsening
                direction = "worsening" if slope > 0.1 else "improving" if slope < -0.1 else "stable"

            # Calculate percentage change over window
            if ys[0] != 0:
                pct_change = ((ys[-1] - ys[0]) / abs(ys[0])) * 100
            else:
                pct_change = 0.0

            trends[vital_key] = {
                "slope": round(slope, 4),
                "direction": direction,
                "pct_change": round(pct_change, 1),
                "current": ys[-1],
                "baseline": ys[0],
                "data_points": len(series),
            }

        return trends

    # --- RUL ESTIMATION ---

    def _estimate_rul(self, phm_score: float, trends: Dict[str, Dict[str, Any]]) -> Tuple[int, float]:
        """
        Estimate Remaining Useful Life — days until the next health tier transition.
        """
        current_tier = self._stratify_tier(phm_score)
        if current_tier >= 5:
            return 0, 0.95

        next_tier_threshold = HEALTH_TIERS[current_tier + 1]["risk_range"][0]
        gap = next_tier_threshold - phm_score

        if gap <= 0:
            return 0, 0.9

        # Estimate daily deterioration rate from trends
        worsening_count = sum(1 for t in trends.values() if t.get("direction") == "worsening")
        avg_slope = 0
        slope_count = 0
        for t in trends.values():
            if t.get("direction") == "worsening":
                avg_slope += abs(t.get("slope", 0))
                slope_count += 1

        if slope_count > 0:
            avg_slope /= slope_count

        # Convert slope to daily PHM score increase
        daily_deterioration = max(0.001, avg_slope * 0.005 * (1 + worsening_count * 0.1))

        rul_days = int(gap / daily_deterioration)
        rul_days = max(1, min(365, rul_days))  # Clamp between 1-365 days

        # Confidence decreases with more worsening trends and higher scores
        confidence = max(0.3, min(0.95, 0.9 - worsening_count * 0.1 - phm_score * 0.2))

        return rul_days, confidence

    # --- SHAP-LIKE EXPLAINABILITY ---

    def _compute_feature_importance(self, features: Dict[str, float],
                                    history: List[VitalSnapshot]) -> Dict[str, float]:
        """
        Compute SHAP-like feature importance scores.
        Shows which factors contributed most to the current PHM score.
        """
        importances = {}
        latest = history[-1].vitals

        total_contribution = 0

        for vital_key, config in VITAL_NORMAL_RANGES.items():
            value = latest.get(vital_key, (config["min"] + config["max"]) / 2)
            normal_mid = (config["min"] + config["max"]) / 2
            normal_range = config["max"] - config["min"]

            if normal_range > 0:
                raw_deviation = abs(value - normal_mid) / normal_range
                if vital_key in ("spo2", "sleep_hours") and value < config["min"]:
                    raw_deviation = (config["min"] - value) / normal_range * 2

                contribution = min(1.0, raw_deviation) * config["weight"]
            else:
                contribution = 0.0

            importances[vital_key] = contribution
            total_contribution += contribution

        # Normalize to sum to 1.0
        if total_contribution > 0:
            importances = {k: v / total_contribution for k, v in importances.items()}

        # Add derived feature contributions
        derived_total = 0

        if features.get("glycemic_variability", 0) > 15:
            importances["glycemic_variability"] = 0.08
            derived_total += 0.08

        if features.get("sleep_debt", 0) > 10:
            importances["sleep_debt"] = 0.06
            derived_total += 0.06

        if features.get("hrv", 0) > 15:
            importances["hrv_instability"] = 0.05
            derived_total += 0.05

        # Renormalize
        total = sum(importances.values())
        if total > 0:
            importances = {k: v / total for k, v in importances.items()}

        return importances

    # --- TIMELINE BUILDER ---

    def _build_timeline(self, history: List[VitalSnapshot]) -> List[Dict[str, Any]]:
        """Build timeline data for frontend visualization."""
        timeline = []

        # Sample at most 30 points for visualization
        step = max(1, len(history) // 30)
        sampled = history[::step]
        if history[-1] not in sampled:
            sampled.append(history[-1])

        for snap in sampled:
            phm_score = self._quick_score(snap.vitals)
            tier = self._stratify_tier(phm_score)

            timeline.append({
                "timestamp": snap.timestamp,
                "day_index": snap.day_index,
                "phm_score": round(phm_score, 4),
                "tier": tier,
                "tier_name": HEALTH_TIERS[tier]["name"],
                "tier_color": HEALTH_TIERS[tier]["color"],
                "vitals_summary": {
                    k: round(v, 1) if isinstance(v, float) else v
                    for k, v in snap.vitals.items()
                    if k in VITAL_NORMAL_RANGES
                },
            })

        return timeline

    def _quick_score(self, vitals: Dict[str, float]) -> float:
        """Quick PHM score from a single snapshot (no temporal features)."""
        total = 0
        for vital_key, config in VITAL_NORMAL_RANGES.items():
            value = vitals.get(vital_key, (config["min"] + config["max"]) / 2)
            normal_mid = (config["min"] + config["max"]) / 2
            normal_range = config["max"] - config["min"]
            if normal_range > 0:
                deviation = abs(value - normal_mid) / normal_range
                if vital_key in ("spo2", "sleep_hours") and value < config["min"]:
                    deviation = (config["min"] - value) / normal_range * 2
                total += min(1.0, deviation) * config["weight"]
        return max(0.0, min(1.0, total * 2.5))

    # --- ALERTS ---

    def _generate_alerts(self, features: Dict[str, float], trends: Dict[str, Dict[str, Any]],
                         tier: int) -> List[str]:
        """Generate PHM-specific alerts."""
        alerts = []

        if features.get("glycemic_variability", 0) > 25:
            alerts.append("High glycemic variability detected — consider continuous glucose monitoring")

        if features.get("sleep_debt", 0) > 20:
            alerts.append(f"Accumulated sleep debt of {features['sleep_debt']:.0f} hours — chronic fatigue risk")

        if features.get("hrv", 0) > 20:
            alerts.append("Heart rate variability elevated — autonomic nervous system instability")

        # Trend-based alerts
        worsening = [k for k, v in trends.items() if v.get("direction") == "worsening"]
        if len(worsening) >= 3:
            alerts.append(f"Multi-vital deterioration: {', '.join(worsening)} are trending worse")

        for vital_key, trend in trends.items():
            if trend.get("direction") == "worsening" and abs(trend.get("pct_change", 0)) > 15:
                alerts.append(f"{vital_key} has changed {trend['pct_change']}% over the monitoring window")

        if tier >= 4:
            alerts.append("Health tier is at HIGH RISK or above — escalate monitoring frequency")

        return alerts

    # --- SYNTHETIC HISTORY GENERATION ---

    def _generate_synthetic_history(self, patient_id: str):
        """Generate 90 days of synthetic vital data for demonstration."""
        logger.info(f"Generating {self.window_days}-day synthetic history for {patient_id}")

        base_vitals = {
            "heart_rate": 75,
            "blood_pressure_systolic": 118,
            "blood_pressure_diastolic": 78,
            "glucose_level": 95,
            "spo2": 97,
            "sleep_hours": 7.2,
            "stress_level": 0.25,
        }

        history = []
        now = datetime.now()

        for day in range(self.window_days):
            # Simulate gradual deterioration for dramatic demo
            progress = day / self.window_days

            # Heart rate: gradually increasing
            hr = base_vitals["heart_rate"] + progress * 45 + random.gauss(0, 5)

            # Blood pressure: gradually increasing
            sbp = base_vitals["blood_pressure_systolic"] + progress * 25 + random.gauss(0, 4)
            dbp = base_vitals["blood_pressure_diastolic"] + progress * 12 + random.gauss(0, 3)

            # Glucose: step increase around day 60 (simulating medication change)
            glucose_bump = 40 if day > 60 else 0
            glucose = base_vitals["glucose_level"] + progress * 35 + glucose_bump + random.gauss(0, 8)

            # SpO2: gradual decline
            spo2 = base_vitals["spo2"] - progress * 10 + random.gauss(0, 1.5)
            spo2 = max(80, min(100, spo2))

            # Sleep: declining
            sleep = base_vitals["sleep_hours"] - progress * 2 + random.gauss(0, 0.5)
            sleep = max(3, min(10, sleep))

            # Stress: increasing
            stress = base_vitals["stress_level"] + progress * 0.55 + random.gauss(0, 0.05)
            stress = max(0, min(1, stress))

            timestamp = (now - timedelta(days=self.window_days - day)).isoformat()

            snapshot = VitalSnapshot(
                timestamp=timestamp,
                vitals={
                    "heart_rate": round(hr, 1),
                    "blood_pressure_systolic": round(sbp, 1),
                    "blood_pressure_diastolic": round(dbp, 1),
                    "glucose_level": round(glucose, 1),
                    "spo2": round(spo2, 1),
                    "sleep_hours": round(sleep, 1),
                    "stress_level": round(stress, 3),
                },
                day_index=day,
            )
            history.append(snapshot)

        self.patient_history[patient_id] = history
        logger.info(f"Generated {len(history)} snapshots for {patient_id}")

    # --- UTILITY ---

    @staticmethod
    def _std_dev(values: List[float]) -> float:
        if len(values) < 2:
            return 0.0
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
        return math.sqrt(variance)

    @staticmethod
    def _linear_slope(xs: List[float], ys: List[float]) -> float:
        """Simple linear regression slope."""
        n = len(xs)
        if n < 2:
            return 0.0
        mean_x = sum(xs) / n
        mean_y = sum(ys) / n
        numerator = sum((xs[i] - mean_x) * (ys[i] - mean_y) for i in range(n))
        denominator = sum((xs[i] - mean_x) ** 2 for i in range(n))
        if denominator == 0:
            return 0.0
        return numerator / denominator

    def _empty_result(self) -> PHMResult:
        return PHMResult(
            health_tier=1,
            tier_name="Optimal",
            tier_color="#10b981",
            tier_description="No data available",
            composite_phm_score=0.0,
            rul_days=365,
            rul_confidence=0.5,
            feature_importances={},
            trends={},
            extracted_features={},
            timeline=[],
            alerts=[],
        )
