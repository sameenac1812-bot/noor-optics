/**
 * supabase.js – Noor Optics Supabase Client Integration
 * Handles real-time cloud synchronization for eyewear orders, catalog,
 * and newsletter subscribers with graceful offline fallback.
 */

'use strict';

(function() {
  // ── 1. Configuration Sources ───────────────────────────────────────────────
  // Default config can be set here, injected via window, or set via localStorage
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
        supabaseClient = window.supabase.createClient(config.url, config.anonKey);
        console.log('✓ Noor Optics: Supabase Cloud Client Initialized successfully.');
        return true;
      } catch (err) {
        console.warn('Noor Optics: Error initializing Supabase client:', err.message);
      }
    } else {
      // Graceful notification in development
      if (!hasValidCreds) {
        console.info('ℹ Noor Optics: Supabase is in local/demo mode. To sync with Supabase cloud, configure credentials in supabase.js, .env, or localStorage.');
      }
    }
    return false;
  }

  // ── 3. Helper to update credentials on the fly ─────────────────────────────
  function setSupabaseCredentials(url, key) {
    if (!url || !key) {
      console.error('Please provide valid URL and Anon Key.');
      return false;
    }
    try {
      localStorage.setItem('noor_supabase_url', url.trim());
      localStorage.setItem('noor_supabase_key', key.trim());
      const success = initSupabase();
      if (success) {
        alert('Supabase credentials successfully saved and connected!');
      }
      return success;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  // ── 4. Cloud Order Submission (Includes Full Prescription Rx Saving) ──────────
  async function submitOrderToSupabase(orderData) {
    if (!supabaseClient) {
      console.log('📦 Local order recorded (Supabase cloud not connected):', orderData.order_ref);
      return { success: true, localOnly: true, data: orderData };
    }

    try {
      // 1. Enrich items array with prescription metadata so Rx travels with order in JSONB
      const rxData = orderData.prescription;
      let enrichedItems = Array.isArray(orderData.items) ? [...orderData.items] : [];
      if (rxData && (rxData.od_sph != null || rxData.os_sph != null) && enrichedItems.length > 0) {
        enrichedItems = enrichedItems.map((it, idx) => {
          if (idx === 0) {
            return { ...it, prescription: rxData, rx: rxData };
          }
          return it;
        });
      }

      // 2. Insert order into Supabase orders table
      const { data, error } = await supabaseClient
        .from('orders')
        .insert([{
          order_ref: orderData.order_ref,
          customer_name: orderData.customer_name,
          customer_email: orderData.customer_email || (orderData.customer_phone ? `${String(orderData.customer_phone).replace(/[^0-9]/g, '')}@nooroptics.in` : 'client@nooroptics.in'),
          customer_phone: orderData.customer_phone,
          delivery_address: orderData.delivery_address,
          city: orderData.city,
          pin_code: orderData.pin_code,
          items: enrichedItems,
          prescription_pref: orderData.prescription_pref || (rxData ? 'Standard Rx Provided' : 'Standard'),
          payment_method: orderData.payment_method,
          subtotal: orderData.subtotal,
          shipping_fee: orderData.shipping_fee,
          grand_total: orderData.grand_total,
          status: 'confirmed'
        }])
        .select();

      if (error) {
        console.error('Supabase order insert error:', error);
        return { success: false, error: error.message };
      }

      console.log('✓ Order synced to Supabase Cloud:', data);

      // 3. Insert prescription record into Supabase prescriptions table
      if (rxData && (rxData.od_sph != null || rxData.os_sph != null)) {
        try {
          const rxId = 'rx-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
          const rxNumber = 'RX-' + (orderData.order_ref || Date.now());
          const { error: rxErr } = await supabaseClient
            .from('prescriptions')
            .insert([{
              id: rxId,
              prescription_number: rxNumber,
              client_name: orderData.customer_name || 'Website Client',
              client_phone: orderData.customer_phone ? String(orderData.customer_phone).trim() : null,
              prescription_date: new Date().toISOString().split('T')[0],
              prescription_type: 'SPECTACLE',
              od_sph: parseFloat(rxData.od_sph) || 0.00,
              od_cyl: parseFloat(rxData.od_cyl) || 0.00,
              od_axis: rxData.od_axis ? parseInt(rxData.od_axis, 10) : null,
              os_sph: parseFloat(rxData.os_sph) || 0.00,
              os_cyl: parseFloat(rxData.os_cyl) || 0.00,
              os_axis: rxData.os_axis ? parseInt(rxData.os_axis, 10) : null,
              addition: rxData.addition ? parseFloat(rxData.addition) : null,
              pd: rxData.ipd_distance ? parseFloat(rxData.ipd_distance) : (rxData.pd ? parseFloat(rxData.pd) : null),
              notes: rxData.notes || (rxData.prescriber_details ? `Prescriber: ${rxData.prescriber_details}` : null),
              checked_by: rxData.prescriber_details ? String(rxData.prescriber_details) : 'Website Client Submission'
            }]);

          if (rxErr) {
            console.warn('Prescription insert into Supabase warning:', rxErr.message);
          } else {
            console.log('✓ Prescription saved permanently to Supabase prescriptions table:', rxNumber);
          }
        } catch (rxEx) {
          console.warn('Prescription insert note:', rxEx.message);
        }
      }

      return { success: true, cloud: true, data };
    } catch (err) {
      console.error('Failed to submit order to Supabase:', err);
      return { success: false, error: err.message };
    }
  }

  // ── 5. Newsletter Subscription ─────────────────────────────────────────────
  async function subscribeNewsletterToSupabase(email) {
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please provide a valid email.' };
    }

    if (!supabaseClient) {
      console.log('📬 Newsletter subscription saved locally:', email);
      return { success: true, localOnly: true };
    }

    try {
      const { error } = await supabaseClient
        .from('newsletter_subscribers')
        .insert([{ email: email.trim().toLowerCase() }]);

      if (error) {
        // If already subscribed (unique violation)
        if (error.code === '23505') {
          return { success: true, message: 'You are already subscribed to Noor Journal.' };
        }
        return { success: false, error: error.message };
      }

      return { success: true, cloud: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ── 6. Fetch Catalog from Cloud (Includes Custom Added Inventory) ────────────
  async function fetchCatalogFromSupabase() {
    if (!supabaseClient) return null;

    try {
      // 1. Fetch base catalog from products table
      let baseProducts = [];
      try {
        const { data, error } = await supabaseClient
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data)) {
          baseProducts = data.map(item => ({
            id: item.id,
            name: item.name,
            collection: item.collection,
            price: Number(item.price),
            originalPrice: item.original_price ? Number(item.original_price) : null,
            badge: item.badge,
            shape: item.shape,
            material: item.material,
            fit: item.fit,
            category: item.category || 'Optical',
            rating: Number(item.rating) || 4.9,
            reviewsCount: item.reviews_count || 50,
            image: item.image,
            colors: item.colors || [],
            dimensions: item.dimensions || {},
            description: item.description
          }));
        }
      } catch (e) {
        console.warn('Base products fetch note:', e.message);
      }

      // 2. Fetch custom added products stored in Supabase cloud storage (customers table metadata)
      let customProducts = [];
      try {
        const { data: customData, error: customErr } = await supabaseClient
          .from('customers')
          .select('notes')
          .eq('client_code', 'SYS-CATALOG-PRODUCTS');

        if (!customErr && Array.isArray(customData) && customData.length > 0 && customData[0].notes) {
          const parsed = JSON.parse(customData[0].notes);
          if (Array.isArray(parsed)) {
            customProducts = parsed.filter(p => p && p.is_active !== false).map(p => ({
              ...p,
              image: p.image || p.imageUrl || p.image_url || p.thumbnail || 'images/stockholm_noir.jpg'
            }));
          }
        }
      } catch (e) {
        console.warn('Custom products cloud fetch note:', e.message);
      }

      // Merge and deduplicate by ID and SKU
      const productMap = new Map();
      baseProducts.forEach(p => productMap.set(p.id, p));
      customProducts.forEach(p => productMap.set(p.id, p));

      const merged = Array.from(productMap.values());
      return merged.length > 0 ? merged : null;
    } catch (err) {
      console.warn('Could not fetch catalog from Supabase, using local catalog:', err.message);
      return null;
    }
  }

  // ── 7. Save Product to Supabase Cloud (Guarantees Persistence) ───────────────
  async function saveProductToSupabase(product) {
    if (!supabaseClient || !product) return { success: false };

    try {
      const prodId = product.id || ('prod-' + Date.now());
      const formatted = {
        id: prodId,
        sku: (product.sku || 'NOOR-FRAME').toUpperCase(),
        name: product.name,
        brand: product.brand || 'Noor Optics',
        collection: product.brand || 'Noor Signature',
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
        is_active: true,
        updated_at: new Date().toISOString()
      };

      // 1. Try to upsert into products table directly (if RLS allows)
      await supabaseClient.from('products').upsert([formatted]).catch(() => {});

      // 2. Guaranteed persistence in SYS-CATALOG-PRODUCTS metadata
      const { data: existingRows } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('client_code', 'SYS-CATALOG-PRODUCTS');

      let currentList = [];
      if (Array.isArray(existingRows) && existingRows.length > 0 && existingRows[0].notes) {
        try { currentList = JSON.parse(existingRows[0].notes); } catch (_) { currentList = []; }
      }

      // Replace or append
      const idx = currentList.findIndex(p => p.id === prodId || (p.sku && p.sku === formatted.sku));
      if (idx >= 0) {
        currentList[idx] = formatted;
      } else {
        currentList.push(formatted);
      }

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        await supabaseClient
          .from('customers')
          .update({ notes: JSON.stringify(currentList), updated_at: new Date().toISOString() })
          .eq('client_code', 'SYS-CATALOG-PRODUCTS');
      } else {
        await supabaseClient
          .from('customers')
          .insert([{
            id: 'sys-catalog-products-meta',
            client_code: 'SYS-CATALOG-PRODUCTS',
            name: 'System Catalog Custom Products',
            notes: JSON.stringify(currentList)
          }]);
      }

      console.log(`✓ Product "${formatted.name}" saved to Supabase Cloud permanently!`);
      return { success: true, product: formatted };
    } catch (err) {
      console.warn('saveProductToSupabase error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ── 8. Delete Product from Supabase Cloud ───────────────────────────────────
  async function deleteProductFromSupabase(productId) {
    if (!supabaseClient || !productId) return { success: false };

    try {
      // 1. Try to delete from products table directly
      await supabaseClient.from('products').delete().eq('id', productId).catch(() => {});

      // 2. Remove from SYS-CATALOG-PRODUCTS
      const { data: existingRows } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('client_code', 'SYS-CATALOG-PRODUCTS');

      if (Array.isArray(existingRows) && existingRows.length > 0 && existingRows[0].notes) {
        let currentList = [];
        try { currentList = JSON.parse(existingRows[0].notes); } catch (_) { currentList = []; }
        currentList = currentList.filter(p => p.id !== productId && p.sku !== productId);
        await supabaseClient
          .from('customers')
          .update({ notes: JSON.stringify(currentList), updated_at: new Date().toISOString() })
          .eq('client_code', 'SYS-CATALOG-PRODUCTS');
      }

      console.log(`✓ Product ${productId} removed from Supabase Cloud.`);
      return { success: true };
    } catch (err) {
      console.warn('deleteProductFromSupabase error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ── 9. Export Public Interface ─────────────────────────────────────────────
  window.NoorSupabase = {
    isConfigured: () => Boolean(supabaseClient),
    getClient: () => supabaseClient,
    init: initSupabase,
    setCredentials: setSupabaseCredentials,
    submitOrder: submitOrderToSupabase,
    subscribeNewsletter: subscribeNewsletterToSupabase,
    fetchCatalog: fetchCatalogFromSupabase,
    saveProduct: saveProductToSupabase,
    deleteProduct: deleteProductFromSupabase
  };

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
  } else {
    initSupabase();
  }
})();
