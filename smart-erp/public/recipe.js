/**
 * SMART ERP - CNC & Traub Machine Setup & Tooling Recipe Card
 * Repeat Order Tooling & Machine Setup Master for Jamnagar Precision Brass
 */

(function () {
  'use strict';

  let currentRecipes = [];
  let selectedRecipe = null;
  let recipePresets = [];
  let availableItems = [];
  let availableMachines = [];
  let activeFilterCategory = 'ALL';

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  function getEl(id) {
    return document.getElementById(id);
  }

  async function fetchPresets() {
    if (recipePresets.length > 0) return recipePresets;
    try {
      const res = await fetch('/api/recipe/presets');
      const json = await res.json();
      if (json.ok && Array.isArray(json.presets)) {
        recipePresets = json.presets;
      }
    } catch (err) {
      console.error('Failed to load recipe presets:', err);
    }
    return recipePresets;
  }

  async function fetchItemsAndMachines() {
    if (availableItems.length > 0) return;
    try {
      const res = await fetch('/api/recipe/items');
      const json = await res.json();
      if (json.ok) {
        availableItems = json.items || [];
        availableMachines = json.machines || [];
      }
    } catch (err) {
      console.error('Failed to load items/machines:', err);
    }
  }

  window.openRecipeHub = async function (recipeIdToSelect) {
    const hub = getEl('recipe-hub');
    if (!hub) return;
    hub.hidden = false;
    hub.style.display = 'flex';

    await fetchPresets();
    await fetchItemsAndMachines();
    await loadRecipeList(recipeIdToSelect);
  };

  window.closeRecipeHub = function () {
    const hub = getEl('recipe-hub');
    if (hub) {
      hub.hidden = true;
      hub.style.display = 'none';
    }
  };

  async function loadRecipeList(selectRecipeId) {
    const listContainer = getEl('recipe-list-container');
    const badge = getEl('recipe-count-badge');
    const q = (getEl('recipe-search-input') ? getEl('recipe-search-input').value : '').trim();

    if (listContainer) {
      listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">Loading recipes...</div>';
    }

    try {
      const url = `/api/recipe/list?q=${encodeURIComponent(q)}&category=${encodeURIComponent(activeFilterCategory)}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!json.ok) {
        if (listContainer) listContainer.innerHTML = `<div style="padding: 16px; color: #dc2626; font-size: 12px;">Failed to load: ${escapeHtml(json.message)}</div>`;
        return;
      }

      currentRecipes = json.data || [];
      if (badge) badge.textContent = `${currentRecipes.length} recipes`;

      if (currentRecipes.length === 0) {
        if (listContainer) {
          listContainer.innerHTML = `
            <div style="padding: 30px 16px; text-align: center; color: #94a3b8; font-size: 12px;">
              No setup recipes found.<br>Click <strong>+ New Recipe</strong> above to create one.
            </div>
          `;
        }
        if (!selectRecipeId) createNewRecipe();
        return;
      }

      renderRecipeList(currentRecipes, selectRecipeId);

      // Auto-select first or requested
      const target = selectRecipeId
        ? currentRecipes.find(r => r.recipe_id === Number(selectRecipeId))
        : currentRecipes[0];

      if (target) {
        selectRecipe(target.recipe_id);
      }
    } catch (err) {
      console.error('Failed to load recipe list:', err);
      if (listContainer) {
        listContainer.innerHTML = `<div style="padding: 16px; color: #dc2626; font-size: 12px;">Network error: ${escapeHtml(err.message)}</div>`;
      }
    }
  }

  function renderRecipeList(recipes, selectedId) {
    const container = getEl('recipe-list-container');
    if (!container) return;

    container.innerHTML = recipes.map(r => {
      const isSelected = selectedId && r.recipe_id === Number(selectedId);
      const border = isSelected ? '1.5px solid #0f766e' : '1.5px solid #e2e8f0';
      const bg = isSelected ? '#f0fdfa' : '#ffffff';
      const catColor = r.machine_category === 'CNC_TURNING' ? '#0369a1' : (r.machine_category === 'TRAUB_AUTOMAT' ? '#b45309' : '#059669');
      const catBg = r.machine_category === 'CNC_TURNING' ? '#e0f2fe' : (r.machine_category === 'TRAUB_AUTOMAT' ? '#fef3c7' : '#dcfce7');

      return `
        <div class="recipe-card-item" data-id="${r.recipe_id}" style="
          padding: 10px 12px; margin-bottom: 6px; background: ${bg}; border: ${border};
          border-radius: 6px; cursor: pointer; transition: all 0.15s ease;
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div style="font-family: monospace; font-weight: 800; font-size: 13px; color: #0f172a;">${escapeHtml(r.recipe_code)}</div>
            <span style="font-size: 9.5px; font-weight: bold; padding: 1px 6px; border-radius: 3px; background: ${catBg}; color: ${catColor};">
              ${escapeHtml(r.machine_category.replace('_', ' '))}
            </span>
          </div>

          <div style="font-weight: bold; font-size: 12px; color: #334155; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHtml(r.item_name)}
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-top: 4px;">
            <span>Collet: <strong style="color: #0f172a;">${escapeHtml(r.collet_spec)}</strong></span>
            <span>Cycle: <strong style="color: #0f766e;">${r.cycle_time_seconds}s</strong></span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 10.5px; color: #94a3b8; margin-top: 2px;">
            <span>Machine: ${escapeHtml(r.mach_name)}</span>
            <span>${r.metrics ? `${r.metrics.shiftTarget} pcs/shift` : ''}</span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.recipe-card-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = Number(el.getAttribute('data-id'));
        if (id) selectRecipe(id);
      });
    });
  }

  async function selectRecipe(recipeId) {
    const detailContainer = getEl('recipe-detail-container');
    if (!detailContainer) return;

    detailContainer.innerHTML = '<div style="padding: 30px; text-align: center; color: #64748b; font-size: 13px;">Loading recipe details...</div>';

    try {
      const res = await fetch(`/api/recipe/get?id=${recipeId}`);
      const json = await res.json();
      if (!json.ok || !json.data) {
        detailContainer.innerHTML = `<div style="padding: 20px; color: #dc2626;">Error: ${escapeHtml(json.message || 'Recipe not found')}</div>`;
        return;
      }

      selectedRecipe = json.data;
      renderRecipeDetail(selectedRecipe);

      // Re-highlight list item
      const container = getEl('recipe-list-container');
      if (container) {
        container.querySelectorAll('.recipe-card-item').forEach(el => {
          const isSelected = Number(el.getAttribute('data-id')) === recipeId;
          el.style.border = isSelected ? '1.5px solid #0f766e' : '1.5px solid #e2e8f0';
          el.style.background = isSelected ? '#f0fdfa' : '#ffffff';
        });
      }
    } catch (err) {
      console.error('Failed to fetch recipe detail:', err);
      detailContainer.innerHTML = `<div style="padding: 20px; color: #dc2626;">Network error: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderRecipeDetail(recipe) {
    const container = getEl('recipe-detail-container');
    if (!container) return;

    const isNewDraft = !recipe.recipe_id;
    const metrics = recipe.metrics || { grossPerHour: Math.round(3600 / (recipe.cycle_time_seconds || 14)), shiftTarget: 1787, dailyTarget: 5361 };
    const stations = Array.isArray(recipe.tooling_layout)
      ? recipe.tooling_layout
      : (typeof recipe.tooling_layout === 'string' ? JSON.parse(recipe.tooling_layout || '[]') : []);

    const presetOptionsHtml = recipePresets.map(p => `
      <option value="${escapeHtml(p.presetId)}">${escapeHtml(p.name)}</option>
    `).join('');

    const itemOptionsHtml = availableItems.map(it => `
      <option value="${escapeHtml(it.item_code)}|${escapeHtml(it.item_name)}|${escapeHtml(it.drg_no || '')}|${it.cycle_time || ''}">
        ${escapeHtml(it.item_code)} - ${escapeHtml(it.item_name)}
      </option>
    `).join('');

    const stationRowsHtml = stations.map((st, idx) => `
      <tr class="recipe-station-row" style="border-bottom: 1px solid #cbd5e1; font-size: 11px;">
        <td style="padding: 5px 6px;">
          <input type="text" class="st-station" value="${escapeHtml(st.station || `T0${idx + 1}`)}" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace; font-weight: bold; text-align: center;">
        </td>
        <td style="padding: 5px 6px;">
          <input type="text" class="st-op" value="${escapeHtml(st.operation || '')}" placeholder="e.g. Facing & OD Roughing" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px;">
        </td>
        <td style="padding: 5px 6px;">
          <input type="text" class="st-holder" value="${escapeHtml(st.holder || '')}" placeholder="e.g. PCLNR 2020K12" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace;">
        </td>
        <td style="padding: 5px 6px;">
          <input type="text" class="st-insert" value="${escapeHtml(st.insert_spec || '')}" placeholder="e.g. CNMG 120404-SM" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace; font-weight: bold; color: #0369a1;">
        </td>
        <td style="padding: 5px 6px;">
          <input type="text" class="st-grade" value="${escapeHtml(st.grade || '')}" placeholder="e.g. Polished Carbide (Brass)" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px;">
        </td>
        <td style="padding: 5px 6px;">
          <input type="text" class="st-notes" value="${escapeHtml(st.notes || '')}" placeholder="e.g. DOC 1.2mm, CSS 240m/min" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px;">
        </td>
        <td style="padding: 5px 6px; text-align: center;">
          <button type="button" class="btn-del-station" style="background: transparent; border: none; color: #dc2626; font-size: 14px; cursor: pointer; padding: 2px 4px;" title="Delete Station">✕</button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <!-- Top Action Bar -->
      <div style="background: #fff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-family: monospace; font-size: 18px; font-weight: 900; color: #0f172a;">${escapeHtml(recipe.recipe_code || 'NEW-RECIPE')}</span>
            <span style="padding: 2px 8px; font-size: 11px; font-weight: bold; border-radius: 4px; background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc;">
              ${escapeHtml(recipe.machine_category.replace('_', ' '))}
            </span>
            ${isNewDraft ? '<span style="background: #fef08a; color: #854d0e; padding: 2px 6px; font-size: 10.5px; font-weight: bold; border-radius: 3px;">NEW DRAFT</span>' : ''}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
            ${escapeHtml(recipe.item_name || 'Select Item')} &bull; ${escapeHtml(recipe.item_code || '-')} &bull; Drg: ${escapeHtml(recipe.drg_no || 'REV-01')}
          </div>
        </div>

        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          ${!isNewDraft ? `
            <button type="button" id="recipe-btn-print-sheet" class="invmfg-btn" style="background: #0f766e; color: #fff; font-weight: bold; padding: 6px 12px; font-size: 11px; cursor: pointer; border-radius: 4px;">Print Setup Sheet (A4)</button>
          ` : ''}
          <button type="button" id="recipe-btn-save-record" class="invmfg-btn" style="background: #059669; color: #fff; font-weight: bold; padding: 6px 14px; font-size: 11.5px; cursor: pointer; border-radius: 4px;">Save Recipe</button>
          ${!isNewDraft ? `
            <button type="button" id="recipe-btn-delete-record" class="invmfg-btn" style="background: #fee2e2; color: #dc2626; font-weight: bold; padding: 6px 10px; font-size: 11px; cursor: pointer; border-radius: 4px; border: 1px solid #fca5a5;">Delete</button>
          ` : ''}
        </div>
      </div>

      <!-- Live Capacity Benchmark Card -->
      <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1.5px solid #86efac; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          
          <div>
            <div style="font-weight: 800; font-size: 13px; color: #166534;">PRODUCTION BENCHMARK &amp; SHIFT CAPACITY</div>
            <div style="font-size: 11px; color: #15803d;">Calculated at 90% OEE &bull; Jamnagar Brass Turning Standard</div>
          </div>
        </div>

        <div style="display: flex; gap: 16px; align-items: center; font-family: monospace;">
          <div style="text-align: center;">
            <div style="font-size: 10.5px; color: #166534; font-weight: bold;">CYCLE TIME</div>
            <div id="metric-cycle-time" style="font-size: 18px; font-weight: 900; color: #0f172a;">${recipe.cycle_time_seconds}s</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 10.5px; color: #166534; font-weight: bold;">GROSS / HR</div>
            <div id="metric-gross-hr" style="font-size: 18px; font-weight: 900; color: #0f172a;">${metrics.grossPerHour} pcs</div>
          </div>
          <div style="text-align: center; background: #fff; padding: 4px 10px; border-radius: 6px; border: 1px solid #86efac;">
            <div style="font-size: 10.5px; color: #166534; font-weight: bold;">8-HR SHIFT TARGET</div>
            <div id="metric-shift-target" style="font-size: 20px; font-weight: 900; color: #15803d;">${metrics.shiftTarget.toLocaleString()} pcs</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 10.5px; color: #166534; font-weight: bold;">24-HR CAPACITY</div>
            <div id="metric-daily-target" style="font-size: 18px; font-weight: 900; color: #0f172a;">${metrics.dailyTarget.toLocaleString()} pcs</div>
          </div>
        </div>
      </div>

      <!-- Specifications & Settings Form -->
      <div style="background: #fff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: bold; color: #0f172a;">Machine Setup &amp; Holding Parameters</h4>
          
          <!-- Preset pre-filler -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <label style="font-size: 11px; font-weight: bold; color: #475569;">Load Preset:</label>
            <select id="recipe-preset-selector" style="font-size: 11px; padding: 4px 8px; border: 1.5px solid #0f766e; border-radius: 4px; background: #f0fdfa; font-weight: bold; color: #0f766e;">
              <option value="">-- Choose Standard Tooling Preset --</option>
              ${presetOptionsHtml}
            </select>
          </div>
        </div>

        <form id="recipe-detail-form" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 11.5px;">
          <input type="hidden" name="recipe_id" value="${recipe.recipe_id || ''}">

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Recipe Code *</label>
            <input type="text" name="recipe_code" value="${escapeHtml(recipe.recipe_code || '')}" required placeholder="RCP-B1-VALVE-01" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace; font-weight: bold;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Quick Select Item Master</label>
            <select id="recipe-item-selector" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
              <option value="">-- Choose Item from Master --</option>
              ${itemOptionsHtml}
            </select>
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Item Code *</label>
            <input type="text" name="item_code" id="f-item-code" value="${escapeHtml(recipe.item_code || '')}" required placeholder="B1-VALVE-BODY" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Component Name *</label>
            <input type="text" name="item_name" id="f-item-name" value="${escapeHtml(recipe.item_name || '')}" required placeholder="Precision Brass Valve Body" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Drawing Revision #</label>
            <input type="text" name="drg_no" id="f-drg-no" value="${escapeHtml(recipe.drg_no || 'REV-01')}" placeholder="REV-01" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Machine Category *</label>
            <select name="machine_category" id="f-machine-category" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-weight: bold;">
              <option value="CNC_TURNING" ${recipe.machine_category === 'CNC_TURNING' ? 'selected' : ''}>CNC Turning Center</option>
              <option value="TRAUB_AUTOMAT" ${recipe.machine_category === 'TRAUB_AUTOMAT' ? 'selected' : ''}>Traub Automat (Cam-Driven)</option>
              <option value="CAPSTAN_LATHE" ${recipe.machine_category === 'CAPSTAN_LATHE' ? 'selected' : ''}>Capstan / Turret Lathe</option>
              <option value="FORGING_PRESS" ${recipe.machine_category === 'FORGING_PRESS' ? 'selected' : ''}>Hot Brass Forging Press</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Machine Name / ID *</label>
            <input type="text" name="mach_name" value="${escapeHtml(recipe.mach_name || 'CNC-01 (JYOTI DX-200 3A)')}" required placeholder="CNC-01 (JYOTI DX-200 3A)" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Controller Type</label>
            <input type="text" name="controller_type" id="f-controller-type" value="${escapeHtml(recipe.controller_type || 'Fanuc 0i-TF')}" placeholder="Fanuc 0i-TF or Mechanical Cam" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Collet / Holding Spec *</label>
            <input type="text" name="collet_spec" id="f-collet-spec" value="${escapeHtml(recipe.collet_spec || 'Hex 19mm (Collet 173E)')}" required placeholder="e.g. Hex 19mm (Collet 173E)" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-weight: bold; color: #b45309;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Bar Feeder Stopper (mm)</label>
            <input type="number" step="0.1" name="bar_feeder_stop_mm" value="${recipe.bar_feeder_stop_mm || 38.5}" placeholder="38.5" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Raw Material Alloy Grade</label>
            <select name="raw_material_grade" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
              <option value="CW617N" ${recipe.raw_material_grade === 'CW617N' ? 'selected' : ''}>CW617N (CuZn40Pb2)</option>
              <option value="IS 319 Gr 1" ${recipe.raw_material_grade === 'IS 319 Gr 1' ? 'selected' : ''}>IS 319 Gr 1 (Free Cutting)</option>
              <option value="CW614N" ${recipe.raw_material_grade === 'CW614N' ? 'selected' : ''}>CW614N (CuZn39Pb3)</option>
              <option value="C36000" ${recipe.raw_material_grade === 'C36000' ? 'selected' : ''}>C36000 (CDA 360)</option>
              <option value="Lead-Free Brass" ${recipe.raw_material_grade === 'Lead-Free Brass' ? 'selected' : ''}>Lead-Free Brass (ECO Brass)</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Bar Shape &amp; Size</label>
            <div style="display: flex; gap: 6px;">
              <select name="raw_bar_shape" style="width: 45%; box-sizing: border-box; padding: 5px 6px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
                <option value="HEX" ${recipe.raw_bar_shape === 'HEX' ? 'selected' : ''}>HEX</option>
                <option value="ROUND" ${recipe.raw_bar_shape === 'ROUND' ? 'selected' : ''}>ROUND</option>
                <option value="SQUARE" ${recipe.raw_bar_shape === 'SQUARE' ? 'selected' : ''}>SQUARE</option>
              </select>
              <input type="text" name="raw_bar_size" value="${escapeHtml(recipe.raw_bar_size || '19mm Hex')}" placeholder="19mm Hex" style="width: 55%; box-sizing: border-box; padding: 5px 6px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
            </div>
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">CNC Program #</label>
            <input type="text" name="cnc_program_no" value="${escapeHtml(recipe.cnc_program_no || 'O1042')}" placeholder="O1042" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace; font-weight: bold; color: #6d28d9;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Cycle Time (Seconds) *</label>
            <input type="number" step="0.1" name="cycle_time_seconds" id="f-cycle-time" value="${recipe.cycle_time_seconds || 14.0}" required placeholder="14.0" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #0f766e; border-radius: 4px; font-family: monospace; font-weight: bold; color: #0f766e; font-size: 13px;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Setup Time (Minutes)</label>
            <input type="number" step="5" name="setup_time_mins" value="${recipe.setup_time_mins || 45}" placeholder="45" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Spindle Speed (RPM)</label>
            <input type="number" name="spindle_rpm" value="${recipe.spindle_rpm || 3200}" placeholder="3200" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Cutting Feed (mm/rev)</label>
            <input type="number" step="0.01" name="cutting_feed" value="${recipe.cutting_feed || 0.08}" placeholder="0.08" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Coolant Type</label>
            <select name="coolant_type" id="f-coolant-type" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
              <option value="SOLUBLE_OIL_5PCT" ${recipe.coolant_type === 'SOLUBLE_OIL_5PCT' ? 'selected' : ''}>Soluble Oil 5% Emulsion</option>
              <option value="NEAT_CUTTING_OIL" ${recipe.coolant_type === 'NEAT_CUTTING_OIL' ? 'selected' : ''}>Neat Cutting Oil (Chlorinated/Sulfurized)</option>
              <option value="AIR_BLAST" ${recipe.coolant_type === 'AIR_BLAST' ? 'selected' : ''}>Compressed Air Blast</option>
              <option value="DRY" ${recipe.coolant_type === 'DRY' ? 'selected' : ''}>Dry Machining</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Parting Blade Width (mm)</label>
            <input type="number" step="0.1" name="parting_blade_width_mm" id="f-parting-width" value="${recipe.parting_blade_width_mm || 2.0}" placeholder="2.0" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
          </div>

          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Approved Tool Setter</label>
            <input type="text" name="approved_by_setter" value="${escapeHtml(recipe.approved_by_setter || 'Ramesh K (Senior Setter)')}" placeholder="e.g. Ramesh K" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div style="grid-column: span 2;">
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Traub Cam Profile / Gear Ratio (if Automat)</label>
            <div style="display: flex; gap: 6px;">
              <input type="text" name="traub_cam_profile" id="f-traub-cam" value="${escapeHtml(recipe.traub_cam_profile || '')}" placeholder="e.g. Turning Cam 38mm / 120°" style="width: 60%; box-sizing: border-box; padding: 5px 6px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
              <input type="text" name="traub_gear_ratio" id="f-traub-gear" value="${escapeHtml(recipe.traub_gear_ratio || '')}" placeholder="e.g. 32T / 48T" style="width: 40%; box-sizing: border-box; padding: 5px 6px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
            </div>
          </div>

          <div style="grid-column: span 2;">
            <label style="display: block; font-weight: bold; margin-bottom: 3px; color: #334155;">Mandatory Quality Checks &amp; Thread Gauge Ref</label>
            <input type="text" name="qc_critical_dimensions" value="${escapeHtml(recipe.qc_critical_dimensions || '')}" placeholder="e.g. Verify M16x1.5 with Ring Gauge TG-M16-004; Bore finish Ra 0.8" style="width: 100%; box-sizing: border-box; padding: 5px 8px; border: 1.5px solid #cbd5e1; border-radius: 4px;">
          </div>
        </form>
      </div>

      <!-- Tooling Stations Layout Table -->
      <div style="background: #fff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div>
            <h4 style="margin: 0; font-size: 13px; font-weight: bold; color: #0f172a;">Tooling Station Layout &amp; Inserts</h4>
            <div style="font-size: 11px; color: #64748b;">Specify turret stations (T01-T08) or Traub cross slides with exact carbide grades and insert geometries.</div>
          </div>
          <button type="button" id="recipe-btn-add-station" style="background: #334155; color: #fff; font-size: 11px; font-weight: bold; padding: 5px 12px; border: none; border-radius: 4px; cursor: pointer;">+ Add Tool Station</button>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; font-size: 11px; color: #334155;">
              <th style="padding: 6px; width: 8%; text-align: center;">Station</th>
              <th style="padding: 6px; width: 22%;">Operation</th>
              <th style="padding: 6px; width: 18%;">Tool Holder / Bar</th>
              <th style="padding: 6px; width: 18%;">Insert / Tool Spec</th>
              <th style="padding: 6px; width: 16%;">Carbide Grade</th>
              <th style="padding: 6px; width: 15%;">Machining Notes</th>
              <th style="padding: 6px; width: 3%; text-align: center;"></th>
            </tr>
          </thead>
          <tbody id="recipe-stations-tbody">
            ${stationRowsHtml}
          </tbody>
        </table>
      </div>
    `;

    // Hook events
    wireDetailEvents(recipe);
  }

  function wireDetailEvents(recipe) {
    // Save button
    const btnSave = getEl('recipe-btn-save-record');
    if (btnSave) btnSave.addEventListener('click', saveRecipeFromForm);

    // Delete button
    const btnDelete = getEl('recipe-btn-delete-record');
    if (btnDelete) btnDelete.addEventListener('click', () => deleteCurrentRecipe(recipe));

    // Print setup sheet button
    const btnPrint = getEl('recipe-btn-print-sheet');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.open(`/api/print?type=setup_sheet&id=${recipe.recipe_id}`, '_blank', 'width=1000,height=800');
      });
    }

    // Dynamic Capacity recalculation on cycle time input
    const ctInput = getEl('f-cycle-time');
    if (ctInput) {
      ctInput.addEventListener('input', () => {
        const ct = Math.max(0.1, Number(ctInput.value) || 14);
        const gross = Math.round(3600 / ct);
        const shift = Math.floor((8 * 3600 / ct) * 0.90);
        const daily = shift * 3;

        if (getEl('metric-cycle-time')) getEl('metric-cycle-time').textContent = `${ct}s`;
        if (getEl('metric-gross-hr')) getEl('metric-gross-hr').textContent = `${gross} pcs`;
        if (getEl('metric-shift-target')) getEl('metric-shift-target').textContent = `${shift.toLocaleString()} pcs`;
        if (getEl('metric-daily-target')) getEl('metric-daily-target').textContent = `${daily.toLocaleString()} pcs`;
      });
    }

    // Item quick selector
    const itemSel = getEl('recipe-item-selector');
    if (itemSel) {
      itemSel.addEventListener('change', () => {
        if (!itemSel.value) return;
        const [code, name, drg, ct] = itemSel.value.split('|');
        if (getEl('f-item-code')) getEl('f-item-code').value = code || '';
        if (getEl('f-item-name')) getEl('f-item-name').value = name || '';
        if (getEl('f-drg-no')) getEl('f-drg-no').value = drg || 'REV-01';
        if (ct && Number(ct) > 0 && getEl('f-cycle-time')) {
          getEl('f-cycle-time').value = ct;
          ctInput.dispatchEvent(new Event('input'));
        }
      });
    }

    // Preset selector
    const presetSel = getEl('recipe-preset-selector');
    if (presetSel) {
      presetSel.addEventListener('change', () => {
        const pId = presetSel.value;
        const preset = recipePresets.find(p => p.presetId === pId);
        if (!preset) return;

        if (preset.machineCategory && getEl('f-machine-category')) getEl('f-machine-category').value = preset.machineCategory;
        if (preset.colletSpec && getEl('f-collet-spec')) getEl('f-collet-spec').value = preset.colletSpec;
        if (preset.controllerType && getEl('f-controller-type')) getEl('f-controller-type').value = preset.controllerType;
        if (preset.coolantType && getEl('f-coolant-type')) getEl('f-coolant-type').value = preset.coolantType;
        if (preset.partingBladeWidthMm && getEl('f-parting-width')) getEl('f-parting-width').value = preset.partingBladeWidthMm;
        if (preset.cycleTimeSeconds && getEl('f-cycle-time')) {
          getEl('f-cycle-time').value = preset.cycleTimeSeconds;
          ctInput.dispatchEvent(new Event('input'));
        }
        if (preset.traubCamProfile && getEl('f-traub-cam')) getEl('f-traub-cam').value = preset.traubCamProfile;
        if (preset.traubGearRatio && getEl('f-traub-gear')) getEl('f-traub-gear').value = preset.traubGearRatio;

        // Populate stations table
        const tbody = getEl('recipe-stations-tbody');
        if (tbody && Array.isArray(preset.stations)) {
          tbody.innerHTML = preset.stations.map((st, idx) => `
            <tr class="recipe-station-row" style="border-bottom: 1px solid #cbd5e1; font-size: 11px;">
              <td style="padding: 5px 6px;">
                <input type="text" class="st-station" value="${escapeHtml(st.station || `T0${idx + 1}`)}" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace; font-weight: bold; text-align: center;">
              </td>
              <td style="padding: 5px 6px;">
                <input type="text" class="st-op" value="${escapeHtml(st.operation || '')}" placeholder="e.g. Facing & OD Roughing" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px;">
              </td>
              <td style="padding: 5px 6px;">
                <input type="text" class="st-holder" value="${escapeHtml(st.holder || '')}" placeholder="e.g. PCLNR 2020K12" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace;">
              </td>
              <td style="padding: 5px 6px;">
                <input type="text" class="st-insert" value="${escapeHtml(st.insert_spec || '')}" placeholder="e.g. CNMG 120404-SM" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace; font-weight: bold; color: #0369a1;">
              </td>
              <td style="padding: 5px 6px;">
                <input type="text" class="st-grade" value="${escapeHtml(st.grade || '')}" placeholder="e.g. Polished Carbide (Brass)" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px;">
              </td>
              <td style="padding: 5px 6px;">
                <input type="text" class="st-notes" value="${escapeHtml(st.notes || '')}" placeholder="e.g. DOC 1.2mm, CSS 240m/min" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px;">
              </td>
              <td style="padding: 5px 6px; text-align: center;">
                <button type="button" class="btn-del-station" style="background: transparent; border: none; color: #dc2626; font-size: 14px; cursor: pointer; padding: 2px 4px;" title="Delete Station">✕</button>
              </td>
            </tr>
          `).join('');
          wireStationDeleteButtons();
        }
      });
    }

    // Add Station button
    const btnAddStation = getEl('recipe-btn-add-station');
    if (btnAddStation) {
      btnAddStation.addEventListener('click', () => {
        const tbody = getEl('recipe-stations-tbody');
        if (!tbody) return;
        const currentCount = tbody.querySelectorAll('.recipe-station-row').length;
        const newRow = document.createElement('tr');
        newRow.className = 'recipe-station-row';
        newRow.style.borderBottom = '1px solid #cbd5e1';
        newRow.style.fontSize = '11px';
        newRow.innerHTML = `
          <td style="padding: 5px 6px;">
            <input type="text" class="st-station" value="T0${currentCount + 1}" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace; font-weight: bold; text-align: center;">
          </td>
          <td style="padding: 5px 6px;">
            <input type="text" class="st-op" placeholder="e.g. Profiling" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px;">
          </td>
          <td style="padding: 5px 6px;">
            <input type="text" class="st-holder" placeholder="e.g. SVJCR 2020K16" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace;">
          </td>
          <td style="padding: 5px 6px;">
            <input type="text" class="st-insert" placeholder="e.g. VCMT 160404-NN" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px; font-family: monospace; font-weight: bold; color: #0369a1;">
          </td>
          <td style="padding: 5px 6px;">
            <input type="text" class="st-grade" placeholder="e.g. K10 Polished" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px;">
          </td>
          <td style="padding: 5px 6px;">
            <input type="text" class="st-notes" placeholder="e.g. Ra 0.8" style="width: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px;">
          </td>
          <td style="padding: 5px 6px; text-align: center;">
            <button type="button" class="btn-del-station" style="background: transparent; border: none; color: #dc2626; font-size: 14px; cursor: pointer; padding: 2px 4px;" title="Delete Station">✕</button>
          </td>
        `;
        tbody.appendChild(newRow);
        wireStationDeleteButtons();
      });
    }

    wireStationDeleteButtons();
  }

  function wireStationDeleteButtons() {
    document.querySelectorAll('.btn-del-station').forEach(btn => {
      btn.onclick = () => {
        const row = btn.closest('.recipe-station-row');
        if (row) row.remove();
      };
    });
  }

  function createNewRecipe() {
    selectedRecipe = {
      recipe_id: null,
      recipe_code: `RCP-BBI-${Date.now().toString().slice(-4)}`,
      item_code: 'B1-VALVE-BODY',
      item_name: 'Precision Brass Valve Body',
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
      traub_cam_profile: '',
      traub_gear_ratio: '',
      tooling_layout: [
        { station: 'T01', operation: 'Facing & OD Roughing', holder: 'PCLNR 2020K12', insert_spec: 'CNMG 120404-SM', grade: 'Uncoated Polished Carbide (Brass)', notes: 'DOC 1.2mm, CSS 240 m/min' },
        { station: 'T02', operation: 'OD Profiling & 45° Chamfer', holder: 'SVJCR 2020K16', insert_spec: 'VCMT 160404-NN', grade: 'PCD Diamond / K10 Polished', notes: 'Ra 0.8 finish, DOC 0.25mm' },
        { station: 'T03', operation: 'Center & Core Drilling Ø12.5mm', holder: 'ER32-MT3 Collet Chuck', insert_spec: 'Solid Carbide Drill Ø12.5mm', grade: 'TiAlN Coated Micrograin', notes: 'Peck 3.0mm, RPM 1800' },
        { station: 'T04', operation: 'ID Boring & Step Seat Finish', holder: 'S16R-SCLCR09', insert_spec: 'CCMT 09T304-SM', grade: 'Polished Carbide K10', notes: 'Internal bore Ø14.8 +/- 0.02mm' },
        { station: 'T05', operation: 'External Threading M16x1.5', holder: 'SER 2020K16', insert_spec: '16ER 1.5 ISO', grade: 'K20 Uncoated Carbide', notes: 'Verify with Thread Ring Gauge TG-M16-004' },
        { station: 'T06', operation: 'Cut-off / Parting', holder: 'Q-Cut 2020 Blade', insert_spec: '2.0mm Neutral Parting Insert', grade: 'Micrograin Carbide', notes: 'Kerf loss 2.0mm, reduce feed to 0.04 near center' }
      ],
      qc_critical_dimensions: 'Verify threads with thread ring gauge TG-M16-004; verify bore finish Ra 0.8; flange thickness 4.2 +/- 0.03mm',
      approved_by_setter: 'Ramesh K (Senior Setter)',
      metrics: { grossPerHour: 248, shiftTarget: 1787, dailyTarget: 5361 }
    };
    renderRecipeDetail(selectedRecipe);
  }

  async function saveRecipeFromForm() {
    const form = getEl('recipe-detail-form');
    if (!form) return;

    const formData = new FormData(form);
    const payload = {};
    formData.forEach((val, key) => { payload[key] = val; });

    // Collect tooling station rows
    const stations = [];
    document.querySelectorAll('.recipe-station-row').forEach(row => {
      stations.push({
        station: row.querySelector('.st-station')?.value.trim() || '',
        operation: row.querySelector('.st-op')?.value.trim() || '',
        holder: row.querySelector('.st-holder')?.value.trim() || '',
        insert_spec: row.querySelector('.st-insert')?.value.trim() || '',
        grade: row.querySelector('.st-grade')?.value.trim() || '',
        notes: row.querySelector('.st-notes')?.value.trim() || ''
      });
    });
    payload.tooling_layout = stations;

    try {
      const res = await fetch('/api/recipe/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.ok) {
        alert('Recipe saved successfully!');
        selectedRecipe = json.data;
        renderRecipeDetail(selectedRecipe);
        loadRecipeList(selectedRecipe.recipe_id);
      } else {
        alert('Failed to save recipe: ' + (json.message || ''));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  async function deleteCurrentRecipe(recipe) {
    if (!recipe || !recipe.recipe_id) return;
    if (!confirm(`Are you sure you want to delete Recipe ${recipe.recipe_code}?`)) return;

    try {
      const res = await fetch('/api/recipe/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recipe.recipe_id })
      });
      const json = await res.json();
      if (json.ok) {
        alert('Recipe deleted');
        loadRecipeList();
      } else {
        alert('Failed to delete recipe: ' + (json.message || ''));
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    }
  }

  // Initialize event listeners when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    const closeX = getEl('recipe-hub-close-x');
    const btnClose = getEl('recipe-btn-close');
    if (closeX) closeX.addEventListener('click', window.closeRecipeHub);
    if (btnClose) btnClose.addEventListener('click', window.closeRecipeHub);

    const btnNew = getEl('recipe-btn-new');
    if (btnNew) btnNew.addEventListener('click', createNewRecipe);

    const btnSearch = getEl('recipe-btn-search');
    const searchInput = getEl('recipe-search-input');
    if (btnSearch) btnSearch.addEventListener('click', () => loadRecipeList());
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          loadRecipeList();
        }
      });
    }

    // Category filter tabs
    document.querySelectorAll('.recipe-filter-cat').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.recipe-filter-cat').forEach(t => {
          t.style.background = '#fff';
          t.style.color = '#334155';
        });
        tab.style.background = '#334155';
        tab.style.color = '#fff';
        activeFilterCategory = tab.getAttribute('data-cat');
        loadRecipeList();
      });
    });
  });

})();
