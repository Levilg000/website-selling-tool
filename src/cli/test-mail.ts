import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function main() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.log('❌ GMAIL_USER oder GMAIL_APP_PASSWORD fehlt in .env');
    return;
  }

  console.log(`📧 Teste SMTP Login für ${user}...`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP Login erfolgreich!');
    console.log(`   Absender: ${user}`);
    console.log('   Bereit zum Senden.');
  } catch (e: any) {
    console.log(`❌ Login fehlgeschlagen: ${e.message}`);
    if (e.message.includes('Invalid login')) {
      console.log('   → App-Passwort falsch oder 2FA nicht aktiviert');
      console.log('   → Bei neuem Gmail: SMTP braucht ~3 Tage nach Erstellung');
    }
  }
}

main().catch(console.error);
