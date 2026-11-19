/**
 * SMART ERP - Piece-Count Weighing Scale & Box Packing Slip Hub
 * Floor-level piece count calibration, carton tare deduction,
 * dynamic box builder, direct Web Serial scale connection,
 * and OEM thermal barcode label / A4 packing list generation.
 */

(function () {
  const modal = document.getElementById("packing-hub");
  const closeBtn = document.getElementById("packing-btn-close");
  const closeX = document.getElementById("packing-hub-close-x");
  const inputSearch = document.getElementById("packing-search-input");
  const btnSearch = document.getElementById("packing-btn-search");
  const listContainer = document.getElementById("packing-list-container");
  const detailContainer = document.getElementById("packing-detail-container");
  const countBadge = document.getElementById("packing-count-badge");
  const btnNewConsignment = document.getElementById("packing-btn-new");
  const btnSerial = document.getElementById("packing-btn-serial");
  const filterTabs = document.querySelectorAll(".packing-filter-tab");

  let currentStatus = "ALL";
  let activeConsignmentId = null;
  let consignmentCache = [];
  let serialPort = null;
  let serialReader = null;
  let isReadingSerial = false;

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m]);
  }

  function fmtDate(d) {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return String(d);
    }
  }

  window.openPackingHub = function (prefill = null) {
    if (modal) {
      modal.removeAttribute("hidden");
      loadConsignments();
      if (prefill) {
        initNewConsignment(prefill);
      }
    }
  };

  window.closePackingHub = function () {
    if (modal) modal.setAttribute("hidden", "true");
    stopSerialReader();
  };

  if (closeBtn) closeBtn.addEventListener("click", window.closePackingHub);
  if (closeX) closeX.addEventListener("click", window.closePackingHub);

  // Load Consignments List
  async function loadConsignments(query = "") {
    if (!listContainer) return;
    listContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">Loading consignments...</div>';

    try {
      const res = await fetch(`/api/packing/list?q=${encodeURIComponent(query || "")}`);
      const json = await res.json();
      if (!json.ok) {
        listContainer.innerHTML = `<div style="padding: 16px; color: #b91c1c;">Error: ${esc(json.message)}</div>`;
        return;
      }

      consignmentCache = json.data || [];
      renderConsignmentList();
    } catch (err) {
      console.error("Load packing consignments error:", err);
      listContainer.innerHTML = `<div style="padding: 16px; color: #b91c1c;">Failed to load consignments.</div>`;
    }
  }

  function renderConsignmentList() {
    if (!listContainer) return;
    let list = consignmentCache;
    if (currentStatus !== "ALL") {
      list = list.filter((c) => c.status === currentStatus);
    }

    if (countBadge) {
      countBadge.textContent = `${list.length} consignment${list.length === 1 ? "" : "s"}`;
    }

    if (list.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 30px 16px; text-align: center; color: #94a3b8;">
          <span style="font-size: 32px; display: block; margin-bottom: 6px;"></span>
          <p style="font-weight: 600; font-size: 13px; color: #475569; margin: 0;">No consignments found</p>
          <p style="font-size: 11px; margin-top: 4px;">Click <b>+ New Consignment</b> to weigh and pack cartons.</p>
        </div>`;
      return;
    }

    listContainer.innerHTML = list.map((c) => {
      const isSelected = activeConsignmentId === c.packing_id;
      const isDispatched = c.status === "DISPATCHED";
      const statusBg = isDispatched ? "#e0e7ff" : "#dcfce7";
      const statusColor = isDispatched ? "#3730a3" : "#166534";

      return `
        <div class="packing-card" data-id="${c.packing_id}" style="
          padding: 10px 12px; margin-bottom: 8px; border-radius: 6px; cursor: pointer;
          border: 1.5px solid ${isSelected ? "#1c625a" : "#e2e8f0"};
          background: ${isSelected ? "#f0fdfa" : "#fff"};
          box-shadow: ${isSelected ? "0 2px 6px rgba(28,98,90,0.15)" : "0 1px 2px rgba(0,0,0,0.03)"};
          transition: all 0.15s ease;
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <b style="font-size: 12px; font-family: monospace; color: #0f172a;">${esc(c.packing_no)}</b>
            <span style="background: ${statusBg}; color: ${statusColor}; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 3px;">
              ${esc(c.status || "PACKED")}
            </span>
          </div>

          <div style="font-size: 11.5px; font-weight: 600; color: #1e293b; margin-bottom: 3px;">
            ${esc(c.part_code)} • <span style="font-weight: normal; color: #64748b;">${esc(c.part_name || "Brass Component")}</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 10.5px; color: #475569;">
            <span><b>${c.total_cartons}</b> Box${c.total_cartons === 1 ? "" : "es"} (${c.total_qty_pieces} pcs)</span>
            <span>Net: <b>${Number(c.total_net_weight_kg).toFixed(3)}</b> kg</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-top: 4px; border-top: 1px dashed #f1f5f9; padding-top: 4px;">
            <span>${esc(c.customer_name || "OEM Client")}</span>
            <span>${fmtDate(c.packing_date)}</span>
          </div>
        </div>`;
    }).join("");

    listContainer.querySelectorAll(".packing-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.dataset.id;
        selectConsignment(id);
      });
    });
  }

  async function selectConsignment(id) {
    activeConsignmentId = Number(id);
    renderConsignmentList();

    if (!detailContainer) return;
    detailContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: #64748b;">Loading consignment details...</div>';

    try {
      const res = await fetch(`/api/packing/get?id=${id}`);
      const json = await res.json();
      if (!json.ok || !json.data) {
        detailContainer.innerHTML = `<div style="padding: 20px; color: #b91c1c;">Failed to load consignment details.</div>`;
        return;
      }
      renderConsignmentDetail(json.data);
    } catch (err) {
      console.error("Select packing consignment error:", err);
      detailContainer.innerHTML = `<div style="padding: 20px; color: #b91c1c;">Error: ${esc(err.message)}</div>`;
    }
  }

  function initNewConsignment(prefill = {}) {
    activeConsignmentId = null;
    renderConsignmentList();

    const yr = "2026";
    const nextPkgNo = `PKG-${yr}-${String(consignmentCache.length + 1).padStart(4, "0")}`;
    const defaultAPW = Number(prefill.apwGrams || 15.000);
    const targetQty = Number(prefill.targetQty || 1000);
    const defaultTare = 0.200;
    const defaultGross = Number(((targetQty * defaultAPW / 1000) + defaultTare).toFixed(3));
    const defaultNet = Number((defaultGross - defaultTare).toFixed(3));

    const draft = {
      packing_id: 0,
      packing_no: nextPkgNo,
      packing_date: new Date().toISOString().slice(0, 10),
      status: "PACKED",
      customer_name: prefill.customerName || "Schneider Electric India Pvt Ltd",
      ref_doc_type: prefill.refDocType || "DC",
      ref_doc_no: prefill.refDocNo || "WO-2026-310",
      part_code: prefill.partCode || "B1-VALVE-BODY",
      part_name: prefill.partName || "Precision Brass Valve Body",
      heat_no: prefill.heatNo || "HT-BRASS-704",
      batch_no: prefill.batchNo || "BT-2026-421",
      drawing_rev: "REV-01",
      sample_pieces: 20,
      sample_weight_grams: Number((defaultAPW * 20).toFixed(3)),
      apw_grams: defaultAPW,
      target_box_qty: targetQty,
      total_cartons: 1,
      total_qty_pieces: targetQty,
      total_net_weight_kg: defaultNet,
      total_gross_weight_kg: defaultGross,
      total_tare_weight_kg: defaultTare,
      packer_name: "Packing Station 1",
      remarks: "Calibrated electronic scale. 5-ply cartons packed with VCI corrosion protective polybag.",
      cartons: [
        {
          carton_no: 1,
          carton_barcode: `CTN-${nextPkgNo}-B01`,
          box_type: "5-Ply Corrugated Box",
          tare_weight_kg: defaultTare,
          gross_weight_kg: defaultGross,
          net_weight_kg: defaultNet,
          calculated_qty: targetQty,
          verified_qty: targetQty,
          carton_status: "OK",
          notes: ""
        }
      ]
    };

    renderConsignmentDetail(draft);
  }

  function renderConsignmentDetail(consignment) {
    if (!detailContainer) return;
    const isSaved = Number(consignment.packing_id) > 0;
    let cartons = consignment.cartons || [];
    if (cartons.length === 0) {
      cartons = [
        {
          carton_no: 1,
          carton_barcode: `CTN-${consignment.packing_no}-B01`,
          box_type: "5-Ply Corrugated Box",
          tare_weight_kg: 0.200,
          gross_weight_kg: 15.200,
          net_weight_kg: 15.000,
          calculated_qty: 1000,
          verified_qty: 1000,
          carton_status: "OK"
        }
      ];
    }

    let apw = Number(consignment.apw_grams) || 15.000;
    let samplePcs = Number(consignment.sample_pieces) || 20;
    let sampleWt = Number(consignment.sample_weight_grams) || Number((apw * samplePcs).toFixed(3));
    let targetBoxQty = Number(consignment.target_box_qty) || 1000;

    function renderCartonRows() {
      let totNet = 0;
      let totGross = 0;
      let totTare = 0;
      let totQty = 0;

      const rowsHtml = cartons.map((c, idx) => {
        const cNo = idx + 1;
        c.carton_no = cNo;
        const tare = Number(c.tare_weight_kg) || 0;
        const gross = Number(c.gross_weight_kg) || 0;
        const net = Math.max(0, Number((gross - tare).toFixed(3)));
        c.net_weight_kg = net;

        const netGrams = net * 1000;
        const calcPcs = apw > 0 ? Math.round(netGrams / apw) : 0;
        c.calculated_qty = calcPcs;
        if (!c.verified_qty || c.verified_qty === 0) c.verified_qty = calcPcs;

        const barcode = c.carton_barcode || `CTN-${consignment.packing_no}-B${String(cNo).padStart(2, "0")}`;
        c.carton_barcode = barcode;

        totTare += tare;
        totGross += gross;
        totNet += net;
        totQty += Number(c.verified_qty) || 0;

        const diff = Number(c.verified_qty) - targetBoxQty;
        const diffPct = targetBoxQty > 0 ? ((diff / targetBoxQty) * 100).toFixed(1) : 0;
        const tolOk = Math.abs(diffPct) <= 1.0;
        const tolBadge = tolOk
          ? `<span style="background: #dcfce7; color: #166534; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 3px;">±0%</span>`
          : `<span style="background: #fef3c7; color: #92400e; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 3px;">${diff > 0 ? "+" : ""}${diffPct}%</span>`;

        return `
          <tr data-index="${idx}" style="border-bottom: 1px solid #e2e8f0; background: #fff;">
            <td style="padding: 8px 10px; font-weight: bold; text-align: center; color: #0f172a;">${cNo}</td>
            <td style="padding: 8px 10px;">
              <input type="text" class="ctn-barcode" value="${esc(barcode)}" style="font-family: monospace; font-size: 11px; width: 140px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px;">
            </td>
            <td style="padding: 8px 10px;">
              <select class="ctn-type" style="font-size: 11px; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px;">
                <option value="5-Ply Corrugated Box" ${c.box_type === "5-Ply Corrugated Box" ? "selected" : ""}>5-Ply Box</option>
                <option value="7-Ply Heavy Duty" ${c.box_type === "7-Ply Heavy Duty" ? "selected" : ""}>7-Ply Heavy</option>
                <option value="Wooden Crate / Pallet" ${c.box_type === "Wooden Crate / Pallet" ? "selected" : ""}>Wooden Crate</option>
                <option value="Polybag Bin / Pouch" ${c.box_type === "Polybag Bin / Pouch" ? "selected" : ""}>Polybag</option>
              </select>
            </td>
            <td style="padding: 8px 10px;">
              <input type="number" step="0.001" class="ctn-tare" value="${Number(tare).toFixed(3)}" style="font-family: monospace; font-size: 11.5px; width: 75px; text-align: right; padding: 4px; border: 1px solid #cbd5e1; border-radius: 3px;">
            </td>
            <td style="padding: 8px 10px;">
              <input type="number" step="0.001" class="ctn-gross" value="${Number(gross).toFixed(3)}" style="font-family: monospace; font-weight: bold; font-size: 12px; width: 85px; text-align: right; padding: 4px; border: 1.5px solid #0284c7; border-radius: 3px; background: #f0f9ff;">
            </td>
            <td style="padding: 8px 10px; font-family: monospace; font-weight: bold; text-align: right; color: #0f172a; font-size: 12px;">
              ${Number(net).toFixed(3)}
            </td>
            <td style="padding: 8px 10px; font-family: monospace; text-align: right; color: #64748b; font-size: 11.5px;">
              ${calcPcs}
            </td>
            <td style="padding: 8px 10px; text-align: right;">
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                <input type="number" step="1" class="ctn-verified" value="${c.verified_qty}" style="font-family: monospace; font-weight: 800; font-size: 12.5px; color: #1c625a; width: 75px; text-align: right; padding: 4px; border: 1.5px solid #1c625a; border-radius: 3px; background: #f0fdfa;">
                <button type="button" class="btn-sync-pcs" title="Sync with calculated pieces" style="background: #e2e8f0; border: none; border-radius: 3px; padding: 4px 6px; cursor: pointer; font-size: 10px;"></button>
              </div>
            </td>
            <td style="padding: 8px 10px; text-align: center;">
              ${tolBadge}
            </td>
            <td style="padding: 8px 10px; text-align: center;">
              <div style="display: flex; gap: 4px; justify-content: center;">
                <button type="button" class="btn-print-carton-label" title="Print 4x6'' Thermal Barcode Label" style="background: #1c625a; color: #fff; border: none; border-radius: 3px; padding: 4px 8px; font-size: 11px; cursor: pointer;">Label</button>
                ${cartons.length > 1 ? `<button type="button" class="btn-remove-carton" title="Remove box" style="background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; border-radius: 3px; padding: 4px 6px; font-size: 11px; cursor: pointer;">✕</button>` : ""}
              </div>
            </td>
          </tr>
        `;
      }).join("");

      return {
        html: rowsHtml,
        totals: {
          cartons: cartons.length,
          tare: Number(totTare.toFixed(3)),
          gross: Number(totGross.toFixed(3)),
          net: Number(totNet.toFixed(3)),
          qty: totQty
        }
      };
    }

    const { html: tableRows, totals } = renderCartonRows();

    detailContainer.innerHTML = `
      <!-- Header Action Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px; font-weight: 800; font-family: monospace; color: #0f172a;">${esc(consignment.packing_no)}</span>
            <span style="background: ${consignment.status === 'DISPATCHED' ? '#e0e7ff' : '#dcfce7'}; color: ${consignment.status === 'DISPATCHED' ? '#3730a3' : '#166534'}; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">
              ${esc(consignment.status || 'PACKED')}
            </span>
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
            Piece-Count Weighing Scale Dispatch Packing System • Barcode Box Slip
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          ${isSaved ? `
            <button type="button" id="btn-print-master-list" class="invmfg-btn" style="background: #1c625a; color: #fff; font-weight: bold; padding: 6px 14px; font-size: 11.5px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px;">
              <span>Master Packing List (A4)</span>
            </button>
            <button type="button" id="btn-print-all-labels" class="invmfg-btn" style="background: #0284c7; color: #fff; font-weight: bold; padding: 6px 14px; font-size: 11.5px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px;">
              <span>All Carton Labels</span>
            </button>
          ` : ""}
          <button type="button" id="btn-save-consignment" class="invmfg-btn" style="background: #059669; color: #fff; font-weight: bold; padding: 6px 16px; font-size: 12px; cursor: pointer; border-radius: 4px;">
            Save Consignment
          </button>
        </div>
      </div>

      <!-- Consignment Metadata Form -->
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 12px; display: flex; justify-content: space-between;">
          <span>Consignment &amp; Part Identification</span>
          <span style="font-size: 11px; color: #64748b; font-weight: normal;">* Required Fields</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 11.5px;">
          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Part Code *</label>
            <div style="display: flex; gap: 4px;">
              <input type="text" id="pkg-part-code" value="${esc(consignment.part_code || 'B1-VALVE-BODY')}" style="flex: 1; padding: 6px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-weight: bold; font-family: monospace;">
              <button type="button" id="btn-lookup-part-apw" title="Fetch APW from Master" style="background: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 8px; font-size: 11px; cursor: pointer;">APW</button>
            </div>
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Part Description</label>
            <input type="text" id="pkg-part-name" value="${esc(consignment.part_name || 'Precision Brass Valve Body')}" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Customer / Buyer Name *</label>
            <input type="text" id="pkg-customer-name" value="${esc(consignment.customer_name || 'Schneider Electric India Pvt Ltd')}" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Reference Doc Type &amp; No</label>
            <div style="display: flex; gap: 6px;">
              <select id="pkg-ref-doc-type" style="padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; width: 90px;">
                <option value="DC" ${consignment.ref_doc_type === 'DC' ? 'selected' : ''}>DC</option>
                <option value="INVOICE" ${consignment.ref_doc_type === 'INVOICE' ? 'selected' : ''}>Tax Inv</option>
                <option value="WORK_ORDER" ${consignment.ref_doc_type === 'WORK_ORDER' ? 'selected' : ''}>WO</option>
              </select>
              <input type="text" id="pkg-ref-doc-no" value="${esc(consignment.ref_doc_no || 'WO-2026-310')}" style="flex: 1; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: monospace;">
            </div>
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Raw Melt / Heat Number</label>
            <input type="text" id="pkg-heat-no" value="${esc(consignment.heat_no || 'HT-BRASS-704')}" style="width: 100%; padding: 6px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace; color: #800000; font-weight: bold;">
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Batch / Lot Number</label>
            <input type="text" id="pkg-batch-no" value="${esc(consignment.batch_no || 'BT-2026-421')}" style="width: 100%; padding: 6px; border: 1.5px solid #cbd5e1; border-radius: 4px; font-family: monospace; color: #004d40; font-weight: bold;">
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Packing Date</label>
            <input type="date" id="pkg-date" value="${consignment.packing_date ? consignment.packing_date.slice(0, 10) : new Date().toISOString().slice(0, 10)}" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Packer Name / Station</label>
            <input type="text" id="pkg-packer" value="${esc(consignment.packer_name || 'Packing Station 1')}" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;">
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Consignment Status</label>
            <select id="pkg-status" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold;">
              <option value="PACKED" ${consignment.status === 'PACKED' ? 'selected' : ''}>PACKED (Ready for Dispatch)</option>
              <option value="DISPATCHED" ${consignment.status === 'DISPATCHED' ? 'selected' : ''}>DISPATCHED</option>
              <option value="HOLD" ${consignment.status === 'HOLD' ? 'selected' : ''}>ON HOLD</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Piece-Count Weighing Scale Engine Card -->
      <div style="background: linear-gradient(180deg, #f8fafc, #edf2f7); border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;"></span>
            <span style="font-weight: 800; font-size: 13px; color: #0f172a;">Piece-Count Weighing Scale Calibration (APW)</span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="serial-status-indicator" style="font-size: 11px; color: #64748b; display: flex; align-items: center; gap: 4px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #94a3b8;"></span>
              <span>Scale Disconnected</span>
            </span>
            <button type="button" id="btn-scale-read" style="background: #0284c7; color: #fff; font-weight: bold; border: none; padding: 5px 12px; border-radius: 4px; font-size: 11px; cursor: pointer;">
              Read Scale Platform
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; font-size: 11.5px; align-items: flex-end;">
          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Sample Count (Pieces)</label>
            <div style="display: flex; gap: 4px;">
              <input type="number" id="scale-sample-pcs" value="${samplePcs}" style="width: 70px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; text-align: center;">
              <div style="display: flex; gap: 2px;">
                <button type="button" class="btn-sample-chip" data-pcs="10" style="padding: 4px 6px; font-size: 10px; border: 1px solid #cbd5e1; background: #fff; border-radius: 3px; cursor: pointer;">10</button>
                <button type="button" class="btn-sample-chip" data-pcs="20" style="padding: 4px 6px; font-size: 10px; border: 1px solid #cbd5e1; background: #fff; border-radius: 3px; cursor: pointer;">20</button>
                <button type="button" class="btn-sample-chip" data-pcs="50" style="padding: 4px 6px; font-size: 10px; border: 1px solid #cbd5e1; background: #fff; border-radius: 3px; cursor: pointer;">50</button>
              </div>
            </div>
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Sample Weight (Grams)</label>
            <input type="number" step="0.001" id="scale-sample-wt" value="${sampleWt}" style="width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-weight: bold; font-family: monospace; text-align: right;">
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Calibrated APW (g/pc)</label>
            <div id="badge-apw" style="background: #1c625a; color: #fff; font-family: monospace; font-size: 14px; font-weight: 800; padding: 6px 10px; border-radius: 4px; text-align: center;">
              ${Number(apw).toFixed(3)} g
            </div>
          </div>

          <div>
            <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px;">Standard Target Box Qty</label>
            <input type="number" step="1" id="scale-target-box-qty" value="${targetBoxQty}" style="width: 100%; padding: 6px; border: 1.5px solid #1c625a; border-radius: 4px; font-weight: 800; font-size: 13px; text-align: center; color: #1c625a; background: #fff;">
          </div>
        </div>
      </div>

      <!-- Carton Breakdown Table -->
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="font-weight: 800; font-size: 13px; color: #0f172a;">
            Carton Breakdown &amp; Weight Slip Grid
          </div>
          <button type="button" id="btn-add-carton" class="invmfg-btn" style="background: #059669; color: #fff; font-weight: bold; padding: 5px 12px; font-size: 11px; cursor: pointer; border-radius: 4px;">
            + Add Carton / Box
          </button>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left; color: #475569;">
                <th style="padding: 8px 10px; width: 40px; text-align: center;">#</th>
                <th style="padding: 8px 10px;">Carton Barcode Serial</th>
                <th style="padding: 8px 10px;">Box Type</th>
                <th style="padding: 8px 10px; text-align: right;">Tare (KG)</th>
                <th style="padding: 8px 10px; text-align: right;">Gross (KG) *</th>
                <th style="padding: 8px 10px; text-align: right;">Net (KG)</th>
                <th style="padding: 8px 10px; text-align: right;">Calc Pcs</th>
                <th style="padding: 8px 10px; text-align: right;">Verified Pcs</th>
                <th style="padding: 8px 10px; text-align: center;">Variance</th>
                <th style="padding: 8px 10px; text-align: center; width: 130px;">Action</th>
              </tr>
            </thead>
            <tbody id="carton-table-body">
              ${tableRows}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: bold; border-top: 2px solid #0f172a;">
                <td colspan="3" style="padding: 10px; text-align: right; text-transform: uppercase; color: #475569;">Total:</td>
                <td id="tot-tare-cell" style="padding: 10px; text-align: right; font-family: monospace;">${totals.tare.toFixed(3)}</td>
                <td id="tot-gross-cell" style="padding: 10px; text-align: right; font-family: monospace; color: #0284c7;">${totals.gross.toFixed(3)}</td>
                <td id="tot-net-cell" style="padding: 10px; text-align: right; font-family: monospace; font-size: 12.5px; color: #0f172a;">${totals.net.toFixed(3)}</td>
                <td></td>
                <td id="tot-qty-cell" style="padding: 10px; text-align: right; font-family: monospace; font-size: 14px; color: #1c625a; font-weight: 900;">${totals.qty}</td>
                <td colspan="2" style="padding: 10px; text-align: center; color: #166534; font-size: 11px;">${totals.cartons} Box${totals.cartons === 1 ? '' : 'es'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Remarks & Notes -->
      <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 4px; font-size: 11.5px;">Quality &amp; Packing Certification Notes</label>
        <textarea id="pkg-remarks" rows="2" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11.5px; font-family: inherit;">${esc(consignment.remarks || 'Electronic piece-counting scale calibrated. Corrugated 5-ply cartons strapped and protected with moisture-barrier VCI polybag liner for precision brass components.')}</textarea>
      </div>

      <!-- Bottom Actions Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #cbd5e1; padding-top: 16px; margin-bottom: 24px;">
        <div>
          ${isSaved ? `
            <button type="button" id="btn-delete-consignment" style="background: #fee2e2; color: #991b1b; font-weight: bold; border: 1px solid #fca5a5; padding: 6px 14px; border-radius: 4px; font-size: 11.5px; cursor: pointer;">
              Delete Consignment
            </button>
          ` : ""}
        </div>

        <div style="display: flex; gap: 8px;">
          ${isSaved ? `
            <button type="button" id="btn-print-master-list-bottom" class="invmfg-btn" style="background: #1c625a; color: #fff; font-weight: bold; padding: 6px 14px; font-size: 11.5px; cursor: pointer; border-radius: 4px;">
              Master Packing List (A4)
            </button>
            <button type="button" id="btn-print-all-labels-bottom" class="invmfg-btn" style="background: #0284c7; color: #fff; font-weight: bold; padding: 6px 14px; font-size: 11.5px; cursor: pointer; border-radius: 4px;">
              All Carton Labels
            </button>
          ` : ""}
          <button type="button" id="btn-save-consignment-bottom" class="invmfg-btn" style="background: #059669; color: #fff; font-weight: bold; padding: 6px 18px; font-size: 12px; cursor: pointer; border-radius: 4px;">
            Save Consignment
          </button>
        </div>
      </div>
    `;

    // Re-wire dynamic carton table events
    attachCartonTableEvents();

    // Scale calculation recalculator
    const samplePcsInput = document.getElementById("scale-sample-pcs");
    const sampleWtInput = document.getElementById("scale-sample-wt");
    const apwBadge = document.getElementById("badge-apw");
    const targetBoxQtyInput = document.getElementById("scale-target-box-qty");

    function updateAPW() {
      const pcs = Number(samplePcsInput?.value) || 20;
      const wt = Number(sampleWtInput?.value) || 300;
      if (pcs > 0 && wt > 0) {
        apw = Number((wt / pcs).toFixed(3));
        if (apwBadge) apwBadge.textContent = `${apw.toFixed(3)} g`;
        recalcAllCartons();
      }
    }

    if (samplePcsInput) samplePcsInput.addEventListener("input", updateAPW);
    if (sampleWtInput) sampleWtInput.addEventListener("input", updateAPW);
    if (targetBoxQtyInput) {
      targetBoxQtyInput.addEventListener("input", () => {
        targetBoxQty = Number(targetBoxQtyInput.value) || 1000;
        recalcAllCartons();
      });
    }

    document.querySelectorAll(".btn-sample-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (samplePcsInput) {
          samplePcsInput.value = btn.dataset.pcs;
          updateAPW();
        }
      });
    });

    // Lookup APW from Item Master
    const btnLookupApw = document.getElementById("btn-lookup-part-apw");
    if (btnLookupApw) {
      btnLookupApw.addEventListener("click", async () => {
        const partCode = document.getElementById("pkg-part-code")?.value.trim();
        if (!partCode) {
          alert("Please enter a Part Code first.");
          return;
        }
        try {
          const res = await fetch(`/api/packing/item-apw?code=${encodeURIComponent(partCode)}`);
          const json = await res.json();
          if (json.ok && json.data) {
            const masterApw = Number(json.data.apwGrams);
            if (masterApw > 0) {
              apw = masterApw;
              if (samplePcsInput && sampleWtInput) {
                const pcs = Number(samplePcsInput.value) || 20;
                sampleWtInput.value = (masterApw * pcs).toFixed(3);
              }
              if (apwBadge) apwBadge.textContent = `${apw.toFixed(3)} g`;
              if (json.data.partName && document.getElementById("pkg-part-name")) {
                document.getElementById("pkg-part-name").value = json.data.partName;
              }
              recalcAllCartons();
            }
          }
        } catch (err) {
          console.error("Lookup APW failed:", err);
        }
      });
    }

    // Add Carton Button
    const btnAddCarton = document.getElementById("btn-add-carton");
    if (btnAddCarton) {
      btnAddCarton.addEventListener("click", () => {
        const nextNo = cartons.length + 1;
        const defaultTare = 0.200;
        const defaultGross = Number(((targetBoxQty * apw / 1000) + defaultTare).toFixed(3));
        const defaultNet = Number((defaultGross - defaultTare).toFixed(3));
        cartons.push({
          carton_no: nextNo,
          carton_barcode: `CTN-${consignment.packing_no}-B${String(nextNo).padStart(2, "0")}`,
          box_type: "5-Ply Corrugated Box",
          tare_weight_kg: defaultTare,
          gross_weight_kg: defaultGross,
          net_weight_kg: defaultNet,
          calculated_qty: targetBoxQty,
          verified_qty: targetBoxQty,
          carton_status: "OK",
          notes: ""
        });
        refreshCartonTable();
      });
    }

    function refreshCartonTable() {
      const tbody = document.getElementById("carton-table-body");
      if (!tbody) return;
      const { html, totals: newTotals } = renderCartonRows();
      tbody.innerHTML = html;

      document.getElementById("tot-tare-cell").textContent = newTotals.tare.toFixed(3);
      document.getElementById("tot-gross-cell").textContent = newTotals.gross.toFixed(3);
      document.getElementById("tot-net-cell").textContent = newTotals.net.toFixed(3);
      document.getElementById("tot-qty-cell").textContent = newTotals.qty;

      attachCartonTableEvents();
    }

    function recalcAllCartons() {
      refreshCartonTable();
    }

    function attachCartonTableEvents() {
      const tbody = document.getElementById("carton-table-body");
      if (!tbody) return;

      tbody.querySelectorAll("tr").forEach((row) => {
        const idx = Number(row.dataset.index);
        const c = cartons[idx];
        if (!c) return;

        const inpTare = row.querySelector(".ctn-tare");
        const inpGross = row.querySelector(".ctn-gross");
        const inpVerified = row.querySelector(".ctn-verified");
        const inpBarcode = row.querySelector(".ctn-barcode");
        const selType = row.querySelector(".ctn-type");
        const btnSync = row.querySelector(".btn-sync-pcs");
        const btnRemove = row.querySelector(".btn-remove-carton");
        const btnPrintLabel = row.querySelector(".btn-print-carton-label");

        if (inpTare) {
          inpTare.addEventListener("input", () => {
            c.tare_weight_kg = Number(inpTare.value) || 0;
            refreshCartonTable();
          });
        }
        if (inpGross) {
          inpGross.addEventListener("input", () => {
            c.gross_weight_kg = Number(inpGross.value) || 0;
            refreshCartonTable();
          });
        }
        if (inpVerified) {
          inpVerified.addEventListener("input", () => {
            c.verified_qty = Number(inpVerified.value) || 0;
            refreshCartonTable();
          });
        }
        if (inpBarcode) {
          inpBarcode.addEventListener("change", () => {
            c.carton_barcode = inpBarcode.value.trim();
          });
        }
        if (selType) {
          selType.addEventListener("change", () => {
            c.box_type = selType.value;
          });
        }
        if (btnSync) {
          btnSync.addEventListener("click", () => {
            c.verified_qty = c.calculated_qty;
            if (inpVerified) inpVerified.value = c.calculated_qty;
            refreshCartonTable();
          });
        }
        if (btnRemove) {
          btnRemove.addEventListener("click", () => {
            if (cartons.length <= 1) {
              alert("A consignment must have at least one carton.");
              return;
            }
            cartons.splice(idx, 1);
            refreshCartonTable();
          });
        }
        if (btnPrintLabel) {
          btnPrintLabel.addEventListener("click", () => {
            if (!isSaved) {
              alert("Please save the consignment first before printing individual labels.");
              return;
            }
            window.open(`/api/print?type=carton_label&id=${consignment.packing_id}&box=${c.carton_no}`, "_blank");
          });
        }
      });
    }

    // Connect USB Scale Platform
    const btnScaleRead = document.getElementById("btn-scale-read");
    if (btnScaleRead) {
      btnScaleRead.addEventListener("click", async () => {
        if (!navigator.serial) {
          const manualWeight = prompt("Web Serial API is not supported in this browser or environment.\nEnter live weight in KG manually (e.g. 15.050):", "15.050");
          if (manualWeight && !isNaN(Number(manualWeight))) {
            const val = Number(manualWeight);
            if (cartons.length > 0) {
              cartons[cartons.length - 1].gross_weight_kg = val;
              refreshCartonTable();
            }
          }
          return;
        }

        try {
          if (!serialPort) {
            serialPort = await navigator.serial.requestPort();
            await serialPort.open({ baudRate: 9600 });
            const indicator = document.getElementById("serial-status-indicator");
            if (indicator) {
              indicator.innerHTML = '<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span><span style="color: #10b981; font-weight: bold;">Scale Connected (COM)</span>';
            }
          }
          readSerialScaleStream(cartons, refreshCartonTable);
        } catch (err) {
          console.error("Serial scale connect error:", err);
          alert("Scale Connection: " + err.message);
        }
      });
    }

    // Save Action Handler
    async function doSave() {
      const payload = {
        packing_id: consignment.packing_id || 0,
        packing_no: consignment.packing_no,
        packing_date: document.getElementById("pkg-date")?.value || new Date().toISOString().slice(0, 10),
        status: document.getElementById("pkg-status")?.value || "PACKED",
        customer_name: document.getElementById("pkg-customer-name")?.value.trim() || "",
        ref_doc_type: document.getElementById("pkg-ref-doc-type")?.value || "DC",
        ref_doc_no: document.getElementById("pkg-ref-doc-no")?.value.trim() || "",
        part_code: document.getElementById("pkg-part-code")?.value.trim() || "",
        part_name: document.getElementById("pkg-part-name")?.value.trim() || "",
        heat_no: document.getElementById("pkg-heat-no")?.value.trim() || "",
        batch_no: document.getElementById("pkg-batch-no")?.value.trim() || "",
        drawing_rev: "REV-01",
        apw_grams: apw,
        sample_pieces: Number(document.getElementById("scale-sample-pcs")?.value) || 20,
        sample_weight_grams: Number(document.getElementById("scale-sample-wt")?.value) || 300,
        target_box_qty: targetBoxQty,
        packer_name: document.getElementById("pkg-packer")?.value.trim() || "Packing Station 1",
        remarks: document.getElementById("pkg-remarks")?.value.trim() || "",
        cartons: cartons
      };

      if (!payload.part_code) {
        alert("Part Code is required.");
        return;
      }

      const saveBtns = [
        document.getElementById("btn-save-consignment"),
        document.getElementById("btn-save-consignment-bottom")
      ].filter(Boolean);

      saveBtns.forEach((b) => {
        b.disabled = true;
        b.textContent = "Saving...";
      });

      try {
        const res = await fetch("/api/packing/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!json.ok) {
          alert("Failed to save: " + (json.message || "Unknown error"));
          return;
        }

        alert("Consignment saved successfully!");
        await loadConsignments();
        if (json.data && json.data.packing_id) {
          selectConsignment(json.data.packing_id);
        }
      } catch (err) {
        console.error("Save consignment error:", err);
        alert("Error saving consignment: " + err.message);
      } finally {
        saveBtns.forEach((b) => {
          b.disabled = false;
          b.textContent = "Save Consignment";
        });
      }
    }

    const btnSaveTop = document.getElementById("btn-save-consignment");
    const btnSaveBottom = document.getElementById("btn-save-consignment-bottom");
    if (btnSaveTop) btnSaveTop.addEventListener("click", doSave);
    if (btnSaveBottom) btnSaveBottom.addEventListener("click", doSave);

    // Delete Action Handler
    const btnDelete = document.getElementById("btn-delete-consignment");
    if (btnDelete) {
      btnDelete.addEventListener("click", async () => {
        if (!confirm(`Are you sure you want to delete consignment ${consignment.packing_no}? This will also remove its box records.`)) {
          return;
        }
        btnDelete.disabled = true;
        try {
          const res = await fetch("/api/packing/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packing_id: consignment.packing_id })
          });
          const json = await res.json();
          if (json.ok) {
            alert("Consignment deleted.");
            activeConsignmentId = null;
            await loadConsignments();
            renderEmptyDetail();
          } else {
            alert("Delete failed: " + (json.message || "Unknown error"));
          }
        } catch (err) {
          alert("Delete error: " + err.message);
        }
      });
    }

    // Print Handlers
    function printMasterList() {
      if (!isSaved) return;
      window.open(`/api/print?type=packing_list&id=${consignment.packing_id}`, "_blank");
    }

    function printAllLabels() {
      if (!isSaved) return;
      cartons.forEach((c) => {
        window.open(`/api/print?type=carton_label&id=${consignment.packing_id}&box=${c.carton_no}`, "_blank");
      });
    }

    const btnPrintTop = document.getElementById("btn-print-master-list");
    const btnPrintBottom = document.getElementById("btn-print-master-list-bottom");
    if (btnPrintTop) btnPrintTop.addEventListener("click", printMasterList);
    if (btnPrintBottom) btnPrintBottom.addEventListener("click", printMasterList);

    const btnPrintAllTop = document.getElementById("btn-print-all-labels");
    const btnPrintAllBottom = document.getElementById("btn-print-all-labels-bottom");
    if (btnPrintAllTop) btnPrintAllTop.addEventListener("click", printAllLabels);
    if (btnPrintAllBottom) btnPrintAllBottom.addEventListener("click", printAllLabels);
  }

  function renderEmptyDetail() {
    if (!detailContainer) return;
    detailContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #64748b; text-align: center;">
        <span style="font-size: 36px; margin-bottom: 8px;"></span>
        <p style="font-size: 14px; font-weight: bold;">Select a Consignment or Weigh New Cartons</p>
        <p style="font-size: 12px; color: #94a3b8;">Calibrate Piece-Count Scales, tare cartons, and issue OEM Barcode Labels &amp; Master Packing Lists.</p>
      </div>`;
  }

  // Web Serial Scale Stream Reader
  async function readSerialScaleStream(cartons, refreshCb) {
    if (!serialPort || isReadingSerial) return;
    isReadingSerial = true;
    try {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
      serialReader = textDecoder.readable.getReader();

      let lineBuffer = "";
      while (true) {
        const { value, done } = await serialReader.read();
        if (done) break;
        lineBuffer += value;
        const lines = lineBuffer.split(/[\r\n]+/);
        lineBuffer = lines.pop();

        for (const line of lines) {
          const match = line.match(/([0-9]+\.[0-9]+)/);
          if (match) {
            const wtKg = parseFloat(match[1]);
            if (!isNaN(wtKg) && wtKg > 0 && cartons.length > 0) {
              cartons[cartons.length - 1].gross_weight_kg = wtKg;
              refreshCb();
            }
          }
        }
      }
    } catch (err) {
      console.warn("Serial scale read loop ended:", err);
    } finally {
      isReadingSerial = false;
    }
  }

  function stopSerialReader() {
    try {
      if (serialReader) {
        serialReader.cancel();
        serialReader = null;
      }
      if (serialPort) {
        serialPort.close();
        serialPort = null;
      }
    } catch (e) {
      // Ignore cleanup error
    }
  }

  // Search input listeners
  if (inputSearch) {
    inputSearch.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loadConsignments(inputSearch.value);
      }
    });
  }
  if (btnSearch) {
    btnSearch.addEventListener("click", () => {
      loadConsignments(inputSearch ? inputSearch.value : "");
    });
  }

  // Filter tabs
  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => {
        t.classList.remove("active");
        t.style.background = "#fff";
      });
      tab.classList.add("active");
      tab.style.background = "#e2e8f0";
      currentStatus = tab.dataset.status;
      renderConsignmentList();
    });
  });

  // + New Consignment button
  if (btnNewConsignment) {
    btnNewConsignment.addEventListener("click", () => {
      initNewConsignment();
    });
  }

  // Top Connect USB Scale button
  if (btnSerial) {
    btnSerial.addEventListener("click", () => {
      const readBtn = document.getElementById("btn-scale-read");
      if (readBtn) readBtn.click();
    });
  }
})();
