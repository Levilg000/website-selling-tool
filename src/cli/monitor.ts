import { createRequire } from 'module';
import nodemailer from 'nodemailer';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const INBOX_LOG = resolve(__dirname, '../../inbox-log.json');

interface InboxEntry {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  processed: boolean;
  action?: string;
}

// Einfache Absichten erkennen
function classifyIntent(subject: string, body: string): { type: string; details: string } {
  const text = `${subject} ${body}`.toLowerCase();

  if (text.match(/telefon|nummer|anruf|erreichbar/)) {
    return { type: 'TELEFON_AENDERN', details: 'Kunde will Telefonnummer ändern' };
  }
  if (text.match(/öffnungszeit|geöffnet|uhrzeit/)) {
    return { type: 'OEFFNUNGSZEITEN', details: 'Kunde will Öffnungszeiten ändern' };
  }
  if (text.match(/text|schreibfehler|tippfehler|korrektur|falsch geschrieben/)) {
    return { type: 'TEXT_AENDERN', details: 'Kunde will Text korrigieren' };
  }
  if (text.match(/bild|foto|image|logo/)) {
    return { type: 'BILD_AENDERN', details: 'Kunde will Bild/Foto ändern' };
  }
  if (text.match(/farbe|design|aussehen|layout/)) {
    return { type: 'DESIGN_AENDERN', details: 'Kunde will Design ändern — manuell bearbeiten' };
  }
  if (text.match(/löschen|entfernen|runternehmen|offline/)) {
    return { type: 'LOESCHEN', details: 'Kunde will Website entfernen — ACHTUNG' };
  }
  if (text.match(/danke|super|toll|gefällt|klasse/)) {
    return { type: 'POSITIV', details: 'Positives Feedback!' };
  }
  if (text.match(/beschwer|unzufrieden|schlecht|ärger|anwalt/)) {
    return { type: 'BESCHWERDE', details: 'ACHTUNG: Beschwerde — sofort reagieren!' };
  }
  if (text.match(/rechnung|zahlung|bezahl|überweis/)) {
    return { type: 'ZAHLUNG', details: 'Frage zu Zahlung/Rechnung' };
  }
  if (text.match(/interesse|angebot|preis|kosten|was kostet/)) {
    return { type: 'INTERESSE', details: 'Potenzieller Neukunde!' };
  }

  return { type: 'SONSTIGES', details: 'Nicht automatisch klassifizierbar — manuell prüfen' };
}

function getPriorityEmoji(type: string): string {
  const map: Record<string, string> = {
    BESCHWERDE: '🔴',
    LOESCHEN: '🔴',
    INTERESSE: '🟢',
    POSITIV: '🟢',
    ZAHLUNG: '🟡',
    TELEFON_AENDERN: '🔵',
    OEFFNUNGSZEITEN: '🔵',
    TEXT_AENDERN: '🔵',
    BILD_AENDERN: '🔵',
    DESIGN_AENDERN: '🟡',
    SONSTIGES: '⚪',
  };
  return map[type] || '⚪';
}

function getAutoFixable(type: string): boolean {
  return ['TELEFON_AENDERN', 'OEFFNUNGSZEITEN', 'TEXT_AENDERN'].includes(type);
}

async function main() {
  const [cmd] = process.argv.slice(2);

  if (!cmd) {
    console.log(`
📬 Kunden-Email Monitor

Befehle:
  check                Inbox checken und neue Emails klassifizieren
  status               Übersicht aller eingegangenen Emails
  simulate <text>      Email simulieren um Klassifizierung zu testen

Beispiele:
  npx tsx src/cli/monitor.ts check
  npx tsx src/cli/monitor.ts status
  npx tsx src/cli/monitor.ts simulate "Können Sie die Telefonnummer ändern?"
  npx tsx src/cli/monitor.ts simulate "Wir sind sehr unzufrieden mit der Website"
  npx tsx src/cli/monitor.ts simulate "Was würde eine Website für uns kosten?"
`);
    return;
  }

  if (cmd === 'simulate') {
    const text = process.argv.slice(3).join(' ');
    if (!text) { console.log('Usage: monitor simulate "Email-Text"'); return; }

    const result = classifyIntent('', text);
    const emoji = getPriorityEmoji(result.type);
    const autoFix = getAutoFixable(result.type);

    console.log(`\n📧 Simulierte Email: "${text}"`);
    console.log(`\n${emoji} Typ: ${result.type}`);
    console.log(`   ${result.details}`);
    console.log(`   Auto-Fix möglich: ${autoFix ? 'JA ✅' : 'NEIN — manuell'}`);
    return;
  }

  if (cmd === 'status') {
    if (!existsSync(INBOX_LOG)) { console.log('Noch keine Emails empfangen.'); return; }
    const log: InboxEntry[] = JSON.parse(readFileSync(INBOX_LOG, 'utf-8'));

    console.log(`\n📬 Inbox Log (${log.length} Emails):\n`);
    for (const entry of log) {
      const status = entry.processed ? '✅' : '⏳';
      console.log(`  ${status} ${entry.date.slice(0,10)} | ${entry.from.slice(0,30).padEnd(30)} | ${entry.subject.slice(0,40)}`);
      if (entry.action) console.log(`     → ${entry.action}`);
    }
    return;
  }

  if (cmd === 'check') {
    console.log('📬 Email-Check...');
    console.log('');
    console.log('⚠️  IMAP-Polling ist noch nicht implementiert.');
    console.log('   Für den Moment: Emails manuell mit "simulate" testen.');
    console.log('');
    console.log('   Geplant: IMAP-Verbindung zu levi.webdesign.lg@gmail.com');
    console.log('   die alle 5 Minuten checkt und neue Emails klassifiziert.');
    console.log('   Bei Beschwerden → sofort Telegram-Benachrichtigung.');
    console.log('   Bei einfachen Änderungen → Auto-Fix vorschlagen.');
    return;
  }
}

main().catch(console.error);
