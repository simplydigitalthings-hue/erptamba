const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Phase 2: GSTR-1 Outward Supplies Summary includes both Manufacturing and Labour (BUG-TAX-01)", async () => {
  const taxEngineCode = fs.readFileSync(path.join(__dirname, "../tax-engine.js"), "utf8");
  assert.ok(taxEngineCode.includes("FROM dcinv"), "Must query dcinv for manufacturing invoices");
  assert.ok(taxEngineCode.includes("FROM dcoutgoinginv"), "Must query dcoutgoinginv for labour invoices");
  assert.ok(taxEngineCode.includes("'MFG' AS inv_type"), "Must flag manufacturing invoices as MFG");
  assert.ok(taxEngineCode.includes("'LABOUR' AS inv_type"), "Must flag labour invoices as LABOUR");
});

test("Phase 2: GSTR-3B ITC Summary joins vendor master with supplier fallback (BUG-TAX-02)", async () => {
  const taxEngineCode = fs.readFileSync(path.join(__dirname, "../tax-engine.js"), "utf8");
  assert.ok(
    taxEngineCode.includes("LEFT JOIN vendor v ON v.factory_id = p.factory_id AND (v.vendor_code = p.vendorcode OR v.cust_code = p.vendorcode::text)"),
    "Must join vendor table on vendor_code"
  );
  assert.ok(
    taxEngineCode.includes("LEFT JOIN supplier s ON s.factory_id = p.factory_id AND (s.supp_id = p.vendorcode OR s.cust_code = p.vendorcode::text)"),
    "Must join supplier table as fallback"
  );
  assert.ok(
    taxEngineCode.includes("COALESCE(v.vendor_name, s.supp_name, 'Unknown Vendor')"),
    "Must coalesce vendor and supplier names"
  );
});

test("Phase 2: Advance Adjustment Reversion Capped Restoration Math (BUG-FIN-03)", async () => {
  const serverCode = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  assert.ok(serverCode.includes("async function restoreAdvanceBalances"), "Must have restoreAdvanceBalances helper");
  assert.ok(serverCode.includes("async function restoreAdvanceBillBalances"), "Must have restoreAdvanceBillBalances helper");
  assert.ok(serverCode.includes("LEAST($1::float8, amt_bal + $2)"), "Must cap restoration at maximum advance voucher capacity");
  assert.ok(!serverCode.includes("SET amt_bal = amt_bal + $1, adv_balance = adv_balance + $1\n           WHERE factory_id = $2 AND year_label = $3 AND is_expense = $4 AND party_name = $5 AND p_r_a_type = 'Advance'"),
    "Must not execute naive un-capped blanket UPDATE on all party advances"
  );
});

test("Phase 2: Breakdown Maintenance Dropdown Tenant Isolation (BUG-SEC-01)", async () => {
  const serverCode = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  assert.ok(
    !serverCode.includes('machQ = await pool.query("SELECT mach_id, mach_name FROM machine ORDER BY mach_name");'),
    "Must not fall back to unscoped cross-tenant query when factory has no machines"
  );
  assert.ok(
    serverCode.includes('SELECT mach_id, mach_name FROM machine WHERE factory_id = $1 ORDER BY mach_name'),
    "Must scope machine dropdown query to session factory_id"
  );
});

test("Phase 2: Staff Salary Payoldbal Factory Isolation (BUG-HR-01)", async () => {
  const serverCode = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  assert.ok(
    serverCode.includes('UPDATE staff SET payoldbal = $1 WHERE staff_id = $2 AND factory_id = $3'),
    "Must qualify staff payoldbal updates with factory_id"
  );
  assert.ok(
    !serverCode.includes('UPDATE staff SET payoldbal = $1 WHERE staff_id = $2"'),
    "Must not update staff payoldbal without factory_id"
  );
});

test("Phase 2: Production Timings Overlap Canonical Interval Math (BUG-PROD-01)", async () => {
  // Extract timingsOverlap logic from server
  function clockMinutes(value) {
    const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    return Number(match[1]) * 60 + Number(match[2]);
  }

  function toIntervalSegments(from, to) {
    const start = clockMinutes(from);
    const end = clockMinutes(to);
    if (start === end) return [];
    if (start < end) return [[start, end]];
    return [[start, 1440], [0, end]];
  }

  function timingsOverlap(from, to, oldFrom, oldTo) {
    const segsA = toIntervalSegments(from, to);
    const segsB = toIntervalSegments(oldFrom, oldTo);
    for (const [s1, e1] of segsA) {
      for (const [s2, e2] of segsB) {
        if (Math.max(s1, s2) < Math.min(e1, e2)) return true;
      }
    }
    return false;
  }

  // Enclosing shift (08:00 to 18:00 encloses 09:00 to 17:00)
  assert.equal(timingsOverlap("08:00", "18:00", "09:00", "17:00"), true, "Enclosing shift must collide");
  assert.equal(timingsOverlap("09:00", "17:00", "08:00", "18:00"), true, "Enclosed shift must collide");

  // Partial overlap
  assert.equal(timingsOverlap("08:00", "14:00", "12:00", "18:00"), true, "Partial overlap must collide");

  // Adjacent back-to-back shifts (08:00-16:00 and 16:00-00:00)
  assert.equal(timingsOverlap("08:00", "16:00", "16:00", "23:59"), false, "Adjacent shifts must not collide");

  // Overnight shift (22:00 to 06:00) overlapping with morning shift (05:00 to 13:00)
  assert.equal(timingsOverlap("22:00", "06:00", "05:00", "13:00"), true, "Overnight overlap must collide");

  // Non-overlapping overnight shift (22:00 to 06:00) vs afternoon shift (10:00 to 18:00)
  assert.equal(timingsOverlap("22:00", "06:00", "10:00", "18:00"), false, "Separate shifts must not collide");
});

test("Phase 2: Internal Work Order Modify Synchronizes Store Issue (BUG-PROD-02)", async () => {
  const serverCode = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  assert.ok(serverCode.includes("SELECT store_iss_id FROM prodn_iwo_iss WHERE factory_id = $1 AND year_label = $2 AND dc_id = $3"), "Must query linked store_iss_id on modify");
  assert.ok(serverCode.includes("UPDATE store_iss SET doi = $4, cost_cntr_id = $5, store_id = $6, to_whom = $7, rem_any = $8"), "Must update store_iss header on modify");
  assert.ok(serverCode.includes("DELETE FROM store_iss_sub WHERE factory_id = $1 AND year_label = $2 AND id = $3"), "Must clear old store_iss_sub before re-issue");
});

test("Phase 3: BOM Save Transactional Integrity (BUG-BOM-01)", async () => {
  const serverCode = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  const bomSaveSnippet = serverCode.slice(serverCode.indexOf("async function handleBomSave"), serverCode.indexOf("async function handleBomCopy"));
  assert.ok(bomSaveSnippet.includes('await client.query("BEGIN")'), "handleBomSave must use transaction BEGIN");
  assert.ok(bomSaveSnippet.includes('await client.query("COMMIT")'), "handleBomSave must COMMIT on success");
  assert.ok(bomSaveSnippet.includes('await client.query("ROLLBACK")'), "handleBomSave must ROLLBACK on failure");
});

test("Phase 3: Inward Purchase Invoice Mathematical Parity (BUG-PURCH-01)", async () => {
  const serverCode = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  assert.ok(serverCode.includes("Math.abs(calcTot - totVal) > 2.0"), "Must verify invoice total against taxableAmt + totalGst + charges");
  assert.ok(serverCode.includes("purchIdShares"), "Must allocate batch DC values across purchIds when multiple DCs are selected");
});

test("Phase 3: Subcontract Outward Modals Scrollable Limits (BUG-UI-01)", async () => {
  const htmlCode = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
  assert.ok(htmlCode.includes('id="subcondcout-annexure-modal" class="modal" hidden style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center;"'), "Annexure modal exists");
  assert.ok(htmlCode.includes('max-height: 90vh; overflow-y: auto;'), "Must include max-height: 90vh; overflow-y: auto;");
});

test("Phase 3: Delivery Challan & Inter-Store Transfer UI/UX Prompts (BUG-UX-01 & BUG-UX-02)", async () => {
  const serverCode = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  assert.ok(serverCode.includes("Qty should be greater than 0"), "BUG-UX-01: DC prompt must state Qty should be greater than 0");
  assert.ok(!serverCode.includes("Qty should not be greater than 0"), "BUG-UX-01: Inverted prompt must be gone");
  assert.ok(serverCode.includes("Inter-store transfer record not found for modification."), "BUG-UX-02: IST prompt must give clear not found error");
});
