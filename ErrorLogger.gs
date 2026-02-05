/**
 * Error logging utilities
 * Tracks failures to a "Logs" sheet for debugging
 */

/**
 * Log an error to the Logs sheet
 */
function logError_(errorType, details, rowNumber) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logsSheet = ss.getSheetByName('Logs');
    
    // Create Logs sheet if it doesn't exist
    if (!logsSheet) {
      logsSheet = ss.insertSheet('Logs');
      logsSheet.appendRow(['Timestamp', 'Error Type', 'Details', 'Row', 'Status']);
      logsSheet.getRange('A1:E1').setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');
      logsSheet.setFrozenRows(1);
    }
    
    // Add error entry
    logsSheet.appendRow([
      new Date(),
      errorType,
      details,
      rowNumber || 'N/A',
      'Error'
    ]);
    
    // Auto-resize columns
    logsSheet.autoResizeColumns(1, 5);
    
  } catch (e) {
    // If logging fails, at least show in console
    console.error('Failed to log error: ' + e.message);
  }
}

/**
 * Log a warning (non-critical issue)
 */
function logWarning_(warningType, details, rowNumber) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) {
      logsSheet = ss.insertSheet('Logs');
      logsSheet.appendRow(['Timestamp', 'Error Type', 'Details', 'Row', 'Status']);
      logsSheet.getRange('A1:E1').setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');
      logsSheet.setFrozenRows(1);
    }
    
    logsSheet.appendRow([
      new Date(),
      warningType,
      details,
      rowNumber || 'N/A',
      'Warning'
    ]);
    
    logsSheet.autoResizeColumns(1, 5);
    
  } catch (e) {
    console.error('Failed to log warning: ' + e.message);
  }
}

/**
 * Log a success message
 */
function logSuccess_(action, details, rowNumber) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) {
      logsSheet = ss.insertSheet('Logs');
      logsSheet.appendRow(['Timestamp', 'Error Type', 'Details', 'Row', 'Status']);
      logsSheet.getRange('A1:E1').setFontWeight('bold').setBackground('#4285F4').setFontColor('#FFFFFF');
      logsSheet.setFrozenRows(1);
    }
    
    logsSheet.appendRow([
      new Date(),
      action,
      details,
      rowNumber || 'N/A',
      'Success'
    ]);
    
    logsSheet.autoResizeColumns(1, 5);
    
  } catch (e) {
    console.error('Failed to log success: ' + e.message);
  }
}

/**
 * Clear old logs (keep last 100 entries)
 */
function cleanupLogs_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logsSheet = ss.getSheetByName('Logs');
    
    if (!logsSheet) return;
    
    var lastRow = logsSheet.getLastRow();
    if (lastRow > 101) { // Keep header + 100 entries
      logsSheet.deleteRows(2, lastRow - 101);
    }
  } catch (e) {
    console.error('Failed to cleanup logs: ' + e.message);
  }
}
