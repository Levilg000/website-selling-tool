import { type RawLead } from './scanner.js';

export interface ScoredLead extends RawLead {
  score: number;
  scoreDetails: string[];
  tier: 'HOT' | 'WARM' | 'COLD' | 'SKIP';
  category: string;
}

// Branche erkennen
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
  if (t.includes('physiotherapist') || n.includes('physio') || n.includes('therapie')) return 'physiotherapie';
  if (t.includes('veterinary') || n.includes('tierarzt')) return 'tierarzt';
  if (n.includes('schloss') || n.includes('metall')) return 'metallbau';
  if (n.includes('fliesen')) return 'fliesenleger';
  if (n.includes('garten') || n.includes('landschaft')) return 'gartenbau';
  if (t.includes('store') || t.includes('shop')) return 'handel';
  return 'dienstleistung';
}

/**
 * Bewertet einen Lead nach Verkaufspotenzial.
 * Höherer Score = besserer Lead.
 */
export function scoreLead(lead: RawLead): ScoredLead {
  let score = 50; // Basis
  const details: string[] = [];

  // Kette = sofort SKIP
  if (lead.isChain) {
    return {
      ...lead,
      score: 0,
      scoreDetails: ['Kette/Franchise — SKIP'],
      tier: 'SKIP',
      category: classifyCategory(lead.types, lead.name),
    };
  }

  // Keine Website = Jackpot
  if (!lead.website) {
    score += 30;
    details.push('+30 Keine Website');
  }
  // Facebook-only = fast so gut
  else if (lead.website.includes('facebook.com')) {
    score += 25;
    details.push('+25 Nur Facebook-Seite');
  }
  // Hat Website
  else {
    score -= 10;
    details.push('-10 Hat Website');
  }

  // Bewertungen = aktives Geschäft
  if (lead.reviewCount && lead.reviewCount > 20) {
    score += 10;
    details.push('+10 Viele Bewertungen (aktiv)');
  } else if (lead.reviewCount && lead.reviewCount > 5) {
    score += 5;
    details.push('+5 Einige Bewertungen');
  }

  // Gute Bewertung = kümmern sich um Kunden
  if (lead.rating && lead.rating >= 4.5) {
    score += 5;
    details.push('+5 Sehr gute Bewertung');
  }

  // Telefonnummer vorhanden = erreichbar
  if (lead.phone) {
    score += 5;
    details.push('+5 Telefon vorhanden');
  } else {
    score -= 10;
    details.push('-10 Kein Telefon');
  }

  // Öffnungszeiten eingetragen = aktiv
  if (lead.openingHours.length > 0) {
    score += 5;
    details.push('+5 Öffnungszeiten eingetragen');
  }

  // Handwerker-Branchen sind besonders lukrativ
  const cat = classifyCategory(lead.types, lead.name);
  const highValueCats = ['elektriker', 'sanitaer', 'dachdecker', 'zimmerei', 'maler', 'gartenbau', 'metallbau', 'fliesenleger'];
  if (highValueCats.includes(cat)) {
    score += 10;
    details.push('+10 Handwerker-Branche (hoher Bedarf)');
  }

  // Tier bestimmen
  let tier: ScoredLead['tier'];
  if (score >= 80) tier = 'HOT';
  else if (score >= 60) tier = 'WARM';
  else tier = 'COLD';

  return { ...lead, score, scoreDetails: details, tier, category: cat };
}

/**
 * Bewertet und sortiert alle Leads.
 */
export function scoreLeads(leads: RawLead[]): ScoredLead[] {
  return leads
    .map(scoreLead)
    .sort((a, b) => b.score - a.score);
}
