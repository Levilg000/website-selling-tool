# Website-Selling Tool — Projektkontext

> Dieses Dokument ist dafür gedacht, in eine Claude Code Session eingefügt zu werden.
> Damit kann man Fragen über das Projekt stellen ohne den gesamten Hintergrund erklären zu müssen.

## Was ist das?

Ein semi-automatisches Tool das Levi gebaut hat, um lokale Kleinunternehmen ohne Website zu finden und ihnen personalisierte Demo-Websites zu verkaufen.

## Wie funktioniert es?

### Phase 1: Leads finden (automatisch)
- Google Places API durchsucht eine Region (z.B. Lüneburg) nach Firmen
- Für jede Firma wird geprüft: Hat sie eine Website? Wenn ja, wie schlecht ist sie?
- Emails werden automatisch von bestehenden Websites gescraped (Impressum, Kontakt)
- Ketten (ATU, BAUHAUS etc.) werden rausgefiltert
- Google Business Status wird geprüft (noch offen? geschlossen?)
- Ergebnis: Lead-Liste mit Score, sortiert nach Verkaufschance

### Phase 2: Website generieren (semi-automatisch)
- Research-Tool sammelt alles über eine Firma: Name, Adresse, Telefon, Öffnungszeiten, Google-Bewertung, Branche, alte Website-Texte, Email
- Speichert als `profiles/firma.json`
- Claude Code baut basierend auf dem Profil eine individuelle Website
- Jede Website hat ein eigenes Design, passend zur Branche
- Kein Template-System — jede Website ist einzigartig

### Phase 3: Verkaufen (manuell)
- Fertige Demo-Website wird auf Vercel deployed (kostenlos)
- Kunde wird angerufen oder per Email kontaktiert mit Demo-Link
- Preise: 300-900 EUR einmalig, optional 25 EUR/Monat Hosting

## Erster Testlauf: Lüneburg

- 415 aktive Firmen gefunden (23 Ketten + 9 Geister-Firmen rausgefiltert)
- 68 Firmen komplett ohne Website
- 290 Email-Adressen automatisch gesammelt
- 84 HOT-Leads (Score >= 70)
- 5 Demo-Websites gebaut (Elektro Hartmann, Zimmerei Marckmann, Fahrschule Lünedrive, Imbiss Plaka, Butterblume)

## Tech-Stack

- **Sprache:** Node.js + TypeScript
- **APIs:** Google Places API (New), PageSpeed Insights API
- **Scraping:** Playwright (headless Chromium)
- **Hosting:** Vercel (kostenlos für statische Seiten)
- **Domains:** Vercel-Subdomains kostenlos, eigene Domains ~6 EUR/Jahr
- **KI:** Claude Code für Website-Generierung
- **Kosten:** 0 EUR (alles Free Tier)

## Finanzen

| Was | Kosten |
|-----|--------|
| Hosting pro Website | 0 EUR (Vercel Free) |
| Domain pro Website | 0 EUR (Subdomain) oder ~6 EUR/Jahr (eigene) |
| Google APIs | 0 EUR (Free Tier: 5.000 Requests/Monat) |
| SSL-Zertifikat | 0 EUR (automatisch bei Vercel) |
| **Gesamtkosten pro Website** | **0 EUR** |

| Einnahmen | Betrag |
|-----------|--------|
| Website einmalig | 300-900 EUR |
| Hosting optional | 25 EUR/Monat |
| Marge | ~100% |

## Rechtliches

- **Gewerbeanmeldung** nötig (~20 EUR, einmalig)
- **Kleinunternehmerregelung** (§19 UStG): Unter 22.000 EUR/Jahr keine Umsatzsteuer
- **DSGVO:** Nur öffentliche Geschäftsdaten werden genutzt, kein automatisches Cold-Emailing
- **Kontaktaufnahme:** Telefon und persönlich ist bei B2B erlaubt
- **Kein Vertrag nötig:** Website wird als fertiges Produkt (HTML-Dateien) verkauft, keine laufenden Verpflichtungen

## Geplante Features

- **Vercel Deploy:** Ein-Klick-Deploy auf firma.vercel.app
- **Email-Outreach:** Personalisierte Anschreiben automatisch generieren
- **Kunden-Wartung:** Email-Monitoring, bei einfachen Wünschen automatisch Website updaten
- **Telegram Bot:** Benachrichtigungen über neue Leads, Kunden-Emails, Deploy-Status

## Projektstruktur

```
LeadGenerator/
├── src/
│   ├── research/
│   │   └── collect.ts          # Auto-Recherche: Google Places + Website-Scraping
│   └── cli/
│       └── research.ts         # CLI: npm run research -- "Firma" "Stadt"
├── profiles/                   # Gesammelte Firmenprofile (JSON)
├── demos/                      # Generierte Demo-Websites
│   ├── elektro-hartmann/
│   ├── marckmann-zimmerei/
│   ├── fahrschule-luenedrive/
│   ├── gyros-center-plaka/
│   └── butterblume/
└── pitch/                      # Diese Projektübersicht
```

## Beispiel-Fragen die man stellen kann

- "Wie genau funktioniert der Lead-Score?"
- "Was passiert wenn ein Kunde seine Website nicht mehr will?"
- "Wie skaliert das — kann man das in anderen Städten machen?"
- "Was sind die Risiken?"
- "Wie viel Zeit muss Levi pro Woche investieren?"
- "Lohnt sich die Gewerbeanmeldung bei den erwarteten Einnahmen?"
