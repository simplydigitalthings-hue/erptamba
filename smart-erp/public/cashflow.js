// Cash Flow & Treasury Command Center (cashflow.js)
(function () {
  let state = {
    currentTab: "overview",
    overview: null,
    forecast: null,
    book: null,
    parties: [],
    banks: [],
    batchRows: [],
    activeDrawerRowIdx: -1,
    drawerBills: [],
    searchDebounce: null
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

  function formatCurrency(val) {
    const num = Number(val || 0);
    return isNaN(num) ? "0.00" : num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function todayStr() {
    return new Date().toISOString().split("T")[0];
  }

  function numToWords(n) {
    const num = Math.round(Number(n || 0));
    if (num <= 0) return "Rupees Zero Only";
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function inWords(val) {
      if (val < 20) return a[val];
      if (val < 100) return b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : "");
      if (val < 1000) return a[Math.floor(val / 100)] + " Hundred" + (val % 100 !== 0 ? " and " + inWords(val % 100) : "");
      if (val < 100000) return inWords(Math.floor(val / 1000)) + " Thousand" + (val % 1000 !== 0 ? " " + inWords(val % 1000) : "");
      if (val < 10000000) return inWords(Math.floor(val / 100000)) + " Lakh" + (val % 100000 !== 0 ? " " + inWords(val % 100000) : "");
      return inWords(Math.floor(val / 10000000)) + " Crore" + (val % 10000000 !== 0 ? " " + inWords(val % 10000000) : "");
    }

    return "Rupees " + inWords(num) + " Only";
  }

  /* --------------------------------------------------------------------------
     Navigation & Tab Switching
     -------------------------------------------------------------------------- */
  function switchTab(tabName) {
    state.currentTab = tabName;
    document.querySelectorAll(".cf-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    document.querySelectorAll(".cf-tab-content").forEach(view => {
      view.hidden = (view.id !== `cf-view-${tabName}`);
    });

    if (tabName === "overview") loadOverview();
    else if (tabName === "book") loadBook();
    else if (tabName === "batch" && state.batchRows.length === 0) addBatchRow();
    else if (tabName === "voucher") syncSingleVoucherPreview();
  }

  /* --------------------------------------------------------------------------
     Tab 1: Overview & Cockpit
     -------------------------------------------------------------------------- */
  async function loadOverview() {
    try {
      const [ovRes, fcRes, ptRes] = await Promise.all([
        fetch("/api/cashflow/overview"),
        fetch("/api/cashflow/forecast"),
        fetch("/api/cashflow/parties")
      ]);

      if (ovRes.ok) state.overview = await ovRes.json();
      if (fcRes.ok) state.forecast = await fcRes.json();
      if (ptRes.ok) {
        const ptData = await ptRes.json();
        state.parties = ptData.parties || [];
        state.banks = ptData.banks || [];
        populateDatalists();
      }

      renderOverview();
    } catch (err) {
      console.error("loadOverview error:", err);
    }
  }

  function renderOverview() {
    const ov = state.overview;
    const fc = state.forecast;
    if (!ov) return;

    // KPI Cards
    if (el("cf-kpi-liquid")) el("cf-kpi-liquid").textContent = `₹${formatCurrency(ov.totalLiquid)}`;
    if (el("cf-total-liquid-val")) el("cf-total-liquid-val").textContent = `₹${formatCurrency(ov.totalLiquid)}`;
    if (el("cf-kpi-mtd-in")) el("cf-kpi-mtd-in").textContent = `₹${formatCurrency(ov.mtd?.inflows)}`;
    if (el("cf-kpi-mtd-out")) el("cf-kpi-mtd-out").textContent = `₹${formatCurrency(ov.mtd?.outflows)}`;
    if (el("cf-kpi-forecast")) el("cf-kpi-forecast").textContent = `₹${formatCurrency(fc?.projectedNet || ov.totalLiquid)}`;

    // Bank Account Cards Grid
    const bankGrid = el("cf-bank-cards-container");
    if (bankGrid) {
      let bHtml = "";
      // Cash in Hand card
      bHtml += `
        <div class="cf-bank-card cash-card">
          <div class="cf-bank-name">Cash in Hand / Petty Cash</div>
          <div class="cf-bank-bal" style="color: ${ov.cashBalance >= 0 ? 'var(--primary)' : 'var(--danger)'};">₹${formatCurrency(ov.cashBalance)}</div>
          <div class="cf-bank-meta">Factory petty cash drawer</div>
        </div>
      `;

      for (const b of (ov.banks || [])) {
        bHtml += `
          <div class="cf-bank-card">
            <div class="cf-bank-name">${escapeHtml(b.bankName)}</div>
            <div class="cf-bank-bal">₹${formatCurrency(b.balance)}</div>
            <div class="cf-bank-meta">Credit Limit: ₹${formatCurrency(b.creditLimit)}</div>
          </div>
        `;
      }
      bankGrid.innerHTML = bHtml;
    }

    // Monthly Bar Chart (Inflows vs Outflows)
    const chartCont = el("cf-monthly-chart-container");
    const labelsCont = el("cf-monthly-chart-labels");
    if (chartCont && labelsCont && Array.isArray(ov.monthlyTrend)) {
      chartCont.innerHTML = "";
      labelsCont.innerHTML = "";

      let maxVal = 1000;
      ov.monthlyTrend.forEach(m => {
        if (m.inflows > maxVal) maxVal = m.inflows;
        if (m.outflows > maxVal) maxVal = m.outflows;
      });

      ov.monthlyTrend.forEach(m => {
        const inH = Math.max(6, Math.round((m.inflows / maxVal) * 150));
        const outH = Math.max(6, Math.round((m.outflows / maxVal) * 150));

        const barGroup = document.createElement("div");
        barGroup.style.display = "flex";
        barGroup.style.alignItems = "flex-end";
        barGroup.style.gap = "4px";
        barGroup.style.flex = "1";
        barGroup.style.justifyContent = "center";
        barGroup.title = `${m.month}\nInflow: ₹${formatCurrency(m.inflows)}\nOutflow: ₹${formatCurrency(m.outflows)}\nNet: ₹${formatCurrency(m.net)}`;

        barGroup.innerHTML = `
          <div style="width: 14px; height: ${inH}px; background: var(--success); border-radius: 2px 2px 0 0;"></div>
          <div style="width: 14px; height: ${outH}px; background: var(--danger); border-radius: 2px 2px 0 0;"></div>
        `;
        chartCont.appendChild(barGroup);

        const lbl = document.createElement("div");
        lbl.style.flex = "1";
        lbl.style.textAlign = "center";
        lbl.textContent = m.month.split(" ")[0];
        labelsCont.appendChild(lbl);
      });
    }

    // 30-Day Liquidity Forecast Buckets
    const forecastCont = el("cf-forecast-buckets-container");
    if (forecastCont && fc?.buckets) {
      let fHtml = "";
      for (const key of Object.keys(fc.buckets)) {
        const b = fc.buckets[key];
        const net = b.rec - b.pay;
        fHtml += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--bg-stripe); border-radius: var(--radius-xs); font-size: 11.5px;">
            <span style="font-weight: 600; width: 100px;">${escapeHtml(b.label)}</span>
            <span style="color: var(--success); font-family: var(--font-mono); width: 90px; text-align: right;">+₹${formatCurrency(b.rec)}</span>
            <span style="color: var(--danger); font-family: var(--font-mono); width: 90px; text-align: right;">-₹${formatCurrency(b.pay)}</span>
            <span style="font-weight: 700; font-family: var(--font-mono); width: 100px; text-align: right; color: ${net >= 0 ? 'var(--primary)' : 'var(--danger)'};">₹${formatCurrency(net)}</span>
          </div>
        `;
      }
      forecastCont.innerHTML = fHtml;
    }
  }

  function populateDatalists() {
    const datalist = el("cf-parties-datalist");
    if (datalist) {
      datalist.innerHTML = "";
      for (const p of state.parties) {
        const opt = document.createElement("option");
        opt.value = p.name;
        opt.label = `${p.type} (#${p.id})`;
        datalist.appendChild(opt);
      }
    }

    // Populate Account select in Daily Book
    const bookAcc = el("cf-book-account");
    if (bookAcc) {
      const cur = bookAcc.value;
      bookAcc.innerHTML = `
        <option value="all">All Accounts (Consolidated)</option>
        <option value="cash">Cash in Hand / Petty Cash</option>
      `;
      for (const b of state.banks) {
        const opt = document.createElement("option");
        opt.value = String(b.id);
        opt.textContent = `Bank: ${b.name}`;
        bookAcc.appendChild(opt);
      }
      bookAcc.value = cur || "all";
    }

    // Populate Single Voucher Bank select
    const svBank = el("cf-sv-bank");
    if (svBank) {
      svBank.innerHTML = `<option value="">-- Choose Bank --</option>`;
      for (const b of state.banks) {
        const opt = document.createElement("option");
        opt.value = String(b.id);
        opt.textContent = b.name;
        svBank.appendChild(opt);
      }
    }
  }

  /* --------------------------------------------------------------------------
     Tab 2: Daily Cash & Bank Book
     -------------------------------------------------------------------------- */
  async function loadBook() {
    const from = el("cf-book-from")?.value || todayStr().slice(0, 7) + "-01";
    const to = el("cf-book-to")?.value || todayStr();
    const account = el("cf-book-account")?.value || "all";

    if (el("cf-book-from")) el("cf-book-from").value = from;
    if (el("cf-book-to")) el("cf-book-to").value = to;

    try {
      const res = await fetch(`/api/cashflow/book?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&account=${encodeURIComponent(account)}`);
      if (!res.ok) return;
      state.book = await res.json();
      renderBook();
    } catch (err) {
      console.error("loadBook error:", err);
    }
  }

  function renderBook() {
    const b = state.book;
    if (!b) return;

    if (el("cf-book-opening-bal")) el("cf-book-opening-bal").textContent = `₹${formatCurrency(b.openingBalance)}`;
    if (el("cf-book-total-in")) el("cf-book-total-in").textContent = `+₹${formatCurrency(b.totalInflow)}`;
    if (el("cf-book-total-out")) el("cf-book-total-out").textContent = `-₹${formatCurrency(b.totalOutflow)}`;
    if (el("cf-book-closing-bal")) el("cf-book-closing-bal").textContent = `₹${formatCurrency(b.closingBalance)}`;

    const tbody = el("cf-book-tbody");
    if (!tbody) return;

    const searchTerm = (el("cf-book-search")?.value || "").toLowerCase().trim();

    let rowsHtml = "";
    let matchCount = 0;

    for (const row of (b.entries || [])) {
      if (searchTerm) {
        const hay = `${row.party} ${row.voucherNo} ${row.refNo} ${row.narration} ${row.account}`.toLowerCase();
        if (!hay.includes(searchTerm)) continue;
      }
      matchCount++;

      const isReceipt = row.inflow > 0;
      rowsHtml += `
        <tr>
          <td>${escapeHtml(row.date)}</td>
          <td><b>#${escapeHtml(row.voucherNo)}</b></td>
          <td>${isReceipt ? '<span class="cf-badge-inflow">Receipt</span>' : '<span class="cf-badge-outflow">Payment</span>'}</td>
          <td>${escapeHtml(row.account)}</td>
          <td><b>${escapeHtml(row.party)}</b> <span style="font-size: 10px; color: var(--text-muted);">(${escapeHtml(row.code || "")})</span></td>
          <td>${escapeHtml(row.refNo || "-")}</td>
          <td class="num" style="color: var(--success);">${row.inflow > 0 ? '₹' + formatCurrency(row.inflow) : '-'}</td>
          <td class="num" style="color: var(--danger);">${row.outflow > 0 ? '₹' + formatCurrency(row.outflow) : '-'}</td>
          <td class="num" style="font-weight: 700; color: ${row.runningBalance >= 0 ? 'var(--text-main)' : 'var(--danger)'};">₹${formatCurrency(row.runningBalance)}</td>
          <td style="color: var(--text-muted); font-size: 11px;">${escapeHtml(row.narration || "-")}</td>
        </tr>
      `;
    }

    if (matchCount === 0) {
      rowsHtml = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 24px;">No transactions found for the selected period.</td></tr>`;
    }

    tbody.innerHTML = rowsHtml;
  }

  function exportBookExcel() {
    const b = state.book;
    if (!b || !b.entries) {
      alert("Please load the passbook first before exporting.");
      return;
    }

    let csv = "Date,Voucher No,Type,Account,Party,Ref / UTR,Inflow (Receipt),Outflow (Payment),Running Balance,Narration\n";
    csv += `Opening Balance,,,,,,,₹${b.openingBalance.toFixed(2)},\n`;

    for (const r of b.entries) {
      const cleanNarration = (r.narration || "").replace(/"/g, '""');
      const cleanParty = (r.party || "").replace(/"/g, '""');
      csv += `${r.date},"${r.voucherNo}","${r.type}","${r.account}","${cleanParty}","${r.refNo || ''}",${r.inflow.toFixed(2)},${r.outflow.toFixed(2)},${r.runningBalance.toFixed(2)},"${cleanNarration}"\n`;
    }
    csv += `Closing Balance,,,,,,,₹${b.closingBalance.toFixed(2)},\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Cash_Bank_Book_${b.from}_to_${b.to}.csv`;
    link.click();
  }

  function printBook() {
    window.print();
  }

  /* --------------------------------------------------------------------------
     Tab 3: Batch Spreadsheet Entry (Fast Grid)
     -------------------------------------------------------------------------- */
  function addBatchRow(data = null) {
    const row = data || {
      date: todayStr(),
      type: "Payment",
      accountType: "Bank",
      bankId: state.banks[0]?.id || 1,
      partyType: "Vendor",
      partyId: 0,
      partyName: "",
      method: "NEFT/RTGS",
      refNo: "",
      amount: "",
      narration: "",
      autoAllocate: true,
      allocations: []
    };
    state.batchRows.push(row);
    renderBatchGrid();
  }

  function deleteBatchRow(idx) {
    state.batchRows.splice(idx, 1);
    if (state.batchRows.length === 0) addBatchRow();
    renderBatchGrid();
  }

  function renderBatchGrid() {
    const tbody = el("cf-batch-tbody");
    if (!tbody) return;

    let html = "";
    let totalAmt = 0;

    state.batchRows.forEach((r, idx) => {
      const amtNum = parseFloat(r.amount) || 0;
      totalAmt += amtNum;

      const bankOptions = state.banks.map(b => `<option value="${b.id}" ${Number(r.bankId) === Number(b.id) ? "selected" : ""}>${escapeHtml(b.name)}</option>`).join("");

      html += `
        <tr data-row-idx="${idx}">
          <td style="text-align: center; font-weight: bold; font-family: var(--font-mono); color: var(--text-muted);">${idx + 1}</td>
          <td><input type="date" class="cf-grid-input" data-col="date" value="${escapeHtml(r.date)}"></td>
          <td>
            <select class="cf-grid-input" data-col="type">
              <option value="Payment" ${r.type === "Payment" ? "selected" : ""}>Payment (Out)</option>
              <option value="Receipt" ${r.type === "Receipt" ? "selected" : ""}>Receipt (In)</option>
              <option value="Contra" ${r.type === "Contra" ? "selected" : ""}>Contra (Transfer)</option>
            </select>
          </td>
          <td>
            <select class="cf-grid-input" data-col="accountType">
              <option value="Bank" ${r.accountType === "Bank" ? "selected" : ""}>Bank Account</option>
              <option value="Cash" ${r.accountType === "Cash" ? "selected" : ""}>Cash / Petty</option>
            </select>
          </td>
          <td>
            <select class="cf-grid-input" data-col="bankId" ${r.accountType === "Cash" ? "disabled style='opacity:0.5;'" : ""}>
              ${bankOptions}
            </select>
          </td>
          <td>
            <select class="cf-grid-input" data-col="partyType">
              <option value="Vendor" ${r.partyType === "Vendor" ? "selected" : ""}>Vendor</option>
              <option value="Customer" ${r.partyType === "Customer" ? "selected" : ""}>Customer</option>
              <option value="Sub-Contractor" ${r.partyType === "Sub-Contractor" ? "selected" : ""}>Sub-Contractor</option>
              <option value="Expense" ${r.partyType === "Expense" ? "selected" : ""}>Expense</option>
            </select>
          </td>
          <td>
            <input type="text" class="cf-grid-input party-autocomplete" data-col="partyName" value="${escapeHtml(r.partyName)}" list="cf-parties-datalist" placeholder="Search party...">
          </td>
          <td>
            <select class="cf-grid-input" data-col="method">
              <option value="NEFT/RTGS" ${r.method === "NEFT/RTGS" ? "selected" : ""}>NEFT / RTGS</option>
              <option value="UPI" ${r.method === "UPI" ? "selected" : ""}>UPI / QR</option>
              <option value="Cheque" ${r.method === "Cheque" ? "selected" : ""}>Cheque / DD</option>
              <option value="Cash" ${r.method === "Cash" ? "selected" : ""}>Cash</option>
            </select>
          </td>
          <td><input type="text" class="cf-grid-input" data-col="refNo" value="${escapeHtml(r.refNo)}" placeholder="UTR / Cheque #"></td>
          <td><input type="number" step="0.01" class="cf-grid-input num" data-col="amount" value="${r.amount}" placeholder="0.00"></td>
          <td style="text-align: center;">
            <button type="button" class="cf-btn btn-match-bills" data-row-idx="${idx}" style="padding: 2px 6px; font-size: 10.5px;">
              ${r.allocations && r.allocations.length ? `Matched (${r.allocations.length})` : 'Auto FIFO'}
            </button>
          </td>
          <td><input type="text" class="cf-grid-input" data-col="narration" value="${escapeHtml(r.narration)}" placeholder="Remarks"></td>
          <td style="text-align: center;">
            <button type="button" class="cf-btn btn-del-row" data-row-idx="${idx}" style="padding: 2px 6px; color: var(--danger); border: none; background: transparent; font-weight: bold;" title="Remove row">×</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    if (el("cf-batch-total-val")) el("cf-batch-total-val").textContent = `₹${formatCurrency(totalAmt)}`;

    attachBatchGridEvents();
  }

  function attachBatchGridEvents() {
    const tbody = el("cf-batch-tbody");
    if (!tbody) return;

    tbody.querySelectorAll(".cf-grid-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const tr = e.target.closest("tr");
        const idx = Number(tr.dataset.rowIdx);
        const col = e.target.dataset.col;
        state.batchRows[idx][col] = e.target.value;

        if (col === "partyName") {
          // Auto-match party type and id from datalist
          const matched = state.parties.find(p => p.name.toLowerCase() === e.target.value.toLowerCase().trim());
          if (matched) {
            state.batchRows[idx].partyType = matched.type;
            state.batchRows[idx].partyId = matched.id;
            const ptSelect = tr.querySelector('[data-col="partyType"]');
            if (ptSelect) ptSelect.value = matched.type;
          }
        } else if (col === "amount") {
          let totalAmt = 0;
          state.batchRows.forEach(r => { totalAmt += (parseFloat(r.amount) || 0); });
          if (el("cf-batch-total-val")) el("cf-batch-total-val").textContent = `₹${formatCurrency(totalAmt)}`;
        } else if (col === "accountType") {
          const bankSelect = tr.querySelector('[data-col="bankId"]');
          if (bankSelect) {
            const isCash = e.target.value === "Cash";
            bankSelect.disabled = isCash;
            bankSelect.style.opacity = isCash ? "0.5" : "1";
          }
        }
      });

      // Keyboard navigation: Enter on a field moves to next field or adds new row
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const tr = e.target.closest("tr");
          const inputs = [...tr.querySelectorAll(".cf-grid-input:not([disabled])")];
          const currIdx = inputs.indexOf(e.target);

          if (currIdx === inputs.length - 1) {
            // Last input in the row: add a new row and focus its first input
            addBatchRow();
            setTimeout(() => {
              const nextTr = tbody.querySelector(`tr[data-row-idx="${state.batchRows.length - 1}"]`);
              if (nextTr) {
                const first = nextTr.querySelector(".cf-grid-input");
                if (first) first.focus();
              }
            }, 50);
          } else if (currIdx >= 0) {
            inputs[currIdx + 1].focus();
          }
        } else if (e.key === "F4") {
          // F4 triggers bill matching drawer
          e.preventDefault();
          const tr = e.target.closest("tr");
          const idx = Number(tr.dataset.rowIdx);
          openBillMatcher(idx);
        }
      });
    });

    tbody.querySelectorAll(".btn-match-bills").forEach(btn => {
      btn.addEventListener("click", () => {
        openBillMatcher(Number(btn.dataset.rowIdx));
      });
    });

    tbody.querySelectorAll(".btn-del-row").forEach(btn => {
      btn.addEventListener("click", () => {
        deleteBatchRow(Number(btn.dataset.rowIdx));
      });
    });
  }

  async function saveBatch() {
    const validRows = state.batchRows.filter(r => (parseFloat(r.amount) || 0) > 0 && r.partyName.trim());
    if (validRows.length === 0) {
      alert("Please enter at least one voucher row with a party name and valid amount.");
      return;
    }

    if (!confirm(`Are you sure you want to save ${validRows.length} voucher(s) in batch?`)) return;

    try {
      const res = await fetch("/api/cashflow/batch-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: validRows })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save batch vouchers.");
        return;
      }

      alert(data.message || "Batch vouchers saved successfully!");
      state.batchRows = [];
      addBatchRow();
      loadOverview();
      loadBook();
    } catch (err) {
      console.error("saveBatch error:", err);
      alert("Network error saving batch.");
    }
  }

  /* --------------------------------------------------------------------------
     Bill Matcher Drawer Overlay
     -------------------------------------------------------------------------- */
  async function openBillMatcher(rowIdx) {
    state.activeDrawerRowIdx = rowIdx;
    const row = state.batchRows[rowIdx];
    if (!row) return;

    const overlay = el("cf-bill-matcher-drawer");
    if (!overlay) return;

    if (el("cf-drawer-party-name")) el("cf-drawer-party-name").textContent = row.partyName || "(No Party)";
    const amt = parseFloat(row.amount) || 0;
    if (el("cf-drawer-trans-amt")) el("cf-drawer-trans-amt").textContent = `₹${formatCurrency(amt)}`;
    if (el("cf-drawer-alloc-amt")) el("cf-drawer-alloc-amt").textContent = `₹${formatCurrency(amt)}`;

    overlay.style.display = "flex";

    // Fetch open bills
    const tbody = el("cf-drawer-tbody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:15px;">Loading open bills...</td></tr>`;

    let billsUrl = "";
    if (row.partyType === "Vendor") billsUrl = `/api/payments/bills?vendorCode=${encodeURIComponent(row.partyId || row.partyName)}`;
    else if (row.partyType === "Customer") billsUrl = `/api/receipts/bills?custId=${encodeURIComponent(row.partyId || row.partyName)}`;

    try {
      let bills = [];
      if (billsUrl) {
        const res = await fetch(billsUrl);
        if (res.ok) {
          const data = await res.json();
          bills = data.bills || [];
        }
      }
      state.drawerBills = bills;

      if (bills.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">No open invoices found for this party. Transaction will be recorded as an Advance.</td></tr>`;
        return;
      }

      let html = "";
      bills.forEach((b, bIdx) => {
        html += `
          <tr>
            <td><input type="checkbox" class="cf-drawer-bill-chk" data-bidx="${bIdx}" checked></td>
            <td><b>${escapeHtml(b.billNo || b.invNo)}</b></td>
            <td>${escapeHtml(b.billDate || b.invDate)}</td>
            <td class="num">₹${formatCurrency(b.pendingBalance || b.pending)}</td>
            <td><input type="number" step="0.01" class="cf-grid-input num cf-drawer-bill-alloc" data-bidx="${bIdx}" value="${b.pendingBalance || b.pending}"></td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    } catch (err) {
      console.error("openBillMatcher error:", err);
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger); padding:15px;">Failed to load open bills.</td></tr>`;
    }
  }

  function closeBillMatcher() {
    const overlay = el("cf-bill-matcher-drawer");
    if (overlay) overlay.style.display = "none";
    state.activeDrawerRowIdx = -1;
  }

  function applyBillMatcher() {
    if (state.activeDrawerRowIdx < 0) return;
    const row = state.batchRows[state.activeDrawerRowIdx];
    const tbody = el("cf-drawer-tbody");
    if (!tbody || !row) return;

    const allocations = [];
    let totalAlloc = 0;

    tbody.querySelectorAll("tr").forEach(tr => {
      const chk = tr.querySelector(".cf-drawer-bill-chk");
      const allocInput = tr.querySelector(".cf-drawer-bill-alloc");
      if (chk && chk.checked && allocInput) {
        const val = parseFloat(allocInput.value) || 0;
        if (val > 0) {
          const bIdx = Number(chk.dataset.bidx);
          const bill = state.drawerBills[bIdx];
          if (bill) {
            allocations.push({
              billId: bill.billId || bill.invId,
              billNo: bill.billNo || bill.invNo,
              billDate: bill.billDate || bill.invDate,
              amount: val
            });
            totalAlloc += val;
          }
        }
      }
    });

    row.allocations = allocations;
    if (allocations.length > 0) {
      row.amount = totalAlloc.toFixed(2);
      row.autoAllocate = false;
    }
    closeBillMatcher();
    renderBatchGrid();
  }

  /* --------------------------------------------------------------------------
     Tab 4: Single Voucher Studio & Live Preview
     -------------------------------------------------------------------------- */
  function syncSingleVoucherPreview() {
    const type = el("cf-sv-type")?.value || "Payment";
    const date = el("cf-sv-date")?.value || todayStr();
    const accType = el("cf-sv-account-type")?.value || "Cash";
    const bankName = el("cf-sv-bank")?.selectedOptions[0]?.text || "Bank";
    const party = el("cf-sv-party-name")?.value || "Party / Vendor";
    const mode = el("cf-sv-mode")?.value || "NEFT / RTGS";
    const refNo = el("cf-sv-refno")?.value || "-";
    const amt = parseFloat(el("cf-sv-amount")?.value || 0) || 0;
    const narration = el("cf-sv-narration")?.value || "-";

    if (el("cf-sv-date") && !el("cf-sv-date").value) el("cf-sv-date").value = date;

    if (el("cf-pv-title")) el("cf-pv-title").textContent = `${type.toUpperCase()} VOUCHER`;
    if (el("cf-pv-date")) el("cf-pv-date").textContent = date;
    if (el("cf-pv-account")) el("cf-pv-account").textContent = (accType === "Bank") ? bankName : "Cash in Hand";
    if (el("cf-pv-party")) el("cf-pv-party").textContent = party;
    if (el("cf-pv-amount")) el("cf-pv-amount").textContent = `₹${formatCurrency(amt)}`;
    if (el("cf-pv-words")) el("cf-pv-words").textContent = numToWords(amt);
    if (el("cf-sv-words")) el("cf-sv-words").textContent = numToWords(amt);
    if (el("cf-pv-mode")) el("cf-pv-mode").textContent = mode;
    if (el("cf-pv-refno")) el("cf-pv-refno").textContent = refNo;
    if (el("cf-pv-narration")) el("cf-pv-narration").textContent = narration;
  }

  async function saveSingleVoucher() {
    const type = el("cf-sv-type")?.value || "Payment";
    const date = el("cf-sv-date")?.value || todayStr();
    const accountType = el("cf-sv-account-type")?.value || "Cash";
    const bankId = (accountType === "Bank") ? Number(el("cf-sv-bank")?.value || 0) : null;
    const partyType = el("cf-sv-party-type")?.value || "Vendor";
    const partyName = el("cf-sv-party-name")?.value.trim() || "";
    const method = el("cf-sv-mode")?.value || "NEFT/RTGS";
    const refNo = el("cf-sv-refno")?.value.trim() || "";
    const amount = parseFloat(el("cf-sv-amount")?.value || 0) || 0;
    const narration = el("cf-sv-narration")?.value.trim() || "";

    if (!partyName) {
      alert("Please select or type a party name.");
      el("cf-sv-party-name")?.focus();
      return;
    }
    if (amount <= 0) {
      alert("Please enter a valid amount greater than zero.");
      el("cf-sv-amount")?.focus();
      return;
    }

    const matched = state.parties.find(p => p.name.toLowerCase() === partyName.toLowerCase());
    const partyId = matched ? matched.id : 0;

    const payload = {
      entries: [{
        date,
        type,
        accountType,
        bankId,
        partyType,
        partyId,
        partyName,
        method,
        refNo,
        amount,
        description: narration,
        autoAllocate: true
      }]
    };

    try {
      const res = await fetch("/api/cashflow/batch-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save voucher.");
        return;
      }

      const savedNo = data.saved?.[0]?.voucherNo || "NEW";
      if (el("cf-pv-no")) el("cf-pv-no").textContent = `#${savedNo}`;

      alert(`Voucher #${savedNo} saved successfully! Opening printable view.`);
      window.print();

      // Clear fields
      if (el("cf-sv-party-name")) el("cf-sv-party-name").value = "";
      if (el("cf-sv-amount")) el("cf-sv-amount").value = "";
      if (el("cf-sv-refno")) el("cf-sv-refno").value = "";
      if (el("cf-sv-narration")) el("cf-sv-narration").value = "";
      syncSingleVoucherPreview();
      loadOverview();
      loadBook();
    } catch (err) {
      console.error("saveSingleVoucher error:", err);
      alert("Network error saving voucher.");
    }
  }

  /* --------------------------------------------------------------------------
     Initialization & Event Binding
     -------------------------------------------------------------------------- */
  function initEvents() {
    // Tab switching
    document.querySelectorAll(".cf-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // Refresh button
    el("cf-btn-refresh")?.addEventListener("click", () => {
      loadOverview();
      if (state.currentTab === "book") loadBook();
    });

    // Close Hub
    el("cf-btn-close")?.addEventListener("click", closeCashflowHub);

    // Daily Book Filter Presets
    el("cf-book-preset-today")?.addEventListener("click", () => {
      if (el("cf-book-from")) el("cf-book-from").value = todayStr();
      if (el("cf-book-to")) el("cf-book-to").value = todayStr();
      loadBook();
    });

    el("cf-book-preset-week")?.addEventListener("click", () => {
      const now = new Date();
      const first = now.getDate() - now.getDay() + 1;
      const weekStart = new Date(now.setDate(first)).toISOString().split("T")[0];
      if (el("cf-book-from")) el("cf-book-from").value = weekStart;
      if (el("cf-book-to")) el("cf-book-to").value = todayStr();
      loadBook();
    });

    el("cf-book-preset-month")?.addEventListener("click", () => {
      if (el("cf-book-from")) el("cf-book-from").value = todayStr().slice(0, 7) + "-01";
      if (el("cf-book-to")) el("cf-book-to").value = todayStr();
      loadBook();
    });

    el("cf-book-btn-filter")?.addEventListener("click", loadBook);
    el("cf-book-account")?.addEventListener("change", loadBook);
    el("cf-book-search")?.addEventListener("input", () => {
      clearTimeout(state.searchDebounce);
      state.searchDebounce = setTimeout(renderBook, 250);
    });

    el("cf-btn-export-excel")?.addEventListener("click", exportBookExcel);
    el("cf-btn-print-book")?.addEventListener("click", printBook);

    // Batch Grid Buttons
    el("cf-btn-add-batch-row")?.addEventListener("click", () => addBatchRow());
    el("cf-btn-clear-batch")?.addEventListener("click", () => {
      if (confirm("Clear all entered spreadsheet rows?")) {
        state.batchRows = [];
        addBatchRow();
      }
    });
    el("cf-btn-save-batch")?.addEventListener("click", saveBatch);

    // Bill Matcher Drawer Buttons
    el("cf-drawer-btn-close")?.addEventListener("click", closeBillMatcher);
    el("cf-drawer-btn-cancel")?.addEventListener("click", closeBillMatcher);
    el("cf-drawer-btn-apply")?.addEventListener("click", applyBillMatcher);

    // Single Voucher Studio
    ["cf-sv-type", "cf-sv-date", "cf-sv-account-type", "cf-sv-bank", "cf-sv-party-type", "cf-sv-party-name", "cf-sv-mode", "cf-sv-refno", "cf-sv-amount", "cf-sv-narration"].forEach(id => {
      el(id)?.addEventListener("input", syncSingleVoucherPreview);
      el(id)?.addEventListener("change", syncSingleVoucherPreview);
    });

    el("cf-sv-account-type")?.addEventListener("change", (e) => {
      const isBank = e.target.value === "Bank";
      if (el("cf-sv-bank")) el("cf-sv-bank").disabled = !isBank;
    });

    el("cf-sv-btn-save")?.addEventListener("click", saveSingleVoucher);
    el("cf-sv-btn-preview")?.addEventListener("click", () => window.print());

    // Advance Adjustment Tab
    el("cf-aa-btn-load")?.addEventListener("click", async () => {
      const party = el("cf-aa-party-search")?.value.trim();
      const isExpense = el("cf-aa-party-type")?.value === "Vendor";
      if (!party) {
        alert("Please enter a party name to load advance settlements.");
        return;
      }
      try {
        const [advRes, billRes] = await Promise.all([
          fetch(`/api/adv-adjust/advances?party=${encodeURIComponent(party)}&isExpense=${isExpense}`),
          fetch(`/api/adv-adjust/bills?party=${encodeURIComponent(party)}&isExpense=${isExpense}`)
        ]);
        const advData = advRes.ok ? await advRes.json() : { advances: [] };
        const billData = billRes.ok ? await billRes.json() : { bills: [] };

        const advTbody = el("cf-aa-tbody-advances");
        const billTbody = el("cf-aa-tbody-bills");

        if (advTbody) {
          if (advData.advances.length === 0) {
            advTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">No unadjusted advances found for ${escapeHtml(party)}.</td></tr>`;
          } else {
            advTbody.innerHTML = advData.advances.map(a => `
              <tr>
                <td><b>#${escapeHtml(a.pra)}</b></td>
                <td>${escapeHtml(a.date)}</td>
                <td class="num">₹${formatCurrency(a.amount)}</td>
                <td class="num" style="color:var(--primary); font-weight:bold;">₹${formatCurrency(a.balance)}</td>
              </tr>
            `).join("");
          }
        }

        if (billTbody) {
          if (billData.bills.length === 0) {
            billTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">No open unpaid invoices found for ${escapeHtml(party)}.</td></tr>`;
          } else {
            billTbody.innerHTML = billData.bills.map(b => `
              <tr>
                <td><b>${escapeHtml(b.billNo)}</b></td>
                <td>${escapeHtml(b.billDate)}</td>
                <td class="num">₹${formatCurrency(b.pendingBalance)}</td>
                <td><input type="number" step="0.01" class="cf-grid-input num" value="${b.pendingBalance}"></td>
              </tr>
            `).join("");
          }
        }
      } catch (err) {
        console.error("load advance adjustment error:", err);
      }
    });
  }

  /* --------------------------------------------------------------------------
     Global Public API
     -------------------------------------------------------------------------- */
  window.openCashflowHub = function openCashflowHub(targetTab = "overview", voucherType = null) {
    const hub = el("cashflow-hub");
    if (!hub) return;

    hub.hidden = false;
    hub.focus();

    if (voucherType && el("cf-sv-type")) {
      el("cf-sv-type").value = voucherType;
    }

    switchTab(targetTab);
  };

  window.closeCashflowHub = function closeCashflowHub() {
    const hub = el("cashflow-hub");
    if (hub) hub.hidden = true;
  };

  document.addEventListener("DOMContentLoaded", () => {
    initEvents();
  });
})();
