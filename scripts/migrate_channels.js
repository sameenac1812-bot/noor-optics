const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'noor_optics.db');
const db = new Database(dbPath);

console.log('Migrating orders table for strict channel separation...');
try {
  db.prepare('ALTER TABLE orders ADD COLUMN channel_code INTEGER DEFAULT 2').run();
  console.log('✓ Added channel_code column');
} catch (e) {
  console.log('channel_code column note:', e.message);
}

try {
  db.prepare("ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'instore'").run();
  console.log('✓ Added source column');
} catch (e) {
  console.log('source column note:', e.message);
}

try {
  db.prepare('ALTER TABLE orders ADD COLUMN claimed_upi_ref TEXT').run();
  console.log('✓ Added claimed_upi_ref column');
} catch (e) {
  console.log('claimed_upi_ref column note:', e.message);
}

// Update existing orders
const resWeb = db.prepare(`
  UPDATE orders 
  SET channel = 'WEBSITE', channel_code = 1, source = 'website' 
  WHERE channel = 'ONLINE' OR channel = 'WEBSITE' OR order_number LIKE '%-WEB-%' OR order_number LIKE '%-ONL-%'
`).run();
console.log(`✓ Updated ${resWeb.changes} website orders to channel=WEBSITE, channel_code=1, source=website`);

const resPos = db.prepare(`
  UPDATE orders 
  SET channel = 'POS', channel_code = 2, source = 'instore' 
  WHERE channel = 'POS' OR order_number LIKE '%-POS-%'
`).run();
console.log(`✓ Updated ${resPos.changes} POS orders to channel=POS, channel_code=2, source=instore`);

// Populate claimed_upi_ref from payments where available
const pays = db.prepare('SELECT order_id, claimed_upi_ref FROM payments WHERE claimed_upi_ref IS NOT NULL').all();
const upd = db.prepare('UPDATE orders SET claimed_upi_ref = ? WHERE id = ?');
let utrCount = 0;
for (const p of pays) {
  upd.run(p.claimed_upi_ref, p.order_id);
  utrCount++;
}
console.log(`✓ Synchronized ${utrCount} claimed UPI UTR references onto orders`);

// Reset any incorrect partial status on website orders - website orders are strictly full payment
const fixPartialWeb = db.prepare(`
  UPDATE orders 
  SET payment_status = 'AWAITING_VERIFICATION', amount_paid_paise = 0, outstanding_paise = total_payable_paise 
  WHERE (channel = 'WEBSITE' OR channel_code = 1) AND payment_status = 'PARTIAL'
`).run();
if (fixPartialWeb.changes > 0) {
  console.log(`✓ Corrected ${fixPartialWeb.changes} website orders from PARTIAL to AWAITING_VERIFICATION`);
}

const sampleOrders = db.prepare('SELECT id, order_number, channel, channel_code, source, payment_status, claimed_upi_ref FROM orders ORDER BY created_at DESC LIMIT 5').all();
console.log('Sample orders:', sampleOrders);
