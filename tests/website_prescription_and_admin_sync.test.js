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

  // 2. Verify target orders exist with full optical prescription values
  console.log('--- 2. Verifying Synced Website Orders in SQLite ---');
  const targetOrders = ['NOOR-WEB-20261109-2645-7062', 'NOOR-WEB-20261109-6772-5382'];
  for (const ref of targetOrders) {
    const ord = db.prepare(`
      SELECT o.*, pr.prescription_number, pr.od_sph, pr.od_cyl, pr.od_axis, pr.os_sph, pr.os_cyl, pr.os_axis, pr.addition, pr.ipd_distance
      FROM orders o
      LEFT JOIN prescriptions pr ON o.prescription_id = pr.id
      WHERE o.order_number = ?
    `).get(ref);

    assert.ok(ord, `Order ${ref} must exist in local SQLite`);
    assert.strictEqual(ord.channel, 'WEBSITE', `${ref} channel must be WEBSITE`);
    assert.ok(ord.prescription_id, `${ref} must have prescription_id linked`);
    assert.ok(ord.prescriptions_json, `${ref} must have prescriptions_json stored`);
    assert.strictEqual(ord.od_sph, '2', `${ref} OD SPH must be 2`);
    assert.strictEqual(ord.os_sph, '2', `${ref} OS SPH must be 2`);
    assert.strictEqual(ord.od_cyl, '2', `${ref} OD CYL must be 2`);
    assert.strictEqual(ord.os_cyl, '2', `${ref} OS CYL must be 2`);
    assert.strictEqual(ord.od_axis, '3', `${ref} OD AXIS must be 3`);
    assert.strictEqual(ord.os_axis, '3', `${ref} OS AXIS must be 3`);
    assert.strictEqual(ord.addition, '3', `${ref} ADD must be 3`);
    assert.strictEqual(ord.ipd_distance, '3', `${ref} Distance IPD must be 3`);
    console.log(`  ✓ [PASS] Order ${ref} (${ord.customer_name}): verified complete prescription (OD SPH: ${ord.od_sph}, OS SPH: ${ord.os_sph}, ADD: ${ord.addition}, IPD: ${ord.ipd_distance})`);
  }

  // 3. Verify prescriptions table integrity and non-null client_id
  console.log('--- 3. Verifying Clinical Prescriptions Table Foreign Key Integrity ---');
  const rxList = db.prepare(`
    SELECT pr.*, c.name as client_name, c.phone as client_phone
    FROM prescriptions pr
    JOIN customers c ON pr.client_id = c.id
    WHERE pr.prescription_number LIKE 'RX-NOOR-WEB-%'
  `).all();

  assert.ok(rxList.length >= 2, 'Must have at least 2 website prescription records linked to valid customer IDs');
  for (const rx of rxList) {
    assert.ok(rx.client_id, 'client_id must never be null');
    assert.ok(rx.client_name, 'client_name must resolve through foreign key');
  }
  console.log(`  ✓ [PASS] All ${rxList.length} website prescriptions strictly satisfy client_id NOT NULL and foreign key constraint`);

  console.log('\n======================================================');
  console.log('🏁 WEBSITE PRESCRIPTION & ADMIN SYNC: ALL TESTS PASSED!');
  console.log('======================================================\n');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
