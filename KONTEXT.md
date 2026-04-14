# LeadGenerator - Kontext

## Uebersicht
Semi-automatisches Website-Selling-Tool. Findet lokale Kleinunternehmen ohne Website ueber Google Places, baut personalisierte Demo-Websites und unterstuetzt beim Verkauf an die Firmen. Erster Testlauf in Lueneburg: 415 aktive Leads, 290 Emails automatisch gescraped, 5 Demo-Websites gebaut.

## Architektur

```
[Google Places API]
        |
        v
[collect.ts] --> Firmenprofil (JSON) --> [profiles/]
        |
        v
[CLI: research.ts] --> Manuelle Recherche / Profil-Vervollstaendigung
        |
        v
[Demo-Website manuell bauen] --> [demos/FIRMENNAME/]
        |
        v
[send-mail.ts] --> Personalisiertes Anschreiben per Gmail SMTP
```

## Tech-Stack

| Technologie | Zweck |
|-------------|-------|
| Node.js + TypeScript | Runtime + Sprache |
| Google Places API (New) | Lead-Suche nach Branche + Stadt |
| Playwright | Website-Scraping + Email-Finder |
| Nodemailer | Email-Versand via Gmail SMTP |
| GitHub Pages | Demo-Hosting (getestet, nur public Repos) |
| Vercel | Demo-Hosting (geplant, besser als GitHub Pages) |

## Wichtige Dateien

| Datei / Ordner | Funktion |
|----------------|----------|
| `src/research/collect.ts` | Kern-Recherche: Google Places API + Website-Scraping |
| `src/cli/research.ts` | CLI-Einstiegspunkt: `npm run research -- "Firma" "Stadt"` |
| `src/cli/send-mail.ts` | Email senden via Gmail SMTP |
| `src/cli/test-mail.ts` | Gmail Login-Test |
| `profiles/` | Gesammelte Firmenprofile als JSON |
| `demos/` | Fertige Demo-Websites (statisches HTML/CSS) |
| `pitch/index.html` | Pitch-Praesentation fuer Investoren/Familie |
| `pitch/PROJEKT-KONTEXT.md` | Projekt-Kontext fuer Claude Code Sessions |
| `.env` | API Keys — NICHT in Git! |
| `.github/workflows/pages.yml` | GitHub Pages Deploy-Workflow |

## Demo-Websites

| Ordner | Stil |
|--------|------|
| `demos/elektro-hartmann/` | Clean Blue Style |
| `demos/marckmann-zimmerei/` | Dark Craft Style |
| `demos/fahrschule-luenedrive/` | Neon Dark Style |
| `demos/gyros-center-plaka/` | Mediterranean Style |
| `demos/butterblume/` | Editorial Soft Style |

## API / Commands

### CLI-Befehle
```bash
# Firmenprofil automatisch sammeln
npm run research -- "Firmenname" "Stadt"

# Email senden
npx tsx src/cli/send-mail.ts <to> <subject> <html-file> [attachments]

# Gmail Login testen
npx tsx src/cli/test-mail.ts
```

## Konfiguration

### .env (nicht in Git!)
| Variable | Wert |
|----------|------|
| `GOOGLE_API_KEY` | Google Places API (New) + PageSpeed Insights |
| `GMAIL_USER` | `leviresaslg@gmail.com` (Workaround, Wechsel geplant) |
| `GMAIL_APP_PASSWORD` | Gmail App-Passwort fuer SMTP |

### Geplante Email-Absender-Aenderung
- Von: `leviresaslg@gmail.com`
- Auf: `levi.webdesign.lg@gmail.com`
- Blockiert noch SMTP — muss ein paar Tage warten bis Google-Sperre aufgehoben

## Business-Strategie
- Zielgruppe: Lokale Kleinunternehmen ohne Website
- Produkt: Einfache statische Image-Websites (kein Login, kein Shop, keine DB)
- Preise: 200-500 EUR einmalig, optional 15 EUR/Monat Hosting
- Kosten: 0 EUR (Vercel gratis, eigene Subdomains gratis)
- Erstkundenansatz: Erste 3 Websites als Portfolio verschenken
- Kontaktreihenfolge: Telefon > Email > persoenlich
- Gewerbeanmeldung noetig (~20 EUR, Kleinunternehmerregelung)

## Erster Testlauf: Lueneburg (Ergebnisse)
- 447 Firmen total gefunden
- 23 Ketten + 9 Geister-Firmen rausgefiltert = 415 aktive Leads
- 68 Firmen ohne Website
- 84 HOT Leads
- 290 Emails automatisch gescraped

## Known Issues / Limitierungen

| Problem | Status | Workaround |
|---------|--------|------------|
| Lead-Generator Source-Dateien (DB, Scraper, Analyzer) bei `npm install` verloren | Offen | Neu bauen |
| Neues Gmail `levi.webdesign.lg` blockiert SMTP | Temporaer | `leviresaslg@gmail.com` nutzen |
| GitHub Pages nur bei public Repos | By Design | Vercel verwenden (geplant) |
| Lead-Daten (DB + CSV) verloren | Offen | Neu generieren |

## Debugging

### Gmail SMTP funktioniert nicht
- App-Passwort pruefen (kein normales Passwort!)
- 2-Faktor-Auth muss bei Gmail aktiviert sein
- Neues Gmail-Konto: erst nach ~3 Tagen fuer SMTP freigegeben
- `npx tsx src/cli/test-mail.ts` ausfuehren zum Testen

### Google Places API gibt keine Ergebnisse
- API Key pruefen (Places API New muss aktiviert sein, nicht die alte Places API)
- Kontingent pruefen (Places API New hat Kosten nach kostenlosem Kontingent)

## Build & Deploy

### Demo-Websites deployen (GitHub Pages)
```bash
# Nur bei public Repos! Push triggert automatisch .github/workflows/pages.yml
git push
```

### Demo-Websites deployen (Vercel — geplant)
- Deploy-Script noch nicht gebaut
- Ziel: Subdomains pro Firma (z.B. elektro-hartmann.levi-webdesign.de)

## Offene Punkte

- [ ] Vercel Deploy Script bauen
- [ ] Email-Outreach System (personalisierte Anschreiben automatisieren)
- [ ] Email-Absender auf `levi.webdesign.lg@gmail.com` umstellen (nach SMTP-Freigabe)
- [ ] Kunden-Email Monitoring + Auto-Wartung
- [ ] Telegram Bot Dashboard fuer Lead-Uebersicht
- [ ] Lead-Daten wiederherstellen (DB + CSV neu generieren)
- [ ] Lead-Generator Source-Dateien neu bauen (DB, Scraper, Analyzer)

---
*Zuletzt aktualisiert: 2026-04-14*
