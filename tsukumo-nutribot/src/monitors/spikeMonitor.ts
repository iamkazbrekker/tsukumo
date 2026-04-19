import cron from 'node-cron';
import { WASocket } from '@whiskeysockets/baileys';
import { fetchLatestVitals } from '../integrations/tsukumoClient';
import { detectSpikes, SpikeEvent } from './spikeDetector';
import { generateNutritionSuggestion } from '../ai/geminiClient';
import { sendRichAlert, sendText } from '../utils/messaging';

const PATIENT_JID = process.env.PATIENT_WHATSAPP_NUMBER || '';
const ALERT_JID = process.env.ALERT_WHATSAPP_NUMBER || '';

// Track last alert times to avoid spamming
const lastAlertTime: Map<string, number> = new Map();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes per organ

export function initProactiveMonitor(sock: WASocket) {
  console.log('📡 Proactive health monitor started (checking every 60s)...');

  // Check every 60 seconds
  cron.schedule('* * * * *', async () => {
    await runHealthCheck(sock);
  });

  // Full daily nutritional briefing at 8 AM
  cron.schedule('0 8 * * *', async () => {
    await sendDailyBriefing(sock);
  });

  // Evening check-in at 6 PM
  cron.schedule('0 18 * * *', async () => {
    await sendEveningCheckin(sock);
  });
}

async function runHealthCheck(sock: WASocket) {
  if (!PATIENT_JID) return; // Need configured JIDs
  try {
    const vitals = await fetchLatestVitals();
    const spikes = detectSpikes(vitals);

    for (const spike of spikes) {
      const cooldownKey = `${spike.organ}-${spike.level}`;
      const lastTime = lastAlertTime.get(cooldownKey) || 0;

      // Respect cooldown — don't spam same alert
      if (Date.now() - lastTime < ALERT_COOLDOWN_MS) continue;
      lastAlertTime.set(cooldownKey, Date.now());

      // Send alert to patient
      await sendRichAlert(sock, PATIENT_JID, `${spike.organ} Alert`, spike.message, spike.level);

      if (spike.level === 'critical') {
        // Send critical alerts to caregiver/doctor too
        if (ALERT_JID) {
          await sendRichAlert(
            sock,
            ALERT_JID,
            `⚕️ PATIENT ALERT: ${spike.organ}`,
            `Patient is experiencing: ${spike.message}\n\nSystem recommendation: ${spike.recommendation}`,
            'critical'
          );
        }

        // Follow up with AI nutrition suggestion after 15 seconds
        setTimeout(async () => {
          const context = `CRITICAL event just occurred: ${spike.message}`;
          const suggestion = await generateNutritionSuggestion(vitals, context,
            `What should the patient eat/avoid RIGHT NOW given the critical ${spike.organ} alert?`
          );
          await sendText(sock, PATIENT_JID, `🥗 *Emergency Nutrition Guidance:*\n\n${suggestion}`);
        }, 15000);

      } else if (spike.level === 'warning') {
        // For warnings, just give a light suggestion
        const context = `Warning spike detected: ${spike.message}`;
        const suggestion = await generateNutritionSuggestion(vitals, context);
        await sendText(sock, PATIENT_JID, `🌿 *Tsukumo Nutrition Tip:*\n\n${suggestion}`);
      }
    }
  } catch (e) {
    console.error('Health check error:', e);
  }
}

async function sendDailyBriefing(sock: WASocket) {
  if (!PATIENT_JID) return;
  try {
    const vitals = await fetchLatestVitals();
    const context = 'Morning check-in. Provide a full-day nutritional plan.';
    const suggestion = await generateNutritionSuggestion(vitals, context,
      'Give me a comprehensive nutrition plan for the day based on my health metrics.'
    );

    await sendText(sock, PATIENT_JID,
      `🌅 *Good Morning! Your Daily Tsukumo Health Briefing*\n\n` +
      `❤️ HR: ${vitals.heartRate} BPM | 🫁 SpO2: ${vitals.spo2}% | 🩸 Glucose: ${vitals.glucose} mg/dL\n\n` +
      suggestion
    );
  } catch (e) {
    console.error('Daily briefing error:', e);
  }
}

async function sendEveningCheckin(sock: WASocket) {
  if (!PATIENT_JID) return;
  try {
    const vitals = await fetchLatestVitals();
    const suggestion = await generateNutritionSuggestion(
      vitals,
      'Evening check-in. Provide dinner and pre-sleep nutrition advice.',
      'What should I have for dinner and before sleep given my health data today?'
    );
    await sendText(sock, PATIENT_JID, `🌙 *Evening Nutrition Check-in*\n\n${suggestion}`);
  } catch (e) {
    console.error('Evening checkin error:', e);
  }
}
