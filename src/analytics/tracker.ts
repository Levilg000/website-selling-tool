/**
 * Minimaler Analytics-Server für Demo-Websites.
 *
 * Cookieless, DSGVO-konform:
 * - Keine Cookies
 * - Keine IP-Speicherung
 * - Kein Fingerprinting
 * - Nur: welche Demo, wann, Referrer
 *
 * Wird als Teil des Pi-Servers gestartet.
 */

import http from 'http';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ANALYTICS_PATH = resolve(__dirname, '../../data/analytics.json');
const DATA_DIR = resolve(__dirname, '../../data');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

export interface PageView {
  demo: string;
  timestamp: string;
  referrer: string;
}

export interface AnalyticsData {
  views: PageView[];
  lastUpdated: string;
}

export function loadAnalytics(): AnalyticsData {
  if (existsSync(ANALYTICS_PATH)) return JSON.parse(readFileSync(ANALYTICS_PATH, 'utf-8'));
  return { views: [], lastUpdated: new Date().toISOString() };
}

function saveAnalytics(data: AnalyticsData) {
  data.lastUpdated = new Date().toISOString();
  writeFileSync(ANALYTICS_PATH, JSON.stringify(data, null, 2));
}

export function getStats(data: AnalyticsData) {
  const byDemo = new Map<string, { total: number; today: number; last: string }>();
  const today = new Date().toISOString().slice(0, 10);

  for (const v of data.views) {
    const d = byDemo.get(v.demo) || { total: 0, today: 0, last: '' };
    d.total++;
    if (v.timestamp.slice(0, 10) === today) d.today++;
    if (v.timestamp > d.last) d.last = v.timestamp;
    byDemo.set(v.demo, d);
  }

  return byDemo;
}

// 1x1 transparentes GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

let notifyCallback: ((demo: string) => void) | null = null;

export function onNewView(cb: (demo: string) => void) {
  notifyCallback = cb;
}

export function startAnalyticsServer(port = 3847) {
  const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');

    const url = new URL(req.url || '/', `http://localhost:${port}`);

    if (url.pathname === '/t') {
      // Track: /t?d=butterblume&r=referrer
      const demo = url.searchParams.get('d') || 'unknown';
      const referrer = url.searchParams.get('r') || '';

      const data = loadAnalytics();
      data.views.push({
        demo,
        timestamp: new Date().toISOString(),
        referrer,
      });
      saveAnalytics(data);

      console.log(`📊 View: ${demo} (ref: ${referrer || 'direct'})`);

      if (notifyCallback) notifyCallback(demo);

      // Pixel zurückgeben
      res.writeHead(200, { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' });
      res.end(PIXEL);
      return;
    }

    if (url.pathname === '/stats') {
      const data = loadAnalytics();
      const stats = getStats(data);
      const result: any = {};
      for (const [demo, s] of stats) result[demo] = s;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result, null, 2));
      return;
    }

    res.writeHead(404);
    res.end('not found');
  });

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`⚠️ Analytics-Port ${port} belegt — überspringe`);
    } else {
      console.log(`⚠️ Analytics-Fehler: ${e.message}`);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`📊 Analytics-Server auf Port ${port}`);
  });

  return server;
}
