// Vordefinierte Stil-Presets pro Branche

export interface StylePreset {
  name: string;
  font: string;
  fontUrl: string;
  headingFont: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  bg: string;
  heroGradient: string;
  heroTextColor: string;
}

export const STYLE_PRESETS: Record<string, StylePreset> = {
  // Handwerker — solide, vertrauenswürdig
  handwerk: {
    name: 'Handwerk',
    font: 'Inter',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    headingFont: 'Inter',
    primary: '#1a56db',
    primaryDark: '#1e40af',
    primaryLight: '#dbeafe',
    accent: '#f59e0b',
    bg: '#f8fafc',
    heroGradient: 'linear-gradient(135deg, #1e3a5f 0%, #1a56db 50%, #2563eb 100%)',
    heroTextColor: '#ffffff',
  },
  // Gastronomie — warm, einladend
  gastro: {
    name: 'Gastronomie',
    font: 'Nunito',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Playfair+Display:wght@400;700&display=swap',
    headingFont: 'Playfair Display',
    primary: '#dc2626',
    primaryDark: '#b91c1c',
    primaryLight: '#fef2f2',
    accent: '#ea580c',
    bg: '#fffbeb',
    heroGradient: 'linear-gradient(135deg, #7c2d12 0%, #dc2626 50%, #ef4444 100%)',
    heroTextColor: '#ffffff',
  },
  // Beauty/Friseur — elegant, weich
  beauty: {
    name: 'Beauty',
    font: 'Karla',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Karla:wght@300;400;500;600&family=Cormorant+Garamond:wght@400;500;700&display=swap',
    headingFont: 'Cormorant Garamond',
    primary: '#9f1239',
    primaryDark: '#881337',
    primaryLight: '#fff1f2',
    accent: '#4d7c0f',
    bg: '#faf8f5',
    heroGradient: 'linear-gradient(180deg, #fff1f2 0%, #faf8f5 100%)',
    heroTextColor: '#1c1917',
  },
  // Gesundheit — clean, beruhigend
  gesundheit: {
    name: 'Gesundheit',
    font: 'Inter',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    headingFont: 'Inter',
    primary: '#0d9488',
    primaryDark: '#0f766e',
    primaryLight: '#f0fdfa',
    accent: '#0284c7',
    bg: '#f0fdfa',
    heroGradient: 'linear-gradient(135deg, #134e4a 0%, #0d9488 50%, #14b8a6 100%)',
    heroTextColor: '#ffffff',
  },
  // Modern/Default — dunkel, tech-feeling
  modern: {
    name: 'Modern',
    font: 'Inter',
    fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    headingFont: 'Inter',
    primary: '#6d28d9',
    primaryDark: '#5b21b6',
    primaryLight: '#ede9fe',
    accent: '#10b981',
    bg: '#faf5ff',
    heroGradient: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #6d28d9 100%)',
    heroTextColor: '#ffffff',
  },
};

// Branche → Stil-Mapping
const CATEGORY_STYLE_MAP: Record<string, string> = {
  elektriker: 'handwerk',
  sanitaer: 'handwerk',
  dachdecker: 'handwerk',
  zimmerei: 'handwerk',
  maler: 'handwerk',
  kfz: 'handwerk',
  metallbau: 'handwerk',
  fliesenleger: 'handwerk',
  gartenbau: 'handwerk',
  gastronomie: 'gastro',
  baeckerei: 'gastro',
  friseur: 'beauty',
  kosmetik: 'beauty',
  florist: 'beauty',
  zahnarzt: 'gesundheit',
  physiotherapie: 'gesundheit',
  tierarzt: 'gesundheit',
  fahrschule: 'modern',
  anwalt: 'modern',
  immobilien: 'modern',
  handel: 'modern',
  dienstleistung: 'modern',
};

export function getStyleForCategory(category: string): StylePreset {
  const key = CATEGORY_STYLE_MAP[category] || 'modern';
  return STYLE_PRESETS[key];
}
