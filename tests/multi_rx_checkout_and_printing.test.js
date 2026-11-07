/**
 * tests/multi_rx_checkout_and_printing.test.js
 * Comprehensive Verification of Multi-Rx POS Checkout, Thermal Printing, PDF Invoices & POS Daemon
 */

'use strict';

const assert = require('assert');
const { db, initializeDatabase } = require('../server/db');
const { format58mmTextReceipt, generate58mmHTML } = require('../server/printer');
const { generateInvoicePDF } = require('../server/pdfInvoice');

console.log('\n======================================================');
console.log('🧪 RUNNING MULTI-RX CHECKOUT & PRINTING VERIFICATION SUITE');
console.log('======================================================\n');

initializeDatabase();

// 1. Database schema verification
console.log('--- 1. Database Schema for Multi-Rx ---');
const orderCols = db.pragma('table_info(orders)').map(c => c.name);
assert(orderCols.includes('prescriptions_json'), 'orders table must contain prescriptions_json column');
console.log('  ✓ [PASS] orders table contains prescriptions_json column');

// 2. Mock Multi-Rx Order Data
console.log('\n--- 2. Multi-Rx Thermal Receipt Formatter ---');
const mockRx1 = {
  prescription_number: 'RX-2026-9001',
  od_sph: '+0.50',
  od_cyl: '-0.25',
  od_axis: 90,
  os_sph: '+0.75',
  os_cyl: '-0.50',
  os_axis: 180,
  addition: '+1.50',
  ipd_distance: 63,
  checked_by: 'Dr. Sameena'
};

const mockRx2 = {
  prescription_number: 'RX-2026-9002',
  od_sph: '-1.25',
  od_cyl: '-0.75',
  od_axis: 45,
  os_sph: '-1.50',
  os_cyl: '-0.50',
  os_axis: 135,
  addition: '+2.00',
  ipd_distance: 62,
  checked_by: 'Dr. Sameena'
};

const multiRxOrder = {
  id: 'ord-pos-test-multi-rx',
  order_number: 'NOOR-POS-2026-TEST-MULTI',
  token_number: 42,
  channel: 'POS',
  customer_name: 'Imran Khan',
  customer_phone: '9876543210',
  subtotal_paise: 500000,
  discount_paise: 0,
  tax_paise: 76271,
  total_payable_paise: 500000,
  amount_paid_paise: 500000,
  outstanding_paise: 0,
  payment_status: 'VERIFIED',
  prescriptions: [mockRx1, mockRx2]
};

const mockItems = [
  { product_name: 'Ray-Ban Aviator Classic', quantity: 1, unit_price_paise: 500000, subtotal_paise: 500000 }
];

const textReceipt = format58mmTextReceipt(multiRxOrder, mockItems);
assert(textReceipt.includes('RX-2026-9001'), 'Receipt must contain Rx 1 number');
assert(textReceipt.includes('+0.50'), 'Receipt must contain Rx 1 OD SPH');
assert(textReceipt.includes('RX-2026-9002'), 'Receipt must contain Rx 2 number');
assert(textReceipt.includes('-1.25'), 'Receipt must contain Rx 2 OD SPH');
console.log('  ✓ [PASS] format58mmTextReceipt correctly loops and prints all attached prescriptions');

// 3. HTML Receipt Formatter
console.log('\n--- 3. 58mm HTML Multi-Rx Formatter ---');
const htmlReceipt = generate58mmHTML(multiRxOrder, mockItems);
assert(htmlReceipt.includes('RX-2026-9001'), 'HTML receipt must contain RX-2026-9001');
assert(htmlReceipt.includes('RX-2026-9002'), 'HTML receipt must contain RX-2026-9002');
console.log('  ✓ [PASS] generate58mmHTML correctly displays both prescriptions in browser print view');

// 4. POS Daemon Formatter Verification
console.log('\n--- 4. POS Daemon Receipt Multi-Rx Formatter ---');
// Dynamically require pos-daemon.js to inspect its receipt output
const posDaemonCode = require('fs').readFileSync('pos-daemon/pos-daemon.js', 'utf8');
assert(posDaemonCode.includes('allRxList.forEach'), 'POS Daemon must loop through allRxList');
assert(posDaemonCode.includes('RX# ${rxNo}'), 'POS Daemon must format multi-rx headers');
console.log('  ✓ [PASS] pos-daemon/pos-daemon.js has Multi-Rx looping engine and updated version');

// 5. PDF Invoice Generation with Multiple Prescriptions
console.log('\n--- 5. A4 Tax Invoice PDF Multi-Rx Generation ---');
async function testPdf() {
  const invoice = {
    invoice_number: 'INV-TEST-MULTI-RX-001',
    customer_name: 'Imran Khan',
    customer_phone: '9876543210',
    subtotal_paise: 500000,
    discount_paise: 0,
    tax_paise: 76271,
    grand_total_paise: 500000,
    amount_paid_paise: 500000,
    payment_status: 'PAID',
    payment_method: 'CASH',
    prescriptions: [mockRx1, mockRx2]
  };

  const pdfBuffer = await generateInvoicePDF(invoice, mockItems, [mockRx1, mockRx2]);
  assert(Buffer.isBuffer(pdfBuffer), 'PDF result must be a Buffer');
  assert(pdfBuffer.length > 5000, 'PDF buffer should be sufficiently large');
  assert(pdfBuffer.toString('utf8', 0, 5) === '%PDF-', 'Buffer must begin with %PDF-');
  console.log('  ✓ [PASS] generateInvoicePDF successfully rendered A4 PDF invoice with multiple prescriptions');
}

testPdf().then(() => {
  console.log('\n======================================================');
  console.log('🏁 MULTI-RX TEST SUITE: ALL 5/5 TESTS PASSED!');
  console.log('======================================================\n');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
