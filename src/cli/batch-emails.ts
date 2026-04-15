/**
 * Batch-Email-Finder: Scrapt HOT+WARM Leads mit Website nach Email-Adressen.
 * Speichert gefundene Emails direkt in leads.json.
 *
 * Usage: npx tsx src/cli/batch-emails.ts [max]
 *   max = Anzahl Leads die gescrapt werden (default: 50)
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../data/leads.json');

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IGNORE = ['@sentry', '@w3.org', '@schema.org', '@google', '@gstatic', '@youtube',
  '@example', 'noreply@', '@wixpress', '@wix.com', '@facebook', '@fb.com',
  '@jquery', '@wordpress', '@gravatar', '@cookie', 'beispiel@', 'user@domain',
  '@placeholder', '@email.com', '@test.', '@localhost'];

function isValid(email: string): boolean {
  const l = email.toLowerCase();
  if (IGNORE.some(x => l.includes(x))) return false;
  if (l.endsWith('.png') || l.endsWith('.jpg') || l.endsWith('.svg') || l.endsWith('.css') || l.endsWith('.js')) return false;
  if (l.length > 60 || l.length < 6) return false;
  if (l.split('@')[0].length < 2) return false;
  return true;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const max = parseInt(process.argv[2]) || 50;

  const db = JSON.parse(readFileSync(DB_PATH, 'utf-8'));
  const candidates = db.leads
    .filter((l: any) => (l.tier === 'HOT' || l.tier === 'WARM') && l.website && !l.email)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, max);

  console.log(`📧 Batch Email-Finder`);
  console.log(`   ${candidates.length} Leads zu prüfen (Top ${max} nach Score)\n`);

  if (candidates.length === 0) {
    console.log('Keine Leads ohne Email mit Website gefunden.');
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });

  let found = 0;
  let checked = 0;

  for (const lead of candidates) {
    checked++;
    const page = await context.newPage();
    const emails = new Set<string>();

    // Seiten die gecheckt werden
    const urls = [
      lead.website,
      ...['impressum', 'kontakt', 'contact', 'about', 'ueber-uns'].map(p => {
        try { return new URL(p, lead.website).href; } catch { return null; }
      }).filter(Boolean),
    ];

    for (const url of urls) {
      try {
        await page.goto(url as string, { waitUntil: 'domcontentloaded', timeout: 8000 });
        await sleep(500);

        const text = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
        const html = await page.content();

        // Emails aus Text + HTML + mailto
        const allFound = [
          ...(text.match(EMAIL_REGEX) || []),
          ...(html.match(EMAIL_REGEX) || []),
        ];
        const mailtos = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g) || [];
        for (const m of mailtos) allFound.push(m.replace('mailto:', ''));

        for (const e of allFound) {
          if (isValid(e)) emails.add(e.toLowerCase());
        }
      } catch {}
    }

    await page.close();

    if (emails.size > 0) {
      const email = [...emails][0]; // Erste gefundene Email nehmen
      lead.email = email;
      found++;
      console.log(`  ✅ ${checked}/${candidates.length} ${lead.name.padEnd(35)} → ${email}`);
    } else {
      console.log(`  ❌ ${checked}/${candidates.length} ${lead.name.padEnd(35)} → keine Email`);
    }
  }

  await browser.close();

  // DB speichern
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

  console.log(`\n════════════════════════════════`);
  console.log(`  Geprüft: ${checked}`);
  console.log(`  Emails gefunden: ${found}`);
  console.log(`  Ohne Email: ${checked - found}`);
  console.log(`════════════════════════════════`);

  // Ergebnis-Liste
  const withEmail = db.leads.filter((l: any) => l.email);
  if (withEmail.length > 0) {
    console.log(`\nAlle Leads mit Email (${withEmail.length}):\n`);
    withEmail.sort((a: any, b: any) => b.score - a.score).forEach((l: any) => {
      console.log(`  ${l.tier.padEnd(5)} ${String(l.score).padStart(3)}pt  ${l.name.padEnd(35)} ${l.email}`);
    });
  }
}

main().catch(console.error);
