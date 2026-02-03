# Changelog

Alle væsentlige ændringer til dette projekt dokumenteres her.

Format baseret på [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.2.0] - 2026-02-02

### ✨ Added
- **Telefon extraction** - Dansk format (+45, XX XX XX XX)
- **Email extraction** - Prioriterer info@, kontakt@, salg@
- **Social media detection** - Facebook, Instagram, LinkedIn, YouTube, Twitter/X, TikTok
- **Annonceplatform detection** - LinkedIn Ads, JobIndex, Microsoft Ads, TikTok Ads
- **Rate limiting** - 500ms pause mellem requests (undgå blocking)
- **Forbedret Meta Pixel detection** - 3 forskellige patterns
- **Udvidet konkurrent-liste** - DBA Biler, Autogade, Carfind, AutoScout24, Mobile.de, AutoUncle
- **Utilities.gs** - Ekstra værktøjer (analytics, data quality, export)
- **Tests.gs** - Komplet test suite
- **Nye kolonner**: Telefon, Email, Social Media, Ad Platforms

### 🔧 Improved
- **CVR extraction** - 5 forskellige patterns (før: 2)
- **Meta Pixel regex** - Fanger både enkelt og dobbelt quotes
- **AI Gemini prompt** - Opdateret med nye felter
- **Menu structure** - Organiseret i submenus
- **Documentation** - README.md, SETUP.md, ROADMAP.md

### 📊 Analytics Features (Utilities.gs)
- Tracking statistik - % med GA4/GTM/Meta/Ads
- Konkurrent analyse - Hvilke platforme bruges mest?
- Highlight manglende CVR - Rød baggrund
- Flag manglende kontaktinfo - Orange baggrund
- Find dubletter - Samme domæne flere gange
- Export til CSV

### 🐛 Fixed
- Kolonnenumre opdateret for alle nye felter
- onOpen() menu nu konsistent mellem filer

---

## [2.1.0] - 2026-01-XX (Original version)

### ✨ Added
- Basic CVR extraction (2 patterns)
- GA4 ID extraction
- GTM ID extraction
- Meta Pixel extraction (1 pattern)
- Google Ads (AW) extraction
- CMP/Cookie vendor detection (7 vendors)
- Competitor footprints (Bilbasen, Biltorvet, AutoProff)
- Gemini AI briefing (optional)
- Proff.dk search link generation
- Multi-page crawling (homepage + 4 internal)
- Prioritized link selection (kontakt, om, privacy, etc.)
- HTML-only fetching (skip CSS/JS/images)
- Notes generation (sales-friendly)

### 🎯 Features
- Sheet: "Leads"
- Menu: "Cheat Sheet MVP"
- Batch processing (selected rows / all rows)
- Error handling (fetch errors, AI errors)
- User-Agent header

### 📋 Kolonner (v2.1)
1. URL
2. Domain
3. CVR (guess)
4. GA4 (Yes/No)
5. GTM (Yes/No)
6. Meta Pixel (Yes/No)
7. Google Ads tag (Yes/No)
8. Competitors found
9. Notes
10. AI Briefing
11. Last run
12. GA4 IDs
13. GTM IDs
14. Meta Pixel IDs
15. Google Ads AW IDs
16. CMP/Cookie vendor
17. Pages scanned
18. Proff link (search)

---

## [Unreleased] - Fremtidige features

### Planlagt v2.3
- Technology stack detection (WordPress, Wix, React, etc.)
- SEO quick check (title, meta description, H1 count)
- Load time measurement

### Planlagt v2.4
- LinkedIn Company integration
- Lead scoring (1-10)
- Email deliverability check

### Planlagt v3.0
- Historical tracking
- Zapier/Make.com webhooks
- Caching layer
- Parallel fetching

Se [ROADMAP.md](ROADMAP.md) for komplet oversigt.

---

## Migration Guides

### v2.1 → v2.2

**Breaking changes:** Ingen! Fuld bagudkompatibilitet.

**Opdateringsguide:**
1. Backup dit nuværende sheet
2. Kopiér ny `Code.gs` til Apps Script
3. Tilføj `Utilities.gs` (ny fil)
4. Tilføj `Tests.gs` (valgfrit, ny fil)
5. Opdater `appsscript.json` (valgfrit)
6. Refresh Google Sheet
7. Kør **Setup headers (v2.2)** igen
   - Dette tilføjer nye kolonner
   - Eksisterende data bevares!

**Nye kolonner tilføjes automatisk:**
- Kolonne 4: Telefon
- Kolonne 5: Email
- Kolonne 11: Social Media (tidligere kolonne 9-10 skubbes)
- Kolonne 22: Ad Platforms

**Eksisterende data:**
- Gamle scans har tomme nye kolonner
- Re-kør scanningen for at få nye data

---

## Version Naming

Format: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes (manual migration required)
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes only

**Examples:**
- `2.1.0` → `2.2.0`: New features (telefon, email, social)
- `2.2.0` → `2.2.1`: Bug fix (CVR regex fix)
- `2.2.0` → `3.0.0`: Breaking change (sheet structure change)

---

## Support

For spørgsmål eller bugs:
1. Check [README.md](README.md) troubleshooting
2. Check [SETUP.md](SETUP.md) installation guide
3. Kør test suite: `runAllTests()` i `Tests.gs`
4. Kontakt udviklingsteam

---

_Maintained by AutoUncle Development Team_
