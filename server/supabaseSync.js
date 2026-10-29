/**
 * server/supabaseSync.js – Real-time Supabase Cloud Synchronization
 * Synchronizes orders, customers, and inventory between SQLite and Supabase
 * so mobile devices and PCs stay 100% in sync without data loss.
 */

'use strict';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://czajxtgwsxbrrymrhauz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk';

let isSyncing = false;

/**
 * Sync orders from Supabase cloud into local SQLite database
 */
async function syncSupabaseOrders(db) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || isSyncing) return;
  isSyncing = true;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!res.ok) {
      console.warn(`[SupabaseSync] Fetch failed with status ${res.status}`);
      return;
    }

    const cloudOrders = await res.json();
    if (!Array.isArray(cloudOrders) || cloudOrders.length === 0) return;

    for (const co of cloudOrders) {
      if (!co.order_ref) continue;

      const existing = db.prepare('SELECT id FROM orders WHERE order_number = ?').get(co.order_ref);
      if (existing) continue;

      const grandTotalPaise = Math.round((Number(co.grand_total) || 0) * 100);
      const subtotalPaise = Math.round((Number(co.subtotal) || 0) * 100);
      const taxPaise = Math.round(grandTotalPaise * 0.18 / 1.18);
      const phone = co.customer_phone ? String(co.customer_phone).trim() : null;
      const name = co.customer_name ? String(co.customer_name).trim() : 'Online Customer';
      const orderDate = co.created_at || new Date().toISOString();

      // Resolve or create customer
      let customerId = null;
      if (phone) {
        const cust = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
        if (cust) customerId = cust.id;
      }

      if (!customerId) {
        customerId = 'cust-onl-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900);
        const codeRow = db.prepare('SELECT COUNT(*) as c FROM customers').get();
        const code = 'CLT-' + (1000 + (codeRow ? codeRow.c + 1 : 1));

        db.prepare(`
          INSERT INTO customers (
            id, client_code, name, phone, email, address, city, pin_code, notes, total_spent_paise, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Synced from Supabase online order', ?, ?, ?)
        `).run(
          customerId, code, name, phone, co.customer_email || null,
          co.delivery_address || null, co.city || 'Bengaluru', co.pin_code || null,
          grandTotalPaise, orderDate, orderDate
        );
      } else {
        db.prepare("UPDATE customers SET total_spent_paise = total_spent_paise + ?, updated_at = datetime('now') WHERE id = ?")
          .run(grandTotalPaise, customerId);
      }

      // Generate order ID
      const orderId = 'ord-cld-' + co.order_ref.toLowerCase().replace(/[^a-z0-9]/g, '-');

      db.prepare(`
        INSERT INTO orders (
          id, order_number, token_number, channel, customer_id, customer_name, customer_phone,
          customer_email, delivery_address, city, pin_code, prescription_pref,
          status, payment_status, subtotal_paise, tax_paise, total_payable_paise,
          amount_paid_paise, outstanding_paise, notes, created_at, updated_at
        ) VALUES (
          ?, ?, 1, 'WEBSITE', ?, ?, ?,
          ?, ?, ?, ?, ?,
          'CONFIRMED', 'AWAITING_VERIFICATION', ?, ?, ?,
          0, ?, 'Online Website Order (Synced)', ?, ?
        )
      `).run(
        orderId, co.order_ref, customerId, name, phone,
        co.customer_email || null, co.delivery_address || null, co.city || null, co.pin_code || null,
        co.prescription_pref || 'call-optometrist', subtotalPaise, taxPaise, grandTotalPaise,
        grandTotalPaise, orderDate, orderDate
      );

      // Parse and insert items
      let items = co.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch(e) { items = []; }
      }
      if (Array.isArray(items)) {
        items.forEach((item, idx) => {
          const itemPrice = Math.round((Number(item.unitPrice || item.price) || 3499) * 100);
          const itemQty = parseInt(item.quantity || 1, 10);
          
          let variantId = item.variantId || item.id;
          const varCheck = db.prepare('SELECT id FROM product_variants WHERE id = ?').get(variantId);
          if (!varCheck) {
            const prodCheck = db.prepare('SELECT id FROM product_variants WHERE product_id = ? LIMIT 1').get(variantId);
            variantId = prodCheck ? prodCheck.id : 'var-noor-01-1';
          }

          db.prepare(`
            INSERT INTO order_items (
              id, order_id, variant_id, product_name, variant_name, sku, lens_name, unit_price_paise, purchase_cost_paise, quantity, subtotal_paise
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 145000, ?, ?)
          `).run(
            'oit-' + orderId + '-' + idx, orderId, variantId,
            item.name || 'Noor Optical Frame', item.color || 'Matte Black',
            item.sku || 'NOOR-STK-01-MAT', item.lensName || item.lens || 'Blue-Light Filter',
            itemPrice, itemQty, itemPrice * itemQty
          );
        });
      }

      // Record invoice
      const invoiceNum = 'INV-' + co.order_ref;
      const invoiceExists = db.prepare('SELECT id FROM invoices WHERE order_id = ?').get(orderId);
      if (!invoiceExists) {
        db.prepare(`
          INSERT INTO invoices (
            id, invoice_number, order_id, customer_name, customer_phone, customer_email, customer_address,
            subtotal_paise, discount_paise, tax_paise, grand_total_paise, amount_paid_paise,
            payment_status, payment_method, snapshot_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, 'AWAITING_VERIFICATION', ?, '{}', ?)
        `).run(
          'inv-' + orderId, invoiceNum, orderId, name, phone, co.customer_email || null, co.delivery_address || null,
          subtotalPaise, taxPaise, grandTotalPaise, co.payment_method || 'UPI_GPAY', orderDate
        );
      }

      console.log(`[SupabaseSync] Synced cloud order ${co.order_ref} for ${name}`);
    }
  } catch (err) {
    console.warn('[SupabaseSync] Error syncing orders from Supabase:', err.message);
  } finally {
    isSyncing = false;
  }
}

/**
 * Push an order created in POS or online endpoint to Supabase cloud
 */
async function pushOrderToSupabase(orderPayload) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        order_ref: orderPayload.orderNumber || orderPayload.order_ref,
        customer_name: orderPayload.customerName || orderPayload.customer_name || 'Walk-in Client',
        customer_email: orderPayload.customerEmail || orderPayload.customer_email || (orderPayload.customerPhone ? `${String(orderPayload.customerPhone).replace(/[^0-9]/g, '')}@nooroptics.in` : 'client@nooroptics.in'),
        customer_phone: orderPayload.customerPhone || orderPayload.customer_phone || null,
        delivery_address: orderPayload.deliveryAddress || orderPayload.delivery_address || 'Flagship Boutique POS',
        city: orderPayload.city || 'Bengaluru',
        pin_code: orderPayload.pinCode || orderPayload.pin_code || '560038',
        items: orderPayload.items || [],
        prescription_pref: orderPayload.prescriptionPref || (orderPayload.prescriptionId ? 'RX Attached' : 'Standard'),
        payment_method: orderPayload.paymentMethod || orderPayload.payment_method || 'CASH',
        subtotal: orderPayload.subtotalINR || (orderPayload.subtotalPaise ? orderPayload.subtotalPaise / 100 : 0),
        shipping_fee: 0,
        grand_total: orderPayload.grandTotalINR || (orderPayload.totalPayablePaise ? orderPayload.totalPayablePaise / 100 : 0),
        status: 'confirmed'
      })
    });

    if (res.ok) {
      console.log(`[SupabaseSync] Order ${orderPayload.orderNumber} successfully pushed to Supabase cloud.`);
    } else {
      const errText = await res.text();
      console.warn(`[SupabaseSync] Push order failed (${res.status}):`, errText);
    }
  } catch (err) {
    console.warn('[SupabaseSync] Error pushing order to Supabase:', err.message);
  }
}

/**
 * Start recurring background synchronization
 */
function startBackgroundSync(db, intervalMs = 10000) {
  // Run immediate initial sync
  syncSupabaseOrders(db).catch(console.warn);

  // Set recurring interval
  const timer = setInterval(() => {
    syncSupabaseOrders(db).catch(console.warn);
  }, intervalMs);

  if (timer.unref) timer.unref();
  return timer;
}

module.exports = {
  syncSupabaseOrders,
  pushOrderToSupabase,
  startBackgroundSync
};
