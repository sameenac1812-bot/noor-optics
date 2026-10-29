/**
 * server/api.js – Complete REST API Router for Noor Optics Business Platform
 */

'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const {
  signToken,
  authenticateToken,
  requirePermission,
  requireRole,
  logAudit
} = require('./auth');
const {
  enqueuePrintJob,
  processPrintJob,
  generate58mmHTML,
  generateEscPosQrLabel,
  getStoreSettings
} = require('./printer');
const { generateInvoicePDF } = require('./pdfInvoice');
const {
  syncSupabaseOrders,
  pushOrderToSupabase,
  pushCustomerToSupabase,
  pushPrescriptionToSupabase,
  deleteOrderFromSupabase,
  deleteAllOrdersFromSupabase,
  deleteCustomerFromSupabase,
  deleteAllCustomersFromSupabase,
  startBackgroundSync
} = require('./supabaseSync');

// Start recurring multi-device background sync with Supabase cloud
startBackgroundSync(db, 8000);

// ── Helper: Format Daily Token Number ────────────────────────────────────────
function getNextDailyTokenNumber() {
  const todayStart = new Date().toISOString().slice(0, 10) + ' 00:00:00';
  const row = db.prepare(`
    SELECT MAX(token_number) as maxToken FROM orders
    WHERE created_at >= ?
  `).get(todayStart);

  return (row && row.maxToken) ? (row.maxToken + 1) : 1;
}

// ── Helper: Generate Human-Readable Order Number ────────────────────────────
function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `NOOR-${datePart}-${randomPart}`;
}

// ── Helper: Generate Invoice Number ─────────────────────────────────────────
function generateInvoiceNumber(prefix = 'NOOR-INV') {
  const year = new Date().getFullYear();
  const countRow = db.prepare('SELECT count(*) as c FROM invoices').get();
  const nextSeq = String((countRow ? countRow.c : 0) + 1).padStart(4, '0');
  return `${prefix}-${year}-${nextSeq}`;
}

// ── Helper: Format Client Code (e.g. CLT-1001) ────────────────────────────────
function getNextClientCode() {
  const row = db.prepare("SELECT client_code FROM customers WHERE client_code LIKE 'CLT-%' ORDER BY client_code DESC LIMIT 1").get();
  if (row && row.client_code) {
    const num = parseInt(row.client_code.replace('CLT-', ''), 10);
    if (!isNaN(num)) return `CLT-${num + 1}`;
  }
  const countRow = db.prepare('SELECT count(*) as c FROM customers').get();
  return `CLT-${1001 + (countRow ? countRow.c : 0)}`;
}

// ── Helper: Format Prescription Number (e.g. RX-2026-0001) ────────────────────
function getNextPrescriptionNumber() {
  const year = new Date().getFullYear();
  const countRow = db.prepare('SELECT count(*) as c FROM prescriptions').get();
  const nextSeq = String((countRow ? countRow.c : 0) + 1).padStart(4, '0');
  return `RX-${year}-${nextSeq}`;
}

// ── Helper: Normalize Phone Number ──────────────────────────────────────────
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (/^\d{10}$/.test(cleaned)) {
    return '+91' + cleaned;
  }
  if (/^91\d{10}$/.test(cleaned)) {
    return '+' + cleaned;
  }
  return cleaned;
}

// ── Helper: Generate WhatsApp Click-to-Chat URL ─────────────────────────────
function generateWhatsAppUrl(phone, clientName, storeName) {
  const normalized = normalizePhoneNumber(phone).replace(/^\+/, '');
  if (!normalized) return null;
  const name = clientName || 'Valued Client';
  const boutiqueName = storeName || 'Noor Optics Flagship Boutique';
  const text = `Hello ${name}, this is ${boutiqueName}. We are contacting you regarding your recent purchase. Please let us know if you need any assistance.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

// ==============================================================================
// 1. AUTHENTICATION ENDPOINTS
// ==============================================================================

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare(`
    SELECT u.*, r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE LOWER(u.email) = LOWER(?) AND u.is_active = 1
  `).get(email.trim());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email address or password.' });
  }

  // Fetch permissions
  const permissions = db.prepare('SELECT code FROM permissions WHERE role_id = ?').all(user.role_id).map(r => r.code);

  // Update last login
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);

  const token = signToken(user, permissions);

  logAudit(user.id, user.email, 'USER_LOGIN', 'USER', user.id, { role: user.role_name }, req);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role_name,
      permissions
    }
  });
});

router.get('/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role_id, r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: { ...user, permissions: req.user.permissions } });
});

router.post('/auth/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, req.user.id);

  logAudit(req.user.id, req.user.email, 'PASSWORD_CHANGED', 'USER', req.user.id, {}, req);
  res.json({ success: true, message: 'Password updated successfully.' });
});

// ==============================================================================
// 2. STAFF & PERMISSIONS (RBAC)
// ==============================================================================

router.get('/staff', authenticateToken, requirePermission('users:manage'), (req, res) => {
  const staff = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role_id, r.name as role_name, u.is_active, u.last_login_at, u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at ASC
  `).all();
  res.json(staff);
});

router.post('/staff', authenticateToken, requirePermission('users:manage'), (req, res) => {
  const { name, email, password, roleId, phone } = req.body;
  if (!name || !email || !password || !roleId) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists.' });
  }

  const id = 'usr-' + Date.now();
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role_id, phone, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(id, name.trim(), email.trim().toLowerCase(), hash, roleId, phone || null);

  logAudit(req.user.id, req.user.email, 'STAFF_CREATED', 'USER', id, { name, email, roleId }, req);
  res.json({ success: true, id });
});

router.put('/staff/:id', authenticateToken, requirePermission('users:manage'), (req, res) => {
  const { name, roleId, phone, isActive, password } = req.body;
  const staffId = req.params.id;

  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(staffId);
  if (!current) return res.status(404).json({ error: 'Staff member not found.' });

  let hash = current.password_hash;
  if (password && password.trim().length >= 6) {
    hash = bcrypt.hashSync(password.trim(), 10);
  }

  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      role_id = COALESCE(?, role_id),
      phone = COALESCE(?, phone),
      is_active = COALESCE(?, is_active),
      password_hash = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(name, roleId, phone, isActive !== undefined ? (isActive ? 1 : 0) : null, hash, staffId);

  logAudit(req.user.id, req.user.email, 'STAFF_UPDATED', 'USER', staffId, { name, roleId, isActive }, req);
  res.json({ success: true });
});

router.get('/roles', authenticateToken, (req, res) => {
  const roles = db.prepare('SELECT id, name, description FROM roles').all();
  res.json(roles);
});

// ==============================================================================
// 3. PRODUCTS & VARIANTS
// ==============================================================================

router.get('/products', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, s.name as supplier_name,
      (SELECT SUM(ib.available_qty)
       FROM product_variants pv
       JOIN inventory_balances ib ON pv.id = ib.variant_id
       WHERE pv.product_id = p.id) as total_stock
    FROM products p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    ORDER BY p.name ASC
  `).all();

  const getVariants = db.prepare(`
    SELECT pv.*, COALESCE(ib.available_qty, 0) as available_qty, COALESCE(ib.reserved_qty, 0) as reserved_qty
    FROM product_variants pv
    LEFT JOIN inventory_balances ib ON pv.id = ib.variant_id
    WHERE pv.product_id = ?
  `);

  const results = products.map(p => ({
    ...p,
    selling_price_inr: p.selling_price_paise / 100,
    original_price_inr: p.original_price_paise ? p.original_price_paise / 100 : null,
    purchase_cost_inr: p.purchase_cost_paise / 100,
    variants: getVariants.all(p.id)
  }));

  res.json(results);
});

router.post('/products', authenticateToken, requirePermission('products:manage'), (req, res) => {
  const {
    name, sku, brand, shape, material, fit, category,
    sellingPriceINR, originalPriceINR, purchaseCostINR,
    supplierId, reorderThreshold, imageUrl, description, variants
  } = req.body;

  if (!name || !sku || !sellingPriceINR) {
    return res.status(400).json({ error: 'Name, SKU, and Selling Price are required.' });
  }

  const productId = 'prod-' + Date.now();
  const sellingPaise = Math.round(Number(sellingPriceINR) * 100);
  const origPaise = originalPriceINR ? Math.round(Number(originalPriceINR) * 100) : null;
  const costPaise = purchaseCostINR ? Math.round(Number(purchaseCostINR) * 100) : 0;

  const createTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO products (
        id, sku, name, brand, shape, material, fit, category,
        selling_price_paise, original_price_paise, purchase_cost_paise,
        supplier_id, reorder_threshold, image_url, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      productId, sku.toUpperCase(), name, brand || 'Noor Optics',
      shape || 'Rectangular', material || 'Japanese Titanium',
      fit || 'Regular', category || 'Optical', sellingPaise, origPaise,
      costPaise, supplierId || null, Number(reorderThreshold) || 5,
      imageUrl || 'images/stockholm_noir.jpg', description || ''
    );

    // Variants
    const varList = Array.isArray(variants) && variants.length > 0 ? variants : [{ colorName: 'Standard', colorHex: '#111111' }];
    varList.forEach((v, idx) => {
      const varId = `var-${productId}-${idx + 1}`;
      const varSku = `${sku.toUpperCase()}-${(v.colorName || 'STD').substring(0, 3).toUpperCase()}`;
      const barcode = `8901${Math.floor(100000 + Math.random() * 900000)}`;

      db.prepare(`
        INSERT INTO product_variants (id, product_id, sku, barcode, color_name, color_hex)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(varId, productId, varSku, barcode, v.colorName || 'Standard', v.colorHex || '#111111');

      db.prepare(`
        INSERT INTO inventory_balances (id, variant_id, location_id, available_qty, reserved_qty)
        VALUES (?, ?, 'loc-main', ?, 0)
      `).run(`bal-${varId}`, varId, Number(v.initialStock) || 10);

      db.prepare(`
        INSERT INTO stock_movements (id, variant_id, location_id, change_qty, balance_after, movement_type, reason, created_by_user_id)
        VALUES (?, ?, 'loc-main', ?, ?, 'ADJUSTMENT', 'Initial stock creation', ?)
      `).run('mov-' + Date.now() + '-' + idx, varId, Number(v.initialStock) || 10, Number(v.initialStock) || 10, req.user.id);
    });
  });

  createTx();
  logAudit(req.user.id, req.user.email, 'PRODUCT_CREATED', 'PRODUCT', productId, { name, sku }, req);
  res.json({ success: true, id: productId });
});

router.put('/products/:id', authenticateToken, requirePermission('products:manage'), (req, res) => {
  const pId = req.params.id;
  const { name, shape, material, fit, sellingPriceINR, purchaseCostINR, reorderThreshold, isActive, description } = req.body;

  const sellingPaise = sellingPriceINR !== undefined ? Math.round(Number(sellingPriceINR) * 100) : null;
  const costPaise = purchaseCostINR !== undefined ? Math.round(Number(purchaseCostINR) * 100) : null;

  db.prepare(`
    UPDATE products SET
      name = COALESCE(?, name),
      shape = COALESCE(?, shape),
      material = COALESCE(?, material),
      fit = COALESCE(?, fit),
      selling_price_paise = COALESCE(?, selling_price_paise),
      purchase_cost_paise = COALESCE(?, purchase_cost_paise),
      reorder_threshold = COALESCE(?, reorder_threshold),
      is_active = COALESCE(?, is_active),
      description = COALESCE(?, description),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(name, shape, material, fit, sellingPaise, costPaise, reorderThreshold, isActive !== undefined ? (isActive ? 1 : 0) : null, description, pId);

  logAudit(req.user.id, req.user.email, 'PRODUCT_UPDATED', 'PRODUCT', pId, req.body, req);
  res.json({ success: true });
});

// ── DELETE /api/products/:id (Delete Single Frame & Cleanup Variants/Balances) ─
router.delete('/products/:id', authenticateToken, (req, res) => {
  if (!req.user.permissions.includes('products:manage') && !req.user.permissions.includes('inventory:adjust') && req.user.roleId !== 'role-owner') {
    return res.status(403).json({ error: 'Forbidden: Insufficient privileges to delete optical frames.' });
  }

  const productId = req.params.id;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const deleteTx = db.transaction(() => {
    const variants = db.prepare('SELECT id FROM product_variants WHERE product_id = ?').all(productId);
    const varIds = variants.map(v => v.id);

    if (varIds.length > 0) {
      const placeholders = varIds.map(() => '?').join(',');
      // Nullify variant_id in historical order items to satisfy FKs while preserving receipt logs
      db.prepare(`UPDATE order_items SET variant_id = NULL WHERE variant_id IN (${placeholders})`).run(...varIds);
      db.prepare(`UPDATE purchase_order_items SET variant_id = NULL WHERE variant_id IN (${placeholders})`).run(...varIds);

      // Clean up stock ledgers & inventory balances
      db.prepare(`DELETE FROM stock_movements WHERE variant_id IN (${placeholders})`).run(...varIds);
      db.prepare(`DELETE FROM inventory_balances WHERE variant_id IN (${placeholders})`).run(...varIds);
      db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(productId);
    }

    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);

    logAudit(req.user.id, req.user.email, 'PRODUCT_DELETED', 'PRODUCT', productId, { name: product.name, sku: product.sku }, req);
  });

  try {
    deleteTx();
    res.json({ success: true, message: `Optical frame "${product.name}" deleted successfully.` });
  } catch (err) {
    console.error('Failed to delete product:', err);
    res.status(500).json({ error: 'Failed to delete product: ' + err.message });
  }
});

// ── DELETE /api/products (Batch Delete Selected Optical Frames) ──────────────
router.delete('/products', authenticateToken, (req, res) => {
  if (!req.user.permissions.includes('products:manage') && !req.user.permissions.includes('inventory:adjust') && req.user.roleId !== 'role-owner') {
    return res.status(403).json({ error: 'Forbidden: Insufficient privileges to delete optical frames.' });
  }

  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Array of product IDs required for deletion.' });
  }

  const deleteBatchTx = db.transaction(() => {
    let deletedCount = 0;
    for (const productId of ids) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (!product) continue;

      const variants = db.prepare('SELECT id FROM product_variants WHERE product_id = ?').all(productId);
      const varIds = variants.map(v => v.id);

      if (varIds.length > 0) {
        const placeholders = varIds.map(() => '?').join(',');
        db.prepare(`UPDATE order_items SET variant_id = NULL WHERE variant_id IN (${placeholders})`).run(...varIds);
        db.prepare(`UPDATE purchase_order_items SET variant_id = NULL WHERE variant_id IN (${placeholders})`).run(...varIds);
        db.prepare(`DELETE FROM stock_movements WHERE variant_id IN (${placeholders})`).run(...varIds);
        db.prepare(`DELETE FROM inventory_balances WHERE variant_id IN (${placeholders})`).run(...varIds);
        db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(productId);
      }

      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
      db.prepare('DELETE FROM products WHERE id = ?').run(productId);
      deletedCount++;
    }

    logAudit(req.user.id, req.user.email, 'PRODUCTS_BATCH_DELETED', 'PRODUCT', 'BATCH', { count: deletedCount }, req);
    return deletedCount;
  });

  try {
    const count = deleteBatchTx();
    res.json({ success: true, deletedCount: count, message: `Successfully deleted ${count} frame(s).` });
  } catch (err) {
    console.error('Failed to batch delete products:', err);
    res.status(500).json({ error: 'Failed to delete products: ' + err.message });
  }
});

// ==============================================================================
// 4. INVENTORY & STOCK MANAGEMENT
// ==============================================================================

router.get('/inventory/balances', authenticateToken, requirePermission('inventory:view'), (req, res) => {
  const rows = db.prepare(`
    SELECT
      ib.id as balance_id,
      p.id as product_id,
      p.name as product_name,
      p.shape,
      p.material,
      p.reorder_threshold,
      p.selling_price_paise,
      p.purchase_cost_paise,
      pv.id as variant_id,
      pv.sku as variant_sku,
      pv.barcode,
      pv.color_name,
      pv.color_hex,
      ib.available_qty,
      ib.reserved_qty,
      ib.updated_at
    FROM inventory_balances ib
    JOIN product_variants pv ON ib.variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    ORDER BY p.name ASC, pv.color_name ASC
  `).all();

  const formatted = rows.map(r => ({
    ...r,
    selling_price_inr: r.selling_price_paise / 100,
    purchase_cost_inr: r.purchase_cost_paise / 100,
    is_low_stock: r.available_qty <= r.reorder_threshold
  }));

  res.json(formatted);
});

router.get('/inventory/movements', authenticateToken, requirePermission('inventory:view'), (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
  const rows = db.prepare(`
    SELECT sm.*, p.name as product_name, pv.sku as variant_sku, pv.color_name, u.name as user_name
    FROM stock_movements sm
    JOIN product_variants pv ON sm.variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    LEFT JOIN users u ON sm.created_by_user_id = u.id
    ORDER BY sm.created_at DESC
    LIMIT ?
  `).all(limit);
  res.json(rows);
});

router.post('/inventory/adjust', authenticateToken, requirePermission('inventory:adjust'), (req, res) => {
  const variantId = req.body.variantId || req.body.variant_id;
  const changeQty = req.body.changeQty !== undefined ? req.body.changeQty : req.body.quantity_change;
  const reason = req.body.reason;
  const locationId = req.body.locationId || req.body.location_id || 'loc-main';

  if (!variantId || changeQty === undefined || changeQty === 0 || !reason || !reason.trim()) {
    return res.status(400).json({ error: 'Variant ID, non-zero Change Quantity, and a mandatory Reason are required.' });
  }

  const delta = parseInt(changeQty, 10);
  const adjustTx = db.transaction(() => {
    const bal = db.prepare('SELECT available_qty FROM inventory_balances WHERE variant_id = ? AND location_id = ?').get(variantId, locationId);
    const current = bal ? bal.available_qty : 0;
    const newQty = current + delta;

    if (newQty < 0) {
      throw new Error(`Cannot reduce stock below zero. Current stock is ${current}`);
    }

    db.prepare(`
      INSERT INTO inventory_balances (id, variant_id, location_id, available_qty, reserved_qty, updated_at)
      VALUES (?, ?, ?, ?, 0, datetime('now'))
      ON CONFLICT(variant_id, location_id) DO UPDATE SET
        available_qty = ?,
        updated_at = datetime('now')
    `).run(`bal-${variantId}`, variantId, locationId, newQty, newQty);

    const movId = 'mov-' + Date.now();
    db.prepare(`
      INSERT INTO stock_movements (id, variant_id, location_id, change_qty, balance_after, movement_type, reason, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, 'ADJUSTMENT', ?, ?)
    `).run(movId, variantId, locationId, delta, newQty, reason.trim(), req.user.id);

    return { newQty, movId };
  });

  try {
    const result = adjustTx();
    logAudit(req.user.id, req.user.email, 'STOCK_ADJUSTED', 'INVENTORY', variantId, { delta, reason }, req);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/inventory/valuation', authenticateToken, requirePermission('finance:view'), (req, res) => {
  const summary = db.prepare(`
    SELECT
      COUNT(DISTINCT p.id) as total_products,
      COUNT(pv.id) as total_variants,
      SUM(ib.available_qty) as total_units,
      SUM(ib.available_qty * p.purchase_cost_paise) as total_cost_valuation_paise,
      SUM(ib.available_qty * p.selling_price_paise) as total_retail_valuation_paise
    FROM inventory_balances ib
    JOIN product_variants pv ON ib.variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
  `).get();

  res.json({
    totalProducts: summary.total_products || 0,
    totalVariants: summary.total_variants || 0,
    totalUnits: summary.total_units || 0,
    costValuationINR: (summary.total_cost_valuation_paise || 0) / 100,
    retailValuationINR: (summary.total_retail_valuation_paise || 0) / 100,
    potentialMarginINR: ((summary.total_retail_valuation_paise || 0) - (summary.total_cost_valuation_paise || 0)) / 100
  });
});

// ==============================================================================
// 5. SUPPLIERS & PURCHASE ORDERS
// ==============================================================================

router.get('/suppliers', authenticateToken, (req, res) => {
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
  res.json(suppliers);
});

router.post('/suppliers', authenticateToken, requirePermission('purchases:manage'), (req, res) => {
  const { name, contactPerson, phone, email, address, gstNumber, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required.' });

  const id = 'sup-' + Date.now();
  db.prepare(`
    INSERT INTO suppliers (id, name, contact_person, phone, email, address, gst_number, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, contactPerson, phone, email, address, gstNumber, notes);

  res.json({ success: true, id });
});

router.get('/purchase-orders', authenticateToken, requirePermission('purchases:manage'), (req, res) => {
  const pos = db.prepare(`
    SELECT po.*, s.name as supplier_name, u.name as created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN users u ON po.created_by_user_id = u.id
    ORDER BY po.created_at DESC
  `).all();
  res.json(pos);
});

router.post('/purchase-orders', authenticateToken, requirePermission('purchases:manage'), (req, res) => {
  const { supplierId, items, notes } = req.body;
  if (!supplierId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Supplier and at least one item are required.' });
  }

  const poId = 'po-' + Date.now();
  const poNum = 'PO-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

  const poTx = db.transaction(() => {
    let totalPaise = 0;
    const insertItem = db.prepare(`
      INSERT INTO purchase_order_items (id, purchase_order_id, variant_id, ordered_qty, unit_cost_paise, received_qty)
      VALUES (?, ?, ?, ?, ?, 0)
    `);

    items.forEach((item, idx) => {
      const itemCost = Math.round(Number(item.unitCostINR) * 100);
      const qty = parseInt(item.orderedQty, 10);
      totalPaise += (itemCost * qty);
      insertItem.run(`poi-${poId}-${idx}`, poId, item.variantId, qty, itemCost);
    });

    db.prepare(`
      INSERT INTO purchase_orders (id, po_number, supplier_id, total_amount_paise, status, notes, created_by_user_id)
      VALUES (?, ?, ?, ?, 'ORDERED', ?, ?)
    `).run(poId, poNum, supplierId, totalPaise, notes || '', req.user.id);
  });

  poTx();
  res.json({ success: true, poId, poNum });
});

router.post('/purchase-orders/:id/receive', authenticateToken, requirePermission('purchases:manage'), (req, res) => {
  const poId = req.params.id;
  const { notes } = req.body;

  const receiveTx = db.transaction(() => {
    const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poId);
    if (!po) throw new Error('Purchase order not found');
    if (po.status === 'RECEIVED') throw new Error('Purchase order already received');

    const poItems = db.prepare('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?').all(poId);
    poItems.forEach(item => {
      // Increment stock in inventory_balances
      db.prepare(`
        INSERT INTO inventory_balances (id, variant_id, location_id, available_qty, reserved_qty)
        VALUES (?, ?, 'loc-main', ?, 0)
        ON CONFLICT(variant_id, location_id) DO UPDATE SET
          available_qty = available_qty + ?,
          updated_at = datetime('now')
      `).run(`bal-${item.variant_id}`, item.variant_id, item.ordered_qty, item.ordered_qty);

      // Fetch balance after
      const current = db.prepare('SELECT available_qty FROM inventory_balances WHERE variant_id = ?').get(item.variant_id);

      // Record stock ledger movement
      db.prepare(`
        INSERT INTO stock_movements (id, variant_id, location_id, change_qty, balance_after, movement_type, reference_id, reason, created_by_user_id)
        VALUES (?, ?, 'loc-main', ?, ?, 'PURCHASE_RECEIPT', ?, ?, ?)
      `).run('mov-po-' + Date.now() + '-' + item.id, item.variant_id, item.ordered_qty, current.available_qty, po.po_number, `Goods Receipt PO #${po.po_number}`, req.user.id);

      db.prepare('UPDATE purchase_order_items SET received_qty = ordered_qty WHERE id = ?').run(item.id);
    });

    // Create goods receipt record
    const grId = 'gr-' + Date.now();
    const grNum = 'GR-' + Date.now();
    db.prepare(`
      INSERT INTO goods_receipts (id, receipt_number, purchase_order_id, received_by_user_id, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(grId, grNum, poId, req.user.id, notes || 'Full receipt verified');

    db.prepare("UPDATE purchase_orders SET status = 'RECEIVED', updated_at = datetime('now') WHERE id = ?").run(poId);
  });

  try {
    receiveTx();
    logAudit(req.user.id, req.user.email, 'PO_RECEIVED', 'PURCHASE_ORDER', poId, {}, req);
    res.json({ success: true, message: 'Stock received and inventory balances updated successfully.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==============================================================================
// 6. CLIENT CRM & PRESCRIPTION MANAGEMENT
// ==============================================================================

// ── GET /api/customers (Directory with Search, Stats & Archival Filters) ───────
router.get('/customers', authenticateToken, async (req, res) => {
  // Sync incoming cloud orders to keep client directory synchronized
  await syncSupabaseOrders(db).catch(() => {});

  const search = req.query.search ? req.query.search.trim() : '';
  const searchPattern = `%${search}%`;
  const includeArchived = req.query.includeArchived === 'true';
  const archivedOnly = req.query.archivedOnly === 'true';

  let sql = `
    SELECT 
      c.*,
      COUNT(DISTINCT o.id) as total_orders,
      COALESCE(SUM(o.total_payable_paise), c.total_spent_paise, 0) as total_purchases_paise,
      MAX(o.created_at) as last_order_date,
      (SELECT COUNT(*) FROM prescriptions p WHERE p.client_id = c.id AND p.is_archived = 0) as prescriptions_count
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'CANCELLED'
    WHERE 1=1
      AND c.id NOT IN (SELECT customer_id FROM deleted_customers WHERE customer_id IS NOT NULL)
      AND (c.phone IS NULL OR c.phone NOT IN (SELECT phone FROM deleted_customers WHERE phone IS NOT NULL))
      AND (c.name IS NULL OR LOWER(c.name) NOT IN (SELECT LOWER(name) FROM deleted_customers WHERE name IS NOT NULL))
  `;
  const params = [];

  if (archivedOnly) {
    sql += ' AND c.is_archived = 1';
  } else if (!includeArchived) {
    sql += ' AND c.is_archived = 0';
  }

  if (search) {
    sql += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.client_code LIKE ? OR c.id = ?)';
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, search);
  }

  sql += ' GROUP BY c.id ORDER BY c.created_at DESC';

  const customers = db.prepare(sql).all(...params);
  const storeSettings = getStoreSettings();
  const storeName = storeSettings.store_name || 'Noor Optics Flagship Boutique';

  const formatted = customers.map(c => ({
    ...c,
    total_purchases_inr: (c.total_purchases_paise || 0) / 100,
    tel_link: c.phone ? `tel:${c.phone}` : null,
    whatsapp_link: c.phone ? generateWhatsAppUrl(c.phone, c.name, storeName) : null
  }));

  res.json(formatted);
});

// ── GET /api/customers/export/csv (CSV Export of Directory) ───────────────────
router.get('/customers/export/csv', authenticateToken, (req, res) => {
  const customers = db.prepare(`
    SELECT 
      c.client_code, c.name, c.age, c.phone, c.email, c.city, c.address,
      c.created_at,
      COUNT(DISTINCT o.id) as total_orders,
      COALESCE(SUM(o.total_payable_paise), c.total_spent_paise, 0) as total_spent_paise
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'CANCELLED'
    WHERE c.is_archived = 0
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all();

  let csv = 'Client ID,Name,Age,Phone,Email,City,Address,Total Orders,Total Spent (INR),Created Date\r\n';
  customers.forEach(c => {
    const row = [
      c.client_code || '',
      `"${(c.name || '').replace(/"/g, '""')}"`,
      c.age || '',
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${(c.city || '').replace(/"/g, '""')}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.total_orders || 0,
      ((c.total_spent_paise || 0) / 100).toFixed(2),
      c.created_at || ''
    ];
    csv += row.join(',') + '\r\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="noor_optics_clients.csv"');
  res.send(csv);
});

// ── GET /api/customers/:id (Complete Profile with Orders, RX & History) ─────────
router.get('/customers/:id', authenticateToken, (req, res) => {
  const client = db.prepare('SELECT * FROM customers WHERE id = ? OR client_code = ?').get(req.params.id, req.params.id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  // Linked Orders
  const orders = db.prepare(`
    SELECT o.*, u.name as staff_name, inv.invoice_number
    FROM orders o
    LEFT JOIN users u ON o.staff_user_id = u.id
    LEFT JOIN invoices inv ON o.id = inv.order_id
    WHERE o.customer_id = ?
    ORDER BY o.created_at DESC
  `).all(client.id);

  const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  const enrichedOrders = orders.map(o => ({
    ...o,
    total_payable_inr: o.total_payable_paise / 100,
    amount_paid_inr: o.amount_paid_paise / 100,
    items: getItems.all(o.id).map(i => ({
      ...i,
      unit_price_inr: i.unit_price_paise / 100,
      subtotal_inr: i.subtotal_paise / 100
    }))
  }));

  // Linked Prescriptions
  const prescriptions = db.prepare(`
    SELECT p.*, u.name as created_by_name
    FROM prescriptions p
    LEFT JOIN users u ON p.created_by_user_id = u.id
    WHERE p.client_id = ?
    ORDER BY p.prescription_date DESC, p.created_at DESC
  `).all(client.id);

  // Linked Invoices
  const invoices = db.prepare(`
    SELECT inv.*
    FROM invoices inv
    JOIN orders o ON inv.order_id = o.id
    WHERE o.customer_id = ?
    ORDER BY inv.created_at DESC
  `).all(client.id).map(inv => ({
    ...inv,
    grand_total_inr: inv.grand_total_paise / 100
  }));

  // Audit Logs
  const auditLogs = db.prepare(`
    SELECT * FROM audit_logs
    WHERE entity_id = ? OR (entity_type = 'CLIENT' AND details_json LIKE ?)
    ORDER BY created_at DESC
    LIMIT 25
  `).all(client.id, `%${client.id}%`);

  const storeSettings = getStoreSettings();
  const storeName = storeSettings.store_name || 'Noor Optics Flagship Boutique';

  res.json({
    client: {
      ...client,
      total_spent_inr: (client.total_spent_paise || 0) / 100,
      tel_link: client.phone ? `tel:${client.phone}` : null,
      whatsapp_link: client.phone ? generateWhatsAppUrl(client.phone, client.name, storeName) : null
    },
    orders: enrichedOrders,
    prescriptions,
    invoices,
    auditLogs
  });
});

// ── POST /api/customers (Create New Client with Validation & Duplicate Check) ──
router.post('/customers', authenticateToken, (req, res) => {
  const { name, age, phone, city, email, address, dob, pinCode, notes, confirmDuplicate } = req.body;

  const trimmedName = (name || '').trim();
  if (!trimmedName) return res.status(400).json({ error: 'Client full name is required.' });

  const numAge = age !== undefined && age !== '' && age !== null ? parseInt(age, 10) : null;
  if (numAge !== null && (isNaN(numAge) || numAge < 1 || numAge > 125)) {
    return res.status(400).json({ error: 'Please enter a valid age (1 - 125).' });
  }

  const trimmedPhone = (phone || '').trim();
  if (!trimmedPhone) return res.status(400).json({ error: 'Client phone number is required.' });

  const trimmedCity = (city || 'Bengaluru').trim();
  if (!trimmedCity) return res.status(400).json({ error: 'City is required.' });

  // Duplicate phone warning (explicit confirmation allows shared family numbers)
  if (!confirmDuplicate) {
    const existingWithPhone = db.prepare('SELECT id, client_code, name, phone, city FROM customers WHERE phone = ? AND is_archived = 0').all(trimmedPhone);
    if (existingWithPhone.length > 0) {
      return res.status(409).json({
        duplicateWarning: true,
        message: `A client with phone ${trimmedPhone} already exists: ${existingWithPhone[0].name} (${existingWithPhone[0].client_code}). Would you like to select this existing client or proceed with a new registration?`,
        existingClients: existingWithPhone
      });
    }
  }

  const id = 'cust-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
  const clientCode = getNextClientCode();

  db.prepare(`
    INSERT INTO customers (
      id, client_code, name, age, dob, phone, email, address, city, pin_code, notes, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
    )
  `).run(
    id, clientCode, trimmedName, numAge, dob || null, trimmedPhone,
    email ? email.trim() : null, address ? address.trim() : null,
    trimmedCity, pinCode ? pinCode.trim() : null, notes ? notes.trim() : null
  );

  logAudit(req.user.id, req.user.email, 'CLIENT_CREATED', 'CLIENT', id, {
    clientCode, name: trimmedName, phone: trimmedPhone, city: trimmedCity
  }, req);

  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  pushCustomerToSupabase(created).catch(console.warn);
  res.json({ success: true, client: created, id, clientCode });
});

// ── PUT /api/customers/:id (Edit Client Details) ───────────────────────────────
router.put('/customers/:id', authenticateToken, (req, res) => {
  const client = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  const { name, age, dob, phone, email, address, city, pinCode, notes } = req.body;

  const trimmedName = name !== undefined ? name.trim() : client.name;
  if (!trimmedName) return res.status(400).json({ error: 'Client full name cannot be empty.' });

  const numAge = age !== undefined && age !== '' && age !== null ? parseInt(age, 10) : client.age;
  const trimmedPhone = phone !== undefined ? phone.trim() : client.phone;
  if (!trimmedPhone) return res.status(400).json({ error: 'Client phone number cannot be empty.' });

  const trimmedCity = city !== undefined ? city.trim() : client.city;
  const trimmedEmail = email !== undefined ? (email ? email.trim() : null) : client.email;
  const trimmedAddress = address !== undefined ? (address ? address.trim() : null) : client.address;
  const trimmedPin = pinCode !== undefined ? (pinCode ? pinCode.trim() : null) : client.pin_code;
  const trimmedNotes = notes !== undefined ? (notes ? notes.trim() : null) : client.notes;
  const trimmedDob = dob !== undefined ? (dob ? dob.trim() : null) : client.dob;

  db.prepare(`
    UPDATE customers
    SET name = ?, age = ?, dob = ?, phone = ?, email = ?, address = ?, city = ?, pin_code = ?, notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(trimmedName, numAge, trimmedDob, trimmedPhone, trimmedEmail, trimmedAddress, trimmedCity, trimmedPin, trimmedNotes, client.id);

  logAudit(req.user.id, req.user.email, 'CLIENT_UPDATED', 'CLIENT', client.id, {
    before: { name: client.name, phone: client.phone, city: client.city },
    after: { name: trimmedName, phone: trimmedPhone, city: trimmedCity }
  }, req);

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(client.id);
  pushCustomerToSupabase(updated).catch(console.warn);
  res.json({ success: true, client: updated });
});

// ── DELETE /api/customers/:id (Safe Archival or Permanent Deletion) ───────────
router.delete('/customers/:id', authenticateToken, (req, res) => {
  const client = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  const isPermanent = req.query.permanent === 'true' || (req.body && req.body.permanent === true);
  if (isPermanent) {
    // 1. Tombstone in SQLite so background sync never resurrects it
    try {
      db.prepare(`
        INSERT OR REPLACE INTO deleted_customers (customer_id, client_code, name, phone, deleted_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(client.id, client.client_code, client.name || null, client.phone || null);
    } catch (e) {
      console.warn('Tombstone insert note:', e.message);
    }

    // 2. Delete from Supabase cloud
    deleteCustomerFromSupabase(client.id, client.phone).catch(console.warn);

    // 3. Remove linked prescriptions & disassociate orders
    db.prepare('DELETE FROM prescriptions WHERE client_id = ?').run(client.id);
    db.prepare('UPDATE orders SET customer_id = NULL WHERE customer_id = ?').run(client.id);
    db.prepare('DELETE FROM customers WHERE id = ?').run(client.id);

    logAudit(req.user.id, req.user.email, 'CLIENT_DELETED_PERMANENTLY', 'CLIENT', client.id, {
      clientCode: client.client_code, name: client.name
    }, req);

    return res.json({ success: true, message: `Client ${client.name} (${client.client_code}) has been permanently deleted.` });
  }

  const reason = (req.body && req.body.reason) || req.query.reason || 'Archived by staff request';

  db.prepare(`
    UPDATE customers
    SET is_archived = 1, archived_at = datetime('now'), archived_reason = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(reason, client.id);

  logAudit(req.user.id, req.user.email, 'CLIENT_ARCHIVED', 'CLIENT', client.id, {
    clientCode: client.client_code, name: client.name, reason
  }, req);

  res.json({ success: true, message: `Client ${client.name} (${client.client_code}) has been archived safely without deleting purchase history.` });
});

// ── DELETE /api/customers (Delete All Clients) ───────────────────────────────
router.delete('/customers', authenticateToken, (req, res) => {
  // Verify permissions (owner or inventory/admin)
  const isOwner = req.user.roleId === 'role-owner' || (req.user.permissions && (req.user.permissions.includes('*') || req.user.permissions.includes('orders:manage')));
  if (!isOwner) {
    return res.status(403).json({ error: 'Permission denied: Only business owners or store managers can delete all clients.' });
  }

  try {
    const allClients = db.prepare('SELECT id, client_code, name, phone FROM customers').all();

    // 1. Tombstone all customers in deleted_customers
    const insertTombstone = db.prepare(`
      INSERT OR REPLACE INTO deleted_customers (customer_id, client_code, name, phone, deleted_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    allClients.forEach(c => {
      try { insertTombstone.run(c.id, c.client_code, c.name || null, c.phone || null); } catch (e) {}
    });

    // 2. Delete all from Supabase cloud
    deleteAllCustomersFromSupabase().catch(console.warn);

    // 3. Clear prescriptions & disassociate orders
    db.prepare('DELETE FROM prescriptions').run();
    db.prepare('UPDATE orders SET customer_id = NULL').run();
    db.prepare('DELETE FROM customers').run();

    logAudit(req.user.id, req.user.email, 'ALL_CLIENTS_DELETED', 'CLIENT', 'ALL', {
      count: allClients.length
    }, req);

    res.json({ success: true, count: allClients.length, message: `All ${allClients.length} clients have been permanently deleted from database and cloud.` });
  } catch (err) {
    console.error('Error deleting all customers:', err);
    res.status(500).json({ error: 'Failed to delete all clients: ' + err.message });
  }
});

// ── POST /api/customers/:id/restore (Restore Archived Client) ───────────────────
router.post('/customers/:id/restore', authenticateToken, (req, res) => {
  const client = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found.' });

  db.prepare(`
    UPDATE customers
    SET is_archived = 0, archived_at = NULL, archived_reason = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).run(client.id);

  logAudit(req.user.id, req.user.email, 'CLIENT_RESTORED', 'CLIENT', client.id, {
    clientCode: client.client_code, name: client.name
  }, req);

  res.json({ success: true, message: `Client ${client.name} restored successfully.` });
});

// ── GET /api/customers/:clientId/prescriptions (Client Prescriptions History) ─
router.get('/customers/:clientId/prescriptions', authenticateToken, (req, res) => {
  const rxList = db.prepare(`
    SELECT p.*, u.name as staff_name
    FROM prescriptions p
    LEFT JOIN users u ON p.created_by_user_id = u.id
    WHERE p.client_id = ?
    ORDER BY p.prescription_date DESC, p.created_at DESC
  `).all(req.params.clientId);

  res.json(rxList);
});

// ── POST /api/prescriptions (Create New Structured Prescription) ───────────────
router.post('/prescriptions', authenticateToken, (req, res) => {
  const targetClientId = req.body.clientId || req.body.client_id;
  const prescriptionDate = req.body.prescriptionDate || req.body.prescription_date || new Date().toISOString().slice(0, 10);
  const odSph = req.body.odSph !== undefined ? req.body.odSph : req.body.od_sph;
  const odCyl = req.body.odCyl !== undefined ? req.body.odCyl : req.body.od_cyl;
  const odAxis = req.body.odAxis !== undefined ? req.body.odAxis : req.body.od_axis;
  const osSph = req.body.osSph !== undefined ? req.body.osSph : req.body.os_sph;
  const osCyl = req.body.osCyl !== undefined ? req.body.osCyl : req.body.os_cyl;
  const osAxis = req.body.osAxis !== undefined ? req.body.osAxis : req.body.os_axis;
  const addition = req.body.addition;
  const ipdDistance = req.body.ipdDistance !== undefined ? req.body.ipdDistance : req.body.ipd_distance;
  const ipdNear = req.body.ipdNear !== undefined ? req.body.ipdNear : req.body.ipd_near;
  const checkedBy = req.body.checkedBy || req.body.checked_by;
  const prescriberDetails = req.body.prescriberDetails || req.body.prescriber_details;
  const notes = req.body.notes;
  const imageUrl = req.body.imageUrl || req.body.image_url;

  if (!targetClientId) {
    return res.status(400).json({ error: 'Client ID is required to record a prescription.' });
  }

  const client = db.prepare('SELECT id, name FROM customers WHERE id = ?').get(targetClientId);
  if (!client) {
    return res.status(404).json({ error: 'Client not found.' });
  }

  const id = 'rx-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
  const rxNumber = getNextPrescriptionNumber();

  db.prepare(`
    INSERT INTO prescriptions (
      id, prescription_number, client_id, prescription_date,
      od_sph, od_cyl, od_axis, os_sph, os_cyl, os_axis,
      addition, ipd_distance, ipd_near, checked_by, prescriber_details,
      notes, image_url, created_by_user_id, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, datetime('now'), datetime('now')
    )
  `).run(
    id, rxNumber, targetClientId, prescriptionDate,
    odSph || null, odCyl || null, odAxis || null,
    osSph || null, osCyl || null, osAxis || null,
    addition || null, ipdDistance || null, ipdNear || null,
    checkedBy || req.user.name || null, prescriberDetails || null,
    notes || null, imageUrl || null, req.user.id
  );

  logAudit(req.user.id, req.user.email, 'PRESCRIPTION_CREATED', 'PRESCRIPTION', id, {
    prescriptionNumber: rxNumber, clientId: targetClientId, clientName: client.name
  }, req);

  const created = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id);
  pushPrescriptionToSupabase({
    ...created,
    client_name: client.name,
    client_phone: client.phone
  }).catch(console.warn);
  res.json({ success: true, prescription: created, id, prescriptionNumber: rxNumber });
});

// ── GET /api/prescriptions/:id (Single Prescription Details) ───────────────────
router.get('/prescriptions/:id', authenticateToken, (req, res) => {
  const rx = db.prepare(`
    SELECT p.*, c.name as client_name, c.client_code, c.phone as client_phone, c.age as client_age, c.city as client_city, u.name as staff_name
    FROM prescriptions p
    LEFT JOIN customers c ON p.client_id = c.id
    LEFT JOIN users u ON p.created_by_user_id = u.id
    WHERE p.id = ? OR p.prescription_number = ?
  `).get(req.params.id, req.params.id);

  if (!rx) return res.status(404).json({ error: 'Prescription not found.' });
  res.json(rx);
});

// ── PUT /api/prescriptions/:id (Update Prescription) ──────────────────────────
router.put('/prescriptions/:id', authenticateToken, (req, res) => {
  const rx = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id);
  if (!rx) return res.status(404).json({ error: 'Prescription not found.' });

  const odSph = req.body.odSph !== undefined ? req.body.odSph : req.body.od_sph;
  const odCyl = req.body.odCyl !== undefined ? req.body.odCyl : req.body.od_cyl;
  const odAxis = req.body.odAxis !== undefined ? req.body.odAxis : req.body.od_axis;
  const osSph = req.body.osSph !== undefined ? req.body.osSph : req.body.os_sph;
  const osCyl = req.body.osCyl !== undefined ? req.body.osCyl : req.body.os_cyl;
  const osAxis = req.body.osAxis !== undefined ? req.body.osAxis : req.body.os_axis;
  const addition = req.body.addition !== undefined ? req.body.addition : req.body.addition;
  const ipdDistance = req.body.ipdDistance !== undefined ? req.body.ipdDistance : req.body.ipd_distance;
  const ipdNear = req.body.ipdNear !== undefined ? req.body.ipdNear : req.body.ipd_near;
  const checkedBy = req.body.checkedBy !== undefined ? req.body.checkedBy : req.body.checked_by;
  const prescriberDetails = req.body.prescriberDetails !== undefined ? req.body.prescriberDetails : req.body.prescriber_details;
  const notes = req.body.notes !== undefined ? req.body.notes : req.body.notes;
  const imageUrl = req.body.imageUrl !== undefined ? req.body.imageUrl : req.body.image_url;
  const prescriptionDate = req.body.prescriptionDate || req.body.prescription_date;

  db.prepare(`
    UPDATE prescriptions
    SET prescription_date = COALESCE(?, prescription_date),
        od_sph = ?, od_cyl = ?, od_axis = ?,
        os_sph = ?, os_cyl = ?, os_axis = ?,
        addition = ?, ipd_distance = ?, ipd_near = ?,
        checked_by = ?, prescriber_details = ?,
        notes = ?, image_url = COALESCE(?, image_url),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    prescriptionDate || null,
    odSph !== undefined ? odSph : rx.od_sph,
    odCyl !== undefined ? odCyl : rx.od_cyl,
    odAxis !== undefined ? odAxis : rx.od_axis,
    osSph !== undefined ? osSph : rx.os_sph,
    osCyl !== undefined ? osCyl : rx.os_cyl,
    osAxis !== undefined ? osAxis : rx.os_axis,
    addition !== undefined ? addition : rx.addition,
    ipdDistance !== undefined ? ipdDistance : rx.ipd_distance,
    ipdNear !== undefined ? ipdNear : rx.ipd_near,
    checkedBy !== undefined ? checkedBy : rx.checked_by,
    prescriberDetails !== undefined ? prescriberDetails : rx.prescriber_details,
    notes !== undefined ? notes : rx.notes,
    imageUrl || null,
    rx.id
  );

  logAudit(req.user.id, req.user.email, 'PRESCRIPTION_UPDATED', 'PRESCRIPTION', rx.id, {
    prescriptionNumber: rx.prescription_number
  }, req);

  const updated = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(rx.id);
  res.json({ success: true, prescription: updated });
});

// ── POST /api/prescriptions/upload-image (Save Uploaded RX Image Securely) ────
router.post('/prescriptions/upload-image', authenticateToken, (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'Image data is required.' });
  }

  try {
    const rxDir = path.join(__dirname, '..', 'images', 'prescriptions');
    if (!fs.existsSync(rxDir)) {
      fs.mkdirSync(rxDir, { recursive: true });
    }

    const extMatch = imageBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,/);
    const ext = extMatch ? extMatch[1].replace('jpeg', 'jpg') : 'jpg';
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, '');

    const safeName = `rx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(rxDir, safeName);

    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
    const relativeUrl = `images/prescriptions/${safeName}`;

    res.json({ success: true, imageUrl: relativeUrl });
  } catch (err) {
    console.error('Image upload failed:', err);
    res.status(500).json({ error: 'Failed to save prescription image: ' + err.message });
  }
});

// ── POST /api/products/upload-image (Save Uploaded Frame Photo) ──────────────
router.post('/products/upload-image', authenticateToken, (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'Image data is required.' });
  }

  try {
    const frameDir = path.join(__dirname, '..', 'images', 'frames');
    if (!fs.existsSync(frameDir)) {
      fs.mkdirSync(frameDir, { recursive: true });
    }

    const extMatch = imageBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,/);
    const ext = extMatch ? extMatch[1].replace('jpeg', 'jpg') : 'jpg';
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, '');

    const safeName = `frame_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = path.join(frameDir, safeName);

    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
    const relativeUrl = `images/frames/${safeName}`;

    res.json({ success: true, imageUrl: relativeUrl });
  } catch (err) {
    console.error('Frame photo upload failed:', err);
    res.status(500).json({ error: 'Failed to save frame image: ' + err.message });
  }
});

// ==============================================================================
// 7. POINT OF SALE (POS) CHECKOUT (ATOMIC TRANSACTION WITH CLIENT INTEGRATION)
// ==============================================================================

router.post('/pos/checkout', authenticateToken, requirePermission('pos:checkout'), (req, res) => {
  const {
    customerId, prescriptionId, customerName = 'Walk-in Client', customerPhone, customerEmail,
    clientDetails, newPrescription,
    items, discountINR = 0, discount_paise, discountReason,
    notes
  } = req.body;

  const paymentMethod = req.body.paymentMethod || req.body.payment_method || 'CASH';
  const claimedUpiRef = req.body.claimedUpiRef || req.body.claimed_upi_ref || null;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart must contain at least one item.' });
  }

  // Permission check for discounts
  const discountPaise = discount_paise !== undefined ? parseInt(discount_paise, 10) : Math.round(Number(discountINR || 0) * 100);
  if (discountPaise > 0 && !req.user.permissions.includes('pos:discount') && req.user.roleId !== 'role-owner') {
    return res.status(403).json({ error: 'Forbidden: Insufficient privileges to apply discounts.' });
  }

  const orderId = 'ord-pos-' + Date.now();
  const orderNumber = generateOrderNumber();
  const tokenNumber = getNextDailyTokenNumber();
  const invoiceNumber = generateInvoiceNumber();

  const checkoutTx = db.transaction(() => {
    // 0. Resolve or create customer permanently
    let finalCustomerId = customerId || null;
    let finalCustomerName = customerName;
    let finalCustomerPhone = customerPhone || null;
    let finalCustomerEmail = customerEmail || null;

    const effectiveClient = clientDetails || ((customerName && customerName !== 'Walk-in Client') || customerPhone ? {
      name: customerName || 'Walk-in Client',
      phone: customerPhone || null,
      email: customerEmail || null,
      age: req.body.customerAge || req.body.age,
      city: req.body.customerCity || req.body.city,
      address: req.body.deliveryAddress || req.body.address,
      notes: req.body.notes
    } : null);

    if (!finalCustomerId && effectiveClient && effectiveClient.name) {
      const existingClient = effectiveClient.phone
        ? db.prepare('SELECT id, name, phone, email FROM customers WHERE phone = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND is_archived = 0').get(effectiveClient.phone.trim(), effectiveClient.name.trim())
        : null;
      if (existingClient) {
        finalCustomerId = existingClient.id;
        finalCustomerName = existingClient.name;
        finalCustomerPhone = existingClient.phone;
        finalCustomerEmail = existingClient.email;
        // Update details if provided
        db.prepare(`
          UPDATE customers
          SET age = COALESCE(?, age), city = COALESCE(?, city), notes = COALESCE(?, notes), updated_at = datetime('now')
          WHERE id = ?
        `).run(effectiveClient.age ? parseInt(effectiveClient.age, 10) : null, effectiveClient.city || null, effectiveClient.notes || null, existingClient.id);
      } else {
        finalCustomerId = 'cust-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
        const clientCode = getNextClientCode();
        db.prepare(`
          INSERT INTO customers (id, client_code, name, age, phone, email, address, city, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          finalCustomerId, clientCode, effectiveClient.name.trim(),
          effectiveClient.age ? parseInt(effectiveClient.age, 10) : null,
          effectiveClient.phone ? effectiveClient.phone.trim() : null,
          effectiveClient.email ? effectiveClient.email.trim() : null,
          effectiveClient.address ? effectiveClient.address.trim() : null,
          effectiveClient.city ? effectiveClient.city.trim() : 'Bengaluru',
          effectiveClient.notes ? effectiveClient.notes.trim() : 'Created during in-store POS billing'
        );
        finalCustomerName = effectiveClient.name.trim();
        finalCustomerPhone = effectiveClient.phone ? effectiveClient.phone.trim() : null;
        finalCustomerEmail = effectiveClient.email ? effectiveClient.email.trim() : null;
      }
    } else if (finalCustomerId) {
      const client = db.prepare('SELECT * FROM customers WHERE id = ?').get(finalCustomerId);
      if (client) {
        finalCustomerName = client.name;
        finalCustomerPhone = client.phone;
        finalCustomerEmail = client.email;
      }
    }

    // 0b. Resolve or create new prescription if submitted
    const incomingRx = newPrescription || req.body.prescription;
    let finalPrescriptionId = prescriptionId || null;

    if (incomingRx && !finalCustomerId) {
      finalCustomerId = 'cust-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
      const clientCode = getNextClientCode();
      db.prepare(`
        INSERT INTO customers (id, client_code, name, age, phone, email, address, city, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        finalCustomerId, clientCode, finalCustomerName || 'Walk-in Client',
        req.body.customerAge || req.body.age ? parseInt(req.body.customerAge || req.body.age, 10) : null,
        finalCustomerPhone, finalCustomerEmail, null, req.body.customerCity || 'Bengaluru',
        'Auto-created for prescription record'
      );
    }

    if (incomingRx && finalCustomerId) {
      finalPrescriptionId = 'rx-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
      const rxNumber = getNextPrescriptionNumber();
      db.prepare(`
        INSERT INTO prescriptions (
          id, prescription_number, client_id, prescription_date,
          od_sph, od_cyl, od_axis, os_sph, os_cyl, os_axis,
          addition, ipd_distance, ipd_near, checked_by, prescriber_details,
          notes, image_url, created_by_user_id, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, datetime('now'), datetime('now')
        )
      `).run(
        finalPrescriptionId, rxNumber, finalCustomerId,
        incomingRx.prescriptionDate || incomingRx.prescription_date || new Date().toISOString().slice(0, 10),
        incomingRx.odSph || incomingRx.od_sph || null,
        incomingRx.odCyl || incomingRx.od_cyl || null,
        incomingRx.odAxis !== undefined ? incomingRx.odAxis : (incomingRx.od_axis !== undefined ? incomingRx.od_axis : null),
        incomingRx.osSph || incomingRx.os_sph || null,
        incomingRx.osCyl || incomingRx.os_cyl || null,
        incomingRx.osAxis !== undefined ? incomingRx.osAxis : (incomingRx.os_axis !== undefined ? incomingRx.os_axis : null),
        incomingRx.addition || null,
        incomingRx.ipdDistance !== undefined ? incomingRx.ipdDistance : (incomingRx.ipd_distance !== undefined ? incomingRx.ipd_distance : null),
        incomingRx.ipdNear !== undefined ? incomingRx.ipdNear : (incomingRx.ipd_near !== undefined ? incomingRx.ipd_near : null),
        incomingRx.checkedBy || incomingRx.checked_by || req.user.name || null,
        incomingRx.prescriberDetails || incomingRx.prescriber_details || null,
        incomingRx.notes || null,
        incomingRx.imageUrl || incomingRx.image_url || null,
        req.user.id
      );
    }

    let subtotalPaise = 0;
    const preparedItems = [];

    // 1. Validate & calculate line items and stock
    for (const item of items) {
      const vId = item.variantId || item.variant_id;
      let variant = db.prepare(`
        SELECT pv.*, p.name as prod_name, p.selling_price_paise, p.purchase_cost_paise, COALESCE(ib.available_qty, 0) as available_qty
        FROM product_variants pv
        JOIN products p ON pv.product_id = p.id
        LEFT JOIN inventory_balances ib ON pv.id = ib.variant_id
        WHERE pv.id = ?
      `).get(vId);

      // Fallback: search by product_id or sku
      if (!variant && vId) {
        variant = db.prepare(`
          SELECT pv.*, p.name as prod_name, p.selling_price_paise, p.purchase_cost_paise, COALESCE(ib.available_qty, 0) as available_qty
          FROM product_variants pv
          JOIN products p ON pv.product_id = p.id
          LEFT JOIN inventory_balances ib ON pv.id = ib.variant_id
          WHERE pv.product_id = ? OR pv.sku = ? OR p.sku = ?
          LIMIT 1
        `).get(vId, vId, vId);
      }

      // Ultimate fallback: first available catalog variant
      if (!variant) {
        variant = db.prepare(`
          SELECT pv.*, p.name as prod_name, p.selling_price_paise, p.purchase_cost_paise, COALESCE(ib.available_qty, 0) as available_qty
          FROM product_variants pv
          JOIN products p ON pv.product_id = p.id
          LEFT JOIN inventory_balances ib ON pv.id = ib.variant_id
          ORDER BY pv.id ASC LIMIT 1
        `).get();
      }

      const qty = parseInt(item.quantity || 1, 10);
      const unitPrice = item.unitPricePaise ? parseInt(item.unitPricePaise, 10) : (item.unit_price_paise ? parseInt(item.unit_price_paise, 10) : (variant ? variant.selling_price_paise : 349900));
      const lineSubtotal = unitPrice * qty;
      subtotalPaise += lineSubtotal;

      const brand = item.brand || (variant ? (variant.brand || 'Noor Optics') : 'Noor Optics');
      const model = item.model || (variant ? variant.prod_name : 'Noor Optical Frame');
      const shape = item.shape || (variant ? (variant.shape || 'Optical') : 'Optical');
      const color = item.color || (variant ? variant.color_name : 'Standard Frame');
      const size = item.size || (variant ? (variant.fit || 'Regular') : 'Regular');

      preparedItems.push({
        id: 'oit-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        order_id: orderId,
        variant_id: variant ? variant.id : 'var-noor-01-1',
        product_name: variant ? variant.prod_name : 'Noor Optical Frame',
        variant_name: variant ? variant.color_name : 'Standard Frame',
        sku: variant ? variant.sku : 'NOOR-POS-FRAME',
        brand,
        model,
        shape,
        color,
        size,
        lens_name: item.lensName || 'Standard Demo Lens',
        unit_price_paise: unitPrice,
        purchase_cost_paise: variant ? variant.purchase_cost_paise : 145000,
        quantity: qty,
        subtotal_paise: lineSubtotal
      });

      // Safely decrement or create inventory balance
      const existingBal = db.prepare('SELECT available_qty FROM inventory_balances WHERE variant_id = ?').get(variant.id);
      let newBal = 0;
      if (existingBal) {
        newBal = Math.max(0, existingBal.available_qty - qty);
        db.prepare(`
          UPDATE inventory_balances
          SET available_qty = ?, updated_at = datetime('now')
          WHERE variant_id = ?
        `).run(newBal, variant.id);
      } else {
        db.prepare(`
          INSERT INTO inventory_balances (id, variant_id, location_id, available_qty, reserved_qty, updated_at)
          VALUES (?, ?, 'loc-main', 0, 0, datetime('now'))
        `).run('ib-' + Date.now() + '-' + variant.id, variant.id);
      }

      // Record Stock Movement safely
      db.prepare(`
        INSERT INTO stock_movements (id, variant_id, location_id, change_qty, balance_after, movement_type, reference_id, reason, created_by_user_id)
        VALUES (?, ?, 'loc-main', ?, ?, 'SALE_POS', ?, 'Physical Store POS Checkout', ?)
      `).run('mov-' + Date.now() + '-' + variant.id, variant.id, -qty, newBal, orderNumber, req.user.id);
    }

    const taxRate = 0.18; // 18% GST inclusive
    const netBase = Math.max(0, subtotalPaise - discountPaise);
    const taxPaise = Math.round(netBase - (netBase / (1 + taxRate)));
    const totalPayablePaise = netBase;

    // Payment Logic
    let paymentStatus = 'VERIFIED';
    let amountPaidPaise = totalPayablePaise;
    let outstandingPaise = 0;

    if (paymentMethod === 'UPI_GPAY') {
      paymentStatus = req.body.isVerifiedAtCounter ? 'VERIFIED' : 'AWAITING_VERIFICATION';
      if (paymentStatus === 'AWAITING_VERIFICATION') {
        amountPaidPaise = 0;
        outstandingPaise = totalPayablePaise;
      }
    }

    // 2. Insert Order (With authoritative customer_id and prescription_id)
    db.prepare(`
      INSERT INTO orders (
        id, order_number, token_number, channel, customer_id, customer_name,
        customer_phone, customer_email, prescription_id, status, payment_status, subtotal_paise,
        discount_paise, discount_reason, tax_paise, total_payable_paise,
        amount_paid_paise, outstanding_paise, staff_user_id, notes
      ) VALUES (
        ?, ?, ?, 'POS', ?, ?,
        ?, ?, ?, 'CONFIRMED', ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      orderId, orderNumber, tokenNumber, finalCustomerId, finalCustomerName,
      finalCustomerPhone, finalCustomerEmail, finalPrescriptionId, paymentStatus, subtotalPaise,
      discountPaise, discountReason || null, taxPaise, totalPayablePaise,
      amountPaidPaise, outstandingPaise, req.user.id, notes || null
    );

    // Update customer's total spent
    if (finalCustomerId) {
      db.prepare(`
        UPDATE customers
        SET total_spent_paise = total_spent_paise + ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(totalPayablePaise, finalCustomerId);
    }

    // 3. Insert Order Items
    const insertItem = db.prepare(`
      INSERT INTO order_items (
        id, order_id, variant_id, product_name, variant_name, sku,
        brand, model, shape, color, size,
        lens_name, unit_price_paise, purchase_cost_paise, quantity, subtotal_paise
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    preparedItems.forEach(i => {
      insertItem.run(
        i.id, i.order_id, i.variant_id, i.product_name, i.variant_name, i.sku,
        i.brand || null, i.model || null, i.shape || null, i.color || null, i.size || null,
        i.lens_name, i.unit_price_paise, i.purchase_cost_paise, i.quantity, i.subtotal_paise
      );
    });

    // 4. Record Payment
    const paymentId = 'pay-' + Date.now();
    db.prepare(`
      INSERT INTO payments (id, order_id, payment_method, amount_paise, status, claimed_upi_ref, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId, orderId, paymentMethod, totalPayablePaise,
      paymentStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING_VERIFICATION',
      claimedUpiRef || null, 'POS checkout'
    );

    // 5. Generate Immutable Invoice
    const invoiceId = 'inv-' + Date.now();
    const snapshotJson = JSON.stringify({
      orderNumber, tokenNumber, customerName: finalCustomerName, customerPhone: finalCustomerPhone,
      items: preparedItems, subtotalPaise, discountPaise, taxPaise, totalPayablePaise,
      prescriptionId: finalPrescriptionId
    });

    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, order_id, customer_name, customer_phone, customer_email,
        subtotal_paise, discount_paise, tax_paise, grand_total_paise, amount_paid_paise,
        payment_status, payment_method, snapshot_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId, invoiceNumber, orderId, finalCustomerName, finalCustomerPhone, finalCustomerEmail,
      subtotalPaise, discountPaise, taxPaise, totalPayablePaise, amountPaidPaise,
      paymentStatus, paymentMethod, snapshotJson
    );

    const insertInvItem = db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, product_name, sku, quantity, unit_price_paise, subtotal_paise)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    preparedItems.forEach((pi, idx) => {
      insertInvItem.run('init-' + invoiceId + '-' + idx, invoiceId, pi.product_name, pi.sku, pi.quantity, pi.unit_price_paise, pi.subtotal_paise);
    });

    // 6. Enqueue Thermal Print Job
    const printJob = enqueuePrintJob(orderId, tokenNumber, 'TOKEN');

    return {
      orderId,
      orderNumber,
      tokenNumber,
      invoiceNumber,
      invoiceId,
      totalPayableINR: totalPayablePaise / 100,
      paymentStatus,
      printJobId: printJob.jobId,
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      prescriptionId: finalPrescriptionId
    };
  });

  try {
    const result = checkoutTx();
    logAudit(req.user.id, req.user.email, 'POS_SALE_COMPLETED', 'ORDER', result.orderId, {
      orderNumber, total: result.totalPayableINR, customerId: result.customerId
    }, req);

    pushOrderToSupabase({
      orderNumber,
      customerName: result.customerName,
      customerPhone: req.body.customerPhone || (req.body.clientDetails && req.body.clientDetails.phone),
      customerEmail: req.body.customerEmail || (req.body.clientDetails && req.body.clientDetails.email),
      items: req.body.items,
      prescriptionId: result.prescriptionId,
      paymentMethod: req.body.paymentMethod,
      grandTotalINR: result.totalPayableINR
    }).catch(err => console.warn('[SupabaseSync] Push POS order note:', err.message));

    // Push customer to Supabase Cloud
    if (result.customerId) {
      const custRecord = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.customerId);
      if (custRecord) {
        pushCustomerToSupabase(custRecord).catch(err => console.warn('[SupabaseSync] Push POS customer note:', err.message));
      }
    }

    // Push prescription to Supabase Cloud
    if (result.prescriptionId) {
      const rxRecord = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(result.prescriptionId);
      if (rxRecord) {
        pushPrescriptionToSupabase({
          ...rxRecord,
          client_name: result.customerName,
          client_phone: req.body.customerPhone || (req.body.clientDetails && req.body.clientDetails.phone)
        }).catch(err => console.warn('[SupabaseSync] Push POS rx note:', err.message));
      }
    }

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==============================================================================
// 8. ONLINE STOREFRONT ORDERS (PUBLIC ENDPOINT)
// ==============================================================================

router.post('/orders/online', (req, res) => {
  const {
    customerName, customerEmail, customerPhone, customerAge, age, deliveryAddress, city, pinCode,
    prescriptionPref, prescription, paymentMethod = 'UPI_GPAY', items
  } = req.body;

  if (!customerName || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Customer name and items are required.' });
  }

  const finalAge = customerAge !== undefined ? (customerAge ? parseInt(customerAge, 10) : null) : (age ? parseInt(age, 10) : null);
  const orderId = 'ord-onl-' + Date.now();
  const orderNumber = generateOrderNumber();
  const tokenNumber = getNextDailyTokenNumber();
  const invoiceNumber = generateInvoiceNumber();

  let createdCustomerId = null;
  let createdPrescriptionId = null;

  const onlineTx = db.transaction(() => {
    let subtotalPaise = 0;
    const preparedItems = [];

    for (const item of items) {
      // Find variant or fallback by product ID
      let variant = null;
      if (item.variantId) {
        variant = db.prepare(`
          SELECT pv.*, p.name as prod_name, p.brand, p.shape, p.fit, p.selling_price_paise, p.purchase_cost_paise
          FROM product_variants pv
          JOIN products p ON pv.product_id = p.id
          WHERE pv.id = ?
        `).get(item.variantId);
      }
      if (!variant && item.id) {
        variant = db.prepare(`
          SELECT pv.*, p.name as prod_name, p.brand, p.shape, p.fit, p.selling_price_paise, p.purchase_cost_paise
          FROM product_variants pv
          JOIN products p ON pv.product_id = p.id
          WHERE p.id = ? LIMIT 1
        `).get(item.id);
      }

      const qty = parseInt(item.quantity || 1, 10);
      const unitPrice = item.unitPrice ? Math.round(Number(item.unitPrice) * 100) : (variant ? variant.selling_price_paise : 349900);
      const lineSubtotal = unitPrice * qty;
      subtotalPaise += lineSubtotal;

      const varId = variant ? variant.id : 'var-noor-01-1';
      const prodName = item.name || (variant ? variant.prod_name : 'Noor Optical Frame');
      const varName = item.color || (variant ? variant.color_name : 'Matte Black');
      const sku = variant ? variant.sku : 'NOOR-ONLINE-FRAME';
      const brand = item.brand || (variant ? variant.brand : 'Noor Optics');
      const model = item.model || prodName;
      const shape = item.shape || (variant ? variant.shape : 'Classic');
      const color = varName;
      const size = item.size || (variant ? variant.fit : 'Regular');

      preparedItems.push({
        id: 'oit-onl-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        order_id: orderId,
        variant_id: varId,
        product_name: prodName,
        variant_name: varName,
        sku,
        brand,
        model,
        shape,
        color,
        size,
        lens_name: item.lensName || item.lens || 'Blue-Light Filter',
        unit_price_paise: unitPrice,
        purchase_cost_paise: variant ? variant.purchase_cost_paise : 145000,
        quantity: qty,
        subtotal_paise: lineSubtotal
      });

      // Deduct stock if variant exists
      if (variant) {
        db.prepare('UPDATE inventory_balances SET available_qty = MAX(0, available_qty - ?) WHERE variant_id = ?').run(qty, variant.id);
      }
    }

    const shippingPaise = subtotalPaise >= 199900 ? 0 : 19900;
    const totalPayablePaise = subtotalPaise + shippingPaise;
    const taxPaise = Math.round(totalPayablePaise * 0.18 / 1.18);

    // Resolve or create customer permanently (unless customer is tombstoned/deleted)
    let customerId = null;
    const isTombstoned = Boolean(
      (customerPhone && db.prepare('SELECT customer_id FROM deleted_customers WHERE phone = ?').get(customerPhone.trim())) ||
      (customerName && db.prepare('SELECT customer_id FROM deleted_customers WHERE LOWER(name) = LOWER(?)').get(customerName.trim()))
    );

    if (!isTombstoned) {
      const existingCust = customerPhone
        ? db.prepare('SELECT id FROM customers WHERE phone = ? AND is_archived = 0').get(customerPhone.trim())
        : (customerEmail ? db.prepare('SELECT id FROM customers WHERE email = ? AND is_archived = 0').get(customerEmail.trim()) : null);

      if (existingCust) {
        customerId = existingCust.id;
        db.prepare(`
          UPDATE customers
          SET total_spent_paise = total_spent_paise + ?, age = COALESCE(?, age), city = COALESCE(?, city), updated_at = datetime('now')
          WHERE id = ?
        `).run(totalPayablePaise, finalAge, city || null, customerId);
      } else {
        customerId = 'cust-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
        const clientCode = getNextClientCode();
        db.prepare(`
          INSERT INTO customers (id, client_code, name, age, phone, email, address, city, pin_code, notes, total_spent_paise, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Created via Online Storefront Order', ?, datetime('now'), datetime('now'))
        `).run(
          customerId, clientCode, customerName.trim(), finalAge, customerPhone ? customerPhone.trim() : null,
          customerEmail ? customerEmail.trim() : null, deliveryAddress ? deliveryAddress.trim() : null,
          city || 'Bengaluru', pinCode ? pinCode.trim() : null, totalPayablePaise
        );
      }
    }
    createdCustomerId = customerId;

    // Resolve or create prescription record
    let finalPrescriptionId = null;
    if (prescription && (prescription.od_sph != null || prescription.odSph != null || prescription.os_sph != null || prescription.osSph != null || prescription.imageUrl || prescription.image_url)) {
      finalPrescriptionId = 'rx-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
      const rxNumber = getNextPrescriptionNumber();
      db.prepare(`
        INSERT INTO prescriptions (
          id, prescription_number, client_id, prescription_date,
          od_sph, od_cyl, od_axis, os_sph, os_cyl, os_axis,
          addition, ipd_distance, ipd_near, checked_by, prescriber_details,
          notes, image_url, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, datetime('now'), datetime('now')
        )
      `).run(
        finalPrescriptionId, rxNumber, customerId,
        prescription.prescriptionDate || prescription.prescription_date || new Date().toISOString().slice(0, 10),
        prescription.od_sph || prescription.odSph || '0.00',
        prescription.od_cyl || prescription.odCyl || '0.00',
        prescription.od_axis !== undefined ? prescription.od_axis : (prescription.odAxis !== undefined ? prescription.odAxis : null),
        prescription.os_sph || prescription.osSph || '0.00',
        prescription.os_cyl || prescription.osCyl || '0.00',
        prescription.os_axis !== undefined ? prescription.os_axis : (prescription.osAxis !== undefined ? prescription.osAxis : null),
        prescription.addition || prescription.add || null,
        prescription.ipd_distance || prescription.ipdDistance || prescription.pd || null,
        prescription.ipd_near || prescription.ipdNear || null,
        prescription.checked_by || prescription.checkedBy || 'Website Client Submission',
        prescription.prescriber_details || prescription.prescriberDetails || null,
        prescription.notes || null,
        prescription.image_url || prescription.imageUrl || null
      );
      createdPrescriptionId = finalPrescriptionId;
    }

    db.prepare(`
      INSERT INTO orders (
        id, order_number, token_number, channel, customer_id, customer_name, customer_phone,
        customer_email, customer_age, delivery_address, city, pin_code, prescription_pref, prescription_id,
        status, payment_status, subtotal_paise, tax_paise, total_payable_paise,
        amount_paid_paise, outstanding_paise, notes
      ) VALUES (
        ?, ?, ?, 'ONLINE', ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        'CONFIRMED', 'AWAITING_VERIFICATION', ?, ?, ?,
        0, ?, 'Online Storefront Order'
      )
    `).run(
      orderId, orderNumber, tokenNumber, customerId, customerName, customerPhone || null,
      customerEmail || null, finalAge, deliveryAddress || null, city || 'Bengaluru', pinCode || null,
      prescriptionPref || (finalPrescriptionId ? 'RX Attached' : 'call-optometrist'), finalPrescriptionId,
      subtotalPaise, taxPaise, totalPayablePaise,
      totalPayablePaise
    );

    const insertItem = db.prepare(`
      INSERT INTO order_items (
        id, order_id, variant_id, product_name, variant_name, sku,
        brand, model, shape, color, size,
        lens_name, unit_price_paise, purchase_cost_paise, quantity, subtotal_paise
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    preparedItems.forEach(i => {
      insertItem.run(
        i.id, i.order_id, i.variant_id, i.product_name, i.variant_name, i.sku,
        i.brand || null, i.model || null, i.shape || null, i.color || null, i.size || null,
        i.lens_name, i.unit_price_paise, i.purchase_cost_paise, i.quantity, i.subtotal_paise
      );
    });

    // Record Pending Payment
    db.prepare(`
      INSERT INTO payments (id, order_id, payment_method, amount_paise, status, notes)
      VALUES (?, ?, ?, ?, 'PENDING_VERIFICATION', 'Online Checkout awaiting UPI / Doorstep verification')
    `).run('pay-' + Date.now(), orderId, paymentMethod, totalPayablePaise);

    // Create Invoice Record
    const invoiceId = 'inv-' + Date.now();
    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, order_id, customer_name, customer_phone, customer_email, customer_address,
        subtotal_paise, discount_paise, tax_paise, grand_total_paise, amount_paid_paise,
        payment_status, payment_method, snapshot_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, 'AWAITING_VERIFICATION', ?, '{}')
    `).run(invoiceId, invoiceNumber, orderId, customerName, customerPhone, customerEmail, deliveryAddress, subtotalPaise, taxPaise, totalPayablePaise, paymentMethod);

    // Enqueue 58mm thermal print job
    enqueuePrintJob(orderId, tokenNumber, 'TOKEN');

    return {
      orderId,
      orderNumber,
      tokenNumber,
      invoiceNumber,
      grandTotalINR: totalPayablePaise / 100
    };
  });

  try {
    const result = onlineTx();

    // 1. Push order to Supabase Cloud
    pushOrderToSupabase({
      orderNumber,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      city,
      pinCode,
      items: items.map(it => ({
        ...it,
        brand: it.brand || 'Noor Optics',
        model: it.model || it.name,
        shape: it.shape || 'Optical',
        color: it.color || 'Matte Black',
        size: it.size || 'Regular'
      })),
      prescriptionPref: prescriptionPref || (createdPrescriptionId ? 'RX Attached' : 'Standard'),
      paymentMethod,
      grandTotalINR: result.grandTotalINR
    }).catch(err => console.warn('[SupabaseSync] Push online order note:', err.message));

    // 2. Push customer to Supabase Cloud
    if (createdCustomerId) {
      const custRecord = db.prepare('SELECT * FROM customers WHERE id = ?').get(createdCustomerId);
      if (custRecord) {
        pushCustomerToSupabase(custRecord).catch(err => console.warn('[SupabaseSync] Push customer note:', err.message));
      }
    }

    // 3. Push prescription to Supabase Cloud
    if (createdPrescriptionId) {
      const rxRecord = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(createdPrescriptionId);
      if (rxRecord) {
        pushPrescriptionToSupabase({
          ...rxRecord,
          client_name: customerName,
          client_phone: customerPhone
        }).catch(err => console.warn('[SupabaseSync] Push rx note:', err.message));
      }
    }

    res.json({ success: true, ...result, customerId: createdCustomerId, prescriptionId: createdPrescriptionId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==============================================================================
// 9. ORDER PIPELINE & MANAGEMENT
// ==============================================================================

router.get('/orders', authenticateToken, requirePermission('orders:view'), async (req, res) => {
  // Sync incoming cloud orders so mobile phone orders appear immediately
  await syncSupabaseOrders(db).catch(() => {});

  const { channel, paymentStatus, status, limit = 50 } = req.query;

  let sql = `
    SELECT
      o.*,
      u.name as staff_name,
      COALESCE(o.customer_name, c.name) as customer_name,
      COALESCE(o.customer_phone, c.phone) as customer_phone,
      c.client_code,
      c.age as client_age,
      c.city as client_city,
      pr.prescription_number,
      pr.od_sph, pr.od_cyl, pr.od_axis,
      pr.os_sph, pr.os_cyl, pr.os_axis,
      pr.addition,
      pr.ipd_distance, pr.ipd_near,
      pr.checked_by as rx_checked_by,
      pr.notes as rx_notes,
      pr.image_url as rx_image_url
    FROM orders o
    LEFT JOIN users u ON o.staff_user_id = u.id
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN prescriptions pr ON o.prescription_id = pr.id
    WHERE 1=1
  `;
  const params = [];

  if (channel) {
    sql += ' AND o.channel = ?';
    params.push(channel);
  }
  if (paymentStatus) {
    sql += ' AND o.payment_status = ?';
    params.push(paymentStatus);
  }
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY o.created_at DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  const orders = db.prepare(sql).all(...params);
  const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');

  const formatted = orders.map(o => ({
    ...o,
    subtotal_inr: o.subtotal_paise / 100,
    discount_inr: o.discount_paise / 100,
    total_payable_inr: o.total_payable_paise / 100,
    amount_paid_inr: o.amount_paid_paise / 100,
    items: getItems.all(o.id).map(i => ({
      ...i,
      unit_price_inr: i.unit_price_paise / 100,
      subtotal_inr: i.subtotal_paise / 100
    }))
  }));

  res.json(formatted);
});

router.get('/orders/:id', authenticateToken, requirePermission('orders:view'), (req, res) => {
  const order = db.prepare(`
    SELECT
      o.*,
      u.name as staff_name,
      inv.invoice_number,
      inv.id as invoice_id,
      COALESCE(o.customer_name, c.name) as customer_name,
      COALESCE(o.customer_phone, c.phone) as customer_phone,
      c.client_code,
      c.age as client_age,
      c.city as client_city,
      pr.prescription_number,
      pr.od_sph, pr.od_cyl, pr.od_axis,
      pr.os_sph, pr.os_cyl, pr.os_axis,
      pr.addition,
      pr.ipd_distance, pr.ipd_near,
      pr.checked_by as rx_checked_by,
      pr.notes as rx_notes,
      pr.image_url as rx_image_url
    FROM orders o
    LEFT JOIN users u ON o.staff_user_id = u.id
    LEFT JOIN invoices inv ON o.id = inv.order_id
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN prescriptions pr ON o.prescription_id = pr.id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const payments = db.prepare('SELECT * FROM payments WHERE order_id = ?').all(order.id);
  const printJobs = db.prepare('SELECT * FROM print_jobs WHERE order_id = ? ORDER BY created_at DESC').all(order.id);

  res.json({
    order: {
      ...order,
      total_payable_inr: order.total_payable_paise / 100,
      amount_paid_inr: order.amount_paid_paise / 100
    },
    items,
    payments,
    printJobs
  });
});

router.patch('/orders/:id/status', authenticateToken, requirePermission('orders:manage'), (req, res) => {
  const { status } = req.body;
  if (!['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid order status' });
  }

  db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
  logAudit(req.user.id, req.user.email, 'ORDER_STATUS_CHANGED', 'ORDER', req.params.id, { newStatus: status }, req);
  res.json({ success: true });
});

// ── DELETE /api/orders/:id (Delete Single Order with Safe Restocking) ────────
router.delete('/orders/:id', authenticateToken, async (req, res) => {
  if (!req.user.permissions.includes('orders:manage') && !req.user.permissions.includes('pos:checkout') && req.user.roleId !== 'role-owner' && !req.user.permissions.includes('*')) {
    return res.status(403).json({ error: 'Forbidden: Insufficient privileges to delete orders.' });
  }

  const orderId = req.params.id;
  let order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) {
    order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderId);
  }
  if (!order) {
    // Attempt deletion from Supabase directly in case it's a cloud order ref
    await deleteOrderFromSupabase(orderId).catch(() => {});
    return res.status(404).json({ error: 'Order not found.' });
  }

  // Delete from Supabase cloud first so next sync won't resurrect it
  await deleteOrderFromSupabase(order.order_number).catch(err => console.warn('Supabase delete warning:', err.message));

  const actualOrderId = order.id;

  const deleteTx = db.transaction(() => {
    // 1. Restore stock if the order was active (not already cancelled or refunded)
    if (order.status !== 'REFUNDED' && order.status !== 'CANCELLED') {
      const items = db.prepare('SELECT variant_id, quantity FROM order_items WHERE order_id = ?').all(actualOrderId);
      for (const item of items) {
        if (item.variant_id) {
          db.prepare(`
            UPDATE inventory_balances
            SET available_qty = available_qty + ?, updated_at = datetime('now')
            WHERE variant_id = ?
          `).run(item.quantity, item.variant_id);

          const balAfter = db.prepare('SELECT available_qty FROM inventory_balances WHERE variant_id = ?').get(item.variant_id);
          db.prepare(`
            INSERT INTO stock_movements (id, variant_id, location_id, change_qty, balance_after, movement_type, reference_id, reason, created_by_user_id)
            VALUES (?, ?, 'loc-main', ?, ?, 'RETURN', ?, 'Order Deleted - Stock Restored', ?)
          `).run(
            'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            item.variant_id,
            item.quantity,
            balAfter ? balAfter.available_qty : 0,
            order.order_number,
            req.user.id
          );
        }
      }
    }

    // 2. Cascade delete dependent child records
    db.prepare('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = ?)').run(actualOrderId);
    db.prepare('DELETE FROM invoices WHERE order_id = ?').run(actualOrderId);
    db.prepare('DELETE FROM payment_verification_events WHERE payment_id IN (SELECT id FROM payments WHERE order_id = ?)').run(actualOrderId);
    db.prepare('DELETE FROM payments WHERE order_id = ?').run(actualOrderId);
    db.prepare('DELETE FROM refunds WHERE order_id = ?').run(actualOrderId);
    db.prepare('DELETE FROM print_jobs WHERE order_id = ?').run(actualOrderId);
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(actualOrderId);
    db.prepare('DELETE FROM orders WHERE id = ?').run(actualOrderId);

    // 3. Record in tombstone register so it never re-syncs from cloud
    try {
      db.prepare("INSERT OR REPLACE INTO deleted_orders (order_number, deleted_at) VALUES (?, datetime('now'))").run(order.order_number);
    } catch (tErr) {}

    logAudit(req.user.id, req.user.email, 'ORDER_DELETED', 'ORDER', actualOrderId, {
      orderNumber: order.order_number,
      totalPayablePaise: order.total_payable_paise,
      channel: order.channel
    }, req);
  });

  try {
    deleteTx();
    res.json({ success: true, message: `Order ${order.order_number} deleted successfully.` });
  } catch (err) {
    console.error('Failed to delete order:', err);
    res.status(500).json({ error: 'Failed to delete order: ' + err.message });
  }
});

// ── DELETE /api/orders (Delete All Orders with Safe Restocking) ───────────────
router.delete('/orders', authenticateToken, async (req, res) => {
  if (!req.user.permissions.includes('orders:manage') && !req.user.permissions.includes('pos:checkout') && req.user.roleId !== 'role-owner' && !req.user.permissions.includes('*')) {
    return res.status(403).json({ error: 'Forbidden: Insufficient privileges to delete all orders.' });
  }

  const { channel } = req.query; // optional: 'POS' or 'WEBSITE'

  // Delete from Supabase cloud first
  await deleteAllOrdersFromSupabase().catch(err => console.warn('Supabase delete all warning:', err.message));

  const deleteTx = db.transaction(() => {
    let sql = 'SELECT id, order_number, status, channel FROM orders';
    const params = [];
    if (channel === 'POS') {
      sql += ' WHERE channel = ?';
      params.push('POS');
    } else if (channel === 'WEBSITE' || channel === 'ONLINE') {
      sql += " WHERE channel IN ('ONLINE', 'WEBSITE')";
    }

    const ordersToDelete = db.prepare(sql).all(...params);
    if (ordersToDelete.length === 0) {
      return { count: 0 };
    }

    for (const order of ordersToDelete) {
      // 1. Restore stock if active
      if (order.status !== 'REFUNDED' && order.status !== 'CANCELLED') {
        const items = db.prepare('SELECT variant_id, quantity FROM order_items WHERE order_id = ?').all(order.id);
        for (const item of items) {
          if (item.variant_id) {
            db.prepare(`
              UPDATE inventory_balances
              SET available_qty = available_qty + ?, updated_at = datetime('now')
              WHERE variant_id = ?
            `).run(item.quantity, item.variant_id);

            const balAfter = db.prepare('SELECT available_qty FROM inventory_balances WHERE variant_id = ?').get(item.variant_id);
            db.prepare(`
              INSERT INTO stock_movements (id, variant_id, location_id, change_qty, balance_after, movement_type, reference_id, reason, created_by_user_id)
              VALUES (?, ?, 'loc-main', ?, ?, 'RETURN', ?, 'All Orders Deleted - Stock Restored', ?)
            `).run(
              'mov-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
              item.variant_id,
              item.quantity,
              balAfter ? balAfter.available_qty : 0,
              order.order_number,
              req.user.id
            );
          }
        }
      }

      // 2. Cascade delete
      db.prepare('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = ?)').run(order.id);
      db.prepare('DELETE FROM invoices WHERE order_id = ?').run(order.id);
      db.prepare('DELETE FROM payment_verification_events WHERE payment_id IN (SELECT id FROM payments WHERE order_id = ?)').run(order.id);
      db.prepare('DELETE FROM payments WHERE order_id = ?').run(order.id);
      db.prepare('DELETE FROM refunds WHERE order_id = ?').run(order.id);
      db.prepare('DELETE FROM print_jobs WHERE order_id = ?').run(order.id);
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order.id);
      db.prepare('DELETE FROM orders WHERE id = ?').run(order.id);

      // Record in tombstone register
      try {
        db.prepare("INSERT OR REPLACE INTO deleted_orders (order_number, deleted_at) VALUES (?, datetime('now'))").run(order.order_number);
      } catch (tErr) {}
    }

    logAudit(req.user.id, req.user.email, 'ALL_ORDERS_DELETED', 'ORDERS', 'ALL', {
      deletedCount: ordersToDelete.length,
      channel: channel || 'ALL'
    }, req);

    return { count: ordersToDelete.length };
  });

  try {
    const result = deleteTx();
    res.json({
      success: true,
      deletedCount: result.count,
      message: `Successfully deleted ${result.count} order(s).`
    });
  } catch (err) {
    console.error('Failed to delete all orders:', err);
    res.status(500).json({ error: 'Failed to delete orders: ' + err.message });
  }
});

// ==============================================================================
// 10. GOOGLE PAY / UPI PAYMENT VERIFICATION (MANUAL DESK)
// ==============================================================================

router.get('/payments', authenticateToken, requirePermission('payments:verify'), (req, res) => {
  const { status, limit = 100 } = req.query;
  let query = `
    SELECT p.*, o.order_number, o.token_number, o.customer_name, o.customer_phone, o.channel
    FROM payments p
    JOIN orders o ON p.order_id = o.id
  `;
  const params = [];
  if (status) {
    query += ' WHERE p.status = ? ';
    params.push(status);
  }
  query += ' ORDER BY p.created_at DESC LIMIT ?';
  params.push(parseInt(limit, 10));

  const rows = db.prepare(query).all(...params);
  res.json({
    items: rows.map(r => ({
      ...r,
      amount_inr: r.amount_paise / 100
    }))
  });
});

router.get('/payments/pending', authenticateToken, requirePermission('payments:verify'), (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, o.order_number, o.token_number, o.customer_name, o.customer_phone, o.channel
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.status = 'PENDING_VERIFICATION'
    ORDER BY p.created_at ASC
  `).all();

  res.json(rows.map(r => ({
    ...r,
    amount_inr: r.amount_paise / 100
  })));
});

router.post('/payments/:id/verify', authenticateToken, requirePermission('payments:verify'), (req, res) => {
  const paymentId = req.params.id;
  let action = req.body.action;
  if (!action && req.body.status) {
    action = req.body.status === 'VERIFIED' ? 'VERIFY' : (req.body.status === 'REJECTED' ? 'REJECT' : null);
  }
  const merchantTransactionId = req.body.merchantTransactionId || req.body.merchant_transaction_id || null;
  const reasonOrNotes = req.body.reasonOrNotes || req.body.notes || (action === 'VERIFY' ? 'Confirmed in Google Pay Merchant App' : 'Claim rejected');

  if (!['VERIFY', 'REJECT'].includes(action)) {
    return res.status(400).json({ error: 'Action must be VERIFY or REJECT.' });
  }

  const verifyTx = db.transaction(() => {
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
    if (!payment) throw new Error('Payment record not found.');
    if (payment.status !== 'PENDING_VERIFICATION') {
      throw new Error(`Payment is already marked as ${payment.status}. Duplicate verification prevented.`);
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(payment.order_id);
    const newStatus = action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';

    // 1. Update Payment
    db.prepare(`
      UPDATE payments SET
        status = ?,
        merchant_transaction_id = ?,
        notes = ?
      WHERE id = ?
    `).run(newStatus, merchantTransactionId || null, reasonOrNotes || null, paymentId);

    // 2. Audit Event in payment_verification_events
    db.prepare(`
      INSERT INTO payment_verification_events (
        id, payment_id, verifier_user_id, status_before, status_after,
        merchant_transaction_id, reason_or_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'pve-' + Date.now(), paymentId, req.user.id,
      payment.status, newStatus, merchantTransactionId || null,
      reasonOrNotes || (action === 'VERIFY' ? 'Confirmed in Google Pay Merchant App' : 'Transaction ref not found on bank statement')
    );

    // 3. Update Order and Invoice Status
    if (action === 'VERIFY') {
      db.prepare(`
        UPDATE orders SET
          payment_status = 'VERIFIED',
          amount_paid_paise = total_payable_paise,
          outstanding_paise = 0,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(payment.order_id);

      db.prepare("UPDATE invoices SET payment_status = 'VERIFIED', amount_paid_paise = grand_total_paise WHERE order_id = ?").run(payment.order_id);
    } else {
      db.prepare("UPDATE orders SET payment_status = 'UNPAID', updated_at = datetime('now') WHERE id = ?").run(payment.order_id);
    }

    return { paymentId, newStatus, orderNumber: order.order_number };
  });

  try {
    const result = verifyTx();
    logAudit(req.user.id, req.user.email, action === 'VERIFY' ? 'PAYMENT_VERIFIED' : 'PAYMENT_REJECTED', 'PAYMENT', paymentId, result, req);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==============================================================================
// 11. EXPENSES & ACCOUNTING
// ==============================================================================

router.get('/expenses', authenticateToken, requirePermission('expenses:manage'), (req, res) => {
  const expenses = db.prepare(`
    SELECT e.*, c.name as category_name, u.name as staff_name
    FROM expenses e
    JOIN expense_categories c ON e.category_id = c.id
    LEFT JOIN users u ON e.created_by_user_id = u.id
    ORDER BY e.expense_date DESC
  `).all();

  res.json(expenses.map(e => ({
    ...e,
    amount_inr: e.amount_paise / 100
  })));
});

router.post('/expenses', authenticateToken, requirePermission('expenses:manage'), (req, res) => {
  const { categoryId, title, amountINR, paymentMethod = 'CASH', expenseDate, notes } = req.body;
  if (!categoryId || !title || !amountINR) {
    return res.status(400).json({ error: 'Category, title, and amount are required.' });
  }

  const id = 'exp-' + Date.now();
  const expNum = 'EXP-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const amountPaise = Math.round(Number(amountINR) * 100);

  db.prepare(`
    INSERT INTO expenses (id, expense_number, category_id, title, amount_paise, payment_method, expense_date, notes, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, expNum, categoryId, title, amountPaise, paymentMethod, expenseDate || new Date().toISOString().slice(0, 10), notes, req.user.id);

  logAudit(req.user.id, req.user.email, 'EXPENSE_RECORDED', 'EXPENSE', id, { title, amountINR }, req);
  res.json({ success: true, id, expNum });
});

router.get('/expenses/categories', authenticateToken, (req, res) => {
  const cats = db.prepare('SELECT * FROM expense_categories ORDER BY name ASC').all();
  res.json(cats);
});

// ==============================================================================
// 12. FINANCE & PROFIT/LOSS REPORTING
// ==============================================================================

router.get('/finance/summary', authenticateToken, requirePermission('finance:view'), (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilterOrders = '1=1';
  let dateFilterExpenses = '1=1';
  const paramsOrders = [];
  const paramsExpenses = [];

  if (startDate) {
    dateFilterOrders += ' AND o.created_at >= ?';
    paramsOrders.push(startDate + ' 00:00:00');
    dateFilterExpenses += ' AND e.expense_date >= ?';
    paramsExpenses.push(startDate);
  }
  if (endDate) {
    dateFilterOrders += ' AND o.created_at <= ?';
    paramsOrders.push(endDate + ' 23:59:59');
    dateFilterExpenses += ' AND e.expense_date <= ?';
    paramsExpenses.push(endDate);
  }

  // 1. Sales & Revenue
  const salesSummary = db.prepare(`
    SELECT
      COUNT(o.id) as total_orders,
      SUM(CASE WHEN o.payment_status = 'VERIFIED' THEN 1 ELSE 0 END) as verified_orders,
      SUM(CASE WHEN o.payment_status = 'AWAITING_VERIFICATION' THEN 1 ELSE 0 END) as pending_upi_orders,
      SUM(o.subtotal_paise) as gross_sales_paise,
      SUM(o.discount_paise) as total_discounts_paise,
      SUM(o.tax_paise) as total_tax_paise,
      SUM(o.total_payable_paise) as net_sales_paise,
      SUM(o.amount_paid_paise) as verified_collections_paise,
      SUM(o.outstanding_paise) as pending_receivables_paise
    FROM orders o
    WHERE ${dateFilterOrders} AND o.status != 'CANCELLED'
  `).get(...paramsOrders);

  // 2. Cost of Goods Sold (COGS) on fulfilled/verified orders
  const cogsSummary = db.prepare(`
    SELECT SUM(oi.purchase_cost_paise * oi.quantity) as total_cogs_paise
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE ${dateFilterOrders} AND o.status != 'CANCELLED' AND o.payment_status = 'VERIFIED'
  `).get(...paramsOrders);

  // 3. Operating Expenses
  const expSummary = db.prepare(`
    SELECT SUM(e.amount_paise) as total_expenses_paise
    FROM expenses e
    WHERE ${dateFilterExpenses}
  `).get(...paramsExpenses);

  // 4. Sales by Channel
  const channelBreakdown = db.prepare(`
    SELECT channel, COUNT(id) as count, SUM(total_payable_paise) as total_paise
    FROM orders o
    WHERE ${dateFilterOrders} AND o.status != 'CANCELLED'
    GROUP BY channel
  `).all(...paramsOrders);

  // 5. Sales by Payment Method
  const paymentMethodBreakdown = db.prepare(`
    SELECT p.payment_method, COUNT(p.id) as count, SUM(p.amount_paise) as total_paise
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE ${dateFilterOrders} AND p.status = 'VERIFIED'
    GROUP BY p.payment_method
  `).all(...paramsOrders);

  const netSalesPaise = salesSummary.net_sales_paise || 0;
  const cogsPaise = cogsSummary.total_cogs_paise || 0;
  const grossProfitPaise = Math.max(0, netSalesPaise - cogsPaise);
  const operatingExpensesPaise = expSummary.total_expenses_paise || 0;
  const netOperatingProfitPaise = grossProfitPaise - operatingExpensesPaise;

  const todayStart = new Date().toISOString().slice(0, 10) + ' 00:00:00';
  const todayRow = db.prepare(`
    SELECT
      COUNT(id) as today_orders,
      COALESCE(SUM(total_payable_paise), 0) as today_rev_paise
    FROM orders
    WHERE created_at >= ? AND status != 'CANCELLED'
  `).get(todayStart);

  const invSummary = db.prepare(`
    SELECT
      COALESCE(SUM(ib.available_qty), 0) as total_units,
      COALESCE(SUM(ib.available_qty * p.purchase_cost_paise), 0) as total_val_paise
    FROM inventory_balances ib
    JOIN product_variants pv ON ib.variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
  `).get();

  const responsePayload = {
    today_revenue_paise: todayRow.today_rev_paise || 0,
    today_orders_count: todayRow.today_orders || 0,
    gross_profit_paise: grossProfitPaise,
    net_sales_paise: netSalesPaise,
    cogs_paise: cogsPaise,
    inventory_valuation_paise: invSummary.total_val_paise || 0,
    total_stock_units: invSummary.total_units || 0,
    operating_net_profit_paise: netOperatingProfitPaise,

    ordersCount: salesSummary.total_orders || 0,
    verifiedOrdersCount: salesSummary.verified_orders || 0,
    grossSalesINR: (salesSummary.gross_sales_paise || 0) / 100,
    discountsINR: (salesSummary.total_discounts_paise || 0) / 100,
    taxCollectedINR: (salesSummary.total_tax_paise || 0) / 100,
    netSalesINR: netSalesPaise / 100,
    cogsINR: cogsPaise / 100,
    grossProfitINR: grossProfitPaise / 100,
    operatingExpensesINR: operatingExpensesPaise / 100,
    netOperatingProfitINR: netOperatingProfitPaise / 100,
    verifiedCollectionsINR: (salesSummary.verified_collections_paise || 0) / 100,
    pendingReceivablesINR: (salesSummary.pending_receivables_paise || 0) / 100,
    channelBreakdown: channelBreakdown.map(c => ({ channel: c.channel, count: c.count, totalINR: c.total_paise / 100 })),
    paymentMethodBreakdown: paymentMethodBreakdown.map(pm => ({ method: pm.payment_method, count: pm.count, totalINR: pm.total_paise / 100 }))
  };

  res.json(responsePayload);
});

// Alias for finance P&L
router.get('/finance/pl', authenticateToken, requirePermission('finance:view'), (req, res) => {
  const salesSummary = db.prepare(`
    SELECT
      COUNT(o.id) as total_orders,
      SUM(CASE WHEN o.payment_status = 'VERIFIED' THEN 1 ELSE 0 END) as verified_orders,
      SUM(o.subtotal_paise) as gross_sales_paise,
      SUM(o.discount_paise) as total_discounts_paise,
      SUM(o.tax_paise) as total_tax_paise,
      SUM(o.total_payable_paise) as net_sales_paise
    FROM orders o
    WHERE o.status != 'CANCELLED'
  `).get();

  const cogsSummary = db.prepare(`
    SELECT SUM(oi.purchase_cost_paise * oi.quantity) as total_cogs_paise
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'CANCELLED' AND o.payment_status = 'VERIFIED'
  `).get();

  const expSummary = db.prepare('SELECT SUM(amount_paise) as total_expenses_paise FROM expenses').get();

  const netSalesPaise = salesSummary.net_sales_paise || 0;
  const cogsPaise = cogsSummary.total_cogs_paise || 0;
  const grossProfitPaise = Math.max(0, netSalesPaise - cogsPaise);
  const operatingExpensesPaise = expSummary.total_expenses_paise || 0;
  const netOperatingProfitPaise = grossProfitPaise - operatingExpensesPaise;

  const channelBreakdown = db.prepare(`
    SELECT channel, COUNT(id) as count, SUM(total_payable_paise) as total_paise
    FROM orders WHERE status != 'CANCELLED' GROUP BY channel
  `).all();

  const paymentBreakdown = db.prepare(`
    SELECT payment_method, COUNT(id) as count, SUM(amount_paise) as total_paise
    FROM payments WHERE status = 'VERIFIED' GROUP BY payment_method
  `).all();

  res.json({
    p_and_l: {
      net_sales_paise: netSalesPaise,
      cogs_paise: cogsPaise,
      gross_profit_paise: grossProfitPaise,
      operating_net_profit_paise: netOperatingProfitPaise,
      by_channel: Object.fromEntries(channelBreakdown.map(c => [c.channel, { count: c.count, total_paise: c.total_paise }])),
      by_payment_method: Object.fromEntries(paymentBreakdown.map(p => [p.payment_method, { count: p.count, total_paise: p.total_paise }]))
    }
  });
});

// ==============================================================================
// 13. INVOICES & PDF DOWNLOAD
// ==============================================================================

router.get('/invoices', authenticateToken, (req, res) => {
  const invoices = db.prepare(`
    SELECT inv.*, o.order_number, o.channel
    FROM invoices inv
    JOIN orders o ON inv.order_id = o.id
    ORDER BY inv.created_at DESC
  `).all();

  res.json(invoices.map(inv => ({
    ...inv,
    grand_total_inr: inv.grand_total_paise / 100,
    amount_paid_inr: inv.amount_paid_paise / 100
  })));
});

router.get('/invoices/order/:orderId/pdf', async (req, res) => {
  const orderId = req.params.orderId;
  const invoice = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(orderId);
  if (!invoice) return res.status(404).send('Invoice not found for this order.');
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);
  try {
    const pdfBuffer = await generateInvoicePDF(invoice, items);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).send('Error generating invoice PDF: ' + err.message);
  }
});

router.get('/invoices/:id/pdf', async (req, res) => {
  const invId = req.params.id;
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? OR invoice_number = ?').get(invId, invId);

  if (!invoice) return res.status(404).send('Invoice not found');

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);

  try {
    const pdfBuffer = await generateInvoicePDF(invoice, items);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Invoice PDF generation error:', err);
    res.status(500).send('Error generating PDF invoice: ' + err.message);
  }
});

// ==============================================================================
// 14. THERMAL RECEIPT PRINTER (2-INCH / 58MM)
// ==============================================================================

router.get('/printer/jobs', authenticateToken, requirePermission('printer:manage'), (req, res) => {
  const jobs = db.prepare(`
    SELECT pj.*, o.order_number
    FROM print_jobs pj
    LEFT JOIN orders o ON pj.order_id = o.id
    ORDER BY pj.created_at DESC
    LIMIT 50
  `).all();
  res.json(jobs);
});

router.post('/printer/jobs/:id/retry', authenticateToken, requirePermission('printer:manage'), async (req, res) => {
  try {
    const result = await processPrintJob(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/printer/orders/:orderId/reprint', authenticateToken, requirePermission('printer:manage'), (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const printJob = enqueuePrintJob(order.id, order.token_number, 'TOKEN');
  logAudit(req.user.id, req.user.email, 'REPRINT_REQUESTED', 'ORDER', order.id, { tokenNumber: order.token_number }, req);
  res.json({ success: true, ...printJob });
});

router.post('/printer/orders/:orderId/daemon-dispatch', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  try {
    const jobId = 'pj-daemon-' + Date.now();
    db.prepare(`
      INSERT INTO print_jobs (id, order_id, printer_type, status, attempts, created_at, updated_at)
      VALUES (?, ?, 'THERMAL_58MM', 'QUEUED_DAEMON', 1, datetime('now'), datetime('now'))
    `).run(jobId, order.id);
  } catch (e) {}

  res.json({
    success: true,
    message: 'Print signal dispatched to POS portable daemon',
    orderId: order.id,
    orderNumber: order.order_number
  });
});

router.get('/printer/preview/:orderId', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) return res.status(404).send('Order not found');

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const settings = getStoreSettings();
  const html = generate58mmHTML(order, items, settings);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

router.get('/printer/orders/:orderId/preview-html', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.orderId);
  if (!order) return res.status(404).send('Order not found');

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  const settings = getStoreSettings();
  const html = generate58mmHTML(order, items, settings);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

router.post('/printer/test-print', authenticateToken, requirePermission('printer:manage'), async (req, res) => {
  // Create simulated test order and enqueue
  const testOrderId = 'test-prn-' + Date.now();
  const tokenNum = 99;

  try {
    const fakeOrder = {
      id: testOrderId,
      order_number: 'TEST-NOOR-099',
      token_number: 99,
      channel: 'POS-TEST',
      customer_name: 'Test Customer',
      created_at: new Date().toISOString(),
      subtotal_paise: 349900,
      discount_paise: 0,
      tax_paise: 53375,
      total_payable_paise: 349900,
      payment_status: 'VERIFIED',
      amount_paid_paise: 349900,
      outstanding_paise: 0
    };
    const fakeItems = [{
      product_name: 'The Stockholm Noir (Sample)',
      variant_name: 'Matte Black',
      lens_name: 'Blue-Light Filter',
      quantity: 1,
      unit_price_paise: 349900,
      subtotal_paise: 349900
    }];

    const settings = getStoreSettings();
    const html = generate58mmHTML(fakeOrder, fakeItems, settings);

    res.json({ success: true, previewHtml: html, message: 'Test token generated for 58mm printer.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14b. DIRECT THERMAL HARDWARE QR STICKER PRINTER (SINGLE & BATCH SEQUENTIAL)
router.post('/printer/print-qr-sticker', async (req, res) => {
  try {
    const settings = getStoreSettings();
    const printerName = req.body.printerName || settings.printer_windows_name || 'POS-80';
    const paperWidth = parseInt(req.body.paperWidthMm || settings.printer_nominal_width_mm || '58', 10);
    const qrPreset = req.body.qrPreset || req.body.qrSize || 'standard';

    // Support both single item and array of items (sequential batch)
    const rawItems = Array.isArray(req.body.items) && req.body.items.length > 0
      ? req.body.items
      : [req.body];

    const buffers = [];
    for (const item of rawItems) {
      const sku = item.sku || 'NOOR-FRAME';
      const qrPayload = item.qrPayload;
      const copies = parseInt(item.copies || req.body.copies || 1, 10);

      const buf = await generateEscPosQrLabel({
        sku,
        name: item.name || 'Optical Frame',
        brand: item.brand || 'Noor Optics',
        price: item.price || '',
        qrPayload,
        copies,
        paperWidthMm: paperWidth,
        qrPreset
      });
      buffers.push(buf);
    }

    const combinedBinary = Buffer.concat(buffers);

    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const tempFile = path.join(dataDir, `qr_batch_${Date.now()}.bin`);
    fs.writeFileSync(tempFile, combinedBinary);

    const psScript = path.join(__dirname, '..', 'scripts', 'print_raw_qr.ps1');
    const cmd = `powershell.exe -ExecutionPolicy Bypass -File "${psScript}" -FilePath "${tempFile}" -PrinterName "${printerName}"`;

    const { exec } = require('child_process');
    exec(cmd, (err, stdout, stderr) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      if (err) {
        return res.status(500).json({ success: false, error: stderr || err.message });
      }
      return res.json({
        success: true,
        count: rawItems.length,
        message: `Successfully printed ${rawItems.length} sticker(s) in sequence to ${printerName}!`,
        stdout: stdout ? stdout.trim() : ''
      });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================================================================
// 15. STORE SETTINGS & GOOGLE PAY QR
// ==============================================================================

router.get('/settings', (req, res) => {
  res.json(getStoreSettings());
});

router.post('/settings', authenticateToken, requirePermission('settings:manage'), (req, res) => {
  const updates = req.body;
  const updateStmt = db.prepare("INSERT INTO store_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')");

  const tx = db.transaction(() => {
    for (const [key, val] of Object.entries(updates)) {
      updateStmt.run(key, String(val));
    }
  });

  tx();
  logAudit(req.user.id, req.user.email, 'SETTINGS_UPDATED', 'SETTINGS', 'STORE', updates, req);
  res.json({ success: true, settings: getStoreSettings() });
});

// ==============================================================================
// 17. COMPLETE RETAIL DASHBOARD, QR RESOLVER, BULK IMPORT, & DAILY REPORT
// ==============================================================================

// Helper: Get Asia/Kolkata date string (YYYY-MM-DD)
function getKolkataDateString(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

// ── GET /api/settings (Allow read of store contact phone & info) ───────────────
router.get('/settings', (req, res) => {
  res.json(getStoreSettings());
});

// ── GET /api/qr/resolve/:code (Permanent Frame QR Code Resolution) ────────────
router.get('/qr/resolve/:code', (req, res) => {
  let rawCode = (req.params.code || '').trim();
  if (!rawCode) {
    return res.status(400).json({ error: 'Frame identifier or SKU required.' });
  }

  // Strip query parameters, hashes, and any URL prefix (e.g. HTTPS://.../Q/<SKU>)
  rawCode = rawCode.split('?')[0].split('#')[0];
  if (/^https?:\/\//i.test(rawCode) || rawCode.includes('/')) {
    const parts = rawCode.split('/').filter(Boolean);
    if (parts.length > 0) {
      rawCode = parts[parts.length - 1];
    }
  }
  rawCode = decodeURIComponent(rawCode).trim();

  // Look up product and primary variant by SKU, barcode, variant SKU, or ID
  const item = db.prepare(`
    SELECT
      p.id as product_id,
      p.sku as product_sku,
      p.name as product_name,
      p.brand,
      p.shape,
      p.material,
      p.fit,
      p.category,
      p.selling_price_paise,
      p.original_price_paise,
      p.purchase_cost_paise,
      p.image_url,
      p.description,
      p.is_active,
      pv.id as variant_id,
      pv.sku as variant_sku,
      pv.barcode,
      pv.color_name,
      pv.color_hex,
      COALESCE(ib.available_qty, 0) as available_qty,
      (SELECT SUM(ib2.available_qty)
       FROM product_variants pv2
       JOIN inventory_balances ib2 ON pv2.id = ib2.variant_id
       WHERE pv2.product_id = p.id) as total_stock
    FROM products p
    JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN inventory_balances ib ON pv.id = ib.variant_id
    WHERE LOWER(p.sku) = LOWER(?)
       OR LOWER(pv.sku) = LOWER(?)
       OR pv.barcode = ?
       OR p.id = ?
       OR pv.id = ?
    LIMIT 1
  `).get(rawCode, rawCode, rawCode, rawCode, rawCode);

  if (!item) {
    return res.status(404).json({
      found: false,
      error: `No optical frame found matching code "${rawCode}".`
    });
  }

  const effectiveQty = item.available_qty > 0 
    ? item.available_qty 
    : (item.total_stock !== null && item.total_stock !== undefined ? item.total_stock : item.available_qty);

  res.json({
    found: true,
    product: {
      productId: item.product_id,
      variantId: item.variant_id,
      sku: item.variant_sku || item.product_sku,
      productSku: item.product_sku,
      name: item.product_name,
      brand: item.brand,
      shape: item.shape,
      material: item.material,
      fit: item.fit,
      colorName: item.color_name,
      colorHex: item.color_hex,
      imageUrl: item.image_url,
      description: item.description,
      sellingPricePaise: item.selling_price_paise,
      sellingPriceINR: item.selling_price_paise / 100,
      originalPriceINR: item.original_price_paise ? item.original_price_paise / 100 : null,
      availableQty: effectiveQty,
      total_stock: item.total_stock,
      inStock: effectiveQty > 0
    }
  });
});

// ── GET /api/dashboard/overview (Live Data-Driven Dashboard Overview) ──────────
router.get('/dashboard/overview', authenticateToken, (req, res) => {
  const range = req.query.range || 'today';
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;

  const todayStr = getKolkataDateString();

  if (range === 'today') {
    startDate = todayStr;
    endDate = todayStr;
  } else if (range === 'yesterday') {
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yStr = getKolkataDateString(yDate);
    startDate = yStr;
    endDate = yStr;
  } else if (range === 'this_week') {
    const now = new Date();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    startDate = getKolkataDateString(monday);
    endDate = todayStr;
  } else if (range === 'this_month') {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = getKolkataDateString(firstDay);
    endDate = todayStr;
  } else if (range === 'custom') {
    if (!startDate) startDate = todayStr;
    if (!endDate) endDate = todayStr;
  }

  const startTimestamp = `${startDate} 00:00:00`;
  const endTimestamp = `${endDate} 23:59:59`;

  // 1. In-Store Sales (Completed/Verified POS)
  const inStoreRow = db.prepare(`
    SELECT
      COUNT(id) as order_count,
      COALESCE(SUM(total_payable_paise), 0) as total_sales_paise
    FROM orders
    WHERE channel = 'POS'
      AND status != 'CANCELLED'
      AND payment_status = 'VERIFIED'
      AND created_at >= ? AND created_at <= ?
  `).get(startTimestamp, endTimestamp);

  // 2. Website Sales (Completed/Verified Online)
  const websiteRow = db.prepare(`
    SELECT
      COUNT(id) as order_count,
      COALESCE(SUM(total_payable_paise), 0) as total_sales_paise
    FROM orders
    WHERE channel IN ('ONLINE', 'WEBSITE')
      AND status != 'CANCELLED'
      AND payment_status = 'VERIFIED'
      AND created_at >= ? AND created_at <= ?
  `).get(startTimestamp, endTimestamp);

  // 3. Combined Total Revenue
  const inStoreSalesINR = (inStoreRow.total_sales_paise || 0) / 100;
  const websiteSalesINR = (websiteRow.total_sales_paise || 0) / 100;
  const combinedRevenueINR = inStoreSalesINR + websiteSalesINR;

  const inStoreOrderCount = inStoreRow.order_count || 0;
  const websiteOrderCount = websiteRow.order_count || 0;

  // 4. Inventory counts
  const distinctProductsRow = db.prepare(`
    SELECT COUNT(DISTINCT id) as total_frames FROM products WHERE is_active = 1
  `).get();
  const distinctFramesCount = distinctProductsRow ? distinctProductsRow.total_frames : 0;

  const stockUnitsRow = db.prepare(`
    SELECT COALESCE(SUM(available_qty), 0) as total_units FROM inventory_balances
  `).get();
  const physicalUnitsInStock = stockUnitsRow ? stockUnitsRow.total_units : 0;

  // Low stock: products whose total available units <= reorder_threshold and > 0
  const lowStockRow = db.prepare(`
    SELECT COUNT(*) as low_count FROM (
      SELECT p.id, COALESCE(SUM(ib.available_qty), 0) as units, p.reorder_threshold
      FROM products p
      JOIN product_variants pv ON p.id = pv.product_id
      LEFT JOIN inventory_balances ib ON pv.id = ib.variant_id
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING units > 0 AND units <= p.reorder_threshold
    )
  `).get();
  const lowStockCount = lowStockRow ? lowStockRow.low_count : 0;

  // Out of stock: products with 0 total available units
  const outOfStockRow = db.prepare(`
    SELECT COUNT(*) as out_count FROM (
      SELECT p.id, COALESCE(SUM(ib.available_qty), 0) as units
      FROM products p
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      LEFT JOIN inventory_balances ib ON pv.id = ib.variant_id
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING units = 0
    )
  `).get();
  const outOfStockCount = outOfStockRow ? outOfStockRow.out_count : 0;

  // 5. Sales Timeline for Chart (Hourly for today/yesterday, Daily for week/month/custom)
  const isHourly = (range === 'today' || range === 'yesterday' || startDate === endDate);
  let timeline = [];

  if (isHourly) {
    // Generate 24 hours (00 to 23)
    const ordersInRange = db.prepare(`
      SELECT channel, total_payable_paise, strftime('%H', created_at) as hour_part
      FROM orders
      WHERE status != 'CANCELLED' AND payment_status = 'VERIFIED'
        AND created_at >= ? AND created_at <= ?
    `).all(startTimestamp, endTimestamp);

    const hourlyMap = {};
    for (let h = 0; h < 24; h++) {
      const key = String(h).padStart(2, '0');
      const label = `${h}:00`;
      hourlyMap[key] = { label, inStore: 0, website: 0, inStoreCount: 0, websiteCount: 0 };
    }

    ordersInRange.forEach(o => {
      const h = o.hour_part;
      if (hourlyMap[h]) {
        const amt = (o.total_payable_paise || 0) / 100;
        if (o.channel === 'POS') {
          hourlyMap[h].inStore += amt;
          hourlyMap[h].inStoreCount += 1;
        } else {
          hourlyMap[h].website += amt;
          hourlyMap[h].websiteCount += 1;
        }
      }
    });

    timeline = Object.values(hourlyMap);
  } else {
    // Group by Day (YYYY-MM-DD)
    const dailyOrders = db.prepare(`
      SELECT channel, total_payable_paise, substr(created_at, 1, 10) as day_date
      FROM orders
      WHERE status != 'CANCELLED' AND payment_status = 'VERIFIED'
        AND created_at >= ? AND created_at <= ?
    `).all(startTimestamp, endTimestamp);

    const dayMap = {};
    // Seed days between startDate and endDate
    const cur = new Date(startDate);
    const end = new Date(endDate);
    while (cur <= end) {
      const dStr = cur.toISOString().slice(0, 10);
      const shortLabel = cur.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      dayMap[dStr] = { label: shortLabel, inStore: 0, website: 0, inStoreCount: 0, websiteCount: 0 };
      cur.setDate(cur.getDate() + 1);
    }

    dailyOrders.forEach(o => {
      if (dayMap[o.day_date]) {
        const amt = (o.total_payable_paise || 0) / 100;
        if (o.channel === 'POS') {
          dayMap[o.day_date].inStore += amt;
          dayMap[o.day_date].inStoreCount += 1;
        } else {
          dayMap[o.day_date].website += amt;
          dayMap[o.day_date].websiteCount += 1;
        }
      }
    });

    timeline = Object.values(dayMap);
  }

  // 6. Recent Orders Panel (latest 8 orders across channels)
  const recentOrdersRaw = db.prepare(`
    SELECT
      o.id,
      o.order_number,
      o.token_number,
      o.channel,
      o.customer_name,
      o.created_at,
      o.status as order_status,
      o.payment_status,
      o.total_payable_paise,
      inv.invoice_number,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
    FROM orders o
    LEFT JOIN invoices inv ON o.id = inv.order_id
    ORDER BY o.created_at DESC
    LIMIT 8
  `).all();

  const recentOrders = recentOrdersRaw.map(o => ({
    id: o.id,
    orderNumber: o.order_number,
    invoiceNumber: o.invoice_number || o.order_number,
    tokenNumber: o.token_number,
    channel: o.channel === 'POS' ? 'IN-STORE' : 'WEBSITE',
    customerName: o.customer_name || (o.channel === 'POS' ? 'Walk-in Client' : 'Online Client'),
    createdAt: o.created_at,
    itemCount: o.item_count || 1,
    totalINR: (o.total_payable_paise || 0) / 100,
    paymentStatus: o.payment_status,
    orderStatus: o.order_status
  }));

  res.json({
    dateRange: { range, startDate, endDate, timezone: 'Asia/Kolkata' },
    cards: {
      inStoreSalesINR,
      websiteSalesINR,
      combinedRevenueINR,
      inStoreOrderCount,
      websiteOrderCount,
      distinctFramesCount,
      physicalUnitsInStock,
      lowStockCount,
      outOfStockCount
    },
    timeline,
    recentOrders
  });
});

// ── GET /api/reports/daily-sales (Reconciled Daily Sales Report) ───────────────
router.get('/reports/daily-sales', authenticateToken, (req, res) => {
  const businessDate = req.query.date || getKolkataDateString();
  const startTimestamp = `${businessDate} 00:00:00`;
  const endTimestamp = `${businessDate} 23:59:59`;

  const allOrders = db.prepare(`
    SELECT
      o.*,
      inv.invoice_number,
      (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
      (SELECT GROUP_CONCAT(product_name || ' (' || quantity || ')') FROM order_items oi WHERE oi.order_id = o.id) as items_summary
    FROM orders o
    LEFT JOIN invoices inv ON o.id = inv.order_id
    WHERE o.created_at >= ? AND o.created_at <= ?
    ORDER BY o.created_at ASC
  `).all(startTimestamp, endTimestamp);

  let inStoreCount = 0;
  let inStoreSalesPaise = 0;
  let websiteCount = 0;
  let websiteSalesPaise = 0;

  let grossSalesPaise = 0;
  let discountsPaise = 0;
  let taxCollectedPaise = 0;
  let refundsPaise = 0;
  let netSalesPaise = 0;

  let paidPaise = 0;
  let pendingPaise = 0;

  const paymentBreakdown = {
    CASH: { count: 0, totalPaise: 0 },
    UPI_GPAY: { count: 0, totalPaise: 0 },
    CARD: { count: 0, totalPaise: 0 },
    OTHER: { count: 0, totalPaise: 0 }
  };

  const formattedOrders = allOrders.map(o => {
    const isPOS = o.channel === 'POS';
    const isVerified = o.payment_status === 'VERIFIED';
    const isCancelled = o.status === 'CANCELLED';
    const isRefunded = o.status === 'REFUNDED' || o.payment_status === 'REFUNDED';

    const totalPaise = o.total_payable_paise || 0;
    const subtotalPaise = o.subtotal_paise || 0;
    const discPaise = o.discount_paise || 0;
    const taxPaise = o.tax_paise || 0;

    if (!isCancelled && !isRefunded && isVerified) {
      if (isPOS) {
        inStoreCount++;
        inStoreSalesPaise += totalPaise;
      } else {
        websiteCount++;
        websiteSalesPaise += totalPaise;
      }
      grossSalesPaise += subtotalPaise;
      discountsPaise += discPaise;
      taxCollectedPaise += taxPaise;
      netSalesPaise += totalPaise;
      paidPaise += totalPaise;

      // Payment method
      const pm = (o.payment_method || (isPOS ? 'CASH' : 'UPI_GPAY')).toUpperCase();
      const target = paymentBreakdown[pm] || paymentBreakdown.OTHER;
      target.count++;
      target.totalPaise += totalPaise;
    } else if (isRefunded) {
      refundsPaise += totalPaise;
    } else if (!isVerified && !isCancelled) {
      pendingPaise += totalPaise;
    }

    return {
      orderId: o.id,
      orderNumber: o.order_number,
      invoiceNumber: o.invoice_number || o.order_number,
      tokenNumber: o.token_number,
      channel: isPOS ? 'IN-STORE' : 'WEBSITE',
      time: o.created_at ? o.created_at.slice(11, 19) : '',
      createdAt: o.created_at,
      customerName: o.customer_name || (isPOS ? 'Walk-in Client' : 'Online Client'),
      customerPhone: o.customer_phone || '-',
      itemsSummary: o.items_summary || 'Optical Frame',
      itemCount: o.item_count || 1,
      subtotalINR: subtotalPaise / 100,
      discountINR: discPaise / 100,
      taxINR: taxPaise / 100,
      totalINR: totalPaise / 100,
      paymentMethod: o.payment_method || (isPOS ? 'CASH' : 'UPI_GPAY'),
      paymentStatus: o.payment_status,
      orderStatus: o.status
    };
  });

  const combinedSalesINR = (inStoreSalesPaise + websiteSalesPaise) / 100;

  res.json({
    businessDate,
    generatedAt: new Date().toISOString(),
    timezone: 'Asia/Kolkata',
    summary: {
      inStoreOrderCount: inStoreCount,
      inStoreSalesINR: inStoreSalesPaise / 100,
      websiteOrderCount: websiteCount,
      websiteSalesINR: websiteSalesPaise / 100,
      combinedSalesINR,
      grossSalesINR: grossSalesPaise / 100,
      discountsINR: discountsPaise / 100,
      taxCollectedINR: taxCollectedPaise / 100,
      refundsINR: refundsPaise / 100,
      netSalesINR: netSalesPaise / 100,
      paidAmountINR: paidPaise / 100,
      pendingAmountINR: pendingPaise / 100
    },
    paymentMethods: {
      cash: { count: paymentBreakdown.CASH.count, totalINR: paymentBreakdown.CASH.totalPaise / 100 },
      upiGpay: { count: paymentBreakdown.UPI_GPAY.count, totalINR: paymentBreakdown.UPI_GPAY.totalPaise / 100 },
      card: { count: paymentBreakdown.CARD.count, totalINR: paymentBreakdown.CARD.totalPaise / 100 },
      other: { count: paymentBreakdown.OTHER.count, totalINR: paymentBreakdown.OTHER.totalPaise / 100 }
    },
    orders: formattedOrders
  });
});

// ── POST /api/inventory/import (Bulk CSV/Excel Optical Frame Importer) ────────
router.post('/inventory/import', authenticateToken, requirePermission('products:manage'), (req, res) => {
  const { frames } = req.body;
  if (!Array.isArray(frames) || frames.length === 0) {
    return res.status(400).json({ error: 'Import payload must contain a non-empty array of frame rows.' });
  }

  const results = {
    importedCount: 0,
    skippedCount: 0,
    errors: [],
    importedItems: []
  };

  const checkExistingSku = db.prepare('SELECT id FROM products WHERE LOWER(sku) = LOWER(?)');
  const checkExistingVarSku = db.prepare('SELECT id FROM product_variants WHERE LOWER(sku) = LOWER(?)');

  const importTx = db.transaction(() => {
    frames.forEach((row, index) => {
      const rowNum = index + 1;
      const name = (row.name || row.frameName || row.product_name || '').trim();
      let sku = (row.sku || row.frameCode || row.code || '').trim().toUpperCase();
      const brand = (row.brand || 'Noor Optics').trim();
      const model = (row.model || name.replace(/The\s+/i, '').split(' ')[0] || 'Classic').trim();
      const shape = (row.shape || row.frameShape || 'Rectangular').trim();
      const material = (row.material || 'Japanese Titanium').trim();
      const color = (row.color || row.colour || 'Classic Black').trim();
      const colorHex = (row.colorHex || '#111111').trim();
      const fit = (row.fit || 'Regular').trim();
      const size = (row.size || 'Medium - 49-20-145').trim();
      const description = (row.description || `${brand} ${shape} frame`).trim();

      const sellingPriceINR = parseFloat(row.sellingPrice || row.price || row.retailPrice || 0);
      const costPriceINR = parseFloat(row.costPrice || row.purchaseCost || 0);
      const initialStock = parseInt(row.initialStock || row.stock || row.quantity || 0, 10);

      if (!name) {
        results.skippedCount++;
        results.errors.push(`Row ${rowNum}: Missing mandatory Frame Name.`);
        return;
      }

      if (!sku) {
        // Auto-generate unique SKU if omitted
        sku = `NOOR-${model.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      }

      if (isNaN(sellingPriceINR) || sellingPriceINR <= 0) {
        results.skippedCount++;
        results.errors.push(`Row ${rowNum} (${sku}): Selling price must be a valid positive number.`);
        return;
      }

      // Check duplicate
      const existsProd = checkExistingSku.get(sku);
      const existsVar = checkExistingVarSku.get(sku);
      if (existsProd || existsVar) {
        results.skippedCount++;
        results.errors.push(`Row ${rowNum} (${sku}): SKU already exists in catalog.`);
        return;
      }

      const prodId = 'prod-' + Date.now() + '-' + index;
      const varId = 'var-' + prodId + '-1';
      const sellingPaise = Math.round(sellingPriceINR * 100);
      const costPaise = Math.round(costPriceINR * 100);
      const img = row.imageUrl || row.image || 'images/stockholm_noir.jpg';

      db.prepare(`
        INSERT INTO products (
          id, sku, name, brand, shape, material, fit, category,
          selling_price_paise, original_price_paise, purchase_cost_paise,
          reorder_threshold, image_url, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Optical', ?, ?, ?, 5, ?, ?)
      `).run(
        prodId, sku, name, brand, shape, material, fit,
        sellingPaise, Math.round(sellingPaise * 1.2), costPaise,
        img, `${description} | Size: ${size}`
      );

      db.prepare(`
        INSERT INTO product_variants (
          id, product_id, sku, barcode, color_name, color_hex
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        varId, prodId, sku, `890${Math.floor(100000000 + Math.random() * 900000000)}`, color, colorHex
      );

      const qty = Math.max(0, initialStock);
      db.prepare(`
        INSERT INTO inventory_balances (id, variant_id, location_id, available_qty, reserved_qty)
        VALUES (?, ?, 'loc-main', ?, 0)
      `).run(`bal-${varId}`, varId, qty);

      if (qty > 0) {
        db.prepare(`
          INSERT INTO stock_movements (
            id, variant_id, location_id, change_qty, balance_after, movement_type, reason, created_by_user_id
          ) VALUES (?, ?, 'loc-main', ?, ?, 'ADJUSTMENT', 'Batch catalog import', ?)
        `).run('mov-' + Date.now() + '-' + index, varId, qty, qty, req.user.id);
      }

      results.importedCount++;
      results.importedItems.push({
        id: prodId,
        variantId: varId,
        sku,
        name,
        brand,
        color,
        sellingPriceINR,
        stock: qty
      });
    });
  });

  try {
    importTx();
    logAudit(req.user.id, req.user.email, 'BULK_FRAMES_IMPORTED', 'INVENTORY', 'MULTIPLE', {
      importedCount: results.importedCount,
      skippedCount: results.skippedCount
    }, req);
    res.json({
      success: true,
      importedCount: results.importedCount,
      skippedCount: results.skippedCount,
      errors: results.errors,
      importedItems: results.importedItems
    });
  } catch (err) {
    res.status(500).json({ error: 'Import transaction failed: ' + err.message });
  }
});

// ── POST /api/orders/:id/refund (Safe Return & Refund Workflow) ────────────────
router.post('/orders/:id/refund', authenticateToken, requirePermission('orders:manage'), (req, res) => {
  const orderId = req.params.id;
  const reason = (req.body.reason || 'Customer Return').trim();
  const restockInventory = req.body.restockInventory !== false;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.status === 'REFUNDED') {
    return res.status(400).json({ error: 'Order has already been refunded.' });
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

  const refundTx = db.transaction(() => {
    // 1. Mark order as REFUNDED
    db.prepare(`
      UPDATE orders
      SET status = 'REFUNDED', payment_status = 'REFUNDED', updated_at = datetime('now')
      WHERE id = ?
    `).run(orderId);

    // 2. Update payment status
    db.prepare(`
      UPDATE payments
      SET status = 'REFUNDED', notes = notes || ' [Refunded: ' || ? || ']'
      WHERE order_id = ?
    `).run(reason, orderId);

    // 3. Record in refunds table
    const refundId = 'ref-' + Date.now();
    db.prepare(`
      INSERT INTO refunds (id, order_id, amount_paise, reason, status, processed_by_user_id)
      VALUES (?, ?, ?, ?, 'COMPLETED', ?)
    `).run(refundId, orderId, order.total_payable_paise, reason, req.user.id);

    // 4. Restock inventory if requested
    if (restockInventory) {
      items.forEach((item, idx) => {
        if (item.variant_id) {
          db.prepare(`
            UPDATE inventory_balances
            SET available_qty = available_qty + ?, updated_at = datetime('now')
            WHERE variant_id = ?
          `).run(item.quantity, item.variant_id);

          const balAfter = db.prepare('SELECT available_qty FROM inventory_balances WHERE variant_id = ?').get(item.variant_id);
          const currentStock = balAfter ? balAfter.available_qty : item.quantity;

          db.prepare(`
            INSERT INTO stock_movements (
              id, variant_id, location_id, change_qty, balance_after, movement_type, reference_id, reason, created_by_user_id
            ) VALUES (?, ?, 'loc-main', ?, ?, 'RETURN_RESTOCK', ?, ?, ?)
          `).run(
            'mov-ref-' + Date.now() + '-' + idx,
            item.variant_id,
            item.quantity,
            currentStock,
            order.order_number,
            `Refund return restock: ${reason}`,
            req.user.id
          );
        }
      });
    }
  });

  try {
    refundTx();
    logAudit(req.user.id, req.user.email, 'ORDER_REFUNDED', 'ORDER', orderId, { reason, restocked: restockInventory }, req);
    res.json({ success: true, message: 'Order refunded and stock restored safely.' });
  } catch (err) {
    res.status(500).json({ error: 'Refund failed: ' + err.message });
  }
});

// ── PUT /api/orders/:id/fulfillment (Update Website Order Fulfillment) ────────
router.put('/orders/:id/fulfillment', authenticateToken, requirePermission('orders:manage'), (req, res) => {
  const orderId = req.params.id;
  const { status, trackingNumber } = req.body;

  const validStatuses = ['CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const fulfillmentTx = db.transaction(() => {
    db.prepare(`
      UPDATE orders
      SET status = ?, notes = COALESCE(notes, '') || ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      status,
      trackingNumber ? ` [Tracking: ${trackingNumber}]` : '',
      orderId
    );

    // If order was cancelled, restore inventory
    if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
      items.forEach((item, idx) => {
        if (item.variant_id) {
          db.prepare('UPDATE inventory_balances SET available_qty = available_qty + ? WHERE variant_id = ?').run(item.quantity, item.variant_id);
          const bal = db.prepare('SELECT available_qty FROM inventory_balances WHERE variant_id = ?').get(item.variant_id);
          db.prepare(`
            INSERT INTO stock_movements (id, variant_id, location_id, change_qty, balance_after, movement_type, reference_id, reason, created_by_user_id)
            VALUES (?, ?, 'loc-main', ?, ?, 'ORDER_CANCELLED', ?, 'Website order cancelled by admin', ?)
          `).run('mov-cnc-' + Date.now() + '-' + idx, item.variant_id, item.quantity, bal ? bal.available_qty : 0, order.order_number, req.user.id);
        }
      });
    }
  });

  try {
    fulfillmentTx();
    logAudit(req.user.id, req.user.email, 'FULFILLMENT_UPDATED', 'ORDER', orderId, { status, trackingNumber }, req);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// 16. AUDIT LOGS
// ==============================================================================

router.get('/audit-logs', authenticateToken, requireRole('role-owner', 'role-manager'), (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit || '50', 10));
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  res.json(logs);
});

module.exports = router;
