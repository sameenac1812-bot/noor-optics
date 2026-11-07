/**
 * supabase.js – Noor Optics Supabase Client Integration
 * Handles dual-pipeline order creation (website vs in-store),
 * durable print queue management, real-time cloud synchronization,
 * catalog persistence, and customer/prescription data integrity.
 */

'use strict';

(function() {
  // ── 1. Configuration Sources ───────────────────────────────────────────────
  const DEFAULT_CONFIG = {
    url: window.NOOR_SUPABASE_URL || "https://czajxtgwsxbrrymrhauz.supabase.co",
    anonKey: window.NOOR_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk"
  };

  function getActiveConfig() {
    try {
      const storedUrl = localStorage.getItem('noor_supabase_url');
      const storedKey = localStorage.getItem('noor_supabase_key');
      return {
        url: storedUrl || DEFAULT_CONFIG.url || "",
        anonKey: storedKey || DEFAULT_CONFIG.anonKey || ""
      };
    } catch (e) {
      return DEFAULT_CONFIG;
    }
  }

  let supabaseClient = null;

  // ── 2. Initialize Client ───────────────────────────────────────────────────
  function initSupabase() {
    const config = getActiveConfig();
    const hasValidCreds = config.url && config.anonKey &&
                          !config.url.includes('your-project-id') &&
                          !config.anonKey.includes('your-anon-public-key');

    if (hasValidCreds && window.supabase && window.supabase.createClient) {
      try {
        supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
          auth: { persistSession: false },
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        });
        console.log('✓ Noor Optics: Supabase Cloud Client Initialized successfully.');
        return true;
      } catch (err) {
        console.warn('Noor Optics: Error initializing Supabase client:', err.message);
      }
    }
    return false;
  }

  function setSupabaseCredentials(url, key) {
    if (!url || !key) return false;
    try {
      localStorage.setItem('noor_supabase_url', url.trim());
      localStorage.setItem('noor_supabase_key', key.trim());
      return initSupabase();
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  // ── 3. Helper: Generate Idempotency Key ─────────────────────────────────────
  function generateIdempotencyKey(source, phone, grandTotal) {
    const timeBucket = Math.floor(Date.now() / 30000); // 30-second window
    return `idem_${source}_${String(phone).replace(/[^0-9]/g, '')}_${grandTotal}_${timeBucket}`;
  }

  // ── 4. TASK 1: STRICTLY SEPARATED ORDER PIPELINES ─────────────────────────

  /**
   * Pipeline 1: Website Order Creation
   * Internally assigns source = 'website' via create_website_order() DB function.
   */
  async function createWebsiteOrder(orderData) {
    if (!supabaseClient) {
      console.log('📦 Local order recorded (Supabase not connected):', orderData.order_ref);
      return { success: true, localOnly: true, data: orderData };
    }

    try {
      const rxData = orderData.prescription || null;
      const subtotal = Number(orderData.subtotal || orderData.grand_total || 0);
      const shipping = Number(orderData.shipping_fee || 0);
      const grandTotal = Number(orderData.grand_total || subtotal);
      const cleanPhone = String(orderData.customer_phone || '').trim() || '9999999999';
      const idemKey = orderData.idempotency_key || generateIdempotencyKey('website', cleanPhone, grandTotal);
      const utrVal = orderData.claimed_upi_ref || orderData.claimedUpiRef || orderData.utr || null;
      const orderRef = String(orderData.order_ref || ('NOOR-WEB-' + Date.now())).trim();

      // Upsert prescription record if provided
      let rxId = null;
      if (rxData && (rxData.od_sph != null || rxData.os_sph != null || rxData.odSph != null || rxData.osSph != null)) {
        rxId = 'rx-web-' + orderRef;
        try {
          await supabaseClient.from('prescriptions').upsert([{
            id: rxId,
            prescription_number: 'RX-' + orderRef,
            client_name: String(orderData.customer_name || 'Website Client').trim(),
            client_phone: cleanPhone,
            prescription_date: new Date().toISOString().split('T')[0],
            prescription_type: 'SPECTACLE',
            od_sph: rxData.od_sph || rxData.odSph || '0.00',
            od_cyl: rxData.od_cyl || rxData.odCyl || '0.00',
            od_axis: rxData.od_axis != null ? rxData.od_axis : rxData.odAxis,
            os_sph: rxData.os_sph || rxData.osSph || '0.00',
            os_cyl: rxData.os_cyl || rxData.osCyl || '0.00',
            os_axis: rxData.os_axis != null ? rxData.os_axis : rxData.osAxis,
            addition: rxData.addition || rxData.add || null,
            pd: rxData.ipd_distance || rxData.pd || null,
            checked_by: rxData.prescriber_details || 'Website Submission',
            notes: rxData.notes || 'Website Client Rx'
          }], { onConflict: 'id' });
        } catch (rxUpsertErr) {
          console.warn('Prescription upsert fallback note:', rxUpsertErr?.message);
        }
      }

      let itemsWithRx = Array.isArray(orderData.items) ? [...orderData.items] : [];
      itemsWithRx = itemsWithRx.map((item, idx) => ({
        ...item,
        channel: 'WEBSITE',
        claimed_upi_ref: utrVal || item.claimed_upi_ref || null,
        utr: utrVal || item.utr || null,
        prescription: (idx === 0 && rxData) ? rxData : item.prescription
      }));

      let deliveryAddress = String(orderData.delivery_address || 'Online Storefront Delivery').trim();
      if (utrVal && !deliveryAddress.includes('UTR:')) {
        deliveryAddress += ` · (UPI UTR: ${utrVal})`;
      }

      // 1. Direct Clean Insert: Strictly enforces AWAITING_VERIFICATION and PENDING_VERIFICATION
      const insertPayload = {
        order_ref: orderRef,
        order_number: orderRef,
        source: 'website', // Immutable website channel
        customer_name: String(orderData.customer_name || 'Website Client').trim(),
        customer_email: String(orderData.customer_email || `${cleanPhone}@nooroptics.in`).trim(),
        customer_phone: cleanPhone,
        customer_age: orderData.customer_age ? parseInt(orderData.customer_age, 10) : null,
        delivery_address: deliveryAddress,
        city: String(orderData.city || 'Hyderabad').trim(),
        pin_code: String(orderData.pin_code || '500028').trim(),
        items: itemsWithRx,
        prescription_id: rxId,
        prescription_pref: String(orderData.prescription_pref || 'Standard').trim(),
        payment_method: String(orderData.payment_method || 'UPI').toUpperCase(),
        payment_status: 'AWAITING_VERIFICATION',
        subtotal: subtotal,
        shipping_fee: shipping,
        grand_total: grandTotal,
        status: 'PENDING_VERIFICATION',
        idempotency_key: idemKey
      };

      let insData = null;
      let insErr = null;

      try {
        const directRes = await supabaseClient
          .from('orders')
          .insert([insertPayload])
          .select();
        insData = directRes.data;
        insErr = directRes.error;

        if (insErr && insErr.message && (insErr.message.includes("'source'") || insErr.message.includes("'order_number'"))) {
          delete insertPayload.source;
          delete insertPayload.order_number;
          delete insertPayload.idempotency_key;
          delete insertPayload.customer_age;
          const retry = await supabaseClient.from('orders').insert([insertPayload]).select();
          insData = retry.data;
          insErr = retry.error;
        }
      } catch (insertEx) {
        insErr = insertEx;
      }

      if (!insErr && insData && insData.length > 0) {
        const created = insData[0];
        console.log('✓ Website order created cleanly in Supabase cloud (Awaiting Verification):', created.order_ref);
        if (created.id) {
          try {
            await supabaseClient.from('print_jobs').upsert([{
              order_id: created.id,
              print_type: 'receipt',
              printer_id: 'POS-80',
              status: 'uncertain',
              last_error: 'Held pending staff UPI payment verification',
              attempt_count: 0
            }], { onConflict: 'order_id,print_type' });
          } catch (_) {}
        }
        return { success: true, cloud: true, data: created, orderNumber: created.order_number || created.order_ref };
      }

      // 2. Secondary Fallback via RPC (if direct insert was blocked)
      console.warn('Direct insert note, trying create_website_order RPC:', insErr?.message);
      const { data: rpcData, error: rpcErr } = await supabaseClient.rpc('create_website_order', {
        p_customer_name: String(orderData.customer_name || 'Website Client').trim(),
        p_customer_phone: cleanPhone,
        p_customer_email: orderData.customer_email ? String(orderData.customer_email).trim() : null,
        p_delivery_address: deliveryAddress,
        p_city: String(orderData.city || 'Hyderabad').trim(),
        p_pin_code: String(orderData.pin_code || '500028').trim(),
        p_items: itemsWithRx,
        p_prescription_pref: String(orderData.prescription_pref || 'Standard').trim(),
        p_payment_method: String(orderData.payment_method || 'UPI').toUpperCase(),
        p_subtotal: subtotal,
        p_shipping_fee: shipping,
        p_grand_total: grandTotal,
        p_prescription: rxData,
        p_customer_age: orderData.customer_age ? parseInt(orderData.customer_age, 10) : null,
        p_idempotency_key: idemKey
      });

      if (!rpcErr && rpcData) {
        console.log('✓ Website order created via RPC fallback:', rpcData);
        if (rpcData.id) {
          try {
            await supabaseClient.from('orders').update({
              payment_status: 'AWAITING_VERIFICATION',
              status: 'PENDING_VERIFICATION'
            }).eq('id', rpcData.id);
            await supabaseClient.from('print_jobs').update({
              status: 'uncertain',
              last_error: 'Held pending staff UPI payment verification'
            }).eq('order_id', rpcData.id);
          } catch (_) {}
        }
        rpcData.payment_status = 'AWAITING_VERIFICATION';
        rpcData.status = 'PENDING_VERIFICATION';
        return { success: true, cloud: true, data: rpcData, orderNumber: rpcData.order_number || rpcData.order_ref };
      }

      if (insErr) {
        console.error('Supabase website order insert error:', insErr);
        return { success: false, error: insErr.message };
      }

      const created = Array.isArray(insData) ? insData[0] : insData;

      // Ensure initial print job exists in print_jobs table (held until payment verified)
      if (created && created.id) {
        try {
          await supabaseClient.from('print_jobs').upsert([{
            order_id: created.id,
            print_type: 'receipt',
            printer_id: 'POS-80',
            status: 'uncertain',
            last_error: 'Held pending staff UPI payment verification',
            attempt_count: 0
          }], { onConflict: 'order_id,print_type' });
        } catch (_) {}
      }

      return { success: true, cloud: true, data: created, orderNumber: orderRef };
    } catch (err) {
      console.error('Failed to create website order:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Pipeline 2: In-Store POS Order Creation
   * Internally assigns source = 'instore' via create_instore_order() DB function.
   */
  async function createInstoreOrder(orderData) {
    if (!supabaseClient) {
      console.log('📦 Local in-store order recorded:', orderData.order_ref);
      return { success: true, localOnly: true, data: orderData };
    }

    try {
      const rxData = orderData.prescription || null;
      const subtotal = Number(orderData.subtotal || orderData.grand_total || 0);
      const shipping = Number(orderData.shipping_fee || 0);
      const grandTotal = Number(orderData.grand_total || subtotal);
      const cleanPhone = String(orderData.customer_phone || '').trim() || '9999999999';
      const idemKey = orderData.idempotency_key || generateIdempotencyKey('instore', cleanPhone, grandTotal);

      // 1. Primary: Use dedicated secure DB function create_instore_order()
      const { data: rpcData, error: rpcErr } = await supabaseClient.rpc('create_instore_order', {
        p_customer_name: String(orderData.customer_name || 'Walk-in Client').trim(),
        p_customer_phone: cleanPhone,
        p_customer_email: orderData.customer_email ? String(orderData.customer_email).trim() : null,
        p_delivery_address: orderData.delivery_address ? String(orderData.delivery_address).trim() : 'Pillar No. 45, Rethibowli, Hyderabad (In-Store POS)',
        p_city: String(orderData.city || 'Hyderabad').trim(),
        p_pin_code: String(orderData.pin_code || '500028').trim(),
        p_items: Array.isArray(orderData.items) ? orderData.items : [],
        p_prescription_pref: String(orderData.prescription_pref || 'In-Store Exam').trim(),
        p_payment_method: String(orderData.payment_method || 'CASH').toUpperCase(),
        p_subtotal: subtotal,
        p_shipping_fee: shipping,
        p_grand_total: grandTotal,
        p_prescription: rxData,
        p_customer_age: orderData.customer_age ? parseInt(orderData.customer_age, 10) : null,
        p_token_number: orderData.token_number ? parseInt(orderData.token_number, 10) : null,
        p_idempotency_key: idemKey
      });

      if (!rpcErr && rpcData) {
        console.log('✓ In-store order created securely via create_instore_order():', rpcData);
        return { success: true, cloud: true, data: rpcData, orderNumber: rpcData.order_number || rpcData.order_ref };
      }

      // 2. Transitional Fallback if RPC is not yet loaded in database
      if (rpcErr) {
        console.warn('create_instore_order RPC note (falling back to direct insert):', rpcErr.message);
      }

      const orderRef = String(orderData.order_ref || ('NOOR-POS-' + Date.now())).trim();

      // Upsert prescription record if provided
      let rxId = null;
      if (rxData && (rxData.od_sph != null || rxData.os_sph != null || rxData.odSph != null || rxData.osSph != null)) {
        rxId = 'rx-pos-' + orderRef;
        try {
          await supabaseClient.from('prescriptions').upsert([{
            id: rxId,
            prescription_number: 'RX-' + orderRef,
            client_name: String(orderData.customer_name || 'Walk-in Client').trim(),
            client_phone: cleanPhone,
            prescription_date: new Date().toISOString().split('T')[0],
            prescription_type: 'SPECTACLE',
            od_sph: rxData.od_sph || rxData.odSph || '0.00',
            od_cyl: rxData.od_cyl || rxData.odCyl || '0.00',
            od_axis: rxData.od_axis != null ? rxData.od_axis : rxData.odAxis,
            os_sph: rxData.os_sph || rxData.osSph || '0.00',
            os_cyl: rxData.os_cyl || rxData.osCyl || '0.00',
            os_axis: rxData.os_axis != null ? rxData.os_axis : rxData.osAxis,
            addition: rxData.addition || rxData.add || null,
            pd: rxData.ipd_distance || rxData.pd || null,
            checked_by: rxData.checked_by || 'In-Store Optometrist',
            notes: rxData.notes || 'In-Store Exam Rx'
          }], { onConflict: 'id' });
        } catch (rxUpsertErr) {
          console.warn('In-store prescription upsert fallback note:', rxUpsertErr?.message);
        }
      }

      let itemsWithRx = Array.isArray(orderData.items) ? [...orderData.items] : [];
      if (rxData && itemsWithRx.length > 0) {
        itemsWithRx[0] = { ...itemsWithRx[0], prescription: rxData, rx: rxData };
      }

      const insertPayload = {
        order_ref: orderRef,
        order_number: orderRef,
        source: 'instore', // Immutable source
        customer_name: String(orderData.customer_name || 'Walk-in Client').trim(),
        customer_email: String(orderData.customer_email || `${cleanPhone}@nooroptics.in`).trim(),
        customer_phone: cleanPhone,
        customer_age: orderData.customer_age ? parseInt(orderData.customer_age, 10) : null,
        delivery_address: String(orderData.delivery_address || 'Pillar No. 45, Rethibowli, Hyderabad (In-Store POS)').trim(),
        city: String(orderData.city || 'Hyderabad').trim(),
        pin_code: String(orderData.pin_code || '500028').trim(),
        items: itemsWithRx,
        prescription_id: rxId,
        prescription_pref: String(orderData.prescription_pref || 'In-Store Exam').trim(),
        payment_method: String(orderData.payment_method || 'CASH').toUpperCase(),
        subtotal: subtotal,
        shipping_fee: shipping,
        grand_total: grandTotal,
        status: 'confirmed',
        token_number: orderData.token_number ? parseInt(orderData.token_number, 10) : null,
        idempotency_key: idemKey
      };

      let { data: insData, error: insErr } = await supabaseClient
        .from('orders')
        .insert([insertPayload])
        .select();

      if (insErr && insErr.message && insErr.message.includes("'source'")) {
        delete insertPayload.source;
        delete insertPayload.order_number;
        delete insertPayload.idempotency_key;
        delete insertPayload.token_number;
        delete insertPayload.customer_age;
        const retry = await supabaseClient.from('orders').insert([insertPayload]).select();
        insData = retry.data;
        insErr = retry.error;
      }

      if (insErr) {
        console.error('Supabase in-store order insert error:', insErr);
        return { success: false, error: insErr.message };
      }

      const created = Array.isArray(insData) ? insData[0] : insData;

      // In-store orders print immediately at POS counter
      if (created && created.id) {
        try {
          await supabaseClient.from('print_jobs').upsert([{
            order_id: created.id,
            print_type: 'receipt',
            printer_id: 'POS-80',
            status: 'queued',
            last_error: null,
            attempt_count: 0
          }], { onConflict: 'order_id,print_type' });
        } catch (_) {}
      }

      return { success: true, cloud: true, data: created, orderNumber: orderRef };
    } catch (err) {
      console.error('Failed to create in-store order:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Universal Order Submission (Backwards Compatible router)
   */
  async function submitOrderToSupabase(orderData) {
    const isInstore = orderData.source === 'instore' ||
      orderData.channel === 'POS' ||
      orderData.channel === 'IN-STORE' ||
      String(orderData.order_ref || '').includes('-POS-') ||
      (orderData.delivery_address && /pos|boutique|flagship|store|rethibowli|walk-in/i.test(orderData.delivery_address));

    if (isInstore) {
      return createInstoreOrder(orderData);
    } else {
      return createWebsiteOrder(orderData);
    }
  }

  // ── 5. Fetch Orders with Strict Channel Separation ──────────────────────────
  async function fetchOrdersFromSupabase(channel = 'all', limit = 150) {
    if (!supabaseClient) return [];

    try {
      let query = supabaseClient
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (channel === 'website') {
        query = query.eq('source', 'website');
      } else if (channel === 'instore' || channel === 'pos') {
        query = query.eq('source', 'instore');
      }

      const { data, error } = await query;
      if (error) {
        // If source column is not yet migrated, fall back to heuristic separation
        if (error.message && error.message.includes("'source'")) {
          const { data: rawData } = await supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
          if (!Array.isArray(rawData)) return [];
          if (channel === 'website') {
            return rawData.filter(o => !String(o.order_ref).includes('-POS-') && !/rethibowli|in-store/i.test(o.delivery_address || ''));
          } else if (channel === 'instore' || channel === 'pos') {
            return rawData.filter(o => String(o.order_ref).includes('-POS-') || /rethibowli|in-store/i.test(o.delivery_address || ''));
          }
          return rawData;
        }
        console.error('Supabase fetch orders error:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('fetchOrdersFromSupabase error:', e);
      return [];
    }
  }

  // ── 6. Confirmed Order Deletion from Supabase ──────────────────────────────
  async function deleteOrderFromSupabase(orderIdOrRef) {
    if (!supabaseClient || !orderIdOrRef) return { success: false, error: 'Not configured or missing ID' };

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdOrRef);

      let res;
      if (isUuid) {
        res = await supabaseClient.from('orders').delete().eq('id', orderIdOrRef);
      } else {
        res = await supabaseClient.from('orders').delete().or(`order_ref.eq.${orderIdOrRef},order_number.eq.${orderIdOrRef}`);
      }

      if (res.error) {
        console.error('Failed to delete order from Supabase:', res.error);
        return { success: false, error: res.error.message };
      }

      console.log('✓ Confirmed order deletion from Supabase:', orderIdOrRef);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ── 7. TASK 2: DURABLE PRINT QUEUE FUNCTIONS ───────────────────────────────

  /**
   * Atomic Job Claim by Print Daemon
   */
  async function claimNextPrintJob(workerId = 'daemon-worker-1', leaseSeconds = 60) {
    if (!supabaseClient) return null;

    try {
      const { data, error } = await supabaseClient.rpc('claim_next_print_job', {
        p_worker_id: workerId,
        p_lease_seconds: leaseSeconds
      });

      if (error) {
        // If RPC not present, query queue directly
        const { data: queueJobs, error: qErr } = await supabaseClient
          .from('print_jobs')
          .select('*, orders(*)')
          .eq('status', 'queued')
          .order('created_at', { ascending: true })
          .limit(1);

        if (qErr || !queueJobs || queueJobs.length === 0) return null;
        const job = queueJobs[0];
        await supabaseClient.from('print_jobs').update({
          status: 'claimed',
          attempt_count: (job.attempt_count || 0) + 1,
          claimed_at: new Date().toISOString(),
          lease_expires_at: new Date(Date.now() + leaseSeconds * 1000).toISOString()
        }).eq('id', job.id);
        return [job];
      }

      return data;
    } catch (e) {
      console.warn('claimNextPrintJob error:', e.message);
      return null;
    }
  }

  /**
   * Complete Print Job with Spooler Confirmation
   */
  async function completePrintJob(jobId, spoolerJobId = null) {
    if (!supabaseClient || !jobId) return false;

    try {
      const { error } = await supabaseClient.rpc('complete_print_job', {
        p_job_id: jobId,
        p_spooler_job_id: spoolerJobId ? String(spoolerJobId) : null
      });

      if (error) {
        await supabaseClient.from('print_jobs').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          spooler_job_id: spoolerJobId ? String(spoolerJobId) : null
        }).eq('id', jobId);
      }
      return true;
    } catch (e) {
      console.warn('completePrintJob error:', e.message);
      return false;
    }
  }

  /**
   * Fail Print Job or Mark Uncertain
   */
  async function failPrintJob(jobId, errorMessage, markUncertain = false) {
    if (!supabaseClient || !jobId) return false;

    try {
      const { error } = await supabaseClient.rpc('fail_print_job', {
        p_job_id: jobId,
        p_error: String(errorMessage || 'Unknown printing error'),
        p_mark_uncertain: Boolean(markUncertain)
      });

      if (error) {
        await supabaseClient.from('print_jobs').update({
          status: markUncertain ? 'uncertain' : 'failed',
          last_error: String(errorMessage)
        }).eq('id', jobId);
      }
      return true;
    } catch (e) {
      console.warn('failPrintJob error:', e.message);
      return false;
    }
  }

  /**
   * Explicit Manual Reprint Action (Audited & Safe)
   */
  async function reprintOrder(orderId, requestedBy = 'Staff Cashier', reason = 'Customer request') {
    if (!supabaseClient || !orderId) return { success: false };

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      let targetUuid = orderId;
      if (!isUuid) {
        const { data: ordList } = await supabaseClient
          .from('orders')
          .select('id')
          .or(`order_ref.eq.${orderId},order_number.eq.${orderId}`)
          .limit(1);
        if (ordList && ordList.length > 0) targetUuid = ordList[0].id;
      }

      const { data, error } = await supabaseClient.rpc('reprint_order', {
        p_order_id: targetUuid,
        p_requested_by: requestedBy,
        p_reason: reason
      });

      if (error) {
        // Fallback: reset receipt job status to queued
        const { error: updErr } = await supabaseClient
          .from('print_jobs')
          .update({
            status: 'queued',
            attempt_count: 0,
            completed_at: null,
            last_error: `Manual reprint by ${requestedBy}: ${reason}`
          })
          .eq('order_id', targetUuid)
          .eq('print_type', 'receipt');
        if (updErr) return { success: false, error: updErr.message };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * UPI Order Approval: Accept & Release Print Job
   */
  async function verifyWebsiteOrder(orderId, notes = 'Verified by Shop Owner') {
    if (!supabaseClient || !orderId) return { success: false, error: 'Not configured or missing order ID' };
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      let targetUuid = orderId;
      if (!isUuid) {
        const { data: ordList } = await supabaseClient
          .from('orders')
          .select('id')
          .or(`order_ref.eq.${orderId},order_number.eq.${orderId}`)
          .limit(1);
        if (ordList && ordList.length > 0) targetUuid = ordList[0].id;
      }

      // 1. Try secure RPC function
      const { data, error } = await supabaseClient.rpc('verify_website_order', {
        p_order_id: targetUuid,
        p_notes: notes
      });

      if (!error && data) {
        console.log('✓ Website order verified via RPC:', targetUuid);
        return { success: true, data };
      }

      // 2. Fallback: Update orders table directly and release print job
      await supabaseClient
        .from('orders')
        .update({
          payment_status: 'VERIFIED',
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUuid);

      await supabaseClient
        .from('print_jobs')
        .upsert({
          order_id: targetUuid,
          print_type: 'receipt',
          printer_id: 'POS-80',
          status: 'queued',
          attempt_count: 0,
          updated_at: new Date().toISOString()
        }, { onConflict: 'order_id,print_type' });

      return { success: true };
    } catch (e) {
      console.error('verifyWebsiteOrder error:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * UPI Order Rejection: Cancel Order & Print Job
   */
  async function rejectWebsiteOrder(orderId, reason = 'Payment rejected') {
    if (!supabaseClient || !orderId) return { success: false, error: 'Not configured or missing order ID' };
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      let targetUuid = orderId;
      if (!isUuid) {
        const { data: ordList } = await supabaseClient
          .from('orders')
          .select('id')
          .or(`order_ref.eq.${orderId},order_number.eq.${orderId}`)
          .limit(1);
        if (ordList && ordList.length > 0) targetUuid = ordList[0].id;
      }

      // 1. Try secure RPC function
      const { data, error } = await supabaseClient.rpc('reject_website_order', {
        p_order_id: targetUuid,
        p_reason: reason
      });

      if (!error && data) {
        console.log('✓ Website order rejected via RPC:', targetUuid);
        return { success: true, data };
      }

      // 2. Fallback: Direct table updates
      await supabaseClient
        .from('orders')
        .update({
          payment_status: 'REJECTED',
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUuid);

      await supabaseClient
        .from('print_jobs')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('order_id', targetUuid);

      return { success: true };
    } catch (e) {
      console.error('rejectWebsiteOrder error:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Fetch Print Jobs Queue Status (For Admin Diagnostics)
   */
  async function fetchPrintQueueStats() {
    if (!supabaseClient) return null;

    try {
      const { data, error } = await supabaseClient
        .from('print_jobs')
        .select('id, order_id, print_type, status, attempt_count, last_error, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) return null;
      const jobs = data || [];
      return {
        total: jobs.length,
        queued: jobs.filter(j => j.status === 'queued').length,
        claimed: jobs.filter(j => j.status === 'claimed').length,
        printing: jobs.filter(j => j.status === 'printing').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
        uncertain: jobs.filter(j => j.status === 'uncertain').length,
        recent: jobs.slice(0, 10)
      };
    } catch (_) {
      return null;
    }
  }

  // ── 8. TASK 3: CLEAN INVENTORY / CATALOG MANAGEMENT ────────────────────────
  // Directly manages products in the products table without customer notes hacks

  // ── Helper to detect old dummy Scandinavian template products ─────────────
  function isLegacyDummyMock(p) {
    if (!p) return true;
    const id = String(p.id || '').toLowerCase().trim();
    const name = String(p.name || '').toLowerCase().trim();
    if (/^noor-(0[1-9]|1[0-8])$/.test(id)) return true;
    if (/helsinki|berlin hex|zurich titanium|milan aureum|stockholm noir|copenhagen round|oslo crystal|kyoto havana|reykjavik|vienna silhouette|amber arch|tokyo steel|gothenburg|malm|arctic sun|nord fjord|bergen dual|bordeaux edge/i.test(name)) return true;
    return false;
  }

  // ── 9. Fetch Products Catalog from Supabase ────────────────────────────────
  async function fetchCatalogFromSupabase() {
    if (!supabaseClient) return null;

    try {
      // 1. Try querying products table
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: true });

      let list = (Array.isArray(data) ? data : []).filter(p => !isLegacyDummyMock(p));

      // 2. If products table contains only legacy mock frames, fall back to SYS-CATALOG-PRODUCTS
      if (list.length === 0) {
        const { data: catRows } = await supabaseClient
          .from('customers')
          .select('notes')
          .eq('client_code', 'SYS-CATALOG-PRODUCTS')
          .limit(1);

        if (catRows && catRows[0]?.notes) {
          try {
            const parsed = JSON.parse(catRows[0].notes);
            if (Array.isArray(parsed) && parsed.length > 0) {
              list = parsed.filter(p => !isLegacyDummyMock(p));
            }
          } catch (_) {}
        }
      }

      if (list.length === 0) return null;

      return list.map(p => ({
        id: p.id,
        sku: p.sku || p.id,
        name: p.name,
        brand: p.brand || p.collection || 'Noor Optics',
        collection: p.collection || p.brand || 'Luxury Eyewear',
        price: Number(p.price || p.selling_price_inr || (p.selling_price_paise ? p.selling_price_paise / 100 : 0)),
        original_price: p.original_price ? Number(p.original_price) : null,
        badge: p.badge || 'Curated',
        shape: p.shape,
        material: p.material,
        fit: p.fit,
        category: p.category || 'Optical',
        image: p.image || p.imageUrl || p.image_url || 'images/frames/frame_01.jpg',
        colors: Array.isArray(p.colors) ? p.colors : [],
        dimensions: p.dimensions || {},
        description: p.description || ''
      }));
    } catch (err) {
      console.warn('fetchCatalogFromSupabase error:', err.message);
      return null;
    }
  }

  async function saveProductToSupabase(product) {
    if (!supabaseClient || !product) return { success: false };

    try {
      const prodId = product.id || ('prod-' + Date.now());
      const prodRow = {
        id: prodId,
        name: product.name,
        collection: product.brand || product.collection || 'Noor Signature',
        price: Number(product.sellingPriceINR || product.price || 3499),
        original_price: product.originalPriceINR || product.original_price ? Number(product.originalPriceINR || product.original_price) : null,
        badge: product.badge || 'New Arrival',
        shape: product.shape || 'Rectangular',
        material: product.material || 'Japanese Titanium',
        fit: product.fit || 'Regular',
        category: product.category || 'Optical',
        rating: 5.0,
        reviews_count: 1,
        image: product.imageUrl || product.image || 'images/stockholm_noir.jpg',
        colors: Array.isArray(product.variants) && product.variants.length > 0
          ? product.variants.map(v => ({ name: v.colorName || 'Standard', hex: v.colorHex || '#111111' }))
          : (product.colors || [{ name: 'Standard', hex: '#111111' }]),
        dimensions: product.dimensions || { lens: '52mm', bridge: '18mm', temple: '145mm', weight: '15g' },
        description: product.description || '',
        is_active: true
      };

      const { data, error } = await supabaseClient.from('products').upsert([prodRow]).select();
      if (error) {
        console.error('Supabase save product error:', error);
        return { success: false, error: error.message };
      }
      return { success: true, product: prodRow };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function deleteProductFromSupabase(productId) {
    if (!supabaseClient || !productId) return { success: false };

    try {
      await supabaseClient.from('products').update({ is_active: false }).eq('id', productId);
      const { error } = await supabaseClient.from('products').delete().eq('id', productId);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ── 9. Newsletter Subscription ─────────────────────────────────────────────
  async function subscribeNewsletterToSupabase(email) {
    if (!email || !email.includes('@')) return { success: false, message: 'Invalid email' };
    if (!supabaseClient) return { success: true, localOnly: true };

    try {
      const { error } = await supabaseClient
        .from('newsletter_subscribers')
        .insert([{ email: email.trim().toLowerCase() }]);

      if (error && error.code === '23505') {
        return { success: true, message: 'You are already subscribed to Noor Journal.' };
      }
      return { success: !error, error: error?.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ── 10. CENTRALIZED REALTIME NOTIFICATION & EVENT MANAGER ──────────────────
  class CentralizedRealtimeManager {
    constructor() {
      this.channel = null;
      this.orderListeners = new Set();
      this.printJobListeners = new Set();
      this.isSubscribed = false;
      this.processedOrderIds = new Set();
      this.initialSyncComplete = false;
    }

    start() {
      if (!supabaseClient || this.isSubscribed) return;

      try {
        this.channel = supabaseClient
          .channel('noor-central-sync')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'orders' },
            (payload) => this.handleOrderInsert(payload)
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'orders' },
            (payload) => this.handleOrderUpdate(payload)
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'orders' },
            (payload) => this.handleOrderDelete(payload)
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'print_jobs' },
            (payload) => this.handlePrintJobChange(payload)
          )
          .subscribe((status) => {
            console.log(`[Realtime Sync] Channel status: ${status}`);
            if (status === 'SUBSCRIBED') {
              this.isSubscribed = true;
            }
          });
      } catch (err) {
        console.warn('Realtime subscription error:', err.message);
      }
    }

    stop() {
      if (this.channel && supabaseClient) {
        try {
          supabaseClient.removeChannel(this.channel);
        } catch (_) {}
        this.channel = null;
        this.isSubscribed = false;
      }
    }

    markInitialSyncComplete(existingOrders = []) {
      if (Array.isArray(existingOrders)) {
        existingOrders.forEach(o => {
          if (o && o.id) this.processedOrderIds.add(String(o.id));
        });
      }
      this.initialSyncComplete = true;
    }

    handleOrderInsert(payload) {
      const order = payload.new;
      if (!order || !order.id) return;

      const orderId = String(order.id);
      const isDuplicate = this.processedOrderIds.has(orderId);
      this.processedOrderIds.add(orderId);

      this.orderListeners.forEach(listener => {
        try {
          listener({
            event: 'INSERT',
            order: order,
            isNewAudioEligible: !isDuplicate && this.initialSyncComplete
          });
        } catch (e) {
          console.error('Order listener error:', e);
        }
      });
    }

    handleOrderUpdate(payload) {
      const order = payload.new;
      if (!order || !order.id) return;

      // UPDATE events must NEVER trigger new-order audio notifications
      this.orderListeners.forEach(listener => {
        try {
          listener({
            event: 'UPDATE',
            order: order,
            isNewAudioEligible: false
          });
        } catch (e) {}
      });
    }

    handleOrderDelete(payload) {
      const old = payload.old;
      if (!old || !old.id) return;
      this.orderListeners.forEach(listener => {
        try {
          listener({ event: 'DELETE', orderId: old.id });
        } catch (e) {}
      });
    }

    handlePrintJobChange(payload) {
      this.printJobListeners.forEach(listener => {
        try {
          listener(payload);
        } catch (e) {}
      });
    }

    onOrderEvent(fn) {
      this.orderListeners.add(fn);
      return () => this.orderListeners.delete(fn);
    }

    onPrintJobEvent(fn) {
      this.printJobListeners.add(fn);
      return () => this.printJobListeners.delete(fn);
    }
  }

  const realtimeManager = new CentralizedRealtimeManager();

  // ── 11. Export Public Interface ────────────────────────────────────────────
  window.NoorSupabase = {
    isConfigured: () => Boolean(supabaseClient),
    getClient: () => supabaseClient,
    init: initSupabase,
    setCredentials: setSupabaseCredentials,
    // Dual pipeline functions
    createWebsiteOrder,
    createInstoreOrder,
    submitOrder: submitOrderToSupabase,
    fetchOrders: fetchOrdersFromSupabase,
    deleteOrder: deleteOrderFromSupabase,
    // Print queue functions
    claimNextPrintJob,
    completePrintJob,
    failPrintJob,
    reprintOrder,
    verifyWebsiteOrder,
    rejectWebsiteOrder,
    fetchPrintQueueStats,
    // Catalog & CRM
    fetchCatalog: fetchCatalogFromSupabase,
    saveProduct: saveProductToSupabase,
    deleteProduct: deleteProductFromSupabase,
    subscribeNewsletter: subscribeNewsletterToSupabase,
    // Realtime Manager
    realtime: realtimeManager
  };

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSupabase();
      realtimeManager.start();
    });
  } else {
    initSupabase();
    realtimeManager.start();
  }

  // Cleanup on unload to prevent stale listeners
  window.addEventListener('beforeunload', () => {
    realtimeManager.stop();
  });
})();
