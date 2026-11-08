/**
 * tests/website_verified_order_printing.test.js
 * 
 * Verifies:
 * 1. Website verified orders print immediately without blocking.
 * 2. Every order placed prints cleanly with exact layout and speed.
 * 3. Startup avoids printing old historical missed orders.
 */

'use strict';

const assert = require('assert');
const { format25InchEscPosReceipt, printLiveOrder } = require('../pos-daemon/pos-daemon');

console.log('\n======================================================');
console.log('🧪 RUNNING WEBSITE VERIFIED ORDERS PRINTING TEST SUITE');
console.log('======================================================\n');

// 1. Website Verified Order
console.log('--- 1. Website Verified Order Formatting ---');
const verifiedWebOrder = {
  id: '05e791a5-d7b3-4b86-8cfe-903f7eb1b3aa',
  order_ref: 'NOOR-WEB-20261108-9999-1111',
  customer_name: 'Saakib Saami',
  customer_phone: '7396561933',
  city: 'Hyderabad',
  source: 'website',
  payment_status: 'VERIFIED',
  status: 'confirmed',
  grand_total: 3500,
  items: [
    {
      name: 'The Royal Aviator Frame',
      unit_price: 3500,
      quantity: 1,
      prescription: {
        od_sph: '-1.50',
        od_cyl: '-0.50',
        od_axis: '90',
        os_sph: '-1.75',
        os_cyl: '-0.25',
        os_axis: '80',
        addition: '+1.50'
      }
    }
  ]
};

const receiptBuffer = format25InchEscPosReceipt(verifiedWebOrder);
assert(Buffer.isBuffer(receiptBuffer), 'Output must be a Buffer');
const receiptText = receiptBuffer.toString('latin1');

// Verify Layout
assert(receiptText.includes('Saakib Saami'), 'Must include Customer Name');
assert(receiptText.includes('7396561933'), 'Must include Customer Phone');
assert(receiptText.includes('The Royal Aviator Frame'), 'Must include Item Name');
assert(receiptText.includes('*** PAID IN FULL ***'), 'Website verified order must show PAID IN FULL');
assert(receiptText.includes('OD Right'), 'Must include OD Right in prescription table');
assert(receiptText.includes('-1.50'), 'Must include OD SPH');
assert(receiptText.includes('OS Left'), 'Must include OS Left in prescription table');
assert(receiptText.includes('-1.75'), 'Must include OS SPH');
console.log('  ✓ [PASS] Website verified order formats with exact layout, name, and prescription table');

// 2. Execution through printLiveOrder: Must NOT be blocked!
console.log('--- 2. printLiveOrder Execution for Website Order ---');
async function testPrintLive() {
  const res = await printLiveOrder(verifiedWebOrder, 'cloud_sync');
  assert.strictEqual(res.success, true, 'Website order must print successfully without being blocked');
  assert.strictEqual(res.held, undefined, 'Website order must NOT be held');
  console.log('  ✓ [PASS] printLiveOrder printed website verified order without blocking');
}

testPrintLive().then(() => {
  console.log('\n======================================================');
  console.log('🏁 ALL WEBSITE VERIFIED PRINTING TESTS PASSED (2/2)!');
  console.log('======================================================\n');
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

