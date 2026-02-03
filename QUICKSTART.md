# ­ƒÜÇ Quick Start Guide

## 3 Minutters Setup

### 1´©ÅÔâú Kopi├®r Filer til Apps Script

1. ├àbn Google Sheets ÔåÆ **Extensions ÔåÆ Apps Script**
2. Slet default kode i `Code.gs`
3. Kopi├®r disse filer fra repo:

| Apps Script Fil | Fra repo fil |
|----------------|--------------|
| `Code.gs` | Code.gs |
| `Setup.gs` | Setup.gs |
| `Utilities.gs` | Utilities.gs |
| `Tests.gs` | Tests.gs _(valgfrit)_ |

4. Gem alle filer (`Ctrl+S`)

---

### 2´©ÅÔâú Autoriser & Setup

1. **F├©rste k├©rsel** - Apps Script editor:
   - V├ªlg funktion: `completeSetup`
   - Klik **Run** ÔûÂ´©Å
   - **Godkend tilladelser** (Review permissions ÔåÆ Allow)

2. **G├Ñ til Google Sheet** (refresh siden)
   - Du ser nu menuen **"Cheat Sheet MVP"**

3. **K├©r setup:**
   - **Cheat Sheet MVP ÔåÆ ­ƒÜÇ Komplet Setup**
   - F├©lg dialogen:
     - Ô£à Opretter "Leads" sheet
     - ­ƒñû Inds├ªt din Gemini API key n├Ñr prompted
       - F├Ñ din API key fra: https://aistudio.google.com/app/apikey
       - API key starter med: `AIzaSy...`

---

### 3´©ÅÔâú Test Det!

1. I "Leads" sheet, kolonne A, r├ªkke 2:
   ```
   bilbasen.dk
   ```

2. Marker r├ªkken

3. **Cheat Sheet MVP ÔåÆ Run MVP (selected rows)**

4. Vent 5-15 sekunder

5. ­ƒÄë **Se data blive udfyldt!**

---

## ­ƒôï Menu Oversigt

Efter setup har du:

### ­ƒÜÇ Komplet Setup
- One-click setup (kun f├©rste gang)

### ­ƒñû Gemini AI Setup
- **Setup API Key** - Indtast API key sikkert
- **Test API Key** - Verific├®r at det virker
- **Fjern API Key** - Slet API key

### ­ƒôè Analytics
- **Tracking statistik** - Se % med GA4/GTM/Meta
- **Konkurrent analyse** - Hvilke platforme?

### ­ƒöì Data Quality
- **Highlight uden CVR** - Marker r├©de
- **Flag manglende kontakt** - Marker orange
- **Find dubletter** - Samme dom├ªne

### ­ƒøá´©Å Utilities
- **Vis konfiguration** - Se nuv├ªrende setup
- **Export til CSV** - Eksport├®r data
- **Slet alle data** - Reset sheet

---

## Ô£à Verific├®r Setup

K├©r disse checks:

### 1. Test Gemini API
**Cheat Sheet MVP ÔåÆ ­ƒñû Gemini AI Setup ÔåÆ Test API Key**

Forventet: "Success! Ô£à Gemini API virker!"

### 2. Vis Konfiguration
**Cheat Sheet MVP ÔåÆ ­ƒøá´©Å Utilities ÔåÆ Vis konfiguration**

Forventet:
```
­ƒôè Sheet navn: Leads
­ƒôä Max sider: 5
ÔÅ▒´©Å Fetch delay: 500ms
­ƒñû Gemini API: Ô£à Aktiveret
```

### 3. (Valgfrit) K├©r Tests
Apps Script editor:
- V├ªlg: `runAllTests`
- Run ÔûÂ´©Å
- View ÔåÆ Logs

Forventet: "­ƒÄë ALL TESTS PASSED!"

---

## ­ƒÄ» F├©rste Batch

1. **Tilf├©j 5 test-URLs:**
   ```
   bilbasen.dk
   biltorvet.dk
   autogade.dk
   dba.dk
   autouncle.dk
   ```

2. **K├©r MVP:**
   - Marker alle 5 r├ªkker
   - **Run MVP (selected rows)**
   - Vent ~30 sekunder

3. **Se resultater:**
   - Alle 22 kolonner udfyldt
   - AI briefings genereret
   - Noter tilf├©jet

4. **K├©r Analytics:**
   - **Analytics ÔåÆ Tracking statistik**
   - Se procentdele

---

## ­ƒöÉ Sikkerhed

### Ô£à Din API Key er sikker fordi:
1. Gemt i **Script Properties** (ikke i kode)
2. Ikke synlig i Google Sheet
3. Ikke committed til Git (`.gitignore`)

### ÔÜá´©Å ALDRIG:
- ÔØî Del dit Google Sheet med uvedkommende
- ÔØî Screenshot Script Properties
- ÔØî Commit API key til Git

### ­ƒøí´©Å For at dele scriptet:
1. Fjern API key f├©rst: **­ƒñû Gemini AI ÔåÆ Fjern API Key**
2. Del sheet eller eksport├®r kode
3. Modtager s├ªtter sin egen API key op

---

## ­ƒÉø Troubleshooting

### "Ingen API key sat"
**Fix:** K├©r **­ƒñû Gemini AI ÔåÆ Setup API Key**

### "API test fejler"
**Fix:** 
1. Verific├®r key p├Ñ https://aistudio.google.com
2. Tjek quota limits
3. Pr├©v at fjerne og re-add key

### "Fetch error: HTTP 429"
**Fix:** Rate limited - ├©g `FETCH_DELAY_MS` i Code.gs til 1000-2000ms

---

## ­ƒô× N├ªste Skridt

1. Ô£à Test med 5 URLs
2. Ô£à Verific├®r AI briefings genereres
3. Ô£à K├©r Analytics
4. ­ƒÜÇ Batch process 50-100 leads!

---

**Du er klar! Happy scanning! ­ƒÄë**
