import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const variants = [
  { user: 'levi.webdesign.lg@gmail.com', pass: 'rvmmkihyovlblur' },
  { user: 'levi.webdesign.lg@gmail.com', pass: 'rvmm kihy ovlb lur' },
];

for (const { user, pass } of variants) {
  const t = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    auth: { user, pass },
  });
  try {
    await t.verify();
    console.log(`✅ ${user} — SMTP FUNKTIONIERT!`);
  } catch (e: any) {
    console.log(`❌ ${user} — ${e.message.slice(0, 60)}`);
  }
}
