/**
 * SMART ERP - Spectrometer Chemical Composition & RoHS / REACH MTC 3.1 Client Engine
 * Optical Emission Spectrometer (OES) analysis, Alloy Grade Presets, and EN 10204 3.1 Generator
 */

(() => {
  const hub = document.getElementById("spectro-hub");
  if (!hub) return;

  const btnCloseX = document.getElementById("spectro-hub-close-x");
  const btnClose = document.getElementById("spectro-btn-close");
  const inputSearch = document.getElementById("spectro-search-input");
  const btnSearch = document.getElementById("spectro-btn-search");
  const listContainer = document.getElementById("spectro-list-container");
  const detailContainer = document.getElementById("spectro-detail-container");
  const countBadge = document.getElementById("spectro-count-badge");
  const btnNewAnalysis = document.getElementById("spectro-btn-new");

  let presetsCache = {};
  let analysisListCache = [];
  let activeAnalysisId = null;
  let activeHeatNo = null;

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m]);
  }

  function fmtDate(d) {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (e) {
      return String(d);
    }
  }

  async function loadPresets() {
    try {
      const res = await fetch("/api/spectro/presets");
      const json = await res.json();
      if (json.ok && json.data) {
        presetsCache = json.data;
      }
    } catch (err) {
      console.warn("Could not load alloy presets:", err);
    }
  }

  async function loadAnalyses(query = "") {
    if (!listContainer) return;
    listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">Loading spectrometer heats...</div>`;

    try {
      const q = encodeURIComponent(query || (inputSearch ? inputSearch.value.trim() : ""));
      const res = await fetch(`/api/spectro/list?q=${q}`);
      const json = await res.json();

      if (!json.ok) {
        listContainer.innerHTML = `<div style="padding: 16px; color: #b91c1c; font-size: 12px;">Failed to load: ${esc(json.message)}</div>`;
        return;
      }

      analysisListCache = json.data || [];
      if (countBadge) countBadge.textContent = `${analysisListCache.length} heats`;
      renderAnalysisList(analysisListCache);

      if (activeHeatNo) {
        selectHeat(activeHeatNo);
      } else if (analysisListCache.length > 0) {
        selectHeat(analysisListCache[0].heat_no);
      } else {
        renderDraftForm("HT-BRASS-701");
      }
    } catch (err) {
      console.error("Load spectro analyses failed:", err);
      if (listContainer) {
        listContainer.innerHTML = `<div style="padding: 16px; color: #b91c1c; font-size: 12px;">Error: ${esc(err.message)}</div>`;
      }
    }
  }

  function renderAnalysisList(items) {
    if (!listContainer) return;

    if (!items || items.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 12px;">
          <div style="font-size: 24px; margin-bottom: 6px;">🧪</div>
          No chemical heat analyses recorded yet.<br>Click <b>+ New Analysis</b> to create one.
        </div>`;
      return;
    }

    listContainer.innerHTML = items.map((t) => {
      const isSelected = (activeHeatNo && t.heat_no.toUpperCase() === activeHeatNo.toUpperCase()) ||
                         (activeAnalysisId && t.analysis_id === activeAnalysisId);
      const isPassed = (t.qa_status || "PASSED") === "PASSED";
      const statusBadge = isPassed
        ? `<span style="background: #e6f4ea; color: #137333; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">✔ PASSED</span>`
        : `<span style="background: #feefe3; color: #b06000; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">⚠ ${esc(t.qa_status)}</span>`;

      const rohsChip = t.rohs_compliant
        ? `<span style="background: #e0f2fe; color: #0369a1; padding: 1px 5px; border-radius: 3px; font-size: 9.5px; font-weight: 600;">RoHS 6(c)</span>`
        : `<span style="background: #fee2e2; color: #b91c1c; padding: 1px 5px; border-radius: 3px; font-size: 9.5px; font-weight: 600;">Non-RoHS</span>`;

      return `
        <div class="spectro-card ${isSelected ? 'active-card' : ''}" data-heat="${esc(t.heat_no)}" data-id="${t.analysis_id}" style="
          padding: 10px 12px; margin-bottom: 6px; border: 1.5px solid ${isSelected ? '#1c625a' : '#e2e8f0'};
          border-radius: 6px; background: ${isSelected ? '#f0fdfa' : '#fff'}; cursor: pointer; transition: all 0.15s;
          box-shadow: ${isSelected ? '0 2px 6px rgba(28,98,90,0.15)' : 'none'};
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; font-family: monospace;">${esc(t.heat_no)}</div>
            ${statusBadge}
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #1e293b; margin-bottom: 3px; display: flex; justify-content: space-between; align-items: center;">
            <span>${esc(t.alloy_grade)}</span>
            ${rohsChip}
          </div>
          <div style="display: flex; gap: 8px; font-size: 10.5px; color: #475569; margin-bottom: 4px; flex-wrap: wrap;">
            <span>Date: <b>${fmtDate(t.sample_date)}</b></span>
            <span>Batch: <b style="font-family: monospace;">${esc(t.batch_no || '-')}</b></span>
            <span>Cu: <b>${Number(t.cu_pct || 0).toFixed(2)}%</b></span>
            <span>Pb: <b>${Number(t.pb_pct || 0).toFixed(2)}%</b></span>
          </div>
        </div>
      `;
    }).join("");

    listContainer.querySelectorAll(".spectro-card").forEach((card) => {
      card.addEventListener("click", () => {
        const heat = card.getAttribute("data-heat");
        selectHeat(heat);
      });
    });
  }

  async function selectHeat(heatNo) {
    if (!heatNo || !detailContainer) return;
    activeHeatNo = heatNo;

    // Highlight active in list
    if (listContainer) {
      listContainer.querySelectorAll(".spectro-card").forEach((card) => {
        const isCurrent = card.getAttribute("data-heat")?.toUpperCase() === heatNo.toUpperCase();
        card.style.borderColor = isCurrent ? '#1c625a' : '#e2e8f0';
        card.style.background = isCurrent ? '#f0fdfa' : '#fff';
        card.style.boxShadow = isCurrent ? '0 2px 6px rgba(28,98,90,0.15)' : 'none';
      });
    }

    detailContainer.innerHTML = `<div style="padding: 40px; text-align: center; color: #64748b;">Loading analysis for Heat #${esc(heatNo)}...</div>`;

    try {
      const res = await fetch(`/api/spectro/get?heat_no=${encodeURIComponent(heatNo)}`);
      const json = await res.json();
      if (!json.ok || !json.data) {
        detailContainer.innerHTML = `<div style="padding: 20px; color: #b91c1c;">Could not load heat analysis: ${esc(json.message || "Record not found")}</div>`;
        return;
      }
      activeAnalysisId = json.data.analysis_id || null;
      renderDetailForm(json.data);
    } catch (err) {
      console.error("Select heat failed:", err);
      detailContainer.innerHTML = `<div style="padding: 20px; color: #b91c1c;">Error loading record: ${esc(err.message)}</div>`;
    }
  }

  function renderDraftForm(heatNo = "") {
    const defaultGrade = "IS 319 Gr 1";
    const preset = presetsCache[defaultGrade] || {
      elements: {
        cu: { min: 56.0, max: 59.0, default: 58.20 },
        pb: { min: 2.0, max: 3.5, default: 2.30 },
        fe: { min: 0.0, max: 0.35, default: 0.20 },
        sn: { min: 0.0, max: 0.30, default: 0.10 },
        ni: { min: 0.0, max: 0.30, default: 0.05 },
        al: { min: 0.0, max: 0.05, default: 0.01 },
        total_imp: { min: 0.0, max: 0.70, default: 0.40 },
        zn: { min: 38.0, max: 42.0, default: 39.14 }
      },
      mechanical: {
        tensile_mpa: { default: 440 },
        elongation_pct: { default: 18.0 },
        hardness: { default: "125 BHN" }
      },
      rohsExemption: "Exemption 6(c) - Copper alloy containing up to 4.0% lead by weight"
    };

    const draftData = {
      heat_no: heatNo || `HT-BRASS-${Math.floor(100 + Math.random() * 900)}`,
      batch_no: `BT-2026-${Math.floor(100 + Math.random() * 900)}`,
      alloy_grade: defaultGrade,
      sample_date: new Date().toISOString().slice(0, 10),
      tested_by: "Quality Lab Metallurgist",
      lab_equipment: "Optical Emission Spectrometer (Spark OES)",
      cu_pct: preset.elements.cu.default,
      pb_pct: preset.elements.pb.default,
      fe_pct: preset.elements.fe.default,
      sn_pct: preset.elements.sn ? preset.elements.sn.default : 0.10,
      ni_pct: preset.elements.ni ? preset.elements.ni.default : 0.05,
      al_pct: preset.elements.al ? preset.elements.al.default : 0.01,
      mn_pct: 0.01,
      as_pct: 0.00,
      si_pct: 0.00,
      total_imp_pct: preset.elements.total_imp.default,
      zn_pct: preset.elements.zn.default,
      tensile_strength_mpa: preset.mechanical.tensile_mpa.default,
      elongation_pct: preset.mechanical.elongation_pct.default,
      hardness_val: preset.mechanical.hardness.default,
      rohs_compliant: true,
      rohs_exemption: preset.rohsExemption,
      reach_compliant: true,
      qa_status: "PASSED",
      remarks: "Extruded & Cold Drawn Brass Rods. Homogenized sample tested as per ASTM E478 / IS 319 standards."
    };

    activeAnalysisId = null;
    activeHeatNo = draftData.heat_no;
    renderDetailForm(draftData, true);
  }

  function renderDetailForm(data, isNew = false) {
    if (!detailContainer) return;

    const gradeKeys = Object.keys(presetsCache).length > 0
      ? Object.keys(presetsCache)
      : ["IS 319 Gr 1", "IS 319 Gr 2", "CW614N", "CW617N", "CW602N / DZR", "Lead-Free Brass", "Naval Brass"];

    const currentPreset = presetsCache[data.alloy_grade] || presetsCache["IS 319 Gr 1"] || {};

    detailContainer.innerHTML = `
      <div style="background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden;">
        <!-- Card Header with Action Buttons -->
        <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">🧪</span>
              <span style="font-size: 15px; font-weight: 700; color: #0f172a; font-family: monospace;">Heat Analysis: ${esc(data.heat_no)}</span>
              ${isNew ? '<span style="background: #fef3c7; color: #92400e; font-size: 10.5px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">NEW DRAFT</span>' : '<span style="background: #e6f4ea; color: #137333; font-size: 10.5px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">RECORDED</span>'}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              EN 10204 3.1 Certified Material Test Certificate Generator &bull; Optical Emission Spectrometer (OES)
            </div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button type="button" id="spectro-btn-print" class="invmfg-btn" style="background: #0284c7; color: #fff; font-weight: bold; padding: 6px 14px; font-size: 12px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 5px;">
              <span>📄</span> Print MTC 3.1
            </button>
            <button type="button" id="spectro-btn-copy-link" class="invmfg-btn" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-weight: bold; padding: 6px 12px; font-size: 11px; cursor: pointer; border-radius: 4px;">
              🔗 Copy MTC Link
            </button>
            <button type="button" id="spectro-btn-save" class="invmfg-btn" style="background: #1c625a; color: #fff; font-weight: bold; padding: 6px 16px; font-size: 12px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 5px;">
              <span>💾</span> Save Analysis
            </button>
          </div>
        </div>

        <form id="spectro-form" style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">
          <!-- Section 1: Heat Identification & Specification -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
            <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <span>📌</span> Heat Identification &amp; Material Standard
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
              <div>
                <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">Heat Number *</label>
                <input type="text" id="spectro-heat-no" value="${esc(data.heat_no)}" style="width: 100%; padding: 6px 8px; border: 1.5px solid #94a3b8; border-radius: 4px; font-size: 12px; font-weight: bold; font-family: monospace; text-transform: uppercase;" required>
              </div>

              <div>
                <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">Alloy Grade Specification *</label>
                <select id="spectro-alloy-grade" style="width: 100%; padding: 6px 8px; border: 1.5px solid #1c625a; border-radius: 4px; font-size: 12px; font-weight: bold; background: #f0fdfa;">
                  ${gradeKeys.map((g) => `<option value="${esc(g)}" ${g === data.alloy_grade ? 'selected' : ''}>${esc(g)}</option>`).join("")}
                </select>
              </div>

              <div>
                <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">Sample Testing Date</label>
                <input type="date" id="spectro-date" value="${data.sample_date ? data.sample_date.slice(0, 10) : new Date().toISOString().slice(0, 10)}" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px;">
              </div>

              <div>
                <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">Batch / Lot No.</label>
                <input type="text" id="spectro-batch-no" value="${esc(data.batch_no || '')}" placeholder="e.g. BT-2026-081" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; font-family: monospace;">
              </div>

              <div>
                <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">Testing Equipment</label>
                <input type="text" id="spectro-lab-equipment" value="${esc(data.lab_equipment || 'Optical Emission Spectrometer (Spark OES)')}" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px;">
              </div>

              <div>
                <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">Tested By (Metallurgist)</label>
                <input type="text" id="spectro-tested-by" value="${esc(data.tested_by || 'Quality Metallurgist')}" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px;">
              </div>

              <div>
                <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">QA Disposition</label>
                <select id="spectro-qa-status" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  <option value="PASSED" ${data.qa_status === 'PASSED' ? 'selected' : ''}>✔ PASSED (Conforms to Standard)</option>
                  <option value="REJECTED" ${data.qa_status === 'REJECTED' ? 'selected' : ''}>✖ REJECTED (Out of Spec)</option>
                  <option value="PENDING_REVIEW" ${data.qa_status === 'PENDING_REVIEW' ? 'selected' : ''}>⏳ PENDING REVIEW</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Section 2: Chemical Composition (OES Lab Spectrometer % by Weight) -->
          <div style="background: #fff; border: 1.5px solid #1c625a; border-radius: 6px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
              <div style="font-size: 12.5px; font-weight: 700; color: #1c625a; display: flex; align-items: center; gap: 6px;">
                <span>🔬</span> Chemical Composition Analysis (OES Spectrometer % by Weight)
              </div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <button type="button" id="spectro-btn-calc-zn" style="background: #f0fdfa; border: 1px solid #1c625a; color: #1c625a; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">
                  ⚡ Auto-Balance Zinc (Zn)
                </button>
                <div id="spectro-sum-badge" style="padding: 3px 10px; border-radius: 4px; font-size: 11.5px; font-weight: 700; font-family: monospace; background: #e6f4ea; color: #137333;">
                  Total: 100.00%
                </div>
              </div>
            </div>

            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
                    <th style="padding: 6px 10px; width: 140px;">Element</th>
                    <th style="padding: 6px 10px; width: 120px;">Symbol</th>
                    <th style="padding: 6px 10px; width: 150px;">Specification Range (%)</th>
                    <th style="padding: 6px 10px; width: 180px;">Observed Value (%) *</th>
                    <th style="padding: 6px 10px;">Evaluation</th>
                  </tr>
                </thead>
                <tbody id="spectro-chem-tbody">
                  <!-- Dynamically populated or bound -->
                  ${renderChemRow("Copper", "Cu", "spectro-cu", data.cu_pct, currentPreset?.elements?.cu)}
                  ${renderChemRow("Lead", "Pb", "spectro-pb", data.pb_pct, currentPreset?.elements?.pb)}
                  ${renderChemRow("Iron", "Fe", "spectro-fe", data.fe_pct, currentPreset?.elements?.fe)}
                  ${renderChemRow("Tin", "Sn", "spectro-sn", data.sn_pct, currentPreset?.elements?.sn)}
                  ${renderChemRow("Nickel", "Ni", "spectro-ni", data.ni_pct, currentPreset?.elements?.ni)}
                  ${renderChemRow("Aluminium", "Al", "spectro-al", data.al_pct, currentPreset?.elements?.al)}
                  ${renderChemRow("Manganese", "Mn", "spectro-mn", data.mn_pct, { min: 0.0, max: 0.10 })}
                  ${renderChemRow("Arsenic", "As", "spectro-as", data.as_pct, currentPreset?.elements?.as || { min: 0.0, max: 0.15 })}
                  ${renderChemRow("Silicon", "Si", "spectro-si", data.si_pct, currentPreset?.elements?.si || { min: 0.0, max: 0.10 })}
                  ${renderChemRow("Total Impurities", "Total Imp.", "spectro-total-imp", data.total_imp_pct, currentPreset?.elements?.total_imp)}
                  ${renderChemRow("Zinc (Balance)", "Zn", "spectro-zn", data.zn_pct, currentPreset?.elements?.zn, true)}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Section 3: Mechanical Properties & Statutory Compliance -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px;">
            <!-- Mechanical Properties -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
              <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <span>⚙</span> Mechanical Properties (Batch Sample)
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">Tensile Strength Rm (N/mm²)</label>
                  <input type="number" id="spectro-tensile" step="1" value="${data.tensile_strength_mpa || 440}" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; font-family: monospace;">
                </div>
                <div>
                  <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">Elongation A50 (%)</label>
                  <input type="number" id="spectro-elongation" step="0.1" value="${data.elongation_pct || 18.0}" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; font-family: monospace;">
                </div>
                <div style="grid-column: span 2;">
                  <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">Hardness (BHN / HV / HRB)</label>
                  <input type="text" id="spectro-hardness" value="${esc(data.hardness_val || '125 BHN')}" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px;">
                </div>
              </div>
            </div>

            <!-- Statutory RoHS / REACH -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px;">
              <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                <span>🌱</span> RoHS &amp; REACH Compliance Declarations
              </div>

              <div style="margin-bottom: 10px;">
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #1e293b; cursor: pointer;">
                  <input type="checkbox" id="spectro-rohs-compliant" ${data.rohs_compliant !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #1c625a;">
                  <span>RoHS Directive (2011/65/EU &amp; 2015/863/EU) Compliant</span>
                </label>
              </div>

              <div style="margin-bottom: 10px;">
                <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">RoHS Exemption Clause</label>
                <input type="text" id="spectro-rohs-exemption" value="${esc(data.rohs_exemption || currentPreset?.rohsExemption || 'Exemption 6(c) - Copper alloy containing up to 4.0% lead by weight')}" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px;">
              </div>

              <div>
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #1e293b; cursor: pointer;">
                  <input type="checkbox" id="spectro-reach-compliant" ${data.reach_compliant !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: #1c625a;">
                  <span>REACH SVHC Candidate List (EC 1907/2006) Declared</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 4: Remarks & Process Notes -->
          <div>
            <label style="display: block; font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 4px;">Metallurgical Remarks &amp; Certification Notes</label>
            <textarea id="spectro-remarks" rows="2" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px;">${esc(data.remarks || '')}</textarea>
          </div>
        </form>
      </div>
    `;

    bindFormEvents(data);
  }

  function renderChemRow(name, symbol, id, val, limits, isBalance = false) {
    const min = limits && limits.min !== undefined ? limits.min : "-";
    const max = limits && limits.max !== undefined ? limits.max : "-";
    const rangeStr = (min !== "-" || max !== "-") ? `${min} - ${max}` : "-";
    const numVal = Number(val || 0);

    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px 10px; font-weight: 600; color: #334155;">${esc(name)}</td>
        <td style="padding: 6px 10px; font-weight: 700; color: #0f172a; font-family: monospace;">${esc(symbol)}</td>
        <td style="padding: 6px 10px; color: #64748b; font-family: monospace;">${rangeStr}</td>
        <td style="padding: 6px 10px;">
          <input type="number" step="0.01" min="0" max="100" id="${id}" class="spectro-elem-input" value="${numVal.toFixed(2)}"
            data-symbol="${symbol}" data-min="${min}" data-max="${max}"
            style="width: 110px; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: monospace; font-size: 12px; font-weight: bold;">
        </td>
        <td style="padding: 6px 10px;" id="${id}-eval">
          <span style="color: #137333; font-size: 11px; font-weight: bold;">✔ OK</span>
        </td>
      </tr>
    `;
  }

  function bindFormEvents(initialData) {
    const gradeSelect = document.getElementById("spectro-alloy-grade");
    const btnSave = document.getElementById("spectro-btn-save");
    const btnPrint = document.getElementById("spectro-btn-print");
    const btnCopyLink = document.getElementById("spectro-btn-copy-link");
    const btnCalcZn = document.getElementById("spectro-btn-calc-zn");

    // Element inputs live sum
    const elemInputs = detailContainer.querySelectorAll(".spectro-elem-input");
    elemInputs.forEach((inp) => {
      inp.addEventListener("input", () => {
        recalculateChemicalSum();
      });
    });

    // Auto calculate Zn
    if (btnCalcZn) {
      btnCalcZn.addEventListener("click", () => {
        let othersSum = 0;
        elemInputs.forEach((inp) => {
          if (inp.id !== "spectro-zn") {
            othersSum += Number(inp.value) || 0;
          }
        });
        const znBal = Math.max(0, 100 - othersSum);
        const znInp = document.getElementById("spectro-zn");
        if (znInp) {
          znInp.value = znBal.toFixed(2);
          recalculateChemicalSum();
        }
      });
    }

    // Grade dropdown change: populate standard nominal ranges
    if (gradeSelect) {
      gradeSelect.addEventListener("change", () => {
        const selectedGrade = gradeSelect.value;
        const preset = presetsCache[selectedGrade];
        if (!preset) return;

        // Populate elements
        if (preset.elements) {
          setElemValue("spectro-cu", preset.elements.cu);
          setElemValue("spectro-pb", preset.elements.pb);
          setElemValue("spectro-fe", preset.elements.fe);
          setElemValue("spectro-sn", preset.elements.sn);
          setElemValue("spectro-ni", preset.elements.ni);
          setElemValue("spectro-al", preset.elements.al);
          setElemValue("spectro-total-imp", preset.elements.total_imp);
          setElemValue("spectro-zn", preset.elements.zn);
          if (preset.elements.as) setElemValue("spectro-as", preset.elements.as);
          if (preset.elements.si) setElemValue("spectro-si", preset.elements.si);
        }

        // Mechanical properties
        if (preset.mechanical) {
          const tensileInp = document.getElementById("spectro-tensile");
          const elonInp = document.getElementById("spectro-elongation");
          const hardInp = document.getElementById("spectro-hardness");
          if (tensileInp && preset.mechanical.tensile_mpa) tensileInp.value = preset.mechanical.tensile_mpa.default;
          if (elonInp && preset.mechanical.elongation_pct) elonInp.value = preset.mechanical.elongation_pct.default;
          if (hardInp && preset.mechanical.hardness) hardInp.value = preset.mechanical.hardness.default;
        }

        // RoHS exemption
        const rohsExemptionInp = document.getElementById("spectro-rohs-exemption");
        if (rohsExemptionInp && preset.rohsExemption) {
          rohsExemptionInp.value = preset.rohsExemption;
        }

        recalculateChemicalSum();
      });
    }

    // Print MTC 3.1
    if (btnPrint) {
      btnPrint.addEventListener("click", () => {
        const heatNo = (document.getElementById("spectro-heat-no")?.value || "").trim();
        if (!heatNo) {
          alert("Please enter a Heat Number before printing.");
          return;
        }
        window.open(`/api/print?type=mtc&heat_no=${encodeURIComponent(heatNo)}`, "_blank");
      });
    }

    // Copy MTC link
    if (btnCopyLink) {
      btnCopyLink.addEventListener("click", async () => {
        const heatNo = (document.getElementById("spectro-heat-no")?.value || "").trim();
        if (!heatNo) {
          alert("Please enter a Heat Number first.");
          return;
        }
        const fullUrl = `${window.location.origin}/api/print?type=mtc&heat_no=${encodeURIComponent(heatNo)}`;
        try {
          await navigator.clipboard.writeText(fullUrl);
          alert(`MTC Certificate Link copied to clipboard:\n${fullUrl}`);
        } catch (e) {
          prompt("Copy this MTC Certificate link:", fullUrl);
        }
      });
    }

    // Save Analysis
    if (btnSave) {
      btnSave.addEventListener("click", async () => {
        const heatNo = (document.getElementById("spectro-heat-no")?.value || "").trim();
        if (!heatNo) {
          alert("Heat Number is required.");
          return;
        }

        btnSave.disabled = true;
        btnSave.innerHTML = `<span>⏳</span> Saving...`;

        const payload = {
          heat_no: heatNo,
          alloy_grade: document.getElementById("spectro-alloy-grade")?.value || "IS 319 Gr 1",
          sample_date: document.getElementById("spectro-date")?.value || new Date().toISOString().slice(0, 10),
          batch_no: document.getElementById("spectro-batch-no")?.value || "",
          lab_equipment: document.getElementById("spectro-lab-equipment")?.value || "",
          tested_by: document.getElementById("spectro-tested-by")?.value || "",
          qa_status: document.getElementById("spectro-qa-status")?.value || "PASSED",
          cu_pct: Number(document.getElementById("spectro-cu")?.value) || 0,
          pb_pct: Number(document.getElementById("spectro-pb")?.value) || 0,
          fe_pct: Number(document.getElementById("spectro-fe")?.value) || 0,
          sn_pct: Number(document.getElementById("spectro-sn")?.value) || 0,
          ni_pct: Number(document.getElementById("spectro-ni")?.value) || 0,
          al_pct: Number(document.getElementById("spectro-al")?.value) || 0,
          mn_pct: Number(document.getElementById("spectro-mn")?.value) || 0,
          as_pct: Number(document.getElementById("spectro-as")?.value) || 0,
          si_pct: Number(document.getElementById("spectro-si")?.value) || 0,
          total_imp_pct: Number(document.getElementById("spectro-total-imp")?.value) || 0,
          zn_pct: Number(document.getElementById("spectro-zn")?.value) || 0,
          tensile_strength_mpa: Number(document.getElementById("spectro-tensile")?.value) || null,
          elongation_pct: Number(document.getElementById("spectro-elongation")?.value) || null,
          hardness_val: document.getElementById("spectro-hardness")?.value || "",
          rohs_compliant: document.getElementById("spectro-rohs-compliant")?.checked !== false,
          rohs_exemption: document.getElementById("spectro-rohs-exemption")?.value || "",
          reach_compliant: document.getElementById("spectro-reach-compliant")?.checked !== false,
          remarks: document.getElementById("spectro-remarks")?.value || ""
        };

        try {
          const res = await fetch("/api/spectro/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const json = await res.json();

          if (!json.ok) {
            alert(`Save failed: ${json.message || "Unknown error"}`);
            btnSave.disabled = false;
            btnSave.innerHTML = `<span>💾</span> Save Analysis`;
            return;
          }

          activeHeatNo = heatNo;
          activeAnalysisId = json.data?.analysis_id || null;
          await loadAnalyses();
          alert(`Chemical Analysis for Heat #${heatNo} successfully saved!`);
        } catch (err) {
          console.error("Save spectro error:", err);
          alert(`Save error: ${err.message}`);
        } finally {
          btnSave.disabled = false;
          btnSave.innerHTML = `<span>💾</span> Save Analysis`;
        }
      });
    }

    recalculateChemicalSum();
  }

  function setElemValue(id, elemObj) {
    const el = document.getElementById(id);
    if (!el || !elemObj) return;
    if (elemObj.default !== undefined) {
      el.value = Number(elemObj.default).toFixed(2);
    }
  }

  function recalculateChemicalSum() {
    const sumBadge = document.getElementById("spectro-sum-badge");
    const elemInputs = detailContainer ? detailContainer.querySelectorAll(".spectro-elem-input") : [];
    let sum = 0;

    elemInputs.forEach((inp) => {
      // Exclude total_imp from sum because it's a subset/umbrella of fe+sn+ni+al
      if (inp.id !== "spectro-total-imp") {
        sum += Number(inp.value) || 0;
      }

      // Check min/max tolerance evaluation
      const min = parseFloat(inp.getAttribute("data-min"));
      const max = parseFloat(inp.getAttribute("data-max"));
      const val = parseFloat(inp.value);
      const evalSpan = document.getElementById(`${inp.id}-eval`);

      if (evalSpan && !isNaN(val)) {
        let isOutOfSpec = false;
        if (!isNaN(min) && val < min) isOutOfSpec = true;
        if (!isNaN(max) && val > max) isOutOfSpec = true;

        if (isOutOfSpec) {
          evalSpan.innerHTML = `<span style="color: #b91c1c; font-size: 11px; font-weight: bold;">⚠ OUT OF SPEC</span>`;
        } else {
          evalSpan.innerHTML = `<span style="color: #137333; font-size: 11px; font-weight: bold;">✔ OK</span>`;
        }
      }
    });

    if (sumBadge) {
      sumBadge.textContent = `Total: ${sum.toFixed(2)}%`;
      if (sum >= 99.7 && sum <= 100.3) {
        sumBadge.style.background = "#e6f4ea";
        sumBadge.style.color = "#137333";
      } else {
        sumBadge.style.background = "#feefe3";
        sumBadge.style.color = "#b06000";
      }
    }
  }

  // Search input handler
  if (btnSearch && inputSearch) {
    btnSearch.addEventListener("click", () => {
      loadAnalyses(inputSearch.value.trim());
    });
    inputSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadAnalyses(inputSearch.value.trim());
      }
    });
  }

  // + New Analysis button
  if (btnNewAnalysis) {
    btnNewAnalysis.addEventListener("click", () => {
      const randomHeat = `HT-BRASS-${Math.floor(100 + Math.random() * 900)}`;
      renderDraftForm(randomHeat);
    });
  }

  // Close handlers
  if (btnCloseX) {
    btnCloseX.addEventListener("click", () => {
      window.closeSpectroHub();
    });
  }
  if (btnClose) {
    btnClose.addEventListener("click", () => {
      window.closeSpectroHub();
    });
  }

  // Global window controls
  window.openSpectroHub = async (heatNo = null) => {
    if (!hub) return;
    hub.hidden = false;
    hub.style.display = "flex";

    await loadPresets();

    if (heatNo) {
      activeHeatNo = heatNo;
      await loadAnalyses(heatNo);
    } else {
      await loadAnalyses();
    }
  };

  window.closeSpectroHub = () => {
    if (!hub) return;
    hub.hidden = true;
    hub.style.display = "none";
  };
})();
