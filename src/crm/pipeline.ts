import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CRM_PATH = resolve(__dirname, '../../data/crm.json');
const DATA_DIR = resolve(__dirname, '../../data');

export type PipelineStage = 'lead' | 'researched' | 'demo' | 'outreach' | 'followup' | 'negotiation' | 'won' | 'lost' | 'skipped';

export interface Note { text: string; date: string; }
export interface CallLog { date: string; result: string; notes: string; }
export interface FollowUp { dueDate: string; type: 'email' | 'call' | 'visit'; reason: string; done: boolean; }

export interface CRMEntry {
  slug: string; name: string; email?: string; phone?: string; city?: string; category?: string;
  stage: PipelineStage; demoUrl?: string; outreachSentAt?: string;
  notes: Note[]; calls: CallLog[]; followUps: FollowUp[];
  revenue?: number; lostReason?: string; createdAt: string; updatedAt: string;
}

export interface CRMData { entries: CRMEntry[]; totalRevenue: number; lastUpdated: string; }

function ensureDir() { if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true }); }

export function loadCRM(): CRMData {
  if (existsSync(CRM_PATH)) return JSON.parse(readFileSync(CRM_PATH, 'utf-8'));
  return { entries: [], totalRevenue: 0, lastUpdated: new Date().toISOString() };
}

export function saveCRM(crm: CRMData) {
  ensureDir();
  crm.totalRevenue = crm.entries.filter(e => e.stage === 'won' && e.revenue).reduce((s, e) => s + (e.revenue || 0), 0);
  crm.lastUpdated = new Date().toISOString();
  writeFileSync(CRM_PATH, JSON.stringify(crm, null, 2), 'utf-8');
}

export function getEntry(crm: CRMData, slug: string) { return crm.entries.find(e => e.slug === slug); }

export function findEntry(crm: CRMData, query: string) {
  const q = query.toLowerCase();
  return crm.entries.find(e => e.slug.includes(q) || e.name.toLowerCase().includes(q));
}

export function upsertEntry(crm: CRMData, slug: string, data: Partial<CRMEntry>): CRMEntry {
  let entry = getEntry(crm, slug);
  if (!entry) {
    entry = { slug, name: data.name || slug, stage: 'lead', notes: [], calls: [], followUps: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
    crm.entries.push(entry);
  } else {
    Object.assign(entry, data); entry.updatedAt = new Date().toISOString();
  }
  saveCRM(crm); return entry;
}

export function addNote(crm: CRMData, slug: string, text: string) {
  const e = findEntry(crm, slug); if (!e) return null;
  e.notes.push({ text, date: new Date().toISOString() }); e.updatedAt = new Date().toISOString(); saveCRM(crm); return e;
}

export function addCall(crm: CRMData, slug: string, result: string, notes: string) {
  const e = findEntry(crm, slug); if (!e) return null;
  e.calls.push({ date: new Date().toISOString(), result, notes }); e.updatedAt = new Date().toISOString(); saveCRM(crm); return e;
}

export function addFollowUp(crm: CRMData, slug: string, daysFromNow: number, type: FollowUp['type'], reason: string) {
  const e = findEntry(crm, slug); if (!e) return null;
  const due = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  e.followUps.push({ dueDate: due.toISOString().slice(0, 10), type, reason, done: false });
  e.updatedAt = new Date().toISOString(); saveCRM(crm); return e;
}

export function getDueFollowUps(crm: CRMData) {
  const today = new Date().toISOString().slice(0, 10);
  const r: { entry: CRMEntry; followUp: FollowUp }[] = [];
  for (const e of crm.entries) for (const fu of e.followUps) if (!fu.done && fu.dueDate <= today) r.push({ entry: e, followUp: fu });
  return r;
}

export function getPipelineStats(crm: CRMData) {
  const s: Record<PipelineStage, number> = { lead: 0, researched: 0, demo: 0, outreach: 0, followup: 0, negotiation: 0, won: 0, lost: 0, skipped: 0 };
  for (const e of crm.entries) s[e.stage]++;
  return s;
}

export function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
