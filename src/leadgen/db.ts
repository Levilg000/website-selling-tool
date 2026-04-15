import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { type ScoredLead } from './scorer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '../../data/leads.json');
const DATA_DIR = resolve(__dirname, '../../data');

export interface LeadDB {
  city: string;
  scannedAt: string;
  lastUpdated: string;
  stats: {
    total: number;
    chains: number;
    active: number;
    noWebsite: number;
    hot: number;
    warm: number;
    cold: number;
  };
  leads: ScoredLead[];
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function loadDB(): LeadDB | null {
  if (!existsSync(DB_PATH)) return null;
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
}

export function saveDB(db: LeadDB): void {
  ensureDataDir();
  db.lastUpdated = new Date().toISOString();

  // Stats berechnen
  const active = db.leads.filter(l => l.tier !== 'SKIP');
  db.stats = {
    total: db.leads.length,
    chains: db.leads.filter(l => l.isChain).length,
    active: active.length,
    noWebsite: active.filter(l => !l.website).length,
    hot: active.filter(l => l.tier === 'HOT').length,
    warm: active.filter(l => l.tier === 'WARM').length,
    cold: active.filter(l => l.tier === 'COLD').length,
  };

  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

export function createDB(city: string, leads: ScoredLead[]): LeadDB {
  const db: LeadDB = {
    city,
    scannedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    stats: { total: 0, chains: 0, active: 0, noWebsite: 0, hot: 0, warm: 0, cold: 0 },
    leads,
  };
  saveDB(db);
  return db;
}

/**
 * Merge neue Leads in bestehende DB (keine Duplikate).
 */
export function mergeLeads(db: LeadDB, newLeads: ScoredLead[]): number {
  const existingIds = new Set(db.leads.map(l => l.placeId));
  let added = 0;

  for (const lead of newLeads) {
    if (!existingIds.has(lead.placeId)) {
      db.leads.push(lead);
      existingIds.add(lead.placeId);
      added++;
    }
  }

  if (added > 0) saveDB(db);
  return added;
}

/**
 * Exportiert Leads als CSV.
 */
export function exportCSV(db: LeadDB, filter?: ScoredLead['tier']): string {
  const leads = filter ? db.leads.filter(l => l.tier === filter) : db.leads.filter(l => l.tier !== 'SKIP');

  const header = 'Name;Tier;Score;Kategorie;Telefon;Website;Adresse;Bewertung;Anzahl Bewertungen';
  const rows = leads.map(l =>
    [l.name, l.tier, l.score, l.category, l.phone, l.website || 'KEINE', l.address, l.rating || '', l.reviewCount || ''].join(';')
  );

  return [header, ...rows].join('\n');
}
