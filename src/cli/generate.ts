import { generateWebsite } from '../generator/builder.js';
import { STYLE_PRESETS, getStyleForCategory } from '../generator/styles.js';
import { type BusinessProfile } from '../research/collect.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = resolve(__dirname, '../../profiles');
const DEMOS_DIR = resolve(__dirname, '../../demos');

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd) {
    console.log(`
🏗️  Website Generator

Befehle:
  build <profil>           Website aus Profil generieren
  build <profil> <stil>    Website mit bestimmtem Stil (handwerk/gastro/beauty/gesundheit/modern)
  batch                    Alle Profile ohne Demo-Website generieren
  styles                   Verfügbare Stile anzeigen
  profiles                 Verfügbare Profile anzeigen

Beispiele:
  npm run generate -- build elektro-hartmann
  npm run generate -- build butterblume beauty
  npm run generate -- batch
  npm run generate -- styles
`);
    return;
  }

  if (cmd === 'styles') {
    console.log('\n🎨 Verfügbare Stile:\n');
    for (const [key, style] of Object.entries(STYLE_PRESETS)) {
      console.log(`  ${key.padEnd(12)} — ${style.name} (${style.font}, ${style.primary})`);
    }
    return;
  }

  if (cmd === 'profiles') {
    if (!existsSync(PROFILES_DIR)) { console.log('Keine Profile vorhanden.'); return; }
    const files = readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json'));
    console.log(`\n📋 ${files.length} Profile:\n`);
    for (const f of files) {
      const profile: BusinessProfile = JSON.parse(readFileSync(resolve(PROFILES_DIR, f), 'utf-8'));
      const hasDemo = existsSync(resolve(DEMOS_DIR, f.replace('.json', '')));
      const status = hasDemo ? '✅ Demo vorhanden' : '⏳ Keine Demo';
      console.log(`  ${status} | ${profile.name} (${profile.category}) — ${f}`);
    }
    return;
  }

  if (cmd === 'build') {
    const slug = args[0];
    if (!slug) { console.log('Usage: generate build <profil-slug> [stil]'); return; }

    const profilePath = resolve(PROFILES_DIR, `${slug}.json`);
    if (!existsSync(profilePath)) { console.log(`❌ Profil nicht gefunden: profiles/${slug}.json`); return; }

    const profile: BusinessProfile = JSON.parse(readFileSync(profilePath, 'utf-8'));
    const styleName = args[1];
    const style = styleName ? STYLE_PRESETS[styleName] : undefined;

    if (styleName && !style) {
      console.log(`❌ Stil "${styleName}" nicht gefunden. Verfügbar: ${Object.keys(STYLE_PRESETS).join(', ')}`);
      return;
    }

    console.log(`\n🏗️  Generiere Website für ${profile.name}...`);
    console.log(`   Branche: ${profile.category}`);
    console.log(`   Stil: ${style?.name || getStyleForCategory(profile.category).name} (${styleName || 'auto'})`);

    const html = generateWebsite({ profile, style });

    // In demos/ speichern
    const demoDir = resolve(DEMOS_DIR, slugify(profile.name));
    if (!existsSync(demoDir)) mkdirSync(demoDir, { recursive: true });

    writeFileSync(resolve(demoDir, 'index.html'), html, 'utf-8');

    console.log(`\n✅ Website generiert: demos/${slugify(profile.name)}/index.html`);
    console.log(`   Öffnen: file:///${demoDir.replace(/\\/g, '/')}/index.html`);
    return;
  }

  if (cmd === 'batch') {
    if (!existsSync(PROFILES_DIR)) { console.log('Keine Profile vorhanden.'); return; }
    const files = readdirSync(PROFILES_DIR).filter(f => f.endsWith('.json'));

    let generated = 0;
    let skipped = 0;

    for (const f of files) {
      const slug = f.replace('.json', '');
      const demoDir = resolve(DEMOS_DIR, slug);

      if (existsSync(resolve(demoDir, 'index.html'))) {
        console.log(`  ⏭️  ${slug} — Demo existiert bereits`);
        skipped++;
        continue;
      }

      const profile: BusinessProfile = JSON.parse(readFileSync(resolve(PROFILES_DIR, f), 'utf-8'));
      const html = generateWebsite({ profile });

      if (!existsSync(demoDir)) mkdirSync(demoDir, { recursive: true });
      writeFileSync(resolve(demoDir, 'index.html'), html, 'utf-8');

      console.log(`  ✅ ${profile.name} (${profile.category}) → demos/${slug}/`);
      generated++;
    }

    console.log(`\n📊 ${generated} generiert, ${skipped} übersprungen`);
    return;
  }

  console.log(`❌ Unbekannter Befehl: ${cmd}`);
}

main().catch(console.error);
