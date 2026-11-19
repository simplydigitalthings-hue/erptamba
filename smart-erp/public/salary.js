// Human Resource - Salary Processing & Industrial Payroll (frmSalary)
(function () {
  const state = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    salDate: getTodayDate(),
    workingDays: 30,
    staffList: [],
    filteredStaffList: [],
    currentStaffId: null,
    currentStaffName: "",
    mode: "save",
    record: null,
    settings: { pfRate: 12, esiRate: 1.75 },
    searchTerm: "",
    isBatchProcessing: false
  };

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getTodayDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function numVal(id) {
    const v = Number(el(id)?.value || 0);
    return isNaN(v) ? 0 : v;
  }

  function setNum(id, val) {
    const elem = el(id);
    if (!elem) return;
    const n = Number(val || 0);
    elem.value = isNaN(n) ? "0.00" : n.toFixed(2);
  }

  async function initSalary() {
    try {
      const res = await fetch(`/api/salary/init?year=${state.year}&month=${state.month}`);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to initialize salary module.", "error");
        return;
      }

      state.settings = data.settings || state.settings;
      state.workingDays = data.workingDays || 30;
      if (el("sal-working-days")) el("sal-working-days").value = state.workingDays;
      if (el("sal-year")) el("sal-year").value = state.year;
      if (el("sal-date")) el("sal-date").value = state.salDate;

      // Render months
      const monthSel = el("sal-month");
      if (monthSel && data.months) {
        let mOpts = "";
        data.months.forEach((m) => {
          mOpts += `<option value="${m.monthid}" ${m.monthid === state.month ? "selected" : ""}>${escapeHtml(m.monthname)}</option>`;
        });
        monthSel.innerHTML = mOpts;
      }

      state.staffList = data.staffList || [];
      applyStaffFilter();

      const emptyDiv = el("sal-empty-state");
      const listDiv = el("sal-staff-list");
      const badge = el("sal-staff-count-badge");

      if (badge) badge.textContent = String(state.staffList.length);

      if (state.staffList.length === 0) {
        if (emptyDiv) emptyDiv.hidden = false;
        if (listDiv) listDiv.hidden = true;
        clearForm();
        return;
      } else {
        if (emptyDiv) emptyDiv.hidden = true;
        if (listDiv) listDiv.hidden = false;
      }

      // Auto-select first staff or keep current selection if valid
      const targetId = (state.currentStaffId && state.staffList.some(s => s.staff_id === state.currentStaffId))
        ? state.currentStaffId
        : state.staffList[0].staff_id;

      await selectStaff(targetId);
    } catch (err) {
      console.error("initSalary error:", err);
      showToast("Error initializing salary module: " + err.message, "error");
    }
  }

  function applyStaffFilter() {
    const term = state.searchTerm.toLowerCase().trim();
    if (!term) {
      state.filteredStaffList = [...state.staffList];
    } else {
      state.filteredStaffList = state.staffList.filter(s =>
        (s.staff_name && s.staff_name.toLowerCase().includes(term)) ||
        (s.dept && s.dept.toLowerCase().includes(term)) ||
        String(s.staff_id).includes(term)
      );
    }
    renderStaffList();
  }

  function renderStaffList() {
    const listDiv = el("sal-staff-list");
    if (!listDiv) return;

    if (state.filteredStaffList.length === 0) {
      listDiv.innerHTML = '<div style="padding: 12px 8px; color: #64748b; font-size: 11px; text-align: center;">No matching employees</div>';
      return;
    }

    let html = "";
    state.filteredStaffList.forEach((s) => {
      const isSelected = state.currentStaffId === s.staff_id;
      const activeClass = isSelected ? "active" : "";
      html += `
        <div class="sal-staff-item ${activeClass}" data-id="${s.staff_id}">
          <div class="sal-staff-item-name">${escapeHtml(s.staff_name)}</div>
          <div class="sal-staff-item-meta">
            <span>ID: #${s.staff_id}</span>
            <span>${escapeHtml(s.dept || "Staff")}</span>
          </div>
        </div>
      `;
    });
    listDiv.innerHTML = html;

    listDiv.querySelectorAll(".sal-staff-item").forEach((item) => {
      item.addEventListener("click", () => {
        const staffId = Number(item.dataset.id);
        selectStaff(staffId);
      });
    });
  }

  async function selectStaff(staffId) {
    state.currentStaffId = staffId;
    renderStaffList();

    const emp = state.staffList.find((s) => s.staff_id === staffId);
    state.currentStaffName = emp ? emp.staff_name : "";
    if (el("sal-lbl-dept")) el("sal-lbl-dept").textContent = emp?.dept || "-";

    try {
      const res = await fetch(`/api/salary?year=${state.year}&month=${state.month}&staffId=${staffId}`);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to load employee salary details.", "error");
        return;
      }

      state.mode = data.mode || "save";
      state.record = data.record || {};
      populateForm(state.record);

      const modePill = el("sal-lbl-mode");
      if (modePill) {
        if (state.mode === "modify") {
          modePill.textContent = "Saved Record (Modify Mode)";
          modePill.className = "sal-mode-pill mode-saved";
        } else {
          modePill.textContent = "New Salary Entry";
          modePill.className = "sal-mode-pill mode-new";
        }
      }
      if (el("sal-btn-save")) {
        el("sal-btn-save").textContent = state.mode === "modify" ? "Modify Salary" : "Save Salary";
      }

      // If new, automatically calculate initial values
      if (state.mode === "save") {
        await doCalc(false);
      }
    } catch (err) {
      console.error("selectStaff error:", err);
    }
  }

  function clearForm() {
    state.record = null;
    state.mode = "save";
    const modePill = el("sal-lbl-mode");
    if (modePill) {
      modePill.textContent = "No Employee Selected";
      modePill.className = "sal-mode-pill";
    }
    if (el("sal-lbl-dept")) el("sal-lbl-dept").textContent = "-";
    ["sal-days-present", "sal-leave-days", "sal-basic", "sal-da", "sal-hra", "sal-convey", "sal-medical", "sal-attbonus", "sal-ot-hrs", "sal-splallow", "sal-other-allow", "sal-misc-earning", "sal-pf", "sal-esi", "sal-pt", "sal-advance", "sal-loan", "sal-tds", "sal-society", "sal-insurance", "sal-fines", "sal-damage", "sal-other-ded", "sal-oldbal", "sal-paid"].forEach(id => {
      const elem = el(id);
      if (elem) elem.value = "";
    });
    ["sal-gross", "sal-totded", "sal-netpay", "sal-balance"].forEach(id => {
      setNum(id, 0);
    });
  }

  function populateForm(r) {
    if (!r) return;
    if (el("sal-date")) el("sal-date").value = r.saldate ? String(r.saldate).slice(0, 10) : getTodayDate();
    if (el("sal-working-days")) el("sal-working-days").value = r.workingdays !== undefined ? r.workingdays : state.workingDays;
    if (el("sal-days-present")) el("sal-days-present").value = r.dayspresent !== undefined ? r.dayspresent : 0;
    if (el("sal-leave-days")) el("sal-leave-days").value = r.leavedays !== undefined ? r.leavedays : 0;
    if (el("sal-basic")) el("sal-basic").value = Number(r.basic || 0);
    if (el("sal-da")) el("sal-da").value = Number(r.da || 0);
    if (el("sal-chk-da2pf")) el("sal-chk-da2pf").checked = !!r.da2pf;

    if (el("sal-opt-hra-basic")) el("sal-opt-hra-basic").checked = r.hrabasic !== false;
    if (el("sal-opt-hra-fixed")) el("sal-opt-hra-fixed").checked = r.hrabasic === false;
    if (el("sal-hra")) el("sal-hra").value = Number(r.hra || 0);

    if (el("sal-opt-convey-day")) el("sal-opt-convey-day").checked = r.conveyday !== false;
    if (el("sal-opt-convey-month")) el("sal-opt-convey-month").checked = r.conveyday === false;
    if (el("sal-convey")) el("sal-convey").value = Number(r.conveyance || 0);

    if (el("sal-medical")) el("sal-medical").value = Number(r.medicalallow || 0);
    if (el("sal-chk-attbonus")) el("sal-chk-attbonus").checked = !!r.attbonusapplicable;
    if (el("sal-attbonus")) el("sal-attbonus").value = Number(r.attbonus || 0);

    if (el("sal-ot-hrs")) el("sal-ot-hrs").value = Number(r.ot || 0);
    if (el("sal-ot-times")) el("sal-ot-times").value = Number(r.ottimes || 1);
    if (el("sal-opt-ot-basic")) el("sal-opt-ot-basic").checked = r.otbasic !== false;
    if (el("sal-opt-ot-fixed")) el("sal-opt-ot-fixed").checked = r.otbasic === false;

    if (el("sal-splallow")) el("sal-splallow").value = Number(r.splallow || 0);
    if (el("sal-other-allow")) el("sal-other-allow").value = Number(r.otherallow || 0);
    if (el("sal-misc-earning")) el("sal-misc-earning").value = Number(r.miscearning || 0);
    setNum("sal-gross", r.gross);

    if (el("sal-chk-pf")) el("sal-chk-pf").checked = r.pfapplicable !== false;
    setNum("sal-pf", r.pf);
    if (el("sal-chk-esi")) el("sal-chk-esi").checked = r.esiapplicable !== false;
    setNum("sal-esi", r.esi);
    if (el("sal-chk-pt")) el("sal-chk-pt").checked = r.ptapplicable !== false;
    setNum("sal-pt", r.pt);

    if (el("sal-advance")) el("sal-advance").value = Number(r.saladvance || 0);
    if (el("sal-loan")) el("sal-loan").value = Number(r.loanamtded || 0);
    if (el("sal-tds")) el("sal-tds").value = Number(r.tds || 0);
    if (el("sal-society")) el("sal-society").value = Number(r.society || 0);
    if (el("sal-insurance")) el("sal-insurance").value = Number(r.insurance || 0);
    if (el("sal-fines")) el("sal-fines").value = Number(r.fines || 0);
    if (el("sal-damage")) el("sal-damage").value = Number(r.damageloss || 0);
    if (el("sal-other-ded")) el("sal-other-ded").value = Number(r.otherded || 0);

    setNum("sal-totded", r.totded);
    if (el("sal-oldbal")) el("sal-oldbal").value = Number(r.oldbal || 0);
    setNum("sal-netpay", r.netpay);
    if (el("sal-paid")) el("sal-paid").value = Number(r.paid !== undefined ? r.paid : (r.netpay || 0));
    setNum("sal-balance", r.balance);
  }

  function getFormPayload() {
    return {
      salyear: state.year,
      salmonth: state.month,
      saldate: el("sal-date")?.value || getTodayDate(),
      staffid: state.currentStaffId,
      dept: el("sal-lbl-dept")?.textContent || "",
      workingdays: numVal("sal-working-days"),
      dayspresent: numVal("sal-days-present"),
      leavedays: numVal("sal-leave-days"),
      basic: numVal("sal-basic"),
      da: numVal("sal-da"),
      da2pf: !!el("sal-chk-da2pf")?.checked,
      hrabasic: !!el("sal-opt-hra-basic")?.checked,
      hra: numVal("sal-hra"),
      conveyday: !!el("sal-opt-convey-day")?.checked,
      conveyance: numVal("sal-convey"),
      medicalallow: numVal("sal-medical"),
      attbonusapplicable: !!el("sal-chk-attbonus")?.checked,
      attbonus: numVal("sal-attbonus"),
      ot: numVal("sal-ot-hrs"),
      ottimes: numVal("sal-ot-times"),
      otbasic: !!el("sal-opt-ot-basic")?.checked,
      splallow: numVal("sal-splallow"),
      otherallow: numVal("sal-other-allow"),
      miscearning: numVal("sal-misc-earning"),
      gross: numVal("sal-gross"),
      pfapplicable: !!el("sal-chk-pf")?.checked,
      pf: numVal("sal-pf"),
      pfRate: state.settings.pfRate,
      esiapplicable: !!el("sal-chk-esi")?.checked,
      esi: numVal("sal-esi"),
      esiRate: state.settings.esiRate,
      ptapplicable: !!el("sal-chk-pt")?.checked,
      pt: numVal("sal-pt"),
      saladvance: numVal("sal-advance"),
      loanamtded: numVal("sal-loan"),
      loandedid: state.record?.loandedid || null,
      tds: numVal("sal-tds"),
      society: numVal("sal-society"),
      insurance: numVal("sal-insurance"),
      fines: numVal("sal-fines"),
      damageloss: numVal("sal-damage"),
      otherded: numVal("sal-other-ded"),
      totded: numVal("sal-totded"),
      oldbal: numVal("sal-oldbal"),
      netpay: numVal("sal-netpay"),
      paid: numVal("sal-paid"),
      balance: numVal("sal-balance")
    };
  }

  async function doCalc(showAlerts = true) {
    const payload = getFormPayload();

    try {
      const res = await fetch("/api/salary/calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        if (showAlerts) showToast(data.error || "Calculation error.", "error");
        return false;
      }

      setNum("sal-gross", data.gross);
      setNum("sal-pf", data.pf);
      setNum("sal-esi", data.esi);
      setNum("sal-pt", data.pt);
      setNum("sal-totded", data.totded);
      setNum("sal-netpay", data.netpay);
      if (el("sal-paid") && (!el("sal-paid").value || el("sal-paid").value === "0.00" || el("sal-paid").value === "0")) {
        el("sal-paid").value = data.paid;
      }
      const paidVal = numVal("sal-paid");
      const balVal = Math.round((data.netpay - paidVal) * 100) / 100;
      setNum("sal-balance", balVal);
      return true;
    } catch (err) {
      console.error("doCalc error:", err);
      if (showAlerts) showToast("Calculation failed: " + err.message, "error");
      return false;
    }
  }

  async function handleSave() {
    if (!state.currentStaffId) {
      showToast("Please select an employee first.", "error");
      return;
    }

    const calcOk = await doCalc(true);
    if (!calcOk) return;

    const payload = getFormPayload();

    try {
      const res = await fetch("/api/salary/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to save salary.", "error");
        return;
      }

      showToast(data.message || "Salary stored successfully.", "success");
      await selectStaff(state.currentStaffId);
    } catch (err) {
      console.error("handleSave error:", err);
      showToast("Error saving salary: " + err.message, "error");
    }
  }

  async function handleDelete() {
    if (!state.currentStaffId || state.mode !== "modify") {
      showToast("No saved salary record to delete.", "error");
      return;
    }

    if (!confirm("Are you sure you want to delete this salary record?")) return;

    try {
      const res = await fetch("/api/salary/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salyear: state.year,
          salmonth: state.month,
          staffid: state.currentStaffId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to delete salary.", "error");
        return;
      }

      showToast(data.message || "Record deleted successfully.", "success");
      await selectStaff(state.currentStaffId);
    } catch (err) {
      console.error("handleDelete error:", err);
      showToast("Error deleting salary: " + err.message, "error");
    }
  }

  async function handleBatchProcess() {
    if (state.isBatchProcessing) return;
    if (state.staffList.length === 0) {
      showToast("No employees found to process.", "error");
      return;
    }

    const confirmMsg = `Process salaries for all ${state.staffList.length} employee(s) for ${el("sal-month")?.options[el("sal-month")?.selectedIndex]?.text || "selected month"} ${state.year}?`;
    if (!confirm(confirmMsg)) return;

    state.isBatchProcessing = true;
    const batchBtn = el("sal-btn-batch");
    const originalText = batchBtn ? batchBtn.textContent : "Process All Salaries";

    if (batchBtn) {
      batchBtn.disabled = true;
      batchBtn.textContent = "Processing Payroll...";
    }

    try {
      const res = await fetch("/api/salary/batch-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: state.year,
          month: state.month,
          saldate: el("sal-date")?.value || getTodayDate(),
          workingdays: numVal("sal-working-days")
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Batch processing failed.", "error");
        return;
      }

      showToast(data.message || `Processed ${data.processedCount} salaries successfully.`, "success");
      await initSalary();
    } catch (err) {
      console.error("handleBatchProcess error:", err);
      showToast("Error in batch payroll processing: " + err.message, "error");
    } finally {
      state.isBatchProcessing = false;
      if (batchBtn) {
        batchBtn.disabled = false;
        batchBtn.textContent = originalText;
      }
    }
  }

  function handlePrint() {
    if (!state.currentStaffId) {
      showToast("Select an employee first.", "error");
      return;
    }
    window.open(`/api/print?type=salary&year=${state.year}&month=${state.month}&staffId=${state.currentStaffId}`, "_blank");
  }

  function handlePrintAll() {
    window.open(`/api/print?type=salary-register&year=${state.year}&month=${state.month}`, "_blank");
  }

  function showToast(msg, type = "info") {
    const existing = document.getElementById("hr-modern-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "hr-modern-toast";
    toast.style.position = "fixed";
    toast.style.bottom = "24px";
    toast.style.right = "24px";
    toast.style.padding = "10px 18px";
    toast.style.borderRadius = "4px";
    toast.style.fontSize = "12px";
    toast.style.fontWeight = "600";
    toast.style.zIndex = "99999";
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    toast.style.transition = "opacity 0.2s ease, transform 0.2s ease";
    toast.style.fontFamily = "'DM Sans', sans-serif";

    if (type === "error") {
      toast.style.background = "#b91c1c";
      toast.style.color = "#ffffff";
    } else if (type === "success") {
      toast.style.background = "#1c625a";
      toast.style.color = "#ffffff";
    } else {
      toast.style.background = "#0f172a";
      toast.style.color = "#ffffff";
    }

    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function openSalary() {
    const sec = el("salary");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";

    initSalary();
  }

  function closeSalary() {
    const sec = el("salary");
    if (!sec) return;
    sec.hidden = true;
    sec.style.display = "none";
  }

  function bindEvents() {
    el("sal-btn-close-top")?.addEventListener("click", closeSalary);
    el("sal-btn-exit")?.addEventListener("click", closeSalary);
    el("sal-btn-calc")?.addEventListener("click", () => doCalc(true));
    el("sal-btn-save")?.addEventListener("click", handleSave);
    el("sal-btn-delete")?.addEventListener("click", handleDelete);
    el("sal-btn-batch")?.addEventListener("click", handleBatchProcess);
    el("sal-btn-print")?.addEventListener("click", handlePrint);
    el("sal-btn-print-all")?.addEventListener("click", handlePrintAll);

    // Live employee search filter
    el("sal-staff-search")?.addEventListener("input", (e) => {
      state.searchTerm = e.target.value;
      applyStaffFilter();
    });

    el("sal-year")?.addEventListener("change", (e) => {
      state.year = Number(e.target.value);
      initSalary();
    });

    el("sal-month")?.addEventListener("change", (e) => {
      state.month = Number(e.target.value);
      initSalary();
    });

    el("sal-paid")?.addEventListener("input", () => {
      const netPay = numVal("sal-netpay");
      const paid = numVal("sal-paid");
      setNum("sal-balance", netPay - paid);
    });

    // Auto calculate on value changes
    [
      "sal-basic", "sal-da", "sal-hra", "sal-convey", "sal-medical",
      "sal-attbonus", "sal-ot-hrs", "sal-ot-times", "sal-splallow",
      "sal-other-allow", "sal-misc-earning", "sal-advance", "sal-loan",
      "sal-tds", "sal-society", "sal-insurance", "sal-fines", "sal-damage",
      "sal-other-ded", "sal-oldbal"
    ].forEach((id) => {
      el(id)?.addEventListener("blur", () => doCalc(false));
    });

    [
      "sal-chk-da2pf", "sal-opt-hra-basic", "sal-opt-hra-fixed",
      "sal-opt-convey-day", "sal-opt-convey-month", "sal-chk-attbonus",
      "sal-opt-ot-basic", "sal-opt-ot-fixed", "sal-chk-pf", "sal-chk-esi", "sal-chk-pt"
    ].forEach((id) => {
      el(id)?.addEventListener("change", () => doCalc(false));
    });

    window.openSalary = openSalary;
    window.closeSalary = closeSalary;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindEvents);
  } else {
    bindEvents();
  }
})();
