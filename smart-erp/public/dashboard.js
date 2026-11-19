/**
 * SMART ERP - Multi-Role Dashboard Engine
 * Supports dedicated, role-tailored landing cockpits for:
 * - OWNER (Business Owner / Managing Director) with Chart.js analytics & custom date range
 * - PLANT_MANAGER (Plant Manager / Administrator)
 * - ACCOUNTS_BILLING (Accounts & Billing Controller)
 * - STORE_KEEPER (Stores & Warehouse Manager)
 * - PRODUCTION_SUPERVISOR (Production Supervisor / Shop-Floor)
 * - QA_INSPECTOR (Quality Assurance Officer)
 * - HR_PAYROLL (HR & Payroll Executive)
 *
 * Includes:
 * 1. Executive Role Switcher for Owner & Plant Manager
 * 2. Quick Date Range Presets (Today, This Month, This Quarter, Current FY) + Custom From/To
 * 3. Self-Hosted Chart.js interactive graphs (Revenue vs Inward Purchases, Top 5 Customers, Bank Liquidity)
 * 4. Background auto-refresh (60s) preserving active filters
 */

(() => {
  let isDashboardVisible = true;
  let cachedData = null;
  let activeRole = null;
  let activePreset = "all";
  let activeFrom = "";
  let activeTo = "";
  let chartInstances = [];

  function fmtRs(num) {
    const n = Number(num) || 0;
    return "Rs. " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[m]);
  }

  function destroyCharts() {
    chartInstances.forEach((c) => {
      try { c.destroy(); } catch (e) {}
    });
    chartInstances = [];
  }

  function getDatePresetRange(preset) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

    if (preset === "today") {
      const todayStr = fmt(now);
      return { from: todayStr, to: todayStr };
    }
    if (preset === "month") {
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      return { from: fmt(firstDay), to: fmt(lastDay) };
    }
    if (preset === "quarter") {
      let qStartMonth = 0;
      if (m >= 3 && m <= 5) qStartMonth = 3;
      else if (m >= 6 && m <= 8) qStartMonth = 6;
      else if (m >= 9 && m <= 11) qStartMonth = 9;
      else qStartMonth = 0;

      const qStart = new Date(y, qStartMonth, 1);
      const qEnd = new Date(y, qStartMonth + 3, 0);
      return { from: fmt(qStart), to: fmt(qEnd) };
    }
    return { from: "", to: "" };
  }

  async function loadDashboard(roleOverride, fromDate, toDate) {
    const cockpit = document.getElementById("dashboard-cockpit");
    if (!cockpit) return;

    if (roleOverride) activeRole = roleOverride;
    if (fromDate !== undefined) activeFrom = fromDate;
    if (toDate !== undefined) activeTo = toDate;

    let url = "/api/dashboard/summary";
    const params = new URLSearchParams();
    if (activeRole) params.set("role", activeRole);
    if (activeFrom && activeTo) {
      params.set("from", activeFrom);
      params.set("to", activeTo);
    }
    const qs = params.toString();
    if (qs) url += "?" + qs;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn("Failed to load dashboard summary, status:", res.status);
        return;
      }
      const data = await res.json();
      if (!data.ok) return;

      cachedData = data;
      activeRole = data.activeRole || "OWNER";
      renderDashboard(data);
    } catch (e) {
      console.error("Dashboard load error:", e);
    }
  }

  function renderDashboard(data) {
    destroyCharts();

    const role = data.activeRole || "OWNER";
    const isExecutive = Boolean(data.isExecutive);

    // 1. Render Control Toolbar
    renderControlToolbar(data);

    // 2. Render Role-Tailored Cockpit Content
    const contentContainer = document.getElementById("dash-dynamic-content");
    if (!contentContainer) return;

    if (role === "OWNER") {
      contentContainer.innerHTML = buildOwnerCockpitHtml(data);
      renderOwnerCharts(data.trend, data.topCustomers, data.banks);
    } else if (role === "ACCOUNTS_BILLING") {
      contentContainer.innerHTML = buildAccountsCockpitHtml(data);
    } else if (role === "STORE_KEEPER") {
      contentContainer.innerHTML = buildStoreCockpitHtml(data);
    } else if (role === "PRODUCTION_SUPERVISOR") {
      contentContainer.innerHTML = buildProductionCockpitHtml(data);
    } else if (role === "QA_INSPECTOR") {
      contentContainer.innerHTML = buildQACockpitHtml(data);
    } else if (role === "HR_PAYROLL") {
      contentContainer.innerHTML = buildHRCockpitHtml(data);
    } else {
      // Default to PLANT_MANAGER
      contentContainer.innerHTML = buildPlantManagerCockpitHtml(data);
    }

    // 3. Render Metal Rates if widget present
    renderMetalRates(data.metalRates);

    // 4. Wire Action Buttons & Launchers
    bindRoleActions(data);
    bindQuickLaunchers();
  }

  function renderControlToolbar(data) {
    const container = document.getElementById("dash-toolbar-container");
    if (!container) return;

    const role = data.activeRole || "OWNER";
    const roleBadges = {
      OWNER: { name: "Business Owner", badgeClass: "badge-owner", icon: "" },
      PLANT_MANAGER: { name: "Plant Manager", badgeClass: "badge-primary", icon: "" },
      ACCOUNTS_BILLING: { name: "Accounts & Billing", badgeClass: "badge-info", icon: "" },
      STORE_KEEPER: { name: "Store & Warehouse", badgeClass: "badge-warning", icon: "" },
      PRODUCTION_SUPERVISOR: { name: "Production Shop-Floor", badgeClass: "badge-danger", icon: "" },
      QA_INSPECTOR: { name: "Quality Assurance", badgeClass: "badge-success", icon: "" },
      HR_PAYROLL: { name: "HR & Payroll", badgeClass: "badge-generic", icon: "" }
    };

    const currentBadge = roleBadges[role] || { name: role, badgeClass: "badge-primary", icon: "" };
    const allowedRoles = data.allowedRoles || [];

    container.innerHTML = `
      <div class="dash-toolbar-row">
        <div class="dash-role-container">
          <span class="dash-role-badge ${currentBadge.badgeClass}">
            ${currentBadge.icon} ${currentBadge.name} Cockpit
          </span>

          ${data.isExecutive && allowedRoles.length ? `
            <label style="font-size: 11px; font-weight: 600; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px;">
              <span>Viewing View:</span>
              <select id="dash-role-select" class="dash-role-select" title="Switch Departmental Dashboard View">
                ${allowedRoles.map(r => `
                  <option value="${r.key}" ${r.key === role ? "selected" : ""}>${r.name}</option>
                `).join('')}
              </select>
            </label>
          ` : ''}

          <span style="font-size: 11px; color: var(--text-muted); font-weight: 500;">
            FY: ${data.company?.yearLabel || "2026-27"} &bull; ${escapeHtml(data.company?.name || "Tamba ERP")}
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <div class="dash-date-pills">
            <button type="button" class="dash-date-pill ${activePreset === 'all' ? 'active' : ''}" data-preset="all">Current FY</button>
            <button type="button" class="dash-date-pill ${activePreset === 'today' ? 'active' : ''}" data-preset="today">Today</button>
            <button type="button" class="dash-date-pill ${activePreset === 'month' ? 'active' : ''}" data-preset="month">This Month</button>
            <button type="button" class="dash-date-pill ${activePreset === 'quarter' ? 'active' : ''}" data-preset="quarter">This Quarter</button>
            <button type="button" class="dash-date-pill ${activePreset === 'custom' ? 'active' : ''}" data-preset="custom">Custom</button>
          </div>

          <div id="dash-custom-date-box" class="dash-custom-date-box" style="display: ${activePreset === 'custom' ? 'flex' : 'none'};">
            <input type="date" id="dash-date-from" class="dash-date-input" value="${activeFrom || ''}" />
            <span>to</span>
            <input type="date" id="dash-date-to" class="dash-date-input" value="${activeTo || ''}" />
            <button type="button" id="dash-btn-apply-date" class="dash-apply-btn">Apply</button>
          </div>

          <button type="button" id="dash-btn-refresh-view" class="dash-apply-btn" style="background: var(--bg-surface); color: var(--text-main); border: 1px solid var(--border-color);" title="Refresh live view">↻</button>
        </div>
      </div>
    `;

    // Wire Role Switcher
    const roleSelect = document.getElementById("dash-role-select");
    if (roleSelect) {
      roleSelect.addEventListener("change", (e) => {
        loadDashboard(e.target.value, activeFrom, activeTo);
      });
    }

    // Wire Date Presets
    container.querySelectorAll(".dash-date-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = btn.dataset.preset;
        activePreset = preset;
        const customBox = document.getElementById("dash-custom-date-box");
        if (preset === "custom") {
          if (customBox) customBox.style.display = "flex";
          container.querySelectorAll(".dash-date-pill").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          return;
        }

        if (customBox) customBox.style.display = "none";
        const range = getDatePresetRange(preset);
        activeFrom = range.from;
        activeTo = range.to;
        loadDashboard(activeRole, activeFrom, activeTo);
      });
    });

    // Wire Custom Apply Button
    const applyBtn = document.getElementById("dash-btn-apply-date");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        const f = document.getElementById("dash-date-from")?.value || "";
        const t = document.getElementById("dash-date-to")?.value || "";
        if (!f || !t) {
          alert("Please select both From and To dates.");
          return;
        }
        activeFrom = f;
        activeTo = t;
        loadDashboard(activeRole, activeFrom, activeTo);
      });
    }

    // Wire Refresh View
    const refreshBtn = document.getElementById("dash-btn-refresh-view");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        loadDashboard(activeRole, activeFrom, activeTo);
      });
    }
  }

  // =========================================================================
  // 1. OWNER COCKPIT (Financial & Growth with Chart.js)
  // =========================================================================
  function buildOwnerCockpitHtml(data) {
    const kpis = data.kpis || {};
    const topCust = data.topCustomers || [];
    const topSupp = data.topSuppliers || [];
    const banks = data.banks || [];

    return `
      <!-- Top 5 Executive KPI Cards -->
      <div class="dash-kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));">
        <div class="dash-kpi-card kpi-blue">
          <div class="dash-kpi-label">TOTAL NET SALES</div>
          <div class="dash-kpi-value">${fmtRs(kpis.totalSales)}</div>
          <div class="dash-kpi-sub">Mfg: ${fmtRs(kpis.salesMfg)} | Labour: ${fmtRs(kpis.salesLabour)}</div>
        </div>

        <div class="dash-kpi-card kpi-green">
          <div class="dash-kpi-label">INWARD PURCHASES</div>
          <div class="dash-kpi-value">${fmtRs(kpis.totalPurchases)}</div>
          <div class="dash-kpi-sub">${kpis.purchasesCount || 0} Inward Bills Cleared</div>
        </div>

        <div class="dash-kpi-card kpi-amber">
          <div class="dash-kpi-label">ESTIMATED GROSS MARGIN</div>
          <div class="dash-kpi-value">${fmtRs(kpis.grossMargin)}</div>
          <div class="dash-kpi-sub" style="color: ${Number(kpis.grossMargin) >= 0 ? 'var(--success, #34c759)' : 'var(--danger, #ff3b30)'}; font-weight: bold;">
            ${Number(kpis.grossMarginPct || 0).toFixed(1)}% Gross Margin
          </div>
        </div>

        <div class="dash-kpi-card kpi-blue">
          <div class="dash-kpi-label">BANK &amp; CASH LIQUIDITY</div>
          <div class="dash-kpi-value">${fmtRs(kpis.bankBalance)}</div>
          <div class="dash-kpi-sub">${banks.length} Active Accounts</div>
        </div>

        <div class="dash-kpi-card kpi-red">
          <div class="dash-kpi-label">RECEIVABLES vs PAYABLES</div>
          <div class="dash-kpi-value" style="font-size: 16px;">Rec: ${fmtRs(kpis.receivables)}</div>
          <div class="dash-kpi-sub">Pay: ${fmtRs(kpis.payables)}</div>
        </div>
      </div>

      <!-- Interactive Chart.js Graphs Grid -->
      <div class="dash-charts-grid">
        <div class="dash-chart-card">
          <div class="dash-chart-header">
            <span class="dash-chart-title">Monthly Sales vs Purchases Trend</span>
            <span class="dash-chart-badge">Monthly Comparison</span>
          </div>
          <div class="dash-chart-body">
            <canvas id="chart-revenue-trend"></canvas>
          </div>
        </div>

        <div class="dash-chart-card">
          <div class="dash-chart-header">
            <span class="dash-chart-title">Top 5 Customers by Revenue</span>
            <span class="dash-chart-badge">Client Concentration</span>
          </div>
          <div class="dash-chart-body">
            <canvas id="chart-top-customers"></canvas>
          </div>
        </div>

        <div class="dash-chart-card">
          <div class="dash-chart-header">
            <span class="dash-chart-title">Bank Liquidity Distribution</span>
            <span class="dash-chart-badge">Capital Allocation</span>
          </div>
          <div class="dash-chart-body">
            <canvas id="chart-banks-liquidity"></canvas>
          </div>
        </div>
      </div>

      <!-- Financial Detail Tables Grid -->
      <div class="dash-tables-grid">
        <!-- Top 5 Customers -->
        <div class="dash-panel">
          <div class="dash-panel-header">
            <span class="dash-panel-title">Top Customers by Revenue</span>
            <span class="dash-panel-subbadge">Sales Leaders</span>
          </div>
          <div class="dash-table-wrap">
            <table class="dash-table">
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">#</th>
                  <th>Customer Name</th>
                  <th style="width: 90px; text-align: right;">Invoices</th>
                  <th style="width: 140px; text-align: right;">Total Sales (Rs)</th>
                </tr>
              </thead>
              <tbody>
                ${topCust.length ? topCust.map((c, i) => `
                  <tr>
                    <td style="text-align: center; font-weight: bold; color: var(--primary);">${i + 1}</td>
                    <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(c.name)}</td>
                    <td style="text-align: right; font-family: var(--font-mono);">${c.count}</td>
                    <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">${fmtRs(c.total)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" style="text-align: center; color: #888; padding: 12px;">No sales recorded for this period.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Top 5 Suppliers -->
        <div class="dash-panel">
          <div class="dash-panel-header">
            <span class="dash-panel-title">Top Suppliers by Purchases</span>
            <span class="dash-panel-subbadge">Procurement Leaders</span>
          </div>
          <div class="dash-table-wrap">
            <table class="dash-table">
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">#</th>
                  <th>Supplier / Vendor Name</th>
                  <th style="width: 90px; text-align: right;">Bills</th>
                  <th style="width: 140px; text-align: right;">Total Purchases (Rs)</th>
                </tr>
              </thead>
              <tbody>
                ${topSupp.length ? topSupp.map((s, i) => `
                  <tr>
                    <td style="text-align: center; font-weight: bold; color: var(--primary);">${i + 1}</td>
                    <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(s.name)}</td>
                    <td style="text-align: right; font-family: var(--font-mono);">${s.count}</td>
                    <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">${fmtRs(s.total)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" style="text-align: center; color: #888; padding: 12px;">No purchases recorded for this period.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Live Metal Rates Benchmark Ticker -->
      ${buildMetalRatesTickerHtml()}

      <!-- Quick Operations Launchpad -->
      ${buildQuickLaunchpadHtml()}
    `;
  }

  function renderOwnerCharts(trendData, topCustData, banksData) {
    if (typeof window.Chart === "undefined") {
      console.warn("Chart.js not loaded, skipping chart rendering");
      return;
    }
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#cbd5e1" : "#475569";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";

    // 1. Sales vs Purchases Trend
    const ctxTrend = document.getElementById("chart-revenue-trend");
    if (ctxTrend) {
      const labels = (trendData || []).map(t => t.label || "");
      const salesVals = (trendData || []).map(t => Number(t.sales || 0));
      const purchVals = (trendData || []).map(t => Number(t.purch || 0));

      const chartTrend = new window.Chart(ctxTrend, {
        type: "bar",
        data: {
          labels: labels.length ? labels : ["Current Period"],
          datasets: [
            {
              label: "Net Sales (Rs)",
              data: salesVals.length ? salesVals : [0],
              backgroundColor: "rgba(37, 99, 235, 0.8)",
              borderColor: "#2563eb",
              borderWidth: 1.5,
              borderRadius: 4
            },
            {
              label: "Inward Purchases (Rs)",
              data: purchVals.length ? purchVals : [0],
              backgroundColor: "rgba(16, 185, 129, 0.8)",
              borderColor: "#10b981",
              borderWidth: 1.5,
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: textColor, font: { weight: 600, size: 11 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: Rs. ${Number(ctx.raw || 0).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },
            y: {
              ticks: {
                color: textColor,
                font: { size: 10 },
                callback: (v) => "Rs. " + (v >= 100000 ? (v / 100000).toFixed(1) + "L" : (v / 1000).toFixed(0) + "k")
              },
              grid: { color: gridColor }
            }
          }
        }
      });
      chartInstances.push(chartTrend);
    }

    // 2. Top 5 Customers Horizontal Bar Chart
    const ctxCust = document.getElementById("chart-top-customers");
    if (ctxCust) {
      const custLabels = (topCustData || []).map(c => c.name.length > 18 ? c.name.slice(0, 16) + '...' : c.name);
      const custVals = (topCustData || []).map(c => Number(c.total || 0));

      const chartCust = new window.Chart(ctxCust, {
        type: "bar",
        data: {
          labels: custLabels.length ? custLabels : ["No Data"],
          datasets: [
            {
              axis: "y",
              label: "Sales (Rs)",
              data: custVals.length ? custVals : [0],
              backgroundColor: [
                "rgba(99, 102, 241, 0.85)",
                "rgba(59, 130, 246, 0.85)",
                "rgba(14, 165, 233, 0.85)",
                "rgba(20, 184, 166, 0.85)",
                "rgba(16, 185, 129, 0.85)"
              ],
              borderRadius: 4
            }
          ]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Sales: Rs. ${Number(ctx.raw || 0).toLocaleString('en-IN')}`
              }
            }
          },
          scales: {
            x: {
              ticks: {
                color: textColor,
                font: { size: 10 },
                callback: (v) => "Rs. " + (v >= 100000 ? (v / 100000).toFixed(1) + "L" : (v / 1000).toFixed(0) + "k")
              },
              grid: { color: gridColor }
            },
            y: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } }
          }
        }
      });
      chartInstances.push(chartCust);
    }

    // 3. Bank Liquidity Doughnut Chart
    const ctxBanks = document.getElementById("chart-banks-liquidity");
    if (ctxBanks) {
      const bankLabels = (banksData || []).map(b => b.name);
      const bankVals = (banksData || []).map(b => Math.max(0, Number(b.balance || 0)));

      const chartBanks = new window.Chart(ctxBanks, {
        type: "doughnut",
        data: {
          labels: bankLabels.length ? bankLabels : ["No Accounts"],
          datasets: [
            {
              data: bankVals.length ? bankVals : [1],
              backgroundColor: [
                "#3b82f6",
                "#10b981",
                "#f59e0b",
                "#8b5cf6",
                "#ec4899",
                "#06b6d4"
              ],
              borderWidth: 2,
              borderColor: isDark ? "#1e293b" : "#ffffff"
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "right", labels: { color: textColor, font: { size: 10 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: Rs. ${Number(ctx.raw || 0).toLocaleString('en-IN')}`
              }
            }
          }
        }
      });
      chartInstances.push(chartBanks);
    }
  }

  // =========================================================================
  // 2. PLANT MANAGER COCKPIT (Operations & Dispatch Oversight)
  // =========================================================================
  function buildPlantManagerCockpitHtml(data) {
    const kpis = data.kpis || {};
    const uninvoicedDcs = data.uninvoicedDcs || [];
    const stockWatch = data.stockWatch || [];
    const recentInvoices = data.recentInvoices || [];

    return `
      <div class="dash-kpi-grid">
        <div class="dash-kpi-card kpi-blue">
          <div class="dash-kpi-label">TOTAL SALES (FY)</div>
          <div class="dash-kpi-value">${fmtRs(kpis.totalSales)}</div>
          <div class="dash-kpi-sub">Mfg: ${fmtRs(kpis.salesMfg)} | Labour: ${fmtRs(kpis.salesLabour)}</div>
        </div>

        <div class="dash-kpi-card kpi-green">
          <div class="dash-kpi-label">PURCHASES (INWARD BILLS)</div>
          <div class="dash-kpi-value">${fmtRs(kpis.totalPurchases)}</div>
          <div class="dash-kpi-sub">${kpis.purchasesCount || 0} Inward Bills Cleared</div>
        </div>

        <div class="dash-kpi-card kpi-amber">
          <div class="dash-kpi-label">UN-INVOICED OUTWARD DCS</div>
          <div class="dash-kpi-value">${fmtRs(kpis.pendingDcVal)}</div>
          <div class="dash-kpi-sub">${kpis.pendingDcCount || 0} DCs Awaiting Billing</div>
        </div>

        <div class="dash-kpi-card kpi-red">
          <div class="dash-kpi-label">CRITICAL STOCK WATCH</div>
          <div class="dash-kpi-value">${kpis.criticalStockCount || 0} Items</div>
          <div class="dash-kpi-sub" style="color: ${kpis.criticalStockCount > 0 ? 'var(--danger, #ff3b30)' : 'var(--success, #34c759)'}; font-weight: bold;">
            ${kpis.criticalStockCount > 0 ? 'Action Required: Below ROL' : 'Stock Levels Healthy'}
          </div>
        </div>
      </div>

      <!-- Live Metal Rates Benchmark Ticker -->
      ${buildMetalRatesTickerHtml()}

      <!-- Quick Operations Launchpad -->
      ${buildQuickLaunchpadHtml()}

      <!-- Split Operational Tables Grid -->
      <div class="dash-tables-grid">
        <!-- Un-invoiced DCs -->
        <div class="dash-panel">
          <div class="dash-panel-header">
            <span class="dash-panel-title">Outward DCs Pending Invoicing (Action Required)</span>
            <span class="dash-panel-subbadge">Top Dispatches</span>
          </div>
          <div class="dash-table-wrap">
            <table class="dash-table">
              <thead>
                <tr>
                  <th style="width: 130px;">DC No</th>
                  <th style="width: 95px;">Date</th>
                  <th style="width: 65px; text-align: center;">Type</th>
                  <th>Customer Name</th>
                  <th style="width: 80px; text-align: right;">Qty</th>
                  <th style="width: 110px; text-align: right;">Value</th>
                  <th style="width: 105px; text-align: center;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${uninvoicedDcs.length ? uninvoicedDcs.map(d => `
                  <tr>
                    <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(d.dcNo)}</td>
                    <td>${escapeHtml(d.date)}</td>
                    <td style="text-align: center;"><span class="badge ${d.type === 'Labour' ? 'badge-info' : 'badge-primary'}">${d.type}</span></td>
                    <td style="font-weight: 600; color: var(--text-main);" title="${escapeHtml(d.custName)}">${escapeHtml(d.custName)}</td>
                    <td style="text-align: right; font-family: var(--font-mono); font-weight: 600;">${d.qty.toLocaleString('en-IN')}</td>
                    <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">${fmtRs(d.val)}</td>
                    <td style="text-align: center;">
                      <button type="button" class="btn dash-btn-bill" data-type="${d.type}">Bill Now &gt;&gt;</button>
                    </td>
                  </tr>
                `).join('') : '<tr><td colspan="7" style="text-align: center; color: var(--success, #34c759); padding: 12px; font-weight: bold;">[OK] All dispatched Delivery Challans have been billed!</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Critical Stock Watch -->
        <div class="dash-panel">
          <div class="dash-panel-header">
            <span class="dash-panel-title">Critical Stock Watchlist (Below or Near ROL)</span>
            <span class="dash-panel-subbadge">Re-Order Alerts</span>
          </div>
          <div class="dash-table-wrap">
            <table class="dash-table">
              <thead>
                <tr>
                  <th style="width: 110px;">Item Code</th>
                  <th>Material Description</th>
                  <th style="width: 65px; text-align: center;">UOM</th>
                  <th style="width: 90px; text-align: right;">Stock</th>
                  <th style="width: 90px; text-align: right;">ROL</th>
                  <th style="width: 95px; text-align: center;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${stockWatch.length ? stockWatch.map(item => `
                  <tr>
                    <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(item.code)}</td>
                    <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(item.name)}</td>
                    <td style="text-align: center;"><span class="dash-metal-sym-pill badge-generic">${escapeHtml(item.uom)}</span></td>
                    <td style="text-align: right; color: var(--danger, #ff3b30); font-weight: bold; font-family: var(--font-mono);">${item.stock.toLocaleString('en-IN')}</td>
                    <td style="text-align: right; font-weight: bold; font-family: var(--font-mono);">${item.rol.toLocaleString('en-IN')}</td>
                    <td style="text-align: center;">
                      <button type="button" class="btn dash-btn-po" data-itemcode="${escapeHtml(item.code)}">Raise PO</button>
                    </td>
                  </tr>
                `).join('') : '<tr><td colspan="6" style="text-align: center; color: var(--success, #34c759); padding: 12px; font-weight: bold;">[OK] All inventory items are above their Re-Order Level.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 3. ACCOUNTS & BILLING COCKPIT
  // =========================================================================
  function buildAccountsCockpitHtml(data) {
    const kpis = data.kpis || {};
    const uninvoicedDcs = data.uninvoicedDcs || [];
    const recentInvoices = data.recentInvoices || [];
    const banks = data.banks || [];

    return `
      <div class="dash-kpi-grid">
        <div class="dash-kpi-card kpi-amber">
          <div class="dash-kpi-label">UN-INVOICED DC VALUE</div>
          <div class="dash-kpi-value">${fmtRs(kpis.pendingDcVal)}</div>
          <div class="dash-kpi-sub">${kpis.pendingDcCount || 0} DCs Ready for Invoicing</div>
        </div>

        <div class="dash-kpi-card kpi-blue">
          <div class="dash-kpi-label">TOTAL BILLED SALES</div>
          <div class="dash-kpi-value">${fmtRs(kpis.totalSales)}</div>
          <div class="dash-kpi-sub">${kpis.salesCount || 0} Invoices Issued</div>
        </div>

        <div class="dash-kpi-card kpi-green">
          <div class="dash-kpi-label">INWARD PURCHASES</div>
          <div class="dash-kpi-value">${fmtRs(kpis.totalPurchases)}</div>
          <div class="dash-kpi-sub">${kpis.purchasesCount || 0} Bills Cleared</div>
        </div>

        <div class="dash-kpi-card kpi-blue">
          <div class="dash-kpi-label">BANK &amp; CASH BALANCE</div>
          <div class="dash-kpi-value">${fmtRs(kpis.bankBalance)}</div>
          <div class="dash-kpi-sub">${banks.length} Active Accounts</div>
        </div>
      </div>

      <!-- Outward DCs Pending Invoicing Table -->
      <div class="dash-panel" style="margin-bottom: 16px;">
        <div class="dash-panel-header">
          <span class="dash-panel-title">Outward DCs Awaiting Tax Invoices (Action Required)</span>
          <span class="dash-panel-subbadge">${uninvoicedDcs.length} Pending</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th style="width: 140px;">DC No</th>
                <th style="width: 100px;">Date</th>
                <th style="width: 70px; text-align: center;">Type</th>
                <th>Customer Name</th>
                <th>Material Details</th>
                <th style="width: 90px; text-align: right;">Qty</th>
                <th style="width: 120px; text-align: right;">Total Value</th>
                <th style="width: 110px; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${uninvoicedDcs.length ? uninvoicedDcs.map(d => `
                <tr>
                  <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(d.dcNo)}</td>
                  <td>${escapeHtml(d.date)}</td>
                  <td style="text-align: center;"><span class="badge ${d.type === 'Labour' ? 'badge-info' : 'badge-primary'}">${d.type}</span></td>
                  <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(d.custName)}</td>
                  <td>${escapeHtml(d.itemSummary)}</td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 600;">${d.qty.toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">${fmtRs(d.val)}</td>
                  <td style="text-align: center;">
                    <button type="button" class="btn dash-btn-bill" data-type="${d.type}">Bill Now &gt;&gt;</button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="8" style="text-align: center; color: var(--success, #34c759); padding: 12px; font-weight: bold;">[OK] All delivery challans have been billed.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Tax Invoices Table -->
      <div class="dash-panel" style="margin-bottom: 16px;">
        <div class="dash-panel-header">
          <span class="dash-panel-title">Recent Tax Invoices Issued</span>
          <span class="dash-panel-subbadge">Sales Journal</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th style="width: 130px;">Invoice No</th>
                <th style="width: 100px;">Date</th>
                <th style="width: 70px; text-align: center;">Type</th>
                <th>Customer Name</th>
                <th style="width: 120px; text-align: right;">Taxable Amount</th>
                <th style="width: 130px; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${recentInvoices.length ? recentInvoices.map(inv => `
                <tr>
                  <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(inv.invNo)}</td>
                  <td>${escapeHtml(inv.invDate)}</td>
                  <td style="text-align: center;"><span class="badge ${inv.type === 'Labour' ? 'badge-info' : 'badge-primary'}">${inv.type}</span></td>
                  <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(inv.custName)}</td>
                  <td style="text-align: right; font-family: var(--font-mono);">${fmtRs(inv.taxableAmt)}</td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">${fmtRs(inv.totVal)}</td>
                </tr>
              `).join('') : '<tr><td colspan="6" style="text-align: center; color: #888; padding: 12px;">No recent invoices recorded.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      ${buildQuickLaunchpadHtml()}
    `;
  }

  // =========================================================================
  // 4. STORE & WAREHOUSE COCKPIT
  // =========================================================================
  function buildStoreCockpitHtml(data) {
    const kpis = data.kpis || {};
    const stockWatch = data.stockWatch || [];
    const uninvoicedDcs = data.uninvoicedDcs || [];

    return `
      <div class="dash-kpi-grid">
        <div class="dash-kpi-card kpi-red">
          <div class="dash-kpi-label">CRITICAL ITEMS BELOW ROL</div>
          <div class="dash-kpi-value">${kpis.criticalStockCount || stockWatch.length} Items</div>
          <div class="dash-kpi-sub" style="color: var(--danger, #ff3b30); font-weight: bold;">Immediate PO Required</div>
        </div>

        <div class="dash-kpi-card kpi-amber">
          <div class="dash-kpi-label">DISPATCHED DCS AWAITING INVOICING</div>
          <div class="dash-kpi-value">${kpis.pendingDcCount || 0} DCs</div>
          <div class="dash-kpi-sub">Total Dispatched Material Out</div>
        </div>

        <div class="dash-kpi-card kpi-green">
          <div class="dash-kpi-label">INWARD PURCHASES</div>
          <div class="dash-kpi-value">${fmtRs(kpis.totalPurchases)}</div>
          <div class="dash-kpi-sub">${kpis.purchasesCount || 0} GRN Bills Cleared</div>
        </div>

        <div class="dash-kpi-card kpi-blue">
          <div class="dash-kpi-label">TOTAL SALES (FY)</div>
          <div class="dash-kpi-value">${fmtRs(kpis.totalSales)}</div>
          <div class="dash-kpi-sub">Finished Goods Dispatched</div>
        </div>
      </div>

      <!-- Critical Stock Watchlist -->
      <div class="dash-panel" style="margin-bottom: 16px;">
        <div class="dash-panel-header">
          <span class="dash-panel-title">Critical Raw Material Stock Watchlist (Below or Near ROL)</span>
          <span class="dash-panel-subbadge">Re-Order Alerts</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th style="width: 120px;">Item Code</th>
                <th>Material Description</th>
                <th style="width: 70px; text-align: center;">UOM</th>
                <th style="width: 100px; text-align: right;">Current Stock</th>
                <th style="width: 100px; text-align: right;">ROL Level</th>
                <th style="width: 110px; text-align: center;">Deficit</th>
                <th style="width: 115px; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${stockWatch.length ? stockWatch.map(item => {
                const deficit = Math.max(0, item.rol - item.stock);
                return `
                  <tr>
                    <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(item.code)}</td>
                    <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(item.name)}</td>
                    <td style="text-align: center;"><span class="dash-metal-sym-pill badge-generic">${escapeHtml(item.uom)}</span></td>
                    <td style="text-align: right; color: var(--danger, #ff3b30); font-weight: bold; font-family: var(--font-mono);">${item.stock.toLocaleString('en-IN')}</td>
                    <td style="text-align: right; font-weight: bold; font-family: var(--font-mono);">${item.rol.toLocaleString('en-IN')}</td>
                    <td style="text-align: center; color: var(--danger, #ff3b30); font-weight: bold;">-${deficit.toLocaleString('en-IN')}</td>
                    <td style="text-align: center;">
                      <button type="button" class="btn dash-btn-po" data-itemcode="${escapeHtml(item.code)}">Raise PO</button>
                    </td>
                  </tr>
                `;
              }).join('') : '<tr><td colspan="7" style="text-align: center; color: var(--success, #34c759); padding: 12px; font-weight: bold;">[OK] All inventory items are above their Re-Order Level.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Dispatched DCs Queue -->
      <div class="dash-panel" style="margin-bottom: 16px;">
        <div class="dash-panel-header">
          <span class="dash-panel-title">Dispatched Delivery Challans Queue</span>
          <span class="dash-panel-subbadge">Outward Material</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th style="width: 130px;">DC No</th>
                <th style="width: 100px;">Date</th>
                <th style="width: 70px; text-align: center;">Type</th>
                <th>Customer / Destination</th>
                <th>Material Details</th>
                <th style="width: 90px; text-align: right;">Total Qty</th>
              </tr>
            </thead>
            <tbody>
              ${uninvoicedDcs.length ? uninvoicedDcs.map(d => `
                <tr>
                  <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(d.dcNo)}</td>
                  <td>${escapeHtml(d.date)}</td>
                  <td style="text-align: center;"><span class="badge ${d.type === 'Labour' ? 'badge-info' : 'badge-primary'}">${d.type}</span></td>
                  <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(d.custName)}</td>
                  <td>${escapeHtml(d.itemSummary)}</td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 600;">${d.qty.toLocaleString('en-IN')}</td>
                </tr>
              `).join('') : '<tr><td colspan="6" style="text-align: center; color: #888; padding: 12px;">No dispatched delivery challans pending.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      ${buildQuickLaunchpadHtml()}
    `;
  }

  // =========================================================================
  // 5. PRODUCTION SUPERVISOR COCKPIT
  // =========================================================================
  function buildProductionCockpitHtml(data) {
    const kpis = data.kpis || {};
    const prod = data.production || {};
    const iwos = prod.iwos || [];
    const breakdowns = prod.breakdowns || [];

    return `
      <div class="dash-kpi-grid">
        <div class="dash-kpi-card kpi-blue">
          <div class="dash-kpi-label">ACTIVE WORK ORDERS (IWO)</div>
          <div class="dash-kpi-value">${iwos.length} Orders</div>
          <div class="dash-kpi-sub">Shop-Floor Operations Active</div>
        </div>

        <div class="dash-kpi-card kpi-red">
          <div class="dash-kpi-label">MACHINE BREAKDOWN ALERTS</div>
          <div class="dash-kpi-value">${breakdowns.length} Incidents</div>
          <div class="dash-kpi-sub" style="color: ${breakdowns.length > 0 ? 'var(--danger, #ff3b30)' : 'var(--success, #34c759)'}; font-weight: bold;">
            ${breakdowns.length > 0 ? 'Attention Required on Machines' : 'All Machines Operational'}
          </div>
        </div>

        <div class="dash-kpi-card kpi-amber">
          <div class="dash-kpi-label">RAW MATERIAL LOW STOCK ALERTS</div>
          <div class="dash-kpi-value">${kpis.criticalStockCount || 0} Items</div>
          <div class="dash-kpi-sub">Raw Materials Near ROL</div>
        </div>

        <div class="dash-kpi-card kpi-green">
          <div class="dash-kpi-label">DISPATCHED FINISHED GOODS</div>
          <div class="dash-kpi-value">${kpis.pendingDcCount || 0} DCs</div>
          <div class="dash-kpi-sub">Dispatched from Shop Floor</div>
        </div>
      </div>

      <!-- Active Work Orders (IWO) Table -->
      <div class="dash-panel" style="margin-bottom: 16px;">
        <div class="dash-panel-header">
          <span class="dash-panel-title">Active Internal Work Orders (IWO) Queue</span>
          <span class="dash-panel-subbadge">Shop-Floor Dispatch</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th style="width: 130px;">IWO No</th>
                <th style="width: 100px;">Date</th>
                <th>Assigned To / Department</th>
                <th>PO Reference</th>
                <th>Remarks / Work Order Notes</th>
              </tr>
            </thead>
            <tbody>
              ${iwos.length ? iwos.map(i => `
                <tr>
                  <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(i.no)}</td>
                  <td>${escapeHtml(i.date)}</td>
                  <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(i.toWhom)}</td>
                  <td style="font-family: var(--font-mono);">${escapeHtml(i.poNo || "-")}</td>
                  <td>${escapeHtml(i.remarks || "-")}</td>
                </tr>
              `).join('') : '<tr><td colspan="5" style="text-align: center; color: #888; padding: 12px;">No active work orders recorded.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Machine Maintenance & Breakdowns Table -->
      <div class="dash-panel" style="margin-bottom: 16px;">
        <div class="dash-panel-header">
          <span class="dash-panel-title">Machine Maintenance &amp; Breakdown Log</span>
          <span class="dash-panel-subbadge">Plant Uptime</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th style="width: 100px;">Date</th>
                <th style="width: 150px;">Machine Name</th>
                <th>Breakdown Details</th>
                <th>Corrective Action Taken</th>
                <th style="width: 110px; text-align: center;">Downtime</th>
              </tr>
            </thead>
            <tbody>
              ${breakdowns.length ? breakdowns.map(b => `
                <tr>
                  <td>${escapeHtml(b.date)}</td>
                  <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(b.machine)}</td>
                  <td>${escapeHtml(b.detail || "-")}</td>
                  <td>${escapeHtml(b.correction || "-")}</td>
                  <td style="text-align: center; font-weight: bold; color: var(--danger, #ff3b30); font-family: var(--font-mono);">${escapeHtml(b.timeSpent || "-")}</td>
                </tr>
              `).join('') : '<tr><td colspan="5" style="text-align: center; color: var(--success, #34c759); padding: 12px; font-weight: bold;">[OK] Zero machine breakdowns reported.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      ${buildQuickLaunchpadHtml()}
    `;
  }

  // =========================================================================
  // 6. QUALITY ASSURANCE (QA) COCKPIT
  // =========================================================================
  function buildQACockpitHtml(data) {
    const kpis = data.kpis || {};
    const qa = data.qa || {};
    const inspections = qa.inspections || [];
    const calibration = qa.calibration || [];

    return `
      <div class="dash-kpi-grid">
        <div class="dash-kpi-card kpi-blue">
          <div class="dash-kpi-label">INWARD INSPECTIONS RECORDED</div>
          <div class="dash-kpi-value">${inspections.length} Lots</div>
          <div class="dash-kpi-sub">Material Inspection Log</div>
        </div>

        <div class="dash-kpi-card kpi-amber">
          <div class="dash-kpi-label">INSTRUMENTS CALIBRATION DUE</div>
          <div class="dash-kpi-value">${calibration.length} Gauges</div>
          <div class="dash-kpi-sub">Upcoming Calibration Schedule</div>
        </div>

        <div class="dash-kpi-card kpi-red">
          <div class="dash-kpi-label">RAW MATERIAL DEFICIT ALERTS</div>
          <div class="dash-kpi-value">${kpis.criticalStockCount || 0} Items</div>
          <div class="dash-kpi-sub">Critical Raw Material Lots</div>
        </div>

        <div class="dash-kpi-card kpi-green">
          <div class="dash-kpi-label">TOTAL DISPATCHED LOTS</div>
          <div class="dash-kpi-value">${kpis.pendingDcCount || 0} Lots</div>
          <div class="dash-kpi-sub">Outgoing Material Cleared</div>
        </div>
      </div>

      <!-- Inward Inspections Table -->
      <div class="dash-panel" style="margin-bottom: 16px;">
        <div class="dash-panel-header">
          <span class="dash-panel-title">Inward Material Inspection Records</span>
          <span class="dash-panel-subbadge">QC Clearance</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th style="width: 130px;">Inspection No</th>
                <th style="width: 100px;">Date</th>
                <th>Part / Material Description</th>
                <th>Supplier / Vendor</th>
                <th style="width: 90px; text-align: right;">Inspected Qty</th>
                <th style="width: 110px;">Inspector</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${inspections.length ? inspections.map(q => `
                <tr>
                  <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(q.no)}</td>
                  <td>${escapeHtml(q.date)}</td>
                  <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(q.item)}</td>
                  <td>${escapeHtml(q.party)}</td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 600;">${q.qty.toLocaleString('en-IN')}</td>
                  <td>${escapeHtml(q.insBy || "-")}</td>
                  <td>${escapeHtml(q.remarks || "-")}</td>
                </tr>
              `).join('') : '<tr><td colspan="7" style="text-align: center; color: #888; padding: 12px;">No inward inspection records found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Instruments Calibration Due Table -->
      <div class="dash-panel" style="margin-bottom: 16px;">
        <div class="dash-panel-header">
          <span class="dash-panel-title">Instruments &amp; Gauges Calibration Schedule Due</span>
          <span class="dash-panel-subbadge">Calibration Traceability</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th>Instrument / Gauge Identification</th>
                <th style="width: 150px; text-align: center;">Frequency</th>
                <th style="width: 150px; text-align: center;">Next Calibration Date</th>
              </tr>
            </thead>
            <tbody>
              ${calibration.length ? calibration.map(c => `
                <tr>
                  <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">${escapeHtml(c.gaugeId)}</td>
                  <td style="text-align: center;">Every ${c.freq} Months</td>
                  <td style="text-align: center; font-weight: bold; color: var(--warning-text, #b45309);">${escapeHtml(c.nextDate)}</td>
                </tr>
              `).join('') : '<tr><td colspan="3" style="text-align: center; color: var(--success, #34c759); padding: 12px; font-weight: bold;">[OK] All inspection gauges are calibrated.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      ${buildQuickLaunchpadHtml()}
    `;
  }

  // =========================================================================
  // 7. HR & PAYROLL COCKPIT
  // =========================================================================
  function buildHRCockpitHtml(data) {
    const kpis = data.kpis || {};
    const hr = data.hr || {};
    const loans = hr.loans || [];

    return `
      <div class="dash-kpi-grid">
        <div class="dash-kpi-card kpi-blue">
          <div class="dash-kpi-label">ACTIVE EMPLOYEE HEADCOUNT</div>
          <div class="dash-kpi-value">${hr.activeStaff || 0} / ${hr.totalStaff || 0}</div>
          <div class="dash-kpi-sub">Active Staff Members on Roll</div>
        </div>

        <div class="dash-kpi-card kpi-amber">
          <div class="dash-kpi-label">ACTIVE STAFF LOANS &amp; ADVANCES</div>
          <div class="dash-kpi-value">${loans.length} Loans</div>
          <div class="dash-kpi-sub">Repayments Under Tracking</div>
        </div>

        <div class="dash-kpi-card kpi-green">
          <div class="dash-kpi-label">BILLED SALES (FY)</div>
          <div class="dash-kpi-value">${fmtRs(kpis.totalSales)}</div>
          <div class="dash-kpi-sub">Company Operational Revenue</div>
        </div>

        <div class="dash-kpi-card kpi-blue">
          <div class="dash-kpi-label">TOTAL PURCHASES (FY)</div>
          <div class="dash-kpi-value">${fmtRs(kpis.totalPurchases)}</div>
          <div class="dash-kpi-sub">Company Operating Expenditure</div>
        </div>
      </div>

      <!-- Active Staff Loans Table -->
      <div class="dash-panel" style="margin-bottom: 16px;">
        <div class="dash-panel-header">
          <span class="dash-panel-title">Active Staff Loans &amp; Advances Tracking</span>
          <span class="dash-panel-subbadge">Payroll Deductions</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th style="width: 100px;">Loan ID</th>
                <th>Staff Employee Name</th>
                <th style="width: 110px;">Sanction Date</th>
                <th style="width: 130px; text-align: right;">Sanctioned (Rs)</th>
                <th style="width: 130px; text-align: right;">Balance Due (Rs)</th>
                <th>Reason / Loan Purpose</th>
              </tr>
            </thead>
            <tbody>
              ${loans.length ? loans.map(l => `
                <tr>
                  <td style="font-weight: 600; font-family: var(--font-mono); color: var(--primary);">#${l.id}</td>
                  <td style="font-weight: 600; color: var(--text-main);">${escapeHtml(l.name)}</td>
                  <td>${escapeHtml(l.date)}</td>
                  <td style="text-align: right; font-family: var(--font-mono);">${fmtRs(l.amount)}</td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--danger, #ff3b30);">${fmtRs(l.balance)}</td>
                  <td>${escapeHtml(l.reason || "-")}</td>
                </tr>
              `).join('') : '<tr><td colspan="6" style="text-align: center; color: var(--success, #34c759); padding: 12px; font-weight: bold;">[OK] No active staff loans outstanding.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      ${buildQuickLaunchpadHtml()}
    `;
  }

  // =========================================================================
  // SHARED REUSABLE COMPONENTS
  // =========================================================================
  function buildMetalRatesTickerHtml() {
    return `
      <div class="dash-metal-strip" id="dash-metal-strip">
        <div class="dash-metal-header">
          <div class="dash-metal-title-wrap">
            <span class="dash-metal-live-dot" title="Real-Time Market Stream Active"></span>
            <span class="dash-metal-title">Live Metal Rates &amp; Mandi Benchmark</span>
            <span class="dash-metal-badge">MCX &bull; Jamnagar &bull; Forex</span>
          </div>
          <div class="dash-metal-actions">
            <span id="dash-metal-timestamp" class="dash-metal-time">Syncing live benchmark...</span>
            <button type="button" id="btn-metal-edit-modal" class="dash-metal-action-btn" title="Set Today's Factory / Mandi Yard Rates">Set Mandi Rates</button>
            <button type="button" id="btn-metal-refresh" class="dash-metal-action-btn" title="Refresh Live Market Rates">↻ Refresh</button>
          </div>
        </div>
        <div class="dash-metal-grid" id="dash-metal-cards">
          <!-- Dynamically populated -->
        </div>
      </div>
    `;
  }

  function buildQuickLaunchpadHtml() {
    return `
      <div class="dash-launchpad">
        <span class="dash-launchpad-title">Quick Launchpad</span>
        <div class="dash-launchpad-btns">
          <button type="button" class="dash-quick-btn" id="dash-btn-new-mfg-inv">+ New Mfg Invoice</button>
          <button type="button" class="dash-quick-btn" id="dash-btn-new-lab-inv">+ New Labour Invoice</button>
          <button type="button" class="dash-quick-btn" id="dash-btn-new-dc">+ New Delivery Challan</button>
          <button type="button" class="dash-quick-btn" id="dash-btn-new-po">+ New Purchase PO</button>
          <button type="button" class="dash-quick-btn" id="dash-btn-gst-reports">GST Reports &amp; Filing</button>
          <button type="button" class="dash-quick-btn" id="dash-btn-traceability">Material Traceability</button>
          <button type="button" class="dash-quick-btn" id="dash-btn-valuation">AS-2 Stock Valuation</button>
          <button type="button" class="dash-quick-btn" id="dash-btn-export-center">Modern Export Center</button>
          <button type="button" class="dash-quick-btn" id="dash-btn-audit-trail">Security &amp; Audit Trail</button>
          <button type="button" class="dash-quick-btn" id="dash-btn-notify-hub">WhatsApp &amp; Email Dispatch</button>
          <button type="button" class="dash-quick-btn" id="dash-btn-barcode-hub">Barcode &amp; QR Labels</button>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // METAL RATES RENDERING & MODAL
  // =========================================================================
  function renderMetalRates(rates) {
    const container = document.getElementById("dash-metal-cards");
    const tsEl = document.getElementById("dash-metal-timestamp");
    if (!container) return;

    if (!rates || !rates.length) {
      container.innerHTML = '<div style="color: #64748b; font-size: 11px; padding: 6px;">Live metal benchmarks syncing...</div>';
      return;
    }

    if (tsEl) {
      const now = new Date();
      tsEl.textContent = `Synced: ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
    }

    const metalPillMeta = {
      COPPER_MCX: { badgeClass: "badge-copper" },
      BRASS_ROD: { badgeClass: "badge-brass" },
      BRASS_HONEY_SCRAP: { badgeClass: "badge-honey" },
      ZINC_MCX: { badgeClass: "badge-zinc" },
      ALUMINIUM_INGOT: { badgeClass: "badge-aluminium" },
      LEAD_INGOT: { badgeClass: "badge-lead" },
      USD_INR: { badgeClass: "badge-forex" }
    };

    container.innerHTML = rates.map((m) => {
      const info = metalPillMeta[m.metal_code] || { badgeClass: "badge-generic" };
      const chgPct = Number(m.change_pct || 0);
      const isUp = chgPct > 0;
      const isZero = chgPct === 0;
      const trendClass = isZero ? "metal-trend-flat" : (isUp ? "metal-trend-up" : "metal-trend-down");
      const trendArrow = isZero ? "● " : (isUp ? "▲ +" : "▼ ");
      const rateFormatted = Number(m.rate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const unitClean = m.unit ? m.unit.replace(/^Rs\.\s*/i, "").trim() : "/ kg";

      return `
        <div class="dash-metal-card" data-code="${escapeHtml(m.metal_code)}" title="${escapeHtml(m.source || 'Benchmark')} | High: ₹${m.high_rate || rateFormatted} | Low: ₹${m.low_rate || rateFormatted}">
          <div class="dash-metal-card-header">
            <span class="dash-metal-sym-pill ${info.badgeClass}">${escapeHtml(m.symbol)}</span>
            <span class="dash-metal-trend ${trendClass}">${trendArrow}${Math.abs(chgPct).toFixed(2)}%</span>
          </div>
          <div class="dash-metal-card-name" title="${escapeHtml(m.metal_name)}">${escapeHtml(m.metal_name)}</div>
          <div class="dash-metal-card-price">
            <span class="dash-metal-currency">₹</span><span class="dash-metal-number">${rateFormatted}</span>
            <span class="dash-metal-unit">${escapeHtml(unitClean)}</span>
          </div>
          <div class="dash-metal-card-meta">
            <span class="dash-metal-source-tag">${escapeHtml(m.source || 'Benchmark')}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  async function openMetalRatesModal() {
    const modal = document.getElementById("metal-rate-modal");
    const tbody = document.getElementById("metal-modal-tbody");
    const statusText = document.getElementById("metal-modal-status-text");
    if (!modal || !tbody) return;

    if (statusText) statusText.textContent = "Tip: Changes broadcast live across all client dashboards.";

    try {
      const res = await fetch("/api/metal-rates");
      const data = await res.json();
      const rates = data.rates || [];
      tbody.innerHTML = rates.map(m => `
        <tr style="border-bottom: 1px solid var(--border-light, #e2e8f0);">
          <td style="padding: 6px 10px; font-weight: bold; color: var(--primary);">${escapeHtml(m.symbol)}</td>
          <td style="padding: 6px 10px; font-weight: 500;">${escapeHtml(m.metal_name)}</td>
          <td style="padding: 6px 10px; color: #64748b; font-size: 10px;">${escapeHtml(m.source || 'Benchmark')}</td>
          <td style="padding: 6px 10px; text-align: right;">
            <input type="number" step="0.05" class="metal-modal-input-rate" data-code="${escapeHtml(m.metal_code)}" value="${Number(m.rate).toFixed(2)}" style="width: 105px; text-align: right; padding: 3px 6px; font-family: monospace; font-size: 11px; font-weight: bold; border: 1px solid #7f9db9; border-radius: 3px;">
          </td>
          <td style="padding: 6px 10px; color: #475569;">${escapeHtml(m.unit)}</td>
        </tr>
      `).join('');

      modal.hidden = false;
      modal.style.display = "flex";
    } catch (e) {
      alert("Failed to load metal rates: " + e.message);
    }
  }

  function closeMetalRatesModal() {
    const modal = document.getElementById("metal-rate-modal");
    if (modal) {
      modal.hidden = true;
      modal.style.display = "none";
    }
  }

  async function saveMetalRatesFromModal() {
    const modal = document.getElementById("metal-rate-modal");
    if (!modal) return;
    const inputs = modal.querySelectorAll(".metal-modal-input-rate");
    const sourceLabel = document.getElementById("metal-modal-source-label")?.value?.trim() || "Jamnagar Daily Mandi Fixing";
    const statusText = document.getElementById("metal-modal-status-text");

    const updates = [];
    inputs.forEach(inp => {
      const code = inp.dataset.code;
      const rate = Number(inp.value);
      if (code && rate > 0) {
        updates.push({ metalCode: code, rate });
      }
    });

    if (statusText) statusText.textContent = "Saving and broadcasting live rates...";

    try {
      const res = await fetch("/api/metal-rates/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates, source: sourceLabel })
      });
      const data = await res.json();
      if (data.ok) {
        if (statusText) statusText.textContent = "Rates saved and broadcast successfully.";
        setTimeout(() => {
          closeMetalRatesModal();
          loadDashboard(activeRole, activeFrom, activeTo);
        }, 500);
      } else {
        alert("Error saving rates: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Network error saving rates: " + e.message);
    }
  }

  async function resetDefaultBenchmarks() {
    if (!confirm("Reset all Mandi rates back to official MCX/LME default benchmarks?")) return;
    const defaults = [
      { metalCode: 'COPPER_MCX', rate: 848.50 },
      { metalCode: 'BRASS_ROD', rate: 524.00 },
      { metalCode: 'BRASS_HONEY_SCRAP', rate: 446.50 },
      { metalCode: 'ZINC_MCX', rate: 268.40 },
      { metalCode: 'ALUMINIUM_INGOT', rate: 234.10 },
      { metalCode: 'LEAD_INGOT', rate: 186.50 },
      { metalCode: 'USD_INR', rate: 84.32 }
    ];
    await fetch("/api/metal-rates/bulk-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: defaults, source: "Official MCX / Jamnagar Benchmark" })
    });
    openMetalRatesModal();
    loadDashboard(activeRole, activeFrom, activeTo);
  }

  // =========================================================================
  // ACTIONS & QUICK LAUNCHERS WIRING
  // =========================================================================
  function bindRoleActions(data) {
    // Bill Now buttons in tables
    document.querySelectorAll(".dash-btn-bill").forEach((btn) => {
      btn.addEventListener("click", () => {
        toggleDashboard(false);
        const type = btn.dataset.type;
        if (type === "Labour") {
          if (window.openLabourInvoice) window.openLabourInvoice();
        } else {
          if (window.openInvoiceMfg) window.openInvoiceMfg();
        }
      });
    });

    // Raise PO buttons in tables
    document.querySelectorAll(".dash-btn-po").forEach((btn) => {
      btn.addEventListener("click", () => {
        toggleDashboard(false);
        if (typeof window.openPo === "function") window.openPo(true);
        else if (typeof window.openPO === "function") window.openPO(true);
      });
    });
  }

  function toggleDashboard(forceState) {
    const cockpit = document.getElementById("dashboard-cockpit");
    if (!cockpit) return;

    if (forceState !== undefined) {
      isDashboardVisible = forceState;
    } else {
      isDashboardVisible = !isDashboardVisible;
    }

    if (isDashboardVisible) {
      cockpit.hidden = false;
      cockpit.style.display = "block";
      const toggleBtn = document.getElementById("btn-toggle-dashboard");
      if (toggleBtn) toggleBtn.innerHTML = "Hide Dashboard";
      const refreshBtn = document.getElementById("dash-btn-refresh");
      if (refreshBtn) refreshBtn.style.display = "inline-flex";
      loadDashboard(activeRole, activeFrom, activeTo);
    } else {
      cockpit.hidden = true;
      cockpit.style.display = "none";
      const toggleBtn = document.getElementById("btn-toggle-dashboard");
      if (toggleBtn) toggleBtn.innerHTML = "Live Dashboard";
      const refreshBtn = document.getElementById("dash-btn-refresh");
      if (refreshBtn) refreshBtn.style.display = "none";
    }
  }

  function bindQuickLaunchers() {
    const map = [
      { id: "dash-btn-new-mfg-inv", fn: () => { toggleDashboard(false); window.openInvoiceMfg && window.openInvoiceMfg(); } },
      { id: "dash-btn-new-lab-inv", fn: () => { toggleDashboard(false); window.openLabourInvoice && window.openLabourInvoice(); } },
      { id: "dash-btn-new-dc", fn: () => { toggleDashboard(false); window.openDC && window.openDC(); } },
      { id: "dash-btn-new-po", fn: () => {
        toggleDashboard(false);
        if (typeof window.openPo === "function") window.openPo(true);
        else if (typeof window.openPO === "function") window.openPO(true);
        else {
          const po = document.getElementById("po");
          if (po) po.hidden = false;
        }
      }},
      { id: "dash-btn-gst-reports", fn: () => {
        toggleDashboard(false);
        if (typeof window.openGSTReports === "function") window.openGSTReports();
        else if (typeof window.openGstReports === "function") window.openGstReports();
        else if (typeof window.openGstReportsModal === "function") window.openGstReportsModal();
      }},
      { id: "dash-btn-traceability", fn: () => {
        toggleDashboard(false);
        if (typeof window.openTraceability === "function") window.openTraceability();
        else {
          const tr = document.getElementById("traceability-window");
          if (tr) { tr.hidden = false; tr.style.display = "block"; }
        }
      }},
      { id: "dash-btn-valuation", fn: () => {
        toggleDashboard(false);
        if (typeof window.openStockPosition === "function") window.openStockPosition();
        else if (typeof window.openStock === "function") window.openStock();
      }},
      { id: "dash-btn-export-center", fn: () => {
        toggleDashboard(false);
        if (typeof window.openExportCenter === "function") window.openExportCenter();
      }},
      { id: "dash-btn-audit-trail", fn: () => {
        toggleDashboard(false);
        if (typeof window.openAuditTrail === "function") window.openAuditTrail();
        else {
          const w = document.getElementById("audit-window");
          if (w) { w.hidden = false; w.style.display = "block"; }
        }
      }},
      { id: "dash-btn-notify-hub", fn: () => {
        toggleDashboard(false);
        if (typeof window.openNotificationModal === "function") {
          window.openNotificationModal({ docType: "invoice", docNo: "7047", subType: "mfg" });
        }
      }},
      { id: "dash-btn-barcode-hub", fn: () => {
        toggleDashboard(false);
        if (typeof window.openBarcodeModal === "function") {
          window.openBarcodeModal({ itemCode: "B1", heatNo: "HT-BRASS-704", batchNo: "BT-2026-081" });
        }
      }},
      { id: "dash-btn-refresh", fn: () => loadDashboard(activeRole, activeFrom, activeTo) },
      { id: "dash-btn-close-cockpit", fn: () => toggleDashboard(false) },
      { id: "btn-metal-edit-modal", fn: () => openMetalRatesModal() },
      { id: "btn-metal-refresh", fn: () => loadDashboard(activeRole, activeFrom, activeTo) },
      { id: "metal-modal-close-x", fn: () => closeMetalRatesModal() },
      { id: "metal-modal-btn-close", fn: () => closeMetalRatesModal() },
      { id: "metal-modal-btn-save", fn: () => saveMetalRatesFromModal() },
      { id: "metal-modal-btn-reset-default", fn: () => resetDefaultBenchmarks() }
    ];

    map.forEach(({ id, fn }) => {
      const el = document.getElementById(id);
      if (el) {
        el.removeEventListener("click", fn);
        el.addEventListener("click", fn);
      }
    });
  }

  // Header Dashboard Toggle Button Listener
  function bindHeaderDashboardButton() {
    const headerToggle = document.getElementById("btn-toggle-dashboard");
    if (headerToggle && !headerToggle.dataset.dashBound) {
      headerToggle.dataset.dashBound = "true";
      headerToggle.addEventListener("click", () => toggleDashboard());
    }
  }

  // Background auto-refresh (60 seconds) preserving active filters
  setInterval(() => {
    if (isDashboardVisible) {
      loadDashboard(activeRole, activeFrom, activeTo);
    }
  }, 60000);

  // Global Exports
  window.loadDashboard = loadDashboard;
  window.toggleDashboard = toggleDashboard;
  window.minimizeDashboard = () => toggleDashboard(false);
  window.initDashboard = (session) => {
    if (session && (session.role_key || session.roleKey)) {
      activeRole = (session.role_key || session.roleKey).toUpperCase();
    }
    bindHeaderDashboardButton();
    loadDashboard(activeRole, activeFrom, activeTo);
    const toggleBtn = document.getElementById("btn-toggle-dashboard");
    if (toggleBtn) toggleBtn.innerHTML = "Hide Dashboard";
  };

  // Bootstrap on page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bindHeaderDashboardButton();
      window.initDashboard();
    });
  } else {
    bindHeaderDashboardButton();
    setTimeout(() => window.initDashboard(), 100);
  }
})();
