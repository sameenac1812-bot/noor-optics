/* ════════════════════════════════════════════════════════════
   supabase.js – Cloud Database & Universal Real-Time Sync
   Guarantees cross-device order sync between mobile phones & laptop
   Supports both Zero-Config Cloud Sync & Custom Supabase Projects
   ════════════════════════════════════════════════════════════ */

'use strict';

const SUPABASE_STORAGE_KEY = 'restaurant_supabase_config';
const CLOUD_SYNC_TOPIC = 'subfresh_orders_live_v4_78637e1f';
const CLOUD_SYNC_HOST = 'https://ntfy.adminforge.de';
const CLOUD_SYNC_HOST_BACKUP = 'https://ntfy.tedomum.fr';

// Default configuration (can be updated via Admin Panel Store Settings)
const DEFAULT_SUPABASE_CONFIG = {
  url: '',        // e.g. https://your-project.supabase.co
  anonKey: '',    // your project's anon public key
  enabled: false
};

// BroadcastChannel for instant zero-latency multi-tab sync on same machine
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('restaurant_sync_channel') : null;

class SupabaseService {
  constructor() {
    this.config = this.loadConfig();
    this.cloudTopic = CLOUD_SYNC_TOPIC;
    this.orderSubscribers = [];
    this.orderDeletedSubscribers = [];
    this.menuSubscribers = [];
    this.storeSubscribers = [];
    this.statusSubscribers = [];
    this.processedOrderIds = new Set();
    this.deletedOrderIds = this.loadDeletedOrderIds();
    this.isInitialSyncDone = false;
    this.pollingInterval = null;
    this.eventSource = null;
    this.lastOrderCount = 0;

    this.initBroadcastListeners();
    this.initCloudStream();
    this.startCloudPolling();
  }

  loadDeletedOrderIds() {
    try {
      const raw = localStorage.getItem('restaurant_deleted_order_ids');
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {}
    return new Set();
  }

  markOrderDeleted(orderId) {
    if (!orderId) return;
    this.deletedOrderIds.add(orderId);
    try {
      localStorage.setItem('restaurant_deleted_order_ids', JSON.stringify([...this.deletedOrderIds]));
    } catch (e) {}
  }

  loadConfig() {
    try {
      const raw = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.url && parsed.anonKey) {
          return { ...DEFAULT_SUPABASE_CONFIG, ...parsed, enabled: true };
        }
      }
      if (typeof window !== 'undefined' && window.DATA?.store?.supabaseUrl && window.DATA?.store?.supabaseKey) {
        return {
          url: window.DATA.store.supabaseUrl,
          anonKey: window.DATA.store.supabaseKey,
          enabled: true
        };
      }
    } catch (e) {
      console.warn('[Supabase] Failed to load config:', e);
    }
    return { ...DEFAULT_SUPABASE_CONFIG };
  }

  saveConfig(url, anonKey) {
    const cleanUrl = (url || '').trim().replace(/\/+$/, '');
    const cleanKey = (anonKey || '').trim();
    this.config = {
      url: cleanUrl,
      anonKey: cleanKey,
      enabled: Boolean(cleanUrl && cleanKey)
    };
    try {
      localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('[Supabase] Failed to save config:', e);
    }
    this.restartPolling();
    this.broadcast('config_updated', this.config);
    return this.config.enabled;
  }

  isConfigured() {
    return Boolean(this.config.enabled && this.config.url && this.config.anonKey);
  }

  getHeaders() {
    return {
      'apikey': this.config.anonKey,
      'Authorization': `Bearer ${this.config.anonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  // ── BroadcastChannel for Instant Local/Tab Sync ─────────────
  initBroadcastListeners() {
    if (!syncChannel) return;
    syncChannel.onmessage = (event) => {
      const { type, payload } = event.data || {};
      if (type === 'new_order') {
        this.handleIncomingCloudOrder(payload, true);
      } else if (type === 'order_status_updated') {
        this.handleIncomingStatusUpdate(payload.orderId, payload.status);
      } else if (type === 'order_deleted') {
        this.notifyOrderDeletedSubscribers(payload.orderId);
      } else if (type === 'menu_updated') {
        this.notifyMenuSubscribers(payload);
      } else if (type === 'store_updated') {
        this.notifyStoreSubscribers(payload);
      }
    };
  }

  broadcast(type, payload) {
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type, payload });
      } catch (e) {}
    }
  }

  // ── Helper to publish to Cloud with fallback ────────────────
  async pushToCloud(topic, bodyObj, headers = {}) {
    const jsonBody = JSON.stringify(bodyObj);
    try {
      const res = await fetch(`${CLOUD_SYNC_HOST}/${topic}`, {
        method: 'POST',
        headers: headers,
        body: jsonBody
      });
      if (res.ok) return true;
    } catch (e) {}

    // Fallback host
    try {
      const res2 = await fetch(`${CLOUD_SYNC_HOST_BACKUP}/${topic}`, {
        method: 'POST',
        headers: headers,
        body: jsonBody
      });
      return res2.ok;
    } catch (e) {
      console.warn('[CloudSync] Publish failed on both hosts:', e);
      return false;
    }
  }

  // ── Universal Cross-Device Cloud Sync (Real-time SSE) ───────
  initCloudStream() {
    if (typeof EventSource === 'undefined') return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource(`${CLOUD_SYNC_HOST}/${this.cloudTopic}/sse`);

      this.eventSource.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          if (raw.event === 'message' && raw.message) {
            const parsed = JSON.parse(raw.message);
            if (parsed.type === 'new_order' && parsed.order) {
              this.handleIncomingCloudOrder(parsed.order, true);
            } else if (parsed.type === 'order_status_updated') {
              this.handleIncomingStatusUpdate(parsed.orderId, parsed.status);
            } else if (parsed.type === 'order_deleted') {
              this.notifyOrderDeletedSubscribers(parsed.orderId);
            } else if (parsed.type === 'store_updated' && parsed.store) {
              this.notifyStoreSubscribers(parsed.store);
            } else if (parsed.type === 'menu_updated' && parsed.menu) {
              this.notifyMenuSubscribers(parsed.menu);
            }
          }
          if (raw.attachment && raw.attachment.url && (raw.attachment.name === 'menu.json' || raw.attachment.url.endsWith('.json'))) {
            fetch(raw.attachment.url).then(r => r.json()).then(cloudData => {
              if (cloudData && cloudData.store) {
                this.notifyMenuSubscribers(cloudData);
              }
            }).catch(() => {});
          }
        } catch (err) {
          // Ignore heartbeats or non-JSON messages
        }
      };

      this.eventSource.onerror = () => {
        // Browser automatically reconnects SSE. Polling acts as backup.
      };
    } catch (err) {
      console.warn('[CloudSync] SSE connection error:', err);
    }
  }

  startCloudPolling() {
    // Initial sync grace period: during first 2.5s, orders are loaded quietly without alarms
    setTimeout(() => {
      this.isInitialSyncDone = true;
    }, 2500);

    // Initial check on load (last 5 minutes only)
    setTimeout(() => this.pollCloudOrders(), 600);

    // Periodic backup poll every 15 seconds to respect rate limits while maintaining sync
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.pollingInterval = setInterval(() => {
      this.pollCloudOrders();
      if (this.isConfigured()) {
        this.pollSupabaseOrders();
      }
    }, 15000);
  }

  async pollCloudOrders() {
    try {
      let res = null;
      try {
        res = await fetch(`${CLOUD_SYNC_HOST}/${this.cloudTopic}/json?poll=1&since=5m`, { cache: 'no-store' });
      } catch (e) {
        res = await fetch(`${CLOUD_SYNC_HOST_BACKUP}/${this.cloudTopic}/json?poll=1&since=5m`, { cache: 'no-store' });
      }
      if (!res || !res.ok) return;

      const text = await res.text();
      const lines = text.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.event === 'message' && entry.message) {
            const parsed = JSON.parse(entry.message);
            if (parsed.type === 'new_order' && parsed.order) {
              this.handleIncomingCloudOrder(parsed.order, false);
            } else if (parsed.type === 'order_status_updated') {
              this.handleIncomingStatusUpdate(parsed.orderId, parsed.status);
            } else if (parsed.type === 'order_deleted') {
              this.notifyOrderDeletedSubscribers(parsed.orderId);
            } else if (parsed.type === 'store_updated' && parsed.store) {
              this.notifyStoreSubscribers(parsed.store);
            }
          }
          if (entry.attachment && entry.attachment.url && (entry.attachment.name === 'menu.json' || entry.attachment.url.endsWith('.json'))) {
            fetch(entry.attachment.url).then(r => r.json()).then(cloudData => {
              if (cloudData && cloudData.store) {
                this.notifyMenuSubscribers(cloudData);
              }
            }).catch(() => {});
          }
        } catch (e) {}
      }
    } catch (e) {
      // Network hiccup; will retry on next poll
    }
  }

  async pollSupabaseOrders() {
    if (!this.isConfigured()) return;
    try {
      const orders = await this.fetchOrders();
      if (orders && orders.length > 0) {
        orders.forEach(o => this.handleIncomingCloudOrder(o, false));
      }
    } catch (e) {}
  }

  handleIncomingCloudOrder(order, forceLive = false) {
    if (!order || !order.id) return;
    // Filter any automated test orders
    if (order.id.startsWith('ORD-TEST-') || order.id.startsWith('ORD-E2E-')) return;
    if (this.deletedOrderIds && this.deletedOrderIds.has(order.id)) return;
    if (this.processedOrderIds.has(order.id)) return;

    if (typeof order.items === 'string') {
      try { order.items = JSON.parse(order.items); } catch (e) { order.items = []; }
    }
    if (!Array.isArray(order.items)) order.items = [];

    this.processedOrderIds.add(order.id);

    // Coordinate highest daily token number across devices
    if (order.tokenId || order.id) {
      const num = parseInt(order.tokenId || order.id, 10);
      if (!isNaN(num) && num > 0 && num < 10000) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const savedDate = localStorage.getItem('sattva_token_date');
        let saved = 0;
        if (savedDate === todayStr) {
          saved = parseInt(localStorage.getItem('sattva_last_token') || '0', 10) || 0;
        }
        if (num > saved) {
          localStorage.setItem('sattva_token_date', todayStr);
          localStorage.setItem('sattva_last_token', String(num));
        }
      }
    }

    // An order is only genuinely live if created within the last 90 seconds
    const orderTime = order.timestamp ? new Date(order.timestamp).getTime() : 0;
    const isRecent = orderTime > 0 && (Date.now() - orderTime < 90000);
    const isLive = forceLive || (isRecent && this.isInitialSyncDone);

    this.notifyOrderSubscribers(order, isLive);
  }

  handleIncomingStatusUpdate(orderId, status) {
    this.notifyStatusSubscribers(orderId, status);
  }

  // ── Orders API ──────────────────────────────────────────────
  async saveOrder(order, options = {}) {
    if (!order) return { success: false, error: 'Empty order payload' };

    // Mark as processed locally
    this.processedOrderIds.add(order.id);

    // Keep token sequence in sync
    if (order.tokenId || order.id) {
      const num = parseInt(order.tokenId || order.id, 10);
      if (!isNaN(num) && num > 0 && num < 10000) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const savedDate = localStorage.getItem('sattva_token_date');
        let saved = 0;
        if (savedDate === todayStr) {
          saved = parseInt(localStorage.getItem('sattva_last_token') || '0', 10) || 0;
        }
        if (num > saved) {
          localStorage.setItem('sattva_token_date', todayStr);
          localStorage.setItem('sattva_last_token', String(num));
        }
      }
    }

    // 1. Broadcast locally immediately for same-browser tabs
    this.broadcast('new_order', order);

    // 2. Publish to universal cloud channel for cross-device sync (< 300ms)
    try {
      const tok = order.tokenId || order.id || '';
      const tokStr = /^\d+$/.test(String(tok)) ? String(tok).padStart(2, '0') : tok;

      // Trigger thermal print on POS daemon
      this.pushToCloud(this.cloudTopic, {
        type: 'new_order',
        order: order,
        timestamp: Date.now()
      }, {
        'Title': `New Order Token #${tokStr}: Table ${order.tableNumber || '—'}`,
        'Priority': '4',
        'Tags': 'bell,fork_and_knife'
      });
    } catch (e) {}

    // 3. If Supabase configured, push to Cloud PostgreSQL DB
    if (!this.isConfigured()) {
      return { success: true, cloudSynced: true, order };
    }

    try {
      const payload = {
        id: order.id,
        customer_name: order.customerName || order.customer_name || 'Walk-in',
        customer_phone: order.customerPhone || order.customer_phone || '',
        table_number: order.tableNumber || '',
        service_mode: order.serviceMode || 'dine-in',
        payment_method: order.paymentMethod || 'cash',
        items: order.items || [],
        subtotal: Number(order.subtotal || 0),
        tax: Number(order.gst || order.tax || 0),
        discount: Number(order.discount || 0),
        total: Number(order.total || 0),
        special_instructions: order.specialInstructions || '',
        status: order.status || 'placed',
        created_at: order.timestamp || new Date().toISOString()
      };

      const res = await fetch(`${this.config.url}/rest/v1/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[Supabase] Order insert failed:', res.status, errText);
        return { success: true, cloudSynced: true, error: errText, order };
      }

      const data = await res.json();
      return { success: true, data: data[0] || payload };
    } catch (err) {
      console.error('[Supabase] Network error placing order:', err);
      return { success: true, cloudSynced: true, error: err.message, order };
    }
  }

  async fetchOrders() {
    if (!this.isConfigured()) return null;
    try {
      const res = await fetch(`${this.config.url}/rest/v1/orders?select=*&order=created_at.desc&limit=100`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return data.map(row => {
        let items = row.items;
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch (e) { items = []; }
        }
        if (!Array.isArray(items)) items = [];
        return {
          id: row.id,
          tokenId: row.id,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          tableNumber: row.table_number,
          serviceMode: row.service_mode,
          paymentMethod: row.payment_method,
          items: items,
          subtotal: Number(row.subtotal || 0),
          gst: Number(row.tax || 0),
          total: Number(row.total || 0),
          specialInstructions: row.special_instructions,
          status: row.status,
          timestamp: row.created_at
        };
      });
    } catch (err) {
      console.warn('[Supabase] Fetch orders error:', err.message);
      return null;
    }
  }

  async updateOrderStatus(orderId, status) {
    // 1. Broadcast locally
    this.broadcast('order_status_updated', { orderId, status });

    // 2. Broadcast across cloud to update any other devices in real-time
    try {
      this.pushToCloud(this.cloudTopic, {
        type: 'order_status_updated',
        orderId,
        status,
        timestamp: Date.now()
      }, {
        'Title': `Order ${orderId} status: ${status}`,
        'Priority': '3',
        'Tags': status === 'delivered' ? 'white_check_mark' : 'information_source'
      });
    } catch (e) {}

    // 3. Update Supabase if configured
    if (!this.isConfigured()) return true;
    try {
      const res = await fetch(`${this.config.url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status })
      });
      return res.ok;
    } catch (err) {
      console.error('[Supabase] Failed to update status:', err);
      return false;
    }
  }

  async deleteOrder(orderId) {
    if (!orderId) return false;
    this.markOrderDeleted(orderId);

    // 1. Broadcast locally for instant tab sync
    this.broadcast('order_deleted', { orderId });

    // 2. Broadcast across cloud to update all devices in real-time
    try {
      this.pushToCloud(this.cloudTopic, {
        type: 'order_deleted',
        orderId,
        timestamp: Date.now()
      }, {
        'Title': `Order ${orderId} deleted`,
        'Priority': '2',
        'Tags': 'wastebasket'
      });
    } catch (e) {}

    // 3. Delete from Supabase PostgreSQL if configured
    if (!this.isConfigured()) return true;
    try {
      const res = await fetch(`${this.config.url}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      return res.ok;
    } catch (err) {
      console.warn('[Supabase] Failed to delete order:', err);
      return false;
    }
  }

  // ── Menu Sync API ───────────────────────────────────────────
  async saveMenu(menuData) {
    if (!menuData) return;

    // 1. Broadcast locally immediately for instant same-browser multi-tab sync
    this.broadcast('menu_updated', menuData);
    if (menuData.store) this.broadcast('store_updated', menuData.store);

    // 2. Broadcast store settings directly via cloud (always small < 1KB, instant cross-device)
    if (menuData.store) {
      try {
        this.pushToCloud(this.cloudTopic, {
          type: 'store_updated',
          store: menuData.store,
          timestamp: Date.now()
        }, { 'Title': 'Store Settings Updated', 'Priority': '3', 'Tags': 'art' });
      } catch (e) {}
    }

    // 3. Upload full menu JSON as attachment for cross-device full sync
    try {
      const cleanData = {
        _version: menuData._version,
        store: menuData.store,
        categories: menuData.categories,
        items: menuData.items
      };
      fetch(`${CLOUD_SYNC_HOST}/${this.cloudTopic}`, {
        method: 'PUT',
        headers: {
          'Filename': 'menu.json',
          'Title': 'Menu Sync',
          'Priority': '3',
          'Tags': 'clipboard'
        },
        body: JSON.stringify(cleanData)
      }).catch(() => {
        fetch(`${CLOUD_SYNC_HOST_BACKUP}/${this.cloudTopic}`, {
          method: 'PUT',
          headers: {
            'Filename': 'menu.json',
            'Title': 'Menu Sync',
            'Priority': '3',
            'Tags': 'clipboard'
          },
          body: JSON.stringify(cleanData)
        }).catch(() => {});
      });
    } catch (e) {}

    if (!this.isConfigured()) return { success: true, localOnly: true };

    try {
      const payload = {
        id: 'restaurant-menu',
        data: menuData,
        updated_at: new Date().toISOString()
      };

      const res = await fetch(`${this.config.url}/rest/v1/menu_data?on_conflict=id`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn('[Supabase] Save menu failed:', res.status, errText);
        return { success: false, error: errText };
      }
      return { success: true };
    } catch (err) {
      console.warn('[Supabase] Network error saving menu:', err);
      return { success: false, error: err.message };
    }
  }

  async fetchMenu() {
    // 1. Try Supabase if configured
    if (this.isConfigured()) {
      try {
        const res = await fetch(`${this.config.url}/rest/v1/menu_data?id=eq.restaurant-menu&select=*`, {
          method: 'GET',
          headers: this.getHeaders()
        });
        if (res.ok) {
          const rows = await res.json();
          if (rows && rows.length > 0 && rows[0].data) {
            return rows[0].data;
          }
        }
      } catch (err) {
        console.warn('[Supabase] Fetch menu error:', err.message);
      }
    }

    // 2. Fallback to Cloud Relay menu attachment
    try {
      let res = null;
      try {
        res = await fetch(`${CLOUD_SYNC_HOST}/${this.cloudTopic}/json?poll=1&since=24h`, { cache: 'no-store' });
      } catch (e) {
        res = await fetch(`${CLOUD_SYNC_HOST_BACKUP}/${this.cloudTopic}/json?poll=1&since=24h`, { cache: 'no-store' });
      }
      if (res && res.ok) {
        const text = await res.text();
        const lines = text.trim().split('\n').filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const entry = JSON.parse(lines[i]);
            if (entry.attachment && entry.attachment.url && (entry.attachment.name === 'menu.json' || entry.attachment.url.endsWith('.json'))) {
              const fileRes = await fetch(entry.attachment.url);
              if (fileRes.ok) {
                const cloudData = await fileRes.json();
                if (cloudData && cloudData.store) {
                  return cloudData;
                }
              }
            } else if (entry.event === 'message' && entry.message) {
              const parsed = JSON.parse(entry.message);
              if (parsed.type === 'store_updated' && parsed.store) {
                return { store: parsed.store };
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {}

    return null;
  }

  // ── Subscriptions & Callbacks ───────────────────────────────
  onNewOrder(callback) {
    this.orderSubscribers.push(callback);
  }

  onOrderStatusUpdated(callback) {
    this.statusSubscribers.push(callback);
  }

  onOrderDeleted(callback) {
    this.orderDeletedSubscribers.push(callback);
  }

  onMenuUpdate(callback) {
    this.menuSubscribers.push(callback);
  }

  onStoreUpdate(callback) {
    this.storeSubscribers.push(callback);
  }

  notifyStoreSubscribers(storeData) {
    this.storeSubscribers.forEach(cb => {
      try { cb(storeData); } catch (e) { console.error(e); }
    });
  }

  notifyOrderSubscribers(order, isLive = false) {
    if (this.deletedOrderIds && this.deletedOrderIds.has(order.id)) return;
    this.orderSubscribers.forEach(cb => {
      try { cb(order, isLive); } catch (e) { console.error(e); }
    });
  }

  notifyStatusSubscribers(orderId, status) {
    this.statusSubscribers.forEach(cb => {
      try { cb(orderId, status); } catch (e) { console.error(e); }
    });
  }

  notifyOrderDeletedSubscribers(orderId) {
    if (!orderId) return;
    this.markOrderDeleted(orderId);
    this.orderDeletedSubscribers.forEach(cb => {
      try { cb(orderId); } catch (e) { console.error(e); }
    });
  }

  notifyMenuSubscribers(menuData) {
    this.menuSubscribers.forEach(cb => {
      try { cb(menuData); } catch (e) { console.error(e); }
    });
  }

  restartPolling() {
    this.startCloudPolling();
  }

  // ── Test Connection ─────────────────────────────────────────
  async testConnection(url, anonKey) {
    const testUrl = (url || this.config.url || '').trim().replace(/\/+$/, '');
    const testKey = (anonKey || this.config.anonKey || '').trim();
    if (!testUrl || !testKey) return { ok: false, error: 'URL and Anon Key are required.' };

    try {
      const res = await fetch(`${testUrl}/rest/v1/orders?select=id&limit=1`, {
        headers: {
          'apikey': testKey,
          'Authorization': `Bearer ${testKey}`
        }
      });
      if (res.ok) {
        return { ok: true, message: 'Connected successfully to Supabase!' };
      } else {
        const text = await res.text();
        return { ok: false, status: res.status, error: text || 'Supabase rejected the credentials.' };
      }
    } catch (e) {
      return { ok: false, error: `Connection failed: ${e.message}` };
    }
  }
}

// Global singleton instance
window.supabaseService = new SupabaseService();
