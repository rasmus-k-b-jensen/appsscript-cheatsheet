# 🔐 Sikkerhedsguide - API Keys & Data

## ✅ Hvad vi har implementeret

### 1. **Sikker API Key Lagring**
- ✅ API keys gemmes i **Script Properties** (ikke i kode)
- ✅ Script Properties er krypterede og kun tilgængelige for scriptet
- ✅ Keys er ALDRIG synlige i Google Sheet
- ✅ Keys commites ALDRIG til Git (`.gitignore`)

### 2. **Interaktiv Setup**
- ✅ `setupGeminiApiKey()` - Guider bruger gennem setup
- ✅ Input validering (tjekker format)
- ✅ Advarsel hvis key ikke ser korrekt ud
- ✅ Test funktion til at verificere key virker

### 3. **Easy Management**
- ✅ `testGeminiApiKey()` - Test at key virker
- ✅ `removeGeminiApiKey()` - Fjern key sikkert
- ✅ `showCurrentConfig()` - Se om key er sat (uden at vise den)

---

## 🔒 Best Practices

### ✅ DO (Gør dette):

1. **Brug Setup.gs funktionen:**
   ```
   Cheat Sheet MVP → 🤖 Gemini AI Setup → Setup API Key
   ```

2. **Test din key efter setup:**
   ```
   Cheat Sheet MVP → 🤖 Gemini AI Setup → Test API Key
   ```

3. **Fjern key før deling:**
   ```
   Cheat Sheet MVP → 🤖 Gemini AI Setup → Fjern API Key
   ```

4. **Verificér konfiguration:**
   ```
   Cheat Sheet MVP → 🛠️ Utilities → Vis konfiguration
   ```

5. **Brug .env.example som template:**
   - Se `.env.example` for reference
   - Commit kun example-filer til Git

---

### ❌ DON'T (Undgå dette):

1. **❌ ALDRIG hardcode API keys i kode:**
   ```javascript
   // FORKERT - DEL ALDRIG!
   var GEMINI_API_KEY = 'AIzaSy...ABC123';
   ```

2. **❌ ALDRIG commit rigtige keys til Git:**
   ```bash
   # Check før commit:
   git diff
   # Hvis du ser API keys - STOP!
   ```

3. **❌ ALDRIG screenshot Script Properties:**
   - Screenshot kan lække keys
   - Del kun .env.example

4. **❌ ALDRIG del Google Sheet med keys:**
   - Fjern key først hvis du skal dele
   - Eller lav en copy uden Script Properties

5. **❌ ALDRIG log keys i console:**
   ```javascript
   // FORKERT
   Logger.log('API key: ' + apiKey);
   
   // KORREKT
   Logger.log('API key: ' + (apiKey ? 'SET' : 'NOT SET'));
   ```

---

## 🛡️ Deling & Collaboration

### Scenario 1: Del kode (ikke data)

```bash
# 1. Commit kun kode-filer
git add Code.gs Setup.gs Utilities.gs Tests.gs
git add README.md SETUP.md .gitignore .env.example
git commit -m "Initial commit"
git push

# 2. Modtager:
# - Cloner repo
# - Kopierer filer til Apps Script
# - Sætter sin egen API key op via Setup.gs
```

### Scenario 2: Del Google Sheet (med data)

**Forberedelse:**
```
1. Cheat Sheet MVP → 🤖 Gemini AI → Fjern API Key
2. Verificér: 🛠️ Utilities → Vis konfiguration
   - Skal vise: "🤖 Gemini API: ❌ Ikke sat op"
3. Nu er det sikkert at dele
```

**Efter modtager har adgang:**
```
Modtager skal:
1. Få sin egen Gemini API key
2. 🤖 Gemini AI → Setup API Key
3. Test med Test API Key
```

### Scenario 3: Team workspace

**Option A: Delt API Key (kun hvis team er trusted)**
```
1. Team lead sætter key op via Setup.gs
2. Key er delt mellem alle med edit-adgang
3. VIGTIGT: Kun giv edit-adgang til trustede
```

**Option B: Individuelle keys (anbefalet)**
```
1. Hver person laver sin egen copy af sheet
2. Hver person bruger sin egen API key
3. Data kan synkes via export/import
```

---

## 🔍 Verificér Din Sikkerhed

### Checklist før Git commit:

```bash
# 1. Check for API keys i kode
grep -r "AIzaSy" *.gs
# Skal returnere 0 resultater!

# 2. Check .gitignore virker
git status
# API keys må IKKE vises

# 3. Check .env.example er template
cat .env.example
# Skal have dummy values

# 4. Check ingen credentials
git diff --cached
# Gennemse ALLE ændringer
```

### Checklist før Sheet deling:

```
✅ Fjern API key: 🤖 Gemini AI → Fjern API Key
✅ Verificér: 🛠️ Utilities → Vis konfiguration
✅ Check Script Properties er tomme:
   Apps Script → Project Settings → Script Properties
   (skal være tom)
```

---

## 🚨 Hvad hvis key er leaked?

### 1. **Deaktivér key STRAKS:**
```
1. Gå til https://aistudio.google.com/app/apikey
2. Find din key
3. Klik "Delete" eller "Revoke"
```

### 2. **Fjern key fra alle steder:**
```
# I Google Sheet:
Cheat Sheet MVP → 🤖 Gemini AI → Fjern API Key

# I Git (hvis committed):
# Contact GitHub support for help
# Eller: Rewrite git history (advanced)
```

### 3. **Generér ny key:**
```
1. https://aistudio.google.com/app/apikey
2. Create new API key
3. Setup via 🤖 Gemini AI → Setup API Key
```

### 4. **Lær af det:**
```
- Review denne guide igen
- Dobbelttjek før næste commit
- Brug .env.example templates
```

---

## 📊 Audit Log

Google Apps Script logger automatisk:
```
Apps Script → Executions
- Se hvem har kørt scripts
- Se hvornår
- Se fejl
```

**Note:** API keys vises IKKE i execution logs hvis du bruger Script Properties korrekt.

---

## 🔐 Andre Sensitive Data

### CVR numre
- ✅ OK at gemme i sheet (offentlig data)
- ✅ OK at committe i eksempler (fiktive numre)

### Telefon & Email
- ⚠️ Persondata - vær forsigtig
- ⚠️ GDPR compliance - slet når ikke længere relevant
- ⚠️ Begræns adgang til sheet

### Gemini AI Briefings
- ⚠️ Kan indeholde forretningsfølsom info
- ⚠️ Begræns adgang til sheet
- ⚠️ Overvej at slette efter brug

---

## 📋 Compliance

### GDPR Considerations:
```
✅ Data minimering: Kun scan det nødvendige
✅ Opbevaringstid: Slet gamle data (Utilities → Slet alle data)
✅ Adgangskontrol: Begræns sheet adgang
✅ Dataudtrækning: Export til CSV funktion
⚠️ Informeret samtykke: Informér kunder hvis nødvendigt
⚠️ Data processor agreement: Google Sheets ToS
```

---

## 🛠️ Teknisk Implementation

### Hvordan Script Properties virker:

```javascript
// SIKKERT - Gem key
var props = PropertiesService.getScriptProperties();
props.setProperty('GEMINI_API_KEY', userInputKey);

// SIKKERT - Hent key
var key = props.getProperty('GEMINI_API_KEY');

// SIKKERT - Tjek om key eksisterer (uden at vise den)
var hasKey = !!props.getProperty('GEMINI_API_KEY');
Logger.log('API key: ' + (hasKey ? 'SET' : 'NOT SET'));

// SIKKERT - Fjern key
props.deleteProperty('GEMINI_API_KEY');
```

### Hvor er data gemt?

```
Script Properties:
- Gemt på Google's servere (krypteret)
- Kun tilgængelig for dette script
- Ikke synlig i Sheet
- Ikke inkluderet i export/copy

Sheet Data:
- Synlig for alle med adgang
- Inkluderet i export/copy
- Backup'ed af Google
```

---

## ✅ Du er sikker hvis:

- [x] API keys er i Script Properties (ikke kode)
- [x] `.gitignore` inkluderer sensitive filer
- [x] Du bruger Setup.gs til key management
- [x] Du fjerner keys før deling
- [x] Du verificerer konfiguration regelmæssigt
- [x] Du aldrig committer keys til Git
- [x] Du begrænser sheet adgang
- [x] Du sletter gamle persondata

---

**Følg denne guide og dine API keys er sikre! 🔒**
