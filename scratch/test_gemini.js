const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function testGemini() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    const result = await model.generateContent("Hello, can you see this?");
    console.log("Gemini Response:", result.response.text());
  } catch (e) {
    console.error("Gemini Error:", e.message);
  }
}

testGemini();
