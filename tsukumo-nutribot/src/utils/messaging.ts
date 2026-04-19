import { WASocket, proto } from '@whiskeysockets/baileys';

export async function sendText(sock: WASocket, jid: string, text: string) {
  await sock.sendMessage(jid, { text });
}

export async function sendRichAlert(
  sock: WASocket,
  jid: string,
  title: string,
  body: string,
  severity: 'critical' | 'warning' | 'info'
) {
  const icons = { critical: '🚨', warning: '⚠️', info: 'ℹ️' };
  const lines = [
    `${icons[severity]} *${title}*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    body,
    `━━━━━━━━━━━━━━━━━━━━`,
    `_Tsukumo AI Health System · ${new Date().toLocaleTimeString()}_`
  ];
  await sendText(sock, jid, lines.join('\n'));
}
