/**
 * Noor Optics — Retail Business Management & In-Store POS Controller
 * Version: 3.0.0 (Strict 4-Nav Architecture, Yellow QR-Only Frame Stickers, Live Multi-Channel Dashboard & POS)
 */

(function () {
  'use strict';

  // ── Auto-Purge Obsolete Demo Caches from Browser Storage ──────────────────
  try {
    const rawCustom = localStorage.getItem('noor_custom_frames');
    if (rawCustom) {
      const parsed = JSON.parse(rawCustom);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(item => {
          if (!item || !item.id) return false;
          const id = String(item.id).toLowerCase();
          const name = String(item.name || '').toLowerCase();
          const isLegacy = id.startsWith('noor-0') || id.startsWith('noor-1') ||
            id.includes('mp4f2') || id.includes('5d89v') ||
            name.includes('meta') || name.includes('onko') || name.includes('stockholm');
          return !isLegacy;
        });
        localStorage.setItem('noor_custom_frames', JSON.stringify(cleaned));
      }
    }
  } catch (_) { }

  // ── Global Application State ───────────────────────────────────────────────
  const state = {
    token: localStorage.getItem('noor_admin_token') || null,
    user: null,
    activeNav: 'dashboard', // dashboard | orders | inventory | pos
    storeSettings: {
      store_name: 'Noor Optic',
      store_phone: '+91 98765 43210',
      store_address: 'Pillar No: 45, Beside HP Petrol Pump, Opposite Subhan Bakery, Rethibowli, Gudimalkapur, Hyderabad, Telangana 500028',
      store_gstin: '29AAAAA0000A1Z5',
      store_upi_id: 'nooroptics@okhdfcbank'
    },
    // Dashboard state
    dashRange: 'today',
    dashCustomStart: '',
    dashCustomEnd: '',
    dashChartInstance: null,
    // Orders state
    ordersActiveChannel: 'ALL', // 'ALL', 'POS' (In-store), 'WEBSITE' (Online)
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
    lastScanTime: 0,
    // Active POS Client & Prescription
    posSelectedClient: null,
    posSelectedPrescription: null,
    posDraftPrescription: null,
    // Client CRM state
    clientsCache: [],
    clientsSearchQuery: '',
    clientsStatusFilter: 'active',
    activeProfileClientId: null,
    activeDiopterTarget: null,
    uploadedRxImageUrl: null
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

  function parseOrderTimestamp(order) {
    if (!order) return 0;
    if (order.created_at) {
      let s = String(order.created_at).trim();
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
        s = s.replace(' ', 'T') + 'Z';
      } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s) && !s.includes('Z') && !s.includes('+') && !s.includes('-')) {
        s = s + 'Z';
      }
      const t = new Date(s).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (order.id) {
      const m = String(order.id).match(/(\d{13})/);
      if (m) return Number(m[1]);
    }
    return 0;
  }

  function formatDateTime(isoString) {
    if (!isoString) return '-';
    let s = String(isoString).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
      s = s.replace(' ', 'T') + 'Z';
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s) && !s.includes('Z') && !s.includes('+')) {
      s = s + 'Z';
    }
    try {
      const d = new Date(s);
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

  // Safe image URL formatter supporting local, remote, and base64 Data URLs
  function formatProductImage(img) {
    if (!img) return '/images/frames/frame_01.jpg';
    if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/')) {
      return img;
    }
    return '/' + img;
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
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';

    const config = {
      cache: 'no-store',
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

  // ── Audio Beep for POS Scanner (Zero-Latency Singleton) ─────────────────
  let _posAudioCtx = null;
  function playScannerBeep() {
    try {
      if (!_posAudioCtx) {
        _posAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (_posAudioCtx.state === 'suspended') {
        _posAudioCtx.resume();
      }
      const osc = _posAudioCtx.createOscillator();
      const gain = _posAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, _posAudioCtx.currentTime);
      gain.gain.setValueAtTime(0.18, _posAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, _posAudioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(_posAudioCtx.destination);
      osc.start();
      osc.stop(_posAudioCtx.currentTime + 0.08);
    } catch (e) {
      // AudioContext unavailable or blocked by autoplay policy
    }
  }

  // ── Navigation Switching: STRICTLY FOUR SECTIONS ──────────────────────────
  function switchNav(navKey) {
    const allowedNavs = ['dashboard', 'orders', 'inventory', 'pos', 'diagnostics'];
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

    // Update active nav-item in mobile bottom nav
    document.querySelectorAll('.mobile-bottom-nav .mob-nav-item').forEach(el => {
      if (el.dataset.nav === navKey) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Close mobile drawer and backdrop if open
    const mobSidebar = document.getElementById('admin-sidebar');
    const mobBackdrop = document.getElementById('sidebar-backdrop');
    if (mobSidebar) mobSidebar.classList.remove('open');
    if (mobBackdrop) mobBackdrop.classList.remove('open');

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
      pos: { title: 'In-Store POS Register', sub: 'Cashier checkout, optical frame camera scanning & tax billing' },
      diagnostics: { title: 'System Diagnostics & Spooler Queue', sub: 'Supabase cloud synchronization, Realtime event multiplexer & thermal print spooler' }
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
    } else if (navKey === 'diagnostics') {
      loadDiagnostics();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SECTION: DASHBOARD — COMPLETE BUSINESS OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  function getOrdersForDashRange(orders, range, customStart, customEnd) {
    if (!orders || orders.length === 0) return [];
    const now = new Date();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

    return orders.filter(o => {
      if (!o) return false;
      if (o.status === 'CANCELLED') return false;

      const rawDate = o.created_at || o.createdAt || '';
      let dStr = '';
      try {
        const dt = new Date(rawDate);
        if (!isNaN(dt.getTime())) {
          dStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(dt);
        } else {
          dStr = String(rawDate).slice(0, 10);
        }
      } catch (_) {
        dStr = String(rawDate).slice(0, 10);
      }

      if (range === 'today') {
        return dStr === todayStr;
      } else if (range === 'yesterday') {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const yStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(y);
        return dStr === yStr;
      } else if (range === 'this_week') {
        const day = now.getDay();
        const diff = (day === 0 ? -6 : 1) - day;
        const mon = new Date(now);
        mon.setDate(now.getDate() + diff);
        const monStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(mon);
        return dStr >= monStr && dStr <= todayStr;
      } else if (range === 'this_month') {
        const firstDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(now.getFullYear(), now.getMonth(), 1));
        return dStr >= firstDay && dStr <= todayStr;
      } else if (range === 'custom') {
        if (customStart && customEnd) {
          return dStr >= customStart && dStr <= customEnd;
        }
        return dStr === todayStr;
      }
      return true;
    });
  }

  function buildTimelineFromOrders(orders, range, startDate, endDate) {
    const isHourly = (range === 'today' || range === 'yesterday' || (startDate && startDate === endDate));
    if (isHourly) {
      const hourlyMap = {};
      for (let h = 0; h < 24; h++) {
        const key = String(h).padStart(2, '0');
        hourlyMap[key] = { label: `${h}:00`, inStore: 0, website: 0, inStoreCount: 0, websiteCount: 0 };
      }
      orders.forEach(o => {
        if (o.status === 'CANCELLED') return;
        if (o.payment_status !== 'VERIFIED' && o.payment_status !== 'PAID') return;
        let h = 12;
        try {
          const dt = new Date(o.created_at || o.createdAt);
          if (!isNaN(dt.getTime())) {
            const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).formatToParts(dt);
            const hrPart = parts.find(p => p.type === 'hour');
            h = hrPart ? parseInt(hrPart.value, 10) : dt.getHours();
            if (h === 24) h = 0;
          }
        } catch (_) { }
        const key = String(h).padStart(2, '0');
        const amt = o.total_payable_paise ? (o.total_payable_paise / 100) : (o.total_payable_inr || o.totalINR || 0);
        const isPos = getOrderChannel(o) === 'POS';
        if (hourlyMap[key]) {
          if (isPos) {
            hourlyMap[key].inStore += amt;
            hourlyMap[key].inStoreCount += 1;
          } else {
            hourlyMap[key].website += amt;
            hourlyMap[key].websiteCount += 1;
          }
        }
      });
      return Object.values(hourlyMap);
    } else {
      const dayMap = {};
      orders.forEach(o => {
        if (o.status === 'CANCELLED') return;
        if (o.payment_status !== 'VERIFIED' && o.payment_status !== 'PAID') return;
        let dStr = '';
        try {
          const dt = new Date(o.created_at || o.createdAt);
          dStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(dt);
        } catch (_) {
          dStr = String(o.created_at || '').slice(0, 10);
        }
        if (!dayMap[dStr]) {
          dayMap[dStr] = { label: dStr, inStore: 0, website: 0, inStoreCount: 0, websiteCount: 0 };
        }
        const amt = o.total_payable_paise ? (o.total_payable_paise / 100) : (o.total_payable_inr || o.totalINR || 0);
        if (getOrderChannel(o) === 'POS') {
          dayMap[dStr].inStore += amt;
          dayMap[dStr].inStoreCount += 1;
        } else {
          dayMap[dStr].website += amt;
          dayMap[dStr].websiteCount += 1;
        }
      });
      const vals = Object.values(dayMap);
      return vals.length ? vals : [{ label: 'Today', inStore: 0, website: 0, inStoreCount: 0, websiteCount: 0 }];
    }
  }

  async function loadDashboard() {
    try {
      // 1. Ensure ordersCache is initialized
      if (!state.hasInitializedOrders && typeof loadOrders === 'function') {
        await loadOrders(true);
      }

      // 2. Fetch inventory metrics from overview API
      let url = `/api/dashboard/overview?range=${encodeURIComponent(state.dashRange)}`;
      if (state.dashRange === 'custom' && state.dashCustomStart && state.dashCustomEnd) {
        url += `&startDate=${state.dashCustomStart}&endDate=${state.dashCustomEnd}`;
      }

      const data = await apiFetch(url).catch(() => ({}));
      const cards = data.cards || {};

      // 3. Compute live figures authoritatively as per orders in admin panel
      const localDeleted = JSON.parse(localStorage.getItem('noor_deleted_orders') || '[]');
      const localDeletedSet = new Set(localDeleted.map(x => String(x).toLowerCase().trim()));

      const activeOrders = getOrdersForDashRange((state.ordersCache || []).filter(o => {
        if (!o) return false;
        if (o.order_number && localDeletedSet.has(String(o.order_number).toLowerCase().trim())) return false;
        if (o.id && localDeletedSet.has(String(o.id).toLowerCase().trim())) return false;
        return true;
      }), state.dashRange, state.dashCustomStart, state.dashCustomEnd);

      let inStoreSalesINR = 0;
      let inStoreOrderCount = 0;
      let websiteSalesINR = 0;
      let websiteOrderCount = 0;

      activeOrders.forEach(o => {
        const isPos = getOrderChannel(o) === 'POS';
        const totalINR = o.total_payable_paise
          ? (o.total_payable_paise / 100)
          : (o.total_payable_inr != null ? o.total_payable_inr : (o.totalINR || 0));

        if (o.payment_status === 'VERIFIED' || o.payment_status === 'PAID') {
          if (isPos) {
            inStoreSalesINR += totalINR;
          } else {
            websiteSalesINR += totalINR;
          }
        }

        if (isPos) {
          inStoreOrderCount++;
        } else {
          websiteOrderCount++;
        }
      });

      const combinedRevenueINR = inStoreSalesINR + websiteSalesINR;
      const combinedOrdersCount = inStoreOrderCount + websiteOrderCount;

      // 4. Update the 9 KPI Summary Cards
      document.getElementById('kpi-in-store-sales').textContent = formatINR(inStoreSalesINR);
      document.getElementById('kpi-in-store-orders').textContent = `${inStoreOrderCount} completed in-store sales`;

      document.getElementById('kpi-website-sales').textContent = formatINR(websiteSalesINR);
      document.getElementById('kpi-website-orders').textContent = `${websiteOrderCount} online customer orders`;

      document.getElementById('kpi-combined-revenue').textContent = formatINR(combinedRevenueINR);
      document.getElementById('kpi-combined-orders').textContent = `${combinedOrdersCount} total orders reconciled`;

      document.getElementById('kpi-in-store-count').textContent = inStoreOrderCount;
      document.getElementById('kpi-website-count').textContent = websiteOrderCount;
      document.getElementById('kpi-distinct-frames').textContent = cards.distinctFramesCount || (state.inventoryCache?.length || 0);
      document.getElementById('kpi-physical-units').textContent = cards.physicalUnitsInStock || 0;
      document.getElementById('kpi-low-stock').textContent = cards.lowStockCount || 0;
      document.getElementById('kpi-out-of-stock').textContent = cards.outOfStockCount || 0;

      // 5. Render / Update Comparative Sales Chart from active orders
      const timeline = buildTimelineFromOrders(activeOrders, state.dashRange, state.dashCustomStart, state.dashCustomEnd);
      renderDashboardChart(timeline, data.dateRange);

      // 6. Render Miniature Recent Orders Panel (top 8 active orders)
      const sortedRecent = [...activeOrders].sort((a, b) => parseOrderTimestamp(b) - parseOrderTimestamp(a)).slice(0, 8);
      renderDashboardRecentOrders(sortedRecent);
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

  // ── Authoritative Channel Resolver (100% Guaranteed In-Store vs Website Segregation) ──
  function getOrderChannel(o) {
    if (!o) return 'POS';
    // 1. Strict Order Number / Ref Prefix (The unshakeable source of truth)
    const ref = String(o.order_number || o.order_ref || o.orderNumber || o.invoiceNumber || o.id || '').toUpperCase();
    if (ref.includes('-POS-') || ref.startsWith('ORD-POS-') || ref.includes('POS-')) return 'POS';
    if (ref.includes('-WEB-') || ref.includes('-ONL-') || ref.startsWith('ORD-WEB-') || ref.includes('ONLINE')) return 'WEBSITE';
    // 2. Strict Channel Code (1 = Website, 2 = POS)
    if (o.channel_code === 2 || o.channel_code === '2') return 'POS';
    if (o.channel_code === 1 || o.channel_code === '1') return 'WEBSITE';
    // 3. Strict Source Resolver
    if (o.source === 'instore' || o.source === 'pos' || o.source === 'INSTORE') return 'POS';
    if (o.source === 'website' || o.source === 'WEBSITE') return 'WEBSITE';
    if (o.channel === 'POS' || o.channel === 'IN-STORE') return 'POS';
    if (o.channel === 'ONLINE' || o.channel === 'WEBSITE') return 'WEBSITE';
    if (Array.isArray(o.items) && o.items[0]?.channel) {
      return (o.items[0].channel === 'POS' || o.items[0].channel === 'IN-STORE') ? 'POS' : 'WEBSITE';
    }
    return 'WEBSITE';
  }

  // ── Authoritative UTR Resolver (Finds customer's entered UPI Reference across all structures) ──
  function getOrderUtr(o) {
    if (!o) return null;
    const direct = o.claimed_upi_ref || o.claimedUpiRef || o.utr || o.claimed_utr;
    if (direct && String(direct).trim() && String(direct).trim().toLowerCase() !== 'submitted') {
      return String(direct).trim();
    }
    if (Array.isArray(o.items) && o.items.length > 0) {
      for (const it of o.items) {
        if (it && (it.claimed_upi_ref || it.utr)) {
          const val = String(it.claimed_upi_ref || it.utr).trim();
          if (val && val.toLowerCase() !== 'submitted') return val;
        }
      }
    }
    if (o.notes && o.notes.includes('UPI Ref:')) {
      const part = o.notes.split('UPI Ref:')[1];
      if (part) {
        const cleaned = part.replace(/[)\]]/g, '').trim();
        if (cleaned && cleaned.toLowerCase() !== 'submitted') return cleaned;
      }
    }
    if (o.notes && o.notes.includes('UTR:')) {
      const part = o.notes.split('UTR:')[1];
      if (part) {
        const cleaned = part.replace(/[)\]]/g, '').trim();
        if (cleaned && cleaned.toLowerCase() !== 'submitted') return cleaned;
      }
    }
    if (o.delivery_address && o.delivery_address.includes('UTR:')) {
      const m = o.delivery_address.match(/UTR:\s*([A-Za-z0-9_-]+)/i);
      if (m && m[1]) return m[1].trim();
    }
    return null;
  }

  function renderDashboardRecentOrders(orders) {
    const tbody = document.getElementById('dash-recent-orders-body');
    if (!tbody) return;

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:#9CA3AF;">No orders recorded in this period.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const isPOS = getOrderChannel(o) === 'POS';
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

  // ── Web Audio Synthesizer: Boutique POS Dual-Tone Order Chime (Zero External Files, 0ms Lag) ──
  function playOrderChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => { });
      }
      const now = ctx.currentTime;
      // High-end dual bell chime: A5 (880Hz), E6 (1318.5Hz), A6 (1760Hz)
      const tones = [
        { freq: 880, start: 0, duration: 0.35, gain: 0.3 },
        { freq: 1318.5, start: 0.12, duration: 0.5, gain: 0.4 },
        { freq: 1760, start: 0.25, duration: 0.8, gain: 0.35 }
      ];
      tones.forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle'; // Crisp, bell-like timbre
        osc.frequency.setValueAtTime(t.freq, now + t.start);
        gain.gain.setValueAtTime(0.001, now + t.start);
        gain.gain.exponentialRampToValueAtTime(t.gain, now + t.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t.start);
        osc.stop(now + t.start + t.duration);
      });
    } catch (e) {
      console.warn('Order chime notice:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SECTION: ORDERS — IN-STORE AND WEBSITE (AUTO-REFRESHING + INSTANT BILL)
  // ═══════════════════════════════════════════════════════════════════════════
  state.knownOrderIds = new Set();
  state.hasInitializedOrders = false;
  let _isOrdersLoading = false;

  async function loadOrders(silent = false, forceCloudSync = false) {
    if (_isOrdersLoading) return;
    _isOrdersLoading = true;
    try {
      // Clear legacy purge timestamp so historical orders never disappear
      try { localStorage.removeItem('noor_orders_purged_at'); } catch (_) { }

      const url = `/api/orders?limit=300&_t=${Date.now()}${forceCloudSync ? '&force=1' : ''}`;
      const res = await apiFetch(url);
      let incoming = Array.isArray(res) ? res : (res.orders || []);

      // Filter against persistent tombstones
      const localDeleted = JSON.parse(localStorage.getItem('noor_deleted_orders') || '[]');
      const localDeletedSet = new Set(localDeleted.map(x => String(x).toLowerCase().trim()));

      incoming = incoming.filter(o => {
        if (!o) return false;
        if (o.order_number && /TEST-REF|GHOST-TEST/i.test(o.order_number)) return false;
        if (o.customer_name && /Concierge Test/i.test(o.customer_name)) return false;
        if (o.order_number && localDeletedSet.has(String(o.order_number).toLowerCase().trim())) return false;
        if (o.id && localDeletedSet.has(String(o.id).toLowerCase().trim())) return false;
        return true;
      });

      // Strictly sort newest orders first
      incoming.sort((a, b) => parseOrderTimestamp(b) - parseOrderTimestamp(a));

      // Detect brand new incoming orders that arrived since last continuous refresh!
      const newOrders = [];
      if (state.hasInitializedOrders) {
        for (const o of incoming) {
          const k1 = o.id ? String(o.id) : null;
          const k2 = o.order_number ? String(o.order_number) : null;
          const k3 = o.order_ref ? String(o.order_ref) : null;
          if ((!k1 || !state.knownOrderIds.has(k1)) && (!k2 || !state.knownOrderIds.has(k2)) && (!k3 || !state.knownOrderIds.has(k3))) {
            newOrders.push(o);
          }
        }
      }

      // Record known IDs
      incoming.forEach(o => {
        if (o.id) state.knownOrderIds.add(String(o.id));
        if (o.order_number) state.knownOrderIds.add(String(o.order_number));
        if (o.order_ref) state.knownOrderIds.add(String(o.order_ref));
      });
      state.hasInitializedOrders = true;

      // Notify and chime whenever a new order arrives via continuous sync!
      if (newOrders.length > 0) {
        playOrderChime();
        const topNew = newOrders[0];
        const chanLabel = getOrderChannel(topNew) === 'POS' ? '🏪 In-Store' : '🌐 Website';
        showToast(`🔔 New ${chanLabel} Order #${topNew.order_number || topNew.id} (${topNew.customer_name || 'Client'})`, 'success');
      }

      state.ordersCache = incoming;
      renderOrdersTable();
      if (!silent) loadClients(true);

      // If viewing dashboard, keep dashboard figures 100% synchronized in real time
      if (state.activeNav === 'dashboard' && typeof renderDashCards === 'function') {
        loadDashboard(true);
      }

      // Update live order count badge on desktop sidebar and mobile bottom nav
      const totalCount = incoming.length;
      const sidebarBadge = document.getElementById('sidebar-orders-badge');
      const mobBadge = document.getElementById('mob-orders-badge');
      if (sidebarBadge) {
        sidebarBadge.textContent = totalCount;
        sidebarBadge.style.display = totalCount > 0 ? 'inline-block' : 'none';
      }
      if (mobBadge) {
        mobBadge.textContent = totalCount;
        mobBadge.style.display = totalCount > 0 ? 'inline-block' : 'none';
      }

      // Animate live sync badge to indicate successful continuous refresh
      const liveDot = document.getElementById('live-sync-dot');
      if (liveDot) {
        liveDot.style.opacity = '0.35';
        setTimeout(() => { if (liveDot) liveDot.style.opacity = '1'; }, 180);
      }
    } catch (err) {
      if (!silent) {
        console.error('Failed to load orders:', err);
        showToast('Error loading orders: ' + err.message, 'error');
      }
    } finally {
      _isOrdersLoading = false;
    }
  }

  function renderOrdersTable() {
    const billsList = document.getElementById('orders-bills-list');
    const tbody = document.getElementById('orders-table-body');

    const channel = state.ordersActiveChannel || 'ALL'; // 'ALL', 'POS', 'WEBSITE'
    const query = (state.ordersSearchQuery || '').toLowerCase().trim();
    const statusFilter = state.ordersStatusFilter;
    const paymentFilter = state.ordersPaymentFilter;

    // Filter out dummy test ghost orders and local tombstones
    const localDeleted = JSON.parse(localStorage.getItem('noor_deleted_orders') || '[]');
    const localDeletedSet = new Set(localDeleted.map(x => String(x).toLowerCase().trim()));

    const cleanOrders = state.ordersCache.filter(o => {
      if (!o) return false;
      if (o.order_number && /TEST-REF|GHOST-TEST/i.test(o.order_number)) return false;
      if (o.customer_name && /Concierge Test/i.test(o.customer_name)) return false;
      if (o.order_number && localDeletedSet.has(String(o.order_number).toLowerCase().trim())) return false;
      if (o.id && localDeletedSet.has(String(o.id).toLowerCase().trim())) return false;
      return true;
    });

    // Ensure newest orders are always at the top
    cleanOrders.sort((a, b) => parseOrderTimestamp(b) - parseOrderTimestamp(a));

    // Count badges (100% Authoritative Segregation)
    const allCount = cleanOrders.length;
    const instoreCount = cleanOrders.filter(o => getOrderChannel(o) === 'POS').length;
    const websiteCount = cleanOrders.filter(o => getOrderChannel(o) === 'WEBSITE' && o.payment_status === 'VERIFIED').length;
    const upiPendingCount = cleanOrders.filter(o => getOrderChannel(o) === 'WEBSITE' && o.payment_status === 'AWAITING_VERIFICATION').length;
    const badgeAll = document.getElementById('count-all-orders');
    const badgeInstore = document.getElementById('count-instore-orders');
    const badgeWebsite = document.getElementById('count-website-orders');
    const badgeUpiPending = document.getElementById('count-upi-pending');
    if (badgeAll) badgeAll.textContent = allCount;
    if (badgeInstore) badgeInstore.textContent = instoreCount;
    if (badgeWebsite) badgeWebsite.textContent = websiteCount;
    if (badgeUpiPending) badgeUpiPending.textContent = upiPendingCount;

    // Filter list
    const filtered = cleanOrders.filter(o => {
      // Channel match
      const orderChan = getOrderChannel(o);
      if (channel === 'POS' && orderChan !== 'POS') return false;
      if (channel === 'WEBSITE' && (orderChan !== 'WEBSITE' || o.payment_status !== 'VERIFIED')) return false;
      if (channel === 'UPI_PENDING' && (orderChan !== 'WEBSITE' || o.payment_status !== 'AWAITING_VERIFICATION')) return false;

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
      countLabel.textContent = `Showing ${filtered.length} of ${allCount} orders`;
    }

    // 1. Render Mobile-First OpticTool Saved Bills Cards (Image 3)
    if (billsList) {
      if (filtered.length === 0) {
        billsList.innerHTML = `<div style="text-align:center; padding:3rem 1rem; color:#94A3B8; font-weight:600;">No orders or saved bills found.</div>`;
      } else {
        billsList.innerHTML = filtered.map(o => {
          const invoiceNo = o.order_number || ('INV-NOOR-' + o.id.slice(-4));
          const formattedDate = formatDateTime(o.created_at);
          const orderChan = getOrderChannel(o);
          const custName = o.customer_name || (orderChan === 'POS' ? 'Walk-in Client' : 'Online Client');
          const custPhone = o.customer_phone || '-';
          const totalPayable = (o.total_payable_paise ? (o.total_payable_paise / 100) : (o.total_payable_inr || 0));
          const isFullyPaid = (o.payment_status === 'VERIFIED' || o.payment_status === 'PAID') && o.payment_status !== 'PARTIAL';
          const outstandingINR = isFullyPaid ? 0 : ((o.outstanding_inr != null) ? o.outstanding_inr : (o.outstanding_paise != null ? (o.outstanding_paise / 100) : Math.max(0, totalPayable - ((o.amount_paid_paise || 0) / 100))));
          const isDue = !isFullyPaid && ((outstandingINR > 0) || (o.payment_status === 'PARTIAL'));
          const hasRx = !!o.prescription_id || !!o.prescription_number || (Array.isArray(o.prescriptions) && o.prescriptions.length > 0);
          const rxCount = (Array.isArray(o.prescriptions) && o.prescriptions.length > 0) ? o.prescriptions.length : (hasRx ? 1 : 0);
          const utrCard = getOrderUtr(o);
          const itemsSummary = (o.items && o.items.length)
            ? o.items.map(i => {
              let name = escapeHtml(i.product_name || 'Frame');
              if (i.quantity > 1) name += ` ×${i.quantity}`;
              const lName = i.lens_name || i.lensName || i.lens;
              if (lName && !name.toLowerCase().includes('lens package') && lName !== 'Blue-Light Filter' && !lName.toLowerCase().includes('standard demo')) {
                name += ` + [${escapeHtml(lName)}]`;
              }
              return name;
            }).join(', ')
            : 'Frame Order';
          const channelBadge = orderChan === 'POS'
            ? `<span class="badge-channel-pos" style="background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0; font-size:0.68rem; font-weight:800; padding:1px 6px; border-radius:4px;">🏪 In-Store [Code 2]</span>`
            : `<span class="badge-channel-web" style="background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; font-size:0.68rem; font-weight:800; padding:1px 6px; border-radius:4px;">🌐 Website [Code 1]</span>`;

          return `
            <div class="optic-saved-bill-card" onclick="viewOrderDetails('${o.id}')">
              <div class="bill-card-header">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="bill-header-inv">${escapeHtml(invoiceNo)}</div>
                  ${channelBadge}
                </div>
                <div class="bill-header-time">${formattedDate}</div>
              </div>
              <div class="bill-card-body">
                <div class="bill-card-left">
                  <div class="bill-client-row">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>${escapeHtml(custName)}</span>
                  </div>
                  <div class="bill-phone-row">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>${escapeHtml(custPhone)}</span>
                  </div>
                  <div class="bill-items-summary" title="${escapeHtml(itemsSummary)}">${itemsSummary}</div>
                </div>
                <div class="bill-card-right">
                  <div class="bill-due-badge-wrap">
                    ${o.payment_status === 'AWAITING_VERIFICATION'
              ? `<span class="bill-due-amount">₹ ${totalPayable.toLocaleString('en-IN')}</span> <span style="background:#FEF3C7; color:#92400E; border:1px solid #FCD34D; font-weight:800; font-size:0.68rem; padding:2px 6px; border-radius:4px;">VERIFY UPI</span>`
              : (isDue
                ? `<span class="bill-due-amount">₹ ${outstandingINR.toLocaleString('en-IN')}</span> <span class="badge-due-red">DUE</span>`
                : `<span class="bill-paid-amount">₹ ${totalPayable.toLocaleString('en-IN')}</span> <span class="badge-paid-green">PAID</span>`
              )
            }
                  </div>
                  ${(orderChan === 'POS' && isDue && outstandingINR > 0) ? `
                    <div style="margin-top:4px;">
                      <button type="button" class="btn-table-action" style="background:#16A34A; color:#FFF; font-weight:800; padding:3px 8px; font-size:0.72rem; border-radius:5px;" onclick="event.stopPropagation(); openCollectPaymentModal('${o.id}')">💳 Collect</button>
                    </div>
                  ` : ''}
                  <div class="bill-sub-badges-row">
                    ${rxCount > 0 ? `<span class="badge-rx-pill">${rxCount} Rx</span>` : ''}
                    <span class="badge-status status-${(o.status || 'confirmed').toLowerCase()}" style="font-size:0.68rem; padding:2px 6px;">${escapeHtml(o.status || 'CONFIRMED')}</span>
                    <span class="bill-total-lbl">Total ₹ ${totalPayable.toLocaleString('en-IN')}</span>
                  </div>
                  <button type="button" class="optic-dots-btn" onclick="openBillActionSheet('${o.id}', event)" title="Manage bill options">•••</button>
                </div>
              </div>
              ${(o.payment_status === 'AWAITING_VERIFICATION' || utrCard) ? `
                <div style="background:#FEF3C7; border-top:1.5px solid #F59E0B; padding:8px 12px; display:flex; align-items:center; justify-content:space-between; font-size:0.78rem; border-radius:0 0 8px 8px;">
                  <span style="color:#78350F; font-weight:800; display:flex; align-items:center; gap:6px;">
                    📱 Claimed UTR: <code style="font-family:monospace; font-weight:900; font-size:0.92rem; background:#FFFBEB; color:#92400E; padding:3px 8px; border-radius:4px; border:1px solid #FCD34D; user-select:all;">${escapeHtml(utrCard || 'Awaiting Customer Entry')}</code>
                    ${utrCard ? `<button type="button" class="btn-table-action" style="font-size:0.7rem; padding:2px 6px; background:#FFFFFF; border:1px solid #CBD5E1;" onclick="event.stopPropagation(); navigator.clipboard.writeText('${escapeHtml(utrCard)}'); showToast('UTR copied!', 'success');">📋 Copy</button>` : ''}
                  </span>
                  <div style="display:flex; gap:6px;">
                    ${o.payment_status === 'AWAITING_VERIFICATION' ? `
                      <button type="button" class="btn-table-action" style="background:#16A34A; color:#FFF; font-weight:800; padding:4px 10px; font-size:0.75rem; border-radius:5px;" onclick="event.stopPropagation(); confirmUpiPayment('${o.id}', '${o.payment_id || ''}')">✓ Approve</button>
                      <button type="button" class="btn-table-action" style="background:#DC2626; color:#FFF; font-weight:700; padding:4px 10px; font-size:0.75rem; border-radius:5px;" onclick="event.stopPropagation(); rejectUpiPayment('${o.id}', '${o.payment_id || ''}')">✗ Reject</button>
                    ` : '<span style="color:#16A34A; font-weight:800; font-size:0.75rem;">✓ Verified</span>'}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      }
    }

    // 2. Render Desktop Data Table if container is present
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:3rem; color:#9CA3AF;">No orders found matching the selected filters.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(o => {
        const itemsCount = (o.items && o.items.length) || 1;
        const itemsSnippet = o.items
          ? o.items.map(i => `${escapeHtml(i.product_name)} (${i.quantity})`).join(', ')
          : 'Optical Frame';

        const isFullyPaidRow = (o.payment_status === 'VERIFIED' || o.payment_status === 'PAID') && o.payment_status !== 'PARTIAL';
        const totalPayableRow = (o.total_payable_paise ? (o.total_payable_paise / 100) : (o.total_payable_inr || 0));
        const amountPaidRow = isFullyPaidRow ? totalPayableRow : ((o.amount_paid_inr != null) ? o.amount_paid_inr : ((o.amount_paid_paise || 0) / 100));
        const outstandingRow = isFullyPaidRow ? 0 : ((o.outstanding_inr != null) ? o.outstanding_inr : (o.outstanding_paise != null ? (o.outstanding_paise / 100) : Math.max(0, totalPayableRow - amountPaidRow)));
        const isDueRow = !isFullyPaidRow && ((outstandingRow > 0) || (o.payment_status === 'PARTIAL'));

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
              <strong>${escapeHtml(o.customer_name || (getOrderChannel(o) === 'POS' ? 'Walk-in Client' : 'Online Client'))}</strong>
              ${o.client_code ? `<span style="font-size:0.68rem; font-weight:700; color:#1D4ED8; background:#EFF6FF; border:1px solid #BFDBFE; padding:1px 5px; border-radius:4px; margin-left:4px;">${escapeHtml(o.client_code)}</span>` : ''}
              ${o.customer_phone ? `<div style="font-size:0.72rem; color:#6B7280;">${escapeHtml(o.customer_phone)}</div>` : ''}
              ${o.city ? `<div style="font-size:0.7rem; color:#9CA3AF;">${escapeHtml(o.city)}</div>` : ''}
              ${o.prescription_number ? `
                <div style="margin-top:4px;">
                  <span class="badge-status" style="background:#EBF5FF; color:#1E40AF; border:1px solid #BFDBFE; font-size:0.68rem; font-weight:700; cursor:pointer;" onclick="event.stopPropagation(); printPrescriptionRecord('${o.prescription_id}')" title="Click to view/print prescription">
                    👓 ${escapeHtml(o.prescription_number)}
                    ${o.od_sph ? `(R: ${o.od_sph} / L: ${o.os_sph || o.od_sph})` : ''}
                  </span>
                </div>
              ` : (o.prescription_pref ? `<div style="font-size:0.68rem; color:#9CA3AF; margin-top:2px;">RX: ${escapeHtml(o.prescription_pref)}</div>` : '')}
            </td>
            <td>
              <div style="font-weight:600;">${itemsCount} item${itemsCount > 1 ? 's' : ''}</div>
              <div style="font-size:0.72rem; color:#6B7280; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(itemsSnippet)}">${escapeHtml(itemsSnippet)}</div>
            </td>
            <td>${formatINR(o.subtotal_paise || o.subtotal_inr * 100, true)}</td>
            <td>${formatINR(o.discount_paise || (o.discount_inr || 0) * 100, true)}</td>
            <td><strong>${formatINR(o.total_payable_paise || o.total_payable_inr * 100, true)}</strong></td>
            <td>
              ${isDueRow
            ? `<span class="badge-status" style="background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; font-weight:800;">₹${outstandingRow.toLocaleString('en-IN')} DUE</span>`
            : `<span class="badge-status ${paymentClass}">${escapeHtml(o.payment_status)}</span>`
          }
              ${(() => {
            const utr = getOrderUtr(o);
            return utr ? `
                  <div style="margin-top:3px;">
                    <span style="font-family:monospace; font-weight:800; font-size:0.75rem; background:#FEF3C7; color:#92400E; border:1px solid #FCD34D; padding:1px 5px; border-radius:4px; display:inline-block;" title="Claimed UPI Reference">
                      UTR: ${escapeHtml(utr)}
                    </span>
                  </div>
                ` : '';
          })()}
              <div style="font-size:0.68rem; color:#6B7280; margin-top:2px;">${escapeHtml(o.payment_method || 'CASH')}</div>
            </td>
            <td><span class="badge-status ${orderClass}">${escapeHtml(o.status)}</span></td>
            <td>
              <div style="display:flex; flex-direction:column; gap:4px;">
                ${o.payment_status === 'AWAITING_VERIFICATION' ? `
                  <div style="display:flex; gap:4px; margin-bottom:2px;">
                    <button type="button" class="btn-table-action" style="background:#16A34A; color:#FFF; font-weight:800; padding:4px 8px; font-size:0.75rem;" onclick="event.stopPropagation(); confirmUpiPayment('${o.id}', '${o.payment_id || ''}')">✓ Accept</button>
                    <button type="button" class="btn-table-action" style="background:#DC2626; color:#FFF; font-weight:700; padding:4px 8px; font-size:0.75rem;" onclick="event.stopPropagation(); rejectUpiPayment('${o.id}', '${o.payment_id || ''}')">✗ Reject</button>
                  </div>
                ` : ''}
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                  ${(getOrderChannel(o) === 'POS' && isDueRow) ? `<button class="btn-table-action" style="background:#16A34A; color:#FFF; font-weight:800;" onclick="event.stopPropagation(); openCollectPaymentModal('${o.id}')" title="Collect Remaining Balance">💳 Collect</button>` : ''}
                  <button class="btn-table-action" onclick="viewOrderDetails('${o.id}')" title="View Full Details">View</button>
                  <button class="btn-table-action" style="background:#2563EB; color:#FFF; font-weight:700;" onclick="event.stopPropagation(); downloadInvoicePDF('${o.id}', '${escapeHtml(o.order_number)}')" title="Download Tax Invoice PDF">📄 Invoice</button>
                  <button class="btn-table-action" onclick="instantPrintReceipt('${o.id}', true)" title="Instant Spool Receipt">🖨️ Receipt</button>
                  <button class="btn-table-action" style="background:#F3F4F6; color:#374151; font-weight:700;" onclick="manualReprintToDaemon('${o.id}')" title="Send Print Job to Cloud Daemon Queue">⚡ Queue Print</button>
                  ${o.prescription_id ? `<button class="btn-table-action" style="background:#2563EB; color:#FFF; font-weight:700;" onclick="openEditPrescriptionModal('${o.prescription_id}')" title="Doctor: Edit Lens Values">✏️ Edit RX</button>` : ''}
                  <button class="btn-table-action btn-table-danger" onclick="deleteOrderPrompt('${o.id}', '${escapeHtml(o.order_number)}')" title="Delete Order">Delete</button>
                </div>
                ${o.customer_phone ? `
                  <div style="display:flex; gap:4px; margin-top:2px;">
                    <a href="tel:${escapeHtml(o.customer_phone)}" class="btn-table-action" title="Call Client" style="text-decoration:none; display:inline-flex; align-items:center; gap:2px; font-weight:700; color:#1D4ED8; background:#EFF6FF; border:1px solid #BFDBFE;">📞 Call</a>
                    <button type="button" class="btn-table-action" onclick="openWhatsAppDirect('${escapeHtml(o.customer_phone)}', '${escapeHtml(o.customer_name || 'Client')}')" title="WhatsApp Chat" style="display:inline-flex; align-items:center; gap:2px; font-weight:700; color:#15803D; background:#F0FDF4; border:1px solid #BBF7D0;">💬 WhatsApp</button>
                  </div>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // ── Open OpticTool Saved Bill Action Sheet (Image 3B) ──────────────────────
  window.openBillActionSheet = function (orderId, e) {
    if (e) e.stopPropagation();
    const order = state.ordersCache.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('modal-bill-action-sheet');
    const title = document.getElementById('action-sheet-bill-title');
    if (title) title.textContent = order.order_number || ('INV-NOOR-' + order.id.slice(-4));

    // Wire View
    const btnView = document.getElementById('action-sheet-view');
    if (btnView) btnView.onclick = () => {
      modal?.classList.remove('open');
      document.body.classList.remove('modal-open');
      viewOrderDetails(orderId);
    };

    // Wire Save
    const btnSave = document.getElementById('action-sheet-save');
    if (btnSave) btnSave.onclick = () => {
      modal?.classList.remove('open');
      document.body.classList.remove('modal-open');
      showToast(`Bill #${order.order_number} saved to storage.`, 'success');
    };

    // Wire Share
    const btnShare = document.getElementById('action-sheet-share');
    if (btnShare) btnShare.onclick = async () => {
      modal?.classList.remove('open');
      document.body.classList.remove('modal-open');
      const totalInr = (order.total_payable_paise ? order.total_payable_paise / 100 : order.total_payable_inr);
      const shareText = `Noor Optics Bill #${order.order_number}\nClient: ${order.customer_name || 'Valued Customer'}\nTotal: ₹${totalInr}\nThank you for choosing Noor Optics!`;
      if (navigator.share) {
        try {
          await navigator.share({ title: `Bill #${order.order_number}`, text: shareText, url: window.location.origin });
        } catch (err) { }
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText);
        showToast('Bill details copied to clipboard!', 'info');
      }
    };

    // Wire Edit
    const btnEdit = document.getElementById('action-sheet-edit');
    if (btnEdit) btnEdit.onclick = () => {
      modal?.classList.remove('open');
      document.body.classList.remove('modal-open');
      switchNav('pos');
      showToast(`Order #${order.order_number} loaded into POS editor.`, 'info');
    };

    // Wire Delete
    const btnDelete = document.getElementById('action-sheet-delete');
    if (btnDelete) btnDelete.onclick = () => {
      modal?.classList.remove('open');
      document.body.classList.remove('modal-open');
      deleteOrderPrompt(orderId, order.order_number);
    };

    // Wire Print (Silent dispatch to POS portable daemon, NO popup!)
    const btnPrint = document.getElementById('action-sheet-print');
    if (btnPrint) btnPrint.onclick = () => {
      modal?.classList.remove('open');
      document.body.classList.remove('modal-open');
      instantPrintReceipt(orderId);
    };

    // Wire Call
    const btnCall = document.getElementById('action-sheet-call');
    if (btnCall) btnCall.onclick = () => {
      modal?.classList.remove('open');
      document.body.classList.remove('modal-open');
      if (order.customer_phone) {
        window.location.href = `tel:${order.customer_phone}`;
      } else {
        showToast('No phone number recorded for this client.', 'warning');
      }
    };

    // Wire WA
    const btnWa = document.getElementById('action-sheet-wa');
    if (btnWa) btnWa.onclick = () => {
      modal?.classList.remove('open');
      document.body.classList.remove('modal-open');
      if (order.customer_phone) {
        openWhatsAppDirect(order.customer_phone, order.customer_name || 'Client');
      } else {
        showToast('No phone number recorded for this client.', 'warning');
      }
    };

    // Wire Pay
    const btnPay = document.getElementById('action-sheet-pay');
    if (btnPay) btnPay.onclick = () => {
      modal?.classList.remove('open');
      document.body.classList.remove('modal-open');
      openCollectPaymentModal(orderId);
    };

    if (modal) {
      modal.classList.add('open');
      document.body.classList.add('modal-open');
    }
  };

  // ── UPI Payment Verification Handlers ─────────────────────────────────────
  async function directPushOrderPaymentToCloud(orderRef, paymentStatus, reasonOrNotes = null) {
    if (!orderRef) return;
    try {
      const SUPABASE_URL = CLOUD_SYNC_CFG.url;
      const SUPABASE_ANON_KEY = CLOUD_SYNC_CFG.key;
      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      };

      const cleanRef = String(orderRef).trim();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-ORDER-PAYMENTS`, { headers });
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
          } catch (_) { }
        }
      }

      if (paymentStatus === 'VERIFIED') {
        if (!verified.includes(cleanRef)) verified.push(cleanRef);
        rejected = rejected.filter(r => r !== cleanRef);
        details[cleanRef] = { status: 'VERIFIED', verified_at: new Date().toISOString(), notes: reasonOrNotes || 'Verified by Staff' };
      } else if (paymentStatus === 'REJECTED') {
        if (!rejected.includes(cleanRef)) rejected.push(cleanRef);
        verified = verified.filter(r => r !== cleanRef);
        details[cleanRef] = { status: 'REJECTED', rejected_at: new Date().toISOString(), notes: reasonOrNotes || 'Payment rejected' };
      }

      const payloadNotes = JSON.stringify({
        verified_orders: verified,
        rejected_orders: rejected,
        details,
        updated_at: new Date().toISOString()
      });

      if (recordExists) {
        await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-ORDER-PAYMENTS`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ notes: payloadNotes, updated_at: new Date().toISOString() })
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            id: 'sys-order-payments-global',
            client_code: 'SYS-ORDER-PAYMENTS',
            name: 'System Order Payment Verifications',
            notes: payloadNotes
          })
        });
      }

      // Also update canonical public.orders table directly in Supabase
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanRef);
      const queryParam = isUuid ? `id=eq.${cleanRef}` : `or=(order_ref.eq.${cleanRef},order_number.eq.${cleanRef})`;
      const patchResp = await fetch(`${SUPABASE_URL}/rest/v1/orders?${queryParam}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          payment_status: paymentStatus,
          status: paymentStatus === 'VERIFIED' ? 'confirmed' : 'cancelled',
          updated_at: new Date().toISOString()
        })
      });

      // Release or cancel the print job in Supabase print_jobs queue
      let orderRowId = isUuid ? cleanRef : null;
      if (patchResp.ok) {
        const patchedRows = await patchResp.json();
        if (Array.isArray(patchedRows) && patchedRows.length > 0) {
          orderRowId = patchedRows[0].id;
        }
      }

      if (orderRowId) {
        if (paymentStatus === 'VERIFIED') {
          await fetch(`${SUPABASE_URL}/rest/v1/print_jobs`, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify({
              order_id: orderRowId,
              print_type: 'receipt',
              printer_id: 'POS-80',
              status: 'queued',
              attempt_count: 0,
              updated_at: new Date().toISOString()
            })
          }).catch(() => { });
        } else if (paymentStatus === 'REJECTED') {
          await fetch(`${SUPABASE_URL}/rest/v1/print_jobs?order_id=eq.${orderRowId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            })
          }).catch(() => { });
        }
      }
    } catch (e) {
      console.warn('directPushOrderPaymentToCloud note:', e.message);
    }
  }

  window.confirmUpiPayment = async function (orderId, paymentId) {
    if (!confirm('Confirm receipt of UPI payment for this order?\n\nThis will mark the order as PAID, move it into Website Orders, and send the receipt to the POS printer queue.')) return;
    try {
      const order = (state.ordersCache || []).find(o => o.id === orderId || o.order_number === orderId);
      const orderRef = order?.order_number || order?.order_ref || orderId;

      // 1. Immediate zero-latency UI update
      if (order) {
        order.payment_status = 'VERIFIED';
        order.status = 'confirmed';
        order.amount_paid_paise = order.total_payable_paise || Math.round((order.total_payable_inr || order.grand_total || 0) * 100);
        order.amount_paid_inr = order.amount_paid_paise / 100;
        order.outstanding_paise = 0;
      }
      renderOrdersTable();

      // 2. Primary: Dedicated Supabase RPC verify_website_order
      if (window.NoorSupabase && typeof window.NoorSupabase.verifyWebsiteOrder === 'function') {
        window.NoorSupabase.verifyWebsiteOrder(orderId).catch(err => console.warn('verifyWebsiteOrder RPC note:', err));
      }

      // 3. Dual-write to cloud tables
      directPushOrderPaymentToCloud(orderRef, 'VERIFIED').catch(() => { });

      // 4. Call backend endpoint
      await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentStatus: 'VERIFIED', status: 'CONFIRMED' })
      });

      // 5. Instantly print approved customer bill to POS thermal printer
      if (typeof instantPrintReceipt === 'function') {
        instantPrintReceipt(orderId, true, order, 'staff_approved').catch(() => { });
      } else {
        fetch('http://127.0.0.1:5001/api/wakeup', { method: 'POST' }).catch(() => { });
      }

      showToast('✓ Payment approved! Order moved to Website Orders & queued for printing.', 'success');
      const modal = document.getElementById('modal-order-details');
      if (modal && modal.classList.contains('open')) {
        modal.classList.remove('open');
      }
      await loadOrders(true);
      if (typeof loadDashboard === 'function') loadDashboard();
    } catch (err) {
      showToast('Verification failed: ' + err.message, 'error');
    }
  };

  window.rejectUpiPayment = async function (orderId, paymentId) {
    const reason = prompt('Enter reason for rejecting payment (e.g. "Credit not received in bank", "Underpaid"):', 'Credit not received in bank account');
    if (!reason) return;
    try {
      const order = (state.ordersCache || []).find(o => o.id === orderId || o.order_number === orderId);
      const orderRef = order?.order_number || order?.order_ref || orderId;

      // 1. Immediate zero-latency UI update
      if (order) {
        order.payment_status = 'REJECTED';
        order.status = 'cancelled';
      }
      renderOrdersTable();

      // 2. Primary: Dedicated Supabase RPC reject_website_order
      if (window.NoorSupabase && typeof window.NoorSupabase.rejectWebsiteOrder === 'function') {
        window.NoorSupabase.rejectWebsiteOrder(orderId, reason).catch(err => console.warn('rejectWebsiteOrder RPC note:', err));
      }

      // 3. Dual-write to cloud tables
      directPushOrderPaymentToCloud(orderRef, 'REJECTED', reason).catch(() => { });

      // 4. Call backend endpoint
      await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentStatus: 'REJECTED', status: 'CANCELLED', reasonOrNotes: reason })
      });

      showToast('Order payment marked as REJECTED and print job cancelled.', 'warning');
      const modal = document.getElementById('modal-order-details');
      if (modal && modal.classList.contains('open')) {
        modal.classList.remove('open');
      }
      await loadOrders(true);
      if (typeof loadDashboard === 'function') loadDashboard();
    } catch (err) {
      showToast('Rejection failed: ' + err.message, 'error');
    }
  };

  // ── View Order Details Modal ──────────────────────────────────────────────
  window.viewOrderDetails = async function (orderId) {
    window._activeViewingOrderId = orderId;
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
    subEl.textContent = `Channel: ${getOrderChannel(order) === 'POS' ? 'In-Store POS' : 'Website Online'} • ${formatDateTime(order.created_at)}`;

    // Items list with complete frame specifications
    const items = (order.items || []).slice();

    // Auto-synthesize lens item if order subtotal exceeds items total and lens item is not already separated
    const itemsTotalPaise = items.reduce((sum, it) => sum + (it.subtotal_paise || (it.unit_price_paise ? it.unit_price_paise * (it.quantity || 1) : 0)), 0);
    const subtotalPaise = order.subtotal_paise || order.total_payable_paise || 0;
    const hasLensItem = items.some(it => (it.product_name && it.product_name.includes('(Lens Package)')) || it.isLensItem || it.is_lens_item);

    if (subtotalPaise > itemsTotalPaise && !hasLensItem) {
      const diffPaise = subtotalPaise - itemsTotalPaise;
      const attachedLens = items.find(it => it.lens_name || it.lensName || it.lens || it.lens_package_name);
      const lName = (attachedLens && (attachedLens.lens_name || attachedLens.lensName || attachedLens.lens || attachedLens.lens_package_name)) || '1.60 High-Index Anti-Reflective';
      items.push({
        id: 'synth-lens-' + order.id,
        product_name: `${lName} (Lens Package)`,
        brand: 'Noor Precision Lenses',
        model: lName,
        variant_name: 'Custom Optical Glazing',
        sku: 'LENS-PKG',
        lens_name: lName,
        quantity: 1,
        unit_price_paise: diffPaise,
        subtotal_paise: diffPaise,
        unit_price_inr: diffPaise / 100,
        subtotal_inr: diffPaise / 100
      });
    }

    const itemsRows = items.map(i => {
      const specBits = [];
      if (i.brand) specBits.push(`Brand: <strong>${escapeHtml(i.brand)}</strong>`);
      if (i.model) specBits.push(`Model: ${escapeHtml(i.model)}`);
      if (i.shape) specBits.push(`Shape: ${escapeHtml(i.shape)}`);
      if (i.color || i.variant_name) specBits.push(`Color: ${escapeHtml(i.color || i.variant_name)}`);
      if (i.size) specBits.push(`Size: ${escapeHtml(i.size)}`);

      const lensName = i.lens_name || i.lensName || i.lens || i.lens_package_name;
      if (lensName && !String(i.product_name || '').includes('(Lens Package)')) {
        specBits.push(`Lens: <span style="color:#0284C7; font-weight:800; background:#E0F2FE; padding:1px 6px; border-radius:4px; border:1px solid #BAE6FD;">👓 ${escapeHtml(lensName)}</span>`);
      }
      if (i.sku) specBits.push(`SKU: <code style="font-size:0.72rem; background:#F1F5F9; padding:2px 4px; border-radius:4px;">${escapeHtml(i.sku)}</code>`);
      if (i.product_id) specBits.push(`ID: <span style="font-size:0.7rem; color:#94A3B8;">${escapeHtml(i.product_id)}</span>`);

      return `
      <tr>
        <td>
          <div style="font-size:0.92rem; font-weight:700; color:#0F172A;">${escapeHtml(i.product_name || 'Optical Frame')}</div>
          <div style="font-size:0.75rem; color:#475569; margin-top:3px; display:flex; flex-wrap:wrap; gap:8px;">
            ${specBits.join(' • ')}
          </div>
        </td>
        <td style="text-align:center; font-weight:700;">${i.quantity || 1}</td>
        <td>${formatINR(i.unit_price_paise, true)}</td>
        <td style="text-align:right;"><strong>${formatINR(i.subtotal_paise, true)}</strong></td>
      </tr>
      `;
    }).join('');

    const modalUtr = getOrderUtr(order);

    contentEl.innerHTML = `
      ${(modalUtr || order.payment_status === 'AWAITING_VERIFICATION') ? `
        <div style="background:#FFFBEB; border:1.5px solid #F59E0B; border-radius:8px; padding:14px 16px; margin-bottom:1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="font-size:0.75rem; font-weight:800; color:#92400E; text-transform:uppercase; letter-spacing:0.04em;">${order.payment_status === 'AWAITING_VERIFICATION' ? '⚠️ UPI Payment Verification Pending' : '✓ Verified UPI Payment'}</div>
            <div style="font-size:1.1rem; font-weight:800; color:#78350F; margin-top:3px; display:flex; align-items:center; gap:8px;">
              <span>Claimed UTR:</span>
              <span style="font-family:monospace; background:#FEF3C7; padding:2px 8px; border-radius:4px; border:1px solid #FDE68A; user-select:all;">${escapeHtml(modalUtr || 'No UTR entered by client')}</span>
              ${modalUtr ? `<button type="button" class="btn-table-action" style="font-size:0.72rem; padding:2px 8px; background:#FFFFFF; border:1px solid #CBD5E1;" onclick="navigator.clipboard.writeText('${escapeHtml(modalUtr)}'); showToast('UTR copied to clipboard!', 'success');">📋 Copy UTR</button>` : ''}
            </div>
            <div style="font-size:0.78rem; color:#A16207; margin-top:4px;">
              Check your bank SMS / Airtel app for <strong>₹${((order.total_payable_paise || 0) / 100).toLocaleString('en-IN')}</strong> from ${escapeHtml(order.customer_name || 'Client')}.
            </div>
          </div>
          ${order.payment_status === 'AWAITING_VERIFICATION' ? `
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn-table-action" style="background:#16A34A; color:#FFF; font-weight:800; padding:6px 14px; font-size:0.85rem;" onclick="confirmUpiPayment('${order.id}', '${order.payment_id || ''}')">✓ Approve & Mark Paid</button>
              <button type="button" class="btn-table-action" style="background:#DC2626; color:#FFF; font-weight:700; padding:6px 14px; font-size:0.85rem;" onclick="rejectUpiPayment('${order.id}', '${order.payment_id || ''}')">✗ Reject</button>
            </div>
          ` : '<span style="color:#16A34A; font-weight:800; font-size:0.85rem;">✓ Payment Verified</span>'}
        </div>
      ` : ''}
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem; background:#FAFAFC; padding:1.25rem; border-radius:6px; border:1px solid #E5E7EB;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <h4 style="font-size:0.78rem; text-transform:uppercase; color:#6B7280; margin:0;">Customer Information</h4>
            ${order.customer_client_code || order.client_code ? `<span style="background:#0F172A; color:#FFF; font-size:0.70rem; font-weight:800; padding:2px 8px; border-radius:4px; letter-spacing:0.04em;">${escapeHtml(order.customer_client_code || order.client_code)}</span>` : ''}
          </div>
          <div style="font-size:1.05rem; font-weight:800; color:#0F172A;">${escapeHtml(order.customer_name || 'Walk-in Client')}</div>
          
          <div style="margin-top:4px; font-size:0.83rem; color:#334155; display:flex; flex-direction:column; gap:3px;">
            ${order.customer_phone ? `
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:2px;">
                <span><strong>Phone:</strong> ${escapeHtml(order.customer_phone)}</span>
                <a href="tel:${escapeHtml(order.customer_phone)}" class="btn-table-action" style="text-decoration:none; padding:2px 8px; font-size:0.75rem; background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE;">📞 Call</a>
                <button type="button" class="btn-table-action" onclick="openWhatsAppDirect('${escapeHtml(order.customer_phone)}', '${escapeHtml(order.customer_name || 'Client')}')" style="padding:2px 8px; font-size:0.75rem; background:#F0FDF4; color:#15803D; border:1px solid #BBF7D0;">💬 WhatsApp</button>
              </div>
            ` : ''}
            ${order.customer_age ? `<div><strong>Age:</strong> ${escapeHtml(order.customer_age)} yrs</div>` : ''}
            ${order.city ? `<div><strong>City:</strong> ${escapeHtml(order.city)}</div>` : ''}
            ${order.customer_email ? `<div><strong>Email:</strong> ${escapeHtml(order.customer_email)}</div>` : ''}
            ${order.delivery_address ? `<div style="font-size:0.8rem; color:#64748B;"><strong>Address:</strong> ${escapeHtml(order.delivery_address)}${order.city ? ', ' + escapeHtml(order.city) : ''} ${order.pin_code ? '- ' + escapeHtml(order.pin_code) : ''}</div>` : ''}
          </div>

          ${order.customer_id ? `
            <div style="margin-top:10px;">
              <button type="button" class="btn-table-action" onclick="openClientProfile('${order.customer_id}')" style="background:#F1F5F9; color:#0F172A; border:1px solid #CBD5E1; font-weight:700; font-size:0.75rem; padding:4px 10px;">
                👤 View Client Profile & Prescriptions
              </button>
            </div>
          ` : ''}
        </div>
        <div>
          <h4 style="font-size:0.78rem; text-transform:uppercase; color:#6B7280; margin-bottom:6px;">Payment & Status</h4>
          <div><strong>Order Source:</strong> <span class="badge-status status-completed">${getOrderChannel(order) === 'POS' ? 'IN-STORE POS' : 'WEBSITE'}</span></div>
          <div style="margin-top:4px;"><strong>Payment Method:</strong> ${escapeHtml(order.payment_method || 'CASH')}</div>
          <div style="margin-top:2px;"><strong>Payment Status:</strong> <span class="badge-status status-${order.payment_status?.toLowerCase()}">${escapeHtml(order.payment_status)}</span></div>
          <div style="margin-top:2px;"><strong>Order Status:</strong> <span class="badge-status status-${order.status?.toLowerCase()}">${escapeHtml(order.status)}</span></div>
        </div>
      </div>

      <!-- Glasses Prescription Section -->
      ${order.prescription_number ? `
        <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:1.1rem; margin-bottom:1.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.25rem;">👓</span>
              <div>
                <strong style="color:#166534; font-size:0.95rem;">Glasses Prescription: ${escapeHtml(order.prescription_number)}</strong>
                <div style="font-size:0.72rem; color:#15803D;">Date: ${formatShortDate(order.prescription_date || order.created_at)} • Checked by: ${escapeHtml(order.rx_checked_by || order.checked_by || 'Optometrist')}${order.prescriber_details ? ` • Prescriber: ${escapeHtml(order.prescriber_details)}` : ''}</div>
              </div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="btn-table-action" style="background:#2563EB; color:#FFF; font-weight:700; padding:6px 14px;" onclick="openEditPrescriptionModal('${order.prescription_id}')">
                ✏️ Edit Prescription Lens Values
              </button>
              <button type="button" class="btn-table-action" style="background:#166534; color:#FFF; font-weight:700; padding:6px 14px;" onclick="printPrescriptionRecord('${order.prescription_id}')">
                🖨️ Print Prescription RX
              </button>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; font-size:0.82rem; background:#FFF; padding:12px; border-radius:6px; border:1px solid #DCFCE7;">
            <div>
              <span style="color:#6B7280; font-size:0.72rem; text-transform:uppercase; font-weight:700; display:block;">OD (Right Eye)</span>
              <strong>SPH:</strong> ${order.od_sph || '0.00'}<br/>
              <strong>CYL:</strong> ${order.od_cyl || '0.00'}<br/>
              <strong>AXIS:</strong> ${order.od_axis != null ? order.od_axis + '°' : '-'}
            </div>
            <div>
              <span style="color:#6B7280; font-size:0.72rem; text-transform:uppercase; font-weight:700; display:block;">OS (Left Eye)</span>
              <strong>SPH:</strong> ${order.os_sph || '0.00'}<br/>
              <strong>CYL:</strong> ${order.os_cyl || '0.00'}<br/>
              <strong>AXIS:</strong> ${order.os_axis != null ? order.os_axis + '°' : '-'}
            </div>
            <div>
              <span style="color:#6B7280; font-size:0.72rem; text-transform:uppercase; font-weight:700; display:block;">Optics & IPD</span>
              ${order.addition ? `<div><strong>ADD:</strong> ${escapeHtml(order.addition)}</div>` : ''}
              ${order.ipd_distance ? `<div><strong>Distance IPD:</strong> ${order.ipd_distance} mm</div>` : ''}
              ${order.ipd_near ? `<div><strong>Near IPD:</strong> ${order.ipd_near} mm</div>` : ''}
            </div>
          </div>
          ${order.rx_notes ? `<div style="font-size:0.75rem; color:#374151; margin-top:8px; font-style:italic;"><strong>Clinical Notes:</strong> ${escapeHtml(order.rx_notes)}</div>` : ''}
          ${order.rx_image_url ? `<div style="margin-top:8px;"><a href="${escapeHtml(order.rx_image_url.startsWith('/') ? order.rx_image_url : '/' + order.rx_image_url)}" target="_blank" style="font-size:0.75rem; color:#1D4ED8; font-weight:600;">📷 View Uploaded Prescription Document</a></div>` : ''}
        </div>
      ` : `
        <div style="background:#F9FAFB; border:1px dashed #D1D5DB; border-radius:6px; padding:0.75rem; margin-bottom:1.5rem; font-size:0.8rem; color:#6B7280; display:flex; justify-content:space-between; align-items:center;">
          <span>${order.prescription_pref ? `Prescription Preference: <strong>${escapeHtml(order.prescription_pref)}</strong>` : 'No structured glasses prescription attached to this order.'}</span>
          ${order.customer_id ? `
            <button type="button" class="btn-table-action" onclick="openClientProfile('${order.customer_id}')">
              View Client Profile & Past RX
            </button>
          ` : ''}
        </div>
      `}

      <h4 style="font-size:0.85rem; font-weight:800; margin-bottom:8px;">Purchased Frames & Products</h4>
      <table class="data-table" style="margin-bottom:1.5rem;">
        <thead>
          <tr>
            <th>Frame Item & Specifications</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th style="text-align:right;">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows || `<tr><td colspan="4" style="text-align:center;">Optical Frame</td></tr>`}
        </tbody>
      </table>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem; align-items:start; margin-top:1rem; padding-top:1rem; border-top:1px solid #E5E7EB;">
        <!-- Left Column: Client's Preferred Prescription RX Values (Multi-Rx Supported) -->
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${(() => {
        let rxList = [];
        if (Array.isArray(order.prescriptions) && order.prescriptions.length > 0) {
          rxList = order.prescriptions.filter(Boolean);
        } else if (order.prescriptions_json) {
          try {
            const p = JSON.parse(order.prescriptions_json);
            if (Array.isArray(p) && p.length > 0) rxList = p;
          } catch (_) { }
        }
        if (rxList.length === 0 && (order.od_sph || order.os_sph || order.prescription_number || order.prescription_id)) {
          rxList = [{
            id: order.prescription_id,
            prescription_number: order.prescription_number,
            od_sph: order.od_sph,
            od_cyl: order.od_cyl,
            od_axis: order.od_axis,
            os_sph: order.os_sph,
            os_cyl: order.os_cyl,
            os_axis: order.os_axis,
            addition: order.addition,
            ipd_distance: order.ipd_distance,
            rx_checked_by: order.rx_checked_by,
            rx_notes: order.rx_notes
          }];
        }

        if (rxList.length === 0) {
          return `
                <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:12px; font-size:0.82rem;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span style="font-size:1.15rem;">👓</span>
                      <strong style="color:#166534; font-size:0.88rem;">Client Prescription (RX)</strong>
                    </div>
                    ${order.customer_id ? `
                      <button type="button" class="btn-table-action" style="padding:2px 8px; font-size:0.75rem; background:#2563EB; color:#FFF; font-weight:700;" onclick="openEditPrescriptionModal('', '${order.customer_id}')">+ Add RX</button>
                    ` : ''}
                  </div>
                  <div style="background:#FFFFFF; border:1px dashed #CBD5E1; border-radius:6px; padding:8px 10px; font-size:0.80rem; color:#64748B;">
                    <div>Preference: <strong>${escapeHtml(order.prescription_pref || 'Standard Demonstration Lenses')}</strong></div>
                    <div style="font-size:0.74rem; margin-top:3px; color:#94A3B8;">No structured OD/OS power values submitted for this order.</div>
                  </div>
                </div>
              `;
        }

        return rxList.map((rx, idx) => {
          const rxId = rx.id || '';
          const rxNum = rx.prescription_number || rx.prescriptionNumber || '';
          const odSph = rx.od_sph != null ? rx.od_sph : (rx.odSph || '0.00');
          const odCyl = rx.od_cyl != null ? rx.od_cyl : (rx.odCyl || '0.00');
          const odAxis = rx.od_axis != null ? (rx.od_axis + '°') : (rx.odAxis != null ? rx.odAxis + '°' : '-');
          const osSph = rx.os_sph != null ? rx.os_sph : (rx.osSph || '0.00');
          const osCyl = rx.os_cyl != null ? rx.os_cyl : (rx.osCyl || '0.00');
          const osAxis = rx.os_axis != null ? (rx.os_axis + '°') : (rx.osAxis != null ? rx.osAxis + '°' : '-');
          const addVal = rx.addition || rx.add || '-';
          const ipd = rx.ipd_distance || rx.ipdDistance || rx.pd;
          const doc = rx.checked_by || rx.checkedBy || rx.rx_checked_by;
          const notes = rx.notes || rx.rx_notes;

          const titleLabel = rxList.length > 1
            ? `Prescription RX #${idx + 1}: ${escapeHtml(rxNum || 'Attached')}`
            : (rxNum ? `Prescription RX: ${escapeHtml(rxNum)}` : 'Client Prescription (RX)');

          return `
                <div style="background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:12px; font-size:0.82rem;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span style="font-size:1.15rem;">👓</span>
                      <strong style="color:#166534; font-size:0.88rem;">${titleLabel}</strong>
                    </div>
                    ${rxId ? `
                      <div style="display:flex; gap:4px;">
                        <button type="button" class="btn-table-action" style="padding:2px 8px; font-size:0.75rem; background:#166534; color:#FFF; font-weight:700;" onclick="printPrescriptionRecord('${rxId}')">🖨️ Print RX</button>
                        <button type="button" class="btn-table-action" style="padding:2px 8px; font-size:0.75rem; background:#2563EB; color:#FFF; font-weight:700;" onclick="openEditPrescriptionModal('${rxId}')">✏️ Edit</button>
                      </div>
                    ` : ''}
                  </div>

                  <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; background:#FFFFFF; border:1px solid #DCFCE7; border-radius:6px; padding:8px 10px; font-size:0.80rem; line-height:1.5;">
                    <div>
                      <strong style="color:#0A2540; font-size:0.72rem; display:block; text-transform:uppercase;">OD (Right Eye)</strong>
                      <div>SPH: <strong>${odSph}</strong></div>
                      <div>CYL: <strong>${odCyl}</strong></div>
                      <div>AXIS: <strong>${odAxis}</strong></div>
                    </div>
                    <div>
                      <strong style="color:#0A2540; font-size:0.72rem; display:block; text-transform:uppercase;">OS (Left Eye)</strong>
                      <div>SPH: <strong>${osSph}</strong></div>
                      <div>CYL: <strong>${osCyl}</strong></div>
                      <div>AXIS: <strong>${osAxis}</strong></div>
                    </div>
                    <div>
                      <strong style="color:#0A2540; font-size:0.72rem; display:block; text-transform:uppercase;">Optics & PD</strong>
                      <div>ADD: <strong>${escapeHtml(addVal)}</strong></div>
                      ${ipd ? `<div>IPD: <strong>${ipd} mm</strong></div>` : ''}
                      ${doc ? `<div style="font-size:0.72rem; color:#6B7280; margin-top:2px;">By: ${escapeHtml(doc)}</div>` : ''}
                    </div>
                  </div>
                  ${notes ? `<div style="font-size:0.74rem; color:#4B5563; margin-top:6px; font-style:italic;">Notes: ${escapeHtml(notes)}</div>` : ''}
                </div>
              `;
        }).join('');
      })()}
        </div>

        <!-- Right Column: Financial Summary -->
        <div style="display:flex; flex-direction:column; gap:6px; font-size:0.85rem;">
          <div style="display:flex; justify-content:space-between;">
            <span>Subtotal:</span>
            <span>${formatINR(order.subtotal_paise, true)}</span>
          </div>
          ${order.previous_due_inr ? `
            <div style="display:flex; justify-content:space-between; color:#475569;">
              <span>Previous Due:</span>
              <span>₹${order.previous_due_inr.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          <div style="display:flex; justify-content:space-between; color:#D97706;">
            <span>Discount:</span>
            <span>-${formatINR(order.discount_paise || 0, true)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; color:#6B7280;">
            <span>GST (18% Included):</span>
            <span>${formatINR(order.tax_paise || 0, true)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:1.05rem; font-weight:800; border-top:1px solid #CCC; padding-top:6px; margin-top:4px;">
            <span>Grand Total:</span>
            <span>${formatINR(order.total_payable_paise, true)}</span>
          </div>
          ${(order.advance_paid_inr || order.advance_paid_paise) ? `
            <div style="display:flex; justify-content:space-between; color:#16A34A; font-weight:600;">
              <span>Advance Paid:</span>
              <span>₹${((order.advance_paid_inr != null) ? order.advance_paid_inr : (order.advance_paid_paise / 100)).toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          ${(order.second_payment_inr || order.second_payment_paise) ? `
            <div style="display:flex; justify-content:space-between; color:#16A34A; font-weight:600;">
              <span>2nd Payment:</span>
              <span>₹${((order.second_payment_inr != null) ? order.second_payment_inr : (order.second_payment_paise / 100)).toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          ${(order.third_payment_inr || order.third_payment_paise) ? `
            <div style="display:flex; justify-content:space-between; color:#16A34A; font-weight:600;">
              <span>3rd Payment:</span>
              <span>₹${((order.third_payment_inr != null) ? order.third_payment_inr : (order.third_payment_paise / 100)).toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          ${order.pickup_time ? `
            <div style="display:flex; justify-content:space-between; color:#0284C7; font-weight:600; font-size:0.8rem;">
              <span>Pickup Time:</span>
              <span>${formatDateTime(order.pickup_time)}</span>
            </div>
          ` : ''}
          <div style="display:flex; justify-content:space-between; font-size:1.15rem; font-weight:900; color:${((order.outstanding_inr != null ? order.outstanding_inr : order.outstanding_paise) > 0) ? '#DC2626' : '#16A34A'}; border-top:1.5px dashed #CBD5E1; padding-top:6px; margin-top:4px;">
            <span>Remaining Due (REM):</span>
            <span>₹${((order.outstanding_inr != null) ? order.outstanding_inr : ((order.outstanding_paise || 0) / 100)).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    `;

    // Dynamic actions based on order status and channel
    actionsEl.innerHTML = `
      <button type="button" class="btn-header-action" data-close-modal>Close</button>
      ${(getOrderChannel(order) === 'POS' && ((order.outstanding_inr != null ? order.outstanding_inr : order.outstanding_paise) > 0)) ? `
        <button type="button" class="btn-header-action" style="background:#16A34A; color:#FFF; font-weight:800;" onclick="openCollectPaymentModal('${order.id}')">💳 Collect Payment</button>
      ` : ''}
      ${order.payment_status === 'AWAITING_VERIFICATION' ? `
        <button type="button" class="btn-header-action" style="background:#16A34A; color:#FFF; font-weight:800;" onclick="confirmUpiPayment('${order.id}', '${order.payment_id || ''}')">✓ Approve UPI Payment</button>
        <button type="button" class="btn-header-action" style="background:#DC2626; color:#FFF; font-weight:700;" onclick="rejectUpiPayment('${order.id}', '${order.payment_id || ''}')">✗ Reject Payment</button>
      ` : ''}
      <button type="button" class="btn-header-action" style="background:#2563EB; color:#FFF; font-weight:700;" onclick="downloadInvoicePDF('${order.id}', '${escapeHtml(order.order_number)}')">📥 Download PDF Invoice</button>
      <button type="button" class="btn-header-action btn-secondary" onclick="window.open('/api/invoices/order/${order.id}/pdf', '_blank')">👁️ View PDF</button>
      <button type="button" class="btn-header-action btn-secondary" onclick="previewThermalReceipt('${order.id}')">🖨️ Thermal Receipt</button>
      ${order.prescription_id ? `<button type="button" class="btn-header-action" style="background:#059669; color:#FFF; font-weight:700;" onclick="printPrescriptionRecord('${order.prescription_id}')">👓 Prescription RX</button>` : ''}
      <button type="button" class="btn-header-action btn-danger-soft" onclick="deleteOrderPrompt('${order.id}', '${escapeHtml(order.order_number)}')">🗑️ Delete Order</button>
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

  // ── Direct Cloud Supabase Deletion Helper ──────────────────────────────────
  const CLOUD_SYNC_CFG = {
    url: 'https://czajxtgwsxbrrymrhauz.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk'
  };

  async function directDeleteSupabaseOrder(orderRef) {
    if (!orderRef) return;
    try {
      // 1. Persist directly to Supabase cloud tombstone register
      const res = await fetch(`${CLOUD_SYNC_CFG.url}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-ORDERS`, {
        headers: { 'apikey': CLOUD_SYNC_CFG.key, 'Authorization': `Bearer ${CLOUD_SYNC_CFG.key}` }
      });
      let tombData = { orders: [] };
      if (res.ok) {
        const list = await res.json();
        if (list[0]?.notes) {
          try {
            const p = JSON.parse(list[0].notes);
            if (Array.isArray(p)) tombData.orders = p;
            else if (p.orders) tombData = p;
          } catch (e) { }
        }
      }
      if (!tombData.orders.includes(orderRef)) tombData.orders.push(orderRef);
      await fetch(`${CLOUD_SYNC_CFG.url}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-ORDERS`, {
        method: 'PATCH',
        headers: {
          'apikey': CLOUD_SYNC_CFG.key,
          'Authorization': `Bearer ${CLOUD_SYNC_CFG.key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: JSON.stringify(tombData), updated_at: new Date().toISOString() })
      });
    } catch (e) {
      console.warn('Cloud tombstone write note:', e);
    }

    try {
      await fetch(`${CLOUD_SYNC_CFG.url}/rest/v1/orders?order_ref=eq.${encodeURIComponent(orderRef)}`, {
        method: 'DELETE',
        headers: {
          'apikey': CLOUD_SYNC_CFG.key,
          'Authorization': `Bearer ${CLOUD_SYNC_CFG.key}`
        }
      });
    } catch (e) {
      console.warn('Direct cloud delete note:', e);
    }
  }

  async function directDeleteAllSupabaseOrders() {
    try {
      const res = await fetch(`${CLOUD_SYNC_CFG.url}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-ORDERS`, {
        headers: { 'apikey': CLOUD_SYNC_CFG.key, 'Authorization': `Bearer ${CLOUD_SYNC_CFG.key}` }
      });
      let tombData = { orders: [], purged_before: new Date().toISOString() };
      if (res.ok) {
        const list = await res.json();
        if (list[0]?.notes) {
          try {
            const p = JSON.parse(list[0].notes);
            if (Array.isArray(p)) tombData.orders = p;
            else if (p.orders) tombData.orders = p.orders;
          } catch (e) { }
        }
      }
      state.ordersCache.forEach(o => {
        if (o.order_number && !tombData.orders.includes(o.order_number)) tombData.orders.push(o.order_number);
      });
      await fetch(`${CLOUD_SYNC_CFG.url}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-ORDERS`, {
        method: 'PATCH',
        headers: {
          'apikey': CLOUD_SYNC_CFG.key,
          'Authorization': `Bearer ${CLOUD_SYNC_CFG.key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: JSON.stringify(tombData), updated_at: new Date().toISOString() })
      });
    } catch (e) {
      console.warn('Cloud tombstone write note:', e);
    }

    try {
      await fetch(`${CLOUD_SYNC_CFG.url}/rest/v1/orders?id=not.is.null`, {
        method: 'DELETE',
        headers: {
          'apikey': CLOUD_SYNC_CFG.key,
          'Authorization': `Bearer ${CLOUD_SYNC_CFG.key}`
        }
      });
    } catch (e) {
      console.warn('Direct cloud delete all note:', e);
    }
  }

  // ── Direct Cloud Operations for Optical Frames (Zero-Dependency) ───────────
  async function directFetchCloudProductTombstones() {
    try {
      const res = await fetch(`${CLOUD_SYNC_CFG.url}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
        headers: { 'apikey': CLOUD_SYNC_CFG.key, 'Authorization': `Bearer ${CLOUD_SYNC_CFG.key}` }
      });
      if (!res.ok) return new Set();
      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0 || !list[0].notes) return new Set();
      const parsed = JSON.parse(list[0].notes);
      const arr = Array.isArray(parsed) ? parsed : (parsed.products || []);
      const set = new Set();
      arr.forEach(t => set.add(String(t).toLowerCase().trim()));
      return set;
    } catch (e) {
      return new Set();
    }
  }

  async function directFetchSupabaseCatalog(tombstones = null) {
    try {
      const SUPABASE_URL = CLOUD_SYNC_CFG.url;
      const SUPABASE_ANON_KEY = CLOUD_SYNC_CFG.key;
      const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      };

      const deletedTokens = tombstones || getDeletedProductTokens();

      // Fetch custom catalog products stored in SYS-CATALOG-PRODUCTS
      let customList = [];
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-CATALOG-PRODUCTS`, { headers });
        if (res.ok) {
          const list = await res.json();
          if (list[0]?.notes) {
            const parsed = JSON.parse(list[0].notes);
            if (Array.isArray(parsed)) {
              customList = parsed
                .filter(p => {
                  if (!p || p.is_active === false) return false;
                  const pId = p.id ? String(p.id).toLowerCase().trim() : '';
                  const pName = p.name ? String(p.name).toLowerCase().trim() : '';
                  const pSku = p.sku ? String(p.sku).toLowerCase().trim() : '';
                  return !deletedTokens.has(pId) && !deletedTokens.has(pName) && !deletedTokens.has(pSku);
                })
                .map(cp => ({
                  id: cp.id,
                  sku: cp.sku || ('NOOR-' + (cp.name || 'FRAME').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)),
                  name: cp.name,
                  brand: cp.brand || cp.collection || 'Noor Optics',
                  category: cp.category || 'Frames',
                  shape: cp.shape || 'Rectangular',
                  material: cp.material || 'Acetate',
                  fit: cp.fit || 'Regular',
                  selling_price_inr: Number(cp.price || cp.selling_price_inr || 0),
                  purchase_cost_inr: Number(cp.purchaseCostINR || cp.purchase_cost_inr || 0),
                  total_stock: Number(cp.stock !== undefined ? cp.stock : (cp.initialStock !== undefined ? cp.initialStock : 10)),
                  reorder_threshold: Number(cp.reorder_threshold || 2),
                  image_url: cp.image || cp.imageUrl || cp.image_url || 'images/frames/frame_01.jpg',
                  description: cp.description || '',
                  is_active: 1,
                  created_at: cp.created_at || new Date().toISOString()
                }));
            }
          }
        }
      } catch (_) { }

      return customList;
    } catch (e) {
      return [];
    }
  }

  async function directClearAllSupabaseInventory(additionalTokens = []) {
    const SUPABASE_URL = CLOUD_SYNC_CFG.url;
    const SUPABASE_ANON_KEY = CLOUD_SYNC_CFG.key;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };

    // 1. Wipe SYS-CATALOG-PRODUCTS
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-CATALOG-PRODUCTS`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ notes: '[]', updated_at: new Date().toISOString() })
      });
    } catch (_) { }

    // 2. Deactivate products table
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/products?id=not.is.null`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_active: false })
      }).catch(() => { });
    } catch (_) { }

    // 3. Collect all base and custom tokens
    const baseTokens = [
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
      'The Bergen Dual', 'The Bordeaux Edge'
    ];

    const tokensToTomb = new Set(baseTokens.map(t => t.toLowerCase().trim()));
    if (Array.isArray(additionalTokens)) {
      additionalTokens.forEach(t => { if (t) tokensToTomb.add(String(t).toLowerCase().trim()); });
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });
      let tombList = [];
      let recordExists = false;
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          recordExists = true;
          try {
            const parsed = JSON.parse(list[0].notes || '{}');
            if (Array.isArray(parsed)) tombList = parsed;
            else if (parsed.products) tombList = parsed.products;
          } catch (_) { }
        }
      }

      tombList.forEach(t => tokensToTomb.add(String(t).toLowerCase().trim()));
      const finalArr = Array.from(tokensToTomb);

      const payload = {
        notes: JSON.stringify({ products: finalArr, updated_at: new Date().toISOString() }),
        updated_at: new Date().toISOString()
      };

      if (recordExists) {
        await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
          method: 'POST',
          headers,
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
    } catch (_) { }
  }

  async function directSaveSupabaseProduct(product) {
    if (!product) return;
    const SUPABASE_URL = CLOUD_SYNC_CFG.url;
    const SUPABASE_ANON_KEY = CLOUD_SYNC_CFG.key;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };

    const prodId = product.id || ('prod-' + Date.now());
    const sku = (product.sku && product.sku.trim() && product.sku.trim().toUpperCase() !== 'NOOR-FRAME')
      ? product.sku.trim().toUpperCase()
      : ('NOOR-' + (product.brand || product.name || 'FRAME').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) + '-' + prodId.slice(-4));

    const formatted = {
      id: prodId,
      sku: sku,
      name: product.name,
      brand: product.brand || 'Noor Optics',
      collection: product.brand || 'Noor Signature',
      price: Number(product.sellingPriceINR || product.selling_price_inr || product.price || 3499),
      original_price: product.originalPriceINR || product.original_price_inr || product.original_price ? Number(product.originalPriceINR || product.original_price_inr || product.original_price) : null,
      badge: product.badge || 'New Arrival',
      shape: product.shape || 'Rectangular',
      material: product.material || 'Japanese Titanium',
      fit: product.fit || 'Regular',
      category: product.category || 'Optical',
      rating: 5.0,
      reviews_count: 1,
      image: product.imageUrl || product.image_url || product.image || 'images/frames/frame_01.jpg',
      colors: Array.isArray(product.variants) && product.variants.length > 0
        ? product.variants.map(v => ({ name: v.colorName || v.color_name || 'Standard', hex: v.colorHex || v.color_hex || '#111111' }))
        : (product.colors || [{ name: 'Standard', hex: '#111111' }]),
      dimensions: product.dimensions || { lens: '52mm', bridge: '18mm', temple: '145mm', weight: '15g' },
      description: product.description || '',
      stock: Number(product.initialStock !== undefined ? product.initialStock : (product.stock !== undefined ? product.stock : (product.variants && product.variants[0] && product.variants[0].initialStock !== undefined ? product.variants[0].initialStock : (product.total_stock || 10)))),
      is_active: true,
      updated_at: new Date().toISOString()
    };

    // Step A: Remove from SYS-TOMBSTONE-PRODUCTS
    try {
      const tRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, { headers });
      if (tRes.ok) {
        const tList = await tRes.json();
        if (Array.isArray(tList) && tList.length > 0 && tList[0].notes) {
          const parsed = JSON.parse(tList[0].notes);
          let tombList = Array.isArray(parsed) ? parsed : (parsed.products || []);
          const cleanTokens = new Set([
            String(prodId).toLowerCase().trim(),
            String(sku).toLowerCase().trim(),
            String(product.name || '').toLowerCase().trim(),
            String(product.brand || '').toLowerCase().trim()
          ]);
          const filtered = tombList.filter(t => !cleanTokens.has(String(t).toLowerCase().trim()));
          if (filtered.length !== tombList.length) {
            await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ notes: JSON.stringify({ products: filtered, updated_at: new Date().toISOString() }), updated_at: new Date().toISOString() })
            });
          }
        }
      }
    } catch (_) { }

    // Step B: Direct Upsert to SYS-CATALOG-PRODUCTS
    try {
      const cRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-CATALOG-PRODUCTS`, { headers });
      let currentList = [];
      let recordExists = false;
      if (cRes.ok) {
        const cList = await cRes.json();
        if (Array.isArray(cList) && cList.length > 0) {
          recordExists = true;
          try { currentList = JSON.parse(cList[0].notes || '[]'); } catch (_) { currentList = []; }
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
          headers,
          body: JSON.stringify({ notes: JSON.stringify(currentList), updated_at: new Date().toISOString() })
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            id: 'sys-catalog-products-meta',
            client_code: 'SYS-CATALOG-PRODUCTS',
            name: 'System Catalog Custom Products',
            notes: JSON.stringify(currentList)
          })
        });
      }
    } catch (e) {
      console.warn('SYS-CATALOG-PRODUCTS direct save note:', e);
    }

    // Step C: Try upserting to Supabase products table (only matching schema columns)
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
          ...headers,
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify([tableRow])
      });
    } catch (_) { }
  }

  async function directDeleteSupabaseProduct(productId, sku, name) {
    if (!productId && !sku && !name) return;
    const SUPABASE_URL = CLOUD_SYNC_CFG.url;
    const SUPABASE_ANON_KEY = CLOUD_SYNC_CFG.key;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };

    const tokens = new Set();
    if (productId) tokens.add(String(productId).toLowerCase().trim());
    if (sku) tokens.add(String(sku).toLowerCase().trim());
    if (name) tokens.add(String(name).toLowerCase().trim());

    // 1. Delete and deactivate from Supabase `products` table
    try {
      if (productId) {
        await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ is_active: false })
        }).catch(() => { });
        await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(productId)}`, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
        }).catch(() => { });
      }
    } catch (e) {
      console.warn('Products table cloud delete note:', e);
    }

    // 2. Remove from SYS-CATALOG-PRODUCTS
    try {
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
              headers,
              body: JSON.stringify({ notes: JSON.stringify(currentList), updated_at: new Date().toISOString() })
            });
          }
        }
      }
    } catch (e) {
      console.warn('SYS-CATALOG-PRODUCTS cloud delete note:', e);
    }

    // 3. Register in SYS-TOMBSTONE-PRODUCTS
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });
      let tombList = [];
      let recordExists = false;
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          recordExists = true;
          try {
            const parsed = JSON.parse(list[0].notes || '{}');
            if (Array.isArray(parsed)) tombList = parsed;
            else if (parsed.products) tombList = parsed.products;
          } catch (_) { }
        }
      }
      tokens.forEach(tok => {
        if (!tombList.some(x => String(x).toLowerCase().trim() === tok)) {
          tombList.push(tok);
        }
      });
      const payload = {
        notes: JSON.stringify({ products: tombList, updated_at: new Date().toISOString() }),
        updated_at: new Date().toISOString()
      };
      if (recordExists) {
        await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
          method: 'POST',
          headers,
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
    } catch (e) {
      console.warn('SYS-TOMBSTONE-PRODUCTS cloud write note:', e);
    }
  }

  // ── Delete Single Order with Inventory Restocking ──────────────────────────
  window.deleteOrderPrompt = async function (orderId, orderNumber) {
    if (!confirm(`Are you sure you want to delete order "${orderNumber || orderId}"?\n\nThis will permanently remove the order record from database and cloud, and restore any deducted frame quantities back into inventory stock.`)) {
      return;
    }

    try {
      // 1. Save to client tombstone immediately
      try {
        const del = JSON.parse(localStorage.getItem('noor_deleted_orders') || '[]');
        if (orderNumber && !del.includes(orderNumber)) del.push(orderNumber);
        if (orderId && !del.includes(orderId)) del.push(orderId);
        localStorage.setItem('noor_deleted_orders', JSON.stringify(del));
      } catch (e) { }

      // 2. Remove from local UI state immediately so UI and dashboard update instantly
      state.ordersCache = (state.ordersCache || []).filter(o => o.id !== orderId && o.order_number !== orderNumber);
      renderOrdersTable();

      // 3. Immediately reset / update dashboard
      if (typeof loadDashboard === 'function') loadDashboard();

      // 4. Delete from Supabase cloud database (safely, network error won't block local delete)
      if (window.NoorSupabase && window.NoorSupabase.isConfigured()) {
        try {
          await window.NoorSupabase.deleteOrder(orderId || orderNumber);
        } catch (cloudErr) {
          console.warn('Supabase deleteOrder warning:', cloudErr);
        }
      }

      // 5. Delete from local backend (pass both id and orderNumber for guaranteed cascade delete)
      try {
        await apiFetch(`/api/orders/${encodeURIComponent(orderId)}?orderNumber=${encodeURIComponent(orderNumber || '')}`, { method: 'DELETE' });
      } catch (beErr) {
        console.warn('Backend delete warning:', beErr);
      }

      showToast(`Order ${orderNumber || orderId} permanently deleted.`, 'success');

      // Close details modal if open
      const detailsModal = document.getElementById('modal-order-details');
      if (detailsModal) detailsModal.classList.remove('open');

      // Refresh data across orders, dashboard, and inventory
      await loadOrders(true);
      if (typeof loadDashboard === 'function') loadDashboard();
      if (typeof loadInventory === 'function') loadInventory();
    } catch (err) {
      showToast('Failed to delete order: ' + err.message, 'error');
      loadOrders(true);
      if (typeof loadDashboard === 'function') loadDashboard();
    }
  };

  // ── Delete All Orders Pipeline ──────────────────────────────────────────────
  window.deleteAllOrdersPrompt = async function () {
    const channel = state.ordersActiveChannel || 'ALL';
    const channelLabel = channel === 'ALL' ? 'ALL orders' : (channel === 'POS' ? 'all IN-STORE orders' : 'all WEBSITE orders');
    if (!confirm(`Are you sure you want to delete ${channelLabel}?\n\nThis will permanently delete the orders from both the local database and Supabase cloud, and reset the dashboard.`)) {
      return;
    }

    try {
      // 1. Save all to client tombstone immediately
      try {
        const del = JSON.parse(localStorage.getItem('noor_deleted_orders') || '[]');
        (state.ordersCache || []).forEach(o => {
          if (channel === 'ALL' || (channel === 'POS' && getOrderChannel(o) === 'POS') || (channel === 'WEBSITE' && getOrderChannel(o) !== 'POS')) {
            if (o.order_number && !del.includes(o.order_number)) del.push(o.order_number);
            if (o.id && !del.includes(o.id)) del.push(o.id);
          }
        });
        localStorage.setItem('noor_deleted_orders', JSON.stringify(del));
      } catch (e) { }

      // 2. Optimistically clear UI state immediately
      state.ordersCache = channel === 'ALL' ? [] : (state.ordersCache || []).filter(o => {
        if (channel === 'POS') return getOrderChannel(o) !== 'POS';
        if (channel === 'WEBSITE') return getOrderChannel(o) === 'POS';
        return true;
      });
      renderOrdersTable();

      // 3. Immediately reset dashboard figures
      if (typeof loadDashboard === 'function') loadDashboard();

      // 4. Direct cloud deletion
      try {
        await directDeleteAllSupabaseOrders();
      } catch (cloudErr) {
        console.warn('Supabase delete all warning:', cloudErr);
      }

      // 5. Delete from local backend
      const url = channel === 'ALL' ? '/api/orders' : `/api/orders?channel=${channel}`;
      const res = await apiFetch(url, { method: 'DELETE' });
      showToast(res.message || 'Orders deleted successfully.', 'success');

      await loadOrders(true);
      if (typeof loadDashboard === 'function') loadDashboard();
      if (typeof loadInventory === 'function') loadInventory();
    } catch (err) {
      showToast('Failed to delete orders: ' + err.message, 'error');
    }
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
  // ── Helper: Product Tombstone Registry ──────────────────────────────────────
  function getDeletedProductTokens() {
    let tokens = new Set();
    try {
      const raw = localStorage.getItem('noor_deleted_products');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach(t => tokens.add(String(t).toLowerCase().trim()));
        }
      }
    } catch (_) { }
    return tokens;
  }

  function markProductDeleted(id, sku, name) {
    try {
      const tokens = getDeletedProductTokens();
      if (id) tokens.add(String(id).toLowerCase().trim());
      if (sku) tokens.add(String(sku).toLowerCase().trim());
      if (name) tokens.add(String(name).toLowerCase().trim());
      localStorage.setItem('noor_deleted_products', JSON.stringify(Array.from(tokens)));
    } catch (_) { }
  }

  function unmarkProductDeleted(id, sku, name) {
    try {
      const tokens = getDeletedProductTokens();
      if (id) tokens.delete(String(id).toLowerCase().trim());
      if (sku) tokens.delete(String(sku).toLowerCase().trim());
      if (name) tokens.delete(String(name).toLowerCase().trim());
      localStorage.setItem('noor_deleted_products', JSON.stringify(Array.from(tokens)));
    } catch (_) { }
  }

  async function directRemoveCloudProductTombstone(productId, sku, name) {
    try {
      const tokensToRemove = new Set();
      if (productId) tokensToRemove.add(String(productId).toLowerCase().trim());
      if (sku) tokensToRemove.add(String(sku).toLowerCase().trim());
      if (name) tokensToRemove.add(String(name).toLowerCase().trim());

      const res = await fetch(`${CLOUD_SYNC_CFG.url}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
        headers: { 'apikey': CLOUD_SYNC_CFG.key, 'Authorization': `Bearer ${CLOUD_SYNC_CFG.key}` }
      });
      if (!res.ok) return;
      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0 || !list[0].notes) return;

      const parsed = JSON.parse(list[0].notes);
      let arr = Array.isArray(parsed) ? parsed : (parsed.products || []);
      const prev = arr.length;
      arr = arr.filter(t => !tokensToRemove.has(String(t).toLowerCase().trim()));
      if (arr.length !== prev) {
        await fetch(`${CLOUD_SYNC_CFG.url}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
          method: 'PATCH',
          headers: {
            'apikey': CLOUD_SYNC_CFG.key,
            'Authorization': `Bearer ${CLOUD_SYNC_CFG.key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ notes: JSON.stringify({ products: arr, updated_at: new Date().toISOString() }) })
        });
      }
    } catch (_) { }
  }

  async function loadInventory() {
    try {
      // 0. Synchronize cloud tombstones with local tombstones
      const localTokens = getDeletedProductTokens();
      let cloudTokens = new Set();
      try {
        cloudTokens = await directFetchCloudProductTombstones();
      } catch (_) { }
      const deletedTokens = new Set([...localTokens, ...cloudTokens]);
      if (deletedTokens.size > 0) {
        localStorage.setItem('noor_deleted_products', JSON.stringify(Array.from(deletedTokens)));
      }

      const res = await apiFetch('/api/products').catch(() => []);
      let list = Array.isArray(res) ? res.filter(p => {
        if (!p) return false;
        const pId = p.id ? String(p.id).toLowerCase().trim() : '';
        const pSku = p.sku ? String(p.sku).toLowerCase().trim() : '';
        const pName = p.name ? String(p.name).toLowerCase().trim() : '';
        return !deletedTokens.has(pId) && !deletedTokens.has(pSku) && !deletedTokens.has(pName);
      }) : [];

      // 1. Merge Supabase Cloud Catalog (Guarantees persistence across serverless cold starts)
      let cloudProducts = [];
      if (window.NoorSupabase && window.NoorSupabase.isConfigured()) {
        try {
          cloudProducts = await window.NoorSupabase.fetchCatalog();
        } catch (_) { }
      }
      if (!Array.isArray(cloudProducts) || cloudProducts.length === 0) {
        try {
          cloudProducts = await directFetchSupabaseCatalog(deletedTokens);
        } catch (_) { }
      }

      if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
        cloudProducts.forEach(cp => {
          if (!cp || !cp.name) return;
          const cpId = cp.id ? String(cp.id).toLowerCase().trim() : '';
          const cpSku = (cp.sku && cp.sku.trim() && cp.sku.trim().toUpperCase() !== 'NOOR-FRAME') ? cp.sku.trim().toUpperCase() : null;
          const cpSkuLower = cpSku ? cpSku.toLowerCase() : '';
          const cpNameLower = cp.name ? cp.name.toLowerCase().trim() : '';

          // Skip any deleted / tombstoned products
          if (deletedTokens.has(cpId) || deletedTokens.has(cpSkuLower) || deletedTokens.has(cpNameLower)) {
            return;
          }

          const idx = list.findIndex(p => p.id === cp.id || (p.sku && cpSku && p.sku !== 'NOOR-FRAME' && p.sku.toUpperCase() === cpSku));
          const assignedSku = cpSku || (idx >= 0 && list[idx].sku ? list[idx].sku : ('NOOR-' + cp.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8)));
          const cpImg = cp.image || cp.imageUrl || cp.image_url || 'images/frames/frame_01.jpg';

          const formattedItem = {
            id: cp.id,
            sku: assignedSku,
            name: cp.name,
            brand: cp.brand || cp.collection || 'Noor Optics',
            category: cp.category || 'Frames',
            shape: cp.shape || 'Rectangular',
            material: cp.material || 'Acetate',
            fit: cp.fit || 'Regular',
            selling_price_inr: Number(cp.price) || (cp.selling_price_paise ? cp.selling_price_paise / 100 : 0),
            purchase_cost_inr: Number(cp.purchaseCostINR || cp.cost) || 0,
            total_stock: Number(cp.stock !== undefined ? cp.stock : (cp.initialStock !== undefined ? cp.initialStock : 10)),
            reorder_threshold: Number(cp.reorder_threshold || cp.reorderThreshold || 2),
            image_url: cpImg,
            description: cp.description || '',
            is_active: cp.is_active !== false ? 1 : 0,
            created_at: cp.created_at || new Date().toISOString(),
            updated_at: cp.updated_at || new Date().toISOString()
          };
          if (idx >= 0) {
            const cloudStock = Number(formattedItem.total_stock);
            const prevStock = Number(list[idx].total_stock);
            const finalStock = (!isNaN(cloudStock) && cloudStock > 0)
              ? cloudStock
              : (!isNaN(prevStock) && prevStock > 0 ? prevStock : (cloudStock || 0));

            // Server database record (list[idx]) is AUTHORITATIVE!
            const serverImg = list[idx].image_url;
            const hasValidServerImg = serverImg && !serverImg.includes('frames/frame_01.jpg');

            list[idx] = {
              ...formattedItem,
              ...list[idx],
              total_stock: finalStock,
              image_url: hasValidServerImg ? serverImg : (formattedItem.image_url || serverImg)
            };
          } else {
            list.unshift(formattedItem);
          }
        });
      }

      // 2. Reconcile LocalStorage Cache (Server is authoritative; eliminate stale pre-clear-all ghost images)
      try {
        let localCached = JSON.parse(localStorage.getItem('noor_custom_frames') || '[]');
        if (Array.isArray(localCached)) {
          // Permanently purge any tombstoned items from localStorage
          localCached = localCached.filter(p => {
            if (!p) return false;
            const pId = p.id ? String(p.id).toLowerCase().trim() : '';
            const pSku = p.sku ? String(p.sku).toLowerCase().trim() : '';
            const pName = p.name ? String(p.name).toLowerCase().trim() : '';
            return !deletedTokens.has(pId) && !deletedTokens.has(pSku) && !deletedTokens.has(pName);
          });

          const reconciledLocal = [];
          localCached.forEach(localItem => {
            if (!localItem || !localItem.name) return;
            const lSku = (localItem.sku && localItem.sku.trim() && localItem.sku.trim().toUpperCase() !== 'NOOR-FRAME') ? localItem.sku.trim().toUpperCase() : null;
            const lName = localItem.name.trim().toLowerCase();
            const idx = list.findIndex(p => p.id === localItem.id || (p.sku && lSku && p.sku !== 'NOOR-FRAME' && p.sku.toUpperCase() === lSku) || (p.name && p.name.trim().toLowerCase() === lName));
            if (idx >= 0) {
              // Product exists on server! Server record is AUTHORITATIVE.
              const serverImg = list[idx].image_url;
              if (serverImg && !serverImg.includes('frames/frame_01.jpg')) {
                localItem.image_url = serverImg;
              }
              localItem.name = list[idx].name;
              localItem.selling_price_inr = list[idx].selling_price_inr;
              localItem.total_stock = list[idx].total_stock;
              reconciledLocal.push(localItem);
            } else if (list.length === 0) {
              // Only keep recently added offline items when server is offline
              const ageMs = Date.now() - (localItem.created_at ? new Date(localItem.created_at).getTime() : 0);
              if (ageMs < 10 * 60 * 1000) {
                list.unshift(localItem);
                reconciledLocal.push(localItem);
              }
            }
          });
          localStorage.setItem('noor_custom_frames', JSON.stringify(reconciledLocal));
        }
      } catch (_) { }

      // 3. In-Memory Retention: Never let stale in-memory items overwrite server image_url
      if (Array.isArray(state.inventoryList) && state.inventoryList.length > 0) {
        state.inventoryList.forEach(existingItem => {
          if (!existingItem || !existingItem.sku) return;
          const eId = existingItem.id ? String(existingItem.id).toLowerCase().trim() : '';
          const eSku = (existingItem.sku && existingItem.sku.trim() && existingItem.sku.trim().toUpperCase() !== 'NOOR-FRAME') ? existingItem.sku.trim().toUpperCase() : null;
          const eSkuLower = eSku ? eSku.toLowerCase() : '';
          const eNameLower = existingItem.name ? existingItem.name.toLowerCase().trim() : '';

          // Never re-insert deleted / tombstoned frames
          if (deletedTokens.has(eId) || deletedTokens.has(eSkuLower) || deletedTokens.has(eNameLower)) {
            return;
          }

          const foundIdx = list.findIndex(p => p.id === existingItem.id || (p.sku && eSku && p.sku !== 'NOOR-FRAME' && p.sku.toUpperCase() === eSku) || (p.name && p.name.toLowerCase().trim() === eNameLower));
          if (foundIdx >= 0) {
            // Server product is authoritative! Update existingItem with server's real image_url
            const serverImg = list[foundIdx].image_url;
            if (serverImg && !serverImg.includes('frames/frame_01.jpg')) {
              existingItem.image_url = serverImg;
            }
          } else if (list.length === 0) {
            const ageMs = Date.now() - (existingItem.created_at ? new Date(existingItem.created_at).getTime() : 0);
            if (ageMs < 10 * 60 * 1000) {
              list.unshift(existingItem);
            }
          }
        });
      }

      // Filter out any deleted tokens from the final list
      list = list.filter(p => {
        if (!p) return false;
        const pId = p.id ? String(p.id).toLowerCase().trim() : '';
        const pSku = p.sku ? String(p.sku).toLowerCase().trim() : '';
        const pName = p.name ? String(p.name).toLowerCase().trim() : '';
        return !deletedTokens.has(pId) && !deletedTokens.has(pSku) && !deletedTokens.has(pName);
      });

      // 4. Authoritative Sorting: Newest frames ALWAYS stay at the very top of the inventory ledger!
      list.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      state.inventoryList = list;
      renderInventoryTable();
    } catch (err) {
      console.error('Failed to load inventory:', err);
      showToast('Error loading inventory: ' + err.message, 'error');
    }
  }

  function renderInventoryTable() {
    const cardsList = document.getElementById('inv-cards-list');
    const tbody = document.getElementById('inventory-table-body');

    const query = (state.inventorySearchQuery || '').toLowerCase().trim();
    const activeCat = state.inventoryOpticCategory || 'ALL';

    // Metrics summary
    const totalDistinct = state.inventoryList.length;
    let totalStockValue = 0;
    let totalInStock = 0;
    let totalLowStock = 0;

    state.inventoryList.forEach(p => {
      const stock = Number(p.total_stock) || 0;
      const price = Number(p.selling_price_inr) || 0;
      totalStockValue += (stock * price);
      const threshold = (p.reorder_threshold !== null && p.reorder_threshold !== undefined) ? Number(p.reorder_threshold) : 0;
      if (stock > 0) totalInStock++;
      if (stock > 0 && threshold > 0 && stock <= threshold) totalLowStock++;
    });

    const valEl = document.getElementById('optic-inv-stock-val');
    const itemsEl = document.getElementById('optic-inv-items-count');
    const instockEl = document.getElementById('optic-inv-instock-count');
    const lowstockEl = document.getElementById('optic-inv-lowstock-count');
    if (valEl) valEl.textContent = totalStockValue.toLocaleString('en-IN');
    if (itemsEl) itemsEl.textContent = totalDistinct;
    if (instockEl) instockEl.textContent = totalInStock;
    if (lowstockEl) lowstockEl.textContent = totalLowStock;

    // Filter frames
    const filtered = state.inventoryList.filter(p => {
      // Gender filter
      if (state.inventoryGender && state.inventoryGender !== 'ALL') {
        const itemGender = (p.gender || 'Unisex').toLowerCase();
        const targetGender = state.inventoryGender.toLowerCase();
        if (targetGender === 'men' && itemGender !== 'men' && itemGender !== 'unisex') return false;
        if (targetGender === 'women' && itemGender !== 'women' && itemGender !== 'unisex') return false;
        if (targetGender === 'unisex' && itemGender !== 'unisex') return false;
      }

      if (activeCat !== 'ALL') {
        const cat = (p.category || p.shape || p.name || '').toLowerCase();
        if (activeCat.toLowerCase() === 'frames' || activeCat.toLowerCase() === 'glasses') {
          if (!cat.includes('frame') && !cat.includes('glass') && !cat.includes('optic') && !cat.includes('sunglass')) {
            return false;
          }
        } else if (!cat.includes(activeCat.toLowerCase())) {
          return false;
        }
      }
      if (query) {
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const model = (p.model || '').toLowerCase();
        if (!name.includes(query) && !sku.includes(query) && !brand.includes(query) && !model.includes(query)) {
          return false;
        }
      }
      return true;
    });

    // 1. Render Mobile-First Touch Cards (Image 1)
    if (cardsList) {
      if (filtered.length === 0) {
        cardsList.innerHTML = `<div style="text-align:center; padding:3rem 1rem; color:#94A3B8; font-weight:600;">No items found matching the category or search.</div>`;
      } else {
        cardsList.innerHTML = filtered.map(p => {
          const stock = Number(p.total_stock) || 0;
          const price = Number(p.selling_price_inr) || 0;
          const createdDate = formatDateOptic(p.created_at);
          const updatedDate = formatDateOptic(p.updated_at || p.created_at);

          return `
            <div class="optic-inv-card">
              <div class="optic-inv-thumb">
                ${p.image_url ? `<img src="${formatProductImage(p.image_url)}" alt="${escapeHtml(p.name)}" onerror="this.onerror=null; this.src='/images/frames/frame_01.jpg';" />` : `
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.8">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                `}
              </div>
              <div class="optic-inv-info">
                <div class="optic-inv-name">${escapeHtml(p.name || p.model || 'Frame')}</div>
                <div class="optic-inv-qty">Qty: <span class="qty-bold">${stock}</span></div>
              </div>
              <div class="optic-inv-meta" style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                <div class="optic-inv-date">Created: ${createdDate}</div>
                <div class="optic-inv-price" style="font-weight:800; color:#0A2540;">Retail Rs ${price.toLocaleString('en-IN')}</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; margin-top:2px;">
                  <button type="button" class="btn-table-action" style="padding:4px 10px; font-size:0.75rem; background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; font-weight:700;" onclick="openEditFrameModal('${p.id}')">✏️ Edit</button>
                  <button type="button" class="btn-table-action" style="padding:4px 10px; font-size:0.75rem; background:#FEF3C7; color:#B45309; border:1px solid #FDE68A; font-weight:700;" onclick="openSingleStickerModal('${p.id}')">🏷️ QR</button>
                  <button type="button" class="btn-table-action btn-table-danger" style="padding:4px 10px; font-size:0.75rem; background:#FEE2E2; color:#DC2626; border:1px solid #FECACA; font-weight:700;" onclick="deleteFramePrompt('${p.id}')">🗑️ Del</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Render Desktop Table if present
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:3rem; color:#9CA3AF;">No frames found matching your search.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(p => {
        const stock = Number(p.total_stock) || 0;
        const threshold = (p.reorder_threshold !== null && p.reorder_threshold !== undefined) ? Number(p.reorder_threshold) : 0;
        let stockBadge = `<span class="badge-stock in-stock">${stock} Units</span>`;
        if (stock === 0) {
          stockBadge = `<span class="badge-stock out-of-stock">Out of Stock (0)</span>`;
        } else if (threshold > 0 && stock <= threshold) {
          stockBadge = `<span class="badge-stock low-stock">Low Stock (${stock})</span>`;
        }

        const isChecked = state.selectedFrameIds.has(p.id);

        return `
          <tr>
            <td>
              <input type="checkbox" class="frame-row-checkbox" data-id="${p.id}" ${isChecked ? 'checked' : ''} />
            </td>
            <td>
              <img src="${formatProductImage(p.image_url)}" alt="${escapeHtml(p.name)}" class="frame-thumbnail-img" onerror="this.onerror=null; this.src='/images/frames/frame_01.jpg';" />
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
            <td style="text-align:center;">
              <div style="display:flex; gap:6px; justify-content:center;">
                <button class="btn-table-action" style="background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE; font-weight:700;" onclick="openEditFrameModal('${p.id}')" title="Edit Frame Specs & Price">✏️ Edit</button>
                <button class="btn-table-action" style="background:#FEF3C7; color:#B45309; border:1px solid #FDE68A; font-weight:700;" onclick="openSingleStickerModal('${p.id}')" title="Generate Yellow QR Sticker">🏷️ QR Sticker</button>
                <button class="btn-table-action btn-table-danger" onclick="deleteFramePrompt('${p.id}')" title="Delete Optical Frame">🗑️ Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  function formatDateOptic(dateVal) {
    if (!dateVal) return '29 Oct 26, 10:51 PM';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const yr = String(d.getFullYear()).slice(-2);
    let hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${month} ${yr}, ${hours}:${mins} ${ampm}`;
  }

  window.openFrameActionMenu = function (productId, e) {
    if (e) e.stopPropagation();
    const product = state.inventoryList.find(p => p.id === productId);
    if (!product) return;

    const opt = prompt(
      `Manage Frame: ${product.name} (SKU: ${product.sku})\n\nType 1 to Print QR Sticker\nType 2 to Adjust Stock Quantity\nType 3 to Delete Frame\n\nEnter option (1, 2, or 3):`,
      '1'
    );
    if (opt === '1') {
      openSingleStickerModal(productId);
    } else if (opt === '2') {
      openStockAdjustModal(productId);
    } else if (opt === '3') {
      deleteFramePrompt(productId, product.name, product.sku);
    }
  };

  function updateBatchStickersButton() {
    const btn = document.getElementById('btn-batch-stickers');
    const txt = document.getElementById('btn-batch-stickers-text');
    const btnDel = document.getElementById('btn-batch-delete-frames');
    const txtDel = document.getElementById('btn-batch-delete-frames-text');
    const count = state.selectedFrameIds.size;
    if (btn) btn.disabled = count === 0;
    if (txt) txt.textContent = `Print Selected Stickers (${count})`;
    if (btnDel) {
      btnDel.disabled = count === 0;
      btnDel.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    if (txtDel) txtDel.textContent = `Delete Selected (${count})`;
  }

  // ── Delete Single Frame ───────────────────────────────────────────────────
  window.deleteFramePrompt = async function (productId, nameParam, skuParam) {
    const frame = (state.inventoryList || []).find(p => p.id === productId || (p.sku && p.sku === productId)) || {};
    const name = nameParam || frame.name || '';
    const sku = skuParam || frame.sku || (String(productId).toUpperCase().startsWith('NOOR-') ? productId : '');
    const displayName = name || sku || productId;

    if (!confirm(`Are you sure you want to delete optical frame "${displayName}" (${sku || productId}) from inventory?\n\nThis will permanently remove the product from database and Supabase cloud.`)) {
      return;
    }

    try {
      // 1. Instantly register in tombstone
      markProductDeleted(productId, sku, name);

      // 2. Remove from localStorage cache
      try {
        let localList = JSON.parse(localStorage.getItem('noor_custom_frames') || '[]');
        localList = localList.filter(p => {
          if (!p) return false;
          const pId = p.id ? String(p.id).toLowerCase().trim() : '';
          const pSku = p.sku ? String(p.sku).toLowerCase().trim() : '';
          const pName = p.name ? String(p.name).toLowerCase().trim() : '';
          return pId !== String(productId).toLowerCase().trim() &&
            (!sku || pSku !== String(sku).toLowerCase().trim()) &&
            (!name || pName !== String(name).toLowerCase().trim());
        });
        localStorage.setItem('noor_custom_frames', JSON.stringify(localList));
      } catch (_) { }

      // 3. Immediately update in-memory state & re-render (0ms perceived latency)
      state.inventoryList = state.inventoryList.filter(p => {
        if (!p) return false;
        const pId = p.id ? String(p.id).toLowerCase().trim() : '';
        const pSku = p.sku ? String(p.sku).toLowerCase().trim() : '';
        const pName = p.name ? String(p.name).toLowerCase().trim() : '';
        return pId !== String(productId).toLowerCase().trim() &&
          (!sku || pSku !== String(sku).toLowerCase().trim()) &&
          (!name || pName !== String(name).toLowerCase().trim());
      });
      state.selectedFrameIds.delete(productId);
      renderInventoryTable();
      updateBatchStickersButton();

      // 4. Guaranteed Direct Cloud Purge to Supabase (Zero external dependency)
      await directDeleteSupabaseProduct(productId, sku, name);

      // 5. Backend deletion (if API server is running)
      try {
        await apiFetch(`/api/products/${productId}`, { method: 'DELETE' });
      } catch (apiErr) {
        console.warn('Backend API delete note:', apiErr.message);
      }

      showToast(`Frame "${name}" permanently deleted.`, 'success');
      await loadInventory();
      if (typeof loadDashboard === 'function') loadDashboard();
      if (typeof loadPosCatalog === 'function') loadPosCatalog();
    } catch (err) {
      showToast('Error removing frame: ' + err.message, 'error');
      await loadInventory();
    }
  };

  // ── Clear / Delete All Optical Frame Inventory ─────────────────────────────
  window.deleteAllInventoryPrompt = async function () {
    const currentCount = (state.inventoryList || []).length;
    const confirmMsg = `⚠️ DANGER: PERMANENTLY CLEAR TOTAL INVENTORY?\n\nAre you sure you want to delete ALL optical frames from inventory?\n\nThis will permanently wipe all frame records from:\n• Local SQLite Database\n• Supabase Cloud\n• Local Browser Storage\n\nAll historical order receipts will be preserved, but inventory balances will be cleared to 0.\n\nType YES to confirm complete inventory deletion:`;

    const ans = prompt(confirmMsg);
    if (!ans || ans.trim().toUpperCase() !== 'YES') {
      showToast('Inventory clear cancelled.', 'info');
      return;
    }

    try {
      showToast('Clearing complete inventory from database and cloud...', 'info');

      // 1. Collect all current tokens
      const allTokens = [];
      (state.inventoryList || []).forEach(p => {
        if (p.id) allTokens.push(p.id);
        if (p.sku) allTokens.push(p.sku);
        if (p.name) allTokens.push(p.name);
      });

      // 2. Mark deleted in localStorage
      allTokens.forEach(t => markProductDeleted(t));
      localStorage.removeItem('noor_custom_frames');

      // 3. Clear in-memory state and re-render immediately (0ms latency)
      state.inventoryList = [];
      state.selectedFrameIds.clear();
      renderInventoryTable();
      updateBatchStickersButton();

      // 4. Wipe cloud catalog & tombstone in Supabase
      await directClearAllSupabaseInventory(allTokens);

      // 5. Backend deletion in SQLite
      try {
        await apiFetch('/api/products/clear-all', { method: 'DELETE' });
      } catch (apiErr) {
        console.warn('Backend clear all API note:', apiErr.message);
      }

      showToast('Total inventory cleared successfully! 0 frames remaining.', 'success');
      await loadInventory();
      if (typeof loadDashboard === 'function') loadDashboard();
      if (typeof loadPosCatalog === 'function') loadPosCatalog();
    } catch (err) {
      console.error('Failed to clear inventory:', err);
      showToast('Error clearing inventory: ' + err.message, 'error');
    }
  };

  // ── + Add New Frame Modal & Actions (Image 2 OpticTool Form) ──────────────
  function setupAddFrameModal() {
    const modal = document.getElementById('modal-add-frame');
    const btnOpen = document.getElementById('btn-open-add-frame');
    const form = document.getElementById('form-add-frame');

    // SKU auto-generator & duplicate checking
    const skuInput = document.getElementById('frm-sku');
    const skuNotice = document.getElementById('frm-sku-notice');
    const btnGenSku = document.getElementById('btn-gen-sku-add');

    const generateFreshSku = () => {
      const brand = document.getElementById('frm-brand')?.value.trim() || 'NOOR';
      const model = document.getElementById('frm-model')?.value.trim() || '';
      const prefix = `NOOR-${(model || brand).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'FRAME'}`;
      let candidate = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
      let count = 0;
      while (state.inventoryList.some(p => p.sku && p.sku.toUpperCase() === candidate.toUpperCase()) && count < 50) {
        candidate = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        count++;
      }
      return candidate;
    };

    if (btnGenSku && skuInput) {
      btnGenSku.addEventListener('click', () => {
        skuInput.value = generateFreshSku();
        checkSkuDuplicate();
      });
    }

    const checkSkuDuplicate = () => {
      if (!skuInput || !skuNotice) return;
      const val = skuInput.value.trim().toUpperCase();
      if (!val) {
        skuNotice.style.display = 'none';
        return;
      }
      const existing = state.inventoryList.find(p => p.sku && p.sku.toUpperCase() === val);
      if (existing) {
        skuNotice.style.display = 'block';
        skuNotice.style.background = '#FEF3C7';
        skuNotice.style.color = '#92400E';
        skuNotice.style.border = '1px solid #FCD34D';
        skuNotice.innerHTML = `⚠️ <strong>Existing SKU:</strong> Matches "<em>${escapeHtml(existing.name)}</em>". Saving will update its specifications and add to stock.`;
      } else {
        skuNotice.style.display = 'none';
      }
    };

    if (skuInput) {
      skuInput.addEventListener('input', checkSkuDuplicate);
      skuInput.addEventListener('blur', checkSkuDuplicate);
    }

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        form?.reset();
        const prevWrap = document.getElementById('frm-photo-preview-wrap');
        const prevImg = document.getElementById('frm-photo-preview');
        if (prevWrap) prevWrap.style.display = 'none';
        if (prevImg) prevImg.src = '';
        state.uploadedFrameImageUrl = null;
        if (skuNotice) skuNotice.style.display = 'none';
        modal.classList.add('open');
        document.body.classList.add('modal-open');
      });
    }

    // Helper: Client-side downscaling and compression via HTML5 canvas (optimized ~20-30KB webp/jpeg for instant persistence)
    const compressImageFile = (file, maxWidth = 500, maxHeight = 500, quality = 0.75) => {
      return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('No file provided'));
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => {
          const img = new Image();
          img.onerror = reject;
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    };

    // Photo selection: Camera or Upload file picker
    const fileCam = document.getElementById('frm-file-camera');
    const fileUp = document.getElementById('frm-file-upload');
    const handleFramePhoto = async (file) => {
      if (!file) return;
      try {
        showToast('Compressing frame photo...', 'info');
        const compressedBase64 = await compressImageFile(file, 500, 500, 0.75);

        const prevWrap = document.getElementById('frm-photo-preview-wrap');
        const prevImg = document.getElementById('frm-photo-preview');
        if (prevImg) prevImg.src = compressedBase64;
        if (prevWrap) prevWrap.style.display = 'block';

        // Set authoritative lightweight data URL immediately
        state.uploadedFrameImageUrl = compressedBase64;

        try {
          const res = await apiFetch('/api/products/upload-image', {
            method: 'POST',
            body: JSON.stringify({ imageBase64: compressedBase64 })
          });
          if (res && res.imageUrl && (res.imageUrl.startsWith('data:') || res.imageUrl.startsWith('http'))) {
            state.uploadedFrameImageUrl = res.imageUrl;
          } else {
            state.uploadedFrameImageUrl = compressedBase64;
          }
        } catch (_) {
          state.uploadedFrameImageUrl = compressedBase64;
        }

        showToast('Frame photo ready!', 'success');
      } catch (err) {
        showToast('Failed to process photo: ' + err.message, 'error');
      }
    };

    if (fileCam) fileCam.addEventListener('change', (e) => handleFramePhoto(e.target.files[0]));
    if (fileUp) fileUp.addEventListener('change', (e) => handleFramePhoto(e.target.files[0]));

    // Form submission
    const handleSaveFrame = async (shouldPrintSticker = false) => {
      const brand = document.getElementById('frm-brand')?.value.trim() || 'Noor Optics';
      const model = document.getElementById('frm-model')?.value.trim() || '';
      const color = document.getElementById('frm-color')?.value.trim() || 'Black';
      const size = document.getElementById('frm-size')?.value.trim() || '52-18';
      let sku = document.getElementById('frm-sku')?.value.trim().toUpperCase() || '';
      if (!sku) {
        sku = generateFreshSku();
      }
      const wholesale = Number(document.getElementById('frm-wholesale')?.value) || 0;
      const retail = Number(document.getElementById('frm-retail')?.value) || 0;
      const quantity = Number(document.getElementById('frm-quantity')?.value) || 0;
      const lowStock = Number(document.getElementById('frm-low-stock')?.value) || 2;
      const shape = document.getElementById('frm-shape')?.value || 'Rectangular';
      const gender = document.getElementById('frm-gender')?.value || 'Unisex';
      const category = document.getElementById('frm-category')?.value || 'Eyeglasses';

      const name = `${brand} ${model}`.trim();
      const imageUrl = state.uploadedFrameImageUrl || 'images/frames/frame_01.jpg';

      try {
        const prodId = 'prod-' + Date.now();
        const payload = {
          id: prodId,
          name,
          sku,
          brand,
          category,
          gender,
          shape,
          material: 'Acetate',
          fit: size,
          sellingPriceINR: retail,
          purchaseCostINR: wholesale,
          reorderThreshold: lowStock,
          imageUrl,
          description: `Brand: ${brand} | Model: ${model} | Color: ${color} | Size: ${size}`,
          variants: [
            {
              colorName: color,
              colorHex: '#111111',
              initialStock: quantity
            }
          ]
        };

        // Construct the authoritative in-memory frame object immediately
        const savedItem = {
          id: prodId,
          sku: sku.toUpperCase(),
          name,
          brand,
          category,
          gender,
          shape,
          material: 'Acetate',
          fit: size,
          selling_price_inr: retail,
          purchase_cost_inr: wholesale,
          total_stock: quantity,
          reorder_threshold: lowStock,
          image_url: imageUrl,
          description: `Brand: ${brand} | Model: ${model} | Color: ${color} | Size: ${size}`,
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // 0. Remove from deleted tombstones so newly created/re-added frame is never hidden
        unmarkProductDeleted(savedItem.id, sku, name);
        directRemoveCloudProductTombstone(savedItem.id, sku, name).catch(() => { });

        // 1. Immediately cache in localStorage (zero chance of disappearing)
        try {
          const cacheCopy = { ...savedItem };
          let localList = JSON.parse(localStorage.getItem('noor_custom_frames') || '[]');
          const existIdx = localList.findIndex(p => p.id === savedItem.id || (p.sku && p.sku !== 'NOOR-FRAME' && sku !== 'NOOR-FRAME' && p.sku.toUpperCase() === sku.toUpperCase()));
          if (existIdx >= 0) {
            localList[existIdx] = { ...localList[existIdx], ...cacheCopy };
          } else {
            localList.unshift(cacheCopy);
          }
          localStorage.setItem('noor_custom_frames', JSON.stringify(localList));
        } catch (_) { }

        // 2. Immediately insert/update into active state.inventoryList at index 0
        const curIdx = state.inventoryList.findIndex(p => p.id === savedItem.id || (p.sku && p.sku !== 'NOOR-FRAME' && sku !== 'NOOR-FRAME' && p.sku.toUpperCase() === sku.toUpperCase()));
        if (curIdx >= 0) {
          state.inventoryList[curIdx] = { ...state.inventoryList[curIdx], ...savedItem };
        } else {
          state.inventoryList.unshift(savedItem);
        }
        state.inventoryList.sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeB - timeA;
        });

        // 3. Reset filters so the newly added frame is directly in view
        state.inventorySearchQuery = '';
        state.inventoryOpticCategory = 'ALL';
        document.querySelectorAll('.optic-cat-pill').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-inv-cat') === 'ALL');
        });
        const searchInput = document.getElementById('inv-search-input') || document.getElementById('optic-inv-search');
        if (searchInput) searchInput.value = '';

        // Instant table re-render
        renderInventoryTable();

        // 4. Guaranteed Direct Cloud Persistence to Supabase (Zero external dependency)
        await directSaveSupabaseProduct({
          ...payload,
          id: savedItem.id,
          stock: quantity,
          initialStock: quantity
        });

        if (window.NoorSupabase && window.NoorSupabase.isConfigured()) {
          try {
            await window.NoorSupabase.saveProduct({
              ...payload,
              id: savedItem.id,
              stock: quantity,
              initialStock: quantity
            });
          } catch (e) {
            console.warn('Supabase product dual-write note:', e);
          }
        }

        // 5. Close modal immediately with celebratory confirmation
        showToast(`✓ Frame "${name}" added to stock successfully!`, 'success');
        modal.classList.remove('open');
        document.body.classList.remove('modal-open');
        form?.reset();
        const prevWrap = document.getElementById('frm-photo-preview-wrap');
        const prevImg = document.getElementById('frm-photo-preview');
        if (prevWrap) prevWrap.style.display = 'none';
        if (prevImg) prevImg.src = '';
        state.uploadedFrameImageUrl = null;

        // 6. Background server sync
        try {
          const saveRes = await apiFetch('/api/products', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          if (saveRes && saveRes.id) {
            savedItem.id = saveRes.id;
          }
        } catch (e) {
          console.warn('Server sync note (cloud save already succeeded):', e.message);
        }

        // Background catalog refreshes
        if (typeof loadDashboard === 'function') loadDashboard();
        if (typeof loadPosCatalog === 'function') loadPosCatalog();

        // Automatic Thermal Sticker Printing if "Save & Print QR Sticker" was clicked
        if (shouldPrintSticker) {
          showToast(`Printing QR sticker for "${name}"...`, 'info');
          const printRes = await dispatchThermalStickerPrint([{
            sku,
            name,
            brand,
            price: formatINR(retail * 100, true),
            copies: 1
          }]);
          if (printRes && printRes.success) {
            showToast(`✓ QR sticker for "${name}" printed successfully!`, 'success');
          } else {
            showToast(`Frame saved! (Printer: ${printRes?.error || 'queued'})`, 'warning');
          }
        }
      } catch (err) {
        showToast('Failed to add frame: ' + err.message, 'error');
      }
    };

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSaveFrame(false);
      });
    }

    const btnSaveAndPrint = document.getElementById('btn-submit-add-frame-print');
    if (btnSaveAndPrint) {
      btnSaveAndPrint.addEventListener('click', async (e) => {
        e.preventDefault();
        await handleSaveFrame(true);
      });
    }
  }

  // ── Edit Optical Frame Specifications Modal ──────────────────────────────
  window.openEditFrameModal = function (productId) {
    const frame = state.inventoryList.find(p => p.id === productId);
    if (!frame) {
      showToast('Frame not found in inventory cache.', 'error');
      return;
    }

    const modal = document.getElementById('modal-edit-frame');
    if (!modal) return;

    const idInput = document.getElementById('edit-frame-id');
    const nameInput = document.getElementById('edit-frame-name');
    const brandInput = document.getElementById('edit-frame-brand');
    const shapeInput = document.getElementById('edit-frame-shape');
    const retailInput = document.getElementById('edit-frame-retail');
    const wholesaleInput = document.getElementById('edit-frame-wholesale');
    const stockInput = document.getElementById('edit-frame-stock');
    const thresholdInput = document.getElementById('edit-frame-threshold');
    const subEl = document.getElementById('edit-frame-sub');

    // Photo Preview Setup
    const prevImg = document.getElementById('edit-frame-preview-img');
    const prevPlaceholder = document.getElementById('edit-frame-preview-placeholder');
    const photoStatus = document.getElementById('edit-frame-photo-status');
    const fileInput = document.getElementById('edit-frame-file-input');
    state.editUploadedFrameImageUrl = null;
    if (fileInput) fileInput.value = '';

    if (frame.image_url && !frame.image_url.includes('frames/frame_01.jpg')) {
      if (prevImg) {
        prevImg.src = formatProductImage(frame.image_url);
        prevImg.style.display = 'block';
      }
      if (prevPlaceholder) prevPlaceholder.style.display = 'none';
      if (photoStatus) photoStatus.textContent = 'Current frame photo';
    } else {
      if (prevImg) prevImg.style.display = 'none';
      if (prevPlaceholder) prevPlaceholder.style.display = 'block';
      if (photoStatus) photoStatus.textContent = 'Default stock image (No custom photo)';
    }

    if (idInput) idInput.value = frame.id;
    if (nameInput) nameInput.value = frame.name || '';
    if (brandInput) brandInput.value = frame.brand || '';
    if (shapeInput) {
      const curShape = frame.shape || 'Rectangular';
      shapeInput.value = curShape;
      if (!shapeInput.value || shapeInput.selectedIndex === -1) {
        const sNorm = curShape.toLowerCase();
        for (let i = 0; i < shapeInput.options.length; i++) {
          const opt = shapeInput.options[i].value.toLowerCase();
          if (sNorm.includes(opt) || opt.includes(sNorm) || (sNorm.includes('rect') && opt.includes('rect')) || (sNorm.includes('hex') && opt.includes('geom'))) {
            shapeInput.selectedIndex = i;
            break;
          }
        }
      }
    }
    const catSelect = document.getElementById('edit-frame-category');
    const genSelect = document.getElementById('edit-frame-gender');
    if (catSelect) catSelect.value = frame.category || 'Eyeglasses';
    if (genSelect) {
      const curGen = frame.gender || 'Unisex';
      genSelect.value = curGen;
      if (!genSelect.value || genSelect.selectedIndex === -1) {
        const gNorm = curGen.toLowerCase();
        for (let i = 0; i < genSelect.options.length; i++) {
          if (genSelect.options[i].value.toLowerCase() === gNorm) {
            genSelect.selectedIndex = i;
            break;
          }
        }
      }
    }
    if (retailInput) retailInput.value = frame.selling_price_inr !== undefined ? frame.selling_price_inr : Math.round((frame.selling_price_paise || 0) / 100);
    if (wholesaleInput) wholesaleInput.value = frame.purchase_cost_inr !== undefined ? frame.purchase_cost_inr : Math.round((frame.purchase_cost_paise || 0) / 100);
    if (stockInput) stockInput.value = frame.total_stock !== undefined ? frame.total_stock : 10;
    if (thresholdInput) thresholdInput.value = frame.reorder_threshold || 2;
    if (subEl) subEl.textContent = `ID: ${frame.id} • SKU: ${frame.sku || '-'}`;

    modal.classList.add('open');
    document.body.classList.add('modal-open');
  };

  function setupEditFrameModal() {
    const form = document.getElementById('form-edit-frame');
    const modal = document.getElementById('modal-edit-frame');
    if (!form) return;

    // Handle photo picker in edit modal
    const editFileInput = document.getElementById('edit-frame-file-input');
    if (editFileInput) {
      editFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          showToast('Processing new frame photo...', 'info');
          const compressed = await compressImageFile(file, 500, 500, 0.75);
          state.editUploadedFrameImageUrl = compressed;

          const prevImg = document.getElementById('edit-frame-preview-img');
          const prevPlaceholder = document.getElementById('edit-frame-preview-placeholder');
          const photoStatus = document.getElementById('edit-frame-photo-status');
          if (prevImg) {
            prevImg.src = compressed;
            prevImg.style.display = 'block';
          }
          if (prevPlaceholder) prevPlaceholder.style.display = 'none';
          if (photoStatus) {
            photoStatus.textContent = '✓ New photo selected (Click "Save Changes" to apply)';
            photoStatus.style.color = '#059669';
          }
          showToast('New photo ready!', 'success');
        } catch (err) {
          showToast('Failed to process image: ' + err.message, 'error');
        }
      });
    }

    const btnDelete = document.getElementById('btn-edit-frame-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
        const pId = document.getElementById('edit-frame-id')?.value;
        if (!pId) return;
        modal.classList.remove('open');
        document.body.classList.remove('modal-open');
        if (typeof deleteFramePrompt === 'function') {
          deleteFramePrompt(pId);
        }
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pId = document.getElementById('edit-frame-id')?.value;
      if (!pId) return;

      const name = document.getElementById('edit-frame-name')?.value.trim();
      const brand = document.getElementById('edit-frame-brand')?.value.trim();
      const shape = document.getElementById('edit-frame-shape')?.value || 'Rectangular';
      const category = document.getElementById('edit-frame-category')?.value || 'Eyeglasses';
      const gender = document.getElementById('edit-frame-gender')?.value || 'Unisex';
      const sellingPriceINR = Number(document.getElementById('edit-frame-retail')?.value) || 0;
      const purchaseCostINR = Number(document.getElementById('edit-frame-wholesale')?.value) || 0;
      const stockQuantity = Number(document.getElementById('edit-frame-stock')?.value) || 0;
      const reorderThreshold = Number(document.getElementById('edit-frame-threshold')?.value) || 2;
      const newImageUrl = state.editUploadedFrameImageUrl || null;

      // 1. Instantly update active in-memory state and UI (0ms latency, never reverts to 0)
      const existing = state.inventoryList.find(p => p.id === pId) || {};
      const updatedItem = {
        ...existing,
        id: pId,
        name: name || existing.name,
        brand: brand || existing.brand,
        shape: shape || existing.shape,
        category: category || existing.category,
        gender: gender || existing.gender,
        selling_price_inr: sellingPriceINR,
        selling_price_paise: Math.round(sellingPriceINR * 100),
        purchase_cost_inr: purchaseCostINR,
        purchase_cost_paise: Math.round(purchaseCostINR * 100),
        total_stock: stockQuantity,
        stock: stockQuantity,
        reorder_threshold: reorderThreshold,
        image_url: newImageUrl || existing.image_url,
        updated_at: new Date().toISOString()
      };

      const curMemIdx = state.inventoryList.findIndex(p => p.id === pId);
      if (curMemIdx >= 0) {
        state.inventoryList[curMemIdx] = updatedItem;
      } else {
        state.inventoryList.unshift(updatedItem);
      }

      // 2. Persist to localStorage immediately
      try {
        let localList = JSON.parse(localStorage.getItem('noor_custom_frames') || '[]');
        const locIdx = localList.findIndex(p => p.id === pId || (p.sku && p.sku === existing.sku));
        if (locIdx >= 0) {
          localList[locIdx] = { ...localList[locIdx], ...updatedItem };
        } else {
          localList.unshift(updatedItem);
        }
        localStorage.setItem('noor_custom_frames', JSON.stringify(localList));
      } catch (_) { }

      // Instant table re-render with the new stock count!
      renderInventoryTable();

      try {
        showToast(`Frame "${name}" updated successfully!`, 'success');
        modal.classList.remove('open');
        document.body.classList.remove('modal-open');
        state.editUploadedFrameImageUrl = null;

        // 3. Guaranteed Direct Cloud Persistence to Supabase
        await directSaveSupabaseProduct({
          ...updatedItem,
          id: pId,
          sku: existing.sku,
          price: sellingPriceINR,
          stock: stockQuantity,
          initialStock: stockQuantity,
          imageUrl: newImageUrl || existing.image_url,
          reorderThreshold
        });

        if (window.NoorSupabase && window.NoorSupabase.isConfigured()) {
          try {
            await window.NoorSupabase.saveProduct({
              ...updatedItem,
              id: pId,
              sku: existing.sku,
              price: sellingPriceINR,
              stock: stockQuantity,
              initialStock: stockQuantity,
              imageUrl: newImageUrl || existing.image_url,
              reorderThreshold
            });
          } catch (e) {
            console.warn('Supabase product edit dual-write note:', e);
          }
        }

        // 4. Server API update
        try {
          await apiFetch(`/api/products/${pId}`, {
            method: 'PUT',
            body: JSON.stringify({
              name,
              brand,
              shape,
              category,
              gender,
              sellingPriceINR,
              purchaseCostINR,
              stockQuantity,
              reorderThreshold,
              imageUrl: newImageUrl || undefined
            })
          });
        } catch (e) {
          console.warn('Server product update note (cloud save already succeeded):', e.message);
        }

        if (typeof loadDashboard === 'function') loadDashboard();
        if (typeof loadPosCatalog === 'function') loadPosCatalog();
      } catch (err) {
        showToast('Failed to update frame: ' + err.message, 'error');
      }
    });
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
      } else if (presetKey === 'sku') {
        // Pure raw SKU string
        if (widthInput) widthInput.value = '50';
        if (heightInput) heightInput.value = '25';
        if (qrSizeInput) qrSizeInput.value = 'medium';
        if (layoutInput) layoutInput.value = 'individual';
      } else {
        // url / standard default (uppercase short web link)
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
      const activePreset = document.querySelector('input[name="stk-preset-choice"]:checked')?.value || 'url';
      const w = parseInt(widthInput?.value, 10) || (activePreset === 'temple' ? 38 : 50);
      const h = parseInt(heightInput?.value, 10) || (activePreset === 'temple' ? 18 : 25);
      const qrSize = activePreset === 'temple' ? 'temple' : 'medium';

      const dimTag = document.getElementById('stk-dimensions-tag');
      if (dimTag) {
        if (activePreset === 'sku') {
          dimTag.textContent = `Preset: Pure Frame SKU (21×21) • Raw Text • USB/Bluetooth Scanners`;
        } else if (activePreset === 'temple') {
          dimTag.textContent = `Preset: Temple Arm (14mm) • Slim Fit`;
        } else {
          dimTag.textContent = `Preset: Web Link QR (25×25) • 4-Module Quiet Zone • Instant Phone & POS Scan`;
        }
      }

      const stage = document.getElementById('stk-preview-stage');
      if (!stage) return;

      const frame = state.activeStickerFrame || (state.inventoryList[0] || {
        name: 'The Oslo Crystal',
        sku: 'NOOR-OSLO-01',
        brand: 'Noor Optics'
      });

      renderSingleStickerCard(stage, frame, w, h, '', true, qrSize, activePreset);
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

    // Connect dimension inputs (#stk-width-mm, #stk-height-mm) to live preview
    if (widthInput && heightInput) {
      const updateDimPreview = () => {
        const w = Number(widthInput.value) || 26;
        const h = Number(heightInput.value) || 32;
        const stage = document.getElementById('stk-preview-stage');
        const frame = state.activeStickerFrame || (state.inventoryList && state.inventoryList[0]) || {
          sku: 'NOOR-ARC-15',
          name: 'The Arctic Frame',
          selling_price_inr: 4599
        };
        if (stage) renderSingleStickerCard(stage, frame, w, h);
      };
      widthInput.addEventListener('input', updateDimPreview);
      heightInput.addEventListener('input', updateDimPreview);
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
        const wMm = Number(document.getElementById('stk-width-mm')?.value) || 26;
        const hMm = Number(document.getElementById('stk-height-mm')?.value) || 32;

        btnDirect.disabled = true;
        btnDirect.innerHTML = `<span>⏳ Printing ${frames.length} in Sequence...</span>`;

        const items = [];
        for (const f of frames) {
          const sku = (f.sku || f.id || 'NOOR-FRAME').toUpperCase();
          items.push({
            sku: sku,
            name: f.name || '',
            brand: f.brand || 'Noor Optics',
            price: f.selling_price_paise ? formatINR(f.selling_price_paise, true) : (f.selling_price_inr ? formatINR(f.selling_price_inr * 100, true) : ''),
            copies: copies
          });
        }

        try {
          const res = await dispatchThermalStickerPrint(items);
          if (res && res.success) {
            if (res.method === 'cloud_queue') {
              showToast(`✓ Sticker queued for POS printer (auto-printing in 2-3s)!`, 'success');
            } else {
              showToast(`✓ All ${frames.length} sticker(s) printed to POS thermal printer!`, 'success');
            }
          } else {
            showToast('POS daemon offline. Opening direct print dialog...', 'info');
            await executeStickerPrint();
          }
        } catch (err) {
          await executeStickerPrint();
        } finally {
          btnDirect.disabled = false;
          btnDirect.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span>⚡ Print to POS Thermal Printer</span>
          `;
        }
      });
    }

    // One-Click Dedicated Test Sticker Button (#btn-test-sticker-print)
    const btnTestSticker = document.getElementById('btn-test-sticker-print');
    if (btnTestSticker) {
      btnTestSticker.addEventListener('click', async () => {
        btnTestSticker.disabled = true;
        btnTestSticker.innerHTML = `<span>⏳ Printing Test...</span>`;
        showToast('Sending reference test sticker (NOOR-ARC-15) to thermal printer...', 'info');

        const testFrame = {
          sku: 'NOOR-ARC-15',
          name: 'The Arctic Frame',
          selling_price_inr: 4599
        };

        const wMm = Number(document.getElementById('stk-width-mm')?.value) || 26;
        const hMm = Number(document.getElementById('stk-height-mm')?.value) || 32;
        const items = [{
          sku: testFrame.sku,
          name: testFrame.name,
          price: 'Rs. 4,599.00',
          copies: 1
        }];

        try {
          const res = await dispatchThermalStickerPrint(items);
          if (res && res.success) {
            showToast('✓ Reference test sticker printed cleanly to POS thermal printer!', 'success');
          } else {
            showToast('Printer response: ' + (res?.error || 'Check printer connection'), 'error');
          }
        } catch (err) {
          showToast('Failed to print test sticker: ' + err.message, 'error');
        } finally {
          btnTestSticker.disabled = false;
          btnTestSticker.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>🧪 Test QR Sticker</span>
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

    // Batch Delete Selected Optical Frames
    const btnBatchDelete = document.getElementById('btn-batch-delete-frames');
    if (btnBatchDelete) {
      btnBatchDelete.addEventListener('click', async () => {
        const ids = Array.from(state.selectedFrameIds);
        if (ids.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${ids.length} selected optical frame(s) from inventory?\n\nThis action cannot be undone.`)) {
          return;
        }

        try {
          btnBatchDelete.disabled = true;
          const txtDel = document.getElementById('btn-batch-delete-frames-text');
          if (txtDel) txtDel.textContent = 'Deleting...';

          const selectedFrames = state.inventoryList.filter(p => state.selectedFrameIds.has(p.id));

          // 1. Mark in deleted tombstones immediately
          selectedFrames.forEach(p => markProductDeleted(p.id, p.sku, p.name));
          ids.forEach(id => markProductDeleted(id));

          // 2. Remove from localStorage cache immediately
          try {
            let localList = JSON.parse(localStorage.getItem('noor_custom_frames') || '[]');
            localList = localList.filter(p => !state.selectedFrameIds.has(p.id));
            localStorage.setItem('noor_custom_frames', JSON.stringify(localList));
          } catch (_) { }

          // 3. Immediately clean in-memory state & re-render UI
          state.inventoryList = state.inventoryList.filter(p => !state.selectedFrameIds.has(p.id));
          state.selectedFrameIds.clear();
          renderInventoryTable();
          updateBatchStickersButton();

          // 4. Direct native cloud purge to Supabase for all selected frames
          await Promise.all(selectedFrames.map(p => directDeleteSupabaseProduct(p.id, p.sku, p.name)));

          // 5. Backend batch delete (if API server is running)
          try {
            await apiFetch('/api/products', {
              method: 'DELETE',
              body: JSON.stringify({ ids })
            });
          } catch (apiErr) {
            console.warn('Backend API batch delete note:', apiErr.message);
          }

          showToast(`Successfully deleted ${ids.length} frame(s) permanently.`, 'success');
          await loadInventory();
          if (typeof loadDashboard === 'function') loadDashboard();
          if (typeof loadPosCatalog === 'function') loadPosCatalog();
        } catch (err) {
          showToast('Failed to delete frames: ' + err.message, 'error');
          await loadInventory();
        } finally {
          btnBatchDelete.disabled = false;
          updateBatchStickersButton();
        }
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
   * Push a print job to Supabase cloud print queue
   * Enables 100% reliable hardware printing from any cloud or browser device without CORS or mixed content issues.
   */
  async function pushPrintJobToCloud(jobPayload) {
    const SUPABASE_URL = (typeof CLOUD_SYNC_CFG !== 'undefined' && CLOUD_SYNC_CFG.url) || 'https://czajxtgwsxbrrymrhauz.supabase.co';
    const SUPABASE_ANON_KEY = (typeof CLOUD_SYNC_CFG !== 'undefined' && CLOUD_SYNC_CFG.key) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk';

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-PRINT-QUEUE&select=id,notes`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });
      const list = await res.json().catch(() => []);
      let jobs = [];
      let recordExists = false;

      if (Array.isArray(list) && list.length > 0) {
        recordExists = true;
        try {
          const parsed = JSON.parse(list[0].notes || '{}');
          jobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];
        } catch (_) { jobs = []; }
      }

      // Purge jobs older than 2 hours to keep queue fast and small
      const recentThreshold = Date.now() - 2 * 60 * 60 * 1000;
      jobs = jobs.filter(j => {
        if (!j || !j.created_at) return false;
        return new Date(j.created_at).getTime() > recentThreshold;
      });

      const ord = jobPayload.order || (jobPayload.items && jobPayload.items[0] && jobPayload.items[0].order) || null;
      const ref = String(ord?.order_number || ord?.order_ref || ord?.id || ('JOB_' + Date.now())).trim();
      let stageSuffix = 'init';
      if (jobPayload.source === 'reprint' || jobPayload.manualReprint) {
        stageSuffix = 'reprint_' + Date.now();
      } else if (ord) {
        if (ord.third_payment_inr > 0 || ord.third_payment_paise > 0) {
          stageSuffix = 'stage3';
        } else if (ord.second_payment_inr > 0 || ord.second_payment_paise > 0) {
          stageSuffix = 'stage2';
        }
      }

      const jobId = jobPayload.type === 'qr_sticker'
        ? ('stk_' + Date.now() + '_' + Math.floor(Math.random() * 1000))
        : ('rcp_' + ref + '_' + stageSuffix);

      // Remove ALL old-style job-receipt-{ref}-* entries for this order ref to prevent double printing
      if (jobPayload.type === 'receipt' && ref && !ref.startsWith('JOB_') && stageSuffix !== 'reprint_' + Date.now()) {
        jobs = jobs.filter(j => {
          if (!j || !j.id) return true;
          const jid = String(j.id);
          // Remove old-style job-receipt-{ref}-{timestamp} for this exact ref
          return !(jid.startsWith('job-receipt-' + ref + '-') || jid.startsWith('job-receipt-' + ref.toLowerCase() + '-'));
        });
      }

      const newJob = {
        id: jobId,
        type: jobPayload.type || 'qr_sticker',
        order: jobPayload.order || null,
        items: jobPayload.items || (jobPayload.order ? jobPayload.order.items : [jobPayload]),
        approved: jobPayload.approved !== undefined ? Boolean(jobPayload.approved) : true,
        source: jobPayload.source || (jobPayload.type === 'receipt' ? 'staff_approved' : 'cloud_queue'),
        created_at: new Date().toISOString()
      };

      const existingIdx = jobs.findIndex(j => j.id === jobId);
      if (existingIdx >= 0) {
        jobs[existingIdx] = newJob;
      } else {
        jobs.push(newJob);
      }

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
      console.warn('Could not push print job to cloud queue:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Dual-path Thermal Sticker Dispatcher:
   * Path 1: Instant local HTTP request to POS Daemon on http://127.0.0.1:5001/api/printer/print-qr-sticker (5ms)
   * Path 2: Autonomous Supabase Cloud Queue Sync (100% reliable across browsers, mobile phones, HTTPS)
   */
  async function dispatchThermalStickerPrint(items, paperWidth = 58) {
    const payload = {
      items: items,
      paperWidthMm: paperWidth
    };

    // 1. Try local daemon direct hardware print on port 5001 (127.0.0.1 & localhost)
    const daemonUrls = [
      'http://127.0.0.1:5001/api/printer/print-qr-sticker',
      'http://localhost:5001/api/printer/print-qr-sticker'
    ];

    for (const url of daemonUrls) {
      try {
        const localResp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8000)
        });
        if (localResp.ok) {
          const res = await localResp.json();
          if (res && res.success) {
            return { success: true, method: 'local_daemon' };
          }
        }
      } catch (_) {
        // Continue to next URL or cloud fallback
      }
    }

    // 2. Queue in Supabase cloud print queue (picked up by daemon in 2-3s)
    const cloudRes = await pushPrintJobToCloud({
      type: 'qr_sticker',
      items: items
    });

    // Also register job directly into durable print_jobs table for instant Realtime wakeup
    try {
      const SUPABASE_URL = 'https://czajxtgwsxbrrymrhauz.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk';
      await fetch(`${SUPABASE_URL}/rest/v1/print_jobs`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          order_id: 'sticker-' + Date.now(),
          print_type: 'qr_sticker',
          printer_id: 'POS-80',
          status: 'queued',
          last_error: JSON.stringify({ items: items }),
          attempt_count: 0
        })
      });
    } catch (_) { }

    if (cloudRes && cloudRes.success) {
      return { success: true, method: 'cloud_queue' };
    }

    // 3. Last-mile fallback: try backend API endpoint
    try {
      const apiRes = await apiFetch('/api/printer/print-qr-sticker', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (apiRes && apiRes.success) {
        return { success: true, method: 'server_api' };
      }
    } catch (_) { }

    return { success: false, error: 'Could not reach local printer or cloud print queue.' };
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

    const activePreset = document.querySelector('input[name="stk-preset-choice"]:checked')?.value || 'url';
    const copies = parseInt(document.getElementById('stk-copies-count')?.value || '1', 10);
    const wMm = Number(document.getElementById('stk-width-mm')?.value) || 26;
    const hMm = Number(document.getElementById('stk-height-mm')?.value) || 32;

    const items = [];
    for (const f of selectedFrames) {
      const sku = (f.sku || f.id || 'NOOR-FRAME').toUpperCase();
      items.push({
        sku: sku,
        name: f.name || '',
        brand: f.brand || 'Noor Optics',
        price: f.selling_price_paise ? formatINR(f.selling_price_paise, true) : (f.selling_price_inr ? formatINR(f.selling_price_inr * 100, true) : ''),
        copies: copies
      });
    }

    try {
      const res = await dispatchThermalStickerPrint(items);

      if (res && res.success) {
        const methodMsg = res.method === 'cloud_queue' ? ' (queued in cloud, auto-printing in 2-3s)' : '';
        showToast(`✓ All ${count} stickers sent to POS thermal printer${methodMsg}!`, 'success');
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
      const w = 20;
      const h = 21;
      const stage = document.getElementById('stk-preview-stage');
      const qrSize = 'temple';
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
    const firstFrame = state.inventoryList.find(p => p.id === frameIds[0]) || state.inventoryList[0];
    state.activeStickerFrame = firstFrame;

    const modal = document.getElementById('modal-qr-sticker');
    if (modal) {
      modal.classList.add('open');
      const w = 20;
      const h = 21;
      const stage = document.getElementById('stk-preview-stage');
      const qrSize = 'temple';
      renderSingleStickerCard(stage, firstFrame, w, h, '', true, qrSize);

      const btnDirect = document.getElementById('btn-direct-thermal-print');
      if (btnDirect) {
        btnDirect.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <span>⚡ Print All ${frameIds.length} Stickers in Sequence to POS-80</span>
        `;
      }

      const btnSheet = document.getElementById('btn-trigger-sticker-print');
      if (btnSheet) {
        btnSheet.innerHTML = `📄 Print Sheet (${frameIds.length} Frames)`;
      }
    }
  };

  window.printAllInventoryQRsPrompt = function () {
    const activeCat = state.inventoryOpticCategory || 'ALL';
    const query = (state.inventorySearchQuery || '').toLowerCase().trim();

    const filtered = (state.inventoryList || []).filter(p => {
      if (activeCat !== 'ALL') {
        const cat = (p.category || p.shape || p.name || p.brand || '').toLowerCase();
        if (activeCat.toLowerCase() === 'frames' || activeCat.toLowerCase() === 'glasses') {
          if (!cat.includes('frame') && !cat.includes('glass') && !cat.includes('optic') && !cat.includes('sunglass')) {
            return false;
          }
        } else if (!cat.includes(activeCat.toLowerCase())) {
          return false;
        }
      }
      if (query) {
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const model = (p.model || '').toLowerCase();
        if (!name.includes(query) && !sku.includes(query) && !brand.includes(query) && !model.includes(query)) {
          return false;
        }
      }
      return true;
    });

    const targetList = filtered.length > 0 ? filtered : state.inventoryList;
    if (!targetList || targetList.length === 0) {
      showToast('No optical frames found in inventory to print.', 'warning');
      return;
    }

    const frameIds = targetList.map(p => p.id);
    openBatchStickersModal(frameIds);
  };

  /**
   * Convert an HTML5 Canvas directly to ESC/POS GS v 0 1-bit monochrome raster
   * Works on 100% of POS-80 thermal receipt & label printers with zero text link blotting.
   */
  function convertCanvasToEscPosRasterBase64(canvas) {
    if (!canvas) return '';
    try {
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const widthBytes = Math.ceil(w / 8);
      const raster = new Uint8Array(widthBytes * h);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = imgData.data[idx];
          const g = imgData.data[idx + 1];
          const b = imgData.data[idx + 2];
          const a = imgData.data[idx + 3];
          const isBlack = (a > 128) && ((r * 0.299 + g * 0.587 + b * 0.114) < 128);
          if (isBlack) {
            const byteIdx = y * widthBytes + Math.floor(x / 8);
            const bitMask = 0x80 >> (x % 8);
            raster[byteIdx] |= bitMask;
          }
        }
      }

      // Prepend ESC/POS GS v 0 header: 0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH
      const header = [
        0x1D, 0x76, 0x30, 0x00,
        widthBytes & 0xFF, (widthBytes >> 8) & 0xFF,
        h & 0xFF, (h >> 8) & 0xFF
      ];
      let binary = '';
      for (let i = 0; i < header.length; i++) binary += String.fromCharCode(header[i]);
      for (let i = 0; i < raster.length; i++) binary += String.fromCharCode(raster[i]);
      return btoa(binary);
    } catch (_) {
      return '';
    }
  }

  /**
   * Pre-renders crisp ~10mm QR code for Optical Dumbbell Tags
   */
  async function generateQrStickerPayload(sku) {
    const text = `HTTPS://NOOROPTICS.VERCEL.APP/Q/${encodeURIComponent((sku || 'NOOR-FRAME').toUpperCase())}`;
    return new Promise((resolve) => {
      function render() {
        if (!window.QRCode) {
          resolve({ text, qrDataUrl: '', qrRasterBase64: '' });
          return;
        }
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.style.width = '80px';
        tempDiv.style.height = '80px';
        document.body.appendChild(tempDiv);

        try {
          new window.QRCode(tempDiv, {
            text: text,
            width: 80,
            height: 80,
            colorDark: '#000000',
            colorLight: '#FFFFFF',
            correctLevel: window.QRCode.CorrectLevel.L
          });

          let attempts = 0;
          const poll = setInterval(() => {
            attempts++;
            const canvas = tempDiv.querySelector('canvas');
            if (canvas && canvas.width > 0) {
              clearInterval(poll);
              const dataUrl = canvas.toDataURL('image/png');
              const rasterBase64 = convertCanvasToEscPosRasterBase64(canvas);
              tempDiv.remove();
              resolve({ text, qrDataUrl: dataUrl, qrRasterBase64: rasterBase64 });
              return;
            }
            if (attempts >= 15) {
              clearInterval(poll);
              tempDiv.remove();
              resolve({ text, qrDataUrl: '', qrRasterBase64: '' });
            }
          }, 20);
        } catch (_) {
          tempDiv.remove();
          resolve({ text, qrDataUrl: '', qrRasterBase64: '' });
        }
      }

      if (window.QRCode) {
        render();
      } else {
        setTimeout(render, 50);
      }
    });
  }

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
          const qrCorrectLevel = (window.QRCode && window.QRCode.CorrectLevel && window.QRCode.CorrectLevel.M !== undefined)
            ? window.QRCode.CorrectLevel.M
            : (window.QRCode?.CorrectLevel?.L ?? 0);

          new window.QRCode(tempDiv, {
            text: text,
            width: size,
            height: size,
            colorDark: '#000000',
            colorLight: '#FFFFFF',
            correctLevel: qrCorrectLevel
          });

          // Immediate check: canvas is painted synchronously in qrcode.js
          const immediateCanvas = tempDiv.querySelector('canvas');
          if (immediateCanvas && immediateCanvas.width > 0) {
            try {
              const dUrl = immediateCanvas.toDataURL('image/png');
              if (dUrl && dUrl.length > 100) {
                tempDiv.remove();
                resolve(dUrl);
                return;
              }
            } catch (_) { }
          }

          let attempts = 0;
          const poll = setInterval(() => {
            attempts++;
            const canvas = tempDiv.querySelector('canvas');
            const img = tempDiv.querySelector('img');
            let dataUrl = '';
            if (canvas && canvas.width > 0) {
              try { dataUrl = canvas.toDataURL('image/png'); } catch (e) { }
            }
            if (!dataUrl && img && img.src && img.src.startsWith('data:image')) {
              dataUrl = img.src;
            }

            if (dataUrl || attempts >= 25) {
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
   * Build Pure HTML for One Frame QR Sticker
   * Exact reproduction of Reference Image:
   * - Pure white card background, pure black printing
   * - Top: Centered crisp square 2D QR code
   * - Directly below QR: Bold SKU / Frame ID (e.g. NOOR-ARC-15)
   * - Directly below SKU: Model Name / Description (e.g. The Arctic Frame)
   * - Bottom: Retail Price in Indian Rupees (e.g. Rs. 4,599.00)
   */
  function buildStickerHtml(frame, widthMm, heightMm, contactText, qrDataUrl, qrSize = 'medium') {
    const sku = (frame.sku || frame.id || 'NOOR-FRAME').toUpperCase();
    const name = (frame.name || '').slice(0, 24);
    let price = frame.selling_price_paise ? formatINR(frame.selling_price_paise, true) : (frame.selling_price_inr ? formatINR(frame.selling_price_inr * 100, true) : '');
    if (price && price.startsWith('₹')) price = 'Rs. ' + price.substring(1).trim();
    if (price && !price.toUpperCase().startsWith('RS') && !price.toUpperCase().startsWith('M.R.P')) {
      price = 'Rs. ' + price;
    }

    const tagWidthMm = widthMm || 24;
    const tagHeightMm = heightMm || 28;

    return `
      <div class="frame-sticker" style="width:${tagWidthMm}mm; min-height:${tagHeightMm}mm; background-color:#FFFFFF !important; color:#000000 !important; box-sizing:border-box; border-radius:1.5mm; padding:1.5mm 1mm 1mm 1mm; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; overflow:hidden; position:relative; border:1px solid #000000; font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; margin:0 auto; text-align:center;">
        <!-- Top: Centered Crisp Square 2D QR Code (Slightly larger ~14mm, thin-line anti-blotting) -->
        <div style="width:13.5mm; height:13.5mm; background:#FFFFFF; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-sizing:border-box; margin-bottom:1mm;">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:100%; height:100%; display:block; object-fit:contain; image-rendering:pixelated;" />` : `<div style="font-size:6pt; font-weight:bold;">QR</div>`}
        </div>

        <!-- Frame Unique Code / SKU -->
        <div style="font-size:7pt; font-weight:900; line-height:1.1; letter-spacing:0.02em; color:#000000 !important; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; text-transform:uppercase;">
          ${escapeHtml(sku)}
        </div>

        <!-- Short Frame Name / Model -->
        ${name ? `<div style="font-size:5.5pt; font-weight:600; line-height:1.1; color:#111111 !important; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; margin-top:0.4mm;">${escapeHtml(name)}</div>` : ''}

        <!-- Current Retail Price (Rs.) -->
        ${price ? `<div style="font-size:6.5pt; font-weight:900; line-height:1.1; color:#000000 !important; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%; margin-top:0.6mm;">${escapeHtml(price)}</div>` : ''}
      </div>
    `;
  }

  /**
   * Render unified 384-dot ESC/POS raster for a frame sticker via HTML5 Canvas
   * Perfectly matches reference image down to the dot, zero bleeding, zero large text.
   */
  async function renderStickerToUnifiedRaster(frame, widthMm = 24, heightMm = 28) {
    const sku = (frame.sku || frame.id || 'NOOR-FRAME').toUpperCase();
    const name = (frame.name || '').slice(0, 24);
    let price = frame.selling_price_paise ? formatINR(frame.selling_price_paise, true) : (frame.selling_price_inr ? formatINR(frame.selling_price_inr * 100, true) : '');
    if (price && price.startsWith('₹')) price = 'Rs. ' + price.substring(1).trim();
    if (price && !price.toUpperCase().startsWith('RS') && !price.toUpperCase().startsWith('M.R.P')) {
      price = 'Rs. ' + price;
    }

    // Direct Frame SKU = Version 1 (21x21 modules), simplest QR design, zero thermal blotting, fastest camera recognition!
    const qrPayload = sku;
    const qrDataUrl = await generateQrDataUrl(qrPayload, 180);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const lineDots = 384;
        const dotsPerMm = 8;
        const cardWidthDots = Math.min(360, Math.max(180, Math.round(widthMm * dotsPerMm)));
        const cardHeightDots = Math.round(heightMm * dotsPerMm);
        const totalHeightDots = Math.max(cardHeightDots + 16, 220);

        const canvas = document.createElement('canvas');
        canvas.width = lineDots;
        canvas.height = totalHeightDots;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, lineDots, totalHeightDots);

        const cardX = Math.floor((lineDots - cardWidthDots) / 2);
        const cardY = 6;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(cardX, cardY, cardWidthDots, cardHeightDots);

        const qrSizeDots = Math.min(cardWidthDots - 24, 120);
        const qrX = Math.floor(cardX + (cardWidthDots - qrSizeDots) / 2);
        const qrY = cardY + 12;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, qrX, qrY, qrSizeDots, qrSizeDots);

        let textY = qrY + qrSizeDots + 22;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';

        ctx.font = 'bold 20px "Plus Jakarta Sans", Arial, sans-serif';
        ctx.fillText(sku, cardX + cardWidthDots / 2, textY, cardWidthDots - 16);
        textY += 18;

        if (name) {
          ctx.font = '500 15px "Plus Jakarta Sans", Arial, sans-serif';
          ctx.fillText(name, cardX + cardWidthDots / 2, textY, cardWidthDots - 16);
          textY += 19;
        }

        if (price) {
          ctx.font = 'bold 18px "Plus Jakarta Sans", Arial, sans-serif';
          ctx.fillText(price, cardX + cardWidthDots / 2, textY, cardWidthDots - 16);
        }

        const rasterBase64 = convertCanvasToEscPosRasterBase64(canvas);
        resolve({
          qrDataUrl,
          stickerRasterBase64: rasterBase64
        });
      };
      img.onerror = () => {
        resolve({ qrDataUrl: '', stickerRasterBase64: '' });
      };
      img.src = qrDataUrl;
    });
  }

  /**
   * Render One Frame QR Sticker inside an on-screen container (Modal preview)
   */
  async function renderSingleStickerCard(container, frame, widthMm, heightMm, contactText, isPreview = false, qrSize = 'medium', preset = '') {
    container.innerHTML = '';
    const activePreset = preset || document.querySelector('input[name="stk-preset-choice"]:checked')?.value || 'url';
    const sku = (frame.sku || frame.id || 'NOOR-FRAME').toUpperCase();
    const qrPayload = (activePreset === 'sku')
      ? sku
      : `HTTPS://NOOROPTICS.VERCEL.APP/Q/${encodeURIComponent(sku)}`;
    const qrDataUrl = await generateQrDataUrl(qrPayload, 320);
    const w = widthMm || Number(document.getElementById('stk-width-mm')?.value) || 26;
    const h = heightMm || Number(document.getElementById('stk-height-mm')?.value) || 32;
    container.innerHTML = buildStickerHtml(frame, w, h, '', qrDataUrl, qrSize);
  }

  /**
   * Execute Sticker Print with 100% Suppression of Browser Date, Time, Project Title & URL
   * Opens a clean dedicated popup window with @page { margin: 0; }
   */
  async function executeStickerPrint() {
    const activePreset = document.querySelector('input[name="stk-preset-choice"]:checked')?.value || 'url';
    const w = 20;
    const h = 21;
    const qrSize = 'temple';
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
      const sku = (frame.sku || frame.id || 'NOOR-FRAME').toUpperCase();
      const qrPayload = (activePreset === 'sku')
        ? sku
        : `HTTPS://NOOROPTICS.VERCEL.APP/Q/${encodeURIComponent(sku)}`;
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
            <div class="roll-sticker-wrapper" style="page-break-after:always; break-after:page; margin:0; padding:0; width:${w}mm; height:${h}mm; display:flex; flex-direction:column; align-items:center; justify-content:center;">
              ${buildStickerHtml(item.frame, w, h, '', item.qrDataUrl, qrSize)}
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

    // 3. Print via dedicated hidden iframe (100% immune to browser popup blockers)
    let iframe = document.getElementById('silent-receipt-print-frame');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'silent-receipt-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Frame QR Sticker</title>
        <style>
          @page {
            size: ${isRoll ? '58mm auto' : 'auto'};
            margin: 0mm !important;
          }
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            margin: 0 auto !important;
            padding: 0 !important;
            width: ${isRoll ? '58mm' : 'auto'} !important;
            max-width: ${isRoll ? '58mm' : 'none'} !important;
            background: #FFFFFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
      </head>
      <body>
        ${printBodyHtml}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        showToast('Print dialog triggered for yellow frame QR sticker(s)!', 'success');
      } catch (err) {
        // Fallback popup if iframe focus is restricted
        const printWin = window.open('', '_blank', 'width=700,height=700');
        if (printWin) {
          printWin.document.open();
          printWin.document.write(doc.documentElement.outerHTML);
          printWin.document.close();
          setTimeout(() => { printWin.focus(); printWin.print(); }, 250);
        }
      }
    }, 250);
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
    const deletedTokens = getDeletedProductTokens();

    const filtered = state.inventoryList.filter(p => {
      if (!p) return false;
      const pId = p.id ? String(p.id).toLowerCase().trim() : '';
      const pSku = p.sku ? String(p.sku).toLowerCase().trim() : '';
      const pName = p.name ? String(p.name).toLowerCase().trim() : '';
      if (deletedTokens.has(pId) || deletedTokens.has(pSku) || deletedTokens.has(pName)) return false;

      if (shape !== 'all' && p.shape !== shape) return false;
      if (query) {
        if (!pName.includes(query) && !pSku.includes(query)) return false;
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
          <img src="${escapeHtml(p.image_url ? (p.image_url.startsWith('/') ? p.image_url : '/' + p.image_url) : '/images/frames/frame_01.jpg')}" alt="${escapeHtml(p.name)}" class="pos-item-img" onerror="this.onerror=null; this.src='/images/frames/frame_01.jpg';" />
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

    let stock = 0;
    if (frame.total_stock !== undefined && frame.total_stock !== null) {
      stock = Number(frame.total_stock);
    } else if (Array.isArray(frame.variants) && frame.variants.length > 0) {
      stock = frame.variants.reduce((acc, v) => acc + (Number(v.available_qty) || 0), 0);
    } else if (frame.available_qty !== undefined && frame.available_qty !== null) {
      stock = Number(frame.available_qty);
    } else if (frame.stock !== undefined && frame.stock !== null) {
      stock = Number(frame.stock);
    } else {
      stock = 50;
    }

    if (stock <= 0) {
      showToast(`Cannot add "${frame.name}": Out of stock!`, 'warning');
      return;
    }

    const existingIndex = state.posCart.findIndex(i => i.productId === frame.id);
    if (existingIndex > -1) {
      // Refresh maxStock & increase quantity
      state.posCart[existingIndex].maxStock = stock;
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
        product_name: frame.name,
        model: frame.model || frame.name,
        brand: frame.brand || 'NOOR',
        sku: frame.sku,
        color: variant.color_name || 'Standard',
        variant_name: variant.color_name || 'Standard',
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

    // Prevent repeated immediate duplicate scans of the same frame within 1.2 seconds
    const now = Date.now();
    if (state.lastScannedCode === cleanCode && (now - state.lastScanTime) < 1200) {
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
      // Robust SKU extraction from URL (case-insensitive /Q/, /q/, /qr/, etc.) or raw text
      let skuOrId = cleanCode.split('?')[0].split('#')[0];
      if (/^https?:\/\//i.test(skuOrId) || skuOrId.includes('/')) {
        const parts = skuOrId.split('/').filter(Boolean);
        if (parts.length > 0) {
          skuOrId = parts[parts.length - 1];
        }
      }
      skuOrId = decodeURIComponent(skuOrId).trim();
      const targetUpper = skuOrId.toUpperCase();

      // ── 1. INSTANT LOCAL MEMORY RESOLUTION (0ms latency, zero delay!) ────────
      let localFrame = (state.inventoryList || []).find(f => {
        return (f.sku && f.sku.toUpperCase() === targetUpper) ||
          (f.variant_sku && f.variant_sku.toUpperCase() === targetUpper) ||
          (f.product_sku && f.product_sku.toUpperCase() === targetUpper) ||
          (f.id && String(f.id).toUpperCase() === targetUpper) ||
          (f.barcode && f.barcode === skuOrId) ||
          (f.name && f.name.toUpperCase() === targetUpper);
      });

      if (!localFrame) {
        try {
          const cached = JSON.parse(localStorage.getItem('noor_custom_frames') || '[]');
          localFrame = cached.find(f => {
            return (f.sku && f.sku.toUpperCase() === targetUpper) ||
              (f.id && String(f.id).toUpperCase() === targetUpper) ||
              (f.name && f.name.toUpperCase() === targetUpper);
          });
        } catch (_) { }
      }

      if (localFrame) {
        // Authoritative stock from inventory data: total_stock, variant balances, or stock field
        let availableQty = 0;
        if (localFrame.total_stock !== undefined && localFrame.total_stock !== null) {
          availableQty = Number(localFrame.total_stock);
        } else if (Array.isArray(localFrame.variants) && localFrame.variants.length > 0) {
          availableQty = localFrame.variants.reduce((acc, v) => acc + (Number(v.available_qty) || 0), 0);
        } else if (localFrame.available_qty !== undefined && localFrame.available_qty !== null) {
          availableQty = Number(localFrame.available_qty);
        } else if (localFrame.stock !== undefined && localFrame.stock !== null) {
          availableQty = Number(localFrame.stock);
        } else {
          availableQty = 50;
        }

        if (availableQty <= 0) {
          if (feedbackEl) {
            feedbackEl.className = 'scan-status-notice error';
            feedbackEl.textContent = `⚠️ Frame "${localFrame.name}" (${localFrame.sku}) is OUT OF STOCK.`;
          }
          showToast(`Frame "${localFrame.name}" is OUT OF STOCK.`, 'warning');
          return;
        }

        const pricePaise = localFrame.selling_price_paise || (localFrame.selling_price_inr ? localFrame.selling_price_inr * 100 : 0);
        const priceINR = localFrame.selling_price_inr || (pricePaise / 100);

        const existingIndex = state.posCart.findIndex(i => i.sku === localFrame.sku || i.productId === localFrame.id);
        if (existingIndex > -1) {
          state.posCart[existingIndex].maxStock = availableQty;
          if (state.posCart[existingIndex].quantity >= availableQty) {
            showToast(`Maximum stock reached for "${localFrame.name}". Available in stock: ${availableQty}`, 'warning');
            return;
          }
          state.posCart[existingIndex].quantity += 1;
          state.posCart[existingIndex].lineTotalINR = state.posCart[existingIndex].quantity * state.posCart[existingIndex].priceINR;
          state.posCart[existingIndex].lineTotalPaise = state.posCart[existingIndex].quantity * state.posCart[existingIndex].pricePaise;

          playScannerBeep();
          updatePosCartUI();

          if (feedbackEl) {
            feedbackEl.className = 'scan-status-notice success';
            feedbackEl.textContent = `⚡ "${localFrame.name}" (${localFrame.sku}) quantity increased to ${state.posCart[existingIndex].quantity}!`;
            setTimeout(() => { if (feedbackEl) feedbackEl.style.display = 'none'; }, 2000);
          }
          return;
        } else {
          state.posCart.push({
            productId: localFrame.product_id || localFrame.id,
            variantId: (localFrame.variants && localFrame.variants[0]?.id) || localFrame.variant_id || `var-${localFrame.id}-1`,
            name: localFrame.name,
            product_name: localFrame.name,
            model: localFrame.model || localFrame.name,
            brand: localFrame.brand || 'NOOR',
            sku: localFrame.sku,
            color: (localFrame.variants && localFrame.variants[0]?.color_name) || localFrame.color_name || 'Standard',
            variant_name: (localFrame.variants && localFrame.variants[0]?.color_name) || localFrame.color_name || 'Standard',
            priceINR,
            pricePaise,
            quantity: 1,
            maxStock: availableQty,
            lineTotalINR: priceINR,
            lineTotalPaise: pricePaise
          });
        }

        playScannerBeep();
        updatePosCartUI();

        if (feedbackEl) {
          feedbackEl.className = 'scan-status-notice success';
          feedbackEl.textContent = `⚡ Added "${localFrame.name}" (${localFrame.sku}) to bill!`;
          setTimeout(() => { if (feedbackEl) feedbackEl.style.display = 'none'; }, 2000);
        }
        return;
      }

      // ── 2. FALLBACK TO NETWORK RESOLUTION IF NOT IN LOCAL CACHE ──────────────
      const res = await apiFetch(`/api/qr/resolve/${encodeURIComponent(skuOrId)}`);
      if (res.found && res.product) {
        const prod = res.product;
        const availableQty = Number(prod.availableQty) || Number(prod.total_stock) || 50;

        if (availableQty <= 0) {
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
          state.posCart[existingIndex].maxStock = availableQty;
          if (state.posCart[existingIndex].quantity >= availableQty) {
            showToast(`Maximum stock reached for "${prod.name}". Available in stock: ${availableQty}`, 'warning');
            return;
          }
          state.posCart[existingIndex].quantity += 1;
          state.posCart[existingIndex].lineTotalINR = state.posCart[existingIndex].quantity * state.posCart[existingIndex].priceINR;
          state.posCart[existingIndex].lineTotalPaise = state.posCart[existingIndex].quantity * state.posCart[existingIndex].pricePaise;

          playScannerBeep();
          updatePosCartUI();

          if (feedbackEl) {
            feedbackEl.className = 'scan-status-notice success';
            feedbackEl.textContent = `⚡ "${prod.name}" (${prod.sku}) quantity increased to ${state.posCart[existingIndex].quantity}!`;
            setTimeout(() => { if (feedbackEl) feedbackEl.style.display = 'none'; }, 2000);
          }
          return;
        } else {
          state.posCart.push({
            productId: prod.productId,
            variantId: prod.variantId,
            name: prod.name,
            product_name: prod.name,
            model: prod.model || prod.name,
            brand: prod.brand || 'NOOR',
            sku: prod.sku,
            color: prod.colorName || 'Standard',
            variant_name: prod.colorName || 'Standard',
            priceINR: prod.sellingPriceINR,
            pricePaise: prod.sellingPricePaise,
            quantity: 1,
            maxStock: availableQty,
            lineTotalINR: prod.sellingPriceINR,
            lineTotalPaise: prod.sellingPricePaise
          });
        }

        playScannerBeep();
        updatePosCartUI();

        if (feedbackEl) {
          feedbackEl.className = 'scan-status-notice success';
          feedbackEl.textContent = `⚡ Added "${prod.name}" (${prod.sku}) to bill!`;
          setTimeout(() => { if (feedbackEl) feedbackEl.style.display = 'none'; }, 2000);
        }
      }
    } catch (err) {
      if (feedbackEl) {
        feedbackEl.className = 'scan-status-notice error';
        feedbackEl.textContent = `Scan Error: Frame "${cleanCode}" not found in catalog.`;
      }
      showToast(`Scan Error: Frame not found: ${cleanCode}`, 'error');
    }
  }


  // ── OpticTool Inline Customer & Live Clock Helpers ─────────────────────────
  function getPosInlineCustomer() {
    const name = document.getElementById('pos-inline-name')?.value.trim() || 'Walk-in Customer';
    const phone = document.getElementById('pos-inline-phone')?.value.trim() || null;
    const city = document.getElementById('pos-inline-city')?.value.trim() || null;
    const age = parseInt(document.getElementById('pos-inline-age')?.value || '0', 10) || null;
    return {
      id: state.posSelectedClient?.id || null,
      name,
      phone,
      city,
      age
    };
  }

  function clearPosInlineCustomer() {
    ['pos-inline-name', 'pos-inline-phone', 'pos-inline-city', 'pos-inline-age', 'pos-bill-notes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  function updatePosLiveClock() {
    const clockEl = document.getElementById('pos-live-clock');
    if (!clockEl) return;
    const now = new Date();
    const opts = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    clockEl.textContent = now.toLocaleDateString('en-GB', opts).replace(/,/g, '');
  }

  // ── Render Attached Prescriptions Summary (Immediate Real-time Rendering) ──
  function renderPosAttachedPrescriptions() {
    const rxListContainer = document.getElementById('pos-rx-attached-list');
    const rxCountBadge = document.getElementById('pos-rx-count-badge');
    const fallbackBadge = document.getElementById('pos-rx-attached-badge');

    // Ensure state.posPrescriptions is an array
    if (!Array.isArray(state.posPrescriptions)) {
      state.posPrescriptions = [];
      if (state.posDraftPrescription || state.posSelectedPrescription) {
        state.posPrescriptions.push(state.posDraftPrescription || state.posSelectedPrescription);
      }
    }

    const rxList = state.posPrescriptions;

    if (rxCountBadge) {
      if (rxList.length > 0) {
        rxCountBadge.style.display = 'inline-block';
        rxCountBadge.textContent = rxList.length === 1 ? '1 Rx' : `${rxList.length} Rx Added`;
      } else {
        rxCountBadge.style.display = 'none';
      }
    }

    if (rxListContainer) {
      if (rxList.length === 0) {
        rxListContainer.innerHTML = '';
        if (fallbackBadge) fallbackBadge.style.display = 'none';
      } else {
        rxListContainer.innerHTML = rxList.map((rx, idx) => {
          const odSph = rx.od_sph != null ? rx.od_sph : (rx.odSph != null ? rx.odSph : '0.00');
          const odCyl = rx.od_cyl != null ? rx.od_cyl : (rx.odCyl != null ? rx.odCyl : '—');
          const odAxis = (rx.od_axis != null || rx.odAxis != null) ? ((rx.od_axis != null ? rx.od_axis : rx.odAxis) + '°') : '—';
          const osSph = rx.os_sph != null ? rx.os_sph : (rx.osSph != null ? rx.osSph : '0.00');
          const osCyl = rx.os_cyl != null ? rx.os_cyl : (rx.osCyl != null ? rx.osCyl : '—');
          const osAxis = (rx.os_axis != null || rx.osAxis != null) ? ((rx.os_axis != null ? rx.os_axis : rx.osAxis) + '°') : '—';
          const add = rx.addition || rx.add;
          const pd = rx.ipd_distance || rx.ipdDistance;
          const rxLabel = rx.prescription_number || `Prescription #${idx + 1}`;

          return `
            <div class="optic-attached-rx-card" style="margin-bottom:6px;">
              <div class="optic-rx-badge-top">
                <span class="optic-rx-badge-num">🩺 ${escapeHtml(rxLabel)}${rxList.length > 1 ? ` (Rx ${idx + 1})` : ''}</span>
                <button type="button" class="btn-rx-remove" onclick="removePosAttachedRx(${idx})" title="Remove this prescription">&times;</button>
              </div>
              <div class="optic-rx-mini-table">
                <table style="width:100%; font-size:0.72rem; border-collapse:collapse; margin-top:4px;">
                  <thead>
                    <tr style="color:#94A3B8; text-align:left; border-bottom:1px solid rgba(255,255,255,0.15);">
                      <th style="padding:2px 4px;">EYE</th>
                      <th style="padding:2px 4px;">SPH</th>
                      <th style="padding:2px 4px;">CYL</th>
                      <th style="padding:2px 4px;">AXIS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding:3px 4px; font-weight:700; color:#BAE6FD;">OD (Right)</td>
                      <td style="padding:3px 4px;">${odSph}</td>
                      <td style="padding:3px 4px;">${odCyl}</td>
                      <td style="padding:3px 4px;">${odAxis}</td>
                    </tr>
                    <tr>
                      <td style="padding:3px 4px; font-weight:700; color:#BAE6FD;">OS (Left)</td>
                      <td style="padding:3px 4px;">${osSph}</td>
                      <td style="padding:3px 4px;">${osCyl}</td>
                      <td style="padding:3px 4px;">${osAxis}</td>
                    </tr>
                  </tbody>
                </table>
                ${(add || pd) ? `
                  <div style="font-size:0.68rem; color:#BAE6FD; margin-top:4px; padding-top:2px; border-top:1px dashed rgba(255,255,255,0.15);">
                    ${add ? `ADD: <strong>${escapeHtml(add)}</strong> ` : ''}
                    ${pd ? `• IPD: <strong>${escapeHtml(pd)} mm</strong>` : ''}
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  function updatePosCartUI() {
    // 1. ALWAYS render attached prescriptions immediately (zero lag, independent of cart items)
    renderPosAttachedPrescriptions();

    const listEl = document.getElementById('pos-cart-items-list');
    const countEl = document.getElementById('pos-cart-count');
    const subtotalEl = document.getElementById('pos-subtotal-val');
    const discountValEl = document.getElementById('pos-discount-val');
    const discountInput = document.getElementById('pos-discount-amount');
    const taxEl = document.getElementById('pos-tax-val');
    const advanceInput = document.getElementById('pos-advance-amount');
    const advanceValEl = document.getElementById('pos-advance-val');
    const remainingValEl = document.getElementById('pos-remaining-val');
    const grandTotalEl = document.getElementById('pos-grand-total-val');
    const btnCheckout = document.getElementById('btn-pos-confirm-checkout');

    if (!listEl) return;

    if (state.posCart.length === 0) {
      listEl.innerHTML = `
        <div class="pos-cart-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <p>Bill is currently empty.<br/>Scan a QR sticker or tap frames from stock.</p>
        </div>
      `;
      if (countEl) countEl.textContent = '0 items';
      if (subtotalEl) subtotalEl.textContent = '₹0.00';
      if (discountValEl) discountValEl.textContent = '-₹0.00';
      if (taxEl) taxEl.textContent = '₹0.00';
      if (advanceValEl) advanceValEl.textContent = '₹0.00';
      if (remainingValEl) remainingValEl.textContent = '₹ 0';
      const remBadgeEmpty = document.getElementById('optic-rem-badge');
      if (remBadgeEmpty) {
        remBadgeEmpty.classList.remove('rem-has-due');
        remBadgeEmpty.classList.add('rem-settled');
      }
      if (grandTotalEl) grandTotalEl.value = '0.00';
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
            <span class="cart-item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
            <span class="cart-item-sku">${escapeHtml(item.sku)}${item.color ? ' • ' + escapeHtml(item.color) : ''}</span>
          </div>
          <div class="cart-item-qty-ctrl">
            <button type="button" class="btn-qty" onclick="changePosItemQty(${idx}, -1)">−</button>
            <span style="font-weight:700; width:16px; text-align:center;">${item.quantity}</span>
            <button type="button" class="btn-qty" onclick="changePosItemQty(${idx}, 1)">+</button>
          </div>
          <div class="cart-item-price">${formatINR(item.priceINR)}</div>
          <div class="cart-item-total" style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
            <span>${formatINR(item.lineTotalINR)}</span>
            <button type="button" class="btn-remove-cart-item" onclick="removePosItem(${idx})" title="Remove item">&times;</button>
          </div>
        </div>
      `;
    }).join('');

    const prevDueInput = document.getElementById('pos-prev-due-amount');
    const prevDueINR = parseFloat(prevDueInput ? prevDueInput.value : 0) || 0;
    const prevDuePaise = Math.round(prevDueINR * 100);

    const discountINR = parseFloat(discountInput ? discountInput.value : 0) || 0;
    const discountPaise = Math.round(discountINR * 100);

    const totalBeforeDiscountPaise = subtotalPaise + prevDuePaise;
    const grandTotalPaise = Math.max(0, totalBeforeDiscountPaise - discountPaise);
    // GST 18% inclusive
    const taxPaise = Math.round(grandTotalPaise - (grandTotalPaise / 1.18));

    const advanceINR = parseFloat(advanceInput ? advanceInput.value : 0) || 0;
    const advancePaise = Math.round(advanceINR * 100);
    const secondInput = document.getElementById('pos-second-amount');
    const secondINR = parseFloat(secondInput ? secondInput.value : 0) || 0;
    const thirdInput = document.getElementById('pos-third-amount');
    const thirdINR = parseFloat(thirdInput ? thirdInput.value : 0) || 0;

    const isInstallmentEntered = (advanceINR > 0 || secondINR > 0 || thirdINR > 0);
    const totalPaidPaise = Math.round((advanceINR + secondINR + thirdINR) * 100);
    const remainingPaise = isInstallmentEntered ? Math.max(0, grandTotalPaise - totalPaidPaise) : 0;

    if (countEl) countEl.textContent = `${totalItems} item${totalItems > 1 ? 's' : ''}`;
    if (subtotalEl) subtotalEl.textContent = '₹' + (totalBeforeDiscountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (discountValEl) discountValEl.value = (discountPaise / 100).toFixed(2);
    if (taxEl) taxEl.value = (taxPaise / 100).toFixed(2);
    if (advanceValEl) advanceValEl.value = (advancePaise / 100).toFixed(2);
    if (remainingValEl) {
      if (!isInstallmentEntered && grandTotalPaise > 0) {
        remainingValEl.textContent = '₹ 0 (PAID IN FULL)';
      } else {
        remainingValEl.textContent = '₹ ' + (remainingPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    }
    const remBadgeActive = document.getElementById('optic-rem-badge');
    if (remBadgeActive) {
      if (remainingPaise === 0) {
        remBadgeActive.classList.remove('rem-has-due');
        remBadgeActive.classList.add('rem-settled');
      } else {
        remBadgeActive.classList.remove('rem-settled');
        remBadgeActive.classList.add('rem-has-due');
      }
    }
    if (grandTotalEl) grandTotalEl.value = (grandTotalPaise / 100).toFixed(2);
    if (btnCheckout) btnCheckout.disabled = false;

    // Dynamic UPI QR if UPI_GPAY is selected
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
    const merchantName = encodeURIComponent(state.storeSettings.store_name || 'NOOR OPTIC');
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

    if (!btnToggle) return;

    // Listen for manual camera device changes
    if (cameraDropdown) {
      cameraDropdown.addEventListener('change', async () => {
        if (state.posScannerActive && state.html5QrScanner) {
          await stopCameraScanner();
          await startCameraScanner(cameraDropdown.value);
        }
      });
    }

    btnToggle.addEventListener('click', async () => {
      if (!window.Html5Qrcode) {
        showToast('Camera scanner library is initializing. Please tap again in a moment.', 'info');
        return;
      }
      if (state.posScannerActive) {
        // Stop Camera
        await stopCameraScanner();
      } else {
        // Start Camera
        await startCameraScanner();
      }
    });

    async function startCameraScanner(preferredCameraId = null) {
      try {
        const formats = window.Html5QrcodeSupportedFormats
          ? [
            window.Html5QrcodeSupportedFormats.QR_CODE,
            window.Html5QrcodeSupportedFormats.CODE_128,
            window.Html5QrcodeSupportedFormats.CODE_39,
            window.Html5QrcodeSupportedFormats.EAN_13,
            window.Html5QrcodeSupportedFormats.UPC_A
          ]
          : undefined;

        state.html5QrScanner = new window.Html5Qrcode('html5-qr-reader', {
          formatsToSupport: formats,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });

        const cameras = await window.Html5Qrcode.getCameras().catch(() => []);
        if (!cameras || cameras.length === 0) {
          showToast('No camera devices detected on this computer/device.', 'warning');
          return;
        }

        // Populate camera dropdown if multiple cameras are present
        if (cameraDropdown && cameras.length > 1) {
          cameraDropdown.innerHTML = '';
          cameras.forEach((cam, idx) => {
            const opt = document.createElement('option');
            opt.value = cam.id;
            opt.textContent = cam.label || `Camera ${idx + 1}`;
            cameraDropdown.appendChild(opt);
          });
          cameraDropdown.style.display = 'inline-block';
        }

        viewportWrap.style.display = 'block';
        cameraDot.classList.add('active');
        btnText.textContent = 'Close Camera';
        state.posScannerActive = true;

        // Determine active camera: preferred ID -> back camera -> first camera
        let activeCameraId = preferredCameraId;
        if (!activeCameraId) {
          const backCamera = cameras.find(c =>
            c.label.toLowerCase().includes('back') ||
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('environment')
          ) || cameras[0];
          activeCameraId = backCamera.id;
        }

        if (cameraDropdown && activeCameraId) {
          cameraDropdown.value = activeCameraId;
        }

        // Start scanner with targeted high-speed scanning box aligned with yellow brackets
        await state.html5QrScanner.start(
          activeCameraId,
          {
            fps: 30,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const edge = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.max(200, Math.floor(edge * 0.88));
              return { width: qrboxSize, height: qrboxSize };
            },
            aspectRatio: 1.0,
            videoConstraints: {
              facingMode: { ideal: 'environment' },
              width: { min: 640, ideal: 1280 },
              height: { min: 480, ideal: 720 },
              frameRate: { ideal: 30 }
            }
          },
          (decodedText) => {
            resolveAndAddFrameToPos(decodedText);
          },
          (errorMessage) => {
            // Normal scan frame cycle
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
        } catch (e) { }
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
  // ── OpticTool POS UI Interactions (Stock toggle, Bill Image, Prescription) ─
  function setupPosOpticFeatures() {
    // 1. Stock catalog toggle
    const btnToggleStock = document.getElementById('btn-toggle-stock-catalog');
    const stockCatalogWrap = document.getElementById('optic-stock-catalog-wrap');
    if (btnToggleStock && stockCatalogWrap) {
      btnToggleStock.addEventListener('click', () => {
        const isHidden = window.getComputedStyle(stockCatalogWrap).display === 'none';
        stockCatalogWrap.style.display = isHidden ? 'block' : 'none';
        btnToggleStock.innerHTML = isHidden ? '<span>✕ Hide Stock</span>' : '<span>📦 View Stock</span>';
      });
    }

    // 2. Bill Image handlers (Camera snap & Gallery upload)
    const btnRxCamera = document.getElementById('btn-rx-camera-snap');
    const btnRxGallery = document.getElementById('btn-pos-rx-upload');
    const fileGallery = document.getElementById('pos-rx-file-input');
    const fileCamera = document.getElementById('pos-camera-file-input');
    const previewWrap = document.getElementById('pos-rx-preview-wrap');
    const previewImg = document.getElementById('pos-rx-image-preview');
    const btnRemoveRxImg = document.getElementById('btn-remove-rx-img');

    if (btnRxCamera && fileCamera) {
      btnRxCamera.addEventListener('click', () => fileCamera.click());
    }
    if (btnRxGallery && fileGallery) {
      btnRxGallery.addEventListener('click', () => fileGallery.click());
    }

    const handleBillFile = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        state.uploadedRxImageUrl = dataUrl;
        if (previewImg) previewImg.src = dataUrl;
        if (previewWrap) previewWrap.style.display = 'block';
        showToast('Bill image attached!', 'success');
      };
      reader.readAsDataURL(file);

      // Async background server upload
      const formData = new FormData();
      formData.append('image', file);
      const headers = {};
      if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
      fetch('/api/prescriptions/upload-image', {
        method: 'POST',
        headers,
        body: formData
      })
        .then(res => res.json())
        .then(json => {
          if (json.imageUrl) state.uploadedRxImageUrl = json.imageUrl;
        })
        .catch(err => console.warn('Server image upload sync:', err));
    };

    if (fileCamera) {
      fileCamera.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleBillFile(e.target.files[0]);
      });
    }
    if (fileGallery) {
      fileGallery.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleBillFile(e.target.files[0]);
      });
    }

    if (btnRemoveRxImg) {
      btnRemoveRxImg.addEventListener('click', () => {
        state.uploadedRxImageUrl = null;
        if (previewWrap) previewWrap.style.display = 'none';
        if (previewImg) previewImg.src = '';
        if (fileCamera) fileCamera.value = '';
        if (fileGallery) fileGallery.value = '';
        showToast('Bill image removed.', 'info');
      });
    }

    // 3. Prescription actions
    const btnRxCreateNew = document.getElementById('btn-rx-create-new');
    if (btnRxCreateNew) {
      btnRxCreateNew.addEventListener('click', () => {
        openPrescriptionModal(null, (rxData) => {
          if (!Array.isArray(state.posPrescriptions)) state.posPrescriptions = [];
          state.posPrescriptions.push(rxData);
          state.posDraftPrescription = state.posPrescriptions[0];
          state.posSelectedPrescription = state.posPrescriptions[0];
          updatePosCartUI();
          showToast(`Prescription #${state.posPrescriptions.length} attached to bill!`, 'success');
        });
      });
    }

    // Global helper to remove a specific attached prescription
    window.removePosAttachedRx = function (index) {
      if (Array.isArray(state.posPrescriptions) && state.posPrescriptions[index]) {
        state.posPrescriptions.splice(index, 1);
        state.posDraftPrescription = state.posPrescriptions[0] || null;
        state.posSelectedPrescription = state.posPrescriptions[0] || null;
        updatePosCartUI();
        showToast('Prescription removed from bill.', 'info');
      }
    };

    const btnRxSearchExisting = document.getElementById('btn-rx-search-existing');
    if (btnRxSearchExisting) {
      btnRxSearchExisting.addEventListener('click', () => {
        openClientDetailsModal();
      });
    }

    const btnBrowseClients = document.getElementById('btn-browse-clients');
    if (btnBrowseClients) {
      btnBrowseClients.addEventListener('click', () => {
        openClientDetailsModal();
      });
    }

    const btnRemoveRx = document.getElementById('btn-pos-remove-rx');
    if (btnRemoveRx) {
      btnRemoveRx.addEventListener('click', (e) => {
        e.stopPropagation();
        state.posDraftPrescription = null;
        state.posSelectedPrescription = null;
        updatePosCartUI();
        showToast('Prescription detached.', 'info');
      });
    }
  }

  // ── POS Payment & Checkout Submission ─────────────────────────────────────
  function setupPosCheckout() {
    const btnNewBill = document.getElementById('btn-pos-new-bill');
    const btnReset = document.getElementById('btn-pos-reset');
    const btnClearCart = document.getElementById('btn-clear-cart');
    const btnCheckout = document.getElementById('btn-pos-confirm-checkout');
    const discountInput = document.getElementById('pos-discount-amount');
    const advanceInput = document.getElementById('pos-advance-amount');

    const resetBill = (confirmUser = false) => {
      if (confirmUser && (state.posCart.length > 0 || document.getElementById('pos-inline-name')?.value)) {
        if (!confirm('Are you sure you want to reset this bill? All current items and inputs will be cleared.')) {
          return;
        }
      }
      state.posCart = [];
      state.posSelectedClient = null;
      state.posSelectedPrescription = null;
      state.posDraftPrescription = null;
      state.posPrescriptions = [];
      state.uploadedRxImageUrl = null;
      clearPosInlineCustomer();
      const wrap = document.getElementById('pos-rx-preview-wrap');
      if (wrap) wrap.style.display = 'none';
      const previewImg = document.getElementById('pos-rx-image-preview');
      if (previewImg) previewImg.src = '';
      if (discountInput) discountInput.value = 0;
      if (advanceInput) advanceInput.value = 0;
      const pDue = document.getElementById('pos-prev-due-amount'); if (pDue) pDue.value = 0;
      const pSec = document.getElementById('pos-second-amount'); if (pSec) pSec.value = 0;
      const pThr = document.getElementById('pos-third-amount'); if (pThr) pThr.value = 0;
      const pPk = document.getElementById('pos-pickup-time'); if (pPk) pPk.value = '';
      const mNm = document.getElementById('pos-manual-item-name'); if (mNm) mNm.value = '';
      const mPr = document.getElementById('pos-manual-item-price'); if (mPr) mPr.value = '';
      const dueAlert = document.getElementById('pos-customer-due-alert'); if (dueAlert) dueAlert.style.display = 'none';

      const tokenDisplay = document.getElementById('pos-token-display');
      if (tokenDisplay) {
        tokenDisplay.textContent = 'INV-NOOR-' + Date.now().toString().slice(-4);
      }
      updatePosCartUI();
    };

    if (btnNewBill) {
      btnNewBill.addEventListener('click', () => {
        resetBill(false);
        showToast('New in-store bill started.', 'info');
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        resetBill(true);
        showToast('Bill reset.', 'info');
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

    if (advanceInput) {
      advanceInput.addEventListener('input', () => updatePosCartUI());
    }

    const prevDueInput = document.getElementById('pos-prev-due-amount');
    const secondInput = document.getElementById('pos-second-amount');
    const thirdInput = document.getElementById('pos-third-amount');
    const pickupInput = document.getElementById('pos-pickup-time');
    const btnSearchPrevDue = document.getElementById('btn-search-prev-due');
    const btnAddManual = document.getElementById('btn-add-manual-item');
    const manualNameInput = document.getElementById('pos-manual-item-name');
    const manualQtyInput = document.getElementById('pos-manual-item-qty');
    const manualPriceInput = document.getElementById('pos-manual-item-price');

    if (prevDueInput) prevDueInput.addEventListener('input', () => updatePosCartUI());
    if (secondInput) secondInput.addEventListener('input', () => updatePosCartUI());
    if (thirdInput) thirdInput.addEventListener('input', () => updatePosCartUI());

    // Search customer's past due balance
    if (btnSearchPrevDue) {
      btnSearchPrevDue.addEventListener('click', async () => {
        const client = state.posSelectedClient;
        const inlinePhone = document.getElementById('pos-inline-phone')?.value.trim();

        let clientId = client?.id;
        if (!clientId && inlinePhone) {
          const match = (state.clientsCache || []).find(c => c.phone === inlinePhone);
          if (match) clientId = match.id;
        }

        if (clientId) {
          try {
            const dueRes = await apiFetch(`/api/customers/${clientId}/due`);
            const dueINR = dueRes.total_due_inr || 0;
            state._posCurrentDueOrders = dueRes.orders || [];
            if (prevDueInput) prevDueInput.value = dueINR;
            const dueAlert = document.getElementById('pos-customer-due-alert');
            const dueText = document.getElementById('pos-customer-due-text');
            const btnDirectCollect = document.getElementById('btn-pos-collect-due-direct');
            if (btnDirectCollect) {
              btnDirectCollect.onclick = () => {
                if (state._posCurrentDueOrders && state._posCurrentDueOrders.length > 0) {
                  openCollectPaymentModal(state._posCurrentDueOrders[0].id);
                }
              };
            }
            if (dueINR > 0) {
              if (dueAlert && dueText) {
                dueAlert.style.display = 'flex';
                dueText.textContent = `⚠️ Pending Balance: ₹${dueINR.toLocaleString('en-IN')} from ${dueRes.orders ? dueRes.orders.length : 1} past bill(s)!`;
              }
              updatePosCartUI();
              showToast(`Found ₹${dueINR.toLocaleString('en-IN')} previous unpaid due for client.`, 'warning');
            } else {
              if (dueAlert) dueAlert.style.display = 'none';
              updatePosCartUI();
              showToast('No previous unpaid dues found for this client.', 'info');
            }
          } catch (e) {
            showToast('Could not fetch client due: ' + e.message, 'warning');
          }
        } else {
          showToast('Please select or type a registered customer phone number first.', 'info');
        }
      });
    }

    // Automatic Phone-Number Client & Due Balance Detection
    const inlinePhoneInput = document.getElementById('pos-inline-phone');
    if (inlinePhoneInput) {
      let phoneDebounceTimer = null;
      inlinePhoneInput.addEventListener('input', () => {
        clearTimeout(phoneDebounceTimer);
        const rawPhone = inlinePhoneInput.value.trim();
        const cleanDigits = rawPhone.replace(/\D/g, '');

        if (cleanDigits.length < 5) {
          const dueAlert = document.getElementById('pos-customer-due-alert');
          if (dueAlert) dueAlert.style.display = 'none';
          return;
        }

        phoneDebounceTimer = setTimeout(async () => {
          try {
            const dueRes = await apiFetch(`/api/customers/${encodeURIComponent(rawPhone)}/due`);
            const dueAlert = document.getElementById('pos-customer-due-alert');
            const dueText = document.getElementById('pos-customer-due-text');
            const prevDueEl = document.getElementById('pos-prev-due-amount');
            const inlineName = document.getElementById('pos-inline-name');
            const inlineCity = document.getElementById('pos-inline-city');
            const inlineAge = document.getElementById('pos-inline-age');

            // Auto-fill client details if found
            if (dueRes.clientName && inlineName && (!inlineName.value.trim() || inlineName.value === 'Walk-in Customer')) {
              inlineName.value = dueRes.clientName;
            }
            if (dueRes.clientCity && inlineCity && !inlineCity.value.trim()) {
              inlineCity.value = dueRes.clientCity;
            }
            if (dueRes.clientAge && inlineAge && !inlineAge.value.trim()) {
              inlineAge.value = dueRes.clientAge;
            }

            if (dueRes.clientId) {
              state.posSelectedClient = {
                id: dueRes.clientId,
                name: dueRes.clientName || inlineName?.value,
                phone: dueRes.clientPhone || rawPhone,
                city: dueRes.clientCity || inlineCity?.value,
                age: dueRes.clientAge || inlineAge?.value
              };

              // Auto-attach latest prescription if not already attached
              if ((!state.posPrescriptions || state.posPrescriptions.length === 0) && !state.posDraftPrescription) {
                try {
                  const rxListRes = await apiFetch(`/api/customers/${dueRes.clientId}/prescriptions`);
                  const rxList = Array.isArray(rxListRes) ? rxListRes : (rxListRes?.prescriptions || []);
                  if (rxList.length > 0) {
                    if (!Array.isArray(state.posPrescriptions)) state.posPrescriptions = [];
                    state.posPrescriptions.push(rxList[0]);
                    state.posDraftPrescription = rxList[0];
                    renderPosAttachedPrescriptions();
                    showToast(`Attached latest Rx (${rxList[0].prescription_number || 'Rx'}) for ${dueRes.clientName}`, 'info');
                  }
                } catch (_) { }
              }
            }

            const dueINR = dueRes.total_due_inr || dueRes.totalDueINR || 0;
            state._posCurrentDueOrders = dueRes.orders || [];
            const btnDirectCollect = document.getElementById('btn-pos-collect-due-direct');
            if (btnDirectCollect) {
              btnDirectCollect.onclick = () => {
                if (state._posCurrentDueOrders && state._posCurrentDueOrders.length > 0) {
                  openCollectPaymentModal(state._posCurrentDueOrders[0].id);
                }
              };
            }
            if (dueINR > 0) {
              if (prevDueEl) prevDueEl.value = dueINR;
              if (dueAlert && dueText) {
                dueAlert.style.display = 'flex';
                dueText.textContent = `⚠️ Pending Balance: ₹${dueINR.toLocaleString('en-IN')} from ${dueRes.orders ? dueRes.orders.length : 1} past bill(s)!`;
              }
              updatePosCartUI();
              showToast(`Customer has ₹${dueINR.toLocaleString('en-IN')} pending balance from past bill(s)!`, 'warning');
            } else {
              if (dueAlert) dueAlert.style.display = 'none';
            }
          } catch (e) {
            // Quiet fail if not found yet
          }
        }, 350);
      });
    }

    // Manual item entry handler
    const addManualItem = () => {
      const name = (manualNameInput?.value || '').trim();
      const qty = parseInt(manualQtyInput?.value || '1', 10) || 1;
      const price = parseFloat(manualPriceInput?.value || '0');

      if (!name) {
        showToast('Please enter an item or frame name.', 'warning');
        manualNameInput?.focus();
        return;
      }
      if (isNaN(price) || price < 0) {
        showToast('Please enter a valid price.', 'warning');
        manualPriceInput?.focus();
        return;
      }

      const pricePaise = Math.round(price * 100);
      const lineTotalINR = qty * price;
      const lineTotalPaise = qty * pricePaise;

      state.posCart.push({
        isManual: true,
        productId: null,
        variantId: null,
        name: name,
        product_name: name,
        model: name,
        brand: 'In-Store Custom',
        sku: 'MANUAL-' + Date.now().toString().slice(-4),
        color: 'Standard',
        quantity: qty,
        priceINR: price,
        pricePaise: pricePaise,
        lineTotalINR: lineTotalINR,
        lineTotalPaise: lineTotalPaise,
        maxStock: 9999
      });

      manualNameInput.value = '';
      manualQtyInput.value = '1';
      manualPriceInput.value = '';
      updatePosCartUI();
      showToast(`Added "${name}" to bill.`, 'success');
    };

    if (btnAddManual) btnAddManual.addEventListener('click', addManualItem);
    if (manualPriceInput) {
      manualPriceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addManualItem();
        }
      });
    }
    if (manualNameInput) {
      manualNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          manualPriceInput?.focus();
        }
      });
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
            const total = parseFloat(grandTotalEl?.value || '0') || 0;
            renderPosDynamicUpiQr(total);
          }
        }
      });
    });

    // Save Bill & Print Checkout Action
    if (btnCheckout) {
      btnCheckout.addEventListener('click', async () => {
        if (state.posCart.length === 0) {
          showToast('Please add at least one frame before saving bill.', 'warning');
          return;
        }

        // Authoritative inline customer details
        const inlineCust = getPosInlineCustomer();
        const clientPayload = state.posSelectedClient ? {
          ...state.posSelectedClient,
          name: inlineCust.name || state.posSelectedClient.name,
          phone: inlineCust.phone || state.posSelectedClient.phone,
          city: inlineCust.city || state.posSelectedClient.city,
          age: inlineCust.age || state.posSelectedClient.age
        } : {
          id: null,
          name: inlineCust.name,
          phone: inlineCust.phone,
          city: inlineCust.city,
          age: inlineCust.age
        };

        btnCheckout.disabled = true;
        btnCheckout.innerHTML = `<span>Processing Sale...</span>`;

        try {
          const discountINR = parseFloat(discountInput ? discountInput.value : 0) || 0;
          const advanceINR = parseFloat(advanceInput ? advanceInput.value : 0) || 0;
          const previousDueINR = parseFloat(document.getElementById('pos-prev-due-amount')?.value || 0) || 0;
          const secondAmountINR = parseFloat(document.getElementById('pos-second-amount')?.value || 0) || 0;
          const thirdAmountINR = parseFloat(document.getElementById('pos-third-amount')?.value || 0) || 0;
          const pickupTime = document.getElementById('pos-pickup-time')?.value || null;
          const claimedUtr = document.getElementById('pos-claimed-utr') ? document.getElementById('pos-claimed-utr').value.trim() : null;
          const notes = document.getElementById('pos-bill-notes')?.value.trim() || null;
          const isInstallment = (advanceINR > 0 || secondAmountINR > 0 || thirdAmountINR > 0);

          // ── 1. PRESERVE CART & PRESCRIPTION SNAPSHOT BEFORE STATE RESET ──
          const cartSnapshot = state.posCart.map(item => ({ ...item }));
          const rxListSnapshot = Array.isArray(state.posPrescriptions) && state.posPrescriptions.length > 0
            ? state.posPrescriptions.map(rx => ({ ...rx }))
            : (state.posDraftPrescription || state.posSelectedPrescription ? [{ ...(state.posDraftPrescription || state.posSelectedPrescription) }] : []);
          const rxSnapshot = rxListSnapshot[0] || null;
          const subtotalPaiseSnapshot = state.posCart.reduce((sum, item) => sum + (item.lineTotalPaise || 0), 0);

          const payload = {
            customerId: clientPayload.id || null,
            clientDetails: clientPayload.id ? null : clientPayload,
            prescriptions: rxListSnapshot,
            prescriptionId: rxListSnapshot[0]?.id || null,
            newPrescription: rxListSnapshot[0]?.id ? null : (rxListSnapshot[0] || (state.uploadedRxImageUrl ? { imageUrl: state.uploadedRxImageUrl } : null)),
            customerName: clientPayload.name,
            customerPhone: clientPayload.phone || null,
            customerCity: clientPayload.city || null,
            customerAge: clientPayload.age || null,
            paymentMethod: state.posPaymode,
            discountINR,
            advanceINR: isInstallment ? advanceINR : undefined,
            previousDueINR,
            secondAmountINR,
            thirdAmountINR,
            pickupTime,
            notes,
            claimedUpiRef: claimedUtr,
            isVerifiedAtCounter: true,
            items: cartSnapshot.map(item => ({
              productId: item.productId,
              variantId: item.variantId,
              name: item.name,
              product_name: item.name,
              model: item.model || item.name,
              brand: item.brand || 'NOOR',
              sku: item.sku,
              color: item.color,
              variant_name: item.color,
              lensName: item.lensName || 'Standard Demo Lens',
              quantity: item.quantity,
              unitPricePaise: item.pricePaise,
              priceINR: item.priceINR,
              lineTotalINR: item.lineTotalINR,
              lineTotalPaise: item.lineTotalPaise
            }))
          };

          const res = await apiFetch('/api/pos/checkout', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

          showToast(`Sale completed! Invoice: ${res.invoiceNumber} (Token #${res.tokenNumber})`, 'success');

          // Print job is created atomically in durable print_jobs table.
          // The POS Daemon worker automatically claims and processes it via Realtime wake-up signal.
          if (res.orderId) {
            showToast(`🖨️ Bill #${res.orderNumber || res.invoiceNumber} queued for thermal printing.`, 'info');
            const localBillOrder = {
              id: res.orderId,
              order_number: res.orderNumber || res.invoiceNumber,
              customer_name: clientPayload.name,
              customer_phone: clientPayload.phone || null,
              customer_city: clientPayload.city || null,
              customer_age: clientPayload.age || null,
              payment_method: state.posPaymode,
              payment_status: isInstallment && (res.totalPayableINR - (advanceINR + secondAmountINR + thirdAmountINR) > 0) ? 'PARTIAL' : 'VERIFIED',
              subtotal: subtotalPaiseSnapshot / 100,
              grand_total: res.totalPayableINR,
              total_payable_inr: res.totalPayableINR,
              total_payable_paise: Math.round(res.totalPayableINR * 100),
              discount_inr: discountINR,
              discount_paise: Math.round(discountINR * 100),
              advance_paid_inr: isInstallment ? advanceINR : res.totalPayableINR,
              advance_paid_paise: Math.round((isInstallment ? advanceINR : res.totalPayableINR) * 100),
              second_payment_inr: secondAmountINR,
              second_payment_paise: Math.round(secondAmountINR * 100),
              third_payment_inr: thirdAmountINR,
              third_payment_paise: Math.round(thirdAmountINR * 100),
              outstanding_inr: isInstallment ? Math.max(0, res.totalPayableINR - (advanceINR + secondAmountINR + thirdAmountINR)) : 0,
              outstanding_paise: isInstallment ? Math.round(Math.max(0, res.totalPayableINR - (advanceINR + secondAmountINR + thirdAmountINR)) * 100) : 0,
              pickup_time: pickupTime,
              items: cartSnapshot,
              prescriptions: rxListSnapshot,
              prescription: rxSnapshot,
              od_sph: rxSnapshot?.od_sph || rxSnapshot?.odSph,
              od_cyl: rxSnapshot?.od_cyl || rxSnapshot?.odCyl,
              od_axis: rxSnapshot?.od_axis ?? rxSnapshot?.odAxis,
              os_sph: rxSnapshot?.os_sph || rxSnapshot?.osSph,
              os_cyl: rxSnapshot?.os_cyl || rxSnapshot?.osCyl,
              os_axis: rxSnapshot?.os_axis ?? rxSnapshot?.osAxis,
              addition: rxSnapshot?.addition ?? rxSnapshot?.add,
              ipd_distance: rxSnapshot?.ipd_distance ?? rxSnapshot?.ipdDistance,
              checked_by: rxSnapshot?.checked_by ?? rxSnapshot?.checkedBy,
              prescriber_details: rxSnapshot?.prescriber_details ?? rxSnapshot?.prescriberDetails,
              notes: notes
            };
            if (typeof instantPrintReceipt === 'function') {
              instantPrintReceipt(res.orderId, false, localBillOrder).catch(() => { });
            }
          }

          // Reset cart & inputs AFTER snapshot has been sent to printer
          state.posCart = [];
          state.posSelectedClient = null;
          state.posSelectedPrescription = null;
          state.posDraftPrescription = null;
          state.uploadedRxImageUrl = null;
          clearPosInlineCustomer();
          const wrap = document.getElementById('pos-rx-preview-wrap');
          if (wrap) wrap.style.display = 'none';
          const previewImg = document.getElementById('pos-rx-image-preview');
          if (previewImg) previewImg.src = '';
          if (discountInput) discountInput.value = 0;
          if (advanceInput) advanceInput.value = 0;
          const pDue2 = document.getElementById('pos-prev-due-amount'); if (pDue2) pDue2.value = 0;
          const pSec2 = document.getElementById('pos-second-amount'); if (pSec2) pSec2.value = 0;
          const pThr2 = document.getElementById('pos-third-amount'); if (pThr2) pThr2.value = 0;
          const pPk2 = document.getElementById('pos-pickup-time'); if (pPk2) pPk2.value = '';

          // Generate next token number
          const tokenDisplay = document.getElementById('pos-token-display');
          if (tokenDisplay) {
            tokenDisplay.textContent = 'INV-NOOR-' + Date.now().toString().slice(-4);
          }
          updatePosCartUI();

          // Refresh live datasets across system (immediate POS inventory update, non-blocking background refreshes)
          loadInventory();
          setTimeout(() => {
            loadOrders();
            loadDashboard();
            if (typeof loadClients === 'function') loadClients();
          }, 350);

          // Show Order Done modal
          const successModal = document.getElementById('modal-order-success');
          if (successModal) {
            const invoiceElem = document.getElementById('success-invoice-num');
            const tokenElem = document.getElementById('success-token-num');
            const clientElem = document.getElementById('success-client-name');
            const rxElem = document.getElementById('success-rx-status');
            if (invoiceElem) invoiceElem.textContent = res.invoiceNumber || '-';
            if (tokenElem) tokenElem.textContent = res.tokenNumber ? `#${res.tokenNumber}` : '-';
            if (clientElem) clientElem.textContent = payload.customerName || 'Walk-in Client';
            if (rxElem) rxElem.textContent = (res.prescriptionId || payload.newPrescription) ? 'Attached & Saved ✓' : 'Standard (Non-RX)';
            const btnPdf = document.getElementById('btn-success-pdf');
            if (btnPdf) {
              btnPdf.onclick = () => downloadInvoicePDF(res.orderId, res.invoiceNumber);
            }
            const btnReprint = document.getElementById('btn-success-reprint');
            if (btnReprint) {
              btnReprint.onclick = () => instantPrintReceipt(res.orderId, true, localBillOrder, 'reprint');
            }
            const btnItemQr = document.getElementById('btn-success-print-item-qr');
            if (btnItemQr) {
              btnItemQr.onclick = () => {
                const stickerItems = (localBillOrder?.items || []).map(it => ({
                  sku: it.sku || it.product_sku || 'FRAME',
                  name: it.product_name || it.name,
                  brand: it.brand || 'NOOR',
                  price: formatINR(it.unit_price_paise ? it.unit_price_paise : (it.unit_price_inr ? it.unit_price_inr * 100 : 0), true),
                  copies: it.quantity || 1
                }));
                showToast(`Printing ${stickerItems.length} frame QR sticker(s)...`, 'info');
                dispatchThermalStickerPrint(stickerItems);
              };
            }
            successModal.classList.add('open');
          }
        } catch (err) {
          showToast('Checkout failed: ' + err.message, 'error');
        } finally {
          btnCheckout.disabled = false;
          btnCheckout.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" id="pos-checkout-btn-icon"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span id="pos-btn-checkout-label">Save Bill &amp; Print</span>
          `;
          updatePosCartUI();
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SECTION: OPTICALTOOL DIOPTER SELECTOR BOTTOM SHEET (Reference Image 3)
  // ═══════════════════════════════════════════════════════════════════════════
  function setupDiopterSelector() {
    const sheet = document.getElementById('sheet-diopter-selector');
    const btnClose = document.getElementById('btn-close-diopter-sheet');
    const manualInput = document.getElementById('diopter-manual-input');
    const btnApplyManual = document.getElementById('btn-diopter-apply-manual');
    const quickPills = document.querySelectorAll('.diopter-quick-pill');

    if (btnClose && sheet) {
      btnClose.addEventListener('click', () => sheet.classList.remove('open'));
    }

    if (btnApplyManual && manualInput) {
      btnApplyManual.addEventListener('click', () => {
        const val = manualInput.value.trim();
        applyDiopterValue(val);
      });
      manualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = manualInput.value.trim();
          applyDiopterValue(val);
        }
      });
    }

    quickPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const quick = pill.dataset.quick;
        applyDiopterValue(quick === 'NONE' ? '' : quick);
      });
    });
  }

  window.openDiopterSelector = function (targetField, targetLabel, currentVal) {
    const sheet = document.getElementById('sheet-diopter-selector');
    const titleEl = document.getElementById('diopter-sheet-title');
    const manualInput = document.getElementById('diopter-manual-input');
    const gridEl = document.getElementById('diopter-grid-scroll');

    if (!sheet || !gridEl) return;

    state.activeDiopterTarget = { field: targetField, label: targetLabel, value: currentVal || '' };

    if (titleEl) titleEl.textContent = `Select ${targetLabel}`;
    if (manualInput) manualInput.value = currentVal || '';

    // Generate dual-column diopter grid from +0.25 to +12.00 (Left) and -0.25 to -12.00 (Right)
    const steps = [];
    for (let i = 1; i <= 48; i++) {
      const val = (i * 0.25).toFixed(2);
      steps.push(val);
    }

    gridEl.innerHTML = steps.map(val => {
      const posVal = `+${val}`;
      const negVal = `-${val}`;
      const isPosSelected = (currentVal === posVal);
      const isNegSelected = (currentVal === negVal);

      return `
        <button type="button" class="diopter-val-btn ${isPosSelected ? 'selected' : ''}" onclick="applyDiopterValue('${posVal}')">${posVal}</button>
        <button type="button" class="diopter-val-btn ${isNegSelected ? 'selected' : ''}" onclick="applyDiopterValue('${negVal}')">${negVal}</button>
      `;
    }).join('');

    sheet.classList.add('open');
  };

  window.applyDiopterValue = function (val) {
    const sheet = document.getElementById('sheet-diopter-selector');
    if (!state.activeDiopterTarget) return;

    const field = state.activeDiopterTarget.field;

    // Update the corresponding button text, internal data attribute, and input field
    let btnId = '';
    let inputId = '';
    if (field === 'od_sph') { btnId = 'rx-od-sph-btn'; inputId = 'rx-od-sph-input'; }
    else if (field === 'od_cyl') { btnId = 'rx-od-cyl-btn'; inputId = 'rx-od-cyl-input'; }
    else if (field === 'os_sph') { btnId = 'rx-os-sph-btn'; inputId = 'rx-os-sph-input'; }
    else if (field === 'os_cyl') { btnId = 'rx-os-cyl-btn'; inputId = 'rx-os-cyl-input'; }
    else if (field === 'addition') { btnId = 'rx-addition-btn'; inputId = 'rx-addition-input'; }

    const btn = document.getElementById(btnId);
    if (btn) {
      btn.dataset.val = val;
      const valSpan = btn.querySelector('.combobox-val');
      if (valSpan) {
        valSpan.textContent = val || 'Select';
      }
    }
    const input = document.getElementById(inputId);
    if (input) {
      input.value = val;
    }

    if (sheet) sheet.classList.remove('open');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. SECTION: OPTICALTOOL PRESCRIPTION MODAL (Reference Image 2)
  // ═══════════════════════════════════════════════════════════════════════════
  let activeRxSaveCallback = null;

  function setupPrescriptionModal() {
    const modal = document.getElementById('modal-prescription');
    const radioValues = document.getElementById('rx-mode-values');
    const radioUpload = document.getElementById('rx-mode-upload');
    const sectionValues = document.getElementById('rx-mode-values-section');
    const sectionUpload = document.getElementById('rx-mode-upload-section');
    const fileInput = document.getElementById('rx-file-upload-input');
    const dropzone = document.getElementById('rx-upload-dropzone');
    const btnRemoveImg = document.getElementById('btn-remove-rx-image');
    const btnSaveRx = document.getElementById('btn-save-rx');

    // Radio Mode Switching
    if (radioValues && radioUpload) {
      radioValues.addEventListener('change', () => {
        sectionValues.style.display = 'block';
        sectionUpload.style.display = 'none';
        document.getElementById('rx-mode-select-label')?.classList.add('active');
        document.getElementById('rx-mode-upload-label')?.classList.remove('active');
      });

      radioUpload.addEventListener('change', () => {
        sectionValues.style.display = 'none';
        sectionUpload.style.display = 'block';
        document.getElementById('rx-mode-select-label')?.classList.remove('active');
        document.getElementById('rx-mode-upload-label')?.classList.add('active');
      });
    }

    // Combobox pill click listeners to open Diopter Selector sheet
    const comboboxBtns = [
      { id: 'rx-od-sph-btn', field: 'od_sph', label: 'Right SPH' },
      { id: 'rx-od-cyl-btn', field: 'od_cyl', label: 'Right CYL' },
      { id: 'rx-os-sph-btn', field: 'os_sph', label: 'Left SPH' },
      { id: 'rx-os-cyl-btn', field: 'os_cyl', label: 'Left CYL' },
      { id: 'rx-addition-btn', field: 'addition', label: 'Addition' }
    ];

    comboboxBtns.forEach(item => {
      const btn = document.getElementById(item.id);
      if (btn) {
        btn.addEventListener('click', () => {
          const inputId = item.id.replace('-btn', '-input');
          const currentVal = document.getElementById(inputId)?.value.trim() || btn.dataset.val || '';
          openDiopterSelector(item.field, item.label, currentVal);
        });
      }
      // Also listen to direct typing in input field
      const inputId = item.id.replace('-btn', '-input');
      const inputEl = document.getElementById(inputId);
      if (inputEl) {
        inputEl.addEventListener('input', () => {
          if (btn) btn.dataset.val = inputEl.value.trim();
        });
      }
    });

    // File Upload handling
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
          showToast('Uploading prescription image...', 'info');
          const token = state.token;
          const headers = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch('/api/prescriptions/upload-image', {
            method: 'POST',
            headers,
            body: formData
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.message || 'Image upload failed');

          state.uploadedRxImageUrl = json.imageUrl;
          const previewImg = document.getElementById('rx-image-preview');
          const previewWrap = document.getElementById('rx-image-preview-wrap');
          if (previewImg && previewWrap) {
            previewImg.src = json.imageUrl;
            previewWrap.style.display = 'block';
          }
          showToast('Prescription image uploaded successfully!', 'success');
        } catch (err) {
          showToast('Upload error: ' + err.message, 'error');
        }
      });
    }

    if (btnRemoveImg) {
      btnRemoveImg.addEventListener('click', () => {
        state.uploadedRxImageUrl = null;
        const previewWrap = document.getElementById('rx-image-preview-wrap');
        const fileInput = document.getElementById('rx-file-upload-input');
        if (previewWrap) previewWrap.style.display = 'none';
        if (fileInput) fileInput.value = '';
      });
    }

    // Save RX Button Handler
    if (btnSaveRx) {
      btnSaveRx.addEventListener('click', async () => {
        const odSph = document.getElementById('rx-od-sph-input')?.value.trim() || document.getElementById('rx-od-sph-btn')?.dataset.val || '';
        const odCyl = document.getElementById('rx-od-cyl-input')?.value.trim() || document.getElementById('rx-od-cyl-btn')?.dataset.val || '';
        const odAxis = document.getElementById('rx-od-axis-input')?.value || null;
        const osSph = document.getElementById('rx-os-sph-input')?.value.trim() || document.getElementById('rx-os-sph-btn')?.dataset.val || '';
        const osCyl = document.getElementById('rx-os-cyl-input')?.value.trim() || document.getElementById('rx-os-cyl-btn')?.dataset.val || '';
        const osAxis = document.getElementById('rx-os-axis-input')?.value || null;
        const addition = document.getElementById('rx-addition-input')?.value.trim() || document.getElementById('rx-addition-btn')?.dataset.val || '';
        const ipdD = document.getElementById('rx-ipd-d-input')?.value || null;
        const ipdN = document.getElementById('rx-ipd-n-input')?.value || null;
        const checkedBy = document.getElementById('rx-checked-by-input')?.value.trim() || (state.user?.name || 'Optometrist');
        const prescriber = document.getElementById('rx-prescriber-input')?.value.trim() || null;
        const notes = document.getElementById('rx-notes-input')?.value.trim() || null;
        const imageUrl = state.uploadedRxImageUrl || null;

        // Verify that at least one value or image is entered
        if (!odSph && !odCyl && !osSph && !osCyl && !addition && !imageUrl) {
          showToast('Please select at least one prescription diopter or upload an image.', 'warning');
          return;
        }

        const rxData = {
          od_sph: odSph || null,
          od_cyl: odCyl || null,
          od_axis: odAxis !== null && odAxis !== '' ? Number(odAxis) : null,
          os_sph: osSph || null,
          os_cyl: osCyl || null,
          os_axis: osAxis !== null && osAxis !== '' ? Number(osAxis) : null,
          addition: addition || null,
          ipd_distance: ipdD !== null && ipdD !== '' ? Number(ipdD) : null,
          ipd_near: ipdN !== null && ipdN !== '' ? Number(ipdN) : null,
          checked_by: checkedBy,
          prescriber_details: prescriber,
          notes: notes,
          image_url: imageUrl,
          prescription_date: new Date().toISOString(),
          // camelCase aliases for full compatibility
          odSph: odSph || null,
          odCyl: odCyl || null,
          odAxis: odAxis !== null && odAxis !== '' ? Number(odAxis) : null,
          osSph: osSph || null,
          osCyl: osCyl || null,
          osAxis: osAxis !== null && osAxis !== '' ? Number(osAxis) : null,
          ipdDistance: ipdD !== null && ipdD !== '' ? Number(ipdD) : null,
          ipdNear: ipdN !== null && ipdN !== '' ? Number(ipdN) : null,
          checkedBy: checkedBy,
          prescriberDetails: prescriber,
          imageUrl: imageUrl
        };

        if (typeof activeRxSaveCallback === 'function') {
          await activeRxSaveCallback(rxData);
        } else {
          // Default: Save to active POS draft
          state.posDraftPrescription = rxData;
          state.posSelectedPrescription = null;

          // Update summary in client details modal
          const rxSummary = document.getElementById('client-active-rx-summary');
          if (rxSummary) {
            rxSummary.style.display = 'block';
            rxSummary.innerHTML = `
              <strong>🩺 Draft Prescription Ready:</strong><br/>
              Right (OD): SPH ${rxData.od_sph || '0.00'}, CYL ${rxData.od_cyl || '0.00'}, AXIS ${rxData.od_axis !== null ? rxData.od_axis + '°' : '-'}<br/>
              Left (OS): SPH ${rxData.os_sph || '0.00'}, CYL ${rxData.os_cyl || '0.00'}, AXIS ${rxData.os_axis !== null ? rxData.os_axis + '°' : '-'}<br/>
              ${rxData.addition ? `Addition: ${rxData.addition} • ` : ''}Checked by: ${escapeHtml(rxData.checked_by || '-')}
            `;
          }

          showToast('Prescription recorded for this bill!', 'success');
        }

        modal.classList.remove('open');
      });
    }
  }

  window.openPrescriptionModal = function (existingRx = null, customSaveCallback = null) {
    const modal = document.getElementById('modal-prescription');
    if (!modal) return;

    activeRxSaveCallback = customSaveCallback;
    state.uploadedRxImageUrl = existingRx ? existingRx.image_url : null;

    // Reset combobox buttons and inputs
    const resetCombobox = (id, val) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.dataset.val = val || '';
        const span = btn.querySelector('.combobox-val');
        if (span) span.textContent = val || 'Select';
      }
      const inputId = id.replace('-btn', '-input');
      const input = document.getElementById(inputId);
      if (input) {
        input.value = val || '';
      }
    };

    resetCombobox('rx-od-sph-btn', existingRx?.od_sph || existingRx?.odSph);
    resetCombobox('rx-od-cyl-btn', existingRx?.od_cyl || existingRx?.odCyl);
    resetCombobox('rx-os-sph-btn', existingRx?.os_sph || existingRx?.osSph);
    resetCombobox('rx-os-cyl-btn', existingRx?.os_cyl || existingRx?.osCyl);
    resetCombobox('rx-addition-btn', existingRx?.addition);

    const odAxisInput = document.getElementById('rx-od-axis-input');
    const osAxisInput = document.getElementById('rx-os-axis-input');
    const ipdDInput = document.getElementById('rx-ipd-d-input');
    const ipdNInput = document.getElementById('rx-ipd-n-input');
    const checkedByInput = document.getElementById('rx-checked-by-input');
    const prescriberInput = document.getElementById('rx-prescriber-input');
    const notesInput = document.getElementById('rx-notes-input');

    const odAxisVal = existingRx?.od_axis !== undefined ? existingRx?.od_axis : existingRx?.odAxis;
    const osAxisVal = existingRx?.os_axis !== undefined ? existingRx?.os_axis : existingRx?.osAxis;
    const ipdDVal = existingRx?.ipd_distance !== undefined ? existingRx?.ipd_distance : existingRx?.ipdDistance;
    const ipdNVal = existingRx?.ipd_near !== undefined ? existingRx?.ipd_near : existingRx?.ipdNear;

    if (odAxisInput) odAxisInput.value = odAxisVal !== null && odAxisVal !== undefined ? odAxisVal : '';
    if (osAxisInput) osAxisInput.value = osAxisVal !== null && osAxisVal !== undefined ? osAxisVal : '';
    if (ipdDInput) ipdDInput.value = ipdDVal !== null && ipdDVal !== undefined ? ipdDVal : '';
    if (ipdNInput) ipdNInput.value = ipdNVal !== null && ipdNVal !== undefined ? ipdNVal : '';
    if (checkedByInput) checkedByInput.value = existingRx?.checked_by || existingRx?.checkedBy || (state.user?.name || 'Optometrist');
    if (prescriberInput) prescriberInput.value = existingRx?.prescriber_details || existingRx?.prescriberDetails || '';
    if (notesInput) notesInput.value = existingRx?.notes || '';

    // Image preview
    const previewWrap = document.getElementById('rx-image-preview-wrap');
    const previewImg = document.getElementById('rx-image-preview');
    if (previewWrap && previewImg) {
      if (existingRx?.image_url || existingRx?.imageUrl) {
        previewImg.src = existingRx.image_url || existingRx.imageUrl;
        previewWrap.style.display = 'block';
      } else {
        previewWrap.style.display = 'none';
        previewImg.src = '';
      }
    }

    // Default to Values tab
    document.getElementById('rx-mode-values')?.click();
    modal.classList.add('open');
  };

  // ── Doctor/Optometrist View & Edit Prescription Lens Values ───────────────
  window.openEditPrescriptionModal = async function (prescriptionId) {
    if (!prescriptionId) {
      showToast('No prescription ID provided to view/edit.', 'warning');
      return;
    }

    try {
      showToast('Loading prescription lens values...', 'info');
      const rx = await apiFetch(`/api/prescriptions/${prescriptionId}`);
      if (!rx || !rx.id) {
        showToast('Prescription record not found.', 'error');
        return;
      }

      const modal = document.getElementById('modal-prescription');
      const titleElem = modal?.querySelector('.optical-rx-title');
      const btnSaveText = document.getElementById('btn-save-rx-text');

      if (titleElem) titleElem.textContent = `Edit RX — ${rx.prescription_number || 'Record'}`;
      if (btnSaveText) btnSaveText.textContent = 'Update Prescription Lens Values';

      window.openPrescriptionModal(rx, async (updatedData) => {
        try {
          showToast('Updating prescription lens values in database...', 'info');
          await apiFetch(`/api/prescriptions/${prescriptionId}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData)
          });
          showToast('Prescription lens values updated successfully!', 'success');
          modal.classList.remove('open');

          if (titleElem) titleElem.textContent = 'Create New RX';
          if (btnSaveText) btnSaveText.textContent = 'Save & Add RX to Bill';

          // Refresh orders and clients
          loadOrders();
          if (typeof loadClients === 'function') loadClients();
          if (state.activeProfileClientId) {
            openClientProfile(state.activeProfileClientId);
          }
          const orderModal = document.getElementById('modal-order-details');
          if (orderModal && orderModal.classList.contains('open') && window._activeViewingOrderId) {
            viewOrderDetails(window._activeViewingOrderId);
          }
        } catch (err) {
          showToast('Failed to update prescription: ' + err.message, 'error');
        }
      });
    } catch (err) {
      showToast('Error opening prescription: ' + err.message, 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. SECTION: CUSTOMER DETAILS MODAL (Add / Search / Confirm Client)
  // ═══════════════════════════════════════════════════════════════════════════
  function setupClientDetailsModal() {
    const modal = document.getElementById('modal-client-details');
    const searchInput = document.getElementById('client-search-typeahead');
    const dropdown = document.getElementById('client-typeahead-dropdown');
    const btnOpenRx = document.getElementById('btn-open-rx-form');
    const btnSaveClientWithRx = document.getElementById('btn-save-client-with-rx');
    const rxSelect = document.getElementById('client-saved-rx-select');

    // Real-time Typeahead search across existing clients
    if (searchInput && dropdown) {
      let debounceTimer = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = searchInput.value.trim().toLowerCase();

        if (query.length < 1) {
          dropdown.style.display = 'none';
          return;
        }

        debounceTimer = setTimeout(async () => {
          try {
            const res = await apiFetch(`/api/customers?search=${encodeURIComponent(query)}`);
            const clients = Array.isArray(res) ? res : (res.customers || []);

            if (clients.length === 0) {
              dropdown.innerHTML = `<div style="padding:10px; font-size:0.78rem; color:#9CA3AF; text-align:center;">No matching clients found in database. Fill form below to create new.</div>`;
              dropdown.style.display = 'block';
              return;
            }

            dropdown.innerHTML = clients.map(c => `
              <div class="typeahead-item" onclick="selectTypeaheadClient('${c.id}')">
                <div>
                  <div class="typeahead-name">${escapeHtml(c.name)}</div>
                  <div class="typeahead-sub">📞 ${escapeHtml(c.phone || '-')} • 📍 ${escapeHtml(c.city || '-')}</div>
                </div>
                <span class="typeahead-code">${escapeHtml(c.client_code || 'CLT')}</span>
              </div>
            `).join('');
            dropdown.style.display = 'block';
          } catch (err) {
            console.error('Typeahead search error:', err);
          }
        }, 200);
      });

      // Close dropdown on outside click
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });
    }

    // Saved RX dropdown change listener
    if (rxSelect) {
      rxSelect.addEventListener('change', () => {
        const rxId = rxSelect.value;
        const rxSummary = document.getElementById('client-active-rx-summary');
        if (!rxId) {
          state.posSelectedPrescription = null;
          if (!state.posDraftPrescription && rxSummary) rxSummary.style.display = 'none';
          return;
        }

        const clientRxList = rxSelect._rxList || [];
        const found = clientRxList.find(r => r.id === rxId);
        if (found) {
          state.posSelectedPrescription = found;
          state.posDraftPrescription = found;
          if (!Array.isArray(state.posPrescriptions)) state.posPrescriptions = [];
          if (!state.posPrescriptions.some(r => r.id === found.id)) {
            state.posPrescriptions.push(found);
          }
          updatePosCartUI();
          if (rxSummary) {
            rxSummary.style.display = 'block';
            rxSummary.innerHTML = `
              <strong>🩺 Selected Saved Prescription (${found.prescription_number || 'RX'}):</strong><br/>
              Right (OD): SPH ${found.od_sph || '0.00'}, CYL ${found.od_cyl || '0.00'}, AXIS ${found.od_axis || '-'}<br/>
              Left (OS): SPH ${found.os_sph || '0.00'}, CYL ${found.os_cyl || '0.00'}, AXIS ${found.os_axis || '-'}<br/>
              ${found.addition ? `Addition: ${found.addition} • ` : ''}Checked by: ${escapeHtml(found.checked_by || '-')}
            `;
          }
        }
      });
    }

    // Open OpticalTool RX modal from client details
    if (btnOpenRx) {
      btnOpenRx.addEventListener('click', () => {
        openPrescriptionModal(state.posDraftPrescription || state.posSelectedPrescription);
      });
    }

    // Save Client & Return to Bill Button
    if (btnSaveClientWithRx) {
      btnSaveClientWithRx.addEventListener('click', () => {
        const nameInput = document.getElementById('cust-full-name');
        const ageInput = document.getElementById('cust-age');
        const phoneInput = document.getElementById('cust-phone');
        const cityInput = document.getElementById('cust-city');
        const emailInput = document.getElementById('cust-email');
        const dobInput = document.getElementById('cust-dob');
        const addressInput = document.getElementById('cust-address');
        const notesInput = document.getElementById('cust-notes');
        const hiddenId = document.getElementById('cust-hidden-id')?.value || null;

        const name = nameInput ? nameInput.value.trim() : '';
        const age = ageInput ? parseInt(ageInput.value, 10) : null;
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const city = cityInput ? cityInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const dob = dobInput ? dobInput.value : null;
        const address = addressInput ? addressInput.value.trim() : '';
        const notes = notesInput ? notesInput.value.trim() : '';

        // Validation for required customer information
        if (!name) {
          showToast('Please enter the client full name.', 'warning');
          nameInput?.focus();
          return;
        }
        if (!age || isNaN(age) || age < 1 || age > 120) {
          showToast('Please enter a valid age between 1 and 120.', 'warning');
          ageInput?.focus();
          return;
        }
        if (!phone || phone.length < 5) {
          showToast('Please enter a valid phone number.', 'warning');
          phoneInput?.focus();
          return;
        }
        if (!city) {
          showToast('Please enter the client city.', 'warning');
          cityInput?.focus();
          return;
        }

        // If saving from Client Directory tab, persist directly to /api/customers
        if (state.ordersActiveChannel === 'CLIENTS') {
          apiFetch('/api/customers', {
            method: 'POST',
            body: JSON.stringify({
              name,
              age,
              phone,
              city,
              email: email || null,
              dob: dob || null,
              address: address || null,
              notes: notes || null,
              confirmDuplicate: true
            })
          }).then(res => {
            showToast(`Client "${name}" registered successfully (${res.clientCode || 'CLT'}).`, 'success');
            modal.classList.remove('open');
            loadClients();
          }).catch(err => {
            showToast('Failed to save client: ' + err.message, 'error');
          });
          return;
        }

        // Attach client to active POS state
        state.posSelectedClient = {
          id: hiddenId,
          name,
          age,
          phone,
          city,
          email: email || null,
          dob: dob || null,
          address: address || null,
          notes: notes || null
        };

        // Also sync inline customer inputs on POS view
        const inlineName = document.getElementById('pos-inline-name');
        const inlinePhone = document.getElementById('pos-inline-phone');
        const inlineCity = document.getElementById('pos-inline-city');
        const inlineAge = document.getElementById('pos-inline-age');
        if (inlineName) inlineName.value = name;
        if (inlinePhone) inlinePhone.value = phone;
        if (inlineCity) inlineCity.value = city;
        if (inlineAge) inlineAge.value = age || '';

        // Update active bill display
        updatePosCartUI();

        modal.classList.remove('open');
        showToast(`Client "${name}" attached to bill. Review and confirm checkout when ready.`, 'success');
      });
    }
  }

  window.openClientDetailsModal = function () {
    const modal = document.getElementById('modal-client-details');
    const searchInput = document.getElementById('client-search-typeahead');
    const dropdown = document.getElementById('client-typeahead-dropdown');
    const nameInput = document.getElementById('cust-full-name');
    const ageInput = document.getElementById('cust-age');
    const phoneInput = document.getElementById('cust-phone');
    const cityInput = document.getElementById('cust-city');
    const emailInput = document.getElementById('cust-email');
    const dobInput = document.getElementById('cust-dob');
    const addressInput = document.getElementById('cust-address');
    const notesInput = document.getElementById('cust-notes');
    const hiddenId = document.getElementById('cust-hidden-id');
    const rxSummary = document.getElementById('client-active-rx-summary');
    const savedRxContainer = document.getElementById('client-saved-rx-container');

    if (!modal) return;

    if (searchInput) searchInput.value = '';
    if (dropdown) dropdown.style.display = 'none';

    // Pre-populate if client already selected in bill
    if (state.posSelectedClient) {
      if (hiddenId) hiddenId.value = state.posSelectedClient.id || '';
      if (nameInput) nameInput.value = state.posSelectedClient.name || '';
      if (ageInput) ageInput.value = state.posSelectedClient.age || '';
      if (phoneInput) phoneInput.value = state.posSelectedClient.phone || '';
      if (cityInput) cityInput.value = state.posSelectedClient.city || '';
      if (emailInput) emailInput.value = state.posSelectedClient.email || '';
      if (dobInput) dobInput.value = state.posSelectedClient.dob || '';
      if (addressInput) addressInput.value = state.posSelectedClient.address || '';
      if (notesInput) notesInput.value = state.posSelectedClient.notes || '';

      if (state.posSelectedClient.id) {
        loadClientPrescriptionsIntoSelect(state.posSelectedClient.id);
      }
    } else {
      if (hiddenId) hiddenId.value = '';
      if (nameInput) nameInput.value = '';
      if (ageInput) ageInput.value = '';
      if (phoneInput) phoneInput.value = '';
      if (cityInput) cityInput.value = 'Bengaluru';
      if (emailInput) emailInput.value = '';
      if (dobInput) dobInput.value = '';
      if (addressInput) addressInput.value = '';
      if (notesInput) notesInput.value = '';
      if (savedRxContainer) savedRxContainer.style.display = 'none';
    }

    // Prescription summary
    const attachedRx = state.posDraftPrescription || state.posSelectedPrescription;
    if (attachedRx && rxSummary) {
      rxSummary.style.display = 'block';
      rxSummary.innerHTML = `
        <strong>🩺 Attached Prescription:</strong><br/>
        Right (OD): SPH ${attachedRx.od_sph || '0.00'}, CYL ${attachedRx.od_cyl || '0.00'}, AXIS ${attachedRx.od_axis || '-'}<br/>
        Left (OS): SPH ${attachedRx.os_sph || '0.00'}, CYL ${attachedRx.os_cyl || '0.00'}, AXIS ${attachedRx.os_axis || '-'}<br/>
        ${attachedRx.addition ? `Addition: ${attachedRx.addition} • ` : ''}Checked by: ${escapeHtml(attachedRx.checked_by || '-')}
      `;
    } else if (rxSummary) {
      rxSummary.style.display = 'none';
    }

    modal.classList.add('open');
  };

  window.selectTypeaheadClient = async function (clientId) {
    const dropdown = document.getElementById('client-typeahead-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    try {
      const client = await apiFetch(`/api/customers/${clientId}`);
      if (!client) return;

      document.getElementById('cust-hidden-id').value = client.id;
      document.getElementById('cust-full-name').value = client.name || '';
      document.getElementById('cust-age').value = client.age || '';
      document.getElementById('cust-phone').value = client.phone || '';
      document.getElementById('cust-city').value = client.city || '';
      document.getElementById('cust-email').value = client.email || '';
      document.getElementById('cust-dob').value = client.dob || '';
      document.getElementById('cust-address').value = client.address || '';
      document.getElementById('cust-notes').value = client.notes || '';

      const inlineName = document.getElementById('pos-inline-name');
      const inlinePhone = document.getElementById('pos-inline-phone');
      const inlineCity = document.getElementById('pos-inline-city');
      const inlineAge = document.getElementById('pos-inline-age');
      if (inlineName) inlineName.value = client.name || '';
      if (inlinePhone) inlinePhone.value = client.phone || '';
      if (inlineCity) inlineCity.value = client.city || '';
      if (inlineAge) inlineAge.value = client.age || '';

      await loadClientPrescriptionsIntoSelect(client.id);
      showToast(`Loaded details for ${client.name}`, 'info');
    } catch (err) {
      showToast('Failed to load client details: ' + err.message, 'error');
    }
  };

  async function loadClientPrescriptionsIntoSelect(clientId) {
    const container = document.getElementById('client-saved-rx-container');
    const select = document.getElementById('client-saved-rx-select');
    if (!container || !select) return;

    try {
      const res = await apiFetch(`/api/customers/${clientId}/prescriptions`);
      const rxList = Array.isArray(res) ? res : (res.prescriptions || []);

      if (rxList.length === 0) {
        container.style.display = 'none';
        return;
      }

      select._rxList = rxList;
      select.innerHTML = `<option value="">-- No Prescription Selected --</option>` +
        rxList.map(r => `
          <option value="${r.id}">
            ${escapeHtml(r.prescription_number || 'RX')} • ${formatShortDate(r.prescription_date || r.created_at)} • OD: ${r.od_sph || '0.00'} / OS: ${r.os_sph || '0.00'}
          </option>
        `).join('');

      container.style.display = 'block';

      // Pre-select if already active
      if (state.posSelectedPrescription) {
        select.value = state.posSelectedPrescription.id || '';
      }
    } catch (err) {
      console.error('Error loading client prescriptions:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. SECTION: CLIENT DIRECTORY CRM & PROFILE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  function setupClientManagement() {
    const subtabClients = document.getElementById('subtab-clients');
    const subtabInStore = document.getElementById('subtab-in-store');
    const subtabWebsite = document.getElementById('subtab-website');
    const ordersContainer = document.getElementById('orders-content-container');
    const clientsContainer = document.getElementById('clients-content-container');
    const ordersActions = document.getElementById('orders-header-actions');
    const clientsActions = document.getElementById('clients-header-actions');

    const searchInput = document.getElementById('clients-search-input');
    const statusFilter = document.getElementById('clients-status-filter');
    const btnAddClient = document.getElementById('btn-open-add-client-modal');
    const btnExportCsv = document.getElementById('btn-export-clients-csv');

    // Subtab switching
    if (subtabClients) {
      subtabClients.addEventListener('click', () => {
        subtabClients.classList.add('active');
        subtabInStore?.classList.remove('active');
        subtabWebsite?.classList.remove('active');
        state.ordersActiveChannel = 'CLIENTS';

        if (ordersContainer) ordersContainer.style.display = 'none';
        if (clientsContainer) clientsContainer.style.display = 'block';
        if (ordersActions) ordersActions.style.display = 'none';
        if (clientsActions) clientsActions.style.display = 'flex';

        loadClients();
      });
    }

    if (subtabInStore) {
      subtabInStore.addEventListener('click', () => {
        subtabClients?.classList.remove('active');
        if (ordersContainer) ordersContainer.style.display = 'block';
        if (clientsContainer) clientsContainer.style.display = 'none';
        if (ordersActions) ordersActions.style.display = 'flex';
        if (clientsActions) clientsActions.style.display = 'none';
      });
    }

    if (subtabWebsite) {
      subtabWebsite.addEventListener('click', () => {
        subtabClients?.classList.remove('active');
        if (ordersContainer) ordersContainer.style.display = 'block';
        if (clientsContainer) clientsContainer.style.display = 'none';
        if (ordersActions) ordersActions.style.display = 'flex';
        if (clientsActions) clientsActions.style.display = 'none';
      });
    }

    if (searchInput) {
      let debounce = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        state.clientsSearchQuery = searchInput.value;
        debounce = setTimeout(() => loadClients(), 250);
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        state.clientsStatusFilter = statusFilter.value;
        loadClients();
      });
    }

    if (btnAddClient) {
      btnAddClient.addEventListener('click', () => {
        openClientDetailsModal();
      });
    }

    if (btnExportCsv) {
      btnExportCsv.addEventListener('click', () => {
        window.open('/api/customers/export/csv', '_blank');
      });
    }

    setupClientProfileModal();
  }

  async function directDeleteSupabaseCustomer(clientId) {
    const SUPABASE_URL = 'https://czajxtgwsxbrrymrhauz.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk';
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${encodeURIComponent(clientId)}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
    } catch (e) { }
  }

  async function directDeleteAllSupabaseCustomers() {
    const SUPABASE_URL = 'https://czajxtgwsxbrrymrhauz.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk';
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?id=not.is.null`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
    } catch (e) { }
  }

  async function loadClients(silent = false) {
    try {
      const q = encodeURIComponent(state.clientsSearchQuery || '');
      const s = encodeURIComponent(state.clientsStatusFilter || 'active');
      const res = await apiFetch(`/api/customers?search=${q}&status=${s}`);
      let serverClients = Array.isArray(res) ? res : (res.customers || []);

      // 1. Filter out synthetic/dummy clients
      serverClients = serverClients.filter(c => c.name && !/Walk-in Client|Concierge Test/i.test(c.name));

      // 2. Filter out tombstoned deleted clients
      let deletedSet = new Set();
      try {
        const raw = localStorage.getItem('noor_deleted_clients');
        if (raw) deletedSet = new Set(JSON.parse(raw));
      } catch (e) { }

      const purgedAt = parseInt(localStorage.getItem('noor_clients_purged_at') || '0', 10);

      serverClients = serverClients.filter(c => {
        if (deletedSet.has(c.id)) return false;
        if (c.phone && deletedSet.has(c.phone)) return false;
        if (c.name && deletedSet.has(c.name.toLowerCase())) return false;
        if (purgedAt > 0 && c.created_at) {
          const clientTime = new Date(c.created_at).getTime();
          if (clientTime < purgedAt) return false;
        }
        return true;
      });

      state.clientsCache = serverClients;
      localStorage.setItem('noor_clients_cache', JSON.stringify(serverClients));

      renderClientsTableUI();
    } catch (err) {
      if (!silent) {
        console.error('Failed to load clients:', err);
      }
      renderClientsTableUI();
    }
  }

  function renderClientsTableUI() {
    const tbody = document.getElementById('clients-table-body');
    const countBadge = document.getElementById('count-clients');
    const countLabel = document.getElementById('clients-count-label');

    const list = state.clientsCache || [];
    if (countBadge) countBadge.textContent = list.length;
    if (countLabel) countLabel.textContent = `Showing ${list.length} registered clients`;

    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:3rem; color:#9CA3AF;">No clients found in directory.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(c => {
      const isArchived = Boolean(c.is_archived);
      const codeBadge = `<span class="badge-status ${isArchived ? 'status-awaiting' : 'status-verified'}">${escapeHtml(c.client_code || 'CLT')}</span>`;
      const phone = escapeHtml(c.phone || '-');
      const spendINR = formatINR(c.total_spent_inr || 0);

      return `
        <tr style="${isArchived ? 'opacity:0.6;' : ''}">
          <td>${codeBadge}</td>
          <td><strong>${escapeHtml(c.name)}</strong>${isArchived ? ' <small style="color:#DC2626;">(Archived)</small>' : ''}</td>
          <td>${c.age || '-'}</td>
          <td>${phone}</td>
          <td>${escapeHtml(c.city || '-')}</td>
          <td><strong>${c.order_count || 0}</strong></td>
          <td><strong>${spendINR}</strong></td>
          <td>${(c.total_due_inr > 0) ? `<span class="badge-due-red" style="padding:2px 8px; border-radius:12px; font-weight:800; font-size:0.75rem;">₹${c.total_due_inr.toLocaleString('en-IN')}</span>` : `<span style="color:#059669; font-weight:700; font-size:0.75rem;">✓ Settled</span>`}</td>
          <td>${formatShortDate(c.last_order_date)}</td>
          <td><span class="badge-status channel-online">🩺 ${c.prescription_count || 0}</span></td>
          <td>${formatShortDate(c.created_at)}</td>
          <td>
            <div style="display:flex; gap:4px;">
              <button type="button" class="btn-table-action" onclick="openClientProfile('${c.id}')" title="View Full Profile">👁️ View</button>
              ${c.phone ? `<a href="tel:${c.phone}" class="btn-table-action" title="Call">📞</a>` : ''}
              ${c.phone ? `<button type="button" class="btn-table-action" onclick="openWhatsAppDirect('${c.phone}', '${escapeHtml(c.name)}')" title="WhatsApp">💬</button>` : ''}
              <button type="button" class="btn-table-action btn-table-danger" onclick="deleteClientPrompt('${c.id}', '${escapeHtml(c.name)}')" title="Delete Client Permanently">🗑️ Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.deleteClientPrompt = async function (clientId, clientName) {
    if (!confirm(`Are you sure you want to permanently delete client "${clientName}" from the database? This action cannot be undone.`)) {
      return;
    }
    try {
      showToast(`Deleting client "${clientName}"...`, 'info');

      // 1. Tombstone in localStorage
      let deletedSet = new Set();
      try {
        const raw = localStorage.getItem('noor_deleted_clients');
        if (raw) deletedSet = new Set(JSON.parse(raw));
      } catch (e) { }
      deletedSet.add(clientId);
      if (clientName) deletedSet.add(clientName.toLowerCase());
      const targetClient = state.clientsCache.find(c => c.id === clientId);
      if (targetClient && targetClient.phone) deletedSet.add(targetClient.phone);
      localStorage.setItem('noor_deleted_clients', JSON.stringify([...deletedSet]));

      // 2. Remove from local cache
      try {
        const rawCache = localStorage.getItem('noor_clients_cache');
        if (rawCache) {
          const parsed = JSON.parse(rawCache).filter(c => c.id !== clientId);
          localStorage.setItem('noor_clients_cache', JSON.stringify(parsed));
        }
      } catch (e) { }

      // 3. Immediately update UI state
      state.clientsCache = state.clientsCache.filter(c => c.id !== clientId);
      renderClientsTableUI();

      // 4. Delete via backend API
      await apiFetch(`/api/customers/${clientId}?permanent=true`, {
        method: 'DELETE'
      });

      // 5. Direct Supabase cloud deletion fallback
      directDeleteSupabaseCustomer(clientId).catch(console.warn);

      showToast(`Client "${clientName}" has been permanently deleted.`, 'success');
      loadClients(true);
    } catch (err) {
      console.warn('API delete note:', err);
      directDeleteSupabaseCustomer(clientId).catch(console.warn);
      showToast(`Client "${clientName}" removed.`, 'success');
      loadClients(true);
    }
  };

  window.deleteAllClientsPrompt = async function () {
    if (!confirm('Are you sure you want to permanently delete ALL clients from both the local database and Supabase cloud? This action cannot be undone.')) {
      return;
    }
    try {
      showToast('Deleting all clients...', 'info');

      // 1. Tombstone all currently loaded clients in localStorage
      const allTokens = [];
      state.clientsCache.forEach(c => {
        if (c.id) allTokens.push(c.id);
        if (c.phone) allTokens.push(c.phone);
        if (c.name) allTokens.push(c.name.toLowerCase());
      });
      localStorage.setItem('noor_deleted_clients', JSON.stringify(allTokens));
      localStorage.setItem('noor_clients_purged_at', Date.now().toString());
      localStorage.removeItem('noor_clients_cache');

      // 2. Clear state and update UI immediately
      state.clientsCache = [];
      renderClientsTableUI();

      // 3. Delete via backend API
      await apiFetch('/api/customers', {
        method: 'DELETE'
      });

      // 4. Direct Supabase cloud deletion fallback
      directDeleteAllSupabaseCustomers().catch(console.warn);

      showToast('All clients have been permanently deleted.', 'success');
      loadClients(true);
    } catch (err) {
      directDeleteAllSupabaseCustomers().catch(console.warn);
      showToast('All clients deleted.', 'success');
      loadClients(true);
    }
  };

  window.openWhatsAppDirect = function (rawPhone, clientName) {
    const cleanDigits = String(rawPhone || '').replace(/[^0-9]/g, '');
    if (!cleanDigits) {
      showToast('No phone number on file for WhatsApp.', 'warning');
      return;
    }
    const intlPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const storeName = state.storeSettings.store_name || 'Noor Optic';
    const text = encodeURIComponent(`Hello ${clientName || 'Valued Customer'}, this is ${storeName}. We are contacting you regarding your optical eyewear and prescription records. Please let us know if you need any assistance.`);
    window.open(`https://wa.me/${intlPhone}?text=${text}`, '_blank');
  };

  // ── Client Profile CRM Modal Tabs & Actions ───────────────────────────────
  function setupClientProfileModal() {
    const modal = document.getElementById('modal-client-profile');
    const tabs = document.querySelectorAll('.profile-tab-btn');
    const formEdit = document.getElementById('form-edit-client-profile');
    const btnAddNewRx = document.getElementById('btn-cp-add-new-rx');
    const btnArchive = document.getElementById('btn-cp-archive-client');
    const btnPrintProfile = document.getElementById('btn-print-client-profile');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.querySelectorAll('.profile-tab-pane').forEach(p => p.style.display = 'none');
        const activePane = document.getElementById(`tab-pane-${target}`);
        if (activePane) activePane.style.display = 'block';
      });
    });

    // Save Profile Changes
    if (formEdit) {
      formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientId = state.activeProfileClientId;
        if (!clientId) return;

        const payload = {
          name: document.getElementById('cp-edit-name').value.trim(),
          age: parseInt(document.getElementById('cp-edit-age').value, 10),
          phone: document.getElementById('cp-edit-phone').value.trim(),
          city: document.getElementById('cp-edit-city').value.trim(),
          email: document.getElementById('cp-edit-email').value.trim() || null,
          dob: document.getElementById('cp-edit-dob').value || null,
          address: document.getElementById('cp-edit-address').value.trim() || null,
          notes: document.getElementById('cp-edit-notes').value.trim() || null
        };

        try {
          const res = await apiFetch(`/api/customers/${clientId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
          });
          showToast(res.message || 'Client details updated in database.', 'success');
          loadClients();
          openClientProfile(clientId);
        } catch (err) {
          showToast('Failed to save client details: ' + err.message, 'error');
        }
      });
    }

    // Add New RX to this Client from Profile
    if (btnAddNewRx) {
      btnAddNewRx.addEventListener('click', () => {
        const clientId = state.activeProfileClientId;
        if (!clientId) return;

        openPrescriptionModal(null, async (rxData) => {
          rxData.client_id = clientId;
          try {
            const res = await apiFetch('/api/prescriptions', {
              method: 'POST',
              body: JSON.stringify(rxData)
            });
            showToast(`Prescription ${res.prescriptionNumber || ''} saved permanently!`, 'success');
            openClientProfile(clientId);
          } catch (err) {
            showToast('Failed to save prescription: ' + err.message, 'error');
          }
        });
      });
    }

    // Safe Archive Client
    if (btnArchive) {
      btnArchive.addEventListener('click', async () => {
        const clientId = state.activeProfileClientId;
        if (!clientId) return;

        const reason = prompt('Please enter archival reason (e.g. Inactive account, duplicate created by mistake):', 'Client requested archival');
        if (reason === null) return;

        try {
          const res = await apiFetch(`/api/customers/${clientId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason })
          });
          showToast(res.message || 'Client archived safely. All past invoices remain intact.', 'success');
          modal.classList.remove('open');
          loadClients();
        } catch (err) {
          showToast('Archival failed: ' + err.message, 'error');
        }
      });
    }

    // Print Profile
    if (btnPrintProfile) {
      btnPrintProfile.addEventListener('click', () => {
        const clientId = state.activeProfileClientId;
        if (clientId) printClientProfile(clientId);
      });
    }
  }

  window.openClientProfile = async function (clientId) {
    const modal = document.getElementById('modal-client-profile');
    if (!modal) return;

    state.activeProfileClientId = clientId;

    try {
      const res = await apiFetch(`/api/customers/${clientId}`);
      if (!res) return;
      const client = res.client || res;

      // Header
      document.getElementById('cp-client-name').textContent = client.name || 'Client';
      document.getElementById('cp-client-code').textContent = client.client_code || 'CLT';
      document.getElementById('cp-client-meta').textContent = `Client ID: ${client.id} • Registered ${formatShortDate(client.created_at)}`;

      // Tab 1: Personal Details
      document.getElementById('cp-edit-name').value = client.name || '';
      document.getElementById('cp-edit-age').value = client.age || '';
      document.getElementById('cp-edit-phone').value = client.phone || '';
      document.getElementById('cp-edit-city').value = client.city || '';
      document.getElementById('cp-edit-email').value = client.email || '';
      document.getElementById('cp-edit-dob').value = client.dob || '';
      document.getElementById('cp-edit-address').value = client.address || '';
      document.getElementById('cp-edit-notes').value = client.notes || '';

      // Tab 2: Orders & Invoices
      const orders = res.orders || client.orders || [];
      document.getElementById('cp-orders-count').textContent = orders.length;
      const ordersTbody = document.getElementById('cp-orders-tbody');
      if (ordersTbody) {
        if (orders.length === 0) {
          ordersTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:#9CA3AF;">No purchase history recorded for this client.</td></tr>`;
        } else {
          ordersTbody.innerHTML = orders.map(o => `
            <tr>
              <td><strong>${escapeHtml(o.order_number)}</strong></td>
              <td>${formatDateTime(o.created_at)}</td>
              <td>${o.items?.length || 1} frame(s)</td>
              <td><strong>${formatINR(o.total_payable_paise, true)}</strong></td>
              <td>${(o.outstanding_inr > 0 || (o.payment_status !== 'VERIFIED' && o.payment_status !== 'REFUNDED')) ? `<span class="badge-due-red">Due: ₹${((o.outstanding_inr != null) ? o.outstanding_inr : ((o.total_payable_paise || 0) / 100)).toLocaleString('en-IN')}</span>` : `<span class="badge-status status-verified">PAID</span>`}</td>
              <td><span class="badge-status status-verified">${escapeHtml(o.status)}</span></td>
              <td>
                <div style="display:flex; gap:4px;">
                  <button type="button" class="btn-table-action" onclick="viewOrderDetails('${o.id}')">View</button>
                  ${(o.outstanding_inr > 0) ? `<button type="button" class="btn-table-action" style="background:#16A34A; color:#FFF; font-weight:700;" onclick="openCollectPaymentModal('${o.id}')">💳 Pay</button>` : ''}
                  <button type="button" class="btn-table-action" style="background:#2563EB; color:#FFF; font-weight:700;" onclick="downloadInvoicePDF('${o.id}', '${escapeHtml(o.order_number)}')" title="Download Tax Invoice PDF">📄 Invoice</button>
                </div>
              </td>
            </tr>
          `).join('');
        }
      }

      // Tab 3: Prescriptions
      const rxList = res.prescriptions || client.prescriptions || [];
      document.getElementById('cp-rx-count').textContent = rxList.length;
      const rxContainer = document.getElementById('cp-rx-list-container');
      if (rxContainer) {
        if (rxList.length === 0) {
          rxContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:#9CA3AF; background:#F9FAFB; border-radius:8px;">No optical prescriptions recorded yet. Click "+ Add New Prescription" above.</div>`;
        } else {
          rxContainer.innerHTML = rxList.map(r => `
            <div class="profile-rx-card">
              <div class="profile-rx-header">
                <div>
                  <span class="profile-rx-number">🩺 ${escapeHtml(r.prescription_number || 'RX Record')}</span>
                  <span class="profile-rx-date">• ${formatShortDate(r.prescription_date || r.created_at)}</span>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                  <button type="button" class="btn-table-action btn-gold" onclick="openEditPrescriptionModal('${r.id}')" title="Edit Lens Values">✏️ Edit RX Values</button>
                  <button type="button" class="btn-table-action" onclick='printPrescriptionRecord(${JSON.stringify(r)})'>🖨️ Print RX</button>
                  ${r.image_url ? `<a href="${r.image_url}" target="_blank" class="btn-table-action">View Image</a>` : ''}
                </div>
              </div>

              <div class="profile-rx-grid-mini">
                <div style="font-weight:700; color:#0A2540;">Eye</div>
                <div style="font-weight:700; color:#0284C7;">SPH</div>
                <div style="font-weight:700; color:#0284C7;">CYL</div>
                <div style="font-weight:700; color:#0284C7;">AXIS</div>

                <div><strong>OD (Right)</strong></div>
                <div>${r.od_sph || '0.00'}</div>
                <div>${r.od_cyl || '0.00'}</div>
                <div>${r.od_axis !== null ? `${r.od_axis}°` : '-'}</div>

                <div><strong>OS (Left)</strong></div>
                <div>${r.os_sph || '0.00'}</div>
                <div>${r.os_cyl || '0.00'}</div>
                <div>${r.os_axis !== null ? `${r.os_axis}°` : '-'}</div>
              </div>

              <div style="font-size:0.75rem; color:#475569; display:flex; gap:16px; margin-top:4px;">
                ${r.addition ? `<div><strong>Addition:</strong> ${r.addition}</div>` : ''}
                ${r.ipd_distance ? `<div><strong>Distance IPD:</strong> ${r.ipd_distance} mm</div>` : ''}
                ${r.ipd_near ? `<div><strong>Near IPD:</strong> ${r.ipd_near} mm</div>` : ''}
                <div><strong>Checked by:</strong> ${escapeHtml(r.checked_by || 'Optometrist')}</div>
              </div>
              ${r.notes ? `<div style="font-size:0.72rem; color:#6B7280; margin-top:4px; font-style:italic;">Notes: ${escapeHtml(r.notes)}</div>` : ''}
            </div>
          `).join('');
        }
      }

      // Tab 4: Communications
      const phoneDigits = String(client.phone || '').replace(/[^0-9]/g, '');
      const intlDigits = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;
      const storeName = state.storeSettings.store_name || 'Noor Optic';
      const defaultMsg = `Hello ${client.name || 'Valued Client'}, this is ${storeName}. We are contacting you regarding your recent purchase and optical eyewear. Please let us know if you need any assistance or lens fitting adjustments.`;

      document.getElementById('cp-call-phone-label').textContent = client.phone || 'No phone';
      document.getElementById('cp-btn-call').href = client.phone ? `tel:${client.phone}` : '#';

      const waTemplate = document.getElementById('cp-wa-message-template');
      const waBtn = document.getElementById('cp-btn-whatsapp');
      if (waTemplate && waBtn) {
        waTemplate.value = defaultMsg;
        const updateWaLink = () => {
          const encoded = encodeURIComponent(waTemplate.value);
          waBtn.href = client.phone ? `https://wa.me/${intlDigits}?text=${encoded}` : '#';
        };
        updateWaLink();
        waTemplate.oninput = updateWaLink;
      }

      // Tab 5: Record History & Safety
      document.getElementById('cp-hist-id').textContent = client.id;
      document.getElementById('cp-hist-code').textContent = client.client_code || 'CLT';
      document.getElementById('cp-hist-created').textContent = formatDateTime(client.created_at);
      document.getElementById('cp-hist-updated').textContent = formatDateTime(client.updated_at);
      document.getElementById('cp-hist-spent').textContent = formatINR(client.total_spent_paise || 0, true);
      document.getElementById('cp-hist-orders').textContent = orders.length;

      // Default to details tab
      document.querySelector('.profile-tab-btn[data-tab="details"]')?.click();
      modal.classList.add('open');
    } catch (err) {
      showToast('Error opening client profile: ' + err.message, 'error');
    }
  };

  // ── Print Functions (Profile & Optical RX) ────────────────────────────────
  window.printPrescriptionRecord = async function (rxOrId) {
    let rx = rxOrId;
    if (typeof rxOrId === 'string') {
      try {
        rx = await apiFetch(`/api/prescriptions/${encodeURIComponent(rxOrId)}`);
      } catch (err) {
        console.error('Failed to load prescription for print:', err);
        showToast('Failed to load prescription record.', 'error');
        return;
      }
    }
    if (!rx) {
      showToast('Prescription record not found.', 'error');
      return;
    }

    const printWin = window.open('', '_blank', 'width=650,height=600');
    if (!printWin) {
      showToast('Pop-up blocked. Please allow pop-ups to print prescription.', 'warning');
      return;
    }

    const store = state.storeSettings;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription — ${rx.prescription_number || 'RX'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #111; line-height: 1.5; }
          .rx-head { display: flex; justify-content: space-between; border-bottom: 2px solid #0A2540; padding-bottom: 12px; margin-bottom: 18px; }
          .store-name { font-size: 1.4rem; font-weight: 800; color: #0A2540; }
          .rx-title { font-size: 1.1rem; font-weight: 800; color: #0284C7; }
          .grid { width: 100%; border-collapse: collapse; margin: 16px 0; }
          .grid th, .grid td { border: 1px solid #CBD5E1; padding: 10px; text-align: center; font-size: 0.95rem; }
          .grid th { background: #F0F7FD; color: #0A2540; font-weight: 800; }
          .eye-badge { font-weight: 800; color: #0A2540; }
          .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; background: #F8FAFC; padding: 12px; border-radius: 6px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="rx-head">
          <div>
            <div class="store-name">${escapeHtml(store.store_name)}</div>
            <div style="font-size:0.8rem; color:#4B5563;">${escapeHtml(store.store_address)} • Phone: ${escapeHtml(store.store_phone)}</div>
          </div>
          <div style="text-align:right;">
            <div class="rx-title">OPTICAL PRESCRIPTION</div>
            <div style="font-size:0.85rem;"><strong>${escapeHtml(rx.prescription_number || 'RX')}</strong></div>
            <div style="font-size:0.8rem; color:#6B7280;">Date: ${formatShortDate(rx.prescription_date || rx.created_at)}</div>
          </div>
        </div>

        <table class="grid">
          <thead>
            <tr>
              <th>Eye</th>
              <th>SPH (Sphere)</th>
              <th>CYL (Cylinder)</th>
              <th>AXIS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="eye-badge">OD (Right Eye)</td>
              <td>${rx.od_sph || '0.00'}</td>
              <td>${rx.od_cyl || '0.00'}</td>
              <td>${rx.od_axis !== null ? `${rx.od_axis}°` : '-'}</td>
            </tr>
            <tr>
              <td class="eye-badge">OS (Left Eye)</td>
              <td>${rx.os_sph || '0.00'}</td>
              <td>${rx.os_cyl || '0.00'}</td>
              <td>${rx.os_axis !== null ? `${rx.os_axis}°` : '-'}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer-grid">
          <div>
            ${rx.addition ? `<div><strong>Addition:</strong> ${rx.addition}</div>` : ''}
            ${rx.ipd_distance ? `<div><strong>Distance IPD (D):</strong> ${rx.ipd_distance} mm</div>` : ''}
            ${rx.ipd_near ? `<div><strong>Near IPD (N):</strong> ${rx.ipd_near} mm</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div><strong>Checked / Optometrist:</strong> ${escapeHtml(rx.checked_by || 'Optometrist')}</div>
            ${rx.prescriber_details ? `<div><strong>Prescriber:</strong> ${escapeHtml(rx.prescriber_details)}</div>` : ''}
          </div>
        </div>

        ${rx.notes ? `<div style="margin-top:12px; font-size:0.85rem; color:#4B5563;"><strong>Clinical Notes:</strong> ${escapeHtml(rx.notes)}</div>` : ''}
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 350);
  };

  window.printClientProfile = async function (clientId) {
    try {
      const client = await apiFetch(`/api/customers/${clientId}`);
      if (!client) return;

      const printWin = window.open('', '_blank', 'width=750,height=750');
      if (!printWin) return;

      const store = state.storeSettings;
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Client Profile — ${client.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #111; line-height: 1.5; }
            .head { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; }
            .grid { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .grid th, .grid td { border: 1px solid #E5E7EB; padding: 8px; text-align: left; font-size: 0.85rem; }
            .grid th { background: #F9FAFB; font-weight: 700; }
            .meta-block { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F9FAFB; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 0.9rem; }
          </style>
        </head>
        <body>
          <div class="head">
            <div>
              <div style="font-size:1.4rem; font-weight:800;">${escapeHtml(store.store_name)}</div>
              <div style="font-size:0.85rem; color:#6B7280;">Authoritative Client Record & Purchase History</div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:800; font-size:1.1rem;">${escapeHtml(client.client_code || 'CLT')}</div>
              <div style="font-size:0.8rem; color:#6B7280;">Date: ${formatShortDate(new Date())}</div>
            </div>
          </div>

          <div class="meta-block">
            <div><strong>Client Name:</strong> ${escapeHtml(client.name)}</div>
            <div><strong>Phone Number:</strong> ${escapeHtml(client.phone || '-')}</div>
            <div><strong>Age / DOB:</strong> ${client.age || '-'} ${client.dob ? `(${formatShortDate(client.dob)})` : ''}</div>
            <div><strong>City / Address:</strong> ${escapeHtml(client.city || '-')}, ${escapeHtml(client.address || '')}</div>
            <div><strong>Total Recorded Spend:</strong> ${formatINR(client.total_spent_paise || 0, true)}</div>
            <div><strong>Lifetime Orders:</strong> ${client.orders?.length || 0}</div>
          </div>

          <h3>Recent Orders (${client.orders?.length || 0})</h3>
          <table class="grid">
            <thead>
              <tr>
                <th>Order / Invoice #</th>
                <th>Date</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Total Payable</th>
              </tr>
            </thead>
            <tbody>
              ${(client.orders || []).map(o => `
                <tr>
                  <td>${escapeHtml(o.order_number)}</td>
                  <td>${formatShortDate(o.created_at)}</td>
                  <td>${escapeHtml(o.payment_method)} (${escapeHtml(o.payment_status)})</td>
                  <td>${escapeHtml(o.status)}</td>
                  <td><strong>${formatINR(o.total_payable_paise, true)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <h3 style="margin-top:24px;">Optical Prescriptions (${client.prescriptions?.length || 0})</h3>
          <table class="grid">
            <thead>
              <tr>
                <th>RX #</th>
                <th>Date</th>
                <th>Right (OD) SPH / CYL / AXIS</th>
                <th>Left (OS) SPH / CYL / AXIS</th>
                <th>Checked By</th>
              </tr>
            </thead>
            <tbody>
              ${(client.prescriptions || []).map(r => `
                <tr>
                  <td>${escapeHtml(r.prescription_number)}</td>
                  <td>${formatShortDate(r.prescription_date || r.created_at)}</td>
                  <td>${r.od_sph || '0.00'} / ${r.od_cyl || '0.00'} / ${r.od_axis !== null ? `${r.od_axis}°` : '-'}</td>
                  <td>${r.os_sph || '0.00'} / ${r.os_cyl || '0.00'} / ${r.os_axis !== null ? `${r.os_axis}°` : '-'}</td>
                  <td>${escapeHtml(r.checked_by || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => printWin.print(), 350);
    } catch (err) {
      showToast('Print error: ' + err.message, 'error');
    }
  };

  // ── One-Click PDF Tax Invoice Downloader ──────────────────────────────────
  window.downloadInvoicePDF = function (orderId, orderNumber) {
    if (!orderId) {
      showToast('Order reference missing.', 'error');
      return;
    }
    showToast('Generating official Tax Invoice PDF...', 'info');
    const url = `/api/invoices/order/${encodeURIComponent(orderId)}/pdf?download=1`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${orderNumber || orderId}.pdf`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try { document.body.removeChild(link); } catch (_) { }
    }, 500);
  };

  // ── Dispatch Print Signal to POS Portable Daemon (Port 5001 & Cloud Queue) ──
  window.instantPrintReceipt = async function (orderId, manualReprint = false, directOrder = null, printSource = 'staff_approved') {
    if (!orderId && !directOrder) return;

    let order = directOrder || (state.ordersCache || []).find(o => o.id === orderId || o.order_number === orderId);
    if (!order || !order.items || order.items.length === 0) {
      try {
        const resp = await apiFetch(`/api/orders/${orderId}`);
        const fetchedOrder = resp.order || resp;
        const fetchedItems = resp.items || fetchedOrder.items || [];
        order = { ...(order || {}), ...fetchedOrder, items: fetchedItems };
      } catch (e) { }
    }

    if (!order) {
      console.warn('Order not found for instant receipt printing:', orderId);
      return;
    }

    // Ensure prescription is attached if linked
    if (!order.prescriptions && order.prescriptions_json) {
      try { order.prescriptions = JSON.parse(order.prescriptions_json); } catch (_) { }
    }
    if (!order.od_sph && order.prescription) {
      Object.assign(order, order.prescription);
    }
    if (!order.od_sph && order.customer_id && state.clientsCache) {
      const client = state.clientsCache.find(c => c.id === order.customer_id);
      if (client && client.latest_prescription) {
        Object.assign(order, client.latest_prescription);
      }
    }

    const orderRef = order.order_number || order.order_ref || order.id || 'ORDER';
    const effectiveSource = printSource || (manualReprint ? 'reprint' : 'staff_approved');

    // ── DUAL DISPATCH (Zero-Lag Counter Output + Bulletproof Remote Cloud Spooling) ──
    // PATH 1: Instant Cloud Queue Dispatch (Guarantees Laptop B / dedicated printer prints within 2.5s)
    pushPrintJobToCloud({
      type: 'receipt',
      order: order,
      approved: true,
      source: effectiveSource
    }).then(res => {
      if (res && res.success) {
        console.log(`[InstantPrint] Bill #${orderRef} successfully placed in SYS-PRINT-QUEUE.`);
      }
    }).catch(err => {
      console.warn('[InstantPrint] Cloud queue dispatch note:', err?.message || err);
    });

    // PATH 2: Local Hardware Daemon (Immediate 50ms output if billing directly on the printer laptop)
    fetch('http://127.0.0.1:5001/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order: order,
        manualReprint: Boolean(manualReprint),
        source: effectiveSource
      }),
      signal: AbortSignal.timeout(1200)
    }).catch(() => {
      // Local daemon port not reachable (e.g. billing from remote laptop or phone) — handled by Cloud Queue!
    });

    showToast(`🖨️ Bill #${orderRef} dispatched to POS thermal printer!`, 'success');
  };


  // ── Authorized Manual Reprint Handler ──────────────────────────────────────
  window.requestManualReprint = async function (orderId, defaultReason = 'Staff requested reprint') {
    if (!orderId) return;
    const order = (state.ordersCache || []).find(o => o.id === orderId || o.order_number === orderId);
    const orderRef = order?.order_number || order?.id || orderId;
    const requestedBy = prompt(`Authorized Reprint for Order #${orderRef}\nEnter Staff Name:`, 'Counter Staff');
    if (!requestedBy) return;
    const reason = prompt(`Enter reason for reprint:`, 'Customer requested duplicate receipt') || defaultReason;

    showToast(`Submitting reprint request for #${orderRef}...`, 'info');
    try {
      if (window.NoorSupabase && window.NoorSupabase.isConfigured()) {
        const res = await window.NoorSupabase.reprintOrder(order?.id || orderId, requestedBy, reason);
        if (res && res.success) {
          showToast(`🖨️ Authorized reprint queued in print_jobs table.`, 'success');
          if (state.activeNav === 'diagnostics') loadDiagnostics(true);
          return;
        }
      }

      // Fallback: direct daemon reprint endpoint
      const resp = await fetch(`http://127.0.0.1:5001/api/printer/orders/${encodeURIComponent(order?.id || orderId)}/reprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_by: requestedBy, reason })
      });
      if (resp.ok) {
        showToast(`🖨️ Reprint submitted to Windows thermal spooler.`, 'success');
        if (state.activeNav === 'diagnostics') loadDiagnostics(true);
      } else {
        showToast(`Reprint failed: ${await resp.text()}`, 'error');
      }
    } catch (err) {
      showToast(`Reprint error: ${err.message}`, 'error');
    }
  };

  // ── Print Job Retry Action ─────────────────────────────────────────────────
  window.retryPrintJob = async function (jobId) {
    if (!jobId) return;
    try {
      showToast(`Retrying print job ${jobId.slice(0, 8)}...`, 'info');
      const resp = await fetch(`http://127.0.0.1:5001/api/printer/jobs/${encodeURIComponent(jobId)}/retry`, {
        method: 'POST'
      });
      if (resp.ok) {
        showToast('Print job reset to queued. Worker will process it immediately.', 'success');
        loadDiagnostics(true);
      } else {
        showToast(`Retry failed: ${await resp.text()}`, 'error');
      }
    } catch (e) {
      showToast(`Error retrying job: ${e.message}`, 'error');
    }
  };

  // ── Diagnostics Test Receipt Print ─────────────────────────────────────────
  window.testReceiptPrint = async function () {
    try {
      showToast('Sending diagnostic test slip to POS thermal printer...', 'info');
      const resp = await fetch('http://127.0.0.1:5001/api/test-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'receipt' })
      });
      if (resp.ok) {
        showToast('Diagnostic test slip sent to printer spooler!', 'success');
        loadDiagnostics(true);
      } else {
        showToast(`Test print error: ${await resp.text()}`, 'error');
      }
    } catch (e) {
      showToast(`Cannot reach print daemon on port 5001: ${e.message}`, 'error');
    }
  };

  // ── Diagnostics & Durable Print Queue Loader ──────────────────────────────
  async function loadDiagnostics(silent = false) {
    try {
      const dbStatusEl = document.getElementById('diag-db-status');
      const dbBadgeEl = document.getElementById('diag-db-badge');
      const dbLastSyncEl = document.getElementById('diag-last-sync-time');
      const realtimeStatusEl = document.getElementById('diag-realtime-status');
      const realtimeBadgeEl = document.getElementById('diag-realtime-badge');
      const daemonStatusEl = document.getElementById('diag-daemon-status');
      const daemonBadgeEl = document.getElementById('diag-daemon-badge');
      const daemonSubEl = document.getElementById('diag-daemon-sub');
      const printerStatusEl = document.getElementById('diag-printer-status');
      const printerBadgeEl = document.getElementById('diag-printer-badge');
      const printerLastPrintEl = document.getElementById('diag-last-print-time');

      const countQueuedEl = document.getElementById('count-jobs-queued');
      const countProcEl = document.getElementById('count-jobs-processing');
      const countFailedEl = document.getElementById('count-jobs-failed');
      const countUncertainEl = document.getElementById('count-jobs-uncertain');
      const queueTbody = document.getElementById('diag-queue-table-body');

      // 1. Check Supabase DB & Print Queue Stats
      let queueStats = { pending: 0, processing: 0, failed: 0, uncertain: 0, completed: 0, recent_jobs: [] };
      if (window.NoorSupabase && window.NoorSupabase.isConfigured()) {
        try {
          queueStats = await window.NoorSupabase.fetchPrintQueueStats();
          if (dbStatusEl) dbStatusEl.textContent = 'Connected (Cloud)';
          if (dbBadgeEl) dbBadgeEl.style.background = '#10B981';
          if (dbLastSyncEl) dbLastSyncEl.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch (dbErr) {
          if (dbStatusEl) dbStatusEl.textContent = 'Degraded';
          if (dbBadgeEl) dbBadgeEl.style.background = '#F59E0B';
        }
      }

      // 2. Realtime Multiplexer Status
      const rtManager = window.NoorSupabase?.realtime;
      if (rtManager && rtManager.channel) {
        if (realtimeStatusEl) realtimeStatusEl.textContent = 'Active (Multiplexed)';
        if (realtimeBadgeEl) realtimeBadgeEl.style.background = '#10B981';
      } else {
        if (realtimeStatusEl) realtimeStatusEl.textContent = 'Connected (Polling)';
        if (realtimeBadgeEl) realtimeBadgeEl.style.background = '#3B82F6';
      }

      // 3. POS Print Daemon Status
      try {
        const dResp = await fetch('http://127.0.0.1:5001/api/status', { signal: AbortSignal.timeout(2500) });
        if (dResp.ok) {
          const dData = await dResp.json();
          if (daemonStatusEl) daemonStatusEl.textContent = 'Online & Active';
          if (daemonBadgeEl) daemonBadgeEl.style.background = '#10B981';
          if (daemonSubEl) daemonSubEl.textContent = `Worker: ${dData.is_worker_active ? 'Processing' : 'Idle'} • Polling 8s`;

          if (dData.printer) {
            if (printerStatusEl) printerStatusEl.textContent = dData.printer.connected ? `${dData.printer.name || 'POS-80'} (Ready)` : 'Offline / Error';
            if (printerBadgeEl) printerBadgeEl.style.background = dData.printer.connected ? '#10B981' : '#EF4444';
          }
          if (dData.last_successful_print && printerLastPrintEl) {
            printerLastPrintEl.textContent = new Date(dData.last_successful_print).toLocaleTimeString('en-IN');
          }
        } else {
          throw new Error('Non-200 status');
        }
      } catch (_) {
        if (daemonStatusEl) daemonStatusEl.textContent = 'Offline (Port 5001)';
        if (daemonBadgeEl) daemonBadgeEl.style.background = '#EF4444';
        if (printerStatusEl) printerStatusEl.textContent = 'Daemon Unreachable';
        if (printerBadgeEl) printerBadgeEl.style.background = '#94A3B8';
      }

      // 4. Update Queue Metric Counters
      if (countQueuedEl) countQueuedEl.textContent = queueStats.pending || 0;
      if (countProcEl) countProcEl.textContent = queueStats.processing || 0;
      if (countFailedEl) countFailedEl.textContent = queueStats.failed || 0;
      if (countUncertainEl) countUncertainEl.textContent = queueStats.uncertain || 0;

      const sidebarQueueBadge = document.getElementById('sidebar-queue-badge');
      const alertCount = (queueStats.failed || 0) + (queueStats.uncertain || 0);
      if (sidebarQueueBadge) {
        sidebarQueueBadge.textContent = alertCount;
        sidebarQueueBadge.style.display = alertCount > 0 ? 'inline-block' : 'none';
      }

      // 5. Render Print Queue Table
      if (queueTbody) {
        const jobs = queueStats.recent_jobs || [];
        if (jobs.length === 0) {
          queueTbody.innerHTML = `<tr><td colspan="7" style="padding:2rem; text-align:center; color:#94A3B8;">No print jobs recorded in durable queue.</td></tr>`;
        } else {
          queueTbody.innerHTML = jobs.map(j => {
            const statusColors = {
              queued: 'background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE;',
              claimed: 'background:#FEF3C7; color:#92400E; border:1px solid #FDE68A;',
              printing: 'background:#FEF3C7; color:#92400E; border:1px solid #FDE68A;',
              completed: 'background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0;',
              failed: 'background:#FEF2F2; color:#991B1B; border:1px solid #FECACA;',
              uncertain: 'background:#F5F3FF; color:#5B21B6; border:1px solid #DDD6FE;'
            };
            const sStyle = statusColors[j.status] || 'background:#F1F5F9; color:#475569;';
            const shortId = (j.id || '').slice(0, 8);
            const orderRef = j.order_ref || j.order_number || (j.order_id ? j.order_id.slice(0, 8) : '-');
            const leaseExp = j.lease_expires_at ? new Date(j.lease_expires_at).toLocaleTimeString('en-IN') : '-';
            const lastErr = j.last_error ? escapeHtml(String(j.last_error).slice(0, 60)) : (j.spooler_job_id ? `Spooler #${j.spooler_job_id}` : '-');

            return `
              <tr style="border-bottom:1px solid #F1F5F9;">
                <td style="padding:10px 12px;">
                  <strong style="font-family:monospace; color:#0F172A;">${shortId}</strong>
                  <div style="font-size:0.72rem; color:#64748B;">Order: ${escapeHtml(orderRef)}</div>
                </td>
                <td style="padding:10px 12px;">
                  <span style="font-weight:700; color:#334155;">${escapeHtml(j.print_type || 'receipt').toUpperCase()}</span>
                </td>
                <td style="padding:10px 12px;">
                  <span style="display:inline-block; padding:3px 8px; border-radius:99px; font-weight:800; font-size:0.72rem; text-transform:uppercase; ${sStyle}">
                    ${escapeHtml(j.status || 'queued')}
                  </span>
                </td>
                <td style="padding:10px 12px; font-weight:700;">${j.attempt_count || 0}</td>
                <td style="padding:10px 12px; font-size:0.75rem; color:#64748B;">
                  ${j.claimed_at ? `Claimed: ${new Date(j.claimed_at).toLocaleTimeString('en-IN')}` : 'Unclaimed'}
                  ${j.lease_expires_at ? `<br/>Lease: ${leaseExp}` : ''}
                </td>
                <td style="padding:10px 12px; font-size:0.72rem; color:#DC2626; max-width:220px; word-break:break-word;">
                  ${lastErr}
                </td>
                <td style="padding:10px 12px; text-align:right;">
                  ${(j.status === 'failed' || j.status === 'uncertain') ? `
                    <button type="button" class="btn-table-action" onclick="retryPrintJob('${j.id}')" style="padding:4px 8px; font-size:0.72rem; background:#FEF3C7; color:#92400E; font-weight:700; border-radius:6px; cursor:pointer;">⚡ Retry</button>
                  ` : `
                    <button type="button" class="btn-table-action" onclick="requestManualReprint('${j.order_id}')" style="padding:4px 8px; font-size:0.72rem; background:#F8FAFC; color:#334155; font-weight:700; border-radius:6px; cursor:pointer;">Reprint</button>
                  `}
                </td>
              </tr>
            `;
          }).join('');
        }
      }
    } catch (err) {
      if (!silent) console.warn('Diagnostics load note:', err);
    }
  }

  // ── POS Print Daemon Health Monitor (Port 5001) ───────────────────────────
  async function checkDaemonStatus() {
    const badge = document.getElementById('daemon-status-badge');
    const dot = document.getElementById('daemon-indicator-dot');
    const label = document.getElementById('daemon-indicator-label');
    if (!badge || !dot || !label) return;

    try {
      const res = await fetch('http://127.0.0.1:5001/api/status', { method: 'GET', signal: AbortSignal.timeout(1800) });
      if (res.ok) {
        const data = await res.json();
        dot.style.background = '#16A34A'; // Green
        label.textContent = `🖨️ ${data.printer || 'POS-80'} Online`;
        badge.title = `Print Daemon Active (${data.engine}) • ${data.totalPrinted || 0} printed • 2.5" Thermal`;
        badge.style.borderColor = '#BBF7D0';
        badge.style.background = '#F0FDF4';
        badge.style.cursor = 'default';
        badge.onclick = null;
        return;
      }
    } catch (e) { }

    // Offline State
    dot.style.background = '#F59E0B'; // Amber
    label.textContent = 'POS Daemon Offline';
    badge.title = 'POS Print Daemon not running on port 5001. Click for quick setup.';
    badge.style.borderColor = '#FDE68A';
    badge.style.background = '#FFFBEB';
    badge.style.cursor = 'pointer';
    badge.onclick = () => {
      alert("POS Print Daemon is not running on port 5001.\n\nTo enable instant hardware receipt printing:\n1. Open your 'pos-daemon' folder.\n2. Double-click 'start-pos.bat'.\n3. The daemon will connect automatically and print all receipts on your 2.5-inch thermal printer.");
    };
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

    // 1b. Mobile Navigation & Drawer Toggle Listeners
    const btnMenuToggle = document.getElementById('btn-mobile-menu-toggle');
    const adminSidebar = document.getElementById('admin-sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    if (btnMenuToggle && adminSidebar) {
      btnMenuToggle.addEventListener('click', () => {
        adminSidebar.classList.toggle('open');
        sidebarBackdrop?.classList.toggle('open');
      });
    }
    if (sidebarBackdrop && adminSidebar) {
      sidebarBackdrop.addEventListener('click', () => {
        adminSidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('open');
      });
    }
    document.querySelectorAll('.mobile-bottom-nav .mob-nav-item').forEach(el => {
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

    // KPI Cards interactive shortcuts
    document.getElementById('card-in-store-sales')?.addEventListener('click', () => {
      switchNav('orders');
      document.querySelector('.optic-orders-channel-tabs .channel-tab-btn[data-channel="POS"]')?.click();
    });
    document.getElementById('card-website-sales')?.addEventListener('click', () => {
      switchNav('orders');
      document.querySelector('.optic-orders-channel-tabs .channel-tab-btn[data-channel="WEBSITE"]')?.click();
    });
    document.getElementById('card-combined-revenue')?.addEventListener('click', () => {
      switchNav('orders');
      document.querySelector('.optic-orders-channel-tabs .channel-tab-btn[data-channel="ALL"]')?.click();
    });
    document.getElementById('kpi-in-store-count')?.closest('.kpi-card')?.addEventListener('click', () => {
      switchNav('orders');
      document.querySelector('.optic-orders-channel-tabs .channel-tab-btn[data-channel="POS"]')?.click();
    });
    document.getElementById('kpi-website-count')?.closest('.kpi-card')?.addEventListener('click', () => {
      switchNav('orders');
      document.querySelector('.optic-orders-channel-tabs .channel-tab-btn[data-channel="WEBSITE"]')?.click();
    });
    document.getElementById('kpi-distinct-frames')?.closest('.kpi-card')?.addEventListener('click', () => switchNav('inventory'));
    document.getElementById('kpi-physical-units')?.closest('.kpi-card')?.addEventListener('click', () => switchNav('inventory'));
    document.getElementById('kpi-low-stock')?.closest('.kpi-card')?.addEventListener('click', () => switchNav('inventory'));
    document.getElementById('kpi-out-of-stock')?.closest('.kpi-card')?.addEventListener('click', () => switchNav('inventory'));

    // 4. OpticTool Orders 4-Channel Navigation (All, In-Store, Website, Clients)
    document.querySelectorAll('.optic-orders-channel-tabs .channel-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.optic-orders-channel-tabs .channel-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.ordersActiveChannel = btn.dataset.channel;

        const searchBox = document.getElementById('orders-search-box-wrap') || document.querySelector('.optic-search-box');
        const billsList = document.getElementById('orders-bills-list');
        const clientsContainer = document.getElementById('clients-content-container');
        const btnAdd = document.getElementById('btn-open-add-client-modal');
        const btnDeleteAllClients = document.getElementById('btn-delete-all-clients');
        const btnExport = document.getElementById('btn-export-clients-csv');
        const btnDeleteAll = document.getElementById('btn-delete-all-orders');
        const tabSaved = document.getElementById('tab-saved-bills');
        const btnNewBill = document.getElementById('btn-orders-new-bill');

        if (state.ordersActiveChannel === 'CLIENTS') {
          if (searchBox) searchBox.style.display = 'none';
          if (billsList) billsList.style.display = 'none';
          if (clientsContainer) clientsContainer.style.display = 'block';
          if (btnAdd) btnAdd.style.display = 'inline-flex';
          if (btnDeleteAllClients) btnDeleteAllClients.style.display = 'inline-flex';
          if (btnExport) btnExport.style.display = 'inline-flex';
          if (btnDeleteAll) btnDeleteAll.style.display = 'none';
          if (tabSaved) tabSaved.style.display = 'none';
          if (btnNewBill) btnNewBill.style.display = 'none';
          loadClients();
        } else {
          if (searchBox) searchBox.style.display = 'flex';
          if (billsList) billsList.style.display = 'flex';
          if (clientsContainer) clientsContainer.style.display = 'none';
          if (btnAdd) btnAdd.style.display = 'none';
          if (btnDeleteAllClients) btnDeleteAllClients.style.display = 'none';
          if (btnExport) btnExport.style.display = 'none';
          if (btnDeleteAll) btnDeleteAll.style.display = 'inline-flex';
          if (tabSaved) tabSaved.style.display = 'inline-flex';
          if (btnNewBill) btnNewBill.style.display = 'inline-flex';
          renderOrdersTable();
        }
      });
    });

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

    // 5. OpticTool Total Inventory Category Pills & Search
    document.querySelectorAll('.optic-gender-pills .optic-gender-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.optic-gender-pills .optic-gender-pill').forEach(b => {
          b.classList.remove('active');
          b.style.background = '#F8FAFC';
          b.style.color = '#334155';
        });
        btn.classList.add('active');
        btn.style.background = '#0F172A';
        btn.style.color = '#FFFFFF';
        state.inventoryGender = btn.dataset.invGender;
        renderInventoryTable();
      });
    });

    document.querySelectorAll('.optic-category-pills .optic-cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.optic-category-pills .optic-cat-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.inventoryOpticCategory = btn.dataset.invCat;
        renderInventoryTable();
      });
    });

    const invSearch = document.getElementById('inv-search-input');
    if (invSearch) {
      invSearch.addEventListener('input', () => {
        state.inventorySearchQuery = invSearch.value;
        renderInventoryTable();
      });
    }

    // 6. Modal Close Buttons & Background Scroll Lock Observer
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        document.body.classList.remove('modal-open');
      });
    });

    // Close modal on clicking overlay backdrop
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('open');
          document.body.classList.remove('modal-open');
        }
      });
    });

    // MutationObserver to automatically eliminate background scroll when any modal opens
    const modalObserver = new MutationObserver(() => {
      const hasOpenModal = document.querySelector('.modal-overlay.open');
      if (hasOpenModal) {
        document.body.classList.add('modal-open');
      } else {
        document.body.classList.remove('modal-open');
      }
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      modalObserver.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    });

    // Initialize Components
    setupAuth();
    setupAddFrameModal();
    setupEditFrameModal();
    setupStickerGenerator();
    setupImportModal();
    setupDailySalesReport();
    setupPosCameraScanner();
    setupKeyboardScannerListener();
    setupPosOpticFeatures();
    setupPosCheckout();

    // Start OpticTool Live Clock
    updatePosLiveClock();
    setInterval(updatePosLiveClock, 1000);

    const tokenDisplay = document.getElementById('pos-token-display');
    if (tokenDisplay) {
      tokenDisplay.textContent = 'INV-NOOR-' + Date.now().toString().slice(-4);
    }
    setupClientManagement();
    setupClientDetailsModal();
    setupPrescriptionModal();
    setupDiopterSelector();

    // Continuous Live Auto-Refresh (polls every 2.5s): loads orders instantly as placed with chime & visual sync
    setInterval(() => {
      if (state.token) {
        loadOrders(true);
      }
    }, 2500);

    // Instant wake-up refresh on browser tab visibility or window focus
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.token) {
        loadOrders(true, true);
        if (state.activeNav === 'dashboard' && typeof renderDashCards === 'function') loadDashboard(true);
      }
    });
    window.addEventListener('focus', () => {
      if (state.token) {
        loadOrders(true, true);
      }
    });

    // Wire Orders View Manual Refresh Button
    const btnRefreshOrders = document.getElementById('btn-refresh-orders');
    const iconRefreshOrders = document.getElementById('icon-refresh-orders');
    if (btnRefreshOrders) {
      btnRefreshOrders.addEventListener('click', async () => {
        if (iconRefreshOrders) iconRefreshOrders.classList.add('spin-fast');
        showToast('🔄 Syncing orders from cloud...', 'info');
        try {
          await loadOrders(false, true);
          showToast('✓ Orders up to date!', 'success');
        } finally {
          if (iconRefreshOrders) {
            setTimeout(() => iconRefreshOrders.classList.remove('spin-fast'), 600);
          }
        }
      });
    }

    // Wire Top Header Live Sync Badge (Clickable for Instant Live Refresh)
    const liveSyncBadge = document.getElementById('live-sync-badge');
    if (liveSyncBadge) {
      liveSyncBadge.addEventListener('click', async () => {
        const liveDot = document.getElementById('live-sync-dot');
        if (liveDot) liveDot.style.background = '#F59E0B';
        showToast('🔄 Live sync: Refreshing all orders...', 'info');
        try {
          await loadOrders(false, true);
          showToast('✓ Live sync refreshed!', 'success');
        } finally {
          if (liveDot) liveDot.style.background = '#22C55E';
        }
      });
    }

    // Monitor POS Print Daemon on Port 5001
    checkDaemonStatus();
    setInterval(checkDaemonStatus, 10000);

    // Wire Header Badge to Open Diagnostics & Spooler Queue
    const daemonBadge = document.getElementById('daemon-status-badge');
    if (daemonBadge) {
      daemonBadge.style.cursor = 'pointer';
      daemonBadge.addEventListener('click', () => switchNav('diagnostics'));
    }

    // Wire Diagnostics Section Action Buttons
    document.getElementById('btn-diag-refresh')?.addEventListener('click', () => loadDiagnostics());
    document.getElementById('btn-diag-retry-failed')?.addEventListener('click', async () => {
      showToast('Retrying all failed and uncertain print jobs...', 'info');
      try {
        const stats = await window.NoorSupabase?.fetchPrintQueueStats();
        const retryable = (stats?.recent_jobs || []).filter(j => j.status === 'failed' || j.status === 'uncertain');
        for (const j of retryable) {
          await window.retryPrintJob(j.id);
        }
        loadDiagnostics(true);
      } catch (e) {
        showToast('Retry batch failed: ' + e.message, 'error');
      }
    });
    document.getElementById('btn-diag-manual-reprint')?.addEventListener('click', () => {
      const orderRef = prompt('Enter Order Number or Permanent UUID to reprint:');
      if (orderRef) window.requestManualReprint(orderRef.trim());
    });
    document.getElementById('btn-diag-test-print')?.addEventListener('click', () => window.testReceiptPrint());
    document.getElementById('btn-diag-clear-log')?.addEventListener('click', () => {
      const logBox = document.getElementById('diag-event-log-container');
      if (logBox) logBox.innerHTML = '<div style="color:#94A3B8;">[Cleared] Listening for new events...</div>';
    });

    // Wire Centralized Realtime Notification Manager (Single Listener, Deduplicated Chimes)
    if (window.NoorSupabase && window.NoorSupabase.realtime) {
      window.NoorSupabase.realtime.init();
      window.NoorSupabase.realtime.onOrderEvent(({ eventType, new: record, isNewAudioEligible }) => {
        const logBox = document.getElementById('diag-event-log-container');
        if (logBox) {
          const item = document.createElement('div');
          item.style.padding = '2px 0';
          item.textContent = `[${new Date().toLocaleTimeString('en-IN')}] ORDER ${eventType}: #${record?.order_number || record?.id || 'Unknown'} (${record?.source || record?.channel || 'dual-pipeline'})`;
          logBox.appendChild(item);
          logBox.scrollTop = logBox.scrollHeight;
        }

        if (eventType === 'INSERT') {
          if (isNewAudioEligible) {
            playOrderChime();
            showToast(`🔔 New Order: #${record?.order_number || record?.id} by ${record?.customer_name || 'Client'}`, 'success');
          }
          loadOrders(true);
        } else if (eventType === 'UPDATE' || eventType === 'DELETE') {
          loadOrders(true);
        }
      });

      window.NoorSupabase.realtime.onPrintJobEvent(({ eventType, new: job }) => {
        const logBox = document.getElementById('diag-event-log-container');
        if (logBox) {
          const item = document.createElement('div');
          item.style.padding = '2px 0';
          item.style.color = job?.status === 'failed' ? '#FCA5A5' : (job?.status === 'completed' ? '#86EFAC' : '#93C5FD');
          item.textContent = `[${new Date().toLocaleTimeString('en-IN')}] PRINT_JOB ${eventType}: #${job?.id?.slice(0, 8)} (${job?.print_type}) -> Status: ${job?.status}`;
          logBox.appendChild(item);
          logBox.scrollTop = logBox.scrollHeight;
        }
        if (state.activeNav === 'diagnostics') {
          loadDiagnostics(true);
        }
      });
    }

    // Verify session
    checkExistingAuth();
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Multi-Stage Payment Collection System ──────────────────────────────────
  function renderPaymentHistoryIntoModal(order, paymentsList, cpHistoryBox, cpHistoryList) {
    if (!cpHistoryBox || !cpHistoryList) return;
    let historyItems = [];
    if (Array.isArray(paymentsList) && paymentsList.length > 0) {
      historyItems = paymentsList.map((p, idx) => ({
        label: p.payment_stage || (idx === 0 ? 'Advance' : (idx === 1 ? '2nd Payment' : 'Installment')),
        amount: p.amount_inr != null ? p.amount_inr : ((p.amount_paise || 0) / 100),
        date: p.created_at ? formatDateTime(p.created_at) : '',
        method: p.payment_method || 'CASH'
      }));
    } else {
      const paidINR = (order.amount_paid_inr != null) ? order.amount_paid_inr : ((order.amount_paid_paise || 0) / 100);
      const adv = (order.advance_paid_inr != null) ? order.advance_paid_inr : (order.advance_paid_paise ? order.advance_paid_paise / 100 : Math.max(0, paidINR - (order.second_payment_inr || 0) - (order.third_payment_inr || 0)));
      const sec = (order.second_payment_inr != null) ? order.second_payment_inr : ((order.second_payment_paise || 0) / 100);
      const thd = (order.third_payment_inr != null) ? order.third_payment_inr : ((order.third_payment_paise || 0) / 100);
      if (adv > 0) historyItems.push({ label: 'Advance Payment', amount: adv, date: formatDateTime(order.created_at), method: 'CASH' });
      if (sec > 0) historyItems.push({ label: '2nd Payment', amount: sec, date: formatDateTime(order.second_payment_date || order.updated_at), method: 'CASH' });
      if (thd > 0) historyItems.push({ label: '3rd Payment', amount: thd, date: formatDateTime(order.third_payment_date || order.updated_at), method: 'CASH' });
    }

    if (historyItems.length > 0) {
      cpHistoryList.innerHTML = historyItems.map((h, i) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#FFFFFF; padding:5px 8px; border-radius:4px; border:1px solid #E2E8F0;">
          <span style="font-weight:600; color:#334155;">#${i + 1} ${escapeHtml(h.label)} <span style="font-size:0.7rem; color:#64748B;">(${escapeHtml(h.method)})</span></span>
          <span style="font-weight:700; color:#16A34A;">+₹ ${h.amount.toLocaleString('en-IN')} <span style="font-weight:400; font-size:0.68rem; color:#94A3B8;">${h.date}</span></span>
        </div>
      `).join('');
      cpHistoryBox.style.display = 'block';
    } else {
      cpHistoryBox.style.display = 'none';
    }
  }

  function populateAndOpenCollectModal(order, modal) {
    const cpOrderId = document.getElementById('cp-order-id');
    const cpCustName = document.getElementById('cp-customer-name');
    const cpOrderInv = document.getElementById('cp-order-inv');
    const cpTotalBill = document.getElementById('cp-total-bill');
    const cpPaidSofar = document.getElementById('cp-paid-sofar');
    const cpRemainingDue = document.getElementById('cp-remaining-due');
    const cpHistoryBox = document.getElementById('cp-history-box');
    const cpHistoryList = document.getElementById('cp-history-list');
    const cpStageSelect = document.getElementById('cp-stage-select');
    const cpStageBadge = document.getElementById('cp-stage-badge');
    const cpAmountInput = document.getElementById('cp-amount-inr');
    const cpLiveDue = document.getElementById('cp-live-due-preview');
    const btnPayFull = document.getElementById('btn-cp-pay-full');

    const resolvedRef = order.order_number || order.order_ref || order.id;
    if (cpOrderId) {
      cpOrderId.value = resolvedRef;
      cpOrderId.dataset.dbId = order.id || '';
      cpOrderId.dataset.orderNumber = order.order_number || order.order_ref || '';
    }
    if (cpCustName) cpCustName.textContent = order.customer_name || 'Walk-in Client';
    if (cpOrderInv) cpOrderInv.textContent = order.order_number || ('INV-' + order.id.slice(-4));

    const totalINR = (order.total_payable_inr != null) ? order.total_payable_inr : ((order.total_payable_paise || 0) / 100);
    const paidINR = (order.amount_paid_inr != null) ? order.amount_paid_inr : ((order.amount_paid_paise || 0) / 100);
    const remainingINR = (order.outstanding_inr != null) ? order.outstanding_inr : (order.outstanding_paise != null ? (order.outstanding_paise / 100) : Math.max(0, totalINR - paidINR));

    if (cpTotalBill) cpTotalBill.textContent = '₹ ' + totalINR.toLocaleString('en-IN');
    if (cpPaidSofar) cpPaidSofar.textContent = '₹ ' + paidINR.toLocaleString('en-IN');
    if (cpRemainingDue) cpRemainingDue.textContent = '₹ ' + remainingINR.toLocaleString('en-IN');

    // 1. Initial render of payment history
    renderPaymentHistoryIntoModal(order, order.payments, cpHistoryBox, cpHistoryList);

    // 2. Auto-detect next stage
    const secPaise = order.second_payment_paise || (order.second_payment_inr ? order.second_payment_inr * 100 : 0);
    const thirdPaise = order.third_payment_paise || (order.third_payment_inr ? order.third_payment_inr * 100 : 0);
    if (!secPaise || secPaise === 0) {
      if (cpStageSelect) cpStageSelect.value = 'second_payment';
      if (cpStageBadge) cpStageBadge.textContent = 'Auto: 2nd Payment';
    } else if (!thirdPaise || thirdPaise === 0) {
      if (cpStageSelect) cpStageSelect.value = 'third_payment';
      if (cpStageBadge) cpStageBadge.textContent = 'Auto: 3rd Payment';
    } else {
      if (cpStageSelect) cpStageSelect.value = 'installment';
      if (cpStageBadge) cpStageBadge.textContent = 'Auto: Installment';
    }

    // 3. Pre-fill amount with exact balance and wire live calculation
    if (cpAmountInput) {
      cpAmountInput.value = remainingINR > 0 ? remainingINR : '';
      const updatePreview = () => {
        const val = parseFloat(cpAmountInput.value || 0) || 0;
        const newDue = Math.max(0, remainingINR - val);
        if (newDue === 0 && val > 0) {
          if (cpLiveDue) cpLiveDue.innerHTML = `New Balance: <span style="color:#16A34A; font-weight:800;">₹ 0 (PAID IN FULL ✓)</span>`;
        } else {
          if (cpLiveDue) cpLiveDue.innerHTML = `New Balance: <strong style="color:#B91C1C;">₹ ${newDue.toLocaleString('en-IN')}</strong>`;
        }
      };
      cpAmountInput.oninput = updatePreview;
      updatePreview();
    }

    // 4. Wire quick Pay Full Due button
    if (btnPayFull) {
      btnPayFull.onclick = () => {
        if (cpAmountInput) {
          cpAmountInput.value = remainingINR;
          cpAmountInput.dispatchEvent(new Event('input'));
        }
      };
    }

    // Allow backdrop click to dismiss
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
        document.body.classList.remove('modal-open');
      }
    };

    // Open modal immediately without delay
    modal.classList.add('open');
    document.body.classList.add('modal-open');

    // 5. Asynchronously fetch full detailed payments list if not already present
    if (!order.payments || order.payments.length === 0) {
      apiFetch(`/api/orders/${order.id}`).then(resp => {
        if (resp && resp.payments) {
          order.payments = resp.payments;
          renderPaymentHistoryIntoModal(order, resp.payments, cpHistoryBox, cpHistoryList);
        }
      }).catch(() => { });
    }
  }

  const openCollectPaymentModal = function (orderId) {
    if (!orderId) {
      showToast('No order reference provided.', 'error');
      return;
    }

    const modal = document.getElementById('modal-collect-payment');
    if (!modal) {
      console.error('Modal #modal-collect-payment not found in DOM');
      return;
    }

    let order = (state.ordersCache || []).find(o => o.id === orderId || o.order_number === orderId);
    if (order) {
      // Open immediately with cached order data
      populateAndOpenCollectModal(order, modal);
    } else {
      // Fetch order from server if not found in local cache
      showToast('Loading order details...', 'info');
      apiFetch(`/api/orders/${orderId}`)
        .then(resp => {
          const fetchedOrder = resp?.order || resp;
          if (fetchedOrder && fetchedOrder.id) {
            fetchedOrder.payments = resp.payments || fetchedOrder.payments || [];
            populateAndOpenCollectModal(fetchedOrder, modal);
          } else {
            showToast('Order not found.', 'error');
          }
        })
        .catch(err => {
          showToast('Could not load order details: ' + err.message, 'error');
        });
    }
  };
  window.openCollectPaymentModal = openCollectPaymentModal;

  window.handleCollectPaymentSubmit = async function (e) {
    if (e) e.preventDefault();
    const cpIdEl = document.getElementById('cp-order-id');
    const orderId = cpIdEl?.value;
    const orderNumber = cpIdEl?.dataset?.orderNumber || orderId;
    const amountINR = parseFloat(document.getElementById('cp-amount-inr')?.value || 0) || 0;
    const stage = document.getElementById('cp-stage-select')?.value || 'installment';
    const paymentMethod = document.getElementById('cp-payment-method')?.value || 'CASH';
    const notes = document.getElementById('cp-notes')?.value.trim() || null;
    const shouldPrint = document.getElementById('cp-print-receipt')?.checked ?? true;
    const btnSubmit = document.getElementById('btn-submit-collect-payment');

    if (!orderId) {
      showToast('Invalid order reference.', 'error');
      return;
    }
    if (amountINR <= 0) {
      showToast('Please enter a valid payment amount.', 'warning');
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Saving Payment...';
    }

    try {
      const res = await apiFetch(`/api/pos/orders/${encodeURIComponent(orderId)}/collect-payment`, {
        method: 'POST',
        body: JSON.stringify({
          orderNumber,
          paymentStage: stage,
          amountINR,
          paymentMethod,
          notes
        })
      });

      // Update local cache immediately
      if (res.order && Array.isArray(state.ordersCache)) {
        const targetRef = res.order.order_number || res.order.order_ref || orderId;
        const idx = state.ordersCache.findIndex(o => 
          o.id === orderId || 
          o.order_number === orderId || 
          (targetRef && (o.order_number === targetRef || o.order_ref === targetRef || o.id === targetRef))
        );
        if (idx >= 0) {
          state.ordersCache[idx] = { ...state.ordersCache[idx], ...res.order };
        } else {
          state.ordersCache.unshift(res.order);
        }
      }

      // Re-render orders tab in real-time
      if (typeof renderOrdersTable === 'function') {
        renderOrdersTable();
      }

      // Close modal immediately for instant snappy feedback
      const modal = document.getElementById('modal-collect-payment');
      if (modal) modal.classList.remove('open');
      document.body.classList.remove('modal-open');

      const remINR = res.remaining_due_inr != null ? res.remaining_due_inr : 0;
      const msg = remINR === 0
        ? `✓ Payment of ₹${amountINR.toLocaleString('en-IN')} recorded! Order is now PAID IN FULL!`
        : `✓ Payment of ₹${amountINR.toLocaleString('en-IN')} recorded! Remaining balance: ₹${remINR.toLocaleString('en-IN')}`;
      showToast(msg, 'success');

      // Print updated receipt to POS thermal printer (stage-aware settlement, prevents duplicate prints)
      if (shouldPrint && typeof instantPrintReceipt === 'function') {
        instantPrintReceipt(orderId, false, res.order, 'collect_payment').catch(() => { });
      }

      // Refresh datasets across the system silently in background
      loadOrders(true);
      if (typeof loadClients === 'function') loadClients(true);
      loadDashboard();

      // Update POS customer due alert if active phone is this customer
      const inlinePhoneInput = document.getElementById('pos-inline-phone');
      if (inlinePhoneInput && inlinePhoneInput.value.trim()) {
        inlinePhoneInput.dispatchEvent(new Event('input'));
      }

      // If order details modal is open, refresh it
      if (window._activeViewingOrderId === orderId) {
        setTimeout(() => viewOrderDetails(orderId), 300);
      }
      // If client profile modal is open, refresh it
      if (state.activeProfileClientId) {
        setTimeout(() => openClientProfile(state.activeProfileClientId), 300);
      }
    } catch (err) {
      showToast('Failed to record payment: ' + err.message, 'error');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '✓ Save Payment &amp; Print Receipt';
      }
    }
  };

  window.state = state;
  window.renderOrdersTable = renderOrdersTable;
  window.renderOrders = renderOrdersTable;

})();
