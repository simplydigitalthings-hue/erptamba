/**
 * SMART ERP - Thread Go/No-Go Gauge Calibration & Wear Life Register Engine
 * Metrology & Tool Crib Subsystem for Precision Brass Components
 * Jamnagar Brass Manufacturing Standard (Metric, BSP, NPT, PG, UNF)
 */

const { generateQrCodeSvg } = require('./barcode-engine');

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

/**
 * Standard Thread Preset Library for Jamnagar Brass Industry
 */
const THREAD_PRESETS = [
  // Metric ISO (6H Plug / 6g Ring) - DIN 13 / ISO 68
  { standard: 'METRIC_ISO', size: 'M6 x 1.0', pitch_mm: 1.000, go_plug_dia: 5.350, nogo_plug_dia: 5.500, go_ring_dia: 5.324, nogo_ring_dia: 5.212, class_of_fit: '6H' },
  { standard: 'METRIC_ISO', size: 'M8 x 1.25', pitch_mm: 1.250, go_plug_dia: 7.188, nogo_plug_dia: 7.348, go_ring_dia: 7.160, nogo_ring_dia: 7.042, class_of_fit: '6H' },
  { standard: 'METRIC_ISO', size: 'M10 x 1.5', pitch_mm: 1.500, go_plug_dia: 9.026, nogo_plug_dia: 9.206, go_ring_dia: 8.994, nogo_ring_dia: 8.862, class_of_fit: '6H' },
  { standard: 'METRIC_ISO', size: 'M12 x 1.5', pitch_mm: 1.500, go_plug_dia: 11.026, nogo_plug_dia: 11.216, go_ring_dia: 10.994, nogo_ring_dia: 10.854, class_of_fit: '6H' },
  { standard: 'METRIC_ISO', size: 'M16 x 1.5', pitch_mm: 1.500, go_plug_dia: 15.026, nogo_plug_dia: 15.216, go_ring_dia: 14.994, nogo_ring_dia: 14.854, class_of_fit: '6H' },
  { standard: 'METRIC_ISO', size: 'M20 x 1.5', pitch_mm: 1.500, go_plug_dia: 19.026, nogo_plug_dia: 19.216, go_ring_dia: 18.994, nogo_ring_dia: 18.854, class_of_fit: '6H' },
  { standard: 'METRIC_ISO', size: 'M25 x 1.5', pitch_mm: 1.500, go_plug_dia: 24.026, nogo_plug_dia: 24.216, go_ring_dia: 23.994, nogo_ring_dia: 23.854, class_of_fit: '6H' },
  { standard: 'METRIC_ISO', size: 'M32 x 1.5', pitch_mm: 1.500, go_plug_dia: 31.026, nogo_plug_dia: 31.216, go_ring_dia: 30.994, nogo_ring_dia: 30.854, class_of_fit: '6H' },
  { standard: 'METRIC_ISO', size: 'M40 x 1.5', pitch_mm: 1.500, go_plug_dia: 39.026, nogo_plug_dia: 39.216, go_ring_dia: 38.994, nogo_ring_dia: 38.854, class_of_fit: '6H' },
  { standard: 'METRIC_ISO', size: 'M50 x 1.5', pitch_mm: 1.500, go_plug_dia: 49.026, nogo_plug_dia: 49.216, go_ring_dia: 48.994, nogo_ring_dia: 48.854, class_of_fit: '6H' },

  // BSP / BSPP (ISO 228-1, Class A) - Plumbing & Gas Fittings
  { standard: 'BSP_BSPP', size: 'G 1/8" (28 TPI)', pitch_mm: 0.907, go_plug_dia: 9.147, nogo_plug_dia: 9.254, go_ring_dia: 9.147, nogo_ring_dia: 9.076, class_of_fit: 'Class A' },
  { standard: 'BSP_BSPP', size: 'G 1/4" (19 TPI)', pitch_mm: 1.337, go_plug_dia: 12.301, nogo_plug_dia: 12.443, go_ring_dia: 12.301, nogo_ring_dia: 12.207, class_of_fit: 'Class A' },
  { standard: 'BSP_BSPP', size: 'G 3/8" (19 TPI)', pitch_mm: 1.337, go_plug_dia: 15.806, nogo_plug_dia: 15.948, go_ring_dia: 15.806, nogo_ring_dia: 15.712, class_of_fit: 'Class A' },
  { standard: 'BSP_BSPP', size: 'G 1/2" (14 TPI)', pitch_mm: 1.814, go_plug_dia: 19.793, nogo_plug_dia: 19.957, go_ring_dia: 19.793, nogo_ring_dia: 19.683, class_of_fit: 'Class A' },
  { standard: 'BSP_BSPP', size: 'G 3/4" (14 TPI)', pitch_mm: 1.814, go_plug_dia: 25.279, nogo_plug_dia: 25.443, go_ring_dia: 25.279, nogo_ring_dia: 25.169, class_of_fit: 'Class A' },
  { standard: 'BSP_BSPP', size: 'G 1" (11 TPI)', pitch_mm: 2.309, go_plug_dia: 31.770, nogo_plug_dia: 31.968, go_ring_dia: 31.770, nogo_ring_dia: 31.638, class_of_fit: 'Class A' },

  // NPT Taper Pipe Threads - ASME B1.20.1
  { standard: 'NPT_TAPER', size: '1/8" - 27 NPT', pitch_mm: 0.941, go_plug_dia: 9.489, nogo_plug_dia: 9.489, go_ring_dia: 9.489, nogo_ring_dia: 9.489, class_of_fit: 'L1 Standard' },
  { standard: 'NPT_TAPER', size: '1/4" - 18 NPT', pitch_mm: 1.411, go_plug_dia: 12.637, nogo_plug_dia: 12.637, go_ring_dia: 12.637, nogo_ring_dia: 12.637, class_of_fit: 'L1 Standard' },
  { standard: 'NPT_TAPER', size: '3/8" - 18 NPT', pitch_mm: 1.411, go_plug_dia: 16.037, nogo_plug_dia: 16.037, go_ring_dia: 16.037, nogo_ring_dia: 16.037, class_of_fit: 'L1 Standard' },
  { standard: 'NPT_TAPER', size: '1/2" - 14 NPT', pitch_mm: 1.814, go_plug_dia: 19.988, nogo_plug_dia: 19.988, go_ring_dia: 19.988, nogo_ring_dia: 19.988, class_of_fit: 'L1 Standard' },
  { standard: 'NPT_TAPER', size: '3/4" - 14 NPT', pitch_mm: 1.814, go_plug_dia: 25.326, nogo_plug_dia: 25.326, go_ring_dia: 25.326, nogo_ring_dia: 25.326, class_of_fit: 'L1 Standard' },
  { standard: 'NPT_TAPER', size: '1" - 11.5 NPT', pitch_mm: 2.209, go_plug_dia: 31.758, nogo_plug_dia: 31.758, go_ring_dia: 31.758, nogo_ring_dia: 31.758, class_of_fit: 'L1 Standard' },

  // PG Conduit (DIN 40430 / EN 60423) - Brass Cable Glands
  { standard: 'PG_CONDUIT', size: 'PG 7 (18 TPI)', pitch_mm: 1.411, go_plug_dia: 11.890, nogo_plug_dia: 12.010, go_ring_dia: 11.890, nogo_ring_dia: 11.770, class_of_fit: 'DIN 40430' },
  { standard: 'PG_CONDUIT', size: 'PG 9 (18 TPI)', pitch_mm: 1.411, go_plug_dia: 14.590, nogo_plug_dia: 14.710, go_ring_dia: 14.590, nogo_ring_dia: 14.470, class_of_fit: 'DIN 40430' },
  { standard: 'PG_CONDUIT', size: 'PG 11 (18 TPI)', pitch_mm: 1.411, go_plug_dia: 17.990, nogo_plug_dia: 18.110, go_ring_dia: 17.990, nogo_ring_dia: 17.870, class_of_fit: 'DIN 40430' },
  { standard: 'PG_CONDUIT', size: 'PG 13.5 (18 TPI)', pitch_mm: 1.411, go_plug_dia: 19.790, nogo_plug_dia: 19.910, go_ring_dia: 19.790, nogo_ring_dia: 19.670, class_of_fit: 'DIN 40430' },
  { standard: 'PG_CONDUIT', size: 'PG 16 (18 TPI)', pitch_mm: 1.411, go_plug_dia: 21.890, nogo_plug_dia: 22.010, go_ring_dia: 21.890, nogo_ring_dia: 21.770, class_of_fit: 'DIN 40430' },
  { standard: 'PG_CONDUIT', size: 'PG 21 (16 TPI)', pitch_mm: 1.588, go_plug_dia: 27.690, nogo_plug_dia: 27.810, go_ring_dia: 27.690, nogo_ring_dia: 27.570, class_of_fit: 'DIN 40430' },
  { standard: 'PG_CONDUIT', size: 'PG 29 (16 TPI)', pitch_mm: 1.588, go_plug_dia: 36.390, nogo_plug_dia: 36.510, go_ring_dia: 36.390, nogo_ring_dia: 36.270, class_of_fit: 'DIN 40430' },

  // UN / UNF / UNEF - ASME B1.1
  { standard: 'UN_UNF_UNEF', size: '1/2" - 20 UNF', pitch_mm: 1.270, go_plug_dia: 11.875, nogo_plug_dia: 12.009, go_ring_dia: 11.875, nogo_ring_dia: 11.758, class_of_fit: 'Class 2B' },
  { standard: 'UN_UNF_UNEF', size: '3/4" - 16 UNF', pitch_mm: 1.588, go_plug_dia: 18.019, nogo_plug_dia: 18.169, go_ring_dia: 18.019, nogo_ring_dia: 17.892, class_of_fit: 'Class 2B' },
  { standard: 'UN_UNF_UNEF', size: '1" - 20 UNEF', pitch_mm: 1.270, go_plug_dia: 24.575, nogo_plug_dia: 24.709, go_ring_dia: 24.575, nogo_ring_dia: 24.458, class_of_fit: 'Class 2B' }
];

/**
 * Returns available thread presets
 */
function getThreadPresets() {
  return THREAD_PRESETS;
}

/**
 * Calculates Wear Life percentage, remaining checks, and health status
 * @param {number} accumulatedCycles 
 * @param {number} ratedCycles 
 */
function calculateWearLife(accumulatedCycles = 0, ratedCycles = 10000) {
  const acc = Math.max(0, parseInt(accumulatedCycles, 10) || 0);
  const rated = Math.max(100, parseInt(ratedCycles, 10) || 10000);
  const usedPct = Number(Math.min(100, (acc / rated) * 100).toFixed(1));
  const remaining = Math.max(0, rated - acc);

  let wearHealth = 'HEALTHY';
  let badge = 'GOOD';
  let color = '#16a34a'; // Green

  if (usedPct >= 95) {
    wearHealth = 'CRITICAL';
    badge = 'WORN OUT';
    color = '#dc2626'; // Red
  } else if (usedPct >= 70) {
    wearHealth = 'WARNING';
    badge = 'WEAR WARNING';
    color = '#d97706'; // Amber
  }

  return {
    accumulatedCycles: acc,
    ratedCycles: rated,
    usedPct,
    remainingCycles: remaining,
    wearHealth,
    badge,
    color
  };
}

/**
 * Calculates next calibration due date and status
 * @param {string|Date} lastCalibDate 
 * @param {number} intervalMonths 
 */
function calculateCalibrationDue(lastCalibDate, intervalMonths = 6) {
  const last = lastCalibDate ? new Date(lastCalibDate) : new Date();
  const months = parseInt(intervalMonths, 10) || 6;
  
  const next = new Date(last);
  next.setMonth(next.getMonth() + months);
  const nextDueDateStr = next.toISOString().slice(0, 10);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(next);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let calibStatus = 'CURRENT';
  let badge = 'CALIBRATED';
  let color = '#16a34a';

  if (diffDays < 0) {
    calibStatus = 'OVERDUE';
    badge = 'OVERDUE (' + Math.abs(diffDays) + 'd)';
    color = '#dc2626';
  } else if (diffDays <= 30) {
    calibStatus = 'DUE_SOON';
    badge = 'DUE IN ' + diffDays + 'd';
    color = '#d97706';
  }

  return {
    lastCalibDate: last.toISOString().slice(0, 10),
    nextCalibDueDate: nextDueDateStr,
    intervalMonths: months,
    diffDays,
    calibStatus,
    badge,
    color
  };
}

/**
 * Fetch list of gauges with calculated wear & calibration metrics
 */
async function getGaugeList(pool, { factoryId, yearLabel, q = '', status = '', standard = '', limit = 50, offset = 0 }) {
  const params = [factoryId];
  let whereClauses = ['g.factory_id = $1'];

  if (q && q.trim()) {
    params.push(`%${q.trim()}%`);
    whereClauses.push(`(g.gauge_control_no ILIKE $${params.length} OR g.thread_size ILIKE $${params.length} OR g.current_location ILIKE $${params.length} OR g.issued_to ILIKE $${params.length} OR g.manufacturer_brand ILIKE $${params.length})`);
  }

  if (status && status !== 'ALL') {
    params.push(status);
    whereClauses.push(`g.gauge_status = $${params.length}`);
  }

  if (standard && standard !== 'ALL') {
    params.push(standard);
    whereClauses.push(`g.thread_standard = $${params.length}`);
  }

  params.push(Math.min(200, Math.max(1, parseInt(limit, 10) || 50)));
  params.push(Math.max(0, parseInt(offset, 10) || 0));

  const sql = `
    SELECT g.*,
           (SELECT COUNT(*) FROM gauge_calibration_logs l WHERE l.gauge_id = g.gauge_id) as total_calib_records
    FROM thread_gauges g
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY g.gauge_control_no ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const { rows } = await pool.query(sql, params);

  // Compute live metrics for each gauge
  const enrichedRows = rows.map(r => {
    const wear = calculateWearLife(r.accumulated_cycles, r.rated_wear_life_cycles);
    const calib = calculateCalibrationDue(r.last_calib_date, r.calib_interval_months);
    return {
      ...r,
      wear,
      calib
    };
  });

  return enrichedRows;
}

/**
 * Fetch a single gauge with full calibration history
 */
async function getGaugeById(pool, { factoryId, gaugeId }) {
  const gaugeSql = `
    SELECT g.*
    FROM thread_gauges g
    WHERE g.factory_id = $1 AND g.gauge_id = $2
  `;
  const { rows: gaugeRows } = await pool.query(gaugeSql, [factoryId, gaugeId]);
  if (!gaugeRows.length) return null;

  const gauge = gaugeRows[0];
  gauge.wear = calculateWearLife(gauge.accumulated_cycles, gauge.rated_wear_life_cycles);
  gauge.calib = calculateCalibrationDue(gauge.last_calib_date, gauge.calib_interval_months);

  const logsSql = `
    SELECT l.*
    FROM gauge_calibration_logs l
    WHERE l.factory_id = $1 AND l.gauge_id = $2
    ORDER BY l.calib_date DESC, l.log_id DESC
  `;
  const { rows: logRows } = await pool.query(logsSql, [factoryId, gaugeId]);
  gauge.calibration_history = logRows;

  return gauge;
}

/**
 * Save / Update a Thread Gauge
 */
async function saveGauge(pool, { factoryId, yearLabel, gaugeData, user }) {
  const g = gaugeData;
  const controlNo = (g.gauge_control_no || '').trim().toUpperCase();
  if (!controlNo) {
    throw new Error('Gauge Control Number is required (e.g. TG-M16-004)');
  }

  const threadSize = (g.thread_size || '').trim();
  if (!threadSize) {
    throw new Error('Thread Size is required (e.g. M16 x 1.5)');
  }

  const calibDue = calculateCalibrationDue(g.last_calib_date || new Date(), g.calib_interval_months || 6);
  const nextDueDate = g.next_calib_due_date || calibDue.nextCalibDueDate;

  if (g.gauge_id) {
    // Update
    const updateSql = `
      UPDATE thread_gauges
      SET gauge_control_no = $1,
          gauge_type = $2,
          thread_standard = $3,
          thread_size = $4,
          class_of_fit = $5,
          pitch_mm = $6,
          pitch_dia_go_nominal = $7,
          pitch_dia_nogo_nominal = $8,
          manufacturer_brand = $9,
          serial_no = $10,
          storage_location = $11,
          current_location = $12,
          issued_to = $13,
          rated_wear_life_cycles = $14,
          accumulated_cycles = $15,
          calib_interval_months = $16,
          last_calib_date = $17,
          next_calib_due_date = $18,
          gauge_status = $19,
          remarks = $20,
          updated_at = CURRENT_TIMESTAMP
      WHERE factory_id = $21 AND gauge_id = $22
      RETURNING *
    `;
    const params = [
      controlNo,
      g.gauge_type || 'THREAD_PLUG_GO_NOGO',
      g.thread_standard || 'METRIC_ISO',
      threadSize,
      g.class_of_fit || '6H',
      Number(g.pitch_mm) || 1.5,
      Number(g.pitch_dia_go_nominal) || 0,
      Number(g.pitch_dia_nogo_nominal) || 0,
      g.manufacturer_brand || 'Baker Gauges',
      g.serial_no || '',
      g.storage_location || 'Tool Crib',
      g.current_location || 'Tool Crib',
      g.issued_to || '',
      parseInt(g.rated_wear_life_cycles, 10) || 10000,
      parseInt(g.accumulated_cycles, 10) || 0,
      parseInt(g.calib_interval_months, 10) || 6,
      g.last_calib_date || new Date().toISOString().slice(0, 10),
      nextDueDate,
      g.gauge_status || 'ACTIVE',
      g.remarks || '',
      factoryId,
      g.gauge_id
    ];
    const { rows } = await pool.query(updateSql, params);
    return getGaugeById(pool, { factoryId, gaugeId: rows[0].gauge_id });
  } else {
    // Insert
    const insertSql = `
      INSERT INTO thread_gauges (
        factory_id, year_label, gauge_control_no, gauge_type, thread_standard,
        thread_size, class_of_fit, pitch_mm, pitch_dia_go_nominal, pitch_dia_nogo_nominal,
        manufacturer_brand, serial_no, storage_location, current_location, issued_to,
        rated_wear_life_cycles, accumulated_cycles, calib_interval_months, last_calib_date,
        next_calib_due_date, gauge_status, remarks
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19,
        $20, $21, $22
      ) RETURNING *
    `;
    const params = [
      factoryId,
      yearLabel || '2026-27',
      controlNo,
      g.gauge_type || 'THREAD_PLUG_GO_NOGO',
      g.thread_standard || 'METRIC_ISO',
      threadSize,
      g.class_of_fit || '6H',
      Number(g.pitch_mm) || 1.5,
      Number(g.pitch_dia_go_nominal) || 0,
      Number(g.pitch_dia_nogo_nominal) || 0,
      g.manufacturer_brand || 'Baker Gauges',
      g.serial_no || '',
      g.storage_location || 'Tool Crib',
      g.current_location || 'Tool Crib',
      g.issued_to || '',
      parseInt(g.rated_wear_life_cycles, 10) || 10000,
      parseInt(g.accumulated_cycles, 10) || 0,
      parseInt(g.calib_interval_months, 10) || 6,
      g.last_calib_date || new Date().toISOString().slice(0, 10),
      nextDueDate,
      g.gauge_status || 'ACTIVE',
      g.remarks || ''
    ];
    const { rows } = await pool.query(insertSql, params);
    return getGaugeById(pool, { factoryId, gaugeId: rows[0].gauge_id });
  }
}

/**
 * Log a Calibration Event for a Thread Gauge
 */
async function logCalibration(pool, { factoryId, logData, user }) {
  const gaugeId = parseInt(logData.gauge_id, 10);
  if (!gaugeId) {
    throw new Error('Valid Gauge ID is required to log calibration');
  }

  const calibDate = logData.calib_date || new Date().toISOString().slice(0, 10);
  const nextDueDate = logData.next_due_date;
  if (!nextDueDate) {
    throw new Error('Next Calibration Due Date is required');
  }

  const overallResult = logData.overall_result || 'PASS';

  // 1. Insert calibration log
  const insertSql = `
    INSERT INTO gauge_calibration_logs (
      gauge_id, factory_id, calib_date, agency_type, cert_number,
      calibrated_by, go_pitch_dia_measured, nogo_pitch_dia_measured,
      go_wear_status, nogo_wear_status, overall_result, next_due_date,
      cycles_at_calib, remarks
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14
    ) RETURNING *
  `;
  const params = [
    gaugeId,
    factoryId,
    calibDate,
    logData.agency_type || 'INTERNAL_LAB',
    logData.cert_number || '',
    logData.calibrated_by || 'Quality Metrology Lab',
    Number(logData.go_pitch_dia_measured) || null,
    Number(logData.nogo_pitch_dia_measured) || null,
    logData.go_wear_status || 'PASS',
    logData.nogo_wear_status || 'PASS',
    overallResult,
    nextDueDate,
    parseInt(logData.cycles_at_calib, 10) || 0,
    logData.remarks || ''
  ];
  await pool.query(insertSql, params);

  // 2. Update parent gauge
  let newStatus = 'ACTIVE';
  if (overallResult === 'FAIL_SCRAP') {
    newStatus = 'WORN_OUT';
  } else if (overallResult === 'CONDITION_MONITORED') {
    newStatus = 'QUARANTINED';
  }

  // If resetCycles checked, reset accumulated_cycles
  const shouldResetCycles = logData.reset_cycles === true || logData.reset_cycles === 'true';
  const cycleUpdateSql = shouldResetCycles ? ', accumulated_cycles = 0' : '';

  const updateGaugeSql = `
    UPDATE thread_gauges
    SET last_calib_date = $1,
        next_calib_due_date = $2,
        gauge_status = $3
        ${cycleUpdateSql},
        updated_at = CURRENT_TIMESTAMP
    WHERE factory_id = $4 AND gauge_id = $5
  `;
  await pool.query(updateGaugeSql, [calibDate, nextDueDate, newStatus, factoryId, gaugeId]);

  return getGaugeById(pool, { factoryId, gaugeId });
}

/**
 * Issue or Return Gauge from Tool Crib
 */
async function issueReturnGauge(pool, { factoryId, gaugeId, location, issuedTo, user }) {
  const updateSql = `
    UPDATE thread_gauges
    SET current_location = $1,
        issued_to = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE factory_id = $3 AND gauge_id = $4
    RETURNING *
  `;
  const { rows } = await pool.query(updateSql, [location || 'Tool Crib', issuedTo || '', factoryId, gaugeId]);
  if (!rows.length) throw new Error('Gauge not found');
  return getGaugeById(pool, { factoryId, gaugeId });
}

/**
 * Quick increment of strike / check cycles
 */
async function incrementGaugeCycles(pool, { factoryId, gaugeId, cycleIncrement, user }) {
  const inc = parseInt(cycleIncrement, 10) || 0;
  if (inc === 0) throw new Error('Increment must be non-zero');

  const updateSql = `
    UPDATE thread_gauges
    SET accumulated_cycles = GREATEST(0, accumulated_cycles + $1),
        updated_at = CURRENT_TIMESTAMP
    WHERE factory_id = $2 AND gauge_id = $3
    RETURNING *
  `;
  const { rows } = await pool.query(updateSql, [inc, factoryId, gaugeId]);
  if (!rows.length) throw new Error('Gauge not found');
  return getGaugeById(pool, { factoryId, gaugeId });
}

/**
 * Delete a gauge
 */
async function deleteGauge(pool, { factoryId, gaugeId }) {
  const deleteSql = `DELETE FROM thread_gauges WHERE factory_id = $1 AND gauge_id = $2 RETURNING gauge_control_no`;
  const { rows } = await pool.query(deleteSql, [factoryId, gaugeId]);
  return rows.length > 0;
}

/**
 * Generates 50mm x 25mm Direct Thermal Sticker HTML
 * Standard gauge label for affixing to gauge handle or wooden protective box.
 */
async function generateGaugeStickerHtml(gauge, company = {}) {
  const companyName = company.name || 'BHARANI BRASS INDUSTRIES';
  const controlNo = gauge.gauge_control_no || 'TG-M16-004';
  const size = gauge.thread_size || 'M16 x 1.5';
  const fit = gauge.class_of_fit ? `(${gauge.class_of_fit})` : '';
  const typeLabel = (gauge.gauge_type || 'PLUG').replace('THREAD_', '').replace('_GO_NOGO', '');
  const lastCal = gauge.last_calib_date ? String(gauge.last_calib_date).slice(0, 10) : '-';
  const nextDue = gauge.next_calib_due_date ? String(gauge.next_calib_due_date).slice(0, 10) : '-';
  const loc = gauge.current_location || 'Tool Crib';
  const wear = calculateWearLife(gauge.accumulated_cycles, gauge.rated_wear_life_cycles);

  // QR Code contains verification info
  const qrData = JSON.stringify({
    ctrl: controlNo,
    size: `${size} ${fit}`,
    due: nextDue,
    status: gauge.gauge_status || 'ACTIVE'
  });
  const qrSvg = await generateQrCodeSvg(qrData, { width: 70, margin: 0 });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Gauge Thermal Sticker - ${escapeHtml(controlNo)}</title>
<style>
  @page {
    size: 50mm 25mm;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    width: 50mm;
    height: 25mm;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    background: #fff;
    color: #000;
    padding: 1.5mm 2mm;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .header {
    border-bottom: 1px solid #000;
    padding-bottom: 0.5mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .comp-name {
    font-size: 6pt;
    font-weight: 800;
    letter-spacing: 0.2px;
    text-transform: uppercase;
  }
  .badge-status {
    font-size: 5.5pt;
    font-weight: 800;
    border: 1px solid #000;
    padding: 0 1.5px;
    text-transform: uppercase;
  }
  .main-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.5mm;
    gap: 1.5mm;
  }
  .info-col {
    flex: 1;
    min-width: 0;
  }
  .control-no {
    font-size: 9pt;
    font-weight: 900;
    letter-spacing: 0.5px;
    line-height: 1.1;
  }
  .spec-text {
    font-size: 6.5pt;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dates-row {
    font-size: 5.5pt;
    font-weight: 600;
    margin-top: 0.5mm;
    line-height: 1.2;
  }
  .qr-col {
    width: 17mm;
    height: 17mm;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .qr-col svg {
    width: 100%;
    height: 100%;
  }
  .footer-row {
    border-top: 0.5px dashed #000;
    padding-top: 0.4mm;
    display: flex;
    justify-content: space-between;
    font-size: 5pt;
    font-weight: 600;
  }
</style>
</head>
<body>
  <div class="header">
    <span class="comp-name">${escapeHtml(companyName)}</span>
    <span class="badge-status">${escapeHtml(gauge.gauge_status || 'ACTIVE')}</span>
  </div>

  <div class="main-row">
    <div class="info-col">
      <div class="control-no">${escapeHtml(controlNo)}</div>
      <div class="spec-text">${escapeHtml(size)} ${escapeHtml(fit)} [${escapeHtml(typeLabel)}]</div>
      <div class="dates-row">
        <div><strong>CAL:</strong> ${escapeHtml(lastCal)}</div>
        <div><strong>DUE:</strong> <span style="text-decoration: underline;">${escapeHtml(nextDue)}</span></div>
      </div>
    </div>
    <div class="qr-col">
      ${qrSvg}
    </div>
  </div>

  <div class="footer-row">
    <span>LOC: ${escapeHtml(loc)}</span>
    <span>LIFE: ${escapeHtml(wear.usedPct)}% (${escapeHtml(wear.accumulatedCycles)}/${escapeHtml(wear.ratedCycles)})</span>
  </div>
</body>
</html>`;
}

/**
 * Generates Master Gauge Calibration Schedule & Wear Life Report (A4 Printable)
 * ISO 9001 / IATF 16949 / Metrology Audit Compliance
 */
function generateMasterGaugeScheduleHtml(gauges = [], company = {}) {
  const companyName = company.name || 'BHARANI BRASS INDUSTRIES';
  const printDate = new Date().toLocaleDateString('en-GB');

  const rowsHtml = gauges.map((g, idx) => {
    const wear = g.wear || calculateWearLife(g.accumulated_cycles, g.rated_wear_life_cycles);
    const calib = g.calib || calculateCalibrationDue(g.last_calib_date, g.calib_interval_months);
    const statusBg = calib.calibStatus === 'OVERDUE' ? '#fee2e2' : (calib.calibStatus === 'DUE_SOON' ? '#fef3c7' : '#ecfdf5');
    const statusColor = calib.color;

    return `<tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="font-weight: bold; font-family: monospace;">${escapeHtml(g.gauge_control_no)}</td>
      <td><strong>${escapeHtml(g.thread_size)}</strong> <span style="font-size: 8pt; color: #64748b;">${escapeHtml(g.class_of_fit || '')}</span></td>
      <td>${escapeHtml((g.gauge_type || '').replace('THREAD_', ''))}</td>
      <td>${escapeHtml(g.thread_standard)}</td>
      <td style="text-align: right; font-family: monospace;">${g.pitch_dia_go_nominal ? Number(g.pitch_dia_go_nominal).toFixed(3) : '-'}</td>
      <td style="text-align: right; font-family: monospace;">${g.pitch_dia_nogo_nominal ? Number(g.pitch_dia_nogo_nominal).toFixed(3) : '-'}</td>
      <td>${escapeHtml(g.current_location || '-')}</td>
      <td style="text-align: center;">${g.last_calib_date ? String(g.last_calib_date).slice(0, 10) : '-'}</td>
      <td style="text-align: center; font-weight: bold; background: ${statusBg}; color: ${statusColor};">${g.next_calib_due_date ? String(g.next_calib_due_date).slice(0, 10) : '-'}</td>
      <td style="text-align: right;">
        <strong>${wear.accumulatedCycles}</strong> / ${wear.ratedCycles}
        <div style="font-size: 7.5pt; color: ${wear.color}; font-weight: bold;">${wear.usedPct}% Used</div>
      </td>
      <td style="text-align: center; font-size: 8pt; font-weight: bold;">
        <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: ${statusBg}; color: ${statusColor};">
          ${escapeHtml(g.gauge_status)}
        </span>
      </td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Master Thread Gauge Calibration Register - ${escapeHtml(companyName)}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 12mm 10mm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #0f172a;
    font-size: 9pt;
    line-height: 1.3;
    padding: 10px;
  }
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 8px;
    margin-bottom: 12px;
  }
  .doc-title {
    font-size: 14pt;
    font-weight: 800;
    text-transform: uppercase;
    color: #047857;
  }
  .doc-meta {
    text-align: right;
    font-size: 8.5pt;
    color: #475569;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  th, td {
    border: 1px solid #cbd5e1;
    padding: 5px 6px;
    font-size: 8.5pt;
  }
  th {
    background: #f1f5f9;
    font-weight: 700;
    color: #1e293b;
    text-align: left;
  }
  .sign-grid {
    display: flex;
    justify-content: space-between;
    margin-top: 30px;
    padding-top: 15px;
  }
  .sign-box {
    width: 28%;
    border-top: 1px solid #000;
    text-align: center;
    font-size: 8.5pt;
    padding-top: 4px;
    font-weight: 600;
  }
</style>
</head>
<body>
  <div class="doc-header">
    <div>
      <div class="doc-title">Master Thread Gauge Calibration & Wear Life Register</div>
      <div style="font-size: 11pt; font-weight: bold; margin-top: 2px;">${escapeHtml(companyName)}</div>
      <div style="font-size: 8pt; color: #64748b;">Quality Assurance & Precision Metrology Department • Jamnagar Plant</div>
    </div>
    <div class="doc-meta">
      <div><strong>ISO 9001:2015 / IATF 16949</strong> Control Doc</div>
      <div><strong>Report Date:</strong> ${printDate}</div>
      <div><strong>Total Gauges:</strong> ${gauges.length} registered</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 25px; text-align: center;">#</th>
        <th>Gauge Ctrl #</th>
        <th>Thread Size & Fit</th>
        <th>Type</th>
        <th>Standard</th>
        <th style="text-align: right;">Go Nominal</th>
        <th style="text-align: right;">NoGo Nominal</th>
        <th>Location / Machine</th>
        <th style="text-align: center;">Last Calib</th>
        <th style="text-align: center;">Next Due</th>
        <th style="text-align: right;">Checks / Life</th>
        <th style="text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="12" style="text-align: center; padding: 20px;">No gauges found.</td></tr>'}
    </tbody>
  </table>

  <div class="sign-grid">
    <div class="sign-box">Prepared By (Tool Crib In-Charge)</div>
    <div class="sign-box">Verified By (QA Metrologist)</div>
    <div class="sign-box">Approved By (Quality Head / Works Manager)</div>
  </div>
</body>
</html>`;
}

module.exports = {
  THREAD_PRESETS,
  getThreadPresets,
  calculateWearLife,
  calculateCalibrationDue,
  getGaugeList,
  getGaugeById,
  saveGauge,
  logCalibration,
  issueReturnGauge,
  incrementGaugeCycles,
  deleteGauge,
  generateGaugeStickerHtml,
  generateMasterGaugeScheduleHtml
};
