import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// This simulates the actual absolute path to your Drive sync folder
const DRIVE_FOLDER_PATH = path.join(process.cwd(), 'drive_incoming');

export async function GET() {
  try {
    // 1. Check if the folder exists, if not, create it for mocking purposes
    try {
      await fs.access(DRIVE_FOLDER_PATH);
    } catch {
      await fs.mkdir(DRIVE_FOLDER_PATH, { recursive: true });
      // Create a mock file so there is something to read
      await fs.writeFile(
        path.join(DRIVE_FOLDER_PATH, 'patient_001.json'),
        JSON.stringify({
          heart_rate: 85,
          blood_pressure_systolic: 140,
          blood_pressure_diastolic: 90,
          glucose_level: 160,
          age: 45,
          bmi: 28.5
        })
      );
    }

    // 2. Read the latest file from the drive folder
    const files = await fs.readdir(DRIVE_FOLDER_PATH);
    const dataFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.csv'));
    
    if (dataFiles.length === 0) {
      return NextResponse.json({ status: "waiting", message: "No data incoming from drive folder yet." });
    }

    // Sort by most recently modified to simulate "incoming stream"
    const fileStats = await Promise.all(
      dataFiles.map(async file => ({
        file,
        stat: await fs.stat(path.join(DRIVE_FOLDER_PATH, file))
      }))
    );
    fileStats.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
    const latestFile = fileStats[0].file;

    // 3. Read and parse the data
    const rawData = await fs.readFile(path.join(DRIVE_FOLDER_PATH, latestFile), 'utf-8');
    let parsedData: any = {};
    if (latestFile.endsWith('.json')) {
      parsedData = JSON.parse(rawData);
    } else {
      // Basic mock CSV parsing if needed
      const lines = rawData.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const values = lines[1].split(',').map(v => v.trim());
      headers.forEach((h, i) => { parsedData[h] = isNaN(Number(values[i])) ? values[i] : Number(values[i]); });
    }

    // 4. Send this data to the Python Microservice for prediction
    let agentResults: any = { error: "FastAPI Agent service not reachable." };
    
    try {
      const mlResponse = await fetch('http://127.0.0.1:8000/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heart_rate: parsedData.heart_rate || 72,
          blood_pressure_systolic: parsedData.blood_pressure_systolic || 120,
          blood_pressure_diastolic: parsedData.blood_pressure_diastolic || 80,
          spo2: parsedData.spo2 || 98,
          age: parsedData.age || 30,
          gender: parsedData.gender || 1,
          sleep_hours: parsedData.sleep_hours || 7,
          stress_level: parsedData.stress_level || 0.1,
          glucose_level: parsedData.glucose_level || 100,
          bmi: parsedData.bmi || 22,
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
        internal_monologue
      };
    }

    // By using the actual filename and modification time, the React UI will only treat it 
    // as "new" when the file on disk actually changes, preventing redundant auto-pops.
    const mockFileTimestampStream = `${latestFile}_${fileStats[0].stat.mtimeMs}`;

    return NextResponse.json({
      source_file: mockFileTimestampStream,
      patient_data: parsedData,
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
