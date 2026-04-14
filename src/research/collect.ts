import axios from 'axios';
import { chromium, type Page } from 'playwright';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const API_KEY = process.env.GOOGLE_API_KEY || '';
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IGNORE_EMAILS = ['@sentry', '@w3.org', '@schema.org', '@google', '@gstatic', '@youtube', '@example', 'noreply@', '@wixpress', '@wix.com', '@facebook', '@fb.com', '@yelp', '@jquery', '@wordpress', '@gravatar', '@cookie', 'beispiel@', 'user@domain', 'thomas.schmidt@email'];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function isValidEmail(email: string): boolean {
  const l = email.toLowerCase();
  if (IGNORE_EMAILS.some(x => l.includes(x))) return false;
  if (l.endsWith('.png') || l.endsWith('.jpg') || l.endsWith('.svg') || l.endsWith('.css') || l.endsWith('.js')) return false;
  if (l.length > 60 || l.length < 6) return false;
  return true;
}

export interface BusinessProfile {
  // Basics
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string | null;
  website: string | null;
  placeId: string;

  // Google Data
  rating: number | null;
  reviewCount: number | null;
  types: string[];
  category: string;
  description: string | null;
  openingHours: string[];

  // Scraped Content
  oldSiteTexts: string[];
  oldSiteServices: string[];
  socialMediaContext: string | null;

  // Meta
  researchedAt: string;
}

// ── STEP 1: Find on Google Places ──
async function findBusiness(query: string, city: string): Promise<any | null> {
  console.log(`  🔍 Suche "${query}" in ${city}...`);
  try {
    const resp = await axios.post('https://places.googleapis.com/v1/places:searchText', {
      textQuery: `${query} in ${city}`,
      languageCode: 'de',
      maxResultCount: 1,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': [
          'places.id', 'places.displayName', 'places.formattedAddress',
          'places.nationalPhoneNumber', 'places.internationalPhoneNumber',
          'places.websiteUri', 'places.types', 'places.rating', 'places.userRatingCount',
          'places.editorialSummary', 'places.regularOpeningHours',
        ].join(','),
      },
    });
    const place = resp.data.places?.[0];
    if (place) console.log(`  ✅ Gefunden: ${place.displayName?.text}`);
    return place;
  } catch (e: any) {
    console.log(`  ❌ Places API Fehler: ${e.response?.data?.error?.message || e.message}`);
    return null;
  }
}

// ── STEP 2: Scrape old website ──
async function scrapeOldSite(page: Page, url: string): Promise<{ texts: string[]; services: string[]; emails: string[] }> {
  console.log(`  🌐 Scrape alte Website: ${url}`);
  const texts: string[] = [];
  const services: string[] = [];
  const allEmails: string[] = [];

  const pagesToCheck = [
    url,
    ...['impressum', 'kontakt', 'contact', 'leistungen', 'services', 'ueber-uns', 'about'].map(p => {
      try { return new URL(p, url).href; } catch { return null; }
    }).filter(Boolean) as string[],
  ];

  for (const pageUrl of pagesToCheck) {
    try {
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await sleep(1000);

      const text = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
      const html = await page.content();

      // Emails
      const found = [...(text.match(EMAIL_REGEX) || []), ...(html.match(EMAIL_REGEX) || [])];
      allEmails.push(...found.map(e => e.toLowerCase()).filter(isValidEmail));

      // Mailto
      const mailtos = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g) || [];
      for (const m of mailtos) {
        const addr = m.replace('mailto:', '').toLowerCase();
        if (isValidEmail(addr)) allEmails.push(addr);
      }

      // Relevante Textblöcke (keine Navigation/Footer-Fragmente)
      const lines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 20 && l.length < 500)
        .filter(l => !l.match(/cookie|datenschutz|impressum|©|copyright|navigation|menü|suche/i));

      texts.push(...lines.slice(0, 10));

      // Services erkennen (Aufzählungen, Listen)
      const serviceLines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 5 && l.length < 80)
        .filter(l => l.match(/installation|service|beratung|planung|reparatur|wartung|montage|bau|pflege|schnitt|lieferung|reinigung|ausbildung|kurs|behandlung|therapie/i));
      services.push(...serviceLines);

    } catch {}
  }

  const uniqueEmails = [...new Set(allEmails)];
  if (uniqueEmails.length > 0) console.log(`  📧 Email gefunden: ${uniqueEmails[0]}`);

  return { texts: [...new Set(texts)], services: [...new Set(services)], emails: uniqueEmails };
}

// ── STEP 3: Classify category ──
function classifyCategory(types: string[], name: string): string {
  const t = types.join(',').toLowerCase();
  const n = name.toLowerCase();
  if (t.includes('electrician') || n.includes('elektro')) return 'elektriker';
  if (t.includes('plumber') || t.includes('hvac') || n.includes('heizung') || n.includes('sanitär')) return 'sanitaer';
  if (t.includes('roofing') || n.includes('dach') || n.includes('bedachung')) return 'dachdecker';
  if (t.includes('carpenter') || n.includes('zimmer') || n.includes('tischler') || n.includes('holz')) return 'zimmerei';
  if (t.includes('painter') || n.includes('maler')) return 'maler';
  if (t.includes('car_repair') || n.includes('kfz') || n.includes('auto') || n.includes('werkstatt')) return 'kfz';
  if (t.includes('restaurant') || t.includes('cafe') || t.includes('food') || n.includes('imbiss') || n.includes('restaurant') || n.includes('café')) return 'gastronomie';
  if (t.includes('bakery') || n.includes('bäckerei') || n.includes('konditor')) return 'baeckerei';
  if (t.includes('hair') || n.includes('friseur') || n.includes('frisör') || n.includes('barber')) return 'friseur';
  if (t.includes('beauty') || n.includes('kosmetik') || n.includes('beauty')) return 'kosmetik';
  if (t.includes('florist') || n.includes('blume') || n.includes('florist')) return 'florist';
  if (t.includes('school') || n.includes('fahrschule')) return 'fahrschule';
  if (t.includes('dentist') || n.includes('zahnarzt')) return 'zahnarzt';
  if (t.includes('lawyer') || n.includes('anwalt') || n.includes('recht')) return 'anwalt';
  if (t.includes('real_estate') || n.includes('immobilien') || n.includes('makler')) return 'immobilien';
  if (n.includes('schloss') || n.includes('metall')) return 'metallbau';
  if (n.includes('fliesen')) return 'fliesenleger';
  if (t.includes('store') || t.includes('shop')) return 'handel';
  return 'dienstleistung';
}

// ── MAIN: Collect everything ──
export async function collectProfile(query: string, city: string): Promise<BusinessProfile | null> {
  console.log(`\n📋 Recherche: "${query}" in ${city}\n`);

  // Step 1: Google Places
  const place = await findBusiness(query, city);
  if (!place) return null;

  const name = place.displayName?.text || query;
  const address = place.formattedAddress || '';
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';
  const website = place.websiteUri || null;
  const types = place.types || [];
  const rating = place.rating || null;
  const reviewCount = place.userRatingCount || null;
  const description = place.editorialSummary?.text || null;
  const openingHours = place.regularOpeningHours?.weekdayDescriptions || [];
  const category = classifyCategory(types, name);

  console.log(`  📍 ${address}`);
  console.log(`  📞 ${phone}`);
  console.log(`  🏷️  Branche: ${category}`);
  if (rating) console.log(`  ⭐ ${rating}/5 (${reviewCount} Bewertungen)`);

  // Step 2: Scrape old site
  let oldSiteTexts: string[] = [];
  let oldSiteServices: string[] = [];
  let email: string | null = null;

  if (website) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const scraped = await scrapeOldSite(page, website);
    oldSiteTexts = scraped.texts;
    oldSiteServices = scraped.services;
    if (scraped.emails.length > 0) email = scraped.emails[0];

    await browser.close();
  } else {
    console.log(`  ℹ️  Keine Website vorhanden — keine Texte zu scrapen`);
  }

  // Step 3: Build profile
  const profile: BusinessProfile = {
    name,
    address,
    city: address.match(/\d{5}\s+(.+?)(?:,|$)/)?.[1]?.trim() || city,
    phone,
    email,
    website,
    placeId: place.id,
    rating,
    reviewCount,
    types,
    category,
    description,
    openingHours,
    oldSiteTexts: oldSiteTexts.slice(0, 15),
    oldSiteServices: oldSiteServices.slice(0, 10),
    socialMediaContext: null,
    researchedAt: new Date().toISOString(),
  };

  console.log(`\n✅ Profil erstellt: ${name} (${category})`);
  console.log(`   ${oldSiteTexts.length} Textblöcke, ${oldSiteServices.length} Services, Email: ${email || 'keine'}`);

  return profile;
}
