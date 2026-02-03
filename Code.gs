/*******************************
 * AutoUncle Sales Cheat Sheet - Google Sheets + Apps Script
 * MVP v2.2 (DK)
 *
 * Features:
 * - Reads URLs from sheet "Leads" column A
 * - Scans up to 5 internal HTML pages (homepage + relevant links)
 * - Extracts CVR, telefon, email (best effort)
 * - Detects GA4/GTM/Meta Pixel/Google Ads tags + extracts IDs
 * - Detects CMP/Cookie vendor (best effort)
 * - Detects competitor footprints (Bilbasen, Biltorvet, AutoProff, DBA, etc.)
 * - Detects social media presence (Facebook, Instagram, LinkedIn, YouTube)
 * - Detects advertising platforms (JobIndex, LinkedIn Ads, etc.)
 * - Generates Proff search link (no scraping)
 * - Optional: AI briefing via Gemini (set GEMINI_API_KEY in Script Properties)
 * - Rate limiting to avoid being blocked
 *
 * Important limitations:
 * - This is STATIC HTML fetch (no JS rendering). GTM/GA4 can be installed but not visible in HTML.
 *******************************/

var SHEET_NAME = 'Leads';
var MAX_PAGES = 5;
var FETCH_DELAY_MS = 500; // Rate limiting: pause between requests

// Exclusions to avoid wasting crawl budget on assets and noise
var EXCLUDED_EXT_RE = /\.(css|js|png|jpe?g|gif|svg|webp|woff2?|ttf|eot|pdf|xml|json|rss)(\?|$)/i;
var EXCLUDED_PATH_RE = /(\/wp-content\/|\/wp-includes\/|\/feed\/|\/comments\/|\/tag\/|\/category\/)/i;

// Competitor footprints for bilforhandlere
var COMPETITOR_PATTERNS = [
  { name: 'Bilbasen', patterns: ['bilbasen.dk', 'bilbasen'] },
  { name: 'Biltorvet', patterns: ['biltorvet.dk', 'biltorvet'] },
  { name: 'AutoProff', patterns: ['autoproff', 'autoproff.dk'] },
  { name: 'DBA Biler', patterns: ['dba.dk/biler', 'dba.dk'] },
  { name: 'Autogade', patterns: ['autogade.dk', 'autogade'] },
  { name: 'Carfind', patterns: ['carfind.dk', 'carfind'] },
  { name: 'AutoScout24', patterns: ['autoscout24.dk', 'autoscout24'] },
  { name: 'Mobile.de', patterns: ['mobile.de'] },
  { name: 'AutoUncle', patterns: ['autouncle.dk', 'autouncle'] }
];

// CMP/Cookie vendors (best effort)
var CMP_PATTERNS = [
  { name: 'Cookiebot', patterns: ['consent.cookiebot.com', 'cookiebot.com'] },
  { name: 'OneTrust', patterns: ['onetrust.com', 'cdn.cookielaw.org', 'optanon'] },
  { name: 'Usercentrics', patterns: ['usercentrics.eu', 'usercentrics.com'] },
  { name: 'Cookie Information', patterns: ['cookieinformation.com'] },
  { name: 'Didomi', patterns: ['didomi.io', 'didomi'] },
  { name: 'Consentmanager', patterns: ['consentmanager.net'] },
  { name: 'Iubenda', patterns: ['iubenda.com'] }
];

// Keywords used to pick relevant internal pages
var PRIORITY_LINK_KEYWORDS = [
  'kontakt', 'contact',
  'om', 'om-os', 'about',
  'privatliv', 'privacy', 'persondata', 'gdpr',
  'cookie', 'cookies', 'samtykke', 'consent',
  'handelsbetingelser', 'betingelser', 'terms',
  'impressum' // sometimes present even on DK sites
];

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Cheat Sheet MVP')
    .addItem('🚀 Komplet Setup (første gang)', 'completeSetup')
    .addItem('Setup headers (v2.2)', 'setupHeaders')
    .addSeparator()
    .addItem('Run MVP (selected rows)', 'runMvpForSelection')
    .addItem('Run MVP (all rows with URL)', 'runMvpForAll')
    .addSeparator()
    .addItem('🤖 Generate AI Briefing (selected)', 'generateAiBriefingForSelection')
    .addItem('📊 Create Sales Pitch (selected)', 'createSalesPitchPresentation')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Gemini AI Setup')
      .addItem('Setup API Key', 'setupGeminiApiKey')
      .addItem('Test API Key', 'testGeminiApiKey')
      .addItem('Fjern API Key', 'removeGeminiApiKey'))
    .addSubMenu(ui.createMenu('📊 Analytics')
      .addItem('Tracking statistik', 'analyzeTrackingStats')
      .addItem('Konkurrent analyse', 'analyzeCompetitors'))
    .addSubMenu(ui.createMenu('🔍 Data Quality')
      .addItem('Highlight rækker uden CVR', 'highlightMissingCVR')
      .addItem('Flag manglende kontaktinfo', 'flagMissingContactInfo')
      .addItem('Find dubletter', 'findDuplicateDomains'))
    .addSubMenu(ui.createMenu('🛠️ Utilities')
      .addItem('Vis konfiguration', 'showCurrentConfig')
      .addItem('Export til CSV (log)', 'exportToCSV')
      .addItem('Slet alle data', 'clearAllData'))
    .addToUi();
}

function setupHeaders() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    var headers = [
      'URL','Domain','CVR (guess)','Telefon','Email','GA4','GTM','Meta Pixel','Google Ads tag',
      'Competitors found','Social Media','Notes','AI Briefing','Last run',
      'GA4 IDs','GTM IDs','Meta Pixel IDs','Google Ads AW IDs','CMP/Cookie vendor',
      'Pages scanned','Proff link','Ad Platforms','Proff Omsætning','Proff Resultat','Proff Ansatte'
    ];

    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    
    SpreadsheetApp.getUi().alert(
      'Setup færdig!',
      'Sheet "' + SHEET_NAME + '" er oprettet med ' + headers.length + ' kolonner.\n\n' +
      'Tilføj URLs i kolonne A og kør "Run MVP".',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    Logger.log('Headers setup complete: ' + headers.length + ' columns');
    
  } catch (e) {
    SpreadsheetApp.getUi().alert(
      'Fejl',
      'Kunne ikke oprette sheet: ' + e.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    Logger.log('setupHeaders error: ' + e.message);
  }
}

function runMvpForSelection() {
  try {
    var sh = getLeadsSheet_();
    var range = sh.getActiveRange();
    
    if (!range) {
      SpreadsheetApp.getUi().alert(
        'Ingen valg',
        'Marker én eller flere rækker først.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }

    var startRow = range.getRow();
    var numRows = range.getNumRows();
    var processed = 0;

    for (var r = startRow; r < startRow + numRows; r++) {
      if (r === 1) continue; // Skip header
      var url = (sh.getRange(r, 1).getValue() || '').toString().trim();
      if (url) {
        runMvpForRow_(sh, r);
        processed++;
      }
    }
    
    SpreadsheetApp.getUi().alert(
      'Færdig!',
      'Processede ' + processed + ' række(r).',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (e) {
    SpreadsheetApp.getUi().alert(
      'Fejl',
      'Der opstod en fejl: ' + e.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    Logger.log('runMvpForSelection error: ' + e.message);
  }
}

function runMvpForAll() {
  try {
    var sh = getLeadsSheet_();
    var lastRow = sh.getLastRow();
    
    if (lastRow < 2) {
      SpreadsheetApp.getUi().alert(
        'Ingen data',
        'Der er ingen rækker at processere. Tilføj URLs i kolonne A først.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
    
    // Count URLs først
    var urlCount = 0;
    for (var r = 2; r <= lastRow; r++) {
      var url = (sh.getRange(r, 1).getValue() || '').toString().trim();
      if (url) urlCount++;
    }
    
    if (urlCount === 0) {
      SpreadsheetApp.getUi().alert(
        'Ingen URLs',
        'Ingen URLs fundet i kolonne A. Tilføj URLs først.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }
    
    // Confirm hvis mange URLs
    if (urlCount > 50) {
      var response = SpreadsheetApp.getUi().alert(
        'Stor batch',
        'Du er ved at processere ' + urlCount + ' URLs. Dette kan tage lang tid.\n\nFortsæt?',
        SpreadsheetApp.getUi().ButtonSet.YES_NO
      );
      
      if (response !== SpreadsheetApp.getUi().Button.YES) {
        return;
      }
    }

    var processed = 0;
    var errors = 0;
    
    for (var r = 2; r <= lastRow; r++) {
      var url = (sh.getRange(r, 1).getValue() || '').toString().trim();
      if (url) {
        try {
          runMvpForRow_(sh, r);
          processed++;
        } catch (e) {
          errors++;
          Logger.log('Error processing row ' + r + ': ' + e.message);
          // Continue med næste række
        }
      }
    }
    
    var msg = 'Processede ' + processed + ' række(r).';
    if (errors > 0) {
      msg += '\n\nFejl i ' + errors + ' række(r). Tjek "Notes" kolonnen.';
    }
    
    SpreadsheetApp.getUi().alert('Færdig!', msg, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (e) {
    SpreadsheetApp.getUi().alert(
      'Fejl',
      'Der opstod en kritisk fejl: ' + e.message + '\n\nTjek at sheetet er sat op korrekt.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    Logger.log('runMvpForAll error: ' + e.message);
    Logger.log('Stack: ' + e.stack);
  }
}

function runMvpForRow_(sh, row) {
  try {
    var url = (sh.getRange(row, 1).getValue() || '').toString().trim();
    if (!url) return;

    var normalized = normalizeUrl_(url);
    sh.getRange(row, 1).setValue(normalized);

    var domain = extractDomain_(normalized);
    sh.getRange(row, 2).setValue(domain);

    var result;
    try {
      result = scanWebsite_(normalized, MAX_PAGES);
    } catch (e) {
      var errorMsg = 'Fetch error: ' + (e && e.message ? e.message : e);
      sh.getRange(row, 12).setValue(errorMsg); // Notes kolonne
      sh.getRange(row, 14).setValue(new Date()); // Last run
      Logger.log('Row ' + row + ' scan error: ' + errorMsg);
      return;
    }

  // Prepare all data for batch write (columns 3-22, excluding 13 and 21 which are set separately)
  var ga4Status = result.ga4Ids.length ? 'Yes' : (result.ga4LikelyViaJs ? 'Likely' : 'No');
  var ga4IdsDisplay = result.ga4Ids.length ? result.ga4Ids.join(', ') : (result.ga4LikelyViaJs ? 'Manual review needed' : '');
  
  // Batch write: columns 3-12 (CVR through Notes)
  var batchData1 = [[
    result.cvr || '',                           // C: CVR
    result.phone || '',                         // D: Phone
    result.email || '',                         // E: Email
    ga4Status,                                  // F: GA4 (Yes/Likely/No)
    result.gtmIds.length ? 'Yes' : 'No',       // G: GTM
    result.metaPixelIds.length ? 'Yes' : 'No', // H: Meta Pixel
    result.awIds.length ? 'Yes' : 'No',        // I: Google Ads
    result.competitors.join(', '),              // J: Competitors
    result.socialMedia.join(', '),              // K: Social Media
    result.notes.join(' | ')                    // L: Notes
  ]];
  sh.getRange(row, 3, 1, 10).setValues(batchData1);
  
  // Batch write: columns 14-20, 22 (Last run through Ad Platforms, skip AI Briefing col 13 and Proff URL col 21)
  var batchData2 = [[
    new Date(),                                 // N: Last run
    ga4IdsDisplay,                              // O: GA4 IDs
    result.gtmIds.join(', '),                  // P: GTM IDs
    result.metaPixelIds.join(', '),            // Q: Meta Pixel IDs
    result.awIds.join(', '),                   // R: Google Ads IDs
    result.cmpVendors.join(', '),              // S: CMP
    result.pagesScanned.join(' | ')            // T: Pages scanned
  ]];
  sh.getRange(row, 14, 1, 7).setValues(batchData2);
  
  // Column V (22): Ad Platforms (separate because we skip column U/21)
  sh.getRange(row, 22).setValue(result.adPlatforms.join(', '));
  
  // Proff.dk financial data (optional - can be slow)
  var proffData = scrapeProffData_(result.cvr, domain);
  sh.getRange(row, 21).setValue(proffData.proffUrl);
  
  // Set financial data as text to preserve Danish formatting (e.g., "307.000")
  if (proffData.revenue) {
    sh.getRange(row, 23).setValue(proffData.revenue).setNumberFormat('@STRING@');
  }
  if (proffData.profit) {
    sh.getRange(row, 24).setValue(proffData.profit).setNumberFormat('@STRING@');
  }
  if (proffData.employees) {
    sh.getRange(row, 25).setValue(proffData.employees);
  }
  
  // Update headers with accounting year if available
  if (proffData.year && row === 2) {
    updateProffHeaders_(sh, proffData.year);
  }
  
  } catch (e) {
    // Generel error handling for hele funktionen
    var errorMsg = 'Error: ' + (e.message || e);
    try {
      sh.getRange(row, 12).setValue(errorMsg); // Notes
      sh.getRange(row, 14).setValue(new Date()); // Last run
    } catch (e2) {
      Logger.log('Cannot write error to row ' + row + ': ' + e2.message);
    }
    Logger.log('runMvpForRow_ error at row ' + row + ': ' + e.message);
    Logger.log('Stack: ' + e.stack);
    throw e; // Re-throw så parent function kan håndtere det
  }
}

/**
 * Generate AI briefing for selected rows
 */
function generateAiBriefingForSelection() {
  try {
    var sh = getLeadsSheet_();
    var range = sh.getActiveRange();
    
    if (!range) {
      SpreadsheetApp.getUi().alert(
        'Ingen valg',
        'Marker én eller flere rækker først.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }

    var startRow = range.getRow();
    var numRows = range.getNumRows();
    var processed = 0;
    var errors = 0;

    for (var r = startRow; r < startRow + numRows; r++) {
      if (r === 1) continue; // Skip header
      
      var url = (sh.getRange(r, 1).getValue() || '').toString().trim();
      if (!url) continue;
      
      try {
        generateAiBriefingForRow_(sh, r);
        processed++;
        Utilities.sleep(1000); // Rate limiting between AI calls
      } catch (e) {
        errors++;
        sh.getRange(r, 13).setValue('AI briefing failed: ' + e.message);
        Logger.log('AI briefing error row ' + r + ': ' + e.message);
      }
    }
    
    SpreadsheetApp.getUi().alert(
      'Færdig!',
      'AI briefings genereret for ' + processed + ' række(r).' +
      (errors > 0 ? '\n\nFejl i ' + errors + ' række(r).' : ''),
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (e) {
    SpreadsheetApp.getUi().alert(
      'Fejl',
      'Der opstod en fejl: ' + e.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    Logger.log('generateAiBriefingForSelection error: ' + e.message);
  }
}

function generateAiBriefingForRow_(sh, row) {
  var url = (sh.getRange(row, 1).getValue() || '').toString().trim();
  if (!url) return;
  
  // Read existing scan data from sheet
  var result = {
    cvr: sh.getRange(row, 3).getValue() || '',
    phone: sh.getRange(row, 4).getValue() || '',
    email: sh.getRange(row, 5).getValue() || '',
    ga4Ids: (sh.getRange(row, 15).getValue() || '').toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean),
    gtmIds: (sh.getRange(row, 16).getValue() || '').toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean),
    metaPixelIds: (sh.getRange(row, 17).getValue() || '').toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean),
    competitors: (sh.getRange(row, 10).getValue() || '').toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean),
    socialMedia: (sh.getRange(row, 11).getValue() || '').toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean)
  };
  
  var briefing = generateBriefingGemini_(url, result);
  sh.getRange(row, 13).setValue(briefing);
}

function scanWebsite_(url, maxPages) {
  var baseUrl = getBaseUrl_(url);

  // Homepage (must be HTML)
  var homepageHtml = fetchHtml_(url);
  var pages = [{ url: url, html: homepageHtml }];

  // Extract up to (maxPages - 1) relevant internal links from homepage
  var internalLinks = extractRelevantInternalLinks_(homepageHtml, baseUrl, maxPages - 1);

  // Fetch internal pages (HTML only) with rate limiting
  for (var i = 0; i < internalLinks.length; i++) {
    var u = internalLinks[i];
    try {
      Utilities.sleep(FETCH_DELAY_MS); // Rate limiting
      var h = fetchHtml_(u);
      pages.push({ url: u, html: h });
    } catch (e) {
      // ignore this page and continue
    }
  }

  // Aggregate HTML across pages
  var allHtml = '';
  var pagesScanned = [];
  for (var p = 0; p < pages.length; p++) {
    allHtml += '\n\n<!-- PAGE: ' + pages[p].url + ' -->\n' + pages[p].html;
    pagesScanned.push(pages[p].url);
  }

  // Extract IDs and signals
  var cvr = extractCvr_(allHtml);
  var phone = extractPhone_(allHtml);
  var email = extractEmail_(allHtml);

  // Improved GA4 detection (optimized with combined patterns)
  var ga4Ids = [];
  
  // Single mega-pattern: Combine most common GA4 patterns
  var ga4MegaPattern = /(?:\bG-[A-Z0-9]{10}\b|gtag\s*\(\s*['"]config['"]\s*,\s*['"](G-[A-Z0-9]{10})['"]|googletagmanager\.com\/gtag\/js\?id=(G-[A-Z0-9]{10})|["'](?:measurementId|trackingId)["']\s*:\s*["'](G-[A-Z0-9]{10})["']|ga\s*\(\s*['"]create['"]\s*,\s*['"](G-[A-Z0-9]{10})['"'])/gi;
  
  var matches = allHtml.match(ga4MegaPattern) || [];
  for (var i = 0; i < matches.length; i++) {
    // Extract the G-XXXXXXXXXX part from each match
    var idMatch = matches[i].match(/G-[A-Z0-9]{10}/);
    if (idMatch) ga4Ids.push(idMatch[0]);
  }
  
  // Additional patterns that need special handling
  // Pattern: dataLayer config
  ga4Ids = ga4Ids.concat(extractAll_(allHtml, /dataLayer\.push\s*\(\s*\{[^}]*['"]?(G-[A-Z0-9]{10})['"]?[^}]*\}\s*\)/gi, 1));
  
  // Pattern: URL encoded (decode first, with error handling)
  try {
    var decoded = decodeURIComponent(allHtml);
    ga4Ids = ga4Ids.concat(extractAll_(decoded, /[?&]id=(G-[A-Z0-9]{10})(?:&|$|["\s])/gi, 1));
  } catch (e) {
    Logger.log('Could not decode URI for GA4 search: ' + e);
  }
  
  // Filter out false positives (must be ALL UPPERCASE after G-)
  ga4Ids = ga4Ids.filter(function(id) {
    var suffix = id.substring(2);
    return suffix === suffix.toUpperCase() && /^[A-Z0-9]{10}$/.test(suffix);
  });
  ga4Ids = unique_(ga4Ids);
  
  var gtmIds = unique_(extractAll_(allHtml, /\bGTM-[A-Z0-9]{4,}\b/g));

  // Improved Meta Pixel detection (multiple patterns)
  var metaPixelIds = [];
  metaPixelIds = metaPixelIds.concat(extractAll_(allHtml, /fbq\(\s*['"]init['"]\s*,\s*['"]?(\d{8,20})['"]?\s*\)/g, 1));
  metaPixelIds = metaPixelIds.concat(extractAll_(allHtml, /facebook\.com\/tr\?id=(\d{8,20})/g, 1));
  metaPixelIds = metaPixelIds.concat(extractAll_(allHtml, /"pixelId"\s*:\s*"(\d{8,20})"/g, 1));
  metaPixelIds = unique_(metaPixelIds);
  
  var awIds = unique_(extractAll_(allHtml, /\bAW-\d{6,}\b/g));

  var cmpVendors = unique_(detectCmpVendors_(allHtml));
  var competitors = uniqueKeepOrder_(detectCompetitors_(allHtml));
  var socialMedia = unique_(detectSocialMedia_(allHtml));
  var adPlatforms = unique_(detectAdPlatforms_(allHtml));

  // Detect if GA4 is likely loaded via JavaScript (even if no ID found in static HTML)
  var ga4LikelyViaJs = false;
  if (ga4Ids.length === 0) {
    // Check for indicators that GA4 might be loaded dynamically
    var hasGtagScript = /googletagmanager\.com\/gtag\/js/i.test(allHtml);
    var hasDataLayer = /dataLayer/i.test(allHtml);
    var hasGtagFunction = /gtag\s*\(/i.test(allHtml);
    var hasAnalyticsReference = /google-analytics|googleanalytics|analytics\.js/i.test(allHtml);
    
    // If GTM + CMP or gtag references exist, GA4 is likely loaded after consent
    if ((gtmIds.length && cmpVendors.length) || hasGtagScript || (hasDataLayer && hasGtagFunction) || hasAnalyticsReference) {
      ga4LikelyViaJs = true;
    }
  }

  // Notes (sales-friendly)
  var notes = [];
  if (gtmIds.length && !ga4Ids.length && !ga4LikelyViaJs) {
    notes.push('GTM detected, but GA4 ID not visible in HTML (GA4 may be configured via GTM).');
  } else if (ga4LikelyViaJs) {
    notes.push('GA4 likely loaded via JavaScript/GTM after consent - manual review recommended.');
  } else if (!gtmIds.length && !ga4Ids.length) {
    notes.push('No GA4/GTM IDs detected in scanned HTML (could still be loaded via JS).');
  }
  if (gtmIds.length && ga4Ids.length) notes.push('Both GTM and GA4 detected (check for double tagging).');
  if (metaPixelIds.length) notes.push('Meta Pixel present (paid/retargeting signal).');
  if (awIds.length) notes.push('Google Ads tag present (paid/remarketing signal).');
  if (cmpVendors.length) notes.push('CMP/Cookie vendor detected: ' + cmpVendors.join(', '));
  if (competitors.length) notes.push('Competitor footprints found.');
  if (socialMedia.length) notes.push('Social media presence: ' + socialMedia.join(', '));
  if (adPlatforms.length) notes.push('Ad platforms detected: ' + adPlatforms.join(', '));
  if (!phone && !email) notes.push('No contact info found in HTML.');

  return {
    cvr: cvr,
    phone: phone,
    email: email,
    ga4Ids: ga4Ids,
    ga4LikelyViaJs: ga4LikelyViaJs,
    gtmIds: gtmIds,
    metaPixelIds: metaPixelIds,
    awIds: awIds,
    cmpVendors: cmpVendors,
    competitors: competitors,
    socialMedia: socialMedia,
    adPlatforms: adPlatforms,
    pagesScanned: pagesScanned,
    notes: notes
  };
}

/**
 * Fetch HTML only. Reject non-HTML responses to avoid scanning CSS/feeds/etc.
 */
function fetchHtml_(url) {
  var resp = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AutoUncleCheatSheetMVP/2.1)'
    }
  });

  var code = resp.getResponseCode();
  if (code < 200 || code >= 400) throw new Error('HTTP ' + code);

  var headers = resp.getHeaders();
  var ct = (headers && headers['Content-Type']) ? headers['Content-Type'].toString() : '';
  if (ct && ct.toLowerCase().indexOf('text/html') === -1) {
    throw new Error('Non-HTML Content-Type: ' + ct);
  }

  var html = resp.getContentText();
  if (!html) throw new Error('Empty response');
  return html;
}

/**
 * Extract CVR number from HTML using confidence-based scoring system.
 * @param {string} html - The HTML content to search
 * @return {string} The most confident CVR number found, or empty string if none valid
 */
function extractCvr_(html) {
  var candidates = [];
  
  // Strategy: Collect all potential CVR numbers with confidence scores
  
  // HIGHEST PRIORITY: Structured data (Schema.org, JSON-LD)
  var schemaMatches = extractAll_(html, /"(?:taxID|vatID|identifier)"\s*:\s*"(\d{8})"/gi, 1);
  for (var i = 0; i < schemaMatches.length; i++) {
    candidates.push({ cvr: schemaMatches[i], score: 100 });
  }
  
  // HIGH PRIORITY: Explicit CVR labels
  // Pattern: "CVR: 12345678", "CVR-nr: 12345678", "CVR.nr. 12345678"
  var explicitMatches = extractAll_(html, /CVR[.\-\s]*(?:nr|nummer)?[.\-:\s]*(\d{8})/gi, 1);
  for (var i = 0; i < explicitMatches.length; i++) {
    candidates.push({ cvr: explicitMatches[i], score: 90 });
  }
  
  // MEDIUM-HIGH: SE/CVR format (EU VAT format)
  var seMatches = extractAll_(html, /(?:SE|DK)[\/\s\-]*(?:CVR)?[\/\s\-]*(\d{8})/gi, 1);
  for (var i = 0; i < seMatches.length; i++) {
    candidates.push({ cvr: seMatches[i], score: 85 });
  }
  
  // MEDIUM: CVR in structured HTML elements (footer, address, contact sections)
  // Look for CVR in footer/contact/address contexts
  var footerSection = extractSection_(html, /<footer[^>]*>[\s\S]*?<\/footer>/i);
  var addressSection = extractSection_(html, /<address[^>]*>[\s\S]*?<\/address>/i);
  var contactSection = extractSection_(html, /<(?:div|section)[^>]*(?:contact|kontakt)[^>]*>[\s\S]{0,2000}/i);
  
  var contextualHtml = footerSection + addressSection + contactSection;
  if (contextualHtml) {
    var contextMatches = extractAll_(contextualHtml, /\b(\d{8})\b/g, 1);
    for (var i = 0; i < contextMatches.length; i++) {
      if (isValidCvrFormat_(contextMatches[i])) {
        candidates.push({ cvr: contextMatches[i], score: 70 });
      }
    }
  }
  
  // MEDIUM-LOW: CVR in external links (proff.dk, virk.dk, CVR.dk)
  var proffMatches = extractAll_(html, /proff\.dk[^"']*\/(?:virksomhed|firma)[^"']*?(\d{8})/gi, 1);
  for (var i = 0; i < proffMatches.length; i++) {
    candidates.push({ cvr: proffMatches[i], score: 80 });
  }
  
  var virkMatches = extractAll_(html, /virk\.dk[^"']*?(\d{8})/gi, 1);
  for (var i = 0; i < virkMatches.length; i++) {
    candidates.push({ cvr: virkMatches[i], score: 80 });
  }
  
  var cvrMatches = extractAll_(html, /cvr\.dk[^"']*?(\d{8})/gi, 1);
  for (var i = 0; i < cvrMatches.length; i++) {
    candidates.push({ cvr: cvrMatches[i], score: 75 });
  }
  
  // LOW: Meta tags
  var metaMatches = extractAll_(html, /<meta[^>]*content\s*=\s*['"](?:CVR[:\s]*)?([0-9]{8})['"][^>]*>/gi, 1);
  for (var i = 0; i < metaMatches.length; i++) {
    candidates.push({ cvr: metaMatches[i], score: 60 });
  }
  
  // Deduplicate and sort by score
  var seen = {};
  var unique = [];
  for (var i = 0; i < candidates.length; i++) {
    var cvr = candidates[i].cvr;
    if (!seen[cvr]) {
      seen[cvr] = candidates[i].score;
      unique.push(candidates[i]);
    } else if (candidates[i].score > seen[cvr]) {
      // Update score if higher confidence found
      seen[cvr] = candidates[i].score;
      for (var j = 0; j < unique.length; j++) {
        if (unique[j].cvr === cvr) {
          unique[j].score = candidates[i].score;
          break;
        }
      }
    }
  }
  
  // Sort by score descending
  unique.sort(function(a, b) { return b.score - a.score; });
  
  // Return highest confidence CVR that passes validation
  for (var i = 0; i < unique.length; i++) {
    if (isValidCvrFormat_(unique[i].cvr)) {
      return unique[i].cvr;
    }
  }
  
  return '';
}

/**
 * Extract a section of HTML matching a regex pattern.
 * @param {string} html - The HTML content to search
 * @param {RegExp} regex - Regular expression pattern to match
 * @return {string} The matched section or empty string
 */
function extractSection_(html, regex) {
  var match = html.match(regex);
  return match ? match[0] : '';
}

/**
 * Validate CVR number format (8 digits, not all same, not sequential).
 * @param {string} cvr - The CVR number to validate
 * @return {boolean} True if CVR passes basic validation checks
 */
function isValidCvrFormat_(cvr) {
  // Basic validation: 8 digits, not all same digit, not sequential
  if (!cvr || cvr.length !== 8) return false;
  
  // Check if all digits are the same (00000000, 11111111, etc.)
  var allSame = true;
  for (var i = 1; i < cvr.length; i++) {
    if (cvr[i] !== cvr[0]) {
      allSame = false;
      break;
    }
  }
  if (allSame) return false;
  
  // Check if it's a simple sequence (12345678)
  var isSequence = true;
  for (var i = 1; i < cvr.length; i++) {
    if (parseInt(cvr[i]) !== parseInt(cvr[i-1]) + 1) {
      isSequence = false;
      break;
    }
  }
  if (isSequence) return false;
  
  // Danish CVR numbers typically don't start with 0 (though technically possible)
  // Most real CVR numbers are between 10000000-99999999
  var num = parseInt(cvr);
  if (num < 10000000) return false;
  
  return true;
}

/**
 * Extract Danish phone number from HTML (+45 or 8-digit format).
 * @param {string} html - The HTML content to search
 * @return {string} 8-digit phone number or empty string
 */
function extractPhone_(html) {
  // Danish phone numbers: +45 XXXXXXXX or XX XX XX XX
  var patterns = [
    /(?:tel|telefon|phone)[:\s]*<?(?:\+45)?\s*([0-9]{8})/i,
    /href\s*=\s*['"]tel:(\+45)?([0-9]{8})['"]>/i,
    /\+45\s*([0-9]{2}\s*[0-9]{2}\s*[0-9]{2}\s*[0-9]{2})/,
    /(?:tlf|tel)\.?[:\s]*([0-9]{2}\s*[0-9]{2}\s*[0-9]{2}\s*[0-9]{2})/i
  ];
  
  for (var i = 0; i < patterns.length; i++) {
    var m = html.match(patterns[i]);
    if (m) {
      var num = m[m.length - 1].replace(/\s+/g, '');
      if (num.length === 8) return num;
    }
  }
  return '';
}

/**
 * Extract email address from HTML, prioritizing business emails.
 * @param {string} html - The HTML content to search
 * @return {string} Email address or empty string
 */
function extractEmail_(html) {
  // Extract email addresses (prefer business/info/kontakt emails)
  var emails = extractAll_(html, /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  
  // Filter out common noise
  var filtered = [];
  var priority = [];
  for (var i = 0; i < emails.length; i++) {
    var e = emails[i].toLowerCase();
    if (e.indexOf('@sentry.io') !== -1) continue;
    if (e.indexOf('@example.com') !== -1) continue;
    if (e.indexOf('wixpress.com') !== -1) continue;
    
    // Prioritize business emails
    if (e.indexOf('info@') === 0 || e.indexOf('kontakt@') === 0 || 
        e.indexOf('salg@') === 0 || e.indexOf('mail@') === 0) {
      priority.push(emails[i]);
    } else {
      filtered.push(emails[i]);
    }
  }
  
  if (priority.length) return priority[0];
  if (filtered.length) return filtered[0];
  return '';
}

/**
 * Extract relevant internal links from HTML (contact, privacy, about pages).
 * @param {string} html - The HTML content to search
 * @param {string} baseUrl - Base URL for resolving relative links
 * @param {number} limit - Maximum number of links to return
 * @return {string[]} Array of absolute URLs
 */
function extractRelevantInternalLinks_(html, baseUrl, limit) {
  var hrefs = extractAll_(html, /href\s*=\s*["']([^"']+)["']/gi, 1);
  var candidates = [];

  for (var i = 0; i < hrefs.length; i++) {
    var href = (hrefs[i] || '').toString().trim();
    if (!href) continue;
    if (href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0 || href.indexOf('#') === 0) continue;

    var abs = toAbsoluteUrl_(href, baseUrl);
    if (!abs) continue;
    abs = stripUrlHash_(abs);

    if (!isSameDomain_(abs, baseUrl)) continue;

    var low = abs.toLowerCase();

    // Exclude assets/noise
    if (EXCLUDED_EXT_RE.test(low)) continue;
    if (EXCLUDED_PATH_RE.test(low)) continue;

    // Only keep relevant pages
    if (matchesAnyKeyword_(low, PRIORITY_LINK_KEYWORDS)) {
      candidates.push(abs);
    }
  }

  candidates = uniqueKeepOrder_(candidates);

  // Fallback: try common good pages
  var fallbackPaths = [
    '/kontakt', '/kontakt/', '/kontakt-os', '/contact', '/contact/',
    '/om', '/om-os', '/about', '/about/',
    '/privatliv', '/privatlivspolitik', '/privacy', '/gdpr',
    '/cookie', '/cookies', '/cookiepolitik', '/samtykke',
    '/handelsbetingelser', '/betingelser', '/terms'
  ];

  for (var j = 0; j < fallbackPaths.length && candidates.length < limit; j++) {
    var u = baseUrl.replace(/\/+$/, '') + fallbackPaths[j];
    var ulow = u.toLowerCase();
    if (EXCLUDED_EXT_RE.test(ulow)) continue;
    if (EXCLUDED_PATH_RE.test(ulow)) continue;
    if (!contains_(candidates, u)) candidates.push(u);
  }

  return candidates.slice(0, limit);
}

/**
 * Detect competitor platforms mentioned in HTML.
 * @param {string} html - The HTML content to search
 * @return {string[]} Array of detected competitor names
 */
function detectCompetitors_(html) {
  var found = [];
  var lower = html.toLowerCase();

  for (var i = 0; i < COMPETITOR_PATTERNS.length; i++) {
    var c = COMPETITOR_PATTERNS[i];
    for (var j = 0; j < c.patterns.length; j++) {
      var p = c.patterns[j].toLowerCase();
      if (lower.indexOf(p) !== -1) {
        found.push(c.name);
        break;
      }
    }
  }
  return found;
}

/**
 * Detect CMP (Consent Management Platform) vendors in HTML.
 * @param {string} html - The HTML content to search
 * @return {string[]} Array of detected CMP vendor names
 */
function detectCmpVendors_(html) {
  var lower = html.toLowerCase();
  var found = [];
  for (var i = 0; i < CMP_PATTERNS.length; i++) {
    var c = CMP_PATTERNS[i];
    for (var j = 0; j < c.patterns.length; j++) {
      var p = c.patterns[j].toLowerCase();
      if (lower.indexOf(p) !== -1) {
        found.push(c.name);
        break;
      }
    }
  }
  return found;
}

/**
 * Detect social media platforms linked in HTML.
 * @param {string} html - The HTML content to search
 * @return {string[]} Array of detected social platform names
 */
function detectSocialMedia_(html) {
  var lower = html.toLowerCase();
  var found = [];
  
  var socialPatterns = [
    { name: 'Facebook', patterns: ['facebook.com/', 'fb.com/', 'fb.me/'] },
    { name: 'Instagram', patterns: ['instagram.com/'] },
    { name: 'LinkedIn', patterns: ['linkedin.com/company/', 'linkedin.com/in/'] },
    { name: 'YouTube', patterns: ['youtube.com/channel/', 'youtube.com/c/', 'youtube.com/@'] },
    { name: 'Twitter/X', patterns: ['twitter.com/', 'x.com/'] },
    { name: 'TikTok', patterns: ['tiktok.com/@'] }
  ];
  
  for (var i = 0; i < socialPatterns.length; i++) {
    var s = socialPatterns[i];
    for (var j = 0; j < s.patterns.length; j++) {
      if (lower.indexOf(s.patterns[j]) !== -1) {
        found.push(s.name);
        break;
      }
    }
  }
  return found;
}

/**
 * Detect advertising platforms used in HTML.
 * @param {string} html - The HTML content to search
 * @return {string[]} Array of detected ad platform names
 */
function detectAdPlatforms_(html) {
  var lower = html.toLowerCase();
  var found = [];
  
  var adPatterns = [
    { name: 'LinkedIn Ads', patterns: ['linkedin.com/px/', 'snap.licdn.com'] },
    { name: 'JobIndex', patterns: ['jobindex.dk', 'jobindex'] },
    { name: 'Microsoft Ads', patterns: ['bat.bing.com', 'uet/uetq'] },
    { name: 'Twitter Ads', patterns: ['static.ads-twitter.com', 'analytics.twitter.com'] },
    { name: 'TikTok Ads', patterns: ['analytics.tiktok.com', 'tiktok pixel'] }
  ];
  
  for (var i = 0; i < adPatterns.length; i++) {
    var a = adPatterns[i];
    for (var j = 0; j < a.patterns.length; j++) {
      if (lower.indexOf(a.patterns[j]) !== -1) {
        found.push(a.name);
        break;
      }
    }
  }
  return found;
}

/**
 * Optional AI briefing via Gemini.
 * Set Script Properties:
 * - GEMINI_API_KEY = your key
 *
 * Endpoint documented here:
 * https://ai.google.dev/api/generate-content
 */
function generateBriefingGemini_(url, result) {
  var props = PropertiesService.getScriptProperties();
  var key = (props.getProperty('GEMINI_API_KEY') || '').toString().trim();
  if (!key) {
    return 'AI briefing: (no GEMINI_API_KEY set)';
  }

  var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

  var prompt =
    'Skriv kort salgs-briefing på dansk (max 100 ord) til AutoUncle møde:\n' +
    'Bilforhandler: ' + url + '\n' +
    'CVR: ' + (result.cvr || '-') + ', Tlf: ' + (result.phone || '-') + ', Email: ' + (result.email || '-') + '\n' +
    'Tracking: GA4=' + (result.ga4Ids.length ? 'Ja' : 'Nej') + ', GTM=' + (result.gtmIds.length ? 'Ja' : 'Nej') + 
    ', Meta Pixel=' + (result.metaPixelIds.length ? 'Ja' : 'Nej') + '\n' +
    'Konkurrenter: ' + (result.competitors.join(', ') || '-') + '\n' +
    'Social: ' + (result.socialMedia.join(', ') || '-') + '\n\n' +
    'Lav: 2 observationer, 1 salgsåbning, 2 spørgsmål.';

  var payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { 
      temperature: 0.7, 
      maxOutputTokens: 2000
    }
  };

  var resp = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-goog-api-key': key
    },
    muteHttpExceptions: true,
    payload: JSON.stringify(payload)
  });

  var code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Gemini HTTP ' + code + ': ' + resp.getContentText());
  }

  var data = JSON.parse(resp.getContentText());
  
  // Check for safety blocks or other issues
  if (!data.candidates || data.candidates.length === 0) {
    Logger.log('Gemini returned no candidates. Full response: ' + JSON.stringify(data));
    if (data.promptFeedback && data.promptFeedback.blockReason) {
      return 'AI briefing blocked: ' + data.promptFeedback.blockReason;
    }
    return 'AI briefing: No response generated.';
  }
  
  var candidate = data.candidates[0];
  
  // Check finish reason
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    Logger.log('Gemini stopped with reason: ' + candidate.finishReason);
    Logger.log('Full candidate: ' + JSON.stringify(candidate));
    return 'AI briefing incomplete (reason: ' + candidate.finishReason + ')';
  }
  
  // Extract text
  var text = '';
  try {
    if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
      text = candidate.content.parts[0].text;
    }
  } catch (e) {
    Logger.log('Error extracting text: ' + e.message);
    Logger.log('Candidate structure: ' + JSON.stringify(candidate));
    text = '';
  }
  
  return (text || 'AI briefing: Empty response.').toString().trim();
}

/**
 * Build Proff.dk search URL from CVR or domain.
 * @param {string} cvr - CVR number (preferred, 8 digits)
 * @param {string} domain - Domain name (fallback)
 * @return {string} Proff.dk search URL or empty string
 */
function buildProffSearchLink_(cvr, domain) {
  // Proff.dk uses internal IDs in URLs, but we can create a precise search link
  // that will likely show the company as first result
  
  if (cvr && cvr.length === 8) {
    // Search by CVR number - most precise
    return 'https://www.proff.dk/branches%C3%B8g?q=' + encodeURIComponent(cvr);
  }
  
  if (domain) {
    // Fallback: Search by domain name (remove TLD and www)
    var cleanDomain = domain.replace(/^www\./, '').replace(/\.[a-z]{2,}$/i, '');
    return 'https://www.proff.dk/branches%C3%B8g?q=' + encodeURIComponent(cleanDomain);
  }
  
  return '';
}

/**
 * Scrape Proff.dk for financial data (revenue, profit, employees).
 * @param {string} cvr - CVR number for company lookup
 * @param {string} domain - Domain name (fallback if no CVR)
 * @return {Object} Object with proffUrl, revenue, profit, employees, year properties
 */
function scrapeProffData_(cvr, domain) {
  if (!cvr && !domain) {
    return { proffUrl: '', revenue: '', profit: '', employees: '' };
  }
  
  try {
    // Step 1: Search Proff.dk
    var searchUrl = buildProffSearchLink_(cvr, domain);
    Utilities.sleep(FETCH_DELAY_MS); // Rate limiting
    
    var searchResp = UrlFetchApp.fetch(searchUrl, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AutoUncleCheatSheetMVP/2.2)'
      }
    });
    
    if (searchResp.getResponseCode() !== 200) {
      Logger.log('Proff search failed with code: ' + searchResp.getResponseCode());
      return { proffUrl: searchUrl, revenue: '', profit: '', employees: '' };
    }
    
    var searchHtml = searchResp.getContentText();
    
    // Step 2: Extract ALL company links and find best match
    var allLinks = extractAll_(searchHtml, /href="(\/firma\/[^"]+)"/g, 1);
    if (!allLinks.length) {
      Logger.log('No company links found in Proff search results');
      return { proffUrl: searchUrl, revenue: '', profit: '', employees: '' };
    }
    
    // Find best matching link
    var bestLink = findBestProffMatch_(allLinks, searchHtml, cvr, domain);
    if (!bestLink) {
      Logger.log('No matching company found in Proff results');
      return { proffUrl: searchUrl, revenue: '', profit: '', employees: '' };
    }
    
    var proffUrl = 'https://www.proff.dk' + bestLink;
    
    // Step 3: Fetch company page
    Utilities.sleep(FETCH_DELAY_MS); // Rate limiting
    
    var companyResp = UrlFetchApp.fetch(proffUrl, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AutoUncleCheatSheetMVP/2.2)'
      }
    });
    
    if (companyResp.getResponseCode() !== 200) {
      Logger.log('Proff company page failed with code: ' + companyResp.getResponseCode());
      return { proffUrl: proffUrl, revenue: '', profit: '', employees: '' };
    }
    
    var companyHtml = companyResp.getContentText();
    
    // Step 4: Verify CVR on company page if we have it
    if (cvr && companyHtml.indexOf(cvr) === -1) {
      Logger.log('CVR ' + cvr + ' not found on Proff company page - wrong match');
      return { proffUrl: proffUrl, revenue: 'CVR mismatch', profit: '', employees: '' };
    }
    
    // Step 5: Extract financial data
    // Look for actual financial table/section, not random numbers
    var revenue = extractProffFinancialFromTable_(companyHtml, 'Omsætning');
    var profit = extractProffFinancialFromTable_(companyHtml, 'Resultat');
    var employees = extractProffFinancialFromTable_(companyHtml, 'Ansatte');
    
    // Extract accounting year from JSON
    var year = extractAccountingYear_(companyHtml);
    
    return { 
      proffUrl: proffUrl, 
      revenue: revenue, 
      profit: profit, 
      employees: employees,
      year: year
    };
    
  } catch (e) {
    Logger.log('Proff scraping error: ' + e.message);
    return { proffUrl: '', revenue: '', profit: '', employees: '', year: '' };
  }
}

function findBestProffMatch_(links, searchHtml, cvr, domain) {
  // Strategy: Score each link and pick the best match
  
  var companyName = domain ? domain.replace(/^www\./, '').replace(/\.[a-z]{2,}$/i, '') : '';
  
  Logger.log('Proff matching: CVR=' + cvr + ', domain=' + domain + ', companyName=' + companyName);
  Logger.log('Found ' + links.length + ' links in search results');
  
  var scores = [];
  
  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    var score = 0;
    
    // Score 1: Exact CVR match in context (highest priority)
    if (cvr) {
      var linkPos = searchHtml.indexOf('href="' + link + '"');
      if (linkPos !== -1) {
        var start = Math.max(0, linkPos - 1000);
        var end = Math.min(searchHtml.length, linkPos + 1000);
        var context = searchHtml.substring(start, end);
        
        // CRITICAL: Look for CVR with label, then verify the EXACT number
        // Pattern: "CVR: 12345678" or "CVR 12345678"
        var cvrWithLabelRegex = new RegExp('(?:CVR|cvr)[\\s:\\-]+([0-9]{8})\\b', 'i');
        var cvrMatch = context.match(cvrWithLabelRegex);
        
        if (cvrMatch && cvrMatch[1] === cvr) {
          // Perfect: Found "CVR" label followed by our exact CVR
          score += 100;
          Logger.log('Link ' + i + ': Perfect CVR match (CVR label + exact number) (+100)');
        } else if (cvrMatch) {
          // Found CVR label but different number - this is NOT our company
          Logger.log('Link ' + i + ': Found CVR label with different number (' + cvrMatch[1] + '), skipping');
        } else {
          // No CVR label found - check standalone occurrence
          // But ONLY if it's not in the URL itself
          var standaloneCvrRegex = new RegExp('\\b' + cvr + '\\b');
          if (standaloneCvrRegex.test(context) && link.indexOf(cvr) === -1) {
            score += 50;
            Logger.log('Link ' + i + ': CVR number found standalone (+50)');
          }
        }
      }
    }
    
    // Score 2: Company name in link
    if (companyName && companyName.length >= 4) {
      var linkLower = link.toLowerCase();
      var nameLower = companyName.toLowerCase().replace(/biler|auto|bil|as|aps/g, '').trim();
      
      if (nameLower && linkLower.indexOf(nameLower) !== -1) {
        score += 30;
        Logger.log('Link ' + i + ': Name match in URL (+30)');
      }
    }
    
    scores.push({ link: link, score: score });
    Logger.log('Link ' + i + ': ' + link + ' (total score: ' + score + ')');
  }
  
  // Sort by score descending
  scores.sort(function(a, b) { return b.score - a.score; });
  
  if (scores[0].score > 0) {
    Logger.log('Best match: ' + scores[0].link + ' (score: ' + scores[0].score + ')');
    return scores[0].link;
  }
  
  Logger.log('No good match found, using first link: ' + links[0]);
  return links[0];
}

function cleanProffNumber_(str) {
  if (!str) return '';
  // Remove spaces, dots, commas and convert minus signs
  return str.replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '').replace(/−/g, '-');
}

function extractProffFinancialFromTable_(html, label) {
  // Proff.dk embeds JSON data in the page with companyAccounts array
  // Extract: {"code":"bruttofort","amount":"31777"}
  
  // Try to extract from JSON first (most reliable)
  var jsonValue = extractFromProffJson_(html, label);
  if (jsonValue) {
    Logger.log('Found ' + label + ' from JSON: ' + jsonValue);
    return jsonValue;
  }
  
  // FALLBACK: Try HTML patterns
  var searchLabels = [];
  if (label === 'Omsætning') {
    searchLabels = ['Bruttofortjeneste', 'Nettoomsætning', 'Omsætning'];
  } else if (label === 'Resultat') {
    searchLabels = ['EBITA', 'Resultat før skat', 'Årets resultat', 'Resultat'];
  } else if (label === 'Ansatte') {
    searchLabels = ['ANTAL ANSATTE', 'Antal ansatte', 'Medarbejdere'];
  }
  
  for (var i = 0; i < searchLabels.length; i++) {
    var searchLabel = searchLabels[i];
    
    // PATTERN: Compact format (EBITA202411.716, ANTAL ANSATTE67)
    var compactPattern = new RegExp(searchLabel.replace(/å/g, '[åa]').replace(/Å/g, '[ÅA]') + '([0-9.,\\-]+)', 'i');
    var match = html.match(compactPattern);
    if (match && match[1]) {
      var rawValue = match[1];
      if (searchLabel === 'EBITA' && rawValue.length > 8) {
        rawValue = rawValue.substring(4); // Skip year prefix
      }
      var value = cleanAndValidateProffNumber_(rawValue, label, searchLabel);
      if (value) return value;
    }
  }
  
  Logger.log('No valid data found for: ' + label);
  return '';
}

/**
 * Extract financial data from Proff.dk embedded JSON.
 * @param {string} html - The HTML content containing embedded JSON
 * @param {string} label - Data type to extract: 'Omsætning', 'Resultat', or 'Ansatte'
 * @return {string} Formatted value or empty string
 */
function extractFromProffJson_(html, label) {
  // Proff.dk embeds JSON: "companyAccounts":[{"accounts":[{"code":"bruttofort","amount":"31777"},...]
  
  // Map our labels to JSON codes
  var codes = [];
  if (label === 'Omsætning') {
    codes = ['bruttofort', 'SDI']; // bruttofortjeneste or nettoomsætning
  } else if (label === 'Resultat') {
    codes = ['AARS', 'EBITA', 'OR', 'EBITDA']; // Årets resultat, EBITA, ordinært resultat, EBITDA
  } else if (label === 'Ansatte') {
    codes = ['ANT']; // antal ansatte
  }
  
  // Find the latest year's accounts array (inside first companyAccounts object)
  // Pattern: "companyAccounts":[{"year":"2024",...,"accounts":[{...},{...}]}]
  var accountsMatch = html.match(/"accounts":\[([^\]]+)\]/);
  if (!accountsMatch) {
    Logger.log('No accounts array found in JSON');
    return '';
  }
  
  var accountsSection = accountsMatch[1];
  Logger.log('Found accounts section (first 200 chars): ' + accountsSection.substring(0, 200));
  
  // Try each code
  for (var i = 0; i < codes.length; i++) {
    var code = codes[i];
    // Pattern: {"code":"bruttofort","amount":"31777"}
    var pattern = new RegExp('"code":"' + code + '","amount":"([^"]+)"', 'i');
    var match = accountsSection.match(pattern);
    
    if (match && match[1]) {
      var value = match[1];
      var numValue = parseInt(value);
      
      Logger.log('Found code "' + code + '" with value: ' + value);
      
      // Validate
      if (isNaN(numValue)) {
        Logger.log('NaN value, skipping');
        continue;
      }
      
      // Check absolute value for year detection (avoid false positives with negative numbers)
      var absValue = Math.abs(numValue);
      if (absValue >= 2020 && absValue <= 2030) {
        Logger.log('Year detected, skipping');
        continue;
      }
      
      if (label === 'Ansatte') {
        if (numValue < 1 || numValue > 10000) {
          Logger.log('Invalid employee count, skipping');
          continue;
        }
        return value; // Employees don't need formatting
      } else if (label === 'Omsætning') {
        // Revenue must be positive and reasonable
        if (absValue < 10) {
          Logger.log('Too low for revenue, skipping');
          continue;
        }
        // Revenue in thousands - multiply by 1000 and format
        var actualValue = numValue * 1000;
        var formatted = formatDanishNumber_(actualValue);
        Logger.log('Formatted ' + label + ': ' + value + ' tkr -> ' + formatted + ' kr');
        return formatted;
      } else if (label === 'Resultat') {
        // Profit can be negative (loss) - only skip very small positive values
        if (numValue > 0 && absValue < 10) {
          Logger.log('Too low positive value for profit, skipping');
          continue;
        }
        // Profit in thousands - multiply by 1000 and format (preserves negative)
        var actualValue = numValue * 1000;
        var formatted = formatDanishNumber_(actualValue);
        Logger.log('Formatted ' + label + ': ' + value + ' tkr -> ' + formatted + ' kr');
        return formatted;
      }
    }
  }
  
  Logger.log('No matching code found in JSON for label: ' + label);
  return '';
}

/**
 * Format number with Danish thousand separator (.).
 * @param {number} num - Number to format (can be negative)
 * @return {string} Formatted string (e.g., '31.777.000' or '-41.000')
 */
function formatDanishNumber_(num) {
  // Format number with Danish thousand separator (.)
  // Example: 31777000 -> "31.777.000", -41000 -> "-41.000"
  var isNegative = num < 0;
  var absNum = Math.abs(num);
  var str = absNum.toString();
  var formatted = '';
  var count = 0;
  
  for (var i = str.length - 1; i >= 0; i--) {
    if (count > 0 && count % 3 === 0) {
      formatted = '.' + formatted;
    }
    formatted = str[i] + formatted;
    count++;
  }
  
  return isNegative ? '-' + formatted : formatted;
}

/**
 * Extract accounting year from Proff.dk JSON data.
 * @param {string} html - The HTML content containing embedded JSON
 * @return {string} Year as string (e.g., '2024') or empty string
 */
function extractAccountingYear_(html) {
  // Extract year from JSON: "companyAccounts":[{"year":"2024",...
  var yearMatch = html.match(/"companyAccounts":\[\{"year":"(\d{4})"/);
  if (yearMatch && yearMatch[1]) {
    return yearMatch[1];
  }
  return '';
}

/**
 * Update Proff.dk column headers with accounting year.
 * @param {Sheet} sh - The Google Sheet object
 * @param {string} year - Accounting year to display in headers
 */
function updateProffHeaders_(sh, year) {
  // Update Proff column headers to include accounting year
  // Only update if not already set
  var currentHeader = sh.getRange(1, 23).getValue();
  if (currentHeader.indexOf(year) === -1) {
    sh.getRange(1, 23).setValue('Proff Omsætning ' + year);
    sh.getRange(1, 24).setValue('Proff Resultat ' + year);
    sh.getRange(1, 25).setValue('Proff Ansatte ' + year);
    Logger.log('Updated Proff headers with year: ' + year);
  }
}

function cleanAndValidateProffNumber_(rawValue, label, searchLabel) {
  // Clean the number (remove thousand separators)
  var value = cleanProffNumber_(rawValue);
  // Parse with sign preserved
  var numValue = parseInt(value);
  
  // Validate number
  if (isNaN(numValue)) {
    Logger.log('Invalid number for ' + searchLabel + ': ' + rawValue);
    return '';
  }
  
  // Use absolute value for year detection (avoid false positives with negative numbers)
  var absValue = Math.abs(numValue);
  if (absValue >= 2020 && absValue <= 2030) {
    Logger.log('Skipping year for ' + searchLabel + ': ' + value);
    return '';
  }
  
  // Validate ranges
  if (label === 'Ansatte') {
    if (numValue < 1 || numValue > 10000) {
      Logger.log('Invalid employee count: ' + value);
      return '';
    }
    return value; // Employees don't need formatting
  } else if (label === 'Omsætning') {
    // Revenue must be positive and reasonable
    if (absValue < 10) {
      Logger.log('Suspiciously low value for ' + label + ': ' + value);
      return '';
    }
    // Multiply by 1000 and format
    var actualValue = numValue * 1000;
    var formatted = formatDanishNumber_(actualValue);
    Logger.log('Found ' + label + ' from "' + searchLabel + '": ' + value + ' tkr -> ' + formatted + ' kr');
    return formatted;
  } else if (label === 'Resultat') {
    // Profit can be negative (loss) - only skip very small positive values
    if (numValue > 0 && absValue < 10) {
      Logger.log('Suspiciously low positive value for ' + label + ': ' + value);
      return '';
    }
    // Multiply by 1000 and format (preserves negative sign)
    var actualValue = numValue * 1000;
    var formatted = formatDanishNumber_(actualValue);
    Logger.log('Found ' + label + ' from "' + searchLabel + '": ' + value + ' tkr -> ' + formatted + ' kr');
    return formatted;
  }
  
  return value;
}

function extractProffFinancial_(html, labelRegex, valueRegex) {
  // Find section containing the label
  var lines = html.split(/[\r\n]+/);
  for (var i = 0; i < lines.length; i++) {
    if (labelRegex.test(lines[i])) {
      // Look in current line and next 10 lines for value (increased from 5)
      var searchText = lines.slice(i, Math.min(i + 10, lines.length)).join(' ');
      var match = searchText.match(valueRegex);
      if (match && match[1]) {
        var value = match[1].replace(/\s+/g, '').replace(/\./g, ''); // Clean formatting
        Logger.log('Found financial data - Label: ' + labelRegex + ', Value: ' + value);
        return value;
      }
    }
  }
  
  Logger.log('No match found for label: ' + labelRegex);
  return '';
}

/*** URL + sheet helpers ***/

function normalizeUrl_(url) {
  var u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

function extractDomain_(url) {
  var m = url.match(/^https?:\/\/([^\/?#]+)/i);
  return m && m[1] ? m[1] : '';
}

function getBaseUrl_(url) {
  var m = url.match(/^(https?:\/\/[^\/?#]+)/i);
  return m && m[1] ? m[1] : url;
}

/**
 * Convert relative URL to absolute URL using base URL.
 * @param {string} href - Relative or absolute URL
 * @param {string} baseUrl - Base URL for resolution
 * @return {string} Absolute URL or empty string on error
 */
function toAbsoluteUrl_(href, baseUrl) {
  try {
    if (/^https?:\/\//i.test(href)) return href;
    if (href.indexOf('//') === 0) {
      var proto = baseUrl.indexOf('https://') === 0 ? 'https:' : 'http:';
      return proto + href;
    }
    if (href.indexOf('/') === 0) return baseUrl.replace(/\/+$/, '') + href;
    return baseUrl.replace(/\/+$/, '') + '/' + href.replace(/^\/+/, '');
  } catch (e) {
    return '';
  }
}

/**
 * Remove hash fragment from URL.
 * @param {string} u - URL to clean
 * @return {string} URL without hash
 */
function stripUrlHash_(u) {
  return u.split('#')[0];
}

/**
 * Check if two URLs belong to the same domain.
 * @param {string} url - First URL to compare
 * @param {string} baseUrl - Second URL to compare
 * @return {boolean} True if domains match
 */
function isSameDomain_(url, baseUrl) {
  return extractDomain_(url) === extractDomain_(baseUrl);
}

/*** Generic helpers ***/

/**
 * Check if text contains any of the specified keywords.
 * @param {string} text - Text to search
 * @param {string[]} keywords - Array of keywords to match
 * @return {boolean} True if any keyword found
 */
function matchesAnyKeyword_(text, keywords) {
  for (var i = 0; i < keywords.length; i++) {
    if (text.indexOf(keywords[i]) !== -1) return true;
  }
  return false;
}

/**
 * Extract all regex matches from text.
 * @param {string} text - Text to search
 * @param {RegExp} regex - Regular expression (must have 'g' flag)
 * @param {number} groupIndex - Capture group index (0 for full match)
 * @return {string[]} Array of all matches
 */
function extractAll_(text, regex, groupIndex) {
  var out = [];
  var m;
  var gi = (typeof groupIndex === 'number') ? groupIndex : 0;
  while ((m = regex.exec(text)) !== null) {
    out.push(gi === 0 ? m[0] : m[gi]);
  }
  regex.lastIndex = 0;
  return out;
}

/**
 * Remove duplicate values from array.
 * @param {Array} arr - Array to deduplicate
 * @return {Array} Array with unique values
 */
function unique_(arr) {
  var seen = {};
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var v = (arr[i] || '').toString();
    if (!v) continue;
    if (!seen[v]) {
      seen[v] = true;
      out.push(v);
    }
  }
  return out;
}

function uniqueKeepOrder_(arr) {
  return unique_(arr);
}

function contains_(arr, val) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] === val) return true;
  }
  return false;
}

function getLeadsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) throw new Error('Missing sheet: ' + SHEET_NAME + ' (run Setup headers)');
  return sh;
}

// ==========================================
// GOOGLE SLIDES PRESENTATION GENERATOR
// ==========================================

/**
 * Opretter en sales pitch præsentation fra den valgte række
 */
function createSalesPitchPresentation() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getActiveSheet();
  var activeRange = sh.getActiveRange();
  
  if (!activeRange) {
    SpreadsheetApp.getUi().alert('Vælg en række først');
    return;
  }
  
  var row = activeRange.getRow();
  if (row < 2) {
    SpreadsheetApp.getUi().alert('Vælg en datarække (ikke header)');
    return;
  }
  
  // Hent data fra rækken
  var data = sh.getRange(row, 1, 1, 25).getValues()[0];
  
  var leadData = {
    url: data[0] || '',
    domain: data[1] || '',
    cvr: data[2] || '',
    phone: data[3] || '',
    email: data[4] || '',
    ga4: data[5] || '',
    gtm: data[6] || '',
    metaPixel: data[7] || '',
    googleAds: data[8] || '',
    competitors: data[9] || '',
    socialMedia: data[10] || '',
    notes: data[11] || '',
    aiBriefing: data[12] || '',
    lastRun: data[13] || '',
    ga4Ids: data[14] || '',
    gtmIds: data[15] || '',
    metaPixelIds: data[16] || '',
    googleAdsIds: data[17] || '',
    cmp: data[18] || '',
    pagesScanned: data[19] || '',
    proffUrl: data[20] || '',
    adPlatforms: data[21] || '',
    proffRevenue: data[22] || '',
    proffProfit: data[23] || '',
    proffEmployees: data[24] || ''
  };
  
  // Opret præsentationen
  try {
    var presentation = SlidesApp.create('Sales Pitch - ' + leadData.domain);
    var presentationId = presentation.getId();
    
    // Fjern standard tom slide
    var slides = presentation.getSlides();
    if (slides.length > 0) {
      slides[0].remove();
    }
    
    // Slide 1: Forside
    createTitleSlide_(presentation, leadData);
    
    // Slide 2: Virksomhedsinfo
    createCompanyInfoSlide_(presentation, leadData);
    
    // Slide 3: Digital Modenhed
    createDigitalMaturitySlide_(presentation, leadData);
    
    // Slide 4: Økonomiske Data (hvis tilgængelig)
    if (leadData.proffRevenue || leadData.proffProfit || leadData.proffEmployees) {
      createFinancialSlide_(presentation, leadData);
    }
    
    // Slide 5: AI Insights (hvis tilgængelig)
    if (leadData.aiBriefing) {
      createAiInsightsSlide_(presentation, leadData);
    }
    
    // Slide 6: Muligheder & Next Steps
    createOpportunitiesSlide_(presentation, leadData);
    
    // Åbn præsentationen
    var url = 'https://docs.google.com/presentation/d/' + presentationId + '/edit';
    
    // Gem URL i Notes
    var currentNotes = sh.getRange(row, 12).getValue();
    var newNotes = currentNotes ? currentNotes + '\n[Pitch: ' + url + ']' : '[Pitch: ' + url + ']';
    sh.getRange(row, 12).setValue(newNotes);
    
    // Vis HTML dialog med klikbart link
    var html = HtmlService.createHtmlOutput(
      '<h2>✅ Præsentation oprettet!</h2>' +
      '<p><strong>' + leadData.domain + '</strong></p>' +
      '<p><a href="' + url + '" target="_blank" style="display:inline-block;padding:10px 20px;background:#4285f4;color:white;text-decoration:none;border-radius:4px;font-weight:bold;">Åbn præsentation</a></p>' +
      '<p style="margin-top:20px;font-size:11px;color:#666;">Link er også gemt i Notes-kolonnen</p>'
    ).setWidth(400).setHeight(200);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Sales Pitch oprettet');
    
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Fejl ved oprettelse af præsentation:\n\n' + e.toString());
    Logger.log('Presentation error: ' + e.toString());
  }
}

/**
 * Forside slide
 */
function createTitleSlide_(presentation, data) {
  var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.TITLE);
  var shapes = slide.getShapes();
  
  // Titel
  shapes[0].getText().setText('Sales Pitch');
  
  // Undertitel
  var subtitle = data.domain.toUpperCase();
  if (data.cvr) subtitle += '\nCVR: ' + data.cvr;
  shapes[1].getText().setText(subtitle);
}

/**
 * Virksomhedsinfo slide
 */
function createCompanyInfoSlide_(presentation, data) {
  var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  var shapes = slide.getShapes();
  
  shapes[0].getText().setText('Virksomhedsinfo');
  
  var content = '';
  if (data.domain) content += '🌐 Website: ' + data.domain + '\n';
  if (data.cvr) content += '🏢 CVR: ' + data.cvr + '\n';
  if (data.phone) content += '📞 Telefon: ' + data.phone + '\n';
  if (data.email) content += '✉️ Email: ' + data.email + '\n';
  if (data.proffUrl) content += '📊 Proff.dk: ' + data.proffUrl + '\n';
  if (data.pagesScanned) content += '\n📄 Sider scannet: ' + data.pagesScanned;
  
  shapes[1].getText().setText(content || 'Ingen kontaktinfo fundet');
}

/**
 * Digital modenhed slide
 */
function createDigitalMaturitySlide_(presentation, data) {
  var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_TWO_COLUMNS);
  var shapes = slide.getShapes();
  
  shapes[0].getText().setText('Digital Modenhed & Tracking');
  
  // Venstre kolonne: Analytics
  var analyticsContent = '📊 ANALYTICS\n\n';
  analyticsContent += data.ga4 ? '✅ Google Analytics 4\n' : '❌ Google Analytics 4\n';
  analyticsContent += data.gtm ? '✅ Google Tag Manager\n' : '❌ Google Tag Manager\n';
  analyticsContent += data.metaPixel ? '✅ Meta Pixel\n' : '❌ Meta Pixel\n';
  if (data.cmp) analyticsContent += '✅ Consent Management\n';
  
  shapes[1].getText().setText(analyticsContent);
  
  // Højre kolonne: Marketing
  var marketingContent = '🎯 MARKETING\n\n';
  marketingContent += data.googleAds ? '✅ Google Ads\n' : '❌ Google Ads\n';
  if (data.adPlatforms) marketingContent += '📱 Platforme: ' + data.adPlatforms + '\n';
  if (data.socialMedia) marketingContent += '🌐 Sociale medier: ' + data.socialMedia + '\n';
  if (data.competitors) marketingContent += '\n🔍 Konkurrenter:\n' + data.competitors;
  
  shapes[2].getText().setText(marketingContent);
}

/**
 * Økonomiske data slide
 */
function createFinancialSlide_(presentation, data) {
  var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  var shapes = slide.getShapes();
  
  shapes[0].getText().setText('Økonomiske Nøgletal');
  
  var content = '💰 REGNSKABSDATA (Fra Proff.dk)\n\n';
  
  if (data.proffRevenue) {
    content += '📈 Omsætning: ' + data.proffRevenue + ' kr.\n';
  }
  
  if (data.proffProfit) {
    content += '💵 Resultat: ' + data.proffProfit + ' kr.\n';
  }
  
  if (data.proffEmployees) {
    content += '👥 Ansatte: ' + data.proffEmployees + ' personer\n';
  }
  
  content += '\n💡 Dette indikerer virksomhedens størrelse og kapacitet til at investere i digitale løsninger.';
  
  shapes[1].getText().setText(content);
}

/**
 * AI insights slide
 */
function createAiInsightsSlide_(presentation, data) {
  var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  var shapes = slide.getShapes();
  
  shapes[0].getText().setText('AI Analyse');
  
  // Trim AI briefing hvis den er for lang
  var briefing = data.aiBriefing;
  if (briefing.length > 800) {
    briefing = briefing.substring(0, 800) + '...';
  }
  
  shapes[1].getText().setText('🤖 GEMINI INSIGHTS\n\n' + briefing);
}

/**
 * Muligheder og next steps slide
 */
function createOpportunitiesSlide_(presentation, data) {
  var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.TITLE_AND_BODY);
  var shapes = slide.getShapes();
  
  shapes[0].getText().setText('Muligheder & Next Steps');
  
  var content = '🎯 ANBEFALINGER\n\n';
  
  // Generer anbefalinger baseret på manglende tracking
  var recommendations = [];
  
  if (!data.ga4) recommendations.push('• Implementer Google Analytics 4 for bedre dataindsigt');
  if (!data.gtm) recommendations.push('• Opsæt Google Tag Manager for fleksibel tracking');
  if (!data.metaPixel && !data.googleAds) recommendations.push('• Start med paid advertising (Meta/Google Ads)');
  if (!data.cmp) recommendations.push('• Implementer Consent Management (GDPR compliance)');
  if (data.competitors) recommendations.push('• Konkurrentanalyse: Lær af ' + data.competitors.split(',')[0]);
  
  if (recommendations.length > 0) {
    content += recommendations.join('\n') + '\n';
  } else {
    content += '✅ Virksomheden har allerede god digital modenhed!\n\n';
    content += '• Optimer eksisterende tracking\n';
    content += '• Analyser conversion funnels\n';
    content += '• Test nye marketing kanaler\n';
  }
  
  content += '\n📞 NEXT STEP: Book et møde for at diskutere disse muligheder';
  
  shapes[1].getText().setText(content);
}
