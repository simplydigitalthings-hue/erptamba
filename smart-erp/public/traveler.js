/**
 * SMART ERP - Digital Route Card & QR Traveler Client Engine
 * Real-time Shopfloor Stage Progression, USB Gun Barcode Scanning & EN 10204 3.1 Traceability
 */

(() => {
  const hub = document.getElementById("traveler-hub");
  if (!hub) return;

  const btnCloseX = document.getElementById("traveler-hub-close-x");
  const btnClose = document.getElementById("traveler-btn-close");
  const inputSearch = document.getElementById("traveler-search-input");
  const btnSearch = document.getElementById("traveler-btn-search");
  const listContainer = document.getElementById("traveler-list-container");
  const detailContainer = document.getElementById("traveler-detail-container");
  const countBadge = document.getElementById("traveler-count-badge");
  const btnCameraScan = document.getElementById("traveler-btn-camera-scan");
  const btnNewTraveler = document.getElementById("traveler-btn-new");
  const filterTabs = document.querySelectorAll(".traveler-filter-tab");

  let currentStatus = "ALL";
  let activeTravelerId = null;
  let travelerDataCache = [];

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

  async function loadTravelers(query = "") {
    if (!listContainer) return;
    listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px;">Loading route travelers...</div>`;

    try {
      const q = encodeURIComponent(query || (inputSearch ? inputSearch.value.trim() : ""));
      const res = await fetch(`/api/traveler?status=${encodeURIComponent(currentStatus)}&q=${q}`);
      const json = await res.json();

      if (!json.ok) {
        listContainer.innerHTML = `<div style="padding: 16px; color: #b91c1c; font-size: 12px;">Failed to load: ${esc(json.message)}</div>`;
        return;
      }

      travelerDataCache = json.data || [];
      if (countBadge) countBadge.textContent = `${travelerDataCache.length} items`;
      renderTravelerList(travelerDataCache);

      // If active ID is present or only 1 result, auto-select it
      if (activeTravelerId) {
        selectTraveler(activeTravelerId);
      } else if (travelerDataCache.length > 0) {
        selectTraveler(travelerDataCache[0].traveler_id);
      } else {
        renderEmptyDetail();
      }
    } catch (err) {
      console.error("Load travelers failed:", err);
      if (listContainer) {
        listContainer.innerHTML = `<div style="padding: 16px; color: #b91c1c; font-size: 12px;">Error: ${esc(err.message)}</div>`;
      }
    }
  }

  function renderTravelerList(items) {
    if (!listContainer) return;

    if (!items || items.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 12px;">
          <div style="font-size: 24px; margin-bottom: 6px;"></div>
          No travelers found matching criteria.
        </div>`;
      return;
    }

    listContainer.innerHTML = items.map((t) => {
      const isSelected = t.traveler_id === activeTravelerId;
      const isCompleted = t.status === "COMPLETED";
      const totalStages = Number(t.total_stages || 6);
      const passedStages = Number(t.completed_stages || 0);
      const progressPct = Math.round((passedStages / totalStages) * 100);

      const statusBadge = isCompleted
        ? `<span style="background: #e6f4ea; color: #137333; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">COMPLETED</span>`
        : `<span style="background: #feefe3; color: #b06000; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: bold;">${passedStages}/${totalStages} STAGES</span>`;

      return `
        <div class="traveler-card ${isSelected ? 'active-card' : ''}" data-id="${t.traveler_id}" style="
          padding: 10px 12px; margin-bottom: 6px; border: 1.5px solid ${isSelected ? '#1c625a' : '#e2e8f0'};
          border-radius: 6px; background: ${isSelected ? '#f0fdfa' : '#fff'}; cursor: pointer; transition: all 0.15s;
          box-shadow: ${isSelected ? '0 2px 6px rgba(28,98,90,0.15)' : 'none'};
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div style="font-weight: 700; font-size: 13px; color: #0f172a; font-family: monospace;">${esc(t.traveler_no)}</div>
            ${statusBadge}
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 3px;">
            ${esc(t.part_code)} &bull; <span style="font-weight: normal; color: #64748b;">${esc(t.part_name)}</span>
          </div>
          <div style="display: flex; gap: 8px; font-size: 10.5px; color: #475569; margin-bottom: 6px; flex-wrap: wrap;">
            <span>WO: <b>${esc(t.dc_no)}</b></span>
            <span>Heat: <b style="color: #800000; font-family: monospace;">${esc(t.heat_no)}</b></span>
            <span>Batch: <b style="color: #004d40; font-family: monospace;">${esc(t.batch_no)}</b></span>
            <span>Qty: <b>${t.planned_qty}</b></span>
          </div>
          <!-- Progress Bar -->
          <div style="background: #e2e8f0; border-radius: 999px; height: 5px; overflow: hidden;">
            <div style="background: ${isCompleted ? '#10b981' : '#1c625a'}; width: ${progressPct}%; height: 100%;"></div>
          </div>
        </div>
      `;
    }).join("");

    listContainer.querySelectorAll(".traveler-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = Number(card.getAttribute("data-id"));
        selectTraveler(id);
      });
    });
  }

  async function selectTraveler(id) {
    if (!id || !detailContainer) return;
    activeTravelerId = id;

    // Highlight active in list
    if (listContainer) {
      listContainer.querySelectorAll(".traveler-card").forEach((card) => {
        const isCurrent = Number(card.getAttribute("data-id")) === id;
        card.style.borderColor = isCurrent ? '#1c625a' : '#e2e8f0';
        card.style.background = isCurrent ? '#f0fdfa' : '#fff';
        card.style.boxShadow = isCurrent ? '0 2px 6px rgba(28,98,90,0.15)' : 'none';
      });
    }

    detailContainer.innerHTML = `<div style="padding: 40px; text-align: center; color: #64748b;">Loading traveler details #${id}...</div>`;

    try {
      const res = await fetch(`/api/traveler/get?id=${id}`);
      const json = await res.json();
      if (!json.ok || !json.data) {
        detailContainer.innerHTML = `<div style="padding: 20px; color: #b91c1c;">${esc(json.message || "Failed to load traveler details.")}</div>`;
        return;
      }

      renderTravelerDetail(json.data);
    } catch (err) {
      console.error("Select traveler failed:", err);
      detailContainer.innerHTML = `<div style="padding: 20px; color: #b91c1c;">Error: ${esc(err.message)}</div>`;
    }
  }

  function renderTravelerDetail(traveler) {
    if (!detailContainer) return;

    const stages = traveler.stages || [];
    const isCompleted = traveler.status === "COMPLETED";
    const activeStage = stages.find((s) => s.stage_status === "RUNNING") || (!isCompleted ? stages.find((s) => s.stage_status === "PENDING") : null);

    const stagesHtml = stages.map((s) => {
      const isPassed = s.stage_status === "PASSED";
      const isRunning = s.stage_status === "RUNNING";
      const isPending = s.stage_status === "PENDING";

      const stepBorder = isPassed ? "#10b981" : isRunning ? "#f59e0b" : "#cbd5e1";
      const stepBg = isPassed ? "#ecfdf5" : isRunning ? "#fffbeb" : "#fff";
      const icon = isPassed ? "" : isRunning ? "" : s.seq_no;
      const statusLabel = isPassed ? "PASSED" : isRunning ? "IN PROGRESS" : "PENDING";
      const badgeStyle = isPassed
        ? "background: #d1fae5; color: #065f46;"
        : isRunning
        ? "background: #fef3c7; color: #92400e;"
        : "background: #f1f5f9; color: #64748b;";

      return `
        <div style="display: flex; gap: 12px; margin-bottom: 12px; padding: 12px; border: 1.5px solid ${stepBorder}; border-radius: 8px; background: ${stepBg};">
          <div style="
            width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-weight: bold; font-size: 14px; background: ${isPassed ? '#10b981' : isRunning ? '#f59e0b' : '#e2e8f0'};
            color: ${isPassed || isRunning ? '#fff' : '#475569'}; flex-shrink: 0;
          ">${icon}</div>

          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <div style="font-weight: 700; font-size: 13px; color: #1e293b;">
                Stage ${s.seq_no}: ${esc(s.stage_name)}
              </div>
              <span style="font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 999px; ${badgeStyle}">
                ${statusLabel}
              </span>
            </div>

            <div style="display: flex; gap: 14px; font-size: 11.5px; color: #475569; margin-bottom: 4px; flex-wrap: wrap;">
              <span>Station: <b>${esc(s.machine_name || "Unassigned")}</b></span>
              <span>Operator: <b>${esc(s.operator_name || "-")}</b></span>
              <span>In: <b>${s.qty_in || 0}</b></span>
              <span style="color: #065f46;">OK: <b>${s.qty_ok || 0}</b></span>
              <span style="color: #991b1b;">Scrap: <b>${s.qty_scrap || 0}</b></span>
            </div>

            ${s.qc_notes ? `<div style="font-size: 11px; color: #0369a1; background: #e0f2fe; padding: 4px 8px; border-radius: 4px; margin-top: 4px;"><b>QC Notes:</b> ${esc(s.qc_notes)} (Sign-off: ${esc(s.qc_signoff_by || "QC")})</div>` : ''}
          </div>
        </div>
      `;
    }).join("");

    // Active Action Box (Log Progress)
    let actionBoxHtml = "";
    if (activeStage && !isCompleted) {
      const defaultQty = activeStage.qty_in || traveler.planned_qty;
      actionBoxHtml = `
        <div style="background: #f0fdfa; border: 2px solid #1c625a; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="font-weight: 800; font-size: 13px; color: #134e48; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <span></span>
            <span>Active Stage Checkpoint &bull; Stage ${activeStage.seq_no}: ${esc(activeStage.stage_name)}</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 12px;">
            <div>
              <label style="display: block; font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 4px;">Machine / Workstation</label>
              <input type="text" id="action-machine" value="${esc(activeStage.machine_name || '')}" placeholder="e.g. CNC-LATHE-01" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; box-sizing: border-box;">
            </div>
            <div>
              <label style="display: block; font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 4px;">Operator Name / Badge</label>
              <input type="text" id="action-operator" value="${esc(activeStage.operator_name || '')}" placeholder="e.g. Ramesh K" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; box-sizing: border-box;">
            </div>
            <div>
              <label style="display: block; font-size: 11px; font-weight: bold; color: #065f46; margin-bottom: 4px;">Passed / OK Qty</label>
              <input type="number" id="action-qty-ok" value="${defaultQty}" style="width: 100%; padding: 6px 8px; border: 1.5px solid #10b981; border-radius: 4px; font-size: 13px; font-weight: bold; box-sizing: border-box;">
            </div>
            <div>
              <label style="display: block; font-size: 11px; font-weight: bold; color: #991b1b; margin-bottom: 4px;">Rejection / Scrap Qty</label>
              <input type="number" id="action-qty-scrap" value="0" style="width: 100%; padding: 6px 8px; border: 1.5px solid #ef4444; border-radius: 4px; font-size: 13px; font-weight: bold; box-sizing: border-box;">
            </div>
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 4px;">QC Notes / Dimension Check Results</label>
            <input type="text" id="action-qc-notes" placeholder="e.g. Dimensional tolerance +/- 0.02mm verified, finish Ra 0.8" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; box-sizing: border-box;">
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button type="button" id="btn-traveler-recipe" style="
              background: #334155; color: #fff; font-weight: bold; padding: 8px 12px; border: none;
              border-radius: 4px; cursor: pointer; font-size: 11px; display: flex; align-items: center; gap: 5px;
            ">
              <span>Tooling Setup</span>
            </button>
            <button type="button" id="btn-traveler-gauge" style="
              background: #0f766e; color: #fff; font-weight: bold; padding: 8px 12px; border: none;
              border-radius: 4px; cursor: pointer; font-size: 11px; display: flex; align-items: center; gap: 5px;
            ">
              <span>Thread Gauge</span>
            </button>
            <button type="button" id="btn-advance-stage" style="
              background: #1c625a; color: #fff; font-weight: bold; padding: 8px 18px; border: none;
              border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px;
              box-shadow: 0 2px 6px rgba(28,98,90,0.25);
            ">
              <span>Confirm &amp; Advance to Next Stage</span>
            </button>
          </div>
        </div>
      `;
    } else if (isCompleted) {
      actionBoxHtml = `
        <div style="background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 8px; padding: 14px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 14px; font-weight: bold; color: #107c41;">All Stages Completed</span>
          <div>
            <div style="font-weight: 800; font-size: 13px; color: #065f46;">All Machining &amp; Inspection Operations Completed</div>
            <div style="font-size: 11.5px; color: #047857;">Final OK Quantity: <b>${traveler.completed_qty} NOS</b> | Total Scrap: <b>${traveler.rejected_qty} NOS</b>. Ready for Customer Dispatch &amp; Invoice.</div>
          </div>
        </div>
      `;
    }

    detailContainer.innerHTML = `
      <!-- Header Banner -->
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px; font-weight: 800; font-family: monospace; color: #0f172a;">${esc(traveler.traveler_no)}</span>
              <span style="background: ${isCompleted ? '#d1fae5' : '#fef3c7'}; color: ${isCompleted ? '#065f46' : '#92400e'}; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${esc(traveler.status)}</span>
            </div>
            <div style="font-size: 13px; font-weight: 600; color: #334155; margin-top: 4px;">
              Part: <b style="color: #003366;">${esc(traveler.part_code)}</b> &bull; ${esc(traveler.part_name)}
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            <button type="button" id="btn-print-traveler" style="
              background: #1c625a; color: #fff; font-weight: bold; padding: 6px 14px; border: none;
              border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px;
            ">
              <span>Print Route Card (A4/A5)</span>
            </button>
            <button type="button" id="btn-refresh-traveler" style="
              background: #f1f5f9; color: #475569; font-weight: bold; padding: 6px 12px; border: 1px solid #cbd5e1;
              border-radius: 4px; cursor: pointer; font-size: 12px;
            ">
              Refresh
            </button>
          </div>
        </div>

        <!-- Pedigree Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11.5px;">
          <div>
            <span style="color: #64748b; display: block; font-size: 10px; text-transform: uppercase;">Work Order #</span>
            <b style="color: #0f172a;">${esc(traveler.dc_no)}</b>
          </div>
          <div>
            <span style="color: #64748b; display: block; font-size: 10px; text-transform: uppercase;">Raw Melt / Heat #</span>
            <b style="color: #800000; font-family: monospace; font-size: 12px;">${esc(traveler.heat_no)}</b>
          </div>
          <div>
            <span style="color: #64748b; display: block; font-size: 10px; text-transform: uppercase;">Batch / Lot #</span>
            <b style="color: #004d40; font-family: monospace; font-size: 12px;">${esc(traveler.batch_no)}</b>
          </div>
          <div>
            <span style="color: #64748b; display: block; font-size: 10px; text-transform: uppercase;">Planned Lot Qty</span>
            <b style="color: #1c625a; font-size: 13px;">${traveler.planned_qty} NOS</b>
          </div>
          <div>
            <span style="color: #64748b; display: block; font-size: 10px; text-transform: uppercase;">Drawing Revision</span>
            <b>${esc(traveler.drawing_rev || 'REV-01')}</b>
          </div>
          <div>
            <span style="color: #64748b; display: block; font-size: 10px; text-transform: uppercase;">Issue Date</span>
            <b>${fmtDate(traveler.created_at)}</b>
          </div>
        </div>
      </div>

      <!-- Active Stage Logging Box -->
      ${actionBoxHtml}

      <!-- Stages Timeline -->
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 48px;">
        <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 12px;">
          Operation Sequence &amp; Shopfloor Routing Checklist
        </div>
        ${stagesHtml}
      </div>
    `;

    // Wire Print Button
    const btnPrint = document.getElementById("btn-print-traveler");
    if (btnPrint) {
      btnPrint.addEventListener("click", () => {
        window.open(`/api/print?type=traveler&id=${traveler.traveler_id}`, "_blank");
      });
    }

    // Wire Refresh Button
    const btnRef = document.getElementById("btn-refresh-traveler");
    if (btnRef) {
      btnRef.addEventListener("click", () => selectTraveler(traveler.traveler_id));
    }

    // Wire Advance Stage Action
    const btnAdv = document.getElementById("btn-advance-stage");
    const btnGauge = document.getElementById("btn-traveler-gauge");
    const btnRecipe = document.getElementById("btn-traveler-recipe");
    if (btnGauge) {
      btnGauge.addEventListener("click", () => {
        if (window.openGaugeHub) window.openGaugeHub();
      });
    }
    if (btnRecipe) {
      btnRecipe.addEventListener("click", () => {
        if (window.openRecipeHub) window.openRecipeHub();
      });
    }
    if (btnAdv && activeStage) {
      btnAdv.addEventListener("click", async () => {
        const okVal = Number(document.getElementById("action-qty-ok")?.value || 0);
        const scrapVal = Number(document.getElementById("action-qty-scrap")?.value || 0);
        const machVal = document.getElementById("action-machine")?.value.trim();
        const opVal = document.getElementById("action-operator")?.value.trim();
        const qcVal = document.getElementById("action-qc-notes")?.value.trim();

        if (okVal < 0) {
          alert("OK Quantity cannot be negative.");
          return;
        }

        btnAdv.disabled = true;
        btnAdv.textContent = "Updating stage...";

        try {
          const res = await fetch("/api/traveler/stage/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stageId: activeStage.stage_id,
              machineName: machVal,
              operatorName: opVal,
              qtyOk: okVal,
              qtyScrap: scrapVal,
              qcNotes: qcVal
            })
          });
          const json = await res.json();
          if (!json.ok) {
            alert(json.message || "Failed to update stage.");
            btnAdv.disabled = false;
            btnAdv.textContent = "Confirm & Advance to Next Stage";
            return;
          }

          // Reload list and re-render current traveler
          await loadTravelers();
          selectTraveler(traveler.traveler_id);
        } catch (err) {
          alert("Network error: " + err.message);
          btnAdv.disabled = false;
          btnAdv.textContent = "Confirm & Advance to Next Stage";
        }
      });
    }
  }

  function renderEmptyDetail() {
    if (!detailContainer) return;
    detailContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #64748b; text-align: center;">
        <svg class="empty-state-svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); opacity: 0.6; margin-bottom: 8px;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        <p style="font-size: 15px; font-weight: bold; color: #1e293b;">No Route Traveler Selected</p>
        <p style="font-size: 12px; color: #64748b; max-width: 320px;">Scan a physical Route Card with your USB Barcode Gun or select a traveler from the list.</p>
      </div>`;
  }

  // Barcode Gun & Text Search Listener (Enter key triggers scan search)
  if (inputSearch) {
    inputSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadTravelers(inputSearch.value);
      }
    });
  }

  if (btnSearch) {
    btnSearch.addEventListener("click", () => {
      loadTravelers(inputSearch ? inputSearch.value : "");
    });
  }

  // Filter Tabs
  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => {
        t.classList.remove("active");
        t.style.background = "#fff";
      });
      tab.classList.add("active");
      tab.style.background = "#e2e8f0";
      currentStatus = tab.getAttribute("data-status") || "ALL";
      loadTravelers();
    });
  });

  // Camera QR Scanner Modal
  if (btnCameraScan) {
    btnCameraScan.addEventListener("click", () => {
      openCameraScannerModal();
    });
  }

  function openCameraScannerModal() {
    const existing = document.getElementById("qr-cam-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "qr-cam-modal";
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 2000;
      display: flex; align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
      <div style="background: #fff; width: 440px; max-width: 95vw; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="background: #1c625a; color: #fff; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
          <b style="font-size: 13px;">Camera QR Scanner</b>
          <button id="cam-close-btn" style="background: none; border: none; color: #fff; font-size: 16px; cursor: pointer;">✕</button>
        </div>
        <div style="padding: 14px; text-align: center;">
          <video id="cam-video" style="width: 100%; height: 260px; object-fit: cover; background: #000; border-radius: 4px;"></video>
          <p style="font-size: 11px; color: #64748b; margin-top: 8px;">Point your camera at the 2D QR Code on the Route Card</p>
          <div style="margin-top: 10px;">
            <input type="text" id="cam-manual-fallback" placeholder="Or type Traveler # (e.g. TRV-2627-0001)" style="width: 80%; padding: 6px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px;">
            <button id="cam-manual-submit" style="padding: 6px 10px; background: #1c625a; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Go</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = document.getElementById("cam-close-btn");
    const video = document.getElementById("cam-video");
    let stream = null;

    function cleanup() {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      modal.remove();
    }

    closeBtn.addEventListener("click", cleanup);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) cleanup();
    });

    const manualInput = document.getElementById("cam-manual-fallback");
    const manualSubmit = document.getElementById("cam-manual-submit");
    const handleManual = () => {
      const code = manualInput.value.trim();
      if (code) {
        cleanup();
        if (inputSearch) inputSearch.value = code;
        loadTravelers(code);
      }
    };
    manualSubmit.addEventListener("click", handleManual);
    manualInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleManual(); });

    // Try starting camera stream
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then((s) => {
          stream = s;
          video.srcObject = s;
          video.play();
        })
        .catch((err) => {
          console.warn("Camera access not available or denied:", err);
          video.parentElement.innerHTML = `
            <div style="padding: 30px 10px; color: #64748b;">
              <span style="font-size: 28px;"></span>
              <p style="font-size: 12px; margin-top: 6px;">Camera preview is not supported in this browser environment or permission was not granted.</p>
              <p style="font-size: 11px; color: #1c625a; font-weight: bold;">You can use your physical USB Barcode Gun or enter the Traveler / WO number directly.</p>
            </div>
            <div style="margin-top: 10px;">
              <input type="text" id="cam-manual-fallback-2" placeholder="Type Traveler # (e.g. TRV-2627-0001)" style="width: 75%; padding: 6px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px;">
              <button id="cam-manual-submit-2" style="padding: 6px 10px; background: #1c625a; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Go</button>
            </div>
          `;
          const mIn = document.getElementById("cam-manual-fallback-2");
          const mSub = document.getElementById("cam-manual-submit-2");
          if (mSub && mIn) {
            const h = () => {
              if (mIn.value.trim()) {
                cleanup();
                if (inputSearch) inputSearch.value = mIn.value.trim();
                loadTravelers(mIn.value.trim());
              }
            };
            mSub.addEventListener("click", h);
            mIn.addEventListener("keydown", (e) => { if (e.key === "Enter") h(); });
          }
        });
    }
  }

  // New Traveler Creation Button
  if (btnNewTraveler) {
    btnNewTraveler.addEventListener("click", async () => {
      const partCode = prompt("Enter Component Part Code (e.g. B1-VALVE-BODY):", "B1-VALVE-BODY");
      if (!partCode) return;
      const plannedQty = prompt("Enter Planned Lot Quantity:", "500");
      if (!plannedQty) return;
      const heatNo = prompt("Enter Inward Raw Melt / Heat No:", "HT-BRASS-704");

      try {
        const res = await fetch("/api/traveler/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partCode,
            plannedQty: Number(plannedQty) || 500,
            heatNo: heatNo || "HT-BRASS-704",
            dcNo: `WO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
          })
        });
        const json = await res.json();
        if (!json.ok) {
          alert(json.message || "Could not create traveler.");
          return;
        }
        await loadTravelers();
        if (json.data && json.data.traveler_id) {
          selectTraveler(json.data.traveler_id);
        }
      } catch (err) {
        alert("Error creating traveler: " + err.message);
      }
    });
  }

  // Close Handlers
  if (btnCloseX) btnCloseX.addEventListener("click", () => window.closeTravelerHub());
  if (btnClose) btnClose.addEventListener("click", () => window.closeTravelerHub());

  // Window Exports
  window.openTravelerHub = (initQuery = "") => {
    hub.hidden = false;
    hub.style.display = "flex";
    if (initQuery && inputSearch) inputSearch.value = initQuery;
    loadTravelers(initQuery);
    setTimeout(() => { if (inputSearch) inputSearch.focus(); }, 100);
  };

  window.closeTravelerHub = () => {
    hub.hidden = true;
    hub.style.display = "none";
  };

  window.openTravelerByNo = (no) => {
    window.openTravelerHub(no);
  };
})();
