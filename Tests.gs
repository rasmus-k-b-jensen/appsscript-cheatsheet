/**
 * Test Suite - AutoUncle Sales Cheat Sheet
 * Kør disse tests for at verificere funktionalitet
 */

/**
 * Test CVR extraction
 */
function testCvrExtraction() {
  var tests = [
    { html: 'CVR: 12345678', expected: '12345678' },
    { html: 'CVR nr. 87654321', expected: '87654321' },
    { html: 'CVR-nr: 11223344', expected: '11223344' },
    { html: '"taxID": "99887766"', expected: '99887766' },
    { html: 'SE/CVR-nr. 55443322', expected: '55443322' },
    { html: '<strong>CVR 12341234</strong>', expected: '12341234' },
    { html: 'ingen cvr her', expected: '' }
  ];
  
  var passed = 0;
  var failed = 0;
  
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var result = extractCvr_(t.html);
    if (result === t.expected) {
      Logger.log('✓ Test ' + (i+1) + ' passed: ' + t.html);
      passed++;
    } else {
      Logger.log('✗ Test ' + (i+1) + ' FAILED: Expected "' + t.expected + '", got "' + result + '"');
      failed++;
    }
  }
  
  Logger.log('\nCVR Tests: ' + passed + ' passed, ' + failed + ' failed');
  return failed === 0;
}

/**
 * Test phone extraction
 */
function testPhoneExtraction() {
  var tests = [
    { html: 'Telefon: 12345678', expected: '12345678' },
    { html: 'tlf. 87654321', expected: '87654321' },
    { html: '<a href="tel:+4512345678">', expected: '12345678' },
    { html: '+45 12 34 56 78', expected: '12345678' },
    { html: 'Phone: 12 34 56 78', expected: '12345678' },
    { html: 'ingen telefon', expected: '' }
  ];
  
  var passed = 0;
  var failed = 0;
  
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var result = extractPhone_(t.html);
    if (result === t.expected) {
      Logger.log('✓ Test ' + (i+1) + ' passed');
      passed++;
    } else {
      Logger.log('✗ Test ' + (i+1) + ' FAILED: Expected "' + t.expected + '", got "' + result + '"');
      failed++;
    }
  }
  
  Logger.log('\nPhone Tests: ' + passed + ' passed, ' + failed + ' failed');
  return failed === 0;
}

/**
 * Test email extraction
 */
function testEmailExtraction() {
  var tests = [
    { html: 'Email: info@example.dk', expected: 'info@example.dk' },
    { html: 'kontakt@bilhuset.dk og salg@bilhuset.dk', expected: 'kontakt@bilhuset.dk' },
    { html: 'test@wixpress.com', expected: '' }, // Should be filtered
    { html: 'user@example.com', expected: 'user@example.com' },
    { html: 'salg@autohaus.dk', expected: 'salg@autohaus.dk' }
  ];
  
  var passed = 0;
  var failed = 0;
  
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var result = extractEmail_(t.html);
    if (result === t.expected) {
      Logger.log('✓ Test ' + (i+1) + ' passed');
      passed++;
    } else {
      Logger.log('✗ Test ' + (i+1) + ' FAILED: Expected "' + t.expected + '", got "' + result + '"');
      failed++;
    }
  }
  
  Logger.log('\nEmail Tests: ' + passed + ' passed, ' + failed + ' failed');
  return failed === 0;
}

/**
 * Test Meta Pixel extraction
 */
function testMetaPixelExtraction() {
  var html1 = 'fbq("init", "1234567890123456");';
  var html2 = "fbq('init', '9876543210987654');";
  var html3 = 'facebook.com/tr?id=1122334455667788';
  var html4 = '"pixelId": "5544332211009988"';
  
  var allHtml = html1 + ' ' + html2 + ' ' + html3 + ' ' + html4;
  
  var ids = [];
  ids = ids.concat(extractAll_(allHtml, /fbq\(\s*['"](init|track)['"]\s*,\s*['"]?(\d{8,20})['"]?\s*\)/g, 2));
  ids = ids.concat(extractAll_(allHtml, /facebook\.com\/tr\?id=(\d{8,20})/g, 1));
  ids = ids.concat(extractAll_(allHtml, /"pixelId"\s*:\s*"(\d{8,20})"/g, 1));
  ids = unique_(ids);
  
  Logger.log('Meta Pixel IDs found: ' + ids.join(', '));
  Logger.log('Expected: 4 unique IDs');
  Logger.log(ids.length === 4 ? '✓ Test passed' : '✗ Test FAILED');
  
  return ids.length === 4;
}

/**
 * Test GA4/GTM extraction
 */
function testGA4GTMExtraction() {
  var html = 'G-ABC123XYZ and GTM-DEF456 plus G-XYZ789ABC and GTM-GHI123';
  
  var ga4 = unique_(extractAll_(html, /\bG-[A-Z0-9]{6,}\b/g));
  var gtm = unique_(extractAll_(html, /\bGTM-[A-Z0-9]{4,}\b/g));
  
  Logger.log('GA4 IDs: ' + ga4.join(', '));
  Logger.log('GTM IDs: ' + gtm.join(', '));
  
  var passed = (ga4.length === 2 && gtm.length === 2);
  Logger.log(passed ? '✓ Test passed' : '✗ Test FAILED');
  
  return passed;
}

/**
 * Test competitor detection
 */
function testCompetitorDetection() {
  var html = '<a href="https://bilbasen.dk/brugt/bil/">Bilbasen</a> and autoproff.dk and mobile.de';
  var comps = uniqueKeepOrder_(detectCompetitors_(html));
  
  Logger.log('Competitors found: ' + comps.join(', '));
  Logger.log('Expected: Bilbasen, AutoProff, Mobile.de');
  
  var passed = (comps.length === 3);
  Logger.log(passed ? '✓ Test passed' : '✗ Test FAILED');
  
  return passed;
}

/**
 * Test social media detection
 */
function testSocialMediaDetection() {
  var html = '<a href="https://facebook.com/bilhuset">Facebook</a> and instagram.com/bilhuset and linkedin.com/company/bilhuset';
  var social = unique_(detectSocialMedia_(html));
  
  Logger.log('Social media found: ' + social.join(', '));
  Logger.log('Expected: Facebook, Instagram, LinkedIn');
  
  var passed = (social.length === 3);
  Logger.log(passed ? '✓ Test passed' : '✗ Test FAILED');
  
  return passed;
}

/**
 * Test URL helpers
 */
function testUrlHelpers() {
  var tests = [
    { 
      func: 'normalizeUrl_', 
      input: 'example.com', 
      expected: 'https://example.com' 
    },
    { 
      func: 'extractDomain_', 
      input: 'https://www.example.com/page', 
      expected: 'www.example.com' 
    },
    { 
      func: 'getBaseUrl_', 
      input: 'https://example.com/page?q=1', 
      expected: 'https://example.com' 
    },
    { 
      func: 'stripUrlHash_', 
      input: 'https://example.com/page#section', 
      expected: 'https://example.com/page' 
    }
  ];
  
  var passed = 0;
  var failed = 0;
  
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    var result;
    
    switch(t.func) {
      case 'normalizeUrl_': result = normalizeUrl_(t.input); break;
      case 'extractDomain_': result = extractDomain_(t.input); break;
      case 'getBaseUrl_': result = getBaseUrl_(t.input); break;
      case 'stripUrlHash_': result = stripUrlHash_(t.input); break;
    }
    
    if (result === t.expected) {
      Logger.log('✓ ' + t.func + ' passed');
      passed++;
    } else {
      Logger.log('✗ ' + t.func + ' FAILED: Expected "' + t.expected + '", got "' + result + '"');
      failed++;
    }
  }
  
  Logger.log('\nURL Helper Tests: ' + passed + ' passed, ' + failed + ' failed');
  return failed === 0;
}

/**
 * Kør alle tests
 */
function runAllTests() {
  Logger.log('========================================');
  Logger.log('AutoUncle Sales Cheat Sheet - Test Suite');
  Logger.log('========================================\n');
  
  var results = [];
  
  results.push({ name: 'CVR Extraction', passed: testCvrExtraction() });
  Logger.log('');
  
  results.push({ name: 'Phone Extraction', passed: testPhoneExtraction() });
  Logger.log('');
  
  results.push({ name: 'Email Extraction', passed: testEmailExtraction() });
  Logger.log('');
  
  results.push({ name: 'Meta Pixel Extraction', passed: testMetaPixelExtraction() });
  Logger.log('');
  
  results.push({ name: 'GA4/GTM Extraction', passed: testGA4GTMExtraction() });
  Logger.log('');
  
  results.push({ name: 'Competitor Detection', passed: testCompetitorDetection() });
  Logger.log('');
  
  results.push({ name: 'Social Media Detection', passed: testSocialMediaDetection() });
  Logger.log('');
  
  results.push({ name: 'URL Helpers', passed: testUrlHelpers() });
  Logger.log('');
  
  Logger.log('========================================');
  Logger.log('TEST SUMMARY');
  Logger.log('========================================');
  
  var totalPassed = 0;
  var totalFailed = 0;
  
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    Logger.log((r.passed ? '✓' : '✗') + ' ' + r.name);
    if (r.passed) totalPassed++;
    else totalFailed++;
  }
  
  Logger.log('');
  Logger.log('Total: ' + totalPassed + ' passed, ' + totalFailed + ' failed');
  Logger.log('========================================');
  
  if (totalFailed === 0) {
    Logger.log('🎉 ALL TESTS PASSED!');
  } else {
    Logger.log('⚠️ SOME TESTS FAILED');
  }
}
