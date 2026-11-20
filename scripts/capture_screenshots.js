const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const artDir = 'C:\\Users\\atibo\\.gemini\\antigravity\\brain\\dc74c459-a2aa-4e62-9265-395f585b7de5';

// Build a dedicated verification viewer that loads live styles and renders actual cards
const verifyViewerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Noor Optics - Frame Verification View</title>
  <link rel="stylesheet" href="http://localhost:3000/style.css?v=20261120_frame_slider">
  <style>
    body { background: #F8FAFC; margin: 0; padding: 24px; font-family: 'Plus Jakarta Sans', sans-serif; }
    .verify-header { text-align: center; margin-bottom: 20px; }
    .verify-title { font-size: 1.4rem; font-weight: 800; color: #0F172A; margin: 0 0 6px 0; }
    .verify-sub { font-size: 0.85rem; color: #64748B; margin: 0; }
    .grid-container {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 18px;
    }
    @media (max-width: 600px) {
      body { padding: 12px; }
      .verify-title { font-size: 1.15rem; }
      .verify-sub { font-size: 0.75rem; }
      .grid-container {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 10px !important;
        max-width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="verify-header">
    <h1 class="verify-title">Popular picks</h1>
    <p class="verify-sub">133 Verified Genuine Frames · Dual-View (Front & Side) · Shape & Medium Size</p>
  </div>
  <div class="grid-container" id="grid">
    <!-- Card 1 (Metal Front View) -->
    <article class="pcard product-card">
      <div class="pic card-media has-slider" data-active-slide="0">
        <span class="tag">40% off</span>
        <button class="fav" aria-label="Save to Wishlist">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
        <div class="card-slides-track">
          <img class="card-img" src="http://localhost:3000/images/frames/1001-front.jpg" alt="Front View">
          <img class="card-img" src="http://localhost:3000/images/frames/1001-side.jpg" alt="Side View">
        </div>
        <button class="card-nav-arrow card-nav-prev">‹</button>
        <button class="card-nav-arrow card-nav-next">›</button>
        <div class="card-dots-bar">
          <span class="card-dot active"></span>
          <span class="card-dot"></span>
        </div>
      </div>
      <div class="info card-content">
        <div class="brand card-brand-tag"><span>Noor Optics</span><span class="card-gender-badge unisex">Unisex</span></div>
        <div class="name card-name">1001 Classic Black Rectangle Metal Frame</div>
        <div class="card-spec-line">
          <span class="spec-item">Rectangle</span>
          <span class="spec-sep">•</span>
          <span class="spec-item">Medium</span>
          <span class="spec-sep">•</span>
          <span class="spec-item">Metal</span>
        </div>
        <div class="price card-price-row"><span class="card-price">₹999</span><s style="font-size:12px;color:#94a3b8;margin-left:4px;">₹1699</s></div>
      </div>
    </article>

    <!-- Card 2 (Metal Side View Swiped) -->
    <article class="pcard product-card">
      <div class="pic card-media has-slider" data-active-slide="1">
        <span class="tag">40% off</span>
        <button class="fav" aria-label="Save to Wishlist">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
        <div class="card-slides-track">
          <img class="card-img" src="http://localhost:3000/images/frames/1002-front.jpg" alt="Front View">
          <img class="card-img" src="http://localhost:3000/images/frames/1002-side.jpg" alt="Side View">
        </div>
        <button class="card-nav-arrow card-nav-prev">‹</button>
        <button class="card-nav-arrow card-nav-next">›</button>
        <div class="card-dots-bar">
          <span class="card-dot"></span>
          <span class="card-dot active"></span>
        </div>
      </div>
      <div class="info card-content">
        <div class="brand card-brand-tag"><span>Noor Optics</span><span class="card-gender-badge unisex">Unisex</span></div>
        <div class="name card-name">1002 Matte Black Square Metal Frame</div>
        <div class="card-spec-line">
          <span class="spec-item">Square</span>
          <span class="spec-sep">•</span>
          <span class="spec-item">Medium</span>
          <span class="spec-sep">•</span>
          <span class="spec-item">Metal</span>
        </div>
        <div class="price card-price-row"><span class="card-price">₹999</span><s style="font-size:12px;color:#94a3b8;margin-left:4px;">₹1699</s></div>
      </div>
    </article>

    <!-- Card 3 (Fiber Front View) -->
    <article class="pcard product-card">
      <div class="pic card-media has-slider" data-active-slide="0">
        <span class="tag">40% off</span>
        <button class="fav" aria-label="Save to Wishlist">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
        <div class="card-slides-track">
          <img class="card-img" src="http://localhost:3000/images/frames/1042-front.jpg" alt="Front View">
          <img class="card-img" src="http://localhost:3000/images/frames/1042-side.jpg" alt="Side View">
        </div>
        <button class="card-nav-arrow card-nav-prev">‹</button>
        <button class="card-nav-arrow card-nav-next">›</button>
        <div class="card-dots-bar">
          <span class="card-dot active"></span>
          <span class="card-dot"></span>
        </div>
      </div>
      <div class="info card-content">
        <div class="brand card-brand-tag"><span>Noor Optics</span><span class="card-gender-badge unisex">Unisex</span></div>
        <div class="name card-name">1042 Classic Black Rectangle Fiber Frame</div>
        <div class="card-spec-line">
          <span class="spec-item">Rectangle</span>
          <span class="spec-sep">•</span>
          <span class="spec-item">Medium</span>
          <span class="spec-sep">•</span>
          <span class="spec-item">Fiber</span>
        </div>
        <div class="price card-price-row"><span class="card-price">₹599</span><s style="font-size:12px;color:#94a3b8;margin-left:4px;">₹999</s></div>
      </div>
    </article>

    <!-- Card 4 (Fiber Side View Swiped) -->
    <article class="pcard product-card">
      <div class="pic card-media has-slider" data-active-slide="1">
        <span class="tag">40% off</span>
        <button class="fav" aria-label="Save to Wishlist">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
        <div class="card-slides-track">
          <img class="card-img" src="http://localhost:3000/images/frames/1043-front.jpg" alt="Front View">
          <img class="card-img" src="http://localhost:3000/images/frames/1043-side.jpg" alt="Side View">
        </div>
        <button class="card-nav-arrow card-nav-prev">‹</button>
        <button class="card-nav-arrow card-nav-next">›</button>
        <div class="card-dots-bar">
          <span class="card-dot"></span>
          <span class="card-dot active"></span>
        </div>
      </div>
      <div class="info card-content">
        <div class="brand card-brand-tag"><span>Noor Optics</span><span class="card-gender-badge unisex">Unisex</span></div>
        <div class="name card-name">1043 Crystal Clear Round Fiber Frame</div>
        <div class="card-spec-line">
          <span class="spec-item">Round</span>
          <span class="spec-sep">•</span>
          <span class="spec-item">Medium</span>
          <span class="spec-sep">•</span>
          <span class="spec-item">Fiber</span>
        </div>
        <div class="price card-price-row"><span class="card-price">₹599</span><s style="font-size:12px;color:#94a3b8;margin-left:4px;">₹999</s></div>
      </div>
    </article>
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '..', 'verify_viewer.html'), verifyViewerHtml, 'utf-8');

console.log('1. Capturing desktop grid...');
execSync(`"${chromePath}" --headless=new --virtual-time-budget=2000 --window-size=1200,800 --screenshot="${path.join(artDir, 'screenshot_desktop_grid.png')}" "http://localhost:3000/verify_viewer.html"`, { stdio: 'inherit' });

console.log('2. Capturing mobile view...');
execSync(`"${chromePath}" --headless=new --virtual-time-budget=2000 --window-size=390,844 --screenshot="${path.join(artDir, 'screenshot_mobile_view.png')}" "http://localhost:3000/verify_viewer.html"`, { stdio: 'inherit' });

console.log('3. Capturing card swipe view...');
execSync(`"${chromePath}" --headless=new --virtual-time-budget=2000 --window-size=850,550 --screenshot="${path.join(artDir, 'screenshot_card_swipe.png')}" "http://localhost:3000/swipe_preview.html"`, { stdio: 'inherit' });

console.log('All screenshots captured successfully!');
