const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("User Guide: Sidebar 13th Tab, Topbar Button, Mobile Drawer & Window Markup in index.html", async () => {
  const html = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
  
  // 13th Sidebar tab
  assert.ok(html.includes('data-menu="guide"'), "Must include data-menu='guide' button in sidebar");
  assert.ok(html.includes('id="btn-menu-guide"'), "Must include id='btn-menu-guide'");
  assert.ok(html.includes("📖 User Guide"), "Must display '📖 User Guide' text");

  // Topbar quick button
  assert.ok(html.includes('id="topbar-btn-guide"'), "Must include id='topbar-btn-guide'");
  assert.ok(html.includes("window.openUserGuide()"), "Must call window.openUserGuide on click");

  // Mobile topic drawer toggle
  assert.ok(html.includes('id="guide-btn-mobile-nav"'), "Must include id='guide-btn-mobile-nav' for mobile drawer toggle");

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

test("User Guide: Client Engine Completeness & Mobile Toggle in guide.js", async () => {
  const guideJs = fs.readFileSync(path.join(__dirname, "../public/guide.js"), "utf8");

  // Public API
  assert.ok(guideJs.includes("window.openUserGuide"), "Must expose window.openUserGuide");
  assert.ok(guideJs.includes("window.closeUserGuide"), "Must expose window.closeUserGuide");
  assert.ok(guideJs.includes("window.guideJumpToScreen"), "Must expose window.guideJumpToScreen");
  assert.ok(guideJs.includes("printDeskCheatSheet"), "Must include printDeskCheatSheet function");

  // Mobile navigation drawer toggle
  assert.ok(guideJs.includes("mobile-open"), "Must toggle mobile-open class on sidebar");

  // All 15 Exhaustive Business Chapters & FAQ
  const expectedChapters = [
    "1. Welcome, Cockpit & ERP 101",
    "2. Enterprise Master Setup",
    "3. Production Planning & Cost Estimation",
    "4. Procurement & Raw Material Inward",
    "5. Warehouse, Tool Crib & Store Operations",
    "6. Production & Shopfloor Execution",
    "7. Quality Control, Metrology Lab & Traceability",
    "8. Plant & Machinery Maintenance",
    "9. Sales Orders, Dispatch & Tax Invoicing",
    "10. Job Work & Subcontracting",
    "11. Cash Flow, Banking & Accounts",
    "12. Human Resources, Payroll & Staff Loans",
    "13. Statutory GST, Audit Trail & Month-End",
    "14. Utilities & Factory Automation",
    "15. Beginner FAQs & Troubleshooting"
  ];

  for (const ch of expectedChapters) {
    assert.ok(guideJs.includes(ch), `Must include chapter: ${ch}`);
  }

  // Live Operations Cockpit in Chapter 1
  assert.ok(guideJs.includes("Live Operations Cockpit"), "Must include Live Operations Cockpit overview");
  assert.ok(guideJs.includes("Stores & Warehouse Manager"), "Must include Stores Manager role checklist");
  assert.ok(guideJs.includes("CNC Machinist & Shopfloor Supervisor"), "Must include CNC Machinist role checklist");
  assert.ok(guideJs.includes("Quality & Metrology Inspector"), "Must include Quality inspector role checklist");
  assert.ok(guideJs.includes("Sales & Commercial Coordinator"), "Must include Sales coordinator role checklist");
  assert.ok(guideJs.includes("Accounts & Finance Specialist"), "Must include Accounts specialist role checklist");

  // 12 Beginner FAQs
  for (let i = 1; i <= 12; i++) {
    assert.ok(guideJs.includes(`Q${i}:`), `Must include FAQ Q${i}`);
  }

  // Interactive Screen Jump Buttons across full ERP
  assert.ok(guideJs.includes("window.guideJumpToScreen('dashboard')"), "Must have Live Cockpit launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('bom')"), "Must have BOM launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('assmReq')"), "Must have Assembly Analysis launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('matReq')"), "Must have Material Shortage launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('estimation')"), "Must have Cost Estimation launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('po')"), "Must have PO launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('grn')"), "Must have GRN launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('scn')"), "Must have SCN launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('ist')"), "Must have Inter-Store Transfer launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('toolCrib')"), "Must have Tool Crib launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('iwo')"), "Must have IWO launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('prodn')"), "Must have Production log launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('spectro')"), "Must have Spectro launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('gauge')"), "Must have Gauge launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('maintainSch')"), "Must have Maintenance Schedule launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('breakdown')"), "Must have Breakdown Maintenance launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('quote')"), "Must have Sales Quotation launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('dc')"), "Must have DC launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('invoice')"), "Must have Invoice launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('cashflow')"), "Must have Cash Flow launcher");
  assert.ok(guideJs.includes("window.guideJumpToScreen('notificationHub')"), "Must have WhatsApp / Email Hub launcher");

  // Real-time search and role filtering
  assert.ok(guideJs.includes("guide-search-input"), "Must hook search input");
  assert.ok(guideJs.includes("ROLE_MAP"), "Must implement role filtering");

  // Printable A4 Cheat Sheet in DM Sans / DM Mono / Deep Teal
  assert.ok(guideJs.includes("Standard Operating Cheat Sheet"), "Must generate A4 SOP cheat sheet");
  assert.ok(guideJs.includes("@page { size: A4 portrait"), "Must have A4 print page styles");
  assert.ok(guideJs.includes('"DM Sans"'), "Print sheet must use DM Sans font");
  assert.ok(guideJs.includes("#1c625a"), "Print sheet must use Tamba deep teal #1c625a");
});

test("User Guide: Tamba UI/UX Visual System in modern-theme.css", async () => {
  const css = fs.readFileSync(path.join(__dirname, "../public/modern-theme.css"), "utf8");
  
  // Layout and Shell
  assert.ok(css.includes(".user-guide-window"), "Must define .user-guide-window");
  assert.ok(css.includes(".user-guide-sidebar"), "Must define .user-guide-sidebar");
  assert.ok(css.includes(".user-guide-content"), "Must define .user-guide-content");

  // Deep Teal Header & No Blue Gradients
  assert.ok(css.includes("linear-gradient(90deg, #134e48, #1c625a)"), "Header must use deep teal gradient");
  assert.ok(!css.includes("linear-gradient(90deg, #003366, #005a9e)"), "Header must not use navy blue gradient");

  // 3-Tier Typography Hierarchy
  assert.ok(css.includes("var(--font-serif, \"Newsreader\""), "Must use Newsreader for editorial article headings");
  assert.ok(css.includes("var(--font-sans, \"DM Sans\""), "Must use DM Sans for operational text");
  assert.ok(css.includes("var(--font-mono, \"DM Mono\""), "Must use DM Mono for concise metadata and badges");

  // Restrained Geometry: Crisp 4px/6px radii, no 20px pill shapes
  assert.ok(css.includes("border-radius: var(--radius-xs, 4px)"), "Must use 4px corner radius for chips and action buttons");
  assert.ok(!css.includes(".guide-chip {\r\n  border-radius: 12px") && !css.includes("border-radius: 20px"), "Must not use pill shapes for operational role chips");

  // Responsive Breakpoints & Mobile Drawer
  assert.ok(css.includes("@media (max-width: 768px)"), "Must include 768px mobile breakpoint");
  assert.ok(css.includes(".guide-mobile-nav-btn"), "Must define .guide-mobile-nav-btn for mobile drawer toggle");
  assert.ok(css.includes(".user-guide-sidebar.mobile-open"), "Must define mobile-open drawer slide-out");

  // Dark Theme Integration via Design Tokens
  assert.ok(css.includes('[data-theme="dark"] .user-guide-window') || css.includes("body.dark-theme .user-guide-window"), "Must support dark theme");
  assert.ok(css.includes("background: var(--bg-card);"), "Dark theme must use design token variables");
});
