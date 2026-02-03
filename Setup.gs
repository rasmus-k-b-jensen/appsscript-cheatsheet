/**
 * Interactive Setup - AutoUncle Sales Cheat Sheet
 * Sikker opsætning af API keys og initial konfiguration
 */

/**
 * Interactive Gemini API Key setup
 * Kør denne funktion ÉN gang for at sætte API key op
 */
function setupGeminiApiKey() {
  var ui = SpreadsheetApp.getUi();
  
  // Check hvis key allerede er sat
  var props = PropertiesService.getScriptProperties();
  var existingKey = props.getProperty('GEMINI_API_KEY');
  
  if (existingKey) {
    var response = ui.alert(
      'API Key allerede sat',
      'Der er allerede en Gemini API key gemt. Vil du overskrive den?',
      ui.ButtonSet.YES_NO
    );
    
    if (response !== ui.Button.YES) {
      ui.alert('Setup afbrudt', 'API key blev ikke ændret.', ui.ButtonSet.OK);
      return;
    }
  }
  
  // Bed om API key
  var response = ui.prompt(
    'Gemini API Key Setup',
    'Indtast din Gemini API key (fra https://aistudio.google.com/app/apikey):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() !== ui.Button.OK) {
    ui.alert('Setup afbrudt', 'API key blev ikke gemt.', ui.ButtonSet.OK);
    return;
  }
  
  var apiKey = response.getResponseText().trim();
  
  // Validér format (basic check)
  if (!apiKey || apiKey.length < 20) {
    ui.alert('Ugyldig API Key', 'API key ser ikke korrekt ud. Prøv igen.', ui.ButtonSet.OK);
    return;
  }
  
  if (apiKey.indexOf('AIzaSy') !== 0) {
    var confirm = ui.alert(
      'Advarsel',
      'API key starter ikke med "AIzaSy" som forventet. Fortsæt alligevel?',
      ui.ButtonSet.YES_NO
    );
    
    if (confirm !== ui.Button.YES) {
      ui.alert('Setup afbrudt', 'API key blev ikke gemt.', ui.ButtonSet.OK);
      return;
    }
  }
  
  // Gem i Script Properties (SIKKERT)
  try {
    props.setProperty('GEMINI_API_KEY', apiKey);
    
    ui.alert(
      'Success! ✅',
      'Gemini API key er nu gemt sikkert.\n\n' +
      'AI briefings vil nu blive genereret automatisk ved scanning.\n\n' +
      'VIGTIGT: Del ALDRIG dette sheet med uvedkommende!',
      ui.ButtonSet.OK
    );
    
    Logger.log('✅ Gemini API key sat op successfuldt');
    
  } catch (e) {
    ui.alert(
      'Fejl',
      'Kunne ikke gemme API key: ' + e.message,
      ui.ButtonSet.OK
    );
    Logger.log('❌ Fejl ved setup: ' + e.message);
  }
}

/**
 * Fjern Gemini API Key (for sikkerhed)
 */
function removeGeminiApiKey() {
  var ui = SpreadsheetApp.getUi();
  
  var response = ui.alert(
    'Fjern API Key?',
    'Dette vil fjerne din Gemini API key permanent. AI briefings vil ikke længere virke.\n\nFortsæt?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  try {
    var props = PropertiesService.getScriptProperties();
    props.deleteProperty('GEMINI_API_KEY');
    
    ui.alert(
      'Fjernet ✅',
      'Gemini API key er fjernet. AI briefings vil ikke længere genereres.',
      ui.ButtonSet.OK
    );
    
    Logger.log('✅ Gemini API key fjernet');
    
  } catch (e) {
    ui.alert('Fejl', 'Kunne ikke fjerne API key: ' + e.message, ui.ButtonSet.OK);
  }
}

/**
 * Test Gemini API Key
 * Kør denne for at verificere at API key virker
 */
function testGeminiApiKey() {
  var ui = SpreadsheetApp.getUi();
  
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('GEMINI_API_KEY');
  
  if (!key) {
    ui.alert(
      'Ingen API Key',
      'Der er ikke sat nogen Gemini API key endnu.\n\nKør "Setup Gemini API Key" først.',
      ui.ButtonSet.OK
    );
    return;
  }
  
  Logger.log('Testing Gemini API...');
  
  try {
    var endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
    
    var payload = {
      contents: [{ 
        role: 'user', 
        parts: [{ text: 'Svar kun med "OK" hvis du modtager denne besked.' }] 
      }],
      generationConfig: { temperature: 0.0, maxOutputTokens: 10 }
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
    
    if (code === 200) {
      var data = JSON.parse(resp.getContentText());
      var text = '';
      try {
        text = data.candidates[0].content.parts[0].text;
      } catch (e) {
        text = 'Ukendt respons';
      }
      
      ui.alert(
        'Success! ✅',
        'Gemini API virker!\n\nTest respons: "' + text + '"\n\nAI briefings er klar til brug.',
        ui.ButtonSet.OK
      );
      
      Logger.log('✅ Gemini API test SUCCESS');
      Logger.log('Response: ' + text);
      
    } else {
      var errorText = resp.getContentText();
      
      ui.alert(
        'API Fejl ❌',
        'HTTP ' + code + '\n\n' + 
        'Mulige årsager:\n' +
        '- Ugyldig API key\n' +
        '- Quota overskredet\n' +
        '- API er deaktiveret\n\n' +
        'Tjek https://aistudio.google.com for detaljer.',
        ui.ButtonSet.OK
      );
      
      Logger.log('❌ Gemini API test FAILED: HTTP ' + code);
      Logger.log('Error: ' + errorText);
    }
    
  } catch (e) {
    ui.alert(
      'Fejl ❌',
      'Kunne ikke kontakte Gemini API:\n\n' + e.message,
      ui.ButtonSet.OK
    );
    
    Logger.log('❌ Exception: ' + e.message);
  }
}

/**
 * Vis nuværende konfiguration
 */
function showCurrentConfig() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();
  
  var hasKey = !!props.getProperty('GEMINI_API_KEY');
  
  var msg = 'KONFIGURATION\n\n' +
    '📊 Sheet navn: ' + SHEET_NAME + '\n' +
    '📄 Max sider: ' + MAX_PAGES + '\n' +
    '⏱️ Fetch delay: ' + FETCH_DELAY_MS + 'ms\n' +
    '🤖 Gemini API: ' + (hasKey ? '✅ Aktiveret' : '❌ Ikke sat op') + '\n\n';
  
  if (hasKey) {
    msg += 'Kør "Test Gemini API Key" for at verificere.\n\n';
  } else {
    msg += 'Kør "Setup Gemini API Key" for at aktivere AI briefings.\n\n';
  }
  
  msg += '━━━━━━━━━━━━━━━━━━━━━━\n';
  msg += 'Konkurrenter: ' + COMPETITOR_PATTERNS.length + ' platforme\n';
  msg += 'CMP vendors: ' + CMP_PATTERNS.length + ' platforme\n';
  msg += 'Priority keywords: ' + PRIORITY_LINK_KEYWORDS.length + ' keywords';
  
  ui.alert('Nuværende Konfiguration', msg, ui.ButtonSet.OK);
  
  Logger.log('Configuration:');
  Logger.log('- Sheet: ' + SHEET_NAME);
  Logger.log('- Max pages: ' + MAX_PAGES);
  Logger.log('- Delay: ' + FETCH_DELAY_MS + 'ms');
  Logger.log('- Gemini: ' + (hasKey ? 'YES' : 'NO'));
}

/**
 * One-click komplet setup
 * Kør denne for første gangs setup
 */
function completeSetup() {
  var ui = SpreadsheetApp.getUi();
  
  var response = ui.alert(
    'Komplet Setup',
    'Dette vil:\n' +
    '1. Oprette "Leads" sheet med headers\n' +
    '2. (Valgfrit) Sætte Gemini API key op\n\n' +
    'Fortsæt?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  // Step 1: Setup headers
  try {
    setupHeaders();
    ui.alert('Step 1/2 ✅', '"Leads" sheet oprettet med headers!', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Fejl', 'Kunne ikke oprette sheet: ' + e.message, ui.ButtonSet.OK);
    return;
  }
  
  // Step 2: API Key (optional)
  var wantApi = ui.alert(
    'Step 2/2: API Key?',
    'Vil du sætte Gemini API key op nu?\n\n' +
    '(Du kan også gøre det senere via menu)',
    ui.ButtonSet.YES_NO
  );
  
  if (wantApi === ui.Button.YES) {
    setupGeminiApiKey();
  }
  
  ui.alert(
    'Setup Færdig! 🎉',
    'Du er klar til at bruge AutoUncle Sales Cheat Sheet!\n\n' +
    'Tilføj URLs i kolonne A og kør "Run MVP".',
    ui.ButtonSet.OK
  );
}
