/**
 * Extra Utilities - AutoUncle Sales Cheat Sheet
 * Ekstra funktionalitet der kan tilføjes efter behov
 */

/**
 * BONUS FUNCTION: Bulk clear all data (bevar headers)
 */
function clearAllData() {
  var ui = SpreadsheetApp.getUi();
  var result = ui.alert(
    'Slet alle data?',
    'Dette sletter alle rækker under headers. Headers bevares. Fortsæt?',
    ui.ButtonSet.YES_NO
  );
  
  if (result !== ui.Button.YES) return;
  
  var sh = getLeadsSheet_();
  var lastRow = sh.getLastRow();
  if (lastRow > 1) {
    sh.deleteRows(2, lastRow - 1);
  }
  ui.alert('Data slettet!', 'Alle rækker er slettet. Headers bevaret.', ui.ButtonSet.OK);
}

/**
 * BONUS FUNCTION: Export til CSV
 */
function exportToCSV() {
  var sh = getLeadsSheet_();
  var data = sh.getDataRange().getValues();
  
  var csv = '';
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var csvRow = [];
    for (var j = 0; j < row.length; j++) {
      var cell = row[j].toString();
      // Escape quotes
      cell = cell.replace(/"/g, '""');
      csvRow.push('"' + cell + '"');
    }
    csv += csvRow.join(',') + '\n';
  }
  
  Logger.log('CSV genereret (' + data.length + ' rækker)');
  Logger.log(csv.substring(0, 500) + '...');
  
  SpreadsheetApp.getUi().alert(
    'CSV klar',
    'CSV data er logget til View → Logs. Kopiér derfra.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * BONUS FUNCTION: Filtrér rækker uden CVR
 */
function highlightMissingCVR() {
  var sh = getLeadsSheet_();
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  
  var cvrColumn = 3; // CVR kolonne
  var count = 0;
  
  for (var r = 2; r <= lastRow; r++) {
    var cvr = sh.getRange(r, cvrColumn).getValue();
    if (!cvr || cvr.toString().trim() === '') {
      sh.getRange(r, 1, 1, sh.getLastColumn()).setBackground('#ffebee');
      count++;
    } else {
      sh.getRange(r, 1, 1, sh.getLastColumn()).setBackground(null);
    }
  }
  
  SpreadsheetApp.getUi().alert(
    'CVR highlighting færdig',
    count + ' rækker uden CVR er markeret røde.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * BONUS FUNCTION: Sammenlign konkurrenter på tværs
 * Finder hvilke konkurrenter der bruges mest
 */
function analyzeCompetitors() {
  var sh = getLeadsSheet_();
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  
  var competitorColumn = 10; // Competitors found kolonne
  var counts = {};
  
  for (var r = 2; r <= lastRow; r++) {
    var comps = (sh.getRange(r, competitorColumn).getValue() || '').toString();
    if (!comps) continue;
    
    var list = comps.split(',');
    for (var i = 0; i < list.length; i++) {
      var c = list[i].trim();
      if (!c) continue;
      counts[c] = (counts[c] || 0) + 1;
    }
  }
  
  var sorted = Object.keys(counts).sort(function(a, b) {
    return counts[b] - counts[a];
  });
  
  var msg = 'Konkurrent analyse (' + (lastRow - 1) + ' kunder):\n\n';
  for (var j = 0; j < sorted.length; j++) {
    msg += sorted[j] + ': ' + counts[sorted[j]] + ' kunder\n';
  }
  
  Logger.log(msg);
  SpreadsheetApp.getUi().alert('Konkurrent Analyse', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * BONUS FUNCTION: Find dubletter (samme domæne)
 */
function findDuplicateDomains() {
  var sh = getLeadsSheet_();
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  
  var domainColumn = 2;
  var seen = {};
  var dupes = [];
  
  for (var r = 2; r <= lastRow; r++) {
    var domain = (sh.getRange(r, domainColumn).getValue() || '').toString().toLowerCase();
    if (!domain) continue;
    
    if (seen[domain]) {
      dupes.push('Række ' + r + ': ' + domain + ' (også i række ' + seen[domain] + ')');
    } else {
      seen[domain] = r;
    }
  }
  
  if (dupes.length === 0) {
    SpreadsheetApp.getUi().alert('Ingen dubletter', 'Ingen duplikerede domæner fundet.', SpreadsheetApp.getUi().ButtonSet.OK);
  } else {
    var msg = 'Fundet ' + dupes.length + ' dubletter:\n\n' + dupes.join('\n');
    Logger.log(msg);
    SpreadsheetApp.getUi().alert('Dubletter fundet', msg.substring(0, 300) + '...', SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * BONUS FUNCTION: Tjek for manglende kontaktinfo
 */
function flagMissingContactInfo() {
  var sh = getLeadsSheet_();
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  
  var phoneColumn = 4;
  var emailColumn = 5;
  var count = 0;
  
  for (var r = 2; r <= lastRow; r++) {
    var phone = (sh.getRange(r, phoneColumn).getValue() || '').toString().trim();
    var email = (sh.getRange(r, emailColumn).getValue() || '').toString().trim();
    
    if (!phone && !email) {
      sh.getRange(r, phoneColumn, 1, 2).setBackground('#fff3e0'); // Orange
      count++;
    } else {
      sh.getRange(r, phoneColumn, 1, 2).setBackground(null);
    }
  }
  
  SpreadsheetApp.getUi().alert(
    'Kontaktinfo check',
    count + ' rækker mangler både telefon og email (markeret orange).',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * BONUS FUNCTION: Statistik over tracking tags
 */
function analyzeTrackingStats() {
  var sh = getLeadsSheet_();
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return;
  
  var stats = {
    total: lastRow - 1,
    hasGA4: 0,
    hasGTM: 0,
    hasMeta: 0,
    hasAds: 0,
    hasCMP: 0,
    hasNone: 0,
    hasAll: 0
  };
  
  for (var r = 2; r <= lastRow; r++) {
    var ga4 = sh.getRange(r, 6).getValue() === 'Yes';
    var gtm = sh.getRange(r, 7).getValue() === 'Yes';
    var meta = sh.getRange(r, 8).getValue() === 'Yes';
    var ads = sh.getRange(r, 9).getValue() === 'Yes';
    var cmp = (sh.getRange(r, 19).getValue() || '').toString().trim() !== '';
    
    if (ga4) stats.hasGA4++;
    if (gtm) stats.hasGTM++;
    if (meta) stats.hasMeta++;
    if (ads) stats.hasAds++;
    if (cmp) stats.hasCMP++;
    
    if (!ga4 && !gtm && !meta && !ads) stats.hasNone++;
    if (ga4 && gtm && meta && ads) stats.hasAll++;
  }
  
  var pct = function(n) { return ((n / stats.total) * 100).toFixed(1) + '%'; };
  
  var msg = 'Tracking Statistik (' + stats.total + ' kunder):\n\n' +
    'GA4: ' + stats.hasGA4 + ' (' + pct(stats.hasGA4) + ')\n' +
    'GTM: ' + stats.hasGTM + ' (' + pct(stats.hasGTM) + ')\n' +
    'Meta Pixel: ' + stats.hasMeta + ' (' + pct(stats.hasMeta) + ')\n' +
    'Google Ads: ' + stats.hasAds + ' (' + pct(stats.hasAds) + ')\n' +
    'CMP/Cookie: ' + stats.hasCMP + ' (' + pct(stats.hasCMP) + ')\n\n' +
    'Ingen tracking: ' + stats.hasNone + ' (' + pct(stats.hasNone) + ')\n' +
    'Alle 4 tags: ' + stats.hasAll + ' (' + pct(stats.hasAll) + ')';
  
  Logger.log(msg);
  SpreadsheetApp.getUi().alert('Tracking Statistik', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * BONUS FUNCTION: Tilføj utilities til menu
 * Note: Denne onOpen() er erstattet af den i Code.gs
 * Brug Code.gs version for den komplette menu
 */
function onOpen_Utilities() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Cheat Sheet MVP')
    .addItem('🚀 Komplet Setup (første gang)', 'completeSetup')
    .addItem('Setup headers (v2.2)', 'setupHeaders')
    .addSeparator()
    .addItem('Run MVP (selected rows)', 'runMvpForSelection')
    .addItem('Run MVP (all rows with URL)', 'runMvpForAll')
    .addSeparator()
    .addSubMenu(ui.createMenu('🤖 Gemini AI Setup')
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
