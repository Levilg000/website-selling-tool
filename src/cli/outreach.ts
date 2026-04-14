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

  // Vergleichs-Box wenn beide Links vorhanden
  let compareBox = '';
  if (lead.demoUrl && hasOldSite) {
    compareBox = `
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="width:50%;padding:15px;background:#fef2f2;border-radius:8px 0 0 8px;text-align:center;vertical-align:top;">
          <p style="color:#dc2626;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Ihre aktuelle Website</p>
          <a href="${lead.website}" style="color:#dc2626;font-size:14px;font-weight:600;">${lead.website!.replace(/https?:\/\/(www\.)?/, '').replace(/\/$/, '')} &rarr;</a>
        </td>
        <td style="width:50%;padding:15px;background:#f0fdf4;border-radius:0 8px 8px 0;text-align:center;vertical-align:top;">
          <p style="color:#16a34a;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Mein Entwurf für Sie</p>
          <a href="${lead.demoUrl}" style="color:#16a34a;font-size:14px;font-weight:600;">Demo ansehen &rarr;</a>
        </td>
      </tr>
    </table>`;
  } else if (lead.demoUrl) {
    compareBox = `
    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="padding:15px;background:#f0fdf4;border-radius:8px;text-align:center;">
          <p style="color:#16a34a;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0;">Mein Entwurf für ${lead.name}</p>
          <a href="${lead.demoUrl}" style="color:#16a34a;font-size:14px;font-weight:600;">Demo ansehen &rarr;</a>
        </td>
      </tr>
    </table>`;
  }

  const intro = hasOldSite
    ? `ich hab mir Ihre Website mal angeschaut und fand, da geht noch was — vor allem auf dem Handy und bei Google. Deshalb hab ich einfach mal einen Entwurf gemacht, wie das modern aussehen könnte.`
    : `mir ist aufgefallen, dass man ${lead.name} online gar nicht so richtig findet. Das ist schade, weil ich glaube, dass viele Kunden heutzutage zuerst im Internet suchen. Deshalb hab ich einfach mal einen Entwurf gemacht.`;

  return `<div style="font-family:Arial,sans-serif;max-width:550px;margin:0 auto;color:#333;line-height:1.7;">

  <p style="color:#334155;font-size:15px;">Hallo,</p>

  <p style="color:#334155;font-size:14px;">mein Name ist Levi, ich bin Schüler aus der Nähe von Lüneburg. Für ein Schulprojekt beschäftige ich mich gerade mit Webdesign und baue Websites für lokale Unternehmen.</p>

  <p style="color:#334155;font-size:14px;">${intro}</p>

  <p style="color:#334155;font-size:14px;"><strong>Schauen Sie sich gerne den Vorher-Nachher-Vergleich an:</strong></p>

  ${compareBox}

  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:15px;margin:20px 0;">
    <p style="color:#92400e;font-size:14px;font-weight:600;margin:0 0 5px 0;">Komplett kostenlos & unverbindlich</p>
    <p style="color:#a16207;font-size:13px;margin:0;">Das ist ein Schulprojekt — ich möchte einfach Erfahrung sammeln und brauche Referenzen. Es entstehen für Sie keine Kosten und keine Verpflichtungen. Falls Ihnen der Entwurf gefällt, freue ich mich. Falls nicht, auch kein Problem!</p>
  </div>

  <p style="color:#334155;font-size:14px;">Falls Sie Fragen haben oder etwas geändert haben möchten, melden Sie sich einfach. Ich freue mich über jede Rückmeldung!</p>

  <p style="color:#334155;font-size:14px;">
    Viele Grüße<br>
    <strong>Levi</strong><br>
    <span style="color:#64748b;">Schüler & Webdesign-Projekt</span><br>
    <span style="color:#64748b;">levi.webdesign.lg@gmail.com</span>
  </p>

</div>`;
}

function generateSubject(lead: LeadInfo): string {
  if (lead.demoUrl) {
    return `Kostenloser Website-Entwurf für ${lead.name} (Schulprojekt)`;
  }
  return `Website für ${lead.name}? Kostenlos als Schulprojekt`;
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
