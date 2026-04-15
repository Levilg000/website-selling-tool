import { scanCity, scanCategories } from '../leadgen/scanner.js';
import { scoreLeads } from '../leadgen/scorer.js';
import { loadDB, createDB, mergeLeads, exportCSV } from '../leadgen/db.js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function printStats(leads: ReturnType<typeof scoreLeads>) {
  const active = leads.filter(l => l.tier !== 'SKIP');
  const chains = leads.filter(l => l.isChain);
  const noSite = active.filter(l => !l.website);
  const hot = active.filter(l => l.tier === 'HOT');
  const warm = active.filter(l => l.tier === 'WARM');

  console.log(`\n📊 Ergebnis:`);
  console.log(`   ${leads.length} Firmen total`);
  console.log(`   ${chains.length} Ketten rausgefiltert`);
  console.log(`   ${active.length} aktive Leads`);
  console.log(`   ${noSite.length} ohne Website`);
  console.log(`   🔥 ${hot.length} HOT | 🟡 ${warm.length} WARM`);

  if (hot.length > 0) {
    console.log(`\n🔥 Top 10 HOT Leads:`);
    for (const l of hot.slice(0, 10)) {
      const site = l.website ? '🌐' : '❌';
      console.log(`   ${site} ${l.score}pt | ${l.name} (${l.category}) | ${l.phone || 'kein Tel'}`);
    }
  }
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd) {
    console.log(`
🔍 Lead Scanner

Befehle:
  scan <stadt> [branchen...]     Stadt scannen (alle oder bestimmte Branchen)
  stats                          Lead-DB Statistiken anzeigen
  list [tier]                    Leads auflisten (HOT/WARM/COLD)
  export [tier]                  Als CSV exportieren
  top [n]                        Top N Leads anzeigen

Beispiele:
  npm run scan -- scan "Lüneburg"
  npm run scan -- scan "Hamburg" "friseur" "kosmetik"
  npm run scan -- stats
  npm run scan -- list HOT
  npm run scan -- export HOT
  npm run scan -- top 20
`);
    return;
  }

  if (cmd === 'scan') {
    const city = args[0];
    if (!city) { console.log('❌ Stadt angeben: npm run scan -- scan "Lüneburg"'); return; }

    const categories = args.slice(1);
    const rawLeads = categories.length > 0
      ? await scanCategories(city, categories)
      : await scanCity(city);

    const scored = scoreLeads(rawLeads);

    // In DB speichern
    const existingDB = loadDB();
    if (existingDB && existingDB.city.toLowerCase() === city.toLowerCase()) {
      const added = mergeLeads(existingDB, scored);
      console.log(`\n💾 ${added} neue Leads zu bestehender DB hinzugefügt (${existingDB.leads.length} total)`);
      printStats(existingDB.leads);
    } else {
      createDB(city, scored);
      console.log(`\n💾 Neue Lead-DB erstellt: data/leads.json`);
      printStats(scored);
    }

    return;
  }

  if (cmd === 'stats') {
    const db = loadDB();
    if (!db) { console.log('❌ Keine Lead-DB. Erst scannen: npm run scan -- scan "Stadt"'); return; }

    console.log(`\n📊 Lead-DB: ${db.city}`);
    console.log(`   Gescannt: ${db.scannedAt.slice(0, 10)}`);
    console.log(`   Aktualisiert: ${db.lastUpdated.slice(0, 10)}`);
    console.log(`\n   ${db.stats.total} total`);
    console.log(`   ${db.stats.chains} Ketten (gefiltert)`);
    console.log(`   ${db.stats.active} aktive Leads`);
    console.log(`   ${db.stats.noWebsite} ohne Website`);
    console.log(`   🔥 ${db.stats.hot} HOT | 🟡 ${db.stats.warm} WARM | ❄️ ${db.stats.cold} COLD`);
    return;
  }

  if (cmd === 'list') {
    const db = loadDB();
    if (!db) { console.log('❌ Keine Lead-DB.'); return; }

    const tier = (args[0]?.toUpperCase() || '') as any;
    const leads = tier
      ? db.leads.filter(l => l.tier === tier)
      : db.leads.filter(l => l.tier !== 'SKIP');

    console.log(`\n📋 ${leads.length} Leads${tier ? ` (${tier})` : ''} in ${db.city}:\n`);
    for (const l of leads) {
      const site = l.website ? '🌐' : '❌';
      const tierEmoji = { HOT: '🔥', WARM: '🟡', COLD: '❄️', SKIP: '⛔' }[l.tier];
      console.log(`  ${tierEmoji} ${site} ${String(l.score).padStart(3)}pt | ${l.name.padEnd(35)} | ${l.category.padEnd(15)} | ${l.phone || 'kein Tel'}`);
    }
    return;
  }

  if (cmd === 'export') {
    const db = loadDB();
    if (!db) { console.log('❌ Keine Lead-DB.'); return; }

    const tier = args[0]?.toUpperCase() as any;
    const csv = exportCSV(db, tier || undefined);
    const filename = `leads-${db.city.toLowerCase()}${tier ? `-${tier.toLowerCase()}` : ''}.csv`;
    const outPath = resolve(__dirname, '../../data', filename);
    writeFileSync(outPath, csv, 'utf-8');
    console.log(`✅ Exportiert: data/${filename} (${csv.split('\n').length - 1} Leads)`);
    return;
  }

  if (cmd === 'top') {
    const db = loadDB();
    if (!db) { console.log('❌ Keine Lead-DB.'); return; }

    const n = parseInt(args[0] || '10');
    const top = db.leads.filter(l => l.tier !== 'SKIP').slice(0, n);

    console.log(`\n🏆 Top ${top.length} Leads in ${db.city}:\n`);
    for (let i = 0; i < top.length; i++) {
      const l = top[i];
      const site = l.website ? `🌐 ${l.website}` : '❌ Keine Website';
      const tierEmoji = { HOT: '🔥', WARM: '🟡', COLD: '❄️', SKIP: '⛔' }[l.tier];
      console.log(`  ${String(i + 1).padStart(2)}. ${tierEmoji} ${l.name} (${l.category})`);
      console.log(`      Score: ${l.score} | ${site}`);
      console.log(`      📞 ${l.phone || 'kein Tel'} | ⭐ ${l.rating || '?'}/5 (${l.reviewCount || 0} Bew.)`);
      console.log(`      ${l.address}`);
      console.log('');
    }
    return;
  }

  console.log(`❌ Unbekannter Befehl: ${cmd}. Nutze: scan, stats, list, export, top`);
}

main().catch(console.error);
