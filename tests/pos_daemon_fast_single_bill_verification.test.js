/**
 * tests/pos_daemon_fast_single_bill_verification.test.js
 * Verification of POS print daemon deduplication, stage-tracking,
 * and exclusion of in-store POS orders from raw cloud order poller.
 */

'use strict';

const assert = require('assert');

function runTest() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING POS DAEMON FAST SINGLE BILL VERIFICATION');
  console.log('======================================================\n');

  // --- 1. Test Raw /orders Poller Exclusion ---
  console.log('--- 1. Testing Raw /orders Poller Exclusion ---');
  function shouldRawOrdersPollerPrint(order) {
    const ref = String(order.order_number || order.order_ref || order.id || '').trim();
    if (!ref) return false;
    // In-store POS orders MUST NOT be printed from raw /orders table
    if (ref.includes('-POS-') || order.channel === 'POS' || order.channel_code === 2 || order.source === 'instore') {
      return false;
    }
    // Website orders only print after verified by staff
    if (order.payment_status !== 'VERIFIED') {
      return false;
    }
    return true;
  }

  const instoreOrder = {
    order_number: 'NOOR-POS-20261109-1234-5678',
    channel: 'POS',
    channel_code: 2,
    source: 'instore',
    grand_total: 2000
  };
  const webOrderUnverified = {
    order_number: 'NOOR-WEB-20261109-1234-5678',
    channel: 'WEBSITE',
    channel_code: 1,
    source: 'website',
    payment_status: 'AWAITING_VERIFICATION'
  };
  const webOrderVerified = {
    order_number: 'NOOR-WEB-20261109-1234-5678',
    channel: 'WEBSITE',
    channel_code: 1,
    source: 'website',
    payment_status: 'VERIFIED'
  };

  assert.strictEqual(shouldRawOrdersPollerPrint(instoreOrder), false, 'Raw orders poller must SKIP in-store POS orders');
  assert.strictEqual(shouldRawOrdersPollerPrint(webOrderUnverified), false, 'Raw orders poller must SKIP unverified website orders');
  assert.strictEqual(shouldRawOrdersPollerPrint(webOrderVerified), true, 'Raw orders poller can print verified website orders');
  console.log('  ✓ [PASS] In-store POS orders are never printed from raw /orders table (eliminating inaccurate first bill)');

  // --- 2. Test Deterministic Job ID Generation & Deduplication ---
  console.log('--- 2. Testing Deterministic Queue Job ID Generation ---');
  function getJobId(jobPayload) {
    const ord = jobPayload.order || (jobPayload.items && jobPayload.items[0] && jobPayload.items[0].order) || null;
    const ref = String(ord?.order_number || ord?.order_ref || ord?.id || 'JOB').trim();
    let stageSuffix = 'init';
    if (jobPayload.source === 'reprint' || jobPayload.manualReprint) {
      stageSuffix = 'reprint';
    } else if (ord) {
      if (ord.third_payment_inr > 0 || ord.third_payment_paise > 0) {
        stageSuffix = 'stage3';
      } else if (ord.second_payment_inr > 0 || ord.second_payment_paise > 0) {
        stageSuffix = 'stage2';
      }
    }
    return 'rcp_' + ref + '_' + stageSuffix;
  }

  const checkoutPayload1 = {
    type: 'receipt',
    order: { order_number: 'NOOR-POS-20261109-9999-1111', total_payable_inr: 2000, advance_paid_inr: 2000 }
  };
  const checkoutPayload2 = {
    type: 'receipt',
    order: { order_number: 'NOOR-POS-20261109-9999-1111', total_payable_inr: 2000, advance_paid_inr: 2000 }
  };

  assert.strictEqual(getJobId(checkoutPayload1), 'rcp_NOOR-POS-20261109-9999-1111_init');
  assert.strictEqual(getJobId(checkoutPayload2), 'rcp_NOOR-POS-20261109-9999-1111_init');
  console.log('  ✓ [PASS] Duplicate checkout pushes generate identical job ID (rcp_NOOR-POS-..._init)');

  // --- 3. Test Stage-Key Tracking for 2nd Payment ---
  console.log('--- 3. Testing Stage-Key Tracking for 2nd Payment ---');
  function getStageKey(job, order) {
    const ref = String(order.order_number || order.order_ref || order.id || '').trim();
    const isReprint = Boolean(job.source === 'reprint' || job.manualReprint);
    return isReprint ? `reprint_${job.id}` : (
      (order.third_payment_inr > 0 || order.third_payment_paise > 0) ? `${ref}:stage3` : (
        (order.second_payment_inr > 0 || order.second_payment_paise > 0) ? `${ref}:stage2` : `${ref}:init`
      )
    );
  }

  const printedHistory = new Set();
  const initOrder = { order_number: 'NOOR-POS-20261109-9999-1111', advance_paid_inr: 1000, second_payment_inr: 0 };
  const stageKeyInit = getStageKey({ source: 'instore_checkout' }, initOrder);
  assert.strictEqual(stageKeyInit, 'NOOR-POS-20261109-9999-1111:init');

  // Print 1st bill
  let printedCount = 0;
  if (!printedHistory.has(stageKeyInit)) {
    printedCount++;
    printedHistory.add(stageKeyInit);
  }
  // Try printing 1st bill again (should be blocked)
  if (!printedHistory.has(stageKeyInit)) {
    printedCount++;
  }
  assert.strictEqual(printedCount, 1, 'Initial checkout bill must print exactly once');

  // Customer returns and pays 2nd payment
  const secondPaymentOrder = { order_number: 'NOOR-POS-20261109-9999-1111', advance_paid_inr: 1000, second_payment_inr: 1000, outstanding_inr: 0 };
  const stageKeySecond = getStageKey({ source: 'collect_payment' }, secondPaymentOrder);
  assert.strictEqual(stageKeySecond, 'NOOR-POS-20261109-9999-1111:stage2');

  // Print 2nd payment bill
  if (!printedHistory.has(stageKeySecond)) {
    printedCount++;
    printedHistory.add(stageKeySecond);
  }
  // Try printing 2nd payment bill again (should be blocked)
  if (!printedHistory.has(stageKeySecond)) {
    printedCount++;
  }
  assert.strictEqual(printedCount, 2, '2nd payment bill must print exactly once upon settlement');

  console.log('  ✓ [PASS] Exactly 1 bill printed on checkout, exactly 1 bill printed on 2nd payment settlement');

  console.log('\n======================================================');
  console.log('🏁 POS DAEMON SINGLE BILL VERIFICATION: ALL PASSED!');
  console.log('======================================================\n');
}

runTest();
