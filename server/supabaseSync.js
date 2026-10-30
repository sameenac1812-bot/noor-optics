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
 * Fetch cloud tombstones from dedicated system record in Supabase customers table
 */
async function fetchCloudOrderTombstones() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { orders: new Set(), purgedBefore: null };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-ORDERS`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!res.ok) return { orders: new Set(), purgedBefore: null };
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) return { orders: new Set(), purgedBefore: null };

    const raw = list[0].notes;
    if (!raw) return { orders: new Set(), purgedBefore: null };

    const parsed = JSON.parse(raw);
    const orderSet = new Set();
    let purgedBefore = null;

    if (Array.isArray(parsed)) {
      parsed.forEach(ref => orderSet.add(String(ref)));
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.orders)) {
        parsed.orders.forEach(ref => orderSet.add(String(ref)));
      }
      if (parsed.purged_before) {
        purgedBefore = parsed.purged_before;
      }
    }
    return { orders: orderSet, purgedBefore };
  } catch (e) {
    return { orders: new Set(), purgedBefore: null };
  }
}

/**
 * Record a deleted order reference into the Supabase cloud tombstone
 */
async function pushDeletedOrderToCloudTombstone(orderRef) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !orderRef) return;
  try {
    // 1. Fetch current
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-ORDERS`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    let existingOrders = [];
    let purgedBefore = null;
    let recordExists = false;

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        recordExists = true;
        try {
          const parsed = JSON.parse(list[0].notes || '{}');
          if (Array.isArray(parsed)) existingOrders = parsed;
          else if (parsed.orders) {
            existingOrders = parsed.orders;
            purgedBefore = parsed.purged_before || null;
          }
        } catch(e) {}
      }
    }

    if (!existingOrders.includes(orderRef)) {
      existingOrders.push(orderRef);
    }

    const payload = {
      notes: JSON.stringify({ orders: existingOrders, purged_before: purgedBefore }),
      updated_at: new Date().toISOString()
    };

    if (recordExists) {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-ORDERS`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: 'tombstone-orders-global',
          client_code: 'SYS-TOMBSTONE-ORDERS',
          name: 'System Order Tombstones',
          city: 'Bengaluru',
          is_archived: false,
          ...payload
        })
      });
    }
  } catch (err) {
    console.warn('[SupabaseSync] Error updating cloud order tombstone:', err.message);
  }
}

/**
 * Record all deleted orders / purge timestamp into Supabase cloud tombstone
 */
async function pushAllDeletedOrdersToCloudTombstone(orderRefs = []) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-ORDERS`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    let existingOrders = [];
    let recordExists = false;

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        recordExists = true;
        try {
          const parsed = JSON.parse(list[0].notes || '{}');
          if (Array.isArray(parsed)) existingOrders = parsed;
          else if (parsed.orders) existingOrders = parsed.orders;
        } catch(e) {}
      }
    }

    if (Array.isArray(orderRefs)) {
      orderRefs.forEach(ref => {
        if (ref && !existingOrders.includes(ref)) existingOrders.push(ref);
      });
    }

    const payload = {
      notes: JSON.stringify({
        orders: existingOrders,
        purged_before: new Date().toISOString()
      }),
      updated_at: new Date().toISOString()
    };

    if (recordExists) {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-ORDERS`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: 'tombstone-orders-global',
          client_code: 'SYS-TOMBSTONE-ORDERS',
          name: 'System Order Tombstones',
          city: 'Bengaluru',
          is_archived: false,
          ...payload
        })
      });
    }
  } catch (err) {
    console.warn('[SupabaseSync] Error updating cloud order tombstone on purge:', err.message);
  }
}

/**
 * Sync orders from Supabase cloud into local SQLite database
 */
async function syncSupabaseOrders(db) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || isSyncing) return;
  isSyncing = true;

  try {
    // 1. Fetch cloud tombstones and sync into local deleted_orders table
    const { orders: cloudTombstones, purgedBefore } = await fetchCloudOrderTombstones();
    for (const deadRef of cloudTombstones) {
      try {
        db.prepare("INSERT OR REPLACE INTO deleted_orders (order_number, deleted_at) VALUES (?, datetime('now'))").run(deadRef);
        // Cascade delete from local orders if still present
        const deadOrder = db.prepare('SELECT id FROM orders WHERE order_number = ? OR id = ?').get(deadRef, deadRef);
        if (deadOrder) {
          db.prepare('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = ?)').run(deadOrder.id);
          db.prepare('DELETE FROM invoices WHERE order_id = ?').run(deadOrder.id);
          db.prepare('DELETE FROM order_items WHERE order_id = ?').run(deadOrder.id);
          db.prepare('DELETE FROM orders WHERE id = ?').run(deadOrder.id);
        }
      } catch(e) {}
    }

    if (purgedBefore) {
      try {
        const purgedOrders = db.prepare('SELECT id, order_number FROM orders WHERE created_at <= ?').all(purgedBefore);
        for (const po of purgedOrders) {
          db.prepare("INSERT OR REPLACE INTO deleted_orders (order_number, deleted_at) VALUES (?, datetime('now'))").run(po.order_number);
          db.prepare('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE order_id = ?)').run(po.id);
          db.prepare('DELETE FROM invoices WHERE order_id = ?').run(po.id);
          db.prepare('DELETE FROM order_items WHERE order_id = ?').run(po.id);
          db.prepare('DELETE FROM orders WHERE id = ?').run(po.id);
        }
      } catch(e) {}
    }

    // 2. Fetch orders from Supabase
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
      // Filter out dummy/test ghost orders
      if (/TEST/i.test(co.order_ref) || (co.customer_name && /Test/i.test(co.customer_name))) continue;

      // Filter out if in cloud tombstones or purged before
      if (cloudTombstones.has(co.order_ref) || (co.id && cloudTombstones.has(co.id))) {
        continue;
      }
      if (purgedBefore && co.created_at && co.created_at <= purgedBefore) {
        continue;
      }

      // Check if this order was deleted / tombstoned in local SQLite
      try {
        const isTombstoned = db.prepare('SELECT order_number FROM deleted_orders WHERE order_number = ?').get(co.order_ref);
        if (isTombstoned) continue;
      } catch (e) {}

      const grandTotalPaise = Math.round((Number(co.grand_total) || 0) * 100);
      const subtotalPaise = Math.round((Number(co.subtotal) || 0) * 100);
      const taxPaise = Math.round(grandTotalPaise * 0.18 / 1.18);
      const phone = co.customer_phone ? String(co.customer_phone).trim() : null;
      const name = co.customer_name ? String(co.customer_name).trim() : 'Customer';
      const orderDate = co.created_at || new Date().toISOString();

      // Detect whether order is In-Store POS or Website
      const isPos = Boolean(
        (co.delivery_address && (co.delivery_address.toLowerCase().includes('pos') || co.delivery_address.toLowerCase().includes('boutique'))) ||
        (co.payment_method && co.payment_method.toUpperCase() === 'CASH')
      );
      const channel = isPos ? 'POS' : 'WEBSITE';

      // Detect payment status and amount paid
      const isPaid = isPos || co.status === 'confirmed' || (co.payment_method && co.payment_method.toUpperCase() === 'CASH') || co.payment_status === 'VERIFIED';
      const paymentStatus = isPaid ? 'VERIFIED' : 'AWAITING_VERIFICATION';
      const amountPaidPaise = isPaid ? grandTotalPaise : 0;
      const outstandingPaise = isPaid ? 0 : grandTotalPaise;

      const existing = db.prepare('SELECT id FROM orders WHERE order_number = ?').get(co.order_ref);
      if (existing) {
        // Ensure channel and payment status are kept accurate
        db.prepare(`
          UPDATE orders
          SET channel = ?, payment_status = ?, amount_paid_paise = ?, outstanding_paise = ?
          WHERE id = ?
        `).run(channel, paymentStatus, amountPaidPaise, outstandingPaise, existing.id);
        continue;
      }

      // Only link if this matches an authoritative existing customer
      let customerId = null;
      if (phone) {
        const cust = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
        if (cust) {
          customerId = cust.id;
          db.prepare("UPDATE customers SET total_spent_paise = total_spent_paise + ?, updated_at = datetime('now') WHERE id = ?")
            .run(grandTotalPaise, customerId);
        }
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
          ?, ?, 1, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          'CONFIRMED', ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `).run(
        orderId, co.order_ref, channel, customerId, name, phone,
        co.customer_email || null, co.delivery_address || null, co.city || null, co.pin_code || null,
        co.prescription_pref || 'Standard', paymentStatus, subtotalPaise, taxPaise, grandTotalPaise,
        amountPaidPaise, outstandingPaise, isPos ? 'In-Store POS Bill (Synced)' : 'Online Website Order (Synced)', orderDate, orderDate
      );

      // Parse and insert items
      let items = co.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch(e) { items = []; }
      }
      if (Array.isArray(items)) {
        items.forEach((item, idx) => {
          let variantId = item.variantId || item.id;
          const varInfo = (variantId ? db.prepare(`
            SELECT pv.id, pv.color_name, pv.sku, p.name as product_name, p.selling_price_paise, p.purchase_cost_paise
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.id
            WHERE pv.id = ?
          `).get(variantId) : null) || db.prepare(`
            SELECT pv.id, pv.color_name, pv.sku, p.name as product_name, p.selling_price_paise, p.purchase_cost_paise
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.id
            LIMIT 1
          `).get();

          const resolvedVarId = varInfo ? varInfo.id : (variantId || 'var-noor-01-1');
          const prodName = item.name || (varInfo ? varInfo.product_name : 'Noor Optical Frame');
          const varColor = item.color || item.variant_name || (varInfo ? varInfo.color_name : 'Standard');
          const varSku = item.sku || (varInfo ? varInfo.sku : 'NOOR-FRAME');
          const unitPrice = item.unitPricePaise ? Number(item.unitPricePaise) : (item.unitPrice ? Math.round(Number(item.unitPrice) * 100) : (varInfo ? varInfo.selling_price_paise : grandTotalPaise));
          const purchaseCost = varInfo ? varInfo.purchase_cost_paise : 145000;
          const itemQty = parseInt(item.quantity || 1, 10);
          const itemSubtotal = unitPrice * itemQty;

          db.prepare(`
            INSERT INTO order_items (
              id, order_id, variant_id, product_name, variant_name, sku, lens_name, unit_price_paise, purchase_cost_paise, quantity, subtotal_paise
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            'oit-' + orderId + '-' + idx, orderId, resolvedVarId,
            prodName, varColor, varSku,
            item.lensName || item.lens || 'Blue-Light Filter',
            unitPrice, purchaseCost, itemQty, itemSubtotal
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, '{}', ?)
        `).run(
          'inv-' + orderId, invoiceNum, orderId, name, phone, co.customer_email || null, co.delivery_address || null,
          subtotalPaise, taxPaise, grandTotalPaise, amountPaidPaise, paymentStatus, co.payment_method || (isPos ? 'CASH' : 'UPI_GPAY'), orderDate
        );
      }

      console.log(`[SupabaseSync] Synced cloud order ${co.order_ref} (${channel}) for ${name}`);
    }
  } catch (err) {
    console.warn('[SupabaseSync] Error syncing orders from Supabase:', err.message);
  } finally {
    isSyncing = false;
  }
}

/**
 * Delete single order from Supabase cloud by order reference
 */
async function deleteOrderFromSupabase(orderRef) {
  if (!orderRef) return;
  // 1. Immediately record in cloud tombstone (guaranteed persistence across all lambdas & clients)
  await pushDeletedOrderToCloudTombstone(orderRef).catch(() => {});

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?order_ref=eq.${encodeURIComponent(orderRef)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    console.log(`[SupabaseSync] Deleted order ${orderRef} from Supabase, status: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.warn('[SupabaseSync] Error deleting order from Supabase:', err.message);
  }
}

/**
 * Delete all orders from Supabase cloud
 */
async function deleteAllOrdersFromSupabase(existingOrderRefs = []) {
  // 1. Record all existing refs and purge timestamp in cloud tombstone
  await pushAllDeletedOrdersToCloudTombstone(existingOrderRefs).catch(() => {});

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=not.is.null`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    console.log(`[SupabaseSync] Deleted all orders from Supabase, status: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.warn('[SupabaseSync] Error deleting all orders from Supabase:', err.message);
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
 * Push or update customer record in Supabase cloud
 */
async function pushCustomerToSupabase(cust) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !cust) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        id: cust.id,
        client_code: cust.client_code,
        name: cust.name,
        age: cust.age || null,
        dob: cust.dob || null,
        phone: cust.phone || null,
        email: cust.email || null,
        address: cust.address || null,
        city: cust.city || 'Bengaluru',
        pin_code: cust.pin_code || null,
        notes: cust.notes || null,
        is_archived: Boolean(cust.is_archived),
        total_spent_paise: cust.total_spent_paise || 0,
        updated_at: new Date().toISOString()
      })
    });
    if (res.ok) {
      console.log(`[SupabaseSync] Customer ${cust.name} (${cust.client_code}) synced to Supabase.`);
    }
  } catch (err) {
    console.warn('[SupabaseSync] Customer sync skipped:', err.message);
  }
}

/**
 * Push prescription record to Supabase cloud
 */
async function pushPrescriptionToSupabase(rx) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !rx) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/prescriptions`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        id: rx.id,
        prescription_number: rx.prescription_number,
        client_id: rx.client_id || null,
        client_name: rx.client_name,
        client_phone: rx.client_phone || null,
        prescription_date: rx.prescription_date || new Date().toISOString().split('T')[0],
        prescription_type: rx.prescription_type || 'SPECTACLE',
        od_sph: rx.od_sph || 0.00,
        od_cyl: rx.od_cyl || 0.00,
        od_axis: rx.od_axis || null,
        od_va: rx.od_va || null,
        os_sph: rx.os_sph || 0.00,
        os_cyl: rx.os_cyl || 0.00,
        os_axis: rx.os_axis || null,
        os_va: rx.os_va || null,
        addition: rx.addition || null,
        pd: rx.pd || null,
        lens_type: rx.lens_type || null,
        lens_material: rx.lens_material || null,
        coatings: rx.coatings || null,
        notes: rx.notes || null,
        checked_by: rx.checked_by || null,
        updated_at: new Date().toISOString()
      })
    });
    if (res.ok) {
      console.log(`[SupabaseSync] Prescription ${rx.prescription_number} synced to Supabase.`);
    }
  } catch (err) {
    console.warn('[SupabaseSync] Prescription sync skipped:', err.message);
  }
}

/**
 * Delete single customer from Supabase cloud by customer ID and optional phone
 */
async function deleteCustomerFromSupabase(customerId, phone = null) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !customerId) return;
  try {
    let url = `${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}`;
    if (phone) {
      url = `${SUPABASE_URL}/rest/v1/customers?or=(id.eq.${encodeURIComponent(customerId)},phone.eq.${encodeURIComponent(phone)})`;
    }
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    console.log(`[SupabaseSync] Deleted customer ${customerId} from Supabase, status: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.warn('[SupabaseSync] Error deleting customer from Supabase:', err.message);
  }
}

/**
 * Delete all customers from Supabase cloud
 */
async function deleteAllCustomersFromSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=not.is.null`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    console.log(`[SupabaseSync] Deleted all customers from Supabase, status: ${res.status}`);
    return res.ok;
  } catch (err) {
    console.warn('[SupabaseSync] Error deleting all customers from Supabase:', err.message);
  }
}

/**
 * Pull and sync customers from Supabase cloud into local database
 */
async function syncSupabaseCustomers(db) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!res.ok) return;
    const cloudCusts = await res.json();
    if (!Array.isArray(cloudCusts)) return;

    for (const c of cloudCusts) {
      if (!c.name || /Walk-in Client|Concierge Test/i.test(c.name)) continue;

      // Check if client was deleted / tombstoned by admin
      try {
        const isTombstoned = db.prepare('SELECT customer_id FROM deleted_customers WHERE customer_id = ? OR (phone IS NOT NULL AND phone = ?) OR (name IS NOT NULL AND LOWER(name) = LOWER(?))').get(c.id, c.phone, c.name);
        if (isTombstoned) {
          deleteCustomerFromSupabase(c.id, c.phone).catch(() => {});
          continue;
        }
      } catch (e) {}

      const existing = db.prepare('SELECT id FROM customers WHERE id = ? OR (phone IS NOT NULL AND phone = ?)').get(c.id, c.phone);
      if (existing) {
        db.prepare(`
          UPDATE customers
          SET name = ?, client_code = ?, age = ?, dob = ?, phone = ?, email = ?, address = ?, city = ?, pin_code = ?, notes = ?, is_archived = ?, updated_at = ?
          WHERE id = ?
        `).run(
          c.name, c.client_code, c.age || null, c.dob || null, c.phone || null,
          c.email || null, c.address || null, c.city || 'Bengaluru', c.pin_code || null,
          c.notes || null, c.is_archived ? 1 : 0, c.updated_at || new Date().toISOString(),
          existing.id
        );
      } else {
        // Ensure client_code is not duplicate in SQLite
        let code = c.client_code;
        const codeTaken = db.prepare('SELECT id FROM customers WHERE client_code = ?').get(code);
        if (codeTaken) continue;

        db.prepare(`
          INSERT INTO customers (
            id, client_code, name, age, dob, phone, email, address, city, pin_code, notes, is_archived, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          c.id, code, c.name, c.age || null, c.dob || null, c.phone || null,
          c.email || null, c.address || null, c.city || 'Bengaluru', c.pin_code || null,
          c.notes || null, c.is_archived ? 1 : 0, c.created_at || new Date().toISOString(),
          c.updated_at || new Date().toISOString()
        );
      }
    }
  } catch (err) {
    console.warn('[SupabaseSync] Error syncing customers from Supabase:', err.message);
  }
}

/**
 * Start recurring background synchronization
 */
function startBackgroundSync(db, intervalMs = 10000) {
  // Run immediate initial sync
  syncSupabaseOrders(db).catch(console.warn);
  syncSupabaseCustomers(db).catch(console.warn);

  // Set recurring interval
  const timer = setInterval(() => {
    syncSupabaseOrders(db).catch(console.warn);
    syncSupabaseCustomers(db).catch(console.warn);
  }, intervalMs);

  if (timer.unref) timer.unref();
  return timer;
}

module.exports = {
  syncSupabaseOrders,
  syncSupabaseCustomers,
  pushOrderToSupabase,
  pushCustomerToSupabase,
  pushPrescriptionToSupabase,
  deleteOrderFromSupabase,
  deleteAllOrdersFromSupabase,
  pushDeletedOrderToCloudTombstone,
  pushAllDeletedOrdersToCloudTombstone,
  deleteCustomerFromSupabase,
  deleteAllCustomersFromSupabase,
  startBackgroundSync
};
