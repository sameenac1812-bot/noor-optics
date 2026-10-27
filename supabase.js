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
    // You can paste your Supabase credentials here or use localStorage
    url: window.NOOR_SUPABASE_URL || "",
    anonKey: window.NOOR_SUPABASE_KEY || ""
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

  // ── 4. Cloud Order Submission ──────────────────────────────────────────────
  async function submitOrderToSupabase(orderData) {
    if (!supabaseClient) {
      console.log('📦 Local order recorded (Supabase cloud not connected):', orderData.order_ref);
      return { success: true, localOnly: true, data: orderData };
    }

    try {
      const { data, error } = await supabaseClient
        .from('orders')
        .insert([{
          order_ref: orderData.order_ref,
          customer_name: orderData.customer_name,
          customer_email: orderData.customer_email,
          customer_phone: orderData.customer_phone,
          delivery_address: orderData.delivery_address,
          city: orderData.city,
          pin_code: orderData.pin_code,
          items: orderData.items,
          prescription_pref: orderData.prescription_pref,
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
      const { data, error } = await supabaseClient
        .from('newsletter_subscribers')
        .insert([{ email: email.trim().toLowerCase() }])
        .select();

      if (error) {
        // If already subscribed
        if (error.code === '23505') {
          return { success: true, message: 'You are already subscribed to Noor Journal.' };
        }
        return { success: false, error: error.message };
      }

      return { success: true, cloud: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ── 6. Fetch Catalog from Cloud (Optional Sync) ───────────────────────────
  async function fetchCatalogFromSupabase() {
    if (!supabaseClient) return null;

    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) {
        return null;
      }

      return data.map(item => ({
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
    } catch (err) {
      console.warn('Could not fetch catalog from Supabase, using local catalog:', err.message);
      return null;
    }
  }

  // ── 7. Export Public Interface ─────────────────────────────────────────────
  window.NoorSupabase = {
    isConfigured: () => Boolean(supabaseClient),
    getClient: () => supabaseClient,
    init: initSupabase,
    setCredentials: setSupabaseCredentials,
    submitOrder: submitOrderToSupabase,
    subscribeNewsletter: subscribeNewsletterToSupabase,
    fetchCatalog: fetchCatalogFromSupabase
  };

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabase);
  } else {
    initSupabase();
  }
})();
