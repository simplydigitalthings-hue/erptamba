const test = require("node:test");
const assert = require("node:assert/strict");

function parseDateOrNull(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;

  // Match ISO YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0");
    const m = dmyMatch[2].padStart(2, "0");
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
}

function parseTimestampOrNow(val) {
  if (!val) return new Date().toISOString();
  const s = String(val).trim();
  if (!s) return new Date().toISOString();

  // Match DD/MM/YYYY or DD-MM-YYYY with optional time and AM/PM
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?)?/i);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    let hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const meridiem = dmyMatch[7] ? dmyMatch[7].toLowerCase() : null;

    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;

    const dt = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(dt.getTime())) {
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      const hh = String(dt.getHours()).padStart(2, "0");
      const min = String(dt.getMinutes()).padStart(2, "0");
      const ss = String(dt.getSeconds()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    }
  }

  // Match YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const hours = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
    const minutes = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
    const seconds = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
    const dt = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(dt.getTime())) {
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      const hh = String(dt.getHours()).padStart(2, "0");
      const min = String(dt.getMinutes()).padStart(2, "0");
      const ss = String(dt.getSeconds()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    }
  }

  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString();
  }
  return new Date().toISOString();
}

test("parseDateOrNull parses various date formats to ISO YYYY-MM-DD", () => {
  assert.equal(parseDateOrNull("15-11-2026"), "2026-11-15");
  assert.equal(parseDateOrNull("15/11/2026"), "2026-11-15");
  assert.equal(parseDateOrNull("2026-11-15"), "2026-11-15");
  assert.equal(parseDateOrNull(""), null);
  assert.equal(parseDateOrNull(null), null);
  assert.equal(parseDateOrNull(undefined), null);
});

test("parseTimestampOrNow parses en-GB / en-IN datetime string to PostgreSQL timestamp", () => {
  assert.equal(parseTimestampOrNow("15/11/2026 05:58 PM"), "2026-11-15 17:58:00");
  assert.equal(parseTimestampOrNow("15/11/2026 11:20 AM"), "2026-11-15 11:20:00");
  assert.equal(parseTimestampOrNow("15/11/2026 12:00 PM"), "2026-11-15 12:00:00");
  assert.equal(parseTimestampOrNow("15/11/2026 12:00 AM"), "2026-11-15 00:00:00");
  assert.equal(parseTimestampOrNow("15/11/2026 17:58:00"), "2026-11-15 17:58:00");
  assert.equal(parseTimestampOrNow("2026-11-15 17:58:00"), "2026-11-15 17:58:00");
  assert.match(parseTimestampOrNow(""), /^\d{4}-\d{2}-\d{2}/);
  assert.match(parseTimestampOrNow(null), /^\d{4}-\d{2}-\d{2}/);
});
