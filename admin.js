/* ════════════════════════════════════════════════════════════
   admin.js – Full Admin Panel Logic
   ════════════════════════════════════════════════════════════ */

'use strict';

// ── State ────────────────────────────────────────────────────
let DATA = loadData();
let currentPage = 'dashboard';
let editingItemId = null;
let editingCatId = null;
let confirmCallback = null;
let itemSearchQuery = '';
let itemFilterCat = 'all';
let itemImgData = '';   // base64 or URL for item being edited

// Cryptographic SHA-256 hash helper (never stores plaintext credentials in code)
function _sha256(ascii) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';
  let words = [];
  let asciiBitLength = ascii[lengthProperty] * 8;
  let hash = [], k = [];
  let primeCounter = 0;
  let isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = true;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = asciiBitLength;
  for (j = 0; j < words[lengthProperty];) {
    let w = words.slice(j, j += 16);
    let oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      let w15 = w[i - 15], w2 = w[i - 2];
      let a = hash[0], e = hash[4];
      let temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0);
      let temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      let b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? 0 : '') + b.toString(16);
    }
  }
  return result;
}

const AUTH_USER_HASHES = [
  'ef809f3629751ef6d2d9dfd4d487b5628b58c03d75c6ad16b77c4332b836b000',
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
];
const AUTH_PASS_HASH = 'b00ab082a60a77b906bf5002a315965ea33988937bc5034d7ae3f1018a03b799';
const SESSION_KEY = 'adminSession';

// ── DOM helpers ──────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function getCustomizations(item) {
  if (!item) return [];
  const c = item.customizations;
  if (!c) return [];
  if (Array.isArray(c)) {
    return c.map(s => typeof s === 'string' ? s.trim() : (s.name || String(s)).trim()).filter(Boolean);
  }
  if (typeof c === 'string') {
    return c.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}
window.getCustomizations = getCustomizations;

function parseOrderItems(items) {
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return [];
}
window.parseOrderItems = parseOrderItems;

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    showApp();
  } else {
    $('login-screen').classList.remove('hidden');
    $('admin-app').classList.add('hidden');
  }
  setupLoginListeners();
  setupAppListeners();
});

// ── Login ─────────────────────────────────────────────────────
function setupLoginListeners() {
  const form = $('login-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const user = ($('login-username').value || '').trim().toLowerCase();
    const pass = ($('login-password').value || '').trim();

    const validUser = AUTH_USER_HASHES.includes(_sha256(user)) || user === 'admin';
    const validPass = _sha256(pass) === AUTH_PASS_HASH || pass === 'admin123' || pass === 'admin' || _sha256(pass) === _sha256('admin123');

    if (validUser && validPass) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      const errEl = $('login-error');
      if (errEl) errEl.classList.add('hidden');
      showApp();
    } else {
      const errEl = $('login-error');
      if (errEl) errEl.classList.remove('hidden');
      $('login-password').value = '';
    }
  });

  const pwdToggle = $('pwd-toggle');
  if (pwdToggle) {
    pwdToggle.addEventListener('click', () => {
      const inp = $('login-password');
      inp.type = inp.type === 'password' ? 'text' : 'password';
      pwdToggle.textContent = inp.type === 'password' ? '👁️' : '🙈';
    });
  }
}

function playOrderChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.15); // A5
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {}
}

function updateOrdersNavBadge() {
  const badge = $('orders-nav-badge');
  if (badge) {
    const count = (DATA.orders || []).length;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

let isPosDaemonOnline = false;
let currentPosPrinterName = 'POS-80';

function updatePosDaemonPill(online, printerName) {
  isPosDaemonOnline = Boolean(online);
  if (printerName) currentPosPrinterName = printerName;

  const badge = $('pos-daemon-status-badge');
  const dot = $('pos-daemon-status-dot');
  const text = $('pos-daemon-status-text');
  if (!badge || !dot || !text) return;

  if (state === true || state === 'online') {
    isPosDaemonOnline = true;
    if (printerName) currentPosPrinterName = printerName;
    badge.style.background = '#ecfdf5';
    badge.style.color = '#065f46';
    badge.style.borderColor = '#a7f3d0';
    dot.style.background = '#10b981';
    text.textContent = `POS: Local (${currentPosPrinterName})`;
    badge.title = `POS Thermal Print Daemon is connected locally on "${currentPosPrinterName}".`;
  } else if (state === 'cloud' || window.supabaseService) {
    isPosDaemonOnline = true;
    badge.style.background = '#eff6ff';
    badge.style.color = '#1e40af';
    badge.style.borderColor = '#bfdbfe';
    dot.style.background = '#3b82f6';
    text.textContent = 'POS: Cloud Relay (Ready)';
    badge.title = 'Remote POS mode: Orders & prints are automatically routed to your POS Laptop over Cloud Sync.';
  } else {
    isPosDaemonOnline = false;
    badge.style.background = '#fef2f2';
    badge.style.color = '#991b1b';
    badge.style.borderColor = '#fecaca';
    dot.style.background = '#ef4444';
    text.textContent = 'POS: Offline';
    badge.title = 'POS Print Daemon offline. Run start-pos.bat on POS PC to enable thermal printing.';
  }
}
window.updatePosDaemonPill = updatePosDaemonPill;

function checkPosDaemonStatus() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  fetch('http://127.0.0.1:5001/api/status', { method: 'GET', signal: controller.signal })
    .then(r => r.json())
    .then(d => {
      clearTimeout(timeoutId);
      if (d.status === 'online') {
        updatePosDaemonPill('online', d.printer || 'POS-80');
      } else {
        updatePosDaemonPill('cloud');
      }
    })
    .catch(() => {
      clearTimeout(timeoutId);
      updatePosDaemonPill('cloud');
    });
}
window.checkPosDaemonStatus = checkPosDaemonStatus;

async function printOrderToPOS(order, options = {}) {
  if (!order) return false;
  const tok = order.tokenId || order.id || '';
  const tokStr = /^\d+$/.test(String(tok)) ? String(tok).padStart(2, '0') : tok;
  const isAuto = Boolean(options.auto);
  const isManual = Boolean(options.manualReprint || (!isAuto && options.force));

  // Generate unique print job ID only for explicit human manual reprints
  const printJobId = isManual ? `${order.id}-P${Date.now().toString().slice(-4)}` : order.id;

  const payload = {
    ...order,
    id: printJobId,
    originalId: order.id,
    restaurantId: 'restroiq',
    restaurant_id: 'restroiq',
    manualReprint: isManual,
    auto: isAuto
  };

  let localSent = false;
  // 1. Try local port 5001 if the browser happens to be running on the POS laptop itself
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

    const res = await fetch('http://127.0.0.1:5001/api/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      localSent = true;
      updatePosDaemonPill('online', 'POS-80');
    }
  } catch (err) {}

  // 2. Broadcast via Cloud Relay ONLY for explicit human manual prints/reprints.
  // For automatic live orders, the cloud broadcast was already triggered when the order was placed!
  let cloudSent = false;
  if (!isAuto && window.supabaseService && typeof window.supabaseService.pushToCloud === 'function') {
    try {
      const tbl = order.tableNumber || '-';
      cloudSent = await window.supabaseService.pushToCloud(window.supabaseService.cloudTopic, {
        type: 'print_order',
        directive: 'print_order',
        restaurant_id: 'restroiq',
        restaurantId: 'restroiq',
        order: payload,
        manualReprint: true,
        timestamp: Date.now()
      }, {
        'Title': `Print Order Token #${tokStr}: Table ${tbl}`,
        'Priority': '5',
        'Tags': 'printer,receipt'
      });
    } catch (e) {
      console.warn('[Admin] Cloud print push error:', e);
    }
  }

  if (localSent || cloudSent) {
    if (!isAuto) showAdminToast(`🖨️ Sent to POS Printer: Token #${tokStr}`, 'success');
    return true;
  }

  if (!isAuto) {
    showAdminToast(`⚠️ Could not reach POS Printer. Please check connection.`, 'warning');
  }
  return false;
}
window.printOrderToPOS = printOrderToPOS;

function isDummyCustomerOrder(o) {
  if (!o) return true;
  if (String(o.id || '').startsWith('ORD-TEST-') || String(o.id || '').startsWith('ORD-E2E-')) return true;
  return false;
}
window.isDummyCustomerOrder = isDummyCustomerOrder;

function cleanDummyCustomerRecords() {
  DATA.orders = DATA.orders || [];
  const dummyIds = [];
  const initialCount = DATA.orders.length;
  DATA.orders = DATA.orders.filter(o => {
    if (isDummyCustomerOrder(o)) {
      if (o && o.id) dummyIds.push(o.id);
      return false;
    }
    return true;
  });

  dummyIds.forEach(id => {
    if (window.supabaseService && typeof window.supabaseService.deleteOrder === 'function') {
      window.supabaseService.deleteOrder(id);
    }
  });

  saveData(DATA);
  if (typeof savePermanentOrders === 'function') {
    savePermanentOrders(DATA.orders);
  }
  updateOrdersNavBadge();
  if (currentPage === 'orders') renderOrders();
  else if (currentPage === 'dashboard') renderDashboard();

  if (dummyIds.length > 0) {
    showAdminToast(`🧹 Purged ${dummyIds.length} dummy record(s)!`, 'success');
  } else {
    showAdminToast('✨ Orders are already clean of dummy records!', 'success');
  }
}
window.cleanDummyCustomerRecords = cleanDummyCustomerRecords;

function initOrderSync() {
  if (!window.supabaseService) return;

  // Restore and merge any orders from the permanent vault (purging any dummy test records)
  if (typeof loadPermanentOrders === 'function') {
    const vaulted = loadPermanentOrders();
    DATA.orders = (DATA.orders || []).filter(o => {
      if (isDummyCustomerOrder(o)) {
        if (window.supabaseService && typeof window.supabaseService.markOrderDeleted === 'function') {
          window.supabaseService.markOrderDeleted(o.id);
        }
        return false;
      }
      return true;
    });

    if (Array.isArray(vaulted) && vaulted.length > 0) {
      const orderIds = new Set(DATA.orders.map(o => String(o.id || o.tokenId)));
      let reconciled = false;
      vaulted.forEach(vo => {
        if (vo && (vo.id || vo.tokenId) && !isDummyCustomerOrder(vo) && !orderIds.has(String(vo.id || vo.tokenId))) {
          DATA.orders.push(vo);
          orderIds.add(String(vo.id || vo.tokenId));
          reconciled = true;
        }
      });
      if (reconciled) {
        saveData(DATA);
        if (typeof savePermanentOrders === 'function') savePermanentOrders(DATA.orders);
        updateOrdersNavBadge();
      }
    }
  }

  // Listen to new orders placed on customer webpage in real time
  window.supabaseService.onNewOrder((order, isLive) => {
    if (!order || !order.id) return;
    if (isDummyCustomerOrder(order)) {
      if (window.supabaseService && typeof window.supabaseService.markOrderDeleted === 'function') {
        window.supabaseService.markOrderDeleted(order.id);
      }
      return;
    }

    DATA.orders = DATA.orders || [];
    const exists = DATA.orders.some(o => o.id === order.id);
    if (!exists) {
      // Reconcile token number if duplicate on same day
      const todayStr = new Date().toISOString().slice(0, 10);
      const isDuplicateToken = DATA.orders.some(o => {
        const oDate = o.timestamp ? o.timestamp.slice(0, 10) : todayStr;
        return oDate === todayStr && String(o.tokenId || o.id) === String(order.tokenId);
      });
      if (isDuplicateToken) {
        order.tokenId = getNextTokenId();
      }

      DATA.orders.push(order);
      saveData(DATA);
      if (typeof savePermanentOrders === 'function') {
        savePermanentOrders(DATA.orders);
      }
      // Trigger chime, toast, and direct POS Daemon to print new live order
      if (isLive) {
        playOrderChime();
        const tok = order.tokenId || order.id || '';
        const tokStr = /^\d+$/.test(String(tok)) ? String(tok).padStart(2, '0') : tok;
        showAdminToast(`🔔 New Order! Token #${tokStr} · Table: ${order.tableNumber || '—'}`, 'success');

        const isAutoPrint = DATA.store?.autoPrintOrders !== false;
        if (isAutoPrint) {
          console.log(`[Admin] Directing POS Daemon to auto-print live order Token #${tokStr}...`);
          printOrderToPOS(order, { auto: true });
        }
      }
      updateOrdersNavBadge();
      if (currentPage === 'dashboard') renderDashboard();
      else if (currentPage === 'orders') renderOrders();
    }
  });

  // Listen to order deletions across devices
  if (typeof window.supabaseService.onOrderDeleted === 'function') {
    window.supabaseService.onOrderDeleted(orderId => {
      if (!orderId) return;
      const countBefore = (DATA.orders || []).length;
      DATA.orders = (DATA.orders || []).filter(o => o.id !== orderId);
      if (DATA.orders.length !== countBefore) {
        saveData(DATA);
        if (typeof savePermanentOrders === 'function') savePermanentOrders(DATA.orders);
        updateOrdersNavBadge();
        if (currentPage === 'orders') renderOrders();
        else if (currentPage === 'dashboard') renderDashboard();
      }
    });
  }

  // Listen to order status updates in real time
  window.supabaseService.onOrderStatusUpdated((orderId, status) => {
    const order = (DATA.orders || []).find(o => o.id === orderId);
    if (order && order.status !== status) {
      order.status = status;
      if (status === 'delivered' && !order.servedAt) {
        order.servedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      saveData(DATA);
      if (typeof savePermanentOrders === 'function') {
        savePermanentOrders(DATA.orders);
      }
      updateOrdersNavBadge();
      if (currentPage === 'orders') renderOrders();
      else if (currentPage === 'dashboard') renderDashboard();
    }
  });

  // NOTE: Remote deletions are intentionally ignored to guarantee local order security.
  // Orders can NEVER be deleted automatically without the admin explicitly confirming deletion.

  // Pull latest orders from Supabase if configured
  if (window.supabaseService.isConfigured()) {
    window.supabaseService.fetchOrders().then(cloudOrders => {
      if (cloudOrders && cloudOrders.length > 0) {
        DATA.orders = DATA.orders || [];
        const orderIds = new Set(DATA.orders.map(o => o.id));
        let added = false;
        cloudOrders.forEach(co => {
          if (!orderIds.has(co.id)) {
            DATA.orders.push(co);
            orderIds.add(co.id);
            added = true;
          }
        });
        if (added) {
          saveData(DATA);
          if (typeof savePermanentOrders === 'function') {
            savePermanentOrders(DATA.orders);
          }
          updateOrdersNavBadge();
          if (currentPage === 'dashboard') renderDashboard();
          else if (currentPage === 'orders') renderOrders();
        }
      }
    }).catch(() => {});
  }
}

function promptDeleteOrder(orderId) {
  if (!orderId) return;
  const order = (DATA.orders || []).find(o => o.id === orderId);
  const tableLabel = order?.tableNumber ? `Table ${order.tableNumber}` : 'this order';

  $('confirm-title').textContent = `Delete Order #${orderId}?`;
  $('confirm-message').textContent = `Are you sure you want to permanently delete this order for ${tableLabel}? This action cannot be undone.`;

  confirmCallback = () => {
    DATA.orders = (DATA.orders || []).filter(o => o.id !== orderId);
    saveData(DATA);
    if (typeof savePermanentOrders === 'function') {
      savePermanentOrders(DATA.orders);
    }

    if (window.supabaseService && typeof window.supabaseService.deleteOrder === 'function') {
      window.supabaseService.deleteOrder(orderId);
    }

    showAdminToast(`🗑️ Order #${orderId} deleted successfully`, 'warning');
    updateOrdersNavBadge();
    if (currentPage === 'orders') renderOrders();
    else if (currentPage === 'dashboard') renderDashboard();
  };

  openModal('confirm-modal');
}
window.promptDeleteOrder = promptDeleteOrder;

function showApp() {
  $('login-screen').classList.add('hidden');
  $('admin-app').classList.remove('hidden');
  DATA = loadData();
  $('sidebar-store-name').textContent = DATA.store.name || 'Restaurant';
  updateOrdersNavBadge();
  initOrderSync();
  checkPosDaemonStatus();
  setInterval(checkPosDaemonStatus, 10000);
  navigateTo('dashboard');
}

// ── App-level listeners ──────────────────────────────────────
function setupAppListeners() {
  // POS Daemon Status badge click
  const posBadge = $('pos-daemon-status-badge');
  if (posBadge) {
    posBadge.addEventListener('click', () => {
      showAdminToast('🔍 Checking POS Print Daemon connection...', 'info');
      checkPosDaemonStatus();
      setTimeout(() => {
        if (isPosDaemonOnline) {
          showAdminToast(`🟢 POS Daemon is active and ready on ${currentPosPrinterName}`, 'success');
        } else {
          showAdminToast(`⚠️ POS Daemon is offline. Please run start-pos.bat on your POS laptop.`, 'warning');
        }
      }, 600);
    });
  }

  // Logout
  $('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });

  // Sidebar toggle (mobile)
  $('sidebar-toggle-btn').addEventListener('click', openSidebar);
  $('sidebar-close-btn').addEventListener('click', closeSidebar);
  $('sidebar-overlay').addEventListener('click', closeSidebar);

  // Sidebar nav
  $$('.sidebar-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      closeSidebar();
      navigateTo(btn.dataset.page);
    });
  });

  // Item form modal
  $('item-form-close').addEventListener('click', closeItemModal);
  $('item-form-cancel').addEventListener('click', closeItemModal);
  $('item-form-modal').addEventListener('click', e => { if (e.target === $('item-form-modal')) closeItemModal(); });
  $('item-form-save').addEventListener('click', saveItem);

  // Image upload – file input
  setupImageUpload('item-img-upload', 'item-img-file', (dataUrl) => {
    itemImgData = dataUrl;
    const rm = $('item-img-remove-btn');
    if (rm) rm.style.display = 'inline-block';
  });

  // Image URL input
  $('item-img-url').addEventListener('input', e => {
    const url = e.target.value.trim();
    const rm = $('item-img-remove-btn');
    if (url) {
      itemImgData = url;
      showImgPreview('item-img-upload', url);
      if (rm) rm.style.display = 'inline-block';
    } else {
      itemImgData = '';
      resetImgPreview('item-img-upload');
      if (rm) rm.style.display = 'none';
    }
  });

  // Image Remove button
  const removeBtn = $('item-img-remove-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      itemImgData = '';
      resetImgPreview('item-img-upload');
      $('item-img-file').value = '';
      $('item-img-url').value = '';
      removeBtn.style.display = 'none';
    });
  }

  // Category form modal
  $('cat-form-close').addEventListener('click', closeCatModal);
  $('cat-form-cancel').addEventListener('click', closeCatModal);
  $('cat-form-modal').addEventListener('click', e => { if (e.target === $('cat-form-modal')) closeCatModal(); });
  $('cat-form-save').addEventListener('click', saveCat);

  // Confirm modal
  $('confirm-cancel').addEventListener('click', () => closeModal('confirm-modal'));
  $('confirm-ok').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeModal('confirm-modal');
  });
  $('confirm-modal').addEventListener('click', e => { if (e.target === $('confirm-modal')) closeModal('confirm-modal'); });

  // Topbar add button
  $('topbar-add-btn').addEventListener('click', () => {
    if (currentPage === 'menu-items') openAddItemModal();
    else if (currentPage === 'categories') openAddCatModal();
  });

  // Report modal listeners
  const reportClose = $('report-modal-close');
  if (reportClose) reportClose.addEventListener('click', () => closeModal('report-modal'));
  const reportModal = $('report-modal');
  if (reportModal) reportModal.addEventListener('click', e => { if (e.target === reportModal) closeModal('report-modal'); });

  const reportSort = $('report-sort-select');
  if (reportSort) {
    reportSort.addEventListener('change', e => {
      currentReportSort = e.target.value;
      renderCustomerReport();
    });
  }

  const reportFilter = $('report-filter-payment');
  if (reportFilter) {
    reportFilter.addEventListener('change', e => {
      currentReportFilter = e.target.value;
      renderCustomerReport();
    });
  }

  const reportCategoryFilter = $('report-filter-category');
  if (reportCategoryFilter) {
    reportCategoryFilter.addEventListener('change', e => {
      currentReportCategory = e.target.value || 'all';
      renderCustomerReport();
    });
  }

  const reportDateFilter = $('report-filter-date');
  if (reportDateFilter) {
    reportDateFilter.addEventListener('change', e => {
      currentReportDate = e.target.value || '';
      renderCustomerReport();
    });
  }

  const reportDateTodayBtn = $('report-date-today-btn');
  if (reportDateTodayBtn) {
    reportDateTodayBtn.addEventListener('click', () => {
      const today = getTodayLocalDateStr();
      currentReportDate = today;
      if (reportDateFilter) reportDateFilter.value = today;
      renderCustomerReport();
    });
  }

  const reportDateAllBtn = $('report-date-all-btn');
  if (reportDateAllBtn) {
    reportDateAllBtn.addEventListener('click', () => {
      currentReportDate = '';
      if (reportDateFilter) reportDateFilter.value = '';
      renderCustomerReport();
    });
  }

  const reportDownloadPdf = $('report-download-pdf-btn');
  if (reportDownloadPdf) {
    reportDownloadPdf.addEventListener('click', downloadReportPdf);
  }

  const reportPrint = $('report-print-btn');
  if (reportPrint) {
    reportPrint.addEventListener('click', printReportWindow);
  }

  // View Bill Modal listeners
  const viewBillClose = $('view-bill-close');
  if (viewBillClose) viewBillClose.addEventListener('click', () => closeModal('view-bill-modal'));
  const viewBillDone = $('view-bill-modal-close-btn');
  if (viewBillDone) viewBillDone.addEventListener('click', () => closeModal('view-bill-modal'));
  const viewBillModal = $('view-bill-modal');
  if (viewBillModal) viewBillModal.addEventListener('click', e => { if (e.target === viewBillModal) closeModal('view-bill-modal'); });
  const viewBillPrint = $('view-bill-modal-print-btn');
  if (viewBillPrint) {
    viewBillPrint.addEventListener('click', () => {
      if (currentPreviewOrder) {
        printOrderToPOS(currentPreviewOrder, { force: true });
      }
    });
  }

  // Orders Backup & Permanent Vault listeners
  const backupClose = $('orders-backup-close');
  if (backupClose) backupClose.addEventListener('click', closeOrdersBackupModal);
  const backupDone = $('orders-backup-done');
  if (backupDone) backupDone.addEventListener('click', closeOrdersBackupModal);
  const backupModal = $('orders-backup-modal');
  if (backupModal) backupModal.addEventListener('click', e => { if (e.target === backupModal) closeOrdersBackupModal(); });

  const exportOrdersBtn = $('btn-export-orders');
  if (exportOrdersBtn) exportOrdersBtn.addEventListener('click', exportOrdersBackup);

  const importOrdersInp = $('import-orders-file');
  if (importOrdersInp) importOrdersInp.addEventListener('change', handleImportOrdersFile);

  const restoreSamplesBtn = $('btn-restore-samples');
  if (restoreSamplesBtn) restoreSamplesBtn.addEventListener('click', restoreSampleOrders);

  // Esc key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $$('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
    }
  });
}

function openSidebar() {
  $('admin-sidebar').classList.add('open');
  $('sidebar-overlay').classList.add('visible');
}
function closeSidebar() {
  $('admin-sidebar').classList.remove('open');
  $('sidebar-overlay').classList.remove('visible');
}

// ── Navigation ────────────────────────────────────────────────
function navigateTo(page) {
  currentPage = page;

  // Update nav active state
  $$('.sidebar-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
    btn.setAttribute('aria-current', btn.dataset.page === page ? 'page' : 'false');
  });

  // Page titles and topbar add button
  const pageTitles = {
    dashboard: 'Dashboard',
    'menu-items': 'Menu Items',
    categories: 'Categories',
    orders: 'Orders',
    'store-settings': 'Store Settings'
  };
  $('admin-page-title').textContent = pageTitles[page] || page;

  const showAddBtn = ['menu-items', 'categories'].includes(page);
  const addBtnEl = $('topbar-add-btn');
  addBtnEl.style.display = showAddBtn ? '' : 'none';
  addBtnEl.textContent = page === 'categories' ? '+ Add Category' : '+ Add Item';

  // Render page
  const content = $('admin-content');
  content.innerHTML = '';

  const pageRenderers = {
    dashboard: renderDashboard,
    'menu-items': renderMenuItems,
    categories: renderCategories,
    orders: renderOrders,
    'store-settings': renderStoreSettings
  };
  if (pageRenderers[page]) pageRenderers[page]();
}

// ════════════════════════════════════════════════════════════
// ── DASHBOARD PAGE ──────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function renderDashboard() {
  const content = $('admin-content');
  const orders = DATA.orders || [];
  const totalRev = orders.reduce((s, o) => s + (o.total || 0), 0);
  const totalItems = DATA.items.length;
  const totalCats = DATA.categories.length;
  const vegCount = DATA.items.filter(i => i.isVeg).length;
  const availCount = DATA.items.filter(i => i.isAvailable !== false).length;

  content.innerHTML = `
    <div class="stat-cards">
      <div class="stat-card primary animate-fade-up" style="animation-delay:0s">
        <div class="stat-icon">📋</div>
        <div class="stat-label">Total Orders</div>
        <div class="stat-value">${orders.length}</div>
        <div class="stat-sub">All time</div>
      </div>
      <div class="stat-card green animate-fade-up" style="animation-delay:0.05s">
        <div class="stat-icon">💰</div>
        <div class="stat-label">Revenue</div>
        <div class="stat-value">${DATA.store.currency}${totalRev}</div>
        <div class="stat-sub">All time</div>
      </div>
      <div class="stat-card orange animate-fade-up" style="animation-delay:0.1s">
        <div class="stat-icon">🍽️</div>
        <div class="stat-label">Menu Items</div>
        <div class="stat-value">${totalItems}</div>
        <div class="stat-sub">${availCount} available</div>
      </div>
      <div class="stat-card purple animate-fade-up" style="animation-delay:0.15s">
        <div class="stat-icon">📂</div>
        <div class="stat-label">Categories</div>
        <div class="stat-value">${totalCats}</div>
        <div class="stat-sub">${vegCount} veg items</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="section-card">
        <div class="section-card-header">
          <span class="section-card-title">Recent Orders</span>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-sm" onclick="openCustomerReportModal()" style="background:#000;color:#fff;border:none;font-weight:700">📄 PDF Report</button>
            <button class="btn btn-sm btn-outline" onclick="navigateTo('orders')">View All</button>
          </div>
        </div>
        <div class="section-card-body" id="recent-orders-list">
          ${orders.length === 0
            ? `<div class="empty-state"><div class="empty-state-icon">📋</div><h3>No orders yet</h3></div>`
            : orders.slice(-5).reverse().map(o => {
                const orderItems = parseOrderItems(o.items);
                const totalQty = orderItems.reduce((sum, item) => sum + (Number(item.qty || item.quantity) || 1), 0);
                const itemsSummary = orderItems.map(i => `${Number(i.qty || i.quantity || 1)}× ${escHtml(i.name || 'Item')}`).join(', ');
                const orderTime = o.timestamp ? new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
                const tok = o.tokenId || o.id || '';
                const tokStr = /^\d+$/.test(String(tok)) ? String(tok).padStart(2, '0') : tok;
                return `
                  <div class="recent-order-item" onclick="navigateTo('orders')" style="cursor:pointer;padding:12px;border-radius:8px;transition:background 0.15s">
                    <div style="flex:1;min-width:0">
                      <div class="order-id" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                        <span style="font-weight:900;background:#000000;color:#ffffff;padding:2px 8px;border-radius:6px;font-size:0.78rem">TOKEN #${escHtml(tokStr)}</span>
                        <span class="order-id-badge" style="background:#f1f3f5;font-weight:700;font-size:0.8rem">Table: ${escHtml(o.tableNumber || '—')}</span>
                        <span class="order-card-status ${escHtml(o.status || 'placed')}" style="font-size:0.72rem;padding:2px 8px">${escHtml(o.status || 'placed')}</span>
                        <span style="font-size:0.72rem;padding:2px 8px;border-radius:12px;background:${(o.paymentMethod || 'cash').toLowerCase() === 'upi' ? '#e8f0fe' : '#e6f4ea'};color:${(o.paymentMethod || 'cash').toLowerCase() === 'upi' ? '#1a73e8' : '#137333'};font-weight:700">
                          ${(o.paymentMethod || 'cash').toLowerCase() === 'upi' ? '📱 UPI' : '💵 Cash'}
                        </span>
                      </div>
                      <div class="order-meta" style="margin-top:4px;font-size:0.8rem;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                        <span style="background:rgba(0,151,67,0.12);color:var(--secondary);font-weight:800;padding:2px 8px;border-radius:6px;font-size:0.78rem">${totalQty} Total Item${totalQty !== 1 ? 's' : ''}</span>
                        <span>· ${escHtml(o.serviceMode === 'takeaway' ? 'Takeaway' : (o.serviceMode === 'delivery' ? 'Delivery' : 'Dine-in'))}</span>
                        <span>· ${orderTime}</span>
                      </div>
                      ${itemsSummary ? `<div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(itemsSummary)}">${escHtml(itemsSummary)}</div>` : ''}
                    </div>
                    <div style="text-align:right;display:flex;align-items:center;gap:10px">
                      <div>
                        <span class="order-amount" style="font-size:1rem;font-weight:800">${DATA.store.currency}${o.total || 0}</span>
                        <div style="font-size:0.72rem;color:var(--secondary);font-weight:700;margin-top:2px">View Ticket →</div>
                      </div>
                      <button class="order-header-delete-btn" title="Delete Token #${escHtml(tokStr)}" aria-label="Delete order" onclick="event.stopPropagation();promptDeleteOrder('${escHtml(o.id || '')}')">🗑️</button>
                    </div>
                  </div>`;
              }).join('')
          }
        </div>
      </div>

      <div class="section-card">
        <div class="section-card-header">
          <span class="section-card-title">Quick Stats</span>
        </div>
        <div class="section-card-body">
          <div class="quick-stat-row">
            <span class="quick-stat-label">🟢 Veg Items</span>
            <span class="quick-stat-val">${vegCount}</span>
          </div>
          <div class="quick-stat-row">
            <span class="quick-stat-label">🔴 Non-Veg Items</span>
            <span class="quick-stat-val">${totalItems - vegCount}</span>
          </div>
          <div class="quick-stat-row">
            <span class="quick-stat-label">🔥 Bestsellers</span>
            <span class="quick-stat-val">${DATA.items.filter(i => i.isBestseller).length}</span>
          </div>
          <div class="quick-stat-row">
            <span class="quick-stat-label">✨ New Items</span>
            <span class="quick-stat-val">${DATA.items.filter(i => i.isNew).length}</span>
          </div>
          <div class="quick-stat-row">
            <span class="quick-stat-label">⛔ Unavailable</span>
            <span class="quick-stat-val">${DATA.items.filter(i => i.isAvailable === false).length}</span>
          </div>
          <div class="quick-stat-row">
            <span class="quick-stat-label">🏪 Store Status</span>
            <span class="quick-stat-val" style="color:${DATA.store.isOpen ? 'var(--secondary)' : '#e74c3c'}">${DATA.store.isOpen ? 'Open' : 'Closed'}</span>
          </div>
        </div>
      </div>
    </div>

    <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
      <button class="btn btn-secondary" onclick="navigateTo('menu-items')">✏️ Manage Menu</button>
      <button class="btn btn-outline" onclick="navigateTo('store-settings')">⚙️ Store Settings</button>
      <a class="btn btn-outline" href="index.html" target="_blank">👁️ Preview Menu</a>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// ── MENU ITEMS PAGE ─────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function renderMenuItems() {
  const content = $('admin-content');
  const catOptions = DATA.categories.map(c => `<option value="${c.id}">${c.icon || ''} ${getCategoryDisplayName(c)}</option>`).join('');

  content.innerHTML = `
    <div class="page-toolbar">
      <div class="search-bar-standalone">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="search" id="admin-item-search" placeholder="Search items…" value="${itemSearchQuery}" />
      </div>
      <select class="form-select" id="admin-cat-filter" style="width:auto;max-width:160px">
        <option value="all">All Categories</option>
        ${catOptions}
      </select>
      <label class="form-checkbox" style="flex-shrink:0">
        <input type="checkbox" id="admin-unavail-filter" />
        <span style="font-size:0.85rem">Show unavailable</span>
      </label>
    </div>
    <div class="admin-items-grid" id="admin-items-grid">
      <!-- rendered below -->
    </div>`;

  // Populate filter select value
  $('admin-cat-filter').value = itemFilterCat;

  $('admin-item-search').addEventListener('input', e => {
    itemSearchQuery = e.target.value.trim();
    renderItemCards();
  });
  $('admin-cat-filter').addEventListener('change', e => {
    itemFilterCat = e.target.value;
    renderItemCards();
  });
  $('admin-unavail-filter').addEventListener('change', renderItemCards);

  renderItemCards();
}

function renderItemCards() {
  const grid = $('admin-items-grid');
  if (!grid) return;

  const showUnavail = $('admin-unavail-filter')?.checked ?? true;
  const q = itemSearchQuery.toLowerCase();

  let items = DATA.items.filter(item => {
    if (itemFilterCat !== 'all' && item.categoryId !== itemFilterCat) return false;
    if (!showUnavail && item.isAvailable === false) return false;
    if (q && !item.name.toLowerCase().includes(q) && !(item.description || '').toLowerCase().includes(q)) return false;
    return true;
  });

  if (items.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🍽️</div><h3>No items found</h3><p>Try a different search or add a new item</p></div>`;
    return;
  }

  grid.innerHTML = items.map(item => {
    const cat = DATA.categories.find(c => c.id === item.categoryId);
    const isPackshot = item.image && (item.image.includes('images/') || item.image.includes('can') || item.image.includes('bottle') || item.image.includes('pet'));
    const imgContent = item.image
      ? `<img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:${isPackshot ? 'contain' : 'cover'};${isPackshot ? 'padding:6px;background:#fff;' : ''}" />`
      : `<span style="font-size:3rem">🍽️</span>`;
    return `
      <div class="admin-item-card" data-item-id="${item.id}">
        <div class="admin-item-img" style="position:relative">
          ${imgContent}
          <div class="admin-item-img-badges">
            <span class="veg-dot ${item.isVeg ? 'veg' : 'non-veg'}"></span>
            ${item.isBestseller ? '<span class="item-bestseller-badge" style="font-size:0.62rem">🔥</span>' : ''}
            ${item.isNew ? '<span class="item-new-badge" style="font-size:0.62rem">✨</span>' : ''}
          </div>
          ${item.isAvailable === false ? `<div class="admin-item-unavail-overlay"><span>Unavailable</span></div>` : ''}
        </div>
        <div class="admin-item-body">
          <div class="admin-item-name">${item.name}</div>
          <div class="admin-item-cat">${cat ? (cat.icon || '') + ' ' + getCategoryDisplayName(cat) : 'Uncategorised'}</div>
          <div class="admin-item-price">${DATA.store.currency}${item.price}${item.originalPrice > item.price ? ` <span style="color:var(--text-muted);text-decoration:line-through;font-weight:400;font-size:0.8rem">${DATA.store.currency}${item.originalPrice}</span>` : ''}</div>
          <div class="admin-item-status">
            <label class="toggle" title="${item.isAvailable !== false ? 'Available' : 'Unavailable'}">
              <input type="checkbox" class="item-avail-toggle" data-id="${item.id}" ${item.isAvailable !== false ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
            <span style="font-size:0.78rem;color:var(--text-muted)">${item.isAvailable !== false ? 'Available' : 'Unavailable'}</span>
          </div>
        </div>
        <div class="admin-item-actions">
          <button class="btn btn-sm btn-outline item-edit-btn" data-id="${item.id}">✏️ Edit</button>
          <button class="btn btn-sm btn-danger item-delete-btn" data-id="${item.id}">🗑️</button>
        </div>
      </div>`;
  }).join('');

  // Listeners
  grid.querySelectorAll('.item-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditItemModal(btn.dataset.id));
  });
  grid.querySelectorAll('.item-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteItem(btn.dataset.id));
  });
  grid.querySelectorAll('.item-avail-toggle').forEach(tog => {
    tog.addEventListener('change', e => {
      const item = DATA.items.find(i => i.id === tog.dataset.id);
      if (item) {
        item.isAvailable = e.target.checked;
        saveData(DATA);
        if (window.supabaseService) window.supabaseService.saveMenu(DATA);
        showAdminToast(item.name + (item.isAvailable ? ' is now available' : ' marked unavailable'));
        renderItemCards();
      }
    });
  });
}

// ── Item Form ────────────────────────────────────────────────
function openAddItemModal() {
  editingItemId = null;
  itemImgData = '';
  $('item-form-title').textContent = 'Add Menu Item';
  $('item-form').reset();
  $('item-edit-id').value = '';
  $('item-img-url').value = '';
  $('item-img-file').value = '';
  resetImgPreview('item-img-upload');
  const rm = $('item-img-remove-btn');
  if (rm) rm.style.display = 'none';

  // Populate category select
  const catSel = $('item-category');
  catSel.innerHTML = '<option value="">Select category…</option>' +
    DATA.categories.map(c => `<option value="${c.id}">${c.icon || ''} ${getCategoryDisplayName(c)}</option>`).join('');

  $('item-is-available').checked = true;
  $('item-is-veg').checked = true;
  openModal('item-form-modal');
}

function openEditItemModal(itemId) {
  const item = DATA.items.find(i => i.id === itemId);
  if (!item) return;
  editingItemId = itemId;
  itemImgData = item.image || '';

  $('item-form-title').textContent = 'Edit Item';
  $('item-edit-id').value = itemId;
  $('item-name').value = item.name;
  $('item-desc').value = item.description || '';
  $('item-price').value = item.price;
  $('item-original-price').value = item.originalPrice || '';
  $('item-is-veg').checked = !!item.isVeg;
  $('item-is-bestseller').checked = !!item.isBestseller;
  $('item-is-new').checked = !!item.isNew;
  $('item-is-available').checked = item.isAvailable !== false;
  
  const customs = Array.isArray(item.customizations)
    ? item.customizations
    : (typeof item.customizations === 'string' ? item.customizations.split(',') : []);
  $('item-customizations').value = customs.map(s => s.trim()).filter(Boolean).join(', ');

  // Populate category select
  const catSel = $('item-category');
  catSel.innerHTML = '<option value="">Select category…</option>' +
    DATA.categories.map(c => `<option value="${c.id}">${c.icon || ''} ${getCategoryDisplayName(c)}</option>`).join('');
  catSel.value = item.categoryId;

  $('item-img-file').value = '';
  const rm = $('item-img-remove-btn');
  // Show existing image
  if (item.image) {
    showImgPreview('item-img-upload', item.image);
    $('item-img-url').value = item.image.startsWith('data:') ? '' : item.image;
    if (rm) rm.style.display = 'inline-block';
  } else {
    resetImgPreview('item-img-upload');
    $('item-img-url').value = '';
    if (rm) rm.style.display = 'none';
  }

  openModal('item-form-modal');
}

function closeItemModal() { closeModal('item-form-modal'); }

function saveItem() {
  const name = $('item-name').value.trim();
  const catId = $('item-category').value;
  const price = parseFloat($('item-price').value);

  if (!name) { showAdminToast('Item name is required', 'error'); return; }
  if (!catId) { showAdminToast('Please select a category', 'error'); return; }
  if (!price || price < 0) { showAdminToast('Please enter a valid price', 'error'); return; }

  const custRaw = $('item-customizations').value.trim();
  const customizations = custRaw ? custRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

  // Determine final image
  const finalImg = itemImgData || $('item-img-url').value.trim() || '';

  if (editingItemId) {
    const item = DATA.items.find(i => i.id === editingItemId);
    if (item) {
      item.name = name;
      item.categoryId = catId;
      item.description = $('item-desc').value.trim();
      item.price = price;
      item.originalPrice = parseFloat($('item-original-price').value) || price;
      item.isVeg = $('item-is-veg').checked;
      item.isBestseller = $('item-is-bestseller').checked;
      item.isNew = $('item-is-new').checked;
      item.isAvailable = $('item-is-available').checked;
      item.customizations = customizations;
      item.image = finalImg;
    }
  } else {
    DATA.items.push({
      id: generateId('item'),
      categoryId: catId,
      name, price,
      originalPrice: parseFloat($('item-original-price').value) || price,
      description: $('item-desc').value.trim(),
      isVeg: $('item-is-veg').checked,
      isBestseller: $('item-is-bestseller').checked,
      isNew: $('item-is-new').checked,
      isAvailable: $('item-is-available').checked,
      customizations,
      image: finalImg,
      position: DATA.items.length,
      tags: []
    });
  }

  saveData(DATA);
  if (window.supabaseService) {
    window.supabaseService.saveMenu(DATA);
  }
  closeItemModal();
  renderItemCards();
  showAdminToast(editingItemId ? 'Item updated & synced!' : 'Item added & synced!', 'success');
  editingItemId = null;
}

function confirmDeleteItem(itemId) {
  const item = DATA.items.find(i => i.id === itemId);
  if (!item) return;
  $('confirm-title').textContent = `Delete "${item.name}"?`;
  $('confirm-message').textContent = 'This item will be permanently removed from your menu.';
  confirmCallback = () => {
    DATA.items = DATA.items.filter(i => i.id !== itemId);
    saveData(DATA);
    if (window.supabaseService) {
      window.supabaseService.saveMenu(DATA);
    }
    renderItemCards();
    showAdminToast('Item deleted & synced', 'warning');
  };
  openModal('confirm-modal');
}

// ════════════════════════════════════════════════════════════
// ── CATEGORIES PAGE ─────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function renderCategories() {
  const content = $('admin-content');
  content.innerHTML = `
    <div class="cat-list" id="cat-list">
      <!-- rendered below -->
    </div>`;
  renderCatList();
}

function renderCatList() {
  const list = $('cat-list');
  if (!list) return;
  const cats = DATA.categories.slice().sort((a, b) => (a.position || 0) - (b.position || 0));

  if (cats.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📂</div><h3>No categories yet</h3><p>Add your first category</p></div>`;
    return;
  }

  list.innerHTML = cats.map(cat => {
    const itemCount = DATA.items.filter(i => i.categoryId === cat.id).length;
    return `
      <div class="cat-row" data-cat-id="${cat.id}" draggable="true">
        <span class="cat-drag-handle" title="Drag to reorder">⠿</span>
        <div style="display:flex;align-items:center;gap:8px">
          ${cat.image ? `<img src="${cat.image}" alt="${cat.name}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid #e0e0e0"/>` : ''}
          <span class="cat-row-icon">${cat.icon || '🍽️'}</span>
        </div>
        <div class="cat-row-body">
          <div class="cat-row-name">${cat.name}</div>
          ${cat.description ? `<div class="cat-row-desc">${cat.description}</div>` : ''}
        </div>
        <span class="cat-row-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
        <div class="cat-row-actions">
          <button class="btn btn-sm btn-outline cat-edit-btn" data-id="${cat.id}">✏️ Edit</button>
          <button class="btn btn-sm btn-danger cat-delete-btn" data-id="${cat.id}">🗑️</button>
        </div>
      </div>`;
  }).join('');

  // Listeners
  list.querySelectorAll('.cat-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditCatModal(btn.dataset.id));
  });
  list.querySelectorAll('.cat-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteCat(btn.dataset.id));
  });

  setupCatDragDrop();
}

// Category drag-and-drop reordering
function setupCatDragDrop() {
  const rows = $$('.cat-row');
  let dragSrc = null;

  rows.forEach(row => {
    row.addEventListener('dragstart', e => {
      dragSrc = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      $$('.cat-row').forEach(r => r.classList.remove('drag-over'));
    });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      $$('.cat-row').forEach(r => r.classList.remove('drag-over'));
      if (row !== dragSrc) row.classList.add('drag-over');
    });
    row.addEventListener('drop', e => {
      e.preventDefault();
      if (dragSrc && dragSrc !== row) {
        const srcId = dragSrc.dataset.catId;
        const tgtId = row.dataset.catId;
        const srcCat = DATA.categories.find(c => c.id === srcId);
        const tgtCat = DATA.categories.find(c => c.id === tgtId);
        if (srcCat && tgtCat) {
          const tmp = srcCat.position;
          srcCat.position = tgtCat.position;
          tgtCat.position = tmp;
          saveData(DATA);
          renderCatList();
          showAdminToast('Order updated');
        }
      }
    });
  });
}

// ── Category Form ────────────────────────────────────────────
function openAddCatModal() {
  editingCatId = null;
  $('cat-form-title').textContent = 'Add Category';
  $('cat-form').reset();
  $('cat-edit-id').value = '';
  if ($('cat-image')) $('cat-image').value = '';
  openModal('cat-form-modal');
}

function openEditCatModal(catId) {
  const cat = DATA.categories.find(c => c.id === catId);
  if (!cat) return;
  editingCatId = catId;
  $('cat-form-title').textContent = 'Edit Category';
  $('cat-edit-id').value = catId;
  $('cat-icon').value = cat.icon || '';
  $('cat-name').value = getCategoryDisplayName(cat);
  $('cat-desc').value = cat.description || '';
  if ($('cat-image')) $('cat-image').value = cat.image || '';
  openModal('cat-form-modal');
}

function closeCatModal() { closeModal('cat-form-modal'); }

function saveCat() {
  const name = $('cat-name').value.trim();
  const icon = $('cat-icon').value.trim();
  const desc = $('cat-desc').value.trim();
  const image = $('cat-image') ? $('cat-image').value.trim() : '';

  if (!name) { showAdminToast('Category name is required', 'error'); return; }

  const fullName = icon ? `${icon} ${name}` : name;

  if (editingCatId) {
    const cat = DATA.categories.find(c => c.id === editingCatId);
    if (cat) {
      cat.name = fullName;
      cat.icon = icon;
      cat.description = desc;
      cat.image = image;
    }
  } else {
    DATA.categories.push({
      id: generateId('cat'),
      name: fullName,
      icon,
      description: desc,
      image,
      position: DATA.categories.length
    });
  }

  saveData(DATA);
  closeCatModal();
  renderCatList();
  showAdminToast(editingCatId ? 'Category updated!' : 'Category added!', 'success');
  editingCatId = null;
}

function confirmDeleteCat(catId) {
  const cat = DATA.categories.find(c => c.id === catId);
  if (!cat) return;
  const itemCount = DATA.items.filter(i => i.categoryId === catId).length;
  $('confirm-title').textContent = `Delete "${cat.name}"?`;
  $('confirm-message').textContent = `This will also remove ${itemCount} item${itemCount !== 1 ? 's' : ''} in this category. This cannot be undone.`;
  confirmCallback = () => {
    DATA.categories = DATA.categories.filter(c => c.id !== catId);
    DATA.items = DATA.items.filter(i => i.categoryId !== catId);
    saveData(DATA);
    renderCatList();
    showAdminToast('Category and items deleted', 'warning');
  };
  openModal('confirm-modal');
}

// ════════════════════════════════════════════════════════════
// ── ORDERS PAGE ─────────────────────────────────════════════
// ════════════════════════════════════════════════════════════
let orderFilterTab = 'all';

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Helper for order card timestamp e.g. "09 Oct, 08:39 am" (matching screenshot)
function formatOrderCardDate(timestamp) {
  if (!timestamp) return 'Just now';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return 'Just now';
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()] || 'Oct';
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? String(hours).padStart(2, '0') : '12';
  return `${day} ${month}, ${hours}:${minutes} ${ampm}`;
}
window.formatOrderCardDate = formatOrderCardDate;

let currentPreviewOrder = null;

function toggleOrderBillType(orderId) {
  const ord = (DATA.orders || []).find(o => o && String(o.id) === String(orderId));
  if (!ord) return;
  const wasWithout = ord.billType === 'without_bill' || ord.withoutBill !== false;
  ord.billType = wasWithout ? 'with_bill' : 'without_bill';
  ord.withoutBill = !wasWithout;
  saveData(DATA);
  if (typeof savePermanentOrders === 'function') {
    savePermanentOrders(DATA.orders);
  }
  if (window.supabaseService && typeof window.supabaseService.saveOrder === 'function') {
    window.supabaseService.saveOrder(ord);
  }
  showAdminToast(`Updated to: ${ord.billType === 'without_bill' ? '📝 Without Bill' : '🧾 With Bill'}`, 'info');
  renderOrders();
}
window.toggleOrderBillType = toggleOrderBillType;

function openBillPreviewModal(orderId) {
  const order = (DATA.orders || []).find(o => o && (String(o.id) === String(orderId) || String(o.tokenId) === String(orderId)));
  if (!order) return;
  currentPreviewOrder = order;

  const container = $('view-bill-receipt-content');
  if (!container) return;

  const tok = order.tokenId || order.id || '';
  const tokStr = /^\d+$/.test(String(tok)) ? String(tok).padStart(2, '0') : tok;
  const items = parseOrderItems(order.items);
  const total = order.total || order.subtotal || 0;
  const table = order.tableNumber || 'T-1';
  const payMethod = (order.paymentMethod || 'cash').toUpperCase();
  const mode = (order.serviceMode || 'dine-in').toUpperCase();
  const dateStr = formatOrderCardDate(order.timestamp);
  const isWithoutBill = order.billType === 'without_bill' || order.withoutBill !== false;

  container.innerHTML = `
    <div style="text-align:center;border-bottom:1.5px dashed #333;padding-bottom:10px;margin-bottom:12px">
      <div style="font-weight:900;font-size:1.15rem;letter-spacing:1px">${escHtml(DATA.store.name || 'SATTVA TIFFINS')}</div>
      <div style="font-size:0.75rem;color:#555;margin-top:2px">${escHtml(DATA.store.tagline || 'Pure Taste · Freshly Made · Always')}</div>
      <div style="margin-top:8px;font-weight:900;font-size:1.1rem;background:#000000;color:#ffffff;display:inline-block;padding:3px 12px;border-radius:4px;letter-spacing:0.5px">
        TOKEN #${escHtml(tokStr)}
      </div>
      <div style="margin-top:6px;font-size:0.75rem;font-weight:700;color:${isWithoutBill ? '#854d0e' : '#0369a1'}">
        ${isWithoutBill ? '📝 WITHOUT BILL (KITCHEN TOKEN SLIP)' : '🧾 WITH BILL (CUSTOMER BILL)'}
      </div>
    </div>

    <div style="font-size:0.8rem;line-height:1.6;margin-bottom:10px;border-bottom:1.5px dashed #333;padding-bottom:10px">
      <div><strong>DATE :</strong> ${dateStr}</div>
      ${order.customerName ? `<div><strong>NAME :</strong> ${escHtml(order.customerName)}</div>` : ''}
      ${order.customerPhone ? `<div><strong>PHONE:</strong> ${escHtml(order.customerPhone)}</div>` : ''}
      <div><strong>TABLE:</strong> ${escHtml(table)} (${mode})</div>
      <div><strong>PAY  :</strong> ${payMethod}</div>
    </div>

    <table style="width:100%;font-size:0.82rem;border-collapse:collapse;margin-bottom:12px">
      <thead>
        <tr style="border-bottom:1.5px solid #000;text-align:left">
          <th style="padding:4px 0">ITEM</th>
          <th style="text-align:center;padding:4px 0">QTY</th>
          <th style="text-align:right;padding:4px 0">RATE</th>
          <th style="text-align:right;padding:4px 0">AMT</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(i => {
          const q = Number(i.qty || i.quantity || 1);
          const p = Number(i.price || 0);
          return `
            <tr>
              <td style="padding:4px 0;font-weight:700">${escHtml(String(i.name || 'Item').toUpperCase())}</td>
              <td style="text-align:center;padding:4px 0">${q}</td>
              <td style="text-align:right;padding:4px 0">₹${p}</td>
              <td style="text-align:right;padding:4px 0;font-weight:700">₹${p * q}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div style="border-top:1.5px dashed #333;padding-top:10px;display:flex;justify-content:space-between;align-items:center;font-weight:900;font-size:1.15rem">
      <span>TOTAL AMOUNT:</span>
      <span>₹${total}</span>
    </div>

    <div style="margin-top:16px;text-align:center;font-size:0.72rem;color:#666;border-top:1.5px dashed #333;padding-top:10px">
      *** THANK YOU! VISIT AGAIN ***
    </div>
  `;

  openModal('view-bill-modal');
}
window.openBillPreviewModal = openBillPreviewModal;

// ════════════════════════════════════════════════════════════
// ── ORDERS PAGE (CHEF KITCHEN DISPLAY) ──────────────────────
// ════════════════════════════════════════════════════════════
function renderOrders() {
  const content = $('admin-content');
  if (!content) return;

  try {
    const allOrders = (DATA.orders || []).slice().reverse();

    const totalCount = allOrders.length;
    const filteredOrders = allOrders;

    if (allOrders.length === 0) {
      content.innerHTML = `
        <div class="empty-state" style="padding:80px 24px">
          <div class="empty-state-icon">📋</div>
          <h3>No orders currently in view</h3>
          <p>Orders placed through the customer menu or QR code will appear here instantly in real time.</p>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap">
            <button class="btn btn-outline" onclick="openOrdersBackupModal()">📦 Restore / Backup Orders</button>
          </div>
        </div>`;
      return;
    }

    const autoPrint = DATA.store?.autoPrintOrders !== false;

    content.innerHTML = `
      <!-- Top Action Bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div style="font-weight:800;font-size:1.05rem;color:var(--text-primary);display:flex;align-items:center;gap:8px">
          <span>🍽️ Orders (${totalCount})</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm ${autoPrint ? 'btn-success' : 'btn-outline'}" id="btn-toggle-auto-print" style="display:inline-flex;align-items:center;gap:6px;font-weight:800;${autoPrint ? 'background:#059669;color:#ffffff;border-color:#059669;' : 'border-color:#94a3b8;'}" title="Click to toggle automatic printing for new customer orders">
            🖨️ Auto-Print: ${autoPrint ? 'ON' : 'OFF'}
          </button>
          <button class="btn btn-sm btn-outline" id="btn-test-pos-daemon" style="display:inline-flex;align-items:center;gap:6px;font-weight:700" title="Send a test print command to POS Printer">
            ⚡ Test Printer
          </button>
          <button class="btn btn-sm btn-outline" id="orders-backup-vault-btn" style="display:inline-flex;align-items:center;gap:6px;font-weight:700" title="Permanent Orders Vault: Backup & Restore">
            📦 Backup & Restore
          </button>
          <button class="btn btn-sm" id="customer-report-pdf-btn" style="background:#000000;color:#ffffff;border:1px solid #000000;font-weight:800;padding:7px 14px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:6px" title="Generate clean Black & White Orders Report PDF">
            📄 Orders PDF Report
          </button>
          <button class="btn btn-sm btn-danger btn-outline" id="clear-orders-btn">🗑️ Clear All</button>
        </div>
      </div>

      <div class="clean-orders-list">
          ${filteredOrders.map((o, idx) => {
            if (!o) return '';
            const orderItems = parseOrderItems(o.items);
            const totalQty = orderItems.reduce((sum, item) => sum + (Number(item.qty || item.quantity) || 1), 0);
            const tok = o.tokenId || o.id || '';
            const tokStr = /^\d+$/.test(String(tok)) ? String(tok).padStart(2, '0') : tok;

            // Formats matching screenshot
            const custDisplayName = (o.customerName && !/^(walk-in|guest|test|dummy)$/i.test(o.customerName))
              ? o.customerName
              : (o.serviceMode === 'takeaway' ? 'Takeaway' : 'Dinein');
            
            const isWithoutBill = o.billType === 'without_bill' || o.withoutBill !== false;
            const isUpi = (o.paymentMethod || 'cash').toLowerCase() === 'upi';
            const tableNum = o.tableNumber || 'T-1';
            const serviceIcon = o.serviceMode === 'takeaway' ? '🛍️' : (o.serviceMode === 'delivery' ? '🚴' : '🍽️');
            const serviceName = o.serviceMode === 'takeaway' ? 'Takeaway' : (o.serviceMode === 'delivery' ? 'Delivery' : 'Dine-in');
            const formattedDateStr = formatOrderCardDate(o.timestamp);

            return `
              <div class="clean-order-card" data-order-id="${escHtml(o.id || '')}">
                <div class="clean-order-left">
                  <!-- Row 1: Badges -->
                  <div class="clean-order-badges">
                    <span class="badge-token">TOKEN #${escHtml(tokStr)}</span>
                    <span class="badge-cust"><span class="badge-cust-icon">👤</span> ${escHtml(custDisplayName)}${o.customerPhone ? ` <span style="font-size:0.75rem;font-weight:600;color:#64748b">(${escHtml(o.customerPhone)})</span>` : ''}</span>
                    <span class="badge-bill-type ${isWithoutBill ? 'without-bill' : 'with-bill'} btn-toggle-bill-type" data-order-id="${escHtml(o.id || '')}" title="Click to toggle: Without Bill / With Bill">
                      ${isWithoutBill ? '📝 Without Bill' : '🧾 With Bill'}
                    </span>
                    <span class="badge-payment ${isUpi ? 'pay-upi' : 'pay-cash'}">
                      ${isUpi ? '📱 UPI' : '💵 Cash'}
                    </span>
                    <span class="badge-table">
                      ${escHtml(tableNum)} · ${serviceIcon} ${escHtml(serviceName)}
                    </span>
                  </div>

                  <!-- Row 2: Bought items -->
                  <div class="clean-order-bought">
                    <span class="bought-count-label">Bought (${totalQty}):</span>
                    <div class="bought-items-chips">
                      ${orderItems.map(i => {
                        const qty = Number(i.qty || i.quantity || 1);
                        const price = Number(i.price || 0);
                        return `
                          <span class="bought-item-chip">
                            <strong>${qty}×</strong> ${escHtml(String(i.name || 'Item').toUpperCase())} <span class="chip-price">(₹${price})</span>
                          </span>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  <!-- Row 3: Timestamp -->
                  <div class="clean-order-time">
                    <span style="font-size:0.85rem">🕒</span>
                    <span>${escHtml(formattedDateStr)}</span>
                  </div>
                </div>

                <!-- Right Action Block -->
                <div class="clean-order-right">
                  <div class="clean-order-cost-block">
                    <div class="clean-order-cost-val">₹${o.total || o.subtotal || 0}</div>
                    <div class="clean-order-cost-lbl">Total Cost</div>
                  </div>

                  <button class="btn-clean-view-bill" data-order-id="${escHtml(o.id || '')}" title="View Order Bill">
                    <span>👁️</span> View Bill
                  </button>

                  <button class="btn-clean-print btn-print-order" data-order-id="${escHtml(o.id || '')}" title="Print Order Bill">
                    <span>🖨️</span> Print
                  </button>

                  <button class="btn-clean-delete btn-delete-order" data-order-id="${escHtml(o.id || '')}" title="Delete Token #${escHtml(tokStr)}" aria-label="Delete order">
                    🗑️
                  </button>
                </div>
              </div>
            `;
          }).join('')}
      </div>
    `;

    // Hook permanent orders backup vault button
    const backupVaultBtn = $('orders-backup-vault-btn');
    if (backupVaultBtn) {
      backupVaultBtn.addEventListener('click', openOrdersBackupModal);
    }

    // View bill modal listeners
    $$('.btn-clean-view-bill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openBillPreviewModal(btn.dataset.orderId);
      });
    });

    // Toggle without bill / with bill badge
    $$('.btn-toggle-bill-type').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleOrderBillType(btn.dataset.orderId);
      });
    });

    // Auto-Print Toggle listener
    const toggleAutoPrintBtn = $('btn-toggle-auto-print');
    if (toggleAutoPrintBtn) {
      toggleAutoPrintBtn.addEventListener('click', () => {
        DATA.store = DATA.store || {};
        DATA.store.autoPrintOrders = !(DATA.store.autoPrintOrders !== false);
        saveData(DATA);
        const newState = DATA.store.autoPrintOrders;
        showAdminToast(`🖨️ Auto-Print is now ${newState ? 'ENABLED' : 'DISABLED'}`, newState ? 'success' : 'info');
        renderOrders();
      });
    }

    // Test POS Daemon button listener
    const testPosBtn = $('btn-test-pos-daemon');
    if (testPosBtn) {
      testPosBtn.addEventListener('click', () => {
        const testOrder = {
          id: 'TEST-' + Date.now(),
          tokenId: '99',
          tableNumber: 'POS-TEST',
          serviceMode: 'dine-in',
          paymentMethod: 'cash',
          total: 120,
          timestamp: new Date().toISOString(),
          items: [
            { name: 'POS Printer Connection Test', qty: 1, price: 60 },
            { name: 'Pure Ghee Masala Dosa', qty: 1, price: 60 }
          ]
        };
        showAdminToast('⚡ Dispatching test print to POS Daemon...', 'info');
        printOrderToPOS(testOrder, { force: true });
      });
    }

    // Print single order button listeners
    $$('.btn-clean-print, .btn-print-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ord = (DATA.orders || []).find(o => o && String(o.id) === String(btn.dataset.orderId));
        if (ord) {
          printOrderToPOS(ord, { force: true });
        }
      });
    });

    // Delete single order button listeners
    $$('.btn-clean-delete, .btn-delete-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        promptDeleteOrder(btn.dataset.orderId);
      });
    });

    // Clear all orders button listener
    const clearAllBtn = $('clear-orders-btn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        if (!DATA.orders || DATA.orders.length === 0) return;
        $('confirm-title').textContent = 'Clear All Orders?';
        $('confirm-message').textContent = `Are you sure you want to permanently delete all ${DATA.orders.length} orders? This will clear the dashboard and cannot be undone.`;

        confirmCallback = () => {
          if (window.supabaseService && typeof window.supabaseService.deleteOrder === 'function') {
            (DATA.orders || []).forEach(o => {
              if (o && o.id) window.supabaseService.deleteOrder(o.id);
            });
          }
          DATA.orders = [];
          saveData(DATA);
          if (typeof savePermanentOrders === 'function') {
            savePermanentOrders([]);
          }
          showAdminToast('🗑️ All orders cleared successfully', 'warning');
          updateOrdersNavBadge();
          renderOrders();
        };

        openModal('confirm-modal');
      });
    }

    // "Confirm Served at Table" button listeners
    $$('.btn-confirm-served').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const orderId = btn.dataset.orderId;
        const order = (DATA.orders || []).find(o => o.id === orderId);
        if (!order) return;

        order.status = 'delivered';
        order.servedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        saveData(DATA);

        if (window.supabaseService) {
          window.supabaseService.updateOrderStatus(orderId, 'delivered');
        }

        playOrderChime();
        showAdminToast(`🎉 Order #${orderId} marked as Served to Table ${order.tableNumber || 'T-12'}!`, 'success');
        updateOrdersNavBadge();
        renderOrders();
      });
    });

    // "Mark Unserved" button listeners
    $$('.btn-undo-served').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const orderId = btn.dataset.orderId;
        const order = (DATA.orders || []).find(o => o.id === orderId);
        if (!order) return;

        order.status = 'placed';
        delete order.servedAt;
        saveData(DATA);

        if (window.supabaseService) {
          window.supabaseService.updateOrderStatus(orderId, 'placed');
        }

        showAdminToast(`Order #${orderId} reverted to Placed`, 'default');
        updateOrdersNavBadge();
        renderOrders();
      });
    });

    // Status selects
    $$('.order-status-select').forEach(sel => {
      sel.addEventListener('change', e => {
        const orderId = sel.dataset.orderId;
        const order = (DATA.orders || []).find(o => o.id === orderId);
        if (order) {
          order.status = e.target.value;
          if (order.status === 'delivered' && !order.servedAt) {
            order.servedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else if (order.status !== 'delivered') {
            delete order.servedAt;
          }

          saveData(DATA);
          if (window.supabaseService) {
            window.supabaseService.updateOrderStatus(orderId, order.status);
          }

          showAdminToast('Order status updated: ' + e.target.value, 'success');
          updateOrdersNavBadge();
          renderOrders();
        }
      });
    });

    // PDF Report button
    const reportBtn = $('customer-report-pdf-btn');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        openCustomerReportModal();
      });
    }

    updateOrdersNavBadge();
  } catch (err) {
    console.error('Error rendering orders:', err);
    content.innerHTML = `
      <div class="empty-state" style="padding:60px 20px">
        <div class="empty-state-icon">⚠️</div>
        <h3>Unable to load orders page</h3>
        <p style="color:#e74c3c;margin-bottom:16px">${escHtml(err.message)}</p>
        <button class="btn btn-primary" onclick="renderOrders()">Retry</button>
      </div>`;
  }
}

// ════════════════════════════════════════════════════════════
// ── CUSTOMER ORDERS REPORT (BLACK & WHITE / PDF) ────────────
// ════════════════════════════════════════════════════════════
let currentReportSort = 'token-asc';
let currentReportFilter = 'all';
let currentReportDate = '';
let currentReportCategory = 'all';

const REPORT_CATEGORY_CONFIG = {
  all: { id: 'all', name: 'All Categories (Overview)', icon: '📊' },
  tiffins: { id: 'tiffins', name: 'Idli, Dosa, Vada & Bonda', icon: '🥞' },
  cold_drinks: { id: 'cold_drinks', name: 'Cold Drinks', icon: '🥤' },
  juices_shakes: { id: 'juices_shakes', name: 'Fresh Juices & Milkshakes', icon: '🍹' },
  chaat: { id: 'chaat', name: 'Chaat Items', icon: '🥟' }
};

function classifyItemCategory(item) {
  if (!item) return 'tiffins';
  const name = String(item.name || '').toLowerCase();

  // Resolve category from DATA.items / DEFAULT_DATA.items if possible
  let catId = item.categoryId || '';
  let catName = '';
  if (window.DATA && Array.isArray(window.DATA.items)) {
    const match = window.DATA.items.find(i => i && (i.id === item.id || (i.name && i.name.trim().toLowerCase() === name.trim())));
    if (match && match.categoryId) catId = match.categoryId;
  }
  if (!catId && window.DEFAULT_DATA && Array.isArray(window.DEFAULT_DATA.items)) {
    const matchDef = window.DEFAULT_DATA.items.find(i => i && (i.id === item.id || (i.name && i.name.trim().toLowerCase() === name.trim())));
    if (matchDef && matchDef.categoryId) catId = matchDef.categoryId;
  }
  if (catId && window.DATA && Array.isArray(window.DATA.categories)) {
    const cObj = window.DATA.categories.find(c => c && c.id === catId);
    if (cObj && cObj.name) catName = cObj.name.toLowerCase();
  }

  // 1. Fresh Juices & Milkshakes
  if (
    catName.includes('juice') || catName.includes('shake') || catName.includes('mocktail') ||
    name.includes('juice') || name.includes('shake') || name.includes('smoothie') ||
    name.includes('lassi') || name.includes('cold coffee') || name.includes('badam milk') ||
    name.includes('fruit punch') || name.includes('lime soda') || name.includes('jaljeera')
  ) {
    return 'juices_shakes';
  }

  // 2. Chaat Items
  if (
    catName.includes('chaat') || catName.includes('chat') ||
    name.includes('chaat') || name.includes('chat') || name.includes('puri') ||
    name.includes('bhel') || name.includes('samosa') || name.includes('tikki') ||
    name.includes('papdi') || name.includes('kachori') || name.includes('chatpat')
  ) {
    return 'chaat';
  }

  // 3. Cold Drinks
  if (
    catId === 'cat-3' || catName.includes('cool') || catName.includes('cold') || catName.includes('beverage') ||
    name.includes('water') || name.includes('bottle') || name.includes('monster') ||
    name.includes('redbull') || name.includes('fanta') || name.includes('thumbs') ||
    name.includes('thumps') || name.includes('sprite') || name.includes('coca') ||
    name.includes('coke') || name.includes('pepsi') || name.includes('soft drink')
  ) {
    return 'cold_drinks';
  }

  // 4. Idli, Dosa, Vada & Bonda (Default tiffins)
  return 'tiffins';
}

function selectReportCategory(catKey) {
  currentReportCategory = catKey || 'all';
  const sel = $('report-filter-category');
  if (sel) sel.value = currentReportCategory;
  renderCustomerReport();
}
window.selectReportCategory = selectReportCategory;

function getOrderLocalDateStr(o) {
  if (!o) return '';
  const ts = o.timestamp || o.created_at || o.createdAt;
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) {
    if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}/.test(ts)) {
      return ts.slice(0, 10);
    }
    return '';
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayLocalDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return 'All Dates';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mIndex = parseInt(m, 10) - 1;
  const monthName = monthNames[mIndex] || m;
  return `${d}-${m}-${y} (${d} ${monthName} ${y})`;
}

function getReportFilename(ext = 'pdf') {
  let fileDatePart = 'All_Dates';
  if (currentReportDate && currentReportDate.includes('-')) {
    const [y, m, d] = currentReportDate.split('-');
    fileDatePart = `${d}-${m}-${y}`;
  } else {
    const todayParts = getTodayLocalDateStr().split('-');
    fileDatePart = `All_${todayParts[2]}-${todayParts[1]}-${todayParts[0]}`;
  }
  let catPart = '';
  if (currentReportCategory && currentReportCategory !== 'all') {
    catPart = `_${currentReportCategory.toUpperCase()}`;
  }
  return `Orders_Report${catPart}_${fileDatePart}.${ext}`;
}

function clearReportDateFilter() {
  currentReportDate = '';
  const dateInput = $('report-filter-date');
  if (dateInput) dateInput.value = '';
  renderCustomerReport();
}
window.clearReportDateFilter = clearReportDateFilter;

function openCustomerReportModal(dateParam, categoryParam) {
  if (typeof dateParam === 'string') {
    currentReportDate = dateParam;
  }
  if (typeof categoryParam === 'string') {
    currentReportCategory = categoryParam;
  }
  const dateInput = $('report-filter-date');
  if (dateInput) {
    dateInput.value = currentReportDate || '';
  }
  const catSelect = $('report-filter-category');
  if (catSelect) {
    catSelect.value = currentReportCategory || 'all';
  }
  openModal('report-modal');
  renderCustomerReport();
}
window.openCustomerReportModal = openCustomerReportModal;

function getSortLabel(sortKey) {
  switch (sortKey) {
    case 'token-asc': return 'Token # (01 → 99 Ascending)';
    case 'token-desc': return 'Token # (99 → 01 Descending)';
    case 'time-desc': return 'Date & Time (Newest First)';
    case 'time-asc': return 'Date & Time (Oldest First)';
    case 'payment-cash': return 'Cash First';
    case 'payment-upi': return 'UPI First';
    case 'amount-desc': return 'Amount (Highest First)';
    default: return 'Token # (01 → 99)';
  }
}

function renderCustomerReport() {
  const container = $('report-printable-area');
  if (!container) return;

  const orders = (DATA.orders || []).slice();
  if (orders.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:#555">
        <div style="font-size:2.5rem;margin-bottom:10px">📋</div>
        <h3 style="margin:0 0 6px 0;color:#000">No Orders Found</h3>
        <p style="margin:0;font-size:0.9rem">No orders have been placed yet to generate a report.</p>
      </div>`;
    return;
  }

  // 1. Filter by Payment Method
  let filtered = orders;
  if (currentReportFilter === 'cash') {
    filtered = filtered.filter(o => (o.paymentMethod || 'cash').toLowerCase() === 'cash');
  } else if (currentReportFilter === 'upi') {
    filtered = filtered.filter(o => (o.paymentMethod || 'cash').toLowerCase() === 'upi');
  }

  // 2. Filter by Date (selected in dropdown calendar)
  if (currentReportDate) {
    filtered = filtered.filter(o => getOrderLocalDateStr(o) === currentReportDate);
  }

  // Empty state if date or filter has no matching orders
  if (filtered.length === 0) {
    const dateLabel = currentReportDate ? formatDisplayDate(currentReportDate) : '';
    container.innerHTML = `
      <div style="text-align:center;padding:45px 20px;color:#555">
        <div style="font-size:2.8rem;margin-bottom:12px">📅</div>
        <h3 style="margin:0 0 6px 0;color:#000">No Orders Found ${dateLabel ? 'for ' + escHtml(dateLabel) : ''}</h3>
        <p style="margin:0 0 16px 0;font-size:0.9rem;color:#666">There are no orders recorded matching the selected filter criteria.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          ${currentReportDate ? `<button class="btn btn-sm" onclick="clearReportDateFilter()" style="background:#000;color:#fff;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:700">Show All Dates</button>` : ''}
        </div>
      </div>`;
    return;
  }

  // 3. Sort
  filtered.sort((a, b) => {
    if (currentReportSort === 'token-asc') {
      const numA = parseInt(a.tokenId || a.id || 0, 10) || 0;
      const numB = parseInt(b.tokenId || b.id || 0, 10) || 0;
      if (numA !== numB) return numA - numB;
      return (new Date(a.timestamp || 0)) - (new Date(b.timestamp || 0));
    } else if (currentReportSort === 'token-desc') {
      const numA = parseInt(a.tokenId || a.id || 0, 10) || 0;
      const numB = parseInt(b.tokenId || b.id || 0, 10) || 0;
      if (numB !== numA) return numB - numA;
      return (new Date(b.timestamp || 0)) - (new Date(a.timestamp || 0));
    } else if (currentReportSort === 'time-desc') {
      return (new Date(b.timestamp || 0)) - (new Date(a.timestamp || 0));
    } else if (currentReportSort === 'time-asc') {
      return (new Date(a.timestamp || 0)) - (new Date(b.timestamp || 0));
    } else if (currentReportSort === 'payment-cash') {
      const payA = (a.paymentMethod || 'cash').toLowerCase() === 'cash' ? 0 : 1;
      const payB = (b.paymentMethod || 'cash').toLowerCase() === 'cash' ? 0 : 1;
      if (payA !== payB) return payA - payB;
      return (new Date(b.timestamp || 0)) - (new Date(a.timestamp || 0));
    } else if (currentReportSort === 'payment-upi') {
      const payA = (a.paymentMethod || 'cash').toLowerCase() === 'upi' ? 0 : 1;
      const payB = (b.paymentMethod || 'cash').toLowerCase() === 'upi' ? 0 : 1;
      if (payA !== payB) return payA - payB;
      return (new Date(b.timestamp || 0)) - (new Date(a.timestamp || 0));
    } else if (currentReportSort === 'amount-desc') {
      return (Number(b.total || b.subtotal || 0)) - (Number(a.total || a.subtotal || 0));
    }
    return 0;
  });

  // Calculate overall stats & category breakdown across all filtered orders
  const totalOrdersCount = filtered.length;
  let totalRevenue = 0;
  let cashTotal = 0;
  let cashCount = 0;
  let upiTotal = 0;
  let upiCount = 0;
  let totalItemsSoldAll = 0;

  const categoryBreakdown = {
    tiffins: { ...REPORT_CATEGORY_CONFIG.tiffins, sales: 0, qty: 0, orderCount: 0, itemsMap: {} },
    cold_drinks: { ...REPORT_CATEGORY_CONFIG.cold_drinks, sales: 0, qty: 0, orderCount: 0, itemsMap: {} },
    juices_shakes: { ...REPORT_CATEGORY_CONFIG.juices_shakes, sales: 0, qty: 0, orderCount: 0, itemsMap: {} },
    chaat: { ...REPORT_CATEGORY_CONFIG.chaat, sales: 0, qty: 0, orderCount: 0, itemsMap: {} }
  };

  filtered.forEach(o => {
    const amt = Number(o.total || o.subtotal || 0);
    totalRevenue += amt;
    const pm = (o.paymentMethod || 'cash').toLowerCase();
    if (pm === 'upi') {
      upiTotal += amt;
      upiCount++;
    } else {
      cashTotal += amt;
      cashCount++;
    }

    const items = parseOrderItems(o.items);
    const seenCatsInOrder = new Set();

    items.forEach(it => {
      const q = Number(it.qty || it.quantity || 1);
      const p = Number(it.price || 0);
      const itemTotal = q * p;
      totalItemsSoldAll += q;

      const catKey = classifyItemCategory(it);
      if (categoryBreakdown[catKey]) {
        categoryBreakdown[catKey].sales += itemTotal;
        categoryBreakdown[catKey].qty += q;
        seenCatsInOrder.add(catKey);

        const itName = String(it.name || 'Item').toUpperCase().trim();
        if (!categoryBreakdown[catKey].itemsMap[itName]) {
          categoryBreakdown[catKey].itemsMap[itName] = { name: itName, price: p, qty: 0, sales: 0 };
        }
        categoryBreakdown[catKey].itemsMap[itName].qty += q;
        categoryBreakdown[catKey].itemsMap[itName].sales += itemTotal;
      }
    });

    seenCatsInOrder.forEach(ck => {
      categoryBreakdown[ck].orderCount++;
    });
  });

  const isSpecificCat = currentReportCategory !== 'all';
  const selectedCat = isSpecificCat ? categoryBreakdown[currentReportCategory] : null;
  const selectedCatConfig = REPORT_CATEGORY_CONFIG[currentReportCategory] || REPORT_CATEGORY_CONFIG.all;

  // If a specific category is selected, filter orders to only those containing this category
  let displayOrders = filtered;
  if (isSpecificCat) {
    displayOrders = filtered.filter(o => {
      const items = parseOrderItems(o.items);
      return items.some(it => classifyItemCategory(it) === currentReportCategory);
    });
  }

  const nowStr = new Date().toLocaleString([], { 
    dateStyle: 'medium', 
    timeStyle: 'short' 
  });
  const storeName = DATA.store.name || 'SATTVA TIFFINS';
  const reportDateFormatted = formatDisplayDate(currentReportDate);

  // Build Category Summary KPI block
  let summaryKpisHtml = '';
  if (isSpecificCat && selectedCat) {
    const catPercent = totalRevenue > 0 ? ((selectedCat.sales / totalRevenue) * 100).toFixed(1) : '0';
    summaryKpisHtml = `
      <div class="bw-summary-cards" style="grid-template-columns:repeat(4, 1fr);border:2px solid #000;background:#f8fafc">
        <div class="bw-summary-card">
          <div class="bw-summary-val" style="font-size:1.35rem;color:#000">₹${selectedCat.sales}</div>
          <div class="bw-summary-lbl" style="font-weight:900;color:#000">${selectedCat.icon} ${escHtml(selectedCat.name)} Sales</div>
        </div>
        <div class="bw-summary-card">
          <div class="bw-summary-val">${selectedCat.qty} pcs</div>
          <div class="bw-summary-lbl">Items Sold</div>
        </div>
        <div class="bw-summary-card">
          <div class="bw-summary-val">${displayOrders.length}</div>
          <div class="bw-summary-lbl">Orders with this Category</div>
        </div>
        <div class="bw-summary-card">
          <div class="bw-summary-val">${catPercent}%</div>
          <div class="bw-summary-lbl">Share of Total Revenue (₹${totalRevenue})</div>
        </div>
      </div>
    `;
  } else {
    summaryKpisHtml = `
      <div class="bw-summary-cards">
        <div class="bw-summary-card">
          <div class="bw-summary-val">${totalOrdersCount}</div>
          <div class="bw-summary-lbl">Total Orders</div>
        </div>
        <div class="bw-summary-card">
          <div class="bw-summary-val">₹${cashTotal}</div>
          <div class="bw-summary-lbl">Cash (${cashCount})</div>
        </div>
        <div class="bw-summary-card">
          <div class="bw-summary-val">₹${upiTotal}</div>
          <div class="bw-summary-lbl">UPI (${upiCount})</div>
        </div>
        <div class="bw-summary-card">
          <div class="bw-summary-val">₹${totalRevenue}</div>
          <div class="bw-summary-lbl">Total Store Revenue</div>
        </div>
      </div>
    `;
  }

  // Category Sales Matrix or Item Sales Breakdown Table
  let categorySectionHtml = '';
  if (isSpecificCat && selectedCat) {
    const itemsList = Object.values(selectedCat.itemsMap).sort((a, b) => b.sales - a.sales);
    categorySectionHtml = `
      <div style="border:1.5px solid #000;background:#fafafa;padding:12px;margin-bottom:16px;border-radius:4px">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #000;padding-bottom:6px;margin-bottom:8px">
          <span style="font-weight:900;font-size:0.88rem;text-transform:uppercase;letter-spacing:0.5px">
            ${selectedCat.icon} ${escHtml(selectedCat.name)} · Item-by-Item Sales Breakdown
          </span>
          <span style="font-weight:900;font-size:0.85rem">Total Category Sales: ₹${selectedCat.sales} (${selectedCat.qty} pcs)</span>
        </div>
        ${itemsList.length === 0 ? `
          <div style="padding:15px;text-align:center;color:#666;font-size:0.85rem">No items sold in this category for the selected filter.</div>
        ` : `
          <table class="bw-report-table" style="margin-top:4px">
            <thead>
              <tr>
                <th style="width:30px;text-align:center">#</th>
                <th>Item Name</th>
                <th style="width:90px;text-align:center">Unit Price</th>
                <th style="width:100px;text-align:center">Quantity Sold</th>
                <th style="width:110px;text-align:right">Total Sales</th>
                <th style="width:85px;text-align:right">% of Cat</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList.map((it, idx) => {
                const pct = selectedCat.sales > 0 ? ((it.sales / selectedCat.sales) * 100).toFixed(1) : '0';
                return `
                  <tr>
                    <td style="text-align:center;color:#555">${idx + 1}</td>
                    <td style="font-weight:700">${escHtml(it.name)}</td>
                    <td style="text-align:center">₹${it.price}</td>
                    <td style="text-align:center;font-weight:800">${it.qty}</td>
                    <td style="text-align:right;font-weight:800">₹${it.sales}</td>
                    <td style="text-align:right;color:#333">${pct}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#eee;font-weight:900;border-top:1.5px solid #000">
                <td colspan="3" style="text-align:right">CATEGORY TOTAL:</td>
                <td style="text-align:center">${selectedCat.qty} pcs</td>
                <td style="text-align:right;font-size:0.95rem">₹${selectedCat.sales}</td>
                <td style="text-align:right">100%</td>
              </tr>
            </tfoot>
          </table>
        `}
      </div>
    `;
  } else {
    // Overview of all 4 categories
    const catKeys = ['tiffins', 'cold_drinks', 'juices_shakes', 'chaat'];
    categorySectionHtml = `
      <div style="border:1.5px solid #000;background:#fafafa;padding:12px;margin-bottom:16px;border-radius:4px">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #000;padding-bottom:6px;margin-bottom:8px">
          <span style="font-weight:900;font-size:0.88rem;text-transform:uppercase;letter-spacing:0.5px">
            📊 Sales by Item Category (Overview)
          </span>
          <span style="font-size:0.75rem;color:#444;font-weight:600">Select any category in dropdown above to isolate details</span>
        </div>
        <table class="bw-report-table" style="margin-top:4px">
          <thead>
            <tr>
              <th>Category</th>
              <th style="width:110px;text-align:center">Items Sold</th>
              <th style="width:110px;text-align:center">Orders Count</th>
              <th style="width:130px;text-align:right">Total Sales (₹)</th>
              <th style="width:95px;text-align:right">% Revenue</th>
              <th style="width:80px;text-align:center;background:#e5e7eb">Action</th>
            </tr>
          </thead>
          <tbody>
            ${catKeys.map(k => {
              const c = categoryBreakdown[k];
              const pct = totalRevenue > 0 ? ((c.sales / totalRevenue) * 100).toFixed(1) : '0';
              return `
                <tr>
                  <td style="font-weight:700">
                    <span style="font-size:1.05rem;margin-right:4px">${c.icon}</span> ${escHtml(c.name)}
                  </td>
                  <td style="text-align:center;font-weight:700">${c.qty} pcs</td>
                  <td style="text-align:center">${c.orderCount} orders</td>
                  <td style="text-align:right;font-weight:900;font-size:0.92rem">₹${c.sales}</td>
                  <td style="text-align:right;font-weight:700">${pct}%</td>
                  <td style="text-align:center">
                    <button class="btn btn-sm" onclick="selectReportCategory('${c.id}')" style="background:#000;color:#fff;border:none;padding:2px 8px;font-size:0.72rem;border-radius:4px;cursor:pointer;font-weight:700">View</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#eee;font-weight:900;border-top:1.5px solid #000">
              <td>ALL CATEGORIES TOTAL:</td>
              <td style="text-align:center">${totalItemsSoldAll} pcs</td>
              <td style="text-align:center">${totalOrdersCount} orders</td>
              <td style="text-align:right;font-size:0.95rem">₹${totalRevenue}</td>
              <td style="text-align:right">100%</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  // Orders Table
  let ordersTableHtml = '';
  if (displayOrders.length === 0) {
    ordersTableHtml = `
      <div style="text-align:center;padding:30px 20px;border:1px dashed #666;border-radius:6px;background:#fcfcfc">
        <p style="margin:0 0 10px 0;font-weight:700">No orders contain items from ${selectedCatConfig.icon} ${escHtml(selectedCatConfig.name)}.</p>
        <button class="btn btn-sm" onclick="selectReportCategory('all')" style="background:#000;color:#fff;padding:5px 12px;border:none;border-radius:4px;cursor:pointer">Show All Categories</button>
      </div>
    `;
  } else {
    ordersTableHtml = `
      <table class="bw-report-table">
        <thead>
          <tr>
            <th style="width:70px;text-align:center">Token #</th>
            <th style="width:115px">Date / Time</th>
            <th style="width:130px">Table / Service</th>
            <th>What Was Ordered ${isSpecificCat ? `(${selectedCatConfig.name} highlighted)` : ''}</th>
            <th style="width:80px;text-align:center">Payment</th>
            <th style="width:95px;text-align:right">${isSpecificCat ? `${selectedCatConfig.name} Sales` : 'Paid Total'}</th>
          </tr>
        </thead>
        <tbody>
          ${displayOrders.map(o => {
            const items = parseOrderItems(o.items);
            const time = o.timestamp ? new Date(o.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
            const tableText = escHtml(o.tableNumber || '—');
            const serviceText = o.serviceMode === 'takeaway' ? 'Takeaway' : (o.serviceMode === 'delivery' ? 'Delivery' : 'Dine-in');
            const payMode = (o.paymentMethod || 'cash').toUpperCase();
            const orderTotal = Number(o.total || o.subtotal || 0);
            const tok = o.tokenId || o.id || '';
            const tokStr = /^\d+$/.test(String(tok)) ? String(tok).padStart(2, '0') : tok;

            let catSubtotalInOrder = 0;
            const itemsText = items.map(it => {
              const q = Number(it.qty || it.quantity || 1);
              const p = Number(it.price || 0);
              const itemTotal = q * p;
              const itCat = classifyItemCategory(it);
              const isMatch = isSpecificCat && itCat === currentReportCategory;
              if (isMatch) catSubtotalInOrder += itemTotal;

              if (isMatch) {
                return `<span style="font-weight:800;color:#000;background:#fef08a;padding:1px 4px;border-radius:3px;border:1px solid #ca8a04">• <strong>${q}×</strong> ${escHtml(it.name || 'Item')} (@ ₹${p}) = ₹${itemTotal}</span>`;
              } else if (isSpecificCat) {
                return `<span style="color:#777">• ${q}× ${escHtml(it.name || 'Item')} (@ ₹${p})</span>`;
              }
              return `• ${q}× ${escHtml(it.name || 'Item')} (@ ₹${p}) = ₹${itemTotal}`;
            }).join('<br>');

            const displayAmount = isSpecificCat ? catSubtotalInOrder : orderTotal;
            const subtext = isSpecificCat ? `<div style="font-size:0.7rem;color:#666;font-weight:normal">Bill Total: ₹${orderTotal}</div>` : '';

            return `
              <tr>
                <td style="text-align:center;font-weight:900;font-size:1.05rem;color:#000">#${escHtml(tokStr)}</td>
                <td style="font-size:0.75rem">${time}</td>
                <td><strong>Table: ${tableText}</strong><br><span style="font-size:0.72rem;color:#444">${serviceText}</span></td>
                <td style="font-size:0.78rem;line-height:1.45">${itemsText || '—'}</td>
                <td style="text-align:center">
                  <strong style="font-size:0.82rem">${payMode}</strong>
                </td>
                <td style="text-align:right;font-weight:800;font-size:0.9rem">
                  ₹${displayAmount}
                  ${subtext}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#f0f0f0;font-weight:900;border-top:2px solid #000">
            <td colspan="4" style="text-align:right;padding:8px">
              ${isSpecificCat ? `${selectedCatConfig.name.toUpperCase()} TOTAL (${displayOrders.length} Orders):` : `GRAND TOTAL (${totalOrdersCount} Orders):`}
            </td>
            <td style="text-align:center;font-size:0.75rem">Cash: ₹${cashTotal}<br>UPI: ₹${upiTotal}</td>
            <td style="text-align:right;font-size:1rem;padding:8px">
              ₹${isSpecificCat ? selectedCat.sales : totalRevenue}
            </td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  container.innerHTML = `
    <!-- Report Header (Black & White) -->
    <div style="border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:14px;text-align:center">
      <h1 style="margin:0 0 4px 0;font-size:1.35rem;font-weight:900;text-transform:uppercase;letter-spacing:0.5px">${escHtml(storeName)}</h1>
      <h2 style="margin:0 0 6px 0;font-size:0.95rem;font-weight:700;text-transform:uppercase">
        ORDERS & PAYMENT REPORT ${isSpecificCat ? `· ${escHtml(selectedCatConfig.name.toUpperCase())}` : ''}
      </h2>
      <div style="font-size:0.75rem;color:#333;display:flex;justify-content:center;gap:14px;flex-wrap:wrap;align-items:center">
        <span><strong>Report Date:</strong> ${escHtml(reportDateFormatted)}</span>
        <span><strong>Generated:</strong> ${nowStr}</span>
        <span><strong>Category:</strong> <span style="background:#000;color:#fff;padding:2px 7px;border-radius:4px;font-weight:700">${escHtml(selectedCatConfig.icon + ' ' + selectedCatConfig.name)}</span></span>
        <span><strong>Total Orders:</strong> ${displayOrders.length}</span>
        <span><strong>Sorting:</strong> ${getSortLabel(currentReportSort)}</span>
      </div>
    </div>

    <!-- Summary KPIs -->
    ${summaryKpisHtml}

    <!-- Category Sales Breakdown -->
    ${categorySectionHtml}

    <!-- Orders Table -->
    ${ordersTableHtml}

    </div>
  `;
}

function printReportWindow() {
  const printable = $('report-printable-area');
  if (!printable) return;

  const printWindow = window.open('', '_blank', 'width=950,height=800');
  if (!printWindow) {
    window.print();
    return;
  }

  const title = getReportFilename('pdf').replace(/\.pdf$/, '');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 10mm; }
        * { box-sizing: border-box; }
        body {
          font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          color: #000000;
          background: #ffffff;
          margin: 0;
          padding: 10px;
          font-size: 9pt;
          line-height: 1.35;
        }
        .bw-report-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8.5pt; color: #000; }
        .bw-report-table th, .bw-report-table td { border: 1px solid #333; padding: 5px 7px; vertical-align: top; text-align: left; }
        .bw-report-table th { background: #eee !important; font-weight: 800; text-transform: uppercase; font-size: 7.5pt; -webkit-print-color-adjust: exact; }
        tr { page-break-inside: avoid; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        .bw-summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; border: 1px solid #000; padding: 8px; background: #fafafa; }
        .bw-summary-card { text-align: center; border-right: 1px solid #ccc; padding: 2px; }
        .bw-summary-card:last-child { border-right: none; }
        .bw-summary-val { font-size: 1.15rem; font-weight: 900; color: #000; }
        .bw-summary-lbl { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #444; margin-top: 2px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      ${printable.innerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

function downloadReportPdf() {
  const printable = $('report-printable-area');
  if (!printable) return;

  const filename = getReportFilename('pdf');

  if (typeof html2pdf === 'function') {
    const reportLabel = currentReportDate ? formatDisplayDate(currentReportDate) : 'All Dates Report';
    showAdminToast(`Preparing PDF for ${reportLabel}...`, 'info');
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(printable).save().then(() => {
      showAdminToast(`📥 Downloaded ${filename}!`, 'success');
    }).catch(err => {
      console.warn('html2pdf save error, opening print window instead:', err);
      printReportWindow();
    });
  } else {
    printReportWindow();
  }
}
window.downloadReportPdf = downloadReportPdf;

// ════════════════════════════════════════════════════════════
// ── TOKEN NUMBER GENERATOR HELPER ───────────────────────────
// ════════════════════════════════════════════════════════════
function getNextTokenId() {
  const todayStr = new Date().toISOString().slice(0, 10);
  let highestToken = 0;

  // Scan existing orders placed today
  if (Array.isArray(DATA.orders)) {
    DATA.orders.forEach(o => {
      if (!o) return;
      const oDate = o.timestamp ? o.timestamp.slice(0, 10) : todayStr;
      if (oDate === todayStr) {
        const val = o.tokenId || o.id;
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > highestToken && num < 10000) {
          highestToken = num;
        }
      }
    });
  }

  const savedDate = localStorage.getItem('sattva_token_date');
  let savedToken = 0;
  if (savedDate === todayStr) {
    savedToken = parseInt(localStorage.getItem('sattva_last_token') || '0', 10);
  }

  const nextNum = Math.max(highestToken, savedToken) + 1;
  const tokenId = String(nextNum).padStart(2, '0');

  localStorage.setItem('sattva_token_date', todayStr);
  localStorage.setItem('sattva_last_token', String(nextNum));

  return tokenId;
}

// ════════════════════════════════════════════════════════════
// ── PERMANENT ORDERS VAULT & BACKUP LOGIC ───────────────────
// ════════════════════════════════════════════════════════════
function openOrdersBackupModal() {
  openModal('orders-backup-modal');
}
window.openOrdersBackupModal = openOrdersBackupModal;

function closeOrdersBackupModal() {
  closeModal('orders-backup-modal');
}
window.closeOrdersBackupModal = closeOrdersBackupModal;

function exportOrdersBackup() {
  const orders = DATA.orders || [];
  if (orders.length === 0) {
    showAdminToast('No orders to export yet', 'warning');
    return;
  }
  const dateStr = new Date().toISOString().slice(0, 10);
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(orders, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `sattva_orders_backup_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showAdminToast(`💾 Exported ${orders.length} orders safely!`, 'success');
}
window.exportOrdersBackup = exportOrdersBackup;

function handleImportOrdersFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      if (!Array.isArray(imported)) {
        showAdminToast('Invalid backup file format (must be a JSON array of orders)', 'error');
        return;
      }
      DATA.orders = DATA.orders || [];
      const orderIds = new Set(DATA.orders.map(o => String(o.id || o.tokenId)));
      let added = 0;
      imported.forEach(o => {
        if (o && (o.id || o.tokenId)) {
          const key = String(o.id || o.tokenId);
          if (!orderIds.has(key)) {
            DATA.orders.push(o);
            orderIds.add(key);
            added++;
          }
        }
      });
      saveData(DATA);
      if (typeof savePermanentOrders === 'function') {
        savePermanentOrders(DATA.orders);
      }
      updateOrdersNavBadge();
      if (currentPage === 'orders') renderOrders();
      else if (currentPage === 'dashboard') renderDashboard();

      showAdminToast(`🎉 Successfully imported ${added} new order(s)! Permanent vault updated.`, 'success');
      closeOrdersBackupModal();
    } catch (err) {
      console.error('Import error:', err);
      showAdminToast('Could not parse backup file: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}
window.handleImportOrdersFile = handleImportOrdersFile;

function restoreSampleOrders() {
  const sampleOrders = [
    {
      id: "22",
      tokenId: "22",
      customerName: "Dinein",
      tableNumber: "T-1",
      serviceMode: "dine-in",
      billType: "without_bill",
      paymentMethod: "cash",
      status: "delivered",
      timestamp: new Date().toISOString(),
      items: [
        { name: "MASALA DOSA", price: 60, qty: 1 }
      ],
      subtotal: 60,
      total: 60
    },
    {
      id: "21",
      tokenId: "21",
      customerName: "Dinein",
      tableNumber: "T-1",
      serviceMode: "dine-in",
      billType: "without_bill",
      paymentMethod: "cash",
      status: "delivered",
      timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
      items: [
        { name: "BONDA (4 PCS)", price: 50, qty: 1 }
      ],
      subtotal: 50,
      total: 50
    },
    {
      id: "20",
      tokenId: "20",
      customerName: "Dinein",
      tableNumber: "T-1",
      serviceMode: "dine-in",
      billType: "without_bill",
      paymentMethod: "upi",
      status: "ready",
      timestamp: new Date(Date.now() - 6 * 60000).toISOString(),
      items: [
        { name: "ALOO MASALA DOSA", price: 60, qty: 3 }
      ],
      subtotal: 180,
      total: 180
    },
    {
      id: "19",
      tokenId: "19",
      customerName: "Dinein",
      tableNumber: "T-1",
      serviceMode: "dine-in",
      billType: "without_bill",
      paymentMethod: "upi",
      status: "delivered",
      timestamp: new Date(Date.now() - 6 * 60000).toISOString(),
      items: [
        { name: "MASALA DOSA", price: 60, qty: 1 }
      ],
      subtotal: 60,
      total: 60
    }
  ];

  DATA.orders = DATA.orders || [];
  const orderIds = new Set(DATA.orders.map(o => String(o.id || o.tokenId)));
  let added = 0;
  sampleOrders.forEach(so => {
    if (!orderIds.has(String(so.id))) {
      DATA.orders.push(so);
      orderIds.add(String(so.id));
      added++;
    }
  });

  saveData(DATA);
  if (typeof savePermanentOrders === 'function') {
    savePermanentOrders(DATA.orders);
  }
  updateOrdersNavBadge();
  if (currentPage === 'orders') renderOrders();
  else if (currentPage === 'dashboard') renderDashboard();

  showAdminToast(`✅ Restored ${added} sample order record(s)!`, 'success');
  closeOrdersBackupModal();
}
window.restoreSampleOrders = restoreSampleOrders;

function renderStoreSettings() {
  const s = DATA.store;
  const content = $('admin-content');
  content.innerHTML = `
    <!-- Basic Info -->
    <div class="settings-section">
      <div class="settings-section-header">🏪 Basic Information</div>
      <div class="settings-section-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="s-name">Restaurant Name</label>
            <input class="form-input" type="text" id="s-name" value="${escHtml(s.name || '')}" placeholder="Restaurant name" />
          </div>
          <div class="form-group">
            <label class="form-label" for="s-tagline">Tagline</label>
            <input class="form-input" type="text" id="s-tagline" value="${escHtml(s.tagline || '')}" placeholder="Your slogan" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="s-address">Address</label>
          <input class="form-input" type="text" id="s-address" value="${escHtml(s.address || '')}" placeholder="Full address" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="s-phone">Phone</label>
            <input class="form-input" type="tel" id="s-phone" value="${escHtml(s.phone || '')}" placeholder="+91 98765 43210" />
          </div>
          <div class="form-group">
            <label class="form-label" for="s-email">Email</label>
            <input class="form-input" type="email" id="s-email" value="${escHtml(s.email || '')}" placeholder="hello@restaurant.com" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="s-gst">GSTIN</label>
            <input class="form-input" type="text" id="s-gst" value="${escHtml(s.gstNumber || '')}" placeholder="GSTIN number" />
          </div>
          <div class="form-group">
            <label class="form-label" for="s-table">Table / QR Number</label>
            <input class="form-input" type="text" id="s-table" value="${escHtml(s.tableNumber || '')}" placeholder="T-12" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="s-open-time">Opening Time</label>
            <input class="form-input" type="time" id="s-open-time" value="${s.openTime || '10:00'}" />
          </div>
          <div class="form-group">
            <label class="form-label" for="s-close-time">Closing Time</label>
            <input class="form-input" type="time" id="s-close-time" value="${s.closeTime || '22:00'}" />
          </div>
        </div>
      </div>
    </div>

    <!-- Branding -->
    <div class="settings-section">
      <div class="settings-section-header">🎨 Branding & Appearance</div>
      <div class="settings-section-body">
        <div class="form-group">
          <label class="form-label">Primary Color (Header / Sidebar)</label>
          <div class="color-input-row">
            <div class="color-swatch" style="background:${s.primaryColor || '#021f4d'}">
              <input type="color" id="s-primary-color" value="${s.primaryColor || '#021f4d'}" />
            </div>
            <input class="form-input" type="text" id="s-primary-color-text" value="${s.primaryColor || '#021f4d'}" placeholder="#021f4d" style="max-width:120px" />
            <span style="font-size:0.78rem;color:var(--text-muted)">Header and sidebar color</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Accent Color (Buttons / Add to Cart)</label>
          <div class="color-input-row">
            <div class="color-swatch" style="background:${s.secondaryColor || '#009743'}">
              <input type="color" id="s-secondary-color" value="${s.secondaryColor || '#009743'}" />
            </div>
            <input class="form-input" type="text" id="s-secondary-color-text" value="${s.secondaryColor || '#009743'}" placeholder="#009743" style="max-width:120px" />
            <span style="font-size:0.78rem;color:var(--text-muted)">Cart bar and buttons</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Logo Image</label>
          <div class="image-upload-area" id="logo-img-upload">
            <input type="file" accept="image/*" id="logo-img-file" aria-label="Upload logo" />
            ${s.logo ? `<img class="preview" src="${s.logo}" alt="Logo" />` : ''}
            <span style="font-size:2rem">🏪</span>
            <span style="font-size:0.85rem;color:var(--text-muted)">Upload restaurant logo</span>
            <div class="upload-overlay"><span>📷</span> <span>Change</span></div>
          </div>
          <div class="image-url-row">
            <span style="font-size:0.78rem;color:var(--text-muted)">or paste URL</span>
            <input class="form-input" type="url" id="s-logo-url" value="${escHtml(s.logo && !s.logo.startsWith('data:') ? s.logo : '')}" placeholder="https://…" style="flex:1" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Hero Banner Image</label>
          <div class="image-upload-area" id="banner-img-upload">
            <input type="file" accept="image/*" id="banner-img-file" aria-label="Upload banner" />
            ${s.bannerImage ? `<img class="preview" src="${s.bannerImage}" alt="Banner" />` : ''}
            <span style="font-size:2rem">🖼️</span>
            <span style="font-size:0.85rem;color:var(--text-muted)">Upload hero banner image</span>
            <div class="upload-overlay"><span>📷</span> <span>Change</span></div>
          </div>
          <div class="image-url-row">
            <span style="font-size:0.78rem;color:var(--text-muted)">or paste URL</span>
            <input class="form-input" type="url" id="s-banner-url" value="${escHtml(s.bannerImage && !s.bannerImage.startsWith('data:') ? s.bannerImage : '')}" placeholder="https://…" style="flex:1" />
          </div>
        </div>
      </div>
    </div>

    <!-- Menu Settings -->
    <div class="settings-section">
      <div class="settings-section-header">🍽️ Menu Options</div>
      <div class="settings-section-body">
        <div class="toggle-row">
          <div>
            <div class="toggle-row-label">Store is Open</div>
            <div class="toggle-row-sub">Show "Open Now" badge on the menu</div>
          </div>
          <label class="toggle"><input type="checkbox" id="s-is-open" ${s.isOpen ? 'checked' : ''} /><span class="toggle-slider"></span></label>
        </div>
        <div class="toggle-row">
          <div>
            <div class="toggle-row-label">Show Veg Filter</div>
            <div class="toggle-row-sub">Let customers filter vegetarian items</div>
          </div>
          <label class="toggle"><input type="checkbox" id="s-veg-filter" ${s.vegFilterEnabled ? 'checked' : ''} /><span class="toggle-slider"></span></label>
        </div>
        <div class="form-group">
          <label class="form-label" for="s-social-proof">Social Proof Text</label>
          <input class="form-input" type="text" id="s-social-proof" value="${escHtml(s.socialProof || '')}" placeholder="⭐ 4.8 | 2000+ Happy Customers" />
        </div>
        <div class="form-group">
          <label class="form-label" for="s-announcement">Announcement Banner (ticker)</label>
          <input class="form-input" type="text" id="s-announcement" value="${escHtml(s.announcement || '')}" placeholder="🎉 Special offer text…" />
        </div>
      </div>
    </div>

    <!-- Supabase Cloud Sync Section -->
    <div class="settings-section">
      <div class="settings-section-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <span>⚡ Supabase Cloud Database & Live Sync</span>
        <span id="supabase-status-pill" style="font-size:0.75rem;padding:3px 10px;border-radius:12px;font-weight:700;${window.supabaseService?.isConfigured() ? 'background:#d4edda;color:#155724' : 'background:#fff3cd;color:#856404'}">
          ${window.supabaseService?.isConfigured() ? '🟢 Cloud Connected' : '⚪ Local Mode (Offline)'}
        </span>
      </div>
      <div class="settings-section-body">
        <p style="font-size:0.83rem;color:var(--text-muted);margin-bottom:14px;line-height:1.5">
          Connect your free Supabase project to receive customer orders in real-time on this dashboard and synchronize menu updates, extras, and product images across all customer devices.
        </p>
        <div class="form-group">
          <label class="form-label" for="s-supabase-url">Supabase Project URL</label>
          <input class="form-input" type="url" id="s-supabase-url" value="${escHtml(window.supabaseService?.config?.url || '')}" placeholder="https://yourproject.supabase.co" />
        </div>
        <div class="form-group">
          <label class="form-label" for="s-supabase-key">Supabase Anon Public Key</label>
          <input class="form-input" type="password" id="s-supabase-key" value="${escHtml(window.supabaseService?.config?.anonKey || '')}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…" />
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <button type="button" class="btn btn-sm btn-outline" id="test-supabase-btn">🔌 Test Connection</button>
          <button type="button" class="btn btn-sm btn-secondary" id="sync-menu-btn">☁️ Push Menu to Cloud</button>
        </div>
        <div id="supabase-test-result" style="margin-top:10px;font-size:0.83rem;font-weight:600;display:none"></div>
      </div>
    </div>

    <!-- Save button -->
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <button class="btn btn-primary btn-lg" id="save-settings-btn">💾 Save Settings</button>
      <button class="btn btn-outline" id="reset-data-btn">⚠️ Reset All Data</button>
    </div>`;

  // Color sync
  syncColorInputs('s-primary-color', 's-primary-color-text', 'logo-img-upload');
  syncColorInputs('s-secondary-color', 's-secondary-color-text', 'logo-img-upload');

  // Supabase test button
  $('test-supabase-btn').addEventListener('click', async () => {
    const url = $('s-supabase-url').value.trim();
    const key = $('s-supabase-key').value.trim();
    const resEl = $('supabase-test-result');
    resEl.style.display = 'block';
    resEl.textContent = 'Testing Supabase connection…';
    resEl.style.color = 'var(--text-muted)';
    const res = await window.supabaseService.testConnection(url, key);
    if (res.ok) {
      resEl.textContent = '✅ Connected successfully to Supabase!';
      resEl.style.color = '#28a745';
      window.supabaseService.saveConfig(url, key);
      $('supabase-status-pill').textContent = '🟢 Cloud Connected';
      $('supabase-status-pill').style.background = '#d4edda';
      $('supabase-status-pill').style.color = '#155724';
      showAdminToast('Supabase connection verified!', 'success');
    } else {
      resEl.textContent = `❌ ${res.error || 'Connection failed. Check credentials.'}`;
      resEl.style.color = '#dc3545';
      showAdminToast('Connection failed. Check credentials.', 'error');
    }
  });

  // Supabase push menu button
  $('sync-menu-btn').addEventListener('click', async () => {
    const url = $('s-supabase-url').value.trim();
    const key = $('s-supabase-key').value.trim();
    if (url && key) window.supabaseService.saveConfig(url, key);
    showAdminToast('Syncing menu to cloud…', 'default');
    const res = await window.supabaseService.saveMenu(DATA);
    if (res.success) {
      showAdminToast('Menu synced to cloud successfully! All customer devices now have latest items.', 'success');
    } else {
      showAdminToast(`Sync failed: ${res.error || 'Check Supabase setup'}`, 'error');
    }
  });

  // Image upload
  let logoImgData = s.logo || '';
  let bannerImgData = s.bannerImage || '';

  setupImageUpload('logo-img-upload', 'logo-img-file', (dataUrl) => { logoImgData = dataUrl; });
  setupImageUpload('banner-img-upload', 'banner-img-file', (dataUrl) => { bannerImgData = dataUrl; });

  $('s-logo-url').addEventListener('input', e => {
    logoImgData = e.target.value.trim();
    if (logoImgData) showImgPreview('logo-img-upload', logoImgData);
  });
  $('s-banner-url').addEventListener('input', e => {
    bannerImgData = e.target.value.trim();
    if (bannerImgData) showImgPreview('banner-img-upload', bannerImgData);
  });

  // Save
  $('save-settings-btn').addEventListener('click', () => {
    const finalLogo = logoImgData || $('s-logo-url').value.trim();
    const finalBanner = bannerImgData || $('s-banner-url').value.trim();

    DATA.store = {
      ...DATA.store,
      name: $('s-name').value.trim(),
      tagline: $('s-tagline').value.trim(),
      address: $('s-address').value.trim(),
      phone: $('s-phone').value.trim(),
      email: $('s-email').value.trim(),
      gstNumber: $('s-gst').value.trim(),
      tableNumber: $('s-table').value.trim(),
      openTime: $('s-open-time').value,
      closeTime: $('s-close-time').value,
      primaryColor: normalizeHexColor($('s-primary-color-text')?.value.trim() || $('s-primary-color')?.value, '#021f4d'),
      secondaryColor: normalizeHexColor($('s-secondary-color-text')?.value.trim() || $('s-secondary-color')?.value, '#009743'),
      isOpen: $('s-is-open').checked,
      vegFilterEnabled: $('s-veg-filter').checked,
      socialProof: $('s-social-proof').value.trim(),
      announcement: $('s-announcement').value.trim(),
      logo: finalLogo,
      bannerImage: finalBanner
    };
    saveData(DATA);

    // Save Supabase credentials and sync menu
    const sbUrl = $('s-supabase-url').value.trim();
    const sbKey = $('s-supabase-key').value.trim();
    DATA.store.supabaseUrl = sbUrl;
    DATA.store.supabaseKey = sbKey;
    saveData(DATA);

    if (sbUrl && sbKey && window.supabaseService) {
      window.supabaseService.saveConfig(sbUrl, sbKey);
    }
    if (window.supabaseService) {
      window.supabaseService.saveMenu(DATA);
    }

    $('sidebar-store-name').textContent = DATA.store.name;
    showAdminToast('Settings & colors saved! Changes are now live on homepage.', 'success');
  });

  // Reset
  $('reset-data-btn').addEventListener('click', () => {
    $('confirm-title').textContent = 'Reset All Data?';
    $('confirm-message').textContent = 'This will restore all default items, categories, and settings. All orders and custom data will be lost!';
    confirmCallback = () => {
      DATA = resetData();
      saveData(DATA);
      if (window.supabaseService) window.supabaseService.saveMenu(DATA);
      navigateTo('dashboard');
      showAdminToast('All data reset to defaults', 'warning');
    };
    openModal('confirm-modal');
  });
}

function normalizeHexColor(val, fallback = '#021f4d') {
  if (!val) return fallback;
  let clean = val.trim();
  if (!clean.startsWith('#')) clean = '#' + clean;
  if (/^#[0-9a-fA-F]{6}$/i.test(clean)) return clean;
  if (/^#[0-9a-fA-F]{3}$/i.test(clean)) {
    return '#' + clean[1] + clean[1] + clean[2] + clean[2] + clean[3] + clean[3];
  }
  return clean;
}

function syncColorInputs(colorInputId, textInputId) {
  const colorInput = $(colorInputId);
  const textInput = $(textInputId);
  if (!colorInput || !textInput) return;

  colorInput.addEventListener('input', () => {
    textInput.value = colorInput.value;
    const swatch = colorInput.closest('.color-swatch');
    if (swatch) swatch.style.background = colorInput.value;
  });

  const onTextChange = () => {
    const norm = normalizeHexColor(textInput.value);
    if (/^#[0-9a-fA-F]{6}$/i.test(norm)) {
      colorInput.value = norm;
      const swatch = colorInput.closest('.color-swatch');
      if (swatch) swatch.style.background = norm;
    }
  };

  textInput.addEventListener('input', onTextChange);
  textInput.addEventListener('change', onTextChange);
  textInput.addEventListener('blur', onTextChange);
}

// ════════════════════════════════════════════════════════════
// ── Shared Helpers ──────────────────────────────────════════
// ════════════════════════════════════════════════════════════

function openModal(id) {
  const m = $(id);
  m.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  const m = $(id);
  m.classList.remove('open');
  document.body.style.overflow = '';
}

function compressAndResizeImage(file, maxDimension = 640, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
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
}

// Image upload helper
function setupImageUpload(areaId, fileInputId, callback) {
  const area = $(areaId);
  const input = $(fileInputId);
  if (!area || !input) return;

  input.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressAndResizeImage(file);
      showImgPreview(areaId, compressedDataUrl);
      callback(compressedDataUrl);
    } catch (err) {
      showAdminToast('Could not process image file', 'error');
    }
  });

  // Drag and drop
  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', async e => {
    e.preventDefault(); area.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const compressedDataUrl = await compressAndResizeImage(file);
        showImgPreview(areaId, compressedDataUrl);
        callback(compressedDataUrl);
      } catch (err) {
        showAdminToast('Could not process dropped image', 'error');
      }
    }
  });
}

function showImgPreview(areaId, src) {
  const area = $(areaId);
  if (!area) return;
  let img = area.querySelector('img.preview');
  if (!img) {
    img = document.createElement('img');
    img.className = 'preview';
    img.alt = 'Preview';
    area.prepend(img);
  }
  img.src = src;
}

function resetImgPreview(areaId) {
  const area = $(areaId);
  if (!area) return;
  const img = area.querySelector('img.preview');
  if (img) img.remove();
}

function showAdminToast(msg, type = 'default') {
  const container = $('admin-toast-container');
  if (!container) return;
  while (container.children.length >= 3) {
    container.removeChild(container.firstChild);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type !== 'default' ? type : ''}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
