const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { format25InchEscPosReceipt, format25InchEscPosQrSticker } = require('../pos-daemon/pos-daemon');
const { db } = require('../server/db');

console.log('\n======================================================');
console.log('🧪 RUNNING DUAL-CHANNEL ORDER & ITEM QR PRINTING TEST');
console.log('======================================================\n');

// 1. Verify Target Order NOOR-POS-20261103-1979-5424
console.log('--- 1. Order NOOR-POS-20261103-1979-5424 Integrity ---');
let order = db.prepare('SELECT * FROM orders WHERE order_number LIKE ?').get('%1979%');
if (!order) {
  const rxId = 'rx-1793685601980-1676';
  db.prepare(`
    INSERT INTO orders (id, order_number, token_number, channel, customer_name, customer_phone, subtotal_paise, total_payable_paise, status, payment_status, prescription_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('ord-pos-1979', 'NOOR-POS-20261103-1979-5424', 1979, 'POS', 'ng raion', '9876543210', 142800, 142800, 'CONFIRMED', 'VERIFIED', rxId);
  order = db.prepare('SELECT * FROM orders WHERE id = ?').get('ord-pos-1979');
}
assert(order, 'Order 1979 must exist in SQLite database');
assert.strictEqual(order.order_number, 'NOOR-POS-20261103-1979-5424');
assert.strictEqual(order.customer_name, 'ng raion');

let items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
if (items.length === 0) {
  db.prepare(`
    INSERT INTO order_items (id, order_id, product_name, variant_name, sku, unit_price_paise, quantity, subtotal_paise)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('oit-1979-1', order.id, 'Burberry Amber Tartan', 'Amber Gold', 'NOOR-BUR-44', 142800, 1, 142800);
  items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
}
assert(items.length > 0, 'Order 1979 must have at least 1 item');
assert.strictEqual(items[0].product_name, 'Burberry Amber Tartan');

const rx = order.prescription_id ? db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(order.prescription_id) : null;
assert(rx, 'Order 1979 must have linked prescription');
assert.strictEqual(rx.od_sph, '+0.75');
assert.strictEqual(rx.od_cyl, '-0.75');
console.log('  ✓ [PASS] Order NOOR-POS-20261103-1979-5424 found with clinical Rx (OD: +0.75 / -0.75)');

// 2. Format Receipt & Verify Output Contents
console.log('\n--- 2. Thermal Receipt Formatting ---');
const receiptBuf = format25InchEscPosReceipt({ ...order, items, prescription: rx });
assert(Buffer.isBuffer(receiptBuf), 'Receipt must return binary ESC/POS buffer');
assert(receiptBuf.length > 5000, 'Receipt buffer should contain graphics and text');

const receiptAscii = receiptBuf.toString('latin1');
assert(receiptAscii.includes('5424') || receiptAscii.includes('1979'), 'Receipt must contain invoice number');
assert(receiptAscii.includes('ng raion'), 'Receipt must contain client name');
assert(receiptAscii.includes('Burberry Amber'), 'Receipt must contain product name');
assert(receiptAscii.includes('+0.75'), 'Receipt must contain OD SPH');
console.log('  ✓ [PASS] Receipt binary contains complete prescription and bill details');

// 3. Format Item QR Sticker (Anti-Blotting Engine)
console.log('\n--- 3. Frame QR Sticker Anti-Blotting Engine ---');
format25InchEscPosQrSticker({
  sku: 'NOOR-BRB-54',
  name: 'Burberry Amber Tartan',
  price: 'Rs. 1,428',
  brand: 'Burberry'
}).then(stickerBuf => {
  assert(Buffer.isBuffer(stickerBuf), 'Sticker must return binary buffer');
  assert(stickerBuf.length > 3000, 'Sticker buffer should contain GS v 0 raster graphics');

  // Verify ESC/POS Header: ESC @ (0x1B 0x40) and GS v 0 (0x1D 0x76 0x30 0x00)
  assert.strictEqual(stickerBuf[0], 0x1B, 'Must begin with ESC');
  assert.strictEqual(stickerBuf[1], 0x40, 'Must begin with @');
  assert.strictEqual(stickerBuf[2], 0x1D, 'Must contain GS');
  assert.strictEqual(stickerBuf[3], 0x76, 'Must contain v');
  assert.strictEqual(stickerBuf[4], 0x30, 'Must contain 0 (raster)');
  console.log('  ✓ [PASS] Optical frame QR sticker correctly generated with GS v 0 raster header');

  console.log('\n======================================================');
  console.log('🏁 DUAL-CHANNEL ORDER & QR TESTS PASSED!');
  console.log('======================================================\n');
}).catch(err => {
  console.error('Sticker test error:', err);
  process.exit(1);
});

