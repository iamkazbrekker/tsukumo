"""
TSUKUMO Cognitive Health Twin — Agent Orchestrator
===================================================
Implements three specialized agents for the Agentic Graph RAG:
  1. Retriever Agent — Queries the Knowledge Graph for relevant context
  2. Analyst Agent  — Compares data against clinical guidelines
  3. Summarizer Agent — Generates natural-language risk narratives

These agents operate autonomously: when a risk flag is raised,
they reason through the graph to explain WHY, not just WHAT.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from knowledge_graph import KnowledgeGraph, NodeType, EdgeType

logger = logging.getLogger("TsukumoAgents")


class RetrieverAgent:
    """
    The Retriever Agent acts as an 'investigator'.
    Given flagged biomarkers, it autonomously traverses the Knowledge Graph
    to gather all relevant medical context: related diseases, medications,
    lifestyle factors, and causal chains.
    """

    def __init__(self, kg: KnowledgeGraph):
        self.kg = kg
        self.name = "Retriever Agent"

    def retrieve_context(self, patient_id: str, vitals: Dict[str, Any]) -> Dict[str, Any]:
        """
        Autonomously retrieves all relevant context from the KG
        based on the patient's current vitals.
        """
        logger.info(f"[{self.name}] Beginning context retrieval for {patient_id}")

        # Step 1: Update patient node in the graph
        self.kg.update_patient_context(patient_id, vitals)

        # Step 2: Identify which biomarkers are flagged
        flagged_biomarkers = self._identify_flagged_biomarkers(vitals)

        # Step 3: For each flagged biomarker, trace causal chains
        causal_chains = {}
        for bm_id, bm_info in flagged_biomarkers.items():
            chain = self.kg.trace_causal_chain(bm_id)
            chain["current_value"] = bm_info["value"]
            chain["threshold"] = bm_info["threshold"]
            chain["severity"] = bm_info["severity"]
            causal_chains[bm_id] = chain

        # Step 4: Check for medication interactions
        medication_interactions = self.kg.get_medication_interactions(patient_id)

        # Step 5: Gather all affected organ systems
        affected_systems = set()
        for bm_id in flagged_biomarkers:
            for node, _ in self.kg.get_neighbors(bm_id, EdgeType.AFFECTS_SYSTEM):
                affected_systems.add(node.label)

        # Step 6: Collect all at-risk diseases (deduplicated)
        at_risk_diseases = {}
        for bm_id, chain in causal_chains.items():
            for disease in chain.get("direct_risks", []):
                if disease["id"] not in at_risk_diseases:
                    at_risk_diseases[disease["id"]] = {
                        **disease,
                        "contributing_biomarkers": [bm_id],
                    }
                else:
                    at_risk_diseases[disease["id"]]["contributing_biomarkers"].append(bm_id)
            for indirect in chain.get("indirect_risks", []):
                d_id = indirect["disease"]["id"]
                if d_id not in at_risk_diseases:
                    at_risk_diseases[d_id] = {
                        **indirect["disease"],
                        "contributing_biomarkers": [bm_id],
                        "indirect_via": indirect["via"]["label"],
                    }

        context = {
            "patient_id": patient_id,
            "timestamp": datetime.now().isoformat(),
            "flagged_biomarkers": flagged_biomarkers,
            "causal_chains": causal_chains,
            "at_risk_diseases": list(at_risk_diseases.values()),
            "medication_interactions": medication_interactions,
            "affected_systems": list(affected_systems),
            "retrieval_depth": 3,
        }

        logger.info(f"[{self.name}] Retrieved context: {len(flagged_biomarkers)} flagged biomarkers, "
                     f"{len(at_risk_diseases)} at-risk diseases, {len(affected_systems)} affected systems")

        return context

    def _identify_flagged_biomarkers(self, vitals: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Identify which biomarkers are in concerning range."""
        flagged = {}
        thresholds = {
            "heart_rate": ("bm_high_hr", 100, "above", "Heart Rate"),
            "blood_pressure_systolic": ("bm_high_bp", 140, "above", "Systolic BP"),
            "glucose_level": ("bm_high_glucose", 126, "above", "Fasting Glucose"),
            "spo2": ("bm_low_spo2", 94, "below", "SpO2"),
            "stress_level": ("bm_high_stress", 0.7, "above", "Stress Index"),
            "sleep_hours": ("bm_low_sleep", 6, "below", "Sleep Duration"),
            "bmi": ("bm_high_bmi", 25, "above", "BMI"),
        }

        for vital_key, (bm_id, threshold, direction, display_name) in thresholds.items():
            if vital_key not in vitals:
                continue
            value = vitals[vital_key]
            is_concerning = value < threshold if direction == "below" else value > threshold

            if is_concerning:
                # Calculate severity: how far beyond threshold
                if direction == "below":
                    deviation = (threshold - value) / threshold
                else:
                    deviation = (value - threshold) / threshold

                severity = "critical" if deviation > 0.3 else "high" if deviation > 0.15 else "moderate"

                flagged[bm_id] = {
                    "value": value,
                    "threshold": threshold,
                    "direction": direction,
                    "deviation_pct": round(deviation * 100, 1),
                    "severity": severity,
                    "display_name": display_name,
                }

        return flagged


class AnalystAgent:
    """
    The Analyst Agent compares retrieved data against clinical guidelines.
    It assesses severity, identifies guideline violations, and structures
    the clinical assessment.
    """

    def __init__(self, kg: KnowledgeGraph):
        self.kg = kg
        self.name = "Analyst Agent"

    def analyze(self, context: Dict[str, Any], vitals: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze retrieved context against clinical guidelines.
        """
        logger.info(f"[{self.name}] Analyzing context for {context['patient_id']}")

        guideline_assessments = []
        risk_factors_count = len(context.get("flagged_biomarkers", {}))
        disease_risks = context.get("at_risk_diseases", [])

        # Evaluate each at-risk disease against its guidelines
        for disease in disease_risks:
            disease_id = disease["id"]
            guidelines = self.kg.get_clinical_guidelines(disease_id)

            for g in guidelines:
                guideline = g["guideline"]
                assessment = self._evaluate_guideline(guideline, vitals)
                if assessment:
                    guideline_assessments.append(assessment)

        # Calculate overall clinical severity
        overall_severity = self._calculate_severity(context, vitals)

        # Identify primary concern
        primary_concern = self._identify_primary_concern(context)

        # Generate structured assessment
        analysis = {
            "patient_id": context["patient_id"],
            "timestamp": datetime.now().isoformat(),
            "overall_severity": overall_severity,
            "primary_concern": primary_concern,
            "guideline_assessments": guideline_assessments,
            "risk_factor_count": risk_factors_count,
            "disease_risk_count": len(disease_risks),
            "multi_system_involvement": len(context.get("affected_systems", [])) > 1,
            "medication_concerns": len(context.get("medication_interactions", [])) > 0,
            "clinical_flags": self._generate_clinical_flags(context, vitals),
        }

        logger.info(f"[{self.name}] Analysis complete: severity={overall_severity}, "
                     f"primary={primary_concern}")

        return analysis

    def _evaluate_guideline(self, guideline: Dict[str, Any], vitals: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Evaluate a specific clinical guideline against vitals."""
        props = guideline.get("properties", {})
        label = guideline["label"]
        violations = []

        # ADA Diabetes Standards
        if "fasting_glucose_diabetic" in props:
            glucose = vitals.get("glucose_level", 0)
            if glucose >= props["fasting_glucose_diabetic"]:
                violations.append({
                    "parameter": "Fasting Glucose",
                    "value": glucose,
                    "threshold": props["fasting_glucose_diabetic"],
                    "classification": "Diabetic Range",
                    "action": "Confirm with HbA1c test; initiate treatment protocol",
                })
            elif glucose >= props.get("fasting_glucose_prediabetic", 100):
                violations.append({
                    "parameter": "Fasting Glucose",
                    "value": glucose,
                    "threshold": props["fasting_glucose_prediabetic"],
                    "classification": "Pre-diabetic Range",
                    "action": "Lifestyle intervention; retest in 3 months",
                })

        # AHA Blood Pressure
        if "stage1_systolic" in props:
            sbp = vitals.get("blood_pressure_systolic", 0)
            if sbp >= props.get("stage2_systolic", 180):
                violations.append({
                    "parameter": "Systolic BP",
                    "value": sbp,
                    "threshold": props["stage2_systolic"],
                    "classification": "Hypertensive Crisis",
                    "action": "Immediate medical attention required",
                })
            elif sbp >= props["stage1_systolic"]:
                violations.append({
                    "parameter": "Systolic BP",
                    "value": sbp,
                    "threshold": props["stage1_systolic"],
                    "classification": "Stage 1 Hypertension",
                    "action": "Pharmacological therapy + lifestyle modification",
                })
            elif sbp >= props.get("elevated_systolic", 130):
                violations.append({
                    "parameter": "Systolic BP",
                    "value": sbp,
                    "threshold": props["elevated_systolic"],
                    "classification": "Elevated",
                    "action": "Lifestyle modification recommended",
                })

        # WHO BMI
        if "obese" in props:
            bmi = vitals.get("bmi", 0)
            if bmi >= props["obese"]:
                violations.append({
                    "parameter": "BMI",
                    "value": bmi,
                    "threshold": props["obese"],
                    "classification": "Obese",
                    "action": "Comprehensive weight management program",
                })
            elif bmi >= props.get("overweight", 25):
                violations.append({
                    "parameter": "BMI",
                    "value": bmi,
                    "threshold": props["overweight"],
                    "classification": "Overweight",
                    "action": "Dietary counseling and exercise program",
                })

        # NSF Sleep
        if "adult_min" in props:
            sleep = vitals.get("sleep_hours", 8)
            if sleep < props["adult_min"]:
                violations.append({
                    "parameter": "Sleep Duration",
                    "value": sleep,
                    "threshold": props["adult_min"],
                    "classification": "Sleep Deficient",
                    "action": "Sleep hygiene assessment; evaluate for sleep disorders",
                })

        if violations:
            return {
                "guideline": label,
                "source": props.get("source", "Unknown"),
                "violations": violations,
            }
        return None

    def _calculate_severity(self, context: Dict[str, Any], vitals: Dict[str, Any]) -> str:
        """Calculate overall clinical severity."""
        score = 0
        biomarkers = context.get("flagged_biomarkers", {})

        for bm_id, bm_info in biomarkers.items():
            if bm_info["severity"] == "critical":
                score += 3
            elif bm_info["severity"] == "high":
                score += 2
            else:
                score += 1

        # Multi-system involvement adds severity
        if len(context.get("affected_systems", [])) > 2:
            score += 2

        # Medication interactions add severity
        if context.get("medication_interactions"):
            score += 1

        if score >= 8:
            return "CRITICAL"
        elif score >= 5:
            return "HIGH"
        elif score >= 3:
            return "MODERATE"
        elif score >= 1:
            return "LOW"
        return "NOMINAL"

    def _identify_primary_concern(self, context: Dict[str, Any]) -> str:
        """Identify the single most critical concern."""
        biomarkers = context.get("flagged_biomarkers", {})
        if not biomarkers:
            return "No active concerns"

        # Find the most severe biomarker
        worst = max(biomarkers.items(), key=lambda x: x[1].get("deviation_pct", 0))
        return f"{worst[1]['display_name']} at {worst[1]['value']} ({worst[1]['severity']} — {worst[1]['deviation_pct']}% beyond threshold)"

    def _generate_clinical_flags(self, context: Dict[str, Any], vitals: Dict[str, Any]) -> List[str]:
        """Generate actionable clinical flags."""
        flags = []
        biomarkers = context.get("flagged_biomarkers", {})

        if "bm_low_spo2" in biomarkers and biomarkers["bm_low_spo2"]["severity"] == "critical":
            flags.append("🔴 URGENT: Severe hypoxemia detected — immediate pulse oximetry and ABG recommended")

        if "bm_high_glucose" in biomarkers and "bm_high_bmi" in biomarkers:
            flags.append("⚠️ Metabolic Syndrome Pattern: concurrent hyperglycemia + elevated BMI")

        if "bm_high_hr" in biomarkers and "bm_high_bp" in biomarkers:
            flags.append("⚠️ Cardiovascular Stress: concurrent tachycardia + hypertension")

        if "bm_high_stress" in biomarkers and "bm_low_sleep" in biomarkers:
            flags.append("⚠️ Neuroendocrine Strain: high stress with sleep deprivation → cortisol cascade risk")

        if len(context.get("affected_systems", [])) >= 3:
            flags.append("🔶 Multi-System Alert: 3+ organ systems showing concurrent stress")

        return flags


class SummarizerAgent:
    """
    The Summarizer Agent generates natural-language risk narratives
    that explain the WHY behind risk scores. It combines the Retriever's
    context and the Analyst's assessment into a clinician-readable report.
    """

    def __init__(self, kg: KnowledgeGraph):
        self.kg = kg
        self.name = "Summarizer Agent"

    def generate_narrative(self, context: Dict[str, Any], analysis: Dict[str, Any],
                           composite_risk: float, vitals: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a comprehensive natural-language narrative explaining
        the risk assessment.
        """
        logger.info(f"[{self.name}] Generating narrative for {context['patient_id']}")

        sections = []

        # 1. Opening summary
        sections.append(self._generate_opening(analysis, composite_risk))

        # 2. Biomarker breakdown
        sections.append(self._generate_biomarker_section(context))

        # 3. Disease risk pathways
        sections.append(self._generate_disease_pathways(context))

        # 4. Guideline assessment
        sections.append(self._generate_guideline_section(analysis))

        # 5. Cross-factor analysis
        sections.append(self._generate_cross_factor_analysis(context, vitals))

        # 6. Recommendations
        sections.append(self._generate_recommendations(analysis, context))

        # Compile narrative
        full_narrative = "\n\n".join([s for s in sections if s])

        # Generate a short summary (1-2 sentences)
        short_summary = self._generate_short_summary(analysis, composite_risk, context)

        result = {
            "patient_id": context["patient_id"],
            "timestamp": datetime.now().isoformat(),
            "short_summary": short_summary,
            "full_narrative": full_narrative,
            "severity": analysis["overall_severity"],
            "primary_concern": analysis["primary_concern"],
            "clinical_flags": analysis.get("clinical_flags", []),
            "sections": sections,
        }

        logger.info(f"[{self.name}] Narrative generated: {len(full_narrative)} chars")
        return result

    def _generate_opening(self, analysis: Dict[str, Any], composite_risk: float) -> str:
        severity = analysis["overall_severity"]
        primary = analysis["primary_concern"]
        multi = "multi-system" if analysis.get("multi_system_involvement") else "localized"

        if severity == "CRITICAL":
            tone = "Immediate clinical attention recommended."
        elif severity == "HIGH":
            tone = "Elevated concern requiring near-term medical review."
        elif severity == "MODERATE":
            tone = "Watchful monitoring advised with lifestyle adjustments."
        else:
            tone = "Routine monitoring sufficient at this time."

        return (f"[COMPOSITE RISK INDEX: {composite_risk:.2f}] — Severity: {severity} ({multi} involvement). "
                f"{tone} Primary concern: {primary}.")

    def _generate_biomarker_section(self, context: Dict[str, Any]) -> str:
        biomarkers = context.get("flagged_biomarkers", {})
        if not biomarkers:
            return "All monitored biomarkers are within normal physiological ranges."

        lines = ["FLAGGED BIOMARKERS:"]
        for bm_id, info in biomarkers.items():
            node = self.kg.get_node(bm_id)
            label = node.label if node else bm_id
            direction = "exceeding" if info["direction"] == "above" else "below"
            lines.append(
                f"  • {label}: {info['value']} ({direction} threshold of {info['threshold']}, "
                f"deviation: {info['deviation_pct']}%, severity: {info['severity']})"
            )
        return "\n".join(lines)

    def _generate_disease_pathways(self, context: Dict[str, Any]) -> str:
        diseases = context.get("at_risk_diseases", [])
        if not diseases:
            return ""

        lines = ["DISEASE RISK PATHWAYS:"]
        for disease in diseases:
            contributors = disease.get("contributing_biomarkers", [])
            contributor_labels = []
            for c in contributors:
                node = self.kg.get_node(c)
                if node:
                    contributor_labels.append(node.label)

            indirect = f" (via {disease['indirect_via']})" if "indirect_via" in disease else ""
            lines.append(
                f"  • {disease['label']}{indirect} — driven by: {', '.join(contributor_labels)}"
            )
        return "\n".join(lines)

    def _generate_guideline_section(self, analysis: Dict[str, Any]) -> str:
        assessments = analysis.get("guideline_assessments", [])
        if not assessments:
            return ""

        lines = ["CLINICAL GUIDELINE ASSESSMENT:"]
        for assess in assessments:
            lines.append(f"  [{assess['source']}] {assess['guideline']}:")
            for v in assess.get("violations", []):
                lines.append(
                    f"    ‣ {v['parameter']}: {v['value']} → {v['classification']} "
                    f"(threshold: {v['threshold']}). Action: {v['action']}"
                )
        return "\n".join(lines)

    def _generate_cross_factor_analysis(self, context: Dict[str, Any], vitals: Dict[str, Any]) -> str:
        """Analyze interactions between multiple flagged systems."""
        biomarkers = context.get("flagged_biomarkers", {})
        systems = context.get("affected_systems", [])

        if len(biomarkers) < 2:
            return ""

        lines = ["CROSS-FACTOR ANALYSIS:"]

        if "bm_high_glucose" in biomarkers and "bm_high_bmi" in biomarkers:
            lines.append(
                "  • Metabolic Pattern Detected: Elevated glucose combined with high BMI suggests "
                "insulin resistance. This is a hallmark of metabolic syndrome and significantly "
                "increases cardiovascular risk."
            )

        if "bm_low_sleep" in biomarkers and "bm_high_stress" in biomarkers:
            lines.append(
                "  • Neuroendocrine Cascade: Sleep deprivation is amplifying the stress response "
                "via HPA axis activation, leading to chronically elevated cortisol. This cortisol "
                "excess independently drives hypertension and insulin resistance, creating a "
                "compounding risk cycle."
            )

        if "bm_high_hr" in biomarkers and "bm_low_spo2" in biomarkers:
            lines.append(
                "  • Cardiopulmonary Compensation: Elevated heart rate may be a compensatory "
                "response to low oxygen saturation. The cardiovascular system is working harder "
                "to maintain tissue oxygenation."
            )

        if "bm_high_bp" in biomarkers and "bm_high_glucose" in biomarkers:
            lines.append(
                "  • Vascular-Metabolic Convergence: Concurrent hypertension and hyperglycemia "
                "accelerate endothelial damage, dramatically increasing stroke and coronary "
                "artery disease risk."
            )

        if len(systems) >= 3:
            lines.append(
                f"  • Multi-System Burden: {len(systems)} organ systems under concurrent stress "
                f"({', '.join(systems)}). Systemic inflammatory cascade risk is elevated."
            )

        return "\n".join(lines) if len(lines) > 1 else ""

    def _generate_recommendations(self, analysis: Dict[str, Any], context: Dict[str, Any]) -> str:
        severity = analysis["overall_severity"]
        lines = ["RECOMMENDATIONS:"]

        if severity in ("CRITICAL", "HIGH"):
            lines.append("  1. Schedule immediate clinical consultation within 24-48 hours")
            lines.append("  2. Increase vitals monitoring frequency to every 4 hours")

            if any("Cardiovascular" in f for f in analysis.get("clinical_flags", [])):
                lines.append("  3. Cardiac workup: ECG, troponin levels, echocardiogram")
            if any("Metabolic" in f for f in analysis.get("clinical_flags", [])):
                lines.append("  3. Metabolic panel: HbA1c, lipid profile, fasting insulin")
            if any("hypoxemia" in f.lower() for f in analysis.get("clinical_flags", [])):
                lines.append("  3. Pulmonary assessment: SpO2 trending, chest X-ray, ABG")

        elif severity == "MODERATE":
            lines.append("  1. Schedule follow-up within 1-2 weeks")
            lines.append("  2. Implement lifestyle interventions: sleep hygiene, stress management")
            lines.append("  3. Continue current monitoring cadence")

        else:
            lines.append("  1. Continue routine monitoring")
            lines.append("  2. Annual preventive screening recommended")

        return "\n".join(lines)

    def _generate_short_summary(self, analysis: Dict[str, Any], composite_risk: float,
                                context: Dict[str, Any]) -> str:
        """Generate a 1-2 sentence summary."""
        severity = analysis["overall_severity"]
        n_biomarkers = len(context.get("flagged_biomarkers", {}))
        n_diseases = len(context.get("at_risk_diseases", []))
        primary = analysis["primary_concern"]

        if severity in ("CRITICAL", "HIGH"):
            return (f"Composite risk score of {composite_risk:.2f} with {n_biomarkers} flagged biomarkers "
                    f"indicating {n_diseases} potential disease pathways. Primary driver: {primary}. "
                    f"Immediate clinical review recommended.")
        elif severity == "MODERATE":
            return (f"Moderate risk detected (score: {composite_risk:.2f}). {n_biomarkers} biomarkers "
                    f"beyond threshold with {n_diseases} associated disease risks. "
                    f"Lifestyle intervention and follow-up advised.")
        else:
            return f"Risk profile nominal (score: {composite_risk:.2f}). All systems within acceptable parameters."


class AgentOrchestrator:
    """
    Orchestrates the three agents in sequence:
    Retriever → Analyst → Summarizer
    """

    def __init__(self, kg: KnowledgeGraph):
        self.kg = kg
        self.retriever = RetrieverAgent(kg)
        self.analyst = AnalystAgent(kg)
        self.summarizer = SummarizerAgent(kg)
        logger.info("Agent Orchestrator initialized with 3 agents")

    def run_pipeline(self, patient_id: str, vitals: Dict[str, Any],
                     composite_risk: float) -> Dict[str, Any]:
        """
        Run the full Agentic Graph RAG pipeline:
        1. Retriever gathers context from the Knowledge Graph
        2. Analyst evaluates against clinical guidelines
        3. Summarizer generates the narrative
        """
        logger.info(f"[Orchestrator] Running full pipeline for {patient_id}")

        # Phase 1: Retrieve
        context = self.retriever.retrieve_context(patient_id, vitals)

        # Phase 2: Analyze
        analysis = self.analyst.analyze(context, vitals)

        # Phase 3: Summarize
        narrative = self.summarizer.generate_narrative(context, analysis, composite_risk, vitals)

        # Compile results
        result = {
            "patient_id": patient_id,
            "timestamp": datetime.now().isoformat(),
            "retrieval": {
                "flagged_biomarkers_count": len(context.get("flagged_biomarkers", {})),
                "at_risk_diseases": context.get("at_risk_diseases", []),
                "affected_systems": context.get("affected_systems", []),
                "medication_interactions": context.get("medication_interactions", []),
            },
            "analysis": {
                "severity": analysis["overall_severity"],
                "primary_concern": analysis["primary_concern"],
                "guideline_assessments": analysis.get("guideline_assessments", []),
                "clinical_flags": analysis.get("clinical_flags", []),
                "multi_system": analysis.get("multi_system_involvement", False),
            },
            "narrative": {
                "short_summary": narrative["short_summary"],
                "full_narrative": narrative["full_narrative"],
                "sections": narrative["sections"],
            },
            "graph_data": self.kg.to_visualization_data(patient_id),
        }

        logger.info(f"[Orchestrator] Pipeline complete: severity={analysis['overall_severity']}")
        return result
