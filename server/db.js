/**
 * server/db.js – Database Engine for Noor Optics Business Platform
 * SQLite with WAL mode, foreign keys, ACID transactions, and all 27 business entities.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'noor_optics.db');

// Ensure data folder exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable high-performance Write-Ahead Logging & Foreign Key enforcement
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

/**
 * Initialize all 27 business tables
 */
function initializeDatabase() {
  db.exec(`
    -- 1. Roles
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 2. Permissions
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL,
      code TEXT NOT NULL,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_permissions_role ON permissions(role_id);
    CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);

    -- 3. Users (Staff & Admins)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role_id TEXT NOT NULL,
      phone TEXT,
      is_active INTEGER DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- 4. Suppliers
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      gst_number TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 5. Products (Eyewear Frames & Sunglasses)
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT 'Noor Optics',
      shape TEXT NOT NULL,
      material TEXT NOT NULL,
      fit TEXT NOT NULL DEFAULT 'Regular',
      category TEXT NOT NULL DEFAULT 'Optical',
      selling_price_paise INTEGER NOT NULL,
      original_price_paise INTEGER,
      purchase_cost_paise INTEGER NOT NULL DEFAULT 0,
      tax_rate_percent REAL NOT NULL DEFAULT 18.0,
      supplier_id TEXT,
      reorder_threshold INTEGER NOT NULL DEFAULT 5,
      image_url TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_shape ON products(shape);
    CREATE INDEX IF NOT EXISTS idx_products_material ON products(material);

    -- 6. Product Variants (Color, Dimensions, Temple specs)
    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      barcode TEXT UNIQUE,
      color_name TEXT NOT NULL,
      color_hex TEXT NOT NULL,
      lens_type TEXT NOT NULL DEFAULT 'Standard Demo Lens',
      dimensions_json TEXT NOT NULL DEFAULT '{}',
      additional_price_paise INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
    CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);

    -- 7. Product Images
    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      image_url TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0,
      alt_text TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- 8. Inventory Locations
    CREATE TABLE IF NOT EXISTS inventory_locations (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      address TEXT,
      is_active INTEGER DEFAULT 1
    );

    -- 9. Inventory Balances
    CREATE TABLE IF NOT EXISTS inventory_balances (
      id TEXT PRIMARY KEY,
      variant_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      available_qty INTEGER NOT NULL DEFAULT 0,
      reserved_qty INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(variant_id, location_id),
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES inventory_locations(id)
    );
    CREATE INDEX IF NOT EXISTS idx_inv_variant ON inventory_balances(variant_id);

    -- 10. Stock Movements (Stock Ledger / Audit Trail)
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      variant_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      change_qty INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      movement_type TEXT NOT NULL, -- PURCHASE_RECEIPT, SALE_POS, SALE_ONLINE, ADJUSTMENT, RETURN, DAMAGED
      reference_id TEXT,          -- Order ID, PO ID, or Adjustment Ref
      reason TEXT,
      created_by_user_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (variant_id) REFERENCES product_variants(id),
      FOREIGN KEY (location_id) REFERENCES inventory_locations(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON stock_movements(variant_id);

    -- 11. Purchase Orders
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      po_number TEXT NOT NULL UNIQUE,
      supplier_id TEXT NOT NULL,
      total_amount_paise INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, ORDERED, RECEIVED, CANCELLED
      notes TEXT,
      created_by_user_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );

    -- 12. Purchase Order Items
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY,
      purchase_order_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      ordered_qty INTEGER NOT NULL,
      unit_cost_paise INTEGER NOT NULL,
      received_qty INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    );

    -- 13. Goods Receipts
    CREATE TABLE IF NOT EXISTS goods_receipts (
      id TEXT PRIMARY KEY,
      receipt_number TEXT NOT NULL UNIQUE,
      purchase_order_id TEXT NOT NULL,
      received_at TEXT DEFAULT (datetime('now')),
      received_by_user_id TEXT,
      notes TEXT,
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (received_by_user_id) REFERENCES users(id)
    );

    -- 14. Customers
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      email TEXT,
      address TEXT,
      city TEXT DEFAULT 'Bengaluru',
      pin_code TEXT,
      prescription_json TEXT DEFAULT '{}',
      notes TEXT,
      total_spent_paise INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

    -- 15. Orders (Shared by POS and Online Storefront)
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      token_number INTEGER NOT NULL,
      channel TEXT NOT NULL DEFAULT 'POS', -- POS, ONLINE
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      delivery_address TEXT,
      city TEXT,
      pin_code TEXT,
      prescription_pref TEXT DEFAULT 'zero-power',
      status TEXT NOT NULL DEFAULT 'CONFIRMED', -- PENDING, CONFIRMED, PROCESSING, COMPLETED, CANCELLED
      payment_status TEXT NOT NULL DEFAULT 'UNPAID', -- UNPAID, AWAITING_VERIFICATION, VERIFIED, PARTIALLY_PAID, REFUNDED
      subtotal_paise INTEGER NOT NULL,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      discount_reason TEXT,
      tax_paise INTEGER NOT NULL DEFAULT 0,
      total_payable_paise INTEGER NOT NULL,
      amount_paid_paise INTEGER NOT NULL DEFAULT 0,
      outstanding_paise INTEGER NOT NULL DEFAULT 0,
      staff_user_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (staff_user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
    CREATE INDEX IF NOT EXISTS idx_orders_channel ON orders(channel);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

    -- 16. Order Items (Immutable Snapshots)
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      variant_id TEXT,
      product_name TEXT NOT NULL,
      variant_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      lens_name TEXT NOT NULL DEFAULT 'Standard Demo Lens',
      unit_price_paise INTEGER NOT NULL,
      purchase_cost_paise INTEGER NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL,
      subtotal_paise INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

    -- 17. Payments
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      payment_method TEXT NOT NULL, -- CASH, UPI_GPAY, CARD, SPLIT
      amount_paise INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION', -- PENDING_VERIFICATION, VERIFIED, REJECTED
      claimed_upi_ref TEXT,
      merchant_transaction_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

    -- 18. Payment Verification Events (Audit Log for Manual UPI/GPay)
    CREATE TABLE IF NOT EXISTS payment_verification_events (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      verifier_user_id TEXT NOT NULL,
      status_before TEXT NOT NULL,
      status_after TEXT NOT NULL,
      merchant_transaction_id TEXT,
      reason_or_notes TEXT,
      verified_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
      FOREIGN KEY (verifier_user_id) REFERENCES users(id)
    );

    -- 19. Invoices
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      order_id TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      customer_address TEXT,
      subtotal_paise INTEGER NOT NULL,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      tax_paise INTEGER NOT NULL DEFAULT 0,
      grand_total_paise INTEGER NOT NULL,
      amount_paid_paise INTEGER NOT NULL,
      payment_status TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

    -- 20. Invoice Items
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_paise INTEGER NOT NULL,
      tax_rate REAL NOT NULL DEFAULT 18.0,
      subtotal_paise INTEGER NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    );

    -- 21. Expense Categories
    CREATE TABLE IF NOT EXISTS expense_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    -- 22. Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      expense_number TEXT NOT NULL UNIQUE,
      category_id TEXT NOT NULL,
      title TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      expense_date TEXT NOT NULL DEFAULT (date('now')),
      receipt_url TEXT,
      notes TEXT,
      created_by_user_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES expense_categories(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

    -- 23. Refunds
    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      payment_id TEXT,
      amount_paise INTEGER NOT NULL,
      reason TEXT NOT NULL,
      authorized_by_user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (authorized_by_user_id) REFERENCES users(id)
    );

    -- 24. Cash Movements (Float & Cash-Drawer Audit)
    CREATE TABLE IF NOT EXISTS cash_movements (
      id TEXT PRIMARY KEY,
      movement_type TEXT NOT NULL, -- OPENING_FLOAT, CASH_SALE, PAYOUT, CLOSING_DROP
      amount_paise INTEGER NOT NULL,
      reason TEXT,
      recorded_by_user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (recorded_by_user_id) REFERENCES users(id)
    );

    -- 25. Print Jobs (58mm Thermal Tokens & Receipts)
    CREATE TABLE IF NOT EXISTS print_jobs (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      token_number INTEGER NOT NULL,
      printer_name TEXT NOT NULL DEFAULT 'POS-80',
      paper_width_mm INTEGER NOT NULL DEFAULT 58,
      doc_type TEXT NOT NULL DEFAULT 'TOKEN', -- TOKEN, RECEIPT, INVOICE
      status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PRINTING, COMPLETED, FAILED
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
    CREATE INDEX IF NOT EXISTS idx_print_jobs_order ON print_jobs(order_id);
    CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);

    -- 26. Store Settings (Key-Value)
    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 27. Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);
}

initializeDatabase();

module.exports = {
  db,
  initializeDatabase,
  DB_PATH
};
