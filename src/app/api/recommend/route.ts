import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

// ── Risk → Rule Matrix ─────────────────────────────────────────────────────────
const RISK_PROTOCOLS: Record<string, {
  diet: { item: string; reason: string; priority: 'high' | 'medium' | 'low' }[];
  exercise: { item: string; reason: string; intensity: 'low' | 'moderate' | 'high' }[];
  avoid: string[];
}> = {
  cardiac: {
    diet: [
      { item: 'Oats with ground flaxseed', reason: 'Lowers LDL and improves arterial flexibility', priority: 'high' },
      { item: 'Fatty fish (salmon/mackerel) 2×/week', reason: 'Omega-3s reduce inflammation & triglycerides', priority: 'high' },
      { item: 'Leafy greens (spinach, kale)', reason: 'Rich in nitrates — improve blood flow', priority: 'high' },
      { item: 'Berries (blueberries, strawberries)', reason: 'Anthocyanins reduce arterial stiffness', priority: 'medium' },
      { item: 'Walnuts (small handful/day)', reason: 'Alpha-linolenic acid supports heart rhythm', priority: 'medium' },
    ],
    exercise: [
      { item: 'Brisk walking 30 min/day at 60% max HR', reason: 'Strengthens myocardium safely without overload', intensity: 'low' },
      { item: 'Swimming or aqua aerobics 3×/week', reason: 'Full-body cardio at controlled intensity', intensity: 'low' },
      { item: 'Gentle yoga (Hatha/Restorative)', reason: 'Activates parasympathetic tone, lowers BP', intensity: 'low' },
    ],
    avoid: ['Saturated fats (red meat, butter)', 'Trans fats (packaged snacks)', 'High-sodium processed foods (>2g/day)', 'Excessive caffeine (>2 cups/day)', 'HIIT or maximal-effort sprints'],
  },
  diabetes: {
    diet: [
      { item: 'Quinoa or barley instead of white rice', reason: 'Low glycemic index — stabilizes blood glucose', priority: 'high' },
      { item: 'Legumes (lentils, chickpeas) daily', reason: 'Slow-digesting protein + fiber reduces glucose spikes', priority: 'high' },
      { item: 'Non-starchy vegetables (broccoli, cauliflower)', reason: 'High fiber, near-zero glycemic impact', priority: 'high' },
      { item: 'Apple cider vinegar (1 tbsp before meals)', reason: 'Clinically shown to blunt post-meal glucose rise', priority: 'medium' },
      { item: 'Greek yogurt (plain, unsweetened)', reason: 'Protein + probiotics improve insulin sensitivity', priority: 'medium' },
    ],
    exercise: [
      { item: 'Resistance training 3×/week (bodyweight or bands)', reason: 'Muscle uptake of glucose; improves insulin sensitivity', intensity: 'moderate' },
      { item: '15-min walk after each meal', reason: 'Post-prandial glucose disposal — most effective window', intensity: 'low' },
      { item: 'Cycling (stationary or outdoors) 20 min', reason: 'Sustained aerobic glucose burn without joint stress', intensity: 'moderate' },
    ],
    avoid: ['White bread, white rice, refined flour', 'Sugary drinks (juice, soda)', 'High-GI fruits (mango, watermelon in excess)', 'Skipping meals (causes glucose swings)', 'Long sedentary periods (>90 min without moving)'],
  },
  burnout: {
    diet: [
      { item: 'Magnesium-rich foods (dark chocolate 70%+, pumpkin seeds)', reason: 'Regulates cortisol and improves sleep quality', priority: 'high' },
      { item: 'B-vitamin complex foods (eggs, nutritional yeast)', reason: 'B6, B12 critical for neurotransmitter synthesis', priority: 'high' },
      { item: 'Ashwagandha tea or supplement', reason: 'Adaptogen — clinically reduces cortisol levels', priority: 'medium' },
      { item: 'Colorful anti-inflammatory foods (turmeric, ginger)', reason: 'Reduce neuroinflammation linked to burnout', priority: 'medium' },
    ],
    exercise: [
      { item: 'Yoga nidra or guided body scan (20 min daily)', reason: 'Deep parasympathetic reset for adrenal recovery', intensity: 'low' },
      { item: 'Nature walk (no devices) 30 min', reason: 'Exposure to green spaces reduces cortisol by 16%', intensity: 'low' },
      { item: 'Pranayama breathing (4-7-8 technique)', reason: 'HRV improvement; direct vagal nerve stimulation', intensity: 'low' },
    ],
    avoid: ['Caffeine after 2PM (disrupts cortisol rhythm)', 'Alcohol (even moderate — disrupts REM sleep)', 'High-intensity workouts while fatigued', 'Skipping sleep to "catch up on work"'],
  },
  respiratory: {
    diet: [
      { item: 'Vitamin C-rich foods (bell peppers, citrus)', reason: 'Antioxidant airway protection; reduces inflammation', priority: 'high' },
      { item: 'Vitamin D rich foods or 15-min sun exposure', reason: 'Low Vit D strongly linked to respiratory infections', priority: 'high' },
      { item: 'Bromelain (fresh pineapple)', reason: 'Mucolytic enzyme — breaks down excess mucus', priority: 'medium' },
      { item: 'Honey + warm water with ginger', reason: 'Soothes inflamed bronchial passages', priority: 'medium' },
    ],
    exercise: [
      { item: 'Pursed-lip breathing 3×/day (10 reps)', reason: 'Trains slow, controlled exhalation; improves lung efficiency', intensity: 'low' },
      { item: 'Diaphragmatic breathing practice 15 min', reason: 'Strengthens primary breathing muscle', intensity: 'low' },
      { item: 'Gentle swimming (if SpO2 > 94%)', reason: 'Humid air + controlled breathing improves capacity', intensity: 'low' },
    ],
    avoid: ['Air pollution / incense / smoke', 'Cold, dry air without a mask', 'High-altitude activities', 'Dairy (may thicken mucus in sensitive individuals)', 'Strenuous exercise if SpO2 < 92%'],
  },
  kidney: {
    diet: [
      { item: 'High water intake (2.5-3L/day)', reason: 'Most evidence-based intervention to prevent stone formation', priority: 'high' },
      { item: 'Citrus juice (lemon water daily)', reason: 'Citrate inhibits calcium oxalate crystallization', priority: 'high' },
      { item: 'Low-oxalate vegetables (cauliflower, cabbage)', reason: 'Reduce substrate for calcium oxalate stones', priority: 'medium' },
    ],
    exercise: [
      { item: 'Daily walking 30-45 min', reason: 'Promotes calcium absorption into bones over kidneys', intensity: 'low' },
      { item: 'Light stretching and yoga', reason: 'Supports lymphatic flow and renal perfusion', intensity: 'low' },
    ],
    avoid: ['High-oxalate foods (spinach, nuts, chocolate in excess)', 'Excess animal protein (raises urinary calcium)', 'High-sodium diet (promotes calcium excretion)', 'Dehydration'],
  },
  healthy: {
    diet: [
      { item: 'Mediterranean diet pattern', reason: 'Evidence-based for longevity and cardiovascular protection', priority: 'medium' },
      { item: 'Seasonal fruits and vegetables (5+ portions/day)', reason: 'Diverse phytonutrients support immune and organ health', priority: 'medium' },
      { item: 'Whole grains over refined grains', reason: 'Sustained energy, gut microbiome support', priority: 'low' },
    ],
    exercise: [
      { item: 'Mixed cardio + strength (150 min cardio/week)', reason: 'WHO-recommended for long-term metabolic health', intensity: 'moderate' },
      { item: 'Flexibility work 2×/week', reason: 'Prevents injury, improves joint mobility', intensity: 'low' },
      { item: 'Active recovery (walking, light cycling)', reason: 'Promotes consistent movement habit', intensity: 'low' },
    ],
    avoid: ['Highly processed foods', 'Combined with prolonged sedentary periods', 'Excess added sugar (>25g/day)'],
  },
};

// ── Step 1: Risk Triage Agent ──────────────────────────────────────────────────
function triageRisks(predictions: any, vitals: any): string[] {
  const activeRisks: string[] = [];
  if (predictions?.cardiac_arrest_risk === 1 || (vitals?.heartRate > 110) || (vitals?.sysBP > 145)) activeRisks.push('cardiac');
  if (predictions?.diabetes_risk === 1 || (vitals?.glucose > 140)) activeRisks.push('diabetes');
  if (predictions?.burnout_risk === 1 || (vitals?.stress_level > 0.6)) activeRisks.push('burnout');
  if (predictions?.respiratory_risk === 1 || (vitals?.spo2 < 94)) activeRisks.push('respiratory');
  if (predictions?.kidney_stones_risk === 1) activeRisks.push('kidney');
  return activeRisks.length > 0 ? activeRisks : ['healthy'];
}

// ── Step 2: Protocol Merge Agent ───────────────────────────────────────────────
function mergeProtocols(risks: string[]) {
  const diet: any[] = [];
  const exercise: any[] = [];
  const avoidSet = new Set<string>();

  for (const risk of risks) {
    const proto = RISK_PROTOCOLS[risk];
    if (!proto) continue;
    proto.diet.forEach(d => { if (!diet.find(x => x.item === d.item)) diet.push({ ...d, risk }); });
    proto.exercise.forEach(e => { if (!exercise.find(x => x.item === e.item)) exercise.push({ ...e, risk }); });
    proto.avoid.forEach(a => avoidSet.add(a));
  }

  // Sort: high priority first
  diet.sort((a, b) => (a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0));
  return { diet: diet.slice(0, 6), exercise: exercise.slice(0, 5), avoid: Array.from(avoidSet).slice(0, 5) };
}

// ── Step 3: Gemini Narrative Agent ─────────────────────────────────────────────
async function generateNarrative(risks: string[], vitals: any, protocol: any): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return buildFallbackNarrative(risks, vitals);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are Tsukumo Wellness Agent — an agentic AI health advisor embedded in a real-time health monitoring dashboard. 
    
A patient's IoT monitoring stream has just returned these risk flags: ${risks.join(', ').toUpperCase()}.

Key vitals detected:
- Heart Rate: ${vitals?.heartRate || 'N/A'} BPM
- Blood Pressure: ${vitals?.sysBP || 'N/A'}/${vitals?.diaBP || 'N/A'} mmHg
- SpO2: ${vitals?.spo2 || 'N/A'}%
- Glucose: ${vitals?.glucose || 'N/A'} mg/dL
- BMI: ${vitals?.bmi || 'N/A'}
- Stress Level: ${((vitals?.stress_level || 0) * 100).toFixed(0)}%

You have generated the following protocol:
Diet items: ${protocol.diet.map((d: any) => d.item).join(', ')}
Exercise items: ${protocol.exercise.map((e: any) => e.item).join(', ')}

Write a concise clinical-yet-empathetic 2-3 sentence agent reasoning summary explaining WHY these recommendations were chosen for this specific patient profile. Be specific about the vitals. Start with "Wellness Agent:" and use calm, precise language. No bullet points — flowing prose only. Max 60 words.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.warn('Gemini call failed, using fallback narrative:', e);
    return buildFallbackNarrative(risks, vitals);
  }
}

function buildFallbackNarrative(risks: string[], vitals: any): string {
  if (risks.includes('healthy')) {
    return `Wellness Agent: Your vitals are within healthy range. Recommending a balanced Mediterranean diet and mixed cardio-strength training to maintain your current optimal physiological state.`;
  }
  const riskText = risks.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(' + ');
  return `Wellness Agent: Active risk flags detected — ${riskText}. Protocol tailored to address these specific risk patterns through targeted dietary modifications and safe intensity exercise. Monitor vitals closely over the next 24 hours.`;
}

// ── POST /api/recommend ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { predictions, vitals } = body;

    if (!predictions && !vitals) {
      return NextResponse.json({ error: 'predictions and vitals are required' }, { status: 400 });
    }

    // Agent Step 1: Triage which risks are active
    const activeRisks = triageRisks(predictions, vitals);

    // Agent Step 2: Merge protocols for all active risks
    const protocol = mergeProtocols(activeRisks);

    // Agent Step 3: Generate narrative via Gemini
    const reasoning = await generateNarrative(activeRisks, vitals, protocol);

    return NextResponse.json({
      diet: protocol.diet,
      exercise: protocol.exercise,
      avoid: protocol.avoid,
      reasoning,
      risk_context: activeRisks,
      generated_at: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Recommend API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
