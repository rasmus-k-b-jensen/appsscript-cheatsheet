# AutoUncle Sales Cheat Sheet - Google Apps Script

Et Google Sheets-baseret værktøj til at scanne og analysere potentielle bilforhandler-kunders hjemmesider.

## 🚀 Features

### Data Extraction
- ✅ **CVR-nummer** (5 forskellige patterns)
- ✅ **Telefonnummer** (danske formater)
- ✅ **Email** (prioriterer info@, kontakt@, salg@)
- ✅ **Domæne** og normaliseret URL

### Marketing & Analytics Detection
- ✅ **Google Analytics 4** (GA4 IDs)
- ✅ **Google Tag Manager** (GTM IDs)
- ✅ **Meta Pixel** (Facebook Pixel - 3 patterns)
- ✅ **Google Ads** (AW conversion tags)
- ✅ **CMP/Cookie vendors** (Cookiebot, OneTrust, etc.)

### Competitor Intelligence
- ✅ Bilbasen, Biltorvet, AutoProff
- ✅ DBA Biler, Autogade, Carfind
- ✅ AutoScout24, Mobile.de
- ✅ AutoUncle

### Social Media & Advertising
- ✅ Facebook, Instagram, LinkedIn, YouTube, Twitter/X, TikTok
- ✅ LinkedIn Ads, JobIndex, Microsoft Ads, TikTok Ads

### AI-Powered Insights
- ✅ Gemini AI briefing (dansk)
- ✅ 2 observationer + 2 risici/åbninger + 3 spørgsmål

### Automation Features
- ✅ Scans op til 5 relevante sider pr. website
- ✅ Rate limiting (500ms mellem requests)
- ✅ Proff.dk søgelink generation
- ✅ Batch processing

## 📋 Installation

### 1. Opret Google Sheet
1. Opret et nyt Google Sheet
2. Gå til **Extensions → Apps Script**
3. Kopiér disse filer fra repo:
   - `Code.gs`
   - `Setup.gs` ✨ NY - Interaktiv setup
   - `Utilities.gs` (valgfrit)
   - `Tests.gs` (valgfrit)

### 2. Opsætning (One-Click)
1. I Google Sheet: **Cheat Sheet MVP → 🚀 Komplet Setup**
2. Følg dialogen:
   - Opretter automatisk "Leads" sheet
   - Guider dig gennem API key setup

### 3. Gemini AI (Sikker Setup)
**Ny metode (anbefalet):**
1. Få API key fra https://aistudio.google.com/app/apikey
2. **Cheat Sheet MVP → 🤖 Gemini AI Setup → Setup API Key**
3. Indsæt key i dialogen
4. Test med **Test API Key**

**Alternativ (manuel):**
1. Apps Script: **Project Settings → Script Properties**
2. Tilføj property:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** din API key

## 🎯 Brug

> **💡 Se [QUICKSTART.md](QUICKSTART.md) for 3-minutters guide!**

### Tilføj URLs
I "Leads" sheet, kolonne A - tilføj kunders hjemmesider:
```
bilhuset.dk
https://www.autohaus-dk.dk
biler-online.com
```

### Kør analyse

**Enkeltvis / flere valgte rækker:**
1. Marker række(r) med URL
2. **Cheat Sheet MVP → Run MVP (selected rows)**

**Alle rækker:**
- **Cheat Sheet MVP → Run MVP (all rows with URL)**

### Verificér Setup
- **🤖 Gemini AI → Test API Key** - Test at AI virker
- **🛠️ Utilities → Vis konfiguration** - Se nuværende setup

### Output
Scriptet udfylder automatisk alle kolonner:

| Kolonne | Beskrivelse |
|---------|------------|
| URL | Normaliseret URL |
| Domain | Domænenavn |
| CVR | CVR-nummer (best effort) |
| Telefon | Telefonnummer |
| Email | Email-adresse |
| GA4/GTM/Meta/Ads | Yes/No |
| Competitors found | Liste af fundne konkurrenter |
| Social Media | Fundne sociale platforme |
| Notes | Sales-venlige noter |
| AI Briefing | AI-genereret briefing |
| Last run | Timestamp |
| *IDs | Faktiske IDs (GA4/GTM/Meta/AW) |
| CMP/Cookie vendor | Cookie consent platform |
| Pages scanned | URLs scannet |
| Proff link | Link til Proff.dk søgning |
| Ad Platforms | Fundne annonceplatforme |

## ⚙️ Konfiguration

I `Code.gs` top:

```javascript
var SHEET_NAME = 'Leads';        // Sheet navn
var MAX_PAGES = 5;               // Max sider at scanne
var FETCH_DELAY_MS = 500;        // Pause mellem requests (ms)
```

## 🔍 Hvad scannes?

Scriptet scanner:
1. **Homepage** (altid)
2. Op til 4 relevante interne sider baseret på keywords:
   - Kontakt / Contact
   - Om os / About
   - Privacy / GDPR / Cookie
   - Handelsbetingelser / Terms

**Fallback:** Hvis ingen links matches, prøver scriptet standard paths som `/kontakt`, `/om-os`, `/privacy`, etc.

## ⚠️ Begrænsninger

### Tekniske
- ⚠️ **Kun statisk HTML** - JavaScript-rendered indhold ses ikke
- ⚠️ GTM/GA4 kan være installeret men usynlig i HTML
- ⚠️ Single-page apps (React/Vue) vil give begrænsede resultater
- ⚠️ CVR/telefon/email kræver at de er synlige i HTML

### Google Quotas
- **UrlFetchApp:** 20,000 calls/dag (gratis account)
- **Script runtime:** Max 6 min pr. execution
- **Gemini API:** Afhænger af din quota

### Best Practices
- Kør ikke 1000+ URLs på én gang (undgå rate limits)
- Brug "selected rows" til test
- Tjek "Notes" kolonne for advarsler

## 🛠️ Troubleshooting

### "Fetch error: HTTP 403/429"
- Rate limited - vent 5-10 min
- Øg `FETCH_DELAY_MS` til 1000-2000ms

### "Missing sheet: Leads"
- Kør **Setup headers** først

### "AI briefing failed"
- Tjek at `GEMINI_API_KEY` er sat korrekt
- Verificer API key på https://aistudio.google.com
- Tjek quota limits

### Ingen CVR/telefon fundet
- Tjek om data findes på "Om os" eller "Kontakt" siden
- Nogle sites har data kun i footer
- Prøv at åbne hjemmesiden manuelt

## 📊 Eksempel Output

**Input:** `bilbasen-demo.dk`

**Output:**
- CVR: 12345678
- Telefon: 12345678
- Email: info@bilbasen-demo.dk
- GA4: Yes (G-ABC123XYZ)
- GTM: Yes (GTM-ABC123)
- Meta Pixel: Yes (123456789012345)
- Competitors: Bilbasen, AutoUncle
- Social Media: Facebook, Instagram
- Notes: Both GTM and GA4 detected | Meta Pixel present
- AI Briefing: *"Virksomheden har både GTM og GA4 installeret... [osv]"*

## 🚀 Fremtidige Features (Forslag)

- [ ] LinkedIn Company info (via API)
- [ ] Website teknologi-stack (WordPress, Wix, etc.)
- [ ] SEO metrics (meta descriptions, title tags)
- [ ] Load time / performance check
- [ ] Bilantal estimat (fra hjemmeside)
- [ ] Reviews/rating aggregation
- [ ] Screenshot af homepage
- [ ] Email deliverability check

## 📝 Changelog

### v2.2 (2026-02-02)
- ✨ Tilføjet telefon & email extraction
- ✨ Forbedret CVR detection (5 patterns)
- ✨ Social media detection
- ✨ Annonceplatform detection
- ✨ Rate limiting (500ms)
- ✨ Forbedret Meta Pixel detection (3 patterns)
- ✨ Udvidet konkurrent-liste (9 platforme)
- 🐛 Opdateret kolonnenumre

### v2.1 (Original)
- ✅ Basic CVR/GA4/GTM/Meta/Ads detection
- ✅ Gemini AI briefing
- ✅ Competitor footprints

## 📄 License

MIT License - brug frit til AutoUncle sales

## 👨‍💻 Support

Ved spørgsmål eller bugs, kontakt udviklingsteam.
