import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const text = (body.diagnosis || "") + " " + (body.notes || "");
    const lowText = text.toLowerCase();
    
    // Auto-populate hidden clinical vitals required by the Scikit-Learn models,
    // dynamically responding to NLP cues in the text inputs.
    const vitalDecorations = {
       age: body.age || 45,
       sysBP: body.sysBP || (lowText.includes('hypertension') || lowText.includes('crisis') ? 190 : 115),
       diaBP: body.diaBP || (lowText.includes('hypertension') ? 110 : 85),
       heartRate: body.heartRate || (lowText.includes('tachycardia') || lowText.includes('severe') || lowText.includes('collapse') ? 145 : 75),
       resp_rate: body.resp_rate || (lowText.includes('breathing') || lowText.includes('asthma') || lowText.includes('respiratory') ? 32 : 14),
       spo2: body.spo2 || (lowText.includes('shortness') || lowText.includes('breathing') ? 88 : 98),
       totChol: body.totChol || 220,
       HDLChol: body.HDLChol || 45,
       glucose: body.glucose || (lowText.includes('diabetes') ? 240 : 90),
       bmi: body.bmi || 28.5,
       currentSmoker: lowText.includes('smoker') ? 1 : 0,
       prevalentHyp: lowText.includes('hypertension') ? 1 : 0,
       diabetes: lowText.includes('diabetes') ? 1 : 0,
       // Kidney Models precise feature mapping
       gravity: (lowText.includes('calculus') || lowText.includes('stone')) ? 1.035 : 1.010,
       ph: body.ph || 5.5,
       osmo: body.osmo || 800,
       cond: body.cond || 20,
       urea: body.urea || 350,
       calc: body.calc || ((lowText.includes('calculus') || lowText.includes('stone')) ? 9.5 : 2.5)
    };

    const finalPayload = { ...vitalDecorations, ...body };

    const driveDir = path.join(process.cwd(), 'drive_incoming');
    if (!fs.existsSync(driveDir)) {
      fs.mkdirSync(driveDir, { recursive: true });
    }

    const filename = `hospital_record_${Date.now()}.json`;
    const filepath = path.join(driveDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(finalPayload, null, 2), 'utf-8');

    return NextResponse.json({ success: true, file: filename });
  } catch (error: any) {
    console.error('Ingest Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
