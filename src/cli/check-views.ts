import { readFileSync } from 'fs';
import { resolve } from 'path';

const authPath = resolve(process.env.APPDATA || '', 'com.vercel.cli/Data/auth.json');
const auth = JSON.parse(readFileSync(authPath, 'utf-8'));
const TOKEN = auth.token;

const projects = [
  'butterblume-barendorf',
  'zimmerei-marckmann',
  'schluesseldienst-alznauer',
  'elektro-hartmann',
  'gyros-center-plaka',
  'fahrschule-luenedrive',
];

const end = Date.now();
const start = end - 7 * 24 * 60 * 60 * 1000;

console.log('Demo-Website Views (letzte 7 Tage)\n');

for (const project of projects) {
  try {
    // Erst Project ID holen
    const projRes = await fetch(`https://api.vercel.com/v9/projects/${project}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const projData = await projRes.json();
    const projectId = projData.id;

    if (!projectId) {
      console.log(`   ?   | ${project} — Projekt nicht gefunden`);
      continue;
    }

    const url = `https://api.vercel.com/v1/web-analytics/stats/pageviews?projectId=${projectId}&from=${start}&to=${end}&environment=production`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    const d = await r.json() as any;

    if (d.data) {
      const total = d.data.reduce((s: number, x: any) => s + (x.pageViews || 0), 0);
      const visitors = d.data.reduce((s: number, x: any) => s + (x.visitors || 0), 0);
      const marker = total > 0 ? '👁️' : '  ';
      console.log(`${marker} ${String(total).padStart(3)} Views | ${String(visitors).padStart(3)} Besucher | ${project}`);
    } else {
      console.log(`   ?   | ${project} — ${(d as any).error?.message || 'keine Daten'}`);
    }
  } catch (e: any) {
    console.log(`   ERR | ${project} — ${e.message}`);
  }
}
