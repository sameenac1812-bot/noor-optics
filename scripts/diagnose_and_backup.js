'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data', 'noor_optics.db');
console.log('--- 1. ACTIVE DATABASE IDENTIFICATION ---');
console.log('Database Path:', dbPath);
console.log('Exists:', fs.existsSync(dbPath));

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found!');
  process.exit(1);
}

const db = new Database(dbPath);

// Run checkpoint to flush WAL
try {
  const ckpt = db.pragma('wal_checkpoint(TRUNCATE)');
  console.log('WAL Checkpoint result:', ckpt);
} catch (e) {
  console.warn('Checkpoint warning:', e.message);
}

// 2. Verified Backup
const backupDir = path.join(__dirname, '..', 'data', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `noor_optics_backup_${timestamp}.db`);

console.log('\n--- 2. CREATING VERIFIED BACKUP ---');
console.log('Target backup path:', backupPath);

async function runBackup() {
  await db.backup(backupPath);
  console.log('Backup completed successfully.');

  // Verify backup by opening it
  const backupDb = new Database(backupPath);
  const integrity = backupDb.pragma('integrity_check');
  console.log('Backup Integrity Check:', integrity);
  
  // 3. Schema & Counts
  console.log('\n--- 3. DATABASE SCHEMA & RECORD COUNTS ---');
  const tables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log('Total tables:', tables.length);
  
  for (const t of tables) {
    try {
      const row = backupDb.prepare(`SELECT count(*) as count FROM "${t.name}"`).get();
      console.log(`Table ${t.name.padEnd(30)}: ${row.count} records`);
    } catch (err) {
      console.log(`Table ${t.name.padEnd(30)}: Error reading count (${err.message})`);
    }
  }

  // 4. Inspect Customers
  console.log('\n--- 4. EXISTING CUSTOMERS (CLIENTS) ---');
  const customers = backupDb.prepare('SELECT * FROM customers').all();
  console.log(`Total customers: ${customers.length}`);
  console.log(JSON.stringify(customers, null, 2));

  // 5. Inspect Orders
  console.log('\n--- 5. EXISTING ORDERS ---');
  const orders = backupDb.prepare('SELECT id, order_number, channel, customer_id, customer_name, customer_phone, customer_email, total_payable_paise, status, payment_status, created_at FROM orders').all();
  console.log(`Total orders: ${orders.length}`);
  console.log(JSON.stringify(orders, null, 2));

  // 6. Inspect Invoices
  console.log('\n--- 6. EXISTING INVOICES ---');
  const invoices = backupDb.prepare('SELECT id, invoice_number, order_id, customer_name, customer_phone, customer_email, grand_total_paise, created_at FROM invoices').all();
  console.log(`Total invoices: ${invoices.length}`);
  console.log(JSON.stringify(invoices, null, 2));

  backupDb.close();
}

runBackup().catch(err => {
  console.error('Backup / Diagnosis failed:', err);
  process.exit(1);
});
