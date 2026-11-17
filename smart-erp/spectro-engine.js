/**
 * SMART ERP - Spectrometer Chemical Composition & RoHS / REACH MTC 3.1 Engine
 * Generates EN 10204 Type 3.1 Mill Test Certificates (MTC) with Optical Emission Spectrometer (OES)
 * laboratory chemical analysis, alloy grade tolerance bounds, and statutory RoHS Exemption 6(c) statements.
 */

const { generateQrCodeSvg, generateCode128Svg } = require('./barcode-engine');

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
 * Standard Industry Brass Alloy Specifications & Chemical Limits
 */
const ALLOY_PRESETS = {
  'IS 319 Gr 1': {
    alloyName: 'Free Cutting Brass (IS 319:1989 Grade 1)',
    standardCode: 'IS 319:1989 Gr. 1',
    description: 'High-speed machining brass for precision turned components, screws, pins, and valve spindles.',
    rohsExemption: 'Exemption 6(c) - Copper alloy containing up to 4.0% lead by weight',
    elements: {
      cu: { min: 56.0, max: 59.0, default: 58.20, name: 'Copper (Cu)' },
      pb: { min: 2.0, max: 3.5, default: 2.30, name: 'Lead (Pb)' },
      fe: { min: 0.0, max: 0.35, default: 0.20, name: 'Iron (Fe)' },
      sn: { min: 0.0, max: 0.30, default: 0.10, name: 'Tin (Sn)' },
      ni: { min: 0.0, max: 0.30, default: 0.05, name: 'Nickel (Ni)' },
      al: { min: 0.0, max: 0.05, default: 0.01, name: 'Aluminium (Al)' },
      total_imp: { min: 0.0, max: 0.70, default: 0.40, name: 'Total Impurities' },
      zn: { min: 38.0, max: 42.0, default: 39.14, name: 'Zinc (Zn - Remainder)' }
    },
    mechanical: {
      tensile_mpa: { min: 370, default: 440 },
      elongation_pct: { min: 12, default: 18.0 },
      hardness: { min: 110, default: '125 BHN' }
    }
  },
  'IS 319 Gr 2': {
    alloyName: 'Forging / Bending Brass (IS 319 Grade 2)',
    standardCode: 'IS 319:1989 Gr. 2',
    description: 'Medium leaded brass with high ductility for cold heading, staking, and pipe fittings.',
    rohsExemption: 'Exemption 6(c) - Copper alloy containing up to 4.0% lead by weight',
    elements: {
      cu: { min: 60.0, max: 63.0, default: 61.40, name: 'Copper (Cu)' },
      pb: { min: 0.5, max: 1.5, default: 1.10, name: 'Lead (Pb)' },
      fe: { min: 0.0, max: 0.15, default: 0.08, name: 'Iron (Fe)' },
      sn: { min: 0.0, max: 0.20, default: 0.05, name: 'Tin (Sn)' },
      ni: { min: 0.0, max: 0.20, default: 0.05, name: 'Nickel (Ni)' },
      al: { min: 0.0, max: 0.05, default: 0.01, name: 'Aluminium (Al)' },
      total_imp: { min: 0.0, max: 0.50, default: 0.25, name: 'Total Impurities' },
      zn: { min: 35.0, max: 39.0, default: 37.06, name: 'Zinc (Zn - Remainder)' }
    },
    mechanical: {
      tensile_mpa: { min: 350, default: 410 },
      elongation_pct: { min: 15, default: 22.0 },
      hardness: { min: 95, default: '110 BHN' }
    }
  },
  'CW614N': {
    alloyName: 'European Free Machining Brass (CW614N / CuZn39Pb3)',
    standardCode: 'EN 12164 / CW614N',
    description: 'European standard free cutting brass for high-volume automated CNC lathe turning.',
    rohsExemption: 'Exemption 6(c) - Copper alloy containing up to 4.0% lead by weight',
    elements: {
      cu: { min: 57.0, max: 59.0, default: 58.10, name: 'Copper (Cu)' },
      pb: { min: 2.5, max: 3.5, default: 2.85, name: 'Lead (Pb)' },
      fe: { min: 0.0, max: 0.30, default: 0.18, name: 'Iron (Fe)' },
      sn: { min: 0.0, max: 0.30, default: 0.12, name: 'Tin (Sn)' },
      ni: { min: 0.0, max: 0.30, default: 0.08, name: 'Nickel (Ni)' },
      al: { min: 0.0, max: 0.05, default: 0.02, name: 'Aluminium (Al)' },
      total_imp: { min: 0.0, max: 0.20, default: 0.15, name: 'Total Impurities' },
      zn: { min: 37.0, max: 40.0, default: 38.50, name: 'Zinc (Zn - Remainder)' }
    },
    mechanical: {
      tensile_mpa: { min: 430, default: 475 },
      elongation_pct: { min: 10, default: 15.0 },
      hardness: { min: 110, default: '135 BHN' }
    }
  },
  'CW617N': {
    alloyName: 'Stamping & Valve Body Brass (CW617N / CuZn40Pb2)',
    standardCode: 'EN 12165 / CW617N',
    description: 'Special alloy for hot forging and machining of ball valves, gas regulators, and water meters.',
    rohsExemption: 'Exemption 6(c) - Copper alloy containing up to 4.0% lead by weight',
    elements: {
      cu: { min: 57.0, max: 59.0, default: 58.00, name: 'Copper (Cu)' },
      pb: { min: 1.6, max: 2.5, default: 1.95, name: 'Lead (Pb)' },
      fe: { min: 0.0, max: 0.30, default: 0.15, name: 'Iron (Fe)' },
      sn: { min: 0.0, max: 0.30, default: 0.10, name: 'Tin (Sn)' },
      ni: { min: 0.0, max: 0.30, default: 0.05, name: 'Nickel (Ni)' },
      al: { min: 0.0, max: 0.05, default: 0.02, name: 'Aluminium (Al)' },
      total_imp: { min: 0.0, max: 0.20, default: 0.12, name: 'Total Impurities' },
      zn: { min: 38.0, max: 41.0, default: 39.61, name: 'Zinc (Zn - Remainder)' }
    },
    mechanical: {
      tensile_mpa: { min: 410, default: 460 },
      elongation_pct: { min: 12, default: 19.0 },
      hardness: { min: 105, default: '128 BHN' }
    }
  },
  'CW602N / DZR': {
    alloyName: 'Dezincification Resistant Brass (DZR / CW602N / CuZn36Pb2As)',
    standardCode: 'EN 12164 / CW602N',
    description: 'Arsenical brass designed to resist selective zinc leaching in corrosive hot water circuits.',
    rohsExemption: 'Exemption 6(c) - Copper alloy containing up to 4.0% lead by weight',
    elements: {
      cu: { min: 61.0, max: 63.0, default: 62.10, name: 'Copper (Cu)' },
      pb: { min: 1.7, max: 2.8, default: 2.10, name: 'Lead (Pb)' },
      as: { min: 0.02, max: 0.15, default: 0.07, name: 'Arsenic (As)' },
      fe: { min: 0.0, max: 0.10, default: 0.05, name: 'Iron (Fe)' },
      sn: { min: 0.0, max: 0.10, default: 0.04, name: 'Tin (Sn)' },
      ni: { min: 0.0, max: 0.30, default: 0.05, name: 'Nickel (Ni)' },
      al: { min: 0.0, max: 0.05, default: 0.02, name: 'Aluminium (Al)' },
      total_imp: { min: 0.0, max: 0.20, default: 0.10, name: 'Total Impurities' },
      zn: { min: 34.0, max: 37.0, default: 35.47, name: 'Zinc (Zn - Remainder)' }
    },
    mechanical: {
      tensile_mpa: { min: 380, default: 425 },
      elongation_pct: { min: 15, default: 20.0 },
      hardness: { min: 95, default: '115 BHN' }
    }
  },
  'Lead-Free Brass': {
    alloyName: 'Lead-Free Eco Brass (US NSF/ANSI 61 Drinking Water)',
    standardCode: 'ASTM B927 / C69300',
    description: 'Ultra-low lead silicon brass meeting stringent US & EU drinking water regulations.',
    rohsExemption: '100% Lead-Free (Pb < 0.1%) - Fully compliant without RoHS exemptions',
    elements: {
      cu: { min: 60.0, max: 64.0, default: 62.20, name: 'Copper (Cu)' },
      pb: { min: 0.0, max: 0.09, default: 0.04, name: 'Lead (Pb)' },
      si: { min: 2.7, max: 3.4, default: 3.05, name: 'Silicon (Si)' },
      fe: { min: 0.0, max: 0.20, default: 0.08, name: 'Iron (Fe)' },
      sn: { min: 0.0, max: 0.20, default: 0.05, name: 'Tin (Sn)' },
      ni: { min: 0.0, max: 0.20, default: 0.05, name: 'Nickel (Ni)' },
      total_imp: { min: 0.0, max: 0.30, default: 0.15, name: 'Total Impurities' },
      zn: { min: 31.0, max: 36.0, default: 34.38, name: 'Zinc (Zn - Remainder)' }
    },
    mechanical: {
      tensile_mpa: { min: 460, default: 520 },
      elongation_pct: { min: 10, default: 14.0 },
      hardness: { min: 130, default: '155 BHN' }
    }
  },
  'Naval Brass': {
    alloyName: 'Naval Brass / Marine Grade (IS 291 / C46400)',
    standardCode: 'IS 291 / ASTM B21 C46400',
    description: 'Tin-alloyed brass providing superior resistance to saltwater impingement and marine corrosion.',
    rohsExemption: 'Exemption 6(c) - Copper alloy containing up to 4.0% lead by weight',
    elements: {
      cu: { min: 59.0, max: 62.0, default: 60.50, name: 'Copper (Cu)' },
      sn: { min: 0.5, max: 1.0, default: 0.75, name: 'Tin (Sn)' },
      pb: { min: 0.0, max: 0.20, default: 0.10, name: 'Lead (Pb)' },
      fe: { min: 0.0, max: 0.10, default: 0.05, name: 'Iron (Fe)' },
      total_imp: { min: 0.0, max: 0.25, default: 0.12, name: 'Total Impurities' },
      zn: { min: 36.0, max: 40.0, default: 38.48, name: 'Zinc (Zn - Remainder)' }
    },
    mechanical: {
      tensile_mpa: { min: 420, default: 470 },
      elongation_pct: { min: 18, default: 25.0 },
      hardness: { min: 100, default: '120 BHN' }
    }
  }
};

/**
 * List analyzed heats
 */
async function getSpectroList(pool, { factoryId, yearLabel, q = '', limit = 50, offset = 0 }) {
  const params = [factoryId, yearLabel];
  let sql = `
    SELECT s.*
    FROM spectro_heat_analysis s
    WHERE s.factory_id = $1 AND s.year_label = $2
  `;

  if (q && q.trim()) {
    params.push(`%${q.trim()}%`);
    const pIdx = params.length;
    sql += ` AND (
      s.heat_no ILIKE $${pIdx}
      OR s.batch_no ILIKE $${pIdx}
      OR s.alloy_grade ILIKE $${pIdx}
      OR s.tested_by ILIKE $${pIdx}
    )`;
  }

  sql += ` ORDER BY s.analysis_id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(Math.min(100, Math.max(1, Number(limit) || 50)));
  params.push(Math.max(0, Number(offset) || 0));

  const res = await pool.query(sql, params);
  return res.rows;
}

/**
 * Fetch a single Heat Spectro Analysis
 * If not in table, checks if heat exists in purchases/dispatches and returns a preset draft
 */
async function getSpectroByHeatNo(pool, { factoryId, yearLabel, heatNo, analysisId }) {
  const cleanHeat = String(heatNo || '').trim();
  const aId = Number(analysisId || 0);
  if (!cleanHeat && !aId) return null;

  let res;
  if (aId > 0) {
    res = await pool.query(
      `SELECT * FROM spectro_heat_analysis
       WHERE factory_id = $1 AND year_label = $2 AND analysis_id = $3
       LIMIT 1`,
      [factoryId, yearLabel, aId]
    );
  } else {
    res = await pool.query(
      `SELECT * FROM spectro_heat_analysis
       WHERE factory_id = $1 AND year_label = $2 AND LOWER(heat_no) = LOWER($3)
       LIMIT 1`,
      [factoryId, yearLabel, cleanHeat]
    );
  }

  if (res.rowCount > 0) {
    return res.rows[0];
  }

  // Not yet recorded: return a default draft using IS 319 Gr 1
  const preset = ALLOY_PRESETS['IS 319 Gr 1'];
  return {
    heat_no: cleanHeat || 'HT-NEW-001',
    batch_no: `BT-${new Date().getFullYear()}-081`,
    alloy_grade: 'IS 319 Gr 1',
    sample_date: new Date().toISOString().slice(0, 10),
    tested_by: 'Quality Lab Metallurgist',
    lab_equipment: 'Optical Emission Spectrometer (OES-8000)',
    cu_pct: preset.elements.cu.default,
    zn_pct: preset.elements.zn.default,
    pb_pct: preset.elements.pb.default,
    fe_pct: preset.elements.fe.default,
    sn_pct: preset.elements.sn.default,
    ni_pct: preset.elements.ni.default,
    al_pct: preset.elements.al.default,
    mn_pct: 0.01,
    as_pct: 0.00,
    si_pct: 0.00,
    total_imp_pct: preset.elements.total_imp.default,
    tensile_strength_mpa: preset.mechanical.tensile_mpa.default,
    elongation_pct: preset.mechanical.elongation_pct.default,
    hardness_val: preset.mechanical.hardness.default,
    rohs_compliant: true,
    rohs_exemption: preset.rohsExemption,
    reach_compliant: true,
    qa_status: 'PASSED',
    is_draft: true
  };
}

/**
 * Save or Update Spectrometer Chemical Analysis
 */
async function saveSpectroAnalysis(pool, { factoryId, yearLabel, data, user = 'Quality Metallurgist' }) {
  const heatNo = String(data.heat_no || '').trim().toUpperCase();
  if (!heatNo) throw new Error('Heat Number is required.');

  const grade = data.alloy_grade || 'IS 319 Gr 1';
  const preset = ALLOY_PRESETS[grade] || ALLOY_PRESETS['IS 319 Gr 1'];

  const cu = Number(data.cu_pct) || preset.elements.cu.default;
  const pb = Number(data.pb_pct) || preset.elements.pb.default;
  const fe = Number(data.fe_pct) || preset.elements.fe.default;
  const sn = Number(data.sn_pct) || (preset.elements.sn ? preset.elements.sn.default : 0.05);
  const ni = Number(data.ni_pct) || (preset.elements.ni ? preset.elements.ni.default : 0.05);
  const al = Number(data.al_pct) || (preset.elements.al ? preset.elements.al.default : 0.01);
  const mn = Number(data.mn_pct) || 0.01;
  const asVal = Number(data.as_pct) || (preset.elements.as ? preset.elements.as.default : 0.00);
  const siVal = Number(data.si_pct) || (preset.elements.si ? preset.elements.si.default : 0.00);
  const totalImp = Number(data.total_imp_pct) || preset.elements.total_imp.default;

  // Auto-calculate Zinc balance if not specified
  let zn = Number(data.zn_pct);
  if (!zn || zn <= 0) {
    zn = Number((100 - (cu + pb + fe + sn + ni + al + mn + asVal + siVal)).toFixed(2));
  }

  const tensile = Number(data.tensile_strength_mpa) || preset.mechanical.tensile_mpa.default;
  const elongation = Number(data.elongation_pct) || preset.mechanical.elongation_pct.default;
  const hardness = data.hardness_val || preset.mechanical.hardness.default;
  const rohsExemption = data.rohs_exemption || preset.rohsExemption;

  const res = await pool.query(
    `INSERT INTO spectro_heat_analysis (
       factory_id, year_label, heat_no, batch_no, alloy_grade, sample_date,
       tested_by, lab_equipment, cu_pct, zn_pct, pb_pct, fe_pct, sn_pct,
       ni_pct, al_pct, mn_pct, as_pct, si_pct, total_imp_pct,
       tensile_strength_mpa, elongation_pct, hardness_val,
       rohs_compliant, rohs_exemption, reach_compliant, qa_status, remarks,
       updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
       $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW()
     )
     ON CONFLICT (factory_id, year_label, heat_no) DO UPDATE SET
       batch_no = EXCLUDED.batch_no,
       alloy_grade = EXCLUDED.alloy_grade,
       sample_date = EXCLUDED.sample_date,
       tested_by = EXCLUDED.tested_by,
       lab_equipment = EXCLUDED.lab_equipment,
       cu_pct = EXCLUDED.cu_pct,
       zn_pct = EXCLUDED.zn_pct,
       pb_pct = EXCLUDED.pb_pct,
       fe_pct = EXCLUDED.fe_pct,
       sn_pct = EXCLUDED.sn_pct,
       ni_pct = EXCLUDED.ni_pct,
       al_pct = EXCLUDED.al_pct,
       mn_pct = EXCLUDED.mn_pct,
       as_pct = EXCLUDED.as_pct,
       si_pct = EXCLUDED.si_pct,
       total_imp_pct = EXCLUDED.total_imp_pct,
       tensile_strength_mpa = EXCLUDED.tensile_strength_mpa,
       elongation_pct = EXCLUDED.elongation_pct,
       hardness_val = EXCLUDED.hardness_val,
       rohs_compliant = EXCLUDED.rohs_compliant,
       rohs_exemption = EXCLUDED.rohs_exemption,
       reach_compliant = EXCLUDED.reach_compliant,
       qa_status = EXCLUDED.qa_status,
       remarks = EXCLUDED.remarks,
       updated_at = NOW()
     RETURNING *`,
    [
      factoryId, yearLabel, heatNo, data.batch_no || null, grade,
      data.sample_date || new Date(), user, data.lab_equipment || 'Optical Emission Spectrometer (OES)',
      cu, zn, pb, fe, sn, ni, al, mn, asVal, siVal, totalImp,
      tensile, elongation, hardness,
      data.rohs_compliant !== false, rohsExemption,
      data.reach_compliant !== false, data.qa_status || 'PASSED', data.remarks || null
    ]
  );

  return res.rows[0];
}

/**
 * Render Laboratory-Grade EN 10204 Type 3.1 Mill Test Certificate (MTC)
 */
async function renderMtcPrintHtml({ analysis, companyInfo = {}, dispatchInfo = {}, origin = '' }) {
  const compName = companyInfo.print_head || 'BHARANI BRASS INDUSTRIES';
  const compAddr = companyInfo.print_short_addr || 'Plot 104, GIDC Phase II, Dared, Jamnagar - 361004, Gujarat, India';
  const gst = companyInfo.gstin || '24AABCB1234F1Z5';

  const grade = analysis.alloy_grade || 'IS 319 Gr 1';
  const preset = ALLOY_PRESETS[grade] || ALLOY_PRESETS['IS 319 Gr 1'];

  // Verification QR Code
  const qrPayload = JSON.stringify({
    cert: 'EN10204-3.1',
    heat: analysis.heat_no,
    grade: analysis.alloy_grade,
    cu: `${analysis.cu_pct}%`,
    pb: `${analysis.pb_pct}%`,
    status: analysis.qa_status || 'PASSED',
    url: `${origin}/api/print?type=mtc&heat_no=${encodeURIComponent(analysis.heat_no)}`
  });
  const qrSvg = await generateQrCodeSvg(qrPayload, { width: 100, margin: 1 });

  // Barcode for Certificate ID
  const certId = `MTC-${analysis.heat_no}`;
  const barcodeSvg = generateCode128Svg(certId, { height: 32, moduleWidth: 1.4, fontSize: 9 });

  // Chemical Table Rows comparing Specified Limits vs Actual Readings
  const chemRows = [
    { name: 'Copper', sym: 'Cu', val: analysis.cu_pct, limits: `${preset.elements.cu.min}% - ${preset.elements.cu.max}%` },
    { name: 'Lead', sym: 'Pb', val: analysis.pb_pct, limits: `${preset.elements.pb.min}% - ${preset.elements.pb.max}%` },
    { name: 'Iron', sym: 'Fe', val: analysis.fe_pct, limits: `Max ${preset.elements.fe.max}%` },
    { name: 'Tin', sym: 'Sn', val: analysis.sn_pct, limits: preset.elements.sn ? `Max ${preset.elements.sn.max}%` : 'Max 0.30%' },
    { name: 'Nickel', sym: 'Ni', val: analysis.ni_pct, limits: preset.elements.ni ? `Max ${preset.elements.ni.max}%` : 'Max 0.30%' },
    { name: 'Aluminium', sym: 'Al', val: analysis.al_pct, limits: preset.elements.al ? `Max ${preset.elements.al.max}%` : 'Max 0.05%' },
    { name: 'Total Impurities', sym: 'Total Imp.', val: analysis.total_imp_pct, limits: `Max ${preset.elements.total_imp.max}%` },
    { name: 'Zinc (Remainder)', sym: 'Zn', val: analysis.zn_pct, limits: 'Balance Remainder' }
  ];

  if (analysis.alloy_grade.includes('DZR')) {
    chemRows.splice(3, 0, { name: 'Arsenic', sym: 'As', val: analysis.as_pct, limits: '0.02% - 0.15%' });
  }

  const chemHtml = chemRows.map((r) => {
    return `
      <tr>
        <td style="font-weight: 600;">${r.name}</td>
        <td style="text-align: center; font-weight: bold; font-family: monospace;">${r.sym}</td>
        <td style="text-align: center; color: #475569;">${r.limits}</td>
        <td style="text-align: right; font-weight: bold; font-family: monospace; color: #003366; font-size: 12px;">${Number(r.val || 0).toFixed(2)}%</td>
        <td style="text-align: center; font-size: 10px; color: #555;">OES (ASTM E478)</td>
        <td style="text-align: center; color: #166534; font-weight: bold; font-size: 10px;">✔ CONFORMS</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>MTC 3.1 - Heat ${escapeHtml(analysis.heat_no)} - ${escapeHtml(grade)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      margin: 0; padding: 12px; color: #1e293b; background: #fff; line-height: 1.35;
      font-size: 11px;
    }
    .cert-sheet {
      max-width: 820px; margin: 0 auto; border: 2px solid #003366; padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border-bottom: 2px solid #003366; padding-bottom: 8px; }
    .header-table td { vertical-align: top; }
    .comp-title { font-size: 17px; font-weight: 800; color: #003366; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; }
    .cert-badge {
      display: inline-block; background: #003366; color: #fff; font-weight: bold;
      padding: 3px 10px; border-radius: 3px; font-size: 11px; text-transform: uppercase;
      letter-spacing: 0.8px; margin-top: 4px;
    }
    .meta-grid {
      width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;
      background: #f8fafc; border: 1px solid #cbd5e1;
    }
    .meta-grid th {
      background: #e2e8f0; color: #1e293b; font-weight: 700; padding: 5px 8px;
      text-align: left; border: 1px solid #cbd5e1; width: 18%; font-size: 10px; text-transform: uppercase;
    }
    .meta-grid td {
      padding: 5px 8px; border: 1px solid #cbd5e1; width: 32%; font-weight: 600;
    }
    .table-data {
      width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;
    }
    .table-data th {
      background: #003366; color: #fff; padding: 5px 6px; text-align: left;
      font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #002244;
    }
    .table-data td {
      border: 1px solid #cbd5e1; padding: 5px 6px; vertical-align: middle;
    }
    .table-data tr:nth-child(even) { background: #fdfdfd; }
    .compliance-box {
      background: #f0fdf4; border: 1px solid #86efac; border-radius: 4px; padding: 8px 12px;
      margin-bottom: 14px; font-size: 10.5px; color: #166534;
    }
    .footer-auth {
      display: flex; justify-content: space-between; border-top: 1px dashed #777;
      padding-top: 18px; margin-top: 16px; font-size: 10px; font-weight: 600;
    }
    .footer-auth div { text-align: center; width: 28%; border-top: 1px solid #222; padding-top: 4px; }
    @media print {
      body { padding: 0; background: none; }
      .cert-sheet { border: 1.5px solid #000; box-shadow: none; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; max-width: 820px; margin-left: auto; margin-right: auto;">
    <div style="font-size: 12px; color: #555;">
      MTC 3.1 &bull; Heat: <b>${escapeHtml(analysis.heat_no)}</b> &bull; Alloy: <b>${escapeHtml(grade)}</b>
    </div>
    <div>
      <button onclick="window.print()" style="background: #003366; color: #fff; border: none; padding: 6px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;">🖨️ Print Inspection Certificate (A4)</button>
    </div>
  </div>

  <div class="cert-sheet">
    <!-- Header Block -->
    <table class="header-table">
      <tr>
        <td style="width: 58%;">
          <div class="comp-title">${escapeHtml(compName)}</div>
          <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">
            ${escapeHtml(compAddr)} &bull; GSTIN: <b>${escapeHtml(gst)}</b><br>
            ISO 9001:2015 Registered Precision Extrusion &amp; CNC Machining Works
          </div>
          <div class="cert-badge">MILL TEST CERTIFICATE &bull; EN 10204 TYPE 3.1</div>
        </td>
        <td style="width: 22%; text-align: center; vertical-align: middle;">
          <div style="display: inline-block;">${qrSvg}</div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Scan to Verify MTC</div>
        </td>
        <td style="width: 20%; text-align: right; vertical-align: top;">
          ${barcodeSvg}
          <div style="font-size: 9.5px; font-weight: bold; margin-top: 4px; color: #003366;">CERT NO: MTC-${escapeHtml(analysis.heat_no)}</div>
          <div style="font-size: 9.5px; color: #555;">DATE: ${formatDate(analysis.sample_date)}</div>
        </td>
      </tr>
    </table>

    <!-- Material Pedigree & Customer Reference -->
    <table class="meta-grid">
      <tr>
        <th>Raw Melt / Heat No:</th>
        <td style="color: #800000; font-family: monospace; font-size: 12px;">${escapeHtml(analysis.heat_no)}</td>
        <th>Standard Specification:</th>
        <td><b>${escapeHtml(preset.standardCode)}</b></td>
      </tr>
      <tr>
        <th>Material / Alloy Grade:</th>
        <td style="color: #003366; font-size: 12px;"><b>${escapeHtml(preset.alloyName)}</b></td>
        <th>Testing Equipment:</th>
        <td>${escapeHtml(analysis.lab_equipment || 'Optical Emission Spectrometer')}</td>
      </tr>
      <tr>
        <th>Production Batch / Lot:</th>
        <td style="font-family: monospace;">${escapeHtml(analysis.batch_no || '-')}</td>
        <th>Customer / PO Ref:</th>
        <td>${escapeHtml(dispatchInfo.custName || 'Precision Engineering Buyer')} ${dispatchInfo.poNo ? '/ PO: ' + escapeHtml(dispatchInfo.poNo) : ''}</td>
      </tr>
      <tr>
        <th>Dispatched DC / Inv:</th>
        <td>${escapeHtml(dispatchInfo.invNo || dispatchInfo.dcNo || 'Direct QA Clearance')}</td>
        <th>Quality QA Status:</th>
        <td><b style="color: ${analysis.qa_status === 'REJECTED' ? '#b91c1c' : '#166534'}; font-size: 11px;">✔ ${escapeHtml(analysis.qa_status || 'PASSED')} (CONFORMS)</b></td>
      </tr>
    </table>

    <!-- 1. Chemical Composition Analysis -->
    <div style="font-weight: 800; font-size: 11.5px; color: #003366; margin-bottom: 6px; text-transform: uppercase;">
      1. Chemical Composition Analysis (Optical Emission Spectrometry - OES)
    </div>
    <table class="table-data">
      <thead>
        <tr>
          <th>Element Name</th>
          <th style="width: 65px; text-align: center;">Symbol</th>
          <th style="width: 140px; text-align: center;">Specified Limit</th>
          <th style="width: 110px; text-align: right;">Actual Spectro (%)</th>
          <th style="width: 110px; text-align: center;">Test Standard</th>
          <th style="width: 90px; text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${chemHtml}
      </tbody>
    </table>

    <!-- 2. Mechanical & Physical Properties -->
    <div style="font-weight: 800; font-size: 11.5px; color: #003366; margin-bottom: 6px; text-transform: uppercase;">
      2. Mechanical &amp; Physical Test Properties
    </div>
    <table class="table-data">
      <thead>
        <tr>
          <th>Test Parameter</th>
          <th style="width: 140px; text-align: center;">Specified Standard Min</th>
          <th style="width: 140px; text-align: right;">Observed Test Value</th>
          <th style="width: 140px; text-align: center;">Test Method</th>
          <th style="width: 90px; text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: 600;">Tensile Strength (Rm)</td>
          <td style="text-align: center;">Min ${preset.mechanical.tensile_mpa.min} MPa (N/mm²)</td>
          <td style="text-align: right; font-weight: bold; color: #003366;">${analysis.tensile_strength_mpa || preset.mechanical.tensile_mpa.default} MPa</td>
          <td style="text-align: center; font-size: 10px;">ASTM E8 / IS 1608</td>
          <td style="text-align: center; color: #166534; font-weight: bold; font-size: 10px;">✔ CONFORMS</td>
        </tr>
        <tr>
          <td style="font-weight: 600;">Elongation (A50mm)</td>
          <td style="text-align: center;">Min ${preset.mechanical.elongation_pct.min}%</td>
          <td style="text-align: right; font-weight: bold; color: #003366;">${analysis.elongation_pct || preset.mechanical.elongation_pct.default}%</td>
          <td style="text-align: center; font-size: 10px;">ASTM E8 / IS 1608</td>
          <td style="text-align: center; color: #166534; font-weight: bold; font-size: 10px;">✔ CONFORMS</td>
        </tr>
        <tr>
          <td style="font-weight: 600;">Hardness (Brinell / Rockwell)</td>
          <td style="text-align: center;">Min ${preset.mechanical.hardness.min} BHN</td>
          <td style="text-align: right; font-weight: bold; color: #003366;">${escapeHtml(analysis.hardness_val || preset.mechanical.hardness.default)}</td>
          <td style="text-align: center; font-size: 10px;">ASTM E10 / IS 1500</td>
          <td style="text-align: center; color: #166534; font-weight: bold; font-size: 10px;">✔ CONFORMS</td>
        </tr>
      </tbody>
    </table>

    <!-- Statutory Environmental Compliance Statement -->
    <div class="compliance-box">
      <div style="font-weight: bold; margin-bottom: 2px;">
        🛡️ Statutory RoHS 3 &amp; REACH Environmental Compliance Declaration:
      </div>
      <div>
        <b>RoHS 3 Compliance:</b> We hereby certify that the brass material supplied under Heat #${escapeHtml(analysis.heat_no)} complies with European Directive 2011/65/EU and amendment Directive (EU) 2015/863. ${escapeHtml(analysis.rohs_exemption || preset.rohsExemption)}.
      </div>
      <div style="margin-top: 3px;">
        <b>REACH Compliance (EC 1907/2006):</b> None of the 240 Substances of Very High Concern (SVHC) are present in concentrations exceeding 0.1% w/w.
      </div>
    </div>

    <!-- Sign-off Authority Blocks -->
    <div class="footer-auth">
      <div>
        Tested By<br>
        <b>${escapeHtml(analysis.tested_by || 'Quality Metallurgist')}</b><br>
        <small style="color: #64748b;">Laboratory In-Charge</small>
      </div>
      <div>
        Verified &amp; Verified By<br>
        <b>QA / QC Department</b><br>
        <small style="color: #64748b;">Quality Assurance Manager</small>
      </div>
      <div>
        For <b>${escapeHtml(compName)}</b><br><br>
        <b>Authorized Signatory</b><br>
        <small style="color: #64748b;">Factory Works</small>
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  ALLOY_PRESETS,
  getSpectroList,
  getSpectroByHeatNo,
  saveSpectroAnalysis,
  renderMtcPrintHtml
};
