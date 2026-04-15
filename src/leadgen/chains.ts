// Bekannte Ketten und Franchises die wir NICHT anschreiben wollen
// (haben eigene Webentwickler, kein Bedarf an unserer Dienstleistung)

export const CHAIN_PATTERNS = [
  // Automotive
  'atu', 'a.t.u', 'euromaster', 'vergölst', 'pitstop', 'pit-stop', 'feu vert',
  'bosch car service', 'aral', 'shell', 'esso', 'total', 'jet tankstelle',
  // Baumärkte
  'bauhaus', 'obi', 'hornbach', 'toom', 'hagebau', 'globus baumarkt', 'hellweg',
  // Supermärkte / Discounter
  'aldi', 'lidl', 'edeka', 'rewe', 'netto', 'penny', 'norma', 'kaufland',
  // Drogerie / Optik
  'dm-drogerie', 'rossmann', 'müller drogerie', 'fielmann', 'apollo optik',
  // Mode / Schmuck
  'h&m', 'zara', 'c&a', 'primark', 'pandora', 'christ juwelier', 'bijou brigitte',
  // Elektronik
  'mediamarkt', 'media markt', 'saturn', 'expert',
  // Gastronomie-Ketten
  'mcdonalds', 'mcdonald', 'burger king', 'subway', 'starbucks', 'nordsee',
  'back-factory', 'backwerk', 'ditsch',
  // Banken / Versicherungen
  'sparkasse', 'volksbank', 'commerzbank', 'deutsche bank', 'postbank',
  'allianz', 'ergo', 'huk-coburg', 'huk coburg',
  // Telekommunikation
  'telekom shop', 'vodafone shop', 'o2 shop',
  // Fitness-Ketten
  'mcfit', 'clever fit', 'fitness first', 'john reed',
  // Immobilien-Ketten
  'von poll', 'engel & völkers', 're/max',
  // Hotel-Ketten
  'ibis', 'mercure', 'motel one', 'b&b hotel', 'premier inn',
  // Apotheken-Ketten
  'doc morris', 'docmorris',
  // Sonstige
  'sixt', 'europcar', 'hertz',
];

export function isChain(name: string): boolean {
  const lower = name.toLowerCase();
  return CHAIN_PATTERNS.some(pattern => lower.includes(pattern));
}
