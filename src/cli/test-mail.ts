import nodemailer from 'nodemailer';

async function main() {
  // Ohne Leerzeichen probieren
  const passwords = [
    'qzeapboxooyuafbc',
    'qzea pbox ooyu afbc',
  ];

  for (const pass of passwords) {
    console.log(`Teste Passwort: ${pass.slice(0,4)}...`);
    const t = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: 'leviresaslg@gmail.com', pass },
    });

    try {
      await t.verify();
      console.log('  ✅ LOGIN OK!');
      return;
    } catch (e: any) {
      console.log('  ❌ ' + e.message.slice(0, 80));
    }
  }
}

main().catch(console.error);
