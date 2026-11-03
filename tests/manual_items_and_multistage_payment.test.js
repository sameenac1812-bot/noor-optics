/**
 * Automated Verification: Manual Frame Entry & Multi-Stage Payment System
 * Noor Optics Boutique POS
 */

const assert = require('assert');
const http = require('http');
const { db } = require('../server/db');
const { signToken } = require('../server/auth');
const app = require('../server');

async function runTest() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MANUAL ITEM & MULTI-STAGE PAYMENT SUITE');
  console.log('======================================================\n');

  const adminToken = signToken({ id: 'usr-admin-1', role_id: 'role-owner', email: 'admin@nooroptics.com', name: 'Store Owner' });
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };

  // Start temporary server
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // --- 1. Test Customer Creation ---
    console.log('--- 1. Client Setup ---');
    const testPhone = '98765' + Math.floor(10000 + Math.random() * 90000);
    const custRes = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Mohd Farhan Test',
        phone: testPhone,
        age: 28,
        city: 'Hyderabad'
      })
    });
    assert.ok(custRes.status === 200 || custRes.status === 201, 'Customer creation should return 200 or 201');
    const custBody = await custRes.json();
    const customerId = custBody.client?.id || custBody.id;
    assert.ok(customerId, 'Customer ID must exist');
    console.log(`  ✓ [PASS] Customer created: ${customerId} (${testPhone})`);

    // --- 2. POS Checkout with Manual Frame Entry & Advance Payment ---
    console.log('\n--- 2. POS Checkout: Manual Item + Advance Payment ---');
    const manualCheckoutRes = await fetch(`${baseUrl}/api/pos/checkout`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerId: customerId,
        customerName: 'Mohd Farhan Test',
        customerPhone: testPhone,
        customerCity: 'Hyderabad',
        customerAge: 28,
        paymentMethod: 'CASH',
        discountINR: 500, // Total: 4500 - 500 = 4000
        advanceINR: 1500, // Advance paid: 1500, Remaining: 2500
        secondAmountINR: 0,
        thirdAmountINR: 0,
        previousDueINR: 0,
        pickupTime: '2026-11-05T17:00:00',
        items: [
          {
            name: 'Custom Titanium Aviator Gold',
            product_name: 'Custom Titanium Aviator Gold',
            quantity: 1,
            priceINR: 4500,
            unitPricePaise: 450000,
            lineTotalINR: 4500,
            lineTotalPaise: 450000,
            sku: 'MANUAL-AV-01',
            isManual: true
          }
        ]
      })
    });

    assert.strictEqual(manualCheckoutRes.status, 200, 'POS checkout should return 200');
    const checkoutBody = await manualCheckoutRes.json();
    const orderId = checkoutBody.orderId;
    assert.ok(orderId, 'Order ID must exist');
    assert.strictEqual(checkoutBody.paymentStatus, 'PARTIAL', 'Order should be PARTIAL');
    console.log(`  ✓ [PASS] POS Checkout created with manual frame (Order #${checkoutBody.orderNumber})`);

    // Verify in SQLite database directly
    const orderRow = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    assert.strictEqual(orderRow.advance_paid_paise, 150000, 'Advance paid should be 150000 paise (₹1,500)');
    assert.strictEqual(orderRow.outstanding_paise, 250000, 'Outstanding due should be 250000 paise (₹2,500)');
    assert.strictEqual(orderRow.pickup_time, '2026-11-05T17:00:00', 'Pickup time must be recorded');
    console.log('  ✓ [PASS] Database correctly recorded advance_paid_paise and outstanding_paise');

    // Verify Payment record
    const advancePayment = db.prepare('SELECT * FROM payments WHERE order_id = ? AND payment_stage = ?').get(orderId, 'advance');
    assert.ok(advancePayment, 'Advance payment record must exist with stage "advance"');
    assert.strictEqual(advancePayment.amount_paise, 150000, 'Advance payment amount should match');
    console.log('  ✓ [PASS] payments table records payment_stage="advance"');

    // --- 3. Check Customer Due via API ---
    console.log('\n--- 3. Client Due Verification API ---');
    const dueCheckRes = await fetch(`${baseUrl}/api/customers/${customerId}/due`, {
      headers: authHeaders
    });
    assert.strictEqual(dueCheckRes.status, 200, 'Due endpoint should return 200');
    const dueBody = await dueCheckRes.json();
    assert.strictEqual(dueBody.total_due_inr, 2500, 'Customer due should be ₹2,500');
    console.log(`  ✓ [PASS] GET /api/customers/${customerId}/due reports total_due_inr = ₹2,500`);

    // --- 4. Collect 2nd Payment (1st Installment) ---
    console.log('\n--- 4. Collect 2nd Payment (₹1,500 Installment) ---');
    const p2Res = await fetch(`${baseUrl}/api/pos/orders/${orderId}/collect-payment`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        paymentStage: 'second_payment',
        amountINR: 1500,
        paymentMethod: 'UPI_GPAY',
        notes: 'Customer paid via GPay counter QR'
      })
    });

    assert.strictEqual(p2Res.status, 200, 'Collect payment should return 200');
    const p2Body = await p2Res.json();
    assert.strictEqual(p2Body.remaining_due_inr, 1000, 'Remaining due after 2nd payment should be ₹1,000');
    assert.strictEqual(p2Body.order.payment_status, 'PARTIAL', 'Order should still be PARTIAL');
    console.log('  ✓ [PASS] 2nd Payment accepted, Remaining Due updated to ₹1,000');

    // Verify in DB
    const updatedOrder2 = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    assert.strictEqual(updatedOrder2.second_payment_paise, 150000, '2nd payment should be recorded');
    assert.strictEqual(updatedOrder2.amount_paid_paise, 300000, 'Total paid should be ₹3,000');
    assert.strictEqual(updatedOrder2.outstanding_paise, 100000, 'Outstanding due should be ₹1,000');
    console.log('  ✓ [PASS] Database updated with second_payment_paise and updated outstanding_paise');

    // --- 5. Collect 3rd Payment (Final Balance Settlement) ---
    console.log('\n--- 5. Collect 3rd Payment (₹1,000 Final Settlement) ---');
    const p3Res = await fetch(`${baseUrl}/api/pos/orders/${orderId}/collect-payment`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        paymentStage: 'third_payment',
        amountINR: 1000,
        paymentMethod: 'CASH',
        notes: 'Final balance cleared at frame pickup'
      })
    });

    assert.strictEqual(p3Res.status, 200, 'Collect payment should return 200');
    const p3Body = await p3Res.json();
    assert.strictEqual(p3Body.remaining_due_inr, 0, 'Remaining due should be ₹0');
    assert.strictEqual(p3Body.order.payment_status, 'VERIFIED', 'Order should now be VERIFIED');
    console.log('  ✓ [PASS] 3rd Payment accepted, Remaining Due is ₹0 (Order VERIFIED/SETTLED)');

    const finalOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    assert.strictEqual(finalOrder.third_payment_paise, 100000, '3rd payment should be ₹1,000');
    assert.strictEqual(finalOrder.outstanding_paise, 0, 'Outstanding should be 0');
    assert.strictEqual(finalOrder.payment_status, 'VERIFIED', 'Payment status must be VERIFIED');

    // --- 6. Verify Customer Due Cleared ---
    console.log('\n--- 6. Customer Due Settled ---');
    const finalDueCheck = await fetch(`${baseUrl}/api/customers/${customerId}/due`, {
      headers: authHeaders
    });
    const finalDueBody = await finalDueCheck.json();
    assert.strictEqual(finalDueBody.total_due_inr, 0, 'Customer due should now be ₹0');
    console.log('  ✓ [PASS] GET /api/customers/:id/due reports ₹0 (Fully settled)');

    console.log('\n======================================================');
    console.log('🏁 MANUAL ITEM & MULTI-STAGE PAYMENT SUITE: ALL PASSED!');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

runTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
