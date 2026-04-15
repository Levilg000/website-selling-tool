import { type StylePreset, getStyleForCategory } from './styles.js';
import { type BusinessProfile } from '../research/collect.js';

interface GeneratorInput {
  profile: BusinessProfile;
  style?: StylePreset;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Generiert den Services-Bereich basierend auf Kategorie
function generateServices(profile: BusinessProfile): { icon: string; title: string; desc: string }[] {
  const cat = profile.category;
  const defaults: Record<string, { icon: string; title: string; desc: string }[]> = {
    elektriker: [
      { icon: '⚡', title: 'Elektroinstallation', desc: 'Fachgerechte Elektroinstallationen für Neubau und Altbau.' },
      { icon: '🔌', title: 'E-Check', desc: 'Regelmäßige Prüfung Ihrer elektrischen Anlagen für maximale Sicherheit.' },
      { icon: '🏠', title: 'Smart Home', desc: 'Intelligente Haustechnik für mehr Komfort und Energieeffizienz.' },
      { icon: '🚨', title: 'Notdienst', desc: 'Schnelle Hilfe bei Stromausfällen und elektrischen Notfällen.' },
    ],
    sanitaer: [
      { icon: '🚿', title: 'Sanitärinstallation', desc: 'Professionelle Sanitärarbeiten für Bad und Küche.' },
      { icon: '🔥', title: 'Heizung', desc: 'Heizungsinstallation, Wartung und Modernisierung.' },
      { icon: '🌡️', title: 'Klimatechnik', desc: 'Klimaanlagen und Lüftungssysteme für jedes Gebäude.' },
      { icon: '🚰', title: 'Notdienst', desc: 'Schnelle Hilfe bei Rohrbrüchen und Wassernotfällen.' },
    ],
    gastronomie: [
      { icon: '🍽️', title: 'Unsere Küche', desc: 'Frische Zutaten und traditionelle Rezepte.' },
      { icon: '🎉', title: 'Veranstaltungen', desc: 'Perfekte Location für Feiern und Events.' },
      { icon: '🚗', title: 'Lieferservice', desc: 'Wir bringen Ihnen das Essen direkt nach Hause.' },
      { icon: '📅', title: 'Reservierung', desc: 'Reservieren Sie Ihren Tisch telefonisch oder online.' },
    ],
    friseur: [
      { icon: '✂️', title: 'Schnitt & Styling', desc: 'Individueller Haarschnitt und professionelles Styling.' },
      { icon: '🎨', title: 'Färben & Strähnchen', desc: 'Farbberatung und moderne Farbtechniken.' },
      { icon: '💆', title: 'Pflege', desc: 'Haarpflege-Treatments für gesundes, glänzendes Haar.' },
      { icon: '👰', title: 'Hochzeitsstyling', desc: 'Perfekter Look für Ihren besonderen Tag.' },
    ],
    kosmetik: [
      { icon: '💆', title: 'Gesichtsbehandlung', desc: 'Individuelle Treatments für jeden Hauttyp.' },
      { icon: '💅', title: 'Maniküre & Pediküre', desc: 'Gepflegte Nägel für Hände und Füße.' },
      { icon: '✨', title: 'Anti-Aging', desc: 'Moderne Methoden für ein jugendliches Erscheinungsbild.' },
      { icon: '🧖', title: 'Wellness', desc: 'Entspannung pur mit unseren Wellness-Angeboten.' },
    ],
    fahrschule: [
      { icon: '🚗', title: 'Klasse B', desc: 'PKW-Führerschein mit modernen Fahrzeugen.' },
      { icon: '🏍️', title: 'Klasse A', desc: 'Motorrad-Führerschein für alle Klassen.' },
      { icon: '📚', title: 'Theorie', desc: 'Flexible Theoriezeiten und moderne Lernmethoden.' },
      { icon: '🔄', title: 'Auffrischung', desc: 'Fahrstunden zur Auffrischung und Sicherheit.' },
    ],
  };

  // Wenn scraped Services vorhanden, nutze die
  if (profile.oldSiteServices.length >= 3) {
    return profile.oldSiteServices.slice(0, 4).map((s, i) => ({
      icon: ['⭐', '🔧', '📋', '✅'][i],
      title: s.length > 40 ? s.slice(0, 40) + '...' : s,
      desc: '',
    }));
  }

  return defaults[cat] || [
    { icon: '⭐', title: 'Unser Service', desc: 'Professionelle Dienstleistung mit Herz und Verstand.' },
    { icon: '🤝', title: 'Beratung', desc: 'Individuelle Beratung für Ihre Bedürfnisse.' },
    { icon: '✅', title: 'Qualität', desc: 'Höchste Qualitätsstandards bei jedem Projekt.' },
    { icon: '📞', title: 'Erreichbar', desc: 'Wir sind für Sie da — persönlich und zuverlässig.' },
  ];
}

/**
 * Generiert eine komplette Website als HTML-String.
 */
export function generateWebsite(input: GeneratorInput): string {
  const { profile } = input;
  const style = input.style || getStyleForCategory(profile.category);
  const services = generateServices(profile);
  const name = escHtml(profile.name);
  const city = escHtml(profile.city);
  const phone = escHtml(profile.phone);
  const address = escHtml(profile.address);
  const desc = profile.description ? escHtml(profile.description) : `Ihr ${escHtml(profile.category)} in ${city}`;
  const rating = profile.rating;
  const reviewCount = profile.reviewCount;
  const hours = profile.openingHours;

  // About-Text aus gescrapten Texten oder Standard
  const aboutText = profile.oldSiteTexts.length > 0
    ? escHtml(profile.oldSiteTexts.slice(0, 3).join(' '))
    : `${name} ist Ihr zuverlässiger Partner in ${city} und Umgebung. Wir legen großen Wert auf Qualität, Zuverlässigkeit und persönlichen Service.`;

  const isDarkHero = style.heroTextColor === '#ffffff';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} | ${desc}</title>
  <meta name="description" content="${name} — ${desc}. ${address}">
  <meta name="theme-color" content="${style.primary}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="${style.fontUrl}" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary: ${style.primary};
      --primary-dark: ${style.primaryDark};
      --primary-light: ${style.primaryLight};
      --accent: ${style.accent};
      --dark: #0f172a;
      --text: #334155;
      --muted: #64748b;
      --border: #e2e8f0;
      --bg: ${style.bg};
      --white: #ffffff;
    }
    html { scroll-behavior: smooth; }
    body { font-family: '${style.font}', system-ui, sans-serif; color: var(--text); line-height: 1.7; background: var(--bg); }
    a { color: inherit; text-decoration: none; }

    /* NAV */
    .nav {
      position: fixed; top: 0; width: 100%; z-index: 999;
      background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border); padding: 0.75rem 2rem;
      display: flex; justify-content: space-between; align-items: center;
    }
    .nav-logo { font-family: '${style.headingFont}', serif; font-size: 1.25rem; font-weight: 700; color: var(--primary); }
    .nav-links { display: flex; gap: 2rem; align-items: center; list-style: none; }
    .nav-links a { font-size: 0.9rem; font-weight: 500; color: var(--dark); transition: color 0.2s; }
    .nav-links a:hover { color: var(--primary); }
    .nav-cta { background: var(--primary); color: var(--white) !important; padding: 0.5rem 1.25rem; border-radius: 8px; font-weight: 600; }
    .nav-cta:hover { background: var(--primary-dark); }
    .nav-mobile { display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; }

    /* HERO */
    .hero {
      padding: 8rem 2rem 5rem;
      background: ${style.heroGradient};
      color: ${style.heroTextColor}; text-align: center; position: relative; overflow: hidden;
    }
    .hero::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 80px;
      background: linear-gradient(transparent, var(--bg));
    }
    .hero-inner { position: relative; z-index: 1; max-width: 700px; margin: 0 auto; }
    .hero h1 { font-family: '${style.headingFont}', serif; font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; margin-bottom: 1rem; }
    .hero h1 em { font-style: normal; color: var(--accent); }
    .hero-sub { font-size: 1.15rem; opacity: 0.9; margin-bottom: 2rem; }
    .hero-btns { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.85rem 2rem; border-radius: 10px; font-weight: 600; font-size: 1rem; transition: all 0.25s; border: none; cursor: pointer; }
    .btn-primary { background: ${isDarkHero ? 'var(--white)' : 'var(--primary)'}; color: ${isDarkHero ? 'var(--primary)' : 'var(--white)'}; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
    .btn-secondary { background: transparent; color: ${style.heroTextColor}; border: 2px solid rgba(${isDarkHero ? '255,255,255' : '0,0,0'},0.3); }
    .btn-secondary:hover { border-color: ${style.heroTextColor}; }

    ${rating ? `.hero-rating { margin-top: 2rem; font-size: 0.9rem; opacity: 0.8; }
    .hero-rating .stars { color: var(--accent); font-size: 1.1rem; }` : ''}

    /* SECTIONS */
    section { padding: 5rem 2rem; }
    .container { max-width: 1000px; margin: 0 auto; }
    .section-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 3px; color: var(--primary); text-align: center; margin-bottom: 0.5rem; font-weight: 600; }
    .section-title { font-family: '${style.headingFont}', serif; font-size: 2.25rem; text-align: center; color: var(--dark); font-weight: 700; margin-bottom: 3rem; }

    /* SERVICES */
    .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
    .service-card {
      background: var(--white); border: 1px solid var(--border); border-radius: 12px;
      padding: 2rem; text-align: center; transition: all 0.3s;
    }
    .service-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); border-color: var(--primary); }
    .service-icon { font-size: 2.5rem; margin-bottom: 1rem; }
    .service-card h3 { font-size: 1.1rem; font-weight: 700; color: var(--dark); margin-bottom: 0.5rem; }
    .service-card p { font-size: 0.9rem; color: var(--muted); }

    /* ABOUT */
    .about { background: var(--white); }
    .about-content { max-width: 700px; margin: 0 auto; text-align: center; }
    .about-content p { font-size: 1.05rem; line-height: 1.8; margin-bottom: 1.5rem; }

    /* CONTACT */
    .contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; }
    .contact-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; }
    .contact-card h3 { font-size: 1rem; font-weight: 700; color: var(--dark); margin-bottom: 1rem; }
    .contact-card p, .contact-card li { font-size: 0.95rem; color: var(--muted); margin-bottom: 0.5rem; }
    .contact-card ul { list-style: none; }
    .contact-card a { color: var(--primary); font-weight: 500; }
    .contact-card a:hover { text-decoration: underline; }

    /* FOOTER */
    footer {
      background: var(--dark); color: rgba(255,255,255,0.6); padding: 2.5rem 2rem;
      text-align: center; font-size: 0.85rem;
    }
    footer strong { color: var(--white); }

    /* MOBILE */
    @media (max-width: 768px) {
      .nav-links { display: none; }
      .nav-mobile { display: block; }
      .hero { padding: 6rem 1.5rem 4rem; }
      section { padding: 3rem 1.5rem; }
      .services-grid { grid-template-columns: 1fr; }
      .contact-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- NAV -->
  <nav class="nav">
    <a href="#" class="nav-logo">${name}</a>
    <ul class="nav-links">
      <li><a href="#leistungen">Leistungen</a></li>
      <li><a href="#ueber-uns">Über uns</a></li>
      <li><a href="#kontakt">Kontakt</a></li>
      ${phone ? `<li><a href="tel:${phone}" class="nav-cta">📞 ${phone}</a></li>` : ''}
    </ul>
    <button class="nav-mobile" onclick="document.querySelector('.nav-links').style.display=document.querySelector('.nav-links').style.display==='flex'?'none':'flex'">☰</button>
  </nav>

  <!-- HERO -->
  <header class="hero">
    <div class="hero-inner">
      <h1>${name}<br><em>${desc}</em></h1>
      <p class="hero-sub">Qualität und Zuverlässigkeit in ${city} und Umgebung.</p>
      <div class="hero-btns">
        ${phone ? `<a href="tel:${phone}" class="btn btn-primary">📞 Jetzt anrufen</a>` : ''}
        <a href="#leistungen" class="btn btn-secondary">Unsere Leistungen →</a>
      </div>
      ${rating ? `<p class="hero-rating"><span class="stars">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}</span> ${rating}/5 (${reviewCount} Bewertungen)</p>` : ''}
    </div>
  </header>

  <!-- LEISTUNGEN -->
  <section id="leistungen">
    <div class="container">
      <p class="section-label">Was wir bieten</p>
      <h2 class="section-title">Unsere Leistungen</h2>
      <div class="services-grid">
${services.map(s => `        <div class="service-card">
          <div class="service-icon">${s.icon}</div>
          <h3>${escHtml(s.title)}</h3>
          ${s.desc ? `<p>${escHtml(s.desc)}</p>` : ''}
        </div>`).join('\n')}
      </div>
    </div>
  </section>

  <!-- ÜBER UNS -->
  <section id="ueber-uns" class="about">
    <div class="container">
      <p class="section-label">Wer wir sind</p>
      <h2 class="section-title">Über ${name}</h2>
      <div class="about-content">
        <p>${aboutText}</p>
      </div>
    </div>
  </section>

  <!-- KONTAKT -->
  <section id="kontakt">
    <div class="container">
      <p class="section-label">Sprechen Sie uns an</p>
      <h2 class="section-title">Kontakt</h2>
      <div class="contact-grid">
        <div class="contact-card">
          <h3>📍 Adresse</h3>
          <p>${address}</p>
        </div>
        <div class="contact-card">
          <h3>📞 Kontakt</h3>
          ${phone ? `<p>Telefon: <a href="tel:${phone}">${phone}</a></p>` : ''}
          ${profile.email ? `<p>Email: <a href="mailto:${escHtml(profile.email)}">${escHtml(profile.email)}</a></p>` : ''}
        </div>
        ${hours.length > 0 ? `<div class="contact-card">
          <h3>🕐 Öffnungszeiten</h3>
          <ul>
${hours.map(h => `            <li>${escHtml(h)}</li>`).join('\n')}
          </ul>
        </div>` : ''}
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer>
    <p>&copy; ${new Date().getFullYear()} <strong>${name}</strong> — ${city}. Alle Rechte vorbehalten.</p>
  </footer>

</body>
</html>`;
}
