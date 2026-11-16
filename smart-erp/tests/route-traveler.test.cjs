const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appJsPath = path.resolve(__dirname, "../public/app.js");
const indexHtmlPath = path.resolve(__dirname, "../public/index.html");
const travelerEnginePath = path.resolve(__dirname, "../traveler-engine.js");
const barcodeEnginePath = path.resolve(__dirname, "../barcode-engine.js");
const travelerJsPath = path.resolve(__dirname, "../public/traveler.js");

test("Pillar 3: Navigation & Menu Integration for Route Traveler", () => {
  const code = fs.readFileSync(appJsPath, "utf8");

  const dummyEl = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0 }),
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false }
  };
  const sandbox = {
    document: {
      querySelector: () => dummyEl,
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      createElement: () => dummyEl,
      title: ""
    },
    window: {},
    fetch: () => Promise.resolve({ json: () => Promise.resolve({}) }),
    console: console
  };
  vm.createContext(sandbox);

  const scriptContent = code + "\n;globalThis.__TEST_MENUS = MENUS; globalThis.__TEST_RIGHTS = FORM_RIGHTS;";
  vm.runInContext(scriptContent, sandbox);

  const MENUS = sandbox.__TEST_MENUS;
  const FORM_RIGHTS = sandbox.__TEST_RIGHTS;
  assert.ok(MENUS, "MENUS must be defined");
  assert.ok(FORM_RIGHTS, "FORM_RIGHTS must be defined");

  // Production menu should include Digital Route Card & QR Traveler
  const travelerMenu = (MENUS.production || []).find((item) => item.form === "frmRouteTraveler");
  assert.ok(travelerMenu, "Production menu must contain frmRouteTraveler");
  assert.equal(travelerMenu.label, "Digital Route Card & QR Traveler");

  // Key mapping check
  assert.equal(FORM_RIGHTS.frmRouteTraveler, "mnuRouteTraveler", "frmRouteTraveler must map to mnuRouteTraveler");
});

test("Pillar 3: HTML Structure for Work Order Route Card, Traceability & Traveler Hub", () => {
  const html = fs.readFileSync(indexHtmlPath, "utf8");

  // 1. Work Order Issue screen must have Route Card button
  assert.ok(
    html.includes('id="iwo-route-card"'),
    "Work Order Issue screen (#iwo) must have #iwo-route-card button"
  );

  // 2. Traceability Window must have View Route Traveler button
  assert.ok(
    html.includes('id="trace-btn-traveler"'),
    "Traceability window must have #trace-btn-traveler button"
  );

  // 3. Traveler Hub window must be present with required sub-elements
  assert.ok(html.includes('id="traveler-hub"'), "HTML must contain #traveler-hub window");
  assert.ok(html.includes('id="traveler-search-input"'), "Traveler hub must have barcode/gun search input");
  assert.ok(html.includes('id="traveler-btn-search"'), "Traveler hub must have search button");
  assert.ok(html.includes('id="traveler-list-container"'), "Traveler hub must have master list container");
  assert.ok(html.includes('id="traveler-detail-container"'), "Traveler hub must have detail container");
  assert.ok(html.includes('id="traveler-btn-camera-scan"'), "Traveler hub must have camera QR scanner button");
  assert.ok(html.includes('id="traveler-btn-new"'), "Traveler hub must have new traveler button");

  // 4. Client script inclusion
  assert.ok(
    html.includes('src="/traveler.js'),
    "HTML must include traveler.js script tag"
  );
});

test("Pillar 3: Barcode Engine - ISO/IEC Code 128 & 2D QR Code Generation", async () => {
  const { generateCode128Svg, generateQrCodeSvg } = require(barcodeEnginePath);

  // 1. 1D Code 128 Barcode for Traveler
  const travelerNo = "TRV-2627-0042";
  const barcodeSvg = generateCode128Svg(travelerNo, { height: 40, moduleWidth: 1.5 });
  assert.ok(barcodeSvg, "Code 128 SVG must not be empty");
  assert.ok(barcodeSvg.includes("<svg"), "Barcode must be an SVG element");
  assert.ok(barcodeSvg.includes(travelerNo), "Barcode must encode human-readable traveler number");
  assert.ok(barcodeSvg.includes("<rect"), "Barcode must contain black and white bars (rects)");

  // 2. High-Density 2D QR Code for Digital Traveler Passport
  const qrPayload = JSON.stringify({
    travelerNo,
    woNo: "1 /26-27",
    heatNo: "HT-BRASS-704",
    batchNo: "BT-2026-081",
    part: "B1",
    qty: 500
  });
  const qrSvg = await generateQrCodeSvg(qrPayload, { width: 120 });
  assert.ok(qrSvg, "QR SVG must not be empty");
  assert.ok(qrSvg.includes("<svg"), "QR must be an SVG element");
  assert.ok(qrSvg.includes("<path") || qrSvg.includes("<rect"), "QR must contain matrix modules");
});

test("Pillar 3: Route Card Traveler Print Sheet Generation (A4/A5)", async () => {
  const { renderTravelerPrintHtml } = require(travelerEnginePath);

  const sampleTraveler = {
    traveler_id: 42,
    traveler_no: "TRV-2627-0042",
    dc_no: "1 /26-27",
    heat_no: "HT-BRASS-704",
    batch_no: "BT-2026-081",
    part_code: "B1-VALVE-BODY",
    part_name: "Precision Brass Ball Valve Body",
    drawing_rev: "REV-03",
    planned_qty: 500,
    completed_qty: 480,
    rejected_qty: 20,
    current_stage_name: "Stage 3: Secondary Milling & Boring",
    status: "IN_PROGRESS",
    created_at: new Date("2026-11-16"),
    stages: [
      {
        seq_no: 1,
        stage_name: "Raw Material Cut-Off & Verification",
        machine_name: "Cut-Off Band Saw #1",
        operator_name: "Store In-Charge",
        qty_in: 500,
        qty_ok: 500,
        qty_scrap: 0,
        stage_status: "PASSED",
        completed_at: new Date("2026-11-16"),
        qc_signoff_by: "QA Store",
        qc_notes: "IS 319 Gr. 1 Bar Stock Verified"
      },
      {
        seq_no: 2,
        stage_name: "Primary CNC Turning & Facing",
        machine_name: "CNC-LATHE-01 (HAAS)",
        operator_name: "Ramesh K",
        qty_in: 500,
        qty_ok: 485,
        qty_scrap: 15,
        stage_status: "PASSED",
        completed_at: new Date("2026-11-16"),
        qc_signoff_by: "QA Floor",
        qc_notes: "Diameter tolerance +/-0.02mm passed"
      },
      {
        seq_no: 3,
        stage_name: "Secondary Milling & Threading",
        machine_name: "VMC-02",
        operator_name: "Anil P",
        qty_in: 485,
        qty_ok: 0,
        qty_scrap: 0,
        stage_status: "RUNNING"
      }
    ]
  };

  const sampleCompany = {
    print_head: "BHARANI BRASS INDUSTRIES",
    print_short_addr: "Plot 104, GIDC Industrial Estate, Jamnagar, Gujarat",
    gstin: "24AABCB9999M1Z5"
  };

  const html = await renderTravelerPrintHtml({
    traveler: sampleTraveler,
    companyInfo: sampleCompany,
    origin: "https://sandbox.tambahq.in"
  });

  assert.ok(html, "Printed HTML must not be empty");
  assert.ok(html.includes("BHARANI BRASS INDUSTRIES"), "Must contain company title");
  assert.ok(html.includes("24AABCB9999M1Z5"), "Must contain GSTIN");
  assert.ok(html.includes("TRV-2627-0042"), "Must contain Traveler Number");
  assert.ok(html.includes("HT-BRASS-704"), "Must contain Melt / Heat Number");
  assert.ok(html.includes("BT-2026-081"), "Must contain Batch Number");
  assert.ok(html.includes("B1-VALVE-BODY"), "Must contain Part Code");
  assert.ok(html.includes("500 NOS"), "Must contain Planned Quantity");
  assert.ok(html.includes("Raw Material Cut-Off &amp; Verification") || html.includes("Raw Material Cut-Off & Verification"), "Must contain Stage 1");
  assert.ok(html.includes("Primary CNC Turning &amp; Facing") || html.includes("Primary CNC Turning & Facing"), "Must contain Stage 2");
  assert.ok(html.includes("Secondary Milling &amp; Threading") || html.includes("Secondary Milling & Threading"), "Must contain Stage 3");
  assert.ok(html.includes("EN 10204 Type 3.1 Traceability Guaranteed"), "Must contain EN 10204 3.1 compliance stamp");
  assert.ok(html.includes("<svg"), "Must contain embedded SVG Barcode / QR Code");
});

test("Pillar 3: Client Script Syntax and Exports", () => {
  const travelerJs = fs.readFileSync(travelerJsPath, "utf8");
  assert.ok(travelerJs.includes("window.openTravelerHub"), "traveler.js must export window.openTravelerHub");
  assert.ok(travelerJs.includes("window.closeTravelerHub"), "traveler.js must export window.closeTravelerHub");
  assert.ok(travelerJs.includes("window.openTravelerByNo"), "traveler.js must export window.openTravelerByNo");
  assert.ok(travelerJs.includes("/api/traveler/stage/update"), "traveler.js must call stage update endpoint");
});
