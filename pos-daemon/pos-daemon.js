/**
* pos-daemon/pos-daemon.js – Portable Windows POS Print Daemon
* High-speed automatic 2.5-inch thermal receipt printing for Noor Optics.
* Listens for local in-store POS checkouts and cloud website orders.
*/

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn, execSync } = require('child_process');

const DAEMON_VERSION = '2.4.0';
const SCRIPT_DIR = __dirname;
const CONFIG_FILE = path.join(SCRIPT_DIR, 'config.json');
const PRINTED_FILE = path.join(SCRIPT_DIR, '.printed_orders.json');
const LOGS_DIR = path.join(SCRIPT_DIR, 'logs');
const WORKER_SCRIPT = path.join(SCRIPT_DIR, 'worker-printer.ps1');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// ── Default Configuration ─────────────────────────────────────────────────────
let config = {
  port: 5001,
  printerName: 'POS-80',
  paperWidthInch: 2.5,
  columns: 32,
  printKOT: false, // Customer requested single bill only, no KOT slip
  storeName: 'NOOR OPTIC',
  storeTagline: '',
  storeAddress: 'Pillar No. 45, Rethibowli, Hyderabad, Telangana 500028',
  storePhone: '+91 98765 43210',
  storeGstin: '29AAAAA0000A1Z5',
  orderFreshnessMinutes: 10,
  supabaseUrl: 'https://czajxtgwsxbrrymrhauz.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk',
  backendUrl: 'https://noor-optics-five.vercel.app',
  allowedOrigins: [
    'https://noor-optics-five.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ]
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = { ...config, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('[Daemon] Error loading config.json, using defaults:', e.message);
  }
}

// ── Optical Frame Catalog Cache & Resolver ────────────────────────────────────
let catalogProducts = [
  { id: 'noor-01', name: 'The Stockholm Noir', sku: 'NOOR-STK-01', brand: 'NOOR', selling_price_inr: 3499 },
  { id: 'noor-02', name: 'The Copenhagen Round', sku: 'NOOR-CPH-02', brand: 'NOOR', selling_price_inr: 3899 },
  { id: 'noor-03', name: 'The Oslo Crystal', sku: 'NOOR-OSL-03', brand: 'NOOR', selling_price_inr: 3699 },
  { id: 'noor-04', name: 'The Kyoto Havana', sku: 'NOOR-KYO-04', brand: 'NOOR', selling_price_inr: 4199 },
  { id: 'noor-05', name: 'The Milan Aureum', sku: 'NOOR-MIL-05', brand: 'NOOR', selling_price_inr: 4599 },
  { id: 'noor-06', name: 'The Zurich Titanium', sku: 'NOOR-ZUR-06', brand: 'NOOR', selling_price_inr: 4999 },
  { id: 'noor-07', name: 'The Berlin Hex', sku: 'NOOR-BER-07', brand: 'NOOR', selling_price_inr: 3799 },
  { id: 'noor-08', name: 'The Helsinki Quad', sku: 'NOOR-HEL-08', brand: 'NOOR', selling_price_inr: 4099 },
  { id: 'noor-09', name: 'The Reykjavik Pilot', sku: 'NOOR-REY-09', brand: 'NOOR', selling_price_inr: 4399 },
  { id: 'noor-10', name: 'The Vienna Silhouette', sku: 'NOOR-VIE-10', brand: 'NOOR', selling_price_inr: 4799 },
  { id: 'noor-11', name: 'The Amber Arch', sku: 'NOOR-AMB-11', brand: 'NOOR', selling_price_inr: 3999 },
  { id: 'noor-12', name: 'The Tokyo Steel', sku: 'NOOR-TOK-12', brand: 'NOOR', selling_price_inr: 3799 },
  { id: 'prod-1793298868419', name: 'meta glasses meta', sku: 'NOOR BATMAN', brand: 'meta glasses', selling_price_inr: 55000 },
  { id: 'prod-1793380282448', name: 'RayBan Aviator Gold', sku: 'NOOR-RB-GOLD-2425', brand: 'RayBan', selling_price_inr: 12500 }
];

async function refreshCatalogCache() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) return;
  try {
    // 1. Fetch custom frames from SYS-CATALOG-PRODUCTS
    const resCust = await fetch(`${config.supabaseUrl}/rest/v1/customers?client_code=eq.SYS-CATALOG-PRODUCTS`, {
      headers: { 'apikey': config.supabaseAnonKey, 'Authorization': `Bearer ${config.supabaseAnonKey}` }
    });
    if (resCust.ok) {
      const data = await resCust.json();
      if (Array.isArray(data) && data[0] && data[0].notes) {
        try {
          const parsed = JSON.parse(data[0].notes);
          if (Array.isArray(parsed)) {
            parsed.forEach(p => {
              if (p && p.id && !catalogProducts.some(cp => cp.id === p.id)) {
                catalogProducts.push(p);
              }
            });
          }
        } catch (_) { }
      }
    }

    // 2. Fetch standard catalog frames
    const resProd = await fetch(`${config.supabaseUrl}/rest/v1/products?select=*`, {
      headers: { 'apikey': config.supabaseAnonKey, 'Authorization': `Bearer ${config.supabaseAnonKey}` }
    });
    if (resProd.ok) {
      const stdProds = await resProd.json();
      if (Array.isArray(stdProds)) {
        stdProds.forEach(p => {
          if (p && p.id && !catalogProducts.some(cp => cp.id === p.id)) {
            catalogProducts.push(p);
          }
        });
      }
    }
  } catch (_) { }
}
refreshCatalogCache();

function resolveItemDetails(item, order) {
  let name = item.product_name || item.name || item.model || item.frame_name || '';
  if (name && name !== 'Optical Frame' && name !== 'Frame') {
    return {
      name,
      sku: item.sku || '',
      brand: item.brand || '',
      color: item.variant_name || item.color || ''
    };
  }

  const vId = String(item.variantId || item.id || item.productId || '');
  const itemSku = String(item.sku || '').toUpperCase();
  const unitPrice = (item.unit_price_inr != null) ? Number(item.unit_price_inr)
    : (item.unitPricePaise != null) ? Number(item.unitPricePaise) / 100
      : (item.unit_price_paise != null) ? Number(item.unit_price_paise) / 100
        : (item.priceINR != null) ? Number(item.priceINR)
          : (item.pricePaise != null) ? Number(item.pricePaise) / 100
            : (item.unitPrice != null) ? Number(item.unitPrice)
              : (item.unit_price != null) ? Number(item.unit_price)
                : 0;

  // 1. Authoritative check for custom inventory frames
  if (vId.includes('1793298868419') || vId.includes('1793380443146') || itemSku.includes('BATMAN') || (unitPrice >= 50000 && unitPrice <= 60000)) {
    return {
      name: 'meta glasses meta',
      sku: item.sku || 'NOOR BATMAN',
      brand: item.brand || 'meta glasses',
      color: item.variant_name || item.color || 'black'
    };
  }
  if (vId.includes('1793380282448') || itemSku.includes('GOLD') || (unitPrice >= 12000 && unitPrice <= 13000)) {
    return {
      name: 'RayBan Aviator Gold',
      sku: item.sku || 'NOOR-RB-GOLD-2425',
      brand: item.brand || 'RayBan',
      color: item.variant_name || item.color || 'Gold'
    };
  }

  // 2. Direct match on ID or SKU from fetched catalog
  let match = catalogProducts.find(p =>
    (vId && (p.id === vId || vId.includes(p.id) || (p.variants && p.variants.some(v => v.id === vId)))) ||
    (itemSku && (p.sku && p.sku.toUpperCase() === itemSku))
  );

  // 3. Base ID match (e.g. var-prod-1793380443146-1 -> prod-1793380443146)
  if (!match && vId.startsWith('var-prod-')) {
    const baseId = vId.replace(/^var-/, '').replace(/-d+$/, '');
    match = catalogProducts.find(p => p.id === baseId || p.id.includes(baseId));
  }

  // 4. Price-based match for catalog products (e.g. 55000 -> meta glasses meta)
  if (!match && unitPrice > 0) {
    match = catalogProducts.find(p => {
      const pPrice = Number(p.selling_price_inr || (p.selling_price_paise ? p.selling_price_paise / 100 : p.price || 0));
      return Math.abs(pPrice - unitPrice) < 1;
    });
  }

  // 5. Classic Scandinavian catalog dictionary
  const classicFrames = [
    { key: 'noor-01', sku: 'NOOR-STK-01', name: 'The Stockholm Noir', price: 4299 },
    { key: 'noor-02', sku: 'NOOR-CPH-02', name: 'The Copenhagen Round', price: 3899 },
    { key: 'noor-03', sku: 'NOOR-OSL-03', name: 'The Oslo Crystal', price: 4599 },
    { key: 'noor-04', sku: 'NOOR-KYO-04', name: 'The Kyoto Havana', price: 4199 },
    { key: 'noor-05', sku: 'NOOR-MIL-05', name: 'The Milan Aureum', price: 4899 },
    { key: 'noor-06', sku: 'NOOR-ZUR-06', name: 'The Zurich Titanium', price: 5299 },
    { key: 'noor-07', sku: 'NOOR-BER-07', name: 'The Berlin Hex', price: 3999 },
    { key: 'noor-08', sku: 'NOOR-HEL-08', name: 'The Helsinki Quad', price: 4499 },
    { key: 'noor-09', sku: 'NOOR-REY-09', name: 'The Reykjavik Pilot', price: 4799 },
    { key: 'noor-10', sku: 'NOOR-VIE-10', name: 'The Vienna Silhouette', price: 4699 },
    { key: 'noor-11', sku: 'NOOR-AMB-11', name: 'The Amber Arch', price: 4399 },
    { key: 'noor-12', sku: 'NOOR-TOK-12', name: 'The Tokyo Steel', price: 3799 }
  ];

  if (!match) {
    match = classicFrames.find(cf =>
      (vId && vId.includes(cf.key)) ||
      (itemSku && itemSku === cf.sku) ||
      (unitPrice > 0 && Math.abs(cf.price - unitPrice) < 1)
    );
  }

  if (match) {
    return {
      name: match.name || match.model || match.sku || 'Noor Optical Frame',
      sku: item.sku || match.sku || '',
      brand: item.brand || match.brand || 'NOOR',
      color: item.variant_name || item.color || match.color_name || 'Standard'
    };
  }

  // 6. Fallback from order-level fields
  if (order && order.frame_name && order.frame_name !== 'Optical Frame') {
    return { name: order.frame_name, sku: item.sku || order.sku || '', brand: item.brand || '', color: item.variant_name || item.color || '' };
  }
  if (order && order.product_name && order.product_name !== 'Optical Frame') {
    return { name: order.product_name, sku: item.sku || order.sku || '', brand: item.brand || '', color: item.variant_name || item.color || '' };
  }

  return {
    name: item.sku ? item.sku : 'Noor Optical Frame',
    sku: item.sku || '',
    brand: item.brand || 'NOOR',
    color: item.variant_name || item.color || ''
  };
}

// ── Smart Thermal Printer Auto-Discovery ──────────────────────────────────────
function autoDetectPrinter() {
  try {
    const stdout = execSync('powershell.exe -NoProfile -Command "try { Get-Printer | Select-Object -ExpandProperty Name } catch { (Get-CimInstance Win32_Printer).Name }"', { encoding: 'utf8', timeout: 6000 });
    const installed = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (installed.length === 0) return config.printerName;

    // 1. Direct match with configured printer
    if (installed.includes(config.printerName)) {
      return config.printerName;
    }

    // 2. Search for any installed USB / thermal POS printer
    const posMatch = installed.find(name => /POS|Thermal|Receipt|58|80|XP|Text Only|Generic|RP|Everycom|TVS/i.test(name));
    if (posMatch) {
      console.log(`[Auto-Detect] Configured '${config.printerName}' not found. Automatically connected to: '${posMatch}'`);
      config.printerName = posMatch;
      try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
      } catch (e) { }
      return posMatch;
    }
  } catch (e) { }
  return config.printerName;
}
autoDetectPrinter();

// ── Pre-compiled 2.5-Inch ESC/POS Raster Assets (Logo & Payment QR) ───────────
let logoRasterBuffer = null;
let paymentQrRasterBuffer = null;

try {
  const logoPath = path.join(__dirname, 'assets', 'logo_raster.bin');
  if (fs.existsSync(logoPath)) {
    logoRasterBuffer = fs.readFileSync(logoPath);
  }
} catch (e) {
  console.warn('[Daemon] Error loading logo raster:', e.message);
}

try {
  const qrPath = path.join(__dirname, 'assets', 'payment_qr_raster.bin');
  if (fs.existsSync(qrPath)) {
    paymentQrRasterBuffer = fs.readFileSync(qrPath);
  }
} catch (e) {
  console.warn('[Daemon] Error loading payment QR raster:', e.message);
}

// ── Persistent Print History ──────────────────────────────────────────────────
let printedHistory = {};
if (fs.existsSync(PRINTED_FILE)) {
  try {
    printedHistory = JSON.parse(fs.readFileSync(PRINTED_FILE, 'utf8'));
  } catch (e) {
    printedHistory = {};
  }
}

function savePrintedHistory() {
  try {
    fs.writeFileSync(PRINTED_FILE, JSON.stringify(printedHistory, null, 2), 'utf8');
  } catch (e) {
    console.error('[Daemon] Error saving printed history:', e.message);
  }
}

// ── Fail-Safe Print Retry Queue (Zero-Missed-Bill Guarantee) ──────────────────
const RETRY_QUEUE_FILE = path.join(SCRIPT_DIR, '.print_retry_queue.json');
let retryQueue = [];
try {
  if (fs.existsSync(RETRY_QUEUE_FILE)) {
    retryQueue = JSON.parse(fs.readFileSync(RETRY_QUEUE_FILE, 'utf8') || '[]');
  }
} catch (_) { retryQueue = []; }

function saveRetryQueue() {
  try {
    fs.writeFileSync(RETRY_QUEUE_FILE, JSON.stringify(retryQueue, null, 2), 'utf8');
  } catch (e) {
    console.error('[Daemon] Error saving retry queue:', e.message);
  }
}

function enqueueFailedPrintJob(order, docName = 'Customer Bill') {
  const ref = order.order_number || order.order_ref || order.id;
  if (!ref) return;
  if (retryQueue.some(j => j.ref === ref)) return;
  log(`[Queue] Adding order #${ref} to automatic retry queue (will retry until printed)...`, 'WARN');
  retryQueue.push({
    ref,
    order,
    docName,
    addedAt: new Date().toISOString(),
    attempts: 0
  });
  saveRetryQueue();
}

let isProcessingRetry = false;
async function processRetryQueue() {
  if (isProcessingRetry || retryQueue.length === 0) return;
  isProcessingRetry = true;
  try {
    const stillPending = [];
    for (const job of retryQueue) {
      job.attempts = (job.attempts || 0) + 1;
      try {
        const receiptBinary = format25InchEscPosReceipt(job.order);
        const result = await spoolBytesToPrinter(receiptBinary, job.docName || `Bill-${job.ref}`);
        if (result.success) {
          log(`[Retry Queue] SUCCESS: Pending Bill #${job.ref} successfully printed on attempt ${job.attempts}!`);
          printedHistory[job.ref] = new Date().toISOString();
          savePrintedHistory();
        } else {
          stillPending.push(job);
        }
      } catch (err) {
        stillPending.push(job);
      }
    }
    if (stillPending.length !== retryQueue.length) {
      retryQueue = stillPending;
      saveRetryQueue();
    }
  } finally {
    isProcessingRetry = false;
  }
}

// ── State Metrics ─────────────────────────────────────────────────────────────
const state = {
  startTime: Date.now(),
  totalPrinted: 0,
  failedJobs: 0,
  lastPrintedTime: null,
  lastError: null,
  cloudConnected: false,
  detectedPrinter: config.printerName
};

function log(msg, level = 'INFO') {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}\n`;
  process.stdout.write(line);
  try {
    const today = ts.slice(0, 10);
    const logFile = path.join(LOGS_DIR, `daemon_${today}.log`);
    fs.appendFileSync(logFile, line, 'utf8');
  } catch (e) { }
}

// ── Spool Raw Bytes via worker-printer.ps1 ────────────────────────────────────
function spoolBytesToPrinter(buffer, docName = 'Customer Bill') {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(LOGS_DIR, `spool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.bin`);
    fs.writeFileSync(tempFile, buffer);

    const cmd = `powershell.exe -ExecutionPolicy Bypass -NoProfile -File "${WORKER_SCRIPT}" -FilePath "${tempFile}" -PrinterName "${config.printerName}" -DocName "${docName}"`;
    exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
      try { fs.unlinkSync(tempFile); } catch (e) { }
      if (error) {
        state.failedJobs++;
        state.lastError = stderr || error.message;
        log(`Print failed: ${state.lastError}`, 'ERROR');
        return resolve({ success: false, error: state.lastError });
      }
      state.totalPrinted++;
      state.lastPrintedTime = new Date().toISOString();
      log(`Printed successfully to ${config.printerName}`);
      return resolve({ success: true, stdout: stdout.trim() });
    });
  });
}

// ── Format 2.5-Inch (32 Columns) ESC/POS Customer Bill ────────────────────────
function format25InchEscPosReceipt(rawOrder) {
  const chunks = [];
  const COLS = config.columns || 32;
  const divider = '-'.repeat(COLS) + '\n';
  const doubleDivider = '='.repeat(COLS) + '\n';

  // Support both raw order and wrapped { order: { ... }, items: [...] }
  const order = rawOrder.order || rawOrder;
  if (!order.items && Array.isArray(rawOrder.items)) {
    order.items = rawOrder.items;
  }

  function writeBytes(arr) {
    chunks.push(Buffer.isBuffer(arr) ? arr : Buffer.from(arr));
  }
  function writeText(str) {
    chunks.push(Buffer.from(str, 'ascii'));
  }
  function center(text) {
    const s = String(text || '');
    const clipped = s.length > COLS ? s.slice(0, COLS) : s;
    const pad = Math.max(0, Math.floor((COLS - clipped.length) / 2));
    return ' '.repeat(pad) + clipped + '\n';
  }
  function row(left, right) {
    const r = String(right || '');
    const maxL = Math.max(0, COLS - r.length - 1);
    const l = String(left || '').length > maxL ? String(left || '').slice(0, maxL) : String(left || '');
    const space = Math.max(1, COLS - l.length - r.length);
    return l + ' '.repeat(space) + r + '\n';
  }
  function formatINR(num) {
    const n = Number(num) || 0;
    return 'Rs.' + Math.round(n).toLocaleString('en-IN');
  }

  // 1. Initialize Printer (ESC @)
  writeBytes([0x1B, 0x40]);

  // 1b. Print Noor Glasses Logo at Top of Bill (Positioned tightly above store name)
  if (logoRasterBuffer && logoRasterBuffer.length > 0) {
    writeBytes([0x1B, 0x61, 0x01]); // Center
    writeBytes(logoRasterBuffer);
  }

  // 2. Store Header (NOOR OPTIC, Pillar No. 45, Rethibowli, Hyderabad, Telangana 500028)
  writeBytes([0x1B, 0x61, 0x01]); // Center
  writeBytes([0x1B, 0x45, 0x01]); // Bold ON
  writeBytes([0x1D, 0x21, 0x01]); // Double height
  writeText('NOOR OPTIC\n');
  writeBytes([0x1D, 0x21, 0x00]); // Normal size
  writeBytes([0x1B, 0x45, 0x00]); // Bold OFF
  writeText('Pillar No. 45, Rethibowli, Hyderabad, Telangana 500028\n');
  writeText(`Ph: ${config.storePhone || '+91 98765 43210'}\n`);
  writeText(doubleDivider);

  // 3. Invoice & Token Header
  writeBytes([0x1B, 0x61, 0x00]); // Left align
  const token = order.token_number || order.token || 1;
  const channel = (order.channel || (order.delivery_address && /pos|boutique|flagship|store|rethibowli/i.test(order.delivery_address) ? 'IN-STORE' : 'ONLINE')).toUpperCase();
  const channelLabel = (channel === 'POS' || channel === 'IN-STORE') ? '[IN-STORE]' : '[WEBSITE]';
  writeText(row(`TOKEN #${token}`, channelLabel));
  writeText(row('Invoice:', order.order_number || order.order_ref || 'NOOR-INV'));
  const dateStr = order.created_at ? new Date(order.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  }) : new Date().toLocaleString('en-IN');
  writeText(row('Date:', dateStr));
  writeText(divider);

  // 4. Customer Information
  const custName = order.customer_name || 'Walk-in Client';
  const custPhone = order.customer_phone || '-';
  writeText(`Client: ${custName.slice(0, COLS - 8)}\n`);
  if (custPhone !== '-') writeText(`Phone:  ${custPhone}\n`);
  writeText(divider);

  // 5. Itemized Frame & Products Table
  writeText(row('ITEM / SPEC', 'QTY  AMOUNT'));
  writeText(divider);

  let items = order.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (_) { items = []; }
  }
  if (!Array.isArray(items)) items = [];

  const grandTotal = Number(order.total_payable_inr || (order.total_payable_paise ? order.total_payable_paise / 100 : order.grand_total || order.total || 0));
  const discount = Number(order.discount_inr || (order.discount_paise ? order.discount_paise / 100 : order.discount || 0));

  if (items.length === 0) {
    const fallback = resolveItemDetails({}, order);
    const fallbackPrice = grandTotal > 0 ? grandTotal : 0;
    writeText(row(fallback.name.slice(0, 18), '1  ' + formatINR(fallbackPrice)));
    if (fallback.sku && fallback.sku !== fallback.name) {
      writeText(` SKU:   ${fallback.sku.slice(0, COLS - 8)}\n`);
    }
  } else {
    items.forEach(item => {
      const details = resolveItemDetails(item, order);
      const name = details.name;
      const sku = item.sku || details.sku;
      const color = item.variant_name || item.color || details.color;
      const qty = parseInt(item.quantity || 1, 10);
      const unitPrice = (item.unit_price_inr != null) ? Number(item.unit_price_inr)
        : (item.unit_price_paise != null) ? Number(item.unit_price_paise) / 100
          : (item.unitPricePaise != null) ? Number(item.unitPricePaise) / 100
            : (item.pricePaise != null) ? Number(item.pricePaise) / 100
              : (item.priceINR != null) ? Number(item.priceINR)
                : (item.unitPrice != null) ? Number(item.unitPrice)
                  : (item.unit_price != null) ? Number(item.unit_price)
                    : 0;

      let lineTotal = (item.subtotal_inr != null) ? Number(item.subtotal_inr)
        : (item.subtotal_paise != null) ? Number(item.subtotal_paise) / 100
          : (item.subtotalPaise != null) ? Number(item.subtotalPaise) / 100
            : (item.subtotal != null && Number(item.subtotal) > 0) ? Number(item.subtotal)
              : (item.lineTotalINR != null) ? Number(item.lineTotalINR)
                : (unitPrice * qty);

      if (lineTotal === 0 && grandTotal > 0 && items.length === 1) {
        lineTotal = grandTotal;
      }

      writeText(row(name.slice(0, 18), `${qty}  ${formatINR(lineTotal)}`));
      if (sku && sku !== name) {
        writeText(` SKU:   ${sku.slice(0, COLS - 8)}\n`);
      }
      if (color && color !== 'Standard') {
        writeText(` Color: ${color.slice(0, COLS - 8)}\n`);
      }
      if (item.lens || (item.lens_name && !/standard/i.test(item.lens_name))) {
        writeText(` Lens:  ${(item.lens || item.lens_name).slice(0, COLS - 8)}\n`);
      }
    });
  }
  writeText(divider);

  // 6. Financial Breakdown (NO GST / NO GSTIN / NO TAX line as requested)
  let subtotal = Number(order.subtotal_inr || (order.subtotal_paise ? order.subtotal_paise / 100 : (order.subtotal != null ? order.subtotal : 0)));
  if (subtotal === 0 && grandTotal > 0) {
    subtotal = grandTotal + discount;
  }
  const amountPaid = Number(order.amount_paid_inr || (order.amount_paid_paise ? order.amount_paid_paise / 100 : grandTotal));
  const balance = Math.max(0, grandTotal - amountPaid);
  const payMethod = (order.payment_method || (channel === 'POS' ? 'CASH' : 'ONLINE')).toUpperCase();

  writeText(row('Subtotal:', formatINR(subtotal)));
  if (discount > 0) writeText(row('Discount:', '-' + formatINR(discount)));
  writeText(doubleDivider);

  writeBytes([0x1B, 0x45, 0x01]); // Bold ON
  writeText(row('GRAND TOTAL:', formatINR(grandTotal)));
  writeBytes([0x1B, 0x45, 0x00]); // Bold OFF

  writeText(row(`Payment [${payMethod}]:`, formatINR(amountPaid)));
  if (balance > 0) {
    writeBytes([0x1B, 0x45, 0x01]);
    writeText(row('Balance Due:', formatINR(balance)));
    writeBytes([0x1B, 0x45, 0x00]);
  } else {
    writeText(row('Balance Due:', 'Rs.0 (PAID)'));
  }
  writeText(divider);

  // 7. Client Prescription (Rx) Section (100% Reliable Extraction)
  const rx = order.prescription || rawOrder.prescription || order.client_prescription || order.newPrescription || order;
  const getRxField = (keys) => {
    for (const k of keys) {
      if (rx && rx[k] !== undefined && rx[k] !== null && String(rx[k]).trim() !== '' && String(rx[k]).trim() !== '---') return rx[k];
      if (order && order[k] !== undefined && order[k] !== null && String(order[k]).trim() !== '' && String(order[k]).trim() !== '---') return order[k];
      if (rawOrder && rawOrder[k] !== undefined && rawOrder[k] !== null && String(rawOrder[k]).trim() !== '' && String(rawOrder[k]).trim() !== '---') return rawOrder[k];
    }
    return null;
  };

  const odSphVal = getRxField(['od_sph', 'odSph']);
  const odCylVal = getRxField(['od_cyl', 'odCyl']);
  const odAxisVal = getRxField(['od_axis', 'odAxis']);
  const osSphVal = getRxField(['os_sph', 'osSph']);
  const osCylVal = getRxField(['os_cyl', 'osCyl']);
  const osAxisVal = getRxField(['os_axis', 'osAxis']);
  const addVal = getRxField(['addition', 'add']);
  const pdVal = getRxField(['ipd_distance', 'ipdDistance', 'pd']);
  const docVal = getRxField(['checked_by', 'checkedBy', 'rx_checked_by']);

  const hasAnyRxValue = odSphVal !== null || odCylVal !== null || odAxisVal !== null ||
    osSphVal !== null || osCylVal !== null || osAxisVal !== null ||
    addVal !== null || pdVal !== null;

  const rxExplicitlyMentioned = Boolean(order.prescription_id || order.prescription_number || (rx && rx.prescription_number) ||
    (order.prescription_pref && /rx/i.test(order.prescription_pref)));

  if (hasAnyRxValue) {
    writeBytes([0x1B, 0x61, 0x01]); // Center
    writeBytes([0x1B, 0x45, 0x01]); // Bold ON
    writeText('--- CLIENT PRESCRIPTION (RX) ---\n');
    writeBytes([0x1B, 0x45, 0x00]); // Bold OFF
    writeBytes([0x1B, 0x61, 0x00]); // Left

    function fmtRx(val) {
      if (val === undefined || val === null || val === '' || val === '---') return '  --- ';
      const n = Number(val);
      if (isNaN(n)) return String(val).padStart(6);
      const sign = n > 0 ? '+' : (n < 0 ? '-' : ' ');
      return sign + Math.abs(n).toFixed(2);
    }
    function fmtAx(val) {
      if (val === undefined || val === null || val === '' || val === '---') return '---';
      return String(val).padStart(3);
    }

    writeText('Eye    SPH    CYL   AXIS   ADD  \n');
    writeText(`OD   ${fmtRx(odSphVal)}  ${fmtRx(odCylVal)}   ${fmtAx(odAxisVal)}  ${fmtRx(addVal)}\n`);
    writeText(`OS   ${fmtRx(osSphVal)}  ${fmtRx(osCylVal)}   ${fmtAx(osAxisVal)}  ${fmtRx(addVal)}\n`);

    if (pdVal) writeText(`Distance PD: ${pdVal} mm\n`);
    if (docVal) writeText(`Optometrist: ${docVal}\n`);
    writeText(divider);
  } else if (rxExplicitlyMentioned) {
    writeBytes([0x1B, 0x61, 0x01]); // Center
    writeBytes([0x1B, 0x45, 0x01]); // Bold ON
    writeText('--- CLIENT PRESCRIPTION (RX) ---\n');
    writeBytes([0x1B, 0x45, 0x00]); // Bold OFF
    writeText('PRESCRIPTION NOT PROVIDED\n');
    writeText(divider);
  }

  // 8. Crisp Anti-Blotting UPI Payment QR Code (Centered)
  if (paymentQrRasterBuffer && paymentQrRasterBuffer.length > 0) {
    writeBytes([0x1B, 0x61, 0x01]); // Center
    writeBytes([0x1B, 0x45, 0x01]); // Bold ON
    writeText('SCAN & PAY VIA UPI\n');
    writeBytes([0x1B, 0x45, 0x00]); // Bold OFF
    writeBytes(paymentQrRasterBuffer);
    writeBytes([0x1B, 0x64, 0x01]); // Feed 1 line
    writeText('UPI ID: 9182341567@mairtel\n');
    writeText(divider);
  }

  // 9. Concluding Sign-off (Everything under this removed as requested)
  writeBytes([0x1B, 0x61, 0x01]); // Center
  writeBytes([0x1B, 0x45, 0x01]); // Bold ON
  writeText('Thank You for Choosing Noor!\n');
  writeBytes([0x1B, 0x45, 0x00]); // Bold OFF

  // 10. Feed Paper & Cut
  writeBytes([0x1B, 0x64, 0x04]); // Feed 4 lines
  writeBytes([0x1D, 0x56, 0x42, 0x00]); // Partial Cut (GS V 66 0)

  return Buffer.concat(chunks);
}

// ── Format 2.5-Inch (20-25mm Optical Dumbbell Tag) ESC/POS QR Sticker ───────────
async function format25InchEscPosQrSticker(item) {
  let QRCode;
  try { QRCode = require(path.join(__dirname, 'assets', 'qrcode-bundle.js')); } catch (_) { }
  if (!QRCode) {
    try { QRCode = require('qrcode'); } catch (_) { QRCode = null; }
  }

  const sku = (item.sku || item.product_sku || item.variant_sku || item.id || 'NOOR-FRAME').toUpperCase();
  const name = (item.name || '').slice(0, 24);
  let price = item.price ? String(item.price).trim() : '';
  if (price.startsWith('₹')) price = 'Rs. ' + price.substring(1).trim();
  if (price && !price.toUpperCase().startsWith('RS') && !price.toUpperCase().startsWith('M.R.P')) {
    price = 'Rs. ' + price;
  }
  const qrUrl = (item.qrPayload || `HTTPS://NOOROPTICS.VERCEL.APP/Q/${encodeURIComponent(sku)}`).trim();

  const chunks = [];
  function writeBytes(arr) { chunks.push(Buffer.from(arr)); }
  function writeText(str) { chunks.push(Buffer.from(str, 'ascii')); }

  writeBytes([0x1B, 0x40]); // Reset
  writeBytes([0x1B, 0x61, 0x01]); // Center
  writeBytes([0x1B, 0x33, 0x10]); // Ultra-tight line spacing (16 dots ~ 2mm)

  if (QRCode) {
    try {
      const qr = QRCode.create(qrUrl, { errorCorrectionLevel: 'L' });
      const rawSize = qr.modules.size; // 25 (Version 2)
      const quiet = 1; // Small quiet zone
      const scale = 3; // 27 * 3 = 81 dots (~10.1mm small crisp QR matching Image 2!)
      const totalModules = rawSize + quiet * 2;
      const imgWidth = totalModules * scale;
      const imgHeight = totalModules * scale;
      const widthBytes = Math.ceil(imgWidth / 8);

      const raster = Buffer.alloc(widthBytes * imgHeight, 0);
      for (let y = 0; y < totalModules; y++) {
        const my = y - quiet;
        for (let x = 0; x < totalModules; x++) {
          const mx = x - quiet;
          const isBlack = (mx >= 0 && mx < rawSize && my >= 0 && my < rawSize)
            ? Boolean(qr.modules.data[my * rawSize + mx])
            : false;
          if (isBlack) {
            for (let dy = 0; dy < scale; dy++) {
              for (let dx = 0; dx < scale; dx++) {
                const py = y * scale + dy;
                const px = x * scale + dx;
                const byteIdx = py * widthBytes + Math.floor(px / 8);
                const bitMask = 0x80 >> (px % 8);
                raster[byteIdx] |= bitMask;
              }
            }
          }
        }
      }

      // GS v 0 (Print raster bit image)
      writeBytes([
        0x1D, 0x76, 0x30, 0x00,
        widthBytes & 0xFF, (widthBytes >> 8) & 0xFF,
        imgHeight & 0xFF, (imgHeight >> 8) & 0xFF
      ]);
      chunks.push(raster);
    } catch (e) {
      log(`Raster QR failed: ${e.message}`, 'WARN');
    }
  }

  // Label Text strictly inside QR flag area (Exact Image 2 Typography):
  writeBytes([0x1B, 0x4D, 0x01]); // Font B (9x17 dots, crystal sharp & dark)
  writeBytes([0x1B, 0x45, 0x01]); // Bold ON
  writeText(`${sku}\n`);
  writeBytes([0x1B, 0x45, 0x00]); // Bold OFF
  if (name) writeText(`${name}\n`);
  if (price) writeText(`${price}\n`);
  writeBytes([0x1B, 0x4D, 0x00]); // Font A (normal)
  writeBytes([0x1B, 0x32]); // Reset line spacing

  writeBytes([0x1B, 0x64, 0x02]); // Feed 2 lines
  writeBytes([0x1D, 0x56, 0x42, 0x00]); // Partial cut

  return Buffer.concat(chunks);
}

// ── Process Print Order ───────────────────────────────────────────────────────
async function processPrintOrder(order, forcePrint = false) {
  const orderRef = order.order_number || order.order_ref || (order.id ? String(order.id) : null);
  if (!orderRef) return { success: false, error: 'Missing order reference' };

  // All known identifiers for this order to prevent multi-channel duplicate printing
  const refs = [order.order_number, order.order_ref, order.id ? String(order.id) : null].filter(Boolean);
  const alreadyPrinted = refs.some(r => printedHistory[r] && printedHistory[r] !== 'SKIPPED_STALE' && printedHistory[r] !== 'PRINTING');

  if (!forcePrint && alreadyPrinted) {
    log(`[Deduplication] Duplicate print skipped for order #${orderRef} (Already printed)`);
    return { success: true, skippedDuplicate: true, orderNumber: orderRef };
  }

  refs.forEach(r => { printedHistory[r] = 'PRINTING'; });

  log(`Preparing 2.5-inch Customer Bill for order #${orderRef}...`);
  const receiptBinary = format25InchEscPosReceipt(order);
  const result = await spoolBytesToPrinter(receiptBinary, `Bill-${orderRef}`);

  if (result.success) {
    const nowIso = new Date().toISOString();
    refs.forEach(r => { printedHistory[r] = nowIso; });
    savePrintedHistory();
    return { success: true, orderNumber: orderRef, printedAt: nowIso };
  } else {
    // Zero-drop failure recovery: enqueue to retry queue so bill prints as soon as printer is ready
    enqueueFailedPrintJob(order, `Bill-${orderRef}`);
    return { success: false, error: result.error, orderNumber: orderRef, queuedForRetry: true };
  }
}

// ── Startup Historical Orders Seeder (Prevents Replaying Old Orders on Boot) ──
let startupSeeded = false;
async function seedStartupOrders() {
  if (startupSeeded || !config.supabaseUrl || !config.supabaseAnonKey) return;
  startupSeeded = true;
  try {
    const res = await fetch(`${config.supabaseUrl}/rest/v1/orders?select=id,order_number,order_ref&limit=100`, {
      headers: {
        'apikey': config.supabaseAnonKey,
        'Authorization': `Bearer ${config.supabaseAnonKey}`
      },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const existing = await res.json();
      if (Array.isArray(existing)) {
        let changed = false;
        existing.forEach(o => {
          const refs = [o.order_number, o.order_ref, o.id ? String(o.id) : null].filter(Boolean);
          refs.forEach(r => {
            if (!printedHistory[r]) {
              printedHistory[r] = 'EXISTING_AT_STARTUP';
              changed = true;
            }
          });
        });
        if (changed) savePrintedHistory();
        log(`[Startup] Order history initialized (${Object.keys(printedHistory).length} historical orders cached; only NEW orders will auto-print).`);
      }
    }
  } catch (e) {
    log(`[Startup] Seed note: ${e.message}`, 'WARN');
  }
}

// ── Cloud Order Listener (Real-Time Website Order Ingestion) ──────────────────
let isPollingCloud = false;
async function pollCloudOrders() {
  if (isPollingCloud || !config.supabaseUrl || !config.supabaseAnonKey) return;
  isPollingCloud = true;
  try {
    // On first run, seed existing orders so daemon never replays past orders
    if (!startupSeeded) {
      await seedStartupOrders();
    }

    const res = await fetch(`${config.supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc&limit=25`, {
      headers: {
        'apikey': config.supabaseAnonKey,
        'Authorization': `Bearer ${config.supabaseAnonKey}`
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      state.cloudConnected = false;
      return;
    }

    state.cloudConnected = true;
    const orders = await res.json();
    if (!Array.isArray(orders)) return;

    await refreshCatalogCache().catch(() => { });

    const now = Date.now();
    // Freshness window (10 minutes) ensures only recently placed active orders are auto-printed
    const freshnessMs = (config.orderFreshnessMinutes || 10) * 60 * 1000;

    // Periodic heartbeat log every 30 seconds so the console shows active polling
    if (!state.lastHeartbeatTime || (now - state.lastHeartbeatTime > 30000)) {
      state.lastHeartbeatTime = now;
      log(`[Cloud Poller] Watching Noor Cloud (Connected: ✓ | Orders in history: ${Object.keys(printedHistory).length})`);
    }

    for (const o of orders) {
      const ref = o.order_ref || o.order_number || (o.id ? String(o.id) : null);
      if (!ref || /TEST-REF|GHOST-TEST/i.test(ref)) continue;

      // Check all aliases for this order
      const refs = [o.order_number, o.order_ref, o.id ? String(o.id) : null].filter(Boolean);
      const isDone = refs.some(r => printedHistory[r] && printedHistory[r] !== 'SKIPPED_STALE');
      if (isDone) continue;

      const orderTime = o.created_at ? new Date(o.created_at).getTime() : 0;
      if (orderTime && (now - orderTime > freshnessMs)) {
        refs.forEach(r => { printedHistory[r] = 'SKIPPED_STALE'; });
        continue;
      }

      // Mark as printing immediately to prevent concurrency duplicates
      refs.forEach(r => { printedHistory[r] = 'PRINTING'; });

      const clientName = o.customer_name || 'Online Client';
      const grandTotal = o.grand_total || o.total_payable_inr || (o.total_payable_paise ? o.total_payable_paise / 100 : 0);
      log(`[Cloud Event] Detected order #${ref} for ${clientName} (Total: Rs.${grandTotal})! Auto-printing bill...`);

      if (typeof o.items === 'string') {
        try { o.items = JSON.parse(o.items); } catch (_) { }
      }

      // Extract prescription from items or query Supabase prescriptions table by phone
      if (!o.prescription && Array.isArray(o.items)) {
        for (const it of o.items) {
          if (it && (it.prescription || it.rx)) {
            o.prescription = it.prescription || it.rx;
            break;
          }
        }
      }
      if (!o.prescription && o.customer_phone) {
        try {
          const rawPhone = String(o.customer_phone).trim();
          const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
          const phoneQuery = cleanPhone.length >= 10 ? `client_phone=ilike.*${cleanPhone.slice(-10)}*` : `client_phone=eq.${encodeURIComponent(rawPhone)}`;
          const rxRes = await fetch(`${config.supabaseUrl}/rest/v1/prescriptions?${phoneQuery}&order=created_at.desc&limit=1`, {
            headers: { 'apikey': config.supabaseAnonKey, 'Authorization': `Bearer ${config.supabaseAnonKey}` },
            signal: AbortSignal.timeout(3000)
          });
          if (rxRes.ok) {
            const rxData = await rxRes.json();
            if (Array.isArray(rxData) && rxData.length > 0) o.prescription = rxData[0];
          }
        } catch (_) { }
      }

      const printResult = await processPrintOrder(o);
      if (printResult.success) {
        printedHistory[ref] = new Date().toISOString();
        savePrintedHistory();
      } else {
        delete printedHistory[ref];
      }
    }
  } catch (err) {
    state.cloudConnected = false;
  } finally {
    isPollingCloud = false;
  }
}

// ── Cloud Print Queue (Direct Background Sticker & Manual Print Jobs) ────────
async function pollCloudPrintQueue() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) return;
  try {
    const res = await fetch(`${config.supabaseUrl}/rest/v1/customers?client_code=eq.SYS-PRINT-QUEUE`, {
      headers: {
        'apikey': config.supabaseAnonKey,
        'Authorization': `Bearer ${config.supabaseAnonKey}`
      }
    });
    if (!res.ok) return;
    const recs = await res.json();
    if (!Array.isArray(recs) || recs.length === 0 || !recs[0].notes) return;

    let notesObj = null;
    try { notesObj = JSON.parse(recs[0].notes); } catch (_) { }
    if (!notesObj || !Array.isArray(notesObj.jobs) || notesObj.jobs.length === 0) return;

    const remainingJobs = [];
    let changed = false;

    for (const job of notesObj.jobs) {
      const jobId = String(job.id || '');
      if (printedHistory[jobId]) continue;

      if (job.type === 'qr_sticker') {
        log(`[Cloud Queue] Processing sticker print job ${jobId}...`);
        const rawItems = Array.isArray(job.items) ? job.items : [job];
        const buffers = [];
        for (const item of rawItems) {
          const copies = parseInt(item.copies || 1, 10);
          for (let c = 0; c < copies; c++) {
            const buf = await format25InchEscPosQrSticker(item);
            buffers.push(buf);
          }
        }
        if (buffers.length > 0) {
          const combined = Buffer.concat(buffers);
          const result = await spoolBytesToPrinter(combined, `Sticker-${jobId}`);
          if (result.success) {
            printedHistory[jobId] = new Date().toISOString();
            changed = true;
            log(`[Cloud Queue] SUCCESS: Printed ${buffers.length} sticker(s) for job ${jobId}!`);
          } else {
            remainingJobs.push(job);
          }
        }
      } else if (job.type === 'receipt' || job.order) {
        log(`[Cloud Queue] Processing receipt print job ${jobId}...`);
        const orderToPrint = job.order || job;
        const ref = orderToPrint.order_number || orderToPrint.order_ref || (orderToPrint.id ? String(orderToPrint.id) : null);
        const refs = [orderToPrint.order_number, orderToPrint.order_ref, orderToPrint.id ? String(orderToPrint.id) : null].filter(Boolean);
        const alreadyPrinted = refs.some(r => printedHistory[r] && printedHistory[r] !== 'SKIPPED_STALE' && printedHistory[r] !== 'PRINTING');

        if (alreadyPrinted) {
          log(`[Cloud Queue] Order #${ref || jobId} already printed; acknowledging duplicate without reprint.`);
          printedHistory[jobId] = new Date().toISOString();
          changed = true;
          continue;
        }

        const result = await processPrintOrder(orderToPrint, false);
        if (result.success) {
          printedHistory[jobId] = new Date().toISOString();
          changed = true;
          log(`[Cloud Queue] SUCCESS: Printed bill for order ${jobId}!`);
        } else {
          remainingJobs.push(job);
        }
      } else {
        remainingJobs.push(job);
      }
    }

    if (changed) {
      savePrintedHistory();
      await fetch(`${config.supabaseUrl}/rest/v1/customers?client_code=eq.SYS-PRINT-QUEUE`, {
        method: 'PATCH',
        headers: {
          'apikey': config.supabaseAnonKey,
          'Authorization': `Bearer ${config.supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ notes: JSON.stringify({ jobs: remainingJobs }) })
      }).catch(() => { });
    }
  } catch (_) { }
}

// ── Local HTTP Server (Port 5001) ─────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS Configuration
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1:5001'}`);

  // 1. GET /api/status (Health & Metrics Indicator)
  if (req.method === 'GET' && url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      version: DAEMON_VERSION,
      engine: 'Node.js',
      printer: config.printerName,
      paperWidthInch: config.paperWidthInch || 2.5,
      columns: config.columns || 32,
      printKOT: config.printKOT || false,
      totalPrinted: state.totalPrinted,
      failedJobs: state.failedJobs,
      cloudConnected: state.cloudConnected,
      lastPrintedTime: state.lastPrintedTime,
      lastError: state.lastError,
      uptimeSeconds: Math.floor((Date.now() - state.startTime) / 1000)
    }));
  }

  // 2. GET /api/printers (Scan Installed Printers)
  if (req.method === 'GET' && url.pathname === '/api/printers') {
    exec('powershell.exe -Command "Get-Printer | Select-Object -Property Name, DriverName, PortName, PrinterStatus | ConvertTo-Json"', (err, stdout) => {
      let printers = [];
      try { printers = JSON.parse(stdout); } catch (e) { }
      if (!Array.isArray(printers)) printers = printers ? [printers] : [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, printers }));
    });
    return;
  }

  // 3. POST /api/print (In-Store Checkout or Manual Reprint - Guaranteed Print)
  if (req.method === 'POST' && url.pathname === '/api/print') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        // Always force print for explicit cashier/POS print requests
        const result = await processPrintOrder(payload.order || payload, true);
        res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 4. POST /api/printer/print-qr-sticker (Yellow Frame QR Stickers)
  if (req.method === 'POST' && (url.pathname === '/api/printer/print-qr-sticker' || url.pathname === '/api/print-qr-sticker')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const rawItems = Array.isArray(payload.items) ? payload.items : [payload];
        log(`Received QR Sticker print request for ${rawItems.length} frame(s)...`);

        const buffers = [];
        for (const item of rawItems) {
          const copies = parseInt(item.copies || payload.copies || 1, 10);
          for (let c = 0; c < copies; c++) {
            const buf = await format25InchEscPosQrSticker(item);
            buffers.push(buf);
          }
        }

        const combined = Buffer.concat(buffers);
        const result = await spoolBytesToPrinter(combined, 'Frame QR Stickers');
        res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: result.success,
          count: rawItems.length,
          message: result.success ? `Printed ${rawItems.length} sticker(s) to ${config.printerName}` : result.error
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 5. POST /api/test-print (1-Click Test Receipt)
  if (req.method === 'POST' && url.pathname === '/api/test-print') {
    const sampleOrder = {
      order_number: 'TEST-' + Math.floor(Math.random() * 9000 + 1000),
      token_number: 99,
      channel: 'TEST PRINT',
      customer_name: 'Test Customer',
      customer_phone: '+91 99999 99999',
      city: 'Bengaluru',
      subtotal_inr: 4299,
      discount_inr: 0,
      total_payable_inr: 4299,
      amount_paid_inr: 4299,
      payment_method: 'CASH',
      od_sph: -1.50, od_cyl: -0.50, od_axis: 90, addition: 1.50,
      os_sph: -1.75, os_cyl: -0.25, os_axis: 80, ipd_distance: 63,
      rx_checked_by: 'Staff Optom',
      items: [{ product_name: 'The Amber Arch', quantity: 1, unit_price_inr: 4299, variant_name: 'Mazzucchelli Honey' }]
    };

    const binary = format25InchEscPosReceipt(sampleOrder);
    const result = await spoolBytesToPrinter(binary, 'Test Receipt');
    res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: result.success,
      message: result.success ? `Test receipt printed to ${config.printerName}!` : result.error
    }));
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

// ── Startup & Watchdog ────────────────────────────────────────────────────────
server.listen(config.port, '0.0.0.0', () => {
  log(`=======================================================`);
  log(`NOOR OPTICS - PORTABLE POS PRINT DAEMON v${DAEMON_VERSION}`);
  log(`Listening on http://127.0.0.1:${config.port}`);
  log(`Target Printer: '${config.printerName}' (2.5 Inch Paper Width)`);
  log(`Mode: Single Customer Bill (KOT: ${config.printKOT})`);
  log(`=======================================================`);

  // Start Cloud Listener Loop (every 2 seconds for instant storefront order printing)
  setInterval(pollCloudOrders, 2000);
  pollCloudOrders();

  // Start Cloud Print Queue Worker (every 2 seconds)
  setInterval(pollCloudPrintQueue, 2000);
  pollCloudPrintQueue();

  // Start Automatic Retry Queue Worker for offline/recovered printer (every 3 seconds)
  setInterval(processRetryQueue, 3000);
  processRetryQueue();
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    log(`Port ${config.port} is already in use by another instance. Exiting to prevent conflict.`, 'WARN');
    process.exit(0);
  } else {
    log(`Server error: ${err.message}`, 'FATAL');
    process.exit(1);
  }
});

