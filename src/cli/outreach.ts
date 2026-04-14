import nodemailer from 'nodemailer';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const OUTREACH_DIR = resolve(__dirname, '../../outreach');

interface LeadInfo {
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  category?: string;
  website?: string;
  demoUrl?: string;
}

function generateEmailHtml(lead: LeadInfo): string {
  const hasOldSite = lead.website && !lead.website.includes('facebook.com');
  const greeting = lead.name.includes('Dr.') ? `Sehr geehrte/r ${lead.name}` : `Guten Tag`;

  const oldSiteText = hasOldSite
    ? `<p style="color:#64748b;font-size:14px;">Ich habe mir Ihre aktuelle Website angesehen und denke, dass es Potenzial für ein modernes Update gibt — besonders im Hinblick auf Smartphone-Darstellung und Sichtbarkeit bei Google.</p>`
    : `<p style="color:#64748b;font-size:14px;">Mir ist aufgefallen, dass Ihr Betrieb online noch nicht so gut sichtbar ist, wie er es verdient hätte. In Zeiten, in denen Kunden zuerst bei Google suchen, ist eine professionelle Website oft der erste Eindruck.</p>`;

  const demoText = lead.demoUrl
    ? `<p style="color:#334155;font-size:14px;"><strong>Ich habe mir erlaubt, einen unverbindlichen Entwurf für Sie zu erstellen:</strong></p>
       <p><a href="${lead.demoUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Demo-Website ansehen</a></p>
       <p style="color:#64748b;font-size:13px;">Der Entwurf ist komplett kostenlos und unverbindlich. Falls er Ihnen gefällt, können wir gerne darüber sprechen.</p>`
    : `<p style="color:#334155;font-size:14px;">Ich würde Ihnen gerne — komplett kostenlos und unverbindlich — einen Entwurf für eine moderne Website erstellen. So können Sie sich ein Bild machen, ohne sich zu irgendetwas zu verpflichten.</p>`;

  return `<div style="font-family:Arial,sans-serif;max-width:550px;margin:0 auto;color:#333;">
  <p style="color:#334155;font-size:15px;">${greeting},</p>

  <p style="color:#334155;font-size:14px;">mein Name ist Levi, ich bin Webdesigner aus der Region Lüneburg.</p>

  ${oldSiteText}

  ${demoText}

  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">

  <p style="color:#334155;font-size:14px;">Bei Interesse erreichen Sie mich jederzeit:</p>
  <p style="color:#334155;font-size:14px;">
    <strong>Levi</strong><br>
    Webdesign Lüneburg<br>
    E-Mail: levi.webdesign.lg@gmail.com
  </p>

  <p style="color:#94a3b8;font-size:12px;margin-top:20px;">Diese Nachricht ist kein automatischer Newsletter. Ich habe Ihren Betrieb persönlich recherchiert und den Entwurf individuell für Sie erstellt.</p>
</div>`;
}

function generateSubject(lead: LeadInfo): string {
  if (lead.demoUrl) {
    return `Website-Entwurf für ${lead.name} — kostenlos & unverbindlich`;
  }
  return `Moderne Website für ${lead.name}? Kostenloser Entwurf`;
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd) {
    console.log(`
📧 Outreach System

Befehle:
  draft <name> [email] [demoUrl]     Email-Draft erstellen
  send <name>                         Draft absenden
  list                                Alle Drafts anzeigen

Beispiele:
  npx tsx src/cli/outreach.ts draft "Elektro Hartmann" "info@hartmann.de" "https://levilg000.github.io/..."
  npx tsx src/cli/outreach.ts draft "Lukat Bedachung"
  npx tsx src/cli/outreach.ts send "elektro-hartmann"
  npx tsx src/cli/outreach.ts list
`);
    return;
  }

  if (!existsSync(OUTREACH_DIR)) mkdirSync(OUTREACH_DIR, { recursive: true });

  if (cmd === 'draft') {
    const [name, email, demoUrl] = args;
    if (!name) { console.log('Usage: outreach draft "Firmenname" [email] [demoUrl]'); return; }

    // Versuche Profil zu laden
    const slug = name.toLowerCase()
      .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const profilePath = resolve(__dirname, '../../profiles', `${slug}.json`);
    let lead: LeadInfo = { name };

    if (existsSync(profilePath)) {
      const profile = JSON.parse(readFileSync(profilePath, 'utf-8'));
      lead = {
        name: profile.name,
        phone: profile.phone,
        email: email || profile.email,
        city: profile.city,
        category: profile.category,
        website: profile.website,
        demoUrl,
      };
      console.log(`📋 Profil geladen: ${profile.name} (${profile.category})`);
    } else {
      lead.email = email;
      lead.demoUrl = demoUrl;
      console.log(`ℹ️  Kein Profil gefunden, nutze manuelle Daten`);
    }

    const html = generateEmailHtml(lead);
    const subject = generateSubject(lead);

    // Draft speichern
    const draft = {
      to: lead.email || 'KEINE_EMAIL',
      subject,
      html,
      lead,
      createdAt: new Date().toISOString(),
      sent: false,
    };

    const draftPath = resolve(OUTREACH_DIR, `${slug}.json`);
    writeFileSync(draftPath, JSON.stringify(draft, null, 2), 'utf-8');

    // HTML-Preview speichern
    const previewPath = resolve(OUTREACH_DIR, `${slug}-preview.html`);
    writeFileSync(previewPath, html, 'utf-8');

    console.log(`\n✅ Draft erstellt: outreach/${slug}.json`);
    console.log(`   Preview: outreach/${slug}-preview.html`);
    console.log(`   An: ${draft.to}`);
    console.log(`   Betreff: ${subject}`);

    if (draft.to === 'KEINE_EMAIL') {
      console.log(`\n⚠️  Keine Email-Adresse! Kontakt per Telefon: ${lead.phone || 'unbekannt'}`);
    }

  } else if (cmd === 'send') {
    const [slug] = args;
    if (!slug) { console.log('Usage: outreach send "firma-slug"'); return; }

    const draftPath = resolve(OUTREACH_DIR, `${slug}.json`);
    if (!existsSync(draftPath)) { console.log(`❌ Draft nicht gefunden: ${slug}`); return; }

    const draft = JSON.parse(readFileSync(draftPath, 'utf-8'));

    if (draft.to === 'KEINE_EMAIL') {
      console.log(`❌ Keine Email-Adresse für ${draft.lead.name}. Kontakt per Telefon: ${draft.lead.phone || '?'}`);
      return;
    }

    if (draft.sent) {
      console.log(`⚠️  Draft wurde bereits gesendet am ${draft.sentAt}`);
      console.log(`   Trotzdem nochmal senden? (Draft manuell bearbeiten: outreach/${slug}.json → "sent": false)`);
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });

    console.log(`📧 Sende an ${draft.to}...`);

    try {
      const info = await transporter.sendMail({
        from: `"Levi Webdesign" <${process.env.GMAIL_USER}>`,
        to: draft.to,
        subject: draft.subject,
        html: draft.html,
      });

      draft.sent = true;
      draft.sentAt = new Date().toISOString();
      draft.messageId = info.messageId;
      writeFileSync(draftPath, JSON.stringify(draft, null, 2), 'utf-8');

      console.log(`✅ Gesendet! Message-ID: ${info.messageId}`);
    } catch (err: any) {
      console.log(`❌ Fehler: ${err.message}`);
    }

  } else if (cmd === 'list') {
    const { readdirSync } = await import('fs');
    const files = readdirSync(OUTREACH_DIR).filter(f => f.endsWith('.json') && !f.includes('-preview'));

    if (files.length === 0) { console.log('Keine Drafts vorhanden.'); return; }

    console.log(`\n📧 Outreach Drafts:\n`);
    for (const f of files) {
      const draft = JSON.parse(readFileSync(resolve(OUTREACH_DIR, f), 'utf-8'));
      const status = draft.sent ? `✅ Gesendet ${draft.sentAt?.slice(0, 10)}` : '⏳ Draft';
      console.log(`  ${status} | ${draft.lead.name} | ${draft.to} | ${f}`);
    }
  }
}

main().catch(console.error);
