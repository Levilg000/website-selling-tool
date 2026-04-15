import axios from 'axios';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isChain } from './chains.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const API_KEY = process.env.GOOGLE_API_KEY || '';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export interface RawLead {
  placeId: string;
  name: string;
  address: string;
  phone: string;
  website: string | null;
  types: string[];
  rating: number | null;
  reviewCount: number | null;
  openingHours: string[];
  isChain: boolean;
}

const SEARCH_CATEGORIES = [
  'handwerker', 'elektriker', 'sanitär heizung', 'dachdecker', 'maler',
  'zimmerei tischlerei', 'kfz werkstatt', 'friseur', 'kosmetik',
  'restaurant', 'imbiss', 'café bäckerei', 'florist blumen',
  'fahrschule', 'physiotherapie', 'zahnarzt', 'rechtsanwalt',
  'immobilienmakler', 'schlüsseldienst', 'reinigung',
  'fotograf', 'tattoo studio', 'tierarzt', 'gartenbau landschaftsbau',
];

/**
 * Scannt eine Stadt nach Firmen einer bestimmten Branche.
 * Nutzt Google Places Text Search (New API).
 */
async function searchCategory(query: string, city: string): Promise<RawLead[]> {
  const leads: RawLead[] = [];
  let pageToken: string | undefined;
  let page = 0;

  do {
    page++;
    try {
      const body: any = {
        textQuery: `${query} in ${city}`,
        languageCode: 'de',
        maxResultCount: 20,
      };
      if (pageToken) body.pageToken = pageToken;

      const resp = await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': [
              'places.id', 'places.displayName', 'places.formattedAddress',
              'places.nationalPhoneNumber', 'places.websiteUri',
              'places.types', 'places.rating', 'places.userRatingCount',
              'places.regularOpeningHours', 'nextPageToken',
            ].join(','),
          },
        }
      );

      const places = resp.data.places || [];
      for (const p of places) {
        const name = p.displayName?.text || '';
        leads.push({
          placeId: p.id,
          name,
          address: p.formattedAddress || '',
          phone: p.nationalPhoneNumber || '',
          website: p.websiteUri || null,
          types: p.types || [],
          rating: p.rating || null,
          reviewCount: p.userRatingCount || null,
          openingHours: p.regularOpeningHours?.weekdayDescriptions || [],
          isChain: isChain(name),
        });
      }

      pageToken = resp.data.nextPageToken;
      if (pageToken) await sleep(1500); // Rate limit
    } catch (e: any) {
      const msg = e.response?.data?.error?.message || e.message;
      if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        console.log(`  ⚠️  API-Kontingent erreicht, stoppe bei Seite ${page}`);
        break;
      }
      console.log(`  ❌ API Fehler (${query}): ${msg}`);
      break;
    }
  } while (pageToken && page < 3); // Max 3 Seiten = 60 Ergebnisse pro Kategorie

  return leads;
}

/**
 * Scannt eine komplette Stadt über alle Branchen.
 */
export async function scanCity(city: string, categories?: string[]): Promise<RawLead[]> {
  const cats = categories || SEARCH_CATEGORIES;
  const allLeads: RawLead[] = [];
  const seenIds = new Set<string>();

  console.log(`\n🔍 Scanne ${city} — ${cats.length} Branchen\n`);

  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    console.log(`  [${i + 1}/${cats.length}] ${cat}...`);

    const leads = await searchCategory(cat, city);
    let added = 0;
    for (const lead of leads) {
      if (!seenIds.has(lead.placeId)) {
        seenIds.add(lead.placeId);
        allLeads.push(lead);
        added++;
      }
    }
    console.log(`    → ${leads.length} gefunden, ${added} neu (${allLeads.length} total)`);

    await sleep(500); // Zwischen Kategorien kurz warten
  }

  console.log(`\n✅ Scan fertig: ${allLeads.length} unique Firmen in ${city}\n`);
  return allLeads;
}

/**
 * Scannt nur bestimmte Branchen.
 */
export async function scanCategories(city: string, queries: string[]): Promise<RawLead[]> {
  return scanCity(city, queries);
}
