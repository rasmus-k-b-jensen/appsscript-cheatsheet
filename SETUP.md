# Setup Guide - AutoUncle Sales Cheat Sheet

## 🚀 Hurtig Installation (5 minutter)

### Trin 1: Opret Google Sheet
1. Gå til [Google Sheets](https://sheets.google.com)
2. Klik **Blank** (tom arbejdsmappe)
3. Omdøb til f.eks. "AutoUncle Sales Leads"

### Trin 2: Åbn Apps Script Editor
1. I menuen: **Extensions → Apps Script**
2. Du ser nu Apps Script editoren med en `Code.gs` fil

### Trin 3: Kopiér Kode
1. **Slet** al eksisterende kode i `Code.gs`
2. **Kopiér** indhold fra `Code.gs` i dette repo
3. **Indsæt** i Apps Script editoren
4. Klik **diskette-ikonet** eller `Ctrl+S` for at gemme

### Trin 4: Tilføj Utilities (valgfrit men anbefalet)
1. Klik **+** ved "Files" → **Script**
2. Navngiv den `Utilities`
3. Kopiér indhold fra `Utilities.gs`
4. Gem (`Ctrl+S`)

### Trin 5: Tilføj Tests (valgfrit)
1. Klik **+** ved "Files" → **Script**
2. Navngiv den `Tests`
3. Kopiér indhold fra `Tests.gs`
4. Gem (`Ctrl+S`)

### Trin 6: Opdater appsscript.json (valgfrit)
1. I venstre sidebar: klik **⚙️ Project Settings**
2. Under "General settings", aktiver **"Show 'appsscript.json' manifest file"**
3. Gå tilbage til Editor, åbn `appsscript.json`
4. Erstat med indhold fra `appsscript.json` i dette repo
5. Gem

### Trin 7: Første Kørsel - Autorisation
1. I Apps Script editor: vælg funktionen `setupHeaders` fra dropdown
2. Klik **Run** (▶️)
3. Du får en **Authorization required** dialog:
   - Klik **Review permissions**
   - Vælg din Google konto
   - Klik **Advanced** → **Go to [project name] (unsafe)**
   - Klik **Allow**
4. Nu er scriptet autoriseret!

### Trin 8: Setup Headers i Google Sheet
1. Gå tilbage til dit Google Sheet (refresh siden)
2. Du ser nu menuen **"Cheat Sheet MVP"** i toppen
3. Klik **Cheat Sheet MVP → Setup headers (v2.2)**
4. Et nyt sheet "Leads" oprettes med alle kolonner!

---

## ✅ Du er klar!

Test det:
1. Indsæt en URL i kolonne A, række 2 (f.eks. `bilbasen.dk`)
2. Marker rækken
3. **Cheat Sheet MVP → Run MVP (selected rows)**
4. Vent 5-30 sekunder
5. Se data blive udfyldt!

---

## 🔑 (Valgfrit) Gemini AI Setup

### Få API Key
1. Gå til https://aistudio.google.com/app/apikey
2. Log ind med Google
3. Klik **Create API key**
4. Kopiér nøglen

### Tilføj til Script
1. I Apps Script editor: **⚙️ Project Settings**
2. Scroll ned til **Script Properties**
3. Klik **Add script property**
   - **Property:** `GEMINI_API_KEY`
   - **Value:** din kopierede API key
4. Klik **Save script properties**

Nu genereres AI briefings automatisk!

---

## 🧪 Kør Tests (valgfrit)

Hvis du tilføjede `Tests.gs`:

1. I Apps Script editor: vælg `runAllTests` fra dropdown
2. Klik **Run** (▶️)
3. Åbn **View → Logs** (eller `Ctrl+Enter`)
4. Se test resultater

Forventet output:
```
✓ CVR Extraction
✓ Phone Extraction
✓ Email Extraction
✓ Meta Pixel Extraction
✓ GA4/GTM Extraction
✓ Competitor Detection
✓ Social Media Detection
✓ URL Helpers

Total: 8 passed, 0 failed
🎉 ALL TESTS PASSED!
```

---

## 📱 Menu Oversigt

Efter setup har du disse menu-punkter:

### Cheat Sheet MVP
- **Setup headers (v2.2)** - Opret/genopret kolonne headers
- **Run MVP (selected rows)** - Kør på markerede rækker
- **Run MVP (all rows with URL)** - Kør på alle rækker med URL

### 📊 Analytics
- **Tracking statistik** - Se % med GA4, GTM, Meta, etc.
- **Konkurrent analyse** - Hvilke konkurrenter bruges mest?

### 🔍 Data Quality
- **Highlight rækker uden CVR** - Marker rækker uden CVR røde
- **Flag manglende kontaktinfo** - Marker rækker uden tlf/email orange
- **Find dubletter** - Find samme domæne flere gange

### 🛠️ Utilities
- **Export til CSV (log)** - Eksportér data til CSV (i logs)
- **Slet alle data** - Slet alle rækker (bevar headers)

---

## 🐛 Troubleshooting

### "Missing sheet: Leads"
**Løsning:** Kør **Setup headers (v2.2)** først

### "Authorization required" kommer igen
**Løsning:** Normal - godkend hver gang du ændrer kode

### "Exception: Service invoked too many times"
**Løsning:** Google har daglige limits. Vent til næste dag eller:
- Øg `FETCH_DELAY_MS` til 1000-2000ms
- Kør færre rækker ad gangen

### "Fetch error: HTTP 403"
**Løsning:** Websitet blokerer dit script. Prøv igen senere.

### "AI briefing failed"
**Løsning:** 
1. Tjek at `GEMINI_API_KEY` er sat korrekt
2. Verificer API key på https://aistudio.google.com
3. Tjek om du har nået quota-limit

### Ingen data findes
**Løsning:**
- Nogle websites har data kun synligt i JavaScript
- Prøv at åbne "Pages scanned" URLs manuelt for at verificere
- CVR/telefon er ofte i footer eller "Om os"

---

## 💡 Pro Tips

### Performance
- Kør ikke 100+ URLs på én gang - start med 5-10
- Brug "selected rows" til test/debug
- `FETCH_DELAY_MS = 500` er god balance

### Data Quality
- Kør **Data Quality → Find dubletter** før stor batch
- Kør **Analytics → Tracking statistik** efter batch
- Brug **Highlight rækker uden CVR** til at finde problematiske sider

### Workflow
1. Tilføj 10-20 URLs
2. Kør "selected rows" på første 2-3 (test)
3. Hvis OK, kør "all rows"
4. Kør Analytics for indsigt
5. Kør Data Quality checks

---

## 🔒 Sikkerhed & Privacy

### Hvad sendes til Google?
- URLs du scanner (via UrlFetchApp)
- Data til Gemini AI (hvis aktiveret)

### Hvad gemmes?
- Alt data er kun i dit Google Sheet
- Ingen central database
- Du ejer dine data 100%

### API Keys
- Gem **ALDRIG** API keys i selve koden
- Brug altid Script Properties
- Del aldrig dit sheet med uvedkommende hvis det har API key

---

## 📞 Næste Skridt

1. **Test med 5 URLs** - Verificer det virker
2. **Tilføj 50-100 leads** - Start batch processing
3. **Kør Analytics** - Se mønstre
4. **Eksportér CSV** - Brug i CRM/etc.

God scanning! 🚀
