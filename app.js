/**
 * app.js – Noor Optics Storefront Logic
 * High-performance vanilla JavaScript controller for product catalog,
 * facet filtering, real-time search, interactive drawers, and demo checkout.
 */

'use strict';

(function() {
  // ── Global Storefront State ────────────────────────────────────────────────
  const state = {
    catalog: window.EYEWEAR_CATALOG || [],
    cart: window.getSavedCart ? window.getSavedCart() : [],
    wishlist: new Set(window.getSavedWishlist ? window.getSavedWishlist() : []),
    currentSort: 'featured',
    searchQuery: '',
    filters: {
      shape: 'all',
      material: 'all',
      fit: 'all',
      color: 'all',
      priceRange: 'all'
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
    if (!img) return '/images/stockholm_noir.jpg';
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

    // 2. Shape Filter
    if (state.filters.shape !== 'all') {
      list = list.filter(item => item.shape.toLowerCase() === state.filters.shape.toLowerCase());
    }

    // 3. Material Filter
    if (state.filters.material !== 'all') {
      list = list.filter(item => item.material.toLowerCase().includes(state.filters.material.toLowerCase()));
    }

    // 4. Fit Filter
    if (state.filters.fit !== 'all') {
      list = list.filter(item => item.fit.toLowerCase() === state.filters.fit.toLowerCase());
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
        <article class="product-card" data-product-id="${product.id}">
          <div class="card-media" data-action="quickview" data-id="${product.id}">
            ${badgeHtml}
            <button class="card-wishlist-btn ${isWishlisted ? 'active' : ''}"
                    data-action="wishlist"
                    data-id="${product.id}"
                    aria-label="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <img class="card-img"
                 src="${formatProductImage(product.image)}"
                 alt="${product.name} - ${product.shape} Eyeglasses"
                 loading="lazy"
                 decoding="async"
                 onerror="this.onerror=null; this.src='/images/stockholm_noir.jpg';"
                 id="img-${product.id}">
            <div class="card-quick-action">
              <button class="btn-card-quickview" data-action="quickview" data-id="${product.id}">Quick View</button>
            </div>
          </div>
          <div class="card-content">
            <div class="card-header-row">
              <div class="card-title-group">
                <h3 class="card-name" data-action="quickview" data-id="${product.id}">${product.name}</h3>
                <span class="card-meta">${product.collection} · ${product.material}</span>
              </div>
            </div>
            <div class="card-price-row">
              <span class="card-price">${formatINR(product.price)}</span>
              ${product.originalPrice ? `<span class="card-price-strike">${formatINR(product.originalPrice)}</span>` : ''}
              ${discountPercent ? `<span class="card-discount-badge">Save ${discountPercent}%</span>` : ''}
            </div>
            <div class="card-swatches">
              ${swatchesHtml}
            </div>
            <div class="card-bottom-actions">
              <button class="btn-card-addbag" data-action="addbag" data-id="${product.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                Add to Bag
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
        syncShapePillNav();
        renderProductGrid();
      });
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
      priceRange: 'all'
    };
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
    if (!DOM.wishlistCountBadge) return;
    const count = state.wishlist.size;
    DOM.wishlistCountBadge.textContent = count;
    if (count > 0) {
      DOM.wishlistCountBadge.classList.remove('empty');
    } else {
      DOM.wishlistCountBadge.classList.add('empty');
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
          <img class="wishlist-item-img" src="${formatProductImage(product.image)}" alt="${product.name}" onerror="this.onerror=null; this.src='/images/stockholm_noir.jpg';">
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
    if (!DOM.bagCountBadge) return;
    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    DOM.bagCountBadge.textContent = totalCount;
    if (totalCount > 0) {
      DOM.bagCountBadge.classList.remove('empty');
    } else {
      DOM.bagCountBadge.classList.add('empty');
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
        <img class="cart-item-img" src="${formatProductImage(item.image)}" alt="${item.name}" onerror="this.onerror=null; this.src='/images/stockholm_noir.jpg';">
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
          <img class="quickview-img" src="${formatProductImage(product.image)}" alt="${product.name}" id="qv-main-img" onerror="this.onerror=null; this.src='/images/stockholm_noir.jpg';">
        </div>
        <div class="quickview-info">
          <div>
            <span class="quickview-collection">${product.collection} · ${product.shape}</span>
            <h2 class="quickview-title">${product.name}</h2>
          </div>
          <div class="quickview-price-wrap">
            <span class="quickview-price" id="qv-calculated-price">${formatINR(product.price)}</span>
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
    const calculated = product.price + lensPkg.price;
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
          <img class="checkout-preview-img" src="${formatProductImage(item.image)}" alt="${item.name}" onerror="this.onerror=null; this.src='/images/stockholm_noir.jpg';">
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

    openModal(DOM.checkoutModal);
  }

  async function handleDemoOrderSubmit(e) {
    e.preventDefault();

    const name = (document.getElementById('checkout-name')?.value || '').trim() || 'Valued Client';
    const age = parseInt(document.getElementById('checkout-age')?.value || '', 10) || null;
    const email = (document.getElementById('checkout-email')?.value || '').trim() || 'client@example.com';
    const phone = (document.getElementById('checkout-phone')?.value || '').trim() || '+91 98765 43210';
    const address = (document.getElementById('checkout-address')?.value || '').trim() || 'Standard Delivery';
    const city = (document.getElementById('checkout-city')?.value || '').trim() || 'Bengaluru';
    const pin = (document.getElementById('checkout-pin')?.value || '').trim() || '560038';
    const rxChoice = document.querySelector('input[name="checkout-rx"]:checked')?.value || 'call-optometrist';
    const payChoice = document.querySelector('input[name="checkout-pay"]:checked')?.value || 'cod';

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
    const orderId = 'NOOR-' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const orderData = {
      order_ref: orderId,
      customer_name: name,
      customer_age: age,
      customer_email: email,
      customer_phone: phone,
      delivery_address: address,
      city: city,
      pin_code: pin,
      items: state.cart.map(item => ({
        id: item.id,
        name: item.name,
        brand: item.brand || 'Noor Optics',
        model: item.model || item.name,
        shape: item.shape || 'Optical',
        color: item.color,
        size: item.fit || 'Regular',
        lens: item.lensName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        subtotal: item.unitPrice * item.quantity
      })),
      prescription_pref: rxChoice,
      prescription: prescriptionData,
      payment_method: payChoice,
      subtotal: subtotal,
      shipping_fee: shipping,
      grand_total: grandTotal
    };

    let retailDbBadge = '';
    let authoritativeOrderId = orderId;
    let authoritativeTokenNum = null;

    // 1. Submit to Unified Local Authoritative Retail Backend
    try {
      const backendResp = await fetch('/api/orders/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          customerAge: age,
          customerEmail: email,
          customerPhone: phone,
          deliveryAddress: address,
          city: city,
          pinCode: pin,
          prescriptionPref: rxChoice,
          prescription: prescriptionData,
          paymentMethod: payChoice === 'upi' ? 'UPI_GPAY' : (payChoice === 'card' ? 'CARD' : 'CASH'),
          items: state.cart.map(item => ({
            id: item.id,
            name: item.name,
            brand: item.brand || 'Noor Optics',
            model: item.model || item.name,
            shape: item.shape || 'Optical',
            color: item.color,
            size: item.fit || 'Regular',
            lensName: item.lensName,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        })
      });

      if (backendResp.ok) {
        const localRes = await backendResp.json();
        if (localRes.orderNumber) authoritativeOrderId = localRes.orderNumber;
        if (localRes.tokenNumber) authoritativeTokenNum = localRes.tokenNumber;
      }
    } catch (localErr) {
      console.warn('Note: Local Express backend not reached:', localErr);
    }

    // 2. Submit to Cloud Supabase (in background if configured)
    if (window.NoorSupabase && window.NoorSupabase.isConfigured()) {
      orderData.order_ref = authoritativeOrderId;
      await window.NoorSupabase.submitOrder(orderData).catch(e => console.warn('Supabase sync note:', e));
    }

    // Render clean, luxury customer-facing receipt (no internal DB/debug badges)
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
            <span class="receipt-item-val">${name} <span class="receipt-item-sub">(${email})</span></span>
          </div>
          <div class="receipt-detail-item">
            <span class="receipt-item-label">Destination</span>
            <span class="receipt-item-val">${city}, India · Express Tracked</span>
          </div>
          <div class="receipt-detail-item">
            <span class="receipt-item-label">Prescription</span>
            <span class="receipt-item-val">${rxChoice === 'call-optometrist' ? 'Optometrist Verification Call' : 'Zero-Power Blue-Cut'}</span>
          </div>
          <div class="receipt-detail-item">
            <span class="receipt-item-label">Payment</span>
            <span class="receipt-item-val">${payChoice === 'upi' ? 'Instant UPI / Google Pay (Demo)' : (payChoice === 'card' ? 'Card Payment (Demo)' : 'Cash / UPI on Delivery (Demo)')}</span>
          </div>
        </div>
        <div class="receipt-total-row">
          <span>Total Payable</span>
          <span>${formatINR(grandTotal)}</span>
        </div>
      `;
    }

    // Switch Views inside Modal
    if (DOM.checkoutContentNormal) DOM.checkoutContentNormal.style.display = 'none';
    if (DOM.checkoutContentSuccess) DOM.checkoutContentSuccess.style.display = 'block';

    // Clear Cart after successful checkout
    state.cart = [];
    if (window.saveCart) window.saveCart([]);
    updateBagBadge();
    renderCartDrawer();
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
          addToCart(id);
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

  // ── Sync Live Catalog from SQLite API ──────────────────────────────────────
  async function loadLiveCatalog() {
    try {
      const resp = await fetch('/api/products');
      if (!resp.ok) return;
      const cloudProducts = await resp.json();
      if (!Array.isArray(cloudProducts) || cloudProducts.length === 0) return;

      const staticList = window.EYEWEAR_CATALOG || [];

      state.catalog = cloudProducts.map(p => {
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
          try { dimensions = JSON.parse(p.variants[0].dimensions_json); } catch (_) {}
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
          collection: staticMatch ? staticMatch.collection : (p.brand || 'Nordic Collection'),
          price: price,
          originalPrice: originalPrice,
          badge: badge,
          shape: p.shape || (staticMatch ? staticMatch.shape : 'Rectangular'),
          material: p.material || (staticMatch ? staticMatch.material : 'Italian Bio-Acetate'),
          fit: p.fit || (staticMatch ? staticMatch.fit : 'Regular'),
          category: p.category || (staticMatch ? staticMatch.category : 'Optical'),
          rating: staticMatch ? staticMatch.rating : 4.9,
          reviewsCount: staticMatch ? staticMatch.reviewsCount : 24,
          image: p.image_url || (staticMatch ? staticMatch.image : 'images/stockholm_noir.jpg'),
          colors: colors,
          dimensions: dimensions,
          description: p.description || (staticMatch ? staticMatch.description : 'Bespoke Scandinavian eyewear engineered with optical precision.')
        };
      });

      renderProductGrid();
      console.log(`✓ Live catalog synced from /api/products: ${state.catalog.length} frames active.`);
    } catch (err) {
      console.warn('Live catalog sync warning:', err);
    }
  }

  // ── Initialization ────────────────────────────────────────────────────────
  function init() {
    initDOMCache();
    initAnnouncementTicker();
    initSmoothScrollEngine();
    updateBagBadge();
    updateWishlistBadge();
    renderProductGrid();
    renderCartDrawer();
    renderWishlistDrawer();
    attachEventHandlers();

    // Fetch live inventory items so newly added frames appear immediately on the webpage
    loadLiveCatalog();

    // Optional background sync from Supabase if connected (merges without dropping live catalog items)
    if (window.NoorSupabase && window.NoorSupabase.isConfigured()) {
      window.NoorSupabase.fetchCatalog().then(cloudProducts => {
        if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
          cloudProducts.forEach(cp => {
            if (!cp || !cp.name) return;
            const idx = state.catalog.findIndex(p => p.id === cp.id || (p.sku && cp.sku && p.sku.toUpperCase() === cp.sku.toUpperCase()));
            if (idx >= 0) {
              state.catalog[idx] = { ...state.catalog[idx], ...cp };
            } else {
              state.catalog.push(cp);
            }
          });
          renderProductGrid();
          console.log(`✓ Merged and synchronized ${cloudProducts.length} products from Supabase cloud.`);
        }
      });
    }
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
