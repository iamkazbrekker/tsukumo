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
startWebhookServer((data) => {
    // Optional: add logic here if webhook receives data out of band, 
    // though the Cron monitor reads via GET. If you want direct webhook pushes, 
    // you could invoke spike detection here and push to WA.
});
