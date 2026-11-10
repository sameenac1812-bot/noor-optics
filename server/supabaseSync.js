/**
 * server/supabaseSync.js – Real-time Supabase Cloud Synchronization
 * Synchronizes orders, customers, and inventory between SQLite and Supabase
 * so mobile devices and PCs stay 100% in sync without data loss.
 */

'use strict';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://czajxtgwsxbrrymrhauz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk';

let isSyncing = false;
let lastProductSyncTime = 0;
const PRODUCT_SYNC_CACHE_MS = 15000;

let lastOrderSyncTime = 0;
const ORDER_SYNC_CACHE_MS = 3500;

function invalidateProductSyncCache() {
  lastProductSyncTime = 0;
}

function invalidateOrderSyncCache() {
  lastOrderSyncTime = 0;
}

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
      },
      signal: AbortSignal.timeout(5000)
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
 * Fetch cloud payment verification records from Supabase SYS-ORDER-PAYMENTS
 */
async function fetchCloudOrderPayments() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { verified: new Set(), rejected: new Set(), details: {} };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-ORDER-PAYMENTS`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { verified: new Set(), rejected: new Set(), details: {} };
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0 || !list[0].notes) return { verified: new Set(), rejected: new Set(), details: {} };

    const parsed = JSON.parse(list[0].notes);
    const verified = new Set();
    const rejected = new Set();
    const details = (parsed && typeof parsed === 'object' && parsed.details) ? parsed.details : {};

    if (Array.isArray(parsed.verified_orders)) {
      parsed.verified_orders.forEach(ref => verified.add(String(ref).trim()));
    }
    if (Array.isArray(parsed.rejected_orders)) {
      parsed.rejected_orders.forEach(ref => rejected.add(String(ref).trim()));
    }
    return { verified, rejected, details };
  } catch (e) {
    return { verified: new Set(), rejected: new Set(), details: {} };
  }
}

/**
 * Persist an order payment verification (VERIFIED / REJECTED) into Supabase SYS-ORDER-PAYMENTS
 */
async function pushOrderPaymentStatusToCloud(orderRef, paymentStatus, reasonOrNotes = null, financialDetails = null) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !orderRef) return false;
  try {
    const cleanRef = String(orderRef).trim();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-ORDER-PAYMENTS`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    let verified = [];
    let rejected = [];
    let details = {};
    let recordExists = false;

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        recordExists = true;
        try {
          const parsed = JSON.parse(list[0].notes || '{}');
          if (Array.isArray(parsed.verified_orders)) verified = parsed.verified_orders;
          if (Array.isArray(parsed.rejected_orders)) rejected = parsed.rejected_orders;
          if (parsed.details) details = parsed.details;
        } catch (_) {}
      }
    }

    const allRefs = [cleanRef];
    if (financialDetails && Array.isArray(financialDetails.aliases)) {
      financialDetails.aliases.forEach(a => {
        const ca = String(a).trim();
        if (ca && !allRefs.includes(ca)) allRefs.push(ca);
      });
    }

    allRefs.forEach(ref => {
      if (paymentStatus === 'VERIFIED') {
        if (!verified.includes(ref)) verified.push(ref);
        rejected = rejected.filter(r => r !== ref);
        details[ref] = {
          status: 'VERIFIED',
          verified_at: new Date().toISOString(),
          notes: reasonOrNotes || 'Verified by Staff',
          ...(financialDetails || {})
        };
      } else if (paymentStatus === 'REJECTED') {
        if (!rejected.includes(ref)) rejected.push(ref);
        verified = verified.filter(r => r !== ref);
        details[ref] = {
          status: 'REJECTED',
          rejected_at: new Date().toISOString(),
          notes: reasonOrNotes || 'Payment rejected'
        };
      } else {
        // PARTIAL / PENDING installment update
        verified = verified.filter(r => r !== ref);
        rejected = rejected.filter(r => r !== ref);
        details[ref] = {
          status: paymentStatus,
          updated_at: new Date().toISOString(),
          notes: reasonOrNotes || 'Installment payment recorded',
          ...(financialDetails || {})
        };
      }
    });

    const payloadNotes = JSON.stringify({
      verified_orders: verified,
      rejected_orders: rejected,
      details,
      updated_at: new Date().toISOString()
    });

    if (recordExists) {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-ORDER-PAYMENTS`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: payloadNotes, updated_at: new Date().toISOString() })
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
          id: 'sys-order-payments-global',
          client_code: 'SYS-ORDER-PAYMENTS',
          name: 'System Order Payment Verifications',
          notes: payloadNotes
        })
      });
    }

    // Also directly update canonical orders table and print_jobs queue in Supabase
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanRef);
    const queryParam = isUuid ? `id=eq.${cleanRef}` : `or=(order_ref.eq.${cleanRef},order_number.eq.${cleanRef})`;
    const ordRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?${queryParam}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        payment_status: paymentStatus,
        status: paymentStatus === 'VERIFIED' ? 'confirmed' : 'cancelled',
        updated_at: new Date().toISOString()
      })
    });

    let orderRowId = isUuid ? cleanRef : null;
    if (!orderRowId) {
      try {
        const fetchIdRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?or=(order_ref.eq.${encodeURIComponent(cleanRef)},order_number.eq.${encodeURIComponent(cleanRef)})&select=id`, {
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        });
        if (fetchIdRes.ok) {
          const rows = await fetchIdRes.json();
          if (Array.isArray(rows) && rows.length > 0) orderRowId = rows[0].id;
        }
      } catch (_) {}
    }

    if (orderRowId) {
      if (paymentStatus === 'VERIFIED') {
        // Atomically queue print job in cloud for portable POS daemon
        await fetch(`${SUPABASE_URL}/rest/v1/print_jobs?order_id=eq.${orderRowId}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'queued',
            last_error: null,
            updated_at: new Date().toISOString()
          })
        }).catch(() => {});

        // Also ensure print job exists if not yet present
        await fetch(`${SUPABASE_URL}/rest/v1/print_jobs`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            order_id: orderRowId,
            print_type: 'receipt',
            printer_id: 'POS-80',
            status: 'queued',
            attempt_count: 0,
            updated_at: new Date().toISOString()
          })
        }).catch(() => {});
      } else if (paymentStatus === 'REJECTED') {
        await fetch(`${SUPABASE_URL}/rest/v1/print_jobs?order_id=eq.${orderRowId}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'cancelled',
            last_error: reasonOrNotes || 'Payment rejected by staff',
            updated_at: new Date().toISOString()
          })
        }).catch(() => {});
      }
    }

    console.log(`[SupabaseSync] Order ${cleanRef} payment recorded as ${paymentStatus} in Supabase cloud.`);
    return true;
  } catch (err) {
    console.warn('[SupabaseSync] pushOrderPaymentStatusToCloud error:', err.message);
    return false;
  }
}

/**
 * Fetch cloud product tombstones from dedicated system record in Supabase customers table
 */
async function fetchCloudProductTombstones() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { products: new Set() };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!res.ok) return { products: new Set() };
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) return { products: new Set() };

    const raw = list[0].notes;
    if (!raw) return { products: new Set() };

    const parsed = JSON.parse(raw);
    const prodSet = new Set();
    if (Array.isArray(parsed)) {
      parsed.forEach(item => prodSet.add(String(item).toLowerCase().trim()));
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.products)) {
      parsed.products.forEach(item => prodSet.add(String(item).toLowerCase().trim()));
    }
    return { products: prodSet };
  } catch (e) {
    return { products: new Set() };
  }
}

/**
 * Record a deleted product reference (ID / SKU / Name) into the Supabase cloud tombstone
 */
async function pushDeletedProductToCloudTombstone(productId, sku = null, name = null) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || (!productId && !sku && !name)) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    let existingProducts = [];
    let recordExists = false;

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        recordExists = true;
        try {
          const parsed = JSON.parse(list[0].notes || '{}');
          if (Array.isArray(parsed)) existingProducts = parsed;
          else if (parsed.products) existingProducts = parsed.products;
        } catch(e) {}
      }
    }

    const tokensToAdd = [];
    if (Array.isArray(productId)) {
      productId.forEach(t => { if (t) tokensToAdd.push(String(t).trim()); });
    } else {
      if (productId) tokensToAdd.push(String(productId).trim());
      if (sku) tokensToAdd.push(String(sku).trim());
      if (name) tokensToAdd.push(String(name).trim());
    }

    tokensToAdd.forEach(token => {
      if (!existingProducts.some(p => String(p).toLowerCase() === token.toLowerCase())) {
        existingProducts.push(token);
      }
    });

    const payload = {
      notes: JSON.stringify({ products: existingProducts, updated_at: new Date().toISOString() }),
      updated_at: new Date().toISOString()
    };

    if (recordExists) {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
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
          id: 'tombstone-products-global',
          client_code: 'SYS-TOMBSTONE-PRODUCTS',
          name: 'System Product Tombstones',
          city: 'Bengaluru',
          is_archived: false,
          ...payload
        })
      });
    }
  } catch (err) {
    console.warn('[SupabaseSync] Error updating cloud product tombstone:', err.message);
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
 * Synchronize accurate multi-stage payments into SQLite payments table
 */
function syncOrderPaymentsInDb(db, orderId, isPos, paymentMethod, paymentStatus, grandTotalPaise, amountPaidPaise, advancePaidPaise, secondPaymentPaise, thirdPaymentPaise, resolvedUtr, orderDate) {
  try {
    const payMethod = paymentMethod || (isPos ? 'CASH' : 'UPI_GPAY');
    const payRecordStatus = paymentStatus === 'VERIFIED' ? 'VERIFIED' : (paymentStatus === 'REJECTED' ? 'REJECTED' : (paymentStatus === 'PARTIAL' ? 'VERIFIED' : 'PENDING_VERIFICATION'));
    const createdAt = orderDate || new Date().toISOString();

    if (isPos) {
      const hasStages = (advancePaidPaise > 0 || secondPaymentPaise > 0 || thirdPaymentPaise > 0);
      if (hasStages) {
        // Multi-stage installment POS order
        if (advancePaidPaise > 0) {
          const advId = 'pay-' + orderId + '-adv';
          const existingAdv = db.prepare('SELECT id, amount_paise FROM payments WHERE id = ? OR (order_id = ? AND payment_stage = ?)').get(advId, orderId, 'advance');
          if (!existingAdv) {
            db.prepare(`
              INSERT INTO payments (id, order_id, payment_method, amount_paise, status, claimed_upi_ref, notes, payment_stage, created_at)
              VALUES (?, ?, ?, ?, 'VERIFIED', ?, 'Advance Payment', 'advance', ?)
            `).run(advId, orderId, payMethod, advancePaidPaise, resolvedUtr || null, createdAt);
          } else if (existingAdv.amount_paise !== advancePaidPaise) {
            db.prepare(`
              UPDATE payments SET amount_paise = ?, status = 'VERIFIED', notes = 'Advance Payment' WHERE id = ?
            `).run(advancePaidPaise, existingAdv.id);
          }
        }
        if (secondPaymentPaise > 0) {
          const secId = 'pay-' + orderId + '-2nd';
          const existingSec = db.prepare('SELECT id, amount_paise FROM payments WHERE id = ? OR (order_id = ? AND payment_stage = ?)').get(secId, orderId, 'second_payment');
          if (!existingSec) {
            db.prepare(`
              INSERT INTO payments (id, order_id, payment_method, amount_paise, status, claimed_upi_ref, notes, payment_stage, created_at)
              VALUES (?, ?, ?, ?, 'VERIFIED', ?, '2nd Payment', 'second_payment', ?)
            `).run(secId, orderId, payMethod, secondPaymentPaise, resolvedUtr || null, createdAt);
          } else if (existingSec.amount_paise !== secondPaymentPaise) {
            db.prepare(`
              UPDATE payments SET amount_paise = ?, status = 'VERIFIED', notes = '2nd Payment' WHERE id = ?
            `).run(secondPaymentPaise, existingSec.id);
          }
        }
        if (thirdPaymentPaise > 0) {
          const thdId = 'pay-' + orderId + '-3rd';
          const existingThd = db.prepare('SELECT id, amount_paise FROM payments WHERE id = ? OR (order_id = ? AND payment_stage = ?)').get(thdId, orderId, 'third_payment');
          if (!existingThd) {
            db.prepare(`
              INSERT INTO payments (id, order_id, payment_method, amount_paise, status, claimed_upi_ref, notes, payment_stage, created_at)
              VALUES (?, ?, ?, ?, 'VERIFIED', ?, '3rd Payment', 'third_payment', ?)
            `).run(thdId, orderId, payMethod, thirdPaymentPaise, resolvedUtr || null, createdAt);
          } else if (existingThd.amount_paise !== thirdPaymentPaise) {
            db.prepare(`
              UPDATE payments SET amount_paise = ?, status = 'VERIFIED', notes = '3rd Payment' WHERE id = ?
            `).run(thirdPaymentPaise, existingThd.id);
          }
        }
        // Remove legacy single row pay-orderId if it exists with grandTotalPaise and multi-stage rows exist
        db.prepare("DELETE FROM payments WHERE id = ? AND id != ? AND id != ? AND id != ?").run('pay-' + orderId, 'pay-' + orderId + '-adv', 'pay-' + orderId + '-2nd', 'pay-' + orderId + '-3rd');
        return;
      }

      // POS order with single full or deposit payment (no multiple installment breakdown)
      const singlePayId = 'pay-' + orderId;
      const existingPay = db.prepare('SELECT id, amount_paise FROM payments WHERE order_id = ?').get(orderId);
      if (!existingPay) {
        db.prepare(`
          INSERT INTO payments (id, order_id, payment_method, amount_paise, status, claimed_upi_ref, notes, payment_stage, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'advance', ?)
        `).run(singlePayId, orderId, payMethod, amountPaidPaise, payRecordStatus, resolvedUtr || null, `POS Payment (${paymentStatus})`, createdAt);
      } else if (existingPay.amount_paise !== amountPaidPaise && amountPaidPaise > 0) {
        db.prepare('UPDATE payments SET amount_paise = ?, status = ? WHERE id = ?').run(amountPaidPaise, payRecordStatus, existingPay.id);
      }
      return;
    }

    // Website orders
    const webPayId = 'pay-' + orderId;
    const existingWebPay = db.prepare('SELECT id, amount_paise, status FROM payments WHERE order_id = ?').get(orderId);
    if (!existingWebPay) {
      db.prepare(`
        INSERT INTO payments (id, order_id, payment_method, amount_paise, status, claimed_upi_ref, notes, payment_stage, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'advance', ?)
      `).run(webPayId, orderId, payMethod, amountPaidPaise, payRecordStatus, resolvedUtr || null, `Online Storefront Payment (${paymentStatus})`, createdAt);
    } else {
      db.prepare(`
        UPDATE payments SET amount_paise = ?, status = ?, claimed_upi_ref = COALESCE(claimed_upi_ref, ?) WHERE id = ?
      `).run(amountPaidPaise, payRecordStatus, resolvedUtr || null, existingWebPay.id);
    }
  } catch (err) {
    console.warn(`[SupabaseSync] Error syncing payments for order ${orderId}:`, err.message);
  }
}

/**
 * Process a single cloud order record and upsert into local SQLite database
 */
async function processSingleCloudOrder(db, co, cloudVerifiedOrders = new Set(), cloudRejectedOrders = new Set(), cloudDetails = {}, cloudTombstones = new Set()) {
      try {
        if (!co.order_ref) return null;
      // Filter out dummy/test ghost orders
      if (/TEST-REF|GHOST-TEST/i.test(co.order_ref)) return null;

      // Filter out if explicitly in cloud tombstones
      if (cloudTombstones.has(co.order_ref) || (co.id && cloudTombstones.has(co.id))) {
        return null;
      }

      // Check if this order was deleted / tombstoned in local SQLite
      try {
        const isTombstoned = db.prepare('SELECT order_number FROM deleted_orders WHERE order_number = ?').get(co.order_ref);
        if (isTombstoned) return null;
      } catch (e) {}

      const grandTotalPaise = Math.round((Number(co.grand_total) || 0) * 100);
      const subtotalPaise = Math.round((Number(co.subtotal) || 0) * 100);
      const taxPaise = Math.round(grandTotalPaise * 0.18 / 1.18);
      const phone = co.customer_phone ? String(co.customer_phone).trim() : null;
      const name = co.customer_name ? String(co.customer_name).trim() : 'Customer';
      let orderDate = co.created_at || new Date().toISOString();
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(orderDate)) {
        orderDate = orderDate.replace(' ', 'T') + 'Z';
      } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(orderDate) && !orderDate.includes('Z') && !orderDate.includes('+')) {
        orderDate = orderDate + 'Z';
      }

      // Detect whether order is In-Store POS (Code 2) or Website (Code 1) (100% Authoritative Segregation)
      // The prefix NOOR-POS- vs NOOR-WEB- is the absolute, unshakeable source of truth.
      const ref = String(co.order_number || co.order_ref || co.id || '').toUpperCase();
      let isPos = false;
      if (ref.includes('-POS-') || ref.startsWith('ORD-POS-') || co.channel_code === 2 || co.channel === 'POS' || co.source === 'instore' || co.source === 'pos') {
        isPos = true;
      } else if (ref.includes('-WEB-') || ref.includes('-ONL-') || ref.startsWith('ORD-WEB-') || co.channel_code === 1 || co.channel === 'WEBSITE' || co.channel === 'ONLINE' || co.source === 'website') {
        isPos = false;
      } else if (Array.isArray(co.items) && co.items[0]?.channel) {
        isPos = (co.items[0].channel === 'POS' || co.items[0].channel === 'IN-STORE');
      } else {
        isPos = false; // Default to website if ambiguous, NEVER auto-convert to in-store POS
      }
      const channel = isPos ? 'POS' : 'WEBSITE';
      const channelCode = isPos ? 2 : 1;
      const source = isPos ? 'instore' : 'website';

      // Detect payment status and amount paid
      // In-store POS orders are counter transactions (NEVER AWAITING_VERIFICATION).
      // Website orders (UPI) require staff verification before being marked PAID.
      const isCloudVerified = cloudVerifiedOrders.has(co.order_ref) || (co.id && cloudVerifiedOrders.has(co.id));
      const isCloudRejected = cloudRejectedOrders.has(co.order_ref) || (co.id && cloudRejectedOrders.has(co.id));

      let isPaid = false;
      let paymentStatus = 'AWAITING_VERIFICATION';

      if (isPos) {
        // In-store POS counter orders: check if partial/due or verified (NEVER AWAITING_VERIFICATION)
        if (isCloudVerified) {
          isPaid = true;
          paymentStatus = 'VERIFIED';
        } else {
          const coStatus = String(co.payment_status || '').toUpperCase();
          if (coStatus === 'PARTIAL' || (co.outstanding_paise && co.outstanding_paise > 0) || (co.outstanding && co.outstanding > 0)) {
            isPaid = false;
            paymentStatus = 'PARTIAL';
          } else if (coStatus === 'PENDING' && (co.amount_paid_paise === 0 || co.amount_paid === 0)) {
            isPaid = false;
            paymentStatus = 'PENDING';
          } else {
            isPaid = true;
            paymentStatus = 'VERIFIED';
          }
        }
      } else {
        // Website orders strictly land in AWAITING_VERIFICATION (Verify UPI queue)
        // until shop owner clicks Accept / Approve in Admin
        if (isCloudRejected) {
          paymentStatus = 'REJECTED';
          isPaid = false;
        } else if (isCloudVerified) {
          paymentStatus = 'VERIFIED';
          isPaid = true;
        } else {
          paymentStatus = 'AWAITING_VERIFICATION';
          isPaid = false;
        }
      }

      let amountPaidPaise;
      let outstandingPaise;
      let advancePaidPaise = 0;
      let secondPaymentPaise = 0;
      let thirdPaymentPaise = 0;

      // Extract embedded financial breakdown from co.items if present
      let rawItemsForFin = co.items;
      if (typeof rawItemsForFin === 'string') {
        try { rawItemsForFin = JSON.parse(rawItemsForFin); } catch(_) {}
      }
      const firstIt = Array.isArray(rawItemsForFin) && rawItemsForFin[0] ? rawItemsForFin[0] : null;
      if (firstIt) {
        if (firstIt.advance_paid_inr != null) advancePaidPaise = Math.round(Number(firstIt.advance_paid_inr) * 100);
        else if (firstIt.advance_paid_paise != null) advancePaidPaise = Number(firstIt.advance_paid_paise);
        if (firstIt.second_payment_inr != null) secondPaymentPaise = Math.round(Number(firstIt.second_payment_inr) * 100);
        else if (firstIt.second_payment_paise != null) secondPaymentPaise = Number(firstIt.second_payment_paise);
        if (firstIt.third_payment_inr != null) thirdPaymentPaise = Math.round(Number(firstIt.third_payment_inr) * 100);
        else if (firstIt.third_payment_paise != null) thirdPaymentPaise = Number(firstIt.third_payment_paise);
      }

      if (isPos) {
        const refKey = String(co.order_ref || co.order_number || co.id || '').trim();
        const cDetail = (cloudDetails && (cloudDetails[refKey] || (co.id && cloudDetails[co.id]) || (co.order_number && cloudDetails[co.order_number]))) || null;
        if (cDetail && (cDetail.status === 'VERIFIED' || cDetail.outstandingINR === 0 || cDetail.outstanding_inr === 0)) {
          isPaid = true;
          amountPaidPaise = grandTotalPaise;
          outstandingPaise = 0;
          paymentStatus = 'VERIFIED';
        } else if (cDetail && (cDetail.status === 'PARTIAL' || cDetail.outstanding_inr != null || cDetail.outstandingINR != null)) {
          const outINR = cDetail.outstanding_inr != null ? cDetail.outstanding_inr : cDetail.outstandingINR;
          const paidINR = cDetail.amount_paid_inr != null ? cDetail.amount_paid_inr : cDetail.amountPaidINR;
          const advINR = cDetail.advance_paid_inr != null ? cDetail.advance_paid_inr : cDetail.advancePaidINR;
          const secINR = cDetail.second_payment_inr != null ? cDetail.second_payment_inr : cDetail.secondPaymentINR;
          const thdINR = cDetail.third_payment_inr != null ? cDetail.third_payment_inr : cDetail.thirdPaymentINR;
          if (outINR != null) outstandingPaise = Math.round(Number(outINR) * 100);
          if (paidINR != null) amountPaidPaise = Math.round(Number(paidINR) * 100);
          if (advINR != null) advancePaidPaise = Math.round(Number(advINR) * 100);
          if (secINR != null) secondPaymentPaise = Math.round(Number(secINR) * 100);
          if (thdINR != null) thirdPaymentPaise = Math.round(Number(thdINR) * 100);
          paymentStatus = (outstandingPaise === 0) ? 'VERIFIED' : (amountPaidPaise > 0 ? 'PARTIAL' : 'PENDING');
        } else if (isPaid || isCloudVerified || paymentStatus === 'VERIFIED') {
          amountPaidPaise = grandTotalPaise;
          outstandingPaise = 0;
          paymentStatus = 'VERIFIED';
        } else if (firstIt && (firstIt.outstanding_inr != null || advancePaidPaise > 0 || secondPaymentPaise > 0)) {
          if (firstIt.outstanding_inr != null) {
            outstandingPaise = Math.round(Number(firstIt.outstanding_inr) * 100);
            amountPaidPaise = Math.max(0, grandTotalPaise - outstandingPaise);
          } else {
            const sumStages = advancePaidPaise + secondPaymentPaise + thirdPaymentPaise;
            const existingPaid = db.prepare('SELECT amount_paid_paise, outstanding_paise FROM orders WHERE order_number = ?').get(co.order_ref);
            amountPaidPaise = Math.max(sumStages, existingPaid?.amount_paid_paise || 0);
            outstandingPaise = (existingPaid?.outstanding_paise != null && existingPaid.outstanding_paise < (grandTotalPaise - amountPaidPaise))
              ? existingPaid.outstanding_paise
              : Math.max(0, grandTotalPaise - amountPaidPaise);
          }
          paymentStatus = (outstandingPaise === 0) ? 'VERIFIED' : (amountPaidPaise > 0 ? 'PARTIAL' : 'PENDING');
        } else {
          const rawCloudPaid = (co.amount_paid_paise != null) ? co.amount_paid_paise : ((co.amount_paid != null) ? Math.round(Number(co.amount_paid) * 100) : (co.advance_paid_paise != null ? co.advance_paid_paise : null));
          amountPaidPaise = rawCloudPaid != null ? rawCloudPaid : 0;
          outstandingPaise = Math.max(0, grandTotalPaise - amountPaidPaise);
          if (outstandingPaise === 0) {
            paymentStatus = 'VERIFIED';
          } else if (amountPaidPaise > 0) {
            paymentStatus = 'PARTIAL';
          } else {
            paymentStatus = 'PENDING';
          }
        }
      } else {
        // Website orders have ZERO advance payment option. Always 100% full payment.
        if (paymentStatus === 'VERIFIED') {
          amountPaidPaise = grandTotalPaise;
          outstandingPaise = 0;
        } else {
          amountPaidPaise = 0;
          outstandingPaise = grandTotalPaise;
        }
      }

      // Extract UTR if present in notes, items, delivery address, or co
      let resolvedUtr = co.claimed_upi_ref || co.claimedUpiRef || co.utr || co.claimed_utr || null;
      if (!resolvedUtr && Array.isArray(co.items) && co.items.length > 0) {
        resolvedUtr = co.items[0].claimed_upi_ref || co.items[0].utr || null;
      }
      if (!resolvedUtr && co.notes && co.notes.includes('UPI Ref:')) {
        resolvedUtr = co.notes.split('UPI Ref:')[1].replace(/[)\]]/g, '').trim();
      }
      if (!resolvedUtr && co.delivery_address && co.delivery_address.includes('UTR:')) {
        const m = co.delivery_address.match(/UTR:\s*([A-Za-z0-9_-]+)/i);
        if (m) resolvedUtr = m[1].trim();
      }

      // Resolve or link customer record
      let customerId = null;
      if (phone) {
        const cleanPhone = phone.replace('+91', '').trim();
        const cust = db.prepare(`
          SELECT id FROM customers 
          WHERE phone = ? OR phone = ? OR phone = ('+91' || ?)
        `).get(phone, cleanPhone, cleanPhone);
        if (cust) {
          customerId = cust.id;
          db.prepare("UPDATE customers SET total_spent_paise = total_spent_paise + ?, updated_at = datetime('now') WHERE id = ?")
            .run(grandTotalPaise, customerId);
        }
      }

      // Check if client is tombstoned or if client directory was purged
      let isTombstoned = false;
      try {
        const cleanPhone = phone ? phone.replace('+91', '').trim() : '';
        const tomb = db.prepare(`
          SELECT customer_id FROM deleted_customers 
          WHERE (? IS NOT NULL AND customer_id = ?) 
             OR (? IS NOT NULL AND (phone = ? OR phone = ? OR phone = ('+91' || ?)))
          LIMIT 1
        `).get(co.customer_id || null, co.customer_id || null, phone || null, phone || '', cleanPhone || '', cleanPhone || '');
        if (tomb) isTombstoned = true;

        if (!isTombstoned) {
          const purgedRow = db.prepare("SELECT value FROM store_settings WHERE key = 'clients_purged_at'").get();
          if (purgedRow && purgedRow.value) {
            const orderTs = new Date(orderDate).getTime();
            const purgeTs = new Date(purgedRow.value).getTime();
            if (orderTs <= purgeTs) {
              isTombstoned = true;
            }
          }
        }
      } catch (e) {}

      // Only create customer record if client is not tombstoned and not purged
      if (!customerId && !isTombstoned && phone && name && name !== 'Walk-in Client' && name !== 'Walk-in Customer') {
        customerId = 'cust-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
        const clientCode = 'CLI-' + Math.floor(10000 + Math.random() * 90000);
        try {
          db.prepare(`
            INSERT INTO customers (
              id, client_code, name, phone, email, address, city, pin_code, notes, total_spent_paise, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Created via Supabase Order Sync', ?, ?, ?)
          `).run(
            customerId, clientCode, name, phone, co.customer_email || null,
            co.delivery_address || null, co.city || 'Bengaluru', co.pin_code || null,
            grandTotalPaise, orderDate, orderDate
          );
        } catch (insErr) {
          customerId = null;
        }
      }

      // Parse items
      let items = co.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch(e) { items = []; }
      }

      // 3. Extract & Sync Prescription record if present in items, order payload, or Supabase prescriptions table
      let attachedRx = null;
      if (Array.isArray(items)) {
        for (const it of items) {
          if (it && (it.prescription || it.rx)) {
            attachedRx = it.prescription || it.rx;
            break;
          }
        }
      }
      if (!attachedRx && (co.prescription || co.prescriptions)) {
        attachedRx = co.prescription || (Array.isArray(co.prescriptions) ? co.prescriptions[0] : null);
        if (typeof attachedRx === 'string') {
          try { attachedRx = JSON.parse(attachedRx); } catch (_) {}
        }
      }
      if (!attachedRx && (co.od_sph != null || co.os_sph != null || co.odSph != null || co.osSph != null)) {
        attachedRx = {
          prescription_number: co.prescription_number || ('RX-' + co.order_ref),
          od_sph: co.od_sph || co.odSph,
          od_cyl: co.od_cyl || co.odCyl,
          od_axis: co.od_axis != null ? co.od_axis : co.odAxis,
          os_sph: co.os_sph || co.osSph,
          os_cyl: co.os_cyl || co.osCyl,
          os_axis: co.os_axis != null ? co.os_axis : co.osAxis,
          addition: co.addition || co.add,
          ipd_distance: co.ipd_distance || co.pd
        };
      }
      if (!attachedRx && phone) {
        try {
          const rxRes = await fetch(`${SUPABASE_URL}/rest/v1/prescriptions?client_phone=eq.${encodeURIComponent(phone)}&order=created_at.desc&limit=1`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
          });
          if (rxRes.ok) {
            const rxList = await rxRes.json();
            if (Array.isArray(rxList) && rxList.length > 0) {
              attachedRx = rxList[0];
            }
          }
        } catch (_) {}
      }

      const hasRxDiopters = Boolean(attachedRx && (
        attachedRx.od_sph != null || attachedRx.os_sph != null ||
        attachedRx.odSph != null || attachedRx.osSph != null ||
        attachedRx.od_cyl != null || attachedRx.os_cyl != null ||
        attachedRx.prescription_number || attachedRx.prescriptionNumber
      ));

      // Ensure customerId exists if prescription is present (satisfies NOT NULL foreign key constraint on prescriptions.client_id)
      if (hasRxDiopters && !customerId) {
        customerId = 'cust-rx-' + co.order_ref.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const existingCust = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
        if (!existingCust) {
          const clientCode = 'CLI-' + Math.floor(10000 + Math.random() * 90000);
          try {
            db.prepare(`
              INSERT INTO customers (id, client_code, name, phone, email, address, city, pin_code, notes, total_spent_paise, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Auto-created for website order prescription', ?, datetime('now'), datetime('now'))
            `).run(
              customerId, clientCode, name || 'Website Client', phone || null,
              co.customer_email || null, co.delivery_address || null, co.city || 'Bengaluru', co.pin_code || null,
              grandTotalPaise, orderDate, orderDate
            );
          } catch (_) {
            const fallbackCust = db.prepare('SELECT id FROM customers LIMIT 1').get();
            if (fallbackCust) customerId = fallbackCust.id;
          }
        }
      }

      let syncedRxId = null;
      if (hasRxDiopters && customerId) {
        try {
          const localRxId = attachedRx.id || ('rx-cld-' + co.order_ref.toLowerCase().replace(/[^a-z0-9]/g, '-'));
          const rxNum = attachedRx.prescription_number || attachedRx.prescriptionNumber || ('RX-' + co.order_ref);
          const existingRx = db.prepare('SELECT id FROM prescriptions WHERE id = ? OR prescription_number = ?').get(localRxId, rxNum);
          if (!existingRx) {
            db.prepare(`
              INSERT INTO prescriptions (
                id, prescription_number, client_id, prescription_date,
                od_sph, od_cyl, od_axis, os_sph, os_cyl, os_axis, addition, ipd_distance, checked_by, notes, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              localRxId, rxNum, customerId, attachedRx.prescription_date || orderDate.split('T')[0],
              attachedRx.od_sph !== undefined && attachedRx.od_sph !== null && attachedRx.od_sph !== '' ? String(attachedRx.od_sph) : (attachedRx.odSph || '0.00'),
              attachedRx.od_cyl !== undefined && attachedRx.od_cyl !== null && attachedRx.od_cyl !== '' ? String(attachedRx.od_cyl) : (attachedRx.odCyl || '0.00'),
              attachedRx.od_axis !== undefined ? attachedRx.od_axis : null,
              attachedRx.os_sph !== undefined && attachedRx.os_sph !== null && attachedRx.os_sph !== '' ? String(attachedRx.os_sph) : (attachedRx.osSph || '0.00'),
              attachedRx.os_cyl !== undefined && attachedRx.os_cyl !== null && attachedRx.os_cyl !== '' ? String(attachedRx.os_cyl) : (attachedRx.osCyl || '0.00'),
              attachedRx.os_axis !== undefined ? attachedRx.os_axis : null,
              attachedRx.addition || attachedRx.add || null,
              attachedRx.ipd_distance || attachedRx.pd || null,
              attachedRx.checked_by || 'Website Client Submission',
              attachedRx.notes || null,
              orderDate, orderDate
            );
          }
          syncedRxId = existingRx ? existingRx.id : localRxId;
        } catch (rxErr) {
          console.warn(`[SupabaseSync] Prescription insert warning for ${co.order_ref}:`, rxErr.message);
        }
      }

      const existing = db.prepare('SELECT id, order_number, channel, channel_code, customer_id, payment_status, amount_paid_paise, outstanding_paise, advance_paid_paise, second_payment_paise, third_payment_paise, claimed_upi_ref, prescription_id, prescriptions_json FROM orders WHERE order_number = ?').get(co.order_ref);
      if (existing) {
        // Ensure channel, customer_id, and prescription are kept accurate
        if (!existing.customer_id && customerId) {
          db.prepare('UPDATE orders SET customer_id = ? WHERE id = ?').run(customerId, existing.id);
        }
        if (syncedRxId && (!existing.prescription_id || !existing.prescriptions_json)) {
          try {
            db.prepare('UPDATE orders SET prescription_id = ?, prescriptions_json = ? WHERE id = ?').run(syncedRxId, JSON.stringify([attachedRx]), existing.id);
          } catch (_) {}
        }
        // Local SQLite is the master authority for staff payment verification, installments, and outstanding balances!
        let finalPaymentStatus = existing.payment_status || paymentStatus;
        let finalAmountPaid = existing.amount_paid_paise !== undefined ? existing.amount_paid_paise : amountPaidPaise;
        let finalOutstanding = existing.outstanding_paise !== undefined ? existing.outstanding_paise : outstandingPaise;

        if (isCloudVerified || finalPaymentStatus === 'VERIFIED' || finalOutstanding === 0) {
          finalPaymentStatus = 'VERIFIED';
          finalAmountPaid = grandTotalPaise;
          finalOutstanding = 0;
        } else if (isPos) {
          // If local or cloud has higher payments recorded, preserve the highest progress
          if (existing.amount_paid_paise > finalAmountPaid) {
            finalAmountPaid = existing.amount_paid_paise;
            finalOutstanding = Math.max(0, grandTotalPaise - finalAmountPaid);
            finalPaymentStatus = (finalOutstanding === 0) ? 'VERIFIED' : 'PARTIAL';
            if (existing.second_payment_paise > secondPaymentPaise) secondPaymentPaise = existing.second_payment_paise;
            if (existing.third_payment_paise > thirdPaymentPaise) thirdPaymentPaise = existing.third_payment_paise;
            if (existing.advance_paid_paise > advancePaidPaise) advancePaidPaise = existing.advance_paid_paise;
          } else if (finalAmountPaid > (existing.amount_paid_paise || 0)) {
            finalOutstanding = Math.max(0, grandTotalPaise - finalAmountPaid);
            finalPaymentStatus = (finalOutstanding === 0) ? 'VERIFIED' : 'PARTIAL';
          }
          // Preserve the lowest outstanding recorded anywhere
          if (existing.outstanding_paise != null && existing.outstanding_paise < finalOutstanding) {
            finalOutstanding = existing.outstanding_paise;
            finalAmountPaid = Math.max(finalAmountPaid, grandTotalPaise - finalOutstanding);
          }
          // NEVER downgrade a locally-VERIFIED POS order. Cloud payment_status is RLS-blocked.
          // If local says VERIFIED or balance is settled, trust it unconditionally.
          if (existing.payment_status === 'VERIFIED' || finalPaymentStatus === 'VERIFIED' || finalOutstanding === 0) {
            finalPaymentStatus = 'VERIFIED';
            finalAmountPaid = grandTotalPaise;
            finalOutstanding = 0;
          } else if (finalOutstanding > 0 && finalAmountPaid > 0) {
            finalPaymentStatus = 'PARTIAL';
          } else if (finalOutstanding > 0 && finalAmountPaid === 0) {
            finalPaymentStatus = 'PENDING';
          } else {
            finalPaymentStatus = 'VERIFIED';
          }
        } else {
          // Website orders: NEVER mark as PARTIAL! Zero advance payment option.
          if (isCloudRejected) {
            finalPaymentStatus = 'REJECTED';
            finalAmountPaid = 0;
            finalOutstanding = grandTotalPaise;
          } else if (isCloudVerified || finalPaymentStatus === 'VERIFIED') {
            finalPaymentStatus = 'VERIFIED';
            finalAmountPaid = grandTotalPaise;
            finalOutstanding = 0;
          } else {
            finalPaymentStatus = 'AWAITING_VERIFICATION';
            finalAmountPaid = 0;
            finalOutstanding = grandTotalPaise;
          }
        }

        // Check if existing record is already identical to avoid unnecessary disk writes & lock contention!
        const isIdentical = (
          existing.channel === channel &&
          existing.channel_code === channelCode &&
          existing.payment_status === finalPaymentStatus &&
          existing.amount_paid_paise === finalAmountPaid &&
          existing.outstanding_paise === finalOutstanding &&
          (advancePaidPaise === 0 || (existing.advance_paid_paise || 0) === advancePaidPaise) &&
          (secondPaymentPaise === 0 || (existing.second_payment_paise || 0) === secondPaymentPaise) &&
          (thirdPaymentPaise === 0 || (existing.third_payment_paise || 0) === thirdPaymentPaise) &&
          (!resolvedUtr || existing.claimed_upi_ref === resolvedUtr)
        );

        if (isIdentical) {
          return db.prepare('SELECT * FROM orders WHERE id = ?').get(existing.id);
        }

        db.prepare(`
          UPDATE orders
          SET channel = ?, channel_code = ?, source = ?, payment_status = ?,
              amount_paid_paise = ?, advance_paid_paise = COALESCE(NULLIF(?, 0), advance_paid_paise),
              second_payment_paise = COALESCE(NULLIF(?, 0), second_payment_paise),
              third_payment_paise = COALESCE(NULLIF(?, 0), third_payment_paise),
              outstanding_paise = ?, claimed_upi_ref = COALESCE(claimed_upi_ref, ?)
          WHERE id = ?
        `).run(channel, channelCode, source, finalPaymentStatus, finalAmountPaid, advancePaidPaise, secondPaymentPaise, thirdPaymentPaise, finalOutstanding, resolvedUtr, existing.id);

        // Synchronize accurate multi-stage payments into payments table
        syncOrderPaymentsInDb(
          db, existing.id, isPos, co.payment_method, finalPaymentStatus,
          grandTotalPaise, finalAmountPaid, advancePaidPaise, secondPaymentPaise, thirdPaymentPaise,
          resolvedUtr, orderDate
        );

        return db.prepare('SELECT * FROM orders WHERE id = ?').get(existing.id);
      }

      // Generate order ID
      const orderId = 'ord-cld-' + co.order_ref.toLowerCase().replace(/[^a-z0-9]/g, '-');

      // For new POS orders: if SYS-ORDER-PAYMENTS says verified, force VERIFIED status
      // (Supabase orders.payment_status is RLS-blocked for anon writes, so it stays PARTIAL even when paid)
      let insertPaymentStatus = paymentStatus;
      let insertAmountPaid = amountPaidPaise;
      let insertOutstanding = outstandingPaise;
      if (isPos && (isCloudVerified || insertOutstanding === 0 || insertPaymentStatus === 'VERIFIED')) {
        insertPaymentStatus = 'VERIFIED';
        insertAmountPaid = grandTotalPaise;
        insertOutstanding = 0;
      } else if (isPos && !isCloudVerified) {
        // For POS orders not explicitly verified in cloud: use computed values from Supabase data
        insertPaymentStatus = (insertOutstanding === 0 || insertAmountPaid >= grandTotalPaise) ? 'VERIFIED' : (insertAmountPaid > 0 ? 'PARTIAL' : 'PENDING');
      }

      db.prepare(`
        INSERT INTO orders (
          id, order_number, token_number, channel, channel_code, source, customer_id, customer_name, customer_phone,
          customer_email, delivery_address, city, pin_code, prescription_pref, prescription_id, prescriptions_json,
          status, payment_status, subtotal_paise, tax_paise, total_payable_paise,
          amount_paid_paise, advance_paid_paise, second_payment_paise, third_payment_paise, outstanding_paise, claimed_upi_ref, notes, created_at, updated_at
        ) VALUES (
          ?, ?, 1, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          'CONFIRMED', ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        orderId, co.order_ref, channel, channelCode, source, customerId, name, phone,
        co.customer_email || null, co.delivery_address || null, co.city || null, co.pin_code || null,
        co.prescription_pref || (hasRxDiopters ? 'enter-rx' : 'Standard'), syncedRxId, hasRxDiopters ? JSON.stringify([attachedRx]) : null,
        insertPaymentStatus, subtotalPaise, taxPaise, grandTotalPaise,
        insertAmountPaid, advancePaidPaise, secondPaymentPaise, thirdPaymentPaise, insertOutstanding, resolvedUtr, isPos ? 'In-Store POS Bill (Synced)' : 'Online Website Order (Synced)', orderDate, orderDate
      );

      // Insert items
      if (Array.isArray(items)) {
        // Known special lens package prices (in paise)
        const SPECIAL_LENS_PRICES = {
          '1.60 High-Index Anti-Reflective': 69900,
          'Digital Free-Form Progressive': 149900,
          'Adaptive Photochromic Transition': 119900
        };

        const hasSeparateLensItem = items.some(it => it.isLensItem || it.is_lens_item || (it.name && it.name.includes('(Lens Package)')));

        items.forEach((item, idx) => {
          const isLens = Boolean(item.isLensItem || item.is_lens_item || (item.name && item.name.includes('(Lens Package)')));

          if (isLens) {
            const itemQty = parseInt(item.quantity || 1, 10);
            const unitPrice = item.unitPricePaise ? Number(item.unitPricePaise)
              : (item.unit_price_paise ? Number(item.unit_price_paise)
              : (item.unitPrice ? Math.round(Number(item.unitPrice) * 100)
              : (item.unit_price ? Math.round(Number(item.unit_price) * 100) : 69900)));
            const itemSubtotal = unitPrice * itemQty;

            db.prepare(`
              INSERT INTO order_items (
                id, order_id, variant_id, product_name, variant_name, sku, lens_name, unit_price_paise, purchase_cost_paise, quantity, subtotal_paise
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              'oit-' + orderId + '-lens-' + idx, orderId, null,
              item.name, 'Custom Optical Glazing', 'LENS-PKG',
              item.lensName || item.lens || item.name,
              unitPrice, 25000, itemQty, itemSubtotal
            );
            return;
          }

          let variantId = item.variantId || item.id;
          let varInfo = null;
          if (variantId) {
            varInfo = db.prepare(`
              SELECT pv.id, pv.color_name, pv.sku, p.name as product_name, p.selling_price_paise, p.purchase_cost_paise
              FROM product_variants pv
              JOIN products p ON pv.product_id = p.id
              WHERE pv.id = ? OR pv.product_id = ? OR p.id = ?
              LIMIT 1
            `).get(variantId, variantId, variantId);
          }
          if (!varInfo && item.name) {
            varInfo = db.prepare(`
              SELECT pv.id, pv.color_name, pv.sku, p.name as product_name, p.selling_price_paise, p.purchase_cost_paise
              FROM product_variants pv
              JOIN products p ON pv.product_id = p.id
              WHERE p.name = ? OR p.name LIKE ?
              LIMIT 1
            `).get(item.name, `%${item.name}%`);
          }
          if (!varInfo) {
            varInfo = db.prepare(`
              SELECT pv.id, pv.color_name, pv.sku, p.name as product_name, p.selling_price_paise, p.purchase_cost_paise
              FROM product_variants pv
              JOIN products p ON pv.product_id = p.id
              LIMIT 1
            `).get();
          }

          const resolvedVarId = varInfo ? varInfo.id : (variantId || 'var-noor-01-1');
          const prodName = item.name || (varInfo ? varInfo.product_name : 'Noor Optical Frame');
          const varColor = item.color || item.variant_name || (varInfo ? varInfo.color_name : 'Standard');
          const varSku = item.sku || (varInfo ? varInfo.sku : 'NOOR-FRAME');
          const purchaseCost = varInfo ? varInfo.purchase_cost_paise : 145000;
          const itemQty = parseInt(item.quantity || 1, 10);

          const selectedLensName = item.lensName || item.lens || 'Blue-Light Filter';
          const specialLensPrice = SPECIAL_LENS_PRICES[selectedLensName] || 0;

          // If cost increased due to special lens and lens was NOT already sent as a separate item, split them cleanly!
          if (!hasSeparateLensItem && specialLensPrice > 0) {
            const frameBasePrice = varInfo ? varInfo.selling_price_paise : Math.max(0, grandTotalPaise - specialLensPrice);
            const frameSubtotal = frameBasePrice * itemQty;
            const lensSubtotal = specialLensPrice * itemQty;

            // 1. Frame Entry
            db.prepare(`
              INSERT INTO order_items (
                id, order_id, variant_id, product_name, variant_name, sku, lens_name, unit_price_paise, purchase_cost_paise, quantity, subtotal_paise
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              'oit-' + orderId + '-' + idx, orderId, resolvedVarId,
              prodName, varColor, varSku,
              selectedLensName,
              frameBasePrice, purchaseCost, itemQty, frameSubtotal
            );

            // 2. Special Lens Entry (just like a frame entry in the bill)
            db.prepare(`
              INSERT INTO order_items (
                id, order_id, variant_id, product_name, variant_name, sku, lens_name, unit_price_paise, purchase_cost_paise, quantity, subtotal_paise
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              'oit-' + orderId + '-lens-' + idx, orderId, null,
              `${selectedLensName} (Lens Package)`, 'Custom Optical Glazing', 'LENS-PKG',
              selectedLensName,
              specialLensPrice, 25000, itemQty, lensSubtotal
            );
            return;
          }

          const rawPrice = item.unitPricePaise ? Number(item.unitPricePaise)
            : (item.unit_price_paise ? Number(item.unit_price_paise)
            : (item.unitPrice ? Math.round(Number(item.unitPrice) * 100)
            : (item.unit_price ? Math.round(Number(item.unit_price) * 100)
            : (varInfo ? varInfo.selling_price_paise : grandTotalPaise))));
          const itemSubtotal = rawPrice * itemQty;

          db.prepare(`
            INSERT INTO order_items (
              id, order_id, variant_id, product_name, variant_name, sku, lens_name, unit_price_paise, purchase_cost_paise, quantity, subtotal_paise
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            'oit-' + orderId + '-' + idx, orderId, resolvedVarId,
            prodName, varColor, varSku,
            selectedLensName,
            rawPrice, purchaseCost, itemQty, itemSubtotal
          );
        });
      }

      if (syncedRxId && attachedRx) {
        try {
          db.prepare('UPDATE orders SET prescription_id = ?, prescriptions_json = ? WHERE id = ?').run(syncedRxId, JSON.stringify([attachedRx]), orderId);
        } catch (_) {}
      }

      // Synchronize accurate multi-stage payments into payments table
      syncOrderPaymentsInDb(
        db, orderId, isPos, co.payment_method, insertPaymentStatus,
        grandTotalPaise, insertAmountPaid, advancePaidPaise, secondPaymentPaise, thirdPaymentPaise,
        resolvedUtr, orderDate
      );

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
      return db.prepare('SELECT * FROM orders WHERE id = ? OR order_number = ?').get(orderId, co.order_ref);
    } catch (orderErr) {
      console.warn(`[SupabaseSync] Error processing order ${co?.order_ref}:`, orderErr.message);
      return null;
    }
}

/**
 * Sync orders from Supabase cloud into local SQLite database
 */
async function syncSupabaseOrders(db, force = false) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || isSyncing) return;
  const now = Date.now();
  if (!force && (now - lastOrderSyncTime < ORDER_SYNC_CACHE_MS)) return;
  lastOrderSyncTime = now;
  isSyncing = true;
  // Safety reset: never block for more than 15s
  const isSyncingReset = setTimeout(() => { isSyncing = false; }, 15000);

  try {
    // 0. Fetch cloud payment verifications (guarantees payment approval sticks across all lambdas & clients)
    const { verified: cloudVerifiedOrders, rejected: cloudRejectedOrders, details: cloudDetails } = await fetchCloudOrderPayments();

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

    // 2. Fetch orders from Supabase (capped to most recent 300 to ensure all orders appear in admin)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc&limit=300`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      console.warn(`[SupabaseSync] Fetch failed with status ${res.status}`);
      return;
    }

    const cloudOrders = await res.json();
    if (!Array.isArray(cloudOrders) || cloudOrders.length === 0) return;

    for (const co of cloudOrders) {
      await processSingleCloudOrder(db, co, cloudVerifiedOrders, cloudRejectedOrders, cloudDetails, cloudTombstones);
    }
  } catch (err) {
    console.warn('[SupabaseSync] Error syncing orders from Supabase:', err.message);
  } finally {
    clearTimeout(isSyncingReset);
    isSyncing = false;
  }
}

/**
 * Fetch and sync a single order from Supabase cloud into SQLite immediately (bypasses rate limiter & sync locks)
 */
async function syncSingleOrderFromCloud(db, orderRefOrId) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !orderRefOrId) return null;
  const rawTarget = String(orderRefOrId).trim();
  const cleanTarget = rawTarget.replace(/^ord-cld-/, "");
  try {
    const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    const q1 = encodeURIComponent(rawTarget);
    const q2 = encodeURIComponent(cleanTarget);
    
    let parts = [];
    if (isUuid(rawTarget)) parts.push("id.eq." + q1);
    parts.push("order_ref.eq." + q1, "order_number.eq." + q1);
    if (rawTarget !== cleanTarget) {
      if (isUuid(cleanTarget)) parts.push("id.eq." + q2);
      parts.push("order_ref.eq." + q2, "order_number.eq." + q2);
    }
    const filter = "or=(" + parts.join(",") + ")";

    const res = await fetch(SUPABASE_URL + "/rest/v1/orders?" + filter + "&limit=1", {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return null;
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) return null;
    const co = list[0];

    const { verified: cloudVerifiedOrders, rejected: cloudRejectedOrders, details: cloudDetails } = await fetchCloudOrderPayments();
    const { orders: cloudTombstones } = await fetchCloudOrderTombstones();

    await processSingleCloudOrder(db, co, cloudVerifiedOrders, cloudRejectedOrders, cloudDetails, cloudTombstones);

    const ref = co.order_ref || co.order_number || co.id;
    const cldId = "ord-cld-" + String(ref).toLowerCase().replace(/[^a-z0-9]/g, "-");
    return db.prepare("SELECT * FROM orders WHERE order_number = ? OR id = ? OR id = ?").get(ref, ref, cldId);
  } catch (err) {
    console.warn("[SupabaseSync] syncSingleOrderFromCloud failed:", err.message);
    return null;
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
    let itemsToPush = Array.isArray(orderPayload.items) ? [...orderPayload.items] : [];
    const rxPayload = orderPayload.prescription || (orderPayload.od_sph ? {
      od_sph: orderPayload.od_sph,
      od_cyl: orderPayload.od_cyl,
      od_axis: orderPayload.od_axis,
      os_sph: orderPayload.os_sph,
      os_cyl: orderPayload.os_cyl,
      os_axis: orderPayload.os_axis,
      addition: orderPayload.addition,
      ipd_distance: orderPayload.ipd_distance
    } : null);

    if (rxPayload && itemsToPush.length > 0 && !itemsToPush[0].prescription) {
      itemsToPush[0] = { ...itemsToPush[0], prescription: rxPayload, rx: rxPayload };
    }

    const orderRef = String(orderPayload.orderNumber || orderPayload.order_ref || ('NOOR-' + Date.now())).trim();
    const isPosOrder = orderRef.includes('-POS-') ||
      orderPayload.channel_code === 2 ||
      orderPayload.channel === 'POS' ||
      orderPayload.source === 'instore';
    const resolvedChannel = isPosOrder ? 'POS' : 'WEBSITE';
    const resolvedChannelCode = isPosOrder ? 2 : 1;
    const resolvedSource = isPosOrder ? 'instore' : 'website';

    const resolvedUtr = orderPayload.claimedUpiRef || orderPayload.claimed_upi_ref || orderPayload.utr || null;
    const advancePaidInr = isPosOrder ? (orderPayload.advancePaidINR != null ? orderPayload.advancePaidINR : (orderPayload.advance_paid_inr != null ? orderPayload.advance_paid_inr : (orderPayload.advance_paid_paise ? orderPayload.advance_paid_paise / 100 : 0))) : 0;
    const secondPaymentInr = isPosOrder ? (orderPayload.secondPaymentINR != null ? orderPayload.secondPaymentINR : (orderPayload.second_payment_inr != null ? orderPayload.second_payment_inr : (orderPayload.second_payment_paise ? orderPayload.second_payment_paise / 100 : 0))) : 0;
    const thirdPaymentInr = isPosOrder ? (orderPayload.thirdPaymentINR != null ? orderPayload.thirdPaymentINR : (orderPayload.third_payment_inr != null ? orderPayload.third_payment_inr : (orderPayload.third_payment_paise ? orderPayload.third_payment_paise / 100 : 0))) : 0;
    const outstandingInr = isPosOrder ? (orderPayload.outstandingINR != null ? orderPayload.outstandingINR : (orderPayload.outstanding_inr != null ? orderPayload.outstanding_inr : (orderPayload.outstanding_paise ? orderPayload.outstanding_paise / 100 : 0))) : 0;

    itemsToPush = itemsToPush.map((it, idx) => ({
      ...it,
      channel: resolvedChannel,
      claimed_upi_ref: resolvedUtr || it.claimed_upi_ref || null,
      utr: resolvedUtr || it.utr || null,
      ...(idx === 0 && isPosOrder ? {
        advance_paid_inr: advancePaidInr,
        second_payment_inr: secondPaymentInr,
        third_payment_inr: thirdPaymentInr,
        outstanding_inr: outstandingInr
      } : {})
    }));
    const custName = String(orderPayload.customerName || orderPayload.customer_name || 'Walk-in Client').trim();
    const rawPhone = orderPayload.customerPhone || orderPayload.customer_phone || '';
    const cleanPhone = String(rawPhone).trim() || '9999999999';
    const custEmail = String(orderPayload.customerEmail || orderPayload.customer_email || `${cleanPhone.replace(/[^0-9]/g, '') || 'client'}@nooroptics.in`).trim();
    let address = String(orderPayload.deliveryAddress || orderPayload.delivery_address || 'In-Store Purchase - Noor Optic, Pillar No. 45, Rethibowli, Hyderabad').trim();
    if (resolvedUtr && !address.includes('UTR:')) {
      address += ` · (UPI UTR: ${resolvedUtr})`;
    }
    const city = String(orderPayload.city || 'Hyderabad').trim();
    const pin = String(orderPayload.pinCode || orderPayload.pin_code || '500028').trim();
    const rxPref = String(orderPayload.prescriptionPref || orderPayload.prescription_pref || ((orderPayload.prescriptionId || orderPayload.od_sph || orderPayload.prescription?.od_sph) ? 'RX Attached' : 'Standard')).trim();
    const payMethod = String(orderPayload.paymentMethod || orderPayload.payment_method || 'CASH').toUpperCase();
    let payStatus = String(orderPayload.paymentStatus || orderPayload.payment_status || (payMethod === 'CASH' ? 'VERIFIED' : 'AWAITING_VERIFICATION'));
    if (isPosOrder) {
      const outPaise = orderPayload.outstandingPaise !== undefined ? orderPayload.outstandingPaise : (orderPayload.outstanding_paise || (orderPayload.outstandingINR ? Math.round(orderPayload.outstandingINR * 100) : 0));
      payStatus = (outPaise > 0) ? 'PARTIAL' : 'VERIFIED';
    }
    const orderStatus = isPosOrder ? 'confirmed' : (payStatus === 'VERIFIED' ? 'confirmed' : 'PENDING_VERIFICATION');
    const subtotal = Number(orderPayload.subtotalINR || (orderPayload.subtotalPaise ? orderPayload.subtotalPaise / 100 : orderPayload.totalPayableINR || orderPayload.grandTotalINR || orderPayload.grand_total || 0));
    const grandTotal = Number(orderPayload.grandTotalINR || (orderPayload.totalPayablePaise ? orderPayload.totalPayablePaise / 100 : orderPayload.grand_total || subtotal));

    const baseOrderBody = {
      order_ref: orderRef,
      order_number: orderRef,
      channel: resolvedChannel,
      channel_code: resolvedChannelCode,
      source: resolvedSource,
      prescriptions: orderPayload.prescriptions || (orderPayload.prescription ? [orderPayload.prescription] : []),
      customer_name: custName,
      customer_email: custEmail,
      customer_phone: cleanPhone,
      delivery_address: address,
      city: city,
      pin_code: pin,
      prescription_pref: rxPref,
      payment_method: payMethod,
      payment_status: payStatus,
      customer_age: orderPayload.customerAge || orderPayload.age || null,
      prescription_id: orderPayload.prescriptionId || null,
      idempotency_key: orderPayload.idempotency_key || `idem-${orderRef}-${Date.now()}`,
      subtotal: subtotal,
      shipping_fee: 0,
      grand_total: grandTotal,
      status: orderStatus
    };
    if (itemsToPush.length > 0) {
      baseOrderBody.items = itemsToPush;
    }

    let res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(baseOrderBody)
    });

    let errText = '';
    if (!res.ok) {
      errText = await res.text();
      // Graceful fallback if migration has not added source/order_number/idempotency_key yet
      if (res.status === 400 && (errText.includes('source') || errText.includes('order_number') || errText.includes('PGRST204'))) {
        const legacyBody = {
          order_ref: orderRef,
          customer_name: custName,
          customer_email: custEmail,
          customer_phone: cleanPhone,
          delivery_address: address,
          city: city,
          pin_code: pin,
          prescription_pref: rxPref,
          payment_method: payMethod,
          payment_status: payStatus,
          subtotal: subtotal,
          shipping_fee: 0,
          grand_total: grandTotal,
          status: orderStatus
        };
        if (itemsToPush.length > 0) {
          legacyBody.items = itemsToPush;
        }
        res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          body: JSON.stringify(legacyBody)
        });
        if (!res.ok) {
          errText = await res.text();
        }
      }
    }

    if (res.ok) {
      console.log(`[SupabaseSync] Order ${orderRef} (${isPosOrder ? 'instore' : 'website'}) successfully pushed to Supabase cloud.`);
      
      if (payStatus === 'VERIFIED') {
        pushOrderPaymentStatusToCloud(orderRef, 'VERIFIED', 'POS Checkout Paid in Full').catch(() => {});
      } else if (payStatus === 'PARTIAL' && isPosOrder) {
        pushOrderPaymentStatusToCloud(orderRef, 'PARTIAL', 'In-Store POS Advance Payment', {
          amountPaidINR: orderPayload.amountPaidINR != null ? orderPayload.amountPaidINR : (orderPayload.advancePaidINR || 0),
          outstandingINR: orderPayload.outstandingINR != null ? orderPayload.outstandingINR : 0,
          advancePaidINR: orderPayload.advancePaidINR != null ? orderPayload.advancePaidINR : 0,
          secondPaymentINR: orderPayload.secondPaymentINR != null ? orderPayload.secondPaymentINR : 0,
          thirdPaymentINR: orderPayload.thirdPaymentINR != null ? orderPayload.thirdPaymentINR : 0
        }).catch(() => {});
      }
      
      // Auto-dispatch in-store POS bill to SYS-PRINT-QUEUE so the dedicated printer laptop prints it instantly!
      if (!orderPayload.skipPrintQueue) {
        try {
          const qRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-PRINT-QUEUE&select=notes`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
          });
          if (qRes.ok) {
            const qList = await qRes.json();
            let currentJobs = [];
            if (qList[0]?.notes) {
              try { currentJobs = JSON.parse(qList[0].notes).jobs || []; } catch(_) {}
            }
            let stageSuffix = 'init';
            const isManualReprint = Boolean(orderPayload.source === 'reprint' || orderPayload.manualReprint);
            const is4thOrBeyond = (Array.isArray(orderPayload.payments) && orderPayload.payments.length > 3);

            if (isManualReprint) {
              stageSuffix = 'reprint_' + Date.now();
            } else if (is4thOrBeyond) {
              stageSuffix = 'stage' + orderPayload.payments.length + '_' + Date.now();
            } else if (orderPayload.thirdPaymentINR > 0 || orderPayload.third_payment_inr > 0 || orderPayload.third_payment_paise > 0) {
              stageSuffix = 'stage3';
            } else if (orderPayload.secondPaymentINR > 0 || orderPayload.second_payment_inr > 0 || orderPayload.second_payment_paise > 0) {
              stageSuffix = 'stage2';
            }
            const jobId = 'rcp_' + orderRef + '_' + stageSuffix;

            const newJobObj = {
              id: jobId,
              type: 'receipt',
              approved: true,
              manualReprint: isManualReprint || is4thOrBeyond,
              source: (isManualReprint || is4thOrBeyond) ? 'reprint' : (stageSuffix === 'init' ? 'instore_checkout' : 'collect_payment'),
              created_at: new Date().toISOString(),
              order: {
                ...baseOrderBody,
                ...orderPayload,
                payments: orderPayload.payments || [],
                order_number: orderRef,
                order_ref: orderRef,
                id: orderPayload.id || orderRef,
                customer_name: custName,
                customer_phone: cleanPhone,
                items: itemsToPush,
                prescriptions: orderPayload.prescriptions || (orderPayload.prescription ? [orderPayload.prescription] : []),
                prescription: orderPayload.prescription || null,
                od_sph: orderPayload.od_sph != null ? orderPayload.od_sph : (orderPayload.prescription?.od_sph != null ? orderPayload.prescription.od_sph : null),
                od_cyl: orderPayload.od_cyl != null ? orderPayload.od_cyl : (orderPayload.prescription?.od_cyl != null ? orderPayload.prescription.od_cyl : null),
                od_axis: orderPayload.od_axis != null ? orderPayload.od_axis : (orderPayload.prescription?.od_axis != null ? orderPayload.prescription.od_axis : null),
                os_sph: orderPayload.os_sph != null ? orderPayload.os_sph : (orderPayload.prescription?.os_sph != null ? orderPayload.prescription.os_sph : null),
                os_cyl: orderPayload.os_cyl != null ? orderPayload.os_cyl : (orderPayload.prescription?.os_cyl != null ? orderPayload.prescription.os_cyl : null),
                os_axis: orderPayload.os_axis != null ? orderPayload.os_axis : (orderPayload.prescription?.os_axis != null ? orderPayload.prescription.os_axis : null),
                addition: orderPayload.addition != null ? orderPayload.addition : (orderPayload.prescription?.addition != null ? orderPayload.prescription.addition : null),
                ipd_distance: orderPayload.ipd_distance != null ? orderPayload.ipd_distance : (orderPayload.prescription?.ipd_distance != null ? orderPayload.prescription.ipd_distance : null),
                advance_paid_inr: orderPayload.advancePaidINR != null ? orderPayload.advancePaidINR : (orderPayload.advance_paid_inr || (orderPayload.paymentStatus === 'VERIFIED' ? grandTotal : 0)),
                advance_paid_paise: Math.round((orderPayload.advancePaidINR != null ? orderPayload.advancePaidINR : (orderPayload.advance_paid_inr || (orderPayload.paymentStatus === 'VERIFIED' ? grandTotal : 0))) * 100),
                second_payment_inr: orderPayload.secondPaymentINR != null ? orderPayload.secondPaymentINR : (orderPayload.second_payment_inr || 0),
                second_payment_paise: Math.round((orderPayload.secondPaymentINR != null ? orderPayload.secondPaymentINR : (orderPayload.second_payment_inr || 0)) * 100),
                third_payment_inr: orderPayload.thirdPaymentINR != null ? orderPayload.thirdPaymentINR : (orderPayload.third_payment_inr || 0),
                third_payment_paise: Math.round((orderPayload.thirdPaymentINR != null ? orderPayload.thirdPaymentINR : (orderPayload.third_payment_inr || 0)) * 100),
                outstanding_inr: orderPayload.outstandingINR != null ? orderPayload.outstandingINR : (orderPayload.outstanding_inr || (orderPayload.paymentStatus === 'VERIFIED' ? 0 : grandTotal)),
                outstanding_paise: Math.round((orderPayload.outstandingINR != null ? orderPayload.outstandingINR : (orderPayload.outstanding_inr || (orderPayload.paymentStatus === 'VERIFIED' ? 0 : grandTotal))) * 100),
                amount_paid_inr: (orderPayload.amountPaidINR != null ? orderPayload.amountPaidINR : (orderPayload.amount_paid_inr || (orderPayload.paymentStatus === 'VERIFIED' ? grandTotal : 0))),
                amount_paid_paise: Math.round((orderPayload.amountPaidINR != null ? orderPayload.amountPaidINR : (orderPayload.amount_paid_inr || (orderPayload.paymentStatus === 'VERIFIED' ? grandTotal : 0))) * 100),
                total_payable_inr: grandTotal,
                total_payable_paise: Math.round(grandTotal * 100),
                discount_inr: orderPayload.discountINR != null ? orderPayload.discountINR : (orderPayload.discount_inr || 0),
                discount_paise: Math.round((orderPayload.discountINR != null ? orderPayload.discountINR : (orderPayload.discount_inr || 0)) * 100),
                subtotal: subtotal,
                grand_total: grandTotal
              }
            };

            const existingIdx = currentJobs.findIndex(j => j.id === jobId);
            if (existingIdx >= 0) {
              currentJobs[existingIdx] = newJobObj;
            } else {
              currentJobs.push(newJobObj);
            }
            if (currentJobs.length > 30) currentJobs = currentJobs.slice(-30);
            await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-PRINT-QUEUE`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ notes: JSON.stringify({ jobs: currentJobs }) })
            });
            console.log(`[SupabaseSync] In-store bill #${orderRef} dispatched to SYS-PRINT-QUEUE for POS printer hardware.`);
          }
        } catch (qErr) {
          console.warn('[SupabaseSync] In-store SYS-PRINT-QUEUE note:', qErr.message);
        }
      }
      // If it is a website order, guarantee its print job is held until staff approves UPI payment
      if (!isPosOrder && payStatus !== 'VERIFIED') {
        try {
          const fetchOrd = await fetch(`${SUPABASE_URL}/rest/v1/orders?order_ref=eq.${encodeURIComponent(orderRef)}&select=id`, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
          });
          if (fetchOrd.ok) {
            const ords = await fetchOrd.json();
            if (ords && ords.length > 0) {
              await fetch(`${SUPABASE_URL}/rest/v1/print_jobs?order_id=eq.${ords[0].id}`, {
                method: 'PATCH',
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  status: 'uncertain',
                  last_error: 'Held pending staff UPI payment verification'
                })
              });
            }
          }
        } catch (_) {}
      }
    } else {
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
        od_sph: rx.od_sph !== undefined && rx.od_sph !== null && rx.od_sph !== '' ? (isNaN(parseFloat(rx.od_sph)) ? null : parseFloat(rx.od_sph)) : null,
        od_cyl: rx.od_cyl !== undefined && rx.od_cyl !== null && rx.od_cyl !== '' ? (isNaN(parseFloat(rx.od_cyl)) ? null : parseFloat(rx.od_cyl)) : null,
        od_axis: rx.od_axis !== undefined && rx.od_axis !== null && rx.od_axis !== '' ? parseInt(rx.od_axis, 10) : null,
        od_va: rx.od_va || null,
        os_sph: rx.os_sph !== undefined && rx.os_sph !== null && rx.os_sph !== '' ? (isNaN(parseFloat(rx.os_sph)) ? null : parseFloat(rx.os_sph)) : null,
        os_cyl: rx.os_cyl !== undefined && rx.os_cyl !== null && rx.os_cyl !== '' ? (isNaN(parseFloat(rx.os_cyl)) ? null : parseFloat(rx.os_cyl)) : null,
        os_axis: rx.os_axis !== undefined && rx.os_axis !== null && rx.os_axis !== '' ? parseInt(rx.os_axis, 10) : null,
        os_va: rx.os_va || null,
        addition: rx.addition || rx.add || null,
        pd: rx.pd || rx.ipd_distance || rx.ipdDistance || null,
        image_url: rx.image_url || rx.imageUrl || null,
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
  // Guard against deleting system configuration rows
  if (String(customerId).startsWith('sys-') || String(customerId).startsWith('tombstone-')) return;
  try {
    let url = `${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(customerId)}&client_code=not.like.SYS-*&id=not.like.sys-*&id=not.like.tombstone-*`;
    if (phone) {
      url = `${SUPABASE_URL}/rest/v1/customers?or=(id.eq.${encodeURIComponent(customerId)},phone.eq.${encodeURIComponent(phone)})&client_code=not.like.SYS-*&id=not.like.sys-*&id=not.like.tombstone-*`;
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
 * Delete all real customers from Supabase cloud (safely preserving system tracking records)
 */
async function deleteAllCustomersFromSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=not.like.SYS-*&id=not.like.sys-*&id=not.like.tombstone-*`, {
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=not.like.SYS-*&id=not.like.sys-*&id=not.like.tombstone-*&select=*`, {
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
      // Skip system rows
      if ((c.client_code && c.client_code.startsWith('SYS-')) || (c.id && (c.id.startsWith('sys-') || c.id.startsWith('tombstone-')))) continue;

      // Check if client was deleted / tombstoned by admin by ID or phone
      try {
        const cleanPhone = c.phone ? c.phone.replace('+91', '').trim() : '';
        const isTombstoned = db.prepare(`
          SELECT customer_id FROM deleted_customers 
          WHERE customer_id = ? 
             OR (? IS NOT NULL AND (phone = ? OR phone = ? OR phone = ('+91' || ?)))
          LIMIT 1
        `).get(c.id, c.phone || null, c.phone || '', cleanPhone || '', cleanPhone || '');
        if (isTombstoned) {
          continue;
        }

        const purgedRow = db.prepare("SELECT value FROM store_settings WHERE key = 'clients_purged_at'").get();
        if (purgedRow && purgedRow.value) {
          const cDate = c.created_at ? new Date(c.created_at).getTime() : 0;
          const purgeTs = new Date(purgedRow.value).getTime();
          if (cDate <= purgeTs) {
            continue;
          }
        }
      } catch (e) {}

      const existing = db.prepare("SELECT id FROM customers WHERE id = ? OR (phone IS NOT NULL AND phone != '' AND phone = ?)").get(c.id, c.phone);
      if (existing) {
        let safeCode = c.client_code;
        if (safeCode) {
          const codeTaken = db.prepare('SELECT id FROM customers WHERE client_code = ? AND id != ?').get(safeCode, existing.id);
          if (codeTaken) safeCode = null;
        }

        db.prepare(`
          UPDATE customers
          SET name = COALESCE(?, name), client_code = COALESCE(?, client_code), age = COALESCE(?, age), dob = COALESCE(?, dob),
              phone = COALESCE(?, phone), email = COALESCE(?, email), address = COALESCE(?, address), city = COALESCE(?, city),
              pin_code = COALESCE(?, pin_code), notes = COALESCE(?, notes), is_archived = ?, updated_at = ?
          WHERE id = ?
        `).run(
          c.name, safeCode, c.age || null, c.dob || null, c.phone || null,
          c.email || null, c.address || null, c.city || 'Bengaluru', c.pin_code || null,
          c.notes || null, c.is_archived ? 1 : 0, c.updated_at || new Date().toISOString(),
          existing.id
        );
      } else {
        // Ensure client_code is unique in SQLite
        let code = c.client_code;
        const codeTaken = db.prepare('SELECT id FROM customers WHERE client_code = ?').get(code);
        if (codeTaken) {
          code = 'CLI-' + Math.floor(10000 + Math.random() * 90000);
        }

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
 * Synchronize custom products & inventory between SQLite and Supabase cloud
 */
async function syncSupabaseProducts(db, force = false) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  if (!force && (Date.now() - lastProductSyncTime < PRODUCT_SYNC_CACHE_MS)) return;
  lastProductSyncTime = Date.now();
  try {
    // 0. Fetch cloud product tombstones so deleted items are NEVER resurrected
    const { products: tombstonedProducts } = await fetchCloudProductTombstones();

    // 1. Fetch custom added products from Supabase cloud (SYS-CATALOG-PRODUCTS)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-CATALOG-PRODUCTS`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!res.ok) return;
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0 || !list[0].notes) return;

    let cloudProducts = [];
    try {
      cloudProducts = JSON.parse(list[0].notes);
    } catch (_) { cloudProducts = []; }

    if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
      for (const cp of cloudProducts) {
        if (!cp || !cp.name) continue;
        const prodId = cp.id || ('prod-' + (cp.sku ? cp.sku.toLowerCase() : Date.now()));
        const sku = (cp.sku && cp.sku.trim() && cp.sku.trim().toUpperCase() !== 'NOOR-FRAME')
          ? cp.sku.trim().toUpperCase()
          : ('NOOR-' + (cp.name || 'FRAME').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) + '-' + prodId.slice(-4));

        // Never restore deleted / tombstoned products
        if (tombstonedProducts.has(String(prodId).toLowerCase().trim()) ||
            tombstonedProducts.has(String(sku).toLowerCase().trim()) ||
            (cp.name && tombstonedProducts.has(String(cp.name).toLowerCase().trim()))) {
          continue;
        }

        try {
          const isDeletedLocally = db.prepare(`
            SELECT product_id FROM deleted_products
            WHERE product_id = ? OR (sku IS NOT NULL AND sku != 'NOOR-FRAME' AND LOWER(sku) = LOWER(?))
          `).get(prodId, sku);
          if (isDeletedLocally) {
            deleteProductFromCloud(prodId, sku, cp.name).catch(() => {});
            continue;
          }
        } catch (_) {}

        const sellingPaise = Math.round((Number(cp.price) || 3499) * 100);
        const origPaise = cp.original_price ? Math.round(Number(cp.original_price) * 100) : null;
        const costPaise = cp.purchaseCostINR ? Math.round(Number(cp.purchaseCostINR) * 100) : 145000;
        const stockQty = Number(cp.total_stock !== undefined ? cp.total_stock : (cp.stock !== undefined ? cp.stock : (cp.initialStock !== undefined ? cp.initialStock : 1)));
        const cleanThreshold = Number(cp.reorder_threshold !== undefined ? cp.reorder_threshold : 0);
        const img = cp.image || cp.imageUrl || cp.image_url || 'images/stockholm_noir.jpg';

        // Check if product exists in local SQLite (never collide on generic placeholder)
        const existing = db.prepare("SELECT id FROM products WHERE id = ? OR (sku IS NOT NULL AND LOWER(sku) = LOWER(?) AND LOWER(sku) != 'noor-frame')").get(prodId, sku);
        if (!existing) {
          db.prepare(`
            INSERT INTO products (
              id, sku, name, brand, shape, material, fit, category,
              selling_price_paise, original_price_paise, purchase_cost_paise,
              supplier_id, reorder_threshold, image_url, description, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 1)
          `).run(
            prodId, sku, cp.name, cp.brand || 'Noor Optics',
            cp.shape || 'Rectangular', cp.material || 'Japanese Titanium',
            cp.fit || 'Regular', cp.category || 'Optical',
            sellingPaise, origPaise, costPaise,
            cleanThreshold, img, cp.description || ''
          );

          // Variant
          const varId = `var-${prodId}-1`;
          const varSku = `${sku}-STD`;
          const barcode = `8901${Math.floor(100000 + Math.random() * 900000)}`;

          db.prepare(`
            INSERT OR IGNORE INTO product_variants (id, product_id, sku, barcode, color_name, color_hex)
            VALUES (?, ?, ?, ?, 'Standard', '#111111')
          `).run(varId, prodId, varSku, barcode);

          db.prepare(`
            INSERT OR IGNORE INTO inventory_balances (id, variant_id, location_id, available_qty, reserved_qty)
            VALUES (?, ?, 'loc-main', ?, 0)
          `).run(`bal-${varId}`, varId, stockQty);

          console.log(`[SupabaseSync] Restored cloud product "${cp.name}" (${sku}) into local inventory.`);
        } else {
          // Update existing product with latest cloud specifications & ensure active
          db.prepare(`
            UPDATE products SET
              name = COALESCE(?, name),
              brand = COALESCE(?, brand),
              selling_price_paise = ?,
              original_price_paise = ?,
              purchase_cost_paise = ?,
              reorder_threshold = ?,
              image_url = CASE WHEN ? IS NOT NULL AND ? != '' THEN ? ELSE image_url END,
              description = COALESCE(?, description),
              is_active = 1,
              updated_at = datetime('now')
            WHERE id = ?
          `).run(cp.name, cp.brand || null, sellingPaise, origPaise, costPaise, cleanThreshold, img, img, img, cp.description || null, existing.id);

          // Update balance if variant exists
          const vRow = db.prepare('SELECT id FROM product_variants WHERE product_id = ? LIMIT 1').get(existing.id);
          if (vRow) {
            db.prepare('UPDATE inventory_balances SET available_qty = ? WHERE variant_id = ? AND location_id = ?').run(stockQty, vRow.id, 'loc-main');
          }
        }
      }
    }

    // 2. Clean up any tombstoned products currently lingering in local SQLite
    for (const tombToken of tombstonedProducts) {
      if (!tombToken) continue;
      const existing = db.prepare("SELECT id, name, sku FROM products WHERE LOWER(id) = ? OR (sku IS NOT NULL AND LOWER(sku) = ?)").get(tombToken, tombToken);
      if (existing) {
        try {
          const variants = db.prepare('SELECT id FROM product_variants WHERE product_id = ?').all(existing.id);
          const varIds = variants.map(v => v.id);
          if (varIds.length > 0) {
            const placeholders = varIds.map(() => '?').join(',');
            db.prepare(`UPDATE order_items SET variant_id = NULL WHERE variant_id IN (${placeholders})`).run(...varIds);
            db.prepare(`UPDATE purchase_order_items SET variant_id = NULL WHERE variant_id IN (${placeholders})`).run(...varIds);
            db.prepare(`DELETE FROM stock_movements WHERE variant_id IN (${placeholders})`).run(...varIds);
            db.prepare(`DELETE FROM inventory_balances WHERE variant_id IN (${placeholders})`).run(...varIds);
            db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(existing.id);
          }
          db.prepare('DELETE FROM product_images WHERE product_id = ?').run(existing.id);
          db.prepare('DELETE FROM products WHERE id = ?').run(existing.id);
          console.log(`[SupabaseSync] Purged tombstoned product "${existing.name}" (${existing.sku}) from SQLite.`);
        } catch (tombErr) {
          console.warn('[SupabaseSync] Clean tombstone product note:', tombErr.message);
        }
      }
    }
  } catch (err) {
    console.warn('[SupabaseSync] Error syncing products from Supabase:', err.message);
  }
}

/**
 * Push newly created/updated product to Supabase cloud
 */
async function pushProductToCloud(product) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !product) return false;
  try {
    const prodId = product.id || ('prod-' + Date.now());
    const sku = (product.sku && product.sku.trim() && product.sku.trim().toUpperCase() !== 'NOOR-FRAME')
      ? product.sku.trim().toUpperCase()
      : ('NOOR-' + (product.name || 'FRAME').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) + '-' + prodId.slice(-4));
    const formatted = {
      id: prodId,
      sku: sku,
      name: product.name,
      brand: product.brand || 'Noor Optics',
      collection: product.brand || 'Noor Signature',
      price: Number(product.sellingPriceINR || (product.selling_price_paise ? product.selling_price_paise / 100 : 3499)),
      original_price: product.originalPriceINR || (product.original_price_paise ? product.original_price_paise / 100 : null),
      badge: product.badge || 'New Arrival',
      shape: product.shape || 'Rectangular',
      material: product.material || 'Japanese Titanium',
      fit: product.fit || 'Regular',
      category: product.category || 'Optical',
      rating: 5.0,
      reviews_count: 1,
      image: product.imageUrl || product.image || 'images/stockholm_noir.jpg',
      colors: Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.map(v => ({ name: v.colorName || v.color_name || 'Standard', hex: v.colorHex || v.color_hex || '#111111' }))
        : [{ name: 'Standard', hex: '#111111' }],
      dimensions: { lens: '52mm', bridge: '18mm', temple: '145mm', weight: '15g' },
      description: product.description || '',
      stock: Number(product.initialStock || product.stock || (product.variants && product.variants[0] && product.variants[0].initialStock) || product.total_stock || 10),
      is_active: true,
      updated_at: new Date().toISOString()
    };

    // 1. Fetch current SYS-CATALOG-PRODUCTS
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-CATALOG-PRODUCTS`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });

    let currentList = [];
    let recordExists = false;
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        recordExists = true;
        try { currentList = JSON.parse(list[0].notes || '[]'); } catch (_) { currentList = []; }
      }
    }

    const idx = currentList.findIndex(p => p.id === prodId || (p.sku && p.sku !== 'NOOR-FRAME' && sku !== 'NOOR-FRAME' && p.sku.toUpperCase() === sku.toUpperCase()));
    if (idx >= 0) {
      currentList[idx] = formatted;
    } else {
      currentList.unshift(formatted);
    }

    if (recordExists) {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-CATALOG-PRODUCTS`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: JSON.stringify(currentList), updated_at: new Date().toISOString() })
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
          id: 'sys-catalog-products-meta',
          client_code: 'SYS-CATALOG-PRODUCTS',
          name: 'System Catalog Custom Products',
          notes: JSON.stringify(currentList)
        })
      });
    }

    // 2. Also upsert into Supabase products table (only columns in cloud schema)
    try {
      const tableRow = {
        id: prodId,
        name: formatted.name,
        collection: formatted.collection,
        price: formatted.price,
        original_price: formatted.original_price,
        badge: formatted.badge,
        shape: formatted.shape,
        material: formatted.material,
        fit: formatted.fit,
        category: formatted.category,
        rating: formatted.rating,
        reviews_count: formatted.reviews_count,
        image: formatted.image,
        colors: formatted.colors,
        dimensions: formatted.dimensions,
        description: formatted.description,
        is_active: true
      };
      await fetch(`${SUPABASE_URL}/rest/v1/products`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify([tableRow])
      });
    } catch (_) {}

    console.log(`[SupabaseSync] Product "${product.name}" pushed to Supabase cloud successfully.`);

    // 3. Ensure product is untombstoned so it is never hidden or skipped
    await removeProductFromCloudTombstone(prodId, sku, product.name);

    // Invalidate cache so storefront shows it immediately
    invalidateProductSyncCache();

    return true;
  } catch (err) {
    console.warn('[SupabaseSync] pushProductToCloud error:', err.message);
    return false;
  }
}

/**
 * Remove product from SYS-TOMBSTONE-PRODUCTS when a frame is created or restored
 */
async function removeProductFromCloudTombstone(productId, sku = null, name = null) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || (!productId && !sku && !name)) return;
  try {
    const tokensToRemove = new Set();
    if (productId) tokensToRemove.add(String(productId).toLowerCase().trim());
    if (sku) tokensToRemove.add(String(sku).toLowerCase().trim());
    if (name) tokensToRemove.add(String(name).toLowerCase().trim());

    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (!res.ok) return;
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0 || !list[0].notes) return;

    let currentList = [];
    try {
      const parsed = JSON.parse(list[0].notes);
      currentList = Array.isArray(parsed) ? parsed : (parsed.products || []);
    } catch (_) { return; }

    const filtered = currentList.filter(t => !tokensToRemove.has(String(t).toLowerCase().trim()));
    if (filtered.length !== currentList.length) {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: JSON.stringify({ products: filtered, updated_at: new Date().toISOString() }) })
      });
      console.log(`[SupabaseSync] Removed active product ${productId || sku || name} from cloud tombstones.`);
    }
  } catch (err) {
    console.warn('[SupabaseSync] removeProductFromCloudTombstone note:', err.message);
  }
}

/**
 * Completely delete product from Supabase cloud:
 * 1. Hard DELETE & deactivate in `products` table
 * 2. Remove from `SYS-CATALOG-PRODUCTS` in `customers` table
 * 3. Add to `SYS-TOMBSTONE-PRODUCTS` in `customers` table
 */
async function deleteProductFromCloud(productId, sku = null, name = null) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || (!productId && !sku && !name)) return false;
  try {
    const tokens = new Set();
    if (productId) tokens.add(String(productId).toLowerCase().trim());
    if (sku) tokens.add(String(sku).toLowerCase().trim());
    if (name) tokens.add(String(name).toLowerCase().trim());

    // 1. Delete and deactivate from Supabase `products` table
    try {
      if (productId) {
        await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ is_active: false })
        });
        await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
      }
    } catch (_) {}

    // 2. Remove from SYS-CATALOG-PRODUCTS in customers table
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-CATALOG-PRODUCTS`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0 && list[0].notes) {
        let currentList = [];
        try { currentList = JSON.parse(list[0].notes); } catch (_) { currentList = []; }
        const prevLen = currentList.length;
        currentList = currentList.filter(p => {
          if (!p) return false;
          const pId = p.id ? String(p.id).toLowerCase().trim() : '';
          const pSku = p.sku ? String(p.sku).toLowerCase().trim() : '';
          const pName = p.name ? String(p.name).toLowerCase().trim() : '';
          if (tokens.has(pId) || tokens.has(pSku) || tokens.has(pName)) return false;
          return true;
        });

        if (currentList.length !== prevLen) {
          await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-CATALOG-PRODUCTS`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes: JSON.stringify(currentList), updated_at: new Date().toISOString() })
          });
        }
      }
    }

    // 3. Push to SYS-TOMBSTONE-PRODUCTS
    await pushDeletedProductToCloudTombstone(productId, sku, name);

    // Invalidate product sync cache so deleted items disappear immediately
    invalidateProductSyncCache();

    console.log(`[SupabaseSync] Product ${productId || sku || name} completely purged from Supabase cloud.`);
    return true;
  } catch (err) {
    console.warn('[SupabaseSync] deleteProductFromCloud error:', err.message);
    return false;
  }
}

/**
 * Permanently purge all optical frame inventory from Supabase cloud
 */
async function clearAllProductsFromCloud(tokens = []) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    // 1. Reset SYS-CATALOG-PRODUCTS to empty
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-CATALOG-PRODUCTS`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: '[]', updated_at: new Date().toISOString() })
      });
    } catch (_) {}

    // 2. Deactivate & attempt delete on products table
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/products?id=not.is.null`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: false })
      });
      await fetch(`${SUPABASE_URL}/rest/v1/products?id=not.is.null`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });
    } catch (_) {}

    // 3. Push all tokens (base + custom) into SYS-TOMBSTONE-PRODUCTS
    const allTokens = [
      'noor-01', 'noor-02', 'noor-03', 'noor-04', 'noor-05', 'noor-06',
      'noor-07', 'noor-08', 'noor-09', 'noor-10', 'noor-11', 'noor-12',
      'noor-13', 'noor-14', 'noor-15', 'noor-16', 'noor-17', 'noor-18',
      'NOOR-STK-01', 'NOOR-CPH-02', 'NOOR-OSL-03', 'NOOR-KYO-04', 'NOOR-MIL-05', 'NOOR-ZUR-06',
      'NOOR-BER-07', 'NOOR-HEL-08', 'NOOR-REY-09', 'NOOR-VIE-10', 'NOOR-AMB-11', 'NOOR-TKY-12',
      'NOOR-GOT-13', 'NOOR-MAL-14', 'NOOR-ARC-15', 'NOOR-NRD-16', 'NOOR-BER-17', 'NOOR-BOR-18',
      'The Stockholm Noir', 'The Copenhagen Round', 'The Oslo Crystal', 'The Kyoto Havana',
      'The Milan Aureum', 'The Zurich Titanium', 'The Berlin Hex', 'The Helsinki Quad',
      'The Reykjavik Pilot', 'The Vienna Silhouette', 'The Amber Arch', 'The Tokyo Steel',
      'The Gothenburg Wire', 'The Malmö Clear', 'The Arctic Sun-Optic', 'The Nord Fjord',
      'The Bergen Dual', 'The Bordeaux Edge',
      ...(Array.isArray(tokens) ? tokens : [])
    ];
    await pushDeletedProductToCloudTombstone(allTokens);

    console.log('[SupabaseSync] All inventory successfully cleared from Supabase cloud.');
    return true;
  } catch (err) {
    console.warn('[SupabaseSync] clearAllProductsFromCloud error:', err.message);
    return false;
  }
}

/**
 * Start recurring background synchronization
 */
async function pushPrintJobToCloudQueue(jobPayload) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-PRINT-QUEUE`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    const list = await res.json();
    let jobs = [];
    let recordExists = false;

    if (Array.isArray(list) && list.length > 0) {
      recordExists = true;
      try {
        const parsed = JSON.parse(list[0].notes || '{}');
        jobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];
      } catch (_) { jobs = []; }
    }

    const newJob = {
      id: (jobPayload.type === 'receipt' ? 'rcp_' : 'stk_') + Date.now() + '_' + Math.floor(Math.random() * 1000),
      type: jobPayload.type || 'qr_sticker',
      order: jobPayload.order || null,
      items: jobPayload.items || (jobPayload.order ? jobPayload.order.items : [jobPayload]),
      approved: jobPayload.approved !== undefined ? Boolean(jobPayload.approved) : true,
      source: jobPayload.source || (jobPayload.type === 'receipt' ? 'staff_approved' : 'cloud_queue'),
      created_at: new Date().toISOString()
    };
    jobs.push(newJob);

    if (jobs.length > 30) jobs = jobs.slice(-30);

    if (recordExists) {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-PRINT-QUEUE`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ notes: JSON.stringify({ jobs }) })
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          id: 'sys-print-queue-global',
          client_code: 'SYS-PRINT-QUEUE',
          name: 'System Print Spooler Queue',
          city: 'Bengaluru',
          notes: JSON.stringify({ jobs })
        })
      });
    }
    return { success: true, jobId: newJob.id };
  } catch (err) {
    console.warn('pushPrintJobToCloudQueue warning:', err.message);
    return { success: false, error: err.message };
  }
}

function startBackgroundSync(db, intervalMs = 10000) {
  // Run immediate initial sync
  syncSupabaseOrders(db).catch(console.warn);
  syncSupabaseCustomers(db).catch(console.warn);
  syncSupabaseProducts(db).catch(console.warn);

  // Set recurring interval
  const timer = setInterval(() => {
    syncSupabaseOrders(db).catch(console.warn);
    syncSupabaseCustomers(db).catch(console.warn);
    syncSupabaseProducts(db).catch(console.warn);
  }, intervalMs);

  if (timer.unref) timer.unref();
  return timer;
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  syncSupabaseOrders,
  invalidateOrderSyncCache,
  syncSupabaseCustomers,
  syncSupabaseProducts,
  invalidateProductSyncCache,
  fetchCloudOrderPayments,
  pushOrderPaymentStatusToCloud,
  pushProductToCloud,
  deleteProductFromCloud,
  clearAllProductsFromCloud,
  removeProductFromCloudTombstone,
  fetchCloudProductTombstones,
  pushDeletedProductToCloudTombstone,
  pushOrderToSupabase,
  pushCustomerToSupabase,
  pushPrescriptionToSupabase,
  deleteOrderFromSupabase,
  deleteAllOrdersFromSupabase,
  pushDeletedOrderToCloudTombstone,
  pushAllDeletedOrdersToCloudTombstone,
  deleteCustomerFromSupabase,
  deleteAllCustomersFromSupabase,
  pushPrintJobToCloudQueue,
  startBackgroundSync,
  syncSingleOrderFromCloud,
  processSingleCloudOrder
};
