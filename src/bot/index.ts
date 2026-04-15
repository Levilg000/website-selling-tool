import { Bot, InlineKeyboard } from 'grammy';
import { ImapFlow } from 'imapflow';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadDB, exportCSV } from '../leadgen/db.js';
import {
  loadCRM, saveCRM, findEntry, upsertEntry, addNote, addCall,
  addFollowUp, getDueFollowUps, getPipelineStats,
  slugify, type CRMEntry, type PipelineStage,
} from '../crm/pipeline.js';
import { startAnalyticsServer, onNewView, loadAnalytics, getStats } from '../analytics/tracker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
if (!TOKEN) { console.error('❌ TELEGRAM_BOT_TOKEN fehlt in .env'); process.exit(1); }

const bot = new Bot(TOKEN);

// ── Helpers ──────────────────────────────────────────────

const stageEmoji: Record<PipelineStage, string> = {
  lead: '📋', researched: '🔍', demo: '🌐', outreach: '📧',
  followup: '🔄', negotiation: '🤝', won: '💰', lost: '❌', skipped: '⏭️',
};
const stageLabel: Record<PipelineStage, string> = {
  lead: 'Lead', researched: 'Recherchiert', demo: 'Demo',
  outreach: 'Outreach', followup: 'Follow-up', negotiation: 'Verhandlung',
  won: 'Gewonnen', lost: 'Verloren', skipped: 'Übersprungen',
};

async function notify(text: string, keyboard?: InlineKeyboard) {
  if (!CHAT_ID) return;
  try {
    await bot.api.sendMessage(CHAT_ID, text, {
      parse_mode: 'Markdown',
      ...(keyboard ? { reply_markup: keyboard } : {}),
    });
  } catch (e: any) {
    console.log(`⚠️ Notify: ${e.message}`);
  }
}

function ensureCRM(name: string) {
  const crm = loadCRM();
  let entry = findEntry(crm, name);
  if (!entry) {
    const db = loadDB();
    const lead = db?.leads.find(l => l.name.toLowerCase().includes(name.toLowerCase()));
    if (lead) {
      entry = upsertEntry(crm, slugify(lead.name), {
        name: lead.name, phone: lead.phone, city: db?.city, category: lead.category,
      });
    } else {
      entry = upsertEntry(crm, slugify(name), { name });
    }
  }
  return { crm, entry };
}

// ── /start ───────────────────────────────────────────────

bot.command('start', (ctx) => ctx.reply(
  `🚀 *LeadGenerator*\n\n` +
  `📊 /today /pipeline /stats /views\n` +
  `📬 /inbox\n` +
  `🔍 /top /hot /warm /search /detail\n` +
  `📝 /note /call /stage /followups\n` +
  `💰 /done /lost /skip /revenue\n` +
  `📁 /export /help`,
  { parse_mode: 'Markdown' }
));

bot.command('help', (ctx) => ctx.reply(
  `📖 *Befehle*\n\n` +
  `*Dashboard:*\n\`/today\` \`/pipeline\` \`/stats\` \`/views\`\n\n` +
  `*Leads:*\n\`/top\` \`/hot\` \`/warm\` \`/search X\` \`/detail X\` \`/categories\`\n\n` +
  `*CRM:*\n\`/note X text\` \`/call X notiz\` \`/stage X demo\`\n` +
  `\`/followups\` \`/done X 500\` \`/lost X grund\` \`/skip X\`\n\n` +
  `*Business:*\n\`/revenue\` \`/export\` \`/inbox\`\n\n` +
  `Stages: lead → researched → demo → outreach → followup → negotiation → won/lost`,
  { parse_mode: 'Markdown' }
));

// ── /today ───────────────────────────────────────────────

bot.command('today', async (ctx) => {
  const db = loadDB();
  const crm = loadCRM();
  const due = getDueFollowUps(crm);
  const stats = getPipelineStats(crm);
  const log = loadInboxLog();
  const today = new Date().toISOString().slice(0, 10);
  const todayMails = log.filter(e => e.date?.slice(0, 10) === today);
  const important = todayMails.filter(e => ['INTERESSE', 'POSITIV', 'BESCHWERDE', 'LOESCHEN'].includes(e.intent?.type));
  const hotUntracked = db ? db.leads.filter(l => l.tier === 'HOT' && !crm.entries.find(e => e.slug === slugify(l.name))).length : 0;

  // Analytics
  const analytics = loadAnalytics();
  const todayViews = analytics.views.filter(v => v.timestamp.slice(0, 10) === today);

  const hour = new Date().getHours();
  const g = hour < 12 ? '☀️ Guten Morgen' : hour < 18 ? '👋 Hey' : '🌙 Abend';

  let msg = `${g}!\n\n`;
  msg += `📬 ${todayMails.length} Emails${important.length ? ` — *${important.length}x wichtig!*` : ''}\n`;
  if (todayViews.length > 0) msg += `👁️ ${todayViews.length} Demo-Aufrufe heute\n`;
  if (due.length > 0) {
    msg += `🔄 ${due.length} Follow-up(s) fällig\n`;
    for (const { entry } of due.slice(0, 3)) msg += `   → ${entry.name}\n`;
  }
  msg += `\n📊 ${stats.outreach} Outreach | ${stats.negotiation} Verhandlung | 💰 ${stats.won} gewonnen\n`;
  if (hotUntracked > 0) msg += `🔥 ${hotUntracked} HOT Leads unbearbeitet\n`;
  if (crm.totalRevenue > 0) msg += `💰 ${crm.totalRevenue}€\n`;

  const kb = new InlineKeyboard()
    .text('📬 Inbox', 'nav:inbox').text('🔄 Follow-ups', 'nav:followups').row()
    .text('🔥 HOT', 'nav:hot').text('📊 Pipeline', 'nav:pipeline').text('👁️ Views', 'nav:views');
  await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: kb });
});

// ── /views ───────────────────────────────────────────────

bot.command('views', async (ctx) => {
  const data = loadAnalytics();
  const stats = getStats(data);

  if (stats.size === 0) { await ctx.reply('👁️ Noch keine Demo-Aufrufe.'); return; }

  let msg = `👁️ *Demo-Aufrufe*\n\n`;
  for (const [demo, s] of stats) {
    msg += `🌐 *${demo}*\n`;
    msg += `   ${s.total} total | ${s.today} heute\n`;
    msg += `   Letzter: ${s.last.slice(0, 16).replace('T', ' ')}\n\n`;
  }
  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// ── /pipeline ────────────────────────────────────────────

bot.command('pipeline', async (ctx) => {
  const crm = loadCRM();
  const stats = getPipelineStats(crm);
  const db = loadDB();
  let msg = `📊 *Pipeline*\n\n📋 ${db?.stats.active || 0} Leads\n`;
  const stages: PipelineStage[] = ['researched', 'demo', 'outreach', 'followup', 'negotiation', 'won', 'lost'];
  for (const s of stages) {
    if (stats[s] > 0) {
      msg += `\n${stageEmoji[s]} *${stageLabel[s]}* (${stats[s]})\n`;
      for (const e of crm.entries.filter(e => e.stage === s).slice(0, 5)) msg += `   → ${e.name}\n`;
    }
  }
  if (crm.totalRevenue > 0) msg += `\n💰 ${crm.totalRevenue}€`;
  if (crm.entries.length === 0) msg += `\n_Leer. /stage <firma> <stage>_`;
  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// ── /inbox ───────────────────────────────────────────────

bot.command('inbox', async (ctx) => {
  const log = loadInboxLog();
  if (log.length === 0) { await ctx.reply('📬 Keine Emails.'); return; }
  const recent = log.slice(-15).reverse();
  let msg = `📬 *Letzte ${recent.length} Emails*\n\n`;
  for (const e of recent) {
    const from = e.from?.replace(/<.*>/, '').trim().slice(0, 25) || '?';
    msg += `${e.priority || '⚪'} ${e.date?.slice(5, 10)} *${from}*\n   ${e.subject?.slice(0, 50)}\n\n`;
  }
  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// ── /stats /top /hot /warm /search /detail /categories ──

bot.command('stats', async (ctx) => {
  const db = loadDB();
  if (!db) { await ctx.reply('❌'); return; }
  await ctx.reply(
    `📊 *${db.city}*\n\n👥 ${db.stats.total} total | ⛔ ${db.stats.chains} Ketten\n` +
    `✅ ${db.stats.active} aktiv | ❌ ${db.stats.noWebsite} ohne Website\n\n` +
    `🔥 ${db.stats.hot} HOT | 🟡 ${db.stats.warm} WARM | ❄️ ${db.stats.cold} COLD`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('top', async (ctx) => {
  const db = loadDB();
  if (!db) { await ctx.reply('❌'); return; }
  const top = db.leads.filter(l => l.tier !== 'SKIP').slice(0, 10);
  let msg = `🏆 *Top 10 — ${db.city}*\n\n`;
  top.forEach((l, i) => {
    const t = { HOT: '🔥', WARM: '🟡', COLD: '❄️', SKIP: '⛔' }[l.tier];
    msg += `${i + 1}. ${t} *${l.name}*\n   ${l.website ? '🌐' : '❌'} ${l.score}pt | ${l.category} | 📞 ${l.phone || '-'}\n\n`;
  });
  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

function fmtList(leads: any[], title: string): string {
  if (!leads.length) return `${title}\nKeine.`;
  let msg = `${title}\n\n`;
  for (const l of leads.slice(0, 25)) msg += `${l.website ? '🌐' : '❌'} ${l.name} (${l.category})\n   ${l.score}pt | 📞 ${l.phone || '-'}\n`;
  if (leads.length > 25) msg += `\n+${leads.length - 25} weitere`;
  return msg;
}

bot.command('hot', async (ctx) => { const db = loadDB(); if (!db) return; await ctx.reply(fmtList(db.leads.filter(l => l.tier === 'HOT'), `🔥 HOT`)); });
bot.command('warm', async (ctx) => { const db = loadDB(); if (!db) return; await ctx.reply(fmtList(db.leads.filter(l => l.tier === 'WARM'), `🟡 WARM`)); });

bot.command('search', async (ctx) => {
  const q = ctx.match?.toLowerCase(); if (!q) { await ctx.reply('/search <name>'); return; }
  const db = loadDB(); if (!db) return;
  const res = db.leads.filter(l => l.name.toLowerCase().includes(q) || l.category.includes(q));
  if (!res.length) { await ctx.reply(`Nichts für "${q}".`); return; }
  let msg = `🔍 "${q}" — ${res.length}\n\n`;
  for (const l of res.slice(0, 15)) {
    msg += `${{ HOT: '🔥', WARM: '🟡', COLD: '❄️', SKIP: '⛔' }[l.tier]} ${l.name}\n   ${l.website || '❌'} | 📞 ${l.phone || '-'}\n\n`;
  }
  await ctx.reply(msg);
});

bot.command('detail', async (ctx) => {
  const q = ctx.match?.toLowerCase(); if (!q) { await ctx.reply('/detail <name>'); return; }
  const db = loadDB(); if (!db) return;
  const lead = db.leads.find(l => l.name.toLowerCase().includes(q));
  if (!lead) { await ctx.reply(`"${q}" nicht gefunden.`); return; }
  const crm = loadCRM(); const ce = findEntry(crm, slugify(lead.name));
  const t = { HOT: '🔥', WARM: '🟡', COLD: '❄️', SKIP: '⛔' }[lead.tier];
  let msg = `${t} *${lead.name}*\n\n📍 ${lead.address}\n📞 ${lead.phone || '-'}\n🌐 ${lead.website || 'Keine'}\n`;
  msg += `⭐ ${lead.rating || '?'}/5 (${lead.reviewCount || 0}) | ${lead.category} | ${lead.score}pt\n`;
  if (ce) {
    msg += `\n${stageEmoji[ce.stage]} ${stageLabel[ce.stage]}`;
    if (ce.demoUrl) msg += ` | 🌐 ${ce.demoUrl}`;
    msg += `\n`;
    for (const n of ce.notes.slice(-3)) msg += `📝 ${n.date.slice(0, 10)}: ${n.text}\n`;
    for (const c of ce.calls.slice(-3)) msg += `📞 ${c.date.slice(0, 10)}: ${c.notes}\n`;
  }
  if (lead.openingHours.length) { msg += `\n`; for (const h of lead.openingHours) msg += `  ${h}\n`; }
  const kb = new InlineKeyboard().text('📝 Notiz', `act:note:${slugify(lead.name)}`).text('⏭️ Skip', `act:skip:${slugify(lead.name)}`);
  await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: kb });
});

bot.command('categories', async (ctx) => {
  const db = loadDB(); if (!db) return;
  const active = db.leads.filter(l => l.tier !== 'SKIP');
  const cats = new Map<string, number>();
  for (const l of active) cats.set(l.category, (cats.get(l.category) || 0) + 1);
  let msg = `📂 *${db.city}*\n\n`;
  for (const [c, n] of [...cats.entries()].sort((a, b) => b[1] - a[1])) {
    const hot = active.filter(l => l.category === c && l.tier === 'HOT').length;
    msg += `${c}: ${n}${hot ? ` (🔥${hot})` : ''}\n`;
  }
  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// ── CRM Commands ─────────────────────────────────────────

bot.command('note', async (ctx) => {
  const [f, ...r] = (ctx.match || '').split(' '); const t = r.join(' ');
  if (!f || !t) { await ctx.reply('/note <firma> <text>'); return; }
  ensureCRM(f); const res = addNote(loadCRM(), f, t);
  if (res) await ctx.reply(`📝 *${res.name}*: "${t}"`, { parse_mode: 'Markdown' });
  else await ctx.reply(`❌ "${f}" nicht gefunden.`);
});

bot.command('call', async (ctx) => {
  const [f, ...r] = (ctx.match || '').split(' '); const n = r.join(' ') || 'Anruf';
  if (!f) { await ctx.reply('/call <firma> [notiz]'); return; }
  ensureCRM(f); const res = addCall(loadCRM(), f, 'reached', n);
  if (res) await ctx.reply(`📞 *${res.name}*: ${n}`, { parse_mode: 'Markdown' });
  else await ctx.reply(`❌ "${f}" nicht gefunden.`);
});

bot.command('stage', async (ctx) => {
  const [f, s] = (ctx.match || '').split(' ');
  if (!f || !s) { await ctx.reply('/stage <firma> <stage>'); return; }
  const valid: PipelineStage[] = ['lead', 'researched', 'demo', 'outreach', 'followup', 'negotiation', 'won', 'lost', 'skipped'];
  if (!valid.includes(s as PipelineStage)) { await ctx.reply(`Stages: ${valid.join(', ')}`); return; }
  const { crm, entry } = ensureCRM(f);
  entry.stage = s as PipelineStage;
  if (s === 'outreach') entry.outreachSentAt = new Date().toISOString();
  entry.updatedAt = new Date().toISOString();
  saveCRM(crm);
  await ctx.reply(`${stageEmoji[s as PipelineStage]} *${entry.name}* → ${stageLabel[s as PipelineStage]}`, { parse_mode: 'Markdown' });
});

bot.command('done', async (ctx) => {
  const [f, p] = (ctx.match || '').split(' '); if (!f) { await ctx.reply('/done <firma> <preis>'); return; }
  const crm = loadCRM(); const e = findEntry(crm, f);
  if (!e) { await ctx.reply(`❌ "${f}" nicht im CRM.`); return; }
  e.stage = 'won'; e.revenue = parseInt(p) || 0; e.followUps.forEach(fu => fu.done = true); e.updatedAt = new Date().toISOString();
  saveCRM(crm);
  await ctx.reply(`🎉🎉🎉\n*${e.name}* GEWONNEN!\n💰 ${e.revenue}€ | Gesamt: ${crm.totalRevenue}€`, { parse_mode: 'Markdown' });
});

bot.command('lost', async (ctx) => {
  const [f, ...r] = (ctx.match || '').split(' '); if (!f) { await ctx.reply('/lost <firma> <grund>'); return; }
  const crm = loadCRM(); const e = findEntry(crm, f);
  if (!e) { await ctx.reply(`❌`); return; }
  e.stage = 'lost'; e.lostReason = r.join(' ') || 'Kein Interesse'; e.followUps.forEach(fu => fu.done = true); e.updatedAt = new Date().toISOString();
  saveCRM(crm);
  await ctx.reply(`❌ *${e.name}* — ${e.lostReason}`, { parse_mode: 'Markdown' });
});

bot.command('skip', async (ctx) => {
  const f = ctx.match; if (!f) { await ctx.reply('/skip <firma>'); return; }
  const { crm, entry } = ensureCRM(f);
  entry.stage = 'skipped'; entry.updatedAt = new Date().toISOString(); saveCRM(crm);
  await ctx.reply(`⏭️ *${entry.name}* übersprungen.`, { parse_mode: 'Markdown' });
});

bot.command('followups', async (ctx) => {
  const due = getDueFollowUps(loadCRM());
  if (!due.length) { await ctx.reply('✅ Keine fälligen Follow-ups.'); return; }
  let msg = `🔄 *Follow-ups*\n\n`;
  for (const { entry, followUp } of due) {
    const i = followUp.type === 'email' ? '📧' : '📞';
    msg += `${i} *${entry.name}* — ${followUp.reason}\n   Seit: ${followUp.dueDate}${entry.phone ? ` | 📞 ${entry.phone}` : ''}\n\n`;
  }
  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('revenue', async (ctx) => {
  const crm = loadCRM();
  const won = crm.entries.filter(e => e.stage === 'won');
  const lost = crm.entries.filter(e => e.stage === 'lost');
  let msg = `💰 *${crm.totalRevenue}€*\n\nKunden: ${won.length} | Verloren: ${lost.length}\n`;
  for (const e of won) msg += `💰 ${e.name}: ${e.revenue || 0}€\n`;
  if (won.length) msg += `\nØ ${Math.round(crm.totalRevenue / won.length)}€`;
  if (won.length + lost.length) msg += ` | Conv: ${Math.round(won.length / (won.length + lost.length) * 100)}%`;
  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('export', async (ctx) => {
  const db = loadDB(); if (!db) return;
  const f = `leads-${db.city.toLowerCase()}.csv`;
  const p = resolve(__dirname, '../../data', f);
  writeFileSync(p, exportCSV(db), 'utf-8');
  await ctx.replyWithDocument({ source: p, filename: f });
});

// ── Inline Buttons ───────────────────────────────────────

bot.callbackQuery(/^nav:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const cmd = ctx.match![1];
  const fakeMsg = { ...ctx.callbackQuery.message, text: `/${cmd}`, entities: [{ type: 'bot_command' as const, offset: 0, length: cmd.length + 1 }] };
  await bot.handleUpdate({ update_id: 0, message: fakeMsg as any });
});

bot.callbackQuery(/^act:skip:(.+)$/, async (ctx) => {
  const slug = ctx.match![1]; await ctx.answerCallbackQuery('Übersprungen');
  const crm = loadCRM();
  const e = findEntry(crm, slug) || upsertEntry(crm, slug, { name: slug, stage: 'skipped' });
  e.stage = 'skipped'; saveCRM(crm);
  await ctx.reply(`⏭️ *${e.name}* übersprungen.`, { parse_mode: 'Markdown' });
});

// ── Email Monitor ────────────────────────────────────────

const INBOX_LOG_PATH = resolve(__dirname, '../../data/inbox-log.json');
const MONITOR_STATE_PATH = resolve(__dirname, '../../data/monitor-state.json');

interface MailEntry { id: string; from: string; subject: string; date: string; snippet: string; intent: { type: string; details: string }; priority: string; processed: boolean; }

function loadInboxLog(): MailEntry[] {
  if (existsSync(INBOX_LOG_PATH)) return JSON.parse(readFileSync(INBOX_LOG_PATH, 'utf-8'));
  return [];
}

function classifyIntent(subject: string, body: string) {
  const t = `${subject} ${body}`.toLowerCase();
  if (t.match(/telefon|nummer|anruf|erreichbar/)) return { type: 'TELEFON_AENDERN', details: 'Telefonnummer' };
  if (t.match(/öffnungszeit|geöffnet|uhrzeit/)) return { type: 'OEFFNUNGSZEITEN', details: 'Öffnungszeiten' };
  if (t.match(/text|schreibfehler|tippfehler|korrektur/)) return { type: 'TEXT_AENDERN', details: 'Text korrigieren' };
  if (t.match(/bild|foto|image|logo/)) return { type: 'BILD_AENDERN', details: 'Bild ändern' };
  if (t.match(/farbe|design|aussehen|layout/)) return { type: 'DESIGN_AENDERN', details: 'Design ändern' };
  if (t.match(/löschen|entfernen|runternehmen|offline/)) return { type: 'LOESCHEN', details: 'Entfernen!' };
  if (t.match(/danke|super|toll|gefällt|klasse/)) return { type: 'POSITIV', details: 'Positiv' };
  if (t.match(/beschwer|unzufrieden|schlecht|ärger|anwalt/)) return { type: 'BESCHWERDE', details: 'Beschwerde!' };
  if (t.match(/rechnung|zahlung|bezahl|überweis/)) return { type: 'ZAHLUNG', details: 'Zahlung' };
  if (t.match(/interesse|angebot|preis|kosten|was kostet/)) return { type: 'INTERESSE', details: 'Interesse!' };
  return { type: 'SONSTIGES', details: '' };
}

function priorityEmoji(type: string): string {
  return { BESCHWERDE: '🔴', LOESCHEN: '🔴', INTERESSE: '🟢', POSITIV: '🟢', ZAHLUNG: '🟡', DESIGN_AENDERN: '🟡', TELEFON_AENDERN: '🔵', OEFFNUNGSZEITEN: '🔵', TEXT_AENDERN: '🔵', BILD_AENDERN: '🔵', SONSTIGES: '⚪' }[type] || '⚪';
}

async function pollEmails() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return;

  const statePath = MONITOR_STATE_PATH;
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf-8')) : { lastUid: 0 };

  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user, pass }, logger: false });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const criteria = state.lastUid > 0 ? { uid: `${state.lastUid + 1}:*` } : { since: new Date(Date.now() - 24 * 60 * 60 * 1000) };
      let maxUid = state.lastUid;
      const log = loadInboxLog();

      for await (const msg of client.fetch(criteria, { envelope: true, source: true, uid: true })) {
        if (msg.uid <= state.lastUid) continue;

        const rawSource = msg.source?.toString() || '';

        // Nur Mails die von levi.webdesign.lg weitergeleitet wurden
        const isForwarded = rawSource.includes('X-Forwarded-For: levi.webdesign.lg@gmail.com')
          || rawSource.includes('X-Forwarded-To:')
          || rawSource.includes('Delivered-To: levi.webdesign.lg@gmail.com');

        if (msg.uid > maxUid) maxUid = msg.uid;
        if (!isForwarded) continue;

        const fromObj = msg.envelope.from?.[0];
        const from = fromObj ? `${fromObj.name || ''} <${fromObj.address}>` : 'unbekannt';
        const fromName = fromObj?.name || fromObj?.address || 'unbekannt';
        const subject = msg.envelope.subject || '(kein Betreff)';
        const date = msg.envelope.date?.toISOString() || new Date().toISOString();
        const body = rawSource.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);

        const intent = classifyIntent(subject, body);
        const prio = priorityEmoji(intent.type);
        log.push({ id: `uid-${msg.uid}`, from, subject, date, snippet: body.slice(0, 300), intent, priority: prio, processed: false });

        // Jede Mail im Bot anzeigen
        await notify(`📨 *Neue Email*\n\nVon: ${fromName}\nBetreff: ${subject}\n${prio} ${intent.type}${intent.details ? ': ' + intent.details : ''}`);
      }

      if (maxUid > state.lastUid) {
        writeFileSync(statePath, JSON.stringify({ lastCheck: new Date().toISOString(), lastUid: maxUid }, null, 2));
        writeFileSync(INBOX_LOG_PATH, JSON.stringify(log, null, 2));
      }
    } finally { lock.release(); }
    await client.logout();
  } catch (e: any) {
    if (e.message?.includes('Invalid credentials')) console.log('⚠️ IMAP: Credentials ungültig');
  }
}

// ── Scheduler ────────────────────────────────────────────

function startScheduler() {
  // Email alle 5 Min
  setInterval(pollEmails, 5 * 60 * 1000);
  setTimeout(pollEmails, 10_000);

  // Briefing 08:00
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 8 && now.getMinutes() < 5) {
      const crm = loadCRM(); const due = getDueFollowUps(crm); const stats = getPipelineStats(crm);
      const db = loadDB();
      const hot = db ? db.leads.filter(l => l.tier === 'HOT' && !crm.entries.find(e => e.slug === slugify(l.name))).length : 0;
      let msg = `☀️ *Morgen-Briefing*\n\n`;
      if (due.length) msg += `🔄 ${due.length} Follow-up(s) fällig\n`;
      if (hot) msg += `🔥 ${hot} HOT Leads unbearbeitet\n`;
      msg += `📊 ${stats.outreach} Outreach | ${stats.negotiation} Verhandlung\n💰 ${crm.totalRevenue}€\n\n/today`;
      await notify(msg);
    }
  }, 5 * 60 * 1000);

  // Wochen-Report So 18:00
  setInterval(async () => {
    const now = new Date();
    if (now.getDay() === 0 && now.getHours() === 18 && now.getMinutes() < 5) {
      const crm = loadCRM(); const stats = getPipelineStats(crm);
      const analytics = loadAnalytics();
      const weekViews = analytics.views.filter(v => Date.now() - new Date(v.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000);
      let msg = `📊 *Wochen-Report*\n\n`;
      msg += `👁️ ${weekViews.length} Demo-Aufrufe\n`;
      msg += `📊 ${stats.outreach} Outreach | ${stats.negotiation} Verhandlung\n`;
      msg += `💰 ${stats.won} gewonnen | ❌ ${stats.lost} verloren\n`;
      msg += `Umsatz: ${crm.totalRevenue}€`;
      await notify(msg);
    }
  }, 5 * 60 * 1000);

  // Demo Health-Check 10:00
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 10 && now.getMinutes() < 5) {
      const demos = [
        { name: 'Elektro Hartmann', url: 'https://elektro-hartmann.vercel.app' },
        { name: 'Butterblume', url: 'https://butterblume-barendorf.vercel.app' },
        { name: 'Zimmerei Marckmann', url: 'https://zimmerei-marckmann.vercel.app' },
        { name: 'Gyros Center Plaka', url: 'https://gyros-center-plaka.vercel.app' },
        { name: 'Fahrschule LüneDrive', url: 'https://fahrschule-luenedrive.vercel.app' },
      ];
      const down: string[] = [];
      for (const d of demos) {
        try { const r = await fetch(d.url, { signal: AbortSignal.timeout(10000) }); if (!r.ok) down.push(d.name); } catch { down.push(d.name); }
      }
      if (down.length) await notify(`🔴 *Demos down:* ${down.join(', ')}`);
      else console.log('✅ Alle Demos online');
    }
  }, 5 * 60 * 1000);
}

// ── START ────────────────────────────────────────────────

console.log('🤖 LeadGenerator startet...');

// Analytics-Server starten
startAnalyticsServer(3847);
onNewView(async (demo) => {
  await notify(`👁️ *${demo}* wurde gerade aufgerufen!`);
});

startScheduler();

bot.start({
  onStart: (info) => {
    console.log(`✅ @${info.username}`);
    console.log(`📬 Email: 5min | ☀️ 08:00 | 🌐 10:00 | 📊 So 18:00 | 👁️ Analytics :3847`);
  },
});
