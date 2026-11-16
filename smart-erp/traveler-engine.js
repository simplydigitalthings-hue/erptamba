/**
 * SMART ERP - Batch Heat Route Card & Digital QR Traveler Engine
 * Provides Floor-Level Traceability, Operation Checkpoints & QR Routing
 * for Precision Brass Machining & Industrial Valves (EN 10204 3.1 & ISO 9001 Compliance).
 */

const { generateCode128Svg, generateQrCodeSvg } = require('./barcode-engine');

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

function formatDate(d) {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return String(d);
  }
}

/**
 * List travelers with search and filtering
 */
async function getTravelers(pool, { factoryId, yearLabel, status, q, limit = 50, offset = 0 }) {
  const params = [factoryId, yearLabel];
  let sql = `
    SELECT t.*,
           (SELECT COUNT(*) FROM prodn_traveler_stage s WHERE s.traveler_id = t.traveler_id) AS total_stages,
           (SELECT COUNT(*) FROM prodn_traveler_stage s WHERE s.traveler_id = t.traveler_id AND s.stage_status = 'PASSED') AS completed_stages
    FROM prodn_traveler t
    WHERE t.factory_id = $1 AND t.year_label = $2
  `;

  if (status && status !== 'ALL') {
    params.push(status);
    sql += ` AND t.status = $${params.length}`;
  }

  if (q && q.trim()) {
    params.push(`%${q.trim()}%`);
    const pIdx = params.length;
    sql += ` AND (
      t.traveler_no ILIKE $${pIdx}
      OR t.dc_no ILIKE $${pIdx}
      OR t.heat_no ILIKE $${pIdx}
      OR t.batch_no ILIKE $${pIdx}
      OR t.part_code ILIKE $${pIdx}
      OR t.part_name ILIKE $${pIdx}
    )`;
  }

  sql += ` ORDER BY t.traveler_id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(Math.min(100, Math.max(1, Number(limit) || 50)));
  params.push(Math.max(0, Number(offset) || 0));

  const res = await pool.query(sql, params);
  return res.rows;
}

/**
 * Fetch a single traveler with all operation stages
 */
async function getTravelerById(pool, { factoryId, yearLabel, travelerId, travelerNo }) {
  let headerRes;
  if (travelerId) {
    headerRes = await pool.query(
      `SELECT t.* FROM prodn_traveler t
       WHERE t.factory_id = $1 AND t.year_label = $2 AND t.traveler_id = $3`,
      [factoryId, yearLabel, Number(travelerId)]
    );
  } else if (travelerNo) {
    headerRes = await pool.query(
      `SELECT t.* FROM prodn_traveler t
       WHERE t.factory_id = $1 AND t.year_label = $2 AND LOWER(t.traveler_no) = LOWER($3)`,
      [factoryId, yearLabel, String(travelerNo).trim()]
    );
  }

  if (!headerRes || headerRes.rowCount === 0) return null;
  const traveler = headerRes.rows[0];

  const stagesRes = await pool.query(
    `SELECT s.* FROM prodn_traveler_stage s
     WHERE s.traveler_id = $1
     ORDER BY s.seq_no ASC`,
    [traveler.traveler_id]
  );
  traveler.stages = stagesRes.rows;
  return traveler;
}

/**
 * Generate Next Traveler Number (e.g. TRV-2627-0001)
 */
async function getNextTravelerNo(pool, { factoryId, yearLabel }) {
  const yr = String(yearLabel || '26-27').replace(/[^0-9]/g, '');
  const prefix = `TRV-${yr || '2627'}-`;

  const maxRes = await pool.query(
    `SELECT traveler_no FROM prodn_traveler
     WHERE factory_id = $1 AND year_label = $2 AND traveler_no LIKE $3
     ORDER BY traveler_id DESC LIMIT 1`,
    [factoryId, yearLabel, `${prefix}%`]
  );

  let nextSeq = 1;
  if (maxRes.rowCount > 0) {
    const lastNo = maxRes.rows[0].traveler_no;
    const parts = lastNo.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextSeq = lastNum + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Create a new Traveler (optionally linked to a Work Order Issue dc_id)
 */
async function createTraveler(pool, {
  factoryId,
  yearLabel,
  dcId = null,
  dcNo = null,
  heatNo = null,
  batchNo = null,
  partCode = null,
  partName = null,
  drawingRev = 'REV-01',
  plannedQty = 0,
  createdBy = 'Production Planning',
  customStages = null
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let resolvedDcNo = dcNo;
    let resolvedPartCode = partCode;
    let resolvedPartName = partName;
    let resolvedQty = Number(plannedQty) || 0;
    let resolvedItemIdOut = null;
    let resolvedItemIdIn = null;
    let resolvedHeatNo = heatNo;
    let resolvedBatchNo = batchNo;

    // If dcId provided, pull from prodn_iwo_iss and prodn_iwo_iss_sub
    if (dcId) {
      const iwoHead = await client.query(
        `SELECT h.* FROM prodn_iwo_iss h
         WHERE h.factory_id = $1 AND h.year_label = $2 AND h.dc_id = $3`,
        [factoryId, yearLabel, Number(dcId)]
      );

      if (iwoHead.rowCount > 0) {
        resolvedDcNo = iwoHead.rows[0].dc_no || resolvedDcNo || `IWO-${dcId}`;

        // Get sub lines
        const iwoLines = await client.query(
          `SELECT sub.*,
                  i_out.item_code AS code_out, i_out.item_name AS name_out,
                  i_in.item_code AS code_in, i_in.item_name AS name_in
           FROM prodn_iwo_iss_sub sub
           LEFT JOIN item i_out ON i_out.factory_id = sub.factory_id AND i_out.year_label = sub.year_label AND i_out.item_id = sub.item_id_out
           LEFT JOIN item i_in ON i_in.factory_id = sub.factory_id AND i_in.year_label = sub.year_label AND i_in.item_id = sub.item_id
           WHERE sub.factory_id = $1 AND sub.year_label = $2 AND sub.dc_id = $3
           ORDER BY sub.slno ASC`,
          [factoryId, yearLabel, Number(dcId)]
        );

        if (iwoLines.rowCount > 0) {
          const inLine = iwoLines.rows.find((r) => r.item_id && Number(r.qty) > 0);
          const outLine = iwoLines.rows.find((r) => r.item_id_out && Number(r.qty_out) > 0);

          if (inLine) {
            resolvedItemIdIn = inLine.item_id;
            resolvedPartCode = inLine.code_in || resolvedPartCode || 'COMP-01';
            resolvedPartName = inLine.name_in || resolvedPartName || 'Machined Component';
            resolvedQty = Number(inLine.qty) || resolvedQty;
            if (inLine.heat_no) resolvedHeatNo = inLine.heat_no;
            if (inLine.batch_no) resolvedBatchNo = inLine.batch_no;
          }

          if (outLine) {
            resolvedItemIdOut = outLine.item_id_out;
            if (!resolvedPartCode) resolvedPartCode = outLine.code_out;
            if (!resolvedPartName) resolvedPartName = outLine.name_out;
            if (!resolvedQty) resolvedQty = Number(outLine.qty_out) || 100;
            if (outLine.heat_no && !resolvedHeatNo) resolvedHeatNo = outLine.heat_no;
            if (outLine.batch_no && !resolvedBatchNo) resolvedBatchNo = outLine.batch_no;
          }
        }
      }
    }

    if (!resolvedPartCode) resolvedPartCode = 'B1-VALVE-BODY';
    if (!resolvedPartName) resolvedPartName = 'Precision Brass Valve Body';
    if (!resolvedQty || resolvedQty <= 0) resolvedQty = 500;
    if (!resolvedDcNo) resolvedDcNo = 'WO-2026-092';
    if (!resolvedHeatNo) resolvedHeatNo = 'HT-BRASS-704';
    if (!resolvedBatchNo) resolvedBatchNo = `BT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    // Check if traveler already exists for this dc_id
    if (dcId) {
      const existing = await client.query(
        `SELECT traveler_id, traveler_no FROM prodn_traveler
         WHERE factory_id = $1 AND year_label = $2 AND dc_id = $3 LIMIT 1`,
        [factoryId, yearLabel, Number(dcId)]
      );
      if (existing.rowCount > 0) {
        await client.query('COMMIT');
        return await getTravelerById(pool, { factoryId, yearLabel, travelerId: existing.rows[0].traveler_id });
      }
    }

    // Generate Traveler Number
    const travelerNo = await getNextTravelerNo(pool, { factoryId, yearLabel });

    // Insert Header
    const insertHead = await client.query(
      `INSERT INTO prodn_traveler (
         factory_id, year_label, traveler_no, dc_id, dc_no, heat_no, batch_no,
         item_id_out, item_id_in, part_code, part_name, drawing_rev,
         planned_qty, completed_qty, rejected_qty, current_stage_idx,
         current_stage_name, status, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,0,1,$14,'IN_PROGRESS',$15)
       RETURNING *`,
      [
        factoryId, yearLabel, travelerNo, dcId ? Number(dcId) : null,
        resolvedDcNo, resolvedHeatNo, resolvedBatchNo,
        resolvedItemIdOut, resolvedItemIdIn, resolvedPartCode, resolvedPartName,
        drawingRev || 'REV-01', resolvedQty,
        'Stage 1: Raw Material Cut-Off & Verification', createdBy || 'Production Planning'
      ]
    );
    const traveler = insertHead.rows[0];

    // Standard Stage Templates for Precision Brass & Machining Components
    const defaultStages = customStages || [
      {
        seq_no: 1,
        stage_name: 'Raw Material Cut-Off & Verification',
        station_type: 'INTERNAL',
        machine_name: 'Store Cut-Off Saw (Band-Saw)',
        operator_name: 'Store Supervisor',
        qty_in: resolvedQty,
        qty_ok: resolvedQty,
        qty_scrap: 0,
        stage_status: 'PASSED',
        qc_signoff_by: 'Raw Material QC',
        qc_notes: `Bar Stock Grade IS 319 Gr. 1 Verified against Heat #${resolvedHeatNo}`
      },
      {
        seq_no: 2,
        stage_name: 'Primary CNC / Traub Turning & Facing',
        station_type: 'INTERNAL',
        machine_name: 'CNC-LATHE-01 (HAAS)',
        operator_name: 'Ramesh K (Operator)',
        qty_in: resolvedQty,
        qty_ok: 0,
        qty_scrap: 0,
        stage_status: 'RUNNING',
        qc_signoff_by: null,
        qc_notes: null
      },
      {
        seq_no: 3,
        stage_name: 'Secondary Milling, Threading & Boring',
        station_type: 'INTERNAL',
        machine_name: 'VMC-DRILL-02',
        operator_name: 'Pending Assignment',
        qty_in: 0,
        qty_ok: 0,
        qty_scrap: 0,
        stage_status: 'PENDING',
        qc_signoff_by: null,
        qc_notes: null
      },
      {
        seq_no: 4,
        stage_name: 'Deburring, Ultrasonic Degreasing & Washing',
        station_type: 'INTERNAL',
        machine_name: 'Ultrasonic Wash Tank #1',
        operator_name: 'Finishing Line',
        qty_in: 0,
        qty_ok: 0,
        qty_scrap: 0,
        stage_status: 'PENDING',
        qc_signoff_by: null,
        qc_notes: null
      },
      {
        seq_no: 5,
        stage_name: 'Subcontract Surface Plating / Passivation',
        station_type: 'SUBCON',
        machine_name: 'Apex Electroplaters Pvt Ltd',
        operator_name: 'Subcontract QC',
        qty_in: 0,
        qty_ok: 0,
        qty_scrap: 0,
        stage_status: 'PENDING',
        qc_signoff_by: null,
        qc_notes: null
      },
      {
        seq_no: 6,
        stage_name: 'Final Quality Inspection & Pressure Test',
        station_type: 'INTERNAL',
        machine_name: 'QA Inspection Lab / Hydro Rig',
        operator_name: 'QA Inspector',
        qty_in: 0,
        qty_ok: 0,
        qty_scrap: 0,
        stage_status: 'PENDING',
        qc_signoff_by: null,
        qc_notes: null
      }
    ];

    for (const stg of defaultStages) {
      await client.query(
        `INSERT INTO prodn_traveler_stage (
           traveler_id, factory_id, year_label, seq_no, stage_name, station_type,
           machine_name, operator_name, qty_in, qty_ok, qty_scrap,
           stage_status, started_at, completed_at, qc_signoff_by, qc_notes
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          traveler.traveler_id, factoryId, yearLabel, stg.seq_no, stg.stage_name,
          stg.station_type || 'INTERNAL', stg.machine_name || '', stg.operator_name || '',
          Number(stg.qty_in || 0), Number(stg.qty_ok || 0), Number(stg.qty_scrap || 0),
          stg.stage_status || 'PENDING',
          stg.stage_status === 'PASSED' || stg.stage_status === 'RUNNING' ? new Date() : null,
          stg.stage_status === 'PASSED' ? new Date() : null,
          stg.qc_signoff_by || null, stg.qc_notes || null
        ]
      );
    }

    await client.query('COMMIT');
    return await getTravelerById(pool, { factoryId, yearLabel, travelerId: traveler.traveler_id });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Log Stage Progress (Advance to next stage, update OK/Scrap Qty)
 */
async function updateStageProgress(pool, {
  factoryId,
  yearLabel,
  stageId,
  operatorName = null,
  machineName = null,
  qtyOk = 0,
  qtyScrap = 0,
  qcNotes = null,
  qcSignoffBy = null
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch target stage
    const stgRes = await client.query(
      `SELECT s.*, t.planned_qty, t.status AS traveler_status
       FROM prodn_traveler_stage s
       JOIN prodn_traveler t ON t.traveler_id = s.traveler_id
       WHERE s.stage_id = $1 AND s.factory_id = $2 AND s.year_label = $3`,
      [Number(stageId), factoryId, yearLabel]
    );

    if (stgRes.rowCount === 0) {
      throw new Error(`Stage ID ${stageId} not found.`);
    }

    const currentStage = stgRes.rows[0];
    const travelerId = currentStage.traveler_id;
    const ok = Number(qtyOk) || 0;
    const scrap = Number(qtyScrap) || 0;

    // Update current stage as PASSED
    await client.query(
      `UPDATE prodn_traveler_stage SET
         operator_name = COALESCE($1, operator_name),
         machine_name = COALESCE($2, machine_name),
         qty_ok = $3,
         qty_scrap = $4,
         stage_status = 'PASSED',
         completed_at = NOW(),
         qc_notes = COALESCE($5, qc_notes),
         qc_signoff_by = COALESCE($6, qc_signoff_by),
         updated_at = NOW()
       WHERE stage_id = $7`,
      [operatorName, machineName, ok, scrap, qcNotes, qcSignoffBy || operatorName, Number(stageId)]
    );

    // 2. Fetch all stages to find next stage
    const allStages = await client.query(
      `SELECT * FROM prodn_traveler_stage
       WHERE traveler_id = $1 ORDER BY seq_no ASC`,
      [travelerId]
    );

    const nextStage = allStages.rows.find((s) => s.seq_no === currentStage.seq_no + 1);

    if (nextStage) {
      // Advance next stage to RUNNING with qty_in = qty_ok of previous stage
      await client.query(
        `UPDATE prodn_traveler_stage SET
           stage_status = 'RUNNING',
           qty_in = $1,
           started_at = NOW(),
           updated_at = NOW()
         WHERE stage_id = $2`,
        [ok, nextStage.stage_id]
      );

      // Update traveler pointer
      await client.query(
        `UPDATE prodn_traveler SET
           current_stage_idx = $1,
           current_stage_name = $2,
           rejected_qty = rejected_qty + $3,
           updated_at = NOW()
         WHERE traveler_id = $4`,
        [nextStage.seq_no, nextStage.stage_name, scrap, travelerId]
      );
    } else {
      // Final stage completed! Mark traveler COMPLETED
      await client.query(
        `UPDATE prodn_traveler SET
           status = 'COMPLETED',
           completed_qty = $1,
           rejected_qty = rejected_qty + $2,
           current_stage_idx = $3,
           current_stage_name = 'Completed & Final QA Passed',
           updated_at = NOW()
         WHERE traveler_id = $4`,
        [ok, scrap, currentStage.seq_no, travelerId]
      );
    }

    await client.query('COMMIT');
    return await getTravelerById(pool, { factoryId, yearLabel, travelerId });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Generate Printable Industrial A4/A5 Route Card Traveler HTML
 */
async function renderTravelerPrintHtml({ traveler, companyInfo = {}, origin = '' }) {
  const compName = companyInfo.print_head || 'BHARANI BRASS INDUSTRIES';
  const compAddr = companyInfo.print_short_addr || 'Factory & Works, Jamnagar, Gujarat';
  const gst = companyInfo.gstin || '24AABCB1234F1Z5';

  // Generate 1D Code 128 SVG
  const code128 = generateCode128Svg(traveler.traveler_no, { height: 38, moduleWidth: 1.5, fontSize: 10 });

  // Generate QR Code SVG encoding digital traveler passport
  const qrPayload = JSON.stringify({
    travelerNo: traveler.traveler_no,
    woNo: traveler.dc_no,
    heatNo: traveler.heat_no,
    batchNo: traveler.batch_no,
    partCode: traveler.part_code,
    qty: traveler.planned_qty,
    url: `${origin}/traveler?no=${encodeURIComponent(traveler.traveler_no)}`
  });

  const qrSvg = await generateQrCodeSvg(qrPayload, { width: 110, margin: 1 });

  const stagesHtml = (traveler.stages || []).map((s) => {
    const isPassed = s.stage_status === 'PASSED';
    const isRunning = s.stage_status === 'RUNNING';
    const badgeBg = isPassed ? '#e6f4ea' : isRunning ? '#feefe3' : '#f1f3f4';
    const badgeColor = isPassed ? '#137333' : isRunning ? '#b06000' : '#5f6368';
    const statusText = isPassed ? '✔ PASSED' : isRunning ? '⚡ IN PROGRESS' : 'PENDING';

    return `
      <tr>
        <td style="text-align: center; font-weight: bold; width: 32px;">${s.seq_no}</td>
        <td>
          <div style="font-weight: 600; font-size: 11px;">${escapeHtml(s.stage_name)}</div>
          <div style="font-size: 10px; color: #555;">Station / Machine: <b>${escapeHtml(s.machine_name || '-')}</b></div>
        </td>
        <td style="text-align: center; font-size: 10px;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-weight: 600; background: ${badgeBg}; color: ${badgeColor};">
            ${statusText}
          </span>
        </td>
        <td style="text-align: right; font-weight: 600; font-size: 11px;">${s.qty_in || '-'}</td>
        <td style="text-align: right; font-weight: bold; color: #0f5132; font-size: 11px;">${s.qty_ok || '-'}</td>
        <td style="text-align: right; font-weight: 600; color: #842029; font-size: 11px;">${s.qty_scrap > 0 ? s.qty_scrap : '-'}</td>
        <td style="font-size: 10px;">
          <div>${escapeHtml(s.operator_name || '')}</div>
          <div style="color: #666; font-size: 9px;">${formatDate(s.completed_at || s.started_at)}</div>
        </td>
        <td style="font-size: 10px;">
          <div style="font-weight: 600; color: #003366;">${escapeHtml(s.qc_signoff_by || '')}</div>
          <div style="font-size: 9px; color: #555;">${escapeHtml(s.qc_notes || '')}</div>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Shop Traveler - ${escapeHtml(traveler.traveler_no)}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      margin: 0; padding: 12px; color: #1a1a1a; background: #fff; line-height: 1.3;
      font-size: 11px;
    }
    .traveler-sheet {
      max-width: 820px; margin: 0 auto; border: 2px solid #1c625a; padding: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border-bottom: 2px solid #1c625a; padding-bottom: 8px; }
    .header-table td { vertical-align: top; }
    .comp-title { font-size: 16px; font-weight: 800; color: #1c625a; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
    .doc-badge {
      display: inline-block; background: #1c625a; color: #fff; font-weight: bold;
      padding: 3px 8px; border-radius: 3px; font-size: 11px; text-transform: uppercase;
      letter-spacing: 0.8px; margin-top: 4px;
    }
    .barcode-box { text-align: right; }
    .pedigree-grid {
      width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;
      background: #fafcfb; border: 1px solid #c2dbd7;
    }
    .pedigree-grid th {
      background: #e8f3f1; color: #134e48; font-weight: 700; padding: 5px 8px;
      text-align: left; border: 1px solid #c2dbd7; width: 18%; font-size: 10px; text-transform: uppercase;
    }
    .pedigree-grid td {
      padding: 5px 8px; border: 1px solid #c2dbd7; width: 32%; font-weight: 600;
    }
    .highlight-heat { color: #800000; font-family: monospace; font-size: 12px; font-weight: bold; }
    .highlight-batch { color: #004d40; font-family: monospace; font-size: 12px; font-weight: bold; }
    .table-stages {
      width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 11px;
    }
    .table-stages th {
      background: #1c625a; color: #fff; padding: 6px 6px; text-align: left;
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #144943;
    }
    .table-stages td {
      border: 1px solid #c2dbd7; padding: 6px 6px; vertical-align: middle;
    }
    .table-stages tr:nth-child(even) { background: #fdfdfd; }
    .footer-auth {
      display: flex; justify-content: space-between; border-top: 1px dashed #777;
      padding-top: 18px; margin-top: 16px; font-size: 10px; font-weight: 600;
    }
    .footer-auth div { text-align: center; width: 22%; border-top: 1px solid #222; padding-top: 4px; }
    .compliance-banner {
      background: #e6f4ea; border: 1px solid #34a853; border-radius: 4px; padding: 6px 10px;
      font-size: 10px; color: #137333; font-weight: 600; margin-top: 10px; display: flex;
      justify-content: space-between; align-items: center;
    }
    @media print {
      body { padding: 0; background: none; }
      .traveler-sheet { border: 1.5px solid #000; box-shadow: none; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; max-width: 820px; margin-left: auto; margin-right: auto;">
    <div style="font-size: 12px; color: #555;">
      Traveler: <b>${escapeHtml(traveler.traveler_no)}</b> &bull; Status: <b>${escapeHtml(traveler.status)}</b>
    </div>
    <div>
      <button onclick="window.print()" style="background: #1c625a; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;">🖨️ Print Route Card (A4/A5)</button>
    </div>
  </div>

  <div class="traveler-sheet">
    <!-- Header Block -->
    <table class="header-table">
      <tr>
        <td style="width: 58%;">
          <div class="comp-title">${escapeHtml(compName)}</div>
          <div style="font-size: 11px; color: #444; margin-top: 2px;">${escapeHtml(compAddr)} &bull; GSTIN: <b>${escapeHtml(gst)}</b></div>
          <div class="doc-badge">DIGITAL SHOP TRAVELER &bull; ROUTE CARD</div>
        </td>
        <td style="width: 22%; text-align: center; vertical-align: middle;">
          <div style="display: inline-block;">${qrSvg}</div>
          <div style="font-size: 9px; color: #666; margin-top: 2px;">Scan via Mobile / Gun</div>
        </td>
        <td style="width: 20%; text-align: right; vertical-align: top;">
          <div class="barcode-box">
            ${code128}
            <div style="font-size: 10px; font-weight: bold; margin-top: 4px; color: #1c625a;">DATE: ${formatDate(traveler.created_at)}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Material Genealogy & Pedigree Matrix -->
    <table class="pedigree-grid">
      <tr>
        <th>Work Order No:</th>
        <td>${escapeHtml(traveler.dc_no || '-')}</td>
        <th>Target Component:</th>
        <td><b style="font-size: 12px; color: #003366;">${escapeHtml(traveler.part_code)}</b> - ${escapeHtml(traveler.part_name)}</td>
      </tr>
      <tr>
        <th>Melt / Heat No:</th>
        <td class="highlight-heat">${escapeHtml(traveler.heat_no || 'HT-BRASS-704')}</td>
        <th>Drawing Revision:</th>
        <td>${escapeHtml(traveler.drawing_rev || 'REV-01')}</td>
      </tr>
      <tr>
        <th>Production Batch:</th>
        <td class="highlight-batch">${escapeHtml(traveler.batch_no || '-')}</td>
        <th>Planned Lot Qty:</th>
        <td><b style="font-size: 13px; color: #1c625a;">${traveler.planned_qty} NOS</b></td>
      </tr>
      <tr>
        <th>Raw Material Spec:</th>
        <td>IS 319 Gr. 1 Extruded Brass Rod</td>
        <th>Current Stage:</th>
        <td><b style="color: #b06000;">${escapeHtml(traveler.current_stage_name || '-')}</b></td>
      </tr>
    </table>

    <!-- Stage-by-Stage Operational Routing Table -->
    <table class="table-stages">
      <thead>
        <tr>
          <th style="width: 28px; text-align: center;">Op#</th>
          <th>Operation Description &amp; Station</th>
          <th style="width: 95px; text-align: center;">Status</th>
          <th style="width: 55px; text-align: right;">Qty In</th>
          <th style="width: 55px; text-align: right;">Qty OK</th>
          <th style="width: 55px; text-align: right;">Scrap</th>
          <th style="width: 105px;">Operator</th>
          <th style="width: 115px;">QC Sign-off</th>
        </tr>
      </thead>
      <tbody>
        ${stagesHtml}
      </tbody>
    </table>

    <!-- Compliance & Traceability Banner -->
    <div class="compliance-banner">
      <div>
        <span>🛡️ <b>EN 10204 Type 3.1 Traceability Guaranteed:</b> This traveler binds Heat #${escapeHtml(traveler.heat_no)} directly to finished part ${escapeHtml(traveler.part_code)}.</span>
      </div>
      <div>
        <span>ISO 9001:2015 Registered Factory</span>
      </div>
    </div>

    <!-- Sign-off Authority Blocks -->
    <div class="footer-auth">
      <div>Production Planning</div>
      <div>Machine Shop In-Charge</div>
      <div>Subcontract Supervisor</div>
      <div>Quality Assurance (QA Head)</div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  getTravelers,
  getTravelerById,
  getNextTravelerNo,
  createTraveler,
  updateStageProgress,
  renderTravelerPrintHtml
};
