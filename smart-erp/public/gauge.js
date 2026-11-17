/**
 * SMART ERP - Thread Go/No-Go Gauge Calibration & Wear Life Register
 * Metrology & Tool Crib Subsystem for Precision Jamnagar Brass Turning
 */

(function () {
  'use strict';

  let threadPresets = [];
  let currentGauges = [];
  let selectedGauge = null;
  let activeFilterStandard = 'ALL';
  let activeFilterStatus = 'ALL';

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  async function fetchPresets() {
    if (threadPresets.length > 0) return threadPresets;
    try {
      const res = await fetch('/api/gauge/presets');
      const json = await res.json();
      if (json.ok && Array.isArray(json.presets)) {
        threadPresets = json.presets;
      }
    } catch (err) {
      console.error('Failed to load thread presets:', err);
    }
    return threadPresets;
  }

  window.openGaugeHub = async function (gaugeIdToSelect) {
    const hub = getEl('gauge-hub');
    if (!hub) return;
    hub.hidden = false;
    hub.style.display = 'flex';

    await fetchPresets();
    await loadGaugeList(gaugeIdToSelect);
  };

  window.closeGaugeHub = function () {
    const hub = getEl('gauge-hub');
    if (hub) {
      hub.hidden = true;
      hub.style.display = 'none';
    }
    if (typeof closeIssueDialog === 'function') closeIssueDialog();
    if (typeof closeCalibDialog === 'function') closeCalibDialog();
  };

  async function loadGaugeList(selectGaugeId) {
    const listContainer = getEl('gauge-list-container');
    const badge = getEl('gauge-count-badge');
    const q = (getEl('gauge-search-input') ? getEl('gauge-search-input').value : '').trim();

    if (listContainer) {
      listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">Loading thread gauges...</div>';
    }

    try {
      const params = new URLSearchParams({
        q,
        standard: activeFilterStandard,
        status: activeFilterStatus,
        limit: '100'
      });
      const res = await fetch(`/api/gauge/list?${params.toString()}`);
      const json = await res.json();

      if (!json.ok) {
        if (listContainer) listContainer.innerHTML = `<div style="padding: 14px; color: #dc2626; font-size: 12px;">Error: ${escapeHtml(json.message || 'Failed to load')}</div>`;
        return;
      }

      currentGauges = json.data || [];
      if (badge) badge.textContent = `${currentGauges.length} gauges`;

      renderGaugeList(currentGauges);

      if (selectGaugeId) {
        selectGauge(selectGaugeId);
      } else if (currentGauges.length > 0 && !selectedGauge) {
        selectGauge(currentGauges[0].gauge_id);
      } else if (selectedGauge) {
        const stillExists = currentGauges.find(g => g.gauge_id === selectedGauge.gauge_id);
        if (stillExists) selectGauge(stillExists.gauge_id);
        else if (currentGauges.length > 0) selectGauge(currentGauges[0].gauge_id);
      }
    } catch (err) {
      console.error('Failed to fetch gauge list:', err);
      if (listContainer) listContainer.innerHTML = `<div style="padding: 14px; color: #dc2626; font-size: 12px;">Network error: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderGaugeList(gauges) {
    const container = getEl('gauge-list-container');
    if (!container) return;

    if (!gauges || gauges.length === 0) {
      container.innerHTML = `
        <div style="padding: 30px 15px; text-align: center; color: #64748b; font-size: 12px;">
          <div style="font-size: 24px; margin-bottom: 6px;">📏</div>
          <strong>No Thread Gauges Found</strong>
          <p style="font-size: 11px; margin-top: 4px; color: #94a3b8;">Click "+ New Gauge" to register a thread plug or ring gauge.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = gauges.map(g => {
      const isSelected = selectedGauge && selectedGauge.gauge_id === g.gauge_id;
      const wear = g.wear || { usedPct: 0, accumulatedCycles: 0, ratedCycles: 10000, color: '#16a34a', badge: 'GOOD' };
      const calib = g.calib || { badge: 'CALIBRATED', color: '#16a34a', calibStatus: 'CURRENT' };

      const typeTag = (g.gauge_type || 'PLUG').replace('THREAD_', '').replace('_GO_NOGO', '');

      return `
        <div class="gauge-card-item" data-id="${g.gauge_id}" style="
          padding: 10px 12px;
          margin-bottom: 6px;
          border-radius: 6px;
          border: 1.5px solid ${isSelected ? '#0f766e' : '#e2e8f0'};
          background: ${isSelected ? '#f0fdfa' : '#ffffff'};
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: ${isSelected ? '0 2px 6px rgba(15, 118, 110, 0.15)' : 'none'};
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <span style="font-family: monospace; font-size: 13px; font-weight: 800; color: #0f172a;">${escapeHtml(g.gauge_control_no)}</span>
              <span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 1px 5px; border-radius: 3px; font-weight: bold; margin-left: 4px;">${escapeHtml(typeTag)}</span>
            </div>
            <span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${calib.color}15; color: ${calib.color}; border: 1px solid ${calib.color}40;">
              ${escapeHtml(calib.badge)}
            </span>
          </div>

          <div style="font-size: 12px; font-weight: bold; color: #334155; margin-top: 3px;">
            ${escapeHtml(g.thread_size)} <span style="font-size: 10.5px; color: #64748b;">${escapeHtml(g.class_of_fit || '')}</span>
          </div>

          <div style="font-size: 11px; color: #64748b; margin-top: 2px; display: flex; justify-content: space-between;">
            <span>📍 ${escapeHtml(g.current_location || 'Tool Crib')}</span>
            <span>Due: <strong>${g.next_calib_due_date ? String(g.next_calib_due_date).slice(0, 10) : '-'}</strong></span>
          </div>

          <!-- Wear Life Bar -->
          <div style="margin-top: 6px;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #475569; margin-bottom: 2px;">
              <span>Checks: <strong>${wear.accumulatedCycles}</strong> / ${wear.ratedCycles}</span>
              <span style="color: ${wear.color}; font-weight: bold;">${wear.usedPct}% Used</span>
            </div>
            <div style="height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
              <div style="width: ${wear.usedPct}%; height: 100%; background: ${wear.color}; border-radius: 3px;"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach click handlers
    container.querySelectorAll('.gauge-card-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = Number(el.getAttribute('data-id'));
        if (id) selectGauge(id);
      });
    });
  }

  async function selectGauge(gaugeId) {
    const detailContainer = getEl('gauge-detail-container');
    if (!detailContainer) return;

    detailContainer.innerHTML = '<div style="padding: 30px; text-align: center; color: #64748b; font-size: 13px;">Loading gauge details...</div>';

    try {
      const res = await fetch(`/api/gauge/get?id=${gaugeId}`);
      const json = await res.json();
      if (!json.ok || !json.data) {
        detailContainer.innerHTML = `<div style="padding: 20px; color: #dc2626;">Error: ${escapeHtml(json.message || 'Gauge not found')}</div>`;
        return;
      }

      selectedGauge = json.data;
      renderGaugeDetail(selectedGauge);

      // Re-highlight list item
      const container = getEl('gauge-list-container');
      if (container) {
        container.querySelectorAll('.gauge-card-item').forEach(el => {
          const isSelected = Number(el.getAttribute('data-id')) === gaugeId;
          el.style.border = isSelected ? '1.5px solid #0f766e' : '1.5px solid #e2e8f0';
          el.style.background = isSelected ? '#f0fdfa' : '#ffffff';
          el.style.boxShadow = isSelected ? '0 2px 6px rgba(15, 118, 110, 0.15)' : 'none';
        });
      }
    } catch (err) {
      console.error('Failed to fetch gauge detail:', err);
      detailContainer.innerHTML = `<div style="padding: 20px; color: #dc2626;">Network error: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderGaugeDetail(gauge) {
    const container = getEl('gauge-detail-container');
    if (!container) return;

    const wear = gauge.wear || { usedPct: 0, accumulatedCycles: 0, ratedCycles: 10000, color: '#16a34a', badge: 'GOOD', remainingCycles: 10000 };
    const calib = gauge.calib || { badge: 'CALIBRATED', color: '#16a34a', calibStatus: 'CURRENT', diffDays: 180 };
    const isNewDraft = !gauge.gauge_id;

    // Build preset options
    const presetOptionsHtml = threadPresets.map(p => {
      return `<option value="${escapeHtml(p.standard)}|${escapeHtml(p.size)}">${escapeHtml(p.standard.replace('_', ' '))} • ${escapeHtml(p.size)} (${escapeHtml(p.class_of_fit)})</option>`;
    }).join('');

    const logs = gauge.calibration_history || [];
    const logsRowsHtml = logs.map(l => {
      const resColor = l.overall_result === 'PASS' ? '#16a34a' : '#dc2626';
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; font-weight: bold;">${String(l.calib_date || '').slice(0, 10)}</td>
          <td style="padding: 6px 8px;">
            <span style="font-size: 9.5px; padding: 1px 5px; border-radius: 3px; font-weight: bold; background: ${l.agency_type === 'EXTERNAL_NABL_LAB' ? '#ede9fe' : '#e0f2fe'}; color: ${l.agency_type === 'EXTERNAL_NABL_LAB' ? '#6d28d9' : '#0369a1'};">
              ${escapeHtml(l.agency_type === 'EXTERNAL_NABL_LAB' ? 'NABL Accredited' : 'Internal Lab')}
            </span>
          </td>
          <td style="padding: 6px 8px; font-family: monospace;">${escapeHtml(l.cert_number || '-')}</td>
          <td style="padding: 6px 8px;">${escapeHtml(l.calibrated_by || '-')}</td>
          <td style="padding: 6px 8px; font-family: monospace; text-align: right;">${l.go_pitch_dia_measured ? Number(l.go_pitch_dia_measured).toFixed(3) : '-'}</td>
          <td style="padding: 6px 8px; font-family: monospace; text-align: right;">${l.nogo_pitch_dia_measured ? Number(l.nogo_pitch_dia_measured).toFixed(3) : '-'}</td>
          <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: ${resColor};">${escapeHtml(l.overall_result)}</td>
          <td style="padding: 6px 8px; text-align: center;">${String(l.next_due_date || '').slice(0, 10)}</td>
          <td style="padding: 6px 8px; color: #64748b;">${escapeHtml(l.remarks || '-')}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <!-- Top Action Bar -->
      <div style="background: #fff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-family: monospace; font-size: 18px; font-weight: 900; color: #0f172a;">${escapeHtml(gauge.gauge_control_no || 'NEW-GAUGE')}</span>
            <span style="padding: 2px 8px; font-size: 11px; font-weight: bold; border-radius: 4px; background: ${calib.color}15; color: ${calib.color}; border: 1px solid ${calib.color}40;">
              ${escapeHtml(calib.badge)}
            </span>
            ${isNewDraft ? '<span style="background: #fef08a; color: #854d0e; padding: 2px 6px; font-size: 10.5px; font-weight: bold; border-radius: 3px;">NEW DRAFT</span>' : ''}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
            ${escapeHtml(gauge.thread_size || 'Select Thread Spec')} &bull; ${escapeHtml(gauge.gauge_type || 'THREAD_PLUG_GO_NOGO').replace('THREAD_', '')}
          </div>
        </div>

        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          ${!isNewDraft ? `
            <button type="button" id="gauge-btn-print-sticker" class="invmfg-btn" style="background: #0f766e; color: #fff; font-weight: bold; padding: 6px 12px; font-size: 11px; cursor: pointer; border-radius: 4px;">🖨️ 50x25mm QR Sticker</button>
            <button type="button" id="gauge-btn-open-issue" class="invmfg-btn" style="background: #0284c7; color: #fff; font-weight: bold; padding: 6px 12px; font-size: 11px; cursor: pointer; border-radius: 4px;">📍 Issue / Transfer</button>
            <button type="button" id="gauge-btn-open-calib" class="invmfg-btn" style="background: #6d28d9; color: #fff; font-weight: bold; padding: 6px 12px; font-size: 11px; cursor: pointer; border-radius: 4px;">+ Log Calibration</button>
          ` : ''}
          <button type="button" id="gauge-btn-save-record" class="invmfg-btn" style="background: #059669; color: #fff; font-weight: bold; padding: 6px 14px; font-size: 11.5px; cursor: pointer; border-radius: 4px;">💾 Save Gauge</button>
          ${!isNewDraft ? `
            <button type="button" id="gauge-btn-delete-record" class="invmfg-btn" style="background: #fee2e2; color: #dc2626; font-weight: bold; padding: 6px 10px; font-size: 11px; cursor: pointer; border-radius: 4px; border: 1px solid #fca5a5;">🗑️ Delete</button>
          ` : ''}
        </div>
      </div>

      <!-- Live Dashboard: Wear Life & Calibration Health Cards -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
        <!-- Wear Life Card -->
        <div style="background: #fff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-weight: 800; font-size: 12px; color: #0f172a; display: flex; align-items: center; gap: 6px;">
              <span>⚡ Wear Life &amp; Strike Cycle Tracker</span>
            </div>
            <span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 3px; background: ${wear.color}15; color: ${wear.color}; border: 1px solid ${wear.color}40;">
              ${escapeHtml(wear.badge)}
            </span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
            <span style="font-size: 20px; font-weight: 900; color: #0f172a; font-family: monospace;">${wear.accumulatedCycles} <span style="font-size: 12px; font-weight: normal; color: #64748b;">/ ${wear.ratedCycles} checks</span></span>
            <span style="font-size: 14px; font-weight: 800; color: ${wear.color};">${wear.usedPct}% Used</span>
          </div>

          <div style="height: 9px; background: #e2e8f0; border-radius: 5px; overflow: hidden; margin-bottom: 10px;">
            <div style="width: ${wear.usedPct}%; height: 100%; background: ${wear.color}; border-radius: 5px; transition: width 0.3s ease;"></div>
          </div>

          <!-- Quick Strike Increment Buttons -->
          ${!isNewDraft ? `
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
              <span style="font-size: 10.5px; font-weight: bold; color: #475569;">+ Log Shopfloor Checks:</span>
              <button type="button" class="gauge-btn-inc" data-inc="50" style="padding: 3px 8px; font-size: 10.5px; font-weight: bold; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 3px; cursor: pointer;">+50</button>
              <button type="button" class="gauge-btn-inc" data-inc="100" style="padding: 3px 8px; font-size: 10.5px; font-weight: bold; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 3px; cursor: pointer;">+100</button>
              <button type="button" class="gauge-btn-inc" data-inc="250" style="padding: 3px 8px; font-size: 10.5px; font-weight: bold; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 3px; cursor: pointer;">+250</button>
              <button type="button" class="gauge-btn-inc" data-inc="500" style="padding: 3px 8px; font-size: 10.5px; font-weight: bold; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 3px; cursor: pointer;">+500</button>
            </div>
          ` : ''}
        </div>

        <!-- Calibration Status Card -->
        <div style="background: #fff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-weight: 800; font-size: 12px; color: #0f172a; display: flex; align-items: center; gap: 6px;">
              <span>📅 Calibration Due Monitor</span>
            </div>
            <span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 3px; background: ${calib.color}15; color: ${calib.color}; border: 1px solid ${calib.color}40;">
              ${escapeHtml(calib.badge)}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px;">
            <div>
              <span style="color: #64748b;">Last Calibrated:</span>
              <div style="font-weight: bold; font-size: 13px; color: #0f172a; margin-top: 1px;">${gauge.last_calib_date ? String(gauge.last_calib_date).slice(0, 10) : '-'}</div>
            </div>
            <div>
              <span style="color: #64748b;">Next Due Date:</span>
              <div style="font-weight: bold; font-size: 13px; color: ${calib.color}; margin-top: 1px;">${gauge.next_calib_due_date ? String(gauge.next_calib_due_date).slice(0, 10) : '-'}</div>
            </div>
            <div>
              <span style="color: #64748b;">Interval:</span>
              <div style="font-weight: bold; color: #0f172a;">${gauge.calib_interval_months || 6} Months</div>
            </div>
            <div>
              <span style="color: #64748b;">Total Calibrations:</span>
              <div style="font-weight: bold; color: #0f172a;">${logs.length} Records</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Specifications & Settings Form -->
      <div style="background: #fff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: bold; color: #0f172a;">Thread &amp; Metrology Parameters</h4>
          
          <!-- Preset pre-filler -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <label style="font-size: 11px; font-weight: bold; color: #475569;">Load Preset:</label>
            <select id="gauge-preset-selector" style="font-size: 11px; padding: 4px 8px; border: 1.5px solid #0f766e; border-radius: 4px; background: #f0fdfa; font-weight: bold; color: #0f766e;">
              <option value="">-- Choose Standard Thread Preset --</option>
              ${presetOptionsHtml}
            </select>
          </div>
        </div>

        <form id="gauge-detail-form" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 11.5px;">
          <input type="hidden" name="gauge_id" value="${gauge.gauge_id || ''}">

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Gauge Control # *</label>
            <input type="text" name="gauge_control_no" value="${escapeHtml(gauge.gauge_control_no || '')}" required placeholder="TG-M16-004" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace; font-weight: bold;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Gauge Type *</label>
            <select name="gauge_type" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
              <option value="THREAD_PLUG_GO_NOGO" ${gauge.gauge_type === 'THREAD_PLUG_GO_NOGO' ? 'selected' : ''}>Thread Plug (Go / No-Go)</option>
              <option value="THREAD_RING_GO" ${gauge.gauge_type === 'THREAD_RING_GO' ? 'selected' : ''}>Thread Ring (Go End)</option>
              <option value="THREAD_RING_NOGO" ${gauge.gauge_type === 'THREAD_RING_NOGO' ? 'selected' : ''}>Thread Ring (No-Go End)</option>
              <option value="PLAIN_PLUG" ${gauge.gauge_type === 'PLAIN_PLUG' ? 'selected' : ''}>Plain Pin / Plug Gauge</option>
              <option value="SNAP_GAUGE" ${gauge.gauge_type === 'SNAP_GAUGE' ? 'selected' : ''}>Snap Gauge (Caliper)</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Thread Standard *</label>
            <select name="thread_standard" id="gauge-field-standard" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
              <option value="METRIC_ISO" ${gauge.thread_standard === 'METRIC_ISO' ? 'selected' : ''}>Metric ISO (DIN 13)</option>
              <option value="BSP_BSPP" ${gauge.thread_standard === 'BSP_BSPP' ? 'selected' : ''}>BSP / BSPP (ISO 228)</option>
              <option value="NPT_TAPER" ${gauge.thread_standard === 'NPT_TAPER' ? 'selected' : ''}>NPT Taper (ASME B1.20.1)</option>
              <option value="PG_CONDUIT" ${gauge.thread_standard === 'PG_CONDUIT' ? 'selected' : ''}>PG Conduit (DIN 40430)</option>
              <option value="UN_UNF_UNEF" ${gauge.thread_standard === 'UN_UNF_UNEF' ? 'selected' : ''}>UN / UNF / UNEF</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Thread Size *</label>
            <input type="text" name="thread_size" id="gauge-field-size" value="${escapeHtml(gauge.thread_size || '')}" required placeholder="M16 x 1.5" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-weight: bold;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Class of Fit</label>
            <input type="text" name="class_of_fit" id="gauge-field-fit" value="${escapeHtml(gauge.class_of_fit || '6H')}" placeholder="6H / 6g / Class 2B" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Pitch (mm)</label>
            <input type="number" step="0.001" name="pitch_mm" id="gauge-field-pitch" value="${gauge.pitch_mm || 1.5}" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Pitch Dia Go Nominal (mm)</label>
            <input type="number" step="0.001" name="pitch_dia_go_nominal" id="gauge-field-go-dia" value="${gauge.pitch_dia_go_nominal || ''}" placeholder="15.026" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Pitch Dia NoGo Nominal (mm)</label>
            <input type="number" step="0.001" name="pitch_dia_nogo_nominal" id="gauge-field-nogo-dia" value="${gauge.pitch_dia_nogo_nominal || ''}" placeholder="15.216" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Manufacturer / Brand</label>
            <input type="text" name="manufacturer_brand" value="${escapeHtml(gauge.manufacturer_brand || 'Baker Gauges')}" placeholder="Baker / Yamawa" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Serial Number</label>
            <input type="text" name="serial_no" value="${escapeHtml(gauge.serial_no || '')}" placeholder="SN-2026-981" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Current Location / Machine</label>
            <input type="text" name="current_location" value="${escapeHtml(gauge.current_location || 'Tool Crib')}" placeholder="CNC-LATHE-01" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Issued To Operator</label>
            <input type="text" name="issued_to" value="${escapeHtml(gauge.issued_to || '')}" placeholder="Ramesh K (Operator)" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Rated Wear Life (Checks)</label>
            <input type="number" name="rated_wear_life_cycles" value="${gauge.rated_wear_life_cycles || 10000}" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Current Checks Count</label>
            <input type="number" name="accumulated_cycles" value="${gauge.accumulated_cycles || 0}" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Calib Interval (Months)</label>
            <input type="number" name="calib_interval_months" value="${gauge.calib_interval_months || 6}" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Gauge Status</label>
            <select name="gauge_status" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-weight: bold;">
              <option value="ACTIVE" ${gauge.gauge_status === 'ACTIVE' ? 'selected' : ''}>ACTIVE (Approved for Floor)</option>
              <option value="DUE_CALIBRATION" ${gauge.gauge_status === 'DUE_CALIBRATION' ? 'selected' : ''}>DUE CALIBRATION</option>
              <option value="WORN_OUT" ${gauge.gauge_status === 'WORN_OUT' ? 'selected' : ''}>WORN OUT (Out of Tolerance)</option>
              <option value="QUARANTINED" ${gauge.gauge_status === 'QUARANTINED' ? 'selected' : ''}>QUARANTINED (Under Inspection)</option>
              <option value="RE_LAPPED" ${gauge.gauge_status === 'RE_LAPPED' ? 'selected' : ''}>RE-LAPPED / RE-CERTIFIED</option>
            </select>
          </div>

          <div style="grid-column: span 4;">
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Remarks / Tool Crib Notes</label>
            <input type="text" name="remarks" value="${escapeHtml(gauge.remarks || '')}" placeholder="Notes on wear, coating (TiN), storage bin, or customer-specific fit" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>
        </form>
      </div>

      <!-- Historical Calibration Register Table -->
      <div style="background: #fff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: bold; color: #0f172a;">Calibration &amp; Metrology Inspection History (ISO / IATF Audit Trail)</h4>
          <span style="font-size: 11px; color: #64748b;">${logs.length} logged calibrations</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; font-size: 11px; color: #475569;">
              <th style="padding: 6px 8px;">Date</th>
              <th style="padding: 6px 8px;">Agency</th>
              <th style="padding: 6px 8px;">Cert #</th>
              <th style="padding: 6px 8px;">Calibrated By</th>
              <th style="padding: 6px 8px; text-align: right;">Go Dia (mm)</th>
              <th style="padding: 6px 8px; text-align: right;">NoGo Dia (mm)</th>
              <th style="padding: 6px 8px; text-align: center;">Result</th>
              <th style="padding: 6px 8px; text-align: center;">Next Due</th>
              <th style="padding: 6px 8px;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${logsRowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 14px; color: #94a3b8; font-size: 11.5px;">No calibration events logged yet. Click "+ Log Calibration" above to record one.</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    // Hook preset change listener
    const presetSelector = getEl('gauge-preset-selector');
    if (presetSelector) {
      presetSelector.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;
        const [std, sz] = val.split('|');
        const match = threadPresets.find(p => p.standard === std && p.size === sz);
        if (match) {
          getEl('gauge-field-standard').value = match.standard;
          getEl('gauge-field-size').value = match.size;
          getEl('gauge-field-fit').value = match.class_of_fit || '6H';
          getEl('gauge-field-pitch').value = match.pitch_mm || 1.5;
          getEl('gauge-field-go-dia').value = match.go_plug_dia || '';
          getEl('gauge-field-nogo-dia').value = match.nogo_plug_dia || '';
        }
      });
    }

    // Hook quick increment buttons
    container.querySelectorAll('.gauge-btn-inc').forEach(btn => {
      btn.addEventListener('click', async () => {
        const inc = Number(btn.getAttribute('data-inc')) || 100;
        await incrementCycles(gauge.gauge_id, inc);
      });
    });

    // Hook action buttons
    const btnSave = getEl('gauge-btn-save-record');
    if (btnSave) btnSave.addEventListener('click', saveGaugeFromForm);

    const btnPrint = getEl('gauge-btn-print-sticker');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.open(`/api/print?type=gauge_label&id=${gauge.gauge_id}`, '_blank', 'width=520,height=420');
      });
    }

    const btnIssue = getEl('gauge-btn-open-issue');
    if (btnIssue) btnIssue.addEventListener('click', () => openIssueDialog(gauge));

    const btnCalib = getEl('gauge-btn-open-calib');
    if (btnCalib) btnCalib.addEventListener('click', () => openCalibDialog(gauge));

    const btnDelete = getEl('gauge-btn-delete-record');
    if (btnDelete) btnDelete.addEventListener('click', () => deleteCurrentGauge(gauge));
  }

  function createNewGauge() {
    selectedGauge = {
      gauge_id: null,
      gauge_control_no: 'TG-M16-001',
      gauge_type: 'THREAD_PLUG_GO_NOGO',
      thread_standard: 'METRIC_ISO',
      thread_size: 'M16 x 1.5',
      class_of_fit: '6H',
      pitch_mm: 1.500,
      pitch_dia_go_nominal: 15.026,
      pitch_dia_nogo_nominal: 15.216,
      manufacturer_brand: 'Baker Gauges',
      serial_no: '',
      storage_location: 'Tool Crib Rack B-1',
      current_location: 'Tool Crib',
      issued_to: '',
      rated_wear_life_cycles: 10000,
      accumulated_cycles: 0,
      calib_interval_months: 6,
      last_calib_date: new Date().toISOString().slice(0, 10),
      next_calib_due_date: '',
      gauge_status: 'ACTIVE',
      remarks: '',
      wear: { usedPct: 0, accumulatedCycles: 0, ratedCycles: 10000, color: '#16a34a', badge: 'GOOD' },
      calib: { badge: 'CALIBRATED', color: '#16a34a', calibStatus: 'CURRENT', diffDays: 180 },
      calibration_history: []
    };
    renderGaugeDetail(selectedGauge);
  }

  async function saveGaugeFromForm() {
    const form = getEl('gauge-detail-form');
    if (!form) return;

    const formData = new FormData(form);
    const data = {};
    formData.forEach((val, key) => {
      data[key] = val;
    });

    if (!data.gauge_control_no) {
      alert('Please provide a Gauge Control Number (e.g. TG-M16-004)');
      return;
    }
    if (!data.thread_size) {
      alert('Please specify the Thread Size (e.g. M16 x 1.5)');
      return;
    }

    try {
      const res = await fetch('/api/gauge/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!json.ok) {
        alert('Failed to save gauge: ' + (json.message || 'Unknown error'));
        return;
      }

      await loadGaugeList(json.data.gauge_id);
    } catch (err) {
      console.error('Save gauge error:', err);
      alert('Network error while saving gauge: ' + err.message);
    }
  }

  async function incrementCycles(gaugeId, increment) {
    try {
      const res = await fetch('/api/gauge/increment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gauge_id: gaugeId, increment })
      });
      const json = await res.json();
      if (json.ok) {
        selectedGauge = json.data;
        renderGaugeDetail(selectedGauge);
        loadGaugeList(selectedGauge.gauge_id);
      } else {
        alert('Failed to update cycles: ' + (json.message || ''));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  async function deleteCurrentGauge(gauge) {
    if (!confirm(`Are you sure you want to delete gauge ${gauge.gauge_control_no}? This will also remove its calibration history.`)) {
      return;
    }
    try {
      const res = await fetch('/api/gauge/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gauge.gauge_id })
      });
      const json = await res.json();
      if (json.ok) {
        selectedGauge = null;
        await loadGaugeList();
      } else {
        alert('Failed to delete gauge: ' + (json.message || ''));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  function openIssueDialog(gauge) {
    const modal = getEl('gauge-issue-modal');
    if (!modal) return;
    getEl('gauge-issue-ctrl-no').textContent = gauge.gauge_control_no;
    getEl('gauge-issue-location').value = gauge.current_location || 'CNC-LATHE-01';
    getEl('gauge-issue-operator').value = gauge.issued_to || '';
    modal.hidden = false;
    modal.style.display = 'flex';
  }

  function closeIssueDialog() {
    const modal = getEl('gauge-issue-modal');
    if (modal) {
      modal.hidden = true;
      modal.style.display = 'none';
    }
  }

  async function submitIssueForm() {
    if (!selectedGauge) return;
    const location = getEl('gauge-issue-location').value.trim();
    const issuedTo = getEl('gauge-issue-operator').value.trim();

    try {
      const res = await fetch('/api/gauge/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gauge_id: selectedGauge.gauge_id,
          location,
          issued_to: issuedTo
        })
      });
      const json = await res.json();
      if (json.ok) {
        closeIssueDialog();
        selectedGauge = json.data;
        renderGaugeDetail(selectedGauge);
        loadGaugeList(selectedGauge.gauge_id);
      } else {
        alert('Failed to update issuance: ' + (json.message || ''));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  function openCalibDialog(gauge) {
    const modal = getEl('gauge-calib-modal');
    if (!modal) return;

    getEl('calib-modal-ctrl-no').textContent = gauge.gauge_control_no;
    getEl('calib-modal-date').value = new Date().toISOString().slice(0, 10);
    getEl('calib-modal-cert').value = '';
    getEl('calib-modal-agency').value = 'INTERNAL_LAB';
    getEl('calib-modal-by').value = 'Quality Metrology Lab';
    getEl('calib-modal-go-dia').value = gauge.pitch_dia_go_nominal || '';
    getEl('calib-modal-nogo-dia').value = gauge.pitch_dia_nogo_nominal || '';
    getEl('calib-modal-result').value = 'PASS';

    // Calculate default next due date
    const next = new Date();
    next.setMonth(next.getMonth() + (Number(gauge.calib_interval_months) || 6));
    getEl('calib-modal-next-due').value = next.toISOString().slice(0, 10);
    getEl('calib-modal-reset-cycles').checked = false;
    getEl('calib-modal-remarks').value = '';

    modal.hidden = false;
    modal.style.display = 'flex';
  }

  function closeCalibDialog() {
    const modal = getEl('gauge-calib-modal');
    if (modal) {
      modal.hidden = true;
      modal.style.display = 'none';
    }
  }

  async function submitCalibForm() {
    if (!selectedGauge) return;
    const calibDate = getEl('calib-modal-date').value;
    const nextDueDate = getEl('calib-modal-next-due').value;
    if (!calibDate || !nextDueDate) {
      alert('Please provide both Calibration Date and Next Due Date');
      return;
    }

    const payload = {
      gauge_id: selectedGauge.gauge_id,
      calib_date: calibDate,
      next_due_date: nextDueDate,
      agency_type: getEl('calib-modal-agency').value,
      cert_number: getEl('calib-modal-cert').value.trim(),
      calibrated_by: getEl('calib-modal-by').value.trim(),
      go_pitch_dia_measured: Number(getEl('calib-modal-go-dia').value) || null,
      nogo_pitch_dia_measured: Number(getEl('calib-modal-nogo-dia').value) || null,
      overall_result: getEl('calib-modal-result').value,
      reset_cycles: getEl('calib-modal-reset-cycles').checked,
      cycles_at_calib: selectedGauge.accumulated_cycles || 0,
      remarks: getEl('calib-modal-remarks').value.trim()
    };

    try {
      const res = await fetch('/api/gauge/log-calib', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.ok) {
        closeCalibDialog();
        selectedGauge = json.data;
        renderGaugeDetail(selectedGauge);
        loadGaugeList(selectedGauge.gauge_id);
      } else {
        alert('Failed to log calibration: ' + (json.message || ''));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  // Initialize event listeners when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    const closeX = getEl('gauge-hub-close-x');
    const btnClose = getEl('gauge-btn-close');
    if (closeX) closeX.addEventListener('click', window.closeGaugeHub);
    if (btnClose) btnClose.addEventListener('click', window.closeGaugeHub);

    const btnNew = getEl('gauge-btn-new');
    if (btnNew) btnNew.addEventListener('click', createNewGauge);

    const btnSearch = getEl('gauge-btn-search');
    const searchInput = getEl('gauge-search-input');
    if (btnSearch) btnSearch.addEventListener('click', () => loadGaugeList());
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          loadGaugeList();
        }
      });
    }

    // Filter tabs for Standards
    document.querySelectorAll('.gauge-filter-std').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.gauge-filter-std').forEach(t => {
          t.style.background = '#fff';
          t.style.color = '#334155';
        });
        tab.style.background = '#0f766e';
        tab.style.color = '#fff';
        activeFilterStandard = tab.getAttribute('data-std');
        loadGaugeList();
      });
    });

    // Filter tabs for Status
    document.querySelectorAll('.gauge-filter-status').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.gauge-filter-status').forEach(t => {
          t.style.background = '#fff';
          t.style.color = '#334155';
        });
        tab.style.background = '#0f766e';
        tab.style.color = '#fff';
        activeFilterStatus = tab.getAttribute('data-status');
        loadGaugeList();
      });
    });

    // Master schedule print button
    const btnMasterSched = getEl('gauge-btn-master-schedule');
    if (btnMasterSched) {
      btnMasterSched.addEventListener('click', () => {
        window.open('/api/print?type=gauge_schedule', '_blank', 'width=1000,height=750');
      });
    }

    // Issue modal buttons & backdrop
    const btnCloseIssue = getEl('gauge-issue-close');
    const closeXIssue = getEl('gauge-issue-close-x');
    const btnSubmitIssue = getEl('gauge-issue-submit');
    const modalIssue = getEl('gauge-issue-modal');
    if (btnCloseIssue) btnCloseIssue.addEventListener('click', closeIssueDialog);
    if (closeXIssue) closeXIssue.addEventListener('click', closeIssueDialog);
    if (btnSubmitIssue) btnSubmitIssue.addEventListener('click', submitIssueForm);
    if (modalIssue) {
      modalIssue.addEventListener('click', (e) => {
        if (e.target === modalIssue) closeIssueDialog();
      });
    }

    // Calib modal buttons & backdrop
    const btnCloseCalib = getEl('calib-modal-close');
    const closeXCalib = getEl('calib-modal-close-x');
    const btnSubmitCalib = getEl('calib-modal-submit');
    const modalCalib = getEl('gauge-calib-modal');
    if (btnCloseCalib) btnCloseCalib.addEventListener('click', closeCalibDialog);
    if (closeXCalib) closeXCalib.addEventListener('click', closeCalibDialog);
    if (btnSubmitCalib) btnSubmitCalib.addEventListener('click', submitCalibForm);
    if (modalCalib) {
      modalCalib.addEventListener('click', (e) => {
        if (e.target === modalCalib) closeCalibDialog();
      });
    }
  });

  window.closeIssueDialog = closeIssueDialog;
  window.closeCalibDialog = closeCalibDialog;

})();
