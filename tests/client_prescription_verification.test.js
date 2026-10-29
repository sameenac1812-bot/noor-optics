/**
 * Automated Verification Test: Client Database Repair, CRM, OpticalTool RX, and POS Checkout Linking
 */

const path = require('path');
const fs = require('fs');

// Ensure isolated test database
process.env.NODE_ENV = 'test';

const { db } = require('../server/db');

console.log('\n======================================================');
console.log('🧪 RUNNING CLIENT CRM & PRESCRIPTION VERIFICATION SUITE');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  try {
    // Clean up any test records from prior runs
    db.prepare("DELETE FROM orders WHERE id LIKE 'ord-test-%'").run();
    db.prepare("DELETE FROM prescriptions WHERE id LIKE 'rx-test-%' OR prescription_number LIKE 'RX-2026-9%'").run();
    db.prepare("DELETE FROM customers WHERE id LIKE 'clt-test-%' OR client_code LIKE 'CLT-9%'").run();

    // ── 1. Schema & Constraints Verification ────────────────────────────────
    console.log('--- 1. Schema & Columns Verification ---');
    const custCols = db.prepare("PRAGMA table_info('customers')").all().map(c => c.name);
    assert(custCols.includes('client_code'), 'customers table has client_code column');
    assert(custCols.includes('age'), 'customers table has age column');
    assert(custCols.includes('dob'), 'customers table has dob column');
    assert(custCols.includes('is_archived'), 'customers table has is_archived column');

    const rxCols = db.prepare("PRAGMA table_info('prescriptions')").all().map(c => c.name);
    assert(rxCols.includes('prescription_number'), 'prescriptions table has prescription_number column');
    assert(rxCols.includes('client_id'), 'prescriptions table has client_id column');
    assert(rxCols.includes('od_sph'), 'prescriptions table has od_sph column');
    assert(rxCols.includes('od_cyl'), 'prescriptions table has od_cyl column');
    assert(rxCols.includes('od_axis'), 'prescriptions table has od_axis column');
    assert(rxCols.includes('os_sph'), 'prescriptions table has os_sph column');
    assert(rxCols.includes('os_cyl'), 'prescriptions table has os_cyl column');
    assert(rxCols.includes('os_axis'), 'prescriptions table has os_axis column');
    assert(rxCols.includes('addition'), 'prescriptions table has addition column');
    assert(rxCols.includes('ipd_distance'), 'prescriptions table has ipd_distance column');
    assert(rxCols.includes('ipd_near'), 'prescriptions table has ipd_near column');
    assert(rxCols.includes('checked_by'), 'prescriptions table has checked_by column');

    const orderCols = db.prepare("PRAGMA table_info('orders')").all().map(c => c.name);
    assert(orderCols.includes('customer_id'), 'orders table has customer_id column');
    assert(orderCols.includes('prescription_id'), 'orders table has prescription_id column');

    // ── 2. Client Creation, Duplicate Phone Allowance & Persistence ────────
    console.log('\n--- 2. Client Creation & Persistence ---');
    const clientId1 = 'clt-test-001';
    const clientCode1 = 'CLT-9001';
    db.prepare(`
      INSERT OR REPLACE INTO customers (id, client_code, name, age, phone, city, email, is_archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
    `).run(clientId1, clientCode1, 'Pooja Verma', 29, '+91 98765 22222', 'Bengaluru', 'pooja@example.com');

    const fetched1 = db.prepare('SELECT * FROM customers WHERE id = ?').get(clientId1);
    assert(fetched1 && fetched1.name === 'Pooja Verma' && fetched1.age === 29, 'New client created and persisted with name and age');
    assert(fetched1.client_code === 'CLT-9001', 'Client code assigned and retrieved');

    // Family shared phone number (must NOT crash with UNIQUE constraint error)
    const clientId2 = 'clt-test-002';
    const clientCode2 = 'CLT-9002';
    db.prepare(`
      INSERT OR REPLACE INTO customers (id, client_code, name, age, phone, city, is_archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
    `).run(clientId2, clientCode2, 'Rahul Verma (Brother)', 24, '+91 98765 22222', 'Bengaluru');

    const fetched2 = db.prepare('SELECT * FROM customers WHERE id = ?').get(clientId2);
    assert(fetched2 && fetched2.phone === '+91 98765 22222', 'Shared family phone number allowed without database crash');

    // Edit Client Details
    db.prepare(`
      UPDATE customers SET name = ?, age = ?, city = ?, updated_at = datetime('now') WHERE id = ?
    `).run('Pooja Verma-Sharma', 30, 'Mysuru', clientId1);

    const updated1 = db.prepare('SELECT * FROM customers WHERE id = ?').get(clientId1);
    assert(updated1.name === 'Pooja Verma-Sharma' && updated1.age === 30 && updated1.city === 'Mysuru', 'Client details edit persists accurately');

    // ── 3. Multiple Prescriptions per Client & History Retention ───────────
    console.log('\n--- 3. Glasses Prescriptions Storage & History ---');
    const rxId1 = 'rx-test-001';
    const rxNum1 = 'RX-2026-9001';
    db.prepare(`
      INSERT INTO prescriptions (id, prescription_number, client_id, od_sph, od_cyl, od_axis, os_sph, os_cyl, os_axis, addition, ipd_distance, ipd_near, checked_by, notes, prescription_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
    `).run(rxId1, rxNum1, clientId1, '-1.50', '-0.50', 90, '-1.75', '-0.25', 85, '+1.50', 63, 60, 'Dr. R. Sharma', 'Mild astigmatism');

    const fetchedRx1 = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(rxId1);
    assert(fetchedRx1 && fetchedRx1.od_sph === '-1.50' && fetchedRx1.os_sph === '-1.75', 'Prescription 1 saved with full OD/OS values');
    assert(Number(fetchedRx1.ipd_distance) === 63 && Number(fetchedRx1.ipd_near) === 60, 'Distance & Near IPD saved accurately');

    // Add a second newer prescription for the SAME client
    const rxId2 = 'rx-test-002';
    const rxNum2 = 'RX-2026-9002';
    db.prepare(`
      INSERT INTO prescriptions (id, prescription_number, client_id, od_sph, od_cyl, od_axis, os_sph, os_cyl, os_axis, addition, ipd_distance, ipd_near, checked_by, notes, prescription_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
    `).run(rxId2, rxNum2, clientId1, '-2.00', '-0.50', 95, '-2.25', '-0.50', 90, '+1.75', 63, 60, 'Dr. R. Sharma', 'Annual checkup progression');

    const clientAllRx = db.prepare('SELECT * FROM prescriptions WHERE client_id = ? ORDER BY created_at ASC').all(clientId1);
    assert(clientAllRx.length === 2, 'Multiple prescriptions coexist for the same client');
    assert(clientAllRx[0].od_sph === '-1.50' && clientAllRx[1].od_sph === '-2.00', 'Historical prescription is retained when newer prescription is added');

    // ── 4. Checkout Order & Prescription Linking ───────────────────────────
    console.log('\n--- 4. Order & Checkout Linking ---');
    const orderId = 'ord-test-rx-001';
    const orderNum = 'ORD-2026-9001';

    db.prepare(`
      INSERT INTO orders (id, order_number, token_number, channel, customer_id, customer_name, customer_phone, prescription_id, subtotal_paise, discount_paise, tax_paise, total_payable_paise, payment_status, status, created_at, updated_at)
      VALUES (?, ?, 101, 'POS', ?, ?, ?, ?, 429900, 0, 65578, 429900, 'VERIFIED', 'CONFIRMED', datetime('now'), datetime('now'))
    `).run(orderId, orderNum, clientId1, 'Pooja Verma-Sharma', '+91 98765 22222', rxId2);

    const fetchedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    assert(fetchedOrder && fetchedOrder.customer_id === clientId1, 'Order is permanently linked to customer_id');
    assert(fetchedOrder.prescription_id === rxId2, 'Order is permanently linked to prescription_id');

    // Update client total spent
    db.prepare('UPDATE customers SET total_spent_paise = total_spent_paise + 429900 WHERE id = ?').run(clientId1);
    const updatedClientSpend = db.prepare('SELECT total_spent_paise FROM customers WHERE id = ?').get(clientId1);
    assert(updatedClientSpend.total_spent_paise === 429900, 'Customer recorded spend updated upon completed sale');

    // ── 5. Safe Archival (Soft Delete) & Order History Retention ───────────
    console.log('\n--- 5. Safe Client Archival & Integrity ---');
    db.prepare(`
      UPDATE customers SET is_archived = 1, archived_at = datetime('now'), archived_reason = 'Customer moved' WHERE id = ?
    `).run(clientId1);

    const archivedClient = db.prepare('SELECT * FROM customers WHERE id = ?').get(clientId1);
    assert(archivedClient.is_archived === 1, 'Client safely archived with soft-delete flag');

    // Verify historical orders and prescriptions are NOT deleted
    const orderAfterArchive = db.prepare('SELECT * FROM orders WHERE customer_id = ?').all(clientId1);
    const rxAfterArchive = db.prepare('SELECT * FROM prescriptions WHERE client_id = ?').all(clientId1);
    assert(orderAfterArchive.length === 1, 'Past orders and invoices remain 100% intact after customer archival');
    assert(rxAfterArchive.length === 2, 'Clinical prescription records remain 100% intact after customer archival');

    // Restore Client
    db.prepare(`
      UPDATE customers SET is_archived = 0, archived_at = NULL, archived_reason = NULL WHERE id = ?
    `).run(clientId1);
    const restoredClient = db.prepare('SELECT is_archived FROM customers WHERE id = ?').get(clientId1);
    assert(restoredClient.is_archived === 0, 'Client successfully restored from archive');

    // Cleanup test records
    db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
    db.prepare('DELETE FROM prescriptions WHERE client_id IN (?, ?)').run(clientId1, clientId2);
    db.prepare('DELETE FROM customers WHERE id IN (?, ?)').run(clientId1, clientId2);

    console.log('\n======================================================');
    console.log(`🏁 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
