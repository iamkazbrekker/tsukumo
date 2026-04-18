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
    // Make sure your Python Flask server is running on port 5000!
    let predictionResults = { status: "offline", error: "Flask ML service not reachable." };
    
    try {
      const mlResponse = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedData),
      });
      
      if (mlResponse.ok) {
        predictionResults = await mlResponse.json();
      } else {
         predictionResults.error = `ML service responded with status ${mlResponse.status}`;
      }
    } catch (e) {
      console.error("Failed to fetch from python ML microservice.", e);
    }

    return NextResponse.json({
      source_file: latestFile,
      patient_data: parsedData,
      predictions: predictionResults
    });

  } catch (error: any) {
    console.error("Drive Monitor Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
