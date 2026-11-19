const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

test("Top Close Button: All 41 Main Screen Sections Have Header Close Button and Valid Target", async () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");

  const expectedSections = [
    { id: 'company', target: '#company-close' },
    { id: 'users', target: '#user-close' },
    { id: 'staff', target: '#staff-close' },
    { id: 'shift', target: '#shift-close' },
    { id: 'machine', target: '#machine-close' },
    { id: 'customer', target: '#customer-close' },
    { id: 'supplier', target: '#supplier-close' },
    { id: 'vendor', target: '#vendor-close' },
    { id: 'category', target: '#category-close' },
    { id: 'item', target: '#item-close' },
    { id: 'bom', target: '#bom-close' },
    { id: 'stores', target: '#store-close' },
    { id: 'process', target: '#process-close' },
    { id: 'expense', target: '#expense-close' },
    { id: 'income', target: '#income-close' },
    { id: 'banks', target: '#bank-close' },
    { id: 'currency', target: '#curr-close' },
    { id: 'curr-today', target: '#curr-today-close' },
    { id: 'cost', target: '#cost-close' },
    { id: 'prod-setup', target: '#prod-setup-close' },
    { id: 'company-more-panel', target: '#more-close' },
    { id: 'company-eou-panel', target: '#eou-close' },
    { id: 'pt-details', target: '#pt-close' },
    { id: 'print-info', target: '#print-close' },
    { id: 'rights', target: '#rights-close' },
    { id: 'prodn', target: '#prodn-close' },
    { id: 'iwo', target: '#iwo-close' },
    { id: 'iwo-return', target: '#ret-close' },
    { id: 'scn', target: '#scn-close' },
    { id: 'assm', target: '#assm-close' },
    { id: 'mat', target: '#mat-close' },
    { id: 'plan', target: '#plan-close' },
    { id: 'capa', target: '#capa-close' },
    { id: 'schd', target: '#schd-close' },
    { id: 'esti', target: '#esti-close' },
    { id: 'issue', target: '#issue-close' },
    { id: 'tool', target: '#tool-close' },
    { id: 'scngen', target: '#scngen-close' },
    { id: 'ist', target: '#ist-close' },
    { id: 'enq', target: '#enq-close' },
    { id: 'corres', target: '#corres-close' }
  ];

  for (const sec of expectedSections) {
    const secIdx = html.indexOf(`id="${sec.id}"`);
    assert.ok(secIdx !== -1, `Section #${sec.id} must exist in index.html`);

    const chunk = html.slice(secIdx, secIdx + 1200);
    const hasTopBtn = chunk.includes('class="invmfg-close-btn window-close-btn-top"') || chunk.includes('window-close-btn-top');
    assert.ok(hasTopBtn, `Section #${sec.id} must have a top close button (.window-close-btn-top)`);

    const hasTarget = chunk.includes(`data-close-target="${sec.target}"`);
    assert.ok(hasTarget, `Section #${sec.id} top close button must point to target ${sec.target}`);
  }
});

test("Top Close Button: Modal Dialogs Have Top Close Buttons and Targets", async () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");

  const expectedModals = [
    { id: 'item-more-modal', target: '#item-more-cancel' },
    { id: 'item-assign-modal', target: '#item-assign-cancel' },
    { id: 'gauge-issue-modal', target: '#gauge-issue-cancel' },
    { id: 'gauge-calib-modal', target: '#gauge-calib-cancel' },
    { id: 'gst-portal-modal', target: '#gpm-btn-close' },
    { id: 'export-center-modal', target: '#exp-btn-close' },
    { id: 'notification-modal', target: '#notify-btn-close' },
    { id: 'barcode-modal', target: '#barcode-btn-close' },
    { id: 'metal-rate-modal', target: '#metal-rate-close' },
    { id: 'print-preview-modal', target: null }
  ];

  for (const modal of expectedModals) {
    const mIdx = html.indexOf(`id="${modal.id}"`);
    assert.ok(mIdx !== -1, `Modal #${modal.id} must exist`);

    const chunk = html.slice(mIdx, mIdx + 1200);
    const hasClose = chunk.includes('window-close-btn-top') || chunk.includes('invmfg-close-btn') || chunk.includes('status-close-x');
    assert.ok(hasClose, `Modal #${modal.id} must have a top close button`);

    if (modal.target) {
      assert.ok(chunk.includes(`data-close-target="${modal.target}"`), `Modal #${modal.id} top close button must point to target ${modal.target}`);
    }
  }
});

test("Top Close Button: Universal Click Delegator and Escape Key in app.js", async () => {
  const appJs = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");

  // Check click delegation
  assert.ok(appJs.includes('.window-close-btn-top, [data-close-target]'), "Must delegate click on window-close-btn-top");
  assert.ok(appJs.includes('btn.dataset.closeTarget'), "Must extract closeTarget data attribute");
  assert.ok(appJs.includes('target.click()'), "Must trigger target.click() on close target");

  // Check Escape key handler
  assert.ok(appJs.includes('e.key === "Escape"'), "Must handle Escape key");
  assert.ok(appJs.includes('document.activeElement.tagName === "SELECT"'), "Must have safeguard against select dropdowns");
  assert.ok(appJs.includes('openModals'), "Must check topmost open modals");
  assert.ok(appJs.includes('openSections'), "Must check topmost open sections in workspace");
});

test("Top Close Button: Modern Theme CSS Declarations", async () => {
  const css = fs.readFileSync(path.join(__dirname, "../public/modern-theme.css"), "utf8");

  assert.ok(css.includes('.window-close-btn-top'), "Must style .window-close-btn-top");
  assert.ok(css.includes('[data-theme="dark"] .window-close-btn-top'), "Must style .window-close-btn-top for dark theme");
});
