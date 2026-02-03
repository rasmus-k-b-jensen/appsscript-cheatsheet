# Fremtidige Features & Forbedringer

## 🚀 Priority 1 - High Impact

### 1. LinkedIn Company Data Integration
**Status:** Ikke implementeret  
**Effort:** Medium  
**Value:** High

Brug LinkedIn's API til at hente:
- Antal ansatte
- Branche
- Vækst-rate
- Company page URL
- Antal følgere

**Implementation:**
- Kræver LinkedIn API credentials
- Rate limits: 100 requests/dag (gratis tier)
- Gem i nye kolonner: "LinkedIn URL", "Employees", "Industry"

---

### 2. Website Technology Stack Detection
**Status:** Ikke implementeret  
**Effort:** Low  
**Value:** High

Detect CMS og frameworks:
- WordPress, Wix, Shopify, Webflow
- React, Vue, Angular
- Server (nginx, Apache, IIS)

**Implementation:**
```javascript
function detectTechnology_(html, headers) {
  var tech = [];
  
  // WordPress
  if (html.indexOf('/wp-content/') !== -1) tech.push('WordPress');
  
  // Wix
  if (html.indexOf('wix.com') !== -1) tech.push('Wix');
  
  // React
  if (html.indexOf('react') !== -1 || html.indexOf('__REACT') !== -1) tech.push('React');
  
  // Server fra headers
  var server = headers['Server'] || '';
  if (server) tech.push('Server: ' + server);
  
  return tech;
}
```

**Ny kolonne:** "Technology Stack"

---

### 3. Email Deliverability Check
**Status:** Ikke implementeret  
**Effort:** Medium  
**Value:** Medium

Verificer om fundne emails er gyldige:
- DNS MX record check
- SMTP verification (uden at sende email)

**Implementation:**
- Brug external API (f.eks. Hunter.io, NeverBounce)
- Eller DNS lookup via Google Apps Script (begrænset)

**Ny kolonne:** "Email Status" (Valid / Invalid / Unknown)

---

### 4. SEO Quick Check
**Status:** Ikke implementeret  
**Effort:** Low  
**Value:** Medium

Udtræk SEO metrics:
- `<title>` tag
- `<meta name="description">`
- `<h1>` count
- Canonical URL
- Robots meta tag

**Implementation:**
```javascript
function extractSEO_(html) {
  var seo = {};
  
  var titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  seo.title = titleMatch ? titleMatch[1] : '';
  
  var descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  seo.description = descMatch ? descMatch[1] : '';
  
  var h1s = html.match(/<h1[^>]*>/gi);
  seo.h1Count = h1s ? h1s.length : 0;
  
  return seo;
}
```

**Nye kolonner:** "Title Tag", "Meta Description", "H1 Count"

---

## 📊 Priority 2 - Nice to Have

### 5. Bilantal Estimat
**Status:** Ikke implementeret  
**Effort:** Medium  
**Value:** Medium

Forsøg at estimere antal biler til salg:
- Regex: "XXX biler til salg"
- Count af `/bil/` URLs på siden
- Structured data (numberOfItems)

**Notes:**
- Upræcist - kun estimat
- Afhænger af site struktur

---

### 6. Reviews/Rating Aggregation
**Status:** Ikke implementeret  
**Effort:** High  
**Value:** Low

Hent Trustpilot/Google Reviews rating:
- Trustpilot API
- Google Places API
- Structured data (aggregateRating)

**Challenges:**
- Kræver API credentials
- Matching virksomhed til reviews (CVR-based?)
- Rate limits

---

### 7. Screenshot af Homepage
**Status:** Ikke implementeret (ikke muligt i Apps Script)  
**Effort:** N/A  
**Value:** Low

Apps Script kan ikke tage screenshots. Alternativer:
- Brug external service (f.eks. urlbox.io, screenshotapi.net)
- Gem screenshot URL i kolonne

---

### 8. Load Time / Performance
**Status:** Ikke implementeret  
**Effort:** Low  
**Value:** Low

Mål load time for homepage:

```javascript
function measureLoadTime_(url) {
  var start = new Date().getTime();
  UrlFetchApp.fetch(url);
  var end = new Date().getTime();
  return (end - start) + 'ms';
}
```

**Ny kolonne:** "Load Time"

**Notes:**
- Måler kun første byte (TTFB)
- Ikke JS render time

---

## 🛠️ Priority 3 - Technical Improvements

### 9. Caching Layer
**Status:** Ikke implementeret  
**Effort:** Medium  
**Value:** Medium

Cache HTML responses i CacheService:
- Undgå re-fetch af samme URL
- 6 timers cache
- Reducer API calls

```javascript
function fetchHtmlCached_(url) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get(url);
  if (cached) return cached;
  
  var html = fetchHtml_(url);
  cache.put(url, html, 21600); // 6 timer
  return html;
}
```

---

### 10. Parallel Fetching
**Status:** Ikke implementeret  
**Effort:** High  
**Value:** Medium

Fetch multiple pages parallelt med UrlFetchApp.fetchAll():

```javascript
var requests = internalLinks.map(function(u) {
  return {
    url: u,
    muteHttpExceptions: true,
    headers: { 'User-Agent': '...' }
  };
});

var responses = UrlFetchApp.fetchAll(requests);
```

**Benefit:** 2-3x hurtigere scanning

---

### 11. Better Error Handling & Logging
**Status:** Delvist implementeret  
**Effort:** Low  
**Value:** High

- Structured logging (JSON)
- Error kategorisering (network, parse, quota)
- Retry logic (3 forsøg med exponential backoff)

---

### 12. Progress Indicator
**Status:** Ikke implementeret  
**Effort:** Medium  
**Value:** Medium

Real-time progress i Google Sheet:
- Opdater "Status" kolonne under scanning
- "Scanning..." → "Done" eller "Error"

**Challenge:** Apps Script UI opdateringer er langsomme

---

## 🔮 Priority 4 - Advanced Features

### 13. Multi-Language Support
**Status:** Kun DK  
**Effort:** Medium  
**Value:** Low (for AutoUncle DK)

Tilføj support for:
- SE (svenska)
- NO (norsk)
- DE (tysk)

Kræver:
- Lokaliserede keywords
- Forskellige CVR-formater (org.nr, etc.)
- Sprog-detection

---

### 14. Historical Tracking
**Status:** Ikke implementeret  
**Effort:** High  
**Value:** Medium

Track changes over tid:
- Ny sheet "History"
- Log hver scanning med timestamp
- Visualiser changes (CVR tilføjet, tags ændret)

---

### 15. AI Lead Scoring
**Status:** Ikke implementeret  
**Effort:** High  
**Value:** High

Brug Gemini til at score leads 1-10:
- Baseret på digital modenhed
- Konkurrent-footprint
- Tracking setup kvalitet

```javascript
function scoreLead_(result) {
  var score = 0;
  
  // Har GA4: +2
  if (result.ga4Ids.length) score += 2;
  
  // Har Meta Pixel: +2
  if (result.metaPixelIds.length) score += 2;
  
  // Bruger konkurrenter: +3
  if (result.competitors.length) score += 3;
  
  // Har kontaktinfo: +1
  if (result.phone || result.email) score += 1;
  
  // Har CMP (GDPR-compliant): +2
  if (result.cmpVendors.length) score += 2;
  
  return Math.min(score, 10);
}
```

**Ny kolonne:** "Lead Score (1-10)"

---

### 16. Zapier/Make.com Integration
**Status:** Ikke implementeret  
**Effort:** Medium  
**Value:** High

Webhook integration:
- Send data til CRM automatisk
- Trigger email til sales ved high-score lead

```javascript
function sendWebhook_(lead) {
  var webhook = 'https://hooks.zapier.com/...';
  
  UrlFetchApp.fetch(webhook, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(lead)
  });
}
```

---

## 💡 Implementation Priorities

### Q1 2026
- [x] v2.2: Telefon/email extraction ✅
- [x] v2.2: Social media detection ✅
- [x] v2.2: Forbedret Meta Pixel ✅
- [ ] v2.3: Technology Stack Detection
- [ ] v2.3: SEO Quick Check

### Q2 2026
- [ ] v2.4: LinkedIn Integration
- [ ] v2.4: Lead Scoring
- [ ] v2.5: Caching Layer
- [ ] v2.5: Parallel Fetching

### Q3 2026
- [ ] v3.0: Historical Tracking
- [ ] v3.0: Zapier Integration

---

## 🤝 Bidrag

Har du forslag til nye features? Åbn en issue eller pull request!

**Prioriterings-kriterier:**
1. **Value:** Hvor meget hjælper det sales?
2. **Effort:** Hvor lang tid tager det?
3. **Data availability:** Kan vi få data uden scraping?
4. **Quotas:** Passer det inden for Google's limits?
