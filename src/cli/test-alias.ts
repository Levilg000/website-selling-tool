import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const t = nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

try {
  const info = await t.sendMail({
    from: '"Levi Webdesign" <levi.webdesign.lg@gmail.com>',
    to: 'levi@resas.me',
    subject: 'Alias-Test — Absender check',
    text: 'Wenn du das liest, funktioniert der Alias.\nAbsender sollte levi.webdesign.lg@gmail.com sein.',
  });
  console.log('✅ Gesendet! Check levi@resas.me — Absender sollte levi.webdesign.lg sein');
  console.log('   Message-ID: ' + info.messageId);
} catch (e: any) {
  console.log('❌ Fehler: ' + e.message);
}
