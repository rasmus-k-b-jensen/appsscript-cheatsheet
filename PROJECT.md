# 📊 Project Overview - AutoUncle Sales Cheat Sheet

## Projekt Struktur

```
appsscriptcheatsheet/
│
├── 📄 CORE FILES (Upload til Apps Script)
│   ├── Code.gs              Main logic - scanning & extraction
│   ├── Setup.gs             Interactive setup & API key management
│   ├── Utilities.gs         Analytics & data quality tools
│   └── Tests.gs             Test suite (valgfrit)
│
├── 📚 DOCUMENTATION
│   ├── README.md            Hovedfil - features & overview
│   ├── QUICKSTART.md        3-minutters setup guide ⭐ START HER
│   ├── SETUP.md             Detaljeret installation
│   ├── ROADMAP.md           Fremtidige features (16 forslag)
│   ├── CHANGELOG.md         Versionhistorik
│   ├── EXAMPLES.md          Use case eksempler
│   └── SECURITY.md          🔐 Sikkerhedsguide (API keys)
│
├── 🔧 CONFIG
│   ├── appsscript.json      Apps Script manifest
│   ├── .gitignore           Git ignore patterns
│   └── .env.example         API key template (IKKE rigtige keys!)
│
└── 📜 LICENSE               MIT License

```

---

## Fil Beskrivelser

### Code.gs (498 linjer)
**Formål:** Hovedlogik for web scanning

**Funktioner:**
- `onOpen()` - Menu setup
- `setupHeaders()` - Opret kolonner
- `runMvpForSelection()` / `runMvpForAll()` - Kør scanning
- `scanWebsite_()` - Crawler op til 5 sider
- `extractCvr_()` - CVR extraction (5 patterns)
- `extractPhone_()` - Telefon extraction
- `extractEmail_()` - Email extraction
- `detectCompetitors_()` - Konkurrent detection
- `detectSocialMedia_()` - Social media detection
- `detectAdPlatforms_()` - Annonceplatform detection
- `detectCmpVendors_()` - Cookie vendor detection
- `generateBriefingGemini_()` - AI briefing via Gemini

**Dependencies:** Ingen eksterne

---

### Setup.gs (301 linjer) ✨ NY
**Formål:** Sikker API key management & interactive setup

**Funktioner:**
- `setupGeminiApiKey()` - Interaktiv API key setup
- `removeGeminiApiKey()` - Fjern API key
- `testGeminiApiKey()` - Verificér API virker
- `showCurrentConfig()` - Vis nuværende setup
- `completeSetup()` - One-click komplet setup

**Security:**
- Input validation
- Warnings for invalid keys
- Secure storage i Script Properties
- Never logs actual key value

---

### Utilities.gs (321 linjer)
**Formål:** Analytics & data quality værktøjer

**Funktioner:**
- `analyzeTrackingStats()` - % med GA4/GTM/Meta/Ads
- `analyzeCompetitors()` - Hvilke konkurrenter bruges?
- `highlightMissingCVR()` - Markér rækker uden CVR røde
- `flagMissingContactInfo()` - Markér uden tlf/email orange
- `findDuplicateDomains()` - Find dubletter
- `exportToCSV()` - Eksportér til CSV (i logs)
- `clearAllData()` - Reset sheet (bevar headers)

**Dependencies:** Code.gs (bruger helper funktioner)

---

### Tests.gs (288 linjer)
**Formål:** Unit tests for all extraction logic

**Test suites:**
- `testCvrExtraction()` - 7 CVR patterns
- `testPhoneExtraction()` - 6 telefon formats
- `testEmailExtraction()` - 5 email cases
- `testMetaPixelExtraction()` - 3 pixel patterns
- `testGA4GTMExtraction()` - ID extraction
- `testCompetitorDetection()` - Pattern matching
- `testSocialMediaDetection()` - Social platforms
- `testUrlHelpers()` - URL normalization
- `runAllTests()` - Kør alle tests

**Usage:** Kør `runAllTests()` i Apps Script editor → View Logs

---

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Google Sheet                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ Leads Sheet                                     │    │
│  │ ┌─────┬────────┬─────┬─────┬─────┬──────┐     │    │
│  │ │ URL │ Domain │ CVR │ ... │ ... │ ...  │     │    │
│  │ ├─────┼────────┼─────┼─────┼─────┼──────┤     │    │
│  │ │ ex..│        │     │     │     │      │     │    │
│  │ └─────┴────────┴─────┴─────┴─────┴──────┘     │    │
│  └────────────────────────────────────────────────┘    │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   runMvpForRow_()    │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   scanWebsite_()     │
         │  - Fetch homepage    │
         │  - Extract links     │
         │  - Fetch 4 more pages│
         └──────────┬───────────┘
                    │
        ┌───────────┴───────────────┐
        │                           │
        ▼                           ▼
┌───────────────┐         ┌─────────────────┐
│ Extraction    │         │ Detection       │
│ - extractCvr_ │         │ - Competitors   │
│ - extractPh.. │         │ - Social Media  │
│ - extractEm.. │         │ - Ad Platforms  │
└───────┬───────┘         └────────┬────────┘
        │                          │
        └────────────┬─────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Gemini AI (optional) │
          │ - Generate briefing  │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Write to Sheet      │
          │  - All 22 columns    │
          └──────────────────────┘
```

---

## Teknisk Stack

### Platform
- **Google Apps Script** (JavaScript ES5)
- **Google Sheets** (data storage)
- **UrlFetchApp** (HTTP requests)
- **PropertiesService** (API key storage)

### External APIs
- **Gemini 2.0 Flash** (AI briefing) - Optional
  - Endpoint: `generativelanguage.googleapis.com`
  - Authentication: API key

### Dependencies
- None! Pure Apps Script

---

## Quotas & Limits

### Google Apps Script (Free tier)

| Resource | Limit | Notes |
|----------|-------|-------|
| Script runtime | 6 min/execution | Auto-timeout |
| UrlFetchApp calls | 20,000/day | ~4000 websites/dag |
| Concurrent executions | 30 | For multiple users |
| Property store | 500 KB | Plenty for keys |

### Gemini API (Free tier)

| Resource | Limit | Notes |
|----------|-------|-------|
| Requests | 15 RPM | Rate limiting |
| Tokens | 1M tokens/day | ~5000 briefings |

### Estimat: Hvor mange leads kan du scanne?

```
20,000 UrlFetchApp calls/dag ÷ 5 sider/lead = ~4000 leads/dag

Men realistisk med:
- Rate limiting (500ms delay)
- Fejl/retry
- Gemini API calls

= ~500-1000 leads/dag (sikkert)
```

---

## Performance

### Gennemsnitstider

| Scenario | Tid | Notes |
|----------|-----|-------|
| 1 lead (5 sider) | 3-5 sek | Inkl. rate limiting |
| 10 leads | 30-50 sek | Parallel umuligt |
| 100 leads | 5-8 min | Max runtime: 6 min |
| 1000 leads | 50-80 min | Kør i batches! |

### Optimering tips

```javascript
// 1. Reducer MAX_PAGES for hurtigere scanning
var MAX_PAGES = 3; // Før: 5

// 2. Reducer FETCH_DELAY_MS (risk: blocking)
var FETCH_DELAY_MS = 300; // Før: 500

// 3. Skip AI briefing for test
// Kommenter ud i generateBriefingGemini_()

// 4. Brug "selected rows" i stedet for "all rows"
```

---

## Version History

| Version | Dato | Features |
|---------|------|----------|
| 2.1.0 | Jan 2026 | Original (CVR, GA4, GTM, Meta, competitors) |
| 2.2.0 | Feb 2, 2026 | ✅ Telefon, email, social media, ad platforms, security setup |

Se [CHANGELOG.md](CHANGELOG.md) for detaljer.

---

## Bidrag & Udvikling

### Workflow

1. **Feature request**
   - Tjek [ROADMAP.md](ROADMAP.md)
   - Åbn issue med forslag

2. **Development**
   - Branch fra `main`
   - Udvikl feature
   - Kør `runAllTests()` 
   - Opdater tests hvis nødvendigt

3. **Testing**
   - Test i live Google Sheet
   - Verificér alle 22 kolonner
   - Test edge cases

4. **Documentation**
   - Opdater README.md
   - Opdater CHANGELOG.md
   - Tilføj eksempler til EXAMPLES.md

5. **Pull Request**
   - Clear beskrivelse
   - Screenshots hvis UI ændringer
   - Test resultater

---

## Support & Kontakt

### Troubleshooting Priority

1. **Check [QUICKSTART.md](QUICKSTART.md)** - Quick fixes
2. **Check [SETUP.md](SETUP.md)** - Installation issues  
3. **Check [SECURITY.md](SECURITY.md)** - API key issues
4. **Kør Tests** - `runAllTests()` for at finde bugs
5. **Check Logs** - Apps Script → Executions
6. **Kontakt team** - Hvis ovenstående ikke hjælper

### Common Issues & Quick Fixes

| Problem | Fix |
|---------|-----|
| "Ingen API key" | 🤖 Gemini AI → Setup API Key |
| "Fetch error 403" | Wait 10 min (rate limited) |
| "Missing sheet" | Setup headers først |
| "Test fails" | Check Code.gs er uploaded korrekt |
| "Slow performance" | Reducer MAX_PAGES eller FETCH_DELAY_MS |

---

## Licenses & Credits

### License
MIT License - Se [LICENSE](LICENSE)

### Dependencies
- Google Apps Script (Google)
- Gemini AI (Google)

### Authors
AutoUncle Development Team

### Contributors
Se GitHub contributors

---

**For mere info, start med [QUICKSTART.md](QUICKSTART.md)! 🚀**
