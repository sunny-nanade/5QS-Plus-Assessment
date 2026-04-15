/**
 * Google Apps Script — Combined 4QS + 5QS+ Assessment Platform
 * ──────────────────────────────────────────────────────────────
 * Handles BOTH apps on the same deployment URL:
 *   • 4QS  → writes to "4QS_Responses" sheet  (no sheetName in payload)
 *   • 5QS+ → writes to "5QS+_Responses" sheet  (sheetName in payload)
 *
 * DEPLOY: Extensions → Apps Script → Deploy → Manage deployments
 *         → Edit → New version → Deploy
 */

// ── 4QS Config ──
const TARGET_SHEET_NAME = "4QS_Responses";
const ALLOWED_ORIGIN = "*";
const SENDER_NAME = "4QS Test App";
const SENDER_EMAIL = "sunny4qs@gmail.com";
const EMAIL_SUBJECT = "Your 4QS Test Results Confirmation";

// ── 5QS+ Headers (auto-created on first submission) ──
var FIVEQS_HEADERS = [
  'Timestamp', 'Name', 'Email', 'Age', 'Gender', 'Profession',
  'Institution', 'Program', 'IQ Score (%)', 'IQ Correct',
  'IQ Attempted', 'IQ Total Shown', 'EQ Score (%)', 'EQ Items',
  'AQ Score (%)', 'AQ Items', 'SQ Score (%)', 'SQ Items',
  'DQ Score (%)', 'DQ Items', 'DQ AI Literacy (%)',
  'DQ Data Analytics (%)', 'DQ Digital Ethics (%)',
  'DQ Cyber Awareness (%)', 'Stress Score (%)', 'Stress Items',
  '5QS+ Composite', 'Total Duration (sec)'
];

/**
 * Handles POST requests — routes to 4QS or 5QS+ based on payload
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (!data || typeof data !== "object") throw new Error("Invalid JSON payload");

    // ── Route: 5QS+ (payload has sheetName) ──
    if (data.sheetName) {
      return handle5QSPlus(data);
    }

    // ── Route: 4QS (legacy — no sheetName) ──
    return handle4QS(data);

  } catch (err) {
    console.error("doPost error:", err.message, err.stack);
    Logger.log("doPost error: " + err.message);
    return createResponse({ status: "error", message: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════
// 5QS+ Handler
// ═══════════════════════════════════════════════════════════════
function handle5QSPlus(data) {
  var sheetName = data.sheetName;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  // Auto-create sheet with formatted headers if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, FIVEQS_HEADERS.length).setValues([FIVEQS_HEADERS]);
    sheet.getRange(1, 1, 1, FIVEQS_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0F2B46')
      .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }

  var row = [
    data.timestamp || new Date().toISOString(),
    data.name || 'N/A',
    data.email || 'N/A',
    data.age || 'N/A',
    data.gender || 'N/A',
    data.profession || 'N/A',
    data.institution || 'N/A',
    data.program || 'N/A',
    data.iq || 0,
    data.iq_correct || 0,
    data.iq_attempted || 0,
    data.iq_total || 0,
    data.eq || 0,
    data.eq_items || 0,
    data.aq || 0,
    data.aq_items || 0,
    data.sq || 0,
    data.sq_items || 0,
    data.dq || 0,
    data.dq_items || 0,
    data.dq_ai_literacy || 0,
    data.dq_data_analytics || 0,
    data.dq_digital_ethics || 0,
    data.dq_cyber_awareness || 0,
    data.stress || 0,
    data.stress_items || 0,
    data.fiveqs_plus || 0,
    data.total_duration_sec || 0
  ];

  sheet.appendRow(row);

  return createResponse({ status: 'success', app: '5QS+', row: sheet.getLastRow() });
}

// ═══════════════════════════════════════════════════════════════
// 4QS Handler (original logic preserved)
// ═══════════════════════════════════════════════════════════════
function handle4QS(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TARGET_SHEET_NAME);
  if (!sheet) throw new Error('Sheet "' + TARGET_SHEET_NAME + '" not found');

  sheet.appendRow([
    new Date(),
    data.name || "",
    data.email || "",
    data.age || "",
    data.gender || "",
    data.profession || "",
    data.iq || "",
    data.eq || "",
    data.aq || "",
    data.sq || "",
    data.stress || "",
    data.fourqs || ""
  ]);

  // Attempt to send confirmation email
  var emailStatus = "skipped";
  if (data.email && isValidEmail(data.email)) {
    emailStatus = sendConfirmationEmail(data);
  } else {
    Logger.log("No valid email provided: " + (data.email || "missing"));
  }

  return createResponse({
    status: "success",
    app: "4QS",
    message: "Data successfully saved",
    emailStatus: emailStatus
  });
}

// ═══════════════════════════════════════════════════════════════
// Email (4QS only)
// ═══════════════════════════════════════════════════════════════
function sendConfirmationEmail(data) {
  try {
    var remainingQuota = MailApp.getRemainingDailyQuota();
    if (remainingQuota < 1) {
      Logger.log("Email not sent to " + data.email + ": Quota exceeded");
      return "quota_exceeded";
    }

    var emailBody =
      "Dear " + (data.name || "Participant") + ",\n\n" +
      "Thank you for completing the 4QS Test! Your results have been recorded.\n\n" +
      "Your Scores:\n" +
      "- IQ: " + (data.iq || 0) + "\n" +
      "- EQ: " + (data.eq || 0) + "\n" +
      "- AQ: " + (data.aq || 0) + "\n" +
      "- SQ: " + (data.sq || 0) + "\n" +
      "- Stress: " + (data.stress || 0) + "\n" +
      "- Final 4QS Score: " + (data.fourqs || 0) + "\n\n" +
      "For any questions, contact us at " + SENDER_EMAIL + ".\n\n" +
      "Best regards,\nThe 4QS Test Team";

    MailApp.sendEmail({
      to: data.email,
      subject: EMAIL_SUBJECT,
      name: SENDER_NAME,
      replyTo: SENDER_EMAIL,
      body: emailBody
    });

    Logger.log("Email sent successfully to: " + data.email);
    return "sent";
  } catch (err) {
    Logger.log("Email error for " + data.email + ": " + err.message);
    return "error: " + err.message;
  }
}

// ═══════════════════════════════════════════════════════════════
// Shared utilities
// ═══════════════════════════════════════════════════════════════
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      apps: ['4QS', '5QS+'],
      version: '3.0'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Test function for email (4QS)
 */
function testEmail() {
  var testData = {
    email: "sunny.nanade@nmims.edu",
    name: "Test User",
    iq: 7, eq: 60, aq: 0, sq: 0, stress: 17, fourqs: 16
  };
  var status = sendConfirmationEmail(testData);
  Logger.log("Test email status: " + status);
}
