/**
 * server.js – Noor Optics Unified Business Platform Server
 * Serves E-Commerce Storefront, Admin & Physical POS, REST APIs, and Thermal Printer Spooler.
 */

'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const apiRouter = require('./server/api');
const { initializeDatabase } = require('./server/db');

// Ensure DB is initialized
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and Request Parsers
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check for /api
app.get('/api', (req, res) => {
  res.json({ status: 'ok', service: 'Noor Optics API', timestamp: new Date().toISOString() });
});

// Mount REST API
app.use('/api', apiRouter);
// Also mount apiRouter directly to catch any stripped serverless paths
app.use(apiRouter);

// Public Phone Camera Frame QR Resolution Route
app.get('/qr/:code', (req, res) => {
  const code = (req.params.code || '').trim();
  const { db } = require('./server/db');
  const frame = db.prepare(`
    SELECT
      p.id, p.sku as product_sku, p.name, p.brand, p.shape, p.material,
      p.selling_price_paise, p.image_url, p.description,
      pv.sku as variant_sku, pv.color_name, pv.color_hex,
      COALESCE(ib.available_qty, 0) as available_qty
    FROM products p
    JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN inventory_balances ib ON pv.id = ib.variant_id
    WHERE LOWER(p.sku) = LOWER(?)
       OR LOWER(pv.sku) = LOWER(?)
       OR pv.barcode = ?
       OR p.id = ?
    LIMIT 1
  `).get(code, code, code, code);

  if (!frame) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Frame Not Found – Noor Optics</title><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:'Plus Jakarta Sans',sans-serif;background:#0A0A0A;color:#FFF;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1rem;text-align:center;}.card{background:#171717;border:1px solid #262626;border-radius:16px;padding:2.5rem;max-width:400px;width:100%;}.btn{display:inline-block;margin-top:1.5rem;background:#FFF;color:#000;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;}</style></head>
      <body><div class="card"><h2>Frame Not Found</h2><p style="color:#A3A3A3;">No registered optical frame corresponds to code: <strong>${code}</strong>.</p><a href="/" class="btn">Return to Storefront</a></div></body></html>
    `);
  }

  const priceINR = (frame.selling_price_paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${frame.name} – Verified Genuine Frame | Noor Optics</title>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        :root { --gold: #D4AF37; --bg: #0A0A0A; --card: #141414; --border: #262626; }
        * { box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: #F5F5F5; margin: 0; padding: 1.5rem 1rem; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .product-card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; max-width: 440px; width: 100%; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); text-align: center; }
        .verified-banner { background: #059669; color: #FFF; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px 16px; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .card-img-wrap { background: #1C1C1C; padding: 2rem 1.5rem; position: relative; }
        .frame-img { width: 100%; max-height: 200px; object-fit: contain; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.5)); }
        .card-body { padding: 1.75rem 1.5rem; text-align: left; }
        .brand-tag { font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); font-weight: 700; }
        .frame-title { font-family: 'Playfair Display', serif; font-size: 1.6rem; font-weight: 700; margin: 0.25rem 0 0.5rem 0; color: #FFF; }
        .frame-specs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1.25rem; }
        .spec-pill { background: #222; border: 1px solid #333; padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; color: #D4D4D4; }
        .price-row { display: flex; justify-content: space-between; align-items: baseline; padding-top: 1rem; border-top: 1px solid #262626; margin-bottom: 1.5rem; }
        .price-label { font-size: 0.82rem; color: #A3A3A3; }
        .price-value { font-size: 1.6rem; font-weight: 800; color: #FFF; }
        .btn-staff-pos { display: block; width: 100%; background: #FFF; color: #000; text-align: center; padding: 14px; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 0.95rem; margin-bottom: 0.75rem; transition: background 0.2s; }
        .btn-staff-pos:hover { background: #E5E5E5; }
        .btn-storefront { display: block; width: 100%; background: transparent; border: 1px solid #333; color: #A3A3A3; text-align: center; padding: 12px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 0.85rem; }
        .footer-note { font-size: 0.75rem; color: #737373; text-align: center; margin-top: 1.25rem; line-height: 1.4; }
      </style>
    </head>
    <body>
      <div class="product-card">
        <div class="verified-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Authentic Noor Optics Frame</span>
        </div>
        <div class="card-img-wrap">
          <img src="/${frame.image_url}" alt="${frame.name}" class="frame-img" onerror="this.src='/images/stockholm_noir.jpg'" />
        </div>
        <div class="card-body">
          <div class="brand-tag">${frame.brand} • SKU: ${frame.variant_sku || frame.product_sku}</div>
          <h1 class="frame-title">${frame.name}</h1>
          <div class="frame-specs">
            <span class="spec-pill">Shape: ${frame.shape}</span>
            <span class="spec-pill">Color: ${frame.color_name}</span>
            <span class="spec-pill">Material: ${frame.material}</span>
          </div>
          <div class="price-row">
            <div>
              <div class="price-label">Current Boutique Retail Price</div>
              <div style="font-size:0.75rem;color:#059669;font-weight:600;">Inclusive of 18% GST</div>
            </div>
            <div class="price-value">${priceINR}</div>
          </div>
          <a href="/admin.html?scan=${encodeURIComponent(frame.variant_sku || frame.product_sku)}" class="btn-staff-pos">
            Cashier: Add to In-Store POS Bill
          </a>
          <a href="/" class="btn-storefront">
            Customer: Browse Online Boutique
          </a>
          <div class="footer-note">
            Scanning this QR code resolves authoritative product details.<br/>
            No transaction or sale is recorded until checkout at the POS register.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Serve Admin Portal at /admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});


// Serve Static Front-end Files (Storefront, CSS, JS, Images)
app.use(express.static(path.join(__dirname), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Fallback for client navigation
app.use((req, res) => {
  if (req.path.startsWith('/admin')) {
    return res.sendFile(path.join(__dirname, 'admin.html'));
  }
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl || req.url}` });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`👓 NOOR OPTICS COMPLETE BUSINESS PLATFORM IS LIVE`);
    console.log(`======================================================`);
    console.log(`🛍️  Customer Storefront: http://localhost:${PORT}`);
    console.log(`💼 Admin & Physical POS: http://localhost:${PORT}/admin`);
    console.log(`⚙️  REST APIs:           http://localhost:${PORT}/api`);
    console.log(`🖨️  Thermal Printer:     2-inch / 58 mm Ready`);
    console.log(`🔑 Owner Login:          admin@nooroptics.com / AdminPassword@123`);
    console.log(`======================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} in use, attempting restart...`);
    } else {
      console.error('Server error:', err);
    }
  });
}

module.exports = app;
