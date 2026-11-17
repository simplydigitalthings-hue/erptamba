/**
 * SMART ERP - Piece-Count Weighing Scale & Box Packing Slip Engine
 * Handles APW calibration, tare deduction, piece-count calculations,
 * database CRUD for consignments & cartons, 4"x6" thermal carton barcode label generation,
 * and A4 master packing lists.
 */

const { generateQrCodeSvg, generateCode128Svg } = require('./barcode-engine');

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

/**
 * Calculates Average Piece Weight (APW) in grams.
 * @param {number} samplePieces - e.g. 10, 20, 50, 100
 * @param {number} sampleWeightGrams - e.g. 297.0
 * @returns {number} APW in grams rounded to 3 decimals
 */
function calculateAPW(samplePieces, sampleWeightGrams) {
  const pcs = Number(samplePieces) || 0;
  const wt = Number(sampleWeightGrams) || 0;
  if (pcs <= 0 || wt <= 0) return 0;
  return Number((wt / pcs).toFixed(3));
}

/**
 * Calculates Net Weight in kg from Gross and Tare weights.
 */
function calculateBoxNetWeight(grossKg, tareKg) {
  const g = Number(grossKg) || 0;
  const t = Number(tareKg) || 0;
  return Math.max(0, Number((g - t).toFixed(3)));
}

/**
 * Calculates Piece Count from Net Weight (kg) and APW (grams).
 */
function calculateBoxPieces(netKg, apwGrams) {
  const netGrams = (Number(netKg) || 0) * 1000;
  const apw = Number(apwGrams) || 0;
  if (apw <= 0 || netGrams <= 0) {
    return { exactPieces: 0, roundedPieces: 0 };
  }
  const raw = netGrams / apw;
  return {
    exactPieces: Number(raw.toFixed(2)),
    roundedPieces: Math.round(raw)
  };
}

/**
 * Checks variance against target pieces.
 */
function checkTargetTolerance(actualPieces, targetPieces, tolerancePct = 1.0) {
  const act = Number(actualPieces) || 0;
  const tgt = Number(targetPieces) || 0;
  if (tgt <= 0) return { ok: true, pct: 0, diff: 0 };
  const diff = act - tgt;
  const pct = (diff / tgt) * 100;
  return {
    ok: Math.abs(pct) <= tolerancePct,
    pct: Number(pct.toFixed(2)),
    diff
  };
}

/**
 * Fetch Consignment List
 */
async function getPackingConsignmentList(pool, { factoryId, yearLabel, q = '', limit = 50, offset = 0 }) {
  const params = [factoryId, yearLabel];
  let sql = `
    SELECT p.*
    FROM packing_consignments p
    WHERE p.factory_id = $1 AND p.year_label = $2
  `;

  if (q && q.trim()) {
    params.push(`%${q.trim()}%`);
    const pIdx = params.length;
    sql += ` AND (
      p.packing_no ILIKE $${pIdx}
      OR p.part_code ILIKE $${pIdx}
      OR p.part_name ILIKE $${pIdx}
      OR p.ref_doc_no ILIKE $${pIdx}
      OR p.customer_name ILIKE $${pIdx}
      OR p.heat_no ILIKE $${pIdx}
      OR p.batch_no ILIKE $${pIdx}
    )`;
  }

  sql += ` ORDER BY p.packing_id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(Math.min(100, Math.max(1, Number(limit) || 50)));
  params.push(Math.max(0, Number(offset) || 0));

  const res = await pool.query(sql, params);
  return res.rows;
}

/**
 * Fetch single Consignment with its Cartons
 */
async function getPackingConsignmentById(pool, { factoryId, yearLabel, packingId, packingNo }) {
  let headerRes;
  if (packingId) {
    headerRes = await pool.query(
      `SELECT * FROM packing_consignments WHERE factory_id = $1 AND year_label = $2 AND packing_id = $3`,
      [factoryId, yearLabel, Number(packingId)]
    );
  } else if (packingNo) {
    headerRes = await pool.query(
      `SELECT * FROM packing_consignments WHERE factory_id = $1 AND year_label = $2 AND LOWER(packing_no) = LOWER($3)`,
      [factoryId, yearLabel, String(packingNo).trim()]
    );
  }

  if (!headerRes || headerRes.rowCount === 0) return null;
  const consignment = headerRes.rows[0];

  const cartonsRes = await pool.query(
    `SELECT * FROM packing_cartons WHERE packing_id = $1 AND factory_id = $2 ORDER BY carton_no ASC`,
    [consignment.packing_id, factoryId]
  );
  consignment.cartons = cartonsRes.rows;
  return consignment;
}

/**
 * Look up finished weight (APW in grams) from Item Master / Comp Master
 */
async function getItemAPW(pool, { factoryId, yearLabel, partCode, itemId }) {
  let res;
  if (itemId) {
    res = await pool.query(
      `SELECT c.finished_weight, c.weight, i.item_code, i.item_name
       FROM item i
       LEFT JOIN comp_master c ON c.factory_id = i.factory_id AND c.year_label = i.year_label AND c.item_id = i.item_id
       WHERE i.factory_id = $1 AND i.year_label = $2 AND i.item_id = $3 LIMIT 1`,
      [factoryId, yearLabel, Number(itemId)]
    );
  } else if (partCode) {
    res = await pool.query(
      `SELECT c.finished_weight, c.weight, i.item_code, i.item_name, i.item_id
       FROM item i
       LEFT JOIN comp_master c ON c.factory_id = i.factory_id AND c.year_label = i.year_label AND c.item_id = i.item_id
       WHERE i.factory_id = $1 AND i.year_label = $2 AND LOWER(i.item_code) = LOWER($3) LIMIT 1`,
      [factoryId, yearLabel, String(partCode).trim()]
    );
  }

  if (res && res.rowCount > 0) {
    const row = res.rows[0];
    const finishedWt = Number(row.finished_weight) || Number(row.weight) || 0;
    return {
      itemId: row.item_id,
      partCode: row.item_code,
      partName: row.item_name,
      apwGrams: finishedWt > 0 ? finishedWt : 15.0
    };
  }
  return { apwGrams: 15.0 };
}

/**
 * Generate Next Packing No
 */
async function generateNextPackingNo(pool, factoryId, yearLabel) {
  const res = await pool.query(
    `SELECT COUNT(*) as count FROM packing_consignments WHERE factory_id = $1 AND year_label = $2`,
    [factoryId, yearLabel]
  );
  const nextNum = (Number(res.rows[0]?.count) || 0) + 1;
  const yr = (yearLabel || '2026-27').replace(/[^0-9]/g, '').slice(0, 4);
  return `PKG-${yr}-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Save or Update Consignment and its Carton Lines (Atomically)
 */
async function savePackingConsignment(pool, { factoryId, yearLabel, data, user = 'Packing Station' }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let packingNo = String(data.packing_no || '').trim();
    if (!packingNo) {
      packingNo = await generateNextPackingNo(client, factoryId, yearLabel);
    }

    const partCode = String(data.part_code || '').trim() || 'B1-VALVE-BODY';
    const apwGrams = Number(data.apw_grams) > 0 ? Number(data.apw_grams) : 15.000;
    const samplePieces = Number(data.sample_pieces) || 20;
    const sampleWeightGrams = Number(data.sample_weight_grams) || Number((apwGrams * samplePieces).toFixed(3));
    const targetBoxQty = Number(data.target_box_qty) || 1000;
    const packingDate = data.packing_date || new Date().toISOString().slice(0, 10);
    const refDocType = data.ref_doc_type || 'DC';
    const refDocNo = data.ref_doc_no || 'WO-2026-310';
    const heatNo = data.heat_no || 'HT-BRASS-704';
    const batchNo = data.batch_no || 'BT-2026-421';
    const customerName = data.customer_name || 'Schneider Electric India';
    const packerName = data.packer_name || user || 'Packing Operator';
    const remarks = data.remarks || '';
    const status = data.status || 'PACKED';

    const cartonsInput = Array.isArray(data.cartons) && data.cartons.length > 0 ? data.cartons : [
      {
        carton_no: 1,
        tare_weight_kg: 0.200,
        gross_weight_kg: Number(((targetBoxQty * apwGrams / 1000) + 0.200).toFixed(3)),
        verified_qty: targetBoxQty,
        box_type: '5-Ply Corrugated Box'
      }
    ];

    // Compute totals
    let totalNetKg = 0;
    let totalGrossKg = 0;
    let totalTareKg = 0;
    let totalQty = 0;

    const computedCartons = cartonsInput.map((c, idx) => {
      const cNo = c.carton_no || idx + 1;
      const tareKg = Number(c.tare_weight_kg) >= 0 ? Number(c.tare_weight_kg) : 0.200;
      const grossKg = Number(c.gross_weight_kg) >= 0 ? Number(c.gross_weight_kg) : 0;
      const netKg = calculateBoxNetWeight(grossKg, tareKg);
      const calcPcs = calculateBoxPieces(netKg, apwGrams).roundedPieces;
      const verifiedPcs = Number(c.verified_qty) > 0 ? Number(c.verified_qty) : calcPcs;
      const barcode = c.carton_barcode || `CTN-${packingNo}-B${String(cNo).padStart(2, '0')}`;

      totalTareKg += tareKg;
      totalGrossKg += grossKg;
      totalNetKg += netKg;
      totalQty += verifiedPcs;

      return {
        carton_no: cNo,
        carton_barcode: barcode,
        tare_weight_kg: Number(tareKg.toFixed(3)),
        gross_weight_kg: Number(grossKg.toFixed(3)),
        net_weight_kg: Number(netKg.toFixed(3)),
        calculated_qty: calcPcs,
        verified_qty: verifiedPcs,
        box_type: c.box_type || '5-Ply Corrugated Box',
        carton_status: c.carton_status || 'OK',
        notes: c.notes || ''
      };
    });

    const totalCartons = computedCartons.length;

    // Check if updating existing or inserting
    let packingId = Number(data.packing_id || 0);
    if (!packingId) {
      const existing = await client.query(
        `SELECT packing_id FROM packing_consignments WHERE factory_id = $1 AND year_label = $2 AND LOWER(packing_no) = LOWER($3)`,
        [factoryId, yearLabel, packingNo]
      );
      if (existing.rowCount > 0) {
        packingId = existing.rows[0].packing_id;
      }
    }

    if (packingId > 0) {
      await client.query(
        `UPDATE packing_consignments SET
          packing_no = $1, packing_date = $2, customer_name = $3,
          ref_doc_type = $4, ref_doc_no = $5, part_code = $6, part_name = $7,
          heat_no = $8, batch_no = $9, apw_grams = $10, sample_pieces = $11,
          sample_weight_grams = $12, target_box_qty = $13, total_cartons = $14,
          total_qty_pieces = $15, total_net_weight_kg = $16, total_gross_weight_kg = $17,
          total_tare_weight_kg = $18, packer_name = $19, status = $20, remarks = $21,
          updated_at = CURRENT_TIMESTAMP
        WHERE factory_id = $22 AND year_label = $23 AND packing_id = $24`,
        [
          packingNo, packingDate, customerName,
          refDocType, refDocNo, partCode, data.part_name || 'Precision Brass Part',
          heatNo, batchNo, apwGrams, samplePieces,
          sampleWeightGrams, targetBoxQty, totalCartons,
          totalQty, Number(totalNetKg.toFixed(3)), Number(totalGrossKg.toFixed(3)),
          Number(totalTareKg.toFixed(3)), packerName, status, remarks,
          factoryId, yearLabel, packingId
        ]
      );
      // Delete old carton lines
      await client.query(`DELETE FROM packing_cartons WHERE packing_id = $1 AND factory_id = $2`, [packingId, factoryId]);
    } else {
      const ins = await client.query(
        `INSERT INTO packing_consignments (
          factory_id, year_label, packing_no, packing_date, customer_name,
          ref_doc_type, ref_doc_no, part_code, part_name, heat_no, batch_no,
          apw_grams, sample_pieces, sample_weight_grams, target_box_qty,
          total_cartons, total_qty_pieces, total_net_weight_kg, total_gross_weight_kg,
          total_tare_weight_kg, packer_name, status, remarks
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20, $21, $22, $23
        ) RETURNING packing_id`,
        [
          factoryId, yearLabel, packingNo, packingDate, customerName,
          refDocType, refDocNo, partCode, data.part_name || 'Precision Brass Part', heatNo, batchNo,
          apwGrams, samplePieces, sampleWeightGrams, targetBoxQty,
          totalCartons, totalQty, Number(totalNetKg.toFixed(3)), Number(totalGrossKg.toFixed(3)),
          Number(totalTareKg.toFixed(3)), packerName, status, remarks
        ]
      );
      packingId = ins.rows[0].packing_id;
    }

    // Insert carton lines
    for (const c of computedCartons) {
      await client.query(
        `INSERT INTO packing_cartons (
          packing_id, factory_id, carton_no, carton_barcode, tare_weight_kg,
          gross_weight_kg, net_weight_kg, calculated_qty, verified_qty,
          box_type, carton_status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          packingId, factoryId, c.carton_no, c.carton_barcode, c.tare_weight_kg,
          c.gross_weight_kg, c.net_weight_kg, c.calculated_qty, c.verified_qty,
          c.box_type, c.carton_status, c.notes
        ]
      );
    }

    await client.query('COMMIT');

    return {
      packing_id: packingId,
      packing_no: packingNo,
      total_cartons: totalCartons,
      total_qty_pieces: totalQty,
      total_net_weight_kg: Number(totalNetKg.toFixed(3)),
      total_gross_weight_kg: Number(totalGrossKg.toFixed(3))
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Delete Consignment
 */
async function deletePackingConsignment(pool, { factoryId, yearLabel, packingId }) {
  const res = await pool.query(
    `DELETE FROM packing_consignments WHERE factory_id = $1 AND year_label = $2 AND packing_id = $3 RETURNING packing_no`,
    [factoryId, yearLabel, Number(packingId)]
  );
  return res.rowCount > 0;
}

/**
 * Generates OEM 4" x 6" Thermal Carton Barcode Label HTML.
 */
async function renderCartonLabelHtml(consignment, carton) {
  const ctnBarcode = carton.carton_barcode || `CTN-${consignment.packing_no}-B${String(carton.carton_no).padStart(2, '0')}`;
  
  // Barcode for carton tracking
  const barcodeSvg = generateCode128Svg(ctnBarcode, {
    height: 38,
    moduleWidth: 1.5,
    fontSize: 10
  });

  // 2D QR Code with compact OEM payload
  const qrPayload = JSON.stringify({
    box: carton.carton_no,
    of: consignment.total_cartons,
    part: consignment.part_code,
    qty: carton.verified_qty || carton.calculated_qty,
    nw: carton.net_weight_kg,
    gw: carton.gross_weight_kg,
    heat: consignment.heat_no,
    batch: consignment.batch_no,
    po: consignment.ref_doc_no
  });

  const qrSvg = await generateQrCodeSvg(qrPayload, { width: 90, margin: 1 });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Carton Label - ${escapeHtml(ctnBarcode)}</title>
<style>
  @page {
    size: 100mm 150mm;
    margin: 4mm;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #000;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .label-card {
    width: 92mm;
    height: 142mm;
    border: 2px solid #000;
    padding: 3mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .header {
    border-bottom: 2px solid #000;
    padding-bottom: 2mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .company-title {
    font-size: 13pt;
    font-weight: 900;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .box-badge {
    background: #000;
    color: #fff;
    padding: 2mm 3mm;
    font-size: 11pt;
    font-weight: 800;
    border-radius: 2px;
    white-space: nowrap;
  }
  .part-block {
    border-bottom: 1.5px solid #000;
    padding: 2.5mm 0;
  }
  .part-label { font-size: 8pt; text-transform: uppercase; font-weight: 700; color: #444; }
  .part-code { font-size: 17pt; font-weight: 900; font-family: monospace; }
  .part-desc { font-size: 10pt; font-weight: 600; color: #222; }

  .qty-block {
    border-bottom: 2px solid #000;
    padding: 3mm 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f4f4f4;
    padding: 2mm 3mm;
  }
  .qty-title { font-size: 9pt; font-weight: 800; text-transform: uppercase; }
  .qty-val { font-size: 26pt; font-weight: 900; font-family: monospace; }

  .weights-grid {
    border-bottom: 1.5px solid #000;
    padding: 2mm 0;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 2mm;
    text-align: center;
  }
  .weight-cell {
    border: 1px solid #999;
    padding: 1.5mm;
    border-radius: 2px;
  }
  .wt-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #555; }
  .wt-val { font-size: 12pt; font-weight: 800; font-family: monospace; margin-top: 1mm; }

  .trace-grid {
    border-bottom: 1.5px solid #000;
    padding: 2mm 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2mm;
    font-size: 8pt;
  }
  .trace-item { line-height: 1.3; }
  .trace-item b { font-family: monospace; font-size: 9pt; }

  .barcode-section {
    padding-top: 2mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .barcode-svg { max-width: 62mm; text-align: center; }
  .qr-svg { width: 24mm; text-align: right; }
  .footer-sub {
    font-size: 6.5pt;
    color: #555;
    text-align: center;
    margin-top: 1mm;
  }
</style>
</head>
<body onload="window.print()">
<div class="label-card">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-title">BHARANI BRASS INDUSTRIES</div>
      <div style="font-size: 7pt; color: #444;">Jamnagar, Gujarat • ISO 9001:2015 Precision Components</div>
    </div>
    <div class="box-badge">
      BOX ${carton.carton_no} OF ${consignment.total_cartons}
    </div>
  </div>

  <!-- Part Details -->
  <div class="part-block">
    <div class="part-label">Part / Item Identification</div>
    <div class="part-code">${escapeHtml(consignment.part_code)}</div>
    <div class="part-desc">${escapeHtml(consignment.part_name || 'Precision Brass Turned Component')}</div>
  </div>

  <!-- Big Quantity Box -->
  <div class="qty-block">
    <div>
      <div class="qty-title">Quantity (NOS)</div>
      <div style="font-size: 7.5pt; color: #555;">Piece-Scale Verified</div>
    </div>
    <div class="qty-val">${carton.verified_qty || carton.calculated_qty} <span style="font-size: 13pt;">PCS</span></div>
  </div>

  <!-- Weights Breakdown -->
  <div class="weights-grid">
    <div class="weight-cell">
      <div class="wt-label">Net Wt</div>
      <div class="wt-val">${Number(carton.net_weight_kg).toFixed(3)} <span style="font-size: 8pt;">KG</span></div>
    </div>
    <div class="weight-cell">
      <div class="wt-label">Tare Wt</div>
      <div class="wt-val">${Number(carton.tare_weight_kg).toFixed(3)} <span style="font-size: 8pt;">KG</span></div>
    </div>
    <div class="weight-cell">
      <div class="wt-label">Gross Wt</div>
      <div class="wt-val">${Number(carton.gross_weight_kg).toFixed(3)} <span style="font-size: 8pt;">KG</span></div>
    </div>
  </div>

  <!-- Traceability Lineage -->
  <div class="trace-grid">
    <div class="trace-item">
      <div>Ref Doc / PO #:</div>
      <b>${escapeHtml(consignment.ref_doc_no || 'WO-2026-310')}</b>
    </div>
    <div class="trace-item">
      <div>Customer:</div>
      <b>${escapeHtml(consignment.customer_name || 'OEM Client')}</b>
    </div>
    <div class="trace-item">
      <div>Raw Melt / Heat #:</div>
      <b style="color: #600;">${escapeHtml(consignment.heat_no || 'HT-BRASS-704')}</b>
    </div>
    <div class="trace-item">
      <div>Batch / Lot #:</div>
      <b style="color: #040;">${escapeHtml(consignment.batch_no || 'BT-2026-421')}</b>
    </div>
  </div>

  <!-- Barcode & QR Code Footer -->
  <div class="barcode-section">
    <div class="barcode-svg">
      ${barcodeSvg}
    </div>
    <div class="qr-svg">
      ${qrSvg}
    </div>
  </div>

  <div class="footer-sub">
    Packer: ${escapeHtml(consignment.packer_name)} • Packing Date: ${consignment.packing_date || new Date().toISOString().slice(0,10)} • APW: ${Number(consignment.apw_grams).toFixed(3)}g/pc
  </div>
</div>
</body>
</html>`;
}

/**
 * Generates Consolidated A4 Master Packing List HTML.
 */
async function renderMasterPackingListHtml(consignment, cartons = []) {
  const ctnRows = cartons.map((c, i) => `
    <tr style="border-bottom: 1px solid #cbd5e1; ${i % 2 === 1 ? 'background: #f8fafc;' : ''}">
      <td style="padding: 8px 10px; font-weight: bold; text-align: center;">${c.carton_no}</td>
      <td style="padding: 8px 10px; font-family: monospace; font-weight: 600;">${escapeHtml(c.carton_barcode)}</td>
      <td style="padding: 8px 10px; color: #475569;">${escapeHtml(c.box_type || '5-Ply Box')}</td>
      <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${Number(c.gross_weight_kg).toFixed(3)}</td>
      <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${Number(c.tare_weight_kg).toFixed(3)}</td>
      <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold; color: #0f172a;">${Number(c.net_weight_kg).toFixed(3)}</td>
      <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: 800; font-size: 13px; color: #1c625a;">${c.verified_qty || c.calculated_qty}</td>
      <td style="padding: 8px 10px; text-align: center;"><span style="background: #d1fae5; color: #065f46; font-size: 10px; padding: 2px 6px; border-radius: 3px; font-weight: bold;">VERIFIED</span></td>
    </tr>
  `).join('');

  const qrPayload = JSON.stringify({
    pkg: consignment.packing_no,
    part: consignment.part_code,
    cartons: consignment.total_cartons,
    total_qty: consignment.total_qty_pieces,
    net_wt: consignment.total_net_weight_kg,
    gross_wt: consignment.total_gross_weight_kg,
    heat: consignment.heat_no,
    batch: consignment.batch_no
  });

  const qrSvg = await generateQrCodeSvg(qrPayload, { width: 95, margin: 1 });
  const pkgBarcode = generateCode128Svg(consignment.packing_no, { height: 32, moduleWidth: 1.4, fontSize: 9 });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Packing List - ${escapeHtml(consignment.packing_no)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 15mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #1e293b; font-size: 11.5px; line-height: 1.4;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .container { max-width: 210mm; margin: 0 auto; }
  .header-table { width: 100%; border-bottom: 2.5px solid #1c625a; padding-bottom: 12px; margin-bottom: 12px; }
  .meta-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
    background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 6px;
    padding: 12px 16px; margin-bottom: 16px;
  }
  .meta-line { margin-bottom: 4px; }
  .meta-line span { color: #64748b; font-weight: 600; width: 130px; display: inline-block; }
  .meta-line b { color: #0f172a; }
  .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .grid-table th {
    background: #1c625a; color: #fff; padding: 8px 10px;
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .summary-cards {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
    margin-bottom: 20px;
  }
  .scard {
    background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px;
    padding: 10px; text-align: center;
  }
  .scard-lbl { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; }
  .scard-val { font-size: 16px; font-weight: 900; font-family: monospace; color: #0f172a; margin-top: 4px; }
  .signatures {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
    margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1;
    text-align: center;
  }
  .sig-line { border-top: 1px solid #0f172a; margin-top: 45px; padding-top: 4px; font-weight: bold; }
</style>
</head>
<body onload="window.print()">
<div class="container">
  <!-- Title & Company Header -->
  <table class="header-table">
    <tr>
      <td style="vertical-align: top;">
        <h1 style="margin: 0; font-size: 20px; color: #1c625a; text-transform: uppercase; letter-spacing: 0.5px;">BHARANI BRASS INDUSTRIES</h1>
        <p style="margin: 2px 0 0; color: #475569; font-size: 11px;">
          Plot No. 34/B, GIDC Phase-II, Dared, Jamnagar - 361004, Gujarat, India<br>
          GSTIN: 24AABCB1234F1Z5 • Email: dispatch@bharanibrassind.com
        </p>
      </td>
      <td style="text-align: right; vertical-align: top; width: 180px;">
        <div style="font-size: 16px; font-weight: 900; color: #0f172a;">MASTER PACKING LIST</div>
        <div style="font-size: 12px; font-family: monospace; font-weight: bold; color: #1c625a; margin-top: 2px;">${escapeHtml(consignment.packing_no)}</div>
        <div style="margin-top: 4px;">${pkgBarcode}</div>
      </td>
    </tr>
  </table>

  <!-- Meta Data -->
  <div class="meta-grid">
    <div>
      <div class="meta-line"><span>Customer Name:</span> <b>${escapeHtml(consignment.customer_name || 'OEM Customer')}</b></div>
      <div class="meta-line"><span>Reference Doc / PO:</span> <b>${escapeHtml(consignment.ref_doc_no || 'WO-2026-310')}</b> (${escapeHtml(consignment.ref_doc_type || 'DC')})</div>
      <div class="meta-line"><span>Part Code:</span> <b style="font-family: monospace; color: #003366;">${escapeHtml(consignment.part_code)}</b></div>
      <div class="meta-line"><span>Part Description:</span> <b>${escapeHtml(consignment.part_name || 'Precision Brass Turned Component')}</b></div>
    </div>
    <div>
      <div class="meta-line"><span>Packing Date:</span> <b>${consignment.packing_date || new Date().toISOString().slice(0,10)}</b></div>
      <div class="meta-line"><span>Raw Melt / Heat #:</span> <b style="font-family: monospace; color: #800000;">${escapeHtml(consignment.heat_no || 'HT-BRASS-704')}</b></div>
      <div class="meta-line"><span>Batch / Lot #:</span> <b style="font-family: monospace; color: #004d40;">${escapeHtml(consignment.batch_no || 'BT-2026-421')}</b></div>
      <div class="meta-line"><span>Avg Piece Wt (APW):</span> <b>${Number(consignment.apw_grams).toFixed(3)} grams/piece</b></div>
    </div>
  </div>

  <!-- Summary KPI Cards -->
  <div class="summary-cards">
    <div class="scard">
      <div class="scard-lbl">Total Cartons</div>
      <div class="scard-val">${consignment.total_cartons} Boxes</div>
    </div>
    <div class="scard">
      <div class="scard-lbl">Total Quantity</div>
      <div class="scard-val" style="color: #1c625a;">${consignment.total_qty_pieces} NOS</div>
    </div>
    <div class="scard">
      <div class="scard-lbl">Total Net Weight</div>
      <div class="scard-val">${Number(consignment.total_net_weight_kg).toFixed(3)} KG</div>
    </div>
    <div class="scard">
      <div class="scard-lbl">Total Gross Weight</div>
      <div class="scard-val">${Number(consignment.total_gross_weight_kg).toFixed(3)} KG</div>
    </div>
  </div>

  <!-- Itemized Carton Breakdown -->
  <table class="grid-table">
    <thead>
      <tr>
        <th style="width: 50px; text-align: center;">Box #</th>
        <th>Carton Barcode Serial</th>
        <th>Box Type</th>
        <th style="text-align: right; width: 85px;">Gross (KG)</th>
        <th style="text-align: right; width: 85px;">Tare (KG)</th>
        <th style="text-align: right; width: 85px;">Net (KG)</th>
        <th style="text-align: right; width: 95px;">Pieces (NOS)</th>
        <th style="text-align: center; width: 80px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${ctnRows}
    </tbody>
    <tfoot>
      <tr style="background: #e2e8f0; font-weight: 900; border-top: 2px solid #0f172a;">
        <td colspan="3" style="padding: 8px 10px; text-align: right; text-transform: uppercase;">Consignment Grand Totals:</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${Number(consignment.total_gross_weight_kg).toFixed(3)}</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${Number(consignment.total_tare_weight_kg).toFixed(3)}</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${Number(consignment.total_net_weight_kg).toFixed(3)}</td>
        <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 13px; color: #1c625a;">${consignment.total_qty_pieces}</td>
        <td style="padding: 8px 10px; text-align: center;">PASSED</td>
      </tr>
    </tfoot>
  </table>

  <!-- Bottom QR & Remarks -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-top: 10px;">
    <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; background: #fff;">
      <b style="color: #475569; font-size: 10px; text-transform: uppercase;">Quality &amp; Packing Certification Notes:</b>
      <p style="margin: 4px 0 0; font-size: 11px; color: #334155;">
        ${escapeHtml(consignment.remarks || 'Electronic piece-counting scale calibrated. Corrugated 5-ply cartons strapped and protected with moisture-barrier VCI polybag liner for precision brass components.')}
      </p>
    </div>
    <div style="text-align: center; padding: 4px; border: 1px solid #e2e8f0; border-radius: 4px;">
      ${qrSvg}
      <div style="font-size: 8px; font-weight: bold; color: #64748b;">Scan Consignment QR</div>
    </div>
  </div>

  <!-- Signatures -->
  <div class="signatures">
    <div>
      <div style="font-size: 10px; color: #64748b;">Packed &amp; Weighed By</div>
      <div class="sig-line">${escapeHtml(consignment.packer_name || 'Packing Scale Operator')}</div>
    </div>
    <div>
      <div style="font-size: 10px; color: #64748b;">Quality Verification (QA)</div>
      <div class="sig-line">QA Lead / Shift Inspector</div>
    </div>
    <div>
      <div style="font-size: 10px; color: #64748b;">Customer Goods Receiving Gate</div>
      <div class="sig-line">Receiver Signature &amp; Stamp</div>
    </div>
  </div>
</div>
</body>
</html>`;
}

module.exports = {
  calculateAPW,
  calculateBoxNetWeight,
  calculateBoxPieces,
  checkTargetTolerance,
  getPackingConsignmentList,
  getPackingConsignmentById,
  getItemAPW,
  generateNextPackingNo,
  savePackingConsignment,
  deletePackingConsignment,
  renderCartonLabelHtml,
  renderMasterPackingListHtml
};
