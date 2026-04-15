import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { injectAnalytics } from '../analytics/snippet.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pi-URL anpassen wenn der Pi läuft
const TRACKER_URL = process.argv[2] || 'http://localhost:3847';

const demos = [
  { slug: 'elektro-hartmann', dir: 'elektro-hartmann' },
  { slug: 'butterblume', dir: 'butterblume' },
  { slug: 'zimmerei-marckmann', dir: 'marckmann-zimmerei' },
  { slug: 'gyros-center-plaka', dir: 'gyros-center-plaka' },
  { slug: 'fahrschule-luenedrive', dir: 'fahrschule-luenedrive' },
];

console.log(`📊 Analytics-Snippet injizieren (Tracker: ${TRACKER_URL})\n`);

for (const d of demos) {
  const htmlPath = resolve(__dirname, '../../demos', d.dir, 'index.html');
  try {
    let html = readFileSync(htmlPath, 'utf-8');

    // Altes Snippet entfernen falls vorhanden
    html = html.replace(/<!-- Analytics -->[\s\S]*?<\/script>/g, '');

    html = injectAnalytics(html, d.slug, TRACKER_URL);
    writeFileSync(htmlPath, html, 'utf-8');
    console.log(`  ✅ ${d.slug} — injiziert`);
  } catch (e: any) {
    console.log(`  ❌ ${d.slug} — ${e.message}`);
  }
}

console.log(`\n✅ Fertig. Nach Vercel deployen: npm run deploy -- all`);
