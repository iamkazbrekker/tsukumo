import { WASocket, proto } from '@whiskeysockets/baileys';
import { generateNutritionSuggestion } from '../ai/geminiClient';
import { detectSpikes } from '../monitors/spikeDetector';
import { fetchLatestVitals } from '../integrations/tsukumoClient';
import { sendText, sendRichAlert } from '../utils/messaging';

export async function handleMessage(sock: WASocket, msg: proto.IWebMessageInfo) {
  const from = msg.key?.remoteJid;
  if (!from) return;

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    '';

  const lowerText = text.toLowerCase();

  // ── Commands ───────────────────────────────────────────────────────────────
  if (lowerText.includes('!status') || lowerText.includes('status')) {
    await handleStatusCommand(sock, from);
  } else if (lowerText.includes('!suggest') || lowerText.includes('suggest me')) {
    await handleSuggestionCommand(sock, from, text);
  } else if (lowerText.includes('!help') || lowerText === 'hi' || lowerText === 'hello') {
    await handleHelp(sock, from);
  } else if (lowerText.includes('!kidneys') || lowerText.includes('kidney stone')) {
    await handleOrganSpecific(sock, from, 'kidneys', text);
  } else if (lowerText.includes('!heart') || lowerText.includes('cardiac')) {
    await handleOrganSpecific(sock, from, 'heart', text);
  } else if (lowerText.includes('!lungs') || lowerText.includes('breathing')) {
    await handleOrganSpecific(sock, from, 'lungs', text);
  } else {
    // General conversational query — pass directly to AI
    await handleFreeformQuery(sock, from, text);
  }
}

async function handleStatusCommand(sock: WASocket, from: string) {
  try {
    const vitals = await fetchLatestVitals();
    const spikes = detectSpikes(vitals);

    if (spikes.length === 0) {
      await sendText(sock, from,
        `✅ *Health Status: ALL CLEAR*\n\n` +
        `❤️ HR: ${vitals.heartRate} BPM\n` +
        `🫁 SpO2: ${vitals.spo2}%\n` +
        `🌬️ Breath: ${vitals.respRate}/min\n` +
        `🩸 Glucose: ${vitals.glucose} mg/dL\n\n` +
        `_All vitals within normal range._`
      );
    } else {
      for (const spike of spikes) {
        await sendRichAlert(sock, from, `${spike.organ} Alert`, spike.message + '\n\n' + spike.recommendation, spike.level);
      }
    }
  } catch (e) {
    await sendText(sock, from, '⚠️ Could not retrieve vitals from Tsukumo. Ensure the dashboard is running.');
  }
}

async function handleSuggestionCommand(sock: WASocket, from: string, query: string) {
  await sendText(sock, from, '🤔 Analyzing your health stream and generating personalized nutrition plan...');
  
  const vitals = await fetchLatestVitals();
  const spikes = detectSpikes(vitals);
  const context = spikes.length > 0
    ? `ACTIVE ALERTS: ${spikes.map((s: any) => s.message).join(' | ')}`
    : 'All vitals appear within normal ranges.';

  const response = await generateNutritionSuggestion(vitals, context, query);
  await sendText(sock, from, response);
}

async function handleOrganSpecific(sock: WASocket, from: string, organ: string, query: string) {
  await sendText(sock, from, `📊 Loading ${organ} health data...`);
  const vitals = await fetchLatestVitals();
  const context = `User is asking specifically about ${organ} health.`;
  const response = await generateNutritionSuggestion(vitals, context, `Give me nutrition tips specifically for my ${organ} health: ${query}`);
  await sendText(sock, from, response);
}

async function handleFreeformQuery(sock: WASocket, from: string, query: string) {
  const vitals = await fetchLatestVitals();
  const response = await generateNutritionSuggestion(vitals, 'User has a general query.', query);
  await sendText(sock, from, response);
}

async function handleHelp(sock: WASocket, from: string) {
  await sendText(sock, from,
    `🌿 *Tsukumo NutriBot Commands*\n\n` +
    `*!status* — View real-time vitals summary\n` +
    `*!suggest* — Get AI nutrition plan based on your current health\n` +
    `*!heart* — Cardiac-specific nutritional tips\n` +
    `*!lungs* — Respiratory-specific nutrition support\n` +
    `*!kidneys* — Renal health food recommendations\n\n` +
    `Or just _chat naturally_ — I understand plain English! 🌱\n\n` +
    `_Powered by Tsukumo Health AI · Your digital health twin_`
  );
}
