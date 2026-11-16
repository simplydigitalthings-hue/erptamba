const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appJsPath = path.resolve(__dirname, "../public/app.js");
const indexHtmlPath = path.resolve(__dirname, "../public/index.html");
const modernCssPath = path.resolve(__dirname, "../public/modern-theme.css");

test("Navigation Menu & Rights Integrity for Material Inspection", () => {
  const code = fs.readFileSync(appJsPath, "utf8");

  // Extract MENUS and FORM_RIGHTS by evaluating in a minimal DOM context
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

  // Run script up to MENUS definition
  const scriptContent = code + "\n;globalThis.__TEST_MENUS = MENUS; globalThis.__TEST_RIGHTS = FORM_RIGHTS;";
  vm.runInContext(scriptContent, sandbox);

  const MENUS = sandbox.__TEST_MENUS;
  const FORM_RIGHTS = sandbox.__TEST_RIGHTS;

  assert.ok(MENUS, "MENUS must be defined");
  assert.ok(FORM_RIGHTS, "FORM_RIGHTS must be defined");

  // 1. Purchase menu verification
  const purchaseScn = MENUS.purchase.find((item) => item.form === "frmPurchStoreCrNote");
  assert.ok(purchaseScn, "Purchase menu must contain frmPurchStoreCrNote");
  assert.equal(purchaseScn.label, "Material Inspection & Acceptance (SCN)");
  assert.equal(
    MENUS.purchase.some((item) => item.label === "Store Credit Note" && item.form === "frmPurchStoreCrNote"),
    false,
    "Purchase menu must not retain legacy 'Store Credit Note' label"
  );

  // 2. Inspection menu verification
  const inspectionScn = MENUS.inspection.find((item) => item.form === "frmPurchStoreCrNote");
  assert.ok(inspectionScn, "Inspection menu must contain cross-link to frmPurchStoreCrNote");
  assert.equal(inspectionScn.label, "Incoming Material (Purchase SCN)");

  // 3. Sub Contract menu verification (both contract and subcontract property access)
  const contractScn = MENUS.contract.find((item) => item.form === "frmDcSubConStoreCrNote");
  assert.ok(contractScn, "Contract menu must contain frmDcSubConStoreCrNote");
  assert.equal(contractScn.label, "SubContract Material Inspection & Acceptance (SCN)");

  // Ensure subcontract alias works seamlessly
  assert.ok(MENUS.subcontract, "MENUS.subcontract alias must be accessible");
  assert.equal(MENUS.subcontract, MENUS.contract);
  const subConScn = MENUS.subcontract.find((item) => item.form === "frmDcSubConStoreCrNote");
  assert.ok(subConScn, "Subcontract menu alias must contain frmDcSubConStoreCrNote");
  assert.equal(subConScn.label, "SubContract Material Inspection & Acceptance (SCN)");

  // 4. FORM_RIGHTS mapping verification (must remain 100% untouched)
  assert.equal(FORM_RIGHTS.frmPurchStoreCrNote, "mnuPurchStoreCrNote");
  assert.equal(FORM_RIGHTS.frmDcSubConStoreCrNote, "mnuDcSubConStoreCrNote");
});

test("index.html Titlebar and Close Button Markup Integrity", () => {
  const html = fs.readFileSync(indexHtmlPath, "utf8");

  // 1. Check purchase SCN titlebar
  const expectedScnPurchTitlebar =
    '<div class="scnpurch-titlebar"><div style="display:flex; align-items:center; gap:8px;"><span style="font-weight:700;">Purchase — Material Inspection &amp; Acceptance (SCN)</span><span style="font-size:11px; padding:2px 8px; border-radius:12px; background:rgba(0,122,255,0.12); color:var(--primary, #007aff); font-weight:600;">frmPurchStoreCrNote</span></div><button type="button" class="scnpurch-close-btn" id="scnpurch-btn-x" title="Close">×</button></div>';

  assert.ok(
    html.includes(expectedScnPurchTitlebar),
    "index.html must contain the exact specified #scnpurch titlebar markup"
  );

  // 2. Check subcontract SCN titlebar
  const expectedSubConScnTitlebar =
    '<div class="scnpurch-titlebar"><div style="display:flex; align-items:center; gap:8px;"><span style="font-weight:700;">Sub Contract — Material Inspection &amp; Acceptance (SCN)</span><span style="font-size:11px; padding:2px 8px; border-radius:12px; background:rgba(16,185,129,0.12); color:#10b981; font-weight:600;">frmDcSubConStoreCrNote</span></div><button type="button" class="scnpurch-close-btn" id="subcon-scn-btn-x" title="Close">×</button></div>';

  assert.ok(
    html.includes(expectedSubConScnTitlebar),
    "index.html must contain the exact specified #subcon-scn titlebar markup"
  );

  // 3. Confirm both close button IDs exist
  assert.ok(html.includes('id="scnpurch-btn-x"'), "#scnpurch-btn-x must exist");
  assert.ok(html.includes('id="subcon-scn-btn-x"'), "#subcon-scn-btn-x must exist");

  // 4. Confirm underlying database and form field IDs remain untouched
  const scnPurchFieldIds = [
    'id="scnpurch-id"',
    'id="scnpurch-date"',
    'id="scnpurch-grn-id"',
    'id="scnpurch-source-store"',
    'id="scnpurch-dest-store"',
    'id="scnpurch-cost-cntr"',
    'id="scnpurch-items-body"',
    'id="scnpurch-btn-save"',
    'id="scnpurch-btn-close"',
    'id="scnpurch-btn-print"'
  ];
  for (const fieldId of scnPurchFieldIds) {
    assert.ok(html.includes(fieldId), `Field ${fieldId} must remain untouched on #scnpurch`);
  }

  const subConScnFieldIds = [
    'id="subcon-scn-id"',
    'id="subcon-scn-date"',
    'id="subcon-scn-grn-id"',
    'id="subcon-scn-items-body"',
    'id="subcon-scn-btn-save"',
    'id="subcon-scn-btn-close"',
    'id="subcon-scn-btn-print"'
  ];
  for (const fieldId of subConScnFieldIds) {
    assert.ok(html.includes(fieldId), `Field ${fieldId} must remain untouched on #subcon-scn`);
  }
});

test("Permission and window dispatching behavior", () => {
  const code = fs.readFileSync(appJsPath, "utf8");

  let openedScnPurch = false;
  let closedOtherForms = [];
  let openedSubconScn = false;

  const sandbox = {
    document: {
      querySelector: () => ({ addEventListener: () => {} }),
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      createElement: () => ({
        addEventListener: () => {},
        setAttribute: () => {},
        style: {}
      }),
      title: ""
    },
    window: {
      openScnPurch: () => { openedScnPurch = true; },
      closeScnPurch: () => { closedOtherForms.push("frmPurchStoreCrNote"); },
      openSubconScn: () => { openedSubconScn = true; },
      closeSubconScn: () => { closedOtherForms.push("frmDcSubConStoreCrNote"); },
      closeInspectionSC: () => { closedOtherForms.push("frmInspectionSC"); }
    },
    fetch: () => Promise.resolve({ json: () => Promise.resolve({}) }),
    console: console
  };
  vm.createContext(sandbox);

  const scriptContent = code + "\n;globalThis.__menuOff = menuOff; globalThis.__FORM_RIGHTS = FORM_RIGHTS; globalThis.__TEST_MENUS = MENUS; globalThis.__setRights = (r) => { menuRights = r; };";
  vm.runInContext(scriptContent, sandbox);

  const FORM_RIGHTS = sandbox.__FORM_RIGHTS;
  assert.equal(FORM_RIGHTS.frmPurchStoreCrNote, "mnuPurchStoreCrNote");

  // Verify permission check logic
  // When rights are 0, menuOff should be true (disabled)
  // When rights are 1, menuOff should be false (enabled)
  const item = { form: "frmPurchStoreCrNote" };
  // Rights missing / 0
  sandbox.__setRights({ mnuPurchStoreCrNote: 0 });
  assert.equal(sandbox.__menuOff(item), true);

  // Rights present
  sandbox.__setRights({ mnuPurchStoreCrNote: 1, mnuDcSubConStoreCrNote: 1 });
  assert.equal(sandbox.__menuOff(item), false);

  // Test opening forms through dispatch logic
  const MENUS = sandbox.__TEST_MENUS;
  const pItem = MENUS.purchase.find((it) => it.form === "frmPurchStoreCrNote");
  const iItem = MENUS.inspection.find((it) => it.form === "frmPurchStoreCrNote");
  const scItem = MENUS.contract.find((it) => it.form === "frmDcSubConStoreCrNote");

  assert.equal(pItem.form, "frmPurchStoreCrNote");
  assert.equal(iItem.form, "frmPurchStoreCrNote");
  assert.equal(scItem.form, "frmDcSubConStoreCrNote");
});

test("modern-theme.css Visual Contrast and Titlebar Styling", () => {
  const css = fs.readFileSync(modernCssPath, "utf8");

  assert.ok(
    css.includes(".scnpurch-titlebar"),
    "modern-theme.css must include .scnpurch-titlebar in module titlebars"
  );
  assert.ok(
    css.includes('[data-theme="dark"] .scnpurch-titlebar'),
    "modern-theme.css must include .scnpurch-titlebar for dark mode"
  );
  assert.ok(
    css.includes(".scnpurch-close-btn"),
    "modern-theme.css must include .scnpurch-close-btn for modern circular close button"
  );
});
