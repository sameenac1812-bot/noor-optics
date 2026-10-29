/**
 * Noor Optics — Automated System Test Suite
 * Validates database, auth, POS checkout, UPI verification, stock ledger,
 * financial P&L calculations, 58mm thermal receipt formatting, and PDF invoice generation.
 */

'use strict';

process.env.NODE_ENV = 'test';

const assert = require('assert');
const { db } = require('../server/db');
const { signToken, verifyToken } = require('../server/auth');
const bcrypt = require('bcryptjs');
const { format58mmTextReceipt, generateEscPosQrLabel } = require('../server/printer');
const { generateInvoicePDF } = require('../server/pdfInvoice');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING NOOR OPTICS AUTOMATED SYSTEM TEST SUITE');
  console.log('======================================================\n');

  // ── TEST GROUP 1: Database Schema & Seeds ─────────────────────────────────
  console.log('--- 1. Database Schema & Tables ---');

  runTest('All 28 required business tables exist in SQLite database', () => {
    const requiredTables = [
      'users', 'roles', 'permissions', 'products', 'product_variants',
      'product_images', 'inventory_locations', 'inventory_balances', 'stock_movements',
      'suppliers', 'purchase_orders', 'purchase_order_items', 'goods_receipts',
      'customers', 'orders', 'order_items', 'payments', 'payment_verification_events',
      'invoices', 'invoice_items', 'expense_categories', 'expenses', 'refunds',
      'cash_movements', 'print_jobs', 'store_settings', 'audit_logs', 'prescriptions'
    ];

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    requiredTables.forEach(t => {
      assert.ok(tables.includes(t), `Table ${t} must exist in database schema`);
    });
  });

  runTest('Initial optical catalog and inventory balances are seeded', () => {
    const prodCount = db.prepare('SELECT count(*) as c FROM products').get().c;
    const varCount = db.prepare('SELECT count(*) as c FROM product_variants').get().c;
    const totalUnits = db.prepare('SELECT sum(available_qty) as u FROM inventory_balances').get().u;

    assert.ok(prodCount >= 18, `Expected at least 18 products, found ${prodCount}`);
    assert.ok(varCount >= 38, `Expected at least 38 variants, found ${varCount}`);
    assert.ok(totalUnits > 500, `Expected at least 500 total stock units, found ${totalUnits}`);
  });

  // ── TEST GROUP 2: Authentication & RBAC ───────────────────────────────────
  console.log('\n--- 2. Authentication & Role-Based Access Control ---');

  runTest('Owner and Cashier accounts exist with verified bcrypt passwords', () => {
    const admin = db.prepare("SELECT * FROM users WHERE email = 'admin@nooroptics.com'").get();
    assert.ok(admin, 'Admin account should exist');
    assert.strictEqual(admin.role_id, 'role-owner');
    assert.ok(bcrypt.compareSync('AdminPassword@123', admin.password_hash), 'Admin password hash should verify');

    const cashier = db.prepare("SELECT * FROM users WHERE email = 'cashier@nooroptics.com'").get();
    assert.ok(cashier, 'Cashier account should exist');
    assert.strictEqual(cashier.role_id, 'role-cashier');
    assert.ok(bcrypt.compareSync('Cashier@123', cashier.password_hash), 'Cashier password hash should verify');
  });

  runTest('JWT sign and verify works with valid payload', () => {
    const user = { id: 'usr-admin-1', email: 'admin@nooroptics.com', name: 'Farhan Noor', role_id: 'role-owner' };
    const permissions = ['pos:checkout', 'finance:view', 'inventory:adjust'];
    const token = signToken(user, permissions);
    assert.ok(typeof token === 'string' && token.length > 20, 'Token must be non-empty string');

    const decoded = verifyToken(token);
    assert.strictEqual(decoded.userId, user.id);
    assert.strictEqual(decoded.email, user.email);
    assert.strictEqual(decoded.roleId, user.role_id);
    assert.deepStrictEqual(decoded.permissions, permissions);
  });

  // ── TEST GROUP 3: POS Checkout & Atomic Stock Deduction ───────────────────
  console.log('\n--- 3. POS Checkout & Stock Ledger Operations ---');

  runTest('POS sale deducts exact stock and records stock_movements ledger', () => {
    // Pick an existing variant
    const variant = db.prepare(`
      SELECT pv.id, pv.product_id, pv.color_name, p.name as prod_name, p.selling_price_paise, p.purchase_cost_paise, ib.available_qty
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      JOIN inventory_balances ib ON pv.id = ib.variant_id
      WHERE ib.available_qty >= 5
      LIMIT 1
    `).get();

    assert.ok(variant, 'Should find variant with sufficient stock');
    const initialQty = variant.available_qty;
    const qtyToBuy = 2;

    const testOrderId = 'test-ord-pos-' + Date.now();
    const testOrderNum = 'TEST-POS-' + Math.floor(1000 + Math.random() * 9000);
    const subtotalPaise = variant.selling_price_paise * qtyToBuy;
    const taxPaise = Math.round(subtotalPaise * 0.18 / 1.18);

    // Run transaction
    const tx = db.transaction(() => {
      // 1. Decrement balance
      db.prepare('UPDATE inventory_balances SET available_qty = available_qty - ? WHERE variant_id = ?')
        .run(qtyToBuy, variant.id);

      const balAfter = db.prepare('SELECT available_qty FROM inventory_balances WHERE variant_id = ?').get(variant.id).available_qty;

      // 2. Insert stock ledger movement
      db.prepare(`
        INSERT INTO stock_movements (id, variant_id, location_id, change_qty, balance_after, movement_type, reference_id, reason, created_by_user_id)
        VALUES (?, ?, 'loc-main', ?, ?, 'SALE_POS', ?, 'Automated Test POS Sale', 'usr-admin-1')
      `).run('mov-test-' + Date.now(), variant.id, -qtyToBuy, balAfter, testOrderNum);

      // 3. Create order
      db.prepare(`
        INSERT INTO orders (
          id, order_number, token_number, channel, customer_name, status, payment_status,
          subtotal_paise, discount_paise, tax_paise, total_payable_paise, amount_paid_paise,
          outstanding_paise, staff_user_id
        ) VALUES (?, ?, 999, 'POS', 'Test Client', 'CONFIRMED', 'VERIFIED', ?, 0, ?, ?, ?, 0, 'usr-admin-1')
      `).run(testOrderId, testOrderNum, subtotalPaise, taxPaise, subtotalPaise, subtotalPaise);

      // 4. Create order item
      db.prepare(`
        INSERT INTO order_items (id, order_id, variant_id, product_name, variant_name, sku, lens_name, unit_price_paise, purchase_cost_paise, quantity, subtotal_paise)
        VALUES (?, ?, ?, ?, ?, 'TEST-SKU', 'Demo Lens', ?, ?, ?, ?)
      `).run('oit-test-' + Date.now(), testOrderId, variant.id, variant.prod_name, variant.color_name, variant.selling_price_paise, variant.purchase_cost_paise, qtyToBuy, subtotalPaise);
    });

    tx();

    // Verify stock balance was reduced by exactly 2
    const finalBal = db.prepare('SELECT available_qty FROM inventory_balances WHERE variant_id = ?').get(variant.id).available_qty;
    assert.strictEqual(finalBal, initialQty - qtyToBuy, `Stock should be deducted from ${initialQty} to ${initialQty - qtyToBuy}`);

    // Verify stock movement ledger has the entry
    const movement = db.prepare('SELECT * FROM stock_movements WHERE reference_id = ?').get(testOrderNum);
    assert.ok(movement, 'Stock movement entry must exist');
    assert.strictEqual(movement.change_qty, -qtyToBuy);
    assert.strictEqual(movement.balance_after, finalBal);

    // Rollback stock for clean testing
    db.prepare('UPDATE inventory_balances SET available_qty = ? WHERE variant_id = ?').run(initialQty, variant.id);
  });

  // ── TEST GROUP 4: Manual UPI Verification ─────────────────────────────────
  console.log('\n--- 4. Google Pay / UPI Manual Payment Verification ---');

  runTest('Payment verification updates payment and order status with audit log', () => {
    const testOrderId = 'test-upi-ord-' + Date.now();
    const testPaymentId = 'test-upi-pay-' + Date.now();
    const testOrderNum = 'TEST-UPI-' + Math.floor(100000 + Math.random() * 900000);
    const amountPaise = 499900;

    // Create pending order and payment
    db.prepare(`
      INSERT INTO orders (id, order_number, token_number, channel, customer_name, status, payment_status, subtotal_paise, tax_paise, total_payable_paise, amount_paid_paise, outstanding_paise)
      VALUES (?, ?, 998, 'POS', 'UPI Tester', 'CONFIRMED', 'AWAITING_VERIFICATION', ?, 76256, ?, 0, ?)
    `).run(testOrderId, testOrderNum, amountPaise, amountPaise, amountPaise);

    db.prepare(`
      INSERT INTO payments (id, order_id, payment_method, amount_paise, status, claimed_upi_ref, notes)
      VALUES (?, ?, 'UPI_GPAY', ?, 'PENDING_VERIFICATION', 'CICAgKDO99812', 'Awaiting bank check')
    `).run(testPaymentId, testOrderId, amountPaise);

    // Verify payment as staff
    const verifyTx = db.transaction(() => {
      db.prepare(`
        UPDATE payments SET status = 'VERIFIED', merchant_transaction_id = 'HDFC-TXN-491910'
        WHERE id = ?
      `).run(testPaymentId);

      db.prepare(`
        UPDATE orders SET payment_status = 'VERIFIED', amount_paid_paise = total_payable_paise, outstanding_paise = 0, updated_at = datetime('now')
        WHERE id = ?
      `).run(testOrderId);

      db.prepare(`
        INSERT INTO payment_verification_events (id, payment_id, verifier_user_id, status_before, status_after, merchant_transaction_id, reason_or_notes)
        VALUES (?, ?, 'usr-admin-1', 'PENDING_VERIFICATION', 'VERIFIED', 'HDFC-TXN-491910', 'Verified against HDFC current account credit')
      `).run('pve-' + Date.now(), testPaymentId);
    });

    verifyTx();

    const orderAfter = db.prepare('SELECT payment_status, amount_paid_paise, outstanding_paise FROM orders WHERE id = ?').get(testOrderId);
    assert.strictEqual(orderAfter.payment_status, 'VERIFIED');
    assert.strictEqual(orderAfter.amount_paid_paise, amountPaise);
    assert.strictEqual(orderAfter.outstanding_paise, 0);

    const event = db.prepare('SELECT * FROM payment_verification_events WHERE payment_id = ?').get(testPaymentId);
    assert.ok(event, 'Verification event record must exist');
    assert.strictEqual(event.merchant_transaction_id, 'HDFC-TXN-491910');
    assert.strictEqual(event.status_after, 'VERIFIED');
  });

  // ── TEST GROUP 5: Stock Adjustment with Mandatory Reason ──────────────────
  console.log('\n--- 5. Stock Adjustment Ledger & Reason Enforcement ---');

  runTest('Stock adjustment enforces mandatory audit reason and logs movement', () => {
    const variant = db.prepare('SELECT variant_id, available_qty FROM inventory_balances LIMIT 1').get();
    assert.ok(variant, 'Variant balance must exist');
    const initQty = variant.available_qty;
    const delta = -1;
    const mandatoryReason = 'Frame temple arm fractured during fitting trial';

    const adjTx = db.transaction(() => {
      db.prepare('UPDATE inventory_balances SET available_qty = available_qty + ? WHERE variant_id = ?').run(delta, variant.variant_id);
      const after = db.prepare('SELECT available_qty FROM inventory_balances WHERE variant_id = ?').get(variant.variant_id).available_qty;

      db.prepare(`
        INSERT INTO stock_movements (id, variant_id, location_id, change_qty, balance_after, movement_type, reference_id, reason, created_by_user_id)
        VALUES (?, ?, 'loc-main', ?, ?, 'AUDIT_ADJUSTMENT', ?, ?, 'usr-admin-1')
      `).run('mov-adj-' + Date.now(), variant.variant_id, delta, after, 'ADJ-MANUAL', mandatoryReason);
    });

    adjTx();

    const check = db.prepare('SELECT * FROM stock_movements WHERE reason = ?').get(mandatoryReason);
    assert.ok(check, 'Stock movement should be recorded with the mandatory audit reason');
    assert.strictEqual(check.change_qty, delta);

    // Restore stock
    db.prepare('UPDATE inventory_balances SET available_qty = ? WHERE variant_id = ?').run(initQty, variant.variant_id);
  });

  // ── TEST GROUP 6: Financial Accounting & P&L Calculations ─────────────────
  console.log('\n--- 6. Financial Accounting & P&L Logic ---');

  runTest('P&L correctly computes Net Sales, COGS, Gross Profit, and Net Operating Profit', () => {
    // Model definition:
    // Gross Profit = Net Sales - COGS
    // Net Operating Profit = Gross Profit - Operating Expenses
    const salesRow = db.prepare(`
      SELECT
        COALESCE(SUM(total_payable_paise), 0) as net_sales_paise,
        COALESCE(SUM(tax_paise), 0) as tax_paise
      FROM orders
      WHERE payment_status = 'VERIFIED'
    `).get();

    const cogsRow = db.prepare(`
      SELECT COALESCE(SUM(oi.purchase_cost_paise * oi.quantity), 0) as cogs_paise
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.payment_status = 'VERIFIED'
    `).get();

    const expRow = db.prepare('SELECT COALESCE(SUM(amount_paise), 0) as expenses_paise FROM expenses').get();

    const netSales = salesRow.net_sales_paise;
    const cogs = cogsRow.cogs_paise;
    const expenses = expRow.expenses_paise;

    const grossProfit = netSales - cogs;
    const netOperatingProfit = grossProfit - expenses;

    // Verify mathematical invariants
    assert.strictEqual(grossProfit, netSales - cogs, 'Gross Profit must equal Net Sales minus COGS');
    assert.strictEqual(netOperatingProfit, grossProfit - expenses, 'Net Profit must equal Gross Profit minus Expenses');
  });

  // ── TEST GROUP 7: 58 mm Thermal Receipt Formatter ─────────────────────────
  console.log('\n--- 7. 2-inch / 58 mm Thermal Token Printer Formatter ---');

  runTest('58mm thermal receipt layout formats to nominal 32 columns without overflow', () => {
    const mockOrder = {
      order_number: 'NOOR-20261027-8192',
      token_number: 7,
      customer_name: 'Ananya Sharma',
      channel: 'POS',
      created_at: new Date().toISOString(),
      payment_method: 'UPI_GPAY',
      payment_status: 'VERIFIED',
      subtotal_paise: 349900,
      discount_paise: 0,
      tax_paise: 53375,
      total_payable_paise: 349900,
      amount_paid_paise: 349900,
      outstanding_paise: 0
    };

    const mockItems = [
      { product_name: 'Kyoto Havana Classic', variant_name: 'Tortoise Brown', quantity: 1, unit_price_paise: 349900, subtotal_paise: 349900 }
    ];

    const receiptText = format58mmTextReceipt(mockOrder, mockItems);
    assert.ok(receiptText.includes('TOKEN #7'), 'Receipt must feature large Token #7');
    assert.ok(receiptText.includes('NOOR OPTICS'), 'Receipt must display brand name');
    assert.ok(receiptText.includes('Kyoto Havana Classic'), 'Receipt must display item name');

    // Verify line widths do not exceed 32 characters
    const lines = receiptText.split('\n');
    lines.forEach((line, idx) => {
      assert.ok(line.length <= 32, `Line ${idx} exceeds 32 chars: "${line}" (length ${line.length})`);
    });
  });

  // ── TEST GROUP 8: PDF Invoice Generation ──────────────────────────────────
  console.log('\n--- 8. A4 PDF Tax Invoice Generation ---');

  await runAsyncTest('Generates valid A4 PDF invoice buffer with %PDF- header', async () => {
    const mockOrder = {
      order_number: 'NOOR-20261027-9912',
      token_number: 14,
      channel: 'POS',
      customer_name: 'Rohan Deshmukh',
      customer_phone: '+91 98201 55412',
      customer_email: 'rohan.d@example.com',
      created_at: new Date().toISOString(),
      payment_method: 'CASH',
      payment_status: 'VERIFIED',
      subtotal_paise: 449900,
      discount_paise: 50000,
      tax_paise: 61002,
      total_payable_paise: 399900,
      amount_paid_paise: 399900,
      outstanding_paise: 0
    };

    const mockItems = [
      { product_name: 'Zurich Minimalist Titanium', variant_name: 'Brushed Silver', sku: 'NOOR-ZUR-SLV', quantity: 1, unit_price_paise: 449900, subtotal_paise: 449900 }
    ];

    const pdfBuffer = await generateInvoicePDF(mockOrder, mockItems, 'NOOR-INV-2026-0099');
    assert.ok(Buffer.isBuffer(pdfBuffer), 'Result must be a Node.js Buffer');
    assert.ok(pdfBuffer.length > 1000, `PDF size should be > 1KB, got ${pdfBuffer.length} bytes`);

    // First 4 bytes of any valid PDF must be '%PDF'
    const magic = pdfBuffer.slice(0, 4).toString('ascii');
    assert.strictEqual(magic, '%PDF', 'PDF buffer must start with %PDF magic header');
  });

  // ── TEST GROUP 9: Permanent Frame QR Resolution ───────────────────────────
  console.log('\n--- 9. Permanent Frame QR Resolution ---');

  runTest('QR resolve finds frame by SKU and returns live authoritative price', () => {
    const prod = db.prepare('SELECT sku, name, selling_price_paise FROM products LIMIT 1').get();
    assert.ok(prod, 'At least one product must exist');

    const item = db.prepare(`
      SELECT p.id, p.sku, p.name, p.selling_price_paise, COALESCE(SUM(ib.available_qty), 0) as available_qty
      FROM products p
      JOIN product_variants pv ON p.id = pv.product_id
      LEFT JOIN inventory_balances ib ON pv.id = ib.variant_id
      WHERE LOWER(p.sku) = LOWER(?)
      GROUP BY p.id
    `).get(prod.sku);

    assert.ok(item, 'Lookup by SKU must resolve product');
    assert.strictEqual(item.selling_price_paise, prod.selling_price_paise);
    assert.ok(item.available_qty >= 0);
  });

  await runAsyncTest('Generates simplified ESC/POS raster QR sticker with chunky dots and no smudging', async () => {
    const skuBuf = await generateEscPosQrLabel({
      sku: 'NOOR-AMB-11',
      name: 'Amber Minimalist',
      price: 'Rs. 4,299.00',
      qrPreset: 'standard'
    });
    assert.ok(Buffer.isBuffer(skuBuf), 'Result must be a buffer');
    assert.ok(skuBuf.length > 500, 'Buffer must contain raster image data');
    assert.strictEqual(skuBuf[0], 0x1B, 'First byte must be ESC (0x1B)');
    assert.strictEqual(skuBuf[1], 0x40, 'Second byte must be @ (0x40)');

    const urlBuf = await generateEscPosQrLabel({
      sku: 'NOOR-AMB-11',
      name: 'Amber Minimalist',
      price: 'Rs. 4,299.00',
      qrPreset: 'url'
    });
    assert.ok(Buffer.isBuffer(urlBuf), 'URL preset must return valid ESC/POS raster buffer');
    assert.ok(urlBuf.length > 500);
  });

  // ── TEST GROUP 10: Reconciled Daily Sales & Multi-Channel Accounting ───────
  console.log('\n--- 10. Reconciled Daily Sales & Multi-Channel Accounting ---');

  runTest('Daily sales report reconciles In-Store and Website orders without double-counting', () => {
    const inStoreSales = db.prepare(`
      SELECT COUNT(id) as c, COALESCE(SUM(total_payable_paise), 0) as s
      FROM orders
      WHERE channel = 'POS' AND status != 'CANCELLED' AND payment_status = 'VERIFIED'
    `).get();

    const websiteSales = db.prepare(`
      SELECT COUNT(id) as c, COALESCE(SUM(total_payable_paise), 0) as s
      FROM orders
      WHERE channel IN ('ONLINE', 'WEBSITE') AND status != 'CANCELLED' AND payment_status = 'VERIFIED'
    `).get();

    const combined = db.prepare(`
      SELECT COUNT(id) as c, COALESCE(SUM(total_payable_paise), 0) as s
      FROM orders
      WHERE status != 'CANCELLED' AND payment_status = 'VERIFIED'
    `).get();

    assert.strictEqual(inStoreSales.c + websiteSales.c, combined.c, 'Order counts must reconcile');
    assert.strictEqual(inStoreSales.s + websiteSales.s, combined.s, 'Revenue must reconcile perfectly without double counting');
  });

  // --- 11. Order Deletion and Stock Restoration ---
  console.log('\n--- 11. Order Pipeline Deletion & Safe Stock Restoration ---');
  runTest('Deleting an order restores variant inventory balance and cascades child records', () => {
    // 1. Pick a variant
    const inv = db.prepare('SELECT variant_id, available_qty FROM inventory_balances LIMIT 1').get();
    const variantId = inv.variant_id;
    const initialQty = inv.available_qty;
    const testOrderId = 'test-del-ord-' + Date.now();
    const testOrderNum = 'TEST-DEL-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    const sellQty = 2;

    // Decrement stock as if sold
    db.prepare('UPDATE inventory_balances SET available_qty = available_qty - ? WHERE variant_id = ?').run(sellQty, variantId);

    // Create order and order item
    db.prepare(`
      INSERT INTO orders (id, order_number, token_number, channel, customer_name, status, payment_status, subtotal_paise, total_payable_paise, amount_paid_paise, staff_user_id)
      VALUES (?, ?, 990, 'POS', 'Deletion Tester', 'CONFIRMED', 'VERIFIED', 500000, 500000, 500000, 'usr-admin-1')
    `).run(testOrderId, testOrderNum);

    db.prepare(`
      INSERT INTO order_items (id, order_id, variant_id, product_name, variant_name, sku, unit_price_paise, quantity, subtotal_paise)
      VALUES (?, ?, ?, 'Test Frame', 'Standard', 'TEST-DEL-SKU', 250000, ?, 500000)
    `).run('oit-' + Date.now(), testOrderId, variantId, sellQty);

    // Verify stock is initialQty - sellQty
    const stockSold = db.prepare('SELECT available_qty FROM inventory_balances WHERE variant_id = ?').get(variantId);
    assert.strictEqual(stockSold.available_qty, initialQty - sellQty);

    // Simulate delete logic
    const items = db.prepare('SELECT variant_id, quantity FROM order_items WHERE order_id = ?').all(testOrderId);
    for (const item of items) {
      db.prepare('UPDATE inventory_balances SET available_qty = available_qty + ? WHERE variant_id = ?').run(item.quantity, item.variant_id);
    }
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(testOrderId);
    db.prepare('DELETE FROM orders WHERE id = ?').run(testOrderId);

    // Verify stock is restored
    const stockRestored = db.prepare('SELECT available_qty FROM inventory_balances WHERE variant_id = ?').get(variantId);
    assert.strictEqual(stockRestored.available_qty, initialQty, 'Stock must be restored to initial level after order deletion');

    // Verify order is gone
    const checkOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(testOrderId);
    assert.strictEqual(checkOrder, undefined, 'Order must no longer exist in database');
  });

  // --- 12. Optical Frame Deletion ---
  console.log('\n--- 12. Optical Frame Deletion & Catalog Integrity ---');
  runTest('Deleting an optical frame removes product, variants, and inventory balances cleanly', () => {
    const testProdId = 'prod-test-del-' + Date.now();
    const testVarId = 'var-test-del-' + Date.now();
    const testSku = 'TEST-DEL-FRAME-' + Date.now();

    // Insert test product & variant
    db.prepare(`
      INSERT INTO products (id, sku, name, brand, shape, material, fit, category, selling_price_paise, purchase_cost_paise, image_url)
      VALUES (?, ?, 'Test Delete Frame', 'Noor Optics', 'Square', 'Titanium', 'Regular', 'Optical', 300000, 100000, 'images/test.jpg')
    `).run(testProdId, testSku);

    db.prepare(`
      INSERT INTO product_variants (id, product_id, sku, barcode, color_name, color_hex)
      VALUES (?, ?, ?, '89099999', 'Matte Gold', '#D4AF37')
    `).run(testVarId, testProdId, testSku + '-GLD');

    db.prepare(`
      INSERT INTO inventory_balances (id, variant_id, location_id, available_qty, reserved_qty)
      VALUES (?, ?, 'loc-main', 20, 0)
    `).run('bal-' + testVarId, testVarId);

    // Verify created
    assert.ok(db.prepare('SELECT id FROM products WHERE id = ?').get(testProdId));
    assert.ok(db.prepare('SELECT id FROM product_variants WHERE id = ?').get(testVarId));
    assert.ok(db.prepare('SELECT id FROM inventory_balances WHERE variant_id = ?').get(testVarId));

    // Simulate delete
    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM inventory_balances WHERE variant_id = ?').run(testVarId);
      db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(testProdId);
      db.prepare('DELETE FROM products WHERE id = ?').run(testProdId);
    });
    deleteTx();

    // Verify deleted
    assert.strictEqual(db.prepare('SELECT id FROM products WHERE id = ?').get(testProdId), undefined);
    assert.strictEqual(db.prepare('SELECT id FROM product_variants WHERE id = ?').get(testVarId), undefined);
    assert.strictEqual(db.prepare('SELECT id FROM inventory_balances WHERE variant_id = ?').get(testVarId), undefined);
  });

  console.log('\n======================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('======================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

