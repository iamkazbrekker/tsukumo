import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Paths for synthetic data streaming
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'synthetic_iot_data');
const STREAMING_FILE = path.join(PUBLIC_DATA_DIR, 'streaming_1year.csv');
const POINTER_FILE = path.join(process.cwd(), 'drive_incoming', 'stream_index.json');
const DRIVE_FOLDER_PATH = path.join(process.cwd(), 'drive_incoming');

async function getNextStreamRow() {
  try {
    if (!existsSync(STREAMING_FILE)) return null;

    // 1. Get current index
    let index = 0;
    try {
      if (existsSync(POINTER_FILE)) {
        const pointerData = await fs.readFile(POINTER_FILE, 'utf-8');
        index = JSON.parse(pointerData).index;
      }
    } catch (e) { index = 0; }

    // 2. Read the specific row from CSV (streaming for performance)
    // For simplicity in this demo, we read the file and slice, 
    // but for 150MB we should ideally use a stream. 
    // However, the 1-year file is ~25MB (1/6th of 150MB).
    const content = await fs.readFile(STREAMING_FILE, 'utf-8');
    const lines = content.split('\n');
    const header = lines[0].split(',');

    // Cycle back to 0 if we hit the end
    const nextIndex = (index + 1) % (lines.length - 1);
    if (nextIndex === 0) index = 1; else index = nextIndex;

    const row = lines[index].split(',');
    const data: any = {};
    header.forEach((h, i) => {
      data[h.trim()] = isNaN(Number(row[i])) ? row[i] : Number(row[i]);
    });

    // Save next index
    await fs.writeFile(POINTER_FILE, JSON.stringify({ index: index + 1 }));

    return data;
  } catch (e) {
    console.error("Stream reader error:", e);
    return null;
  }
}

export async function GET() {
  try {
    if (!existsSync(DRIVE_FOLDER_PATH)) {
      await fs.mkdir(DRIVE_FOLDER_PATH, { recursive: true });
    }

    // 1. Try to read active JSON files first
    let manualData: any = null;
    try {
      const files = await fs.readdir(DRIVE_FOLDER_PATH);
      const jsonFile = files.find(f => f.endsWith('.json') && f !== 'stream_index.json');
      if (jsonFile) {
        const fileContent = await fs.readFile(path.join(DRIVE_FOLDER_PATH, jsonFile), 'utf-8');
        manualData = JSON.parse(fileContent);
      }
    } catch(e) {}

    // 2. Try to get the latest row from our synthetic stream
    const steamData = manualData || await getNextStreamRow();

    // 3. Translate IoT Vitals to ML Features
    // We mix real IoT stream with reasonable baseline metadata
    const parsedData: any = {
      age: steamData?.age || 42,
      sysBP: steamData?.blood_pressure_systolic || 128 + (Math.random() * 10 - 5), // fluctuating baseline
      diaBP: steamData?.blood_pressure_diastolic || 82,
      heartRate: steamData?.heart_rate || 72,
      totChol: 210,
      HDLChol: 48,
      glucose: steamData?.glucose_level || 98,
      bmi: steamData?.bmi || 26.4,
      currentSmoker: 0,
      resp_rate: steamData?.resp_rate || 14,
      spo2: steamData?.spo2 || 98,
      activity: steamData?.activity_level || 0.1,
      sleep_hours: steamData?.sleep_hours || 7,
      stress_level: steamData?.stress_level || 0.1,
      // Map specialized model fields
      notes: `IoT Sync: HR=${steamData?.heart_rate}, RR=${steamData?.resp_rate}, Activity=${steamData?.activity_level}`,
      diagnosis: steamData?.heart_rate > 100 ? "Tachycardia observed in stream" : "Normal Sinus Rhythm"
    };

    // 4. Send this data to the Python Microservice for prediction
    let agentResults: any = { error: "FastAPI Agent service not reachable." };

    try {
      const mlResponse = await fetch('http://127.0.0.1:8000/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heart_rate: parsedData.heartRate,
          blood_pressure_systolic: parsedData.sysBP,
          blood_pressure_diastolic: parsedData.diaBP,
          spo2: parsedData.spo2,
          age: parsedData.age,
          gender: parsedData.gender || 1,
          sleep_hours: parsedData.sleep_hours,
          stress_level: parsedData.stress_level,
          glucose_level: parsedData.glucose,
          bmi: parsedData.bmi,
        }),
      });

      if (mlResponse.ok) {
        agentResults = await mlResponse.json();
      } else {
         throw new Error("Python fallback");
      }
    } catch (e) {
      console.warn("Python service offline, failing back to heuristic logic...");
      
      // Fallback heuristic: Check for critical SPO2 even if ML service is down
      let prepped_booking = null;
      let internal_monologue = ["ML Service Offline. Using fail-safe heuristic checks."];
      const pData = parsedData as any;

      if (pData.spo2 && pData.spo2 < 90) {
        internal_monologue.push(`CRITICAL: SpO2 level detected at ${pData.spo2}%.`);
        prepped_booking = {
          specialty: "Lung",
          urgency: "High",
          reason: `Hypoxia detected (SpO2: ${pData.spo2}%). Immediate attention recommended.`,
          recommended_window: "ASAP (Within 2 hours)"
        };
      } else {
        // Random cardiac check for demonstration if no other criticals
        const mockCardiac = Math.random() > 0.95; 
        if (mockCardiac) {
          prepped_booking = {
            specialty: "Heart",
            urgency: "High",
            reason: "Simulated cardiac variance detected in fall-back mode.",
            recommended_window: "Today"
          };
          internal_monologue.push("Heuristic check: Potential cardiac variance detected.");
        } else {
          internal_monologue.push("All vitals within safe heuristic ranges.");
        }
      }

      agentResults = {
        status: "success",
        prepped_booking,
        internal_monologue,
        predictions: {
          cardiac_arrest_risk: parsedData.heartRate > 120 ? 1 : 0,
          diabetes_risk: 0,
          burnout_risk: parsedData.activity > 0.8 ? 1 : 0,
          respiratory_risk: parsedData.resp_rate > 25 ? 1 : 0
        }
      };
    }

    const mockFileTimestampStream = `data_stream_seq_${parsedData.heartRate}.json`;

    return NextResponse.json({
      source_file: mockFileTimestampStream,
      patient_data: parsedData,
      predictions: agentResults.predictions || agentResults,
      prepped_booking: agentResults.prepped_booking,
      internal_monologue: agentResults.internal_monologue,
      composite_risk: agentResults.composite_risk || 0,
      stress_level: agentResults.stress_level || 0.1,
      // New CHT data fields
      phm: agentResults.phm || null,
      cht: agentResults.cht || null,
    });

  } catch (error: any) {
    console.error("Drive Monitor Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
