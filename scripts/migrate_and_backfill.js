'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'noor_optics.db');
console.log('Connecting to authoritative DB:', dbPath);
const db = new Database(dbPath);

db.pragma('foreign_keys = OFF'); // Turn off temporarily for table alteration

const migrateTx = db.transaction(() => {
  console.log('1. Checking customers table schema...');
  const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='customers'").get()?.sql || '';
  
  const hasPhoneUnique = tableSql.includes('phone TEXT UNIQUE');
  const cols = db.pragma('table_info(customers)').map(c => c.name);
  console.log('Existing columns in customers:', cols);

  // If table has phone UNIQUE or lacks new columns, do safe table migration
  if (hasPhoneUnique || !cols.includes('age') || !cols.includes('client_code')) {
    console.log('Migrating customers table to remove phone UNIQUE and add new columns...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS customers_new (
        id TEXT PRIMARY KEY,
        client_code TEXT UNIQUE,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        age INTEGER,
        dob TEXT,
        address TEXT,
        city TEXT DEFAULT 'Bengaluru',
        pin_code TEXT,
        prescription_json TEXT DEFAULT '{}',
        notes TEXT,
        total_spent_paise INTEGER DEFAULT 0,
        is_archived INTEGER DEFAULT 0,
        archived_at TEXT,
        archived_reason TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Copy any existing rows if present
    const existingCount = db.prepare('SELECT count(*) as c FROM customers').get().c;
    if (existingCount > 0) {
      console.log(`Copying ${existingCount} existing customer records...`);
      db.exec(`
        INSERT INTO customers_new (id, name, phone, email, address, city, pin_code, prescription_json, notes, total_spent_paise, created_at, updated_at)
        SELECT id, name, phone, email, address, city, pin_code, prescription_json, notes, total_spent_paise, created_at, updated_at
        FROM customers;
      `);
    }

    db.exec(`
      DROP TABLE customers;
      ALTER TABLE customers_new RENAME TO customers;
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
      CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(client_code);
      CREATE INDEX IF NOT EXISTS idx_customers_archived ON customers(is_archived);
    `);
    console.log('✓ customers table migration complete.');
  }

  // 2. Prescriptions table
  console.log('2. Ensuring prescriptions table exists...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      prescription_number TEXT UNIQUE,
      client_id TEXT NOT NULL,
      prescription_date TEXT NOT NULL DEFAULT (date('now')),
      od_sph TEXT,
      od_cyl TEXT,
      od_axis TEXT,
      os_sph TEXT,
      os_cyl TEXT,
      os_axis TEXT,
      addition TEXT,
      ipd_distance TEXT,
      ipd_near TEXT,
      checked_by TEXT,
      prescriber_details TEXT,
      notes TEXT,
      image_url TEXT,
      created_by_user_id TEXT,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES customers(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_prescriptions_client ON prescriptions(client_id);
    CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON prescriptions(prescription_date);
  `);
  console.log('✓ prescriptions table ready.');

  // 3. Orders table alteration
  console.log('3. Checking orders table for prescription_id...');
  const orderCols = db.pragma('table_info(orders)').map(c => c.name);
  if (!orderCols.includes('prescription_id')) {
    db.exec(`ALTER TABLE orders ADD COLUMN prescription_id TEXT;`);
    console.log('Added prescription_id column to orders table.');
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_prescription ON orders(prescription_id);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
  `);

  // 4. Backfill Genuine Clients from Existing Orders
  console.log('4. Backfilling genuine clients from existing orders...');
  const genuineOrders = db.prepare(`
    SELECT DISTINCT customer_name, customer_phone, customer_email, city
    FROM orders
    WHERE customer_name IS NOT NULL
      AND customer_name NOT LIKE 'Test %'
      AND customer_name NOT LIKE '%Tester%'
      AND customer_name != 'Walk-in Client'
      AND order_number NOT LIKE 'TEST-%'
  `).all();

  console.log('Found genuine distinct clients in orders:', genuineOrders);

  let nextCodeNum = 1001;
  const existingMaxCode = db.prepare("SELECT client_code FROM customers WHERE client_code LIKE 'CLT-%' ORDER BY client_code DESC LIMIT 1").get();
  if (existingMaxCode && existingMaxCode.client_code) {
    const num = parseInt(existingMaxCode.client_code.replace('CLT-', ''), 10);
    if (!isNaN(num)) nextCodeNum = num + 1;
  }

  const insertCust = db.prepare(`
    INSERT INTO customers (id, client_code, name, phone, email, city, notes, total_spent_paise, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  for (const client of genuineOrders) {
    const existing = db.prepare(`
      SELECT * FROM customers
      WHERE (phone = ? AND phone IS NOT NULL AND phone != '')
         OR (email = ? AND email IS NOT NULL AND email != '')
         OR name = ?
    `).get(client.customer_phone, client.customer_email, client.customer_name);

    let customerId;
    if (!existing) {
      customerId = 'cust-' + Date.now() + '-' + nextCodeNum;
      const clientCode = `CLT-${nextCodeNum++}`;
      
      // Calculate total spent from orders
      const spentRow = db.prepare(`
        SELECT COALESCE(SUM(total_payable_paise), 0) as total
        FROM orders
        WHERE customer_name = ? AND order_number NOT LIKE 'TEST-%'
      `).get(client.customer_name);

      insertCust.run(
        customerId,
        clientCode,
        client.customer_name,
        client.customer_phone || null,
        client.customer_email || null,
        client.city || 'Bengaluru',
        'Genuine customer backfilled from verified order history',
        spentRow.total
      );
      console.log(`✓ Created genuine client record: ${client.customer_name} (${clientCode}) ID: ${customerId}`);
    } else {
      customerId = existing.id;
      console.log(`Client ${client.customer_name} already exists with ID: ${customerId}`);
    }

    // Link customer_id in orders
    const updateResult = db.prepare(`
      UPDATE orders
      SET customer_id = ?
      WHERE customer_name = ? AND customer_id IS NULL AND order_number NOT LIKE 'TEST-%'
    `).run(customerId, client.customer_name);
    console.log(`Linked ${updateResult.changes} orders to client ${client.customer_name}`);
  }

  // 5. Clean up old test runner orders (already backed up)
  console.log('5. Safely cleaning up old TEST runner artifacts...');
  const testOrders = db.prepare("SELECT id FROM orders WHERE order_number LIKE 'TEST-%' OR id LIKE 'test-%'").all();
  console.log(`Found ${testOrders.length} test runner records in orders.`);
  for (const t of testOrders) {
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(t.id);
    db.prepare('DELETE FROM payments WHERE order_id = ?').run(t.id);
    db.prepare('DELETE FROM orders WHERE id = ?').run(t.id);
  }
  console.log('Cleaned up test orders from live database.');
});

migrateTx();
db.pragma('foreign_keys = ON');

console.log('\n--- VERIFICATION OF DATABASE AFTER MIGRATION ---');
console.log('Customers in DB:', db.prepare('SELECT id, client_code, name, phone, email, city, total_spent_paise FROM customers').all());
console.log('Orders in DB:', db.prepare('SELECT id, order_number, customer_id, customer_name, total_payable_paise FROM orders').all());
console.log('Prescriptions count:', db.prepare('SELECT count(*) as c FROM prescriptions').get().c);
console.log('Migration completed successfully.');
