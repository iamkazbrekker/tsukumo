import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  proto,
  WASocket
} from '@whiskeysockets/baileys';
import * as Baileys from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { handleMessage } from './handlers/messageHandler';
import { initProactiveMonitor } from './monitors/spikeMonitor';
import { startWebhookServer } from './integrations/tsukumoClient';
import { sendRichAlert, sendText } from './utils/messaging';
import { generateNutritionSuggestion } from './ai/geminiClient';

const logger = pino({ level: 'silent' });
const makeInMemoryStore = (Baileys as any).makeInMemoryStore || require('@whiskeysockets/baileys').makeInMemoryStore || (() => ({ bind: () => {} }));
const store = makeInMemoryStore({ logger });

export let sock: WASocket;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_session');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['Tsukumo NutriBot', 'Chrome', '1.0.0'],
    syncFullHistory: false,
  });

  store.bind(sock.ev);

  // ── QR Code Auth ──────────────────────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Scan this QR Code with WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    }

    if (connection === 'open') {
      console.log('✅ NutriBot is ONLINE and monitoring health streams...');
      // Start the proactive health monitor after connection is established
      initProactiveMonitor(sock);
    }
  });

  // ── Save Auth Credentials ─────────────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ── Handle Incoming Messages ──────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      await handleMessage(sock, msg);
    }
  });
}

// Start bot
startBot();

// Start webhook server for push events
startWebhookServer(async (data) => {
    const PATIENT_JID = process.env.PATIENT_WHATSAPP_NUMBER || '';
    const ALERT_JID = process.env.ALERT_WHATSAPP_NUMBER || '';
    
    // Ensure sock is available (the global let sock)
    if (!sock || !PATIENT_JID) {
      console.warn('⚠️ Webhook received but bot is not connected or PATIENT_JID missing.');
      return;
    }

    const { level, organ, message, recommendation, vitals } = data;
    
    console.log(`🚀 Dispatching push alert for ${organ} via WhatsApp...`);
    
    // 1. Send immediate rich alert
    await sendRichAlert(sock, PATIENT_JID, `${organ} Push Alert`, message, level || 'warning');

    // 2. Alert Caregiver if critical
    if (level === 'critical' && ALERT_JID) {
      await sendRichAlert(sock, ALERT_JID, `🚨 REMOTE CRISIS: ${organ}`, `Patient is experiencing: ${message}\n\nSystem recommendation: ${recommendation}`, 'critical');
    }

    // 3. Follow up with AI
    setTimeout(async () => {
      const context = `CRITICAL PUSH EVENT: ${message}`;
      const suggestion = await generateNutritionSuggestion(vitals || {}, context, `Emergency nutrition for ${organ} alert?`);
      await sendText(sock, PATIENT_JID, `🥗 *Emergency Nutrition Guidance (Instant Dispatch):*\n\n${suggestion}`);
    }, 5000);
});
