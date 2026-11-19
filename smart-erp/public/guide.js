/**
 * Tamba ERP — In-App User Guide & Interactive Knowledge Base
 * Built for complete beginners & industrial enterprise staff.
 * Designed in accordance with the Tamba ERP UI/UX Design System.
 */

(function () {
  "use strict";

  // Universal Safe Screen Jump Launcher
  window.guideJumpToScreen = function (screenName, ...args) {
    // 1. Close or minimize User Guide window
    if (typeof window.closeUserGuide === "function") {
      window.closeUserGuide();
    }

    // 2. Minimize / hide Live Dashboard if open
    if (typeof window.toggleDashboard === "function") {
      window.toggleDashboard(false);
    }

    // 3. Screen mapping dictionary
    const SCREEN_MAP = {
      // Masters
      company: () => window.openCompany && window.openCompany(),
      store: () => window.openStore && window.openStore(),
      item: () => window.openItem && window.openItem(),
      machine: () => window.openMachine && window.openMachine(),
      recipe: () => window.openRecipeHub && window.openRecipeHub(),
      customer: () => window.openCustomer && window.openCustomer(),
      vendor: () => window.openVendor && window.openVendor(),
      supplier: () => window.openSupplier && window.openSupplier(),

      // Procurement / Inward
      po: () => window.openPo && window.openPo(),
      grn: () => window.openGrn && window.openGrn(),
      scn: () => window.openScnPurch && window.openScnPurch(),
      invPurch: () => window.openInvPurch && window.openInvPurch(),

      // Production / Shopfloor
      iwo: () => window.openIwo && window.openIwo(),
      prodn: () => window.openProdn && window.openProdn(),
      traveler: () => window.openTravelerHub && window.openTravelerHub(),
      packing: () => window.openPackingHub && window.openPackingHub(),

      // Quality & Metrology
      spectro: () => window.openSpectroHub && window.openSpectroHub(),
      gauge: () => window.openGaugeHub && window.openGaugeHub(),
      traceability: () => window.openTraceability && window.openTraceability(),

      // Sales & Outward
      dc: () => window.openDC && window.openDC(),
      invoice: () => window.openInvoiceMfg && window.openInvoiceMfg(),
      labourDcIn: () => window.openLabourDCIn && window.openLabourDCIn(),
      labourDcOut: () => window.openLabourDCOut && window.openLabourDCOut(),
      labourInvoice: () => window.openLabourInvoice && window.openLabourInvoice(),

      // Subcontract
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
      attendance: () => window.openAttendance && window.openAttendance(),
      salary: () => window.openSalary && window.openSalary(),

      // Reports & Statutory
      gst: () => window.openGSTReports && window.openGSTReports(),
      audit: () => window.openAuditTrail && window.openAuditTrail(),
      stock: () => window.openStockPosition ? window.openStockPosition() : (window.openStock && window.openStock())
    };

    if (SCREEN_MAP[screenName]) {
      SCREEN_MAP[screenName](...args);
    } else if (typeof window[screenName] === "function") {
      window[screenName](...args);
    } else {
      console.warn("[Guide] Unknown screen opener:", screenName);
    }
  };

  // Guide Knowledge Base Database
  const GUIDE_CHAPTERS = [
    {
      id: "intro",
      title: "1. Welcome & ERP 101",
      subtitle: "The 30,000-ft View for Complete Beginners",
      role: "all",
      badge: "Getting Started",
      readTime: "4 min",
      content: `
        <div class="guide-intro-hero">
          <h3>Welcome to Tamba ERP! 👋</h3>
          <p class="guide-lead">
            If you've never used an ERP (Enterprise Resource Planning) system before, don't worry! This guide is written in plain, human English. Think of Tamba ERP as your factory's <b>central nervous system</b> — connecting metal raw materials, CNC machines, operators, quality inspectors, sales dispatch, and the bank ledger into one seamless workflow.
          </p>
        </div>

        <div class="guide-diagram-box">
          <div class="guide-diagram-title">The Master Factory Highway in Tamba ERP:</div>
          <div class="guide-flow-steps">
            <span class="flow-pill">01. Master Setup</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">02. Buy Metal (Inward)</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">03. Machine Parts (Production)</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">04. Test & Inspect (Quality)</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">05. Ship to Client (Outward)</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">06. Collect Payment (Accounts)</span>
          </div>
        </div>

        <h4>4 Golden Rules for Beginners</h4>
        <div class="guide-cards-grid">
          <div class="guide-card">
            <div class="guide-card-icon">01</div>
            <div class="guide-card-title">Delivery Challan (DC) ≠ Invoice</div>
            <p>A <b>DC</b> is a transport document that physically moves items between locations (or out of your warehouse). An <b>Invoice</b> is the financial bill that demands money and reports to GST.</p>
          </div>
          <div class="guide-card">
            <div class="guide-card-icon">02</div>
            <div class="guide-card-title">GRN vs. SCN (Quarantine)</div>
            <p>When a truck unloads, you make a <b>GRN</b> (Goods Received Note). But stock is NOT usable yet! It sits in quarantine until Quality approves it with an <b>SCN</b> (Store Credit Note). Only SCN adds to active inventory.</p>
          </div>
          <div class="guide-card">
            <div class="guide-card-icon">03</div>
            <div class="guide-card-title">Everything Starts with an Item Code</div>
            <p>Never type a freeform name for parts. Every metal rod, turned pin, screw, or packing carton must have an Item Code created once in the Item Master.</p>
          </div>
          <div class="guide-card">
            <div class="guide-card-icon">04</div>
            <div class="guide-card-title">Locking & Cashflow Protection</div>
            <p>If a customer pays even ₹1 against a bill, or a batch has been consumed in production, the ERP locks the original document from accidental changes to protect accounting integrity.</p>
          </div>
        </div>

        <h4>Day 1 Role Quickstart Checklists</h4>
        <p>Pick your job role below to see your essential 5-step daily operating checklist:</p>

        <div class="guide-cards-grid">
          <div class="guide-card">
            <div class="guide-card-icon">📦</div>
            <div class="guide-card-title">Storekeeper & Inward Logistics</div>
            <ol style="margin: 0 0 10px; padding-left: 18px; font-size: 11.5px; line-height: 1.55;">
              <li>Log truck arrivals on <b>Purchase GRN</b>.</li>
              <li>Wait for QC inspection approval.</li>
              <li>Post approved quantity to stores via <b>SCN</b>.</li>
              <li>Issue raw material to machines via <b>IWO Issue</b>.</li>
              <li>Monitor store balances in <b>Stock Position</b>.</li>
            </ol>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('grn');">🚀 Open GRN Screen</button>
          </div>

          <div class="guide-card">
            <div class="guide-card-icon">⚙️</div>
            <div class="guide-card-title">CNC Machinist & Supervisor</div>
            <ol style="margin: 0 0 10px; padding-left: 18px; font-size: 11.5px; line-height: 1.55;">
              <li>Review cutting parameters in <b>Tooling Recipes</b>.</li>
              <li>Accept issued metal rods under <b>IWO Issue</b>.</li>
              <li>Log output & downtime in <b>Production Log</b>.</li>
              <li>Print & scan tote bin <b>QR Route Travelers</b>.</li>
              <li>Weigh & verify carton counts in <b>Box Packing</b>.</li>
            </ol>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('prodn');">🚀 Open Production Log</button>
          </div>

          <div class="guide-card">
            <div class="guide-card-icon">🔬</div>
            <div class="guide-card-title">Quality & Metrology Inspector</div>
            <ol style="margin: 0 0 10px; padding-left: 18px; font-size: 11.5px; line-height: 1.55;">
              <li>Perform inward inspection on <b>Material SCN</b>.</li>
              <li>Run optical spectrometer chemical tests.</li>
              <li>Generate certified <b>EN 10204 3.1 MTCs</b> with QR.</li>
              <li>Calibrate Go/No-Go plug gauges in <b>Gauge Register</b>.</li>
              <li>Verify backward/forward <b>360° Traceability</b>.</li>
            </ol>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('spectro');">🚀 Open Spectro Hub</button>
          </div>

          <div class="guide-card">
            <div class="guide-card-icon">💼</div>
            <div class="guide-card-title">Accounts & Finance Specialist</div>
            <ol style="margin: 0 0 10px; padding-left: 18px; font-size: 11.5px; line-height: 1.55;">
              <li>Match vendor bills to SCNs in <b>Inward Invoice</b>.</li>
              <li>Generate <b>Sales Tax Invoices</b> from DCs.</li>
              <li>Record vendor payments & customer receipts.</li>
              <li>Perform safe FIFO <b>Advance Adjustments</b>.</li>
              <li>Check GSTR-1 & GSTR-3B monthly tax summaries.</li>
            </ol>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('cashflow');">🚀 Open Cash Flow Hub</button>
          </div>
        </div>

        <div class="guide-callout tip">
          <strong>💡 Pro-Tip for Daily Usage:</strong> You can switch between <b>🌙 Dark Theme</b> and <b>☀️ Light Theme</b> anytime using the button in the top bar. Use the <b>Live Dashboard</b> to check today's production output, pending dispatches, and bank balances at a glance.
        </div>
      `
    },
    {
      id: "master",
      title: "2. Day 1 Master Setup",
      subtitle: "Configuring Your Company, Stores, Items & Machines",
      role: "owner",
      badge: "Prerequisites",
      readTime: "6 min",
      content: `
        <p class="guide-lead">Before logging your first purchase or manufacturing a single part, you must populate your foundation data (Master Data). Do this once, and the rest of the ERP will autofill smoothly.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Set Up Your Company Profile</h4>
            <p>Go to <b>Master ➔ My Company Details</b>. Enter your exact legal name, address, GSTIN, PAN, and choose your invoice numbering scheme (Separate Books for Sales & Labour, or Combined). Also set prefixes for Quotations (e.g. <code>QT/</code>) and Purchase Orders (e.g. <code>PO/</code>).</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('company');">🚀 Open Company Details</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Configure Your Stores (Warehouses)</h4>
            <p>Go to <b>Master ➔ Inventory ➔ Stores</b>. Create your physical locations:
              <ul>
                <li><b>Raw Material Store</b> (Check <i>Can Add</i> and <i>Can Issue</i>)</li>
                <li><b>Finished Goods Store</b> (Check <i>Can Add</i> and <i>Can Issue</i>)</li>
                <li><b>Scrap & Rejection Store</b> (Check <i>Can Add</i>)</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('store');">🚀 Open Store Master</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Create Categories & Item Master</h4>
            <p>Go to <b>Master ➔ Inventory ➔ Item</b>. Each product needs:
              <ul>
                <li><b>Item Code:</b> e.g. <code>HEX-BRASS-12MM</code> or <code>VALVE-PIN-REV-B</code>.</li>
                <li><b>HSN Code:</b> e.g. <code>7407</code> for copper/brass bars, <code>8481</code> for valve parts.</li>
                <li><b>GST Rate:</b> Usually 18%.</li>
                <li><b>UOM:</b> KGS for raw metal, NOS/PCS for finished components.</li>
                <li><b>Conversion Factor:</b> If you purchase rods in KGS but count finished output in PCS, set the weight-per-piece factor.</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('item');">🚀 Open Item Master</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Register Machines & Setup Tooling Recipes</h4>
            <p>Go to <b>Master ➔ General ➔ Machine</b> to enter machine IDs (e.g. <code>CNC-01</code>, <code>VMC-02</code>, <code>TRAUB-3</code>). Then use <b>Machine Setup & Tooling Recipe</b> to preset Jamnagar brass turning speeds, feeds, tool inserts, and coolant specifications for recurring jobs.</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('machine');">🚀 Open Machine Master</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('recipe');">⚙️ Open Tooling Recipes</button>
            </div>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 5</div>
          <div class="guide-step-content">
            <h4>Add Customers, Vendors & Subcontractors</h4>
            <p>
              • <b>Customer:</b> Clients who buy your finished products or send job work (<b>Master ➔ General ➔ Customer</b>).<br>
              • <b>Vendor:</b> Suppliers who sell you raw brass rods, cutting oils, cartons (<b>Master ➔ General ➔ Vendor</b>).<br>
              • <b>Supplier:</b> External plating, heat treatment, or job-work contractors (<b>Master ➔ General ➔ Supplier</b>).
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('customer');">🚀 Open Customer Master</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('vendor');">🚀 Open Vendor Master</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('supplier');">🚀 Open Supplier Master</button>
            </div>
          </div>
        </div>

        <div class="guide-callout warn">
          <strong>⚠️ Watch Out:</strong> Always enter the exact 15-character GSTIN for all customers and vendors. The first 2 digits represent their state code (e.g. <code>24</code> for Gujarat, <code>27</code> for Maharashtra). This determines whether the ERP automatically calculates CGST + SGST (intra-state) or IGST (inter-state).
        </div>
      `
    },
    {
      id: "inward",
      title: "3. Raw Material Inward Flow",
      subtitle: "Procurement, GRN, Inspection (SCN) & Inward Invoices",
      role: "store",
      badge: "Inward Supply",
      readTime: "5 min",
      content: `
        <p class="guide-lead">This is how raw materials (brass billets, hex rods, coils, tooling, packaging) enter your factory and become available stock in the inventory ledger.</p>

        <div class="guide-diagram-box">
          <div class="guide-diagram-title">The 4-Step Procurement Chain:</div>
          <div class="guide-flow-steps">
            <span class="flow-pill">01. Purchase PO</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">02. Gate GRN</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">03. QC Inspection (SCN)</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">04. Inward Invoice</span>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Raise a Purchase Order (PO)</h4>
            <p>Open <b>Purchase ➔ Purchase Order - Outgoing</b>. Select your vendor, payment terms, and items ordered. Specify rate, quantity, delivery date, and whether rates are inclusive or exclusive of GST. Print or email the PO to the vendor.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('po');">🚀 Open Purchase Order</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Receive the Truck with a GRN</h4>
            <p>When goods arrive at the factory gate, open <b>Purchase ➔ Goods Received Note</b>. Reference the vendor's DC number, vehicle number, and link it to your original PO. Enter the gross weight or received quantity.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('grn');">🚀 Open Goods Received Note (GRN)</button>
            <div class="guide-callout warn">
              <strong>Notice:</strong> At this stage, stock balance in the warehouse is still zero! The material is placed in a "Temporary Inspection Store" until verified.
            </div>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Inspect & Accept via SCN (Store Credit Note)</h4>
            <p>Quality / Stores opens <b>Purchase ➔ Material Inspection & Acceptance (SCN)</b>.
              <ul>
                <li>Inspect dimensions, weight, surface finish, and metallurgical heat number.</li>
                <li>Enter <b>Accepted Qty</b> and any <b>Rejected Qty</b>.</li>
                <li>Choose the destination warehouse (e.g. <code>Raw Material Store</code>).</li>
                <li>Click <b>Save</b>. <b>Now your inventory balance increases in the ledger!</b></li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('scn');">🚀 Open Material SCN</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Book the Vendor's Inward Invoice</h4>
            <p>When the vendor's tax invoice arrives, accounts opens <b>Purchase ➔ Invoice Inwards</b>. Select the vendor and tick the approved SCN. The ERP verifies taxable amount, CGST, SGST, IGST, and records the pending accounts payable liability in Cash Flow.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('invPurch');">🚀 Open Inward Invoice</button>
          </div>
        </div>
      `
    },
    {
      id: "production",
      title: "4. Production & Shopfloor",
      subtitle: "Internal Work Orders, Machine Logs, Route Cards & Packing",
      role: "prod",
      badge: "Shopfloor",
      readTime: "7 min",
      content: `
        <p class="guide-lead">Turn raw materials into finished parts with complete machine traceability, scrap tracking, operator efficiency, and digital QR route travelers.</p>

        <div class="guide-diagram-box">
          <div class="guide-diagram-title">Shopfloor Production Lifecycle:</div>
          <div class="guide-flow-steps">
            <span class="flow-pill">01. IWO Material Issue</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">02. Shift Production Log</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">03. QR Route Traveler</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">04. Box Packing & Weighing</span>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Issue Raw Material via Internal Work Order (IWO)</h4>
            <p>Open <b>Production ➔ Internal Work Order cum Material Issue</b>.
              <ul>
                <li>Select the raw material rod (e.g. <code>BRASS-ROD-16MM</code>) and quantity issued (e.g. 150 kg).</li>
                <li>Select the target item to produce (e.g. <code>PIN-HEX-M10</code>) and expected yield.</li>
                <li>Select the department / operator. Click <b>Save</b>. Raw material stock is deducted from the store and transferred to work-in-progress (WIP).</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('iwo');">🚀 Open IWO Issue</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Log Daily Production & Machine Efficiency</h4>
            <p>Open <b>Production ➔ Production Log</b>.
              <ul>
                <li>Select date, machine (e.g. <code>CNC-01</code>), operator, and shift timings (e.g. <code>08:00 AM to 04:30 PM</code>).</li>
                <li>Enter produced quantity, rejection count, and idle breakdown minutes.</li>
                <li>The ERP instantly computes operator efficiency %, target achievement, and machine utilization.</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('prodn');">🚀 Open Production Log</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Generate Digital Route Cards & QR Travelers</h4>
            <p>Open <b>Production ➔ Digital Route Card & QR Traveler</b>.
              <ul>
                <li>Pick the work order or part code.</li>
                <li>The system prints an A4/A5 traveler sheet with an ISO/IEC Code 128 barcode and 2D QR Code.</li>
                <li>This sheet travels with the tote bin physically across Turning, Deburring, Threading, Washing, and Inspection stages.</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('traveler');">🚀 Open Route Traveler Hub</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>Piece-Count Weighing & Box Packing</h4>
            <p>Open <b>Production ➔ Piece-Count Weighing & Box Packing</b>.
              <ul>
                <li>Place finished components on digital weighing scales.</li>
                <li>Enter sample piece weight (e.g. 18.4 grams) and gross crate weight; the ERP auto-computes accurate piece count!</li>
                <li>Print export box packing labels with heat number, box ID, gross weight, net weight, and customer part number.</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('packing');">🚀 Open Piece-Count Packing Hub</button>
          </div>
        </div>
      `
    },
    {
      id: "quality",
      title: "5. Quality & Metrology Lab",
      subtitle: "Spectro Chemical Analysis, MTC 3.1 & Thread Gauge Calibration",
      role: "qc",
      badge: "Quality Lab",
      readTime: "5 min",
      content: `
        <p class="guide-lead">Maintain zero-defect manufacturing compliance with European EN 10204 3.1 Material Test Certificates, RoHS / REACH compliance, and calibrated thread gauge wear tracking.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Module A</div>
          <div class="guide-step-content">
            <h4>Spectro Chemical Analysis & Mill Test Certificates (MTC 3.1)</h4>
            <p>Open <b>Inspection ➔ Spectro Chemical Analysis & MTC 3.1</b>.
              <ul>
                <li>Select your brass / metal alloy standard (e.g., <code>IS 319 Free Cutting Brass</code>, <code>CW614N / CZ121</code>, <code>C36000 Lead-Free Brass</code>).</li>
                <li>Enter the optical spectrometer reading for Cu, Zn, Pb, Fe, Sn, Ni, Al.</li>
                <li>The ERP auto-validates against standard min/max thresholds and calculates RoHS / REACH compliance status (including Lead Exemption 6(c) for copper alloys up to 4%).</li>
                <li>Click <b>Print EN 10204 3.1 Certificate</b> to produce an internationally accepted lab test report with verification QR code.</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('spectro');">🚀 Open Spectro Chemical Hub</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Module B</div>
          <div class="guide-step-content">
            <h4>Thread Gauge Calibration & Wear Life Register</h4>
            <p>Open <b>Maintenance ➔ Thread Gauge Calibration & Wear Register</b>.
              <ul>
                <li>Register Go & No-Go thread plug and ring gauges (e.g. <code>M12 x 1.5 - 6H</code>, <code>G 1/2" BSP</code>, <code>1/4"-18 NPT</code>).</li>
                <li>Track accumulated strike cycles, pitch diameter micrometer wear measurements, and calibration frequency (e.g. 90 days).</li>
                <li>Print <b>50x25mm direct thermal calibration stickers</b> to adhere onto gauge boxes showing Due Date and Metrologist signature.</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('gauge');">🚀 Open Gauge Register Hub</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Module C</div>
          <div class="guide-step-content">
            <h4>360° Heat Batch Traceability Dossier</h4>
            <p>Open <b>Inspection ➔ Traceability & Heat Dossier</b>. Enter any Inward Heat Number, Job Work batch, or Sales Invoice number. The system performs full backward and forward traversal, compiling chemical spectroscopy, raw material SCN, machining machine log, operator shift, and dispatch invoice into an audit-ready dossier.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('traceability');">🚀 Open 360° Traceability Hub</button>
          </div>
        </div>
      `
    },
    {
      id: "outward",
      title: "6. Sales, Dispatch & Invoicing",
      subtitle: "Manufacturing Sales, Labour Work, E-Way Bills & DC Outward",
      role: "all",
      badge: "Revenue Flow",
      readTime: "6 min",
      content: `
        <p class="guide-lead">Ship goods out to your customers, deduct warehouse finished inventory, generate tax invoices, and export government NIC E-Way Bill JSON payloads.</p>

        <div class="guide-diagram-box">
          <div class="guide-diagram-title">Manufacturing Sales vs. Labour Job Work:</div>
          <div class="guide-cards-grid" style="margin-top: 8px;">
            <div class="guide-card">
              <div class="guide-card-title">Manufacturing (You supply metal)</div>
              <p>Quotation ➔ Inward PO ➔ Delivery Challan (DC) ➔ Tax Invoice (HSN Goods)</p>
            </div>
            <div class="guide-card">
              <div class="guide-card-title">Labour Work (Customer supplies metal)</div>
              <p>DC Inward ➔ Machining ➔ DC Outward ➔ Labour Tax Invoice (SAC 9988 Service)</p>
            </div>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Creating an Outward Delivery Challan (DC)</h4>
            <p>Open <b>Sales / Labour ➔ Manufacturing ➔ DC</b>.
              <ul>
                <li>Select customer name, store (e.g. <code>Finished Goods Store</code>), and transport details.</li>
                <li>Add lines with item code and dispatch quantity.</li>
                <li><b>Stock Deduction:</b> The ERP checks warehouse stock. If available, saving the DC deducts the exact finished quantity from the store balance.</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('dc');">🚀 Open Sales Delivery Challan (DC)</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Generating the Tax Invoice</h4>
            <p>Open <b>Sales / Labour ➔ Manufacturing ➔ Invoice</b>.
              <ul>
                <li>Select the customer and select the Delivery Challan(s) to bill.</li>
                <li>The system automatically computes Taxable Value, CGST (9%), SGST (9%) or IGST (18%), Round Off, and Total Invoice Value.</li>
                <li>Print official GST Tax Invoices in 3 copies: <i>Original for Recipient, Duplicate for Transporter, Triplicate for Supplier</i>.</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('invoice');">🚀 Open Manufacturing Invoice</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Labour Job Work Inward & Outward</h4>
            <p>When customers supply their own raw metal for machining only:
              <ul>
                <li>Record received raw metal in <b>Sales / Labour ➔ Labour Work ➔ DC - Inwards</b>.</li>
                <li>After machining, dispatch finished turned parts via <b>Labour DC - Outwards</b>.</li>
                <li>Raise the service bill via <b>Labour Tax Invoice</b> under SAC Code <code>9988</code>.</li>
              </ul>
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('labourDcIn');">🚀 Open Labour DC In</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('labourDcOut');">🚀 Open Labour DC Out</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('labourInvoice');">🚀 Open Labour Invoice</button>
            </div>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 4</div>
          <div class="guide-step-content">
            <h4>E-Way Bill JSON Export</h4>
            <p>For consignments exceeding ₹50,000, click <b>Export E-Way Bill JSON</b> on the invoice screen. Upload this JSON directly to the government NIC portal (<code>ewaybillgst.gov.in</code>) without manual re-typing!</p>
          </div>
        </div>
      `
    },
    {
      id: "subcontract",
      title: "7. Subcontract Job Work",
      subtitle: "Outsourcing Plating, Heat Treatment & External Operations",
      role: "prod",
      badge: "Outsourcing",
      readTime: "5 min",
      content: `
        <p class="guide-lead">When parts leave your factory for external processing (like zinc/nickel plating, powder coating, annealing, or thread rolling) and return afterward, use the Subcontract module to maintain strict quantity and batch accountability.</p>

        <div class="guide-diagram-box">
          <div class="guide-diagram-title">Subcontract Flow:</div>
          <div class="guide-flow-steps">
            <span class="flow-pill">01. Work Order</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">02. SubCon DC Out (Annex II)</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">03. SubCon GRN In</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">04. SubCon SCN</span>
            <span class="guide-flow-arrow">➔</span>
            <span class="flow-pill">05. Service Bill</span>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Issue Subcontract DC Outward</h4>
            <p>Open <b>Sub Contract ➔ DC Outwards</b>. Enter the supplier (job worker), item, sent quantity, and click <b>Annexure II Details</b> to enter GST Job Work declaration and estimated process duration. This protects your goods during road transport under GST Rule 45.</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('subconPo');">🚀 Open Subcon PO</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('subconDcOut');">🚀 Open Subcon DC Out</button>
            </div>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Receive Treated Parts Back</h4>
            <p>When the plating vendor returns parts, open <b>Sub Contract ➔ Goods Received Note</b> to record received quantity, then open <b>Subcontract Material Inspection & Acceptance (SCN)</b> to record acceptable vs rejected quantities and return parts into your warehouse stock.</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('subconDcIn');">🚀 Open Subcon GRN</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('subconScn');">🚀 Open Subcon SCN</button>
              <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('subconInvoice');">🚀 Open Subcon Bill</button>
            </div>
          </div>
        </div>
      `
    },
    {
      id: "cash",
      title: "8. Cash Flow & Accounts",
      subtitle: "Payments, Customer Receipts, Advances & Bank Reconciliation",
      role: "accounts",
      badge: "Finance",
      readTime: "6 min",
      content: `
        <p class="guide-lead">Keep your finances crystal clean without double-entry headaches. Tamba ERP tracks bill-by-bill pending balances, advances, cheques, and cash transactions in real time.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Module 1</div>
          <div class="guide-step-content">
            <h4>Paying Vendors (Payments)</h4>
            <p>Open <b>Cash Flow ➔ Payments</b>.
              <ul>
                <li>Select the vendor and payment mode (Cheque, NEFT/Bank, or Cash).</li>
                <li>The system displays all open unpaid purchase bills with their pending balances.</li>
                <li>Enter the allocated payment against specific bills or use auto-allocation. The bill balance decreases instantly.</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('payment');">🚀 Open Vendor Payments</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Module 2</div>
          <div class="guide-step-content">
            <h4>Collecting Money from Customers (Receipts)</h4>
            <p>Open <b>Cash Flow ➔ Receipts</b>.
              <ul>
                <li>Select the customer and deposit bank account.</li>
                <li>Allocate received payments against one or multiple sales invoices.</li>
                <li>Print or save payment receipts. Outstanding customer receivables are updated on the Business Owner dashboard immediately.</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('receipt');">🚀 Open Customer Receipts</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Module 3</div>
          <div class="guide-step-content">
            <h4>Advance Adjustments (Safe Reversible FIFO)</h4>
            <p>Open <b>Cash Flow ➔ Advance Adjustments</b>. When a party provides an advance deposit before invoicing, record it as an Advance voucher. When bills are subsequently raised, use Advance Adjustments to settle the bill against the advance balance without affecting your live bank account.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('advadjust');">🚀 Open Advance Adjustments</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Module 4</div>
          <div class="guide-step-content">
            <h4>Live Cash Flow Hub Cockpit</h4>
            <p>Click <b>Cash Flow</b> in the left sidebar to open the dedicated liquidity cockpit. View real-time bank account balances, 30-day cash projections, and pending debtor/creditor ageing tables in one visual dashboard.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('cashflow');">🚀 Open Live Cash Flow Hub</button>
          </div>
        </div>
      `
    },
    {
      id: "hr",
      title: "9. Human Resources & Salary",
      subtitle: "Staff Master, Daily Attendance, Overtime & Monthly Payroll",
      role: "all",
      badge: "Staff & Payroll",
      readTime: "4 min",
      content: `
        <p class="guide-lead">Manage factory workforce payroll, daily presence, shift allocations, advances, and loan repayments with factory tenant isolation.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 1</div>
          <div class="guide-step-content">
            <h4>Employee Master & Shift Allocation</h4>
            <p>Go to <b>Master ➔ Human Resource ➔ Employee Details</b>. Enter employee name, department (CNC, Assembly, Stores, Office), basic salary, PF, ESI, and bank details. In <b>Shift Allocation</b>, assign General, Morning, or Night shift schedules.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('staff');">🚀 Open Staff Master</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 2</div>
          <div class="guide-step-content">
            <h4>Daily Attendance</h4>
            <p>Open <b>Human Resource ➔ Attendance</b>. Quickly mark Present, Absent, Half-Day, and Overtime hours for each department. The system tracks accumulated working days automatically.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('attendance');">🚀 Open Daily Attendance</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Step 3</div>
          <div class="guide-step-content">
            <h4>Monthly Salary Processing</h4>
            <p>Open <b>Human Resource ➔ Salary</b>. Select Year and Month. The ERP calculates gross pay, PF, ESI, Professional Tax (PT), loan installments, and net pay. Saving prints salary slips and updates staff balance ledgers.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('salary');">🚀 Open Monthly Salary</button>
          </div>
        </div>
      `
    },
    {
      id: "gst",
      title: "10. Statutory GST & Month-End",
      subtitle: "GSTR-1, GSTR-3B, GSTR-2B Recon & Security Audit Trail",
      role: "owner",
      badge: "Tax & Compliance",
      readTime: "5 min",
      content: `
        <p class="guide-lead">Comply with Indian Goods & Services Tax (GST) requirements without needing an external accountant to re-calculate your sales and purchases.</p>

        <div class="guide-step-block">
          <div class="guide-step-num">Report 1</div>
          <div class="guide-step-content">
            <h4>GSTR-1 Outward Supplies Summary</h4>
            <p>Open <b>Utilities ➔ GST Tax Returns</b>.
              <ul>
                <li>Automatically sums all Manufacturing Sales Invoices and Labour Work Invoices for any selected month or date range.</li>
                <li>Displays Taxable Amount, CGST, SGST, IGST, and customer GSTIN breakdowns for easy upload to the GST portal.</li>
              </ul>
            </p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('gst');">🚀 Open GST Tax Returns</button>
          </div>
        </div>

        <div class="guide-step-block">
          <div class="guide-step-num">Report 2</div>
          <div class="guide-step-content">
            <h4>GSTR-3B Input Tax Credit (ITC) Summary</h4>
            <p>Aggregates all approved inward raw material and service purchases, showing eligible Input Tax Credit (ITC) broken down by central, state, and integrated tax.</p>
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
            <h4>Security & Audit Trail (MCA Compliance)</h4>
            <p>Open <b>Utilities ➔ Security & Audit Trail</b>. In compliance with MCA (Ministry of Corporate Affairs) statutory requirements, Tamba ERP maintains an immutable audit log of every creation, edit, deletion, and financial adjustment with timestamps and user IDs.</p>
            <button type="button" class="guide-action-btn" onclick="window.guideJumpToScreen('audit');">🚀 Open Security Audit Trail</button>
          </div>
        </div>
      `
    },
    {
      id: "faqs",
      title: "Beginner FAQs & Troubleshooting",
      subtitle: "Solutions to the Top 10 Most Common Factory Scenarios",
      role: "all",
      badge: "Help & FAQ",
      readTime: "5 min",
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
      `
    }
  ];

  // Role filtering mapping
  const ROLE_MAP = {
    all: () => true,
    store: (ch) => ["all", "store"].includes(ch.role) || ["inward", "subcontract"].includes(ch.id),
    prod: (ch) => ["all", "prod"].includes(ch.role) || ["production", "subcontract"].includes(ch.id),
    qc: (ch) => ["all", "qc"].includes(ch.role) || ["quality", "inward"].includes(ch.id),
    accounts: (ch) => ["all", "accounts"].includes(ch.role) || ["cash", "gst", "outward"].includes(ch.id),
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
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 10px; color: #192625; line-height: 1.35; padding: 0; margin: 0; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #1c625a; padding-bottom: 6px; margin-bottom: 8px; }
          .header h1 { margin: 0; font-size: 16px; color: #1c625a; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
          .header p { margin: 2px 0 0; font-size: 9px; color: #586b65; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .section-card { border: 1px solid #b4c4bc; border-radius: 4px; padding: 6px 8px; background: #fdfdfd; page-break-inside: avoid; }
          .section-title { font-size: 10.5px; font-weight: 700; color: #1c625a; border-bottom: 1px solid #d5dfd9; padding-bottom: 3px; margin-bottom: 4px; display: flex; justify-content: space-between; }
          .flow-line { background: #e1eee8; padding: 3px 6px; border-radius: 3px; font-weight: 600; color: #1c625a; font-size: 9px; margin-bottom: 4px; border-left: 3px solid #1c625a; font-family: "DM Mono", monospace; }
          ul { margin: 0; padding-left: 14px; }
          li { margin-bottom: 2px; }
          .badge { font-size: 8px; background: #1c625a; color: #fff; padding: 1px 4px; border-radius: 2px; font-family: "DM Mono", monospace; }
          .rule-box { background: #f4ecdd; border: 1px solid #d6bd91; padding: 4px 6px; border-radius: 3px; font-size: 9px; margin-top: 4px; color: #704315; }
          .footer { text-align: center; font-size: 8px; color: #71807d; margin-top: 8px; border-top: 1px solid #d5dfd9; padding-top: 4px; font-family: "DM Mono", monospace; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Tamba Industrial Enterprise ERP — Standard Operating Cheat Sheet</h1>
          <p>Quick Reference Standard Operating Procedures (SOP) for Shopfloor, Stores, Quality & Accounts</p>
        </div>

        <div class="grid-2">
          <!-- Raw Material Inward -->
          <div class="section-card">
            <div class="section-title"><span>1. RAW MATERIAL INWARD</span><span class="badge">STORES</span></div>
            <div class="flow-line">Purchase Order ➔ Gate GRN ➔ Inspection SCN ➔ Inward Invoice</div>
            <ul>
              <li><b>PO:</b> Raise outgoing PO with rate, weight & delivery date (<i>Purchase ➔ Purchase PO</i>).</li>
              <li><b>GRN:</b> Record truck arrival with vendor DC & vehicle number (<i>Purchase ➔ GRN</i>).</li>
              <li><b>SCN:</b> Accept good quantity into warehouse stock. <i>Stock only increases after SCN!</i></li>
              <li><b>Invoice:</b> Book vendor bill against approved SCN (<i>Purchase ➔ Invoice Inwards</i>).</li>
            </ul>
          </div>

          <!-- Production & Shopfloor -->
          <div class="section-card">
            <div class="section-title"><span>2. PRODUCTION & SHOPFLOOR</span><span class="badge">MANUFACTURING</span></div>
            <div class="flow-line">IWO Issue ➔ Production Log ➔ QR Route Card ➔ Packing Slip</div>
            <ul>
              <li><b>IWO:</b> Issue raw brass bars to machine operator (<i>Production ➔ IWO Issue</i>).</li>
              <li><b>Shift Log:</b> Record machine, operator, produced qty, rejection & idle time.</li>
              <li><b>Route Traveler:</b> Print barcode/QR traveler traveling physically with the tote bin.</li>
              <li><b>Box Packing:</b> Digital piece-count weighing scale calculation & carton labels.</li>
            </ul>
          </div>

          <!-- Quality & Metrology -->
          <div class="section-card">
            <div class="section-title"><span>3. QUALITY & METROLOGY</span><span class="badge">QUALITY LAB</span></div>
            <div class="flow-line">Inward Inspection ➔ Spectro MTC 3.1 ➔ Thread Gauge Register</div>
            <ul>
              <li><b>Spectro Analysis:</b> Verify Cu, Zn, Pb, Fe against alloy standards (IS 319 / CW614N).</li>
              <li><b>EN 10204 3.1 MTC:</b> Print chemical certificate with RoHS/REACH compliance & QR.</li>
              <li><b>Thread Gauges:</b> Record strike cycles, Go/No-Go wear, and 50x25mm calibration labels.</li>
            </ul>
          </div>

          <!-- Outward & Dispatch -->
          <div class="section-card">
            <div class="section-title"><span>4. OUTWARD SALES & DISPATCH</span><span class="badge">SALES</span></div>
            <div class="flow-line">Inward PO ➔ Delivery Challan (DC) ➔ Tax Invoice ➔ E-Way Bill</div>
            <ul>
              <li><b>Delivery Challan:</b> Select finished store & items. <i>DC deducts warehouse stock!</i></li>
              <li><b>Tax Invoice:</b> Bill the DC. Auto-calculates CGST+SGST (Local) or IGST (Out of State).</li>
              <li><b>E-Way Bill:</b> For bills &gt; ₹50,000, click <i>Export NIC E-Way Bill JSON</i> for portal upload.</li>
            </ul>
          </div>

          <!-- Subcontract Job Work -->
          <div class="section-card">
            <div class="section-title"><span>5. SUBCONTRACT JOB WORK</span><span class="badge">OUTSOURCING</span></div>
            <div class="flow-line">Work Order Out ➔ DC Out (Annex II) ➔ GRN In ➔ SubCon SCN</div>
            <ul>
              <li>Send parts for plating or heat treatment with <b>Annexure II declaration</b>.</li>
              <li>Receive treated parts on <b>Subcontract GRN</b> and inspect on <b>Subcontract SCN</b>.</li>
            </ul>
          </div>

          <!-- Cash Flow & Accounts -->
          <div class="section-card">
            <div class="section-title"><span>6. CASH FLOW & ACCOUNTS</span><span class="badge">FINANCE</span></div>
            <div class="flow-line">Payments (Vendors) | Receipts (Customers) | Advance Adjustments</div>
            <ul>
              <li><b>Vendor Payments:</b> Allocate payments against specific purchase bills to close dues.</li>
              <li><b>Customer Receipts:</b> Record Cheque/NEFT receipts to lower accounts receivable.</li>
              <li><b>Advance Adjust:</b> Settle advances against pending bills safely with FIFO reversion.</li>
            </ul>
          </div>
        </div>

        <div class="rule-box">
          <b>⚡ GOLDEN RULES:</b> DC moves goods physically; Invoice demands payment. • Always enter 15-digit GSTIN (first 2 digits determine local vs interstate tax). • If a cash receipt is logged against an invoice, the source DC is locked against accidental modification.
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
