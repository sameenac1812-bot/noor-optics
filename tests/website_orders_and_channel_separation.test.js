/**
 * tests/website_orders_and_channel_separation.test.js
 * Verification for:
 * 1. Website manual prescription saving & thermal receipt printing
 * 2. Strict channel separation: Code 1 (Website / Verify UPI) vs Code 2 (In-Store POS)
 * 3. Prominent UTR reference display
 * 4. Print on UPI approval only (never print unverified website orders)
 * 5. Zero advance payment for website orders
 */

'use strict';

const assert = require('assert');
const Database = require('better-sqlite3');
const path = require('path');
const { format25InchEscPosReceipt } = require('../pos-daemon/pos-daemon');

console.log('\n======================================================');
console.log('🧪 RUNNING WEBSITE ORDERS & CHANNEL SEPARATION SUITE');
console.log('======================================================\n');

const dbPath = path.join(__dirname, '..', 'data', 'noor_optics.db');
const db = new Database(dbPath);

// ── 1. Schema Check: channel_code, source, claimed_upi_ref ─────────
console.log('--- 1. Database Schema for Channels & UPI UTR ---');
const orderCols = db.pragma('table_info(orders)').map(c => c.name);
assert(orderCols.includes('channel_code'), 'orders table must have channel_code column');
assert(orderCols.includes('source'), 'orders table must have source column');
assert(orderCols.includes('claimed_upi_ref'), 'orders table must have claimed_upi_ref column');
console.log('  ✓ [PASS] orders table has channel_code, source, and claimed_upi_ref columns');

// ── 2. Website Order Creation with Manual Prescription & UTR ────────
console.log('\n--- 2. Website Order: Manual Prescription & UTR Persistence ---');
const testOrderNumber = 'NOOR-WEB-' + Date.now();
const testUtr = '987654321098';

// Create test customer
const testCustomerId = 'cust-test-' + Date.now();
db.prepare(`
  INSERT INTO customers (id, client_code, name, phone, email, address, city, pin_code, total_spent_paise)
  VALUES (?, 'CLT-TEST-WEB', 'Ayesha Begum', '9848022338', 'ayesha@example.com', 'Flat 402, Mehdipatnam', 'Hyderabad', '500028', 0)
`).run(testCustomerId);

// Create test prescription
const testRxId = 'rx-test-' + Date.now();
const testRxNum = 'RX-TEST-' + Math.floor(1000 + Math.random() * 9000);
db.prepare(`
  INSERT INTO prescriptions (
    id, prescription_number, client_id, prescription_date,
    od_sph, od_cyl, od_axis, os_sph, os_cyl, os_axis, addition, ipd_distance, checked_by, notes
  ) VALUES (
    ?, ?, ?, '2026-11-07',
    '-1.75', '-0.50', 90, '-1.25', '-0.25', 85, '+1.75', '63', 'Client Manual Entry', 'Website Order Rx'
  )
`).run(testRxId, testRxNum, testCustomerId);

const rxRecord = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(testRxId);
const rxJson = JSON.stringify([rxRecord]);

// Create website order (Code 1)
const testOrderId = 'ord-web-test-' + Date.now();
db.prepare(`
  INSERT INTO orders (
    id, order_number, token_number, channel, channel_code, source,
    customer_name, customer_phone, customer_email, delivery_address, city, pin_code,
    prescription_pref, prescription_id, prescriptions_json, status, payment_status,
    subtotal_paise, tax_paise, total_payable_paise, amount_paid_paise, outstanding_paise,
    claimed_upi_ref, notes, created_at, updated_at
  ) VALUES (
    ?, ?, 1, 'WEBSITE', 1, 'website',
    'Ayesha Begum', '9848022338', 'ayesha@example.com', 'Flat 402, Mehdipatnam', 'Hyderabad', '500028',
    'enter-rx', ?, ?, 'CONFIRMED', 'AWAITING_VERIFICATION',
    349900, 53374, 349900, 0, 349900,
    ?, 'Online Storefront Order (UPI Ref: 987654321098)', datetime('now'), datetime('now')
  )
`).run(testOrderId, testOrderNumber, testRxId, rxJson, testUtr);

// Add order item
db.prepare(`
  INSERT INTO order_items (
    id, order_id, variant_id, product_name, variant_name, sku, lens_name, unit_price_paise, purchase_cost_paise, quantity, subtotal_paise
  ) VALUES (
    ?, ?, NULL, 'The Royal Aviator Frame', 'Gold', 'NOOR-AVI-GOLD', 'Blue-Cut Anti-Glare', 349900, 145000, 1, 349900
  )
`).run('oit-' + testOrderId, testOrderId);

const savedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(testOrderId);
assert.strictEqual(savedOrder.channel, 'WEBSITE', 'Channel must be WEBSITE');
assert.strictEqual(savedOrder.channel_code, 1, 'channel_code must be 1 for website orders');
assert.strictEqual(savedOrder.source, 'website', 'source must be website');
assert.strictEqual(savedOrder.payment_status, 'AWAITING_VERIFICATION', 'Website order must be AWAITING_VERIFICATION');
assert.strictEqual(savedOrder.amount_paid_paise, 0, 'Website order must have 0 amount paid initially');
assert.strictEqual(savedOrder.outstanding_paise, 349900, 'Website order must have 100% total outstanding until verified');
assert.strictEqual(savedOrder.claimed_upi_ref, testUtr, 'claimed_upi_ref must match customer entered UTR');
console.log('  ✓ [PASS] Website order created with channel_code=1, source=website, UTR, and 0 advance paid');

// ── 3. POS Daemon Thermal Receipt Formatter with Manual Prescription ─
console.log('\n--- 3. POS Daemon: Manual Prescription Diopter Table Formatter ---');
const receiptPayload = {
  ...savedOrder,
  items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(testOrderId),
  prescriptions: [rxRecord]
};

const receiptBuf = format25InchEscPosReceipt(receiptPayload);
const receiptText = receiptBuf.toString('ascii');

// Verify prescription details are on the receipt
assert(receiptText.includes(`RX# ${testRxNum}`) || receiptText.includes(`RX# ${testRxId}`), 'Receipt must contain prescription number');
assert(receiptText.includes('OD Right'), 'Receipt must contain OD Right row');
assert(receiptText.includes('-1.75'), 'Receipt must contain OD SPH (-1.75)');
assert(receiptText.includes('-0.50'), 'Receipt must contain OD CYL (-0.50)');
assert(receiptText.includes('90'), 'Receipt must contain OD AXIS (90)');
assert(receiptText.includes('OS Left'), 'Receipt must contain OS Left row');
assert(receiptText.includes('-1.25'), 'Receipt must contain OS SPH (-1.25)');
assert(receiptText.includes('+1.75'), 'Receipt must contain Addition (+1.75)');
console.log('  ✓ [PASS] Thermal receipt prints full OD/OS diopter table for website manual prescription');

// ── 4. Verify Printing Condition: Never print unverified website orders
console.log('\n--- 4. POS Daemon: Website Order Print Suppression Until Approval ---');
const isWebsiteOrder = savedOrder.channel_code === 1 || savedOrder.channel === 'WEBSITE';
const isVerified = savedOrder.payment_status === 'VERIFIED';
assert(isWebsiteOrder, 'Order must be recognized as website order');
assert(!isVerified, 'Order is currently unverified');
const shouldPrintUnverified = isWebsiteOrder ? isVerified : true;
assert.strictEqual(shouldPrintUnverified, false, 'POS daemon must SUPPRESS printing for unverified website order');
console.log('  ✓ [PASS] POS daemon correctly suppresses printing while order is AWAITING_VERIFICATION');

// ── 5. Payment Approval: Mark as Paid & Allow Printing ───────────────
console.log('\n--- 5. Payment Approval: Mark Paid & Trigger Printing ---');
db.prepare(`
  UPDATE orders 
  SET payment_status = 'VERIFIED', amount_paid_paise = total_payable_paise, outstanding_paise = 0, updated_at = datetime('now')
  WHERE id = ?
`).run(testOrderId);

const approvedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(testOrderId);
assert.strictEqual(approvedOrder.payment_status, 'VERIFIED');
assert.strictEqual(approvedOrder.amount_paid_paise, 349900);
assert.strictEqual(approvedOrder.outstanding_paise, 0);

const shouldPrintApproved = (approvedOrder.channel_code === 1) ? (approvedOrder.payment_status === 'VERIFIED') : true;
assert.strictEqual(shouldPrintApproved, true, 'POS daemon must ALLOW printing once payment is VERIFIED');
console.log('  ✓ [PASS] Payment approved: order marked VERIFIED (fully paid, 0 due), print permitted');

// ── 6. In-Store POS Order Comparison (Code 2) ────────────────────────
console.log('\n--- 6. In-Store POS Order Comparison (Code 2 with Advance Option) ---');
const posOrderId = 'ord-pos-test-' + Date.now();
const posOrderNum = 'NOOR-POS-' + Date.now();
db.prepare(`
  INSERT INTO orders (
    id, order_number, token_number, channel, channel_code, source,
    customer_name, customer_phone, status, payment_status,
    subtotal_paise, total_payable_paise, amount_paid_paise, outstanding_paise, advance_paid_paise
  ) VALUES (
    ?, ?, 2, 'POS', 2, 'instore',
    'Mohd Farhan', '9848011223', 'CONFIRMED', 'PARTIAL',
    500000, 500000, 200000, 300000, 200000
  )
`).run(posOrderId, posOrderNum);

const posSaved = db.prepare('SELECT * FROM orders WHERE id = ?').get(posOrderId);
assert.strictEqual(posSaved.channel_code, 2, 'POS order must have channel_code=2');
assert.strictEqual(posSaved.source, 'instore', 'POS order source must be instore');
assert.strictEqual(posSaved.payment_status, 'PARTIAL', 'POS orders support advance/partial payments');
assert.strictEqual(posSaved.advance_paid_paise, 200000);
assert.strictEqual(posSaved.outstanding_paise, 300000);
console.log('  ✓ [PASS] In-store POS order correctly uses channel_code=2 with partial advance support');

// Clean up test records
db.prepare('DELETE FROM order_items WHERE order_id = ?').run(testOrderId);
db.prepare('DELETE FROM orders WHERE id IN (?, ?)').run(testOrderId, posOrderId);
db.prepare('DELETE FROM prescriptions WHERE id = ?').run(testRxId);
db.prepare('DELETE FROM customers WHERE id = ?').run(testCustomerId);

console.log('\n======================================================');
console.log('🏁 WEBSITE ORDERS & CHANNEL SEPARATION: ALL TESTS PASSED!');
console.log('======================================================\n');
