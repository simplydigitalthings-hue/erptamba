/**
 * SMART ERP - CNC & Traub Machine Setup & Tooling Recipe Engine
 * Repeat Order Tooling & Machine Setup Master for Jamnagar Precision Brass
 */

const QRCode = require('qrcode');

function computeCapacityMetrics(cycleTimeSeconds, shiftHours = 8, oee = 0.90) {
  const ct = Math.max(0.1, Number(cycleTimeSeconds) || 10);
  const grossPerHour = Math.round(3600 / ct);
  const shiftTarget = Math.floor((shiftHours * 3600 / ct) * oee);
  const dailyTarget = shiftTarget * 3;
  return {
    cycleTimeSeconds: ct,
    grossPerHour,
    shiftTarget,
    dailyTarget,
    oeePct: Math.round(oee * 100),
    shiftHours
  };
}

const TOOLING_PRESETS = [
  {
    presetId: 'CNC_BRASS_TURNING_6TOOL',
    name: 'CNC 6-Station Brass Turning & Threading (Standard)',
    machineCategory: 'CNC_TURNING',
    colletSpec: 'Hex 19mm (Collet 173E)',
    controllerType: 'Fanuc 0i-TF',
    coolantType: 'SOLUBLE_OIL_5PCT',
    partingBladeWidthMm: 2.0,
    cycleTimeSeconds: 14.5,
    stations: [
      { station: 'T01', operation: 'Facing & OD Roughing', holder: 'PCLNR 2020K12', insert_spec: 'CNMG 120404-SM', grade: 'Uncoated Polished Carbide (Brass)', notes: 'DOC 1.2mm, CSS 240 m/min' },
      { station: 'T02', operation: 'OD Profiling & 45° Chamfer', holder: 'SVJCR 2020K16', insert_spec: 'VCMT 160404-NN', grade: 'PCD Diamond / K10 Polished', notes: 'Ra 0.8 finish, DOC 0.25mm' },
      { station: 'T03', operation: 'Center & Core Drilling Ø12.5mm', holder: 'ER32-MT3 Collet Chuck', insert_spec: 'Solid Carbide Drill Ø12.5mm', grade: 'TiAlN Coated Micrograin', notes: 'Peck 3.0mm, RPM 1800' },
      { station: 'T04', operation: 'ID Boring & Step Seat Finish', holder: 'S16R-SCLCR09', insert_spec: 'CCMT 09T304-SM', grade: 'Polished Carbide K10', notes: 'Internal bore Ø14.8 +/- 0.02mm' },
      { station: 'T05', operation: 'External Threading M16x1.5', holder: 'SER 2020K16', insert_spec: '16ER 1.5 ISO', grade: 'K20 Uncoated Carbide', notes: 'Verify with Thread Ring Gauge TG-M16-004' },
      { station: 'T06', operation: 'Cut-off / Parting', holder: 'Q-Cut 2020 Blade', insert_spec: '2.0mm Neutral Parting Insert', grade: 'Micrograin Carbide', notes: 'Kerf loss 2.0mm, reduce feed to 0.04 near center' }
    ]
  },
  {
    presetId: 'TRAUB_AUTOMAT_3SLIDE',
    name: 'Traub Automat A-25 Cam Setup (Cam & Chaser)',
    machineCategory: 'TRAUB_AUTOMAT',
    colletSpec: 'Hex 24mm (Traub A-25 Collet)',
    controllerType: 'Mechanical Cam',
    coolantType: 'NEAT_CUTTING_OIL',
    partingBladeWidthMm: 1.8,
    cycleTimeSeconds: 9.5,
    traubCamProfile: 'Turning Cam 38mm / 120°, Parting Cam 16mm / 90°',
    traubGearRatio: 'Spindle 32T / Cycle 48T',
    stations: [
      { station: 'Slide 1 (Front)', operation: 'Front Slide Form Turning & Step', holder: 'Dovetail Form Tool Holder', insert_spec: 'High Speed Steel Form Tool (Cobalt 8%)', grade: 'HSS-Co M42 Ground', notes: 'Forms outer step and 45° chamfer' },
      { station: 'Slide 2 (Vertical)', operation: 'Internal Threading G 1/2" BSPP', holder: 'Diehead Chaser Head 1/2"', insert_spec: 'Coventry Chaser 14 TPI BSPP', grade: 'HSS Coventry Set', notes: 'Verify with Thread Ring Gauge RG-G12-002' },
      { station: 'Slide 3 (Rear)', operation: 'Rear Slide Parting Off', holder: 'Traub Parting Tool Post', insert_spec: 'HSS Parting Blade 1.8mm', grade: 'HSS-Co Ground Blade', notes: 'Deburr corner before parting' }
    ]
  },
  {
    presetId: 'FORGING_PRESS_BILLET',
    name: 'Hot Brass Forging Press & Trimming Die',
    machineCategory: 'FORGING_PRESS',
    colletSpec: 'Split Gripper Jaw (Pneumatic)',
    controllerType: 'PLC Control',
    coolantType: 'AIR_BLAST',
    partingBladeWidthMm: 0,
    cycleTimeSeconds: 6.0,
    stations: [
      { station: 'Stage 1 (Heat)', operation: 'Induction Billet Heating 720°C', holder: 'Induction Coil Ø22mm', insert_spec: 'Infrared Pyrometer Sensor', grade: 'N/A', notes: 'Target temperature 700-740°C' },
      { station: 'Stage 2 (Forge)', operation: 'Closed Die Hot Forging', holder: 'Upper & Lower Die Bolster', insert_spec: 'H13 Hot Work Die Steel Tool', grade: 'H13 Nitrided 52 HRC', notes: 'Graphite water-based die lube' },
      { station: 'Stage 3 (Trim)', operation: 'Flash Trimming & Piercing', holder: 'Trimming Press Die Set', insert_spec: 'Punch & Die Set', grade: 'D2 Tool Steel 60 HRC', notes: 'Trim flash cleanly into scrap bin' }
    ]
  }
];

async function getRecipeList(pool, { factoryId, yearLabel, q = '', category = '', limit = 50, offset = 0 }) {
  const fid = Number(factoryId) || 1;
  const yl = yearLabel || '2026-27';
  const lim = Math.max(1, Math.min(100, Number(limit) || 50));
  const off = Math.max(0, Number(offset) || 0);

  const conditions = ['factory_id = $1'];
  const params = [fid];
  let pIdx = 2;

  if (category && category !== 'ALL') {
    conditions.push(`machine_category = $${pIdx++}`);
    params.push(category);
  }

  if (q && q.trim()) {
    conditions.push(`(recipe_code ILIKE $${pIdx} OR item_code ILIKE $${pIdx} OR item_name ILIKE $${pIdx} OR mach_name ILIKE $${pIdx} OR collet_spec ILIKE $${pIdx})`);
    params.push(`%${q.trim()}%`);
    pIdx++;
  }

  const whereSql = conditions.join(' AND ');
  const sql = `
    SELECT recipe_id, factory_id, year_label, recipe_code, item_code, item_name, drg_no,
           machine_category, mach_name, controller_type, collet_spec, bar_feeder_stop_mm,
           raw_material_grade, raw_bar_shape, raw_bar_size, cnc_program_no,
           cycle_time_seconds, setup_time_mins, spindle_rpm, cutting_feed, coolant_type,
           parting_blade_width_mm, traub_cam_profile, traub_gear_ratio,
           tooling_layout, qc_critical_dimensions, approved_by_setter,
           created_at, updated_at
    FROM machine_setup_recipes
    WHERE ${whereSql}
    ORDER BY recipe_id DESC
    LIMIT $${pIdx++} OFFSET $${pIdx++};
  `;
  params.push(lim, off);

  const res = await pool.query(sql, params);
  const rows = res.rows.map(r => {
    const metrics = computeCapacityMetrics(r.cycle_time_seconds);
    return {
      ...r,
      metrics
    };
  });

  return rows;
}

async function getRecipeById(pool, { factoryId, recipeId }) {
  const fid = Number(factoryId) || 1;
  const rid = Number(recipeId) || 0;

  const sql = `
    SELECT *
    FROM machine_setup_recipes
    WHERE factory_id = $1 AND recipe_id = $2
    LIMIT 1;
  `;
  const res = await pool.query(sql, [fid, rid]);
  if (res.rows.length === 0) return null;

  const row = res.rows[0];
  row.metrics = computeCapacityMetrics(row.cycle_time_seconds);
  return row;
}

async function saveRecipe(pool, { factoryId, yearLabel, recipeData }) {
  const fid = Number(factoryId) || 1;
  const yl = yearLabel || '2026-27';

  const recipeCode = (recipeData.recipe_code || '').trim();
  const itemCode = (recipeData.item_code || '').trim();
  const itemName = (recipeData.item_name || '').trim();
  const machineCategory = recipeData.machine_category || 'CNC_TURNING';
  const machName = (recipeData.mach_name || 'CNC-01').trim();
  const colletSpec = (recipeData.collet_spec || 'Round 16mm').trim();
  const cycleTimeSeconds = Math.max(0.1, Number(recipeData.cycle_time_seconds) || 14.0);

  if (!recipeCode) throw new Error('Recipe Code is required (e.g. RCP-B1-VALVE-01)');
  if (!itemCode) throw new Error('Item Code is required');
  if (!itemName) throw new Error('Item Name is required');

  const toolingLayout = Array.isArray(recipeData.tooling_layout)
    ? recipeData.tooling_layout
    : (typeof recipeData.tooling_layout === 'string' ? JSON.parse(recipeData.tooling_layout || '[]') : []);

  if (recipeData.recipe_id) {
    const rid = Number(recipeData.recipe_id);
    const sql = `
      UPDATE machine_setup_recipes
      SET recipe_code = $1, item_code = $2, item_name = $3, drg_no = $4,
          machine_category = $5, mach_name = $6, controller_type = $7,
          collet_spec = $8, bar_feeder_stop_mm = $9, raw_material_grade = $10,
          raw_bar_shape = $11, raw_bar_size = $12, cnc_program_no = $13,
          cycle_time_seconds = $14, setup_time_mins = $15, spindle_rpm = $16,
          cutting_feed = $17, coolant_type = $18, parting_blade_width_mm = $19,
          traub_cam_profile = $20, traub_gear_ratio = $21, tooling_layout = $22,
          qc_critical_dimensions = $23, approved_by_setter = $24,
          updated_at = CURRENT_TIMESTAMP
      WHERE factory_id = $25 AND recipe_id = $26
      RETURNING *;
    `;
    const params = [
      recipeCode, itemCode, itemName, recipeData.drg_no || '',
      machineCategory, machName, recipeData.controller_type || 'Fanuc 0i-TF',
      colletSpec, Number(recipeData.bar_feeder_stop_mm) || 38.5, recipeData.raw_material_grade || 'CW617N',
      recipeData.raw_bar_shape || 'HEX', recipeData.raw_bar_size || '19mm Hex', recipeData.cnc_program_no || 'O1042',
      cycleTimeSeconds, Number(recipeData.setup_time_mins) || 45, Number(recipeData.spindle_rpm) || 2800,
      Number(recipeData.cutting_feed) || 0.08, recipeData.coolant_type || 'SOLUBLE_OIL_5PCT',
      Number(recipeData.parting_blade_width_mm) || 2.0, recipeData.traub_cam_profile || '',
      recipeData.traub_gear_ratio || '', JSON.stringify(toolingLayout),
      recipeData.qc_critical_dimensions || '', recipeData.approved_by_setter || '',
      fid, rid
    ];
    const res = await pool.query(sql, params);
    const row = res.rows[0];
    row.metrics = computeCapacityMetrics(row.cycle_time_seconds);
    return row;
  } else {
    const sql = `
      INSERT INTO machine_setup_recipes (
        factory_id, year_label, recipe_code, item_code, item_name, drg_no,
        machine_category, mach_name, controller_type, collet_spec, bar_feeder_stop_mm,
        raw_material_grade, raw_bar_shape, raw_bar_size, cnc_program_no,
        cycle_time_seconds, setup_time_mins, spindle_rpm, cutting_feed, coolant_type,
        parting_blade_width_mm, traub_cam_profile, traub_gear_ratio, tooling_layout,
        qc_critical_dimensions, approved_by_setter
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
      RETURNING *;
    `;
    const params = [
      fid, yl, recipeCode, itemCode, itemName, recipeData.drg_no || '',
      machineCategory, machName, recipeData.controller_type || 'Fanuc 0i-TF',
      colletSpec, Number(recipeData.bar_feeder_stop_mm) || 38.5, recipeData.raw_material_grade || 'CW617N',
      recipeData.raw_bar_shape || 'HEX', recipeData.raw_bar_size || '19mm Hex', recipeData.cnc_program_no || 'O1042',
      cycleTimeSeconds, Number(recipeData.setup_time_mins) || 45, Number(recipeData.spindle_rpm) || 2800,
      Number(recipeData.cutting_feed) || 0.08, recipeData.coolant_type || 'SOLUBLE_OIL_5PCT',
      Number(recipeData.parting_blade_width_mm) || 2.0, recipeData.traub_cam_profile || '',
      recipeData.traub_gear_ratio || '', JSON.stringify(toolingLayout),
      recipeData.qc_critical_dimensions || '', recipeData.approved_by_setter || ''
    ];
    const res = await pool.query(sql, params);
    const row = res.rows[0];
    row.metrics = computeCapacityMetrics(row.cycle_time_seconds);
    return row;
  }
}

async function deleteRecipe(pool, { factoryId, recipeId }) {
  const fid = Number(factoryId) || 1;
  const rid = Number(recipeId) || 0;
  await pool.query('DELETE FROM machine_setup_recipes WHERE factory_id = $1 AND recipe_id = $2', [fid, rid]);
  return { success: true };
}

async function generateSetupSheetHtml(recipe, company) {
  const compName = (company && (company.comp_name || company.name)) || 'BHARANI BRASS INDUSTRIES';
  const compAddr = (company && (company.address || company.addr)) || 'Shed No. C, 2-95, Shankar Tekri, Udyognagar, Jamnagar - 361004 Gujarat';
  const metrics = computeCapacityMetrics(recipe.cycle_time_seconds);

  const qrDataUrl = await QRCode.toDataURL(
    `TAMBA-SETUP:${recipe.recipe_code || ''}|PART:${recipe.item_code || ''}|REV:${recipe.drg_no || 'REV-01'}|MACH:${recipe.mach_name || ''}`,
    { width: 110, margin: 1 }
  );

  const stations = Array.isArray(recipe.tooling_layout)
    ? recipe.tooling_layout
    : (typeof recipe.tooling_layout === 'string' ? JSON.parse(recipe.tooling_layout || '[]') : []);

  const stationRows = stations.map((st, idx) => `
    <tr style="border-bottom: 1px solid #cbd5e1; font-size: 11px;">
      <td style="padding: 7px 8px; font-weight: 900; font-family: monospace; color: #0f172a; text-align: center; background: #f8fafc;">${st.station || `T0${idx + 1}`}</td>
      <td style="padding: 7px 8px; font-weight: bold; color: #0f172a;">${st.operation || '-'}</td>
      <td style="padding: 7px 8px; font-family: monospace;">${st.holder || '-'}</td>
      <td style="padding: 7px 8px; font-family: monospace; font-weight: bold; color: #0369a1;">${st.insert_spec || '-'}</td>
      <td style="padding: 7px 8px; font-size: 10.5px; color: #475569;">${st.grade || '-'}</td>
      <td style="padding: 7px 8px; font-size: 10.5px; color: #64748b;">${st.notes || '-'}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Machine Setup Recipe Sheet - ${recipe.recipe_code}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 11.5px; }
    .sheet-box { border: 2px solid #0f172a; border-radius: 4px; padding: 14px 18px; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .meta-table td { padding: 4px 6px; border: 1px solid #cbd5e1; font-size: 11px; }
    .meta-label { background: #f1f5f9; font-weight: bold; color: #334155; width: 18%; }
    .meta-val { font-family: monospace; font-weight: bold; color: #0f172a; width: 32%; }
    .section-title { background: #0f766e; color: #fff; font-size: 11.5px; font-weight: bold; padding: 5px 10px; margin: 12px 0 6px 0; border-radius: 2px; }
    .tooling-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .tooling-table th { background: #e2e8f0; font-size: 10.5px; font-weight: 800; padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; }
    .tooling-table td { border: 1px solid #cbd5e1; }
    .bench-card { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 4px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .signoff-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    .signoff-table td { border: 1px solid #cbd5e1; padding: 10px 8px; height: 42px; vertical-align: top; width: 33.3%; font-size: 10.5px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet-box">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 75%;">
          <div style="font-size: 18px; font-weight: 900; letter-spacing: 0.5px; color: #0f172a;">${compName}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${compAddr}</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f766e; margin-top: 6px;">
            TOOLING &amp; MACHINE SETUP RECIPE SHEET &bull; REPEAT ORDER MASTER
          </div>
        </td>
        <td style="width: 25%; text-align: right;">
          <img src="${qrDataUrl}" alt="Recipe QR" style="width: 85px; height: 85px; display: inline-block;">
        </td>
      </tr>
    </table>

    <!-- Part & Machine Parameters Grid -->
    <table class="meta-table">
      <tr>
        <td class="meta-label">Recipe Code:</td>
        <td class="meta-val" style="color: #0f766e; font-size: 12px;">${recipe.recipe_code}</td>
        <td class="meta-label">Machine Category:</td>
        <td class="meta-val">${recipe.machine_category.replace('_', ' ')}</td>
      </tr>
      <tr>
        <td class="meta-label">Component Name:</td>
        <td class="meta-val">${recipe.item_name}</td>
        <td class="meta-label">Machine ID / Model:</td>
        <td class="meta-val">${recipe.mach_name}</td>
      </tr>
      <tr>
        <td class="meta-label">Part / Item Code:</td>
        <td class="meta-val">${recipe.item_code}</td>
        <td class="meta-label">CNC Controller:</td>
        <td class="meta-val">${recipe.controller_type || 'Fanuc 0i-TF'}</td>
      </tr>
      <tr>
        <td class="meta-label">Drawing Rev #:</td>
        <td class="meta-val">${recipe.drg_no || 'REV-01'}</td>
        <td class="meta-label">CNC Program #:</td>
        <td class="meta-val" style="color: #6d28d9;">${recipe.cnc_program_no || 'O1042'}</td>
      </tr>
      <tr>
        <td class="meta-label">Raw Material Grade:</td>
        <td class="meta-val">${recipe.raw_material_grade}</td>
        <td class="meta-label">Collet / Holding Spec:</td>
        <td class="meta-val" style="color: #b45309;">${recipe.collet_spec}</td>
      </tr>
      <tr>
        <td class="meta-label">Bar Profile &amp; Size:</td>
        <td class="meta-val">${recipe.raw_bar_shape} &bull; ${recipe.raw_bar_size}</td>
        <td class="meta-label">Bar Feeder Stopper:</td>
        <td class="meta-val">${recipe.bar_feeder_stop_mm} mm</td>
      </tr>
      <tr>
        <td class="meta-label">Coolant Type:</td>
        <td class="meta-val">${recipe.coolant_type.replace(/_/g, ' ')}</td>
        <td class="meta-label">Parting Blade Width:</td>
        <td class="meta-val">${recipe.parting_blade_width_mm} mm (Kerf Loss)</td>
      </tr>
      ${recipe.machine_category === 'TRAUB_AUTOMAT' ? `
      <tr>
        <td class="meta-label">Traub Cam Profile:</td>
        <td class="meta-val">${recipe.traub_cam_profile || '-'}</td>
        <td class="meta-label">Traub Gear Ratio:</td>
        <td class="meta-val">${recipe.traub_gear_ratio || '-'}</td>
      </tr>
      ` : ''}
    </table>

    <!-- Production Capacity Benchmark Card -->
    <div class="bench-card">
      <div>
        <span style="font-weight: 800; font-size: 11px; color: #166534;">PRODUCTION BENCHMARK (90% OEE):</span>
      </div>
      <div style="font-family: monospace; font-size: 12px; font-weight: 900; color: #15803d;">
        Cycle Time: <span>${recipe.cycle_time_seconds}s</span> &bull; 
        Gross: <span>${metrics.grossPerHour} pcs/hr</span> &bull; 
        8-Hr Shift: <span>${metrics.shiftTarget.toLocaleString()} pcs</span> &bull; 
        Daily (24h): <span>${metrics.dailyTarget.toLocaleString()} pcs</span>
      </div>
    </div>

    <!-- Tooling Station Layout Table -->
    <div class="section-title">TOOLING STATION &amp; INSERT SPECIFICATIONS LAYOUT</div>
    <table class="tooling-table">
      <thead>
        <tr>
          <th style="width: 10%; text-align: center;">Station</th>
          <th style="width: 20%;">Operation Description</th>
          <th style="width: 18%;">Tool Holder / Bar</th>
          <th style="width: 20%;">Insert / Tool Specification</th>
          <th style="width: 16%;">Carbide Grade / Coat</th>
          <th style="width: 16%;">Machining / Cutting Notes</th>
        </tr>
      </thead>
      <tbody>
        ${stationRows}
      </tbody>
    </table>

    <!-- Quality & Metrology Critical Inspection Checkpoints -->
    <div class="section-title" style="background: #334155;">QUALITY &amp; CRITICAL METROLOGY CHECKPOINTS (SHOPFLOOR FIRST-PIECE APPROVAL)</div>
    <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 12px; font-size: 11px; background: #f8fafc; margin-bottom: 12px;">
      <div style="font-weight: bold; color: #0f172a; margin-bottom: 3px;">Mandatory Dimensions &amp; Thread Gauge Verifications:</div>
      <div style="color: #334155; line-height: 1.4;">${recipe.qc_critical_dimensions || 'All critical dimensions per drawing revision. Verify threads with calibrated Go/No-Go plug and ring gauges.'}</div>
    </div>

    <!-- Signoffs -->
    <table class="signoff-table">
      <tr>
        <td>
          <div style="font-weight: bold; color: #475569;">Tool Room Setter Approval:</div>
          <div style="margin-top: 18px; font-weight: bold; color: #0f172a;">${recipe.approved_by_setter || 'Tool Room Master Setter'}</div>
        </td>
        <td>
          <div style="font-weight: bold; color: #475569;">Machine Operator / Machinist:</div>
          <div style="margin-top: 18px; color: #94a3b8;">Signature: _______________________</div>
        </td>
        <td>
          <div style="font-weight: bold; color: #475569;">Quality Inspector First-Piece Signoff:</div>
          <div style="margin-top: 18px; color: #94a3b8;">Signature: _______________________</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
}

module.exports = {
  computeCapacityMetrics,
  TOOLING_PRESETS,
  getRecipeList,
  getRecipeById,
  saveRecipe,
  deleteRecipe,
  generateSetupSheetHtml
};
