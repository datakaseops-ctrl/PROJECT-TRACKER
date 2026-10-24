/* Paste this into Extensions > Apps Script in your Google Sheet (open Apps Script FROM the sheet).
   Then Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
   Copy the Web app URL into SCRIPT_URL in js/config.js.
   After any change to this code: Deploy > Manage deployments > pencil icon > Version: New version > Deploy. */

// Only fill this in if the script was created at script.google.com instead of from the sheet.
// It is the long text between /d/ and /edit in the sheet's address bar.
const SHEET_ID = '';

const COLS = ['id','division','parent','title','from','to','status','assignee','manager_remark','exec_reply','updated','requested_status'];

function sh() {
  const ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  const s = ss.getSheets()[0];
  if (s.getLastRow() == 0) s.appendRow(COLS);
  else {
    const h = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(String);
    COLS.forEach(c => { if (!h.includes(c)) { s.getRange(1, h.length + 1).setValue(c); h.push(c); } });
  }
  return s;
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  try {
    const v = sh().getDataRange().getValues(), h = v.shift().map(String), tz = Session.getScriptTimeZone();
    return out(v.filter(r => r[0] !== '').map(r => Object.fromEntries(h.map((k, i) =>
      [k, r[i] instanceof Date ? Utilities.formatDate(r[i], tz, 'yyyy-MM-dd') : r[i]]))));
  } catch (err) { return out({ error: String(err) }); }
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents), s = sh(), v = s.getDataRange().getValues(), h = v[0].map(String);
    const row = h.map(k => d[k] ?? '');
    const i = v.findIndex((r, n) => n > 0 && String(r[0]) === String(d.id));
    if (i > 0) s.getRange(i + 1, 1, 1, h.length).setValues([row]); else s.appendRow(row);
    return out({ ok: true });
  } catch (err) { return out({ error: String(err) }); }
}
