# AutoUncle Sales Cheat Sheet - Eksempler

Dette dokument viser konkrete eksempler på output fra scriptet.

---

## Eksempel 1: Bilforhandler med fuld tracking

**Input:**
```
URL: https://www.eksempel-biler.dk
```

**Output:**

| Kolonne | Værdi |
|---------|-------|
| URL | https://www.eksempel-biler.dk |
| Domain | www.eksempel-biler.dk |
| CVR (guess) | 12345678 |
| Telefon | 12345678 |
| Email | info@eksempel-biler.dk |
| GA4 | Yes |
| GTM | Yes |
| Meta Pixel | Yes |
| Google Ads tag | Yes |
| Competitors found | Bilbasen, AutoUncle |
| Social Media | Facebook, Instagram, LinkedIn |
| Notes | Both GTM and GA4 detected \| Meta Pixel present \| Google Ads tag present \| Social media presence: Facebook, Instagram, LinkedIn |
| AI Briefing | **Observationer:** Virksomheden har fuld tracking-stack installeret (GTM+GA4+Meta+Ads), hvilket indikerer digital modenhed. Aktiv på sociale medier med Facebook og Instagram. **Risici/Åbninger:** Bruger konkurrenter Bilbasen og AutoUncle - mulighed for at pitch bedre løsning. GTM+GA4 kan indikere double tagging issues. **Spørgsmål:** 1) Hvordan måler I ROI på jeres digitale markedsføring? 2) Bruger I data fra Bilbasen aktivt? 3) Har I udfordringer med tracking setup? |
| Last run | 02-02-2026 14:23:15 |
| GA4 IDs | G-ABC123XYZ |
| GTM IDs | GTM-DEF456 |
| Meta Pixel IDs | 123456789012345 |
| Google Ads AW IDs | AW-987654321 |
| CMP/Cookie vendor | Cookiebot |
| Pages scanned | https://www.eksempel-biler.dk \| https://www.eksempel-biler.dk/kontakt \| https://www.eksempel-biler.dk/om-os |
| Proff link (search) | https://www.proff.dk/branchesøg?q=12345678 |
| Ad Platforms | LinkedIn Ads |

---

## Eksempel 2: Mindre forhandler uden tracking

**Input:**
```
URL: lille-bilhus.dk
```

**Output:**

| Kolonne | Værdi |
|---------|-------|
| URL | https://lille-bilhus.dk |
| Domain | lille-bilhus.dk |
| CVR (guess) | 87654321 |
| Telefon | 87654321 |
| Email | kontakt@lille-bilhus.dk |
| GA4 | No |
| GTM | No |
| Meta Pixel | No |
| Google Ads tag | No |
| Competitors found | Bilbasen |
| Social Media | Facebook |
| Notes | No GA4/GTM IDs detected in scanned HTML (could still be loaded via JS) \| Competitor footprints found \| Social media presence: Facebook |
| AI Briefing | **Observationer:** Virksomheden mangler moderne tracking (ingen GA4/GTM/Meta). Kun Facebook som social medie. **Risici/Åbninger:** Stor mulighed - ingen konkurrerende analytics tools installeret. Begrænset digital tilstedeværelse tyder på lavt digitalt modenhed. **Spørgsmål:** 1) Hvordan tracker I besøgende på hjemmesiden i dag? 2) Annoncerer I digitalt? 3) Har I overvejet at måle ROI på jeres Bilbasen-annoncer? |
| Last run | 02-02-2026 14:25:42 |
| GA4 IDs | - |
| GTM IDs | - |
| Meta Pixel IDs | - |
| Google Ads AW IDs | - |
| CMP/Cookie vendor | - |
| Pages scanned | https://lille-bilhus.dk \| https://lille-bilhus.dk/kontakt |
| Proff link (search) | https://www.proff.dk/branchesøg?q=87654321 |
| Ad Platforms | - |

---

## Eksempel 3: Forhandler uden CVR synlig

**Input:**
```
URL: https://www.premium-cars.dk
```

**Output:**

| Kolonne | Værdi |
|---------|-------|
| URL | https://www.premium-cars.dk |
| Domain | www.premium-cars.dk |
| CVR (guess) | - |
| Telefon | 11223344 |
| Email | salg@premium-cars.dk |
| GA4 | Yes |
| GTM | No |
| Meta Pixel | Yes |
| Google Ads tag | Yes |
| Competitors found | AutoScout24, Mobile.de |
| Social Media | Facebook, Instagram, YouTube |
| Notes | No GA4/GTM IDs detected... \| Meta Pixel present \| Google Ads tag present \| Competitor footprints found \| Social media presence: Facebook, Instagram, YouTube \| No contact info found in HTML |
| AI Briefing | **Observationer:** Aktiv international tilstedeværelse (AutoScout24, Mobile.de). Stærk social media med YouTube - sandsynligvis video-content. **Risici/Åbninger:** Mangler CVR synligt på site (compliance issue?). Har GA4+Meta+Ads men ikke GTM - mulig fragmenteret setup. **Spørgsmål:** 1) Sælger I også internationalt? 2) Hvordan håndterer I tracking på tværs af platforme? 3) Hvem administrerer jeres digitale marketing? |
| Last run | 02-02-2026 14:27:11 |
| GA4 IDs | G-XYZ789ABC |
| GTM IDs | - |
| Meta Pixel IDs | 998877665544332 |
| Google Ads AW IDs | AW-112233445 |
| CMP/Cookie vendor | OneTrust |
| Pages scanned | https://www.premium-cars.dk \| https://www.premium-cars.dk/about \| https://www.premium-cars.dk/privacy |
| Proff link (search) | https://www.proff.dk/branchesøg?q=www.premium-cars.dk |
| Ad Platforms | - |

---

## Eksempel 4: Wix/Template site (begrænset data)

**Input:**
```
URL: bilhuset-nord.wixsite.com/biler
```

**Output:**

| Kolonne | Værdi |
|---------|-------|
| URL | https://bilhuset-nord.wixsite.com/biler |
| Domain | bilhuset-nord.wixsite.com |
| CVR (guess) | - |
| Telefon | - |
| Email | - |
| GA4 | No |
| GTM | No |
| Meta Pixel | No |
| Google Ads tag | No |
| Competitors found | - |
| Social Media | - |
| Notes | No GA4/GTM IDs detected in scanned HTML (could still be loaded via JS) \| No contact info found in HTML |
| AI Briefing | **Observationer:** Wix-baseret site uden custom tracking. Ingen synlig kontaktinfo eller CVR. **Risici/Åbninger:** Meget lavt digitalt modenhed - stor educations-mulighed. Sandsynligvis lille virksomhed/nystarter. **Spørgsmål:** 1) Hvor længe har I haft virksomheden? 2) Hvordan får I kunder i dag? 3) Har I overvejet at investere i digital markedsføring? |
| Last run | 02-02-2026 14:29:33 |
| GA4 IDs | - |
| GTM IDs | - |
| Meta Pixel IDs | - |
| Google Ads AW IDs | - |
| CMP/Cookie vendor | - |
| Pages scanned | https://bilhuset-nord.wixsite.com/biler |
| Proff link (search) | https://www.proff.dk/branchesøg?q=bilhuset-nord.wixsite.com |
| Ad Platforms | - |

---

## Eksempel 5: Error case

**Input:**
```
URL: https://ikke-eksisterende-site-123.dk
```

**Output:**

| Kolonne | Værdi |
|---------|-------|
| URL | https://ikke-eksisterende-site-123.dk |
| Domain | ikke-eksisterende-site-123.dk |
| CVR (guess) | - |
| ... | - |
| Notes | Fetch error: HTTP 404 |
| ... | - |
| Last run | 02-02-2026 14:31:05 |

---

## Batch Processing Eksempel

**Input (5 URLs):**
```
bilbasen.dk
biltorvet.dk
https://www.autogade.dk
dba.dk
autouncle.dk
```

**Kørselstid:** ~15-25 sekunder (5 URLs × 3 sider hver × 500ms delay)

**Analytics Output (efter kørsel):**

### Tracking Statistik
```
Total kunder: 5

GA4: 3 (60.0%)
GTM: 4 (80.0%)
Meta Pixel: 2 (40.0%)
Google Ads: 3 (60.0%)
CMP/Cookie: 5 (100.0%)

Ingen tracking: 0 (0.0%)
Alle 4 tags: 2 (40.0%)
```

### Konkurrent Analyse
```
Bilbasen: 3 kunder
AutoProff: 2 kunder
DBA Biler: 1 kunde
AutoUncle: 1 kunde
```

---

## Notes Field - Typiske Eksempler

### Positiv digital modenhed
```
"Both GTM and GA4 detected | Meta Pixel present | Google Ads tag present | CMP/Cookie vendor detected: Cookiebot | Social media presence: Facebook, Instagram, LinkedIn"
```

### Mulighed for forbedring
```
"GTM detected, but GA4 ID not visible in HTML (GA4 may be configured via GTM) | No contact info found in HTML | Competitor footprints found"
```

### Ingen tracking
```
"No GA4/GTM IDs detected in scanned HTML (could still be loaded via JS) | No contact info found in HTML"
```

### Advanced setup
```
"Both GTM and GA4 detected (check for double tagging) | Meta Pixel present | Google Ads tag present | CMP/Cookie vendor detected: OneTrust | Social media presence: Facebook, Instagram, YouTube, LinkedIn | Ad platforms detected: LinkedIn Ads, JobIndex"
```

---

## AI Briefing - Eksempler

### Høj modenhed
```
**Observationer:** Virksomheden har fuld tracking-stack (GTM+GA4+Meta+Ads) og stærk social media tilstedeværelse. Bruger premium CMP (OneTrust).

**Risici/Åbninger:** Potentiel double tagging mellem GTM og GA4. Bruger konkurrenter Bilbasen og AutoUncle - mulighed for optimering.

**Spørgsmål:** 
1) Hvordan måler I ROI på tværs af kanaler?
2) Har I dedicated marketing analytics team?
3) Hvilke udfordringer ser I med jeres nuværende tracking setup?
```

### Lav modenhed
```
**Observationer:** Mangler moderne tracking tools. Begrænset digital tilstedeværelse (kun Facebook).

**Risici/Åbninger:** Stor mulighed - ingen konkurrerende analytics installeret. CVR synlig indikerer etableret virksomhed.

**Spørgsmål:**
1) Hvordan tracker I besøgende i dag?
2) Annoncerer I digitalt?
3) Har I overvejet at måle effekten af jeres digitale indsats?
```

---

## Utilities Examples

### Highlight Missing CVR
Før kørsel: Normal sheet  
Efter kørsel: 2 rækker markeret **rød** (ingen CVR)

### Flag Missing Contact Info
Før kørsel: Normal sheet  
Efter kørsel: 3 rækker markeret **orange** (ingen telefon eller email)

### Find Duplicates
```
Alert: "Fundet 2 dubletter:

Række 5: bilbasen.dk (også i række 2)
Række 8: autouncle.dk (også i række 6)"
```

---

_Disse eksempler er baseret på typiske use cases for AutoUncle sales team._
