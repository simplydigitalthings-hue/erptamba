const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appJsPath = path.resolve(__dirname, "../public/app.js");
const indexHtmlPath = path.resolve(__dirname, "../public/index.html");
const spectroEnginePath = path.resolve(__dirname, "../spectro-engine.js");
const rollbackSqlPath = path.resolve(__dirname, "../rollback-spectro-mtc.sql");
const dbJsPath = path.resolve(__dirname, "../db.js");

test("Feature 3: Navigation & Menu Integration for Spectro MTC 3.1", () => {
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

  // Inspection menu should include Spectro Chemical Analysis & MTC 3.1
  const spectroMenu = (MENUS.inspection || []).find((item) => item.form === "frmSpectroMTC");
  assert.ok(spectroMenu, "Inspection menu must contain frmSpectroMTC");
  assert.equal(spectroMenu.label, "Spectro Chemical Analysis & MTC 3.1");

  // Key mapping check
  assert.equal(FORM_RIGHTS.frmSpectroMTC, "mnuInsCommon", "frmSpectroMTC must map to mnuInsCommon");
});

test("Feature 3: HTML Structure for Spectro Hub, MTC Quick Buttons & Script Tag", () => {
  const html = fs.readFileSync(indexHtmlPath, "utf8");

  // 1. Spectro Hub modal window
  assert.ok(html.includes('id="spectro-hub"'), "HTML must contain #spectro-hub window");
  assert.ok(html.includes('id="spectro-search-input"'), "Spectro hub must have search input");
  assert.ok(html.includes('id="spectro-btn-search"'), "Spectro hub must have search button");
  assert.ok(html.includes('id="spectro-list-container"'), "Spectro hub must have list container");
  assert.ok(html.includes('id="spectro-detail-container"'), "Spectro hub must have detail container");
  assert.ok(html.includes('id="spectro-btn-new"'), "Spectro hub must have + New Analysis button");

  // 2. Traceability window cross-link
  assert.ok(
    html.includes('id="trace-btn-spectro"'),
    "Traceability window must have #trace-btn-spectro button"
  );

  // 3. DC & Invoice MTC buttons
  assert.ok(
    html.includes('id="dc-btn-mtc"'),
    "Delivery Challan screen must have #dc-btn-mtc button"
  );
  assert.ok(
    html.includes('id="invmfg-btn-mtc"'),
    "Manufacturing Invoice screen must have #invmfg-btn-mtc button"
  );

  // 4. Client script inclusion
  assert.ok(
    html.includes('src="/spectro.js'),
    "HTML must include spectro.js script tag"
  );
});

test("Feature 3: Alloy Presets Integrity & RoHS / REACH Exemption Standards", () => {
  const { ALLOY_PRESETS } = require(spectroEnginePath);

  assert.ok(ALLOY_PRESETS, "ALLOY_PRESETS must be exported");

  const requiredGrades = [
    "IS 319 Gr 1",
    "IS 319 Gr 2",
    "CW614N",
    "CW617N",
    "CW602N / DZR",
    "Lead-Free Brass",
    "Naval Brass"
  ];

  for (const grade of requiredGrades) {
    const preset = ALLOY_PRESETS[grade];
    assert.ok(preset, `Preset for ${grade} must exist`);
    assert.ok(preset.alloyName, `${grade} must define alloyName`);
    assert.ok(preset.standardCode, `${grade} must define standardCode`);
    assert.ok(preset.elements, `${grade} must define elements`);
    assert.ok(preset.elements.cu, `${grade} must define Copper (Cu) bounds`);
    assert.ok(preset.elements.pb, `${grade} must define Lead (Pb) bounds`);
    assert.ok(preset.elements.zn, `${grade} must define Zinc (Zn) balance bounds`);
    assert.ok(preset.rohsExemption, `${grade} must specify RoHS Exemption clause`);

    // Verify Copper min < max and default within bounds
    const cu = preset.elements.cu;
    assert.ok(cu.min <= cu.default && cu.default <= cu.max, `${grade} Cu default must be within min-max bounds`);

    // Verify Lead bounds
    const pb = preset.elements.pb;
    assert.ok(pb.min <= pb.default && pb.default <= pb.max, `${grade} Pb default must be within min-max bounds`);

    // Verify Lead-Free Brass has Pb < 0.10% (1000 ppm)
    if (grade === "Lead-Free Brass") {
      assert.ok(pb.max <= 0.10, "Lead-Free Brass must strictly enforce Pb <= 0.10%");
      assert.ok(preset.rohsExemption.includes("Lead-Free"), "Lead-Free brass must declare lead-free compliance");
    } else {
      // European RoHS Exemption 6(c) for copper alloys with up to 4.0% lead
      assert.ok(
        preset.rohsExemption.includes("Exemption 6(c)"),
        `${grade} must reference RoHS Exemption 6(c)`
      );
    }
  }
});

test("Feature 3: EN 10204 3.1 MTC Printout Rendering with 2D QR Code & Chemical Table", async () => {
  const { renderMtcPrintHtml } = require(spectroEnginePath);

  const mockAnalysis = {
    analysis_id: 101,
    heat_no: "HT-BRASS-704",
    batch_no: "BT-2026-081",
    alloy_grade: "CW617N",
    sample_date: "2026-11-17",
    lab_equipment: "Thermo ARL Optical Emission Spectrometer (Spark OES)",
    tested_by: "Dr. K. Patel (Chief Metallurgist)",
    cu_pct: 58.12,
    pb_pct: 1.95,
    fe_pct: 0.16,
    sn_pct: 0.11,
    ni_pct: 0.05,
    al_pct: 0.02,
    mn_pct: 0.01,
    as_pct: 0.00,
    si_pct: 0.00,
    total_imp_pct: 0.35,
    zn_pct: 39.58,
    tensile_strength_mpa: 462,
    elongation_pct: 19.5,
    hardness_val: "128 BHN",
    rohs_compliant: true,
    rohs_exemption: "Exemption 6(c) - Copper alloy containing up to 4.0% lead by weight",
    reach_compliant: true,
    qa_status: "PASSED",
    remarks: "Forging Grade CW617N extruded rods. Homogenized sample tested as per EN 12165."
  };

  const mockCompany = {
    print_head: "BHARANI BRASS INDUSTRIES\nPlot No. 12/B, GIDC Phase III, Jamnagar - 361004",
    print_short_addr: "GIDC Phase III, Jamnagar",
    gstin: "24AAACB1234F1Z6"
  };

  const html = await renderMtcPrintHtml({
    analysis: mockAnalysis,
    companyInfo: mockCompany,
    origin: "https://sandbox.tambahq.in"
  });

  assert.ok(html, "MTC print HTML must be returned");
  assert.ok(html.includes("MILL TEST CERTIFICATE"), "HTML must contain title Mill Test Certificate");
  assert.ok(html.toUpperCase().includes("EN 10204 TYPE 3.1"), "HTML must reference EN 10204 Type 3.1");
  assert.ok(html.includes("HT-BRASS-704"), "HTML must include Heat Number");
  assert.ok(html.includes("CW617N"), "HTML must include Alloy Grade");
  assert.ok(html.includes("BHARANI BRASS INDUSTRIES"), "HTML must include company header");
  assert.ok(html.includes("Exemption 6(c)"), "HTML must include statutory RoHS Exemption statement");
  assert.ok(html.includes("<svg"), "HTML must contain SVG QR Code and Barcode");
  assert.ok(html.includes("58.12"), "HTML must display Copper value");
  assert.ok(html.includes("1.95"), "HTML must display Lead value");
  assert.ok(html.includes("462"), "HTML must display Tensile strength");
  assert.ok(html.includes("128 BHN"), "HTML must display Hardness");
  assert.ok(html.includes("PASSED"), "HTML must show QA status");
});

test("Feature 3: Rollback Script & Database Schema Isolation", () => {
  const rollbackSql = fs.readFileSync(rollbackSqlPath, "utf8");
  const dbJs = fs.readFileSync(dbJsPath, "utf8");

  // Check table creation exists in db.js
  assert.ok(
    dbJs.includes("CREATE TABLE IF NOT EXISTS spectro_heat_analysis"),
    "db.js must define spectro_heat_analysis table"
  );

  // Check rollback drops the exact table and index
  assert.ok(
    rollbackSql.includes("DROP TABLE IF EXISTS spectro_heat_analysis CASCADE;"),
    "Rollback script must drop spectro_heat_analysis cascade"
  );
  assert.ok(
    rollbackSql.includes("idx_spectro_heat_lookup"),
    "Rollback script must drop idx_spectro_heat_lookup"
  );

  // Zero modification to core financial/production tables
  const nonComments = rollbackSql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  assert.ok(
    !nonComments.includes("purchase"),
    "Rollback must never drop or mutate purchase table"
  );
  assert.ok(
    !nonComments.includes("fund_trans"),
    "Rollback must never drop or mutate fund_trans table"
  );
  assert.ok(
    !nonComments.includes("daily_prod"),
    "Rollback must never drop or mutate daily_prod table"
  );
});
