import nodemailer from 'nodemailer';

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
    console.log(`✅ ${user} (pass: ${pass.slice(0,4)}...) — FUNKTIONIERT!`);
  } catch (e: any) {
    console.log(`❌ ${user} (pass: ${pass.slice(0,4)}...) — ${e.message.slice(0, 80)}`);
  }
}
