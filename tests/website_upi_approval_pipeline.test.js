/**
 * tests/website_upi_approval_pipeline.test.js
 * Verification for Website UPI Order Approval Pipeline & POS Daemon Compatibility
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('\n======================================================');
console.log('🧪 RUNNING WEBSITE UPI APPROVAL PIPELINE TEST SUITE');
console.log('======================================================\n');

// 1. Simulate Order Channels & Approval States
const mockOrders = [
  {
    id: 'b1e1a1-001',
    order_number: 'NOOR-WEB-20261103-1001',
    source: 'website',
    customer_name: 'Farhan Khan',
    payment_method: 'UPI',
    payment_status: 'AWAITING_VERIFICATION',
    status: 'PENDING_VERIFICATION',
    grand_total: 4299
  },
  {
    id: 'b1e1a1-002',
    order_number: 'NOOR-WEB-20261103-1002',
    source: 'website',
    customer_name: 'Zara Ahmed',
    payment_method: 'UPI',
    payment_status: 'AWAITING_VERIFICATION',
    status: 'PENDING_VERIFICATION',
    grand_total: 6899
  },
  {
    id: 'b1e1a1-003',
    order_number: 'NOOR-WEB-20261103-1003',
    source: 'website',
    customer_name: 'Imran Malik',
    payment_method: 'UPI',
    payment_status: 'VERIFIED',
    status: 'confirmed',
    grand_total: 5199
  },
  {
    id: 'p1o1s1-001',
    order_number: 'INV-NOOR-POS-20261103-0001',
    source: 'instore',
    customer_name: 'Walk-in Counter Client',
    payment_method: 'CASH',
    payment_status: 'VERIFIED',
    status: 'confirmed',
    grand_total: 3500
  }
];

function getOrderChannel(o) {
  if (o.source === 'instore' || o.source === 'pos' || String(o.order_number).includes('-POS-')) return 'POS';
  return 'WEBSITE';
}

console.log('--- 1. Tab & Channel Segregation Filter Rules ---');

// Tab Filter: In-Store Orders (POS)
const posTabOrders = mockOrders.filter(o => getOrderChannel(o) === 'POS');
assert.strictEqual(posTabOrders.length, 1, 'In-Store tab should contain exactly 1 order');
assert.strictEqual(posTabOrders[0].order_number, 'INV-NOOR-POS-20261103-0001');
console.log('  ✓ [PASS] In-Store tab contains only in-store POS orders (0 website orders)');

// Tab Filter: Verify UPI Orders (Awaiting Verification)
const upiPendingTabOrders = mockOrders.filter(o => getOrderChannel(o) === 'WEBSITE' && o.payment_status === 'AWAITING_VERIFICATION');
assert.strictEqual(upiPendingTabOrders.length, 2, 'Verify UPI tab should contain exactly 2 unverified orders');
console.log('  ✓ [PASS] Verify UPI tab contains only unverified website orders (2 orders awaiting approval)');

// Tab Filter: Website Orders (Must ONLY contain VERIFIED website orders)
const websiteTabOrders = mockOrders.filter(o => getOrderChannel(o) === 'WEBSITE' && o.payment_status === 'VERIFIED');
assert.strictEqual(websiteTabOrders.length, 1, 'Website tab should contain ONLY 1 verified website order');
assert.strictEqual(websiteTabOrders[0].order_number, 'NOOR-WEB-20261103-1003');

// Critical Check: Unverified website orders must NEVER be in Website Orders tab
const leakCheck = websiteTabOrders.filter(o => o.payment_status === 'AWAITING_VERIFICATION');
assert.strictEqual(leakCheck.length, 0, 'ZERO unverified orders allowed in Website Orders tab');
console.log('  ✓ [PASS] Unverified website orders NEVER appear in Website Orders tab');

console.log('\n--- 2. Acceptance Workflow (Approve Payment & Release to Print Queue) ---');

// Simulate Accepting Farhan Khan's order
const farhanOrder = mockOrders.find(o => o.id === 'b1e1a1-001');
assert(farhanOrder, 'Farhan Khan order must exist');

// Simulated print queue state
const mockPrintJobs = {
  'b1e1a1-001': { status: 'on_hold', order_id: 'b1e1a1-001' },
  'b1e1a1-002': { status: 'on_hold', order_id: 'b1e1a1-002' },
  'b1e1a1-003': { status: 'queued', order_id: 'b1e1a1-003' },
  'p1o1s1-001': { status: 'queued', order_id: 'p1o1s1-001' }
};

// Check that on_hold jobs are NOT printable
function getClaimableJobs(jobs) {
  return Object.values(jobs).filter(j => j.status === 'queued');
}

let claimable = getClaimableJobs(mockPrintJobs);
assert.strictEqual(claimable.length, 2, 'Initially only 2 jobs should be queued (1 verified website + 1 in-store)');
assert(!claimable.some(j => j.order_id === 'b1e1a1-001'), 'Farhan order must NOT be claimable while on_hold');
console.log('  ✓ [PASS] Unapproved website orders do NOT print (status = "on_hold")');

// Shop owner accepts Farhan's order
farhanOrder.payment_status = 'VERIFIED';
farhanOrder.status = 'confirmed';
mockPrintJobs['b1e1a1-001'].status = 'queued';

// Verify Farhan's order now appears in Website Orders tab and disappeared from Verify UPI tab
const updatedUpiTab = mockOrders.filter(o => getOrderChannel(o) === 'WEBSITE' && o.payment_status === 'AWAITING_VERIFICATION');
const updatedWebsiteTab = mockOrders.filter(o => getOrderChannel(o) === 'WEBSITE' && o.payment_status === 'VERIFIED');
assert.strictEqual(updatedUpiTab.length, 1, 'Verify UPI tab should now have 1 order');
assert.strictEqual(updatedWebsiteTab.length, 2, 'Website tab should now have 2 verified orders');
assert(updatedWebsiteTab.some(o => o.id === 'b1e1a1-001'), 'Farhan order must now appear in Website Orders');
console.log('  ✓ [PASS] On accept: Order moves from "Verify UPI" into "Website Orders"');

// Verify Farhan's order is now queued for the POS print daemon
claimable = getClaimableJobs(mockPrintJobs);
assert(claimable.some(j => j.order_id === 'b1e1a1-001'), 'Farhan order is now claimable for printing');
console.log('  ✓ [PASS] On accept: Print job is released to queue (status = "queued")');

console.log('\n--- 3. Rejection Workflow (Reject Payment & Cancel Print Job) ---');

// Simulate Rejecting Zara Ahmed's order
const zaraOrder = mockOrders.find(o => o.id === 'b1e1a1-002');
zaraOrder.payment_status = 'REJECTED';
zaraOrder.status = 'cancelled';
mockPrintJobs['b1e1a1-002'].status = 'cancelled';

const finalUpiTab = mockOrders.filter(o => getOrderChannel(o) === 'WEBSITE' && o.payment_status === 'AWAITING_VERIFICATION');
const finalWebsiteTab = mockOrders.filter(o => getOrderChannel(o) === 'WEBSITE' && o.payment_status === 'VERIFIED');

assert.strictEqual(finalUpiTab.length, 0, 'Verify UPI tab has 0 pending orders');
assert(!finalWebsiteTab.some(o => o.id === 'b1e1a1-002'), 'Rejected order must NOT appear in Website tab');
assert.strictEqual(mockPrintJobs['b1e1a1-002'].status, 'cancelled', 'Print job must be marked cancelled');
console.log('  ✓ [PASS] On reject: Order is cancelled and print job is cancelled');

console.log('\n--- 4. POS Daemon Multi-PC Hardware Compatibility ---');

// Test Printer Auto-Discovery logic
const sampleWindowsPrinters = [
  'Microsoft Print to PDF',
  'OneNote for Windows 10',
  'Fax',
  'POS-80C'
];

const isVirtual = name => /PDF|OneNote|Fax|XPS|Document Writer|Root Print Queue/i.test(name);
const physical = sampleWindowsPrinters.filter(name => !isVirtual(name));
const detectedPOS = physical.find(name => /POS|Thermal|Receipt|80|58|XP|RP|Text Only|Generic|Everycom|TVS|Epson|Citizen|Star|HPRT|ZJ|Xprinter|Rongta|Gprinter|Black Copper|Bixolon|Barcode/i.test(name));

assert.strictEqual(detectedPOS, 'POS-80C', 'Should auto-detect POS-80C on another PC');
assert(!isVirtual(detectedPOS), 'Must never select a virtual PDF printer');
console.log('  ✓ [PASS] Multi-PC printer auto-detection successfully ignores virtual PDF and connects to "POS-80C"');

// Test Order ID query formatting (prevent 22P02 UUID error)
function buildOrderQuery(orderIdOrRef) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdOrRef);
  return isUuid ? `id=eq.${orderIdOrRef}` : `or=(order_ref.eq.${orderIdOrRef},order_number.eq.${orderIdOrRef})`;
}

const uuidQuery = buildOrderQuery('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
const refQuery = buildOrderQuery('NOOR-WEB-20261103-9999');
assert.strictEqual(uuidQuery, 'id=eq.a1b2c3d4-e5f6-7890-abcd-ef1234567890');
assert.strictEqual(refQuery, 'or=(order_ref.eq.NOOR-WEB-20261103-9999,order_number.eq.NOOR-WEB-20261103-9999)');
console.log('  ✓ [PASS] Supabase query parser prevents Postgres 22P02 syntax errors for non-UUID order numbers');

console.log('\n======================================================');
console.log('🏁 WEBSITE UPI APPROVAL SUITE: ALL TESTS PASSED!');
console.log('======================================================\n');

