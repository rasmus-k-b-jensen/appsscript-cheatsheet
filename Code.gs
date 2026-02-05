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

// Column mappings for Leads sheet - makes code more maintainable
var COL = {
  // GRUNDDATA (A-E)
  URL: 1,
  DOMAIN: 2,
  CVR: 3,
  PHONE: 4,
  EMAIL: 5,
  
  // TEKNOLOGI & PLATFORM (F-J)
  WEBSITE_PLATFORM: 6,
  CAR_DEALER_PLATFORM: 7,
  MOBILE_READY: 8,
  CMP_COOKIE_VENDOR: 9,
  CHAT_WIDGET: 10,
  
  // TRACKING & ANALYTICS (K-Q)
  GA4: 11,
  GA4_IDS: 12,
  GTM: 13,
  GTM_IDS: 14,
  META_PIXEL: 15,
  META_PIXEL_IDS: 16,
  GOOGLE_ADS_TAG: 17,
  
  // MARKETING TOOLS (R-U)
  GOOGLE_ADS_AW_IDS: 18,
  EMAIL_PLATFORM: 19,
  CONTACT_FORMS: 20,
  BLOG: 21,
  
  // BUSINESS DATA (V-Y)
  PROFF_LINK: 22,
  REVENUE: 23,
  PROFIT: 24,
  EMPLOYEES: 25,
  
  // KONKURRENCE & SOCIAL (Z-AB)
  COMPETITORS: 26,
  SOCIAL_MEDIA: 27,
  AD_PLATFORMS: 28,
  
  // MEDIA & INDHOLD (AC-AF)
  VIDEO_MARKETING: 29,
  CAR_BRANDS: 30,
  TRUSTPILOT: 31,
  CAR_MARKETPLACES: 32,
  
  // METADATA (AG-AM)
  PAGES_SCANNED: 33,
  LAST_RUN: 34,
  AI_BRIEFING: 35,
  NOTES: 36,
  AUTOUCLE_ADMIN: 37,
  BILINFO_ANTAL: 38,
  BILINFO_AFDELINGER: 39
};

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
    .addSubMenu(ui.createMenu('⭐ Lead Scoring')
      .addItem('Beregn Score (selected)', 'updateLeadScore')
      .addItem('Beregn Scores (alle)', 'scoreAllLeads'))
    .addSubMenu(ui.createMenu('⚙️ Gemini AI Setup')
      .addItem('Setup API Key', 'setupGeminiApiKey')
      .addItem('Test API Key', 'testGeminiApiKey')
      .addItem('Fjern API Key', 'removeGeminiApiKey'))
    .addSubMenu(ui.createMenu('� AutoUncle Integration')
      .addItem('Setup Admin Login', 'setupAutoUncleSession')
      .addItem('Sync Customer List', 'syncAutoUncleCustomers')
      .addItem('Test Connection', 'testAutoUncleConnectionMenu'))
    .addSubMenu(ui.createMenu('🚗 Bilinfo API')
      .addItem('Setup API Credentials', 'setupBilinfoCredentials')
      .addItem('Sync Forhandler Data', 'syncBilinfoData')
      .addItem('Opret Bilinfo Ark', 'createBilinfoSheet')
      .addItem('Test API Connection', 'testBilinfoConnection'))
    .addSubMenu(ui.createMenu('�📊 Analytics')
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
      // GRUNDDATA (A-E)
      'URL','Domain','CVR (guess)','Telefon','Email',
      // TEKNOLOGI & PLATFORM (F-J)
      'Website Platform','Bilforhandler Platform','Mobile-Ready','CMP/Cookie vendor','Chat Widget',
      // TRACKING & ANALYTICS (K-Q)
      'GA4','GA4 IDs','GTM','GTM IDs','Meta Pixel','Meta Pixel IDs','Google Ads tag',
      // MARKETING TOOLS (R-U)
      'Google Ads AW IDs','Email Platform','Kontaktformularer','Blog',
      // BUSINESS DATA (V-Y)
      'Proff link','Proff Omsætning','Proff Resultat','Proff Ansatte',
      // KONKURRENCE & SOCIAL (Z-AB)
      'Competitors found','Social Media','Ad Platforms',
      // MEDIA & INDHOLD (AC-AF)
      'Video Marketing','Bilmærker','Trustpilot Rating','Bil Salgsplatforme',
      // METADATA (AG-AM)
      'Pages scanned','Last run','AI Briefing','Notes','AutoUncle Admin','Bilinfo Antal','Afdelinger (Bilinfo)'
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
      var url = (sh.getRange(r, COL.URL).getValue() || '').toString().trim();
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
      var url = (sh.getRange(r, COL.URL).getValue() || '').toString().trim();
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
      var url = (sh.getRange(r, COL.URL).getValue() || '').toString().trim();
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
    var url = (sh.getRange(row, COL.URL).getValue() || '').toString().trim();
    if (!url) return;

    var normalized = normalizeUrl_(url);
    sh.getRange(row, COL.URL).setValue(normalized);

    var domain = extractDomain_(normalized);
    sh.getRange(row, COL.DOMAIN).setValue(domain);

    var result;
    try {
      result = scanWebsite_(normalized, MAX_PAGES);
    } catch (e) {
      var errorMsg = 'Fetch error: ' + (e && e.message ? e.message : e);
      sh.getRange(row, COL.NOTES).setValue(errorMsg);
      sh.getRange(row, COL.LAST_RUN).setValue(new Date());
      Logger.log('Row ' + row + ' scan error: ' + errorMsg);
      return;
    }

  // Smartere GA4 status
  var ga4Status = 'No';
  var ga4IdsDisplay = '';
  
  if (result.ga4Ids.length) {
    ga4Status = 'Ja';
    ga4IdsDisplay = result.ga4Ids.join(', ');
  } else if (result.gtmIds.length) {
    // Hvis GTM findes, antag at GA4 sandsynligvis ER installeret via GTM
    ga4Status = 'Sandsynligvis (via GTM)';
    ga4IdsDisplay = '';
  } else if (result.ga4LikelyViaJs) {
    ga4Status = 'Sandsynligvis (via JS)';
    ga4IdsDisplay = '';
  }
  
  // GRUNDDATA (C-E: 3 cols)
  var batchData1 = [[
    result.cvr || 'N/A',                        // C: CVR
    result.phone || 'N/A',                      // D: Telefon
    result.email || 'N/A'                       // E: Email
  ]];
  sh.getRange(row, COL.CVR, 1, 3).setValues(batchData1);
  
  // TEKNOLOGI & PLATFORM (F-J: 5 cols)
  var batchData2 = [[
    result.websitePlatform || 'N/A',            // F: Website Platform
    result.carDealerPlatform || 'N/A',          // G: Bilforhandler Platform
    result.mobileReady || 'N/A',                // H: Mobile-Ready
    result.cmpVendors.join(', ') || 'N/A',      // I: CMP/Cookie vendor
    result.chatWidget || 'N/A'                  // J: Chat Widget
  ]];
  sh.getRange(row, COL.WEBSITE_PLATFORM, 1, 5).setValues(batchData2);
  
  // TRACKING & ANALYTICS (K-Q: 7 cols)
  var batchData3 = [[
    ga4Status,                                  // K: GA4
    ga4IdsDisplay,                              // L: GA4 IDs
    result.gtmIds.length ? 'Yes' : 'No',       // M: GTM
    result.gtmIds.join(', ') || 'N/A',         // N: GTM IDs
    result.metaPixelIds.length ? 'Yes' : 'No', // O: Meta Pixel
    result.metaPixelIds.join(', ') || 'N/A',   // P: Meta Pixel IDs
    result.awIds.length ? 'Yes' : 'No'         // Q: Google Ads tag
  ]];
  sh.getRange(row, COL.GA4, 1, 7).setValues(batchData3);
  
  // MARKETING TOOLS (R-U: 4 cols)
  var batchData4 = [[
    result.awIds.join(', ') || 'N/A',          // R: Google Ads AW IDs
    result.emailPlatform || 'N/A',              // S: Email Platform
    result.contactForms || 'N/A',               // T: Kontaktformularer
    result.hasBlog || 'N/A'                     // U: Blog
  ]];
  sh.getRange(row, COL.GOOGLE_ADS_AW_IDS, 1, 4).setValues(batchData4);
  
  // BUSINESS DATA - Proff.dk (V-Y: 4 cols)
  var proffData = scrapeProffData_(result.cvr, domain);
  sh.getRange(row, COL.PROFF_LINK).setValue(proffData.proffUrl || 'N/A');  // V: Proff link
  
  if (proffData.revenue) {
    sh.getRange(row, COL.REVENUE).setValue(proffData.revenue).setNumberFormat('@STRING@');  // W: Omsætning
  } else {
    sh.getRange(row, COL.REVENUE).setValue('N/A');
  }
  if (proffData.profit) {
    sh.getRange(row, COL.PROFIT).setValue(proffData.profit).setNumberFormat('@STRING@');   // X: Resultat
  } else {
    sh.getRange(row, COL.PROFIT).setValue('N/A');
  }
  if (proffData.employees) {
    sh.getRange(row, COL.EMPLOYEES).setValue(proffData.employees);  // Y: Ansatte
  } else {
    sh.getRange(row, COL.EMPLOYEES).setValue('N/A');
  }
  
  // KONKURRENCE & SOCIAL (Z-AB: 3 cols)
  var batchData5 = [[
    result.competitors.join(', ') || 'N/A',     // Z: Competitors
    result.socialMedia.join(', ') || 'N/A',     // AA: Social Media
    result.adPlatforms.join(', ') || 'N/A'      // AB: Ad Platforms
  ]];
  sh.getRange(row, COL.COMPETITORS, 1, 3).setValues(batchData5);
  
  // MEDIA & INDHOLD (AC-AF: 4 cols)
  var batchData6 = [[
    result.videoMarketing || 'N/A',             // AC: Video Marketing
    result.carBrands || 'N/A',                  // AD: Bilmærker
    result.trustpilot || 'N/A',                 // AE: Trustpilot Rating
    result.carMarketplaces || 'N/A'             // AF: Bil Salgsplatforme
  ]];
  sh.getRange(row, COL.VIDEO_MARKETING, 1, 4).setValues(batchData6);
  
  // METADATA (AG-AM: 7 cols) - AG (Pages scanned), AH (Last run), skip AI (35) and AJ (36), AK (AutoUncle Admin), AL (Bilinfo Antal), AM (Afdelinger Bilinfo)
  sh.getRange(row, COL.PAGES_SCANNED, 1, 1).setValues([[result.pagesScanned.join(' | ')]]);  // AG: Pages scanned
  sh.getRange(row, COL.LAST_RUN, 1, 1).setValues([[new Date()]]);                        // AH: Last run
  sh.getRange(row, COL.AUTOUCLE_ADMIN, 1, 1).setValues([[result.autoUncleStatus || 'N/A']]);     // AK: AutoUncle Admin
  
  // AL & AM: Bilinfo Antal + Afdelinger - Fetch from Bilinfo API
  Logger.log('Attempting to fetch Bilinfo data for domain: ' + domain);
  var bilinfoData = fetchBilinfoCountForDomain_(domain);
  Logger.log('Bilinfo data result: ' + JSON.stringify(bilinfoData));
  if (bilinfoData !== null) {
    sh.getRange(row, COL.BILINFO_ANTAL, 1, 1).setValues([[bilinfoData.totalCount]]);  // AL: Bilinfo Antal
    sh.getRange(row, COL.BILINFO_AFDELINGER, 1, 1).setValues([[bilinfoData.departmentCount]]);  // AM: Afdelinger (Bilinfo)
    Logger.log('Wrote Bilinfo data - Biler: ' + bilinfoData.totalCount + ', Afdelinger: ' + bilinfoData.departmentCount);
  } else {
    Logger.log('Bilinfo data was null, not writing to sheet');
  }
  
  // AJ (36): Notes - set separately
  if (result.notes) {
    sh.getRange(row, COL.NOTES).setValue(result.notes);
  }
  
  // Update headers with accounting year if available
  if (proffData.year && row === 2) {
    updateProffHeaders_(sh, proffData.year);
  }
  
  } catch (e) {
    // Generel error handling for hele funktionen
    var errorMsg = 'Error: ' + (e.message || e);
    try {
      sh.getRange(row, COL.NOTES).setValue(errorMsg); // Notes (AJ)
      sh.getRange(row, COL.LAST_RUN).setValue(new Date()); // Last run (AH)
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
      
      var url = (sh.getRange(r, COL.URL).getValue() || '').toString().trim();
      if (!url) continue;
      
      try {
        generateAiBriefingForRow_(sh, r);
        processed++;
        Utilities.sleep(1000); // Rate limiting between AI calls
      } catch (e) {
        errors++;
        sh.getRange(r, COL.CAR_MARKETPLACES).setValue('AI briefing failed: ' + e.message);
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
  var url = (sh.getRange(row, COL.URL).getValue() || '').toString().trim();
  if (!url) return;
  
  // Read comprehensive data from sheet - ALL new columns
  var result = {
    // GRUNDDATA (A-E)
    domain: sh.getRange(row, COL.DOMAIN).getValue() || '',
    cvr: sh.getRange(row, COL.CVR).getValue() || '',
    phone: sh.getRange(row, COL.PHONE).getValue() || '',
    email: sh.getRange(row, COL.EMAIL).getValue() || '',
    
    // TEKNOLOGI & PLATFORM (F-J)
    websitePlatform: sh.getRange(row, COL.WEBSITE_PLATFORM).getValue() || '',
    carDealerPlatform: sh.getRange(row, COL.CAR_DEALER_PLATFORM).getValue() || '',
    mobileReady: sh.getRange(row, COL.MOBILE_READY).getValue() || '',
    cmp: sh.getRange(row, COL.CMP_COOKIE_VENDOR).getValue() || '',
    chatWidget: sh.getRange(row, COL.CHAT_WIDGET).getValue() || '',
    
    // TRACKING & ANALYTICS (K-Q)
    ga4: sh.getRange(row, COL.GA4).getValue() || '',
    ga4Ids: (sh.getRange(row, COL.GA4_IDS).getValue() || '').toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean),
    gtm: sh.getRange(row, COL.GTM).getValue() || '',
    gtmIds: (sh.getRange(row, COL.GTM_IDS).getValue() || '').toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean),
    metaPixel: sh.getRange(row, COL.META_PIXEL).getValue() || '',
    metaPixelIds: (sh.getRange(row, COL.META_PIXEL_IDS).getValue() || '').toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean),
    googleAdsTag: sh.getRange(row, COL.GOOGLE_ADS_TAG).getValue() || '',
    
    // MARKETING TOOLS (R-U)
    googleAdsAWIds: (sh.getRange(row, COL.GOOGLE_ADS_AW_IDS).getValue() || '').toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean),
    emailPlatform: sh.getRange(row, COL.EMAIL_PLATFORM).getValue() || '',
    contactForms: sh.getRange(row, COL.CONTACT_FORMS).getValue() || '',
    hasBlog: sh.getRange(row, COL.BLOG).getValue() || '',
    
    // BUSINESS DATA (V-Y)
    proffLink: sh.getRange(row, COL.PROFF_LINK).getValue() || '',
    revenue: sh.getRange(row, COL.REVENUE).getValue() || '',
    profit: sh.getRange(row, COL.PROFIT).getValue() || '',
    employees: sh.getRange(row, COL.EMPLOYEES).getValue() || '',
    
    // KONKURRENCE & SOCIAL (Z-AB)
    competitors: (sh.getRange(row, COL.COMPETITORS).getValue() || '').toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean),
    socialMedia: (sh.getRange(row, COL.SOCIAL_MEDIA).getValue() || '').toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean),
    adPlatforms: (sh.getRange(row, COL.AD_PLATFORMS).getValue() || '').toString().split(',').map(function(s) { return s.trim(); }).filter(Boolean),
    
    // MEDIA & INDHOLD (AC-AF)
    videoMarketing: sh.getRange(row, COL.VIDEO_MARKETING).getValue() || '',
    carBrands: sh.getRange(row, COL.CAR_BRANDS).getValue() || '',
    trustpilot: sh.getRange(row, COL.TRUSTPILOT).getValue() || '',
    carMarketplaces: sh.getRange(row, COL.CAR_MARKETPLACES).getValue() || ''
  };
  
  var briefing = generateBriefingGemini_(url, result);
  sh.getRange(row, COL.AI_BRIEFING).setValue(briefing);  // AI kolonne (AI Briefing)
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
  if (ga4Ids.length === 0 && gtmIds.length === 0) {
    // Only check for JS indicators if NEITHER GA4 nor GTM is found
    var hasGtagScript = /googletagmanager\.com\/gtag\/js/i.test(allHtml);
    var hasDataLayer = /dataLayer/i.test(allHtml);
    var hasGtagFunction = /gtag\s*\(/i.test(allHtml);
    var hasAnalyticsReference = /google-analytics|googleanalytics|analytics\.js/i.test(allHtml);
    
    // If any gtag/analytics references exist, tracking is likely present
    if (hasGtagScript || (hasDataLayer && hasGtagFunction) || hasAnalyticsReference) {
      ga4LikelyViaJs = true;
    }
  }

  // Notes (sales-friendly)
  var notes = [];
  
  // GA4/GTM tracking notes
  if (gtmIds.length && ga4Ids.length) {
    notes.push('✅ Både GTM og GA4 hardcoded i HTML - fuld tracking synlig.');
  } else if (gtmIds.length && !ga4Ids.length) {
    notes.push('✅ GTM fundet - GA4 er sandsynligvis installeret via GTM (bedste praksis).');
  } else if (ga4Ids.length && !gtmIds.length) {
    notes.push('⚠️ GA4 hardcoded uden GTM - overvej at bruge GTM for bedre tag management.');
  } else if (ga4LikelyViaJs) {
    notes.push('🔍 Tracking scripts fundet (gtag.js/dataLayer) - GA4 sandsynligvis loadet via JavaScript.');
  } else {
    notes.push('❌ Ingen synlig tracking (GA4/GTM) i HTML - mulighed for at implementere.');
  }
  
  if (metaPixelIds.length) notes.push('✅ Meta Pixel installeret (' + metaPixelIds.length + ' pixel).');
  if (awIds.length) notes.push('✅ Google Ads tracking aktiv (' + awIds.length + ' tags).');
  if (cmpVendors.length) notes.push('✅ Cookie consent: ' + cmpVendors.join(', '));
  if (competitors.length) notes.push('Competitor footprints found.');
  if (socialMedia.length) notes.push('Social media presence: ' + socialMedia.join(', '));
  if (adPlatforms.length) notes.push('Ad platforms detected: ' + adPlatforms.join(', '));
  if (!phone && !email) notes.push('No contact info found in HTML.');

  // Detect digital maturity & marketing features
  var websitePlatform = detectWebsitePlatform_(allHtml);
  var carDealerPlatform = detectCarDealerPlatform_(allHtml);
  var mobileReady = detectMobileReady_(allHtml);
  var chatWidget = detectChatWidget_(allHtml);
  var contactForms = countContactForms_(allHtml);
  var hasBlog = detectBlog_(allHtml);
  var videoMarketing = detectVideoMarketingEnhanced_(allHtml);
  var emailPlatform = detectEmailPlatform_(allHtml);
  var carBrands = detectCarBrands_(allHtml);
  var trustpilot = detectTrustpilot_(allHtml);
  
  // Extract domain from base URL for marketplace detection
  var domain = baseUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
  var carMarketplaces = detectCarMarketplacePlatforms_(allHtml, domain);
  
  // Extract dealer name from domain for AutoUncle check
  var dealerName = domain.replace(/\.(dk|com|no|se)$/, '');
  var autoUncleStatus = checkAutoUncleAdmin_(dealerName, domain);

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
    websitePlatform: websitePlatform,
    carDealerPlatform: carDealerPlatform,
    mobileReady: mobileReady,
    chatWidget: chatWidget,
    contactForms: contactForms,
    hasBlog: hasBlog,
    videoMarketing: videoMarketing,
    emailPlatform: emailPlatform,
    carBrands: carBrands,
    trustpilot: trustpilot,
    carMarketplaces: carMarketplaces,
    autoUncleStatus: autoUncleStatus,
    notes: notes.join(' | '),
    pagesScanned: pagesScanned
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
 * Detect website platform/CMS from HTML.
 * @param {string} html - The HTML content to search
 * @return {string} Platform name or 'Custom/Unknown'
 */
function detectWebsitePlatform_(html) {
  var platforms = [
    { name: 'WordPress', patterns: ['wp-content', 'wp-includes', /generator.*WordPress/i] },
    { name: 'Wix', patterns: ['wix.com', 'wixstatic.com'] },
    { name: 'Shopify', patterns: ['cdn.shopify.com', 'myshopify.com'] },
    { name: 'Webflow', patterns: ['webflow.io', 'webflow.com'] },
    { name: 'Squarespace', patterns: ['squarespace.com'] },
    { name: 'Joomla', patterns: ['/components/com_', '/modules/mod_', 'Joomla!'] },
    { name: 'Drupal', patterns: ['drupal.js', '/sites/all/modules/', '/sites/default/'] }
  ];
  
  for (var i = 0; i < platforms.length; i++) {
    var p = platforms[i];
    for (var j = 0; j < p.patterns.length; j++) {
      var pattern = p.patterns[j];
      if (typeof pattern === 'string') {
        if (html.indexOf(pattern) !== -1) return p.name;
      } else {
        if (pattern.test(html)) return p.name;
      }
    }
  }
  return 'Custom/Unknown';
}

/**
 * Detect if website is mobile-ready.
 * @param {string} html - The HTML content to search
 * @return {string} 'Ja', 'Sandsynligvis', or 'Nej'
 */
function detectMobileReady_(html) {
  var hasViewport = /<meta[^>]*viewport[^>]*>/i.test(html);
  var hasBootstrap = /bootstrap/i.test(html);
  var hasFoundation = /foundation/i.test(html);
  var hasResponsiveCSS = /@media.*screen/i.test(html);
  
  if (hasViewport && (hasBootstrap || hasFoundation || hasResponsiveCSS)) {
    return 'Ja';
  }
  return hasViewport ? 'Sandsynligvis' : 'Nej';
}

/**
 * Detect chat widgets on website.
 * @param {string} html - The HTML content to search
 * @return {string} Comma-separated chat widget names or 'Ingen'
 */
function detectChatWidget_(html) {
  var chatWidgets = [
    { name: 'Intercom', patterns: ['intercom.io', 'intercom.com'] },
    { name: 'Drift', patterns: ['drift.com', 'driftt.com'] },
    { name: 'LiveChat', patterns: ['livechatinc.com', 'livechat.com'] },
    { name: 'Zendesk', patterns: ['zendesk.com', 'zdassets.com'] },
    { name: 'Tawk.to', patterns: ['tawk.to'] },
    { name: 'Crisp', patterns: ['crisp.chat'] },
    { name: 'Messenger', patterns: ['facebook.com/plugins/customerchat', 'connect.facebook.net/en_US/sdk/xfbml.customerchat'] }
  ];
  
  var found = [];
  for (var i = 0; i < chatWidgets.length; i++) {
    var widget = chatWidgets[i];
    for (var j = 0; j < widget.patterns.length; j++) {
      if (html.indexOf(widget.patterns[j]) !== -1) {
        found.push(widget.name);
        break;
      }
    }
  }
  return found.length > 0 ? found.join(', ') : 'Ingen';
}

/**
 * Count contact forms on website.
 * @param {string} html - The HTML content to search
 * @return {string} Form count description or 'Ingen'
 */
function countContactForms_(html) {
  var forms = extractAll_(html, /<form[^>]*>[\s\S]*?<\/form>/gi);
  
  var contactForms = 0;
  for (var i = 0; i < forms.length; i++) {
    var form = forms[i].toLowerCase();
    if ((form.indexOf('email') !== -1 || form.indexOf('mail') !== -1 || 
         form.indexOf('telefon') !== -1 || form.indexOf('phone') !== -1) &&
        (form.indexOf('textarea') !== -1 || form.indexOf('message') !== -1 || 
         form.indexOf('besked') !== -1 || form.indexOf('kommentar') !== -1)) {
      contactForms++;
    }
  }
  
  return contactForms > 0 ? contactForms.toString() : 'Ingen';
}

/**
 * Detect blog/news section.
 * @param {string} html - The HTML content to search
 * @return {string} 'Ja' with path or 'Nej'
 */
function detectBlog_(html) {
  var blogPatterns = ['/blog', '/nyheder', '/news', '/artikler', '/articles'];
  
  var lower = html.toLowerCase();
  for (var i = 0; i < blogPatterns.length; i++) {
    if (lower.indexOf(blogPatterns[i]) !== -1) {
      return 'Ja (' + blogPatterns[i] + ')';
    }
  }
  return 'Nej';
}

/**
 * Detect video marketing platforms.
 * @param {string} html - The HTML content to search
 * @return {string} Video platforms with counts or 'Ingen'
 */
function detectVideoMarketing_(html) {
  var videoPatterns = [
    { name: 'YouTube', pattern: /youtube\.com\/embed|youtube\.com\/watch|youtu\.be\//gi },
    { name: 'Vimeo', pattern: /vimeo\.com/gi },
    { name: 'Wistia', pattern: /wistia\.com/gi }
  ];
  
  var found = [];
  for (var i = 0; i < videoPatterns.length; i++) {
    var matches = html.match(videoPatterns[i].pattern);
    if (matches && matches.length > 0) {
      found.push(videoPatterns[i].name + ' (' + matches.length + ')');
    }
  }
  return found.length > 0 ? found.join(', ') : 'Ingen';
}

/**
 * Detect email marketing platform.
 * @param {string} html - The HTML content to search
 * @return {string} Platform name or 'Ingen'
 */
function detectEmailPlatform_(html) {
  var platforms = [
    { name: 'Mailchimp', patterns: ['mailchimp.com', 'mc.us', 'list-manage.com'] },
    { name: 'ActiveCampaign', patterns: ['activecampaign.com', 'activehosted.com'] },
    { name: 'GetResponse', patterns: ['getresponse.com'] },
    { name: 'Klaviyo', patterns: ['klaviyo.com', 'a.klaviyo.com'] },
    { name: 'SendGrid', patterns: ['sendgrid.com', 'sendgrid.net'] },
    { name: 'HubSpot', patterns: ['hubspot.com', 'hs-scripts.com', 'hs-banner.com', 'hsforms.com'] },
    { name: 'Brevo (Sendinblue)', patterns: ['sendinblue.com', 'brevo.com'] },
    { name: 'Omnisend', patterns: ['omnisend.com'] },
    { name: 'Customer.io', patterns: ['customer.io', 'customerio'] },
    { name: 'ConvertKit', patterns: ['convertkit.com'] },
    { name: 'Drip', patterns: ['drip.com', 'getdrip.com'] },
    { name: 'Campaign Monitor', patterns: ['createsend.com', 'campaignmonitor.com'] }
  ];
  
  for (var i = 0; i < platforms.length; i++) {
    var p = platforms[i];
    for (var j = 0; j < p.patterns.length; j++) {
      if (html.indexOf(p.patterns[j]) !== -1) {
        return p.name;
      }
    }
  }
  return 'Ingen';
}

/**
 * Detect car dealer website platform/solution.
 * @param {string} html - The HTML content to search
 * @return {string} Platform name or 'Ingen'
 */
function detectCarDealerPlatform_(html) {
  var platforms = [
    { name: 'CarAds', patterns: ['carads', '__carads', 'ca_cta_', 'car_ads_url', 'window.CarAds'] },
    { name: 'Attityde', patterns: ['attityde.dk', 'attityde.com', 'attityde-'] },
    { name: 'Bilinfo', patterns: ['bilinfo.net', 'bilinfo.dk', 'bilinfo-'] },
    { name: 'AutoDesktop', patterns: ['autodesktop.dk', 'autodesktop.com', 'autodesktop-'] },
    { name: 'DealerSocket', patterns: ['dealersocket.com', 'dealer-socket'] },
    { name: 'AutoIT', patterns: ['autoit.dk', 'autoit.com'] },
    { name: 'Bilbasen Pro', patterns: ['bilbasen.dk/pro', 'bilbasenpro'] },
    { name: 'Hedin IT', patterns: ['hedin-it', 'hedinit'] }
  ];
  
  for (var i = 0; i < platforms.length; i++) {
    var p = platforms[i];
    for (var j = 0; j < p.patterns.length; j++) {
      if (html.toLowerCase().indexOf(p.patterns[j].toLowerCase()) !== -1) {
        return p.name;
      }
    }
  }
  return 'Ingen';
}

/**
 * Detect car brands/makes sold by dealer
 * @param {string} html - The HTML content to search
 * @return {string} Comma-separated list of brands or 'Ingen'
 */
function detectCarBrands_(html) {
  var brands = [
    'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'VW', 'Toyota', 'Ford', 'Volvo',
    'Opel', 'Peugeot', 'Citroën', 'Renault', 'Nissan', 'Mazda', 'Honda',
    'Hyundai', 'Kia', 'Skoda', 'Seat', 'Fiat', 'Alfa Romeo', 'Jeep',
    'Tesla', 'Porsche', 'Land Rover', 'Range Rover', 'Jaguar', 'Mini',
    'Lexus', 'Suzuki', 'Mitsubishi', 'Subaru', 'Dacia', 'MG'
  ];
  
  var found = [];
  var lowerHtml = html.toLowerCase();
  
  for (var i = 0; i < brands.length; i++) {
    var brand = brands[i];
    var lowerBrand = brand.toLowerCase();
    
    // Søg efter brand med word boundaries (ikke del af andet ord)
    var patterns = [
      new RegExp('\\b' + lowerBrand + '\\b', 'i'),
      new RegExp(lowerBrand + '[-\\s]', 'i'),
      new RegExp('>' + lowerBrand + '<', 'i')
    ];
    
    for (var j = 0; j < patterns.length; j++) {
      if (patterns[j].test(html)) {
        if (!contains_(found, brand)) {
          found.push(brand);
        }
        break;
      }
    }
  }
  
  // Sorter alfabetisk
  found.sort();
  
  return found.length > 0 ? found.join(', ') : 'Ingen';
}

/**
 * Detect Trustpilot rating
 * @param {string} html - The HTML content to search
 * @return {string} Rating with review count or 'Ingen'
 */
function detectTrustpilot_(html) {
  // Find Trustpilot widget or link
  var hasTrustpilot = /trustpilot\.com/i.test(html);
  
  if (!hasTrustpilot) return 'Ingen';
  
  // Try to extract Trustpilot company URL
  var trustpilotUrl = null;
  var urlPatterns = [
    /https?:\/\/(?:www\.|dk\.)?trustpilot\.com\/review\/([a-zA-Z0-9\-\.]+)/i,
    /data-businessunit-id=["']([a-f0-9\-]+)["']/i, // Widget business unit ID
    /data-template-id=["']([a-f0-9\-]+)["']/i
  ];
  
  for (var i = 0; i < urlPatterns.length; i++) {
    var match = html.match(urlPatterns[i]);
    if (match && match[1]) {
      if (i === 0) {
        // Direct URL match - we have the domain
        trustpilotUrl = 'https://www.trustpilot.com/review/' + match[1];
        Logger.log('Found Trustpilot URL: ' + trustpilotUrl);
        break;
      }
    }
  }
  
  // Try to extract rating from embedded JSON-LD or meta tags first
  var ratingPatterns = [
    /"ratingValue"\s*:\s*"?([\d.]+)"?/i,
    /"aggregateRating"[^}]*"ratingValue"\s*:\s*"?([\d.]+)"?/i,
    /trustScore['"]\s*:\s*"?([\d.]+)"?/i,
    /stars:\s*"?([\d.]+)"?/i,
    /data-stars=["']([\d.]+)["']/i,
    /TrustScore[^\d]+([\d.]+)/i
  ];
  
  for (var i = 0; i < ratingPatterns.length; i++) {
    var match = html.match(ratingPatterns[i]);
    if (match && match[1]) {
      var rating = parseFloat(match[1]);
      if (rating >= 1 && rating <= 5) {
        Logger.log('Found Trustpilot rating in HTML: ' + rating);
        return rating.toFixed(1) + '★';
      }
    }
  }
  
  // If we have a URL, try to fetch the actual rating from Trustpilot
  if (trustpilotUrl) {
    try {
      Utilities.sleep(FETCH_DELAY_MS);
      var response = UrlFetchApp.fetch(trustpilotUrl, {
        muteHttpExceptions: true,
        followRedirects: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AutoUncleCheatSheet/2.2)'
        }
      });
      
      if (response.getResponseCode() === 200) {
        var pageHtml = response.getContentText();
        
        // Try to extract from Trustpilot page
        var trustpilotPagePatterns = [
          /"ratingValue"\s*:\s*"?([\d.]+)"?/i,
          /TrustScore[^\d]+([\d.]+)/i,
          /class="[^"]*rating[^"]*"[^>]*>([\d.]+)/i
        ];
        
        for (var i = 0; i < trustpilotPagePatterns.length; i++) {
          var match = pageHtml.match(trustpilotPagePatterns[i]);
          if (match && match[1]) {
            var rating = parseFloat(match[1]);
            if (rating >= 1 && rating <= 5) {
              Logger.log('Found Trustpilot rating from page: ' + rating);
              return rating.toFixed(1) + '★';
            }
          }
        }
      }
    } catch (e) {
      Logger.log('Failed to fetch Trustpilot page: ' + e.message);
    }
  }
  
  // If widget found but no rating, just confirm presence
  return 'Ja (rating skal verificeres manuelt)';
}

/**
 * Improved video marketing detection with YouTube channel support
 * @param {string} html - The HTML content to search
 * @return {string} Video platforms with details or 'Ingen'
 */
function detectVideoMarketingEnhanced_(html) {
  var results = [];
  
  // YouTube detection
  var youtubeEmbeds = (html.match(/youtube\.com\/embed/gi) || []).length;
  var youtubeWatch = (html.match(/youtube\.com\/watch/gi) || []).length;
  var youtubeShort = (html.match(/youtu\.be\//gi) || []).length;
  var youtubeChannel = html.match(/youtube\.com\/(channel\/|@|c\/)([a-zA-Z0-9_-]+)/i);
  
  if (youtubeChannel || youtubeEmbeds || youtubeWatch || youtubeShort) {
    var ytText = 'YouTube';
    var totalVids = youtubeEmbeds + youtubeWatch + youtubeShort;
    if (totalVids > 0) ytText += ' (' + totalVids + ' videos)';
    if (youtubeChannel) ytText += ' [Kanal: ' + youtubeChannel[2] + ']';
    results.push(ytText);
  }
  
  // Vimeo detection
  var vimeoMatches = (html.match(/vimeo\.com/gi) || []).length;
  if (vimeoMatches > 0) {
    results.push('Vimeo (' + vimeoMatches + ')');
  }
  
  // Wistia detection
  var wistiaMatches = (html.match(/wistia\.com|fast\.wistia\.net/gi) || []).length;
  if (wistiaMatches > 0) {
    results.push('Wistia (' + wistiaMatches + ')');
  }
  
  return results.length > 0 ? results.join(', ') : 'Ingen';
}

/**
 * Detects if car dealer markets their inventory on various car marketplace platforms.
 * Uses search URLs to check if dealer has active listings.
 * Returns formatted text with hyperlinks and counts.
 * @param {string} html - HTML content to analyze
 * @param {string} domain - Domain name (e.g., "ring-biler.dk")
 * @return {string} Formatted text with platform links, or 'Ingen'
 */
function detectCarMarketplacePlatforms_(html, domain) {
  if (!html || !domain) return 'Ingen';
  
  var results = [];
  var lowerHtml = html.toLowerCase();
  
  // Extract dealer name from domain (remove .dk/.com etc)
  var dealerName = domain.replace(/\.(dk|com|net|org)$/i, '').toLowerCase();
  
  // Create variations - only full name with/without dash
  var nameVariations = [
    dealerName,                           // ring-biler (original)
    dealerName.replace(/-/g, '')          // ringbiler (no dash)
  ];
  
  // AutoUncle - check paa_gensyn pattern
  var autouncleUrl = '';
  var autouncleFound = false;
  
  // Pattern in HTML
  if (lowerHtml.indexOf('autouncle.dk/da/paa_gensyn/' + dealerName + '-dk') > -1 ||
      lowerHtml.indexOf('autouncle.dk/da/paa_gensyn/' + dealerName + '.dk') > -1) {
    autouncleFound = true;
    autouncleUrl = 'https://www.autouncle.dk/da/paa_gensyn/' + dealerName + '-dk';
  }
  
  // Try direct URL check
  if (!autouncleFound) {
    for (var i = 0; i < nameVariations.length; i++) {
      var auUrl = 'https://www.autouncle.dk/da/paa_gensyn/' + nameVariations[i] + '-dk';
      var auCount = getCarCount_(auUrl, 'autouncle');
      if (auCount > 0) {
        autouncleFound = true;
        autouncleUrl = auUrl;
        results.push('AutoUncle (' + auCount + '): ' + auUrl);
        break;
      }
    }
  }
  if (autouncleFound && !results.length) {
    results.push('AutoUncle: ' + autouncleUrl);
  }
  
  // Bilbasen - check search URL
  var bilbasenUrl = '';
  var bilbasenFound = false;
  
  for (var j = 0; j < nameVariations.length; j++) {
    var bbUrl = 'https://www.bilbasen.dk/brugt/bil?free=' + nameVariations[j];
    var bbCount = getCarCount_(bbUrl, 'bilbasen');
    if (bbCount > 0) {
      bilbasenFound = true;
      bilbasenUrl = bbUrl;
      results.push('Bilbasen (' + bbCount + '): ' + bbUrl);
      break;
    }
  }
  
  // Bilhandel
  if (lowerHtml.indexOf('bilhandel.dk/forhandler/') > -1 || 
      (lowerHtml.indexOf('bilhandel.dk/') > -1 && lowerHtml.indexOf('biler-til-salg') > -1)) {
    results.push('Bilhandel');
  }
  
  // Biltorvet
  if (lowerHtml.indexOf('biltorvet.dk/forhandler/') > -1 || 
      (lowerHtml.indexOf('biltorvet.dk/') > -1 && lowerHtml.indexOf('soeg/forhandler') > -1)) {
    results.push('Biltorvet');
  }
  
  // dba.dk
  if (lowerHtml.indexOf('dba.dk/butik/') > -1 || 
      (lowerHtml.indexOf('dba.dk/') > -1 && lowerHtml.indexOf('bilforhandler') > -1)) {
    results.push('dba.dk');
  }
  
  // dgs.dk
  if (lowerHtml.indexOf('dgs.dk/find-forhandler/') > -1 || 
      (lowerHtml.indexOf('dgs.dk/') > -1 && lowerHtml.indexOf('forhandler') > -1)) {
    results.push('dgs.dk');
  }
  
  return results.length > 0 ? results.join(' | ') : 'Ingen';
}

/**
 * Gets the number of cars listed on a marketplace platform.
 * @param {string} url - Search URL to check
 * @param {string} platform - Platform name ('bilbasen' or 'autouncle')
 * @return {number} Number of cars found, or 0 if none/error
 */
function getCarCount_(url, platform) {
  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true
    });
    
    var code = response.getResponseCode();
    if (code < 200 || code >= 300) return 0;
    
    var content = response.getContentText();
    
    // Extract count based on platform
    if (platform === 'bilbasen') {
      // Bilbasen shows: "Viser: 42.945 biler til salg" or similar
      var match = content.match(/Viser:\s*([\d.]+)\s*biler/i);
      if (match) {
        return parseInt(match[1].replace(/\./g, ''));
      }
    } else if (platform === 'autouncle') {
      // AutoUncle shows: "21.422 tilbud" or "269 sider"
      var match = content.match(/([\d.]+)\s*tilbud/i);
      if (match) {
        return parseInt(match[1].replace(/\./g, ''));
      }
    }
    
    return 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Checks if a URL returns content (not empty search results).
 * Fetches the page and looks for indicators of actual content.
 * @param {string} url - URL to check
 * @return {boolean} True if URL has meaningful content
 */
function urlHasContent_(url) {
  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true
    });
    var code = response.getResponseCode();
    if (code < 200 || code >= 300) return false;
    
    var content = response.getContentText().toLowerCase();
    
    // Check for "no results" indicators
    if (content.indexOf('ingen resultater') > -1 || 
        content.indexOf('0 resultater') > -1 ||
        content.indexOf('no results') > -1) {
      return false;
    }
    
    // Check for positive indicators (car listings)
    if (content.indexOf('resultater') > -1 || 
        content.indexOf('biler') > -1 ||
        content.indexOf('annoncer') > -1) {
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Checks if a URL exists by making a HEAD request (faster than GET).
 * Returns true if status is 200-299.
 * @param {string} url - URL to check
 * @return {boolean} True if URL exists
 */
function urlExists_(url) {
  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'head',
      muteHttpExceptions: true,
      followRedirects: false
    });
    var code = response.getResponseCode();
    return (code >= 200 && code < 300);
  } catch (e) {
    return false;
  }
}

/**
 * Optional AI briefing via Gemini.
 * Set Script Properties:
 * - GEMINI_API_KEY = your key
 *
 * Endpoint documented here:
 * https://ai.google.dev/api/generate-content
 * 
 * Generates comprehensive briefing aligned with 6-slide sales presentation:
 * 1. Company Overview
 * 2. Digital Maturity Assessment
 * 3. Financial Context
 * 4. Competitive Landscape
 * 5. Sales Opportunities
 * 6. Key Questions
 */
function generateBriefingGemini_(url, result) {
  var props = PropertiesService.getScriptProperties();
  var key = (props.getProperty('GEMINI_API_KEY') || '').toString().trim();
  if (!key) {
    return 'AI briefing: (no GEMINI_API_KEY set)';
  }

  var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

  // Build comprehensive, structured prompt for 6-slide presentation
  var prompt = 
    'Du er sales-konsulent hos AutoUncle. Lav en skarp, struktureret briefing på dansk til salgsmøde med bilforhandler.\n\n' +
    
    '📊 VIRKSOMHEDSDATA:\n' +
    'URL: ' + url + '\n' +
    'Domain: ' + (result.domain || '-') + '\n' +
    'CVR: ' + (result.cvr || 'Ikke fundet') + '\n' +
    'Kontakt: ' + (result.phone || 'Ingen tlf') + ' | ' + (result.email || 'Ingen email') + '\n\n' +
    
    '💻 TEKNOLOGI & PLATFORM:\n' +
    'Website Platform: ' + (result.websitePlatform || 'Ukendt') + '\n' +
    'Bilforhandler Platform: ' + (result.carDealerPlatform || 'Ingen dedikeret platform') + '\n' +
    'Mobile-Ready: ' + (result.mobileReady || 'Ikke tjekket') + '\n' +
    'Cookie/CMP: ' + (result.cmp || 'Ingen') + '\n' +
    'Chat Widget: ' + (result.chatWidget || 'Ingen') + '\n\n' +
    
    '📈 TRACKING & ANALYTICS:\n' +
    'GA4: ' + (result.ga4 || 'Nej') + (result.ga4Ids.length ? ' (ID: ' + result.ga4Ids.join(', ') + ')' : '') + '\n' +
    'GTM: ' + (result.gtm || 'Nej') + (result.gtmIds.length ? ' (ID: ' + result.gtmIds.join(', ') + ')' : '') + '\n' +
    'Meta Pixel: ' + (result.metaPixel || 'Nej') + (result.metaPixelIds.length ? ' (ID: ' + result.metaPixelIds.join(', ') + ')' : '') + '\n' +
    'Google Ads: ' + (result.googleAdsTag || 'Nej') + (result.googleAdsAWIds.length ? ' (' + result.googleAdsAWIds.length + ' AW-IDs)' : '') + '\n\n' +
    
    '🎯 MARKETING TOOLS:\n' +
    'Email Platform: ' + (result.emailPlatform || 'Ingen detekteret') + '\n' +
    'Kontaktformularer: ' + (result.contactForms || '0') + '\n' +
    'Blog: ' + (result.hasBlog || 'Nej') + '\n\n' +
    
    '💰 FINANSIELLE DATA (Proff.dk):\n' +
    'Omsætning: ' + (result.revenue || 'Ikke tilgængelig') + '\n' +
    'Resultat: ' + (result.profit || 'Ikke tilgængelig') + '\n' +
    'Ansatte: ' + (result.employees || 'Ukendt') + '\n\n' +
    
    '🏁 KONKURRENCE & SOCIAL:\n' +
    'Konkurrenter: ' + (result.competitors.length ? result.competitors.join(', ') : 'Ingen identificeret') + '\n' +
    'Social Media: ' + (result.socialMedia.length ? result.socialMedia.join(', ') : 'Ingen') + '\n' +
    'Ad Platforms: ' + (result.adPlatforms.length ? result.adPlatforms.join(', ') : 'Ingen') + '\n\n' +
    
    '🎬 INDHOLD & BRAND:\n' +
    'Video Marketing: ' + (result.videoMarketing || 'Ingen') + '\n' +
    'Bilmærker: ' + (result.carBrands || 'Ikke identificeret') + '\n' +
    'Trustpilot: ' + (result.trustpilot || 'Ingen rating') + '\n' +
    'Bil Salgsplatforme: ' + (result.carMarketplaces || 'Ingen') + '\n\n' +
    
    '---\n\n' +
    
    'OPGAVE: Lav struktureret briefing til disse 6 slides.\n\n' +
    
    'VIGTIGT OM TRACKING STATUS:\n' +
    '- "Sandsynligvis (via GTM)" betyder GTM ER installeret, og GA4 er sandsynligvis også aktiveret via GTM (moderne best practice)\n' +
    '- "Yes" eller "Ja" betyder verificeret installeret\n' +
    '- Kun "No" eller "Nej" betyder reelt manglende\n' +
    '- Vær POSITIV når GTM er til stede - det er tegn på digital modenhed!\n\n' +
    
    'FORMAT REQUIREMENT: Start hver sektion med det eksakte numbered header, så parseren kan opdele indholdet:\n\n' +
    
    '1. COMPANY OVERVIEW\n' +
    '• Virksomhedsprofil (navn, CVR hvis relevant)\n' +
    '• Platform setup (WordPress/CarAds)\n' +
    '• Finansiel størrelse hvis data\n' +
    'Hold under 50 ord.\n\n' +
    
    '2. DIGITAL MODNING\n' +
    '• Tracking status - BRUG FAKTISKE DATA fra ovenstående (GA4/GTM/Meta Pixel status)\n' +
    '• Marketing tools (Email/Ads/Blog)\n' +
    '• UX niveau (mobile/chat)\n' +
    '• Samlet score 1-5 baseret på FAKTISK setup\n' +
    'Hold under 50 ord.\n\n' +
    
    '3. FINANSIEL VURDERING\n' +
    '• Omsætning og størrelse i kontekst\n' +
    '• AutoUncle potentiale baseret på størrelse\n' +
    'Hold under 50 ord.\n\n' +
    
    '4. KONKURRENCELANDSKAB\n' +
    '• Konkurrenter (navne)\n' +
    '• Social/digital tilstedeværelse\n' +
    'Hold under 50 ord.\n\n' +
    
    '5. SALGSMULIGHEDER\n' +
    '• Konkrete gaps i deres setup\n' +
    '• Forbedringer vs best practice\n' +
    '• AutoUncle værditilbud\n' +
    'Hold under 50 ord.\n\n' +
    
    '6. KEY QUESTIONS\n' +
    '• Strategiske spørgsmål til mødet baseret på mangler (2-3 spørgsmål)\n' +
    'Hold under 50 ord.\n\n' +
    
    'KRITISKE REGLER:\n' +
    '- START hver sektion med eksakt "1. COMPANY OVERVIEW", "2. DIGITAL MODNING" osv.\n' +
    '- BRUG ALDRIG markdown bold/italic (**, *, ###, ```)\n' +
    '- Start punkter med • ikke med *\n' +
    '- Max 250 ord total\n' +
    '- Brug simple bullets, ingen nested lists';

  var payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { 
      temperature: 0.7, 
      maxOutputTokens: 3000
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
    logError_('AI_API_FAILURE', 'Gemini HTTP ' + code + ': ' + resp.getContentText());
    throw new Error('Gemini HTTP ' + code + ': ' + resp.getContentText());
  }

  var data = JSON.parse(resp.getContentText());
  
  // Check for safety blocks or other issues
  if (!data.candidates || data.candidates.length === 0) {
    Logger.log('Gemini returned no candidates. Full response: ' + JSON.stringify(data));
    if (data.promptFeedback && data.promptFeedback.blockReason) {
      logWarning_('AI_BLOCKED', 'Reason: ' + data.promptFeedback.blockReason);
      return 'AI briefing blocked: ' + data.promptFeedback.blockReason;
    }
    logWarning_('AI_NO_RESPONSE', 'Gemini returned no candidates');
    return 'AI briefing: No response generated.';
  }
  
  var candidate = data.candidates[0];
  
  // Check finish reason
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    Logger.log('Gemini stopped with reason: ' + candidate.finishReason);
    Logger.log('Full candidate: ' + JSON.stringify(candidate));
    logWarning_('AI_INCOMPLETE', 'Finish reason: ' + candidate.finishReason);
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
        // Revenue in thousands (tkr) - multiply by 1000 and format
        var actualValue = numValue * 1000;
        var formatted = formatDanishNumber_(actualValue);
        Logger.log('Formatted ' + label + ': ' + value + ' tkr -> ' + formatted + ' kr');
        return formatted + ' kr'; // Add ' kr' suffix for clarity
      } else if (label === 'Resultat') {
        // Profit can be negative (loss) - only skip very small positive values
        if (numValue > 0 && absValue < 10) {
          Logger.log('Too low positive value for profit, skipping');
          continue;
        }
        // Profit in thousands (tkr) - multiply by 1000 and format (preserves negative)
        var actualValue = numValue * 1000;
        var formatted = formatDanishNumber_(actualValue);
        Logger.log('Formatted ' + label + ': ' + value + ' tkr -> ' + formatted + ' kr');
        return formatted + ' kr'; // Add ' kr' suffix for clarity
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
  var currentHeader = sh.getRange(1, COL.REVENUE).getValue();
  if (currentHeader.indexOf(year) === -1) {
    sh.getRange(1, COL.REVENUE).setValue('Proff Omsætning ' + year);
    sh.getRange(1, COL.PROFIT).setValue('Proff Resultat ' + year);
    sh.getRange(1, COL.EMPLOYEES).setValue('Proff Ansatte ' + year);
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
    // Multiply by 1000 and format (Proff shows values in thousands)
    var actualValue = numValue * 1000;
    var formatted = formatDanishNumber_(actualValue);
    Logger.log('Found ' + label + ' from "' + searchLabel + '": ' + value + ' tkr -> ' + formatted + ' kr');
    return formatted + ' kr'; // Add ' kr' suffix for clarity
  } else if (label === 'Resultat') {
    // Profit can be negative (loss) - only skip very small positive values
    if (numValue > 0 && absValue < 10) {
      Logger.log('Suspiciously low positive value for ' + label + ': ' + value);
      return '';
    }
    // Multiply by 1000 and format (Proff shows values in thousands, preserves negative sign)
    var actualValue = numValue * 1000;
    var formatted = formatDanishNumber_(actualValue);
    Logger.log('Found ' + label + ' from "' + searchLabel + '": ' + value + ' tkr -> ' + formatted + ' kr');
    return formatted + ' kr'; // Add ' kr' suffix for clarity
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
  
  // Hent data fra rækken - tilpasset til ny kolonnestruktur (36 kolonner A-AJ)
  var data = sh.getRange(row, 1, 1, 36).getValues()[0];
  
  var leadData = {
    // GRUNDDATA (A-E: 1-5)
    url: data[0] || '',
    domain: data[1] || '',
    cvr: data[2] || '',
    phone: data[3] || '',
    email: data[4] || '',
    
    // TEKNOLOGI & PLATFORM (F-J: 6-10)
    websitePlatform: data[5] || '',
    carDealerPlatform: data[6] || '',
    mobileReady: data[7] || '',
    cmp: data[8] || '',
    chatWidget: data[9] || '',
    
    // TRACKING & ANALYTICS (K-Q: 11-17)
    ga4: data[10] || '',
    ga4Ids: data[11] || '',
    gtm: data[12] || '',
    gtmIds: data[13] || '',
    metaPixel: data[14] || '',
    metaPixelIds: data[15] || '',
    googleAdsTag: data[16] || '',
    
    // MARKETING TOOLS (R-U: 18-21)
    googleAdsAWIds: data[17] || '',
    emailPlatform: data[18] || '',
    contactForms: data[19] || '',
    hasBlog: data[20] || '',
    
    // BUSINESS DATA (V-Y: 22-25)
    proffUrl: data[21] || '',
    proffRevenue: data[22] || '',
    proffProfit: data[23] || '',
    proffEmployees: data[24] || '',
    
    // KONKURRENCE & SOCIAL (Z-AB: 26-28)
    competitors: data[25] || '',
    socialMedia: data[26] || '',
    adPlatforms: data[27] || '',
    
    // MEDIA & INDHOLD (AC-AF: 29-32)
    videoMarketing: data[28] || '',
    carBrands: data[29] || '',
    trustpilot: data[30] || '',
    carMarketplaces: data[31] || '',
    
    // METADATA (AG-AJ: 33-36)
    pagesScanned: data[32] || '',
    lastRun: data[33] || '',
    aiBriefing: data[34] || '',  // Column AI (35) - struktureret AI analyse
    notes: data[35] || ''
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
    
    // Parse AI briefing til strukturerede sektioner
    var aiSections = parseAiBriefing_(leadData.aiBriefing);
    
    // Log if parser found sections
    if (!aiSections.overview && !aiSections.digital) {
      logWarning_('PARSER_EMPTY', 'AI briefing kunne ikke parses korrekt', row);
    }
    
    // Slide 1: Forside
    createTitleSlide_(presentation, leadData, aiSections);
    
    // Slide 2: Virksomhedsinfo (bruger AI section 1: COMPANY OVERVIEW)
    createCompanyInfoSlide_(presentation, leadData, aiSections);
    
    // Slide 3: Digital Modenhed (bruger AI section 2: DIGITAL MODNING)
    createDigitalMaturitySlide_(presentation, leadData, aiSections);
    
    // Slide 4: Økonomiske Data (bruger AI section 3: FINANSIEL VURDERING)
    if (leadData.proffRevenue || leadData.proffProfit || leadData.proffEmployees || aiSections.financial) {
      createFinancialSlide_(presentation, leadData, aiSections);
    }
    
    // Slide 5: Konkurrence (bruger AI section 4: KONKURRENCELANDSKAB)
    if (leadData.competitors || leadData.socialMedia || aiSections.competitive) {
      createCompetitiveSlide_(presentation, leadData, aiSections);
    }
    
    // Slide 6: Muligheder (bruger AI section 5: SALGSMULIGHEDER)
    createOpportunitiesSlide_(presentation, leadData, aiSections);
    
    // Slide 7: Next Steps (bruger AI section 6: KEY QUESTIONS)
    createNextStepsSlide_(presentation, leadData, aiSections);
    
    // Åbn præsentationen
    var url = 'https://docs.google.com/presentation/d/' + presentationId + '/edit';
    
    // Gem URL i Notes (kolonne AJ)
    var currentNotes = sh.getRange(row, COL.NOTES).getValue();
    var newNotes = currentNotes ? currentNotes + '\n[Pitch: ' + url + ']' : '[Pitch: ' + url + ']';
    sh.getRange(row, COL.NOTES).setValue(newNotes);
    
    logSuccess_('PRESENTATION_CREATED', 'Pitch for ' + leadData.domain + ': ' + url, row);
    
    // Vis HTML dialog med klikbart link
    var html = HtmlService.createHtmlOutput(
      '<h2>✅ Præsentation oprettet!</h2>' +
      '<p><strong>' + leadData.domain + '</strong></p>' +
      '<p><a href="' + url + '" target="_blank" style="display:inline-block;padding:10px 20px;background:#4285f4;color:white;text-decoration:none;border-radius:4px;font-weight:bold;">Åbn præsentation</a></p>' +
      '<p style="margin-top:20px;font-size:11px;color:#666;">Link er også gemt i Notes-kolonnen</p>'
    ).setWidth(400).setHeight(200);
    
    SpreadsheetApp.getUi().showModalDialog(html, 'Sales Pitch oprettet');
    
  } catch (e) {
    logError_('PRESENTATION_FAILED', e.toString(), row);
    SpreadsheetApp.getUi().alert('❌ Fejl ved oprettelse af præsentation:\n\n' + e.toString());
    Logger.log('Presentation error: ' + e.toString());
  }
}

/**
 * Parser AI briefing til strukturerede sektioner
 * Returnerer objekt med sektioner: overview, digital, financial, competitive, opportunities, questions
 */
function parseAiBriefing_(briefing) {
  if (!briefing || briefing.indexOf('AI briefing:') !== -1) {
    // Ingen valid briefing
    return {
      overview: '',
      digital: '',
      financial: '',
      competitive: '',
      opportunities: '',
      questions: ''
    };
  }
  
  var sections = {
    overview: '',
    digital: '',
    financial: '',
    competitive: '',
    opportunities: '',
    questions: ''
  };
  
  // Split på section headers (case-insensitive)
  var text = briefing.toString();
  
  // Extract sections using regex patterns
  var overviewMatch = text.match(/1\.\s*COMPANY OVERVIEW[:\s]*([^]*?)(?=\n\s*2\.|$)/i);
  if (overviewMatch) sections.overview = overviewMatch[1].trim();
  
  var digitalMatch = text.match(/2\.\s*DIGITAL MOD[NØ]ING[:\s]*([^]*?)(?=\n\s*3\.|$)/i);
  if (digitalMatch) sections.digital = digitalMatch[1].trim();
  
  var financialMatch = text.match(/3\.\s*FINANSIEL VURDERING[:\s]*([^]*?)(?=\n\s*4\.|$)/i);
  if (financialMatch) sections.financial = financialMatch[1].trim();
  
  var competitiveMatch = text.match(/4\.\s*KONKURRENCEL[AØ]NDSKAB[:\s]*([^]*?)(?=\n\s*5\.|$)/i);
  if (competitiveMatch) sections.competitive = competitiveMatch[1].trim();
  
  var opportunitiesMatch = text.match(/5\.\s*SALGSMULIGHEDER[:\s]*([^]*?)(?=\n\s*6\.|$)/i);
  if (opportunitiesMatch) sections.opportunities = opportunitiesMatch[1].trim();
  
  var questionsMatch = text.match(/6\.\s*KEY QUESTIONS[:\s]*([^]*?)$/i);
  if (questionsMatch) sections.questions = questionsMatch[1].trim();
  
  return sections;
}

// ============================================================================
// SLIDE STYLING CONSTANTS
// ============================================================================
var SLIDE_THEME = {
  colors: {
    primary: '#1a73e8',      // Google Blue
    secondary: '#34a853',    // Success Green
    accent: '#fbbc04',       // Warning Yellow
    danger: '#ea4335',       // Error Red
    dark: '#202124',         // Dark text
    light: '#5f6368',        // Light text
    background: '#f8f9fa'    // Light background
  },
  fonts: {
    title: 'Montserrat',
    body: 'Roboto',
    mono: 'Roboto Mono'
  },
  sizes: {
    titleLarge: 32,
    titleMedium: 24,
    titleSmall: 18,
    bodyLarge: 14,
    bodyMedium: 12,
    bodySmall: 10
  }
};

/**
 * Apply professional styling to text
 */
function styleText_(textRange, options) {
  var style = textRange.getTextStyle();
  
  if (options.color) {
    style.setForegroundColor(options.color);
  }
  if (options.fontSize) {
    style.setFontSize(options.fontSize);
  }
  if (options.fontFamily) {
    style.setFontFamily(options.fontFamily);
  }
  if (options.bold !== undefined) {
    style.setBold(options.bold);
  }
  if (options.italic !== undefined) {
    style.setItalic(options.italic);
  }
  
  return style;
}

/**
 * Apply background color to slide
 */
function setSlideBackground_(slide, color) {
  var background = slide.getBackground();
  background.setSolidFill(color);
}

/**
 * Clean markdown formatting from AI text for slide display
 */
function cleanMarkdown_(text) {
  if (!text) return '';
  
  var cleaned = text.toString();
  
  // Remove markdown headers (### Header -> Header)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  
  // Remove bold/italic (**text** -> text, *text* -> text)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  
  // Remove code blocks and inline code
  cleaned = cleaned.replace(/```[^`]*```/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Convert markdown bullets to simple bullets
  // Handle both * and - at start of lines, with any amount of whitespace
  cleaned = cleaned.replace(/^\s*[\*\-]\s+/gm, '\u2022 ');
  
  // Remove links but keep text [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove horizontal rules
  cleaned = cleaned.replace(/^[-*_]{3,}$/gm, '');
  
  // Clean up multiple spaces
  cleaned = cleaned.replace(/  +/g, ' ');
  
  // Remove extra blank lines (more than 2 newlines -> 2 newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Split long text into chunks that fit on slides (max ~400 chars per slide)
 */
function splitTextForSlides_(text, maxLength) {
  if (!text || text.length <= maxLength) return [text];
  
  var chunks = [];
  var paragraphs = text.split('\n\n');
  var currentChunk = '';
  
  for (var i = 0; i < paragraphs.length; i++) {
    var para = paragraphs[i];
    
    if ((currentChunk + '\n\n' + para).length > maxLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Forside slide - Clean, professional title
 */
function createTitleSlide_(presentation, data, aiSections) {
  var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  
  // Set gradient-like background with primary color
  setSlideBackground_(slide, SLIDE_THEME.colors.primary);
  
  // Main title
  var titleBox = slide.insertTextBox('AutoUncle Sales Pitch', 50, 150, 600, 80);
  var titleText = titleBox.getText();
  styleText_(titleText, {
    color: '#FFFFFF',
    fontSize: SLIDE_THEME.sizes.titleLarge,
    fontFamily: SLIDE_THEME.fonts.title,
    bold: true
  });
  titleText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  
  // Subtitle with company name
  var subtitleBox = slide.insertTextBox(data.domain.toUpperCase(), 50, 250, 600, 60);
  var subtitleText = subtitleBox.getText();
  styleText_(subtitleText, {
    color: '#E8F0FE',
    fontSize: SLIDE_THEME.sizes.titleMedium,
    fontFamily: SLIDE_THEME.fonts.body,
    bold: false
  });
  subtitleText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  
  // Date and CVR footer
  var footerText = new Date().toLocaleDateString('da-DK');
  if (data.cvr) footerText += ' • CVR: ' + data.cvr;
  var footerBox = slide.insertTextBox(footerText, 50, 480, 600, 30);
  var footer = footerBox.getText();
  styleText_(footer, {
    color: '#B8D4FE',
    fontSize: SLIDE_THEME.sizes.bodySmall,
    fontFamily: SLIDE_THEME.fonts.body
  });
  footer.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}

/**
 * Virksomhedsinfo slides - Multiple slides if content is long
 */
function createCompanyInfoSlide_(presentation, data, aiSections) {
  var content = '';
  
  if (aiSections.overview) {
    content = cleanMarkdown_(aiSections.overview);
  } else {
    // Fallback if no AI
    content = data.domain + '\n\n';
    if (data.cvr) content += 'CVR: ' + data.cvr + '\n';
    if (data.websitePlatform) content += 'Platform: ' + data.websitePlatform + '\n';
    if (data.carDealerPlatform) content += 'Bilforhandler platform: ' + data.carDealerPlatform + '\n';
  }
  
  if (!content) return;
  
  var chunks = splitTextForSlides_(content, 350);
  
  for (var i = 0; i < chunks.length; i++) {
    var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    setSlideBackground_(slide, '#FFFFFF');
    
    // Title
    var titleText = 'Virksomhedsprofil' + (chunks.length > 1 ? ' (' + (i + 1) + '/' + chunks.length + ')' : '');
    var titleBox = slide.insertTextBox(titleText, 50, 40, 600, 60);
    styleText_(titleBox.getText(), {
      color: SLIDE_THEME.colors.primary,
      fontSize: 22,
      fontFamily: SLIDE_THEME.fonts.title,
      bold: true
    });
    
    // Content
    var contentBox = slide.insertTextBox(chunks[i], 50, 120, 600, 360);
    var contentText = contentBox.getText();
    styleText_(contentText, {
      color: SLIDE_THEME.colors.dark,
      fontSize: 16,
      fontFamily: SLIDE_THEME.fonts.body
    });
    contentText.getParagraphStyle().setLineSpacing(150);
  }
}

/**
 * Digital modenhed slides - Multiple slides for tracking vs marketing tools
 */
function createDigitalMaturitySlide_(presentation, data, aiSections) {
  var content = '';
  
  if (aiSections.digital) {
    content = cleanMarkdown_(aiSections.digital);
  } else {
    // Fallback
    content = 'Digital Tracking:\n';
    content += (data.ga4 === 'Ja' ? '\u2022 GA4 aktiveret\n' : '\u2022 Mangler GA4\n');
    content += (data.gtm === 'Ja' ? '\u2022 GTM aktiveret\n' : '\u2022 Mangler GTM\n');
    content += (data.metaPixel === 'Ja' ? '\u2022 Meta Pixel aktiveret' : '\u2022 Mangler Meta Pixel');
  }
  
  if (!content) return;
  
  var chunks = splitTextForSlides_(content, 300);
  
  for (var i = 0; i < chunks.length; i++) {
    var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    setSlideBackground_(slide, '#FFFFFF');
    
    // Title
    var titleText = 'Digital Modenhed' + (chunks.length > 1 ? ' (' + (i + 1) + '/' + chunks.length + ')' : '');
    var titleBox = slide.insertTextBox(titleText, 50, 40, 600, 60);
    styleText_(titleBox.getText(), {
      color: SLIDE_THEME.colors.primary,
      fontSize: 22,
      fontFamily: SLIDE_THEME.fonts.title,
      bold: true
    });
    
    // Content
    var contentBox = slide.insertTextBox(chunks[i], 50, 120, 600, 360);
    var contentText = contentBox.getText();
    styleText_(contentText, {
      color: SLIDE_THEME.colors.dark,
      fontSize: 15,
      fontFamily: SLIDE_THEME.fonts.body
    });
    contentText.getParagraphStyle().setLineSpacing(150);
  }
}

/**
 * Økonomisk slide - AI context, minimal raw data redundancy
 */
/**
 * Økonomisk slide - Clean markdown formatting
 */
function createFinancialSlide_(presentation, data, aiSections) {
  var content = '';
  
  if (aiSections.financial) {
    content = cleanMarkdown_(aiSections.financial);
  } else if (data.proffRevenue || data.proffProfit || data.proffEmployees) {
    // Fallback with raw data
    content = 'Økonomiske nøgletal:\n\n';
    if (data.proffRevenue) content += '\u2022 Omsætning: ' + data.proffRevenue + '\n';
    if (data.proffProfit) content += '\u2022 Resultat: ' + data.proffProfit + '\n';
    if (data.proffEmployees) content += '\u2022 Ansatte: ' + data.proffEmployees;
  }
  
  if (!content) return;
  
  var chunks = splitTextForSlides_(content, 350);
  
  for (var i = 0; i < chunks.length; i++) {
    var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    setSlideBackground_(slide, '#FFFFFF');
    
    // Title
    var titleText = 'Økonomisk Kontekst' + (chunks.length > 1 ? ' (' + (i + 1) + '/' + chunks.length + ')' : '');
    var titleBox = slide.insertTextBox(titleText, 50, 40, 600, 60);
    styleText_(titleBox.getText(), {
      color: SLIDE_THEME.colors.primary,
      fontSize: 22,
      fontFamily: SLIDE_THEME.fonts.title,
      bold: true
    });
    
    // Content
    var contentBox = slide.insertTextBox(chunks[i], 50, 120, 600, 360);
    var contentText = contentBox.getText();
    styleText_(contentText, {
      color: SLIDE_THEME.colors.dark,
      fontSize: 16,
      fontFamily: SLIDE_THEME.fonts.body
    });
    contentText.getParagraphStyle().setLineSpacing(150);
  }
}

/**
 * Konkurrencelandskab slide - Clean formatting
 */
function createCompetitiveSlide_(presentation, data, aiSections) {
  var content = '';
  
  if (aiSections.competitive) {
    content = cleanMarkdown_(aiSections.competitive);
  } else if (data.competitors || data.socialMedia) {
    // Fallback
    if (data.competitors) content += 'Konkurrenter: ' + data.competitors + '\n\n';
    if (data.socialMedia) content += 'Social Media: ' + data.socialMedia;
  }
  
  if (!content) return;
  
  var chunks = splitTextForSlides_(content, 350);
  
  for (var i = 0; i < chunks.length; i++) {
    var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    setSlideBackground_(slide, '#FFFFFF');
    
    // Title
    var titleText = 'Konkurrencelandskab' + (chunks.length > 1 ? ' (' + (i + 1) + '/' + chunks.length + ')' : '');
    var titleBox = slide.insertTextBox(titleText, 50, 40, 600, 60);
    styleText_(titleBox.getText(), {
      color: SLIDE_THEME.colors.primary,
      fontSize: 22,
      fontFamily: SLIDE_THEME.fonts.title,
      bold: true
    });
    
    // Content
    var contentBox = slide.insertTextBox(chunks[i], 50, 120, 600, 360);
    var contentText = contentBox.getText();
    styleText_(contentText, {
      color: SLIDE_THEME.colors.dark,
      fontSize: 15,
      fontFamily: SLIDE_THEME.fonts.body
    });
    contentText.getParagraphStyle().setLineSpacing(150);
  }
}

/**
 * Muligheder slide - Clean formatting, auto-split
 */
function createOpportunitiesSlide_(presentation, data, aiSections) {
  var content = '';
  
  if (aiSections.opportunities) {
    content = cleanMarkdown_(aiSections.opportunities);
  } else {
    // Fallback
    content = 'Anbefalinger:\n\n';
    if (data.ga4 !== 'Ja') content += '\u2022 Implementer Google Analytics 4\n';
    if (data.gtm !== 'Ja') content += '\u2022 Opsæt Google Tag Manager\n';
    if (data.metaPixel !== 'Ja') content += '\u2022 Tilføj Meta Pixel tracking';
  }
  
  if (!content) return;
  
  var chunks = splitTextForSlides_(content, 350);
  
  for (var i = 0; i < chunks.length; i++) {
    var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
    setSlideBackground_(slide, '#FFFFFF');
    
    // Title
    var titleText = 'Salgsmuligheder' + (chunks.length > 1 ? ' (' + (i + 1) + '/' + chunks.length + ')' : '');
    var titleBox = slide.insertTextBox(titleText, 50, 40, 600, 60);
    styleText_(titleBox.getText(), {
      color: SLIDE_THEME.colors.secondary,
      fontSize: 22,
      fontFamily: SLIDE_THEME.fonts.title,
      bold: true
    });
    
    // Content
    var contentBox = slide.insertTextBox(chunks[i], 50, 120, 600, 360);
    var contentText = contentBox.getText();
    styleText_(contentText, {
      color: SLIDE_THEME.colors.dark,
      fontSize: 15,
      fontFamily: SLIDE_THEME.fonts.body
    });
    contentText.getParagraphStyle().setLineSpacing(150);
  }
}

/**
 * Next steps slide - Questions with clean formatting
 */
function createNextStepsSlide_(presentation, data, aiSections) {
  var content = '';
  
  if (aiSections.questions) {
    content = cleanMarkdown_(aiSections.questions);
  } else {
    // Fallback
    content = 'Spørgsmål til mødet:\n\n';
    content += '\u2022 Hvad er jeres nuværende udfordringer med bilsalg online?\n';
    content += '\u2022 Hvordan måler I effekten af jeres digitale marketing?';
  }
  
  if (!content) return;
  
  var slide = presentation.appendSlide(SlidesApp.PredefinedLayout.BLANK);
  setSlideBackground_(slide, '#FFFFFF');
  
  // Title
  var titleBox = slide.insertTextBox('Spørgsmål til Mødet', 50, 40, 600, 60);
  styleText_(titleBox.getText(), {
    color: SLIDE_THEME.colors.primary,
    fontSize: 22,
    fontFamily: SLIDE_THEME.fonts.title,
    bold: true
  });
  
  // Questions
  var questionsBox = slide.insertTextBox(content, 50, 120, 600, 280);
  var questionsText = questionsBox.getText();
  styleText_(questionsText, {
    color: SLIDE_THEME.colors.dark,
    fontSize: 15,
    fontFamily: SLIDE_THEME.fonts.body
  });
  questionsText.getParagraphStyle().setLineSpacing(150);
  
  // Call to action
  var ctaBox = slide.insertTextBox('Lad os diskutere hvordan AutoUncle kan hjælpe', 50, 420, 600, 50);
  var ctaText = ctaBox.getText();
  styleText_(ctaText, {
    color: SLIDE_THEME.colors.secondary,
    fontSize: 18,
    fontFamily: SLIDE_THEME.fonts.title,
    bold: true
  });
  ctaText.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
}

/**
 * ===================================
 * AUTOUNCLE ADMIN INTEGRATION
 * ===================================
 */

var AU_BASE = 'https://www.autouncle.dk';
var AU_LOGIN_PAGE = AU_BASE + '/en/login';
var AU_LOGIN_POST = AU_BASE + '/en/sessions';
var AU_USER_AGENT = 'Mozilla/5.0 (compatible; GoogleAppsScript; AU-LeadScanner)';
var AU_MAX_REDIRECTS = 8;

/**
 * Store AutoUncle credentials (setup step)
 */
function setupAutoUncleSession() {
  var ui = SpreadsheetApp.getUi();
  
  var emailResponse = ui.prompt(
    'AutoUncle Setup - Email',
    'Indtast din AutoUncle admin email:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (emailResponse.getSelectedButton() !== ui.Button.OK) return;
  
  var email = emailResponse.getResponseText().trim();
  if (!email) {
    ui.alert('Ingen email indtastet');
    return;
  }
  
  var passwordResponse = ui.prompt(
    'AutoUncle Setup - Password',
    'Indtast dit AutoUncle admin password:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (passwordResponse.getSelectedButton() !== ui.Button.OK) return;
  
  var password = passwordResponse.getResponseText().trim();
  if (!password) {
    ui.alert('Intet password indtastet');
    return;
  }
  
  // Store securely in script properties
  PropertiesService.getScriptProperties().setProperties({
    'AU_EMAIL': email,
    'AU_PASSWORD': password
  });
  
  // Test the connection
  ui.alert('Testing login...');
  
  if (testAutoUncleConnection_()) {
    ui.alert('Success! AutoUncle admin adgang verificeret ✓\n\nCredentials gemt sikkert.');
  } else {
    ui.alert('Fejl: Kunne ikke logge ind.\n\nTjek:\n- Email og password er korrekte\n- Du har admin adgang');
  }
}

/**
 * Login to AutoUncle and get cookie jar
 */
function autoUncleLogin_() {
  var props = PropertiesService.getScriptProperties();
  var email = props.getProperty('AU_EMAIL');
  var password = props.getProperty('AU_PASSWORD');
  
  if (!email || !password) {
    throw new Error('AutoUncle credentials not configured. Run Setup Admin Login first.');
  }
  
  // GET login page to get authenticity token
  var getLogin = fetchWithJar_({
    url: AU_LOGIN_PAGE,
    method: 'get',
    jar: '',
    headers: { 'Accept': 'text/html' }
  });
  
  var authToken = extractAuthenticityToken_(getLogin.body);
  if (!authToken) {
    throw new Error('No authenticity_token found on login page');
  }
  
  // POST credentials
  var payload = {
    authenticity_token: authToken,
    email: email,
    password: password,
    remember_me: '1',
    commit: 'Sign in'
  };
  
  var postLogin = fetchWithJar_({
    url: AU_LOGIN_POST,
    method: 'post',
    jar: getLogin.jar,
    headers: {
      'Accept': 'text/html',
      'Origin': AU_BASE,
      'Referer': AU_LOGIN_PAGE
    },
    payload: payload
  });
  
  return postLogin.jar;
}

/**
 * Fetch with manual redirects and cookie jar management
 */
function fetchWithJar_(req) {
  var jar = req.jar || '';
  var url = req.url;
  var method = (req.method || 'get').toLowerCase();
  var headers = req.headers || {};
  var payload = req.payload || null;
  
  headers['User-Agent'] = AU_USER_AGENT;
  
  for (var hop = 0; hop <= AU_MAX_REDIRECTS; hop++) {
    if (jar) headers['Cookie'] = jar;
    
    var options = {
      method: method,
      headers: headers,
      muteHttpExceptions: true,
      followRedirects: false
    };
    
    if (payload && method === 'post') {
      options.payload = payload;
    }
    
    var resp = UrlFetchApp.fetch(url, options);
    var status = resp.getResponseCode();
    var respHeaders = resp.getAllHeaders() || {};
    var body = resp.getContentText() || '';
    
    // Update cookie jar from Set-Cookie headers
    var setCookiePairs = extractSetCookiePairs_(respHeaders);
    if (setCookiePairs) {
      jar = mergeCookies_(jar, setCookiePairs);
    }
    
    var location = respHeaders['Location'] || respHeaders['location'] || '';
    
    // Follow redirects manually
    if (status >= 300 && status < 400 && location) {
      url = absolutizeUrl_(location);
      method = 'get';
      payload = null;
      delete headers['Origin'];
      continue;
    }
    
    return {
      status: status,
      headers: respHeaders,
      body: body,
      jar: jar,
      finalUrl: url
    };
  }
  
  throw new Error('Too many redirects (>' + AU_MAX_REDIRECTS + ')');
}

/**
 * Extract authenticity token from HTML
 */
function extractAuthenticityToken_(html) {
  var match = (html || '').match(/name="authenticity_token"\s+value="([^"]+)"/i);
  return match ? match[1] : '';
}

/**
 * Extract Set-Cookie pairs from headers
 */
function extractSetCookiePairs_(headers) {
  var setCookie = headers['Set-Cookie'] || headers['set-cookie'];
  if (!setCookie) return '';
  
  var arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  var parts = [];
  
  for (var i = 0; i < arr.length; i++) {
    var cookiePair = String(arr[i]).split(';')[0].trim();
    if (cookiePair) parts.push(cookiePair);
  }
  
  return parts.join('; ');
}

/**
 * Merge cookie strings
 */
function mergeCookies_(a, b) {
  var jar = {};
  
  function ingest(cookieString) {
    if (!cookieString) return;
    var parts = cookieString.split(';');
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;
      var eqIndex = part.indexOf('=');
      if (eqIndex === -1) continue;
      var name = part.slice(0, eqIndex).trim();
      var value = part.slice(eqIndex + 1).trim();
      jar[name] = value;
    }
  }
  
  ingest(a);
  ingest(b);
  
  var out = [];
  for (var key in jar) {
    out.push(key + '=' + jar[key]);
  }
  return out.join('; ');
}

/**
 * Make URL absolute
 */
function absolutizeUrl_(urlOrPath) {
  if (!urlOrPath) return '';
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  if (urlOrPath[0] === '/') return AU_BASE + urlOrPath;
  return AU_BASE + '/' + urlOrPath;
}

/**
 * Test AutoUncle admin connection
 */
function testAutoUncleConnection_() {
  try {
    var jar = autoUncleLogin_();
    
    if (!jar) {
      Logger.log('No cookie jar after login');
      return false;
    }
    
    // Fetch admin page
    var adminPage = fetchWithJar_({
      url: AU_BASE + '/admin/customers/',
      method: 'get',
      jar: jar,
      headers: { 'Accept': 'text/html' }
    });
    
    var html = adminPage.body || '';
    
    // Check if authenticated (page contains admin content)
    var isAuth = html.indexOf('admin') !== -1 && 
                 !/<title>\s*Sign in\s*-\s*AutoUncle/i.test(html) &&
                 !/sessions#new/i.test(html);
    
    Logger.log('AutoUncle test - Status: ' + adminPage.status);
    Logger.log('AutoUncle test - Authenticated: ' + (isAuth ? 'YES' : 'NO'));
    
    return isAuth;
    
  } catch (e) {
    Logger.log('AutoUncle connection error: ' + e.message);
    return false;
  }
}

/**
 * Check if dealer exists in AutoUncle admin (using synced sheet)
 */
function checkAutoUncleAdmin_(dealerName, domain) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('AutoUncle Customers');
    
    // If sheet doesn't exist, prompt to sync
    if (!sh) {
      return 'Sync required';
    }
    
    // Get all data from sheet
    var lastRow = sh.getLastRow();
    if (lastRow < 2) {
      return 'No data - sync required';
    }
    
    var data = sh.getRange(2, 1, lastRow - 1, 8).getValues(); // ID, Nickname, State, Segment, Depts, Consultant, Created, Products
    
    // Normalize function
    var normalize = function(str) {
      return str.toLowerCase()
        .replace(/[.-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    // Remove company suffixes
    var removeCompanySuffix = function(str) {
      return str.replace(/\s*(aps|a\/s|as|i\/s|is|amba|smba|p\/s|k\/s)\s*$/i, '').trim();
    };
    
    // Generate search terms
    var searchTerms = [
      dealerName.toLowerCase(),
      normalize(dealerName),
      removeCompanySuffix(dealerName.toLowerCase()),
      normalize(removeCompanySuffix(dealerName)),
      domain.toLowerCase().replace(/\.(dk|com|no|se)$/, ''),
      normalize(domain.replace(/\.(dk|com|no|se)$/, ''))
    ];
    
    // Remove duplicates
    var uniqueTerms = [];
    for (var i = 0; i < searchTerms.length; i++) {
      var term = searchTerms[i].trim();
      if (term && uniqueTerms.indexOf(term) === -1 && term.length > 2) {
        uniqueTerms.push(term);
      }
    }
    
    // Search through customers
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var customerId = row[0];
      var nickname = String(row[1] || '');
      var state = String(row[2] || '');
      
      if (!nickname) continue;
      
      var nicknameLower = nickname.toLowerCase();
      var nicknameNorm = normalize(nickname);
      var nicknameNoSpaces = nicknameLower.replace(/\s+/g, '');
      var nicknameWords = nicknameLower.split(/[\s.-]+/).filter(function(w) { return w.length > 2; });
      
      // Try matching
      for (var j = 0; j < uniqueTerms.length; j++) {
        var searchTerm = uniqueTerms[j];
        var searchTermNorm = normalize(searchTerm);
        var searchTermNoSpaces = searchTerm.replace(/\s+/g, '');
        var searchWords = searchTerm.split(/[\s.-]+/).filter(function(w) { return w.length > 2; });
        
        var matched = false;
        
        // Method 1: Direct substring match
        if (nicknameLower.indexOf(searchTerm) !== -1 || searchTerm.indexOf(nicknameLower) !== -1) {
          matched = true;
        }
        
        // Method 2: Match without spaces (lindholmbiler vs lindholm biler)
        if (!matched && (nicknameNoSpaces.indexOf(searchTermNoSpaces) !== -1 || 
                         searchTermNoSpaces.indexOf(nicknameNoSpaces) !== -1)) {
          matched = true;
        }
        
        // Method 3: Word-based matching (at least 2 words match)
        if (!matched && searchWords.length >= 2 && nicknameWords.length >= 2) {
          var matchCount = 0;
          for (var sw = 0; sw < searchWords.length; sw++) {
            for (var nw = 0; nw < nicknameWords.length; nw++) {
              if (searchWords[sw] === nicknameWords[nw] || 
                  searchWords[sw].indexOf(nicknameWords[nw]) !== -1 ||
                  nicknameWords[nw].indexOf(searchWords[sw]) !== -1) {
                matchCount++;
                break;
              }
            }
          }
          if (matchCount >= 2) matched = true;
        }
        
        // Method 4: Single significant word match (for short names)
        if (!matched && searchWords.length === 1 && nicknameWords.length >= 1) {
          for (var nw = 0; nw < nicknameWords.length; nw++) {
            if (searchWords[0] === nicknameWords[nw] || 
                (searchWords[0].length > 4 && nicknameWords[nw].indexOf(searchWords[0]) !== -1) ||
                (nicknameWords[nw].length > 4 && searchWords[0].indexOf(nicknameWords[nw]) !== -1)) {
              matched = true;
              break;
            }
          }
        }
        
        if (matched) {
          // Found a match!
          var link = AU_BASE + '/admin/customers/' + customerId;
          var info = state || 'Active';
          return '✓ ' + info + ': ' + link;
        }
      }
    }
    
    return 'Not found';
    
  } catch (e) {
    logError_('AUTOUNCLE_ADMIN', e.message, dealerName);
    return 'Error: ' + e.message;
  }
}

/**
 * Strip HTML tags from text
 */
function stripHtml_(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Test connection from menu
 */
function testAutoUncleConnectionMenu() {
  var ui = SpreadsheetApp.getUi();
  
  if (testAutoUncleConnection_()) {
    ui.alert('Success! AutoUncle admin adgang fungerer ✓');
  } else {
    ui.alert('Fejl: Kunne ikke connecte til AutoUncle admin.\n\nKør "Setup Admin Login" først.');
  }
}

/**
 * Sync AutoUncle customers to a separate sheet
 */
function syncAutoUncleCustomers() {
  var ui = SpreadsheetApp.getUi();
  
  try {
    var jar = autoUncleLogin_();
    if (!jar) {
      ui.alert('Fejl: Kunne ikke logge ind i AutoUncle admin.\n\nKør "Setup Admin Login" først.');
      return;
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'AutoUncle Customers';
    var sh = ss.getSheetByName(sheetName);
    
    // Create sheet if doesn't exist
    if (!sh) {
      sh = ss.insertSheet(sheetName);
    }
    
    // Clear existing data
    sh.clear();
    
    // Set headers
    var headers = ['ID', 'Nickname', 'State', 'Segment', 'Nr. Departments', 'Digital Consultant', 'Created', 'Enabled Products', 'Last Synced'];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    
    // Fetch all pages of customers
    var allCustomers = [];
    var page = 1;
    var maxPages = 50; // Safety limit
    
    ui.alert('Syncing AutoUncle customers...\n\nDette kan tage et øjeblik.');
    
    while (page <= maxPages) {
      var url = AU_BASE + '/admin/customers?page=' + page;
      
      var response = fetchWithJar_({
        url: url,
        method: 'get',
        jar: jar,
        headers: { 'Accept': 'text/html' }
      });
      
      if (response.status !== 200) {
        break;
      }
      
      var html = response.body || '';
      var customers = parseAutoUncleCustomersPage_(html);
      
      if (customers.length === 0) {
        break; // No more customers
      }
      
      allCustomers = allCustomers.concat(customers);
      page++;
      
      // Rate limiting
      Utilities.sleep(300);
    }
    
    // Deduplicate by customer ID
    var uniqueCustomers = [];
    var seenIds = {};
    
    for (var i = 0; i < allCustomers.length; i++) {
      var c = allCustomers[i];
      if (!seenIds[c.id]) {
        seenIds[c.id] = true;
        uniqueCustomers.push(c);
      }
    }
    
    // Write to sheet
    if (uniqueCustomers.length > 0) {
      var data = [];
      var timestamp = new Date().toISOString();
      
      for (var i = 0; i < uniqueCustomers.length; i++) {
        var c = uniqueCustomers[i];
        data.push([
          c.id,
          c.nickname,
          c.state,
          c.segment,
          c.departments,
          c.consultant,
          c.created,
          c.products,
          timestamp
        ]);
      }
      
      sh.getRange(2, 1, data.length, headers.length).setValues(data);
      
      // Auto-resize columns
      for (var col = 1; col <= headers.length; col++) {
        sh.autoResizeColumn(col);
      }
      
      ui.alert('Success!\n\nSyncet ' + uniqueCustomers.length + ' kunder fra AutoUncle admin.');
    } else {
      ui.alert('Ingen kunder fundet.\n\nTjek din AutoUncle login.');
    }
    
  } catch (e) {
    logError_('AUTOUNCLE_SYNC', e.message, '');
    ui.alert('Fejl ved sync:\n\n' + e.message);
  }
}

/**
 * Parse customers from a single page of AutoUncle admin
 */
function parseAutoUncleCustomersPage_(html) {
  var customers = [];
  
  if (!html) return customers;
  
  // Extract tbody
  var tbody = (html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i) || ['', ''])[1];
  if (!tbody) return customers;
  
  // Extract all <tr> rows
  var rows = [];
  var trRegex = /<tr\b[\s\S]*?<\/tr>/gi;
  var match;
  while ((match = trRegex.exec(tbody)) !== null) {
    rows.push(match[0]);
  }
  
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    
    // Extract customer ID
    var idMatch = row.match(/\/admin\/customers\/(\d+)/);
    if (!idMatch) continue;
    
    var customerId = idMatch[1];
    
    // Extract nickname
    var nicknameMatch = row.match(/<a[^>]+href="\/admin\/customers\/\d+"[^>]*>([\s\S]*?)<\/a>/i);
    var nickname = nicknameMatch ? stripHtml_(nicknameMatch[1]) : '';
    
    // Extract segment (label after nickname)
    var segmentMatch = row.match(/<span[^>]+class="label"[^>]*>(A-segment|B-segment|C-segment|D-segment|Oem|Market place|Other)<\/span>/i);
    var segment = segmentMatch ? segmentMatch[1] : '';
    
    // Extract state
    var stateMatch = row.match(/<span[^>]+class="label"[^>]*>(Paying customer|Trial|Past customer|Unconfigured|Lead)<\/span>/i);
    var state = stateMatch ? stateMatch[1] : '';
    
    // Extract number of departments
    var deptsMatch = row.match(/<td[^>]*>\s*<strong>(\d+)<\/strong>\s*<\/td>/);
    var departments = deptsMatch ? deptsMatch[1] : '0';
    
    // Extract digital consultant
    var consultantMatch = row.match(/<td[^>]*>\s*(Niels Hjulmann|Sebastian|Helle|Cristian|Katarina|Johan Frederik|[^<]+?)\s*<\/td>/);
    var consultant = consultantMatch ? stripHtml_(consultantMatch[1]) : '';
    
    // Extract created date
    var createdMatch = row.match(/<td[^>]*>\s*(over \d+ years? ago|about \d+ years? ago|almost \d+ years? ago|\d+ (months?|days?) ago|over \d+ months? ago|about \d+ months? ago)\s*<\/td>/i);
    var created = createdMatch ? createdMatch[1] : '';
    
    // Extract enabled products - improved extraction
    var products = '';
    
    // Find the <td> that contains products (all the label spans)
    var tdMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    var maxLabels = 0;
    var bestProductsTd = '';
    
    // Find the <td> with the most labels (that's the products column)
    if (tdMatches) {
      for (var t = 0; t < tdMatches.length; t++) {
        var tdContent = tdMatches[t];
        var labelCount = (tdContent.match(/<span[^>]+class="label"/gi) || []).length;
        if (labelCount > maxLabels) {
          maxLabels = labelCount;
          bestProductsTd = tdContent;
        }
      }
    }
    
    // Extract all product labels from that <td>
    if (bestProductsTd) {
      var labelMatches = bestProductsTd.match(/<span[^>]+class="label"[^>]*>([^<]+)<\/span>/gi);
      if (labelMatches && labelMatches.length > 0) {
        var prods = [];
        for (var j = 0; j < labelMatches.length; j++) {
          var p = stripHtml_(labelMatches[j]).trim();
          // Filter out state labels (we already have state)
          if (p && p !== state && p !== segment) {
            prods.push(p);
          }
        }
        products = prods.join(', ');
      }
    }
    
    customers.push({
      id: customerId,
      nickname: nickname,
      state: state,
      segment: segment,
      departments: departments,
      consultant: consultant,
      created: created,
      products: products
    });
  }
  
  return customers;
}

/*******************************
 * BILINFO API INTEGRATION
 * Henter forhandlerdata fra Bilinfo API
 *******************************/

/**
 * Setup Bilinfo API credentials
 */
function setupBilinfoCredentials() {
  var ui = SpreadsheetApp.getUi();
  
  var userResult = ui.prompt(
    'Bilinfo API Setup',
    'Indtast Bilinfo API Username:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (userResult.getSelectedButton() !== ui.Button.OK) {
    ui.alert('Setup annulleret');
    return;
  }
  
  var username = userResult.getResponseText().trim();
  
  var passResult = ui.prompt(
    'Bilinfo API Setup',
    'Indtast Bilinfo API Password:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (passResult.getSelectedButton() !== ui.Button.OK) {
    ui.alert('Setup annulleret');
    return;
  }
  
  var password = passResult.getResponseText().trim();
  
  var keyResult = ui.prompt(
    'Bilinfo API Setup',
    'Indtast Bilinfo API Subscription Key:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (keyResult.getSelectedButton() !== ui.Button.OK) {
    ui.alert('Setup annulleret');
    return;
  }
  
  var subscriptionKey = keyResult.getResponseText().trim();
  
  if (!username || !password || !subscriptionKey) {
    ui.alert('Alle felter skal udfyldes!');
    return;
  }
  
  var props = PropertiesService.getScriptProperties();
  props.setProperty('BILINFO_USERNAME', username);
  props.setProperty('BILINFO_PASSWORD', password);
  props.setProperty('BILINFO_SUBSCRIPTION_KEY', subscriptionKey);
  
  ui.alert('✅ Bilinfo API credentials gemt!\n\nDu kan nu synce forhandlerdata.');
}

/**
 * Test Bilinfo API connection
 */
function testBilinfoConnection() {
  var ui = SpreadsheetApp.getUi();
  
  try {
    var props = PropertiesService.getScriptProperties();
    var username = props.getProperty('BILINFO_USERNAME');
    var password = props.getProperty('BILINFO_PASSWORD');
    var subscriptionKey = props.getProperty('BILINFO_SUBSCRIPTION_KEY');
    
    if (!username || !password || !subscriptionKey) {
      ui.alert('❌ API credentials ikke sat op.\n\nBrug "Setup API Credentials" først.');
      return;
    }
    
    // Test API call
    var url = 'https://publicapi.bilinfo.net/listingapi/api/export?sinceDays=1';
    var authHeader = 'Basic ' + Utilities.base64Encode(username + ':' + password);
    
    var options = {
      method: 'get',
      headers: {
        'Authorization': authHeader,
        'Ocp-Apim-Subscription-Key': subscriptionKey
      },
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      var data = JSON.parse(response.getContentText());
      ui.alert('✅ API Connection OK!\n\n' +
               'API Version: ' + data.ApiVersion + '\n' +
               'Biler hentet (sidste dag): ' + data.VehicleCount);
    } else {
      ui.alert('❌ API fejl!\n\nHTTP ' + responseCode + '\n' + response.getContentText());
    }
    
  } catch (e) {
    ui.alert('❌ Fejl: ' + e.toString());
  }
}

/**
 * Create Bilinfo Data sheet
 */
function createBilinfoSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'Bilinfo Data';
  
  // Check if sheet already exists
  var existingSheet = ss.getSheetByName(sheetName);
  if (existingSheet) {
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'Ark findes allerede',
      'Arket "' + sheetName + '" findes allerede. Vil du slette og genoprette det?',
      ui.ButtonSet.YES_NO
    );
    
    if (response === ui.Button.YES) {
      ss.deleteSheet(existingSheet);
    } else {
      return;
    }
  }
  
  // Create new sheet
  var sheet = ss.insertSheet(sheetName);
  
  // Set headers
  var headers = [
    'Domain',
    'DealerName',
    'Afdeling',
    'DealerGuid',
    'Website',
    'Antal Biler',
    'Sidst Opdateret'
  ];
  
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285F4');
  headerRange.setFontColor('#FFFFFF');
  
  // Set column widths
  sheet.setColumnWidth(1, 200); // Domain
  sheet.setColumnWidth(2, 250); // DealerName
  sheet.setColumnWidth(3, 150); // Afdeling
  sheet.setColumnWidth(4, 300); // DealerGuid
  sheet.setColumnWidth(5, 250); // Website
  sheet.setColumnWidth(6, 120); // Antal Biler
  sheet.setColumnWidth(7, 180); // Sidst Opdateret
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  SpreadsheetApp.getUi().alert('✅ Arket "' + sheetName + '" er oprettet!\n\nKør nu "Sync Forhandler Data" for at hente data.');
}

/**
 * Sync Bilinfo dealer data
 */
function syncBilinfoData() {
  var ui = SpreadsheetApp.getUi();
  
  try {
    // Check credentials
    var props = PropertiesService.getScriptProperties();
    var username = props.getProperty('BILINFO_USERNAME');
    var password = props.getProperty('BILINFO_PASSWORD');
    var subscriptionKey = props.getProperty('BILINFO_SUBSCRIPTION_KEY');
    
    if (!username || !password || !subscriptionKey) {
      ui.alert('❌ API credentials ikke sat op.\n\nBrug "Setup API Credentials" først.');
      return;
    }
    
    // Check if sheet exists
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Bilinfo Data');
    
    if (!sheet) {
      ui.alert('❌ Arket "Bilinfo Data" findes ikke.\n\nBrug "Opret Bilinfo Ark" først.');
      return;
    }
    
    ui.alert('⏳ Henter data fra Bilinfo API...\n\nDette kan tage 10-30 sekunder.');
    
    // Fetch data from API
    var dealers = fetchBilinfoDealers_(username, password, subscriptionKey);
    
    if (!dealers || dealers.length === 0) {
      ui.alert('❌ Ingen forhandlere hentet fra API');
      return;
    }
    
    // Clear existing data (except header)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 7).clear();
    }
    
    // Prepare data for sheet (each department as separate row)
    var now = new Date();
    var dataRows = dealers.map(function(dealer) {
      return [
        dealer.domain,
        dealer.dealerName,
        dealer.department || '', // Afdeling/lokation
        dealer.dealerGuid,
        dealer.website,
        '', // Leave vehicle count empty - will be fetched when running MVP
        now
      ];
    });
    
    // Write data to sheet
    if (dataRows.length > 0) {
      sheet.getRange(2, 1, dataRows.length, 7).setValues(dataRows);
      
      // Format vehicle count as number
      sheet.getRange(2, 6, dataRows.length, 1).setNumberFormat('#,##0');
      
      // Format date
      sheet.getRange(2, 7, dataRows.length, 1).setNumberFormat('yyyy-mm-dd hh:mm');
    }
    
    // Sort by domain, then dealerName
    var dataRange = sheet.getRange(2, 1, dataRows.length, 7);
    dataRange.sort([{column: 1, ascending: true}, {column: 2, ascending: true}]);
    
    ui.alert('✅ Sync fuldført!\n\n' +
             'Afdelinger opdateret: ' + dealers.length + '\n\n' +
             'Bilantal summeres automatisk når du kører MVP på dine leads.\n' +
             'GUID\'er er gemt og klar til brug.');
    
  } catch (e) {
    ui.alert('❌ Fejl under sync:\n\n' + e.toString());
    Logger.log('Bilinfo sync error: ' + e.toString());
  }
}

/**
 * Fetch dealers from Bilinfo API
 * @private
 */
function fetchBilinfoDealers_(username, password, subscriptionKey) {
  // Use sinceDays=1 to reduce payload size and avoid JSON parsing errors
  var url = 'https://publicapi.bilinfo.net/listingapi/api/export?sinceDays=1';
  var authHeader = 'Basic ' + Utilities.base64Encode(username + ':' + password);
  
  var options = {
    method: 'get',
    headers: {
      'Authorization': authHeader,
      'Ocp-Apim-Subscription-Key': subscriptionKey
    },
    muteHttpExceptions: true
  };
  
  Logger.log('Fetching Bilinfo data...');
  var response = UrlFetchApp.fetch(url, options);
  var responseCode = response.getResponseCode();
  
  if (responseCode !== 200) {
    throw new Error('API returned HTTP ' + responseCode + ': ' + response.getContentText().substring(0, 500));
  }
  
  Logger.log('Response received, parsing JSON...');
  var responseText = response.getContentText();
  Logger.log('Response size: ' + responseText.length + ' bytes');
  
  var data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    Logger.log('JSON parse error at position: ' + e.message);
    throw new Error('Failed to parse API response. Response may be too large or contain invalid JSON. Try reducing sinceDays parameter.');
  }
  
  if (!data.Vehicles || data.Vehicles.length === 0) {
    return [];
  }
  
  // Group by DealerGuid - each department gets its own entry
  var dealerMap = {};
  
  for (var i = 0; i < data.Vehicles.length; i++) {
    var vehicle = data.Vehicles[i];
    var guid = vehicle.DealerGuid;
    
    if (!guid) continue;
    
    if (!dealerMap[guid]) {
      var domain = '';
      if (vehicle.DealerWebsite) {
        try {
          var websiteUrl = vehicle.DealerWebsite;
          // Extract domain from URL
          var matches = websiteUrl.match(/^(?:https?:\/\/)?(?:www\.)?([^\/\?#]+)/i);
          if (matches && matches[1]) {
            domain = matches[1].toLowerCase();
          }
        } catch (e) {
          Logger.log('Error parsing website: ' + vehicle.DealerWebsite);
        }
      }
      
      // Extract department/location from dealer name
      var department = '';
      var dealerName = vehicle.DealerName || '';
      
      // Try to extract location after " - " or last part
      var parts = dealerName.split(' - ');
      if (parts.length > 1) {
        department = parts[parts.length - 1];
      }
      
      dealerMap[guid] = {
        dealerName: dealerName,
        department: department,
        dealerGuid: guid,
        website: vehicle.DealerWebsite || '',
        domain: domain
      };
    }
  }
  
  // Convert to array
  var dealers = [];
  for (var key in dealerMap) {
    dealers.push(dealerMap[key]);
  }
  
  return dealers;
}

/**
 * Fetch vehicle count for a specific domain from Bilinfo API
 * Finds ALL departments for the domain and sums vehicle counts
 * @private
 */
function fetchBilinfoCountForDomain_(domain) {
  if (!domain) return null;
  
  try {
    // Get credentials
    var props = PropertiesService.getScriptProperties();
    var username = props.getProperty('BILINFO_USERNAME');
    var password = props.getProperty('BILINFO_PASSWORD');
    var subscriptionKey = props.getProperty('BILINFO_SUBSCRIPTION_KEY');
    
    if (!username || !password || !subscriptionKey) {
      Logger.log('Bilinfo credentials not configured - skipping vehicle count');
      return null;
    }
    
    // Look up ALL DealerGuids for this domain in Bilinfo Data sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var bilinfoSheet = ss.getSheetByName('Bilinfo Data');
    
    if (!bilinfoSheet) {
      Logger.log('Bilinfo Data sheet not found - skipping vehicle count');
      return null;
    }
    
    // Find all departments for this domain
    var data = bilinfoSheet.getDataRange().getValues();
    var dealerGuids = [];
    
    for (var i = 1; i < data.length; i++) { // Skip header
      var sheetDomain = data[i][0]; // Column A: Domain
      if (sheetDomain && sheetDomain.toLowerCase() === domain.toLowerCase()) {
        var guid = data[i][3]; // Column D: DealerGuid (after adding Afdeling column)
        if (guid) {
          dealerGuids.push({
            guid: guid,
            name: data[i][1], // DealerName
            department: data[i][2] // Afdeling
          });
        }
      }
    }
    
    if (dealerGuids.length === 0) {
      Logger.log('No DealerGuids found for domain: ' + domain);
      return null;
    }
    
    Logger.log('Found ' + dealerGuids.length + ' department(s) for ' + domain);
    
    // Make API calls for each department and sum vehicle counts
    var totalCount = 0;
    var authHeader = 'Basic ' + Utilities.base64Encode(username + ':' + password);
    
    var options = {
      method: 'get',
      headers: {
        'Authorization': authHeader,
        'Ocp-Apim-Subscription-Key': subscriptionKey
      },
      muteHttpExceptions: true
    };
    
    for (var j = 0; j < dealerGuids.length; j++) {
      var dealerInfo = dealerGuids[j];
      var url = 'https://publicapi.bilinfo.net/listingapi/api/export?dealerId=' + dealerInfo.guid;
      
      Logger.log('Fetching count for ' + dealerInfo.name + ' (GUID: ' + dealerInfo.guid + ')');
      var response = UrlFetchApp.fetch(url, options);
      
      if (response.getResponseCode() !== 200) {
        Logger.log('API error for ' + dealerInfo.name + ': HTTP ' + response.getResponseCode());
        continue;
      }
      
      var apiData = JSON.parse(response.getContentText());
      var count = apiData.VehicleCount || 0;
      totalCount += count;
      
      Logger.log(dealerInfo.department + ': ' + count + ' vehicles');
      
      // Add small delay to avoid rate limiting
      if (j < dealerGuids.length - 1) {
        Utilities.sleep(500);
      }
    }
    
    Logger.log('Total vehicles for ' + domain + ': ' + totalCount + ' (' + dealerGuids.length + ' departments)');
    
    return {
      totalCount: totalCount,
      departmentCount: dealerGuids.length,
      departments: dealerGuids.map(function(d) { return d.department || d.name; })
    };
    
  } catch (e) {
    Logger.log('Error fetching Bilinfo count for ' + domain + ': ' + e.toString());
    return null;
  }
}


