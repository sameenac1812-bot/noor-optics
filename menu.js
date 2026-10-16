/* ════════════════════════════════════════════════════════════
   menu.js – Customer-facing menu logic
   ════════════════════════════════════════════════════════════ */

'use strict';

// ── State ───────────────────────────────────────────────────
let DATA = loadData();
let cart = [];
let activeCategory = null;
let vegOnly = false;
let activeFilter = 'all';
let searchQuery = '';
let modalItem = null;
let modalQty = 1;
let selectedCustomizations = [];
let serviceMode = 'dine-in';
let scrollLocked = false;

// ── DOM refs ─────────────────────────────────────────────────
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

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
window.escHtml = escHtml;

// ── Preload Menu Images ───────────────────────────────────────
function preloadAllMenuImages() {
  if (!DATA || !DATA.items) return;
  const urls = [...new Set(DATA.items.map(i => i.image).filter(Boolean))];
  const preload = () => {
    urls.forEach(url => {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    });
  };
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(preload, { timeout: 800 });
  } else {
    setTimeout(preload, 50);
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  renderStoreInfo();
  renderCategoryNav();
  renderMenuSections();
  setupEventListeners();
  setupScrollSpy();
  updateCartBar();
  preloadAllMenuImages();

  // Multi-tab sync & Supabase cloud sync
  if (window.supabaseService) {
    window.supabaseService.onMenuUpdate(updatedData => {
      if (updatedData) {
        if (updatedData.store) DATA.store = { ...DATA.store, ...updatedData.store };
        if (updatedData.items && updatedData.items.length > 0) DATA.items = updatedData.items;
        if (updatedData.categories && updatedData.categories.length > 0) DATA.categories = updatedData.categories;
        saveData(DATA);
        applyTheme();
        renderStoreInfo();
        renderCategoryNav();
        renderMenuSections();
      }
    });

    window.supabaseService.onStoreUpdate(updatedStore => {
      if (updatedStore) {
        DATA.store = { ...DATA.store, ...updatedStore };
        saveData(DATA);
        applyTheme();
        renderStoreInfo();
      }
    });

    window.supabaseService.fetchMenu().then(cloudMenu => {
      if (cloudMenu) {
        if (cloudMenu.store) DATA.store = { ...DATA.store, ...cloudMenu.store };
        if (cloudMenu.items && cloudMenu.items.length > 0) DATA.items = cloudMenu.items;
        if (cloudMenu.categories && cloudMenu.categories.length > 0) DATA.categories = cloudMenu.categories;
        saveData(DATA);
        applyTheme();
        renderStoreInfo();
        renderCategoryNav();
        renderMenuSections();
      }
    }).catch(() => {});

    window.supabaseService.fetchOrders().then(cloudOrders => {
      if (Array.isArray(cloudOrders) && cloudOrders.length > 0) {
        DATA.orders = DATA.orders || [];
        const existingIds = new Set(DATA.orders.map(o => String(o.id || o.tokenId)));
        let updated = false;
        cloudOrders.forEach(co => {
          const key = String(co.id || co.tokenId);
          if (!existingIds.has(key)) {
            DATA.orders.push(co);
            existingIds.add(key);
            updated = true;
          }
        });
        if (updated) {
          saveData(DATA);
          if (typeof savePermanentOrders === 'function') savePermanentOrders(DATA.orders);
        }
      }
    }).catch(() => {});
  }

  // Cross-tab storage & tab-focus sync
  const refreshFromLocal = () => {
    DATA = loadData();
    applyTheme();
    renderStoreInfo();
    renderCategoryNav();
    renderMenuSections();
  };

  window.addEventListener('storage', e => {
    if (e.key === 'restaurantData') refreshFromLocal();
  });
  window.addEventListener('focus', refreshFromLocal);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshFromLocal();
  });

  // Populate customer name, phone, and table number from storage or URL
  const initCustomerFields = () => {
    const savedName = localStorage.getItem('sattva_customer_name') || '';
    const savedPhone = localStorage.getItem('sattva_customer_phone') || '';
    const savedTable = localStorage.getItem('sattva_customer_table') || '';
    if ($('customer-name-input') && !$('customer-name-input').value && savedName) {
      $('customer-name-input').value = savedName;
    }
    if ($('customer-phone-input') && !$('customer-phone-input').value && savedPhone) {
      $('customer-phone-input').value = savedPhone;
    }
    if ($('customer-table-input')) {
      const urlParams = new URLSearchParams(window.location.search);
      const tableFromUrl = urlParams.get('table') || urlParams.get('t');
      if (!$('customer-table-input').value) {
        $('customer-table-input').value = tableFromUrl || savedTable || DATA.store.tableNumber || '';
      }
    }
  };
  initCustomerFields();

  // Enforce numbers-only on phone input (max 10 digits)
  const phoneInputEl = $('customer-phone-input');
  if (phoneInputEl) {
    phoneInputEl.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
  }

  // Prevent any horizontal drift or shift on mobile scroll
  window.addEventListener('scroll', () => {
    if (window.scrollX !== 0) {
      window.scrollTo(0, window.scrollY);
    }
  }, { passive: true });
});

// ── Apply theme from store data ───────────────────────────────
function isColorLight(hex) {
  try {
    const c = (hex || '').replace('#', '').trim();
    if (!c) return false;
    const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
    const num = parseInt(full, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
    return hsp > 160;
  } catch {
    return false;
  }
}

function applyTheme() {
  const s = DATA.store || {};
  const root = document.documentElement;
  const primary = s.primaryColor || '#021f4d';
  const secondary = s.secondaryColor || '#009743';
  const accent = s.accentColor || '#FFC107';

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--secondary', secondary);
  root.style.setProperty('--accent', accent);

  const light = isColorLight(primary);
  root.style.setProperty('--primary-text', light ? '#1f2937' : '#ffffff');
  root.style.setProperty('--primary-muted', light ? '#6b7280' : 'rgba(255,255,255,0.78)');
  root.style.setProperty('--primary-border', light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)');

  // Derived colors
  root.style.setProperty('--primary-light', lightenColor(primary, 15));
  root.style.setProperty('--secondary-light', lightenColor(secondary, 15));
}

function lightenColor(hex, amount) {
  try {
    const num = parseInt((hex || '').replace('#',''), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
  } catch { return hex; }
}

// ── Render store header / hero ────────────────────────────────
function renderStoreInfo() {
  const s = DATA.store;
  document.title = s.name + ' – Menu';
  $('store-name-text').textContent = s.name;
  $('store-tagline-text').textContent = s.tagline;
  if ($('table-info')) $('table-info').textContent = 'Table ' + (s.tableNumber || 'T-12');
  if ($('social-proof-text')) $('social-proof-text').textContent = s.socialProof || '';
  if ($('announcement-text')) $('announcement-text').textContent = s.announcement || '';
  if ($('announcement-bar') && !s.announcement) $('announcement-bar').style.display = 'none';

  // Logo
  const logoEl = $('store-logo-img');
  if (logoEl) {
    if (s.logo) {
      logoEl.innerHTML = `<img src="${s.logo}" alt="${s.name} logo" />`;
    } else {
      logoEl.textContent = s.name.charAt(0);
    }
  }

  // Hero image
  const heroWrap = $('hero-image-wrap');
  if (heroWrap && s.bannerImage) {
    const img = document.createElement('img');
    img.src = s.bannerImage;
    img.alt = s.name + ' banner';
    img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;';
    heroWrap.prepend(img);
  }

  // Open/closed status
  const badge = $('store-open-badge');
  const statusText = $('open-status-text');
  if (badge && statusText) {
    if (s.isOpen) {
      statusText.textContent = 'Open Now';
      badge.classList.remove('closed');
    } else {
      statusText.textContent = 'Closed';
      badge.classList.add('closed');
    }
  }

  // Store info modal
  renderInfoModal();
}

function renderInfoModal() {
  const s = DATA.store;
  $('info-modal-body').innerHTML = `
    <div class="info-row"><span class="info-icon">📍</span><div class="info-content"><div class="info-label">Address</div><div class="info-value">${s.address || '—'}</div></div></div>
    <div class="info-row"><span class="info-icon">✉️</span><div class="info-content"><div class="info-label">Email</div><div class="info-value">${s.email || '—'}</div></div></div>
    <div class="info-row"><span class="info-icon">🕐</span><div class="info-content"><div class="info-label">Hours</div><div class="info-value">${s.openTime || '10:00'} – ${s.closeTime || '22:00'}</div></div></div>
    <div class="info-row"><span class="info-icon">🏷️</span><div class="info-content"><div class="info-label">GSTIN</div><div class="info-value">${s.gstNumber || '—'}</div></div></div>
    <div class="info-row"><span class="info-icon">💳</span><div class="info-content"><div class="info-label">Payments</div><div class="info-value">UPI · Cards · Cash</div></div></div>
  `;
}

// ── Smooth & Fast Scroll Animation Helper ─────────────────────
let smoothScrollAnimationId = null;

function fastSmoothScrollTo(targetY, duration = 280) {
  if (smoothScrollAnimationId) {
    cancelAnimationFrame(smoothScrollAnimationId);
    smoothScrollAnimationId = null;
  }

  const startY = window.scrollY || window.pageYOffset;
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) {
    window.scrollTo(0, targetY);
    return;
  }

  let startTime = null;
  scrollLocked = true;

  // Snappy quartic ease-out curve (fast acceleration, feather-smooth glide)
  const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = easeOutQuart(progress);

    window.scrollTo(0, Math.round(startY + distance * easeProgress));

    if (progress < 1) {
      smoothScrollAnimationId = requestAnimationFrame(step);
    } else {
      smoothScrollAnimationId = null;
      scrollLocked = false;
    }
  }

  smoothScrollAnimationId = requestAnimationFrame(step);
}

// Cancel programmatic smooth scroll instantly if user touches screen or uses mouse wheel
if (typeof window !== 'undefined') {
  ['wheel', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (smoothScrollAnimationId) {
        cancelAnimationFrame(smoothScrollAnimationId);
        smoothScrollAnimationId = null;
        scrollLocked = false;
      }
    }, { passive: true });
  });
}

// ── Render Category Nav ───────────────────────────────────────
function renderCategoryNav() {
  const cats = getVisibleCategories();
  const nav = $('category-nav-inner');
  nav.innerHTML = cats.map(cat => `
    <button class="cat-nav-btn" data-cat="${cat.id}" role="listitem" aria-label="${cat.name}">
      <div class="cat-nav-thumb">
        ${cat.image ? `<img src="${cat.image}" alt="${cat.name}" loading="lazy" decoding="async"/>` : `<span>${cat.icon || '🍽️'}</span>`}
      </div>
      <span>${getCategoryDisplayName(cat)}</span>
    </button>
  `).join('');

  nav.querySelectorAll('.cat-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.dataset.cat;
      const section = document.getElementById('section-' + catId);
      if (section) {
        const offset = $('store-header').offsetHeight + $('category-nav').offsetHeight + 8;
        const y = section.getBoundingClientRect().top + window.scrollY - offset;
        setActiveCategory(catId);
        fastSmoothScrollTo(Math.max(0, y), 280);
      }
    });
  });

  if (cats.length > 0) setActiveCategory(cats[0].id);
}

let activeCategoryRafId = null;
function setActiveCategory(id) {
  if (activeCategory === id) return;
  activeCategory = id;
  $$('.cat-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === id);
  });

  // Batch nav scroll into requestAnimationFrame to prevent forced synchronous reflow
  if (activeCategoryRafId) cancelAnimationFrame(activeCategoryRafId);
  activeCategoryRafId = requestAnimationFrame(() => {
    const navInner = $('category-nav-inner');
    const activeBtn = document.querySelector(`.cat-nav-btn[data-cat="${id}"]`);
    if (activeBtn && navInner) {
      const navRect = navInner.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const currentScroll = navInner.scrollLeft;
      const targetScroll = currentScroll + (btnRect.left - navRect.left) - (navInner.clientWidth / 2) + (btnRect.width / 2);
      navInner.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  });
}

// ── Menu Sections Event Delegation ────────────────────────────
let menuContainerDelegated = false;
function setupMenuSectionsDelegation() {
  const container = $('menu-sections');
  if (!container || menuContainerDelegated) return;
  menuContainerDelegated = true;

  container.addEventListener('click', e => {
    // 1. Quantity minus button
    const minusBtn = e.target.closest('.item-qty-minus');
    if (minusBtn) {
      e.stopPropagation();
      const itemId = minusBtn.dataset.itemId;
      if (itemId) updateCartQty(itemId, -1);
      return;
    }

    // 2. Quantity plus button
    const plusBtn = e.target.closest('.item-qty-plus');
    if (plusBtn) {
      e.stopPropagation();
      const itemId = plusBtn.dataset.itemId;
      if (itemId) updateCartQty(itemId, +1);
      return;
    }

    // 3. Quick-add button
    const quickAddBtn = e.target.closest('.quick-add-btn');
    if (quickAddBtn) {
      e.stopPropagation();
      const itemId = quickAddBtn.dataset.itemId;
      const item = getItem(itemId);
      if (!item) return;
      const customs = getCustomizations(item);
      if (customs.length > 0) {
        openItemModal(itemId);
      } else {
        addToCart(itemId, 1, []);
        animateAddToCart(quickAddBtn);
      }
      return;
    }

    // 4. Click anywhere on card (opens detail / customization options)
    const card = e.target.closest('.item-card');
    if (card && !card.classList.contains('unavailable')) {
      openItemModal(card.dataset.itemId);
    }
  });
}

// ── Render Menu Sections ──────────────────────────────────────
function renderMenuSections() {
  const cats = getVisibleCategories();
  const container = $('menu-sections');
  container.innerHTML = '';
  setupMenuSectionsDelegation();

  let hasResults = false;

  cats.forEach(cat => {
    const items = getItemsForCategory(cat.id);
    if (items.length === 0) return;
    hasResults = true;

    const section = document.createElement('section');
    section.className = 'menu-section';
    section.id = 'section-' + cat.id;
    section.setAttribute('aria-labelledby', 'cat-title-' + cat.id);
    section.innerHTML = `
      <div class="section-header">
        <span class="section-icon">${cat.icon || '🍽️'}</span>
        <div class="section-title-wrap">
          <h2 class="section-title" id="cat-title-${cat.id}">${getCategoryDisplayName(cat)}</h2>
          ${cat.description ? `<p class="section-desc">${cat.description}</p>` : ''}
        </div>
        <span class="section-count">${items.length}</span>
      </div>
      <div class="item-list" id="item-list-${cat.id}">
        ${items.map(item => renderItemCard(item)).join('')}
      </div>
    `;
    container.appendChild(section);
  });

  if (!hasResults) {
    container.innerHTML = `
      <div class="empty-state" style="padding:64px 24px">
        <div class="empty-state-icon">🔍</div>
        <h3>No items found</h3>
        <p>Try a different search or filter</p>
      </div>`;
  }

  // Update search results banner
  if (searchQuery) {
    const total = container.querySelectorAll('.item-card').length;
    $('search-results-banner').classList.remove('hidden');
    $('search-results-text').textContent = `${total} result${total !== 1 ? 's' : ''} for "${searchQuery}"`;
  } else {
    $('search-results-banner').classList.add('hidden');
  }
}

function renderItemCard(item) {
  const cartEntry = cart.find(e => e.itemId === item.id);
  const inCart = cartEntry ? cartEntry.qty : 0;
  const saving = item.originalPrice > item.price ? (item.originalPrice - item.price) : 0;
  const customs = getCustomizations(item);
  const isCustomizable = customs.length > 0;
  const imgHtml = item.image
    ? `<img class="item-card-img" src="${item.image}" alt="${item.name}" decoding="async" />`
    : `<div class="item-card-img-placeholder">🥪</div>`;

  const addControl = inCart > 0
    ? `<div class="qty-control">
        <button class="qty-btn item-qty-minus" data-item-id="${item.id}" aria-label="Remove">−</button>
        <span class="qty-count">${inCart}</span>
        <button class="qty-btn item-qty-plus" data-item-id="${item.id}" aria-label="Add">+</button>
      </div>`
    : `<button class="add-btn quick-add-btn" data-item-id="${item.id}" aria-label="Add ${item.name}">ADD +</button>`;

  return `
    <div class="item-card${!item.isAvailable ? ' unavailable' : ''}" data-item-id="${item.id}" role="article" aria-label="${item.name}">
      <div class="item-card-body">
        <div class="item-card-tags">
          <span class="veg-dot ${item.isVeg ? 'veg' : 'non-veg'}" title="${item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}"></span>
          ${item.isBestseller ? '<span class="item-bestseller-badge">🔥 Bestseller</span>' : ''}
          ${item.isNew ? '<span class="item-new-badge">✨ New</span>' : ''}
        </div>
        <p class="item-card-name">${item.name}</p>
        <div class="item-card-footer">
          <div class="item-card-price-group">
            <span class="price">${DATA.store.currency}${item.price}</span>
            ${item.originalPrice > item.price ? `<span class="price-original">${DATA.store.currency}${item.originalPrice}</span>` : ''}
            ${saving > 0 ? `<span class="price-savings">Save ${DATA.store.currency}${saving}</span>` : ''}
          </div>
        </div>
        ${item.description ? `<p class="item-card-desc">${item.description}</p>` : ''}
      </div>
      <div class="item-card-img-wrap">
        <div class="item-card-img-box">
          ${imgHtml}
          ${!item.isAvailable ? '<span class="unavailable-tag">Out of Stock</span>' : ''}
        </div>
        <div class="add-btn-wrap">
          ${addControl}
        </div>
      </div>
    </div>`;
}

// ── Filtering logic ───────────────────────────────────────────
function getVisibleCategories() {
  return DATA.categories
    .slice()
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .filter(cat => {
      const items = getItemsForCategory(cat.id);
      return items.length > 0;
    });
}

function getItemsForCategory(catId) {
  return DATA.items
    .filter(item => {
      if (item.categoryId !== catId) return false;
      if (vegOnly && !item.isVeg) return false;
      if (activeFilter === 'bestseller' && !item.isBestseller) return false;
      if (activeFilter === 'new' && !item.isNew) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inName = item.name.toLowerCase().includes(q);
        const inDesc = item.description ? item.description.toLowerCase().includes(q) : false;
        const inTags = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(q));
        if (!inName && !inDesc && !inTags) return false;
      }
      return true;
    })
    .sort((a, b) => (a.position || 0) - (b.position || 0));
}

function getItem(id) {
  return DATA.items.find(i => i.id === id);
}

// ── Scroll Spy ────────────────────────────────────────────────
let scrollSpyObserver = null;
function setupScrollSpy() {
  if (typeof IntersectionObserver === 'undefined') return;
  if (scrollSpyObserver) {
    scrollSpyObserver.disconnect();
  }
  scrollSpyObserver = new IntersectionObserver(entries => {
    if (scrollLocked) return;
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id.replace('section-', '');
        setActiveCategory(id);
      }
    });
  }, {
    rootMargin: '-25% 0px -65% 0px',
    threshold: 0
  });

  document.querySelectorAll('.menu-section').forEach(sec => scrollSpyObserver.observe(sec));
}

// ── Event Listeners ───────────────────────────────────────────
function setupEventListeners() {
  // Search toggle
  $('search-toggle-btn').addEventListener('click', toggleSearch);
  $('search-input').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    $('search-clear-btn').classList.toggle('visible', searchQuery.length > 0);
    renderMenuSections();
    setupScrollSpy();
  });
  $('search-clear-btn').addEventListener('click', () => {
    $('search-input').value = '';
    searchQuery = '';
    $('search-clear-btn').classList.remove('visible');
    renderMenuSections();
    setupScrollSpy();
  });
  $('clear-search-btn')?.addEventListener('click', () => {
    $('search-input').value = '';
    searchQuery = '';
    $('search-clear-btn').classList.remove('visible');
    $('search-bar-wrap').classList.remove('open');
    renderMenuSections();
    setupScrollSpy();
  });

  // Veg filter
  $('veg-filter').addEventListener('change', e => {
    vegOnly = e.target.checked;
    renderMenuSections(); setupScrollSpy();
  });
  if (!DATA.store.vegFilterEnabled) {
    $('veg-filter-wrap').style.display = 'none';
  }

  // Filter pills
  $$('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      $$('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter;
      renderMenuSections(); setupScrollSpy();
    });
  });

  // Service mode
  $$('.mode-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      $$('.mode-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      serviceMode = pill.dataset.mode;
    });
  });

  // Cart bar & modal
  $('open-cart-btn').addEventListener('click', openCartModal);
  $('cart-modal-close').addEventListener('click', closeCartModal);
  $('cart-add-more-btn')?.addEventListener('click', closeCartModal);
  $('cart-modal').addEventListener('click', e => { if (e.target === $('cart-modal')) closeCartModal(); });

  // Dishes customization options toggle delegation
  $('customization-options')?.addEventListener('change', e => {
    const cb = e.target.closest('input[type="checkbox"]');
    if (!cb) return;
    const val = cb.value;
    if (cb.checked) {
      if (!selectedCustomizations.includes(val)) selectedCustomizations.push(val);
    } else {
      selectedCustomizations = selectedCustomizations.filter(v => v !== val);
    }
    const optLabel = cb.closest('.customization-option');
    if (optLabel) optLabel.classList.toggle('selected', cb.checked);
  });

  // Item modal
  $('item-modal-close').addEventListener('click', closeItemModal);
  $('item-modal').addEventListener('click', e => { if (e.target === $('item-modal')) closeItemModal(); });
  $('modal-qty-minus').addEventListener('click', () => {
    if (modalQty > 1) { modalQty--; updateModalQty(); }
  });
  $('modal-qty-plus').addEventListener('click', () => {
    modalQty++; updateModalQty();
  });
  $('modal-add-btn').addEventListener('click', () => {
    if (!modalItem) return;
    const chosen = selectedCustomizations.join(', ');
    addToCart(modalItem.id, modalQty, selectedCustomizations);
    closeItemModal();
    showToast(`${modalItem.name} added to cart!`, 'success');
  });

  // Info modal
  $('info-btn').addEventListener('click', () => openModal('info-modal'));
  $('info-modal-close').addEventListener('click', () => closeModal('info-modal'));
  $('info-modal').addEventListener('click', e => { if (e.target === $('info-modal')) closeModal('info-modal'); });

  // Place order
  $('place-order-btn').addEventListener('click', placeOrder);

  // Payment method selection (Cash or UPI)
  $$('.payment-option-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      $$('.payment-option-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // Order success done
  $('order-success-done').addEventListener('click', () => {
    closeModal('order-success-modal');
  });

  // Keyboard Esc
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if ($('item-modal').classList.contains('open')) closeItemModal();
      else if ($('cart-modal').classList.contains('open')) closeCartModal();
      else if ($('info-modal').classList.contains('open')) closeModal('info-modal');
    }
  });
}

function toggleSearch() {
  const wrap = $('search-bar-wrap');
  const isOpen = wrap.classList.toggle('open');
  if (isOpen) $('search-input').focus();
  else {
    $('search-input').value = '';
    searchQuery = '';
    renderMenuSections(); setupScrollSpy();
  }
}

// ── Modal helpers ────────────────────────────────────────────
function openModal(id) {
  const modal = $(id);
  if (modal) modal.classList.add('open');
  if (document.body) document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  const modal = $(id);
  if (modal) modal.classList.remove('open');
  const anyOpen = document.querySelectorAll('.modal-backdrop.open');
  if (anyOpen.length === 0 && document.body) {
    document.body.style.overflow = '';
  }
}
function closeCartModal() { closeModal('cart-modal'); }
function closeItemModal() { closeModal('item-modal'); modalItem = null; }

// ── Item modal ────────────────────────────────────────────────
function openItemModal(itemId) {
  const item = getItem(itemId);
  if (!item) return;
  modalItem = item;
  modalQty = 1;
  selectedCustomizations = [];

  // Image
  const imgEl = $('item-modal-img');
  const placeholder = $('item-modal-img-placeholder');
  if (item.image) {
    imgEl.decoding = 'async';
    imgEl.src = item.image;
    imgEl.alt = item.name;
    imgEl.classList.remove('hidden');
    placeholder.classList.add('hidden');
  } else {
    imgEl.classList.add('hidden');
    placeholder.classList.remove('hidden');
  }

  // Badges / veg
  $('item-modal-veg-dot').className = `veg-dot ${item.isVeg ? 'veg' : 'non-veg'}`;
  const badges = [];
  if (item.isBestseller) badges.push('<span class="item-bestseller-badge">🔥 Bestseller</span>');
  if (item.isNew) badges.push('<span class="item-new-badge">✨ New</span>');
  $('item-modal-badges').innerHTML = badges.join('');

  $('item-modal-title').textContent = item.name;
  $('item-modal-desc').textContent = item.description || '';
  $('item-modal-price').textContent = DATA.store.currency + item.price;

  if (item.originalPrice > item.price) {
    $('item-modal-original-price').textContent = DATA.store.currency + item.originalPrice;
    $('item-modal-savings').textContent = `Save ${DATA.store.currency}${item.originalPrice - item.price}`;
  } else {
    $('item-modal-original-price').textContent = '';
    $('item-modal-savings').textContent = '';
  }

  // Customizations / Extras (Instant generation & delegated handling)
  const custSection = $('customization-section');
  const custOpts = $('customization-options');
  const customs = getCustomizations(item);
  if (customs.length > 0) {
    custSection.style.display = 'block';
    custOpts.innerHTML = customs.map((opt, i) => `
      <label class="customization-option" id="cust-opt-${i}">
        <input type="checkbox" value="${escHtml(opt)}" data-cust="${escHtml(opt)}" ${selectedCustomizations.includes(opt) ? 'checked' : ''} />
        <span class="customization-option-label">${escHtml(opt)}</span>
      </label>
    `).join('');
  } else {
    custSection.style.display = 'none';
    custOpts.innerHTML = '';
  }

  updateModalQty();
  openModal('item-modal');
}

function updateModalQty() {
  $('modal-qty-count').textContent = modalQty;
  if (modalItem) {
    $('modal-add-price').textContent = DATA.store.currency + (modalItem.price * modalQty);
  }
  $('modal-qty-minus').disabled = modalQty <= 1;
}

// ── Cart logic ───────────────────────────────────────────────
function addToCart(itemId, qty, customizations) {
  const item = getItem(itemId);
  if (!item) return;

  const key = itemId + (customizations.length ? ':' + customizations.join(',') : '');
  const existing = cart.find(e => e.key === key);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ key, itemId, qty, customizations: [...customizations], item });
  }
  updateCartBar();
  updateInlineCartQty(itemId);
}

function updateCartQty(itemId, delta) {
  const entries = cart.filter(e => e.itemId === itemId);
  if (entries.length === 0 && delta > 0) {
    addToCart(itemId, 1, []);
    return;
  }
  const entry = entries[entries.length - 1];
  if (!entry) return;
  entry.qty += delta;
  if (entry.qty <= 0) {
    cart = cart.filter(e => e.key !== entry.key);
  }
  updateCartBar();
  updateInlineCartQty(itemId);
}

function updateInlineCartQty(itemId) {
  const totalQty = cart.filter(e => e.itemId === itemId).reduce((s, e) => s + e.qty, 0);
  const listItems = document.querySelectorAll(`[data-item-id="${itemId}"]`);
  listItems.forEach(card => {
    if (card.classList.contains('item-card')) {
      const wrap = card.querySelector('.add-btn-wrap');
      if (!wrap) return;
      const item = getItem(itemId);

      if (totalQty > 0) {
        wrap.innerHTML = `
          <div class="qty-control">
            <button class="qty-btn item-qty-minus" data-item-id="${itemId}">−</button>
            <span class="qty-count">${totalQty}</span>
            <button class="qty-btn item-qty-plus" data-item-id="${itemId}">+</button>
          </div>`;
      } else {
        wrap.innerHTML = `
          <button class="add-btn quick-add-btn" data-item-id="${itemId}" aria-label="Add ${escHtml(item?.name || '')}">ADD +</button>`;
      }
    }
  });
}

function animateAddToCart(btn) {
  btn.style.transform = 'scale(1.3)';
  setTimeout(() => { btn.style.transform = ''; }, 200);
}

function updateCartBar() {
  const totalQty = cart.reduce((s, e) => s + (e.qty || 0), 0);
  const subtotal = cart.reduce((s, e) => {
    const it = e.item || (typeof getItem === 'function' ? getItem(e.itemId) : null) || {};
    return s + (Number(it.price || 0) * Number(e.qty || 1));
  }, 0);
  const bar = $('cart-bar');
  const badge = $('cart-count-badge');
  if (badge) badge.textContent = totalQty;
  const barTotal = $('cart-bar-total');
  if (barTotal) barTotal.textContent = (DATA?.store?.currency || '₹') + subtotal;
  if (bar) {
    if (totalQty > 0) bar.classList.remove('hidden');
    else bar.classList.add('hidden');
  }
  if (document.body) {
    if (totalQty > 0) document.body.classList.add('has-cart');
    else document.body.classList.remove('has-cart');
  }
}

function openCartModal() {
  renderCart();
  const savedName = localStorage.getItem('sattva_customer_name') || '';
  const savedPhone = localStorage.getItem('sattva_customer_phone') || '';
  if ($('customer-name-input') && !$('customer-name-input').value && savedName) {
    $('customer-name-input').value = savedName;
  }
  if ($('customer-phone-input') && !$('customer-phone-input').value && savedPhone) {
    $('customer-phone-input').value = savedPhone;
  }
  openModal('cart-modal');
}

function renderCart() {
  const wrap = $('cart-items-wrap');
  const countBadge = $('cart-modal-count-badge');
  const stickyBottom = $('cart-sticky-bottom');
  const sectionTitle = $('cart-section-title');
  const totalQty = cart.reduce((s, e) => s + (e.qty || 0), 0);

  if (countBadge) {
    countBadge.textContent = totalQty === 1 ? '1 item' : `${totalQty} items`;
  }

  if (cart.length === 0) {
    wrap.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Add delicious items from the menu to get started</p>
      </div>`;
    if ($('cart-footer')) $('cart-footer').style.display = 'none';
    if (stickyBottom) stickyBottom.style.display = 'none';
    if (sectionTitle) sectionTitle.style.display = 'none';
    return;
  }

  if ($('cart-footer')) $('cart-footer').style.display = '';
  if (stickyBottom) stickyBottom.style.display = '';
  if (sectionTitle) sectionTitle.style.display = 'flex';

  wrap.innerHTML = cart.map((entry, idx) => {
    const item = entry.item || getItem(entry.itemId) || {};
    const isPackshot = item.image && (
      item.image.includes('images/') ||
      item.image.includes('can') ||
      item.image.includes('bottle') ||
      item.image.includes('pet')
    );
    const imgHtml = item.image
      ? `<img src="${item.image}" alt="${escHtml(item.name || '')}" style="width:100%;height:100%;object-fit:${isPackshot ? 'contain' : 'cover'};background:#fff;" />`
      : '🍽️';
    const customizations = Array.isArray(entry.customizations) ? entry.customizations : [];
    const customizationsText = customizations.length
      ? `<div class="cart-item-customization">+ ${escHtml(customizations.join(', '))}</div>`
      : '';
    const unitPrice = item.price || 0;
    const lineTotal = unitPrice * entry.qty;

    return `
      <div class="cart-item" data-entry-idx="${idx}">
        <div class="cart-item-img">${imgHtml}</div>
        <div class="cart-item-body">
          <div class="cart-item-name">${escHtml(item.name || 'Menu Item')}</div>
          ${customizationsText}
          <div class="cart-item-meta-row">
            <div class="cart-item-price">${DATA.store.currency}${lineTotal}</div>
            <div class="cart-item-actions">
              <div class="qty-control">
                <button type="button" class="qty-btn cart-qty-minus" data-idx="${idx}" aria-label="Decrease quantity">−</button>
                <span class="qty-count">${entry.qty}</span>
                <button type="button" class="qty-btn cart-qty-plus" data-idx="${idx}" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="cart-item-remove-btn" data-idx="${idx}" title="Remove item" aria-label="Remove item">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');

  // Wire up quantity decrease
  wrap.querySelectorAll('.cart-qty-minus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = +btn.dataset.idx;
      if (!cart[idx]) return;
      const itemId = cart[idx].itemId;
      cart[idx].qty--;
      if (cart[idx].qty <= 0) {
        cart.splice(idx, 1);
        updateInlineCartQty(itemId);
      }
      updateCartBar();
      renderCart();
      updateInlineCartQty(itemId);
    });
  });

  // Wire up quantity increase
  wrap.querySelectorAll('.cart-qty-plus').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = +btn.dataset.idx;
      if (!cart[idx]) return;
      cart[idx].qty++;
      updateCartBar();
      renderCart();
      updateInlineCartQty(cart[idx].itemId);
    });
  });

  // Wire up item deletion
  wrap.querySelectorAll('.cart-item-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = +btn.dataset.idx;
      if (!cart[idx]) return;
      const itemId = cart[idx].itemId;
      cart.splice(idx, 1);
      updateCartBar();
      renderCart();
      updateInlineCartQty(itemId);
    });
  });

  updateCartSummary();
}

function updateCartSummary() {
  const subtotal = cart.reduce((s, e) => s + e.item.price * e.qty, 0);
  const total = subtotal;
  $('cart-subtotal').textContent = DATA.store.currency + subtotal;
  if ($('cart-gst')) $('cart-gst').textContent = DATA.store.currency + 0;
  $('cart-total').textContent = DATA.store.currency + total;
  $('place-order-total').textContent = DATA.store.currency + total;
}

// Function to generate the next unique 2-digit Token ID (01, 02, ..., 24, ...)
function getNextTokenId() {
  const todayStr = new Date().toISOString().slice(0, 10);
  let highestToken = 0;

  // 1. Scan DATA.orders for existing tokens/numeric IDs placed today
  if (Array.isArray(DATA.orders)) {
    for (const o of DATA.orders) {
      if (!o) continue;
      const oDate = o.timestamp ? o.timestamp.slice(0, 10) : todayStr;
      if (oDate === todayStr) {
        const val = o.tokenId || o.id;
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > highestToken && num < 10000) {
          highestToken = num;
        }
      }
    }
  }

  // 2. Cross-check with persistent localStorage token sequence
  const savedDate = localStorage.getItem('sattva_token_date');
  let savedToken = 0;
  if (savedDate === todayStr) {
    savedToken = parseInt(localStorage.getItem('sattva_last_token') || '0', 10);
    if (isNaN(savedToken)) savedToken = 0;
  }

  const nextNum = Math.max(highestToken, savedToken) + 1;
  const tokenId = String(nextNum).padStart(2, '0');

  localStorage.setItem('sattva_token_date', todayStr);
  localStorage.setItem('sattva_last_token', String(nextNum));

  return tokenId;
}

async function placeOrder() {
  try {
    if (!cart || cart.length === 0) {
      showToast('Your cart is empty', 'warning');
      return;
    }

    const nameInput = $('customer-name-input');
    const phoneInput = $('customer-phone-input');
    const tableInput = $('customer-table-input');

    let customerName = (nameInput?.value || '').trim();
    const rawPhone = (phoneInput?.value || '').trim();
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const tableNum = (tableInput?.value || '').trim() || DATA.store.tableNumber || 'T-1';

    // If phone is entered with fewer than 10 digits, inform user
    if (cleanPhone && cleanPhone.length < 10) {
      showToast('Please enter a valid 10-digit mobile number or leave blank', 'warning');
      if (phoneInput) {
        phoneInput.focus();
        phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!customerName) {
      customerName = 'Walk-in';
    }

    // Persist details for future orders
    if (customerName && customerName !== 'Walk-in') {
      localStorage.setItem('sattva_customer_name', customerName);
    }
    if (cleanPhone) {
      localStorage.setItem('sattva_customer_phone', cleanPhone);
    }
    if (tableNum) localStorage.setItem('sattva_customer_table', tableNum);

    const tokenId = getNextTokenId();
    const uniqueOrderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

    const validItems = cart.map(e => {
      const it = e.item || (typeof getItem === 'function' ? getItem(e.itemId) : null) || {};
      return {
        name: it.name || 'Menu Item',
        qty: Number(e.qty || 1),
        price: Number(it.price || 0),
        customizations: Array.isArray(e.customizations) ? e.customizations : (typeof getCustomizations === 'function' ? getCustomizations(it) : [])
      };
    });

    const subtotal = validItems.reduce((s, it) => s + (it.price * it.qty), 0);
    const total = subtotal;
    const specialInstructions = ($('special-instructions')?.value || '').trim();

    // Payment Method (Cash or UPI)
    let paymentMethod = 'cash';
    const checkedRadio = document.querySelector('input[name="order-payment-method"]:checked');
    if (checkedRadio && checkedRadio.value) {
      paymentMethod = checkedRadio.value.toLowerCase();
    }

    const order = {
      id: uniqueOrderId,
      tokenId: tokenId,
      customerName: customerName,
      customerPhone: cleanPhone,
      timestamp: new Date().toISOString(),
      serviceMode: typeof serviceMode !== 'undefined' ? serviceMode : 'dine-in',
      tableNumber: tableNum,
      paymentMethod,
      items: validItems,
      subtotal,
      gst: 0,
      total,
      specialInstructions,
      orderSource: 'website',
      status: 'placed'
    };

    // 1. Save in local store state & permanent vault
    DATA.orders = DATA.orders || [];
    DATA.orders.push(order);
    saveData(DATA);
    if (typeof savePermanentOrders === 'function') {
      savePermanentOrders(DATA.orders);
    }

    // 2. Save in Cloud Database & Broadcast (triggers POS print on counter)
    if (window.supabaseService && typeof window.supabaseService.saveOrder === 'function') {
      window.supabaseService.saveOrder(order);
    }

    // Show success modal
    closeCartModal();
    const payLabel = paymentMethod === 'upi' ? '📱 UPI (Pay at counter)' : '💵 Cash (Pay at counter)';
    const payBadgeBg = paymentMethod === 'upi' ? '#e8f0fe' : '#e6f4ea';
    const payBadgeColor = paymentMethod === 'upi' ? '#1a73e8' : '#137333';

    if ($('success-order-id')) {
      $('success-order-id').innerHTML = `
        <div style="margin:6px 0 10px 0">
          <span style="display:inline-block;background:#000000;color:#ffffff;font-size:1.25rem;font-weight:900;padding:6px 20px;border-radius:8px;letter-spacing:1px;box-shadow:0 3px 8px rgba(0,0,0,0.18)">
            TOKEN #${tokenId}
          </span>
        </div>
      `;
    }

    if ($('success-order-summary')) {
      $('success-order-summary').innerHTML = `
        <div style="background:#f8f9fa;padding:12px 14px;border-radius:10px;margin-bottom:12px;text-align:left;font-size:0.85rem">
          <div style="font-weight:800;color:var(--primary);margin-bottom:2px;font-size:0.95rem">
            <span style="color:#009743">Token #${tokenId}</span> · Table: ${escHtml(tableNum)}
          </div>
          <div style="font-size:0.8rem;color:#334155;margin-bottom:4px">
            👤 <strong>${escHtml(customerName)}</strong> · 📞 ${escHtml(cleanPhone)}
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px">Service: ${escHtml(order.serviceMode || 'Dine-in')}</div>
          <div style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:6px;background:${payBadgeBg};color:${payBadgeColor};font-weight:700;font-size:0.75rem">
            Payment: ${payLabel}
          </div>
        </div>
        <div style="text-align:left;font-size:0.85rem;line-height:1.6">
          <strong>Items ordered:</strong><br>
          ${validItems.map(i => `${i.qty}× ${escHtml(i.name)}${i.customizations && i.customizations.length ? ` <span style="color:#009743;font-size:0.75rem">(+ ${i.customizations.join(', ')})</span>` : ''} — ${DATA.store.currency}${i.price * i.qty}`).join('<br>')}
          <br><div style="border-top:1px dashed #ddd;margin-top:8px;padding-top:6px;font-size:1rem;font-weight:800;color:var(--primary)">Total: ${DATA.store.currency}${total}</div>
          ${specialInstructions ? `<div style="margin-top:6px;font-size:0.78rem;color:#856404;background:#fff8e6;padding:4px 8px;border-radius:4px">Note: ${escHtml(specialInstructions)}</div>` : ''}
        </div>
      `;
    }

    openModal('order-success-modal');

    // Clear cart
    cart = [];
    updateCartBar();
    renderMenuSections();
    setupScrollSpy();
  } catch (err) {
    console.error('[Menu] Order placement error:', err);
    showToast('Order error: ' + err.message, 'warning');
  }
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'default') {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type !== 'default' ? type : ''}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}
