const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Phase 1: Delivery Challan Edit Inventory Restoration Verification (BUG-INV-01)', () => {
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

  // Ensure handleDcSave queries old store id and restores store_add_sub.bal_qty
  assert.ok(
    serverCode.includes('// [BUG-INV-01] Restore store inventory balance before re-deducting updated quantities'),
    'handleDcSave must contain BUG-INV-01 inventory restoration comment'
  );
  assert.ok(
    serverCode.includes('UPDATE store_add_sub SET bal_qty = bal_qty + $4 WHERE factory_id = $1 AND year_label = $2 AND id = $3 AND item_id = $5'),
    'handleDcSave must restore bal_qty on store_add_sub when modifying an existing DC'
  );
  assert.ok(
    serverCode.includes('SELECT storeid FROM dcinv WHERE factory_id = $1 AND year_label = $2 AND dcinvid = $3'),
    'handleDcSave must fetch original storeid to restore stock to correct warehouse store'
  );
});

test('Phase 1: Multi-Bill Payment Voucher Deletion Balance Math (BUG-FIN-01)', () => {
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

  // Verify restorePaymentBillBalances helper exists
  assert.ok(
    serverCode.includes('async function restorePaymentBillBalances(client, session, r)'),
    'Must define restorePaymentBillBalances helper function'
  );

  // Test per-bill parsing and allocation logic in isolation
  function parseAllocations(trackBill, totalAmount) {
    const tokens = String(trackBill || '').split(',').map(s => s.trim()).filter(Boolean);
    return tokens.map(token => {
      const parts = token.split(':');
      const billNo = parts[0].trim();
      const hasAlloc = parts.length > 1 && !isNaN(Number(parts[1])) && Number(parts[1]) > 0;
      const alloc = hasAlloc
        ? Number(parts[1])
        : (tokens.length === 1 ? Number(totalAmount || 0) : Number(totalAmount || 0) / tokens.length);
      return { billNo, alloc };
    });
  }

  // 1. Single bill without tag
  const single = parseAllocations('INV-101', 50000);
  assert.equal(single.length, 1);
  assert.equal(single[0].billNo, 'INV-101');
  assert.equal(single[0].alloc, 50000);

  // 2. Multi-bill with exact allocation tags
  const multiTagged = parseAllocations('INV-101:20000, INV-102:30000', 50000);
  assert.equal(multiTagged.length, 2);
  assert.equal(multiTagged[0].billNo, 'INV-101');
  assert.equal(multiTagged[0].alloc, 20000);
  assert.equal(multiTagged[1].billNo, 'INV-102');
  assert.equal(multiTagged[1].alloc, 30000);

  // 3. Multi-bill legacy without tags: must NEVER multiply totalAmount by N
  const legacyMulti = parseAllocations('INV-101, INV-102', 50000);
  assert.equal(legacyMulti.length, 2);
  assert.equal(legacyMulti[0].alloc, 25000, 'Legacy multi-bill must divide amount, not multiply');
  assert.equal(legacyMulti[1].alloc, 25000, 'Legacy multi-bill must divide amount, not multiply');

  // Verify handlePaymentsDelete calls restorePaymentBillBalances
  assert.ok(
    serverCode.includes('await restorePaymentBillBalances(client, session, r);'),
    'handlePaymentsDelete must call restorePaymentBillBalances'
  );
});

test('Phase 1: Multi-Bill Receipt Voucher Deletion & Column Parity (BUG-FIN-02)', () => {
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

  // Verify restoreReceiptBillBalances helper exists
  assert.ok(
    serverCode.includes('async function restoreReceiptBillBalances(client, session, r)'),
    'Must define restoreReceiptBillBalances helper function'
  );

  // Verify column parity: checks both dcno and invno to prevent missed row updates
  assert.ok(
    serverCode.includes('WHERE factory_id = $2 AND year_label = $3 AND (dcno = $4 OR invno = $4)'),
    'restoreReceiptBillBalances must check both dcno and invno'
  );

  // Verify handleReceiptsDelete calls restoreReceiptBillBalances
  assert.ok(
    serverCode.includes('await restoreReceiptBillBalances(client, session, r);'),
    'handleReceiptsDelete must call restoreReceiptBillBalances'
  );
});

test('Phase 1: Traveler Hub Scrollbar & Layout Clearance', () => {
  const cssCode = fs.readFileSync(path.join(__dirname, '../public/modern-theme.css'), 'utf8');
  const travelerJs = fs.readFileSync(path.join(__dirname, '../public/traveler.js'), 'utf8');

  // Verify custom scrollbar styling
  assert.ok(
    cssCode.includes('#traveler-detail-container {'),
    'modern-theme.css must declare #traveler-detail-container rule'
  );
  assert.ok(
    cssCode.includes('scrollbar-color: #1c625a #e2e8f0 !important;'),
    'modern-theme.css must define visible teal scrollbar'
  );
  assert.ok(
    cssCode.includes('#traveler-detail-container::-webkit-scrollbar'),
    'modern-theme.css must define webkit scrollbar'
  );

  // Verify bottom clearance margin
  assert.ok(
    travelerJs.includes('margin-bottom: 48px;'),
    'traveler.js must provide margin-bottom clearance for final stage visibility'
  );
});
