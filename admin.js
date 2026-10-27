/**
 * Noor Optics — Admin Operations & POS Client Controller
 * Version: 2.0.0 (Unified Physical POS, Online Orders, UPI Verification & Finance)
 */

(function () {
  'use strict';

  // ── Global State ───────────────────────────────────────────────────────────
  const state = {
    token: localStorage.getItem('noor_admin_token') || null,
    user: null,
    activeNav: 'dashboard',
    posCatalog: [],
    posSelectedShape: 'all',
    posSearchQuery: '',
    posCart: [],
    posPaymode: 'CASH',
    variants: [],
    settings: {},
    pendingPaymentsCount: 0,
    currentVerifyPaymentId: null
  };

  // Helper for money formatting (Paise to INR)
  function formatINR(paise) {
    const num = (Number(paise) || 0) / 100;
    return '₹' + num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Toast notification system
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
    toast.className = `admin-toast toast-${type}`;
    const bgColors = {
      info: '#1F2937',
      success: '#059669',
      error: '#DC2626',
      warning: '#D97706'
    };
    toast.style.cssText = `
      background: ${bgColors[type] || '#1F2937'};
      color: #FFFFFF;
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 500;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.25s ease;
      pointer-events: auto;
      max-width: 360px;
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

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('noor_admin_token');
        state.token = null;
        state.user = null;
        showLoginOverlay();
        throw new Error('Session expired. Please sign in again.');
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.error || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  // ── Modal Management ──────────────────────────────────────────────────────
  function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  }

  function closeModal(modalId) {
    const el = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (el) el.classList.remove('active');
  }

  // Global close listener for buttons with data-close-modal or overlay clicks
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-close-modal]') || e.target.closest('[data-close-modal]')) {
      const overlay = e.target.closest('.modal-overlay');
      if (overlay) closeModal(overlay);
    } else if (e.target.classList.contains('modal-overlay')) {
      closeModal(e.target);
    }
  });

  // ── Authentication Lifecycle ──────────────────────────────────────────────
  function showLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    const shell = document.getElementById('admin-shell');
    if (overlay) overlay.style.display = 'flex';
    if (shell) shell.style.display = 'none';
  }

  function showAdminShell() {
    const overlay = document.getElementById('login-overlay');
    const shell = document.getElementById('admin-shell');
    if (overlay) overlay.style.display = 'none';
    if (shell) shell.style.display = 'flex';

    if (state.user) {
      document.getElementById('sidebar-user-name').textContent = state.user.full_name || state.user.email;
      document.getElementById('sidebar-user-role').textContent = state.user.role_name || state.user.role_id;
      document.getElementById('sidebar-avatar').textContent = (state.user.full_name || 'U').charAt(0).toUpperCase();
    }
  }

  async function checkAuthSession() {
    if (!state.token) {
      showLoginOverlay();
      return;
    }
    try {
      const res = await apiFetch('/api/auth/me');
      state.user = res.user;
      showAdminShell();
      initApp();
    } catch (err) {
      showLoginOverlay();
    }
  }

  // Handle Login Form Submit
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('btn-login-submit');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Authenticating...';

        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        state.token = res.token;
        state.user = res.user;
        localStorage.setItem('noor_admin_token', res.token);
        showToast(`Welcome back, ${res.user.full_name}!`, 'success');

        showAdminShell();
        initApp();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Workspace';
      }
    });
  }

  // Handle Logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        // Ignore logout errors
      }
      localStorage.removeItem('noor_admin_token');
      state.token = null;
      state.user = null;
      showToast('Signed out successfully.', 'info');
      showLoginOverlay();
    });
  }

  // ── Navigation Switching ──────────────────────────────────────────────────
  window.switchNav = function (navKey) {
    state.activeNav = navKey;

    // Update sidebar navigation pills
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.nav === navKey);
    });

    // Update page title
    const titles = {
      dashboard: 'Operations Dashboard',
      pos: 'Physical Store POS Register',
      orders: 'Customer Orders Pipeline',
      payments: 'Google Pay & UPI Payment Verification Desk',
      products: 'Handcrafted Eyewear Product Catalog',
      inventory: 'Stock Balances & Movement Ledger',
      purchases: 'Suppliers & Purchase Orders',
      customers: 'Boutique Customer CRM',
      invoices: 'Tax Invoices (A4 PDF)',
      expenses: 'Operating Expenses & Overheads',
      finance: 'Financials & Profit (P&L)',
      printer: '2" (58 mm) Thermal Printer Station',
      settings: 'Boutique & Payment QR Settings',
      staff: 'Staff & Role-Based Permissions',
      audit: 'System Audit Trail & Security Events'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = titles[navKey] || 'Noor Optics Management';

    // Show active view section
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `view-${navKey}`);
    });

    // View-specific data loader
    switch (navKey) {
      case 'dashboard':
        loadDashboardData();
        break;
      case 'pos':
        loadPOSCatalog();
        break;
      case 'orders':
        loadOrders();
        break;
      case 'payments':
        loadPendingPayments();
        break;
      case 'products':
        loadProducts();
        break;
      case 'inventory':
        loadInventoryBalances();
        loadStockMovements();
        break;
      case 'purchases':
        loadPurchaseOrders();
        loadSuppliers();
        break;
      case 'customers':
        loadCustomers();
        break;
      case 'invoices':
        loadInvoices();
        break;
      case 'expenses':
        loadExpenses();
        loadExpenseCategories();
        break;
      case 'finance':
        loadFinancePL();
        break;
      case 'printer':
        loadPrinterJobs();
        loadPrinterConfig();
        break;
      case 'settings':
        loadSettings();
        break;
      case 'staff':
        loadStaff();
        break;
      case 'audit':
        loadAuditLogs();
        break;
    }
  };

  // Attach nav clicks
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const navKey = item.dataset.nav;
      if (navKey) window.switchNav(navKey);
    });
  });

  const quickPosBtn = document.getElementById('btn-quick-pos');
  if (quickPosBtn) {
    quickPosBtn.addEventListener('click', () => window.switchNav('pos'));
  }

  // ── Initialize App ────────────────────────────────────────────────────────
  async function initApp() {
    await refreshPendingPaymentsBadge();
    window.switchNav(state.activeNav);
    // Poll pending UPI verification every 30 seconds
    setInterval(refreshPendingPaymentsBadge, 30000);
  }

  async function refreshPendingPaymentsBadge() {
    try {
      const res = await apiFetch('/api/payments/pending');
      const payments = Array.isArray(res) ? res : (res.payments || []);
      const count = payments.length;
      state.pendingPaymentsCount = count;

      const badge = document.getElementById('sidebar-pending-count');
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';
      }

      const dashPending = document.getElementById('dash-pending-upi');
      if (dashPending) dashPending.textContent = count;
    } catch (e) {
      // Ignore background badge error
    }
  }

  // ── 1. VIEW: DASHBOARD ────────────────────────────────────────────────────
  async function loadDashboardData() {
    try {
      const [finRes, ordersRes, stockRes] = await Promise.all([
        apiFetch('/api/finance/summary').catch(() => null),
        apiFetch('/api/orders?limit=6').catch(() => []),
        apiFetch('/api/inventory/balances?lowStockOnly=true').catch(() => [])
      ]);

      if (finRes) {
        document.getElementById('dash-revenue').textContent = formatINR(finRes.today_revenue_paise);
        document.getElementById('dash-orders-count').textContent = `${finRes.today_orders_count || 0} orders processed today`;
        document.getElementById('dash-profit').textContent = formatINR(finRes.gross_profit_paise);
        document.getElementById('dash-inv-value').textContent = formatINR(finRes.inventory_valuation_paise);
        document.getElementById('dash-stock-count').textContent = `${finRes.total_stock_units || 0} frames in boutique stock`;
      }

      // Recent Orders Table
      const ordersList = Array.isArray(ordersRes) ? ordersRes : (ordersRes.orders || []);
      const ordersTable = document.getElementById('dash-recent-orders');
      if (ordersTable) {
        if (ordersList.length === 0) {
          ordersTable.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#9CA3AF; padding:2rem;">No orders recorded yet.</td></tr>`;
        } else {
          ordersTable.innerHTML = ordersList.map(o => `
            <tr>
              <td><span class="badge-token">#${o.token_number}</span></td>
              <td><strong>${escapeHtml(o.order_number)}</strong></td>
              <td>${escapeHtml(o.customer_name || 'Walk-in Client')}</td>
              <td><span class="badge-status channel-${o.channel?.toLowerCase()}">${o.channel}</span></td>
              <td><strong>${formatINR(o.total_payable_paise || o.grand_total_paise)}</strong></td>
              <td><span class="badge-status status-${o.payment_status?.toLowerCase()}">${o.payment_status}</span></td>
              <td>
                <button class="btn-table-action" onclick="previewThermalReceipt('${o.id}')">Receipt</button>
              </td>
            </tr>
          `).join('');
        }
      }

      // Low Stock Table
      const stockList = Array.isArray(stockRes) ? stockRes : (stockRes.balances || []);
      const lowStockOnly = stockList.filter(b => (b.available_qty !== undefined ? b.available_qty : b.available_quantity) <= b.reorder_threshold);
      const stockTable = document.getElementById('dash-low-stock');
      if (stockTable) {
        if (lowStockOnly.length === 0) {
          stockTable.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#059669; padding:1.5rem;">All frames are adequately stocked!</td></tr>`;
        } else {
          stockTable.innerHTML = lowStockOnly.slice(0, 5).map(b => {
            const qty = b.available_qty !== undefined ? b.available_qty : b.available_quantity;
            return `
              <tr>
                <td><strong>${escapeHtml(b.product_name)}</strong></td>
                <td>${escapeHtml(b.color_name || 'Standard')}</td>
                <td><span style="font-weight:700; color:var(--accent-red);">${qty}</span></td>
                <td>${b.reorder_threshold}</td>
              </tr>
            `;
          }).join('');
        }
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    }
  }

  // ── 2. VIEW: PHYSICAL STORE POS REGISTER ──────────────────────────────────
  async function loadPOSCatalog() {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    try {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:2rem; color:#9CA3AF;">Loading optical frames...</div>';
      const res = await apiFetch('/api/products');
      state.posCatalog = res.products || [];
      renderPOSGrid();
    } catch (err) {
      grid.innerHTML = `<div style="grid-column:1/-1; color:var(--accent-red); padding:1rem;">Failed to load frames: ${err.message}</div>`;
    }
  }

  function renderPOSGrid() {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    const shape = state.posSelectedShape;
    const query = state.posSearchQuery.toLowerCase();

    const filtered = state.posCatalog.filter(p => {
      const matchShape = shape === 'all' || (p.frame_shape && p.frame_shape.toLowerCase() === shape.toLowerCase());
      const matchQuery = !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.variants && p.variants.some(v => (v.barcode && v.barcode.toLowerCase().includes(query)) || (v.sku && v.sku.toLowerCase().includes(query))));
      return matchShape && matchQuery;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:#9CA3AF;">No frames matched your search criteria.</div>';
      return;
    }

    grid.innerHTML = filtered.map(prod => {
      const variants = prod.variants || [];
      const totalStock = variants.reduce((sum, v) => sum + (v.available_quantity || 0), 0);
      const isOutOfStock = totalStock <= 0;

      return `
        <div class="pos-item-card ${isOutOfStock ? 'out-of-stock' : ''}">
          <img src="${prod.image_url || 'images/frames/copenhagen_amber.jpg'}" alt="${escapeHtml(prod.name)}" class="pos-item-thumb" onerror="this.src='images/frames/copenhagen_amber.jpg'" />
          <div class="pos-item-body">
            <span class="pos-item-sku">${escapeHtml(prod.sku)} • ${escapeHtml(prod.frame_shape || 'Optical')}</span>
            <div class="pos-item-name">${escapeHtml(prod.name)}</div>
            <div class="pos-item-price-row">
              <span class="pos-item-price">${formatINR(prod.selling_price_paise)}</span>
              <span class="pos-item-stock-tag" style="color:${isOutOfStock ? 'var(--accent-red)' : 'var(--accent-green)'}">
                ${isOutOfStock ? 'Out of Stock' : `${totalStock} in stock`}
              </span>
            </div>
            <div class="pos-variant-swatches">
              ${variants.map(v => `
                <button
                  type="button"
                  class="pos-swatch-btn ${v.available_quantity <= 0 ? 'disabled' : ''}"
                  style="border-color:${v.color_hex || '#CCC'};"
                  title="${escapeHtml(v.color_name || 'Variant')} (${v.available_quantity} avail)"
                  onclick="addVariantToPOSCart('${prod.id}', '${v.id}')"
                  ${v.available_quantity <= 0 ? 'disabled' : ''}>
                  ${escapeHtml(v.color_name || 'Standard')}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Filter pills handler
  document.querySelectorAll('#pos-shape-pills .pos-cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#pos-shape-pills .pos-cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.posSelectedShape = pill.dataset.posShape;
      renderPOSGrid();
    });
  });

  // Search input handler
  const posSearchInput = document.getElementById('pos-search-input');
  if (posSearchInput) {
    posSearchInput.addEventListener('input', (e) => {
      state.posSearchQuery = e.target.value.trim();
      renderPOSGrid();
    });
  }

  const posClearSearch = document.getElementById('pos-btn-clear-search');
  if (posClearSearch) {
    posClearSearch.addEventListener('click', () => {
      if (posSearchInput) posSearchInput.value = '';
      state.posSearchQuery = '';
      renderPOSGrid();
    });
  }

  // POS Cart Management
  window.addVariantToPOSCart = function (productId, variantId) {
    const product = state.posCatalog.find(p => p.id === productId);
    if (!product) return;
    const variant = product.variants?.find(v => v.id === variantId);
    if (!variant) return;

    if (variant.available_quantity <= 0) {
      showToast('This variant is out of stock.', 'warning');
      return;
    }

    const existingIndex = state.posCart.findIndex(i => i.variant_id === variantId);
    if (existingIndex > -1) {
      if (state.posCart[existingIndex].quantity + 1 > variant.available_quantity) {
        showToast(`Only ${variant.available_quantity} available in boutique stock.`, 'warning');
        return;
      }
      state.posCart[existingIndex].quantity += 1;
    } else {
      state.posCart.push({
        product_id: product.id,
        variant_id: variant.id,
        name: product.name,
        color: variant.color_name || 'Standard',
        sku: variant.sku || product.sku,
        unit_price_paise: product.selling_price_paise,
        quantity: 1,
        max_quantity: variant.available_quantity
      });
    }

    renderPOSCart();
  };

  window.updatePOSCartQty = function (variantId, delta) {
    const item = state.posCart.find(i => i.variant_id === variantId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      state.posCart = state.posCart.filter(i => i.variant_id !== variantId);
    } else if (newQty > item.max_quantity) {
      showToast(`Cannot exceed boutique inventory (${item.max_quantity}).`, 'warning');
    } else {
      item.quantity = newQty;
    }
    renderPOSCart();
  };

  window.removePOSCartItem = function (variantId) {
    state.posCart = state.posCart.filter(i => i.variant_id !== variantId);
    renderPOSCart();
  };

  function renderPOSCart() {
    const container = document.getElementById('pos-cart-items');
    if (!container) return;

    if (state.posCart.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; color:#9CA3AF; padding:2rem 0; font-size:0.85rem;">
          Cart is empty. Tap any optical frame on the left to add.
        </div>
      `;
      updatePOSTotals(0, 0);
      return;
    }

    let subtotalPaise = 0;
    container.innerHTML = state.posCart.map(item => {
      const lineTotal = item.unit_price_paise * item.quantity;
      subtotalPaise += lineTotal;
      return `
        <div class="pos-cart-item">
          <div class="pos-cart-item-info">
            <div class="pos-cart-item-title">${escapeHtml(item.name)}</div>
            <div class="pos-cart-item-meta">${escapeHtml(item.color)} • ${escapeHtml(item.sku)}</div>
            <div style="font-size:0.75rem; color:var(--charcoal); margin-top:2px;">
              ${formatINR(item.unit_price_paise)} × ${item.quantity} = <strong>${formatINR(lineTotal)}</strong>
            </div>
          </div>
          <div class="pos-cart-stepper">
            <button class="btn-qty" type="button" onclick="updatePOSCartQty('${item.variant_id}', -1)">−</button>
            <span class="qty-num">${item.quantity}</span>
            <button class="btn-qty" type="button" onclick="updatePOSCartQty('${item.variant_id}', 1)">+</button>
            <button class="btn-del" type="button" onclick="removePOSCartItem('${item.variant_id}')" title="Remove">&times;</button>
          </div>
        </div>
      `;
    }).join('');

    const discountInput = document.getElementById('pos-discount-input');
    const discountINR = Number(discountInput?.value) || 0;
    const discountPaise = Math.round(discountINR * 100);

    updatePOSTotals(subtotalPaise, discountPaise);
  }

  function updatePOSTotals(subtotalPaise, discountPaise) {
    const subtotalEl = document.getElementById('pos-subtotal');
    const taxEl = document.getElementById('pos-tax');
    const grandEl = document.getElementById('pos-grand-total');

    const payablePaise = Math.max(0, subtotalPaise - discountPaise);
    // GST 18% embedded
    const taxPaise = Math.round((payablePaise * 18) / 118);

    if (subtotalEl) subtotalEl.textContent = formatINR(subtotalPaise);
    if (taxEl) taxEl.textContent = formatINR(taxPaise);
    if (grandEl) grandEl.textContent = formatINR(payablePaise);
  }

  // Listen to discount input
  const posDiscountInput = document.getElementById('pos-discount-input');
  if (posDiscountInput) {
    posDiscountInput.addEventListener('input', () => {
      let subtotalPaise = state.posCart.reduce((sum, i) => sum + (i.unit_price_paise * i.quantity), 0);
      const discountINR = Number(posDiscountInput.value) || 0;
      updatePOSTotals(subtotalPaise, Math.round(discountINR * 100));
    });
  }

  // Payment mode toggle
  document.querySelectorAll('.btn-pos-paymode').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-pos-paymode').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.posPaymode = btn.dataset.paymode;

      const helper = document.getElementById('pos-gpay-helper');
      if (helper) {
        helper.style.display = state.posPaymode === 'UPI_GPAY' ? 'block' : 'none';
      }
    });
  });

  // Submit POS Sale & Trigger 58mm Printing
  const btnPosSubmit = document.getElementById('btn-pos-submit');
  if (btnPosSubmit) {
    btnPosSubmit.addEventListener('click', async () => {
      if (state.posCart.length === 0) {
        showToast('Cannot complete sale: Cart is empty.', 'warning');
        return;
      }

      const custName = document.getElementById('pos-cust-name')?.value.trim() || 'Walk-in Client';
      const custPhone = document.getElementById('pos-cust-phone')?.value.trim() || '';
      const discountINR = Number(posDiscountInput?.value) || 0;
      const claimedRef = document.getElementById('pos-upi-ref')?.value.trim() || '';

      const items = state.posCart.map(i => ({
        variant_id: i.variant_id,
        quantity: i.quantity,
        unit_price_paise: i.unit_price_paise
      }));

      btnPosSubmit.disabled = true;
      btnPosSubmit.textContent = 'Processing Sale & Deducting Stock...';

      try {
        const payload = {
          items,
          customer_name: custName,
          customer_phone: custPhone,
          payment_method: state.posPaymode,
          discount_paise: Math.round(discountINR * 100),
          claimed_upi_ref: claimedRef
        };

        const res = await apiFetch('/api/pos/checkout', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        showToast(`Sale recorded! Daily Token #${res.token_number} assigned.`, 'success');

        // Reset Cart
        state.posCart = [];
        if (posDiscountInput) posDiscountInput.value = '0';
        const upiRefInput = document.getElementById('pos-upi-ref');
        if (upiRefInput) upiRefInput.value = '';
        renderPOSCart();

        // Refresh catalog balances
        await loadPOSCatalog();

        // Trigger Receipt Preview Modal
        if (res.order_id) {
          previewThermalReceipt(res.order_id);
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btnPosSubmit.disabled = false;
        btnPosSubmit.textContent = 'COMPLETE SALE & PRINT TOKEN';
      }
    });
  }

  // ── 3. VIEW: ORDERS PIPELINE ──────────────────────────────────────────────
  async function loadOrders() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    const channel = document.getElementById('orders-filter-channel')?.value || '';
    const payment = document.getElementById('orders-filter-payment')?.value || '';

    try {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:#9CA3AF;">Loading orders...</td></tr>';
      let url = '/api/orders?';
      if (channel) url += `channel=${channel}&`;
      if (payment) url += `payment_status=${payment}&`;

      const res = await apiFetch(url);
      const orders = Array.isArray(res) ? res : (res.orders || []);

      if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:#9CA3AF;">No orders found.</td></tr>';
        return;
      }

      tbody.innerHTML = orders.map(o => `
        <tr>
          <td><span class="badge-token">#${o.token_number}</span></td>
          <td><strong>${escapeHtml(o.order_number)}</strong></td>
          <td><span class="badge-status channel-${o.channel?.toLowerCase()}">${o.channel}</span></td>
          <td>
            <strong>${escapeHtml(o.customer_name || 'Walk-in Client')}</strong><br/>
            <span style="font-size:0.75rem; color:#6B7280;">${escapeHtml(o.customer_phone || '')}</span>
          </td>
          <td style="font-size:0.75rem;">
            ${o.prescription_type ? `<strong>${escapeHtml(o.prescription_type)}</strong> • ` : ''}
            ${escapeHtml(o.lens_type || 'Standard Optical')}
          </td>
          <td><strong>${formatINR(o.total_payable_paise || o.grand_total_paise)}</strong></td>
          <td><span class="badge-status status-${o.payment_status?.toLowerCase()}">${o.payment_status}</span></td>
          <td style="font-size:0.75rem; color:#6B7280;">${new Date(o.created_at).toLocaleString()}</td>
          <td>
            <div style="display:flex; gap:4px;">
              <button class="btn-table-action" onclick="previewThermalReceipt('${o.id}')" title="58mm Token Receipt">Receipt</button>
              <a href="/api/invoices/order/${o.id}/pdf" target="_blank" class="btn-table-action" title="A4 Tax Invoice PDF">Invoice</a>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" style="color:var(--accent-red); padding:1rem;">Failed to load orders: ${err.message}</td></tr>`;
    }
  }

  document.getElementById('orders-filter-channel')?.addEventListener('change', loadOrders);
  document.getElementById('orders-filter-payment')?.addEventListener('change', loadOrders);

  // ── 4. VIEW: PAYMENT VERIFICATION (GOOGLE PAY / UPI DESK) ─────────────────
  async function loadPendingPayments() {
    const tbody = document.getElementById('payments-pending-body');
    if (!tbody) return;

    try {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:#9CA3AF;">Checking awaiting UPI payments...</td></tr>';
      const res = await apiFetch('/api/payments/pending');
      const payments = Array.isArray(res) ? res : (res.payments || []);
      state.pendingPaymentsCount = payments.length;

      const badge = document.getElementById('sidebar-pending-count');
      if (badge) {
        badge.textContent = payments.length;
        badge.style.display = payments.length > 0 ? 'inline-block' : 'none';
      }

      if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:#059669;">All UPI transactions have been verified!</td></tr>';
        return;
      }

      tbody.innerHTML = payments.map(p => `
        <tr>
          <td><span class="badge-token">#${p.token_number}</span></td>
          <td><strong>${escapeHtml(p.order_number)}</strong></td>
          <td>${escapeHtml(p.customer_name || 'Walk-in Client')}</td>
          <td><strong style="color:var(--accent-green); font-size:0.95rem;">${formatINR(p.amount_paise)}</strong></td>
          <td>
            <span style="font-family:monospace; background:#FEF3C7; color:#92400E; padding:2px 6px; border-radius:4px; font-weight:700;">
              ${escapeHtml(p.claimed_reference || 'None Provided')}
            </span>
          </td>
          <td style="font-size:0.75rem; color:#6B7280;">${new Date(p.created_at).toLocaleTimeString()}</td>
          <td>
            <button class="btn-table-action btn-primary" onclick="openPaymentVerifyModal('${p.id}', '${p.order_number}', '${p.token_number}', '${escapeHtml(p.customer_name || 'Client')}', ${p.amount_paise}, '${escapeHtml(p.claimed_reference || '')}')">
              Inspect & Verify
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:var(--accent-red); padding:1rem;">Failed to load payments: ${err.message}</td></tr>`;
    }
  }

  window.openPaymentVerifyModal = function (paymentId, orderRef, tokenNum, custName, amountPaise, claimedRef) {
    state.currentVerifyPaymentId = paymentId;

    document.getElementById('mv-order-ref').textContent = orderRef;
    document.getElementById('mv-token-num').textContent = `#${tokenNum}`;
    document.getElementById('mv-cust-name').textContent = custName;
    document.getElementById('mv-amount').textContent = formatINR(amountPaise);
    document.getElementById('mv-claimed-ref').textContent = claimedRef || 'No claimed UTR submitted';

    document.getElementById('mv-merchant-tx-id').value = '';
    document.getElementById('mv-notes').value = '';

    openModal('modal-payment-verify');
  };

  // Confirm Payment Verification
  const btnConfirmPayment = document.getElementById('btn-confirm-payment');
  if (btnConfirmPayment) {
    btnConfirmPayment.addEventListener('click', async () => {
      if (!state.currentVerifyPaymentId) return;

      const merchantTxId = document.getElementById('mv-merchant-tx-id').value.trim();
      const notes = document.getElementById('mv-notes').value.trim();

      try {
        btnConfirmPayment.disabled = true;
        btnConfirmPayment.textContent = 'Verifying in Ledger...';

        await apiFetch(`/api/payments/${state.currentVerifyPaymentId}/verify`, {
          method: 'POST',
          body: JSON.stringify({
            status: 'VERIFIED',
            merchant_transaction_id: merchantTxId,
            notes: notes || 'Verified by staff via Merchant App'
          })
        });

        showToast('Payment verified successfully! Order updated.', 'success');
        closeModal('modal-payment-verify');
        loadPendingPayments();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btnConfirmPayment.disabled = false;
        btnConfirmPayment.textContent = '✓ Confirm & Verify Payment';
      }
    });
  }

  // Reject Payment Claim
  const btnRejectPayment = document.getElementById('btn-reject-payment');
  if (btnRejectPayment) {
    btnRejectPayment.addEventListener('click', async () => {
      if (!state.currentVerifyPaymentId) return;

      const notes = document.getElementById('mv-notes').value.trim();
      if (!notes) {
        showToast('A reason is mandatory when rejecting a payment claim.', 'warning');
        return;
      }

      try {
        btnRejectPayment.disabled = true;
        btnRejectPayment.textContent = 'Rejecting...';

        await apiFetch(`/api/payments/${state.currentVerifyPaymentId}/verify`, {
          method: 'POST',
          body: JSON.stringify({
            status: 'REJECTED',
            notes: notes
          })
        });

        showToast('Payment claim rejected.', 'info');
        closeModal('modal-payment-verify');
        loadPendingPayments();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btnRejectPayment.disabled = false;
        btnRejectPayment.textContent = 'Reject Claim';
      }
    });
  }

  // ── 5. VIEW: PRODUCTS & FRAMES CATALOG ────────────────────────────────────
  async function loadProducts() {
    const tbody = document.getElementById('products-table-body');
    if (!tbody) return;

    try {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:#9CA3AF;">Loading eyewear catalog...</td></tr>';
      const res = await apiFetch('/api/products');
      const products = Array.isArray(res) ? res : (res.products || []);

      if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:#9CA3AF;">No frames in catalog.</td></tr>';
        return;
      }

      tbody.innerHTML = products.map(p => {
        const variants = p.variants || [];
        const totalStock = variants.reduce((s, v) => s + (v.available_qty !== undefined ? v.available_qty : (v.available_quantity || 0)), 0);
        return `
          <tr>
            <td>
              <img src="${p.image_url || 'images/frames/copenhagen_amber.jpg'}" alt="${escapeHtml(p.name)}" style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid #E5E7EB;" onerror="this.src='images/frames/copenhagen_amber.jpg'" />
            </td>
            <td>
              <strong>${escapeHtml(p.name)}</strong><br/>
              <span style="font-size:0.75rem; color:#6B7280;">${variants.length} colorway(s)</span>
            </td>
            <td><code>${escapeHtml(p.sku)}</code></td>
            <td>${escapeHtml(p.frame_shape || 'Optical')} • ${escapeHtml(p.frame_material || 'Acetate')}</td>
            <td><strong>${formatINR(p.selling_price_paise)}</strong></td>
            <td>${formatINR(p.purchase_cost_paise)}</td>
            <td>
              <span style="font-weight:700; color:${totalStock <= 5 ? 'var(--accent-red)' : 'var(--charcoal)'}">
                ${totalStock}
              </span>
            </td>
            <td><span class="badge-status status-verified">${p.is_active ? 'Active' : 'Archived'}</span></td>
            <td>
              <button class="btn-table-action" onclick="showToast('Edit frame: ${p.sku}', 'info')">Edit</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" style="color:var(--accent-red); padding:1rem;">Failed to load products: ${err.message}</td></tr>`;
    }
  }

  // ── 6. VIEW: STOCK & INVENTORY BALANCES ───────────────────────────────────
  async function loadInventoryBalances() {
    const tbody = document.getElementById('inventory-balances-body');
    if (!tbody) return;

    try {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:#9CA3AF;">Loading inventory ledger balances...</td></tr>';
      const res = await apiFetch('/api/inventory/balances');
      state.variants = Array.isArray(res) ? res : (res.balances || []);

      // Populate variant dropdown in adjustment modal
      const select = document.getElementById('adj-variant-select');
      if (select) {
        select.innerHTML = state.variants.map(v => {
          const qty = v.available_qty !== undefined ? v.available_qty : (v.available_quantity || 0);
          return `
            <option value="${v.variant_id}">
              ${escapeHtml(v.product_name)} — ${escapeHtml(v.color_name || 'Standard')} (Avail: ${qty})
            </option>
          `;
        }).join('');
      }

      if (state.variants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:#9CA3AF;">No inventory balances found.</td></tr>';
        return;
      }

      tbody.innerHTML = state.variants.map(b => {
        const qty = b.available_qty !== undefined ? b.available_qty : (b.available_quantity || 0);
        const isLow = qty <= b.reorder_threshold;
        const totalValPaise = (b.purchase_cost_paise || 0) * qty;
        return `
          <tr>
            <td><strong>${escapeHtml(b.product_name)}</strong></td>
            <td><code>${escapeHtml(b.variant_sku || '')}</code></td>
            <td><code>${escapeHtml(b.barcode || '')}</code></td>
            <td>${escapeHtml(b.color_name || 'Standard')}</td>
            <td>
              <span style="font-weight:700; color:${isLow ? 'var(--accent-red)' : 'inherit'};">
                ${qty} ${isLow ? '⚠️' : ''}
              </span>
            </td>
            <td>${b.reorder_threshold}</td>
            <td>${formatINR(b.purchase_cost_paise)}</td>
            <td><strong>${formatINR(totalValPaise)}</strong></td>
            <td>
              <button class="btn-table-action" onclick="openStockAdjustModal('${b.variant_id}')">Adjust</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" style="color:var(--accent-red); padding:1rem;">Failed to load inventory: ${err.message}</td></tr>`;
    }
  }

  async function loadStockMovements() {
    const tbody = document.getElementById('stock-movements-body');
    if (!tbody) return;

    try {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:2rem; color:#9CA3AF;">Loading stock movement ledger...</td></tr>';
      const res = await apiFetch('/api/inventory/movements?limit=20');
      const movements = Array.isArray(res) ? res : (res.movements || []);

      if (movements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:2rem; color:#9CA3AF;">No stock movements recorded yet.</td></tr>';
        return;
      }

      tbody.innerHTML = movements.map(m => `
        <tr>
          <td style="font-size:0.75rem; color:#6B7280;">${new Date(m.created_at).toLocaleString()}</td>
          <td><strong>${escapeHtml(m.product_name || '')}</strong></td>
          <td>${escapeHtml(m.color_name || '')}</td>
          <td><span class="badge-status channel-pos">${escapeHtml(m.movement_type)}</span></td>
          <td>
            <strong style="color:${m.quantity_change > 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">
              ${m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
            </strong>
          </td>
          <td>${m.balance_after}</td>
          <td style="font-size:0.75rem;">${escapeHtml(m.reason || '')}</td>
          <td style="font-size:0.75rem;">${escapeHtml(m.staff_name || 'System')}</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="color:var(--accent-red); padding:1rem;">Failed to load movements: ${err.message}</td></tr>`;
    }
  }

  window.openStockAdjustModal = function (variantId) {
    const select = document.getElementById('adj-variant-select');
    if (select && variantId) select.value = variantId;
    document.getElementById('adj-qty-input').value = '';
    document.getElementById('adj-reason-input').value = '';
    openModal('modal-stock-adjust');
  };

  document.getElementById('btn-trigger-stock-adjust')?.addEventListener('click', () => {
    window.openStockAdjustModal();
  });

  const formStockAdjust = document.getElementById('form-stock-adjust');
  if (formStockAdjust) {
    formStockAdjust.addEventListener('submit', async (e) => {
      e.preventDefault();
      const variant_id = document.getElementById('adj-variant-select').value;
      const quantity_change = parseInt(document.getElementById('adj-qty-input').value, 10);
      const reason = document.getElementById('adj-reason-input').value.trim();

      if (!quantity_change || isNaN(quantity_change)) {
        showToast('Please enter a valid non-zero quantity change.', 'warning');
        return;
      }
      if (!reason) {
        showToast('A mandatory audit reason is required for all stock adjustments.', 'warning');
        return;
      }

      try {
        await apiFetch('/api/inventory/adjust', {
          method: 'POST',
          body: JSON.stringify({ variant_id, quantity_change, reason })
        });

        showToast('Stock adjustment applied and ledger updated!', 'success');
        closeModal('modal-stock-adjust');
        loadInventoryBalances();
        loadStockMovements();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // ── 7. VIEW: SUPPLIERS & PURCHASES ────────────────────────────────────────
  async function loadPurchaseOrders() {
    const tbody = document.getElementById('po-table-body');
    if (!tbody) return;

    try {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#9CA3AF;">Loading purchase orders...</td></tr>';
      const res = await apiFetch('/api/purchase-orders');
      const pos = Array.isArray(res) ? res : (res.purchase_orders || []);

      if (pos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#9CA3AF;">No purchase orders recorded.</td></tr>';
        return;
      }

      tbody.innerHTML = pos.map(p => `
        <tr>
          <td><strong>${escapeHtml(p.po_number)}</strong></td>
          <td>${escapeHtml(p.supplier_name)}</td>
          <td><strong>${formatINR(p.total_amount_paise || p.total_cost_paise)}</strong></td>
          <td><span class="badge-status status-verified">${p.status}</span></td>
          <td style="font-size:0.75rem; color:#6B7280;">${new Date(p.created_at).toLocaleDateString()}</td>
          <td>
            ${p.status === 'ORDERED' ? `
              <button class="btn-table-action btn-success" onclick="receiveGoodsPO('${p.id}')">Receive Goods</button>
            ` : '<span style="font-size:0.75rem; color:#059669;">Stock Received ✓</span>'}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" style="color:var(--accent-red); padding:1rem;">Failed to load POs: ${err.message}</td></tr>`;
    }
  }

  async function loadSuppliers() {
    const tbody = document.getElementById('suppliers-table-body');
    if (!tbody) return;

    try {
      const res = await apiFetch('/api/suppliers');
      const suppliers = Array.isArray(res) ? res : (res.suppliers || []);

      if (suppliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:#9CA3AF;">No suppliers configured.</td></tr>';
        return;
      }

      tbody.innerHTML = suppliers.map(s => `
        <tr>
          <td><strong>${escapeHtml(s.name)}</strong></td>
          <td>${escapeHtml(s.contact_person || '—')}</td>
          <td>${escapeHtml(s.phone || '—')}</td>
          <td>${escapeHtml(s.email || '—')}</td>
          <td><code>${escapeHtml(s.gst_number || s.gstin || '—')}</code></td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--accent-red); padding:1rem;">Failed to load suppliers: ${err.message}</td></tr>`;
    }
  }

  window.receiveGoodsPO = async function (poId) {
    if (!confirm('Confirm receiving goods for this Purchase Order? Stock balances will be automatically credited.')) return;
    try {
      await apiFetch(`/api/purchase-orders/${poId}/receive`, { method: 'POST' });
      showToast('Goods received! Inventory balances credited.', 'success');
      loadPurchaseOrders();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ── 8. VIEW: CUSTOMERS CRM ────────────────────────────────────────────────
  async function loadCustomers() {
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    try {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#9CA3AF;">Loading customer directory...</td></tr>';
      const res = await apiFetch('/api/customers');
      const customers = Array.isArray(res) ? res : (res.customers || []);

      if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#9CA3AF;">No customers registered yet.</td></tr>';
        return;
      }

      tbody.innerHTML = customers.map(c => `
        <tr>
          <td><strong>${escapeHtml(c.name || c.full_name)}</strong></td>
          <td>${escapeHtml(c.phone || '—')}</td>
          <td>${escapeHtml(c.email || '—')}</td>
          <td>${escapeHtml(c.city || 'Flagship Store')}</td>
          <td><span class="badge-token">${c.total_orders || c.orders_count || 1}</span></td>
          <td><span class="badge-status status-verified">${c.prescription_json && c.prescription_json !== '{}' ? 'Prescription on File' : 'Standard Lenses'}</span></td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" style="color:var(--accent-red); padding:1rem;">Failed to load customers: ${err.message}</td></tr>`;
    }
  }

  // ── 9. VIEW: TAX INVOICES ─────────────────────────────────────────────────
  async function loadInvoices() {
    const tbody = document.getElementById('invoices-table-body');
    if (!tbody) return;

    try {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:2rem; color:#9CA3AF;">Loading tax invoices...</td></tr>';
      const res = await apiFetch('/api/invoices');
      const invoices = Array.isArray(res) ? res : (res.invoices || []);

      if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:2rem; color:#9CA3AF;">No invoices generated yet.</td></tr>';
        return;
      }

      tbody.innerHTML = invoices.map(inv => `
        <tr>
          <td><strong>${escapeHtml(inv.invoice_number)}</strong></td>
          <td>${escapeHtml(inv.order_number)}</td>
          <td>${escapeHtml(inv.customer_name || 'Walk-in Client')}</td>
          <td><strong>${formatINR(inv.grand_total_paise)}</strong></td>
          <td><span class="badge-status channel-pos">${inv.payment_method || 'CASH'}</span></td>
          <td><span class="badge-status status-verified">${inv.payment_status || inv.status || 'VERIFIED'}</span></td>
          <td style="font-size:0.75rem; color:#6B7280;">${new Date(inv.created_at).toLocaleDateString()}</td>
          <td>
            <a href="/api/invoices/${inv.id}/pdf" target="_blank" class="btn-table-action btn-primary" title="Download PDF">
              Download PDF
            </a>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="color:var(--accent-red); padding:1rem;">Failed to load invoices: ${err.message}</td></tr>`;
    }
  }

  // ── 10. VIEW: OPERATING EXPENSES ──────────────────────────────────────────
  async function loadExpenses() {
    const tbody = document.getElementById('expenses-table-body');
    if (!tbody) return;

    try {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:#9CA3AF;">Loading expenses...</td></tr>';
      const res = await apiFetch('/api/expenses');
      const expenses = Array.isArray(res) ? res : (res.expenses || []);

      if (expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:#9CA3AF;">No expenses recorded this period.</td></tr>';
        return;
      }

      tbody.innerHTML = expenses.map(e => `
        <tr>
          <td><code>#${escapeHtml(e.expense_number || e.id.substring(0, 8))}</code></td>
          <td><strong>${escapeHtml(e.category_name || 'Operating')}</strong></td>
          <td>${escapeHtml(e.title)}</td>
          <td><strong style="color:var(--accent-red);">${formatINR(e.amount_paise)}</strong></td>
          <td><span class="badge-status channel-pos">${e.payment_method || e.payment_mode || 'CASH'}</span></td>
          <td style="font-size:0.75rem; color:#6B7280;">${e.expense_date}</td>
          <td style="font-size:0.75rem;">${escapeHtml(e.created_by_name || e.recorded_by_name || 'Staff')}</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:var(--accent-red); padding:1rem;">Failed to load expenses: ${err.message}</td></tr>`;
    }
  }

  async function loadExpenseCategories() {
    try {
      const res = await apiFetch('/api/expenses/categories');
      const select = document.getElementById('exp-category');
      const categories = Array.isArray(res) ? res : (res.categories || []);
      if (select && categories) {
        select.innerHTML = categories.map(c => `
          <option value="${c.id}">${escapeHtml(c.name)}</option>
        `).join('');
      }
    } catch (e) {
      // Ignore
    }
  }

  document.getElementById('btn-add-expense')?.addEventListener('click', () => {
    document.getElementById('exp-title').value = '';
    document.getElementById('exp-amount').value = '';
    document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('exp-notes').value = '';
    openModal('modal-add-expense');
  });

  const formAddExpense = document.getElementById('form-add-expense');
  if (formAddExpense) {
    formAddExpense.addEventListener('submit', async (e) => {
      e.preventDefault();
      const category_id = document.getElementById('exp-category').value;
      const title = document.getElementById('exp-title').value.trim();
      const amountINR = Number(document.getElementById('exp-amount').value) || 0;
      const payment_mode = document.getElementById('exp-paymode').value;
      const expense_date = document.getElementById('exp-date').value;
      const notes = document.getElementById('exp-notes').value.trim();

      if (amountINR <= 0) {
        showToast('Please enter an expense amount greater than 0.', 'warning');
        return;
      }

      try {
        await apiFetch('/api/expenses', {
          method: 'POST',
          body: JSON.stringify({
            category_id,
            title,
            amount_paise: Math.round(amountINR * 100),
            payment_method: payment_mode,
            expense_date,
            notes
          })
        });

        showToast('Expense recorded successfully.', 'success');
        closeModal('modal-add-expense');
        loadExpenses();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // ── 11. VIEW: FINANCIALS & PROFIT (P&L) ────────────────────────────────────
  async function loadFinancePL() {
    try {
      const res = await apiFetch('/api/finance/pl');
      const pl = res.p_and_l || res || {};

      document.getElementById('fin-net-sales').textContent = formatINR(pl.net_sales_paise !== undefined ? pl.net_sales_paise : (pl.netSalesINR * 100));
      document.getElementById('fin-cogs').textContent = formatINR(pl.cogs_paise !== undefined ? pl.cogs_paise : (pl.cogsINR * 100));
      document.getElementById('fin-gross-profit').textContent = formatINR(pl.gross_profit_paise !== undefined ? pl.gross_profit_paise : (pl.grossProfitINR * 100));
      document.getElementById('fin-net-profit').textContent = formatINR(pl.operating_net_profit_paise !== undefined ? pl.operating_net_profit_paise : (pl.netOperatingProfitINR * 100));

      // Channel Breakdown
      const chEl = document.getElementById('fin-channel-summary');
      if (chEl) {
        if (pl.by_channel) {
          chEl.innerHTML = Object.entries(pl.by_channel).map(([ch, data]) => `
            <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid #F3F4F6;">
              <span><strong>${ch}</strong> (${data.count} sales)</span>
              <span style="font-weight:700;">${formatINR(data.total_paise)}</span>
            </div>
          `).join('');
        } else if (Array.isArray(pl.channelBreakdown)) {
          chEl.innerHTML = pl.channelBreakdown.map(c => `
            <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid #F3F4F6;">
              <span><strong>${c.channel}</strong> (${c.count} sales)</span>
              <span style="font-weight:700;">${formatINR(c.totalINR * 100)}</span>
            </div>
          `).join('');
        }
      }

      // Payment Method Breakdown
      const payEl = document.getElementById('fin-payment-summary');
      if (payEl) {
        if (pl.by_payment_method) {
          payEl.innerHTML = Object.entries(pl.by_payment_method).map(([method, data]) => `
            <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid #F3F4F6;">
              <span><strong>${method}</strong> (${data.count} txns)</span>
              <span style="font-weight:700;">${formatINR(data.total_paise)}</span>
            </div>
          `).join('');
        } else if (Array.isArray(pl.paymentMethodBreakdown)) {
          payEl.innerHTML = pl.paymentMethodBreakdown.map(pm => `
            <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid #F3F4F6;">
              <span><strong>${pm.method}</strong> (${pm.count} txns)</span>
              <span style="font-weight:700;">${formatINR(pm.totalINR * 100)}</span>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Error loading finance P&L:', err);
    }
  }

  // ── 12. VIEW: THERMAL PRINTER STATION (58 mm POS-80) ──────────────────────
  async function loadPrinterConfig() {
    try {
      const res = await apiFetch('/api/settings');
      const s = res.settings || {};
      if (s.thermal_printer_name) {
        document.getElementById('cfg-printer-name').value = s.thermal_printer_name;
      }
      if (s.thermal_printer_paper_width_mm) {
        document.getElementById('cfg-printer-width').value = s.thermal_printer_paper_width_mm;
      }
    } catch (e) {
      // Ignore
    }
  }

  async function loadPrinterJobs() {
    const tbody = document.getElementById('printer-jobs-body');
    if (!tbody) return;

    try {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:#9CA3AF;">Loading printer queue...</td></tr>';
      const res = await apiFetch('/api/printer/jobs?limit=25');
      const jobs = Array.isArray(res) ? res : (res.jobs || []);

      if (jobs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:2rem; color:#9CA3AF;">Print queue is empty.</td></tr>';
        return;
      }

      tbody.innerHTML = jobs.map(j => `
        <tr>
          <td><code>#${j.id.substring(0, 8)}</code></td>
          <td><strong>${escapeHtml(j.order_number || 'Test Print')}</strong></td>
          <td><span class="badge-token">#${j.token_number || '—'}</span></td>
          <td>${j.doc_type || j.document_type || 'TOKEN'}</td>
          <td>
            <span class="badge-status ${j.status === 'COMPLETED' ? 'status-verified' : j.status === 'FAILED' ? 'status-unpaid' : 'status-awaiting'}">
              ${j.status}
            </span>
          </td>
          <td>${j.attempts}</td>
          <td style="font-size:0.75rem; color:#6B7280;">${escapeHtml(j.last_error || 'Spool OK')}</td>
          <td style="font-size:0.75rem; color:#6B7280;">${new Date(j.created_at).toLocaleTimeString()}</td>
          <td>
            <div style="display:flex; gap:4px;">
              ${j.status === 'FAILED' ? `
                <button class="btn-table-action" onclick="retryPrintJob('${j.id}')">Retry</button>
              ` : ''}
              ${j.order_id ? `
                <button class="btn-table-action" onclick="previewThermalReceipt('${j.order_id}')">Preview</button>
              ` : ''}
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" style="color:var(--accent-red); padding:1rem;">Failed to load printer queue: ${err.message}</td></tr>`;
    }
  }

  // Save Printer Configuration
  document.getElementById('btn-save-printer-config')?.addEventListener('click', async () => {
    const printerName = document.getElementById('cfg-printer-name').value.trim();
    const paperWidth = document.getElementById('cfg-printer-width').value;

    try {
      await apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({
          thermal_printer_name: printerName,
          thermal_printer_paper_width_mm: paperWidth
        })
      });
      showToast('Printer hardware configuration saved.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Test Print 58mm Token
  document.getElementById('btn-printer-test-print')?.addEventListener('click', async () => {
    try {
      showToast('Dispatching 58mm test token to POS-80 spooler...', 'info');
      const res = await apiFetch('/api/printer/test-print', { method: 'POST' });
      showToast(`Test print dispatched! Job ID: #${res.job_id ? res.job_id.substring(0, 8) : 'Enqueued'}`, 'success');
      loadPrinterJobs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  window.retryPrintJob = async function (jobId) {
    try {
      await apiFetch(`/api/printer/jobs/${jobId}/retry`, { method: 'POST' });
      showToast('Print job re-queued.', 'info');
      loadPrinterJobs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Preview 58mm Thermal Receipt Modal
  window.previewThermalReceipt = function (orderId) {
    const iframe = document.getElementById('receipt-preview-iframe');
    if (!iframe) return;

    // Point iframe to the HTML receipt generator route
    iframe.src = `/api/printer/orders/${orderId}/preview-html`;
    openModal('modal-receipt-preview');

    const printBtn = document.getElementById('btn-iframe-print');
    if (printBtn) {
      printBtn.onclick = () => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
      };
    }
  };

  // ── 13. VIEW: STORE & GOOGLE PAY QR SETTINGS ──────────────────────────────
  async function loadSettings() {
    try {
      const res = await apiFetch('/api/settings');
      const s = res.settings || res || {};
      state.settings = s;

      document.getElementById('set-store-name').value = s.store_name || 'Noor Optics';
      document.getElementById('set-store-tagline').value = s.store_tagline || 'Scandinavian Luxury Eyewear';
      document.getElementById('set-store-address').value = s.store_address || 'Shop 14, High Street Retail Precinct';
      document.getElementById('set-store-phone').value = s.store_phone || '+91 98765 43210';
      document.getElementById('set-store-gstin').value = s.store_gstin || '29AABCN1234F1Z5';
      document.getElementById('set-store-upi').value = s.merchant_upi_id || 'nooroptics@okhdfcbank';
      document.getElementById('set-invoice-prefix').value = s.invoice_number_prefix || 'NOOR-INV-';

      if (s.merchant_qr_image_url) {
        document.getElementById('qr-preview-img').src = s.merchant_qr_image_url;
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  }

  // Handle QR image file selection
  const qrFileUpload = document.getElementById('qr-file-upload');
  if (qrFileUpload) {
    qrFileUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          document.getElementById('qr-preview-img').src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        store_name: document.getElementById('set-store-name').value.trim(),
        store_tagline: document.getElementById('set-store-tagline').value.trim(),
        store_address: document.getElementById('set-store-address').value.trim(),
        store_phone: document.getElementById('set-store-phone').value.trim(),
        store_gstin: document.getElementById('set-store-gstin').value.trim(),
        merchant_upi_id: document.getElementById('set-store-upi').value.trim(),
        invoice_number_prefix: document.getElementById('set-invoice-prefix').value.trim()
      };

      // If user selected a new QR image, save base64 data url
      const qrImgSrc = document.getElementById('qr-preview-img').src;
      if (qrImgSrc && qrImgSrc.startsWith('data:image/')) {
        payload.merchant_qr_image_url = qrImgSrc;
      }

      try {
        await apiFetch('/api/settings', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast('Store settings & Google Pay QR updated.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // ── 14. VIEW: STAFF & PERMISSIONS (RBAC) ──────────────────────────────────
  async function loadStaff() {
    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;

    try {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#9CA3AF;">Loading staff accounts...</td></tr>';
      const res = await apiFetch('/api/staff');
      const staff = Array.isArray(res) ? res : (res.staff || []);

      if (staff.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#9CA3AF;">No staff members found.</td></tr>';
        return;
      }

      tbody.innerHTML = staff.map(s => `
        <tr>
          <td><strong>${escapeHtml(s.name || s.full_name)}</strong></td>
          <td>${escapeHtml(s.email)}</td>
          <td><span class="badge-status status-verified">${escapeHtml(s.role_name || s.role_id)}</span></td>
          <td>${escapeHtml(s.phone || '—')}</td>
          <td><span class="badge-status status-verified">${s.is_active ? 'Active' : 'Disabled'}</span></td>
          <td style="font-size:0.75rem; color:#6B7280;">${s.last_login_at ? new Date(s.last_login_at).toLocaleString() : 'Never'}</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" style="color:var(--accent-red); padding:1rem;">Failed to load staff: ${err.message}</td></tr>`;
    }
  }

  document.getElementById('btn-create-staff')?.addEventListener('click', () => {
    document.getElementById('staff-name').value = '';
    document.getElementById('staff-email').value = '';
    document.getElementById('staff-password').value = '';
    document.getElementById('staff-phone').value = '';
    openModal('modal-add-staff');
  });

  const formAddStaff = document.getElementById('form-add-staff');
  if (formAddStaff) {
    formAddStaff.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('staff-name').value.trim();
      const email = document.getElementById('staff-email').value.trim();
      const password = document.getElementById('staff-password').value;
      const roleId = document.getElementById('staff-role').value;
      const phone = document.getElementById('staff-phone').value.trim();

      try {
        await apiFetch('/api/staff', {
          method: 'POST',
          body: JSON.stringify({ name, email, password, roleId, phone })
        });
        showToast(`Staff account created for ${name}`, 'success');
        closeModal('modal-add-staff');
        loadStaff();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // ── 15. VIEW: SYSTEM AUDIT LOGS ───────────────────────────────────────────
  async function loadAuditLogs() {
    const tbody = document.getElementById('audit-table-body');
    if (!tbody) return;

    try {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:#9CA3AF;">Loading audit trail...</td></tr>';
      const res = await apiFetch('/api/audit-logs?limit=50');
      const logs = Array.isArray(res) ? res : (res.logs || []);

      if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:#9CA3AF;">No audit events recorded yet.</td></tr>';
        return;
      }

      tbody.innerHTML = logs.map(l => `
        <tr>
          <td style="font-size:0.75rem; color:#6B7280;">${new Date(l.created_at).toLocaleString()}</td>
          <td><code>${escapeHtml(l.action)}</code></td>
          <td><strong>${escapeHtml(l.user_email || 'System')}</strong></td>
          <td>${escapeHtml(l.entity_type || '—')}</td>
          <td><code>${escapeHtml(l.entity_id ? l.entity_id.substring(0, 8) : '—')}</code></td>
          <td style="font-size:0.75rem;">${escapeHtml(l.details_json || l.details || '')}</td>
          <td style="font-size:0.75rem; color:#9CA3AF;">${escapeHtml(l.ip_address || '127.0.0.1')}</td>
        </tr>
      `).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="color:var(--accent-red); padding:1rem;">Failed to load audit logs: ${err.message}</td></tr>`;
    }
  }

  // Utility to escape HTML strings safely
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Auto-start authentication check on page load ──────────────────────────
  document.addEventListener('DOMContentLoaded', checkAuthSession);

})();
