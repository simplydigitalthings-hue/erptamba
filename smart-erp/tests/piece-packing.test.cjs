/**
 * Automated Test Suite for Feature 4: Piece-Count Weighing Scale & Box Packing Slip
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  calculateAPW,
  calculateBoxNetWeight,
  calculateBoxPieces,
  checkTargetTolerance,
  renderCartonLabelHtml,
  renderMasterPackingListHtml
} = require('../packing-engine');

test('Feature 4: Scale Weight & Piece-Count Math Precision', async () => {
  // Test 1: APW Calculation
  const apw1 = calculateAPW(20, 300);
  assert.equal(apw1, 15.000, '20 pcs weighing 300g must give exactly 15.000g/pc');

  const apw2 = calculateAPW(50, 926.0);
  assert.equal(apw2, 18.520, '50 pcs weighing 926g must give exactly 18.520g/pc');

  // Edge cases
  assert.equal(calculateAPW(0, 100), 0);
  assert.equal(calculateAPW(10, 0), 0);

  // Test 2: Tare & Net Weight
  const net1 = calculateBoxNetWeight(15.200, 0.200);
  assert.equal(net1, 15.000, 'Gross 15.200kg - Tare 0.200kg must be 15.000kg');

  const net2 = calculateBoxNetWeight(0.100, 0.200);
  assert.equal(net2, 0, 'Net weight cannot be negative when tare exceeds gross');

  // Test 3: Net Weight to Pieces Count
  const pcs1 = calculateBoxPieces(15.000, 15.000);
  assert.equal(pcs1.exactPieces, 1000.00, '15.000 kg with 15.000 g APW must equal 1000.00 pcs');
  assert.equal(pcs1.roundedPieces, 1000);

  const pcs2 = calculateBoxPieces(23.150, 18.520);
  assert.equal(pcs2.exactPieces, 1250.00, '23.150 kg with 18.520 g APW must equal 1250.00 pcs');
  assert.equal(pcs2.roundedPieces, 1250);

  // Test 4: Tolerance checking
  const tol1 = checkTargetTolerance(1000, 1000, 1.0);
  assert.equal(tol1.ok, true);
  assert.equal(tol1.pct, 0);

  const tol2 = checkTargetTolerance(1015, 1000, 1.0);
  assert.equal(tol2.ok, false, '15 pcs variance (1.5%) exceeds 1.0% tolerance');
  assert.equal(tol2.pct, 1.5);
});

test('Feature 4: 4x6" Thermal Carton Label & A4 Master Packing List HTML Rendering', async () => {
  const sampleConsignment = {
    packing_no: 'PKG-2026-0001',
    packing_date: '2026-11-17',
    customer_name: 'Schneider Electric India Pvt Ltd',
    ref_doc_no: 'WO-2026-310',
    part_code: 'B1-VALVE-BODY',
    part_name: 'Precision Brass Valve Body',
    heat_no: 'HT-BRASS-704',
    batch_no: 'BT-2026-421',
    apw_grams: 18.520,
    total_cartons: 2,
    total_qty_pieces: 2500,
    total_net_weight_kg: 46.300,
    total_gross_weight_kg: 46.700,
    total_tare_weight_kg: 0.400,
    packer_name: 'Ramesh K (Packing Station 1)'
  };

  const sampleCarton = {
    carton_no: 1,
    carton_barcode: 'CTN-PKG-2026-0001-B01',
    box_type: '5-Ply Corrugated Box',
    tare_weight_kg: 0.200,
    gross_weight_kg: 23.350,
    net_weight_kg: 23.150,
    calculated_qty: 1250,
    verified_qty: 1250
  };

  // Test 4x6" Thermal Label
  const labelHtml = await renderCartonLabelHtml(sampleConsignment, sampleCarton);
  assert.ok(labelHtml.includes('BHARANI BRASS INDUSTRIES'), 'Must include company name');
  assert.ok(labelHtml.includes('BOX 1 OF 2'), 'Must include box numbering badge');
  assert.ok(labelHtml.includes('B1-VALVE-BODY'), 'Must include part code');
  assert.ok(labelHtml.includes('1250'), 'Must include piece quantity');
  assert.ok(labelHtml.includes('23.150'), 'Must include net weight');
  assert.ok(labelHtml.includes('<svg'), 'Must include barcode and QR code SVGs');

  // Test A4 Master Packing List
  const listHtml = await renderMasterPackingListHtml(sampleConsignment, [sampleCarton]);
  assert.ok(listHtml.includes('MASTER PACKING LIST'), 'Must include master header');
  assert.ok(listHtml.includes('PKG-2026-0001'), 'Must include packing slip number');
  assert.ok(listHtml.includes('Schneider Electric India Pvt Ltd'), 'Must include customer name');
  assert.ok(listHtml.includes('46.300'), 'Must include grand total net weight');
  assert.ok(listHtml.includes('2500'), 'Must include grand total piece count');
});

test('Feature 4: Schema Isolation & Rollback Script Safety', async () => {
  const rollbackPath = path.join(__dirname, '..', 'rollback-piece-packing.sql');
  assert.ok(fs.existsSync(rollbackPath), 'rollback-piece-packing.sql must exist');

  const sql = fs.readFileSync(rollbackPath, 'utf8');
  assert.ok(sql.includes('DROP TABLE IF EXISTS packing_cartons'), 'Must drop packing_cartons');
  assert.ok(sql.includes('DROP TABLE IF EXISTS packing_consignments'), 'Must drop packing_consignments');

  // Ensure isolation: never drops core accounting tables
  const nonCommentLines = sql.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  assert.ok(!nonCommentLines.includes('purchase'), 'Must NOT touch purchase table');
  assert.ok(!nonCommentLines.includes('dcinv'), 'Must NOT touch dcinv table');
  assert.ok(!nonCommentLines.includes('fund_trans'), 'Must NOT touch fund_trans table');
  assert.ok(!nonCommentLines.includes('daily_prod'), 'Must NOT touch daily_prod table');
});

test('Feature 4: Frontend HTML Modal & Flex Constraint Layout Verification', async () => {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Check modal existence
  assert.ok(html.includes('id="packing-hub"'), 'index.html must have #packing-hub modal');
  assert.ok(html.includes('id="packing-detail-container"'), 'Must have #packing-detail-container');
  assert.ok(html.includes('id="packing-list-container"'), 'Must have #packing-list-container');

  // Check flex height constraint (preventing scroll clipping)
  assert.ok(html.includes('id="packing-detail-container" style="flex: 1; min-height: 0; height: 100%; overflow-y: auto;'), 'Must have min-height: 0; height: 100%; constraint on detail container');

  // Check script tag inclusion
  assert.ok(html.includes('/packing.js'), 'Must include packing.js script tag');
});

test('Feature 4: Menu Dispatch & Cross-Link Button Wiring', async () => {
  const appJsPath = path.join(__dirname, '..', 'public', 'app.js');
  const appJs = fs.readFileSync(appJsPath, 'utf8');

  assert.ok(appJs.includes('frmPackingSlip'), 'app.js must register frmPackingSlip');
  assert.ok(appJs.includes('openPackingHub'), 'app.js must have openPackingHub dispatcher');

  const dcJsPath = path.join(__dirname, '..', 'public', 'dc.js');
  const dcJs = fs.readFileSync(dcJsPath, 'utf8');
  assert.ok(dcJs.includes('btnPacking'), 'dc.js must wire btnPacking');

  const invJsPath = path.join(__dirname, '..', 'public', 'invoice-mfg.js');
  const invJs = fs.readFileSync(invJsPath, 'utf8');
  assert.ok(invJs.includes('btnPacking'), 'invoice-mfg.js must wire btnPacking');
});
