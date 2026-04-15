# LeadGenerator - Kontext

## Uebersicht
Semi-automatisches Website-Selling-Tool. Findet lokale Kleinunternehmen ohne Website ueber Google Places, baut personalisierte Demo-Websites und unterstuetzt beim Verkauf an die Firmen. Erster Testlauf in Lueneburg: 415 aktive Leads, 290 Emails automatisch gescraped, 5 Demo-Websites gebaut.

## Architektur

```
[Google Places API]
        |
        v
[scan.ts] --> Bulk-Scan Stadt --> [scorer.ts] --> Score + Tier
        |                                |
        v                                v
[data/leads.json]                 Lead-DB (HOT/WARM/COLD/SKIP)
        |
        v
[research.ts] --> Einzelfirma Tiefenrecherche --> [profiles/FIRMA.json]
        |
        v
[generate.ts] --> Template + Profil --> [demos/FIRMA/index.html]
        |
        v
[deploy.ts] --> Vercel Deploy --> firma-name.vercel.app
        |
        v
[outreach.ts] --> Email-Draft + Versand --> [outreach/FIRMA.json]
        |
        v
[bot/index.ts] --> Telegram Bot Dashboard
```

## Tech-Stack

| Technologie | Zweck |
|-------------|-------|
| Node.js + TypeScript | Runtime + Sprache |
| Google Places API (New) | Lead-Suche nach Branche + Stadt |
| Playwright | Website-Scraping + Email-Finder |
| Grammy | Telegram Bot Framework |
| Nodemailer | Email-Versand via Gmail SMTP |
| Vercel | Demo-Hosting (alle 5 Demos live) |

## Wichtige Dateien

| Datei / Ordner | Funktion |
|----------------|----------|
| `src/leadgen/scanner.ts` | Bulk Google Places Scan (Stadt x Branchen) |
| `src/leadgen/scorer.ts` | Lead-Scoring + Tier-Klassifizierung |
| `src/leadgen/chains.ts` | Ketten-Blacklist (ATU, BAUHAUS etc.) |
| `src/leadgen/db.ts` | Lead-Datenbank (JSON) + CSV Export |
| `src/research/collect.ts` | Tiefenrecherche: Google Places + Website-Scraping |
| `src/generator/builder.ts` | Website-Generator (HTML aus Profil + Style) |
| `src/generator/styles.ts` | 5 Style-Presets (handwerk/gastro/beauty/gesundheit/modern) |
| `src/bot/index.ts` | Telegram Bot (Lead-Dashboard) |
| `src/cli/scan.ts` | CLI: Stadt scannen, Stats, Export |
| `src/cli/research.ts` | CLI: Einzelfirma recherchieren |
| `src/cli/generate.ts` | CLI: Website generieren |
| `src/cli/deploy.ts` | CLI: Vercel Deploy |
| `src/cli/outreach.ts` | CLI: Email-Drafts erstellen + senden |
| `src/cli/monitor.ts` | CLI: Kunden-Email Monitor (IMAP TODO) |
| `src/cli/send-mail.ts` | CLI: Direkt Email senden |
| `src/cli/test-mail.ts` | CLI: Gmail SMTP testen |
| `profiles/` | Firmenprofile als JSON |
| `demos/` | Fertige Demo-Websites (statisches HTML/CSS) |
| `data/` | Lead-DB (leads.json) + CSV Exports |
| `outreach/` | Email-Drafts + Previews |
| `pitch/` | Pitch-Praesentation |
| `.env` | API Keys — NICHT in Git! |

## CLI-Befehle

```bash
# Stadt scannen (Bulk-Suche)
npm run scan -- scan "Lueneburg"
npm run scan -- scan "Hamburg" "friseur" "kosmetik"
npm run scan -- stats
npm run scan -- list HOT
npm run scan -- export HOT
npm run scan -- top 20

# Einzelfirma recherchieren
npm run research -- "Firmenname" "Stadt"

# Website generieren
npm run generate -- build elektro-hartmann
npm run generate -- build butterblume beauty
npm run generate -- batch
npm run generate -- styles

# Vercel Deploy
npm run deploy -- elektro-hartmann
npm run deploy -- all

# Email-Outreach
npm run outreach -- draft "Elektro Hartmann" "info@hartmann.de" "https://..."
npm run outreach -- send elektro-hartmann
npm run outreach -- list

# Telegram Bot starten
npm run bot

# Gmail testen
npm run test-mail
```

## Konfiguration

### .env (nicht in Git!)
| Variable | Wert |
|----------|------|
| `GOOGLE_API_KEY` | Google Places API (New) + PageSpeed Insights |
| `GMAIL_USER` | `leviresaslg@gmail.com` (aktiv) |
| `GMAIL_APP_PASSWORD` | Gmail App-Passwort fuer SMTP |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token (noch einzutragen!) |

## Demo-Websites (alle live auf Vercel)

| Demo | URL | Stil |
|------|-----|------|
| Elektro Hartmann | elektro-hartmann.vercel.app | Clean Blue |
| Butterblume | butterblume-barendorf.vercel.app | Editorial Soft |
| Zimmerei Marckmann | zimmerei-marckmann.vercel.app | Dark Craft |
| Gyros Center Plaka | gyros-center-plaka.vercel.app | Mediterranean |
| Fahrschule LueneDrive | fahrschule-luenedrive.vercel.app | Neon Dark |

## Business-Strategie
- Zielgruppe: Lokale Kleinunternehmen ohne Website
- Produkt: Einfache statische Image-Websites (kein Login, kein Shop, keine DB)
- Preise: 200-500 EUR einmalig, optional 15 EUR/Monat Hosting
- Kosten: 0 EUR (Vercel gratis, eigene Subdomains gratis)
- Erstkundenansatz: Erste 3 Websites als Portfolio verschenken
- Kontaktreihenfolge: Telefon > Email > persoenlich
- Gewerbeanmeldung noetig (~20 EUR, Kleinunternehmerregelung)

## Known Issues / Limitierungen

| Problem | Status | Workaround |
|---------|--------|------------|
| Neues Gmail `levi.webdesign.lg` blockiert SMTP | Temporaer | `leviresaslg@gmail.com` nutzen |
| Telegram Bot Token fehlt in .env | Offen | Token bei @BotFather erstellen |
| IMAP Monitoring nicht implementiert | Offen | Emails manuell pruefen |
| `--name` Flag bei Vercel deprecated | Gering | Funktioniert noch, wird spaeter entfernt |

## Offene Punkte

- [ ] Telegram Bot Token in .env eintragen + testen
- [ ] Email-Absender auf `levi.webdesign.lg@gmail.com` umstellen (nach SMTP-Freigabe)
- [ ] IMAP Email-Monitoring implementieren
- [ ] Eigene Domain (z.B. levi-webdesign.de) + Subdomains pro Kunde
- [ ] Gewerbeanmeldung

---
*Zuletzt aktualisiert: 2026-04-14*
