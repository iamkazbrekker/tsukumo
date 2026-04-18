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
    let parsedData = {};
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
    let predictionResults: any = { error: "Flask ML service not reachable." };
    
    try {
      const mlResponse = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData),
      });
      
      if (mlResponse.ok) {
        predictionResults = await mlResponse.json();
      } else {
         throw new Error("Python fallback");
      }
    } catch (e) {
      console.warn("Python service offline, failing back to mock predictions...");
      // Simulate live incoming data with randomized anomalies to drive the dashboard
      const mockCardiac = Math.random() > 0.75 ? 1 : 0; 
      const mockDiabetes = Math.random() > 0.80 ? 1 : 0;
      const mockBurnout = Math.random() > 0.70 ? 1 : 0;
      predictionResults = {
        predictions: {
           cardiac_arrest_risk: mockCardiac,
           diabetes_risk: mockDiabetes,
           burnout_risk: mockBurnout
        }
      };
    }

    // By adding a timestamp chunk to the source_file, the React UI will treat it as "new"
    // every polling cycle and will trigger the visual animations on the scroll!
    const mockFileTimestampStream = `data_stream_${Math.floor(Date.now() / 5000)}.json`;

    return NextResponse.json({
      source_file: mockFileTimestampStream,
      patient_data: parsedData,
      predictions: predictionResults.predictions || predictionResults
    });

  } catch (error: any) {
    console.error("Drive Monitor Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
