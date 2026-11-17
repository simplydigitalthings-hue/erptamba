const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  computeCapacityMetrics,
  TOOLING_PRESETS,
  generateSetupSheetHtml
} = require('../setup-recipe-engine');

test('Feature 6: Production Capacity & Shift Output Metrics Computation', () => {
  // Test 14.5 second cycle time
  const metrics14 = computeCapacityMetrics(14.5, 8, 0.90);
  assert.equal(metrics14.cycleTimeSeconds, 14.5);
  assert.equal(metrics14.grossPerHour, 248); // Math.round(3600 / 14.5) = 248
  assert.equal(metrics14.shiftTarget, 1787); // Math.floor((8 * 3600 / 14.5) * 0.9) = 1787
  assert.equal(metrics14.dailyTarget, 5361); // 1787 * 3 = 5361

  // Test 9.5 second cycle time (Traub automat)
  const metricsTraub = computeCapacityMetrics(9.5, 8, 0.90);
  assert.equal(metricsTraub.grossPerHour, 379);
  assert.equal(metricsTraub.shiftTarget, 2728);
  assert.equal(metricsTraub.dailyTarget, 8184);

  // Guard against 0 or negative cycle times
  const fallback = computeCapacityMetrics(0);
  assert.ok(fallback.shiftTarget > 0);
});

test('Feature 6: Tooling Presets Library Validation for Jamnagar Brass Turning', () => {
  assert.ok(Array.isArray(TOOLING_PRESETS), 'TOOLING_PRESETS must be an array');
  assert.ok(TOOLING_PRESETS.length >= 3, 'Must have at least 3 industrial presets');

  const cncPreset = TOOLING_PRESETS.find(p => p.presetId === 'CNC_BRASS_TURNING_6TOOL');
  assert.ok(cncPreset, 'Must have CNC_BRASS_TURNING_6TOOL preset');
  assert.equal(cncPreset.machineCategory, 'CNC_TURNING');
  assert.equal(cncPreset.stations.length, 6, 'CNC standard preset must have 6 stations');
  assert.ok(cncPreset.colletSpec.includes('173E'), 'Must specify standard collet 173E');

  const traubPreset = TOOLING_PRESETS.find(p => p.presetId === 'TRAUB_AUTOMAT_3SLIDE');
  assert.ok(traubPreset, 'Must have TRAUB_AUTOMAT_3SLIDE preset');
  assert.equal(traubPreset.machineCategory, 'TRAUB_AUTOMAT');
  assert.ok(traubPreset.traubCamProfile.includes('Turning Cam'), 'Must specify turning cam profile');
});

test('Feature 6: A4 Printable Setup Sheet HTML & QR Generation', async () => {
  const sampleRecipe = {
    recipe_code: 'RCP-B1-VALVE-01',
    item_code: 'B1-VALVE-BODY',
    item_name: 'Precision Brass Valve Body 1/2" BSP',
    drg_no: 'REV-01',
    machine_category: 'CNC_TURNING',
    mach_name: 'CNC-01 (JYOTI DX-200 3A)',
    controller_type: 'Fanuc 0i-TF',
    collet_spec: 'Hex 19mm (Collet 173E)',
    bar_feeder_stop_mm: 38.5,
    raw_material_grade: 'CW617N',
    raw_bar_shape: 'HEX',
    raw_bar_size: '19mm Hex',
    cnc_program_no: 'O1042',
    cycle_time_seconds: 14.5,
    setup_time_mins: 45,
    spindle_rpm: 3200,
    cutting_feed: 0.08,
    coolant_type: 'SOLUBLE_OIL_5PCT',
    parting_blade_width_mm: 2.0,
    tooling_layout: [
      { station: 'T01', operation: 'Facing & OD Roughing', holder: 'PCLNR 2020K12', insert_spec: 'CNMG 120404-SM', grade: 'Polished Carbide', notes: 'DOC 1.2mm' },
      { station: 'T05', operation: 'External Threading M16x1.5', holder: 'SER 2020K16', insert_spec: '16ER 1.5 ISO', grade: 'K20 Uncoated', notes: 'Verify with TG-M16-004' }
    ],
    qc_critical_dimensions: 'Verify threads with Thread Ring Gauge TG-M16-004',
    approved_by_setter: 'Ramesh K (Senior Setter)'
  };

  const sampleCompany = {
    comp_name: 'BHARANI BRASS INDUSTRIES',
    address: 'Shed No. C, 2-95, Shankar Tekri, Jamnagar - 361004'
  };

  const html = await generateSetupSheetHtml(sampleRecipe, sampleCompany);
  assert.ok(html.includes('RCP-B1-VALVE-01'), 'Must include recipe code');
  assert.ok(html.includes('BHARANI BRASS INDUSTRIES'), 'Must include company name');
  assert.ok(html.includes('Precision Brass Valve Body'), 'Must include part name');
  assert.ok(html.includes('Hex 19mm (Collet 173E)'), 'Must include collet spec');
  assert.ok(html.includes('PCLNR 2020K12'), 'Must include tool holder');
  assert.ok(html.includes('CNMG 120404-SM'), 'Must include insert spec');
  assert.ok(html.includes('1,787 pcs'), 'Must include 8-hr shift target');
  assert.ok(html.includes('data:image/png;base64,'), 'Must include QR Code');
  assert.ok(html.includes('Tool Room Setter Approval'), 'Must include signoff blocks');
});

test('Feature 6: Standalone Rollback Script Integrity Verification', () => {
  const rollbackPath = path.join(__dirname, '..', 'rollback-machine-setup-recipe.sql');
  assert.ok(fs.existsSync(rollbackPath), 'rollback-machine-setup-recipe.sql must exist');

  const content = fs.readFileSync(rollbackPath, 'utf8');
  assert.ok(content.includes('DROP TABLE IF EXISTS machine_setup_recipes CASCADE;'));

  // Ensure NO core tables are dropped
  const forbidden = ['purchase', 'dcinv', 'fund_trans', 'daily_prod', 'account_entry', 'cash_book'];
  for (const table of forbidden) {
    const regex = new RegExp(`DROP TABLE (IF EXISTS )?${table}`, 'i');
    assert.equal(regex.test(content), false, `Rollback script must NEVER drop ${table}`);
  }
});

test('Feature 6: Database Schema & Isolation in db.js', () => {
  const dbJsPath = path.join(__dirname, '..', 'db.js');
  const dbJs = fs.readFileSync(dbJsPath, 'utf8');

  assert.ok(dbJs.includes('CREATE TABLE IF NOT EXISTS machine_setup_recipes'), 'db.js must declare machine_setup_recipes');
  assert.ok(dbJs.includes('idx_machine_setup_recipes_search'), 'db.js must create search index');
  assert.ok(dbJs.includes('collet_spec'), 'db.js must include collet_spec');
  assert.ok(dbJs.includes('tooling_layout'), 'db.js must include tooling_layout JSON');
});

test('Feature 6: Frontend HTML Modal & Flex Non-Clipping Constraints', () => {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('id="recipe-hub"'), 'index.html must have #recipe-hub modal');
  assert.ok(html.includes('id="recipe-detail-container"'), 'Must have #recipe-detail-container');
  assert.ok(html.includes('id="recipe-list-container"'), 'Must have #recipe-list-container');

  // Verify flex non-clipping rule
  assert.ok(html.includes('id="recipe-detail-container" style="flex: 1; min-height: 0; height: 100%; overflow-y: auto;'), 'Must have min-height: 0; height: 100%; constraint on detail container');

  // Check script tag inclusion
  assert.ok(html.includes('/recipe.js'), 'Must include recipe.js script tag');
});

test('Feature 6: Menu Navigation & Cross-Link Wiring in app.js and traveler.js', () => {
  const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  assert.ok(appJs.includes('frmMachineRecipe'), 'app.js must register frmMachineRecipe');
  assert.ok(appJs.includes('openRecipeHub'), 'app.js must have openRecipeHub dispatcher');

  const travelerJsPath = path.join(__dirname, '..', 'public', 'traveler.js');
  const travelerJs = fs.readFileSync(travelerJsPath, 'utf8');
  assert.ok(travelerJs.includes('btn-traveler-recipe'), 'traveler.js must wire btn-traveler-recipe');
});
