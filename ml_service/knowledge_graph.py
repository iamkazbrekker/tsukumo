"""
TSUKUMO Cognitive Health Twin — Knowledge Graph Engine
======================================================
In-memory medical knowledge graph with ontology mapping,
entity-relationship storage, and graph traversal APIs.

Replaces Neo4j for local development while maintaining
identical query semantics.
"""

import logging
from typing import List, Dict, Any, Optional, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

logger = logging.getLogger("TsukumoKG")


# --- ONTOLOGY: Node & Edge Type Definitions ---

class NodeType(str, Enum):
    PATIENT = "Patient"
    BIOMARKER = "Biomarker"
    DISEASE = "Disease"
    MEDICATION = "Medication"
    SYMPTOM = "Symptom"
    LIFESTYLE_FACTOR = "LifestyleFactor"
    CLINICAL_GUIDELINE = "ClinicalGuideline"
    ORGAN_SYSTEM = "OrganSystem"


class EdgeType(str, Enum):
    HAS_BIOMARKER = "HAS_BIOMARKER"
    RISK_FACTOR_FOR = "RISK_FACTOR_FOR"
    TAKES_MEDICATION = "TAKES_MEDICATION"
    CAUSES_SIDE_EFFECT = "CAUSES_SIDE_EFFECT"
    RELATED_TO = "RELATED_TO"
    GUIDELINE_FOR = "GUIDELINE_FOR"
    SYMPTOM_OF = "SYMPTOM_OF"
    AFFECTS_SYSTEM = "AFFECTS_SYSTEM"
    TREATS = "TREATS"
    CONTRAINDICATED_WITH = "CONTRAINDICATED_WITH"
    TRIGGERS = "TRIGGERS"
    PROTECTS_AGAINST = "PROTECTS_AGAINST"


# --- DATA STRUCTURES ---

@dataclass
class GraphNode:
    id: str
    node_type: NodeType
    label: str
    properties: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.node_type.value,
            "label": self.label,
            "properties": self.properties,
        }


@dataclass
class GraphEdge:
    source_id: str
    target_id: str
    edge_type: EdgeType
    properties: Dict[str, Any] = field(default_factory=dict)
    weight: float = 1.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source": self.source_id,
            "target": self.target_id,
            "type": self.edge_type.value,
            "properties": self.properties,
            "weight": self.weight,
        }


# --- KNOWLEDGE GRAPH ---

class KnowledgeGraph:
    """
    In-memory medical knowledge graph.
    Supports entity storage, relationship mapping, and path traversal.
    """

    def __init__(self):
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: List[GraphEdge] = []
        self._adjacency: Dict[str, List[Tuple[str, GraphEdge]]] = {}
        self._reverse_adjacency: Dict[str, List[Tuple[str, GraphEdge]]] = {}
        self._seed_medical_knowledge()
        logger.info(f"Knowledge Graph initialized: {len(self.nodes)} nodes, {len(self.edges)} edges")

    def add_node(self, node: GraphNode) -> GraphNode:
        self.nodes[node.id] = node
        if node.id not in self._adjacency:
            self._adjacency[node.id] = []
        if node.id not in self._reverse_adjacency:
            self._reverse_adjacency[node.id] = []
        return node

    def add_edge(self, edge: GraphEdge) -> GraphEdge:
        self.edges.append(edge)
        if edge.source_id not in self._adjacency:
            self._adjacency[edge.source_id] = []
        self._adjacency[edge.source_id].append((edge.target_id, edge))

        if edge.target_id not in self._reverse_adjacency:
            self._reverse_adjacency[edge.target_id] = []
        self._reverse_adjacency[edge.target_id].append((edge.source_id, edge))
        return edge

    def get_node(self, node_id: str) -> Optional[GraphNode]:
        return self.nodes.get(node_id)

    def get_neighbors(self, node_id: str, edge_type: Optional[EdgeType] = None) -> List[Tuple[GraphNode, GraphEdge]]:
        """Get all nodes connected FROM this node."""
        results = []
        for target_id, edge in self._adjacency.get(node_id, []):
            if edge_type is None or edge.edge_type == edge_type:
                node = self.nodes.get(target_id)
                if node:
                    results.append((node, edge))
        return results

    def get_incoming(self, node_id: str, edge_type: Optional[EdgeType] = None) -> List[Tuple[GraphNode, GraphEdge]]:
        """Get all nodes connected TO this node."""
        results = []
        for source_id, edge in self._reverse_adjacency.get(node_id, []):
            if edge_type is None or edge.edge_type == edge_type:
                node = self.nodes.get(source_id)
                if node:
                    results.append((node, edge))
        return results

    def get_nodes_by_type(self, node_type: NodeType) -> List[GraphNode]:
        return [n for n in self.nodes.values() if n.node_type == node_type]

    def find_paths(self, start_id: str, end_id: str, max_depth: int = 5) -> List[List[Tuple[str, str]]]:
        """BFS to find all paths between two nodes up to max_depth."""
        if start_id not in self.nodes or end_id not in self.nodes:
            return []

        paths = []
        queue = [(start_id, [(start_id, "START")])]
        visited_paths: Set[str] = set()

        while queue:
            current, path = queue.pop(0)
            if len(path) > max_depth + 1:
                continue

            if current == end_id and len(path) > 1:
                path_key = "->".join([p[0] for p in path])
                if path_key not in visited_paths:
                    visited_paths.add(path_key)
                    paths.append(path)
                continue

            for target_id, edge in self._adjacency.get(current, []):
                if not any(p[0] == target_id for p in path):  # avoid cycles
                    queue.append((target_id, path + [(target_id, edge.edge_type.value)]))

        return paths

    def get_risk_factors(self, biomarker_id: str) -> List[Dict[str, Any]]:
        """Given a biomarker, find all diseases it's a risk factor for."""
        results = []
        neighbors = self.get_neighbors(biomarker_id, EdgeType.RISK_FACTOR_FOR)
        for node, edge in neighbors:
            results.append({
                "disease": node.to_dict(),
                "relationship": edge.to_dict(),
            })
        # Also check transitive: biomarker -> related_to -> X -> risk_factor_for -> disease
        related = self.get_neighbors(biomarker_id, EdgeType.RELATED_TO)
        for related_node, _ in related:
            for disease_node, edge in self.get_neighbors(related_node.id, EdgeType.RISK_FACTOR_FOR):
                results.append({
                    "disease": disease_node.to_dict(),
                    "relationship": edge.to_dict(),
                    "via": related_node.to_dict(),
                })
        return results

    def get_medication_interactions(self, patient_id: str) -> List[Dict[str, Any]]:
        """Find potential medication side effects for a patient."""
        interactions = []
        meds = self.get_neighbors(patient_id, EdgeType.TAKES_MEDICATION)
        for med_node, _ in meds:
            side_effects = self.get_neighbors(med_node.id, EdgeType.CAUSES_SIDE_EFFECT)
            for effect_node, edge in side_effects:
                interactions.append({
                    "medication": med_node.to_dict(),
                    "side_effect": effect_node.to_dict(),
                    "severity": edge.properties.get("severity", "unknown"),
                })
        return interactions

    def get_clinical_guidelines(self, disease_id: str) -> List[Dict[str, Any]]:
        """Get clinical guidelines applicable to a disease."""
        guidelines = []
        incoming = self.get_incoming(disease_id, EdgeType.GUIDELINE_FOR)
        for guide_node, edge in incoming:
            guidelines.append({
                "guideline": guide_node.to_dict(),
                "relationship": edge.to_dict(),
            })
        return guidelines

    def trace_causal_chain(self, biomarker_id: str) -> Dict[str, Any]:
        """Trace the full causal chain from a biomarker to diseases."""
        chain = {
            "origin": self.nodes.get(biomarker_id, GraphNode("unknown", NodeType.BIOMARKER, "Unknown")).to_dict(),
            "direct_risks": [],
            "indirect_risks": [],
            "related_symptoms": [],
            "affected_systems": [],
        }

        # Direct risk factors
        for node, edge in self.get_neighbors(biomarker_id, EdgeType.RISK_FACTOR_FOR):
            chain["direct_risks"].append(node.to_dict())

        # Transitive via RELATED_TO
        for related_node, _ in self.get_neighbors(biomarker_id, EdgeType.RELATED_TO):
            for disease_node, _ in self.get_neighbors(related_node.id, EdgeType.RISK_FACTOR_FOR):
                chain["indirect_risks"].append({
                    "disease": disease_node.to_dict(),
                    "via": related_node.to_dict(),
                })

        # Symptoms
        for node, _ in self.get_neighbors(biomarker_id, EdgeType.SYMPTOM_OF):
            chain["related_symptoms"].append(node.to_dict())

        # Organ systems
        for node, _ in self.get_neighbors(biomarker_id, EdgeType.AFFECTS_SYSTEM):
            chain["affected_systems"].append(node.to_dict())

        return chain

    def update_patient_context(self, patient_id: str, vitals: Dict[str, Any]):
        """Dynamically update the graph with a patient's current vitals."""
        # Ensure patient node exists
        if patient_id not in self.nodes:
            self.add_node(GraphNode(patient_id, NodeType.PATIENT, f"Patient {patient_id}", vitals))
        else:
            self.nodes[patient_id].properties.update(vitals)

        # Link active biomarkers based on vitals
        biomarker_mappings = {
            "heart_rate": ("bm_high_hr", 100),
            "blood_pressure_systolic": ("bm_high_bp", 140),
            "glucose_level": ("bm_high_glucose", 126),
            "spo2": ("bm_low_spo2", 94),  # inverted: below threshold = concerning
            "stress_level": ("bm_high_stress", 0.7),
            "sleep_hours": ("bm_low_sleep", 6),  # inverted
        }

        for vital_key, (biomarker_id, threshold) in biomarker_mappings.items():
            if vital_key not in vitals:
                continue
            value = vitals[vital_key]

            # Check if this vital crosses the threshold
            is_concerning = False
            if vital_key in ("spo2", "sleep_hours"):
                is_concerning = value < threshold
            else:
                is_concerning = value > threshold

            if is_concerning and biomarker_id in self.nodes:
                # Add edge from patient to biomarker if not already present
                existing = any(
                    e.source_id == patient_id and e.target_id == biomarker_id
                    for e in self.edges
                )
                if not existing:
                    self.add_edge(GraphEdge(
                        patient_id, biomarker_id,
                        EdgeType.HAS_BIOMARKER,
                        {"value": value, "threshold": threshold, "detected_at": datetime.now().isoformat()}
                    ))

    def to_visualization_data(self, patient_id: Optional[str] = None) -> Dict[str, Any]:
        """Export graph data for frontend visualization."""
        vis_nodes = []
        vis_edges = []

        # If patient-scoped, only include connected subgraph
        if patient_id and patient_id in self.nodes:
            included_ids = self._get_subgraph_ids(patient_id, depth=3)
        else:
            included_ids = set(self.nodes.keys())

        for node_id in included_ids:
            node = self.nodes.get(node_id)
            if node:
                vis_nodes.append({
                    **node.to_dict(),
                    "group": node.node_type.value,
                })

        for edge in self.edges:
            if edge.source_id in included_ids and edge.target_id in included_ids:
                vis_edges.append(edge.to_dict())

        return {"nodes": vis_nodes, "edges": vis_edges}

    def _get_subgraph_ids(self, start_id: str, depth: int) -> Set[str]:
        """BFS to get all node IDs within `depth` hops."""
        visited = {start_id}
        queue = [(start_id, 0)]
        while queue:
            current, d = queue.pop(0)
            if d >= depth:
                continue
            for target_id, _ in self._adjacency.get(current, []):
                if target_id not in visited:
                    visited.add(target_id)
                    queue.append((target_id, d + 1))
            for source_id, _ in self._reverse_adjacency.get(current, []):
                if source_id not in visited:
                    visited.add(source_id)
                    queue.append((source_id, d + 1))
        return visited

    # --- MEDICAL KNOWLEDGE SEED ---

    def _seed_medical_knowledge(self):
        """Pre-populate the graph with medical ontology and relationships."""

        # ====== ORGAN SYSTEMS ======
        self.add_node(GraphNode("sys_cardiac", NodeType.ORGAN_SYSTEM, "Cardiovascular System",
                                {"description": "Heart and blood vessel network"}))
        self.add_node(GraphNode("sys_respiratory", NodeType.ORGAN_SYSTEM, "Respiratory System",
                                {"description": "Lungs and airways"}))
        self.add_node(GraphNode("sys_endocrine", NodeType.ORGAN_SYSTEM, "Endocrine System",
                                {"description": "Hormonal regulation including pancreas"}))
        self.add_node(GraphNode("sys_renal", NodeType.ORGAN_SYSTEM, "Renal System",
                                {"description": "Kidneys and urinary tract"}))
        self.add_node(GraphNode("sys_nervous", NodeType.ORGAN_SYSTEM, "Nervous System",
                                {"description": "Brain and neural pathways"}))

        # ====== BIOMARKERS ======
        self.add_node(GraphNode("bm_high_hr", NodeType.BIOMARKER, "Elevated Heart Rate",
                                {"unit": "BPM", "threshold": 100, "direction": "above", "vital_key": "heart_rate"}))
        self.add_node(GraphNode("bm_high_bp", NodeType.BIOMARKER, "Elevated Blood Pressure",
                                {"unit": "mmHg", "threshold": 140, "direction": "above", "vital_key": "blood_pressure_systolic"}))
        self.add_node(GraphNode("bm_high_glucose", NodeType.BIOMARKER, "Elevated Fasting Glucose",
                                {"unit": "mg/dL", "threshold": 126, "direction": "above", "vital_key": "glucose_level"}))
        self.add_node(GraphNode("bm_low_spo2", NodeType.BIOMARKER, "Low Oxygen Saturation",
                                {"unit": "%", "threshold": 94, "direction": "below", "vital_key": "spo2"}))
        self.add_node(GraphNode("bm_high_stress", NodeType.BIOMARKER, "Elevated Stress Index",
                                {"unit": "score", "threshold": 0.7, "direction": "above", "vital_key": "stress_level"}))
        self.add_node(GraphNode("bm_low_sleep", NodeType.BIOMARKER, "Sleep Deprivation",
                                {"unit": "hours", "threshold": 6, "direction": "below", "vital_key": "sleep_hours"}))
        self.add_node(GraphNode("bm_high_bmi", NodeType.BIOMARKER, "Elevated BMI",
                                {"unit": "kg/m²", "threshold": 25, "direction": "above", "vital_key": "bmi"}))
        self.add_node(GraphNode("bm_high_hrv", NodeType.BIOMARKER, "High Heart Rate Variability",
                                {"unit": "ms", "description": "Indicator of autonomic nervous system health"}))
        self.add_node(GraphNode("bm_glycemic_var", NodeType.BIOMARKER, "Glycemic Variability",
                                {"unit": "CV%", "description": "Coefficient of variation in blood glucose"}))

        # ====== DISEASES ======
        self.add_node(GraphNode("dis_t2_diabetes", NodeType.DISEASE, "Type 2 Diabetes",
                                {"icd10": "E11", "prevalence": "10.5%", "reversible": True}))
        self.add_node(GraphNode("dis_hypertension", NodeType.DISEASE, "Hypertension",
                                {"icd10": "I10", "prevalence": "47%", "reversible": True}))
        self.add_node(GraphNode("dis_cad", NodeType.DISEASE, "Coronary Artery Disease",
                                {"icd10": "I25", "prevalence": "6.7%", "reversible": False}))
        self.add_node(GraphNode("dis_heart_failure", NodeType.DISEASE, "Heart Failure",
                                {"icd10": "I50", "prevalence": "2.4%", "reversible": False}))
        self.add_node(GraphNode("dis_copd", NodeType.DISEASE, "COPD",
                                {"icd10": "J44", "prevalence": "6%", "reversible": False}))
        self.add_node(GraphNode("dis_metabolic_syndrome", NodeType.DISEASE, "Metabolic Syndrome",
                                {"description": "Cluster of conditions increasing heart disease risk"}))
        self.add_node(GraphNode("dis_burnout", NodeType.DISEASE, "Burnout Syndrome",
                                {"icd10": "Z73.0", "reversible": True}))
        self.add_node(GraphNode("dis_stroke", NodeType.DISEASE, "Stroke",
                                {"icd10": "I63", "prevalence": "2.5%", "reversible": False}))
        self.add_node(GraphNode("dis_ckd", NodeType.DISEASE, "Chronic Kidney Disease",
                                {"icd10": "N18", "prevalence": "15%"}))

        # ====== SYMPTOMS ======
        self.add_node(GraphNode("sym_fatigue", NodeType.SYMPTOM, "Chronic Fatigue",
                                {"severity_levels": ["mild", "moderate", "severe"]}))
        self.add_node(GraphNode("sym_dyspnea", NodeType.SYMPTOM, "Shortness of Breath",
                                {"severity_levels": ["exertional", "at rest"]}))
        self.add_node(GraphNode("sym_chest_pain", NodeType.SYMPTOM, "Chest Pain",
                                {"emergency": True}))
        self.add_node(GraphNode("sym_polyuria", NodeType.SYMPTOM, "Frequent Urination", {}))
        self.add_node(GraphNode("sym_blurred_vision", NodeType.SYMPTOM, "Blurred Vision", {}))
        self.add_node(GraphNode("sym_headache", NodeType.SYMPTOM, "Persistent Headache", {}))
        self.add_node(GraphNode("sym_insomnia", NodeType.SYMPTOM, "Insomnia", {}))
        self.add_node(GraphNode("sym_anxiety", NodeType.SYMPTOM, "Anxiety", {}))

        # ====== LIFESTYLE FACTORS ======
        self.add_node(GraphNode("lf_sedentary", NodeType.LIFESTYLE_FACTOR, "Sedentary Lifestyle",
                                {"risk_multiplier": 1.5}))
        self.add_node(GraphNode("lf_high_sodium", NodeType.LIFESTYLE_FACTOR, "High Sodium Diet",
                                {"risk_multiplier": 1.3}))
        self.add_node(GraphNode("lf_smoking", NodeType.LIFESTYLE_FACTOR, "Smoking",
                                {"risk_multiplier": 2.0}))
        self.add_node(GraphNode("lf_cortisol", NodeType.LIFESTYLE_FACTOR, "Elevated Cortisol",
                                {"description": "Stress hormone, elevated in chronic stress"}))

        # ====== MEDICATIONS (sample) ======
        self.add_node(GraphNode("med_metformin", NodeType.MEDICATION, "Metformin",
                                {"class": "Biguanide", "indication": "Type 2 Diabetes"}))
        self.add_node(GraphNode("med_prednisone", NodeType.MEDICATION, "Prednisone",
                                {"class": "Corticosteroid", "indication": "Anti-inflammatory"}))
        self.add_node(GraphNode("med_lisinopril", NodeType.MEDICATION, "Lisinopril",
                                {"class": "ACE Inhibitor", "indication": "Hypertension"}))
        self.add_node(GraphNode("med_atenolol", NodeType.MEDICATION, "Atenolol",
                                {"class": "Beta Blocker", "indication": "Hypertension, Tachycardia"}))

        # ====== CLINICAL GUIDELINES ======
        self.add_node(GraphNode("gl_ada_diabetes", NodeType.CLINICAL_GUIDELINE, "ADA Diabetes Standards 2024",
                                {"source": "American Diabetes Association",
                                 "fasting_glucose_prediabetic": 100, "fasting_glucose_diabetic": 126,
                                 "hba1c_prediabetic": 5.7, "hba1c_diabetic": 6.5}))
        self.add_node(GraphNode("gl_aha_bp", NodeType.CLINICAL_GUIDELINE, "AHA Blood Pressure Guidelines",
                                {"source": "American Heart Association",
                                 "normal_systolic": 120, "elevated_systolic": 130,
                                 "stage1_systolic": 140, "stage2_systolic": 180}))
        self.add_node(GraphNode("gl_who_bmi", NodeType.CLINICAL_GUIDELINE, "WHO BMI Classification",
                                {"source": "World Health Organization",
                                 "normal": 24.9, "overweight": 29.9, "obese": 30}))
        self.add_node(GraphNode("gl_sleep_nsf", NodeType.CLINICAL_GUIDELINE, "NSF Sleep Duration Guidelines",
                                {"source": "National Sleep Foundation",
                                 "adult_min": 7, "adult_max": 9}))

        # ====== RELATIONSHIPS ======

        # Biomarker → Disease (RISK_FACTOR_FOR)
        self.add_edge(GraphEdge("bm_high_glucose", "dis_t2_diabetes", EdgeType.RISK_FACTOR_FOR, {"strength": "strong"}, 0.9))
        self.add_edge(GraphEdge("bm_high_glucose", "dis_metabolic_syndrome", EdgeType.RISK_FACTOR_FOR, {"strength": "moderate"}, 0.7))
        self.add_edge(GraphEdge("bm_high_bp", "dis_hypertension", EdgeType.RISK_FACTOR_FOR, {"strength": "diagnostic"}, 1.0))
        self.add_edge(GraphEdge("bm_high_bp", "dis_stroke", EdgeType.RISK_FACTOR_FOR, {"strength": "strong"}, 0.8))
        self.add_edge(GraphEdge("bm_high_bp", "dis_cad", EdgeType.RISK_FACTOR_FOR, {"strength": "moderate"}, 0.6))
        self.add_edge(GraphEdge("bm_high_bp", "dis_ckd", EdgeType.RISK_FACTOR_FOR, {"strength": "moderate"}, 0.5))
        self.add_edge(GraphEdge("bm_high_hr", "dis_cad", EdgeType.RISK_FACTOR_FOR, {"strength": "moderate"}, 0.6))
        self.add_edge(GraphEdge("bm_high_hr", "dis_heart_failure", EdgeType.RISK_FACTOR_FOR, {"strength": "moderate"}, 0.5))
        self.add_edge(GraphEdge("bm_low_spo2", "dis_copd", EdgeType.RISK_FACTOR_FOR, {"strength": "strong"}, 0.8))
        self.add_edge(GraphEdge("bm_low_spo2", "dis_heart_failure", EdgeType.RISK_FACTOR_FOR, {"strength": "moderate"}, 0.6))
        self.add_edge(GraphEdge("bm_high_bmi", "dis_t2_diabetes", EdgeType.RISK_FACTOR_FOR, {"strength": "strong"}, 0.7))
        self.add_edge(GraphEdge("bm_high_bmi", "dis_cad", EdgeType.RISK_FACTOR_FOR, {"strength": "moderate"}, 0.5))
        self.add_edge(GraphEdge("bm_high_bmi", "dis_metabolic_syndrome", EdgeType.RISK_FACTOR_FOR, {"strength": "strong"}, 0.8))
        self.add_edge(GraphEdge("bm_high_stress", "dis_burnout", EdgeType.RISK_FACTOR_FOR, {"strength": "strong"}, 0.85))

        # Biomarker → Related (RELATED_TO)
        self.add_edge(GraphEdge("bm_low_sleep", "lf_cortisol", EdgeType.RELATED_TO, {"mechanism": "HPA axis activation"}, 0.7))
        self.add_edge(GraphEdge("bm_high_stress", "lf_cortisol", EdgeType.RELATED_TO, {"mechanism": "Chronic stress response"}, 0.8))
        self.add_edge(GraphEdge("bm_glycemic_var", "bm_high_glucose", EdgeType.RELATED_TO, {"mechanism": "Insulin resistance marker"}, 0.7))

        # Cortisol → Disease
        self.add_edge(GraphEdge("lf_cortisol", "dis_hypertension", EdgeType.RISK_FACTOR_FOR, {"mechanism": "Vasoconstriction"}, 0.6))
        self.add_edge(GraphEdge("lf_cortisol", "dis_t2_diabetes", EdgeType.RISK_FACTOR_FOR, {"mechanism": "Insulin resistance"}, 0.5))

        # Lifestyle → Disease
        self.add_edge(GraphEdge("lf_sedentary", "dis_t2_diabetes", EdgeType.RISK_FACTOR_FOR, {"strength": "moderate"}, 0.5))
        self.add_edge(GraphEdge("lf_sedentary", "dis_cad", EdgeType.RISK_FACTOR_FOR, {"strength": "moderate"}, 0.5))
        self.add_edge(GraphEdge("lf_high_sodium", "dis_hypertension", EdgeType.RISK_FACTOR_FOR, {"strength": "moderate"}, 0.6))
        self.add_edge(GraphEdge("lf_smoking", "dis_copd", EdgeType.RISK_FACTOR_FOR, {"strength": "very strong"}, 0.95))
        self.add_edge(GraphEdge("lf_smoking", "dis_cad", EdgeType.RISK_FACTOR_FOR, {"strength": "strong"}, 0.7))

        # Biomarker → Organ System (AFFECTS_SYSTEM)
        self.add_edge(GraphEdge("bm_high_hr", "sys_cardiac", EdgeType.AFFECTS_SYSTEM, {}, 0.9))
        self.add_edge(GraphEdge("bm_high_bp", "sys_cardiac", EdgeType.AFFECTS_SYSTEM, {}, 0.9))
        self.add_edge(GraphEdge("bm_low_spo2", "sys_respiratory", EdgeType.AFFECTS_SYSTEM, {}, 0.9))
        self.add_edge(GraphEdge("bm_high_glucose", "sys_endocrine", EdgeType.AFFECTS_SYSTEM, {}, 0.9))
        self.add_edge(GraphEdge("bm_high_stress", "sys_nervous", EdgeType.AFFECTS_SYSTEM, {}, 0.8))
        self.add_edge(GraphEdge("bm_low_sleep", "sys_nervous", EdgeType.AFFECTS_SYSTEM, {}, 0.7))

        # Disease → Symptom (SYMPTOM_OF)
        self.add_edge(GraphEdge("dis_t2_diabetes", "sym_fatigue", EdgeType.SYMPTOM_OF, {}, 0.7))
        self.add_edge(GraphEdge("dis_t2_diabetes", "sym_polyuria", EdgeType.SYMPTOM_OF, {}, 0.8))
        self.add_edge(GraphEdge("dis_t2_diabetes", "sym_blurred_vision", EdgeType.SYMPTOM_OF, {}, 0.5))
        self.add_edge(GraphEdge("dis_hypertension", "sym_headache", EdgeType.SYMPTOM_OF, {}, 0.4))
        self.add_edge(GraphEdge("dis_copd", "sym_dyspnea", EdgeType.SYMPTOM_OF, {}, 0.9))
        self.add_edge(GraphEdge("dis_heart_failure", "sym_dyspnea", EdgeType.SYMPTOM_OF, {}, 0.9))
        self.add_edge(GraphEdge("dis_heart_failure", "sym_fatigue", EdgeType.SYMPTOM_OF, {}, 0.8))
        self.add_edge(GraphEdge("dis_cad", "sym_chest_pain", EdgeType.SYMPTOM_OF, {}, 0.7))
        self.add_edge(GraphEdge("dis_burnout", "sym_fatigue", EdgeType.SYMPTOM_OF, {}, 0.9))
        self.add_edge(GraphEdge("dis_burnout", "sym_insomnia", EdgeType.SYMPTOM_OF, {}, 0.7))
        self.add_edge(GraphEdge("dis_burnout", "sym_anxiety", EdgeType.SYMPTOM_OF, {}, 0.6))

        # Medication → Disease (TREATS)
        self.add_edge(GraphEdge("med_metformin", "dis_t2_diabetes", EdgeType.TREATS, {}, 0.9))
        self.add_edge(GraphEdge("med_lisinopril", "dis_hypertension", EdgeType.TREATS, {}, 0.85))
        self.add_edge(GraphEdge("med_atenolol", "dis_hypertension", EdgeType.TREATS, {}, 0.8))

        # Medication Side Effects
        self.add_edge(GraphEdge("med_prednisone", "bm_high_glucose", EdgeType.CAUSES_SIDE_EFFECT,
                                {"severity": "moderate", "mechanism": "Glucocorticoid-induced insulin resistance"}, 0.7))
        self.add_edge(GraphEdge("med_prednisone", "bm_high_bp", EdgeType.CAUSES_SIDE_EFFECT,
                                {"severity": "mild", "mechanism": "Sodium retention"}, 0.4))

        # Clinical Guidelines → Diseases
        self.add_edge(GraphEdge("gl_ada_diabetes", "dis_t2_diabetes", EdgeType.GUIDELINE_FOR, {}, 1.0))
        self.add_edge(GraphEdge("gl_aha_bp", "dis_hypertension", EdgeType.GUIDELINE_FOR, {}, 1.0))
        self.add_edge(GraphEdge("gl_who_bmi", "dis_metabolic_syndrome", EdgeType.GUIDELINE_FOR, {}, 0.8))
        self.add_edge(GraphEdge("gl_sleep_nsf", "dis_burnout", EdgeType.GUIDELINE_FOR, {}, 0.7))

        # Cross-disease relationships
        self.add_edge(GraphEdge("dis_t2_diabetes", "dis_cad", EdgeType.RISK_FACTOR_FOR,
                                {"mechanism": "Accelerated atherosclerosis"}, 0.6))
        self.add_edge(GraphEdge("dis_hypertension", "dis_stroke", EdgeType.RISK_FACTOR_FOR,
                                {"mechanism": "Vascular damage"}, 0.7))
        self.add_edge(GraphEdge("dis_hypertension", "dis_ckd", EdgeType.RISK_FACTOR_FOR,
                                {"mechanism": "Glomerular damage"}, 0.5))

        logger.info("Medical knowledge ontology seeded successfully")
