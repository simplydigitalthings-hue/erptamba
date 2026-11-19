const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("User Guide: Sidebar 13th Tab, Topbar Button & Window Markup in index.html", async () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
  
  // 13th Sidebar tab
  assert.ok(html.includes('data-menu="guide"'), "Must include data-menu='guide' button in sidebar");
  assert.ok(html.includes('id="btn-menu-guide"'), "Must include id='btn-menu-guide'");
  assert.ok(html.includes("📖 User Guide"), "Must display '📖 User Guide' text");

  // Topbar quick button
  assert.ok(html.includes('id="topbar-btn-guide"'), "Must include id='topbar-btn-guide'");
  assert.ok(html.includes("window.openUserGuide()"), "Must call window.openUserGuide on click");

  // Guide window container
  assert.ok(html.includes('id="user-guide-window"'), "Must include user-guide-window container");
  assert.ok(html.includes('id="guide-search-input"'), "Must include real-time search input");
  assert.ok(html.includes('id="guide-chapters-list"'), "Must include chapters list container");
  assert.ok(html.includes('id="guide-content-display"'), "Must include content display pane");
  assert.ok(html.includes('id="guide-btn-print-cheat"'), "Must include 1-click A4 print cheat sheet button");

  // Script tag
  assert.ok(html.includes('<script src="/guide.js?v=20261119"></script>'), "Must load guide.js script tag");
});

test("User Guide: Navigation & Menu Integration in app.js", async () => {
  const appJs = fs.readFileSync(path.join(__dirname, "../public/app.js"), "utf8");
  
  // Sidebar click handler
  assert.ok(appJs.includes('button.dataset.menu === "guide"'), "Must handle sidebar click for guide");
  assert.ok(appJs.includes("window.openUserGuide()"), "Must call window.openUserGuide()");

  // Utilities menu cross-link
  assert.ok(appJs.includes('form: "frmUserGuide"'), "Must register frmUserGuide in utilities menu");
  assert.ok(appJs.includes('item.form === "frmUserGuide"'), "Must dispatch frmUserGuide in menu click");
});

test("User Guide: Client Engine Completeness in guide.js", async () => {
  const guideJs = fs.readFileSync(path.join(__dirname, "../public/guide.js"), "utf8");

  // Public API
  assert.ok(guideJs.includes("window.openUserGuide"), "Must expose window.openUserGuide");
  assert.ok(guideJs.includes("window.closeUserGuide"), "Must expose window.closeUserGuide");
  assert.ok(guideJs.includes("window.guideJumpToScreen"), "Must expose window.guideJumpToScreen");
  assert.ok(guideJs.includes("printDeskCheatSheet"), "Must include printDeskCheatSheet function");

  // All 10 Business Chapters & FAQ
  const expectedChapters = [
    "1. Welcome & ERP 101",
    "2. Day 1 Master Setup",
    "3. Raw Material Inward Flow",
    "4. Production & Shopfloor",
    "5. Quality & Metrology Lab",
    "6. Sales, Dispatch & Invoicing",
    "7. Subcontract Job Work",
    "8. Cash Flow & Accounts",
    "9. Human Resources & Salary",
    "10. Statutory GST & Month-End",
    "Beginner FAQs & Troubleshooting"
  ];

  for (const ch of expectedChapters) {
    assert.ok(guideJs.includes(ch), `Must include chapter: ${ch}`);
  }

  // Role Quickstart Checklists in Chapter 1
  assert.ok(guideJs.includes("Day 1 Role Quickstart Checklists"), "Must include Day 1 Role Quickstart Checklists");
  assert.ok(guideJs.includes("Storekeeper & Inward Logistics"), "Must include Storekeeper role checklist");
  assert.ok(guideJs.includes("CNC Machinist & Supervisor"), "Must include CNC Machinist role checklist");
  assert.ok(guideJs.includes("Quality & Metrology Inspector"), "Must include Quality inspector role checklist");
  assert.ok(guideJs.includes("Accounts & Finance Specialist"), "Must include Accounts specialist role checklist");

  // 10 Beginner FAQs
  for (let i = 1; i <= 10; i++) {
    assert.ok(guideJs.includes(`Q${i}:`), `Must include FAQ Q${i}`);
  }

  // Interactive Screen Jump Buttons
  assert.ok(guideJs.includes("window.guideJumpToScreen('po')"), "Must have PO launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('grn')"), "Must have GRN launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('scn')"), "Must have SCN launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('invPurch')"), "Must have Inward Invoice launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('iwo')"), "Must have IWO launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('prodn')"), "Must have Production log launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('spectro')"), "Must have Spectro launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('gauge')"), "Must have Gauge launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('dc')"), "Must have DC launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('invoice')"), "Must have Invoice launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('cashflow')"), "Must have Cash Flow launcher");

  // Real-time search and role filtering
  assert.ok(guideJs.includes("guide-search-input"), "Must hook search input");
  assert.ok(guideJs.includes("ROLE_MAP"), "Must implement role filtering");

  // Printable A4 Cheat Sheet
  assert.ok(guideJs.includes("Standard Operating Cheat Sheet"), "Must generate A4 SOP cheat sheet");
  assert.ok(guideJs.includes("@page { size: A4 portrait"), "Must have A4 print page styles");
});

test("User Guide: Modern Theme Stylesheet in modern-theme.css", async () => {
  const css = fs.readFileSync(path.join(__dirname, "../public/modern-theme.css"), "utf8");
  
  assert.ok(css.includes(".user-guide-window"), "Must define .user-guide-window");
  assert.ok(css.includes(".user-guide-sidebar"), "Must define .user-guide-sidebar");
  assert.ok(css.includes(".user-guide-content"), "Must define .user-guide-content");
  assert.ok(css.includes(".guide-chip"), "Must define .guide-chip");
  assert.ok(css.includes(".guide-action-btn"), "Must define .guide-action-btn");
  assert.ok(css.includes("body.dark-theme .user-guide-window"), "Must support dark theme");
});
