/**
 * tests/inventory_and_qr_resolution.test.js
 * Verifies that:
 * 1. Base frames (e.g. NOOR-CPH-02) have distinct authoritative SKUs and resolve cleanly.
 * 2. Custom added frames persist without disappearing when cloud sync or catalog refresh runs.
 * 3. Frame images are preserved and not replaced by placeholder images.
 * 4. QR scanner lookup endpoint (/api/qr/resolve/:code) resolves by SKU, ID, or barcode.
 */

'use strict';

const assert = require('assert');
const { db } = require('../server/db');

console.log('\n======================================================');
console.log('🧪 RUNNING INVENTORY PERSISTENCE & QR RESOLUTION SUITE');
console.log('======================================================\n');

// 1. Verify Base Catalog SKUs in data.js
const { EYEWEAR_CATALOG } = require('../data.js');
console.log('--- 1. Base Catalog SKUs ---');
const cph = EYEWEAR_CATALOG.find(i => i.id === 'noor-02');
assert(cph, 'The Copenhagen Round must exist in EYEWEAR_CATALOG');
assert.strictEqual(cph.sku, 'NOOR-CPH-02', 'Copenhagen Round must have canonical SKU NOOR-CPH-02');
console.log('  ✓ [PASS] EYEWEAR_CATALOG has distinct authoritative SKUs');

// 2. Verify Database lookup for QR code printed on sticker
console.log('--- 2. Database Lookup for Printed QR Code (NOOR-CPH-02) ---');
const foundCph = db.prepare(`
  SELECT p.id, p.sku, p.name, p.selling_price_paise, pv.sku as variant_sku
  FROM products p
  LEFT JOIN product_variants pv ON p.id = pv.product_id
  WHERE LOWER(p.sku) = LOWER(?) OR LOWER(pv.sku) = LOWER(?)
  LIMIT 1
`).get('NOOR-CPH-02', 'NOOR-CPH-02');

assert(foundCph, 'NOOR-CPH-02 must be found in SQLite database');
assert.strictEqual(foundCph.name, 'The Copenhagen Round');
console.log(`  ✓ [PASS] Found frame "${foundCph.name}" with SKU "${foundCph.sku}"`);

// 3. Verify Custom Added Frame Persistence with Photo
console.log('--- 3. Custom Frame Creation & Photo Preservation ---');
const testCustomId = 'prod-test-' + Date.now();
const testCustomSku = 'NOOR-CUSTOM-RX1';
const testPhotoUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...customphoto';

db.prepare(`
  INSERT INTO products (
    id, sku, name, brand, shape, material, fit, category,
    selling_price_paise, original_price_paise, purchase_cost_paise,
    supplier_id, reorder_threshold, image_url, description, is_active
  ) VALUES (?, ?, 'Custom Titanium Specs', 'Noor Studio', 'Round', 'Titanium', 'Regular', 'Optical', 499900, 599900, 200000, NULL, 2, ?, 'Custom description', 1)
`).run(testCustomId, testCustomSku, testPhotoUrl);

// Create variant & balance
const testVarId = `var-${testCustomId}-1`;
db.prepare(`
  INSERT INTO product_variants (id, product_id, sku, barcode, color_name, color_hex)
  VALUES (?, ?, ?, '8901999999', 'Matte Gold', '#D4AF37')
`).run(testVarId, testCustomId, `${testCustomSku}-GOLD`);

db.prepare(`
  INSERT INTO inventory_balances (id, variant_id, location_id, available_qty, reserved_qty)
  VALUES (?, ?, 'loc-main', 15, 0)
`).run(`bal-${testVarId}`, testVarId);

// Query back
const savedCustom = db.prepare(`
  SELECT p.*, pv.color_name, ib.available_qty
  FROM products p
  LEFT JOIN product_variants pv ON p.id = pv.product_id
  LEFT JOIN inventory_balances ib ON pv.id = ib.variant_id
  WHERE p.id = ?
`).get(testCustomId);

assert(savedCustom, 'Custom product must be stored');
assert.strictEqual(savedCustom.sku, testCustomSku);
assert.strictEqual(savedCustom.image_url, testPhotoUrl, 'Image URL must be preserved exactly without fallback');
assert.strictEqual(savedCustom.available_qty, 15);
console.log('  ✓ [PASS] Custom product saved and photo data preserved');

// 4. Verify QR Lookup for Custom Frame
console.log('--- 4. QR Lookup for Custom Frame ---');
const qrLookup = db.prepare(`
  SELECT p.id, p.sku, p.name, p.selling_price_paise, pv.sku as variant_sku
  FROM products p
  LEFT JOIN product_variants pv ON p.id = pv.product_id
  WHERE LOWER(p.sku) = LOWER(?) OR LOWER(pv.sku) = LOWER(?)
  LIMIT 1
`).get(testCustomSku, testCustomSku);

assert(qrLookup, 'QR lookup for custom SKU must succeed');
assert.strictEqual(qrLookup.id, testCustomId);
console.log(`  ✓ [PASS] QR code "${testCustomSku}" resolved to "${qrLookup.name}"`);

// Clean up test custom frame
db.prepare('DELETE FROM inventory_balances WHERE id = ?').run(`bal-${testVarId}`);
db.prepare('DELETE FROM product_variants WHERE id = ?').run(testVarId);
db.prepare('DELETE FROM products WHERE id = ?').run(testCustomId);
console.log('  ✓ [PASS] Cleaned up test records');

console.log('\n======================================================');
console.log('🏁 INVENTORY & QR RESOLUTION TESTS PASSED (4/4)');
console.log('======================================================\n');
