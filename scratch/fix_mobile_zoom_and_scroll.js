const fs = require('fs');

let css = fs.readFileSync('admin.css', 'utf8');

// 1. Remove overscroll-behavior-y: none; from body (line 65)
css = css.replace('overscroll-behavior-y: none;', '/* overscroll-behavior removed to allow natural mobile scrolling */');

// 2. Remove all overscroll-behavior: contain; that trap mobile touch scrolls
css = css.replace(/overscroll-behavior:\s*contain;?/g, '/* overscroll-behavior: auto */');
css = css.replace(/overscroll-behavior-x:\s*contain;?/g, '/* overscroll-behavior-x: auto */');

// 3. Remove global forced 16px font-size on all inputs in mobile media query
css = css.replace(`  /* Prevent iOS input zoom (must be ≥ 16px) without nuking all typography */
  input, select, textarea {
    font-size: max(16px, 1em) !important;
  }`, `  /* Natural mobile form sizing */
  input, select, textarea {
    font-size: 13.5px;
    -webkit-appearance: none;
  }`);

// 4. Update html, body in mobile media query to enable smooth touch scrolling
const oldMobileHtmlBody = `  /* 1. Prevent mobile viewport auto-zooming and side-scrolling */
  html, body {
    width: 100%;
    max-width: 100dvw;
    overflow-x: hidden;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    touch-action: manipulation;
  }`;

const newMobileHtmlBody = `  /* 1. Allow fluid vertical touch scrolling & prevent horizontal overflow */
  html {
    width: 100%;
    height: 100%;
    overflow-x: hidden;
  }
  body {
    width: 100%;
    min-height: 100%;
    overflow-x: hidden;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
    touch-action: pan-y !important;
    font-size: 13px !important;
  }`;

css = css.replace(oldMobileHtmlBody, newMobileHtmlBody);

// 5. Add comprehensive mobile compact sizing for OpticTool and all components
const mobileOpticRules = `
  /* ═════════════════════════════════════════════════════════════════════════ */
  /* MOBILE COMPACT OPTICTOOL & RESPONSIVE VIEWPORT STYLES (≤ 768px)          */
  /* ═════════════════════════════════════════════════════════════════════════ */
  .admin-main {
    margin-left: 0 !important;
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
    overflow-y: visible !important;
    padding-bottom: calc(75px + env(safe-area-inset-bottom, 0px)) !important;
  }

  .admin-shell {
    width: 100% !important;
    max-width: 100vw !important;
    overflow: visible !important;
    display: block !important;
  }

  .page-container {
    padding: 8px 10px 80px 10px !important;
    width: 100% !important;
    max-width: 100vw !important;
    overflow: visible !important;
    box-sizing: border-box !important;
  }

  .view-section {
    overflow: visible !important;
  }

  .optic-billing-container {
    width: 100% !important;
    max-width: 100% !important;
    gap: 8px !important;
    padding-bottom: 70px !important;
    overflow: visible !important;
  }

  .optic-tab-toggle-bar {
    gap: 6px !important;
    margin-bottom: 2px !important;
  }

  .optic-toggle-btn {
    height: 38px !important;
    font-size: 0.8rem !important;
    gap: 6px !important;
    border-radius: 99px !important;
  }

  .optic-toggle-btn svg {
    width: 14px !important;
    height: 14px !important;
  }

  .optic-invoice-banner {
    padding: 8px 12px !important;
    border-radius: 8px !important;
  }

  .optic-inv-token {
    font-size: 0.84rem !important;
  }

  .optic-inv-clock {
    font-size: 0.72rem !important;
  }

  .optic-card {
    padding: 10px 12px !important;
    border-radius: 10px !important;
    gap: 8px !important;
    margin-bottom: 0 !important;
    box-sizing: border-box !important;
  }

  .optic-section-title {
    font-size: 0.84rem !important;
  }

  .btn-optic-camera-main {
    height: 40px !important;
    font-size: 0.82rem !important;
    border-radius: 8px !important;
    gap: 8px !important;
  }

  .camera-pulse-icon {
    font-size: 1rem !important;
  }

  .optic-input {
    height: 36px !important;
    font-size: 0.82rem !important;
    padding: 0 10px 0 32px !important;
    border-radius: 6px !important;
  }

  .optic-input-wrap svg,
  .optic-input-icon {
    font-size: 0.82rem !important;
    left: 9px !important;
    width: 14px !important;
    height: 14px !important;
  }

  .btn-input-browse {
    height: 26px !important;
    font-size: 0.75rem !important;
    right: 5px !important;
    padding: 0 6px !important;
  }

  .optic-form-row {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 6px !important;
  }

  .optic-rx-cards-grid {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 6px !important;
  }

  .optic-subcard {
    padding: 8px 10px !important;
    border-radius: 8px !important;
    gap: 6px !important;
  }

  .optic-subcard-title {
    font-size: 0.76rem !important;
    font-weight: 700 !important;
  }

  .optic-subcard-buttons {
    gap: 4px !important;
  }

  .btn-subcard-action {
    height: 32px !important;
    font-size: 0.72rem !important;
    border-radius: 6px !important;
    gap: 3px !important;
  }

  .pos-shape-chips {
    gap: 4px !important;
    padding-bottom: 2px !important;
  }

  .pos-shape-chip {
    padding: 3px 9px !important;
    font-size: 0.68rem !important;
  }

  .pos-catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 6px !important;
    max-height: 230px !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
    padding: 2px !important;
  }

  .pos-item-card {
    padding: 6px !important;
    border-radius: 8px !important;
    gap: 3px !important;
  }

  .pos-item-img {
    height: 60px !important;
    border-radius: 4px !important;
  }

  .pos-item-name {
    font-size: 0.72rem !important;
  }

  .pos-item-sku {
    font-size: 0.62rem !important;
  }

  .pos-item-price {
    font-size: 0.78rem !important;
  }

  .pos-item-stock {
    font-size: 0.6rem !important;
  }

  .optic-items-table-header {
    font-size: 0.65rem !important;
    padding: 4px 6px !important;
    margin: 4px 0 2px 0 !important;
  }

  .pos-cart-line-item {
    padding: 6px 4px !important;
    font-size: 0.74rem !important;
    gap: 2px !important;
  }

  .cart-item-name {
    font-size: 0.74rem !important;
  }

  .cart-item-sku {
    font-size: 0.62rem !important;
  }

  .btn-qty {
    width: 20px !important;
    height: 20px !important;
    font-size: 0.72rem !important;
  }

  .cart-item-price {
    font-size: 0.74rem !important;
  }

  .cart-item-total {
    font-size: 0.76rem !important;
  }

  .optic-notes-card .optic-textarea {
    min-height: 44px !important;
    padding: 6px 10px !important;
    font-size: 0.78rem !important;
  }

  .optic-total-row {
    font-size: 0.78rem !important;
    padding: 2px 0 !important;
  }

  .optic-discount-input {
    width: 62px !important;
    height: 24px !important;
    font-size: 0.75rem !important;
    padding: 0 4px !important;
  }

  .optic-remaining-block {
    padding: 7px 10px !important;
    border-radius: 8px !important;
    margin: 4px 0 6px 0 !important;
  }

  .optic-remaining-block .rem-label {
    font-size: 0.82rem !important;
  }

  .optic-remaining-block .rem-val {
    font-size: 1.15rem !important;
  }

  .btn-pos-pm {
    height: 32px !important;
    font-size: 0.7rem !important;
    padding: 4px 2px !important;
  }

  .optic-bottom-actions {
    grid-template-columns: 80px 1fr !important;
    gap: 8px !important;
    margin-top: 4px !important;
  }

  .btn-optic-reset {
    height: 42px !important;
    font-size: 0.8rem !important;
    border-radius: 8px !important;
  }

  .btn-optic-save {
    height: 42px !important;
    font-size: 0.86rem !important;
    border-radius: 8px !important;
  }

  .mobile-bottom-nav {
    height: 52px !important;
  }

  .mob-nav-item {
    font-size: 0.62rem !important;
    padding: 4px 2px !important;
    gap: 2px !important;
  }

  .mob-nav-item svg {
    width: 18px !important;
    height: 18px !important;
  }
`;

// Append inside the @media (max-width: 768px) block or at the end
const endOfMedia = css.lastIndexOf('}');
css = css.slice(0, endOfMedia) + mobileOpticRules + '\n}\n';

fs.writeFileSync('admin.css', css, 'utf8');
console.log('Successfully applied mobile zoom and scroll fixes to admin.css');

