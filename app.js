/**
 * app.js – Noor Optics Storefront Logic
 * High-performance vanilla JavaScript controller for product catalog,
 * facet filtering, real-time search, interactive drawers, and demo checkout.
 */

'use strict';

(function () {
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
            id.includes('mp4f2') || id.includes('5d89v');
          return !isLegacy;
        });
        localStorage.setItem('noor_custom_frames', JSON.stringify(cleaned));
      }
    }
  } catch (_) { }

  // ── Helper: Product Tombstones ───────────────────────────────────────────
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

  // ── Global Storefront State ────────────────────────────────────────────────
  const state = {
    catalog: [],
    isLoading: true,
    cart: window.getSavedCart ? window.getSavedCart() : [],
    wishlist: new Set(window.getSavedWishlist ? window.getSavedWishlist() : []),
    currentSort: 'featured',
    searchQuery: '',
    filters: {
      shape: 'all',
      material: 'all',
      fit: 'all',
      color: 'all',
      priceRange: 'all',
      gender: 'all',
      category: 'all',
      brand: 'all'
    },
    // Active product in Quick View
    quickViewProductId: null,
    selectedLensPackageId: 'lens-bluecut',
    selectedColorName: null
  };

  // ── DOM Element Cache ──────────────────────────────────────────────────────
  const DOM = {};

  // Helper: Normalize product image URL safely supporting local paths, remote CDN, and base64 Data URLs
  function formatProductImage(img) {
    if (!img) return '/images/frames/frame_01.jpg';
    if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://') || img.startsWith('/')) {
      return img;
    }
    return '/' + img;
  }

  function initDOMCache() {
    DOM.productGrid = document.getElementById('product-grid');
    DOM.catalogCount = document.getElementById('catalog-count');
    DOM.activeFilterChips = document.getElementById('active-filter-chips');
    DOM.shapePillsNav = document.getElementById('shape-pills-nav');

    // Header buttons
    DOM.btnSearchToggle = document.getElementById('btn-search-toggle');
    DOM.btnSortToggle = document.getElementById('btn-sort-toggle');
    DOM.btnFilterToggle = document.getElementById('btn-filter-toggle');
    DOM.btnWishlistToggle = document.getElementById('btn-wishlist-toggle');
    DOM.btnBagToggle = document.getElementById('btn-bag-toggle');

    // Mobile Header & Drawer Controls
    DOM.btnMobileMenu = document.getElementById('btn-mobile-menu');
    DOM.btnCloseMobileMenu = document.getElementById('btn-close-mobile-menu');
    DOM.mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
    DOM.btnMobileSort = document.getElementById('btn-mobile-sort');
    DOM.btnCloseSortSheet = document.getElementById('btn-close-sort-sheet');
    DOM.sortBottomSheet = document.getElementById('sort-bottom-sheet');
    DOM.sortSheetBackdrop = document.getElementById('sort-sheet-backdrop');
    DOM.btnMobileFilter = document.getElementById('btn-mobile-filter');
    DOM.mobileFilterCountBadge = document.getElementById('mobile-filter-count-badge');

    // Badge counts
    DOM.wishlistCountBadge = document.getElementById('wishlist-count-badge');
    DOM.bagCountBadge = document.getElementById('bag-count-badge');
    DOM.filterCountBadge = document.getElementById('filter-count-badge');

    // Search bar
    DOM.searchExpandBar = document.getElementById('search-expand-bar');
    DOM.searchInput = document.getElementById('search-main-input');
    DOM.searchClearBtn = document.getElementById('search-clear-btn');
    DOM.searchTagPills = document.querySelectorAll('.search-tag-pill');

    // Sort Dropdown
    DOM.sortMenu = document.getElementById('sort-menu');
    DOM.sortItems = document.querySelectorAll('.sort-item');
    DOM.currentSortLabel = document.getElementById('current-sort-label');

    // Drawers & Backdrops
    DOM.drawerBackdrop = document.getElementById('drawer-backdrop');
    DOM.cartDrawer = document.getElementById('cart-drawer');
    DOM.wishlistDrawer = document.getElementById('wishlist-drawer');
    DOM.filterDrawer = document.getElementById('filter-drawer');

    // Cart Drawer Elements
    DOM.cartItemsList = document.getElementById('cart-items-list');
    DOM.cartSubtotal = document.getElementById('cart-subtotal');
    DOM.cartTotal = document.getElementById('cart-total');
    DOM.shippingBarLabel = document.getElementById('shipping-bar-label');
    DOM.shippingFill = document.getElementById('shipping-fill');
    DOM.btnCartCheckout = document.getElementById('btn-cart-checkout');

    // Wishlist Drawer Elements
    DOM.wishlistItemsList = document.getElementById('wishlist-items-list');

    // Quick View Modal
    DOM.quickViewModal = document.getElementById('quickview-modal');
    DOM.quickViewContainer = document.getElementById('quickview-container');

    // Demo Checkout Modal
    DOM.checkoutModal = document.getElementById('checkout-modal');
    DOM.checkoutForm = document.getElementById('checkout-form');
    DOM.checkoutItemsPreview = document.getElementById('checkout-items-preview');
    DOM.checkoutSubtotal = document.getElementById('checkout-subtotal');
    DOM.checkoutTotal = document.getElementById('checkout-total');
    DOM.checkoutShippingFee = document.getElementById('checkout-shipping-fee');
    DOM.orderReceiptBox = document.getElementById('order-receipt-box');
    DOM.checkoutContentNormal = document.getElementById('checkout-content-normal');
    DOM.checkoutContentSuccess = document.getElementById('checkout-content-success');

    // Toast Container
    DOM.toastContainer = document.getElementById('toast-container');
  }

  // ── Currency Formatter ─────────────────────────────────────────────────────
  function formatINR(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
  }

  // ── HTML Sanitizer Helper ─────────────────────────────────────────────────
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Toast Notification System ──────────────────────────────────────────────
  function showToast(message, iconSvg) {
    if (!DOM.toastContainer) return;
    // Suppress any 'added' or cart toasts completely
    if (typeof message === 'string' && (message.toLowerCase().includes('added') || message.toLowerCase().includes('bag'))) {
      return;
    }
    // Suppress toasts when cart or any drawer is open so buttons are never covered
    if (document.body.classList.contains('drawer-open')) {
      return;
    }
    const toast = document.createElement('div');
    toast.className = 'toast-pill';

    const defaultIcon = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
    `;

    toast.innerHTML = (iconSvg || defaultIcon) + `<span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'opacity 0.2s, transform 0.2s';
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  // ── Filtering & Sorting Engine ─────────────────────────────────────────────
  function getFilteredAndSortedCatalog() {
    let list = [...state.catalog];

    // 1. Text Search Filter
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      list = list.filter(item => {
        return (
          item.name.toLowerCase().includes(q) ||
          item.collection.toLowerCase().includes(q) ||
          item.shape.toLowerCase().includes(q) ||
          item.material.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          item.colors.some(c => c.name.toLowerCase().includes(q))
        );
      });
    }

    // Gender Filter ('Men', 'Women', 'Kids', 'Unisex', 'all')
    if (state.filters.gender && state.filters.gender !== 'all') {
      const g = state.filters.gender.toLowerCase();
      list = list.filter(item => {
        const itemGender = (item.gender || 'Unisex').toLowerCase();
        if (g === 'kids') return itemGender === 'kids' || itemGender === 'unisex';
        if (g === 'men') return itemGender === 'men' || itemGender === 'unisex';
        if (g === 'women') return itemGender === 'women' || itemGender === 'unisex';
        if (g === 'unisex') return itemGender === 'unisex';
        return itemGender === g;
      });
      // Sort exact gender matches to the top
      list.sort((a, b) => {
        const aExact = (a.gender || '').toLowerCase() === g ? 1 : 0;
        const bExact = (b.gender || '').toLowerCase() === g ? 1 : 0;
        return bExact - aExact;
      });
    }

    // Category / Eyewear Type Filter ('Eyeglasses', 'Sunglasses', 'all')
    if (state.filters.category && state.filters.category !== 'all') {
      const c = state.filters.category.toLowerCase();
      list = list.filter(item => {
        const itemCat = (item.category || item.collection || '').toLowerCase();
        const itemName = (item.name || '').toLowerCase();
        if (c.includes('sunglass')) {
          return itemCat.includes('sunglass') || itemName.includes('sunglass');
        } else if (c.includes('eyeglass') || c.includes('optic') || c.includes('frame')) {
          return !itemCat.includes('sunglass') && !itemName.includes('sunglass');
        }
        return itemCat.includes(c) || itemName.includes(c);
      });
    }

    // Brand Filter ('all', 'Ray-Ban', 'Grey Jack', 'Luxury Eyewear', etc.)
    if (state.filters.brand && state.filters.brand !== 'all') {
      const b = state.filters.brand.toLowerCase();
      list = list.filter(item => {
        const itemBrand = (item.brand || '').toLowerCase();
        const itemCat = (item.category || '').toLowerCase();
        const itemName = (item.name || '').toLowerCase();
        return itemBrand.includes(b) || itemCat.includes(b) || itemName.includes(b);
      });
    }

    // 2. Shape Filter
    if (state.filters.shape !== 'all') {
      const fs = state.filters.shape.toLowerCase();
      list = list.filter(item => {
        if (!item.shape) return false;
        const ishape = item.shape.toLowerCase();
        if (fs === 'geometric') return ishape.includes('geom') || ishape.includes('hex');
        if (fs === 'rectangular' || fs === 'rectangle') return ishape.includes('rect');
        if (fs === 'browline') return ishape.includes('brow') || ishape.includes('club');
        return ishape.includes(fs) || fs.includes(ishape);
      });
    }

    // 3. Material Filter
    if (state.filters.material !== 'all') {
      list = list.filter(item => item.material.toLowerCase().includes(state.filters.material.toLowerCase()));
    }

    // 4. Fit Filter (Supports Small/Narrow, Medium/Regular, Large/Wide)
    if (state.filters.fit && state.filters.fit !== 'all') {
      const f = state.filters.fit.toLowerCase();
      list = list.filter(item => {
        const ifit = (item.fit || 'Regular').toLowerCase();
        if (f === 'small' || f === 'narrow') {
          return ifit.includes('narrow') || ifit.includes('small') || ifit === 's';
        }
        if (f === 'medium' || f === 'regular') {
          return ifit.includes('regular') || ifit.includes('medium') || ifit === 'm';
        }
        if (f === 'large' || f === 'wide') {
          return ifit.includes('wide') || ifit.includes('large') || ifit === 'l';
        }
        return ifit.includes(f) || f.includes(ifit);
      });
    }

    // 5. Color Filter
    if (state.filters.color !== 'all') {
      list = list.filter(item =>
        item.colors.some(c => c.name.toLowerCase().includes(state.filters.color.toLowerCase()))
      );
    }

    // 6. Price Range Filter
    if (state.filters.priceRange === 'under-3500') {
      list = list.filter(item => item.price < 3500);
    } else if (state.filters.priceRange === '3500-4500') {
      list = list.filter(item => item.price >= 3500 && item.price <= 4500);
    } else if (state.filters.priceRange === 'above-4500') {
      list = list.filter(item => item.price > 4500);
    }

    // 7. Sorting
    switch (state.currentSort) {
      case 'price-low':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        list.sort((a, b) => (b.badge === 'New Arrival' ? 1 : 0) - (a.badge === 'New Arrival' ? 1 : 0));
        break;
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'featured':
      default:
        // Default curated order preserves catalog array
        break;
    }

    return list;
  }

  // ── Render Product Grid ────────────────────────────────────────────────────
  function renderProductGrid() {
    if (state.isLoading) {
      if (DOM.catalogCount) {
        DOM.catalogCount.innerHTML = `<span class="count-desktop">Loading curated collection...</span><span class="count-mobile">Loading...</span>`;
      }
      if (DOM.productGrid) {
        DOM.productGrid.innerHTML = `
          <div style="grid-column: 1 / -1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 5rem 1rem; color:#64748B;">
            <div style="width:36px; height:36px; border:3px solid #E2E8F0; border-top-color:#0A2540; border-radius:50%; animation:opticSpin 0.8s linear infinite; margin-bottom:1rem;"></div>
            <p style="font-size:0.95rem; font-weight:600; letter-spacing:0.02em;">Loading Noor Optics Collection...</p>
          </div>
          <style>@keyframes opticSpin { to { transform: rotate(360deg); } }</style>
        `;
      }
      return;
    }

    const items = getFilteredAndSortedCatalog();

    // Update Counter
    if (DOM.catalogCount) {
      DOM.catalogCount.innerHTML = `<span class="count-desktop">Showing <strong>${items.length}</strong> of ${state.catalog.length} curated frames</span><span class="count-mobile"><strong>${items.length}</strong> Frames</span>`;
    }

    // Render Active Chips
    renderActiveFilterChips();

    // Handle Empty State
    if (items.length === 0) {
      DOM.productGrid.innerHTML = `
        <div class="empty-catalog-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
          <h3>No matching eyewear found</h3>
          <p>We couldn't find any frames matching your current combination of filters. Try clearing some selections or search terms.</p>
          <button class="btn-reset-filters" id="btn-empty-reset">Reset All Filters</button>
        </div>
      `;
      const btnReset = document.getElementById('btn-empty-reset');
      if (btnReset) {
        btnReset.addEventListener('click', resetAllFilters);
      }
      return;
    }

    // Render Grid Cards
    let html = '';
    items.forEach(product => {
      const isWishlisted = state.wishlist.has(product.id);
      const discountPercent = product.originalPrice
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : null;

      // Badges
      let badgeHtml = '';
      if (product.badge) {
        const isBestseller = product.badge.toLowerCase().includes('bestseller');
        badgeHtml = `<div class="card-badge-tag ${isBestseller ? 'bestseller' : ''}">${product.badge}</div>`;
      }

      // Swatches
      const swatchesHtml = product.colors.map((c, i) => `
        <span class="color-dot ${i === 0 ? 'active' : ''}"
              style="background-color: ${c.hex};"
              title="${c.name}"
              data-color-name="${c.name}">
        </span>
      `).join('');

      html += `
        <article class="pcard product-card" data-product-id="${product.id}">
          <div class="pic card-media" data-action="quickview" data-id="${product.id}">
            ${discountPercent ? `<span class="tag">${discountPercent}% off</span>` : (badgeHtml || '')}
            <button class="fav card-wishlist-btn ${isWishlisted ? 'active' : ''}"
                    data-action="wishlist"
                    data-id="${product.id}"
                    aria-label="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
              <svg width="20" height="20" stroke="var(--navy)" fill="${isWishlisted ? 'var(--navy)' : 'none'}" stroke-width="1.9"><use href="#i-heart"/></svg>
            </button>
            <img class="card-img"
                 src="${formatProductImage(product.image)}"
                 alt="${product.name} - ${product.shape} Eyeglasses"
                 loading="lazy"
                 width="158"
                 height="118"
                 decoding="async"
                 onerror="this.onerror=null; this.src='/images/frames/frame_01.jpg';"
                 id="img-${product.id}">
          </div>
          <div class="info card-content">
            <div class="brand card-brand-tag">
              <span>${escapeHtml(product.brand || 'Noor Optics')}</span>
              <span class="card-gender-badge ${(product.gender || 'unisex').toLowerCase()}">${escapeHtml(product.gender || 'Unisex')}</span>
            </div>
            <div class="name card-name" data-action="quickview" data-id="${product.id}">${product.name}</div>
            <div class="price card-price-row">
              <span class="card-price">${formatINR((product.price && product.price > 0) ? product.price : 1199)}</span>
              ${product.originalPrice ? `<s class="card-price-strike">${formatINR(product.originalPrice)}</s>` : ''}
              ${discountPercent ? `<em class="card-discount-badge">${discountPercent}% off</em>` : ''}
            </div>
            <div class="card-swatches" style="margin: 4px 0;">
              ${swatchesHtml}
            </div>
            <div class="card-bottom-actions">
              <button class="btn btn-primary btn-block btn-card-addbag" data-action="addbag" data-id="${product.id}" style="height:38px;font-size:13px;margin:4px 0 0;">
                + Add to Bag
              </button>
            </div>
          </div>
        </article>
      `;
    });

    DOM.productGrid.innerHTML = html;

    // Trigger smooth card scroll reveal observer if view-timeline is not natively supported
    if (typeof refreshCardScrollObserver === 'function') {
      refreshCardScrollObserver();
    }
  }

  // ── Render Active Filter Chips ─────────────────────────────────────────────
  function renderActiveFilterChips() {
    if (!DOM.activeFilterChips) return;
    let chips = [];

    if (state.searchQuery.trim()) {
      chips.push({ key: 'search', label: `Search: "${state.searchQuery}"` });
    }
    if (state.filters.shape !== 'all') {
      chips.push({ key: 'shape', label: `Shape: ${state.filters.shape}` });
    }
    if (state.filters.material !== 'all') {
      chips.push({ key: 'material', label: `Material: ${state.filters.material}` });
    }
    if (state.filters.fit !== 'all') {
      chips.push({ key: 'fit', label: `Fit: ${state.filters.fit}` });
    }
    if (state.filters.color !== 'all') {
      chips.push({ key: 'color', label: `Color: ${state.filters.color}` });
    }
    if (state.filters.priceRange !== 'all') {
      const labels = {
        'under-3500': 'Price: Under ₹3,500',
        '3500-4500': 'Price: ₹3,500 - ₹4,500',
        'above-4500': 'Price: Above ₹4,500'
      };
      chips.push({ key: 'priceRange', label: labels[state.filters.priceRange] || 'Price' });
    }
    if (state.filters.gender && state.filters.gender !== 'all') {
      chips.push({ key: 'gender', label: `Gender: ${state.filters.gender}` });
    }
    if (state.filters.category && state.filters.category !== 'all') {
      chips.push({ key: 'category', label: `Type: ${state.filters.category}` });
    }
    if (state.filters.brand && state.filters.brand !== 'all') {
      chips.push({ key: 'brand', label: `Brand: ${state.filters.brand}` });
    }

    if (chips.length === 0) {
      DOM.activeFilterChips.innerHTML = '';
      if (DOM.filterCountBadge) DOM.filterCountBadge.classList.add('empty');
      if (DOM.mobileFilterCountBadge) DOM.mobileFilterCountBadge.classList.add('empty');
      return;
    }

    if (DOM.filterCountBadge) {
      DOM.filterCountBadge.textContent = chips.length;
      DOM.filterCountBadge.classList.remove('empty');
    }
    if (DOM.mobileFilterCountBadge) {
      DOM.mobileFilterCountBadge.textContent = chips.length;
      DOM.mobileFilterCountBadge.classList.remove('empty');
    }

    const html = chips.map(c => `
      <span class="active-chip">
        ${c.label}
        <button data-clear-chip="${c.key}" aria-label="Remove filter">&times;</button>
      </span>
    `).join('') + `<span class="clear-all-chips" id="btn-clear-all-chips">Clear all</span>`;

    DOM.activeFilterChips.innerHTML = html;

    const btnClearAll = document.getElementById('btn-clear-all-chips');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', resetAllFilters);
    }

    DOM.activeFilterChips.querySelectorAll('[data-clear-chip]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.target.getAttribute('data-clear-chip');
        if (key === 'search') {
          state.searchQuery = '';
          if (DOM.searchInput) DOM.searchInput.value = '';
          if (DOM.searchClearBtn) DOM.searchClearBtn.classList.remove('visible');
        } else {
          state.filters[key] = 'all';
          syncFilterDrawerUI();
        }
        syncVisualShowcaseUI();
        syncShapePillNav();
        renderProductGrid();
      });
    });
  }

  // ── Sync Visual Category & Brand Showcase UI ─────────────────────────────────
  function syncVisualShowcaseUI() {
    // Sync Gender Showcase Cards
    document.querySelectorAll('.gender-card').forEach(card => {
      const g = (card.getAttribute('data-gender') || '').toLowerCase();
      const activeG = (state.filters.gender || 'all').toLowerCase();
      card.classList.toggle('active', g === activeG);
    });

    // Sync Top Category & Gender Chips
    document.querySelectorAll('.chips .chip').forEach(chip => {
      const cat = chip.getAttribute('data-cat');
      const gen = chip.getAttribute('data-gender');
      let isActive = false;
      if (cat === 'all' && (!gen || gen === 'all')) {
        isActive = (state.filters.category === 'all' && state.filters.gender === 'all' && state.filters.priceRange !== 'under-3500');
      } else if (gen === 'sale') {
        isActive = (state.filters.priceRange === 'under-3500');
      } else if (gen) {
        isActive = (state.filters.gender && state.filters.gender.toLowerCase() === gen.toLowerCase());
      } else if (cat) {
        isActive = (state.filters.category && state.filters.category.toLowerCase() === cat.toLowerCase());
      }
      chip.classList.toggle('active', isActive);
    });

    document.querySelectorAll('.lk-cat-card').forEach(card => {
      const cardCat = card.getAttribute('data-cat');
      const cardGender = card.getAttribute('data-gender');
      let isActive = false;
      if (cardGender === 'sale') {
        isActive = (state.filters.category === cardCat && state.filters.priceRange === 'under-3500');
      } else {
        isActive = (state.filters.category === cardCat && state.filters.gender === cardGender);
      }
      card.classList.toggle('active', isActive);
    });

    document.querySelectorAll('.lk-brand-pill').forEach(btn => {
      const b = btn.getAttribute('data-brand') || 'all';
      btn.classList.toggle('active', b === (state.filters.brand || 'all'));
    });
  }

  // ── Sync Shape Pills Navigation ────────────────────────────────────────────
  function syncShapePillNav() {
    if (!DOM.shapePillsNav) return;
    DOM.shapePillsNav.querySelectorAll('.shape-pill').forEach(pill => {
      const shape = pill.getAttribute('data-shape') || 'all';
      if (shape.toLowerCase() === state.filters.shape.toLowerCase()) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  // ── Sync Filter Drawer Checkboxes & Radio UI ───────────────────────────────
  function syncFilterDrawerUI() {
    if (!DOM.filterDrawer) return;

    // Radio Gender
    DOM.filterDrawer.querySelectorAll('input[name="filter-gender"]').forEach(radio => {
      radio.checked = (radio.value.toLowerCase() === (state.filters.gender || 'all').toLowerCase());
    });

    // Radio Category
    DOM.filterDrawer.querySelectorAll('input[name="filter-category"]').forEach(radio => {
      radio.checked = (radio.value.toLowerCase() === (state.filters.category || 'all').toLowerCase());
    });

    // Radio Shape
    DOM.filterDrawer.querySelectorAll('input[name="filter-shape"]').forEach(radio => {
      radio.checked = (radio.value.toLowerCase() === state.filters.shape.toLowerCase());
    });

    // Radio Material
    DOM.filterDrawer.querySelectorAll('input[name="filter-material"]').forEach(radio => {
      radio.checked = (radio.value.toLowerCase() === state.filters.material.toLowerCase());
    });

    // Radio Fit
    DOM.filterDrawer.querySelectorAll('input[name="filter-fit"]').forEach(radio => {
      radio.checked = (radio.value.toLowerCase() === state.filters.fit.toLowerCase());
    });

    // Radio Price
    DOM.filterDrawer.querySelectorAll('input[name="filter-price"]').forEach(radio => {
      radio.checked = (radio.value === state.filters.priceRange);
    });

    // Color chips
    DOM.filterDrawer.querySelectorAll('.filter-color-chip').forEach(chip => {
      const col = chip.getAttribute('data-filter-color');
      if (col.toLowerCase() === state.filters.color.toLowerCase()) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  function resetAllFilters() {
    state.searchQuery = '';
    state.filters = {
      shape: 'all',
      material: 'all',
      fit: 'all',
      color: 'all',
      priceRange: 'all',
      gender: 'all',
      category: 'all',
      brand: 'all'
    };
    syncVisualShowcaseUI();
    if (DOM.searchInput) DOM.searchInput.value = '';
    if (DOM.searchClearBtn) DOM.searchClearBtn.classList.remove('visible');
    syncFilterDrawerUI();
    syncShapePillNav();
    renderProductGrid();
    showToast('Filters cleared');
  }

  // ── Wishlist Management ───────────────────────────────────────────────────
  function toggleWishlist(productId) {
    const product = state.catalog.find(p => p.id === productId);
    if (!product) return;

    if (state.wishlist.has(productId)) {
      state.wishlist.delete(productId);
      showToast(`Removed "${product.name}" from Wishlist`);
    } else {
      state.wishlist.add(productId);
      showToast(`Saved "${product.name}" to Wishlist`);
    }

    if (window.saveWishlist) {
      window.saveWishlist(Array.from(state.wishlist));
    }

    updateWishlistBadge();
    renderWishlistDrawer();
    renderProductGrid();
  }

  function updateWishlistBadge() {
    const count = state.wishlist.size;
    if (DOM.wishlistCountBadge) {
      DOM.wishlistCountBadge.textContent = count;
      if (count > 0) {
        DOM.wishlistCountBadge.classList.remove('empty');
      } else {
        DOM.wishlistCountBadge.classList.add('empty');
      }
    }
    const bottomWish = document.getElementById('bottom-wishlist-badge');
    if (bottomWish) {
      bottomWish.textContent = count;
      if (count > 0) bottomWish.classList.remove('empty');
      else bottomWish.classList.add('empty');
    }
  }

  function renderWishlistDrawer() {
    if (!DOM.wishlistItemsList) return;
    const ids = Array.from(state.wishlist);

    if (ids.length === 0) {
      DOM.wishlistItemsList.innerHTML = `
        <div class="drawer-empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <h4>Your Wishlist is Empty</h4>
          <p>Click the heart icon on any frame in our collection to save your favorite designs for later.</p>
        </div>
      `;
      return;
    }

    const html = ids.map(id => {
      const product = state.catalog.find(p => p.id === id);
      if (!product) return '';
      return `
        <div class="wishlist-item-card">
          <img class="wishlist-item-img" src="${formatProductImage(product.image)}" alt="${product.name}" onerror="this.onerror=null; this.src='/images/frames/frame_01.jpg';">
          <div class="wishlist-item-info">
            <h5 class="wishlist-item-name">${product.name}</h5>
            <div class="wishlist-item-price">${formatINR(product.price)}</div>
          </div>
          <div class="wishlist-item-actions">
            <button class="btn-wishlist-movetobag" data-action="wishlist-move" data-id="${product.id}">Move to Bag</button>
            <span class="btn-wishlist-remove" data-action="wishlist-remove" data-id="${product.id}">Remove</span>
          </div>
        </div>
      `;
    }).join('');

    DOM.wishlistItemsList.innerHTML = html;
  }

  // ── Cart & Bag Management ─────────────────────────────────────────────────
  function addToCart(productId, customColor, customLensId) {
    const product = state.catalog.find(p => p.id === productId);
    if (!product) return;

    const chosenColor = customColor || (product.colors && product.colors[0] ? product.colors[0].name : 'Standard');
    const lensPkg = (window.LENS_PACKAGES || []).find(l => l.id === (customLensId || 'lens-bluecut')) || {
      id: 'lens-bluecut',
      name: 'Blue-Light Filter',
      price: 0
    };

    const cartKey = `${product.id}__${chosenColor}__${lensPkg.id}`;
    const existingIndex = state.cart.findIndex(item => item.cartKey === cartKey);

    if (existingIndex >= 0) {
      state.cart[existingIndex].quantity += 1;
    } else {
      state.cart.push({
        cartKey: cartKey,
        id: product.id,
        name: product.name,
        brand: product.brand || 'Noor Optics',
        model: product.model || product.name,
        shape: product.shape || 'Optical',
        material: product.material || 'Acetate',
        fit: product.fit || 'Regular',
        image: product.image,
        basePrice: product.price,
        lensPrice: lensPkg.price,
        unitPrice: product.price + lensPkg.price,
        color: chosenColor,
        lensName: lensPkg.name,
        quantity: 1
      });
    }

    if (window.saveCart) {
      window.saveCart(state.cart);
    }

    updateBagBadge();
    renderCartDrawer();
    openDrawer(DOM.cartDrawer);
  }

  function updateCartQuantity(cartKey, delta) {
    const index = state.cart.findIndex(item => item.cartKey === cartKey);
    if (index === -1) return;

    state.cart[index].quantity += delta;
    if (state.cart[index].quantity <= 0) {
      state.cart.splice(index, 1);
    }

    if (window.saveCart) {
      window.saveCart(state.cart);
    }

    updateBagBadge();
    renderCartDrawer();
  }

  function removeCartItem(cartKey) {
    state.cart = state.cart.filter(item => item.cartKey !== cartKey);
    if (window.saveCart) {
      window.saveCart(state.cart);
    }
    updateBagBadge();
    renderCartDrawer();
    showToast('Item removed from Bag');
  }

  function updateBagBadge() {
    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    if (DOM.bagCountBadge) {
      DOM.bagCountBadge.textContent = totalCount;
      if (totalCount > 0) {
        DOM.bagCountBadge.classList.remove('empty');
      } else {
        DOM.bagCountBadge.classList.add('empty');
      }
    }
    const bottomBag = document.getElementById('bottom-bag-badge');
    if (bottomBag) {
      bottomBag.textContent = totalCount;
      if (totalCount > 0) bottomBag.classList.remove('empty');
      else bottomBag.classList.add('empty');
    }
  }

  function renderCartDrawer() {
    if (!DOM.cartItemsList) return;

    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = state.cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const threshold = (window.NOOR_BRAND && window.NOOR_BRAND.freeShippingThreshold) || 1999;

    // Free Shipping Progress
    if (DOM.shippingFill && DOM.shippingBarLabel) {
      if (subtotal >= threshold) {
        DOM.shippingFill.style.width = '100%';
        DOM.shippingFill.classList.add('complete');
        DOM.shippingBarLabel.innerHTML = `<span>Complimentary Express Shipping Unlocked!</span> <strong>₹0</strong>`;
      } else {
        const remaining = threshold - subtotal;
        const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
        DOM.shippingFill.style.width = `${pct}%`;
        DOM.shippingFill.classList.remove('complete');
        DOM.shippingBarLabel.innerHTML = `<span>Add <strong>${formatINR(remaining)}</strong> more for Free Shipping</span> <span>${pct}%</span>`;
      }
    }

    // Totals
    if (DOM.cartSubtotal) DOM.cartSubtotal.textContent = formatINR(subtotal);
    if (DOM.cartTotal) DOM.cartTotal.textContent = formatINR(subtotal);

    // Render Items
    if (state.cart.length === 0) {
      DOM.cartItemsList.innerHTML = `
        <div class="drawer-empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          <h4>Your Shopping Bag is Empty</h4>
          <p>Explore our curated Nordic frames and find the pair crafted to complement your signature style.</p>
        </div>
      `;
      if (DOM.btnCartCheckout) DOM.btnCartCheckout.disabled = true;
      return;
    }

    if (DOM.btnCartCheckout) DOM.btnCartCheckout.disabled = false;

    const html = state.cart.map(item => `
      <div class="cart-item-card" data-cart-key="${item.cartKey}">
        <img class="cart-item-img" src="${formatProductImage(item.image)}" alt="${item.name}" onerror="this.onerror=null; this.src='/images/frames/frame_01.jpg';">
        <div class="cart-item-details">
          <h5 class="cart-item-title">${item.name}</h5>
          <span class="cart-item-variant">Color: ${item.color}</span>
          <span class="cart-item-lens">${item.lensName}</span>
          <div class="cart-item-bottom">
            <div class="cart-qty-stepper">
              <button class="qty-step-btn" data-action="cart-minus" data-key="${item.cartKey}">-</button>
              <span class="qty-count-val">${item.quantity}</span>
              <button class="qty-step-btn" data-action="cart-plus" data-key="${item.cartKey}">+</button>
            </div>
            <div style="display:flex;align-items:center;">
              <span class="cart-item-price">${formatINR(item.unitPrice * item.quantity)}</span>
              <span class="cart-item-remove" data-action="cart-remove" data-key="${item.cartKey}">&times;</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    DOM.cartItemsList.innerHTML = html;
  }

  // ── Drawer Open/Close Mechanics ───────────────────────────────────────────
  function openDrawer(drawerElem) {
    closeAllDrawers();
    if (!drawerElem) return;
    drawerElem.classList.add('open');
    if (DOM.drawerBackdrop) DOM.drawerBackdrop.classList.add('open');
    document.body.classList.add('drawer-open');
  }

  function closeAllDrawers() {
    [DOM.cartDrawer, DOM.wishlistDrawer, DOM.filterDrawer, DOM.mobileMenuDrawer].forEach(drawer => {
      if (drawer) drawer.classList.remove('open');
    });
    if (DOM.sortBottomSheet) DOM.sortBottomSheet.classList.remove('open');
    if (DOM.sortSheetBackdrop) DOM.sortSheetBackdrop.classList.remove('open');
    if (DOM.drawerBackdrop) DOM.drawerBackdrop.classList.remove('open');
    document.body.classList.remove('drawer-open');
  }

  // ── Modal Open/Close Mechanics ────────────────────────────────────────────
  function openModal(modalElem) {
    if (!modalElem) return;
    modalElem.classList.add('open');
    document.body.classList.add('drawer-open');
  }

  function closeModal(modalElem) {
    if (!modalElem) return;
    modalElem.classList.remove('open');
    document.body.classList.remove('drawer-open');
  }

  function closeAllModals() {
    [DOM.quickViewModal, DOM.checkoutModal].forEach(modal => {
      if (modal) modal.classList.remove('open');
    });
    document.body.classList.remove('drawer-open');
  }

  // ── Quick View / Product Detail Modal ──────────────────────────────────────
  function openQuickView(productId) {
    const product = state.catalog.find(p => p.id === productId);
    if (!product) return;

    state.quickViewProductId = productId;
    state.selectedColorName = product.colors && product.colors[0] ? product.colors[0].name : '';
    state.selectedLensPackageId = 'lens-bluecut';

    const lensPackages = window.LENS_PACKAGES || [];

    const lensOptionsHtml = lensPackages.map(lens => `
      <div class="lens-option-card ${lens.id === state.selectedLensPackageId ? 'selected' : ''}"
           data-lens-id="${lens.id}">
        <div class="lens-option-left">
          <input type="radio" name="qv-lens" value="${lens.id}" ${lens.id === state.selectedLensPackageId ? 'checked' : ''}>
          <div>
            <div class="lens-option-title">${lens.name}</div>
            <div class="lens-option-sub">${lens.description}</div>
          </div>
        </div>
        <div class="lens-option-price">${lens.price === 0 ? 'Included' : '+' + formatINR(lens.price)}</div>
      </div>
    `).join('');

    const swatchesHtml = product.colors.map(c => `
      <span class="color-dot ${c.name === state.selectedColorName ? 'active' : ''}"
            style="background-color: ${c.hex}; width: 18px; height: 18px;"
            title="${c.name}"
            data-qv-color="${c.name}">
      </span>
    `).join('');

    const dims = product.dimensions || {};
    const specsHtml = `
      <table class="quickview-specs-table">
        <tbody>
          <tr><td class="spec-name">Lens Width</td><td class="spec-val">${dims.lens || '52mm'}</td></tr>
          <tr><td class="spec-name">Bridge Width</td><td class="spec-val">${dims.bridge || '18mm'}</td></tr>
          <tr><td class="spec-name">Temple Length</td><td class="spec-val">${dims.temple || '145mm'}</td></tr>
          <tr><td class="spec-name">Total Weight</td><td class="spec-val">${dims.weight || '15g'}</td></tr>
          <tr><td class="spec-name">Frame Material</td><td class="spec-val">${product.material || 'Premium Acetate'}</td></tr>
          <tr><td class="spec-name">Recommended Fit</td><td class="spec-val">${product.fit || 'Regular'}</td></tr>
        </tbody>
      </table>
    `;

    DOM.quickViewContainer.innerHTML = `
      <div class="quickview-grid">
        <div class="quickview-gallery">
          <img class="quickview-img" src="${formatProductImage(product.image)}" alt="${product.name}" id="qv-main-img" onerror="this.onerror=null; this.src='/images/frames/frame_01.jpg';">
        </div>
        <div class="quickview-info">
          <div>
            <span class="quickview-collection">${product.collection} · ${product.shape}</span>
            <h2 class="quickview-title">${product.name}</h2>
          </div>
          <div class="quickview-price-wrap">
            <span class="quickview-price" id="qv-calculated-price">${formatINR((product.price && product.price > 0) ? product.price : 1199)}</span>
            ${product.originalPrice ? `<span class="card-price-strike">${formatINR(product.originalPrice)}</span>` : ''}
          </div>
          <p class="quickview-desc">${product.description}</p>
          <div>
            <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.4rem;">
              Frame Color: <span id="qv-color-label" style="font-weight:400;color:var(--text-secondary);">${state.selectedColorName}</span>
            </div>
            <div class="card-swatches">
              ${swatchesHtml}
            </div>
          </div>
          <div class="lens-selector-wrap">
            <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.1rem;">
              Select Prescription Lens Package
            </div>
            ${lensOptionsHtml}
          </div>
          <div>
            <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.4rem;">
              Frame Architecture & Dimensions
            </div>
            ${specsHtml}
          </div>
          <div class="quickview-actions">
            <button class="btn-qv-addbag" id="btn-qv-submit-bag">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              Add to Bag
            </button>
          </div>
        </div>
      </div>
    `;

    // Event listeners inside Quick View
    DOM.quickViewContainer.querySelectorAll('.lens-option-card').forEach(card => {
      card.addEventListener('click', () => {
        DOM.quickViewContainer.querySelectorAll('.lens-option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
        state.selectedLensPackageId = card.getAttribute('data-lens-id');
        updateQuickViewPrice(product);
      });
    });

    DOM.quickViewContainer.querySelectorAll('[data-qv-color]').forEach(dot => {
      dot.addEventListener('click', () => {
        DOM.quickViewContainer.querySelectorAll('[data-qv-color]').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        state.selectedColorName = dot.getAttribute('data-qv-color');
        const colorLabel = document.getElementById('qv-color-label');
        if (colorLabel) colorLabel.textContent = state.selectedColorName;
      });
    });

    const btnSubmit = document.getElementById('btn-qv-submit-bag');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        addToCart(product.id, state.selectedColorName, state.selectedLensPackageId);
        closeModal(DOM.quickViewModal);
      });
    }

    openModal(DOM.quickViewModal);
  }

  function updateQuickViewPrice(product) {
    const lensPkg = (window.LENS_PACKAGES || []).find(l => l.id === state.selectedLensPackageId) || { price: 0 };
    const basePrice = (product.price && product.price > 0) ? product.price : 1199;
    const calculated = basePrice + lensPkg.price;
    const priceElem = document.getElementById('qv-calculated-price');
    if (priceElem) priceElem.textContent = formatINR(calculated);
  }

  // ── Demo Checkout Modal ───────────────────────────────────────────────────
  function openDemoCheckout() {
    if (state.cart.length === 0) {
      showToast('Your shopping bag is empty');
      return;
    }

    closeAllDrawers();

    const subtotal = state.cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const threshold = (window.NOOR_BRAND && window.NOOR_BRAND.freeShippingThreshold) || 1999;
    const shipping = subtotal >= threshold ? 0 : 199;
    const grandTotal = subtotal + shipping;

    if (DOM.checkoutSubtotal) DOM.checkoutSubtotal.textContent = formatINR(subtotal);
    if (DOM.checkoutShippingFee) DOM.checkoutShippingFee.textContent = shipping === 0 ? 'FREE' : formatINR(shipping);
    if (DOM.checkoutTotal) DOM.checkoutTotal.textContent = formatINR(grandTotal);

    if (DOM.checkoutItemsPreview) {
      DOM.checkoutItemsPreview.innerHTML = state.cart.map(item => `
        <div class="checkout-preview-item">
          <img class="checkout-preview-img" src="${formatProductImage(item.image)}" alt="${item.name}" onerror="this.onerror=null; this.src='/images/frames/frame_01.jpg';">
          <div>
            <div class="checkout-preview-title">${item.name}</div>
            <div class="checkout-preview-meta">Qty: ${item.quantity} · ${item.color}</div>
          </div>
          <div class="checkout-preview-price">${formatINR(item.unitPrice * item.quantity)}</div>
        </div>
      `).join('');
    }

    if (DOM.checkoutContentNormal) DOM.checkoutContentNormal.style.display = 'grid';
    if (DOM.checkoutContentSuccess) DOM.checkoutContentSuccess.style.display = 'none';

    // Refresh payment choice & dynamic locked UPI QR display
    const upiPanel = document.getElementById('checkout-upi-qr-panel');
    const submitBtn = document.getElementById('btn-submit-order');
    if (upiPanel) {
      upiPanel.style.display = 'block';
      renderCheckoutUpiPanel();
    }
    if (submitBtn) {
      submitBtn.textContent = 'Confirm Order & Pay via UPI';
    }

    openModal(DOM.checkoutModal);
  }

  // Helper: Generates locked dynamic UPI QR and deep links for exact order total
  function renderCheckoutUpiPanel() {
    const subtotal = state.cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const threshold = (window.NOOR_BRAND && window.NOOR_BRAND.freeShippingThreshold) || 1999;
    const shipping = subtotal >= threshold ? 0 : 199;
    const grandTotal = subtotal + shipping;

    const amountDisplay = document.getElementById('checkout-upi-amount-display');
    if (amountDisplay) amountDisplay.textContent = formatINR(grandTotal);

    // Pre-locked UPI URI with exact total amount and merchant identity
    const upiUri = `upi://pay?pa=9182341567@mairtel&pn=Noor%20Optic&am=${grandTotal.toFixed(2)}&cu=INR&tn=Noor%20Optics%20Eyewear&mc=5999`;

    const mobileBtn = document.getElementById('btn-open-upi-app');
    if (mobileBtn) {
      mobileBtn.href = upiUri;
    }

    const qrBox = document.getElementById('checkout-dynamic-qr-box');
    if (qrBox) {
      if (typeof QRCode !== 'undefined') {
        qrBox.innerHTML = '';
        try {
          new QRCode(qrBox, {
            text: upiUri,
            width: 190,
            height: 190,
            colorDark: '#0A2540',
            colorLight: '#FFFFFF',
            correctLevel: QRCode.CorrectLevel.M
          });
        } catch (_) {
          qrBox.innerHTML = '<img src="/images/upi-qr.png" alt="Scan to pay using UPI" style="width:190px;height:190px;display:block;object-fit:contain;margin:0 auto;" />';
        }
      } else {
        qrBox.innerHTML = '<img src="/images/upi-qr.png" alt="Scan to pay using UPI" style="width:190px;height:190px;display:block;object-fit:contain;margin:0 auto;" />';
      }
    }
  }

  async function handleDemoOrderSubmit(e) {
    e.preventDefault();

    const nameInput = document.getElementById('checkout-name');
    const phoneInput = document.getElementById('checkout-phone');
    const addressInput = document.getElementById('checkout-address');
    const cityInput = document.getElementById('checkout-city');
    const pinInput = document.getElementById('checkout-pin');

    const name = (nameInput?.value || '').trim();
    const age = parseInt(document.getElementById('checkout-age')?.value || '', 10) || null;
    const email = (document.getElementById('checkout-email')?.value || '').trim() || 'client@example.com';
    const phone = (phoneInput?.value || '').trim();
    const address = (addressInput?.value || '').trim();
    const city = (cityInput?.value || '').trim();
    const pin = (pinInput?.value || '').trim();
    const rxChoice = document.querySelector('input[name="checkout-rx"]:checked')?.value || 'enter-rx';
    const payChoice = document.querySelector('input[name="checkout-pay"]:checked')?.value || 'upi';

    if (!name) {
      if (nameInput) {
        nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameInput.focus();
        nameInput.style.borderColor = '#DC2626';
        nameInput.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.2)';
      }
      showToast('Please enter your full name.', 'warning');
      return;
    }

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      if (phoneInput) {
        phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneInput.focus();
        phoneInput.style.borderColor = '#DC2626';
        phoneInput.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.2)';
      }
      showToast('Please enter a valid 10-digit phone number.', 'warning');
      return;
    }

    if (!address) {
      if (addressInput) {
        addressInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        addressInput.focus();
        addressInput.style.borderColor = '#DC2626';
        addressInput.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.2)';
      }
      showToast('Please enter your delivery address.', 'warning');
      return;
    }

    if (!city) {
      if (cityInput) {
        cityInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cityInput.focus();
        cityInput.style.borderColor = '#DC2626';
        cityInput.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.2)';
      }
      showToast('Please enter your delivery city.', 'warning');
      return;
    }

    if (!pin) {
      if (pinInput) {
        pinInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pinInput.focus();
        pinInput.style.borderColor = '#DC2626';
        pinInput.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.2)';
      }
      showToast('Please enter your postal PIN code.', 'warning');
      return;
    }

    let utrVal = '';
    if (payChoice === 'upi') {
      const utrInput = document.getElementById('checkout-upi-utr');
      utrVal = (utrInput?.value || '').trim();
      if (!utrVal || utrVal.length < 8) {
        if (utrInput) {
          utrInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          utrInput.focus();
          utrInput.style.borderColor = '#DC2626';
          utrInput.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.2)';
        }
        showToast('Please enter the 12-digit UPI Reference / UTR Number from your payment app.', 'warning');
        return;
      }
    }

    const submitBtn = document.getElementById('btn-submit-order');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing Order...';
    }

    try {
      let prescriptionData = null;
      if (rxChoice === 'enter-rx') {
        prescriptionData = {
          od_sph: document.getElementById('checkout-rx-od-sph')?.value.trim() || '0.00',
          od_cyl: document.getElementById('checkout-rx-od-cyl')?.value.trim() || '0.00',
          od_axis: document.getElementById('checkout-rx-od-axis')?.value.trim() || null,
          os_sph: document.getElementById('checkout-rx-os-sph')?.value.trim() || '0.00',
          os_cyl: document.getElementById('checkout-rx-os-cyl')?.value.trim() || '0.00',
          os_axis: document.getElementById('checkout-rx-os-axis')?.value.trim() || null,
          addition: document.getElementById('checkout-rx-add')?.value.trim() || null,
          ipd_distance: document.getElementById('checkout-rx-pd')?.value.trim() || null,
          ipd_near: document.getElementById('checkout-rx-near-pd')?.value.trim() || null,
          prescriber_details: document.getElementById('checkout-rx-prescriber')?.value.trim() || null,
          notes: document.getElementById('checkout-rx-notes')?.value.trim() || null
        };
      }

      const subtotal = state.cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const threshold = (window.NOOR_BRAND && window.NOOR_BRAND.freeShippingThreshold) || 1999;
      const shipping = subtotal >= threshold ? 0 : 199;
      const grandTotal = subtotal + shipping;
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const timePart = Date.now().toString().slice(-4);
      const randPart = Math.floor(1000 + Math.random() * 9000);
      const orderId = `NOOR-WEB-${datePart}-${timePart}-${randPart}`;
      const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      const deliveryAddressWithUtr = (utrVal && !address.includes('UTR:')) ? `${address} · (UPI UTR: ${utrVal})` : address;

      const orderData = {
        order_ref: orderId,
        customer_name: name,
        customer_age: age,
        customer_email: email,
        customer_phone: phone,
        delivery_address: deliveryAddressWithUtr,
        city: city,
        pin_code: pin,
        items: (() => {
          const expandedItems = [];
          state.cart.forEach(item => {
            const hasSpecialLens = item.lensPrice && item.lensPrice > 0;
            const framePrice = (hasSpecialLens && item.basePrice) ? item.basePrice : item.unitPrice;

            // 1. Frame entry
            expandedItems.push({
              id: item.id,
              name: item.name,
              brand: item.brand || 'Noor Optics',
              model: item.model || item.name,
              shape: item.shape || 'Optical',
              color: item.color,
              size: item.fit || 'Regular',
              lens: item.lensName,
              lensName: item.lensName,
              lens_name: item.lensName,
              quantity: item.quantity,
              unit_price: framePrice,
              unitPrice: framePrice,
              subtotal: framePrice * item.quantity,
              claimed_upi_ref: utrVal || null,
              utr: utrVal || null
            });

            // 2. Special Lens entry (added just like a frame entry in the bill when cost increases)
            if (hasSpecialLens) {
              expandedItems.push({
                id: `lens-${item.id}`,
                name: `${item.lensName} (Lens Package)`,
                product_name: `${item.lensName} (Lens Package)`,
                brand: 'Noor Precision Lenses',
                model: item.lensName,
                shape: 'Lens',
                color: 'Clear AR',
                size: item.fit || 'Custom Fit',
                lens: item.lensName,
                lensName: item.lensName,
                lens_name: item.lensName,
                isLensItem: true,
                quantity: item.quantity,
                unit_price: item.lensPrice,
                unitPrice: item.lensPrice,
                subtotal: item.lensPrice * item.quantity,
                claimed_upi_ref: utrVal || null,
                utr: utrVal || null
              });
            }
          });
          return expandedItems;
        })(),
        prescription_pref: rxChoice,
        prescription: prescriptionData,
        channel: 'WEBSITE',
        channel_code: 1,
        source: 'website',
        claimed_upi_ref: utrVal || null,
        claimedUpiRef: utrVal || null,
        utr: utrVal || null,
        idempotency_key: `idem-web-${orderId}-${Date.now()}`,
        payment_method: payChoice,
        subtotal: subtotal,
        shipping_fee: shipping,
        grand_total: grandTotal
      };

      let authoritativeOrderId = orderId;
      let authoritativeTokenNum = null;

      // 1. Submit to Unified Backend and Cloud Supabase in parallel for lightning-fast checkout
      const onlinePayload = {
        channel: 'WEBSITE',
        channel_code: 1,
        source: 'website',
        idempotency_key: orderData.idempotency_key,
        customerName: name,
        customerAge: age,
        customerEmail: email,
        customerPhone: phone,
        deliveryAddress: deliveryAddressWithUtr,
        city: city,
        pinCode: pin,
        prescriptionPref: rxChoice,
        prescription: prescriptionData,
        paymentMethod: payChoice === 'upi' ? 'UPI_GPAY' : (payChoice === 'card' ? 'CARD' : 'UPI_GPAY'),
        claimedUpiRef: utrVal || null,
        claimed_upi_ref: utrVal || null,
        utr: utrVal || null,
        upiScreenshot: state.uploadedUpiScreenshot || null,
        items: orderData.items
      };

      // 1. Submit to Unified Backend (persists authoritatively to Database and Supabase Cloud)
      let orderCreated = false;
      try {
        const backendResp = await fetch('/api/orders/online', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(onlinePayload)
        });
        if (backendResp.ok) {
          const localRes = await backendResp.json();
          if (localRes.orderNumber) {
            authoritativeOrderId = localRes.orderNumber;
            orderCreated = true;
          }
        }
      } catch (backendErr) {
        console.warn('Backend unavailable, falling back to direct cloud submission:', backendErr);
      }

      // 2. Direct Supabase cloud submission using dedicated pipeline
      if (!orderCreated && window.NoorSupabase && window.NoorSupabase.isConfigured()) {
        orderData.order_ref = authoritativeOrderId;
        await window.NoorSupabase.createWebsiteOrder(orderData).catch(e => console.warn('Supabase website pipeline note:', e));
      }

      // Render clean, luxury customer-facing receipt
      if (DOM.orderReceiptBox) {
        DOM.orderReceiptBox.innerHTML = `
          <div class="receipt-header-row">
            <div class="receipt-ref-group">
              <span class="receipt-ref-label">Order Reference</span>
              <span class="receipt-ref-code">${authoritativeOrderId}</span>
            </div>
            <span class="receipt-date-pill">${dateStr}</span>
          </div>
          <div class="receipt-details-list">
            <div class="receipt-detail-item">
              <span class="receipt-item-label">Billed To</span>
              <span class="receipt-item-val">${escapeHtml(name)} <span class="receipt-item-sub">(${escapeHtml(email)})</span></span>
            </div>
            <div class="receipt-detail-item">
              <span class="receipt-item-label">Destination</span>
              <span class="receipt-item-val">${escapeHtml(city)}, India · Express Tracked</span>
            </div>
            <div class="receipt-detail-item">
              <span class="receipt-item-label">Prescription</span>
              <span class="receipt-item-val">${rxChoice === 'enter-rx' ? 'Optical Prescription Attached' : 'Zero-Power Blue-Cut'}</span>
            </div>
            <div class="receipt-detail-item">
              <span class="receipt-item-label">Payment</span>
              <span class="receipt-item-val" style="${payChoice === 'upi' ? 'color:#B45309; font-weight:700;' : ''}">${payChoice === 'upi' ? `⏳ Awaiting UPI Verification (UTR: ${escapeHtml(utrVal)})` : (payChoice === 'card' ? 'Card Payment' : 'Prepaid / Online Payment')}</span>
            </div>
          </div>
          <div class="receipt-total-row">
            <span>Total Payable</span>
            <span>${formatINR(grandTotal)}</span>
          </div>
        `;
      }

      // Switch Views inside Modal and customize heading
      if (DOM.checkoutContentNormal) DOM.checkoutContentNormal.style.display = 'none';
      if (DOM.checkoutContentSuccess) {
        DOM.checkoutContentSuccess.style.display = 'block';
        const successH3 = DOM.checkoutContentSuccess.querySelector('h3');
        const successP = DOM.checkoutContentSuccess.querySelector('p');
        if (payChoice === 'upi') {
          if (successH3) successH3.textContent = 'Order Placed – Payment Verification in Progress';
          if (successP) successP.textContent = `Thank you for your order! We have registered your 12-digit UPI Reference (${utrVal}). Our optical team is verifying the transaction credit with our bank account. Spectacle crafting will begin immediately once approved.`;
        } else {
          if (successH3) successH3.textContent = 'Order Placed Successfully';
          if (successP) successP.textContent = 'Thank you for choosing Noor Optics. Your bespoke Scandinavian eyewear order has been confirmed. Our master optometrist will verify your prescription details before precision glazing.';
        }
      }

      // Clear Cart after successful checkout
      state.cart = [];
      if (window.saveCart) window.saveCart([]);
      updateBagBadge();
      renderCartDrawer();
    } catch (err) {
      console.error('Failed to submit order:', err);
      showToast('An unexpected error occurred while placing order. Please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = payChoice === 'upi' ? 'Confirm Order & Pay via UPI' : 'Place Order';
      }
    }
  }

  // ── Global Event Delegation ────────────────────────────────────────────────
  function attachEventHandlers() {
    // Top utility toggles
    if (DOM.btnSearchToggle) {
      DOM.btnSearchToggle.addEventListener('click', () => {
        DOM.searchExpandBar.classList.toggle('active');
        if (DOM.searchExpandBar.classList.contains('active') && DOM.searchInput) {
          DOM.searchInput.focus();
        }
      });
    }

    // Search Input Real-Time Event
    if (DOM.searchInput) {
      DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (DOM.searchClearBtn) {
          if (state.searchQuery) {
            DOM.searchClearBtn.classList.add('visible');
          } else {
            DOM.searchClearBtn.classList.remove('visible');
          }
        }
        renderProductGrid();
      });
    }

    if (DOM.searchClearBtn) {
      DOM.searchClearBtn.addEventListener('click', () => {
        state.searchQuery = '';
        if (DOM.searchInput) DOM.searchInput.value = '';
        DOM.searchClearBtn.classList.remove('visible');
        renderProductGrid();
      });
    }

    // Search Tag Pills
    DOM.searchTagPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const query = pill.getAttribute('data-query');
        state.searchQuery = query;
        if (DOM.searchInput) DOM.searchInput.value = query;
        if (DOM.searchClearBtn) DOM.searchClearBtn.classList.add('visible');
        renderProductGrid();
      });
    });

    // Sort Toggle & Items
    if (DOM.btnSortToggle) {
      DOM.btnSortToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.sortMenu.classList.toggle('open');
      });
    }

    DOM.sortItems.forEach(item => {
      item.addEventListener('click', () => {
        DOM.sortItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        state.currentSort = item.getAttribute('data-sort');
        if (DOM.currentSortLabel) {
          DOM.currentSortLabel.textContent = item.textContent.replace('✓', '').trim();
        }
        DOM.sortMenu.classList.remove('open');
        renderProductGrid();
      });
    });

    // Close sort menu on click outside
    document.addEventListener('click', (e) => {
      if (DOM.sortMenu && !DOM.sortMenu.contains(e.target) && e.target !== DOM.btnSortToggle) {
        DOM.sortMenu.classList.remove('open');
      }
    });

    // Drawers Open
    if (DOM.btnFilterToggle) {
      DOM.btnFilterToggle.addEventListener('click', () => openDrawer(DOM.filterDrawer));
    }
    if (DOM.btnWishlistToggle) {
      DOM.btnWishlistToggle.addEventListener('click', () => {
        renderWishlistDrawer();
        openDrawer(DOM.wishlistDrawer);
      });
    }
    if (DOM.btnBagToggle) {
      DOM.btnBagToggle.addEventListener('click', () => {
        renderCartDrawer();
        openDrawer(DOM.cartDrawer);
      });
    }

    // Mobile Drawer Open & Close
    if (DOM.btnMobileMenu && DOM.mobileMenuDrawer) {
      DOM.btnMobileMenu.addEventListener('click', () => {
        closeAllDrawers();
        DOM.mobileMenuDrawer.classList.add('open');
        if (DOM.drawerBackdrop) DOM.drawerBackdrop.classList.add('open');
        document.body.classList.add('drawer-open');
      });
    }

    if (DOM.btnCloseMobileMenu && DOM.mobileMenuDrawer) {
      DOM.btnCloseMobileMenu.addEventListener('click', () => {
        DOM.mobileMenuDrawer.classList.remove('open');
        if (DOM.drawerBackdrop) DOM.drawerBackdrop.classList.remove('open');
        document.body.classList.remove('drawer-open');
      });
    }

    // Mobile Drawer Category Navigation
    document.querySelectorAll('.mobile-drawer-item[data-shape]').forEach(item => {
      item.addEventListener('click', () => {
        const shape = item.getAttribute('data-shape') || 'all';
        state.filters.shape = shape;
        syncFilterDrawerUI();
        syncShapePillNav();
        renderProductGrid();
        closeAllDrawers();
      });
    });

    document.querySelectorAll('.mobile-drawer-item[data-material]').forEach(item => {
      item.addEventListener('click', () => {
        const material = item.getAttribute('data-material') || 'all';
        state.filters.material = material;
        syncFilterDrawerUI();
        renderProductGrid();
        closeAllDrawers();
      });
    });

    // Mobile Sort Bottom Sheet
    if (DOM.btnMobileSort && DOM.sortBottomSheet) {
      DOM.btnMobileSort.addEventListener('click', () => {
        closeAllDrawers();
        DOM.sortBottomSheet.classList.add('open');
        if (DOM.sortSheetBackdrop) DOM.sortSheetBackdrop.classList.add('open');
        document.body.classList.add('drawer-open');
      });
    }

    const closeSortSheet = () => {
      if (DOM.sortBottomSheet) DOM.sortBottomSheet.classList.remove('open');
      if (DOM.sortSheetBackdrop) DOM.sortSheetBackdrop.classList.remove('open');
      document.body.classList.remove('drawer-open');
    };

    if (DOM.btnCloseSortSheet) {
      DOM.btnCloseSortSheet.addEventListener('click', closeSortSheet);
    }
    if (DOM.sortSheetBackdrop) {
      DOM.sortSheetBackdrop.addEventListener('click', closeSortSheet);
    }

    document.querySelectorAll('.sheet-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sheet-opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentSort = btn.getAttribute('data-sort');
        if (DOM.currentSortLabel) {
          DOM.currentSortLabel.textContent = btn.textContent.replace('✓', '').trim();
        }
        closeSortSheet();
        renderProductGrid();
      });
    });

    // Mobile Sub-Bar Filter Trigger
    if (DOM.btnMobileFilter && DOM.filterDrawer) {
      DOM.btnMobileFilter.addEventListener('click', () => openDrawer(DOM.filterDrawer));
    }

    // Drawer Close Buttons
    document.querySelectorAll('[data-drawer-close]').forEach(btn => {
      btn.addEventListener('click', closeAllDrawers);
    });

    // Modal Close Buttons
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', closeAllModals);
    });

    // Drawer Backdrop Click
    if (DOM.drawerBackdrop) {
      DOM.drawerBackdrop.addEventListener('click', closeAllDrawers);
    }

    // Modal Backdrop Click
    [DOM.quickViewModal, DOM.checkoutModal].forEach(modal => {
      if (!modal) return;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAllModals();
      });
    });

    // Shape Pills Nav Bar
    if (DOM.shapePillsNav) {
      DOM.shapePillsNav.querySelectorAll('.shape-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const shape = pill.getAttribute('data-shape') || 'all';
          state.filters.shape = shape;
          syncFilterDrawerUI();
          syncShapePillNav();
          renderProductGrid();
        });
      });
    }

    // Filter Drawer Checkboxes & Radio Listeners
    if (DOM.filterDrawer) {
      DOM.filterDrawer.addEventListener('change', (e) => {
        const target = e.target;
        if (target.name === 'filter-shape') state.filters.shape = target.value;
        if (target.name === 'filter-material') state.filters.material = target.value;
        if (target.name === 'filter-fit') state.filters.fit = target.value;
        if (target.name === 'filter-price') state.filters.priceRange = target.value;
        if (target.name === 'filter-gender') state.filters.gender = target.value;
        if (target.name === 'filter-category') state.filters.category = target.value;
        if (target.name === 'filter-brand') state.filters.brand = target.value;
      });

      DOM.filterDrawer.querySelectorAll('.filter-color-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const col = chip.getAttribute('data-filter-color');
          state.filters.color = (state.filters.color.toLowerCase() === col.toLowerCase()) ? 'all' : col;
          syncFilterDrawerUI();
        });
      });

      const btnApply = document.getElementById('btn-apply-filters');
      if (btnApply) {
        btnApply.addEventListener('click', () => {
          syncShapePillNav();
          renderProductGrid();
          closeAllDrawers();
          showToast('Filters applied');
        });
      }

      const btnReset = document.getElementById('btn-reset-filters-drawer');
      if (btnReset) {
        btnReset.addEventListener('click', resetAllFilters);
      }
    }

    // Checkout Modal Open & Submit
    if (DOM.btnCartCheckout) {
      DOM.btnCartCheckout.addEventListener('click', openDemoCheckout);
    }

    if (DOM.checkoutForm) {
      DOM.checkoutForm.addEventListener('submit', handleDemoOrderSubmit);

      DOM.checkoutForm.querySelectorAll('input[name="checkout-rx"]').forEach(radio => {
        radio.addEventListener('change', () => {
          const rxPanel = document.getElementById('checkout-rx-structured-panel');
          if (rxPanel) {
            rxPanel.style.display = radio.value === 'enter-rx' ? 'block' : 'none';
          }
        });
      });

      DOM.checkoutForm.querySelectorAll('input[name="checkout-pay"]').forEach(radio => {
        radio.addEventListener('change', () => {
          const upiPanel = document.getElementById('checkout-upi-qr-panel');
          const submitBtn = document.getElementById('btn-submit-order');
          if (upiPanel) {
            const isUpi = radio.value === 'upi';
            upiPanel.style.display = isUpi ? 'block' : 'none';
            if (isUpi) renderCheckoutUpiPanel();
          }
          if (submitBtn) {
            submitBtn.textContent = radio.value === 'upi' ? 'Confirm Order & Pay via UPI' : 'Place Order';
          }
        });
      });

      // UPI ID Copy Helper
      const vpaCopyEl = document.getElementById('checkout-upi-vpa-copy');
      if (vpaCopyEl) {
        vpaCopyEl.addEventListener('click', () => {
          navigator.clipboard.writeText('9182341567@mairtel');
          showToast('UPI ID copied: 9182341567@mairtel', 'success');
        });
      }

      // UPI Screenshot Upload Trigger
      const btnUpload = document.getElementById('btn-upload-upi-receipt');
      const fileInput = document.getElementById('checkout-upi-file');
      const badgeEl = document.getElementById('upi-file-badge');
      if (btnUpload && fileInput) {
        btnUpload.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            if (badgeEl) badgeEl.textContent = '✓ ' + file.name.slice(0, 20);
            const reader = new FileReader();
            reader.onload = (re) => {
              state.uploadedUpiScreenshot = re.target.result;
              showToast('Screenshot attached.', 'success');
            };
            reader.readAsDataURL(file);
          }
        });
      }

      // Auto-clear error borders on user input
      ['checkout-name', 'checkout-phone', 'checkout-address', 'checkout-city', 'checkout-pin', 'checkout-upi-utr'].forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) {
          inputEl.addEventListener('input', () => {
            inputEl.style.borderColor = '';
            inputEl.style.boxShadow = '';
          });
        }
      });
    }

    const btnCloseSuccess = document.getElementById('btn-close-success-order');
    if (btnCloseSuccess) {
      btnCloseSuccess.addEventListener('click', closeAllModals);
    }

    // Product Grid Click Delegation (Wishlist, Quickview, Add to bag, Swatches)
    if (DOM.productGrid) {
      DOM.productGrid.addEventListener('click', (e) => {
        const wishlistBtn = e.target.closest('[data-action="wishlist"]');
        if (wishlistBtn) {
          e.stopPropagation();
          const id = wishlistBtn.getAttribute('data-id');
          toggleWishlist(id);
          return;
        }

        const addBagBtn = e.target.closest('[data-action="addbag"]');
        if (addBagBtn) {
          e.stopPropagation();
          const id = addBagBtn.getAttribute('data-id');
          openQuickView(id);
          return;
        }

        const quickViewTrigger = e.target.closest('[data-action="quickview"]');
        if (quickViewTrigger) {
          e.stopPropagation();
          const id = quickViewTrigger.getAttribute('data-id');
          openQuickView(id);
          return;
        }

        // Swatch dot on product card
        const colorDot = e.target.closest('.color-dot');
        if (colorDot) {
          e.stopPropagation();
          const card = colorDot.closest('.product-card');
          if (card) {
            card.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
            colorDot.classList.add('active');
            const colorName = colorDot.getAttribute('data-color-name');
            showToast(`Selected ${colorName}`);
          }
          return;
        }
      });
    }

    // Wishlist Drawer Action Delegation
    if (DOM.wishlistItemsList) {
      DOM.wishlistItemsList.addEventListener('click', (e) => {
        const moveBtn = e.target.closest('[data-action="wishlist-move"]');
        if (moveBtn) {
          const id = moveBtn.getAttribute('data-id');
          addToCart(id);
          state.wishlist.delete(id);
          if (window.saveWishlist) window.saveWishlist(Array.from(state.wishlist));
          updateWishlistBadge();
          renderWishlistDrawer();
          renderProductGrid();
          return;
        }

        const removeBtn = e.target.closest('[data-action="wishlist-remove"]');
        if (removeBtn) {
          const id = removeBtn.getAttribute('data-id');
          toggleWishlist(id);
          return;
        }
      });
    }

    // Cart Drawer Action Delegation
    if (DOM.cartItemsList) {
      DOM.cartItemsList.addEventListener('click', (e) => {
        const plusBtn = e.target.closest('[data-action="cart-plus"]');
        if (plusBtn) {
          const key = plusBtn.getAttribute('data-key');
          updateCartQuantity(key, 1);
          return;
        }

        const minusBtn = e.target.closest('[data-action="cart-minus"]');
        if (minusBtn) {
          const key = minusBtn.getAttribute('data-key');
          updateCartQuantity(key, -1);
          return;
        }

        const removeBtn = e.target.closest('[data-action="cart-remove"]');
        if (removeBtn) {
          const key = removeBtn.getAttribute('data-key');
          removeCartItem(key);
          return;
        }
      });
    }

    // Newsletter Subscription in Footer
    const newsletterForm = document.getElementById('footer-newsletter-form');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('footer-newsletter-email');
        const email = emailInput ? emailInput.value.trim() : '';
        if (email) {
          if (window.NoorSupabase) {
            const res = await window.NoorSupabase.subscribeNewsletter(email);
            if (res && res.cloud) {
              showToast('Subscribed to Noor Journal! (Synced to Supabase)');
            } else if (res && res.message) {
              showToast(res.message);
            } else {
              showToast('Thank you for subscribing to Noor Journal.');
            }
          } else {
            showToast('Thank you for subscribing to Noor Journal.');
          }
          newsletterForm.reset();
        }
      });
    }

    // Keyboard Accessibility (Esc closes drawers & modals)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllDrawers();
        closeAllModals();
        if (DOM.sortMenu) DOM.sortMenu.classList.remove('open');
      }
    });
  }

  // ── Rotating Announcement Bar Ticker ───────────────────────────────────────
  function initAnnouncementTicker() {
    const ticker = document.getElementById('announcement-ticker');
    if (!ticker) return;
    const slides = ticker.querySelectorAll('.announcement-slide');
    if (slides.length <= 1) return;
    let activeIdx = 0;

    setInterval(() => {
      slides[activeIdx].classList.remove('active');
      activeIdx = (activeIdx + 1) % slides.length;
      slides[activeIdx].classList.add('active');
    }, 4000);
  }

  // ── High-Performance Smooth Scroll & Elevation Engine ─────────────────────
  let cardObserver = null;
  function refreshCardScrollObserver() {
    const nativeViewTimeline = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('animation-timeline', 'view()');
    if (nativeViewTimeline) return; // Native CSS scroll-driven animation handles it on compositor thread

    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.product-card').forEach(c => c.classList.add('revealed'));
      return;
    }

    if (cardObserver) cardObserver.disconnect();

    cardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          cardObserver.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -30px 0px',
      threshold: 0.05
    });

    document.querySelectorAll('.product-card').forEach(card => {
      card.classList.add('scroll-reveal-item');
      cardObserver.observe(card);
    });
  }

  function initSmoothScrollEngine() {
    const header = document.querySelector('.store-header');

    // Throttled 120Hz/60Hz compositor-friendly scroll watcher for header elevation
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY || window.pageYOffset || 0;
          if (header) {
            header.classList.toggle('scrolled', y > 20);
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    refreshCardScrollObserver();
  }

  // ── Sync Live Catalog from SQLite API & Supabase Cloud ─────────────────────
  async function loadLiveCatalog() {
    try {
      let cloudProducts = [];

      // Helper to identify and purge obsolete dummy Scandinavian template products
      const isLegacyDummyMock = (p) => {
        if (!p) return true;
        const id = String(p.id || '').toLowerCase().trim();
        const name = String(p.name || '').toLowerCase().trim();
        if (/^noor-(0[1-9]|1[0-8])$/.test(id)) return true;
        if (/helsinki|berlin hex|zurich titanium|milan aureum|stockholm noir|copenhagen round|oslo crystal|kyoto havana|reykjavik|vienna silhouette|amber arch|tokyo steel|gothenburg|malm|arctic sun|nord fjord|bergen dual|bordeaux edge/i.test(name)) return true;
        return false;
      };

      // 1. Fetch from server SQLite API (authoritative 55 luxury frames: Burberry, Cartier, D&G...)
      try {
        const resp = await fetch('/api/products');
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            cloudProducts = data.filter(p => !isLegacyDummyMock(p));
          }
        }
      } catch (apiErr) {
        console.warn('Live API fetch note:', apiErr.message);
      }

      // Fallback to static EYEWEAR_CATALOG if API is offline
      if (cloudProducts.length === 0 && Array.isArray(window.EYEWEAR_CATALOG) && window.EYEWEAR_CATALOG.length > 0) {
        cloudProducts = window.EYEWEAR_CATALOG.filter(p => !isLegacyDummyMock(p));
      }

      // 2. Fetch directly from Supabase Cloud (SYS-CATALOG-PRODUCTS) for 0ms lag
      let supabaseProducts = [];
      if (window.NoorSupabase && window.NoorSupabase.isConfigured()) {
        try {
          const rawSupabase = await window.NoorSupabase.fetchCatalog() || [];
          supabaseProducts = (Array.isArray(rawSupabase) ? rawSupabase : []).filter(p => !isLegacyDummyMock(p));
        } catch (_) {}
      }

      // Merge Supabase products (strictly only genuine non-dummy items)
      if (Array.isArray(supabaseProducts) && supabaseProducts.length > 0) {
        supabaseProducts.forEach(sp => {
          if (!sp || !sp.name || isLegacyDummyMock(sp)) return;
          const spSku = (sp.sku && sp.sku.trim() && sp.sku.trim().toUpperCase() !== 'NOOR-FRAME') ? sp.sku.trim().toUpperCase() : null;
          const spName = sp.name.trim().toLowerCase();
          const matchIdx = cloudProducts.findIndex(p => p.id === sp.id || (p.sku && spSku && p.sku.toUpperCase() === spSku) || (p.name && p.name.trim().toLowerCase() === spName));
          if (matchIdx < 0) {
            // Newest cloud frame not yet in SQLite response; prepend to catalog!
            cloudProducts.unshift({
              ...sp,
              image_url: sp.image || sp.imageUrl || sp.image_url,
              selling_price_inr: sp.price || sp.selling_price_inr,
              total_stock: sp.stock !== undefined ? sp.stock : (sp.total_stock !== undefined ? sp.total_stock : 10)
            });
          }
        });
      }

      // 3. Clear local deleted tokens for all active products
      try {
        let tokens = getDeletedProductTokens();
        let changed = false;
        cloudProducts.forEach(p => {
          if (p.id && tokens.delete(String(p.id).toLowerCase().trim())) changed = true;
          if (p.sku && tokens.delete(String(p.sku).toLowerCase().trim())) changed = true;
          if (p.name && tokens.delete(String(p.name).toLowerCase().trim())) changed = true;
        });
        if (changed) {
          localStorage.setItem('noor_deleted_products', JSON.stringify(Array.from(tokens)));
        }
      } catch (_) { }

      const delTokens = getDeletedProductTokens();

      // 4. Merge local cached custom frames (never discard newly added items!)
      try {
        let localCached = JSON.parse(localStorage.getItem('noor_custom_frames') || '[]');
        if (Array.isArray(localCached)) {
          const reconciledLocal = [];
          localCached.forEach(lc => {
            if (!lc || !lc.name || isLegacyDummyMock(lc)) return;
            const lSku = (lc.sku && lc.sku.trim() && lc.sku.trim().toUpperCase() !== 'NOOR-FRAME') ? lc.sku.trim().toUpperCase() : null;
            const lName = lc.name.trim().toLowerCase();
            const matchIdx = cloudProducts.findIndex(p => p.id === lc.id || (p.sku && lSku && p.sku.toUpperCase() === lSku) || (p.name && p.name.trim().toLowerCase() === lName));
            if (matchIdx >= 0) {
              const serverImg = cloudProducts[matchIdx].image_url || cloudProducts[matchIdx].image;
              if (serverImg && !serverImg.includes('frames/frame_01.jpg')) {
                lc.image_url = serverImg;
              }
              lc.name = cloudProducts[matchIdx].name;
              lc.selling_price_inr = cloudProducts[matchIdx].selling_price_inr || cloudProducts[matchIdx].price;
              lc.total_stock = cloudProducts[matchIdx].total_stock !== undefined ? cloudProducts[matchIdx].total_stock : cloudProducts[matchIdx].stock;
              reconciledLocal.push(lc);
            } else {
              // Newly added frame locally - ALWAYS keep and display!
              cloudProducts.unshift(lc);
              reconciledLocal.push(lc);
            }
          });
          localStorage.setItem('noor_custom_frames', JSON.stringify(reconciledLocal));
        }
      } catch (_) { }

      if (!Array.isArray(cloudProducts) || cloudProducts.length === 0) {
        state.catalog = [];
        state.isLoading = false;
        renderProductGrid();
        return;
      }

      const staticList = window.EYEWEAR_CATALOG || [];

      state.catalog = cloudProducts
        .filter(p => {
          if (!p || isLegacyDummyMock(p)) return false;
          // If product came directly from live /api/products, it is active in database
          if (p.selling_price_paise !== undefined || p.variants !== undefined) return true;
          const pId = p.id ? String(p.id).toLowerCase().trim() : '';
          const pSku = p.sku ? String(p.sku).toLowerCase().trim() : '';
          const pName = p.name ? String(p.name).toLowerCase().trim() : '';
          return !delTokens.has(pId) && !delTokens.has(pSku) && !delTokens.has(pName);
        })
        .map(p => {
          const staticMatch = staticList.find(sc => sc.id === p.id || (sc.sku && p.sku && sc.sku.toUpperCase() === p.sku.toUpperCase()) || sc.name.toLowerCase() === p.name.toLowerCase());

          let colors = [];
          if (Array.isArray(p.variants) && p.variants.length > 0) {
            colors = p.variants.map(v => ({
              name: v.color_name || 'Standard',
              hex: v.color_hex || '#111111'
            }));
          } else if (staticMatch && staticMatch.colors) {
            colors = staticMatch.colors;
          } else {
            colors = [{ name: 'Standard', hex: '#111111' }];
          }

          let dimensions = { lens: '52mm', bridge: '18mm', temple: '145mm', weight: '15g' };
          if (staticMatch && staticMatch.dimensions) {
            dimensions = staticMatch.dimensions;
          } else if (p.variants && p.variants[0] && p.variants[0].dimensions_json) {
            try { dimensions = JSON.parse(p.variants[0].dimensions_json); } catch (_) { }
          }

          const price = p.selling_price_inr !== undefined ? p.selling_price_inr : (p.selling_price_paise ? p.selling_price_paise / 100 : (staticMatch ? staticMatch.price : 2999));
          const originalPrice = p.original_price_inr !== undefined ? p.original_price_inr : (p.original_price_paise ? p.original_price_paise / 100 : (staticMatch ? staticMatch.originalPrice : null));
          const stock = Number(p.total_stock !== undefined ? p.total_stock : (p.stock || 10));

          let badge = staticMatch ? staticMatch.badge : '';
          if (stock <= 0) badge = 'Out of Stock';
          else if (!badge && !staticMatch) badge = 'New Arrival';

          return {
            id: p.id,
            sku: p.sku,
            name: p.name,
            brand: p.brand || (staticMatch ? staticMatch.brand : 'Noor Optics'),
            gender: p.gender || (staticMatch ? staticMatch.gender : 'Unisex'),
            category: p.category || (staticMatch ? staticMatch.category : 'Eyeglasses'),
            collection: staticMatch ? staticMatch.collection : (p.brand || 'Nordic Collection'),
            price: price,
            originalPrice: originalPrice,
            badge: badge,
            shape: p.shape || (staticMatch ? staticMatch.shape : 'Rectangular'),
            material: p.material || (staticMatch ? staticMatch.material : 'Italian Bio-Acetate'),
            fit: p.fit || (staticMatch ? staticMatch.fit : 'Regular'),
            rating: staticMatch ? staticMatch.rating : 4.9,
            reviewsCount: staticMatch ? staticMatch.reviewsCount : 24,
            image: p.image_url || p.image || p.imageUrl || (staticMatch ? staticMatch.image : 'images/frames/frame_01.jpg'),
            colors: colors,
            dimensions: dimensions,
            description: p.description || (staticMatch ? staticMatch.description : 'Bespoke Scandinavian eyewear engineered with optical precision.')
          };
        });

      state.isLoading = false;
      renderProductGrid();
      console.log(`✓ Live catalog synced from /api/products: ${state.catalog.length} frames active.`);
    } catch (err) {
      console.warn('Live catalog sync warning:', err);
      state.isLoading = false;
      renderProductGrid();
    }
  }

  // ── Lenskart-Style Visual Showcase Controllers ─────────────────────────────
  function selectVisualCategory(category, gender) {
    if (gender === 'sale') {
      // Toggle if already selected
      if (state.filters.category === category && state.filters.priceRange === 'under-3500') {
        state.filters.category = 'all';
        state.filters.priceRange = 'all';
        state.filters.gender = 'all';
      } else {
        state.filters.category = category || 'all';
        state.filters.priceRange = 'under-3500';
        state.filters.gender = 'all';
      }
    } else {
      // Toggle if already selected
      if (state.filters.category === category && state.filters.gender === gender) {
        state.filters.category = 'all';
        state.filters.gender = 'all';
      } else {
        if (category) state.filters.category = category;
        if (gender) state.filters.gender = gender;
        if (state.filters.priceRange === 'under-3500') state.filters.priceRange = 'all';
      }
    }

    syncVisualShowcaseUI();
    renderActiveFilterChips();
    renderProductGrid();

    // Smooth scroll to catalog
    const countEl = document.getElementById('catalog-count') || document.getElementById('product-grid');
    if (countEl) {
      countEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const gText = state.filters.gender === 'all' ? 'All' : state.filters.gender;
    const catText = state.filters.category === 'all' ? 'All Frames' : state.filters.category;
    showToast(`Browsing ${catText} (${gText})`);
  }

  function selectBrand(brand) {
    if (state.filters.brand === brand) {
      state.filters.brand = 'all';
    } else {
      state.filters.brand = brand || 'all';
    }

    syncVisualShowcaseUI();
    renderActiveFilterChips();
    renderProductGrid();

    const countEl = document.getElementById('catalog-count') || document.getElementById('product-grid');
    if (countEl) {
      countEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showToast(state.filters.brand === 'all' ? 'Browsing all boutique brands' : `Brand: ${state.filters.brand}`);
  }

  function filterByPromoSale() {
    state.filters.priceRange = (state.filters.priceRange === 'under-3500') ? 'all' : 'under-3500';
    syncVisualShowcaseUI();
    renderActiveFilterChips();
    renderProductGrid();
    const countEl = document.getElementById('catalog-count') || document.getElementById('product-grid');
    if (countEl) countEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Showing sale collection!');
  }

  // Expose to window for inline HTML onclick handlers
  window.selectVisualCategory = selectVisualCategory;
  window.selectBrand = selectBrand;
  window.filterByPromoSale = filterByPromoSale;

  // ── Initialization ────────────────────────────────────────────────────────
  function init() {
    initDOMCache();
    initAnnouncementTicker();
    initSmoothScrollEngine();
    updateBagBadge();
    updateWishlistBadge();
    state.isLoading = true;
    renderProductGrid();
    renderCartDrawer();
    renderWishlistDrawer();
    attachEventHandlers();

    // Fetch live inventory items so newly added frames appear immediately on the webpage
    loadLiveCatalog();

    // Auto-refresh catalog on tab focus and periodic background sync (every 60 seconds)
    window.addEventListener('focus', loadLiveCatalog);
    setInterval(loadLiveCatalog, 60000);
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
