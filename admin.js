/**
 * Noor Optics — Retail Business Management & In-Store POS Controller
 * Version: 3.0.0 (Strict 4-Nav Architecture, Yellow QR-Only Frame Stickers, Live Multi-Channel Dashboard & POS)
 */

(function () {
  'use strict';

  // ── Global Application State ───────────────────────────────────────────────
  const state = {
    token: localStorage.getItem('noor_admin_token') || null,
    user: null,
    activeNav: 'dashboard', // dashboard | orders | inventory | pos
    storeSettings: {
      store_name: 'Noor Optics Flagship Boutique',
      store_phone: '+91 98765 43210',
      store_address: '104, 100ft Road, Indiranagar, Bengaluru, Karnataka - 560038',
      store_gstin: '29AAAAA0000A1Z5',
      store_upi_id: 'nooroptics@okhdfcbank'
    },
    // Dashboard state
    dashRange: 'today',
    dashCustomStart: '',
    dashCustomEnd: '',
    dashChartInstance: null,
    // Orders state
    ordersActiveChannel: 'POS', // 'POS' (In-store) vs 'WEBSITE' (Online)
    ordersCache: [],
    ordersSearchQuery: '',
    ordersStatusFilter: '',
    ordersPaymentFilter: '',
    // Total Inventory state
    inventoryList: [],
    inventorySearchQuery: '',
    inventoryShapeFilter: '',
    inventoryStockFilter: '',
    selectedFrameIds: new Set(),
    activeStickerFrame: null,
    // In-store POS state
    posCatalog: [],
    posSelectedShape: 'all',
    posSearchQuery: '',
    posCart: [],
    posPaymode: 'CASH',
    posScannerActive: false,
    html5QrScanner: null,
    lastScannedCode: null,
    lastScanTime: 0
  };

  // ── Currency Formatter (Paise & INR) ───────────────────────────────────────
  function formatINR(amountOrPaise, isPaise = false) {
    const val = isPaise ? (Number(amountOrPaise) || 0) / 100 : (Number(amountOrPaise) || 0);
    return '₹' + val.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatShortDate(isoString) {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return String(isoString).slice(0, 10);
    }
  }

  function formatDateTime(isoString) {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return String(isoString);
    }
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Toast Notifications ───────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    let container = document.getElementById('admin-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = {
      info: '#1F2937',
      success: '#059669',
      error: '#DC2626',
      warning: '#D97706'
    };
    toast.style.cssText = `
      background: ${colors[type] || '#1F2937'};
      color: #FFFFFF;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      box-shadow: 0 6px 18px rgba(0,0,0,0.22);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.25s ease;
      pointer-events: auto;
      max-width: 380px;
      line-height: 1.4;
    `;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3800);
  }

  // ── Authenticated API Fetch Wrapper ───────────────────────────────────────
  async function apiFetch(endpoint, options = {}) {
    const headers = options.headers || {};
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    const res = await fetch(endpoint, config);
    if (res.status === 401) {
      // Token expired or invalid
      console.warn('Session expired or unauthorized. Showing login.');
      state.token = null;
      localStorage.removeItem('noor_admin_token');
      showLoginOverlay();
      throw new Error('Unauthorized');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP error ${res.status}`);
    }
    return data;
  }

  // ── Audio Beep for POS Scanner ────────────────────────────────────────────
  function playScannerBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // AudioContext unavailable or blocked by autoplay policy
    }
  }

  // ── Navigation Switching: STRICTLY FOUR SECTIONS ──────────────────────────
  function switchNav(navKey) {
    const allowedNavs = ['dashboard', 'orders', 'inventory', 'pos'];
    if (!allowedNavs.includes(navKey)) {
      navKey = 'dashboard';
    }
    state.activeNav = navKey;

    // Update active nav-item in sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      if (el.dataset.nav === navKey) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update active view section
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });
    const targetSection = document.getElementById(`view-${navKey}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update Header Title
    const titleEl = document.getElementById('page-title');
    const subEl = document.getElementById('page-subtitle');
    const titles = {
      dashboard: { title: 'Operations Dashboard', sub: 'Real-time performance overview • Asia/Kolkata (IST)' },
      orders: { title: 'Orders Pipeline', sub: 'In-store point of sale & customer website storefront orders' },
      inventory: { title: 'Total Inventory & Optical Catalog', sub: 'Frame stock balances, specifications & yellow QR sticker generator' },
      pos: { title: 'In-Store POS Register', sub: 'Cashier checkout, optical frame camera scanning & tax billing' }
    };
    if (titleEl && titles[navKey]) {
      titleEl.textContent = titles[navKey].title;
    }
    if (subEl && titles[navKey]) {
      subEl.textContent = titles[navKey].sub;
    }

    // Trigger data loading for active view
    if (navKey === 'dashboard') {
      loadDashboard();
    } else if (navKey === 'orders') {
      loadOrders();
    } else if (navKey === 'inventory') {
      loadInventory();
    } else if (navKey === 'pos') {
      loadPosCatalog();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SECTION: DASHBOARD — COMPLETE BUSINESS OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  async function loadDashboard() {
    try {
      let url = `/api/dashboard/overview?range=${encodeURIComponent(state.dashRange)}`;
      if (state.dashRange === 'custom' && state.dashCustomStart && state.dashCustomEnd) {
        url += `&startDate=${state.dashCustomStart}&endDate=${state.dashCustomEnd}`;
      }

      const data = await apiFetch(url);
      const cards = data.cards || {};

      // 1. Update 9 KPI Summary Cards
      document.getElementById('kpi-in-store-sales').textContent = formatINR(cards.inStoreSalesINR || 0);
      document.getElementById('kpi-in-store-orders').textContent = `${cards.inStoreOrderCount || 0} completed in-store sales`;

      document.getElementById('kpi-website-sales').textContent = formatINR(cards.websiteSalesINR || 0);
      document.getElementById('kpi-website-orders').textContent = `${cards.websiteOrderCount || 0} online customer orders`;

      document.getElementById('kpi-combined-revenue').textContent = formatINR(cards.combinedRevenueINR || 0);
      document.getElementById('kpi-combined-orders').textContent = `${(cards.inStoreOrderCount || 0) + (cards.websiteOrderCount || 0)} total orders reconciled`;

      document.getElementById('kpi-in-store-count').textContent = cards.inStoreOrderCount || 0;
      document.getElementById('kpi-website-count').textContent = cards.websiteOrderCount || 0;
      document.getElementById('kpi-distinct-frames').textContent = cards.distinctFramesCount || 0;
      document.getElementById('kpi-physical-units').textContent = cards.physicalUnitsInStock || 0;
      document.getElementById('kpi-low-stock').textContent = cards.lowStockCount || 0;
      document.getElementById('kpi-out-of-stock').textContent = cards.outOfStockCount || 0;

      // 2. Render / Update Comparative Sales Chart
      renderDashboardChart(data.timeline || [], data.dateRange);

      // 3. Render Miniature Recent Orders Panel
      renderDashboardRecentOrders(data.recentOrders || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      showToast('Error loading live dashboard: ' + err.message, 'error');
    }
  }

  function renderDashboardChart(timeline, dateRange) {
    const canvas = document.getElementById('dash-sales-chart');
    if (!canvas || !window.Chart) return;

    const labels = timeline.map(t => t.label);
    const inStoreData = timeline.map(t => t.inStore);
    const websiteData = timeline.map(t => t.website);

    if (state.dashChartInstance) {
      state.dashChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    state.dashChartInstance = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['No Data'],
        datasets: [
          {
            label: 'In-Store POS (₹)',
            data: inStoreData.length ? inStoreData : [0],
            backgroundColor: '#111111',
            borderRadius: 4,
            barPercentage: 0.65
          },
          {
            label: 'Website Online (₹)',
            data: websiteData.length ? websiteData : [0],
            backgroundColor: '#D4AF37',
            borderRadius: 4,
            barPercentage: 0.65
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${formatINR(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" } }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#F0F1F3' },
            ticks: {
              callback: function (val) {
                return '₹' + val.toLocaleString('en-IN');
              },
              font: { size: 10, family: "'Plus Jakarta Sans', sans-serif" }
            }
          }
        }
      }
    });
  }

  function renderDashboardRecentOrders(orders) {
    const tbody = document.getElementById('dash-recent-orders-body');
    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:#9CA3AF;">No orders recorded in this period.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const isPOS = o.channel === 'IN-STORE';
      const channelBadge = isPOS
        ? `<span class="badge-status channel-pos">🏪 In-store</span>`
        : `<span class="badge-status channel-online">🌐 Website</span>`;

      const paymentClass = o.paymentStatus === 'VERIFIED' ? 'status-verified' : 'status-awaiting';
      const orderClass = o.orderStatus === 'CONFIRMED' || o.orderStatus === 'DELIVERED' ? 'status-verified' : 'status-pending';

      return `
        <tr style="cursor:pointer;" onclick="viewOrderDetails('${o.id}')" title="Click to view order details">
          <td>
            <strong>${escapeHtml(o.invoiceNumber)}</strong>
            ${o.tokenNumber ? `<div style="font-size:0.7rem; color:#6B7280;">Token #${o.tokenNumber}</div>` : ''}
          </td>
          <td>${channelBadge}</td>
          <td>${formatDateTime(o.createdAt)}</td>
          <td>${o.itemCount} frame${o.itemCount > 1 ? 's' : ''}</td>
          <td><strong>${formatINR(o.totalINR)}</strong></td>
          <td><span class="badge-status ${paymentClass}">${escapeHtml(o.paymentStatus)}</span></td>
          <td><span class="badge-status ${orderClass}">${escapeHtml(o.orderStatus)}</span></td>
        </tr>
      `;
    }).join('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SECTION: ORDERS — IN-STORE AND WEBSITE
  // ═══════════════════════════════════════════════════════════════════════════
  async function loadOrders() {
    try {
      const res = await apiFetch('/api/orders?limit=150');
      state.ordersCache = Array.isArray(res) ? res : (res.orders || []);
      renderOrdersTable();
    } catch (err) {
      console.error('Failed to load orders:', err);
      showToast('Error loading orders: ' + err.message, 'error');
    }
  }

  function renderOrdersTable() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    const channel = state.ordersActiveChannel; // 'POS' vs 'WEBSITE'
    const query = state.ordersSearchQuery.toLowerCase().trim();
    const statusFilter = state.ordersStatusFilter;
    const paymentFilter = state.ordersPaymentFilter;

    // Count badges
    const instoreCount = state.ordersCache.filter(o => o.channel === 'POS').length;
    const websiteCount = state.ordersCache.filter(o => o.channel === 'ONLINE' || o.channel === 'WEBSITE').length;
    const badgeInstore = document.getElementById('count-instore-orders');
    const badgeWebsite = document.getElementById('count-website-orders');
    if (badgeInstore) badgeInstore.textContent = instoreCount;
    if (badgeWebsite) badgeWebsite.textContent = websiteCount;

    // Filter list
    const filtered = state.ordersCache.filter(o => {
      // Channel match
      if (channel === 'POS' && o.channel !== 'POS') return false;
      if (channel === 'WEBSITE' && o.channel !== 'ONLINE' && o.channel !== 'WEBSITE') return false;

      // Status
      if (statusFilter && o.status !== statusFilter) return false;
      // Payment
      if (paymentFilter && o.payment_status !== paymentFilter) return false;

      // Search Query
      if (query) {
        const orderNum = (o.order_number || '').toLowerCase();
        const custName = (o.customer_name || '').toLowerCase();
        const custPhone = (o.customer_phone || '').toLowerCase();
        if (!orderNum.includes(query) && !custName.includes(query) && !custPhone.includes(query)) {
          return false;
        }
      }
      return true;
    });

    const countLabel = document.getElementById('orders-count-label');
    if (countLabel) {
      countLabel.textContent = `Showing ${filtered.length} of ${channel === 'POS' ? instoreCount : websiteCount} orders`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:3rem; color:#9CA3AF;">No orders found matching the selected filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(o => {
      const itemsCount = (o.items && o.items.length) || 1;
      const itemsSnippet = o.items
        ? o.items.map(i => `${escapeHtml(i.product_name)} (${i.quantity})`).join(', ')
        : 'Optical Frame';

      const paymentClass = o.payment_status === 'VERIFIED' ? 'status-verified' : (o.payment_status === 'REFUNDED' ? 'status-cancelled' : 'status-awaiting');
      const orderClass = o.status === 'CONFIRMED' || o.status === 'DELIVERED' ? 'status-verified' : (o.status === 'CANCELLED' || o.status === 'REFUNDED' ? 'status-cancelled' : 'status-pending');

      return `
        <tr>
          <td>
            <strong>${escapeHtml(o.order_number)}</strong>
            ${o.token_number ? `<div style="font-size:0.72rem; color:#6B7280; font-weight:700;">Token #${o.token_number}</div>` : ''}
          </td>
          <td>${formatDateTime(o.created_at)}</td>
          <td>
            <strong>${escapeHtml(o.customer_name || (channel === 'POS' ? 'Walk-in Client' : 'Online Client'))}</strong>
            ${o.customer_phone ? `<div style="font-size:0.72rem; color:#6B7280;">${escapeHtml(o.customer_phone)}</div>` : ''}
            ${o.city ? `<div style="font-size:0.7rem; color:#9CA3AF;">${escapeHtml(o.city)}</div>` : ''}
          </td>
          <td>
            <div style="font-weight:600;">${itemsCount} item${itemsCount > 1 ? 's' : ''}</div>
            <div style="font-size:0.72rem; color:#6B7280; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(itemsSnippet)}">${escapeHtml(itemsSnippet)}</div>
          </td>
          <td>${formatINR(o.subtotal_paise || o.subtotal_inr * 100, true)}</td>
          <td>${formatINR(o.discount_paise || (o.discount_inr || 0) * 100, true)}</td>
          <td><strong>${formatINR(o.total_payable_paise || o.total_payable_inr * 100, true)}</strong></td>
          <td>
            <span class="badge-status ${paymentClass}">${escapeHtml(o.payment_status)}</span>
            <div style="font-size:0.68rem; color:#6B7280; margin-top:2px;">${escapeHtml(o.payment_method || 'CASH')}</div>
          </td>
          <td><span class="badge-status ${orderClass}">${escapeHtml(o.status)}</span></td>
          <td>
            <div style="display:flex; gap:4px;">
              <button class="btn-table-action" onclick="viewOrderDetails('${o.id}')" title="View Full Details">View</button>
              <button class="btn-table-action" onclick="previewThermalReceipt('${o.id}')" title="Print Receipt">Receipt</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ── View Order Details Modal ──────────────────────────────────────────────
  window.viewOrderDetails = async function (orderId) {
    const order = state.ordersCache.find(o => o.id === orderId);
    if (!order) {
      showToast('Order details not found.', 'error');
      return;
    }

    const modal = document.getElementById('modal-order-details');
    const titleEl = document.getElementById('od-title');
    const subEl = document.getElementById('od-sub');
    const contentEl = document.getElementById('od-content');
    const actionsEl = document.getElementById('od-actions');

    titleEl.textContent = `Invoice / Order: ${order.order_number}`;
    subEl.textContent = `Channel: ${order.channel === 'POS' ? 'In-Store POS' : 'Website Online'} • ${formatDateTime(order.created_at)}`;

    // Items list
    const items = order.items || [];
    const itemsRows = items.map(i => `
      <tr>
        <td><strong>${escapeHtml(i.product_name)}</strong><br/><span style="font-size:0.72rem; color:#6B7280;">Color: ${escapeHtml(i.variant_name || 'Standard')} • SKU: ${escapeHtml(i.sku || '-')}</span></td>
        <td>${i.quantity}</td>
        <td>${formatINR(i.unit_price_paise, true)}</td>
        <td style="text-align:right;"><strong>${formatINR(i.subtotal_paise, true)}</strong></td>
      </tr>
    `).join('');

    contentEl.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem; background:#FAFAFC; padding:1.25rem; border-radius:6px; border:1px solid #E5E7EB;">
        <div>
          <h4 style="font-size:0.78rem; text-transform:uppercase; color:#6B7280; margin-bottom:6px;">Customer & Delivery</h4>
          <div style="font-size:0.95rem; font-weight:700;">${escapeHtml(order.customer_name || 'Walk-in Client')}</div>
          ${order.customer_phone ? `<div>Phone: ${escapeHtml(order.customer_phone)}</div>` : ''}
          ${order.customer_email ? `<div>Email: ${escapeHtml(order.customer_email)}</div>` : ''}
          ${order.delivery_address ? `<div style="margin-top:4px; font-size:0.8rem; color:#4B5563;">${escapeHtml(order.delivery_address)}, ${escapeHtml(order.city || '')} - ${escapeHtml(order.pin_code || '')}</div>` : ''}
        </div>
        <div>
          <h4 style="font-size:0.78rem; text-transform:uppercase; color:#6B7280; margin-bottom:6px;">Payment & Status</h4>
          <div><strong>Payment Method:</strong> ${escapeHtml(order.payment_method || 'CASH')}</div>
          <div><strong>Payment Status:</strong> <span class="badge-status status-${order.payment_status?.toLowerCase()}">${escapeHtml(order.payment_status)}</span></div>
          <div><strong>Order Status:</strong> <span class="badge-status status-${order.status?.toLowerCase()}">${escapeHtml(order.status)}</span></div>
          ${order.prescription_pref ? `<div style="margin-top:4px; font-size:0.8rem; color:#4B5563;"><strong>Prescription:</strong> ${escapeHtml(order.prescription_pref)}</div>` : ''}
        </div>
      </div>

      <h4 style="font-size:0.85rem; font-weight:800; margin-bottom:8px;">Purchased Frames</h4>
      <table class="data-table" style="margin-bottom:1.5rem;">
        <thead>
          <tr>
            <th>Frame Item</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th style="text-align:right;">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows || `<tr><td colspan="4" style="text-align:center;">Optical Frame</td></tr>`}
        </tbody>
      </table>

      <div style="display:flex; justify-content:flex-end;">
        <div style="width:280px; display:flex; flex-direction:column; gap:6px; font-size:0.85rem;">
          <div style="display:flex; justify-content:space-between;">
            <span>Subtotal:</span>
            <span>${formatINR(order.subtotal_paise, true)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; color:#D97706;">
            <span>Discount:</span>
            <span>-${formatINR(order.discount_paise || 0, true)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; color:#6B7280;">
            <span>GST (18% Included):</span>
            <span>${formatINR(order.tax_paise || 0, true)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:800; border-top:1px solid #CCC; padding-top:6px; margin-top:4px;">
            <span>Grand Total:</span>
            <span>${formatINR(order.total_payable_paise, true)}</span>
          </div>
        </div>
      </div>
    `;

    // Dynamic actions based on order status and channel
    actionsEl.innerHTML = `
      <button type="button" class="btn-header-action" data-close-modal>Close</button>
      <button type="button" class="btn-header-action" onclick="window.open('/api/invoices/order/${order.id}/pdf', '_blank')">📄 Tax Invoice PDF</button>
      <button type="button" class="btn-header-action btn-secondary" onclick="previewThermalReceipt('${order.id}')">🖨️ Thermal Receipt</button>
      ${order.status !== 'REFUNDED' && order.payment_status === 'VERIFIED' ? `
        <button type="button" class="btn-header-action" style="background:#DC2626; color:#FFF;" onclick="promptRefund('${order.id}')">Safe Refund & Restock</button>
      ` : ''}
      ${order.channel !== 'POS' && order.status !== 'CANCELLED' && order.status !== 'DELIVERED' ? `
        <select id="update-fulfillment-status" class="form-control" style="width:auto; display:inline-block;" onchange="updateFulfillment('${order.id}', this.value)">
          <option value="">Update Fulfillment...</option>
          <option value="PROCESSING">Mark Processing</option>
          <option value="DISPATCHED">Mark Dispatched</option>
          <option value="DELIVERED">Mark Delivered</option>
          <option value="CANCELLED">Cancel & Restock</option>
        </select>
      ` : ''}
    `;

    modal.classList.add('open');
  };

  window.promptRefund = async function (orderId) {
    const reason = prompt('Please enter refund justification (e.g. Customer returned frame in mint condition):');
    if (!reason || !reason.trim()) return;

    try {
      const res = await apiFetch(`/api/orders/${orderId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim(), restockInventory: true })
      });
      showToast(res.message || 'Order refunded and inventory restocked safely.', 'success');
      document.getElementById('modal-order-details').classList.remove('open');
      loadOrders();
      loadDashboard();
      loadInventory();
    } catch (err) {
      showToast('Refund error: ' + err.message, 'error');
    }
  };

  window.updateFulfillment = async function (orderId, status) {
    if (!status) return;
    try {
      await apiFetch(`/api/orders/${orderId}/fulfillment`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      showToast(`Order status updated to ${status}.`, 'success');
      document.getElementById('modal-order-details').classList.remove('open');
      loadOrders();
      loadDashboard();
    } catch (err) {
      showToast('Fulfillment update error: ' + err.message, 'error');
    }
  };

  // ── Daily Sales Report Modal & Exports ────────────────────────────────────
  function setupDailySalesReport() {
    const btnOpen = document.getElementById('btn-open-daily-report-modal');
    const modal = document.getElementById('modal-export-daily-report');
    const dateInput = document.getElementById('report-business-date');

    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    if (dateInput) {
      dateInput.value = todayStr;
      dateInput.addEventListener('change', () => loadDailyReportData(dateInput.value));
    }

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        modal.classList.add('open');
        loadDailyReportData(dateInput ? dateInput.value : todayStr);
      });
    }

    // CSV Download
    const btnCsv = document.getElementById('btn-download-report-csv');
    if (btnCsv) {
      btnCsv.addEventListener('click', () => downloadDailyReport('csv'));
    }

    // XLSX Download
    const btnXlsx = document.getElementById('btn-download-report-xlsx');
    if (btnXlsx) {
      btnXlsx.addEventListener('click', () => downloadDailyReport('xlsx'));
    }

    // PDF / Print
    const btnPdf = document.getElementById('btn-print-report-pdf');
    if (btnPdf) {
      btnPdf.addEventListener('click', () => printDailyReportSummary());
    }
  }

  let cachedReportData = null;

  async function loadDailyReportData(dateStr) {
    const previewBox = document.getElementById('report-preview-box');
    if (!previewBox) return;

    previewBox.innerHTML = `<div style="text-align:center; padding:1.5rem; color:#9CA3AF;">Loading daily report for ${dateStr}...</div>`;

    try {
      const data = await apiFetch(`/api/reports/daily-sales?date=${dateStr}`);
      cachedReportData = data;
      const s = data.summary || {};

      previewBox.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.75rem;">
          <div style="background:#FFF; padding:10px; border-radius:4px; border:1px solid #E5E7EB;">
            <div style="font-size:0.72rem; color:#6B7280; font-weight:700;">IN-STORE POS SALES</div>
            <div style="font-size:1.15rem; font-weight:800; color:#111;">${formatINR(s.inStoreSalesINR || 0)}</div>
            <div style="font-size:0.7rem; color:#059669;">${s.inStoreOrderCount || 0} orders</div>
          </div>
          <div style="background:#FFF; padding:10px; border-radius:4px; border:1px solid #E5E7EB;">
            <div style="font-size:0.72rem; color:#6B7280; font-weight:700;">WEBSITE STOREFRONT SALES</div>
            <div style="font-size:1.15rem; font-weight:800; color:#111;">${formatINR(s.websiteSalesINR || 0)}</div>
            <div style="font-size:0.7rem; color:#059669;">${s.websiteOrderCount || 0} orders</div>
          </div>
        </div>
        <div style="background:#111; color:#FFF; padding:10px 14px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:0.7rem; color:#9CA3AF; text-transform:uppercase;">Reconciled Combined Net Sales</div>
            <div style="font-size:1.25rem; font-weight:800; color:#FFF;">${formatINR(s.combinedSalesINR || 0)}</div>
          </div>
          <div style="text-align:right; font-size:0.75rem; color:#D1D5DB;">
            <div>GST: ${formatINR(s.taxCollectedINR || 0)}</div>
            <div>Orders: ${(s.inStoreOrderCount || 0) + (s.websiteOrderCount || 0)}</div>
          </div>
        </div>
      `;
    } catch (err) {
      previewBox.innerHTML = `<div style="color:#DC2626; padding:1rem;">Failed to load report data: ${err.message}</div>`;
    }
  }

  function downloadDailyReport(format) {
    if (!cachedReportData) {
      showToast('Report data not loaded yet.', 'warning');
      return;
    }

    const date = cachedReportData.businessDate;
    const orders = cachedReportData.orders || [];

    // Table rows
    const rows = orders.map(o => ({
      'Business Date': date,
      'Invoice / Order #': o.invoiceNumber,
      'Token #': o.tokenNumber || '',
      'Channel': o.channel,
      'Time': o.time,
      'Customer Name': o.customerName,
      'Customer Phone': o.customerPhone,
      'Items': o.itemsSummary,
      'Item Count': o.itemCount,
      'Subtotal (INR)': o.subtotalINR,
      'Discount (INR)': o.discountINR,
      'Tax (INR)': o.taxINR,
      'Total (INR)': o.totalINR,
      'Payment Method': o.paymentMethod,
      'Payment Status': o.paymentStatus,
      'Order Status': o.orderStatus
    }));

    if (window.XLSX) {
      const ws = window.XLSX.utils.json_to_sheet(rows);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Daily Sales');

      if (format === 'csv') {
        window.XLSX.writeFile(wb, `Noor_Daily_Sales_${date}.csv`);
      } else {
        window.XLSX.writeFile(wb, `Noor_Daily_Sales_${date}.xlsx`);
      }
      showToast(`Daily Sales Report exported as ${format.toUpperCase()}.`, 'success');
    } else {
      showToast('Export library not ready.', 'error');
    }
  }

  function printDailyReportSummary() {
    if (!cachedReportData) return;
    const s = cachedReportData.summary || {};
    const date = cachedReportData.businessDate;
    const orders = cachedReportData.orders || [];

    const printWin = window.open('', '_blank', 'width=850,height=900');
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Sales Report – ${date} – Noor Optics</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; color: #111; }
          .header { border-bottom: 2px solid #111; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 1.6rem; font-weight: 800; }
          .meta { font-size: 0.85rem; color: #666; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
          .card { border: 1px solid #DDD; padding: 1rem; border-radius: 4px; }
          .card-title { font-size: 0.75rem; color: #666; text-transform: uppercase; font-weight: 700; }
          .card-val { font-size: 1.3rem; font-weight: 800; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
          th, td { border: 1px solid #E5E7EB; padding: 6px 10px; text-align: left; }
          th { background: #F9FAFB; font-weight: 700; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">NOOR OPTICS — DAILY SALES REPORT</div>
            <div class="meta">Flagship Boutique & Online Storefront Combined Audit</div>
          </div>
          <div style="text-align:right;">
            <div><strong>Business Date:</strong> ${date}</div>
            <div class="meta">Timezone: Asia/Kolkata (IST)</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="card">
            <div class="card-title">In-Store POS Sales</div>
            <div class="card-val">${formatINR(s.inStoreSalesINR || 0)}</div>
            <div style="font-size:0.75rem;">${s.inStoreOrderCount || 0} orders</div>
          </div>
          <div class="card">
            <div class="card-title">Website Sales</div>
            <div class="card-val">${formatINR(s.websiteSalesINR || 0)}</div>
            <div style="font-size:0.75rem;">${s.websiteOrderCount || 0} orders</div>
          </div>
          <div class="card" style="background:#F9FAFB;">
            <div class="card-title">Combined Net Sales</div>
            <div class="card-val">${formatINR(s.combinedSalesINR || 0)}</div>
            <div style="font-size:0.75rem;">${(s.inStoreOrderCount || 0) + (s.websiteOrderCount || 0)} orders</div>
          </div>
          <div class="card">
            <div class="card-title">Taxes Collected (GST)</div>
            <div class="card-val">${formatINR(s.taxCollectedINR || 0)}</div>
          </div>
        </div>

        <h3>All Transactions (${orders.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Time</th>
              <th>Channel</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><strong>${escapeHtml(o.invoiceNumber)}</strong></td>
                <td>${o.time}</td>
                <td>${o.channel}</td>
                <td>${escapeHtml(o.customerName)}</td>
                <td>${escapeHtml(o.itemsSummary)}</td>
                <td><strong>${formatINR(o.totalINR)}</strong></td>
                <td>${escapeHtml(o.paymentMethod)} (${escapeHtml(o.paymentStatus)})</td>
                <td>${escapeHtml(o.orderStatus)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SECTION: TOTAL INVENTORY — COMPLETE FRAME MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  async function loadInventory() {
    try {
      const res = await apiFetch('/api/products');
      state.inventoryList = Array.isArray(res) ? res : [];
      renderInventoryTable();
    } catch (err) {
      console.error('Failed to load inventory:', err);
      showToast('Error loading inventory: ' + err.message, 'error');
    }
  }

  function renderInventoryTable() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    const query = state.inventorySearchQuery.toLowerCase().trim();
    const shapeFilter = state.inventoryShapeFilter;
    const stockFilter = state.inventoryStockFilter;

    // Metrics summary
    const totalDistinct = state.inventoryList.length;
    let totalPhysical = 0;
    let lowCount = 0;
    let outCount = 0;

    state.inventoryList.forEach(p => {
      const stock = Number(p.total_stock) || 0;
      totalPhysical += stock;
      const threshold = p.reorder_threshold || 5;
      if (stock === 0) outCount++;
      else if (stock <= threshold) lowCount++;
    });

    document.getElementById('inv-total-distinct').textContent = totalDistinct;
    document.getElementById('inv-total-physical').textContent = totalPhysical;
    document.getElementById('inv-low-stock-count').textContent = lowCount;
    document.getElementById('inv-out-stock-count').textContent = outCount;

    // Filter frames
    const filtered = state.inventoryList.filter(p => {
      if (shapeFilter && p.shape !== shapeFilter) return false;
      const stock = Number(p.total_stock) || 0;
      const threshold = p.reorder_threshold || 5;
      if (stockFilter === 'in_stock' && stock === 0) return false;
      if (stockFilter === 'low_stock' && (stock === 0 || stock > threshold)) return false;
      if (stockFilter === 'out_of_stock' && stock > 0) return false;

      if (query) {
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const shape = (p.shape || '').toLowerCase();
        if (!name.includes(query) && !sku.includes(query) && !brand.includes(query) && !shape.includes(query)) {
          return false;
        }
      }
      return true;
    });

    const countLabel = document.getElementById('inv-count-label');
    if (countLabel) countLabel.textContent = `Showing ${filtered.length} of ${totalDistinct} frames`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:3rem; color:#9CA3AF;">No frames found matching your search.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const stock = Number(p.total_stock) || 0;
      const threshold = p.reorder_threshold || 5;
      let stockBadge = `<span class="badge-stock in-stock">${stock} Units</span>`;
      if (stock === 0) {
        stockBadge = `<span class="badge-stock out-of-stock">Out of Stock (0)</span>`;
      } else if (stock <= threshold) {
        stockBadge = `<span class="badge-stock low-stock">Low Stock (${stock})</span>`;
      }

      const isChecked = state.selectedFrameIds.has(p.id);

      return `
        <tr>
          <td>
            <input type="checkbox" class="frame-row-checkbox" data-id="${p.id}" ${isChecked ? 'checked' : ''} />
          </td>
          <td>
            <img src="${escapeHtml(p.image_url || 'images/stockholm_noir.jpg')}" alt="${escapeHtml(p.name)}" class="frame-thumbnail-img" onerror="this.src='images/stockholm_noir.jpg'" />
          </td>
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td><code style="font-weight:700; color:#111;">${escapeHtml(p.sku)}</code></td>
          <td><span style="font-size:0.72rem; color:#6B7280;">${escapeHtml(p.id)}</span></td>
          <td>${escapeHtml(p.brand)}</td>
          <td>${escapeHtml(p.shape)}</td>
          <td>${p.purchase_cost_inr ? formatINR(p.purchase_cost_inr) : '-'}</td>
          <td><strong>${formatINR(p.selling_price_inr)}</strong></td>
          <td><strong>${stock}</strong></td>
          <td>${stockBadge}</td>
          <td>
            <button class="btn-table-action" onclick="openSingleStickerModal('${p.id}')" title="Generate Yellow QR Sticker">🏷️ QR Sticker</button>
          </td>
          <td>
            <div style="display:flex; gap:4px;">
              <button class="btn-table-action" onclick="openStockAdjustModal('${p.id}')" title="Adjust Stock Balance">Stock</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Wire row checkboxes
    tbody.querySelectorAll('.frame-row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) state.selectedFrameIds.add(id);
        else state.selectedFrameIds.delete(id);
        updateBatchStickersButton();
      });
    });
  }

  function updateBatchStickersButton() {
    const btn = document.getElementById('btn-batch-stickers');
    const txt = document.getElementById('btn-batch-stickers-text');
    const count = state.selectedFrameIds.size;
    if (btn) btn.disabled = count === 0;
    if (txt) txt.textContent = `Print Selected Stickers (${count})`;
  }

  // ── + Add New Frame Modal & Actions ───────────────────────────────────────
  function setupAddFrameModal() {
    const modal = document.getElementById('modal-add-frame');
    const btnOpen = document.getElementById('btn-open-add-frame');
    const form = document.getElementById('form-add-frame');
    const btnSavePrint = document.getElementById('btn-submit-save-print');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        form.reset();
        modal.classList.add('open');
      });
    }

    // Color picker sync
    const colorPicker = document.getElementById('frm-color-picker');
    const colorHex = document.getElementById('frm-color-hex');
    if (colorPicker && colorHex) {
      colorPicker.addEventListener('input', (e) => colorHex.value = e.target.value);
      colorHex.addEventListener('input', (e) => colorPicker.value = e.target.value);
    }

    // Save Frame Only
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveFrameHandler(false);
      });
    }

    // Save & Print QR Sticker
    if (btnSavePrint) {
      btnSavePrint.addEventListener('click', async () => {
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        await saveFrameHandler(true);
      });
    }
  }

  async function saveFrameHandler(andPrintSticker) {
    const name = document.getElementById('frm-name').value.trim();
    const sku = document.getElementById('frm-sku').value.trim().toUpperCase();
    const brand = document.getElementById('frm-brand').value.trim() || 'Noor Optics';
    const model = document.getElementById('frm-model').value.trim();
    const shape = document.getElementById('frm-shape').value;
    const colorName = document.getElementById('frm-color-name').value.trim();
    const colorHex = document.getElementById('frm-color-hex').value.trim();
    const size = document.getElementById('frm-size').value.trim();
    const sellingPrice = document.getElementById('frm-selling-price').value;
    const costPrice = document.getElementById('frm-cost-price').value || 0;
    const stockQty = document.getElementById('frm-stock-qty').value;
    const material = document.getElementById('frm-material').value.trim();
    const imageUrl = document.getElementById('frm-image-url').value.trim();
    const description = document.getElementById('frm-description').value.trim();

    try {
      const payload = {
        name,
        sku,
        brand,
        shape,
        material,
        fit: 'Regular',
        sellingPriceINR: sellingPrice,
        purchaseCostINR: costPrice,
        reorderThreshold: 5,
        imageUrl: imageUrl || 'images/stockholm_noir.jpg',
        description: `${description} | Size: ${size}`,
        variants: [
          {
            colorName: colorName || 'Standard',
            colorHex: colorHex || '#111111',
            initialStock: stockQty
          }
        ]
      };

      const res = await apiFetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      showToast(`Frame "${name}" registered successfully!`, 'success');
      document.getElementById('modal-add-frame').classList.remove('open');
      await loadInventory();
      await loadDashboard();

      if (andPrintSticker) {
        // Open QR Sticker Modal with newly created frame
        const newFrame = state.inventoryList.find(p => p.sku === sku || p.id === res.id) || {
          id: res.id,
          name,
          sku,
          brand
        };
        openSingleStickerModal(newFrame.id);
      }
    } catch (err) {
      showToast('Error saving frame: ' + err.message, 'error');
    }
  }

  // ── Import Frame Data (CSV/Excel) ─────────────────────────────────────────
  function setupImportModal() {
    const modal = document.getElementById('modal-import-frames');
    const btnOpen = document.getElementById('btn-open-import-modal');
    const dropzone = document.getElementById('import-dropzone');
    const fileInput = document.getElementById('import-file-input');
    const btnConfirm = document.getElementById('btn-import-confirm');
    const btnSample = document.getElementById('btn-download-sample-csv');

    let parsedRows = [];

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        resetImportModal();
        modal.classList.add('open');
      });
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          handleImportFile(e.dataTransfer.files[0]);
        }
      });
      fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
          handleImportFile(fileInput.files[0]);
        }
      });
    }

    if (btnSample) {
      btnSample.addEventListener('click', () => {
        const sampleCsv = `Frame Name,SKU,Brand,Shape,Color,Cost Price,Selling Price,Stock Quantity,Size,Description\n` +
          `The Copenhagen Round,NOOR-CPH-01,Noor Optics,Round,Antique Bronze,1400,3499,15,Medium - 48-21-145,Minimalist Scandinavian circular titanium\n` +
          `The Helsinki Quad,NOOR-HEL-01,Noor Optics,Square,Matte Slate,1600,3899,10,Large - 52-19-148,Architectural geometric square frame\n` +
          `The Kyoto Havana,NOOR-KYO-01,Noor Optics,Round,Tortoise Havana,1200,3299,20,Medium - 49-20-145,Sculpted Mazzucchelli Italian bio-acetate`;

        const blob = new Blob([sampleCsv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Noor_Optics_Frame_Import_Template.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    function resetImportModal() {
      document.getElementById('import-step-upload').style.display = 'block';
      document.getElementById('import-step-mapping').style.display = 'none';
      document.getElementById('import-step-summary').style.display = 'none';
      btnConfirm.style.display = 'none';
      document.getElementById('btn-print-imported-stickers').style.display = 'none';
      parsedRows = [];
    }

    function handleImportFile(file) {
      const reader = new FileReader();
      const isCsv = file.name.endsWith('.csv');

      reader.onload = (e) => {
        try {
          if (!window.XLSX) {
            showToast('SheetJS parser not ready.', 'error');
            return;
          }
          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const rawRows = window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });

          if (rawRows.length === 0) {
            showToast('The uploaded spreadsheet contains no data rows.', 'warning');
            return;
          }

          parsedRows = rawRows;
          showMappingStep(rawRows);
        } catch (err) {
          showToast('Failed to parse file: ' + err.message, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    }

    function showMappingStep(rows) {
      document.getElementById('import-step-upload').style.display = 'none';
      document.getElementById('import-step-mapping').style.display = 'block';
      btnConfirm.style.display = 'inline-block';

      const headers = Object.keys(rows[0] || {});
      const mappingGrid = document.getElementById('mapping-fields-grid');

      const targetFields = [
        { key: 'name', label: 'Frame Name', req: true, match: ['frame name', 'name', 'product name', 'title'] },
        { key: 'sku', label: 'SKU / Frame Code', req: false, match: ['sku', 'frame code', 'code', 'barcode'] },
        { key: 'brand', label: 'Brand', req: false, match: ['brand', 'manufacturer'] },
        { key: 'shape', label: 'Shape', req: false, match: ['shape', 'frame shape'] },
        { key: 'color', label: 'Color', req: false, match: ['color', 'colour', 'colorway'] },
        { key: 'sellingPrice', label: 'Retail Selling Price (₹)', req: true, match: ['selling price', 'price', 'retail price', 'mrp'] },
        { key: 'costPrice', label: 'Cost Price (₹)', req: false, match: ['cost price', 'cost', 'purchase cost'] },
        { key: 'initialStock', label: 'Initial Stock Qty', req: true, match: ['stock quantity', 'stock', 'qty', 'quantity'] }
      ];

      mappingGrid.innerHTML = targetFields.map(tf => {
        const bestMatch = headers.find(h => tf.match.includes(h.toLowerCase().trim())) || '';
        const optionsHtml = headers.map(h => `<option value="${escapeHtml(h)}" ${h === bestMatch ? 'selected' : ''}>${escapeHtml(h)}</option>`).join('');

        return `
          <div class="form-group">
            <label>${tf.label} ${tf.req ? '<span class="req">*</span>' : ''}</label>
            <select class="form-control mapping-select" data-field="${tf.key}">
              <option value="">-- Ignore / Not Mapped --</option>
              ${optionsHtml}
            </select>
          </div>
        `;
      }).join('');

      renderImportPreviewTable(rows);
    }

    function renderImportPreviewTable(rows) {
      const previewTable = document.getElementById('import-preview-table');
      const alertsWrap = document.getElementById('import-validation-alerts');
      const slice = rows.slice(0, 8);
      const headers = Object.keys(rows[0] || {});

      previewTable.innerHTML = `
        <thead>
          <tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${slice.map(r => `<tr>${headers.map(h => `<td>${escapeHtml(r[h])}</td>`).join('')}</tr>`).join('')}
        </tbody>
      `;

      alertsWrap.innerHTML = `
        <div style="background:#ECFDF5; border:1px solid #A7F3D0; color:#065F46; padding:8px 12px; border-radius:6px; font-size:0.78rem;">
          ✓ Ready to validate <strong>${rows.length} frames</strong>. Duplicate SKU validation will run automatically on import.
        </div>
      `;
    }

    if (btnConfirm) {
      btnConfirm.addEventListener('click', async () => {
        const fieldMap = {};
        document.querySelectorAll('.mapping-select').forEach(sel => {
          if (sel.value) fieldMap[sel.dataset.field] = sel.value;
        });

        if (!fieldMap.name || !fieldMap.sellingPrice) {
          showToast('Please map mandatory fields: Frame Name and Selling Price.', 'warning');
          return;
        }

        const normalizedFrames = parsedRows.map(r => ({
          name: String(r[fieldMap.name] || ''),
          sku: String(r[fieldMap.sku] || ''),
          brand: String(r[fieldMap.brand] || 'Noor Optics'),
          shape: String(r[fieldMap.shape] || 'Rectangular'),
          color: String(r[fieldMap.color] || 'Classic Black'),
          sellingPrice: parseFloat(r[fieldMap.sellingPrice] || 0),
          costPrice: parseFloat(r[fieldMap.costPrice] || 0),
          initialStock: parseInt(r[fieldMap.initialStock] || 0, 10)
        }));

        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Importing...';

        try {
          const res = await apiFetch('/api/inventory/import', {
            method: 'POST',
            body: JSON.stringify({ frames: normalizedFrames })
          });

          // Show Step 3: Summary
          document.getElementById('import-step-mapping').style.display = 'none';
          document.getElementById('import-step-summary').style.display = 'block';
          btnConfirm.style.display = 'none';

          document.getElementById('import-summary-headline').textContent = `Import Completed! ${res.importedCount} Frames Added`;
          document.getElementById('import-summary-sub').textContent = `${res.skippedCount} rows skipped due to duplicate SKUs or missing data.`;

          if (res.errors && res.errors.length > 0) {
            document.getElementById('import-summary-errors').innerHTML = `
              <div style="background:#FEF3C7; border:1px solid #F59E0B; padding:10px; border-radius:6px; font-size:0.75rem; max-height:120px; overflow-y:auto;">
                <strong>Skipped Records:</strong>
                <ul style="padding-left:16px; margin-top:4px;">
                  ${res.errors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}
                </ul>
              </div>
            `;
          }

          const btnPrintImported = document.getElementById('btn-print-imported-stickers');
          if (btnPrintImported && res.importedItems && res.importedItems.length > 0) {
            btnPrintImported.style.display = 'inline-block';
            btnPrintImported.onclick = () => {
              modal.classList.remove('open');
              openBatchStickersModal(res.importedItems.map(i => i.id));
            };
          }

          showToast(`Successfully imported ${res.importedCount} optical frames!`, 'success');
          loadInventory();
          loadDashboard();
        } catch (err) {
          showToast('Import error: ' + err.message, 'error');
          btnConfirm.disabled = false;
          btnConfirm.textContent = 'Confirm & Import Records';
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SECTION: YELLOW QR-ONLY FRAME STICKER GENERATOR (CRITICAL REQUIREMENT)
  // ═══════════════════════════════════════════════════════════════════════════
  function setupStickerGenerator() {
    const modal = document.getElementById('modal-qr-sticker');
    const widthInput = document.getElementById('stk-width-mm');
    const heightInput = document.getElementById('stk-height-mm');
    const qrSizeInput = document.getElementById('stk-qr-size');
    const layoutInput = document.getElementById('stk-print-layout');
    const btnPrint = document.getElementById('btn-trigger-sticker-print');

    function applyPreset(presetKey) {
      if (presetKey === 'temple') {
        if (widthInput) widthInput.value = '38';
        if (heightInput) heightInput.value = '18';
        if (qrSizeInput) qrSizeInput.value = 'temple';
        if (layoutInput) layoutInput.value = 'individual';
      } else if (presetKey === 'a4_sheet') {
        if (widthInput) widthInput.value = '50';
        if (heightInput) heightInput.value = '25';
        if (qrSizeInput) qrSizeInput.value = 'medium';
        if (layoutInput) layoutInput.value = 'a4_sheet';
      } else {
        // standard default (18.5mm crisp instant scan)
        if (widthInput) widthInput.value = '50';
        if (heightInput) heightInput.value = '25';
        if (qrSizeInput) qrSizeInput.value = 'medium';
        if (layoutInput) layoutInput.value = 'individual';
      }

      // Update card visual states
      document.querySelectorAll('.stk-preset-card').forEach(card => {
        const isMatch = card.dataset.preset === presetKey;
        card.classList.toggle('active', isMatch);
        card.style.border = isMatch ? '2px solid #000' : '1px solid #CBD5E1';
        card.style.background = isMatch ? '#FFFDE7' : '#FFFFFF';
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = isMatch;
      });

      updatePreview();
    }

    function updatePreview() {
      const activePreset = document.querySelector('input[name="stk-preset-choice"]:checked')?.value || 'standard';
      const w = parseInt(widthInput?.value, 10) || (activePreset === 'temple' ? 38 : 50);
      const h = parseInt(heightInput?.value, 10) || (activePreset === 'temple' ? 18 : 25);
      const qrSize = activePreset === 'temple' ? 'temple' : 'medium';

      const dimTag = document.getElementById('stk-dimensions-tag');
      if (dimTag) dimTag.textContent = `Preset: ${w} mm × ${h} mm • Crisp QR (${activePreset === 'temple' ? '14mm' : '18.5mm'})`;

      const stage = document.getElementById('stk-preview-stage');
      if (!stage) return;

      const frame = state.activeStickerFrame || (state.inventoryList[0] || {
        name: 'The Oslo Crystal',
        sku: 'NOOR-OSLO-01',
        brand: 'Noor Optics'
      });

      renderSingleStickerCard(stage, frame, w, h, '', true, qrSize);
    }

    // Connect preset radio choices & card clicks
    document.querySelectorAll('input[name="stk-preset-choice"]').forEach(radio => {
      radio.addEventListener('change', () => applyPreset(radio.value));
    });
    document.querySelectorAll('.stk-preset-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const val = card.dataset.preset;
        if (val) applyPreset(val);
      });
    });

    // Copies increment / decrement
    const btnDec = document.getElementById('btn-stk-copies-dec');
    const btnInc = document.getElementById('btn-stk-copies-inc');
    const copiesInput = document.getElementById('stk-copies-count');
    if (btnDec && copiesInput) {
      btnDec.addEventListener('click', () => {
        const cur = parseInt(copiesInput.value, 10) || 1;
        if (cur > 1) copiesInput.value = cur - 1;
      });
    }
    if (btnInc && copiesInput) {
      btnInc.addEventListener('click', () => {
        const cur = parseInt(copiesInput.value, 10) || 1;
        if (cur < 100) copiesInput.value = cur + 1;
      });
    }

    // Actual Print Trigger (Browser / Sheet Print)
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        executeStickerPrint();
      });
    }

    // Direct Thermal Hardware Print (Instant ESC/POS to POS-80)
    const btnDirect = document.getElementById('btn-direct-thermal-print');
    if (btnDirect) {
      btnDirect.addEventListener('click', async () => {
        const frameIds = state.activeBatchStickerIds && state.activeBatchStickerIds.length > 0
          ? state.activeBatchStickerIds
          : (state.activeStickerFrame ? [state.activeStickerFrame.id] : []);

        const frames = frameIds.map(id => state.inventoryList.find(p => p.id === id)).filter(Boolean);
        if (frames.length === 0) {
          if (state.activeStickerFrame) frames.push(state.activeStickerFrame);
          else if (state.inventoryList[0]) frames.push(state.inventoryList[0]);
        }

        const copies = parseInt(document.getElementById('stk-copies-count')?.value || '1', 10);
        const activePreset = document.querySelector('input[name="stk-preset-choice"]:checked')?.value || 'standard';
        const qrSize = activePreset === 'temple' ? 'temple' : 'standard';

        btnDirect.disabled = true;
        btnDirect.innerHTML = `<span>⏳ Printing ${frames.length} in Sequence...</span>`;

        const items = frames.map(f => ({
          sku: f.sku || f.id,
          name: f.name || '',
          brand: f.brand || 'Noor Optics',
          price: f.selling_price_paise ? formatINR(f.selling_price_paise, true) : (f.selling_price_inr ? formatINR(f.selling_price_inr * 100, true) : ''),
          copies: copies
        }));

        const payload = {
          items: items,
          paperWidthMm: 58,
          qrPreset: activePreset,
          qrSize: qrSize
        };

        try {
          let res;
          try {
            res = await apiFetch('/api/printer/print-qr-sticker', {
              method: 'POST',
              body: JSON.stringify(payload)
            });
          } catch (cloudErr) {
            // Cloud fallback: try local POS hardware bridge on port 3000
            const localResp = await fetch('http://127.0.0.1:3000/api/printer/print-qr-sticker', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            res = await localResp.json();
          }

          if (res && res.success) {
            showToast(`✓ All ${frames.length} stickers printed sequentially to POS-80 thermal printer!`, 'success');
          } else {
            showToast('Printer response: ' + (res?.error || 'Check printer connection'), 'error');
          }
        } catch (err) {
          showToast('Could not reach POS printer: ' + err.message, 'error');
        } finally {
          btnDirect.disabled = false;
          btnDirect.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span>⚡ Print to POS Thermal Printer</span>
          `;
        }
      });
    }

    // Direct Sequential Print when clicking "Print Selected Stickers" button on Inventory table
    const btnBatch = document.getElementById('btn-batch-stickers');
    if (btnBatch) {
      btnBatch.addEventListener('click', async () => {
        await printBatchStickersSequence(Array.from(state.selectedFrameIds));
      });
    }

    // Print all eligible frame stickers
    const btnAll = document.getElementById('btn-print-all-stickers');
    if (btnAll) {
      btnAll.addEventListener('click', async () => {
        await printBatchStickersSequence(state.inventoryList.map(p => p.id));
      });
    }
  }

  /**
   * Print Batch of Stickers One After Another in Sequence to POS Thermal Printer
   */
  async function printBatchStickersSequence(frameIds) {
    if (!frameIds || frameIds.length === 0) {
      showToast('Please select one or more frames from the inventory table first.', 'warning');
      return;
    }

    const selectedFrames = frameIds.map(id => state.inventoryList.find(p => p.id === id)).filter(Boolean);
    if (selectedFrames.length === 0) {
      showToast('No matching frames found for selection.', 'warning');
      return;
    }

    const btnBatch = document.getElementById('btn-batch-stickers');
    const txtBatch = document.getElementById('btn-batch-stickers-text');
    const count = selectedFrames.length;

    if (btnBatch) btnBatch.disabled = true;
    if (txtBatch) txtBatch.textContent = `⏳ Printing ${count} in Sequence...`;

    showToast(`Sending ${count} stickers to POS-80 thermal printer in sequence...`, 'info');

    const activePreset = document.querySelector('input[name="stk-preset-choice"]:checked')?.value || 'standard';
    const copies = parseInt(document.getElementById('stk-copies-count')?.value || '1', 10);

    const items = selectedFrames.map(f => ({
      sku: f.sku || f.id,
      name: f.name || '',
      brand: f.brand || 'Noor Optics',
      price: f.selling_price_paise ? formatINR(f.selling_price_paise, true) : (f.selling_price_inr ? formatINR(f.selling_price_inr * 100, true) : ''),
      copies: copies
    }));

    const payload = {
      items: items,
      paperWidthMm: 58,
      qrPreset: activePreset
    };

    try {
      let res;
      try {
        res = await apiFetch('/api/printer/print-qr-sticker', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } catch (cloudErr) {
        // Cloud fallback: try local POS hardware bridge on port 3000
        const localResp = await fetch('http://127.0.0.1:3000/api/printer/print-qr-sticker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        res = await localResp.json();
      }

      if (res && res.success) {
        showToast(`✓ All ${count} stickers printed one after another in sequence!`, 'success');
        if (txtBatch) txtBatch.textContent = `✓ Printed ${count} in Sequence!`;
        setTimeout(() => {
          updateBatchStickersButton();
        }, 3500);
      } else {
        showToast('Printer response: ' + (res?.error || 'Check printer connection'), 'error');
        openBatchStickersModal(frameIds);
        updateBatchStickersButton();
      }
    } catch (err) {
      showToast('Could not reach POS printer: ' + err.message + '. Opening preview modal...', 'error');
      openBatchStickersModal(frameIds);
      updateBatchStickersButton();
    } finally {
      if (btnBatch) btnBatch.disabled = state.selectedFrameIds.size === 0;
    }
  }

  window.openSingleStickerModal = function (frameId) {
    const frame = state.inventoryList.find(p => p.id === frameId);
    if (!frame) return;

    state.activeStickerFrame = frame;
    state.activeBatchStickerIds = [frameId];

    const modal = document.getElementById('modal-qr-sticker');
    if (modal) {
      modal.classList.add('open');
      const activePreset = document.querySelector('input[name="stk-preset-choice"]:checked')?.value || 'standard';
      const w = activePreset === 'temple' ? 38 : 50;
      const h = activePreset === 'temple' ? 18 : 25;
      const stage = document.getElementById('stk-preview-stage');
      const qrSize = activePreset === 'temple' ? 'temple' : 'medium';
      renderSingleStickerCard(stage, frame, w, h, '', true, qrSize);

      const btnDirect = document.getElementById('btn-direct-thermal-print');
      if (btnDirect) {
        btnDirect.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <span>⚡ Print to POS Thermal Printer</span>
        `;
      }
    }
  };

  window.openBatchStickersModal = function (frameIds) {
    if (!frameIds || frameIds.length === 0) {
      showToast('No frames selected for sticker printing.', 'warning');
      return;
    }

    state.activeBatchStickerIds = frameIds;
    const firstFrame = state.inventoryList.find(p => p.id === frameIds[0]);
    state.activeStickerFrame = firstFrame;

    const modal = document.getElementById('modal-qr-sticker');
    if (modal) {
      modal.classList.add('open');
      const activePreset = document.querySelector('input[name="stk-preset-choice"]:checked')?.value || 'standard';
      const w = activePreset === 'temple' ? 38 : 50;
      const h = activePreset === 'temple' ? 18 : 25;
      const stage = document.getElementById('stk-preview-stage');
      const qrSize = activePreset === 'temple' ? 'temple' : 'medium';
      renderSingleStickerCard(stage, firstFrame, w, h, '', true, qrSize);

      const btnDirect = document.getElementById('btn-direct-thermal-print');
      if (btnDirect) {
        btnDirect.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <span>⚡ Print All ${frameIds.length} Stickers in Sequence to POS-80</span>
        `;
      }
    }
  };

  /**
   * Helper: Generate QR Code as Base64 Data URL
   * Guarantees pure crisp vector image data with high resolution (320px).
   */
  function generateQrDataUrl(text, size = 320) {
    return new Promise((resolve) => {
      function renderWithQrCode() {
        if (!window.QRCode) {
          resolve('');
          return;
        }

        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.style.width = `${size}px`;
        tempDiv.style.height = `${size}px`;
        document.body.appendChild(tempDiv);

        try {
          new window.QRCode(tempDiv, {
            text: text,
            width: size,
            height: size,
            colorDark: '#000000',
            colorLight: '#FFFFFF',
            correctLevel: window.QRCode.CorrectLevel.M
          });

          let attempts = 0;
          const poll = setInterval(() => {
            attempts++;
            const canvas = tempDiv.querySelector('canvas');
            const img = tempDiv.querySelector('img');
            let dataUrl = '';
            if (canvas && canvas.width > 0) {
              try { dataUrl = canvas.toDataURL('image/png'); } catch (e) {}
            }
            if (!dataUrl && img && img.src && img.src.startsWith('data:image')) {
              dataUrl = img.src;
            }

            if (dataUrl || attempts >= 15) {
              clearInterval(poll);
              tempDiv.remove();
              resolve(dataUrl || '');
            }
          }, 20);
        } catch (err) {
          tempDiv.remove();
          resolve('');
        }
      }

      if (window.QRCode) {
        renderWithQrCode();
      } else {
        let waitCount = 0;
        const waitTimer = setInterval(() => {
          waitCount++;
          if (window.QRCode) {
            clearInterval(waitTimer);
            renderWithQrCode();
          } else if (waitCount > 25) {
            clearInterval(waitTimer);
            resolve('');
          }
        }, 40);
      }
    });
  }

  /**
   * Build Pure HTML for One Bright-Yellow Frame QR Sticker
   * ZERO STORE HEADER & PHONE NUMBER. Genuine Square Crisp QR Code.
   */
  function buildStickerHtml(frame, widthMm, heightMm, contactText, qrDataUrl, qrSize = 'medium') {
    const sku = frame.sku || frame.id || 'NOOR-FRAME';
    const brand = frame.brand || 'Noor Optics';
    const name = frame.name || '';
    const price = frame.selling_price_paise ? formatINR(frame.selling_price_paise, true) : '';

    // Proportional dimensions: enlarged crisp QR (~18.5mm) for instant smartphone scanning
    let qrMm = 18.5;
    if (qrSize === 'tiny' || qrSize === 'temple') qrMm = 14;
    else if (qrSize === 'small') qrMm = 16;
    else if (qrSize === 'medium' || qrSize === 'standard') qrMm = 18.5;
    else if (qrSize === 'large') qrMm = Math.max(20, Math.min(heightMm - 5, widthMm * 0.42));

    const skuPt = heightMm <= 20 ? '7.5pt' : (heightMm <= 26 ? '9.8pt' : '11.5pt');
    const namePt = heightMm <= 20 ? '5.2pt' : '6.5pt';
    const brandPt = heightMm <= 20 ? '4.5pt' : '5.5pt';
    const footerPt = heightMm <= 20 ? '4pt' : '5pt';

    return `
      <div class="frame-sticker" style="width:${widthMm}mm; height:${heightMm}mm; background-color:#FFE500 !important; color:#000000 !important; box-sizing:border-box; border-radius:2mm; padding:1.5mm 1.8mm; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; position:relative; border:0.5px solid rgba(0,0,0,0.35); font-family:'Plus Jakarta Sans', -apple-system, sans-serif; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; margin:0 auto;">
        <!-- Body Row: Pure Crisp Square QR on Left + Frame SKU on Right (ZERO TOP HEADER) -->
        <div style="display:flex; align-items:center; justify-content:space-between; gap:2mm; flex:1; min-height:0;">
          <!-- Genuine High-Contrast Square QR Box with Quiet Zone -->
          <div style="width:${qrMm}mm; height:${qrMm}mm; background:#FFFFFF; padding:0.6mm; border-radius:1mm; display:flex; align-items:center; justify-content:center; flex-shrink:0; border:0.5px solid rgba(0,0,0,0.5); box-sizing:border-box;">
            ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:100%; height:100%; display:block; object-fit:contain; image-rendering:pixelated;" />` : `<div style="font-size:5pt; font-weight:bold;">QR</div>`}
          </div>

          <!-- Frame Identification -->
          <div style="flex:1; display:flex; flex-direction:column; justify-content:center; text-align:left; overflow:hidden; padding-left:0.5mm;">
            <div style="font-size:${skuPt}; font-weight:900; line-height:1.15; letter-spacing:0.02em; color:#000000 !important; overflow-wrap:break-word; word-break:normal;">
              ${escapeHtml(sku)}
            </div>
            ${name ? `<div style="font-size:${namePt}; font-weight:700; color:#1E293B; margin-top:0.3mm; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(name)}</div>` : ''}
            <div style="font-size:${brandPt}; font-weight:600; color:#334155; margin-top:0.2mm; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(brand)}
            </div>
            ${price ? `<div style="font-size:${namePt}; font-weight:800; color:#000000; margin-top:0.3mm;">${price}</div>` : ''}
          </div>
        </div>

        <!-- Clean Bottom Line: NO STORE HEADER, NO PHONE NUMBER -->
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:${footerPt}; font-weight:800; line-height:1; border-top:0.5px solid rgba(0,0,0,0.35); padding-top:0.5mm; color:#111111; letter-spacing:0.04em;">
          <span>NOOR OPTICS</span>
          <span>AUTHENTIC</span>
        </div>
      </div>
    `;
  }

  /**
   * Render One Bright-Yellow Frame QR Sticker inside an on-screen container (Modal preview)
   */
  async function renderSingleStickerCard(container, frame, widthMm, heightMm, contactText, isPreview = false, qrSize = 'medium') {
    container.innerHTML = '';
    const qrPayload = `https://nooroptics.vercel.app/qr/${encodeURIComponent(frame.sku || frame.id)}`;
    const qrDataUrl = await generateQrDataUrl(qrPayload, 320);
    container.innerHTML = buildStickerHtml(frame, widthMm, heightMm, '', qrDataUrl, qrSize);
  }

  /**
   * Execute Sticker Print with 100% Suppression of Browser Date, Time, Project Title & URL
   * Opens a clean dedicated popup window with @page { margin: 0; }
   */
  async function executeStickerPrint() {
    const activePreset = document.querySelector('input[name="stk-preset-choice"]:checked')?.value || 'standard';
    const w = activePreset === 'temple' ? 38 : 50;
    const h = activePreset === 'temple' ? 18 : 25;
    const qrSize = activePreset === 'temple' ? 'temple' : 'medium';
    const layout = activePreset === 'a4_sheet' ? 'a4_sheet' : 'individual';
    const cols = 4;
    const copies = parseInt(document.getElementById('stk-copies-count')?.value || '1', 10);

    const targetIds = state.activeBatchStickerIds && state.activeBatchStickerIds.length > 0
      ? state.activeBatchStickerIds
      : [state.activeStickerFrame.id];

    showToast('Preparing crisp sticker(s) for printer...', 'info');

    // 1. Pre-generate all QR Base64 Data URLs
    const stickerPayloads = [];
    for (const id of targetIds) {
      const frame = state.inventoryList.find(p => p.id === id) || state.activeStickerFrame;
      if (!frame) continue;
      const qrPayload = `https://nooroptics.vercel.app/qr/${encodeURIComponent(frame.sku || frame.id)}`;
      const qrDataUrl = await generateQrDataUrl(qrPayload, 320);
      stickerPayloads.push({ frame, qrDataUrl });
    }

    // 2. Build Print Body HTML
    let printBodyHtml = '';
    const isRoll = (layout === 'individual');

    if (isRoll) {
      // Individual Roll Mode: Each sticker is a distinct page with exact label dimensions
      for (const item of stickerPayloads) {
        for (let c = 0; c < copies; c++) {
          printBodyHtml += `
            <div class="roll-sticker-wrapper" style="page-break-after:always; break-after:page; margin:0; padding:1.5mm 0; width:${w}mm; min-height:${h}mm; display:flex; flex-direction:column; align-items:center; justify-content:center;">
              ${buildStickerHtml(item.frame, w, h, '', item.qrDataUrl, qrSize)}
              <div style="width:100%; border-bottom:0.5px dashed #888888; margin-top:2.5mm;"></div>
            </div>
          `;
        }
      }
    } else {
      // Multiple Stickers on A4 Sheet Grid
      printBodyHtml += `
        <div style="display:grid; grid-template-columns:repeat(${cols}, ${w}mm); gap:2.5mm; padding:4mm; box-sizing:border-box;">
      `;
      for (const item of stickerPayloads) {
        for (let c = 0; c < copies; c++) {
          printBodyHtml += `
            <div style="border:0.5px dashed #888888; padding:1mm; display:flex; align-items:center; justify-content:center;">
              ${buildStickerHtml(item.frame, w, h, '', item.qrDataUrl, qrSize)}
            </div>
          `;
        }
      }
      printBodyHtml += `</div>`;
    }

    // 3. Open dedicated popup window for browser print (100% reliable)
    const printWin = window.open('', '_blank', 'width=700,height=700');
    if (!printWin) {
      showToast('Browser blocked print popup. Please allow popups or use the POS Thermal button.', 'warning');
      return;
    }

    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title></title>
        <style>
          @page { size: auto; margin: 0mm !important; }
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            margin: 0 auto !important;
            padding: 0 !important;
            width: ${isRoll ? `${Math.min(w, 58)}mm` : 'auto'} !important;
            max-width: ${isRoll ? '58mm' : 'none'} !important;
            background: #FFFFFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        ${printBodyHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          };
        <\/script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. SECTION: IN-STORE POS — CAMERA SCANNING, CART & BILLING
  // ═══════════════════════════════════════════════════════════════════════════
  async function loadPosCatalog() {
    try {
      if (state.inventoryList.length === 0) {
        const res = await apiFetch('/api/products');
        state.inventoryList = Array.isArray(res) ? res : [];
      }
      renderPosCatalog();
      updatePosCartUI();

      // Check URL params: if opened via public /qr/:code handoff (?scan=SKU)
      const urlParams = new URLSearchParams(window.location.search);
      const scanCode = urlParams.get('scan');
      if (scanCode) {
        window.history.replaceState({}, document.title, window.location.pathname);
        resolveAndAddFrameToPos(scanCode);
      }
    } catch (err) {
      console.error('Failed to load POS catalog:', err);
    }
  }

  function renderPosCatalog() {
    const grid = document.getElementById('pos-catalog-grid');
    if (!grid) return;

    const shape = state.posSelectedShape;
    const query = state.posSearchQuery.toLowerCase().trim();

    const filtered = state.inventoryList.filter(p => {
      if (shape !== 'all' && p.shape !== shape) return false;
      if (query) {
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        if (!name.includes(query) && !sku.includes(query)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:2rem; color:#9CA3AF;">No frames match the filter.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const stock = Number(p.total_stock) || 0;
      let stockClass = 'pos-item-stock';
      if (stock === 0) stockClass += ' out';
      else if (stock <= 5) stockClass += ' low';

      return `
        <div class="pos-item-card" onclick="addFrameToPosCart('${p.id}')" title="Click to add to bill">
          <img src="${escapeHtml(p.image_url || 'images/stockholm_noir.jpg')}" alt="${escapeHtml(p.name)}" class="pos-item-img" onerror="this.src='images/stockholm_noir.jpg'" />
          <div class="pos-item-name">${escapeHtml(p.name)}</div>
          <div class="pos-item-sku">${escapeHtml(p.sku)}</div>
          <div class="pos-item-bottom">
            <span class="pos-item-price">${formatINR(p.selling_price_inr)}</span>
            <span class="${stockClass}">${stock > 0 ? `${stock} in stock` : 'Out of stock'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Add Frame to Active Draft Bill ────────────────────────────────────────
  window.addFrameToPosCart = function (productId) {
    const frame = state.inventoryList.find(p => p.id === productId);
    if (!frame) return;

    const variant = (frame.variants && frame.variants[0]) || {
      id: `var-${frame.id}-1`,
      color_name: 'Standard'
    };

    const stock = Number(frame.total_stock) || 0;
    if (stock <= 0) {
      showToast(`Cannot add "${frame.name}": Out of stock!`, 'warning');
      return;
    }

    const existingIndex = state.posCart.findIndex(i => i.productId === frame.id);
    if (existingIndex > -1) {
      // Increase quantity
      if (state.posCart[existingIndex].quantity >= stock) {
        showToast(`Stock limit reached for "${frame.name}". Only ${stock} units available.`, 'warning');
        return;
      }
      state.posCart[existingIndex].quantity += 1;
      state.posCart[existingIndex].lineTotalINR = state.posCart[existingIndex].quantity * state.posCart[existingIndex].priceINR;
      state.posCart[existingIndex].lineTotalPaise = state.posCart[existingIndex].quantity * state.posCart[existingIndex].pricePaise;
    } else {
      // Add fresh line
      const pricePaise = frame.selling_price_paise;
      const priceINR = frame.selling_price_inr || pricePaise / 100;
      state.posCart.push({
        productId: frame.id,
        variantId: variant.id,
        name: frame.name,
        sku: frame.sku,
        color: variant.color_name || 'Standard',
        priceINR,
        pricePaise,
        quantity: 1,
        maxStock: stock,
        lineTotalINR: priceINR,
        lineTotalPaise: pricePaise
      });
    }

    playScannerBeep();
    updatePosCartUI();
  };

  // ── Resolve QR Code & Add to Bill ─────────────────────────────────────────
  async function resolveAndAddFrameToPos(rawCode) {
    if (!rawCode || !rawCode.trim()) return;
    const cleanCode = rawCode.trim();

    // Prevent repeated immediate duplicate scans of the same frame within 2.5 seconds
    const now = Date.now();
    if (state.lastScannedCode === cleanCode && (now - state.lastScanTime) < 2500) {
      return;
    }
    state.lastScannedCode = cleanCode;
    state.lastScanTime = now;

    const feedbackEl = document.getElementById('pos-scan-feedback');
    if (feedbackEl) {
      feedbackEl.style.display = 'block';
      feedbackEl.className = 'scan-status-notice';
      feedbackEl.textContent = `Resolving frame: ${cleanCode}...`;
    }

    try {
      // If code is a full URL (e.g., https://nooroptics.vercel.app/qr/NOOR-OSLO-01), extract code
      let skuOrId = cleanCode;
      if (cleanCode.includes('/qr/')) {
        skuOrId = cleanCode.split('/qr/')[1].split('?')[0].split('#')[0];
      }

      const res = await apiFetch(`/api/qr/resolve/${encodeURIComponent(skuOrId)}`);
      if (res.found && res.product) {
        const prod = res.product;

        if (prod.availableQty <= 0) {
          if (feedbackEl) {
            feedbackEl.className = 'scan-status-notice error';
            feedbackEl.textContent = `⚠️ Frame "${prod.name}" (${prod.sku}) is currently OUT OF STOCK.`;
          }
          showToast(`Frame "${prod.name}" is OUT OF STOCK.`, 'warning');
          return;
        }

        // Add to active cart
        const existingIndex = state.posCart.findIndex(i => i.productId === prod.productId || i.sku === prod.sku);
        if (existingIndex > -1) {
          if (state.posCart[existingIndex].quantity >= prod.availableQty) {
            showToast(`Maximum stock reached for "${prod.name}". Available: ${prod.availableQty}`, 'warning');
            return;
          }
          state.posCart[existingIndex].quantity += 1;
          state.posCart[existingIndex].lineTotalINR = state.posCart[existingIndex].quantity * state.posCart[existingIndex].priceINR;
          state.posCart[existingIndex].lineTotalPaise = state.posCart[existingIndex].quantity * state.posCart[existingIndex].pricePaise;
        } else {
          state.posCart.push({
            productId: prod.productId,
            variantId: prod.variantId,
            name: prod.name,
            sku: prod.sku,
            color: prod.colorName || 'Standard',
            priceINR: prod.sellingPriceINR,
            pricePaise: prod.sellingPricePaise,
            quantity: 1,
            maxStock: prod.availableQty,
            lineTotalINR: prod.sellingPriceINR,
            lineTotalPaise: prod.sellingPricePaise
          });
        }

        playScannerBeep();
        if (feedbackEl) {
          feedbackEl.className = 'scan-status-notice success';
          feedbackEl.textContent = `✓ Added "${prod.name}" (${prod.sku}) — ${formatINR(prod.sellingPriceINR)}`;
          setTimeout(() => { feedbackEl.style.display = 'none'; }, 3000);
        }

        updatePosCartUI();
      }
    } catch (err) {
      if (feedbackEl) {
        feedbackEl.className = 'scan-status-notice error';
        feedbackEl.textContent = `Scan Error: Frame "${cleanCode}" not found in catalog.`;
      }
      showToast(`Scan Error: Frame not found: ${cleanCode}`, 'error');
    }
  }

  function updatePosCartUI() {
    const listEl = document.getElementById('pos-cart-items-list');
    const countEl = document.getElementById('pos-cart-count');
    const subtotalEl = document.getElementById('pos-subtotal-val');
    const discountValEl = document.getElementById('pos-discount-val');
    const discountInput = document.getElementById('pos-discount-amount');
    const taxEl = document.getElementById('pos-tax-val');
    const grandTotalEl = document.getElementById('pos-grand-total-val');
    const btnCheckout = document.getElementById('btn-pos-confirm-checkout');

    if (!listEl) return;

    if (state.posCart.length === 0) {
      listEl.innerHTML = `
        <div class="pos-cart-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <p>Bill is currently empty.<br/>Scan a yellow frame QR sticker or tap any frame from the catalog.</p>
        </div>
      `;
      if (countEl) countEl.textContent = '0 frames added';
      if (subtotalEl) subtotalEl.textContent = '₹0.00';
      if (discountValEl) discountValEl.textContent = '-₹0.00';
      if (taxEl) taxEl.textContent = '₹0.00';
      if (grandTotalEl) grandTotalEl.textContent = '₹0.00';
      if (btnCheckout) btnCheckout.disabled = true;
      return;
    }

    let subtotalPaise = 0;
    let totalItems = 0;

    listEl.innerHTML = state.posCart.map((item, idx) => {
      subtotalPaise += item.lineTotalPaise;
      totalItems += item.quantity;

      return `
        <div class="pos-cart-line-item">
          <div class="cart-item-info">
            <span class="cart-item-name">${escapeHtml(item.name)}</span>
            <span class="cart-item-sku">${escapeHtml(item.sku)} • ${escapeHtml(item.color)}</span>
          </div>
          <div class="cart-item-qty-ctrl">
            <button type="button" class="btn-qty" onclick="changePosItemQty(${idx}, -1)">−</button>
            <span style="font-weight:700; width:18px; text-align:center;">${item.quantity}</span>
            <button type="button" class="btn-qty" onclick="changePosItemQty(${idx}, 1)">+</button>
          </div>
          <div class="cart-item-total">${formatINR(item.lineTotalINR)}</div>
          <button type="button" class="btn-remove-cart-item" onclick="removePosItem(${idx})" title="Remove frame">&times;</button>
        </div>
      `;
    }).join('');

    const discountINR = parseFloat(discountInput ? discountInput.value : 0) || 0;
    const discountPaise = Math.round(discountINR * 100);
    const netBasePaise = Math.max(0, subtotalPaise - discountPaise);
    // GST 18% inclusive
    const taxPaise = Math.round(netBasePaise - (netBasePaise / 1.18));
    const grandTotalPaise = netBasePaise;

    if (countEl) countEl.textContent = `${totalItems} frame${totalItems > 1 ? 's' : ''} in bill`;
    if (subtotalEl) subtotalEl.textContent = formatINR(subtotalPaise, true);
    if (discountValEl) discountValEl.textContent = `-${formatINR(discountPaise, true)}`;
    if (taxEl) taxEl.textContent = formatINR(taxPaise, true);
    if (grandTotalEl) grandTotalEl.textContent = formatINR(grandTotalPaise, true);
    if (btnCheckout) btnCheckout.disabled = false;

    // Update dynamic UPI QR if visible
    if (state.posPaymode === 'UPI_GPAY') {
      renderPosDynamicUpiQr(grandTotalPaise / 100);
    }
  }

  window.changePosItemQty = function (idx, delta) {
    if (!state.posCart[idx]) return;
    const newQty = state.posCart[idx].quantity + delta;
    if (newQty <= 0) {
      removePosItem(idx);
      return;
    }
    if (newQty > state.posCart[idx].maxStock) {
      showToast(`Cannot add more. Max stock is ${state.posCart[idx].maxStock}.`, 'warning');
      return;
    }
    state.posCart[idx].quantity = newQty;
    state.posCart[idx].lineTotalINR = newQty * state.posCart[idx].priceINR;
    state.posCart[idx].lineTotalPaise = newQty * state.posCart[idx].pricePaise;
    updatePosCartUI();
  };

  window.removePosItem = function (idx) {
    state.posCart.splice(idx, 1);
    updatePosCartUI();
  };

  function renderPosDynamicUpiQr(amountINR) {
    const qrContainer = document.getElementById('pos-dynamic-upi-qr');
    if (!qrContainer || !window.QRCode) return;
    qrContainer.innerHTML = '';

    const upiId = state.storeSettings.store_upi_id || 'nooroptics@okhdfcbank';
    const merchantName = encodeURIComponent(state.storeSettings.store_name || 'NOOR OPTICS');
    const upiUri = `upi://pay?pa=${upiId}&pn=${merchantName}&am=${amountINR.toFixed(2)}&cu=INR&tn=NoorPOSBill`;

    new window.QRCode(qrContainer, {
      text: upiUri,
      width: 70,
      height: 70,
      colorDark: '#000000',
      colorLight: '#FFFFFF',
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }

  // ── POS Camera Scanner Controls ───────────────────────────────────────────
  function setupPosCameraScanner() {
    const btnToggle = document.getElementById('btn-toggle-camera');
    const viewportWrap = document.getElementById('camera-viewport-wrap');
    const cameraDot = document.getElementById('camera-status-dot');
    const btnText = document.getElementById('btn-camera-text');
    const cameraDropdown = document.getElementById('camera-select-dropdown');

    if (!btnToggle || !window.Html5Qrcode) return;

    btnToggle.addEventListener('click', async () => {
      if (state.posScannerActive) {
        // Stop Camera
        await stopCameraScanner();
      } else {
        // Start Camera
        await startCameraScanner();
      }
    });

    async function startCameraScanner() {
      try {
        state.html5QrScanner = new window.Html5Qrcode('html5-qr-reader');
        const cameras = await window.Html5Qrcode.getCameras();

        if (!cameras || cameras.length === 0) {
          showToast('No camera devices detected on this computer/device.', 'warning');
          return;
        }

        viewportWrap.style.display = 'block';
        cameraDot.classList.add('active');
        btnText.textContent = 'Close Camera';
        state.posScannerActive = true;

        // Choose back camera (environment) if available, otherwise first camera
        const backCamera = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear')) || cameras[0];

        await state.html5QrScanner.start(
          backCamera.id,
          {
            fps: 15,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            resolveAndAddFrameToPos(decodedText);
          },
          (errorMessage) => {
            // Ignore normal frame scanning cycle
          }
        );
      } catch (err) {
        console.error('Error starting camera scanner:', err);
        showToast('Camera access denied or unavailable: ' + err.message, 'error');
        await stopCameraScanner();
      }
    }

    async function stopCameraScanner() {
      if (state.html5QrScanner) {
        try {
          await state.html5QrScanner.stop();
        } catch (e) {}
        state.html5QrScanner = null;
      }
      viewportWrap.style.display = 'none';
      cameraDot.classList.remove('active');
      btnText.textContent = 'Open Camera Scanner';
      state.posScannerActive = false;
    }
  }

  // ── USB / Bluetooth Keyboard Scanner Listener ─────────────────────────────
  function setupKeyboardScannerListener() {
    let keyBuffer = '';
    let lastKeyTime = Date.now();

    window.addEventListener('keydown', (e) => {
      // If typing inside an ordinary form input/textarea, ignore global capture
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      const scanInput = document.getElementById('pos-keyboard-scan-input');

      // Check for Enter key (typical barcode/QR scanner suffix)
      if (e.key === 'Enter') {
        if (keyBuffer.length >= 3) {
          if (state.activeNav === 'pos') {
            resolveAndAddFrameToPos(keyBuffer);
            keyBuffer = '';
            e.preventDefault();
            return;
          }
        }
        keyBuffer = '';
        return;
      }

      const now = Date.now();
      // Scanners type at > 50 chars/second (< 50ms per key)
      if (now - lastKeyTime > 150) {
        keyBuffer = '';
      }
      lastKeyTime = now;

      if (e.key.length === 1) {
        keyBuffer += e.key;
      }
    });

    // Manual input typing in POS search box
    const scanInput = document.getElementById('pos-keyboard-scan-input');
    if (scanInput) {
      scanInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = scanInput.value.trim();
          if (val) {
            resolveAndAddFrameToPos(val);
            scanInput.value = '';
          }
        }
      });
      scanInput.addEventListener('input', () => {
        state.posSearchQuery = scanInput.value;
        renderPosCatalog();
      });
    }

    const btnClear = document.getElementById('pos-btn-clear-search');
    if (btnClear && scanInput) {
      btnClear.addEventListener('click', () => {
        scanInput.value = '';
        state.posSearchQuery = '';
        renderPosCatalog();
      });
    }
  }

  // ── POS Payment & Checkout Submission ─────────────────────────────────────
  function setupPosCheckout() {
    const btnNewBill = document.getElementById('btn-pos-new-bill');
    const btnClearCart = document.getElementById('btn-clear-cart');
    const btnCheckout = document.getElementById('btn-pos-confirm-checkout');
    const discountInput = document.getElementById('pos-discount-amount');

    if (btnNewBill) {
      btnNewBill.addEventListener('click', () => {
        state.posCart = [];
        if (discountInput) discountInput.value = 0;
        document.getElementById('pos-cust-name').value = 'Walk-in Client';
        document.getElementById('pos-cust-phone').value = '';
        updatePosCartUI();
        showToast('New in-store bill started.', 'info');
      });
    }

    if (btnClearCart) {
      btnClearCart.addEventListener('click', () => {
        state.posCart = [];
        updatePosCartUI();
      });
    }

    if (discountInput) {
      discountInput.addEventListener('input', () => updatePosCartUI());
    }

    // Payment mode selection buttons
    document.querySelectorAll('.btn-pos-pm').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-pos-pm').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.posPaymode = btn.dataset.paymode;

        const upiCard = document.getElementById('pos-upi-display-card');
        if (upiCard) {
          upiCard.style.display = state.posPaymode === 'UPI_GPAY' ? 'block' : 'none';
          if (state.posPaymode === 'UPI_GPAY') {
            const grandTotalEl = document.getElementById('pos-grand-total-val');
            const total = parseFloat((grandTotalEl.textContent || '').replace(/[^0-9.]/g, '')) || 0;
            renderPosDynamicUpiQr(total);
          }
        }
      });
    });

    // Confirm Checkout
    if (btnCheckout) {
      btnCheckout.addEventListener('click', async () => {
        if (state.posCart.length === 0) return;

        btnCheckout.disabled = true;
        btnCheckout.innerHTML = `<span>Processing Sale...</span>`;

        try {
          const custName = document.getElementById('pos-cust-name').value.trim() || 'Walk-in Client';
          const custPhone = document.getElementById('pos-cust-phone').value.trim();
          const discountINR = parseFloat(discountInput ? discountInput.value : 0) || 0;
          const claimedUtr = document.getElementById('pos-claimed-utr') ? document.getElementById('pos-claimed-utr').value.trim() : null;

          const payload = {
            customerName: custName,
            customerPhone: custPhone || null,
            paymentMethod: state.posPaymode,
            discountINR,
            claimedUpiRef: claimedUtr,
            isVerifiedAtCounter: true,
            items: state.posCart.map(item => ({
              variantId: item.variantId,
              quantity: item.quantity,
              unitPricePaise: item.pricePaise
            }))
          };

          const res = await apiFetch('/api/pos/checkout', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

          showToast(`Sale completed! Invoice: ${res.invoiceNumber} (Token #${res.tokenNumber})`, 'success');

          // Reset cart
          state.posCart = [];
          if (discountInput) discountInput.value = 0;
          updatePosCartUI();

          // Refresh live datasets
          loadInventory();
          loadDashboard();
          loadOrders();

          // Open thermal receipt preview
          if (res.orderId) {
            previewThermalReceipt(res.orderId);
          }
        } catch (err) {
          showToast('Checkout failed: ' + err.message, 'error');
        } finally {
          btnCheckout.disabled = false;
          btnCheckout.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Confirm Checkout & Print Invoice</span>
          `;
        }
      });
    }
  }

  // ── Receipt & Token Printing Preview ──────────────────────────────────────
  window.previewThermalReceipt = function (orderId) {
    const modal = document.getElementById('modal-receipt-preview');
    const iframe = document.getElementById('receipt-preview-iframe');
    const btnPrint = document.getElementById('btn-iframe-print');

    if (!modal || !iframe) return;

    iframe.src = `/api/printer/orders/${orderId}/preview-html`;
    modal.classList.add('open');

    if (btnPrint) {
      btnPrint.onclick = () => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
      };
    }
  };

  // ── Stock Adjustment Modal ────────────────────────────────────────────────
  window.openStockAdjustModal = function (productId) {
    const modal = document.getElementById('modal-stock-adjust');
    const select = document.getElementById('adj-variant-select');
    const form = document.getElementById('form-stock-adjust');

    if (!modal || !select) return;

    // Populate variant select
    const frame = state.inventoryList.find(p => p.id === productId);
    const variants = frame && frame.variants ? frame.variants : [];

    select.innerHTML = variants.map(v => `
      <option value="${v.id}">
        ${escapeHtml(frame.name)} — ${escapeHtml(v.color_name || 'Standard')} (Current Stock: ${v.available_qty || 0})
      </option>
    `).join('') || `<option value="var-${productId}-1">${escapeHtml(frame ? frame.name : 'Frame')}</option>`;

    form.reset();
    modal.classList.add('open');

    form.onsubmit = async (e) => {
      e.preventDefault();
      const variantId = select.value;
      const changeQty = parseInt(document.getElementById('adj-qty-input').value, 10);
      const reason = document.getElementById('adj-reason-input').value.trim();

      try {
        await apiFetch('/api/inventory/adjust', {
          method: 'POST',
          body: JSON.stringify({ variantId, changeQty, reason })
        });
        showToast('Stock balance adjusted and audit ledger updated.', 'success');
        modal.classList.remove('open');
        loadInventory();
        loadDashboard();
      } catch (err) {
        showToast('Adjustment failed: ' + err.message, 'error');
      }
    };
  };

  // ── Login Overlay & Authentication ────────────────────────────────────────
  function showLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    const shell = document.getElementById('admin-shell');
    if (overlay) overlay.style.display = 'flex';
    if (shell) shell.style.display = 'none';
  }

  function hideLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    const shell = document.getElementById('admin-shell');
    if (overlay) overlay.style.display = 'none';
    if (shell) shell.style.display = 'flex';
  }

  function setupAuth() {
    const form = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Login failed');

          state.token = data.token;
          state.user = data.user;
          localStorage.setItem('noor_admin_token', data.token);

          updateUserPill();
          hideLoginOverlay();
          switchNav('dashboard');
          showToast(`Welcome back, ${data.user.name}!`, 'success');
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        state.token = null;
        state.user = null;
        localStorage.removeItem('noor_admin_token');
        showLoginOverlay();
        showToast('Signed out of retail workspace.', 'info');
      });
    }
  }

  function updateUserPill() {
    if (!state.user) return;
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-avatar');
    const cashierDisplay = document.getElementById('pos-cashier-display');

    if (nameEl) nameEl.textContent = state.user.name || 'Staff';
    if (roleEl) roleEl.textContent = state.user.roleName || 'Cashier';
    if (avatarEl) avatarEl.textContent = (state.user.name || 'S').charAt(0).toUpperCase();
    if (cashierDisplay) cashierDisplay.textContent = `Cashier: ${state.user.name || 'Staff'}`;
  }

  async function checkExistingAuth() {
    if (!state.token) {
      showLoginOverlay();
      return;
    }

    try {
      const res = await apiFetch('/api/auth/me');
      state.user = res.user;
      updateUserPill();
      hideLoginOverlay();

      // Load store settings
      const settings = await apiFetch('/api/settings').catch(() => null);
      if (settings) state.storeSettings = { ...state.storeSettings, ...settings };

      switchNav('dashboard');
    } catch (e) {
      showLoginOverlay();
    }
  }

  // ── Global Event Bindings ─────────────────────────────────────────────────
  function init() {
    // 1. Sidebar Nav Click Listeners (Strict 4 Items)
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      el.addEventListener('click', () => {
        switchNav(el.dataset.nav);
      });
    });

    // 2. Dashboard Shortcuts
    const scAddFrame = document.getElementById('sc-add-frame');
    if (scAddFrame) scAddFrame.addEventListener('click', () => { switchNav('inventory'); document.getElementById('btn-open-add-frame')?.click(); });

    const scPrintStk = document.getElementById('sc-print-sticker');
    if (scPrintStk) scPrintStk.addEventListener('click', () => { switchNav('inventory'); openSingleStickerModal(state.inventoryList[0]?.id); });

    const scStartBill = document.getElementById('sc-start-bill');
    if (scStartBill) scStartBill.addEventListener('click', () => { switchNav('pos'); document.getElementById('btn-pos-new-bill')?.click(); });

    const scScanner = document.getElementById('sc-open-scanner');
    if (scScanner) scScanner.addEventListener('click', () => { switchNav('pos'); document.getElementById('btn-toggle-camera')?.click(); });

    const scWebOrders = document.getElementById('sc-view-web-orders');
    if (scWebOrders) scWebOrders.addEventListener('click', () => { switchNav('orders'); document.getElementById('subtab-website')?.click(); });

    const scExport = document.getElementById('sc-export-report');
    if (scExport) scExport.addEventListener('click', () => { document.getElementById('btn-open-daily-report-modal')?.click(); });

    const dashViewAll = document.getElementById('dash-btn-view-all-orders');
    if (dashViewAll) dashViewAll.addEventListener('click', () => switchNav('orders'));

    const quickNewBill = document.getElementById('btn-quick-new-bill');
    if (quickNewBill) quickNewBill.addEventListener('click', () => { switchNav('pos'); document.getElementById('btn-pos-new-bill')?.click(); });

    // 3. Dashboard Date Filters
    document.querySelectorAll('.date-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.date-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.dashRange = btn.dataset.range;

        const customWrap = document.getElementById('dash-custom-date-wrap');
        if (customWrap) customWrap.style.display = state.dashRange === 'custom' ? 'flex' : 'none';

        if (state.dashRange !== 'custom') {
          loadDashboard();
        }
      });
    });

    const btnApplyCustom = document.getElementById('btn-apply-dash-custom');
    if (btnApplyCustom) {
      btnApplyCustom.addEventListener('click', () => {
        state.dashCustomStart = document.getElementById('dash-custom-start').value;
        state.dashCustomEnd = document.getElementById('dash-custom-end').value;
        if (!state.dashCustomStart || !state.dashCustomEnd) {
          showToast('Please select both start and end dates.', 'warning');
          return;
        }
        loadDashboard();
      });
    }

    const btnRefresh = document.getElementById('btn-refresh-dash');
    if (btnRefresh) btnRefresh.addEventListener('click', () => { loadDashboard(); showToast('Dashboard refreshed.', 'info'); });

    // 4. Orders Sub-Tabs Navigation
    const subtabInStore = document.getElementById('subtab-in-store');
    const subtabWebsite = document.getElementById('subtab-website');
    if (subtabInStore) {
      subtabInStore.addEventListener('click', () => {
        subtabInStore.classList.add('active');
        subtabWebsite?.classList.remove('active');
        state.ordersActiveChannel = 'POS';
        renderOrdersTable();
      });
    }
    if (subtabWebsite) {
      subtabWebsite.addEventListener('click', () => {
        subtabWebsite.classList.add('active');
        subtabInStore?.classList.remove('active');
        state.ordersActiveChannel = 'WEBSITE';
        renderOrdersTable();
      });
    }

    const ordersSearch = document.getElementById('orders-search-input');
    if (ordersSearch) {
      ordersSearch.addEventListener('input', () => {
        state.ordersSearchQuery = ordersSearch.value;
        renderOrdersTable();
      });
    }

    const ordersStatusFilter = document.getElementById('orders-status-filter');
    if (ordersStatusFilter) {
      ordersStatusFilter.addEventListener('change', () => {
        state.ordersStatusFilter = ordersStatusFilter.value;
        renderOrdersTable();
      });
    }

    const ordersPayFilter = document.getElementById('orders-payment-filter');
    if (ordersPayFilter) {
      ordersPayFilter.addEventListener('change', () => {
        state.ordersPaymentFilter = ordersPayFilter.value;
        renderOrdersTable();
      });
    }

    // 5. Total Inventory Search & Filters
    const invSearch = document.getElementById('inv-search-input');
    if (invSearch) {
      invSearch.addEventListener('input', () => {
        state.inventorySearchQuery = invSearch.value;
        renderInventoryTable();
      });
    }

    const invShapeFilter = document.getElementById('inv-filter-shape');
    if (invShapeFilter) {
      invShapeFilter.addEventListener('change', () => {
        state.inventoryShapeFilter = invShapeFilter.value;
        renderInventoryTable();
      });
    }

    const invStockFilter = document.getElementById('inv-filter-stock');
    if (invStockFilter) {
      invStockFilter.addEventListener('change', () => {
        state.inventoryStockFilter = invStockFilter.value;
        renderInventoryTable();
      });
    }

    const invSelectAll = document.getElementById('inv-select-all');
    if (invSelectAll) {
      invSelectAll.addEventListener('change', (e) => {
        if (e.target.checked) {
          state.inventoryList.forEach(p => state.selectedFrameIds.add(p.id));
        } else {
          state.selectedFrameIds.clear();
        }
        renderInventoryTable();
        updateBatchStickersButton();
      });
    }

    // 6. POS Catalog Shape Chips
    document.querySelectorAll('.pos-shape-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.pos-shape-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.posSelectedShape = chip.dataset.posShape;
        renderPosCatalog();
      });
    });

    // 7. Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
      });
    });

    // Close modal on clicking overlay backdrop
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
    });

    // Initialize Components
    setupAuth();
    setupAddFrameModal();
    setupStickerGenerator();
    setupImportModal();
    setupDailySalesReport();
    setupPosCameraScanner();
    setupKeyboardScannerListener();
    setupPosCheckout();

    // Verify session
    checkExistingAuth();
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
