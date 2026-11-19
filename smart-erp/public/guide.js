/**
 * Tamba ERP — In-App User Guide & Interactive Knowledge Base
 * Built for complete beginners & industrial enterprise staff.
 * Designed in accordance with the Tamba ERP UI/UX Design System.
 * 100% Comprehensive Coverage across all 12 modules, Cockpit & Utilities.
 */

(function () {
  "use strict";

  // Universal Safe Screen Jump Launcher
  window.guideJumpToScreen = function (screenName, ...args) {
    // 1. Close or minimize User Guide window
    if (typeof window.closeUserGuide === "function") {
      window.closeUserGuide();
    }

    // 2. Minimize / hide Live Dashboard if open (unless jumping to dashboard)
    if (screenName !== "dashboard" && typeof window.toggleDashboard === "function") {
      window.toggleDashboard(false);
    }

    // 3. Screen mapping dictionary - 100% Comprehensive ERP Screen Openers
    const SCREEN_MAP = {
      // Live Dashboard Cockpit
      dashboard: () => {
        if (typeof window.toggleDashboard === "function") window.toggleDashboard(true);
      },

      // Masters
      company: () => window.openCompany && window.openCompany(),
      store: () => window.openStore && window.openStore(),
      item: () => window.openItem && window.openItem(),
      category: () => window.openCategory && window.openCategory(),
      bom: () => window.openBom && window.openBom(),
      process: () => window.openProcess && window.openProcess(),
      machine: () => window.openMachine && window.openMachine(),
      recipe: () => window.openRecipeHub && window.openRecipeHub(),
      customer: () => window.openCustomer && window.openCustomer(),
      vendor: () => window.openVendor && window.openVendor(),
      supplier: () => window.openSupplier && window.openSupplier(),
      users: () => window.openUsers && window.openUsers(),
      userRights: () => window.openUserRights && window.openUserRights(),

      // Production Planning & Estimation
      assmReq: () => window.openAssm && window.openAssm(),
      matReq: () => window.openMat && window.openMat(),
      planChart: () => window.openPlan && window.openPlan(),
      planCapa: () => window.openCapa && window.openCapa(),
      prodSchd: () => window.openSchd && window.openSchd(),
      estimation: () => window.openEsti && window.openEsti(),

      // Procurement / Inward
      enquiry: () => window.openEnq && window.openEnq(),
      po: () => window.openPo && window.openPo(),
      grn: () => window.openGrn && window.openGrn(),
      scn: () => window.openScnPurch && window.openScnPurch(),
      invPurch: () => window.openInvPurch && window.openInvPurch(),

      // Inventory & Warehouse
      ist: () => window.openIst && window.openIst(),
      toolCrib: () => window.openTool && window.openTool(),
      stockIssue: () => window.openIssue && window.openIssue(),
      scnGen: () => window.openScnGen && window.openScnGen(),
      stock: () => window.openStockPosition ? window.openStockPosition() : (window.openStock && window.openStock()),

      // Production / Shopfloor
      iwo: () => window.openIwo && window.openIwo(),
      prodn: () => window.openProdn && window.openProdn(),
      iwoReturn: () => window.openIwoReturn && window.openIwoReturn(),
      traveler: () => window.openTravelerHub && window.openTravelerHub(),
      packing: () => window.openPackingHub && window.openPackingHub(),

      // Quality Lab & Metrology
      inspRandom: () => window.openInspectionRandom && window.openInspectionRandom(),
      inspInde: () => window.openInspectionInde && window.openInspectionInde(),
      inspSc: () => window.openInspectionSC && window.openInspectionSC(),
      spectro: () => window.openSpectroHub && window.openSpectroHub(),
      gauge: () => window.openGaugeRegisterHub ? window.openGaugeRegisterHub() : (window.openGaugeHub && window.openGaugeHub()),
      traceability: () => window.openTraceability && window.openTraceability(),

      // Plant & Machine Maintenance
      maintainSch: () => window.openMaintainSch && window.openMaintainSch(),
      maintainPro: () => window.openMaintainPro && window.openMaintainPro(),
      breakdown: () => window.openBreakdown && window.openBreakdown(),
      calibrate: () => window.openCalibrate && window.openCalibrate(),

      // Sales & Outward Dispatch
      quote: () => window.openQuote && window.openQuote(),
      mfgPo: () => window.openMfgPO && window.openMfgPO(),
      dc: () => window.openDC && window.openDC(),
      invoice: () => window.openInvoiceMfg && window.openInvoiceMfg(),

      // Job Work & Subcontracting
      labourPo: () => window.openLabourPO && window.openLabourPO(),
      labourDcIn: () => window.openLabourDCIn && window.openLabourDCIn(),
      labourDcOut: () => window.openLabourDCOut && window.openLabourDCOut(),
      labourInvoice: () => window.openLabourInvoice && window.openLabourInvoice(),
      subconPo: () => window.openSubconPO && window.openSubconPO(),
      subconDcOut: () => window.openSubconDcOut && window.openSubconDcOut(),
      subconDcIn: () => window.openSubconDcIn && window.openSubconDcIn(),
      subconScn: () => window.openSubconScn && window.openSubconScn(),
      subconInvoice: () => window.openSubconInvoice && window.openSubconInvoice(),

      // Cash Flow & Accounts
      cashflow: () => window.openCashflowHub ? window.openCashflowHub() : (window.openPayments && window.openPayments()),
      payment: () => window.openCashflowHub ? window.openCashflowHub("voucher", "Payment") : (window.openPayments && window.openPayments()),
      receipt: () => window.openCashflowHub ? window.openCashflowHub("voucher", "Receipt") : (window.openReceipts && window.openReceipts()),
      advadjust: () => window.openCashflowHub ? window.openCashflowHub("advadjust") : (window.openAdvAdjust && window.openAdvAdjust()),

      // HR & Payroll
      staff: () => window.openStaff && window.openStaff(),
      shift: () => window.openShift && window.openShift(),
      attendance: () => window.openAttendance && window.openAttendance(),
      staffLoan: () => window.openStaffLoan && window.openStaffLoan(),
      salary: () => window.openSalary && window.openSalary(),

      // GST & Statutory Compliance
      gst: () => window.openGSTReports && window.openGSTReports(),
      audit: () => window.openAuditTrail && window.openAuditTrail(),

      // Utilities & Factory Automation
      notificationHub: () => window.openNotificationModal && window.openNotificationModal(),
      barcodeHub: () => window.openBarcodeModal && window.openBarcodeModal(),
      convert: () => window.openConvert && window.openConvert(),
      userStatus: () => window.openUserStatus && window.openUserStatus()
    };

    if (SCREEN_MAP[screenName]) {
      SCREEN_MAP[screenName](...args);
    } else if (typeof window[screenName] === "function") {
      window[screenName](...args);
    } else {
      console.warn("[Guide] Unknown screen opener:", screenName);
    }
  };

  // Guide Knowledge Base Database — 15 Exhaustive Chapters
  const GUIDE_CHAPTERS = [
    {
      id: "intro",
      title: "1. Welcome, Cockpit & ERP 101",
      subtitle: "The 30,000-ft View for Complete Beginners",
      role: "all",
      badge: "Getting Started",
      readTime: "4 min",
      content: `
        <div class="guide-intro-hero">
          <h3>Welcome to Tamba Industrial Enterprise ERP</h3>
          <p class="guide-lead">
            Tamba ERP is a specialized manufacturing resource planning platform engineered specifically for brass, precision engineering, CNC machining, forging, and metal fabrication plants.
          </p>
        </div>

        <div class="guide-diagram-box">
          <div class="guide-diagram-title">The Master Supply Chain & Production Lifecycle</div>
          <div class="guide-process-flow">
            <span class="flow-pill"><span class="flow-num">01</span> Customer Quote / PO</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">02</span> Planning & BOM</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">03</span> Purchase PO & GRN</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">04</span> Inspection SCN</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">05</span> IWO Metal Issue</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">06</span> CNC Machining</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">07</span> Quality Lab & MTC</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">08</span> Sales DC & Invoice</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">09</span> Cash Collection</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">10</span> Statutory GST</span>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Cockpit</div>
          <div class="guide-step-content">
            <h4>Live Operations Cockpit (Multi-Role Dashboard)</h4>
            <p>Every time you log in, Tamba ERP greets you with the <b>Live Operations Cockpit</b>. Use the top role tabs to switch between tailored operational views:</p>
            <ul>
              <li><b>Executive / Overview:</b> High-level production output (kg), revenue, cash position, and critical alerts.</li>
              <li><b>Financial & Accounts:</b> Receivables vs payables, pending advance adjustments, and GSTR summaries.</li>
              <li><b>Production & Machines:</b> Active spindle utilization, shift output, rejection rates, and route traveler milestones.</li>
              <li><b>Warehouse & Stores:</b> Pending GRN quarantine, material shortages, and minimum reorder level alerts.</li>
              <li><b>Metrology & Quality:</b> Pending chemical MTCs, thread gauge calibration due dates, and dimensional inspection approvals.</li>
            </ul>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('dashboard');">🚀 Open Live Cockpit</button>
          </div>
        </div>

        <h3>Day-1 Quick-Start Checklists by Factory Role</h3>
        <p>Select your operational role below to see the exact daily SOP workflow:</p>

        <div class="guide-cards-grid">
          <div class="guide-card">
            <div class="guide-card-icon">📦</div>
            <div class="guide-card-title">Stores & Warehouse Manager</div>
            <ol style="margin: 0 0 10px; padding-left: 18px; font-size: 11.5px; line-height: 1.55;">
              <li>Log incoming vendor trucks on <b>Goods Received Note (GRN)</b>.</li>
              <li>Verify weights on the digital weighbridge scale.</li>
              <li>Inspect incoming metal bars via <b>Material SCN</b> to increase warehouse stock.</li>
              <li>Issue metal rods to CNC machinists against <b>Internal Work Orders (IWO)</b>.</li>
              <li>Perform <b>Inter-Store Transfers (IST)</b> between raw and finished stores.</li>
            </ol>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('grn');">🚀 Open GRN Screen</button>
          </div>

          <div class="guide-card">
            <div class="guide-card-icon">⚙️</div>
            <div class="guide-card-title">CNC Machinist & Shopfloor Supervisor</div>
            <ol style="margin: 0 0 10px; padding-left: 18px; font-size: 11.5px; line-height: 1.55;">
              <li>Review cutting parameters in <b>Tooling Recipes</b>.</li>
              <li>Accept issued metal rods under <b>IWO Issue</b>.</li>
              <li>Log output, cycle times & downtime in <b>Production Log</b>.</li>
              <li>Credit back brass turning swarf/borings in <b>IWO Scrap Return</b>.</li>
              <li>Print & scan tote bin <b>QR Route Travelers</b> & box pack finished parts.</li>
            </ol>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('prodn');">🚀 Open Production Log</button>
          </div>

          <div class="guide-card">
            <div class="guide-card-icon">🔬</div>
            <div class="guide-card-title">Quality & Metrology Inspector</div>
            <ol style="margin: 0 0 10px; padding-left: 18px; font-size: 11.5px; line-height: 1.55;">
              <li>Perform inward inspection on <b>Material SCN</b>.</li>
              <li>Run optical spectrometer chemical tests (Cu, Zn, Pb, Fe).</li>
              <li>Generate certified <b>EN 10204 3.1 MTCs</b> with verification QR codes.</li>
              <li>Log dimensional tolerances in <b>Random & Individual Inspection</b>.</li>
              <li>Calibrate Go/No-Go plug gauges in <b>Gauge Register</b>.</li>
            </ol>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('spectro');">🚀 Open Spectro Hub</button>
          </div>

          <div class="guide-card">
            <div class="guide-card-icon">💼</div>
            <div class="guide-card-title">Sales & Commercial Coordinator</div>
            <ol style="margin: 0 0 10px; padding-left: 18px; font-size: 11.5px; line-height: 1.55;">
              <li>Create and issue competitive customer <b>Sales Quotations</b>.</li>
              <li>Register incoming client orders in <b>Customer Purchase Orders (Mfg PO)</b>.</li>
              <li>Generate <b>Outward Delivery Challans (DC)</b> to deduct finished stock.</li>
              <li>Convert DCs into GST-compliant <b>Manufacturing Tax Invoices</b>.</li>
              <li>Export NIC portal <b>E-Way Bill JSON</b> for shipments exceeding ₹50,000.</li>
            </ol>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('dc');">🚀 Open Delivery Challan</button>
          </div>

          <div class="guide-card">
            <div class="guide-card-icon">💰</div>
            <div class="guide-card-title">Accounts & Finance Specialist</div>
            <ol style="margin: 0 0 10px; padding-left: 18px; font-size: 11.5px; line-height: 1.55;">
              <li>Match purchase invoices with approved SCN inspection documents.</li>
              <li>Record vendor payments and customer receipts against open bills.</li>
              <li>Settle unallocated customer advances via <b>Advance Adjustments</b>.</li>
              <li>Reconcile batch bank statements in the <b>Cash Flow Hub</b>.</li>
              <li>Generate GSTR-1, GSTR-3B ITC summaries & review MCA Audit Trail.</li>
            </ol>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('cashflow');">🚀 Open Cash Flow Hub</button>
          </div>
        </div>

        <div class="guide-callout tip">
          <b>💡 Pro Tip for Beginners:</b> You don't have to navigate menus manually! Every step in this User Guide includes a direct Deep Teal launch button (e.g. <code>🚀 Open Screen</code>). Clicking it immediately minimizes the guide and opens the target form ready for data entry.
        </div>
      `
    },
    {
      id: "master",
      title: "2. Enterprise Master Setup",
      subtitle: "Configuring the Foundational DNA of your Manufacturing Plant",
      role: "admin",
      badge: "System Setup",
      readTime: "6 min",
      content: `
        <p>Before recording day-to-day production or dispatches, your enterprise master records must be established. Masters eliminate repetitive typing and enforce automated calculation of taxes, weights, and tolerances.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Company Details & Financial Books Setup</h4>
            <p>Open <b>Master ➔ My Company Details</b>. Enter your legal trade name, factory address, 15-digit GSTIN, State code (e.g. <code>24</code> for Gujarat), and bank account details for invoice printing.</p>
            <ul>
              <li><b>Auto-Running Invoice Sequence:</b> Choose between unified numbering or <i>Separate Books</i> (e.g. <code>INV/</code> for finished goods, <code>LBR/</code> for job work).</li>
            </ul>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('company');">🚀 Open Company Details</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Stores & Warehouse Bins Master</h4>
            <p>Open <b>Master ➔ Inventory ➔ Stores</b>. Create your physical inventory locations. At minimum, configure:</p>
            <ul>
              <li><code>Raw Material Store</code> (Ingots, extruded brass rods, forging billets).</li>
              <li><code>Shopfloor / WIP Store</code> (Parts undergoing turning, milling, or threading).</li>
              <li><code>Finished Goods Store</code> (Cleaned, inspected parts ready for box packaging).</li>
              <li><code>Tool Crib & Consumables Store</code> (Carbide inserts, drills, cutting oils).</li>
              <li><code>Scrap Store</code> (Brass borings, chips, and defective turnings).</li>
            </ul>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('store');">🚀 Open Store Master</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Item & Category Masters</h4>
            <p>Open <b>Master ➔ Inventory ➔ Item</b>. Each manufactured part or raw metal alloy needs a unique item code.</p>
            <ul>
              <li><b>Item Classification:</b> Specify category (Raw Metal, Finished Part, Consumable, Tooling).</li>
              <li><b>Engineering Weights:</b> Set Net Weight per piece and Gross Bar Weight required.</li>
              <li><b>HSN Code & GST Rate:</b> Essential for automated tax calculation (e.g. <code>7407</code> for brass rods at 18%, <code>7415</code> for brass fasteners).</li>
            </ul>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('item');">🚀 Open Item Master</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('category');">🚀 Open Category Master</button>
            </div>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Bill of Materials (BOM) & Stock Reduction</h4>
            <p>Open <b>Master ➔ Inventory ➔ Bill Of Materials</b> (<code>frmStkRedDefine</code>). The BOM connects a finished manufactured component to its raw materials.</p>
            <ul>
              <li>Define raw metal consumption ratio (e.g. 1.35 kg of CW614N 12mm hex rod produces 1.0 kg of finished hex spacers).</li>
              <li>Define expected runner/riser scrap allowances and swarf recovery percentages.</li>
            </ul>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('bom');">🚀 Open Bill of Materials (BOM)</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 5</div>
          <div class="guide-step-content">
            <h4>Machine Master & Setup Recipes</h4>
            <p>Open <b>Master ➔ General ➔ Machine</b>. Register every CNC Lathe, VMC, Traub automatic lathe, and forging press with its serial number, kilowatt rating, and default hourly rate.</p>
            <p>Next, click <b>Machine Setup & Tooling Recipe</b> to configure tool offsets, spindle RPM, feed rate, coolant types, and Go/No-Go gauge IDs per component.</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('machine');">🚀 Open Machine Master</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('recipe');">⚙️ Open Tooling Recipes</button>
            </div>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 6</div>
          <div class="guide-step-content">
            <h4>Commercial Partners & User Rights</h4>
            <p>Register Customers, Vendors, and Suppliers with their 15-digit GSTIN, PAN, and payment credit days. Finally, configure <b>User Rights</b> to establish granular role-based security.</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('customer');">🚀 Open Customer Master</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('vendor');">🚀 Open Vendor Master</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('supplier');">🚀 Open Supplier Master</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('userRights');">🔒 Open User Rights Matrix</button>
            </div>
          </div>
        </div>
      `
    },
    {
      id: "planning",
      title: "3. Production Planning & Cost Estimation",
      subtitle: "BOM Explosion, Metal Shortage Analysis & Machine Scheduling",
      role: "prod",
      badge: "Planning",
      readTime: "5 min",
      content: `
        <p>Before launching high-volume production, the planning department analyzes raw material availability against confirmed customer orders, verifies machine capacity, and computes job costing.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Assembly Requirement Analysis</h4>
            <p>Open <b>Planning ➔ Assembly - Requirement Analysis</b> (<code>frmAssmReqAnaly</code>). Select confirmed customer delivery orders. The system explodes the multi-level BOM to calculate exact child part quantities needed across sub-assemblies.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('assmReq');">🚀 Open Assembly Analysis</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Material Requirement Analysis (Shortage Engine)</h4>
            <p>Open <b>Planning ➔ Material - Requirement Analysis</b> (<code>frmMatReqAnaly</code>). Compares gross required metal weight against active warehouse inventory and pending purchase POs to highlight raw metal shortages before machining starts.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('matReq');">🚀 Open Material Shortages</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Production Plan Chart & Machine Capacity</h4>
            <p>Open <b>Planning ➔ Production Plan Chart</b> (<code>frmPlanY</code>) and <b>Production Capacity</b> (<code>frmPlanProdCapacity</code>). Visualize machine line loading, compare required spindle hours against available machine shifts, and prevent bottlenecks on bottleneck CNC stations.</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('planChart');">🚀 Open Production Plan Chart</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('planCapa');">🚀 Open Machine Capacity</button>
            </div>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Production Schedule & Dispatch Commitments</h4>
            <p>Open <b>Planning ➔ Production Schedule</b> (<code>frmProdSchedule</code>). Set daily target production quantities by machine and operator to align shopfloor dispatches with customer promise dates.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('prodSchd');">🚀 Open Dispatch Schedule</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 5</div>
          <div class="guide-step-content">
            <h4>Part Cost Estimation & Quoting</h4>
            <p>Open <b>Planning ➔ Estimation</b> (<code>frmEstimation</code>). Build accurate part quotes by specifying raw metal alloy rate/kg, gross blank weight, cycle time, machine hourly rate, tool wear allowance, and credit for recovered brass turning scrap.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('estimation');">🚀 Open Cost Estimation</button>
          </div>
        </div>
      `
    },
    {
      id: "procurement",
      title: "4. Procurement & Raw Material Inward",
      subtitle: "From Supplier Quotation to Approved Warehouse Stock",
      role: "store",
      badge: "Inward Supply",
      readTime: "5 min",
      content: `
        <p>Purchasing metal ingots, extruded rods, and tooling inserts follows a strict 5-stage verification process to prevent fraudulent deliveries or off-grade alloy acceptance.</p>

        <div class="guide-diagram-box">
          <div class="guide-diagram-title">The Inward Procurement Chain</div>
          <div class="guide-process-flow">
            <span class="flow-pill"><span class="flow-num">01</span> Purchase Enquiry</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">02</span> Purchase PO</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">03</span> Gate GRN</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">04</span> Inspection SCN</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">05</span> Inward Invoice</span>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Purchase Enquiry & RFQ</h4>
            <p>Open <b>Purchase ➔ Enquiry</b>. Send Requests for Quotation (RFQs) to multiple raw metal suppliers with technical specifications (alloy grade, rod diameter, length, and delivery terms).</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('enquiry');">🚀 Open Purchase Enquiry</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Raising the Purchase Order (PO)</h4>
            <p>Open <b>Purchase ➔ Purchase Order - Outgoing</b>. Select vendor, store, item code, ordered weight (kg), negotiated rate, and committed arrival date.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('po');">🚀 Open Purchase Order</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Gate Entry: Goods Received Note (GRN)</h4>
            <p>When the vendor's delivery truck arrives at the factory gate, open <b>Purchase ➔ Goods Received Note</b>. Record delivery challan number, vehicle number, gross weighbridge scale weight, and tare weight.</p>
            <div class="guide-callout warn">
              <b>⚠️ Critical Rule:</b> Creating a GRN acknowledges physical truck arrival, but <b>DOES NOT</b> increase your active stock balance. Stock is kept in quarantine until inspected!
            </div>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('grn');">🚀 Open Gate GRN</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Material Inspection & Acceptance (SCN)</h4>
            <p>Open <b>Purchase ➔ Material Inspection & Acceptance (SCN)</b>. The storekeeper selects the open GRN, checks alloy heat tags, accepts verified good weight, and rejects defective metal.</p>
            <div class="guide-callout tip">
              <b>✅ Stock Effect:</b> Approving the SCN officially transfers accepted metal into your active warehouse inventory balance.
            </div>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('scn');">🚀 Open Material SCN</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 5</div>
          <div class="guide-step-content">
            <h4>Booking the Vendor Invoice</h4>
            <p>Open <b>Purchase ➔ Invoice Inwards</b>. Accounts matches the supplier's commercial GST invoice with the approved SCN quantity and locks the purchase price.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('invPurch');">🚀 Open Inward Bill</button>
          </div>
        </div>
      `
    },
    {
      id: "inventory",
      title: "5. Warehouse, Tool Crib & Store Operations",
      subtitle: "Multi-Store Transfers, Consumables Control & Tooling Logistics",
      role: "store",
      badge: "Inventory",
      readTime: "5 min",
      content: `
        <p>Beyond raw materials, factory stores manage internal warehouse transfers, carbide tooling, coolants, and maintenance consumables.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Inter-Store Transfers (IST)</h4>
            <p>Open <b>Inventory ➔ Inter-Store Transfer</b> (<code>frmStoreInterTrans</code>). Move stock between stores (e.g. moving brass rods from Central Warehouse to Shopfloor Buffer, or moving finished parts from Machine Line to Finished Goods Store).</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('ist');">🚀 Open Inter-Store Transfer</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Tool Crib Management (Inserts, Drills & Jaws)</h4>
            <p>Open <b>Inventory ➔ Tool Crib</b> (<code>frmToolCrib</code>). Issue expensive carbide inserts, endmills, reamers, and chuck jaws to specific operators and track tool life or tool returns.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('toolCrib');">🚀 Open Tool Crib</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Material Issue Note (Consumables & Lubricants)</h4>
            <p>Open <b>Inventory ➔ Material Issue Note</b> (<code>frmStockIssue</code>). Requisition general non-BOM factory supplies (hydraulic oils, cutting coolants, cotton waste, packaging corrugated boxes) to specific cost centers.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('stockIssue');">🚀 Open Material Issue Note</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Store Credit Note (General Returns)</h4>
            <p>Open <b>Inventory ➔ Store Credit Note (General)</b> (<code>frmSCNGen</code>). Return excess consumables, standard fasteners, or unused tooling from the shopfloor back into warehouse inventory.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('scnGen');">🚀 Open General SCN</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 5</div>
          <div class="guide-step-content">
            <h4>Real-Time Stock Position & Valuation</h4>
            <p>Open <b>Inventory ➔ Stock Position</b> (<code>frmStock</code>). View real-time physical balances across every warehouse, reorder alerts, and inventory valuation at moving average cost.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('stock');">🚀 Open Stock Position</button>
          </div>
        </div>
      `
    },
    {
      id: "production",
      title: "6. Production & Shopfloor Execution",
      subtitle: "Internal Work Orders, Machining Logs & QR Route Travelers",
      role: "prod",
      badge: "Shopfloor",
      readTime: "6 min",
      content: `
        <p>Turning raw metal into precision engineered components on CNC machines requires rigorous metal accountability, downtime tracking, and tote bin traceability.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Internal Work Order (IWO) Metal Issue</h4>
            <p>Open <b>Production ➔ Internal Work Order cum Material Issue</b>. Issue raw metal bars/billets to a specific machine and operator for a specific job order. The issued weight is deducted from raw stores and credited to Shopfloor WIP.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('iwo');">🚀 Open IWO Issue</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Shift Production Log & Downtime Tracking</h4>
            <p>Open <b>Production ➔ Production Log</b>. Machinists record:</p>
            <ul>
              <li>Machine number, operator, and shift timings (with built-in overlap collision detection).</li>
              <li>Good pieces produced and gross weight.</li>
              <li>Rejection pieces and defect codes.</li>
              <li>Machine idle time and breakdown categories (e.g. tool change, power cut, setup adjustment).</li>
            </ul>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('prodn');">🚀 Open Production Log</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Produced Material Return & Scrap Credit</h4>
            <p>Open <b>Production ➔ Produced Material - Return</b> (<code>frmProdnWOReturn</code>). Credit brass turning swarf, end-pieces, and borings back to the Scrap Store, keeping metal recovery percentages accurate.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('iwoReturn');">🚀 Open Scrap Return</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Digital Route Card & QR Traveler</h4>
            <p>Open <b>Production ➔ Digital Route Card & QR Traveler</b>. Print a QR-coded traveler card that physically accompanies the tote bin through every factory operation (Turning ➔ Milling ➔ Deburring ➔ Washing ➔ Inspection).</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('traveler');">🚀 Open Route Traveler Hub</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 5</div>
          <div class="guide-step-content">
            <h4>Piece-Count Weighing & Box Packing</h4>
            <p>Open <b>Production ➔ Piece-Count Weighing & Box Packing</b>. Hook into digital counting scales to compute exact piece counts from gross/tare carton weights and print barcode carton labels.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('packing');">🚀 Open Piece-Count Packing Hub</button>
          </div>
        </div>
      `
    },
    {
      id: "inspection",
      title: "7. Quality Control, Metrology Lab & Traceability",
      subtitle: "In-Process Sampling, Optical Spectrometer Analysis & EN 10204 3.1 MTCs",
      role: "qc",
      badge: "Quality Lab",
      readTime: "6 min",
      content: `
        <p>Tamba ERP provides a fully integrated metrology suite satisfying ISO 9001, IATF 16949, and EN 10204 3.1 inspection standards.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>In-Process Random Sampling Inspection</h4>
            <p>Open <b>Inspection ➔ Manufacturing & Labour ➔ Random Samples</b> (<code>frmInspection</code>). QC inspectors measure critical dimensions (OD, ID, length, concentricity) during active machining runs to catch tool wear early.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('inspRandom');">🚀 Open Random Inspection</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>100% Critical Dimension Sampling</h4>
            <p>Open <b>Inspection ➔ Manufacturing & Labour ➔ Individual Samples</b> (<code>frmInspectionInde</code>). For aerospace, automotive, or high-precision batches, record 100% serialized piece inspection data.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('inspInde');">🚀 Open 100% Final Sampling</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Optical Emission Spectrometer & Certified MTC 3.1</h4>
            <p>Open <b>Inspection ➔ Spectro Chemical Analysis & MTC 3.1</b>. Record laboratory chemical analysis (Copper %, Zinc %, Lead %, Iron %) against alloy standards (IS 319, CW614N, CZ121). Print certified <b>EN 10204 Type 3.1 Inspection Certificates</b> with tamper-proof QR verification.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('spectro');">🚀 Open Spectro Chemical Hub</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Thread Gauge Calibration & Wear Life Register</h4>
            <p>Open <b>Maintenance ➔ Thread Gauge Calibration</b>. Track Go/No-Go plug and ring gauges, record calibration dates and strike life, and print 50x25mm thermal calibration stickers.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('gauge');">🚀 Open Gauge Register Hub</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 5</div>
          <div class="guide-step-content">
            <h4>360° Backward & Forward Heat Traceability</h4>
            <p>Open <b>Inventory ➔ Batch & Heat Traceability</b> (<code>frmTraceability</code>). Enter any finished invoice number, batch code, or raw metal heat number. The audit graph displays the entire genealogy: raw metal supplier, chemical melt heat, machine operator, traveler QR, and customer dispatch.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('traceability');">🚀 Open 360° Traceability Hub</button>
          </div>
        </div>
      `
    },
    {
      id: "maintenance",
      title: "8. Plant & Machinery Maintenance",
      subtitle: "Preventive Schedules, Lubrication Processes & Breakdown Logs",
      role: "prod",
      badge: "Maintenance",
      readTime: "5 min",
      content: `
        <p>Unplanned machine downtime directly impacts dispatch commitments. Tamba ERP tracks preventive servicing routines, spindle bearing maintenance, and gauge calibrations.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Preventive Maintenance Schedule</h4>
            <p>Open <b>Maintenance ➔ Maintenance Schedule</b> (<code>frmMaintain</code>). Set periodic service intervals (daily, weekly, monthly, 1000 operating hours) for spindle lubrication, hydraulic filter changes, and coolant tank cleanouts.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('maintainSch');">🚀 Open Maintenance Schedule</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Maintenance Process & Servicing Routines</h4>
            <p>Open <b>Maintenance ➔ Maintenance Process</b> (<code>frmMaintainPro</code>). Maintenance engineers log completed maintenance checklists, oil grades replenished, and technician sign-offs.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('maintainPro');">🚀 Open Maintenance Process</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>BreakDown Maintenance & Downtime Analysis</h4>
            <p>Open <b>Maintenance ➔ BreakDown Maintenance</b> (<code>frmBrkDnMaint</code>). When a machine halts unexpectedly, log failure symptoms, root cause (electrical, mechanical, pneumatic), replacement spare parts consumed, and total downtime hours.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('breakdown');">🚀 Open Breakdown Maintenance</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Instrument Calibration History</h4>
            <p>Open <b>Maintenance ➔ Calibration History and Maintenance</b> (<code>frmCalibrate</code>). Manage calibration cycles for vernier calipers, micrometers, height gauges, and bore gauges to maintain ISO audit compliance.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('calibrate');">🚀 Open Calibration History</button>
          </div>
        </div>
      `
    },
    {
      id: "sales",
      title: "9. Sales Orders, Dispatch & Tax Invoicing",
      subtitle: "Customer RFQs to Delivery Challans, GST Invoices & E-Way Bills",
      role: "accounts",
      badge: "Revenue Flow",
      readTime: "5 min",
      content: `
        <p>From issuing competitive price quotations to generating outward delivery challans, GST tax invoices, and E-Way bills.</p>

        <div class="guide-diagram-box">
          <div class="guide-diagram-title">The Finished Goods Dispatch Flow</div>
          <div class="guide-process-flow">
            <span class="flow-pill"><span class="flow-num">01</span> Quotation</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">02</span> Customer PO In</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">03</span> Delivery Challan</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">04</span> Tax Invoice</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill"><span class="flow-num">05</span> E-Way Bill JSON</span>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Customer Sales Quotation</h4>
            <p>Open <b>Sales / Labour ➔ Quotation</b> (<code>frmQuote</code>). Create and send formal quotation bids to clients with piece rates, payment terms, minimum batch sizes, and validity dates.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('quote');">🚀 Open Sales Quotation</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Customer Purchase Order Inwards (Order Book)</h4>
            <p>Open <b>Sales / Labour ➔ Manufacturing ➔ Purchase Order - Inwards</b> (<code>frmMfgPO</code>). Register incoming customer orders, committed dispatch schedules, and contracted rates. The ERP tracks remaining pending balances across multiple partial shipments.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('mfgPo');">🚀 Open Customer PO Inward</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Creating an Outward Delivery Challan (DC)</h4>
            <p>Open <b>Sales / Labour ➔ Manufacturing ➔ DC</b>. Select customer, destination store (Finished Goods Store), items, and dispatch quantities.</p>
            <div class="guide-callout warn">
              <b>⚠️ Stock Deduction:</b> Saving the Delivery Challan immediately deducts finished parts from your warehouse inventory balance.
            </div>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('dc');">🚀 Open Sales Delivery Challan (DC)</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Generating the Manufacturing Tax Invoice</h4>
            <p>Open <b>Sales / Labour ➔ Manufacturing ➔ Invoice</b>. Select customer and open Delivery Challan(s). The system automatically computes Taxable Value, CGST (9%) + SGST (9%) or IGST (18%), Round Off, and Total Invoice Value. Print official GST invoices in 3 copies: <i>Original for Recipient, Duplicate for Transporter, Triplicate for Supplier</i>.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('invoice');">🚀 Open Manufacturing Invoice</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 5</div>
          <div class="guide-step-content">
            <h4>E-Way Bill JSON Export</h4>
            <p>For consignments exceeding ₹50,000, click <b>Export E-Way Bill JSON</b> on the invoice screen. Upload this JSON directly to the government NIC portal (<code>ewaybillgst.gov.in</code>) without manual re-typing!</p>
          </div>
        </div>
      `
    },
    {
      id: "jobwork",
      title: "10. Job Work & Subcontracting",
      subtitle: "Customer Metal Labour Work & Outward Plating/Heat Treatment",
      role: "store",
      badge: "Job Work",
      readTime: "6 min",
      content: `
        <p>Tamba ERP supports both directions of job work: inward customer-supplied metal for machining, and outward outsourcing of electroplating, anodizing, or heat treatment.</p>

        <h3>Section A: Customer Labour Work Inward (Machining Service)</h3>
        <p>When customers supply their own raw metal bars for turning:</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Inward Labour Work Order & Raw Metal Receipt</h4>
            <p>Open <b>Sales / Labour ➔ Labour ➔ Work Order - Inwards</b> (<code>frmLabourPO</code>) to record the job contract. When raw metal arrives, open <b>Labour ➔ DC Inwards</b> (<code>frmDCIncoming</code>) to book the customer's raw metal into your labour stock.</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('labourPo');">🚀 Open Labour WO</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('labourDcIn');">🚀 Open Labour DC In</button>
            </div>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Dispatching Machined Parts & Raising Service Invoice</h4>
            <p>After machining, dispatch turned parts via <b>Labour ➔ DC Outwards</b> (<code>frmDCOutgoing</code>). Then raise the service invoice via <b>Labour ➔ Invoice</b> (<code>frmInvoiceL</code>) charging machining labor under SAC Code <code>9988</code>.</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('labourDcOut');">🚀 Open Labour DC Out</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('labourInvoice');">🚀 Open Labour Invoice</button>
            </div>
          </div>
        </div>

        <h3 style="margin-top: 24px;">Section B: Subcontracting Outward (Plating / Heat Treatment)</h3>
        <p>When sending parts out to third-party vendors for electroplating, zinc passivation, or annealing:</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Subcontract Work Order & Annexure II DC Out</h4>
            <p>Open <b>Sub Contract ➔ Work Order - Outwards</b> (<code>frmSubConPO</code>). Issue the dispatch challan via <b>Sub Contract ➔ DC Outwards</b> with the official GST Annexure II declaration.</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('subconPo');">🚀 Open Subcon PO</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('subconDcOut');">🚀 Open Subcon DC Out</button>
            </div>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Receiving & Inspecting Treated Parts</h4>
            <p>Record returned parts in <b>Sub Contract ➔ Goods Received Note</b>, inspect plating thickness in <b>Sub Contract SCN</b>, and book the vendor's processing bill in <b>Sub Contract ➔ Invoice Inwards</b>.</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('subconDcIn');">🚀 Open Subcon GRN</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('subconScn');">🚀 Open Subcon SCN</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('subconInvoice');">🚀 Open Subcon Bill</button>
            </div>
          </div>
        </div>
      `
    },
    {
      id: "cashflow",
      title: "11. Cash Flow, Banking & Accounts",
      subtitle: "Vendor Payments, Customer Receipts, Advances & Live Cash Forecasting",
      role: "accounts",
      badge: "Finance",
      readTime: "5 min",
      content: `
        <p>Financial ledgers in Tamba ERP are directly updated whenever bills or vouchers are created, maintaining double-entry balance purity.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Vendor Payments</h4>
            <p>Open <b>Cash Flow ➔ Payments</b>. Select the supplier or vendor. The system loads all outstanding purchase bills. Enter the payment amount (Cheque, NEFT/RTGS, or Cash). The ERP allocates payments against specific invoices to clear open aging balances.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('payment');">🚀 Open Vendor Payments</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Customer Receipts</h4>
            <p>Open <b>Cash Flow ➔ Receipts</b>. When clients remit payment, select the customer and allocate the received amount against pending sales invoices to reduce accounts receivable.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('receipt');">🚀 Open Customer Receipts</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Batch Bank Transactions & Reconciliations</h4>
            <p>Open <b>Cash Flow ➔ Bank Transactions</b> (<code>frmBankTrans</code>). Record bank interest, charges, internal transfers between Current and OD accounts, or bulk Cheque clearance batches.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('cashflow');">🚀 Open Bank Transactions</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Advance Adjustments</h4>
            <p>Open <b>Cash Flow ➔ Advance Adjustments</b>. When customer advance deposits need to be applied against newly generated manufacturing invoices, allocate them without generating duplicate bank entries.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('advadjust');">🚀 Open Advance Adjustments</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 5</div>
          <div class="guide-step-content">
            <h4>Live Cash Flow Forecasting Cockpit</h4>
            <p>Launch the <b>Cash Flow Hub</b> to review real-time bank ledger balances, 30-day projected cash inflows from pending customer bills, and upcoming vendor payment commitments.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('cashflow');">🚀 Open Live Cash Flow Hub</button>
          </div>
        </div>
      `
    },
    {
      id: "hr",
      title: "12. Human Resources, Payroll & Staff Loans",
      subtitle: "Employee Profiles, Shift Allocations, Daily Attendance & Monthly Payroll",
      role: "admin",
      badge: "Staff & Payroll",
      readTime: "5 min",
      content: `
        <p>Tamba ERP includes a full shopfloor workforce management engine supporting biometric or manual punch attendance, multi-shift scheduling, staff loans, and monthly salary calculations.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Staff Master & Skill Matrix</h4>
            <p>Open <b>Master ➔ Human Resource ➔ Employee Details</b>. Record employee name, department, joining date, monthly base salary or daily wage rate, PF/ESI eligibility, and emergency contacts.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('staff');">🚀 Open Staff Master</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Shift Allocation</h4>
            <p>Open <b>Master ➔ Human Resource ➔ Shift Allocation</b> (<code>frmShiftAlloc</code>). Assign operators to Day Shift (08:00 AM - 04:30 PM), Night Shift (08:00 PM - 04:30 AM), or custom overtime rotations.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('shift');">🚀 Open Shift Allocation</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Daily Attendance & Overtime Logging</h4>
            <p>Open <b>Human Resource ➔ Attendance</b>. Mark daily attendance (Present, Absent, Half-Day, Paid Leave). Record verified overtime hours approved by shopfloor supervisors.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('attendance');">🚀 Open Daily Attendance</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Staff Salary Advances & Loan EMIs</h4>
            <p>Open <b>Human Resource ➔ Staff Loan</b> (<code>frmStaffLoan</code>). Disburse festival salary advances or personal loans and specify monthly deduction installments.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('staffLoan');">🚀 Open Staff Loan</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 5</div>
          <div class="guide-step-content">
            <h4>Monthly Salary Computation & Payslips</h4>
            <p>Open <b>Human Resource ➔ Salary</b>. Select month and year. The system automatically computes earned days, overtime pay, loan EMI deductions, PF/ESI statutory contributions, and net payable salary.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('salary');">🚀 Open Monthly Salary</button>
          </div>
        </div>
      `
    },
    {
      id: "gst",
      title: "13. Statutory GST, Audit Trail & Month-End",
      subtitle: "GSTR-1, GSTR-3B ITC Summary, Stock Position & MCA Audit Trail",
      role: "accounts",
      badge: "Tax & Compliance",
      readTime: "5 min",
      content: `
        <p>Ensure seamless month-end closing, GST tax filings, and full MCA compliance without spreadsheet reconciliation headaches.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Report 1</div>
          <div class="guide-step-content">
            <h4>GSTR-1 Outward Supplies Summary</h4>
            <p>Open <b>Utilities ➔ GST Tax Returns (GSTR-1 & GSTR-3B)</b>. View B2B taxable turnover, exports, and credit notes segregated by 9% CGST, 9% SGST, and 18% IGST. Export data directly for GST portal filing.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('gst');">🚀 Open GST Tax Returns</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Report 2</div>
          <div class="guide-step-content">
            <h4>GSTR-3B ITC (Input Tax Credit) Summary</h4>
            <p>Under the GSTR-3B tab, review eligible ITC on domestic raw metal purchases and subcontracting job work. Compare ERP inward tax credits with your government GSTR-2B statement to claim full tax benefits.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('gst');">🚀 View GSTR-3B ITC Summary</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Report 3</div>
          <div class="guide-step-content">
            <h4>Stock Position & Inventory Valuation</h4>
            <p>Open <b>Inventory ➔ Stock Position</b>. Review real-time physical stock counts across all stores, valuation at moving average price, and minimum re-order point alerts.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('stock');">🚀 Open Stock Position</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Report 4</div>
          <div class="guide-step-content">
            <h4>Security & Audit Trail (MCA Statutory Compliance)</h4>
            <p>Open <b>Utilities ➔ Security & Audit Trail</b>. In compliance with MCA statutory rules, Tamba ERP maintains an immutable audit log of every document creation, edit, deletion, and financial adjustment with timestamps and user IDs.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('audit');">🚀 Open Security Audit Trail</button>
          </div>
        </div>
      `
    },
    {
      id: "utilities",
      title: "14. Utilities & Factory Automation",
      subtitle: "WhatsApp Dispatch, Barcode Label Center & Metric Unit Conversions",
      role: "admin",
      badge: "Automation",
      readTime: "4 min",
      content: `
        <p>Tamba ERP includes native automation hubs to eliminate manual paperwork, speed up communication with clients, and standardize label printing.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>WhatsApp & Email Automated Dispatch Hub</h4>
            <p>Open <b>Utilities ➔ WhatsApp & Email Dispatch Hub</b> (<code>frmNotificationHub</code>). Send formal PDF Tax Invoices, Delivery Challans, and certified chemical MTCs directly to customer WhatsApp numbers and procurement email inboxes with 1 click!</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('notificationHub');">🚀 Open WhatsApp / Email Hub</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Barcode & QR Label Center</h4>
            <p>Open <b>Utilities ➔ Barcode & QR Label Center</b> (<code>frmBarcodeHub</code>). Generate standard thermal adhesive labels (100x50mm, 50x25mm) for raw metal storage racks, WIP tote bins, finished goods master cartons, and heat trace pallets.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('barcodeHub');">🚀 Open Barcode & QR Center</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Industrial Unit Conversion Utility</h4>
            <p>Open <b>Utilities ➔ Conversion</b> (<code>frmConv</code>). Instant conversion between metric and imperial factory measurements (Inches to Millimeters, Kilograms to Pounds, Rod Length to Part Piece Counts).</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('convert');">🚀 Open Unit Converter</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Active System Users & Session Status</h4>
            <p>Open <b>Master ➔ Admin ➔ User Status</b> (<code>frmViewImpSys</code>). Factory directors can view real-time active operator sessions, open screens, and login history across shopfloor terminals.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('userStatus');">🚀 Open User Status</button>
          </div>
        </div>
      `
    },
    {
      id: "faqs",
      title: "15. Beginner FAQs & Troubleshooting",
      subtitle: "Solutions to the Top 12 Most Common Factory Scenarios",
      role: "all",
      badge: "Help & FAQ",
      readTime: "6 min",
      content: `
        <div class="guide-faq-item">
          <div class="guide-faq-q">❓ Q1: I created a Purchase GRN, but my Raw Material stock balance didn't increase. Why?</div>
          <div class="guide-faq-a">A GRN only acknowledges that a delivery truck arrived. Stock is kept in quarantine until inspected! You must open <b>Purchase ➔ Material Inspection & Acceptance (SCN)</b> and approve the quantity. Only the SCN moves metal into your active warehouse inventory.</div>
        </div>

        <div class="guide-faq-item">
          <div class="guide-faq-q">❓ Q2: The system won't let me edit or delete a Delivery Challan. What gives?</div>
          <div class="guide-faq-a">For financial safety, if a DC has already been converted into a Tax Invoice, or if payment has been collected, the ERP locks the DC from modification. You must first cancel or un-allocate the payment receipt before modifying the source document.</div>
        </div>

        <div class="guide-faq-item">
          <div class="guide-faq-q">❓ Q3: How do I know whether an invoice should be CGST+SGST or IGST?</div>
          <div class="guide-faq-a">You don't need to guess! Tamba ERP compares the first 2 digits of your factory GSTIN with the customer's GSTIN. If they match (e.g. both in Gujarat <code>24</code>), it charges CGST 9% + SGST 9%. If different (e.g. Gujarat to Maharashtra <code>27</code>), it auto-charges IGST 18%.</div>
        </div>

        <div class="guide-faq-item">
          <div class="guide-faq-q">❓ Q4: Can I run Sales and Labour job work under separate invoice sequences?</div>
          <div class="guide-faq-a">Yes! Open <b>Master ➔ My Company Details</b>. Under <i>Choose Inv. Type (for Auto Running No.)</i>, select <b>Sales & Labour - SEPARATE BOOKS</b>. This maintains distinct invoice series like <code>INV/2026/001</code> for goods and <code>LBR/2026/001</code> for job work.</div>
        </div>

        <div class="guide-faq-item">
          <div class="guide-faq-q">❓ Q5: How do I print thermal stickers for my thread gauges?</div>
          <div class="guide-faq-a">Open <b>Maintenance ➔ Thread Gauge Calibration</b>, select your gauge (e.g. M10 x 1.25 Plug), and click <b>Print Calibration Sticker (50x25mm)</b>. It renders a thermal-printer-ready label with the calibration date, next due date, status, and metrologist sign.</div>
        </div>

        <div class="guide-faq-item">
          <div class="guide-faq-q">❓ Q6: What should I do if an operator logs overlapping machine hours?</div>
          <div class="guide-faq-a">Tamba ERP has built-in interval collision detection. If Machine CNC-01 is already logged for 08:00 AM - 04:00 PM, logging a shift from 01:00 PM - 05:00 PM will trigger a collision notice. Always verify operator shift times before saving.</div>
        </div>

        <div class="guide-faq-item">
          <div class="guide-faq-q">❓ Q7: How do I handle metal scrap and rejected turned parts during production?</div>
          <div class="guide-faq-a">In the <b>Production Log</b>, record rejected pieces in the <i>Rejection</i> column. In <b>Internal Work Order (IWO)</b>, scrap brass turning shavings (turning swarf/borings) can be credited back into the Scrap Store using <b>IWO Return / Scrap Credit</b>, keeping metal recovery percentages accurate.</div>
        </div>

        <div class="guide-faq-item">
          <div class="guide-faq-q">❓ Q8: How do I adjust an advance payment received from a client against upcoming bills?</div>
          <div class="guide-faq-a">Open <b>Cash Flow ➔ Receipts</b> and create an Advance receipt voucher. Once the manufacturing tax invoice is raised, go to <b>Cash Flow ➔ Advance Adjustments</b>. Select the client, select the advance voucher, and allocate it against the open bill. The advance is deducted without creating duplicate bank entries.</div>
        </div>

        <div class="guide-faq-item">
          <div class="guide-faq-q">❓ Q9: How do I generate an E-Way Bill JSON for shipments exceeding ₹50,000?</div>
          <div class="guide-faq-a">Open <b>Sales / Labour ➔ Manufacturing ➔ Invoice</b>. Open or save the invoice, then click the button <b>Export E-Way Bill JSON</b>. The ERP validates the vehicle number, transporter ID, pin codes, and HSN codes, generating a standard NIC schema JSON file ready to upload to <code>ewaybillgst.gov.in</code>.</div>
        </div>

        <div class="guide-faq-item">
          <div class="guide-faq-q">❓ Q10: What happens if our factory loses internet connectivity temporarily?</div>
          <div class="guide-faq-a">Tamba ERP runs on enterprise cloud infrastructure with offline client session caching. Open forms and tabs keep your typed input safe. If you get disconnected, wait for connectivity to resume before clicking Save to ensure the database transaction commits cleanly.</div>
        </div>

        <div class="guide-faq-item">
          <div class="guide-faq-q">❓ Q11: How do I explode a Bill of Materials (BOM) to check raw metal shortages before quoting?</div>
          <div class="guide-faq-a">Open <b>Planning ➔ Material - Requirement Analysis</b> (<code>frmMatReqAnaly</code>). Select the target finished product and target batch quantity. The system automatically reads the BOM ratios defined in <code>frmStkRedDefine</code>, compares required metal against your active stock, and tells you the exact shortage in kg to purchase.</div>
        </div>

        <div class="guide-faq-item">
          <div class="guide-faq-q">❓ Q12: How do I issue carbide tooling from the Tool Crib and track insert wear?</div>
          <div class="guide-faq-a">Open <b>Inventory ➔ Tool Crib</b> (<code>frmToolCrib</code>). Select the machinist, machine number, and insert code (e.g. WNMG 080408). The crib keeper issues the insert. When worn out, logging the tool return records cutting hours and updates consumable expense ledgers.</div>
        </div>
      `
    }
  ];

  // Role filtering mapping — 100% Comprehensive Mapping across all 15 Chapters
  const ROLE_MAP = {
    all: () => true,
    store: (ch) => ["all", "store"].includes(ch.role) || ["intro", "procurement", "inventory", "jobwork", "utilities", "faqs"].includes(ch.id),
    prod: (ch) => ["all", "prod"].includes(ch.role) || ["intro", "planning", "production", "maintenance", "utilities", "faqs"].includes(ch.id),
    qc: (ch) => ["all", "qc"].includes(ch.role) || ["intro", "procurement", "production", "inspection", "maintenance", "faqs"].includes(ch.id),
    accounts: (ch) => ["all", "accounts"].includes(ch.role) || ["intro", "sales", "jobwork", "cashflow", "gst", "utilities", "faqs"].includes(ch.id),
    owner: (ch) => true
  };

  let activeChapterId = "intro";
  let activeRoleFilter = "all";
  let searchQuery = "";

  function initGuideUI() {
    const listContainer = document.getElementById("guide-chapters-list");
    const contentDisplay = document.getElementById("guide-content-display");
    const searchInput = document.getElementById("guide-search-input");
    const roleChips = document.querySelectorAll(".guide-chip");
    const closeBtn = document.getElementById("guide-btn-close");
    const printCheatBtn = document.getElementById("guide-btn-print-cheat");
    const mobileNavBtn = document.getElementById("guide-btn-mobile-nav");
    const sidebar = document.querySelector(".user-guide-sidebar");

    if (!listContainer || !contentDisplay) return;

    // Mobile drawer toggle
    if (mobileNavBtn && sidebar) {
      mobileNavBtn.addEventListener("click", function () {
        sidebar.classList.toggle("mobile-open");
      });
    }

    // Render Chapters List
    renderChapterList();

    // Render Initial Chapter
    renderActiveChapter();

    // Event Listeners
    if (searchInput) {
      searchInput.addEventListener("input", function (e) {
        searchQuery = (e.target.value || "").trim().toLowerCase();
        renderChapterList();
      });
    }

    roleChips.forEach(chip => {
      chip.addEventListener("click", function () {
        roleChips.forEach(c => c.classList.remove("active"));
        this.classList.add("active");
        activeRoleFilter = this.dataset.role || "all";
        renderChapterList();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", window.closeUserGuide);
    }

    if (printCheatBtn) {
      printCheatBtn.addEventListener("click", printDeskCheatSheet);
    }
  }

  function renderChapterList() {
    const listContainer = document.getElementById("guide-chapters-list");
    const sidebar = document.querySelector(".user-guide-sidebar");
    if (!listContainer) return;

    const filterFn = ROLE_MAP[activeRoleFilter] || (() => true);

    const filtered = GUIDE_CHAPTERS.filter(ch => {
      const matchesRole = filterFn(ch);
      if (!matchesRole) return false;
      if (!searchQuery) return true;
      const haystack = (ch.title + " " + ch.subtitle + " " + ch.badge + " " + ch.content).toLowerCase();
      return haystack.includes(searchQuery);
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 20px 10px; text-align: center; color: var(--text-muted); font-size: 12px;">
          No topics found for "<b>${escapeHtml(searchQuery)}</b>"<br>
          <button type="button" class="btn btn-sm" style="margin-top: 8px;" onclick="document.getElementById('guide-search-input').value=''; document.getElementById('guide-search-input').dispatchEvent(new Event('input'));">Clear Search</button>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map((ch) => {
      const isActive = ch.id === activeChapterId;
      return `
        <button type="button" class="guide-nav-item ${isActive ? "active" : ""}" data-id="${ch.id}">
          <div class="guide-nav-header">
            <span class="guide-nav-title">${ch.title}</span>
            <span class="guide-nav-badge">${ch.badge}</span>
          </div>
          <div class="guide-nav-sub">${ch.subtitle}</div>
        </button>
      `;
    }).join("");

    listContainer.querySelectorAll(".guide-nav-item").forEach(btn => {
      btn.addEventListener("click", function () {
        activeChapterId = this.dataset.id;
        if (sidebar) sidebar.classList.remove("mobile-open");
        renderChapterList();
        renderActiveChapter();
        const display = document.getElementById("guide-content-display");
        if (display) display.scrollTop = 0;
      });
    });
  }

  function renderActiveChapter() {
    const contentDisplay = document.getElementById("guide-content-display");
    if (!contentDisplay) return;

    const chapter = GUIDE_CHAPTERS.find(c => c.id === activeChapterId) || GUIDE_CHAPTERS[0];
    if (!chapter) return;

    contentDisplay.innerHTML = `
      <article class="guide-article">
        <header class="guide-article-header">
          <div class="guide-meta-bar">
            <span class="guide-badge-pill">${chapter.badge}</span>
            <span class="guide-read-time">⏱️ ${chapter.readTime} read</span>
          </div>
          <h2 class="guide-article-title">${chapter.title}</h2>
          <div class="guide-article-subtitle">${chapter.subtitle}</div>
        </header>

        <div class="guide-article-body">
          ${chapter.content}
        </div>

        <footer class="guide-article-footer">
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 20px; border-top: 1px solid var(--border-color); margin-top: 30px;">
            <button type="button" class="btn" id="guide-btn-prev">⬅️ Previous Chapter</button>
            <button type="button" class="btn btn-primary" id="guide-btn-next">Next Chapter ➡️</button>
          </div>
        </footer>
      </article>
    `;

    // Wire previous / next buttons
    const curIdx = GUIDE_CHAPTERS.findIndex(c => c.id === chapter.id);
    const prevBtn = document.getElementById("guide-btn-prev");
    const nextBtn = document.getElementById("guide-btn-next");

    if (prevBtn) {
      if (curIdx > 0) {
        prevBtn.onclick = () => {
          activeChapterId = GUIDE_CHAPTERS[curIdx - 1].id;
          renderChapterList();
          renderActiveChapter();
          contentDisplay.scrollTop = 0;
        };
      } else {
        prevBtn.disabled = true;
        prevBtn.style.opacity = "0.5";
      }
    }

    if (nextBtn) {
      if (curIdx < GUIDE_CHAPTERS.length - 1) {
        nextBtn.onclick = () => {
          activeChapterId = GUIDE_CHAPTERS[curIdx + 1].id;
          renderChapterList();
          renderActiveChapter();
          contentDisplay.scrollTop = 0;
        };
      } else {
        nextBtn.textContent = "Back to Start 🔄";
        nextBtn.onclick = () => {
          activeChapterId = GUIDE_CHAPTERS[0].id;
          renderChapterList();
          renderActiveChapter();
          contentDisplay.scrollTop = 0;
        };
      }
    }
  }

  // 1-Click Printable A4 Quick-Reference Cheat Sheet
  function printDeskCheatSheet() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to open the printable reference sheet.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Tamba ERP — Quick Reference SOP Desk Cheat Sheet</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          body { font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 9.5px; color: #192625; line-height: 1.35; padding: 0; margin: 0; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #1c625a; padding-bottom: 4px; margin-bottom: 6px; }
          .header h1 { margin: 0; font-size: 15px; color: #1c625a; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
          .header p { margin: 2px 0 0; font-size: 8.5px; color: #586b65; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
          .section-card { border: 1px solid #b4c4bc; border-radius: 4px; padding: 5px 7px; background: #fdfdfd; page-break-inside: avoid; }
          .section-title { font-size: 9.5px; font-weight: 700; color: #1c625a; border-bottom: 1px solid #d5dfd9; padding-bottom: 2px; margin-bottom: 3px; display: flex; justify-content: space-between; }
          .flow-line { background: #e1eee8; padding: 2px 5px; border-radius: 3px; font-weight: 600; color: #1c625a; font-size: 8.5px; margin-bottom: 3px; border-left: 3px solid #1c625a; font-family: "DM Mono", monospace; }
          ul { margin: 0; padding-left: 12px; }
          li { margin-bottom: 1.5px; }
          .badge { font-size: 7.5px; background: #1c625a; color: #fff; padding: 1px 3px; border-radius: 2px; font-family: "DM Mono", monospace; }
          .rule-box { background: #f4ecdd; border: 1px solid #d6bd91; padding: 3px 5px; border-radius: 3px; font-size: 8.5px; margin-top: 4px; color: #704315; }
          .footer { text-align: center; font-size: 7.5px; color: #71807d; margin-top: 6px; border-top: 1px solid #d5dfd9; padding-top: 3px; font-family: "DM Mono", monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Tamba Industrial Enterprise ERP — Standard Operating Cheat Sheet</h1>
          <p>Complete Reference SOP for Stores, Planning, CNC Shopfloor, Quality Lab, Maintenance & Accounts</p>
        </div>

        <div class="grid-2">
          <!-- 1. Raw Material Inward -->
          <div class="section-card">
            <div class="section-title"><span>1. RAW MATERIAL INWARD</span><span class="badge">STORES</span></div>
            <div class="flow-line">Purchase Order ➔ Gate GRN ➔ Inspection SCN ➔ Inward Bill</div>
            <ul>
              <li><b>PO:</b> Raise PO with alloy rate, weight & delivery date (<i>Purchase ➔ Purchase PO</i>).</li>
              <li><b>GRN:</b> Record truck arrival with vendor DC & scale weight (<i>Purchase ➔ GRN</i>).</li>
              <li><b>SCN:</b> Accept good metal into warehouse stock. <i>Stock only increases after SCN!</i></li>
              <li><b>Invoice:</b> Book vendor bill against approved SCN (<i>Purchase ➔ Invoice Inwards</i>).</li>
            </ul>
          </div>

          <!-- 2. Planning & BOM -->
          <div class="section-card">
            <div class="section-title"><span>2. PLANNING & ESTIMATION</span><span class="badge">PLANNING</span></div>
            <div class="flow-line">Assembly BOM ➔ Metal Shortages ➔ Plan Chart ➔ Cost Estimate</div>
            <ul>
              <li><b>Assembly Analysis:</b> Explode BOM to compute child component shortages.</li>
              <li><b>Material Analysis:</b> Compare gross metal needs against active warehouse stock.</li>
              <li><b>Machine Capacity:</b> Check spindle capacity & balance CNC production lines.</li>
              <li><b>Estimation:</b> Build quotes based on metal rate, cycle time & scrap recovery.</li>
            </ul>
          </div>

          <!-- 3. Production & Shopfloor -->
          <div class="section-card">
            <div class="section-title"><span>3. PRODUCTION & SHOPFLOOR</span><span class="badge">MANUFACTURING</span></div>
            <div class="flow-line">IWO Issue ➔ Production Log ➔ Scrap Return ➔ QR Traveler</div>
            <ul>
              <li><b>IWO Issue:</b> Issue raw brass rods to machine operator (<i>Production ➔ IWO Issue</i>).</li>
              <li><b>Shift Log:</b> Log machine, operator, good qty, rejection pieces & idle downtime.</li>
              <li><b>Scrap Return:</b> Credit brass turning swarf back into the Scrap Store.</li>
              <li><b>QR Route Card:</b> Print tote bin travelers & verify box packing piece counts.</li>
            </ul>
          </div>

          <!-- 4. Quality & Metrology -->
          <div class="section-card">
            <div class="section-title"><span>4. QUALITY & METROLOGY</span><span class="badge">QUALITY LAB</span></div>
            <div class="flow-line">Sampling Insp ➔ Spectro MTC 3.1 ➔ Gauge Register ➔ Trace</div>
            <ul>
              <li><b>Dimensional Sampling:</b> Run in-process random & 100% critical piece checks.</li>
              <li><b>Spectro Analysis:</b> Verify Cu, Zn, Pb, Fe against alloy standards (IS 319 / CW614N).</li>
              <li><b>EN 10204 3.1 MTC:</b> Print chemical test certificates with RoHS/REACH QR codes.</li>
              <li><b>Thread Gauges:</b> Record strike cycles, wear limits & print 50x25mm calibration labels.</li>
            </ul>
          </div>

          <!-- 5. Maintenance -->
          <div class="section-card">
            <div class="section-title"><span>5. PLANT & MAINTENANCE</span><span class="badge">MAINTENANCE</span></div>
            <div class="flow-line">Preventive Schedule ➔ Service Process ➔ Breakdown Logs</div>
            <ul>
              <li><b>Schedules:</b> Set recurring lubrication & spindle check intervals per machine.</li>
              <li><b>Breakdown:</b> Log unscheduled stoppage, root cause, downtime & spare parts used.</li>
              <li><b>Calibration:</b> Track verniers, micrometers & dial gauges for ISO audit compliance.</li>
            </ul>
          </div>

          <!-- 6. Outward Sales & Dispatch -->
          <div class="section-card">
            <div class="section-title"><span>6. SALES & DISPATCH</span><span class="badge">SALES</span></div>
            <div class="flow-line">Customer PO ➔ Delivery Challan (DC) ➔ Tax Invoice ➔ E-Way</div>
            <ul>
              <li><b>Customer PO:</b> Log order commitments & track remaining pending order balances.</li>
              <li><b>Delivery Challan:</b> Select finished store & items. <i>DC deducts warehouse stock!</i></li>
              <li><b>Tax Invoice:</b> Bill the DC. Auto-calculates CGST+SGST (Local) or IGST (Interstate).</li>
              <li><b>E-Way Bill:</b> For bills &gt; ₹50,000, click <i>Export NIC E-Way Bill JSON</i> for portal upload.</li>
            </ul>
          </div>

          <!-- 7. Job Work & Subcontract -->
          <div class="section-card">
            <div class="section-title"><span>7. JOB WORK & SUBCONTRACT</span><span class="badge">OUTSOURCING</span></div>
            <div class="flow-line">Labour DC In/Out (SAC 9988) | Subcon PO ➔ Annex II DC Out</div>
            <ul>
              <li><b>Customer Labour:</b> Receive customer metal on DC In; bill service under SAC 9988.</li>
              <li><b>Outward Subcontract:</b> Send parts for plating/heat treatment with Annexure II DC.</li>
              <li><b>Subcon GRN/SCN:</b> Accept returned plated parts & book the subcontract bill.</li>
            </ul>
          </div>

          <!-- 8. Cash Flow & Accounts -->
          <div class="section-card">
            <div class="section-title"><span>8. CASH FLOW & ACCOUNTS</span><span class="badge">FINANCE</span></div>
            <div class="flow-line">Payments (Vendors) | Receipts (Customers) | Advances | GST</div>
            <ul>
              <li><b>Vendor Payments:</b> Allocate payments against specific purchase bills to close dues.</li>
              <li><b>Customer Receipts:</b> Record Cheque/NEFT receipts to lower accounts receivable.</li>
              <li><b>Advance Adjust:</b> Settle advances against pending bills safely with FIFO reversion.</li>
              <li><b>GST Returns:</b> Generate GSTR-1, GSTR-3B ITC summaries & review MCA Audit Trail.</li>
            </ul>
          </div>
        </div>

        <div class="rule-box">
          <b>⚡ GOLDEN RULES:</b> Delivery Challan moves goods physically; Tax Invoice demands payment. • Always enter 15-digit GSTIN (first 2 digits determine local vs interstate tax). • Once a receipt is booked against an invoice, the source DC is locked against accidental modification.
        </div>

        <div class="footer">
          Tamba ERP Enterprise Suite • Confidential Factory Reference Document • Press Ctrl+P to Print (Select 'Fit to printable area')
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Public Interface
  window.openUserGuide = function (chapterId) {
    const guideWin = document.getElementById("user-guide-window");
    if (!guideWin) return;

    if (chapterId && GUIDE_CHAPTERS.some(c => c.id === chapterId)) {
      activeChapterId = chapterId;
    }

    // Hide any other active windows
    if (window.closeCompany) window.closeCompany();
    if (window.closeUsers) window.closeUsers();
    if (window.closeUserRights) window.closeUserRights();
    if (window.closeItem) window.closeItem();
    if (window.closeMachine) window.closeMachine();
    if (window.toggleDashboard) window.toggleDashboard(false);

    guideWin.hidden = false;
    renderChapterList();
    renderActiveChapter();

    const display = document.getElementById("guide-content-display");
    if (display) display.scrollTop = 0;
  };

  window.closeUserGuide = function () {
    const guideWin = document.getElementById("user-guide-window");
    if (guideWin) guideWin.hidden = true;
  };

  // Initialize on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGuideUI);
  } else {
    initGuideUI();
  }

})();
