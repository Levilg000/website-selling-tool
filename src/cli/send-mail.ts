import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function main() {
  const [to, subject, htmlFile, ...attachmentPaths] = process.argv.slice(2);

  if (!to || !subject || !htmlFile) {
    console.log(`
📧 Email Sender

Usage: npx tsx src/cli/send-mail.ts <to> <subject> <html-file> [attachments...]

Beispiele:
  npx tsx src/cli/send-mail.ts test@example.com "Projektvorstellung" pitch/index.html
  npx tsx src/cli/send-mail.ts test@example.com "Demo" pitch/index.html pitch/PROJEKT-KONTEXT.md
`);
    process.exit(0);
  }

  const filePath = resolve(__dirname, '../..', htmlFile);
  const content = readFileSync(filePath, 'utf-8');
  const isHtml = htmlFile.endsWith('.html') || htmlFile.endsWith('.htm');

  let html: string | undefined;
  let text: string | undefined;

  if (isHtml) {
    html = content.replace(/href="\.\.\/demos\//g, 'href="cid:demo-hinweis" data-original="../demos/');
  } else {
    text = content;
  }

  // Attachments vorbereiten
  const attachments = attachmentPaths.map(p => ({
    filename: p.split('/').pop() || p,
    path: resolve(__dirname, '../..', p),
  }));

  console.log(`📧 Sende Email...`);
  console.log(`   Von: levi.webdesign.lg@gmail.com`);
  console.log(`   An: ${to}`);
  console.log(`   Betreff: ${subject}`);
  console.log(`   Format: ${isHtml ? 'HTML' : 'Text'}`);
  console.log(`   Datei: ${htmlFile}`);
  if (attachments.length) console.log(`   Anhänge: ${attachments.map(a => a.filename).join(', ')}`);

  try {
    const info = await transporter.sendMail({
      from: '"Levi Webdesign" <levi.webdesign.lg@gmail.com>',
      to,
      subject,
      ...(html ? { html } : { text }),
      attachments,
    });

    console.log(`\n✅ Email gesendet! Message-ID: ${info.messageId}`);
  } catch (err: any) {
    console.error(`\n❌ Fehler: ${err.message}`);
    if (err.message.includes('Invalid login')) {
      console.error('   → App-Passwort falsch oder 2FA nicht aktiviert');
    }
  }
}

main().catch(console.error);
