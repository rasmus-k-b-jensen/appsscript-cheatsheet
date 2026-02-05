/**
 * Lead Scoring System
 * Calculates a quality score (1-100) for each lead based on:
 * - Company size (revenue/employees)
 * - Digital maturity gaps (missing tracking tools)
 * - Platform readiness
 * - Data completeness
 */

// Column constants (shared with Code.gs)
var COL = {
  URL: 1, DOMAIN: 2, CVR: 3, PHONE: 4, EMAIL: 5,
  WEBSITE_PLATFORM: 6, CAR_DEALER_PLATFORM: 7, MOBILE_READY: 8, CMP_COOKIE_VENDOR: 9, CHAT_WIDGET: 10,
  GA4: 11, GA4_IDS: 12, GTM: 13, GTM_IDS: 14, META_PIXEL: 15, META_PIXEL_IDS: 16, GOOGLE_ADS_TAG: 17,
  GOOGLE_ADS_AW_IDS: 18, EMAIL_PLATFORM: 19, CONTACT_FORMS: 20, BLOG: 21,
  PROFF_LINK: 22, REVENUE: 23, PROFIT: 24, EMPLOYEES: 25,
  COMPETITORS: 26, SOCIAL_MEDIA: 27, AD_PLATFORMS: 28,
  VIDEO_MARKETING: 29, CAR_BRANDS: 30, TRUSTPILOT: 31, CAR_MARKETPLACES: 32,
  PAGES_SCANNED: 33, LAST_RUN: 34, AI_BRIEFING: 35, NOTES: 36, AUTOUCLE_ADMIN: 37, BILINFO_ANTAL: 38, BILINFO_AFDELINGER: 39
};

/**
 * Calculate lead score for a row
 * Returns score 1-100 (higher = better opportunity)
 */
function calculateLeadScore_(leadData) {
  var score = 0;
  
  // === COMPANY SIZE (30 points max) ===
  // Larger companies = bigger contracts
  if (leadData.proffRevenue) {
    var revenue = parseFloat(leadData.proffRevenue.toString().replace(/[^\d]/g, ''));
    if (revenue > 100000000) score += 30;  // 100M+ DKK
    else if (revenue > 50000000) score += 25;   // 50M+ DKK
    else if (revenue > 20000000) score += 20;   // 20M+ DKK
    else if (revenue > 10000000) score += 15;   // 10M+ DKK
    else if (revenue > 5000000) score += 10;    // 5M+ DKK
    else score += 5;
  }
  
  if (leadData.proffEmployees) {
    var employees = parseInt(leadData.proffEmployees.toString().replace(/[^\d]/g, ''));
    if (employees > 100) score += 5;
    else if (employees > 50) score += 4;
    else if (employees > 20) score += 3;
    else if (employees > 10) score += 2;
    else score += 1;
  }
  
  // === DIGITAL MATURITY GAPS (40 points max) ===
  // Missing tools = sales opportunity
  var trackingGaps = 0;
  if (leadData.ga4 !== 'Ja') { trackingGaps++; score += 15; }  // Missing GA4
  if (leadData.gtm !== 'Ja') { trackingGaps++; score += 15; }  // Missing GTM
  if (leadData.metaPixel !== 'Ja') { trackingGaps++; score += 10; } // Missing Meta Pixel
  
  // Bonus if they have 2+ gaps (easier to sell comprehensive solution)
  if (trackingGaps >= 2) score += 5;
  
  // === PLATFORM & TECH READINESS (20 points max) ===
  if (leadData.carDealerPlatform) score += 10;  // Already in automotive space
  if (leadData.websitePlatform) score += 5;     // Has identifiable platform
  if (leadData.mobileReady === 'Ja') score += 3; // Mobile-ready site
  if (leadData.chatWidget === 'Ja') score += 2;  // Already using engagement tools
  
  // === DATA COMPLETENESS (10 points max) ===
  // More complete data = better qualified lead
  var dataPoints = 0;
  if (leadData.cvr) dataPoints++;
  if (leadData.phone) dataPoints++;
  if (leadData.email) dataPoints++;
  if (leadData.proffRevenue) dataPoints++;
  if (leadData.competitors) dataPoints++;
  if (leadData.socialMedia) dataPoints++;
  
  score += Math.min(10, dataPoints * 2);
  
  // Ensure score is within 1-100 range
  return Math.min(100, Math.max(1, Math.round(score)));
}

/**
 * Generate lead score category label
 */
function getLeadScoreLabel_(score) {
  if (score >= 80) return '🔥 Hot Lead';
  if (score >= 60) return '⭐ High Priority';
  if (score >= 40) return '✅ Qualified';
  if (score >= 20) return '💡 Potential';
  return '❄️ Low Priority';
}

/**
 * Calculate and update lead score for selected row
 */
function updateLeadScore() {
  try {
    var sh = getLeadsSheet_();
    var range = sh.getActiveRange();
    
    if (!range) {
      SpreadsheetApp.getUi().alert('Marker en række først');
      return;
    }
    
    var row = range.getRow();
    if (row < 2) {
      SpreadsheetApp.getUi().alert('Vælg en datarække (ikke header)');
      return;
    }
    
    // Get data from row (36 columns A-AJ)
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
      gtm: data[12] || '',
      metaPixel: data[14] || '',
      // BUSINESS DATA (V-Y: 22-25)
      proffUrl: data[21] || '',
      proffRevenue: data[22] || '',
      proffProfit: data[23] || '',
      proffEmployees: data[24] || '',
      // KONKURRENCE & SOCIAL (Z-AB: 26-28)
      competitors: data[25] || '',
      socialMedia: data[26] || ''
    };
    
    var score = calculateLeadScore_(leadData);
    var label = getLeadScoreLabel_(score);
    
    // Write score to Notes column (AJ: NOTES)
    var currentNotes = sh.getRange(row, COL.NOTES).getValue() || '';
    var scoreText = '\n\n--- LEAD SCORE ---\n' + score + '/100 - ' + label;
    
    // Remove old score if exists
    var updatedNotes = currentNotes.replace(/\n\n--- LEAD SCORE ---\n[\s\S]*?(\n\n|$)/, '');
    updatedNotes = updatedNotes + scoreText;
    
    sh.getRange(row, COL.NOTES).setValue(updatedNotes);
    
    SpreadsheetApp.getUi().alert(
      'Lead Score Opdateret',
      leadData.domain + '\n\nScore: ' + score + '/100\n' + label,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    logSuccess_('LEAD_SCORED', leadData.domain + ': ' + score + '/100', row);
    
  } catch (e) {
    logError_('SCORING_FAILED', e.toString());
    SpreadsheetApp.getUi().alert('Fejl: ' + e.toString());
  }
}

/**
 * Calculate scores for all leads (batch operation)
 */
function scoreAllLeads() {
  try {
    var sh = getLeadsSheet_();
    var lastRow = sh.getLastRow();
    
    if (lastRow < 2) {
      SpreadsheetApp.getUi().alert('Ingen data at score');
      return;
    }
    
    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'Score Alle Leads?',
      'Dette vil beregne lead scores for ' + (lastRow - 1) + ' rækker.\n\nFortsæt?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) return;
    
    var processed = 0;
    var errors = 0;
    
    // Get all data at once for performance (36 columns: A-AJ)
    var allData = sh.getRange(2, 1, lastRow - 1, 36).getValues();
    var notesColumn = [];
    
    for (var i = 0; i < allData.length; i++) {
      try {
        var data = allData[i];
        var leadData = {
          domain: data[1] || '',            // B: 2
          cvr: data[2] || '',               // C: 3
          phone: data[3] || '',             // D: 4
          email: data[4] || '',             // E: 5
          websitePlatform: data[5] || '',   // F: 6
          carDealerPlatform: data[6] || '', // G: 7
          mobileReady: data[7] || '',       // H: 8
          chatWidget: data[9] || '',        // J: 10
          ga4: data[10] || '',              // K: 11
          gtm: data[12] || '',              // M: 13
          metaPixel: data[14] || '',        // O: 15
          proffRevenue: data[22] || '',     // W: 23
          proffProfit: data[23] || '',      // X: 24
          proffEmployees: data[24] || '',   // Y: 25
          competitors: data[25] || '',      // Z: 26
          socialMedia: data[26] || ''       // AA: 27
        };
        
        var score = calculateLeadScore_(leadData);
        var label = getLeadScoreLabel_(score);
        
        var currentNotes = data[35] || '';  // Notes column (AJ: 36)
        var scoreText = '\n\n--- LEAD SCORE ---\n' + score + '/100 - ' + label;
        var updatedNotes = currentNotes.replace(/\n\n--- LEAD SCORE ---\n[\s\S]*?(\n\n|$)/, '');
        updatedNotes = updatedNotes + scoreText;
        
        notesColumn.push([updatedNotes]);
        processed++;
        
      } catch (e) {
        notesColumn.push([data[35] || '']); // Keep original from Notes column
        errors++;
      }
    }
    
    // Write all scores at once to Notes column (AJ: 36)
    sh.getRange(2, 36, notesColumn.length, 1).setValues(notesColumn);
    
    ui.alert(
      'Scoring Færdig',
      'Behandlet: ' + processed + ' leads\nFejl: ' + errors,
      ui.ButtonSet.OK
    );
    
    logSuccess_('BATCH_SCORING', 'Scored ' + processed + ' leads, ' + errors + ' errors');
    
  } catch (e) {
    logError_('BATCH_SCORING_FAILED', e.toString());
    SpreadsheetApp.getUi().alert('Fejl: ' + e.toString());
  }
}
