import { collectProfile } from '../research/collect.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = resolve(__dirname, '../../profiles');

async function main() {
  const [query, city = 'Lüneburg'] = process.argv.slice(2);

  if (!query) {
    console.log(`
📋 Business Research Tool

Usage: npm run research -- "Firmenname" ["Stadt"]

Beispiele:
  npm run research -- "Elektro Hartmann" "Adendorf"
  npm run research -- "Bäckerei Hesse" "Lüneburg"
  npm run research -- "Zimmerei Marckmann"

Sammelt automatisch:
  - Google Places Daten (Name, Adresse, Tel, Zeiten, Bewertungen)
  - Alte Website Texte + Services + Email
  - Branche erkennen
  - Alles als profile.json speichern
`);
    process.exit(0);
  }

  const profile = await collectProfile(query, city);
  if (!profile) {
    console.log('\n❌ Firma nicht gefunden.');
    process.exit(1);
  }

  // Save profile
  if (!existsSync(PROFILES_DIR)) mkdirSync(PROFILES_DIR, { recursive: true });
  const slug = profile.name.toLowerCase()
    .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const path = resolve(PROFILES_DIR, `${slug}.json`);
  writeFileSync(path, JSON.stringify(profile, null, 2), 'utf-8');

  console.log(`\n📁 Profil gespeichert: profiles/${slug}.json`);
  console.log(`\nNächster Schritt: Sag Claude "Bau eine Website für ${profile.name}" und zeig auf das Profil.`);
}

main().catch(console.error);
