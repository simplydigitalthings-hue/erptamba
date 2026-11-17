/**
 * Automated Test Suite for Feature 5: Thread Go/No-Go Gauge Calibration & Wear Life Register
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  THREAD_PRESETS,
  getThreadPresets,
  calculateWearLife,
  calculateCalibrationDue,
  generateGaugeStickerHtml,
  generateMasterGaugeScheduleHtml
} = require('../gauge-engine');

test('Feature 5: Thread Standards Preset Library Validation', () => {
  const presets = getThreadPresets();
  assert.ok(Array.isArray(presets), 'Presets must be an array');
  assert.ok(presets.length >= 25, 'Must contain standard Metric, BSP, NPT, PG, UNF presets');

  // Verify Metric M16 x 1.5
  const m16 = presets.find(p => p.standard === 'METRIC_ISO' && p.size === 'M16 x 1.5');
  assert.ok(m16, 'Metric M16 x 1.5 must exist');
  assert.equal(m16.pitch_mm, 1.500);
  assert.equal(m16.go_plug_dia, 15.026);
  assert.equal(m16.nogo_plug_dia, 15.216);

  // Verify BSP G 1/2"
  const g12 = presets.find(p => p.standard === 'BSP_BSPP' && p.size.startsWith('G 1/2"'));
  assert.ok(g12, 'BSP G 1/2" must exist');
  assert.equal(g12.pitch_mm, 1.814);
  assert.equal(g12.go_plug_dia, 19.793);

  // Verify NPT 1/2"
  const npt12 = presets.find(p => p.standard === 'NPT_TAPER' && p.size.startsWith('1/2"'));
  assert.ok(npt12, 'NPT 1/2" must exist');
  assert.equal(npt12.pitch_mm, 1.814);

  // Verify PG 16 (DIN 40430)
  const pg16 = presets.find(p => p.standard === 'PG_CONDUIT' && p.size.startsWith('PG 16'));
  assert.ok(pg16, 'PG 16 conduit must exist');
  assert.equal(pg16.pitch_mm, 1.411);
  assert.equal(pg16.go_plug_dia, 21.890);
});

test('Feature 5: Wear Life Percentage & Health Status Computations', () => {
  // Test 1: Low usage (under 70% -> Healthy Green)
  const wear1 = calculateWearLife(2500, 10000);
  assert.equal(wear1.usedPct, 25.0);
  assert.equal(wear1.remainingCycles, 7500);
  assert.equal(wear1.wearHealth, 'HEALTHY');
  assert.equal(wear1.color, '#16a34a');

  // Test 2: Warning usage (70% - 95% -> Amber Warning)
  const wear2 = calculateWearLife(7500, 10000);
  assert.equal(wear2.usedPct, 75.0);
  assert.equal(wear2.remainingCycles, 2500);
  assert.equal(wear2.wearHealth, 'WARNING');
  assert.equal(wear2.color, '#d97706');

  // Test 3: Critical wear (> 95% -> Red Critical / Out of tolerance risk)
  const wear3 = calculateWearLife(9800, 10000);
  assert.equal(wear3.usedPct, 98.0);
  assert.equal(wear3.remainingCycles, 200);
  assert.equal(wear3.wearHealth, 'CRITICAL');
  assert.equal(wear3.color, '#dc2626');

  // Edge cases
  const wearEdge = calculateWearLife(0, 0);
  assert.equal(wearEdge.usedPct, 0);
  assert.equal(wearEdge.wearHealth, 'HEALTHY');
});

test('Feature 5: Calibration Due Date & Days Interval Calculation', () => {
  // Past calibration date (e.g. 8 months ago with 6 month interval -> Overdue)
  const pastDate = new Date();
  pastDate.setMonth(pastDate.getMonth() - 8);
  const calib1 = calculateCalibrationDue(pastDate.toISOString().slice(0, 10), 6);
  assert.equal(calib1.calibStatus, 'OVERDUE');
  assert.ok(calib1.diffDays < 0);
  assert.equal(calib1.color, '#dc2626');

  // Calibration due soon (e.g. 5.5 months ago with 6 month interval -> Due Soon)
  const soonDate = new Date();
  soonDate.setDate(soonDate.getDate() - 165);
  const calib2 = calculateCalibrationDue(soonDate.toISOString().slice(0, 10), 6);
  assert.ok(calib2.diffDays <= 30);
  assert.equal(calib2.calibStatus, 'DUE_SOON');
  assert.equal(calib2.color, '#d97706');

  // Fresh calibration (e.g. today -> Current)
  const freshDate = new Date();
  const calib3 = calculateCalibrationDue(freshDate.toISOString().slice(0, 10), 12);
  assert.equal(calib3.calibStatus, 'CURRENT');
  assert.ok(calib3.diffDays > 300);
  assert.equal(calib3.color, '#16a34a');
});

test('Feature 5: 50x25mm Direct Thermal Sticker & Master Schedule Report Generation', async () => {
  const sampleGauge = {
    gauge_id: 1,
    gauge_control_no: 'TG-M16-004',
    gauge_type: 'THREAD_PLUG_GO_NOGO',
    thread_standard: 'METRIC_ISO',
    thread_size: 'M16 x 1.5',
    class_of_fit: '6H',
    pitch_mm: 1.500,
    pitch_dia_go_nominal: 15.026,
    pitch_dia_nogo_nominal: 15.216,
    current_location: 'CNC-LATHE-01 (HAAS)',
    issued_to: 'Ramesh K (Operator)',
    accumulated_cycles: 6450,
    rated_wear_life_cycles: 10000,
    calib_interval_months: 6,
    last_calib_date: '2026-10-15',
    next_calib_due_date: '2027-04-15',
    gauge_status: 'ACTIVE'
  };

  const sampleCompany = {
    name: 'BHARANI BRASS INDUSTRIES',
    address: 'Plot No. 421, GIDC Phase-II, Dared, Jamnagar'
  };

  // Test 50x25mm Thermal Label
  const stickerHtml = await generateGaugeStickerHtml(sampleGauge, sampleCompany);
  assert.ok(stickerHtml.includes('TG-M16-004'), 'Must include Gauge Control Number');
  assert.ok(stickerHtml.includes('BHARANI BRASS INDUSTRIES'), 'Must include company name');
  assert.ok(stickerHtml.includes('M16 x 1.5'), 'Must include thread size');
  assert.ok(stickerHtml.includes('CNC-LATHE-01'), 'Must include current shopfloor location');
  assert.ok(stickerHtml.includes('<svg'), 'Must include 2D QR Code SVG');

  // Test Master Calibration Schedule
  const scheduleHtml = generateMasterGaugeScheduleHtml([sampleGauge], sampleCompany);
  assert.ok(scheduleHtml.includes('Master Thread Gauge Calibration & Wear Life Register'), 'Must include master header');
  assert.ok(scheduleHtml.includes('TG-M16-004'), 'Must list gauge');
  assert.ok(scheduleHtml.includes('6450'), 'Must include accumulated checks');
  assert.ok(scheduleHtml.includes('ISO 9001:2015 / IATF 16949'), 'Must include standard audit badge');
});

test('Feature 5: Standalone Rollback Script Integrity Verification', () => {
  const rollbackPath = path.join(__dirname, '..', 'rollback-gauge-register.sql');
  assert.ok(fs.existsSync(rollbackPath), 'rollback-gauge-register.sql must exist');

  const content = fs.readFileSync(rollbackPath, 'utf8');
  assert.ok(content.includes('DROP TABLE IF EXISTS gauge_calibration_logs CASCADE;'));
  assert.ok(content.includes('DROP TABLE IF EXISTS thread_gauges CASCADE;'));

  // Ensure NO core tables are mentioned
  const forbidden = ['purchase', 'dcinv', 'fund_trans', 'daily_prod', 'account_entry', 'cash_book'];
  for (const table of forbidden) {
    const regex = new RegExp(`DROP TABLE (IF EXISTS )?${table}`, 'i');
    assert.equal(regex.test(content), false, `Rollback script must NEVER drop ${table}`);
  }
});

test('Feature 5: Database Schema & Isolation in db.js', () => {
  const dbJsPath = path.join(__dirname, '..', 'db.js');
  const dbJs = fs.readFileSync(dbJsPath, 'utf8');

  assert.ok(dbJs.includes('CREATE TABLE IF NOT EXISTS thread_gauges'), 'db.js must declare thread_gauges');
  assert.ok(dbJs.includes('CREATE TABLE IF NOT EXISTS gauge_calibration_logs'), 'db.js must declare gauge_calibration_logs');
  assert.ok(dbJs.includes('idx_thread_gauges_search'), 'db.js must create search index');
  assert.ok(dbJs.includes('idx_gauge_calibration_logs_gauge'), 'db.js must create calibration log index');
});

test('Feature 5: Frontend HTML Modal & Flex Non-Clipping Constraints', () => {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('id="gauge-hub"'), 'index.html must have #gauge-hub modal');
  assert.ok(html.includes('id="gauge-detail-container"'), 'Must have #gauge-detail-container');
  assert.ok(html.includes('id="gauge-list-container"'), 'Must have #gauge-list-container');
  assert.ok(html.includes('id="gauge-issue-modal"'), 'Must have #gauge-issue-modal dialog');
  assert.ok(html.includes('id="gauge-calib-modal"'), 'Must have #gauge-calib-modal dialog');

  // Verify flex non-clipping rule
  assert.ok(html.includes('id="gauge-detail-container" style="flex: 1; min-height: 0; height: 100%; overflow-y: auto;'), 'Must have min-height: 0; height: 100%; constraint on detail container');

  // Check script tag inclusion
  assert.ok(html.includes('/gauge.js'), 'Must include gauge.js script tag');
});

test('Feature 5: Menu Navigation & Cross-Link Wiring in app.js and traveler.js', () => {
  const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  assert.ok(appJs.includes('frmGaugeRegister'), 'app.js must register frmGaugeRegister');
  assert.ok(appJs.includes('openGaugeHub'), 'app.js must have openGaugeHub dispatcher');

  const travelerJsPath = path.join(__dirname, '..', 'public', 'traveler.js');
  const travelerJs = fs.readFileSync(travelerJsPath, 'utf8');
  assert.ok(travelerJs.includes('btn-traveler-gauge'), 'traveler.js must wire btn-traveler-gauge');
});
