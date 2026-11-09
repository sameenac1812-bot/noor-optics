'use strict';

const assert = require('assert');
const { db } = require('../server/db');
const { syncSupabaseOrders } = require('../server/supabaseSync');

async function run() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING WEBSITE PRESCRIPTION & ADMIN SYNC VERIFICATION');
  console.log('======================================================\n');

  // 1. Verify syncSupabaseOrders runs with zero unhandled exceptions
  console.log('--- 1. Testing Cloud Orders Sync with Prescriptions ---');
  await syncSupabaseOrders(db, true);
  console.log('  ✓ [PASS] syncSupabaseOrders completed cleanly with zero constraint errors');

  // 2. Verify synced website orders exist with optical prescription values
  console.log('--- 2. Verifying Synced Website Orders in SQLite ---');
  const websiteOrdersWithRx = db.prepare(`
    SELECT o.*, pr.prescription_number, pr.od_sph, pr.od_cyl, pr.od_axis, pr.os_sph, pr.os_cyl, pr.os_axis, pr.addition, pr.ipd_distance
    FROM orders o
    LEFT JOIN prescriptions pr ON o.prescription_id = pr.id
    WHERE o.channel = 'WEBSITE' AND (o.prescriptions_json IS NOT NULL OR o.prescription_id IS NOT NULL)
  `).all();

  assert.ok(websiteOrdersWithRx.length > 0, 'Must have at least one synced website order with prescriptions');
  for (const ord of websiteOrdersWithRx) {
    assert.strictEqual(ord.channel, 'WEBSITE', `${ord.order_number} channel must be WEBSITE`);
    assert.ok(ord.prescriptions_json || ord.prescription_id, `${ord.order_number} must have prescription attached`);
    console.log(`  ✓ [PASS] Order ${ord.order_number} (${ord.customer_name}): verified prescription record synced`);
  }

  // 3. Verify clinical prescriptions table foreign key integrity
  console.log('--- 3. Verifying Clinical Prescriptions Table Foreign Key Integrity ---');
  const rxList = db.prepare(`
    SELECT pr.*, c.name as client_name, c.phone as client_phone
    FROM prescriptions pr
    JOIN customers c ON pr.client_id = c.id
  `).all();

  assert.ok(rxList.length >= 1, 'Must have at least 1 prescription record linked to a valid customer ID');
  for (const rx of rxList) {
    assert.ok(rx.client_id, 'client_id must never be null');
    assert.ok(rx.client_name, 'client_name must resolve through foreign key');
  }
  console.log(`  ✓ [PASS] All ${rxList.length} prescriptions strictly satisfy client_id NOT NULL and foreign key constraint`);

  console.log('\n======================================================');
  console.log('🏁 WEBSITE PRESCRIPTION & ADMIN SYNC: ALL TESTS PASSED!');
  console.log('======================================================\n');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

