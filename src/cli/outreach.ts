import nodemailer from 'nodemailer';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
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

function generateEmailText(lead: LeadInfo): string {
  const hasOldSite = lead.website && !lead.website.includes('facebook.com');

  const intro = hasOldSite
    ? `Ich hab mir Ihre Website angeschaut und einen modernen Entwurf gemacht:`
    : `Mir ist aufgefallen, dass ${lead.name} online schwer zu finden ist. Deshalb hab ich einen Entwurf gemacht:`;

  return `Hallo,

mein Name ist Levi, ich bin Schüler aus Lüneburg und mache ein Schulprojekt zum Thema Webdesign.

${intro}

${lead.demoUrl}

Der Entwurf ist komplett unverbindlich - ich benötige praktische Erfahrung für mein Schulprojekt.
Falls Ihnen die neue Webseite gefällt und Sie die Seite gerne haben möchten, melden Sie sich bitte bei mir!
Für Sie fallen keine Kosten dafür an.

Viele Grüße
Levi
levi.webdesign.lg@gmail.com`;
}

function generateSubject(lead: LeadInfo): string {
  return `Schulprojekt: Website-Entwurf für ${lead.name}`;
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

    // Profil suchen: erst exakter Slug, dann Fuzzy-Match über alle Profile
    const profilesDir = resolve(__dirname, '../../profiles');
    let profile: any = null;

    const exactPath = resolve(profilesDir, `${slug}.json`);
    if (existsSync(exactPath)) {
      profile = JSON.parse(readFileSync(exactPath, 'utf-8'));
    } else if (existsSync(profilesDir)) {
      // Fuzzy: Suche Profil das den Namen enthält
      const query = name.toLowerCase();
      const files = readdirSync(profilesDir).filter(f => f.endsWith('.json'));
      for (const f of files) {
        const p = JSON.parse(readFileSync(resolve(profilesDir, f), 'utf-8'));
        if (p.name?.toLowerCase().includes(query) || query.includes(p.name?.toLowerCase().split(' ')[0])) {
          profile = p;
          break;
        }
      }
    }

    let lead: LeadInfo = { name };

    if (profile) {
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
      // Fallback: Lead-DB durchsuchen
      const dbPath = resolve(__dirname, '../../data/leads.json');
      if (existsSync(dbPath)) {
        const db = JSON.parse(readFileSync(dbPath, 'utf-8'));
        const match = db.leads.find((l: any) => l.name.toLowerCase().includes(name.toLowerCase()));
        if (match) {
          lead = {
            name: match.name,
            phone: match.phone,
            email: email || match.email,
            city: match.city || '',
            category: match.category,
            website: match.website,
            demoUrl,
          };
          console.log(`📋 Lead-DB Match: ${match.name} (${match.category})`);
        } else {
          lead.email = email;
          lead.demoUrl = demoUrl;
          console.log(`ℹ️  Kein Profil/Lead gefunden, nutze manuelle Daten`);
        }
      } else {
        lead.email = email;
        lead.demoUrl = demoUrl;
        console.log(`ℹ️  Kein Profil gefunden, nutze manuelle Daten`);
      }
    }

    const text = generateEmailText(lead);
    const subject = generateSubject(lead);

    // Draft speichern
    const draft = {
      to: lead.email || 'KEINE_EMAIL',
      subject,
      text,
      lead,
      createdAt: new Date().toISOString(),
      sent: false,
    };

    const draftPath = resolve(OUTREACH_DIR, `${slug}.json`);
    writeFileSync(draftPath, JSON.stringify(draft, null, 2), 'utf-8');

    // Text-Preview speichern
    const previewPath = resolve(OUTREACH_DIR, `${slug}-preview.txt`);
    writeFileSync(previewPath, text, 'utf-8');

    console.log(`\n✅ Draft erstellt: outreach/${slug}.json`);
    console.log(`   Preview: outreach/${slug}-preview.txt`);
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
        from: '"Levi Webdesign" <levi.webdesign.lg@gmail.com>',
        to: draft.to,
        subject: draft.subject,
        text: draft.text,
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
