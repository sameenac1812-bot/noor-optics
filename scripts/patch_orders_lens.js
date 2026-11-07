const Database = require('better-sqlite3');
const db = new Database('data/noor_optics.db');

// Update 6433
db.prepare(`
  UPDATE order_items
  SET variant_id = 'var-prod-noor-51-1', sku = 'NOOR-BRB-51-BLA', unit_price_paise = 147800, subtotal_paise = 147800
  WHERE id = 'oit-ord-cld-noor-web-20261107-6433-5061-0'
`).run();

// Update 9857 frame item
db.prepare(`
  UPDATE order_items
  SET variant_id = 'var-prod-noor-51-1', sku = 'NOOR-BRB-51-BLA', unit_price_paise = 147800, subtotal_paise = 147800
  WHERE id = 'oit-ord-cld-noor-web-20261107-9857-5347-0'
`).run();

// Insert 9857 lens item if not exists
const existingLens = db.prepare(`SELECT id FROM order_items WHERE order_id = 'ord-cld-noor-web-20261107-9857-5347' AND product_name LIKE '%Lens Package%'`).get();
if (!existingLens) {
  db.prepare(`
    INSERT INTO order_items (
      id, order_id, variant_id, product_name, variant_name, sku, lens_name, unit_price_paise, purchase_cost_paise, quantity, subtotal_paise
    ) VALUES (
      'oit-ord-cld-noor-web-20261107-9857-5347-1',
      'ord-cld-noor-web-20261107-9857-5347',
      NULL,
      '1.60 High-Index Anti-Reflective (Lens Package)',
      'Custom Optical Glazing',
      'LENS-PKG-HI',
      '1.60 High-Index Anti-Reflective',
      69900,
      25000,
      1,
      69900
    )
  `).run();
}

console.log('Updated! Verifying 9857 items:');
console.log(db.prepare(`SELECT id, product_name, lens_name, unit_price_paise, subtotal_paise FROM order_items WHERE order_id = 'ord-cld-noor-web-20261107-9857-5347'`).all());

const diffs = db.prepare(`SELECT o.id, o.order_number, o.subtotal_paise, SUM(oi.subtotal_paise) as items_sum FROM orders o JOIN order_items oi ON o.id = oi.order_id GROUP BY o.id HAVING o.subtotal_paise != items_sum`).all();
console.log('Remaining mismatches:', diffs);
