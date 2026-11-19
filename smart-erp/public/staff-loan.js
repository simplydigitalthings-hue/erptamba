// Human Resource - Staff Loan & Advance Recovery (frmStaffLoan)
(function () {
  const state = {
    currentStaffId: null,
    currentStaffName: "",
    staffList: [],
    filteredStaffList: [],
    loans: [],
    recovery: [],
    totalBalance: 0,
    mode: "save",
    currentOnly: true,
    searchTerm: ""
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

  function formatDateForDisplay(dStr) {
    if (!dStr) return "";
    if (dStr.includes("/")) return dStr;
    const parts = dStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
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

  async function loadStaffList() {
    try {
      const res = await fetch(`/api/staff-loan?current=${state.currentOnly}`);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to load staff list.", "error");
        return;
      }
      state.staffList = data.staffList || [];
      applyStaffFilter();

      const emptyDiv = el("loan-empty-state");
      const listDiv = el("loan-staff-list");

      if (state.staffList.length === 0) {
        if (emptyDiv) emptyDiv.hidden = false;
        if (listDiv) listDiv.hidden = true;
        clearDetails();
        return;
      } else {
        if (emptyDiv) emptyDiv.hidden = true;
        if (listDiv) listDiv.hidden = false;
      }

      // Auto-select first or maintain selection
      const targetId = (state.currentStaffId && state.staffList.some(s => s.staff_id === state.currentStaffId))
        ? state.currentStaffId
        : state.staffList[0].staff_id;

      await selectStaff(targetId);
    } catch (err) {
      console.error("loadStaffList error:", err);
      showToast("Error loading staff: " + err.message, "error");
    }
  }

  function applyStaffFilter() {
    const term = state.searchTerm.toLowerCase().trim();
    if (!term) {
      state.filteredStaffList = [...state.staffList];
    } else {
      state.filteredStaffList = state.staffList.filter(s =>
        (s.staff_name && s.staff_name.toLowerCase().includes(term)) ||
        String(s.staff_id).includes(term)
      );
    }
    renderStaffList();
  }

  function renderStaffList() {
    const listDiv = el("loan-staff-list");
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
        <div class="loan-staff-item ${activeClass}" data-id="${s.staff_id}">
          <div class="loan-staff-item-name">${escapeHtml(s.staff_name)}</div>
          <div class="loan-staff-item-meta">
            <span>ID: #${s.staff_id}</span>
          </div>
        </div>
      `;
    });
    listDiv.innerHTML = html;

    listDiv.querySelectorAll(".loan-staff-item").forEach((item) => {
      item.addEventListener("click", () => {
        const staffId = Number(item.dataset.id);
        selectStaff(staffId);
      });
    });
  }

  function clearDetails() {
    state.currentStaffId = null;
    state.currentStaffName = "";
    state.loans = [];
    state.recovery = [];
    state.totalBalance = 0;
    if (el("loan-lbl-name")) el("loan-lbl-name").textContent = "(Select an Employee)";
    if (el("loan-lbl-bal")) el("loan-lbl-bal").textContent = "₹ 0.00";
    renderMainGrid();
    renderRecoveryGrid();
  }

  async function selectStaff(staffId) {
    state.currentStaffId = staffId;
    renderStaffList();

    try {
      const res = await fetch(`/api/staff-loan?staffId=${staffId}&current=${state.currentOnly}`);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to load employee loan details.", "error");
        return;
      }

      state.currentStaffName = data.selectedStaff ? data.selectedStaff.staff_name : "";
      state.loans = data.loans || [];
      state.recovery = data.recovery || [];
      state.totalBalance = Number(data.totalBalance || 0);
      state.mode = data.mode || "save";

      if (el("loan-lbl-name")) {
        el("loan-lbl-name").textContent = state.currentStaffName || "Staff #" + staffId;
      }
      if (el("loan-lbl-bal")) {
        el("loan-lbl-bal").textContent = "₹ " + state.totalBalance.toFixed(2);
      }
      if (el("loan-btn-save")) {
        el("loan-btn-save").textContent = state.mode === "modify" ? "Modify Loans" : "Save Loans";
      }

      renderMainGrid();
      renderRecoveryGrid();

      if (state.loans.length === 0) {
        addLoanRow();
      }
    } catch (err) {
      console.error("selectStaff error:", err);
      showToast("Error loading employee loan details: " + err.message, "error");
    }
  }

  function addLoanRow() {
    const slNo = state.loans.length + 1;
    state.loans.push({
      loanId: 0,
      slNo: slNo,
      description: "",
      loanAmt: 0,
      repayPeriod: 1,
      loanDate: getTodayDate(),
      balance: 0,
      isNew: true
    });
    renderMainGrid();
  }

  function renderMainGrid() {
    const tbody = el("loan-tbody-main");
    if (!tbody) return;

    if (state.loans.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 18px; color: #64748b;">No active loan records. Click "+ Add Loan Row" to record a loan.</td></tr>';
      return;
    }

    let html = "";
    state.loans.forEach((l, idx) => {
      const slNo = idx + 1;
      l.slNo = slNo;
      const loanNoDisplay = l.loanId && l.loanId > 0 ? `#${l.loanId}` : "(New)";
      const isExisting = l.loanId && l.loanId > 0;

      html += `<tr data-idx="${idx}">
        <td style="text-align: center; font-weight: 600; color: #64748b;">${loanNoDisplay}</td>
        <td style="text-align: center;">${slNo}</td>
        <td>
          <input type="text" class="loan-input-desc" data-idx="${idx}" value="${escapeHtml(l.description || l.reason || '')}" placeholder="Reason / Description for loan" />
        </td>
        <td style="text-align: right;">
          <input type="number" step="0.01" min="0" class="loan-input-amt" data-idx="${idx}" value="${Number(l.loanAmt || l.loanamt || 0)}" />
        </td>
        <td style="text-align: center;">
          <input type="number" step="1" min="1" class="loan-input-months" data-idx="${idx}" value="${Number(l.repayPeriod || l.repayperiod || 1)}" />
        </td>
        <td style="text-align: center;">
          <input type="date" class="loan-input-date" data-idx="${idx}" value="${l.loanDate || l.loandate || getTodayDate()}" />
        </td>
        <td style="text-align: right; font-weight: 600; font-family: 'DM Mono', monospace;">
          <span class="loan-cell-bal" data-idx="${idx}">₹ ${Number(l.balance !== undefined ? l.balance : (l.loanAmt || l.loanamt || 0)).toFixed(2)}</span>
        </td>
        <td style="text-align: center;">
          ${!isExisting ? `<button type="button" class="loan-btn-del-row" data-idx="${idx}" title="Remove Row" aria-label="Remove Row">✕</button>` : '<span style="color: #94a3b8; font-size: 11px;">Active</span>'}
        </td>
      </tr>`;
    });

    tbody.innerHTML = html;

    // Attach row input listeners
    tbody.querySelectorAll(".loan-input-desc").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        if (state.loans[idx]) state.loans[idx].description = e.target.value;
      });
    });

    tbody.querySelectorAll(".loan-input-amt").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        const val = Number(e.target.value || 0);
        if (state.loans[idx]) {
          state.loans[idx].loanAmt = val;
          if (!state.loans[idx].loanId) {
            state.loans[idx].balance = val;
            const balSpan = tbody.querySelector(`.loan-cell-bal[data-idx="${idx}"]`);
            if (balSpan) balSpan.textContent = "₹ " + val.toFixed(2);
            updateTotalBalance();
          }
        }
      });
    });

    tbody.querySelectorAll(".loan-input-months").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.idx);
        if (state.loans[idx]) state.loans[idx].repayPeriod = Number(e.target.value || 1);
      });
    });

    tbody.querySelectorAll(".loan-input-date").forEach((inp) => {
      inp.addEventListener("change", (e) => {
        const idx = Number(e.target.dataset.idx);
        if (state.loans[idx]) state.loans[idx].loanDate = e.target.value;
      });
    });

    tbody.querySelectorAll(".loan-btn-del-row").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = Number(e.target.dataset.idx);
        state.loans.splice(idx, 1);
        renderMainGrid();
        updateTotalBalance();
      });
    });
  }

  function updateTotalBalance() {
    state.totalBalance = state.loans.reduce((sum, l) => sum + Number(l.balance !== undefined ? l.balance : (l.loanAmt || l.loanamt || 0)), 0);
    if (el("loan-lbl-bal")) {
      el("loan-lbl-bal").textContent = "₹ " + state.totalBalance.toFixed(2);
    }
  }

  function renderRecoveryGrid() {
    const tbody = el("loan-tbody-recovery");
    if (!tbody) return;

    if (state.recovery.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 14px; color: #64748b;">No salary deduction recoveries recorded for this employee.</td></tr>';
      return;
    }

    let html = "";
    state.recovery.forEach((r) => {
      html += `<tr>
        <td style="text-align: center; font-weight: 600;">#${r.loandedid || '-'}</td>
        <td style="text-align: center;">${r.saldate_display || formatDateForDisplay(r.saldate)}</td>
        <td style="text-align: right; font-weight: 600; font-family: 'DM Mono', monospace;">₹ ${Number(r.loanamtded || 0).toFixed(2)}</td>
        <td style="text-align: center; color: #64748b;">Payroll Deduction</td>
      </tr>`;
    });
    tbody.innerHTML = html;
  }

  async function handleSave() {
    if (!state.currentStaffId) {
      showToast("No employee selected.", "error");
      return;
    }

    if (state.loans.length === 0) {
      showToast("Please add at least one loan row.", "error");
      return;
    }

    for (let i = 0; i < state.loans.length; i++) {
      const l = state.loans[i];
      const slNo = l.slNo || (i + 1);
      const desc = String(l.description || l.reason || "").trim();
      const amt = Number(l.loanAmt !== undefined ? l.loanAmt : (l.loanamt || 0));
      const months = Number(l.repayPeriod !== undefined ? l.repayPeriod : (l.repayperiod || 0));
      const rawDate = String(l.loanDate || l.loandate || "").trim();

      if (!desc) {
        showToast("Enter Description for Loan Sl No. " + slNo, "error");
        return;
      }
      if (amt <= 0) {
        showToast("Enter valid Loan Amount for Sl No. " + slNo, "error");
        return;
      }
      if (months <= 0) {
        showToast("Enter tenure in months for Sl No. " + slNo, "error");
        return;
      }
      if (!rawDate || isNaN(new Date(rawDate).getTime())) {
        showToast("Enter valid Date for Sl No. " + slNo, "error");
        return;
      }
    }

    const confirmMsg = state.mode === "modify" ? "Are you sure you want to update loan details?" : "Are you sure you want to save this loan?";
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/staff-loan/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: state.currentStaffId,
          loans: state.loans
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to save record.", "error");
        return;
      }

      showToast(data.message || "Loan records saved successfully.", "success");
      await selectStaff(state.currentStaffId);
    } catch (err) {
      console.error("handleSave error:", err);
      showToast("Error saving loan: " + err.message, "error");
    }
  }

  async function handleDelete() {
    if (!state.currentStaffId) {
      showToast("No employee selected.", "error");
      return;
    }

    const confirmMsg = "This will delete all unrecovered loans where Balance equals the full Loan Amount. Are you sure?";
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/staff-loan/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: state.currentStaffId })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to delete loan record.", "error");
        return;
      }

      showToast(data.message || "Record deleted successfully.", "success");
      await selectStaff(state.currentStaffId);
    } catch (err) {
      console.error("handleDelete error:", err);
      showToast("Error deleting record: " + err.message, "error");
    }
  }

  function handlePrint() {
    if (!state.currentStaffId) {
      showToast("Please select an employee first.", "error");
      return;
    }
    window.open(`/api/print?type=staff-loan&staffId=${state.currentStaffId}`, "_blank");
  }

  function openStaffLoan() {
    const sec = el("staff-loan");
    if (!sec) return;
    sec.hidden = false;
    sec.style.display = "flex";

    loadStaffList();
  }

  function closeStaffLoan() {
    const sec = el("staff-loan");
    if (!sec) return;
    sec.hidden = true;
    sec.style.display = "none";
  }

  function init() {
    el("loan-btn-close-top")?.addEventListener("click", closeStaffLoan);
    el("loan-btn-exit")?.addEventListener("click", closeStaffLoan);
    el("loan-btn-save")?.addEventListener("click", handleSave);
    el("loan-btn-delete")?.addEventListener("click", handleDelete);
    el("loan-btn-print")?.addEventListener("click", handlePrint);
    el("loan-btn-add-row")?.addEventListener("click", () => {
      if (!state.currentStaffId) {
        showToast("Please select an employee first.", "error");
        return;
      }
      addLoanRow();
    });

    el("loan-staff-search")?.addEventListener("input", (e) => {
      state.searchTerm = e.target.value;
      applyStaffFilter();
    });

    el("loan-chk-current")?.addEventListener("change", (e) => {
      state.currentOnly = e.target.checked;
      loadStaffList();
    });

    el("loan-chk-details")?.addEventListener("change", (e) => {
      const recFrame = el("loan-recovery-frame");
      if (recFrame) {
        recFrame.style.display = e.target.checked ? "block" : "none";
      }
    });

    window.openStaffLoan = openStaffLoan;
    window.closeStaffLoan = closeStaffLoan;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
