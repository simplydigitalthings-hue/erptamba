const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const attendanceJs = fs.readFileSync(path.join(__dirname, '../public/attendance.js'), 'utf8');
const salaryJs = fs.readFileSync(path.join(__dirname, '../public/salary.js'), 'utf8');
const staffLoanJs = fs.readFileSync(path.join(__dirname, '../public/staff-loan.js'), 'utf8');
const serverJs = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
const modernCss = fs.readFileSync(path.join(__dirname, '../public/modern-theme.css'), 'utf8');
const workspaceLayoutJs = fs.readFileSync(path.join(__dirname, '../public/workspace-layout.js'), 'utf8');

const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

test('HR Module: Zero emojis in modernized HR files', () => {
  assert.equal(emojiRegex.test(attendanceJs), false, 'attendance.js contains emojis');
  assert.equal(emojiRegex.test(salaryJs), false, 'salary.js contains emojis');
  assert.equal(emojiRegex.test(staffLoanJs), false, 'staff-loan.js contains emojis');

  // Check HR sections in index.html
  const attMatch = indexHtml.match(/<section id="attendance"[\s\S]*?<\/section>/);
  assert.ok(attMatch, 'attendance section found in index.html');
  assert.equal(emojiRegex.test(attMatch[0]), false, 'attendance section HTML contains emojis');

  const salMatch = indexHtml.match(/<section id="salary"[\s\S]*?<\/section>/);
  assert.ok(salMatch, 'salary section found in index.html');
  assert.equal(emojiRegex.test(salMatch[0]), false, 'salary section HTML contains emojis');

  const loanMatch = indexHtml.match(/<section id="staff-loan"[\s\S]*?<\/section>/);
  assert.ok(loanMatch, 'staff-loan section found in index.html');
  assert.equal(emojiRegex.test(loanMatch[0]), false, 'staff-loan section HTML contains emojis');
});

test('HR Module: All 3 screens have .no-layout-override to prevent workspace-layout hijacking', () => {
  assert.match(indexHtml, /<section id="attendance"[^>]*class="[^"]*no-layout-override/);
  assert.match(indexHtml, /<section id="salary"[^>]*class="[^"]*no-layout-override/);
  assert.match(indexHtml, /<section id="staff-loan"[^>]*class="[^"]*no-layout-override/);

  // Check workspace-layout.js exclusions
  assert.match(workspaceLayoutJs, /\.no-layout-override/);
  assert.match(workspaceLayoutJs, /#att-holiday-list/);
});

test('HR Module: Standardized top close buttons on all 3 screens', () => {
  // Check attendance top close button
  const attBtn = indexHtml.match(/<button[^>]*id="att-btn-close-top"[^>]*>|<button[^>]*class="[^"]*window-close-btn-top"[^>]*id="att-btn-close-top"[^>]*>/);
  assert.ok(attBtn, 'att-btn-close-top button found');
  assert.match(attBtn[0], /window-close-btn-top/);
  assert.match(attBtn[0], /data-close-target="#att-btn-close"/);

  // Check salary top close button
  const salBtn = indexHtml.match(/<button[^>]*id="sal-btn-close-top"[^>]*>|<button[^>]*class="[^"]*window-close-btn-top"[^>]*id="sal-btn-close-top"[^>]*>/);
  assert.ok(salBtn, 'sal-btn-close-top button found');
  assert.match(salBtn[0], /window-close-btn-top/);
  assert.match(salBtn[0], /data-close-target="#sal-btn-exit"/);

  // Check loan top close button
  const loanBtn = indexHtml.match(/<button[^>]*id="loan-btn-close-top"[^>]*>|<button[^>]*class="[^"]*window-close-btn-top"[^>]*id="loan-btn-close-top"[^>]*>/);
  assert.ok(loanBtn, 'loan-btn-close-top button found');
  assert.match(loanBtn[0], /window-close-btn-top/);
  assert.match(loanBtn[0], /data-close-target="#loan-btn-exit"/);
});

test('HR Module: Smart empty states with "+ Add Employee" button present', () => {
  assert.match(indexHtml, /id="att-empty-state"/);
  assert.match(indexHtml, /id="sal-empty-state"/);
  assert.match(indexHtml, /id="loan-empty-state"/);

  assert.match(attendanceJs, /emptyStateEl\.hidden/);
  assert.match(salaryJs, /emptyDiv\.hidden/);
  assert.match(staffLoanJs, /emptyDiv\.hidden/);
});

test('HR Module: Attendance screen layout boundedness and quick-rollcall', () => {
  // Check height 100px on holiday box in modern-theme.css
  assert.match(modernCss, /\.att-holiday-box\s*\{[^}]*height:\s*100px\s*!important/);
  assert.match(modernCss, /#att-holiday-list\s*\{[^}]*max-height:\s*100px\s*!important/);

  // Check "Mark All Present" button and function
  assert.match(indexHtml, /id="att-btn-mark-all"/);
  assert.match(attendanceJs, /function markAllPresent\(\)/);
});

test('HR Module: Salary batch processing engine on server and client', () => {
  // Server-side batch process function and route
  assert.match(serverJs, /async function handleSalaryBatchProcess/);
  assert.match(serverJs, /pathname === "\/api\/salary\/batch-process"/);

  // Client-side batch button wiring
  assert.match(indexHtml, /id="sal-btn-batch"/);
  assert.match(salaryJs, /handleBatchProcess/);
});

test('HR Module: Industrial printable payslip template with DM Sans / DM Mono', () => {
  assert.match(serverJs, /DM\+Sans/);
  assert.match(serverJs, /DM\+Mono/);
  assert.match(serverJs, /payslip-container/);
  assert.match(serverJs, /net-pay-highlight/);
  assert.match(serverJs, /1c625a/);
});

test('HR Module: Staff loan deduction history toggle and ledger rendering', () => {
  assert.match(indexHtml, /id="loan-chk-details"/);
  assert.match(indexHtml, /id="loan-recovery-frame"/);
  assert.match(staffLoanJs, /renderRecoveryGrid/);
  assert.match(staffLoanJs, /loan-chk-details/);
});
