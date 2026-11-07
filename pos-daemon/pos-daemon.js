/**
 * pos-daemon/pos-daemon.js – Ultra-Fast Live POS Print Daemon v3.0.0
 * Noor Optics Live Thermal Receipt & Optical Temple QR Sticker System.
 * 
 * CORE PRINCIPLE: LIVE PRINTING ONLY
 * - Zero backlog replaying
 * - Zero database queue locks or lease polling
 * - Immediate hardware output for every live order (POS checkout & Website orders)
 * - Complete prescription printing (OD/OS SPH, CYL, AXIS, ADD, PD, Optometrist, Prescriber)
 * - Anti-blotting optical temple QR sticker printing
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DAEMON_VERSION = '3.1.0-LIVE-AUTONOMOUS';
const SCRIPT_DIR = __dirname;
const CONFIG_FILE = path.join(SCRIPT_DIR, 'config.json');
const PRINTED_FILE = path.join(SCRIPT_DIR, '.printed_orders.json');
const LOGS_DIR = path.join(SCRIPT_DIR, 'logs');
const WORKER_SCRIPT = path.join(SCRIPT_DIR, 'worker-printer.ps1');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// ── Startup & Persistent Deduplication (Never Reprints Duplicates, Never Skips) ──
const daemonStartTime = Date.now();
const printedOrdersSet = new Set();
const processedJobIds = new Set();
let printMutex = Promise.resolve();

function loadPrintedState() {
  if (fs.existsSync(PRINTED_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(PRINTED_FILE, 'utf8'));
      if (Array.isArray(data)) {
        data.forEach(id => {
          if (id) {
            printedOrdersSet.add(String(id).trim());
            processedJobIds.add(String(id).trim());
          }
        });
      }
    } catch (_) {}
  }
}

function savePrintedState() {
  try {
    const list = Array.from(new Set([...printedOrdersSet, ...processedJobIds])).slice(-300);
    fs.writeFileSync(PRINTED_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (_) {}
}
loadPrintedState();

// ── Strict Channel Classifier (NOOR-POS- = Code 2 Instore, NOOR-WEB- = Code 1 Website) ──
function isWebsiteOrder(order) {
  if (!order) return false;
  const ref = String(order.order_number || order.order_ref || order.id || '').toUpperCase();
  if (ref.includes('-POS-') || ref.startsWith('ORD-POS-') || order.channel_code === 2 || String(order.channel || '').toUpperCase() === 'POS' || String(order.source || '').toLowerCase() === 'instore') {
    return false;
  }
  if (ref.includes('-WEB-') || ref.includes('-ONL-') || ref.startsWith('ORD-WEB-') || order.channel_code === 1 || String(order.channel || '').toUpperCase() === 'WEBSITE' || String(order.channel || '').toUpperCase() === 'ONLINE' || String(order.source || '').toLowerCase() === 'website') {
    return true;
  }
  return false;
}

// ── Paper Width & UPI Configuration (Tweakable) ──────────────────────────────
const PAPER_WIDTH_COLS = 32; // Characters per line for 2.5-inch thermal paper (e.g. 32, 40, 48)
const UPI_ID = '9182341567@mairtel'; // Shop UPI ID for payment QR code & receipt text

// ── Configuration ─────────────────────────────────────────────────────────────
let config = {
  port: 5001,
  printerName: 'POS-80',
  paperWidthInch: 2.5,
  columns: 32,
  storeName: 'NOOR OPTIC',
  storeAddress: 'Pillar No. 45, Rethibowli',
  storePhone: '+91 98765 43210',
  upiId: '9182341567@mairtel',
  supabaseUrl: 'https://czajxtgwsxbrrymrhauz.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk'
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    config = { ...config, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('[Daemon] Error reading config.json:', e.message);
  }
}

// ── Smart Thermal Printer Auto-Discovery ──────────────────────────────────────
function autoDetectPrinter() {
  try {
    const stdout = execSync(
      'powershell.exe -NoProfile -Command "try { Get-Printer | Select-Object -ExpandProperty Name } catch { (Get-CimInstance Win32_Printer).Name }"',
      { encoding: 'utf8', timeout: 5000 }
    );
    const installed = stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (installed.length === 0) return config.printerName;

    const isVirtual = name => /PDF|OneNote|Fax|XPS|Document Writer|Root Print Queue/i.test(name);
    const physicalPrinters = installed.filter(name => !isVirtual(name));

    // 1. Exact match
    if (installed.includes(config.printerName)) {
      return config.printerName;
    }

    // 2. Search for any installed USB / thermal POS printer
    const posMatch = installed.find(name => !isVirtual(name) && /POS|Thermal|Receipt|80|58|XP|RP|Text Only|Generic|Everycom|TVS|Epson|Citizen|Star|HPRT|ZJ|Xprinter|Rongta|Gprinter|Black Copper|Bixolon|Barcode/i.test(name));
    if (posMatch) {
      config.printerName = posMatch;
      try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8'); } catch (_) {}
      return posMatch;
    }

    // 3. Fallback to first physical printer
    if (physicalPrinters.length > 0) {
      config.printerName = physicalPrinters[0];
      try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8'); } catch (_) {}
      return physicalPrinters[0];
    }
  } catch (_) {}
  return config.printerName;
}

const activePrinter = autoDetectPrinter();

// ── Pre-compiled Raster Assets ────────────────────────────────────────────────
let logoRasterBuffer = null;
let paymentQrRasterBuffer = null;
try {
  const logoPath = path.join(__dirname, 'assets', 'logo_raster.bin');
  if (fs.existsSync(logoPath)) logoRasterBuffer = fs.readFileSync(logoPath);
} catch (_) {}
try {
  const qrPath = path.join(__dirname, 'assets', 'payment_qr_raster.bin');
  if (fs.existsSync(qrPath)) paymentQrRasterBuffer = fs.readFileSync(qrPath);
} catch (_) {}

// ── Hardware Spooler (Win32 Raw ESC/POS via worker-printer.ps1) ────────────────
function spoolBytesToPrinter(buffer, docName = 'Customer Bill') {
  const job = printMutex.then(() => _rawSpoolBytesToPrinter(buffer, docName));
  printMutex = job.catch(() => {});
  return job;
}

function _rawSpoolBytesToPrinter(buffer, docName) {
  return new Promise((resolve) => {
    const tempFile = path.join(LOGS_DIR, `spool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.bin`);
    try {
      fs.writeFileSync(tempFile, buffer);
    } catch (e) {
      return resolve({ success: false, error: 'Failed to write temp spool file: ' + e.message });
    }

    const { exec } = require('child_process');
    const cmd = `powershell.exe -ExecutionPolicy Bypass -NoProfile -File "${WORKER_SCRIPT}" -FilePath "${tempFile}" -PrinterName "${config.printerName}" -DocName "${docName}"`;
    exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
      try { fs.unlinkSync(tempFile); } catch (_) {}
      if (error) {
        resolve({ success: false, error: stderr || error.message });
      } else {
        resolve({ success: true, stdout: stdout.trim() });
      }
    });
  });
}

// ── 5x7 Dot-Matrix Font for Crisp Text on Stickers ────────────────────────────
const FONT_5X7 = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '!': [0x00, 0x00, 0x5F, 0x00, 0x00],
  '"': [0x00, 0x07, 0x00, 0x07, 0x00],
  '#': [0x14, 0x7F, 0x14, 0x7F, 0x14],
  '$': [0x24, 0x2A, 0x7F, 0x2A, 0x12],
  '%': [0x23, 0x13, 0x08, 0x64, 0x62],
  '&': [0x36, 0x49, 0x55, 0x22, 0x50],
  "'": [0x00, 0x05, 0x03, 0x00, 0x00],
  '(': [0x00, 0x1C, 0x22, 0x41, 0x00],
  ')': [0x00, 0x41, 0x22, 0x1C, 0x00],
  '*': [0x14, 0x08, 0x3E, 0x08, 0x14],
  '+': [0x08, 0x08, 0x3E, 0x08, 0x08],
  ',': [0x00, 0x50, 0x30, 0x00, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02],
  '0': [0x3E, 0x51, 0x49, 0x45, 0x3E],
  '1': [0x00, 0x42, 0x7F, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4B, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7F, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3C, 0x4A, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1E],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  ';': [0x00, 0x56, 0x36, 0x00, 0x00],
  '<': [0x08, 0x14, 0x22, 0x41, 0x00],
  '=': [0x14, 0x14, 0x14, 0x14, 0x14],
  '>': [0x00, 0x41, 0x22, 0x14, 0x08],
  '?': [0x02, 0x01, 0x51, 0x09, 0x06],
  '@': [0x32, 0x49, 0x79, 0x41, 0x3E],
  'A': [0x7E, 0x11, 0x11, 0x11, 0x7E],
  'B': [0x7F, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3E, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7F, 0x41, 0x41, 0x22, 0x1C],
  'E': [0x7F, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7F, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3E, 0x41, 0x49, 0x49, 0x7A],
  'H': [0x7F, 0x08, 0x08, 0x08, 0x7F],
  'I': [0x00, 0x41, 0x7F, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3F, 0x01],
  'K': [0x7F, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7F, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7F, 0x02, 0x0C, 0x02, 0x7F],
  'N': [0x7F, 0x04, 0x08, 0x10, 0x7F],
  'O': [0x3E, 0x41, 0x41, 0x41, 0x3E],
  'P': [0x7F, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3E, 0x41, 0x51, 0x21, 0x5E],
  'R': [0x7F, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7F, 0x01, 0x01],
  'U': [0x3F, 0x40, 0x40, 0x40, 0x3F],
  'V': [0x1F, 0x20, 0x40, 0x20, 0x1F],
  'W': [0x7F, 0x20, 0x18, 0x20, 0x7F],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
  'a': [0x20, 0x54, 0x54, 0x54, 0x78],
  'b': [0x7F, 0x48, 0x44, 0x44, 0x38],
  'c': [0x38, 0x44, 0x44, 0x44, 0x20],
  'd': [0x38, 0x44, 0x44, 0x48, 0x7F],
  'e': [0x38, 0x54, 0x54, 0x54, 0x18],
  'f': [0x08, 0x7E, 0x09, 0x01, 0x02],
  'g': [0x0C, 0x52, 0x52, 0x52, 0x3E],
  'h': [0x7F, 0x08, 0x04, 0x04, 0x78],
  'i': [0x00, 0x44, 0x7D, 0x40, 0x00],
  'j': [0x20, 0x40, 0x44, 0x3D, 0x00],
  'k': [0x7F, 0x10, 0x28, 0x44, 0x00],
  'l': [0x00, 0x41, 0x7F, 0x40, 0x00],
  'm': [0x7C, 0x04, 0x18, 0x04, 0x78],
  'n': [0x7C, 0x08, 0x04, 0x04, 0x78],
  'o': [0x38, 0x44, 0x44, 0x44, 0x38],
  'p': [0x7C, 0x14, 0x14, 0x14, 0x08],
  'q': [0x08, 0x14, 0x14, 0x18, 0x7C],
  'r': [0x7C, 0x08, 0x04, 0x04, 0x08],
  's': [0x48, 0x54, 0x54, 0x54, 0x20],
  't': [0x04, 0x3F, 0x44, 0x40, 0x20],
  'u': [0x3C, 0x40, 0x40, 0x20, 0x7C],
  'v': [0x1C, 0x20, 0x40, 0x20, 0x1C],
  'w': [0x3C, 0x40, 0x30, 0x40, 0x3C],
  'x': [0x44, 0x28, 0x10, 0x28, 0x44],
  'y': [0x0C, 0x50, 0x50, 0x50, 0x3C],
  'z': [0x44, 0x64, 0x54, 0x4C, 0x44]
};

function drawBitmapText(raster, widthBytes, text, startX, startY, scale = 1, isBold = false) {
  const str = String(text || '');
  let curX = startX;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const glyph = FONT_5X7[ch] || FONT_5X7[' '];
    for (let col = 0; col < 5; col++) {
      const colByte = glyph[col];
      for (let row = 0; row < 7; row++) {
        if ((colByte & (1 << row)) !== 0) {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = curX + col * scale + dx;
              const py = startY + row * scale + dy;
              if (px >= 0 && px < widthBytes * 8 && py >= 0) {
                const bIdx = py * widthBytes + Math.floor(px / 8);
                if (bIdx < raster.length) {
                  raster[bIdx] |= (0x80 >> (px % 8));
                }
              }
              if (isBold && (px + 1) < widthBytes * 8) {
                const bIdxBold = py * widthBytes + Math.floor((px + 1) / 8);
                if (bIdxBold < raster.length) {
                  raster[bIdxBold] |= (0x80 >> ((px + 1) % 8));
                }
              }
            }
          }
        }
      }
    }
    curX += (5 + 1) * scale + (isBold ? 1 : 0);
  }
}

// ── Format Optical Frame QR Sticker (Exact Image 2 Reference Engine) ───────────
async function format25InchEscPosQrSticker(item) {
  let QRCode;
  try { QRCode = require(path.join(__dirname, 'assets', 'qrcode-bundle.js')); } catch (_) {}
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

  const qrPayload = (item.qrPayload || sku).trim().toUpperCase();
  const widthDots = 384;
  const widthBytes = 48; // 384 / 8 = 48 bytes per line
  let qrSize = 0;
  let qrMatrix = null;

  if (QRCode) {
    try {
      const qr = QRCode.create(qrPayload, { errorCorrectionLevel: 'M' });
      qrMatrix = qr;
      qrSize = qr.modules.size;
    } catch (_) {}
  }

  const qrScale = 4;
  const qrQuiet = 2;
  const qrModules = (qrSize > 0) ? (qrSize + qrQuiet * 2) : 25;
  const qrPix = qrModules * qrScale; // 100 dots (~12.5mm)

  const totalHeight = qrPix + 70;
  const raster = Buffer.alloc(widthBytes * totalHeight, 0);

  const qrStartX = Math.floor((widthDots - qrPix) / 2);
  const qrStartY = 4;

  if (qrMatrix) {
    for (let my = 0; my < qrModules; my++) {
      const actualY = my - qrQuiet;
      for (let mx = 0; mx < qrModules; mx++) {
        const actualX = mx - qrQuiet;
        const isBlack = (actualX >= 0 && actualX < qrSize && actualY >= 0 && actualY < qrSize)
          ? Boolean(qrMatrix.modules.data[actualY * qrSize + actualX])
          : false;
        if (isBlack) {
          // Solid 4x4 finders on the 3 corners; bold 3x3 centered dots inside (vivid contrast, zero thermal blotting)
          const isFinder = (actualX < 7 && actualY < 7) ||
                           (actualX >= qrSize - 7 && actualY < 7) ||
                           (actualX < 7 && actualY >= qrSize - 7);
          const start = 0;
          const count = isFinder ? qrScale : 3;

          for (let dy = start; dy < start + count; dy++) {
            for (let dx = start; dx < start + count; dx++) {
              const px = qrStartX + mx * qrScale + dx;
              const py = qrStartY + my * qrScale + dy;
              const bIdx = py * widthBytes + Math.floor(px / 8);
              raster[bIdx] |= (0x80 >> (px % 8));
            }
          }
        }
      }
    }
  }

  // Draw SKU Centered under QR (Scale 1 Bold)
  let curY = qrStartY + qrPix + 4;
  const skuWidth = sku.length * 7 * 1;
  const skuX = Math.max(0, Math.floor((widthDots - skuWidth) / 2));
  drawBitmapText(raster, widthBytes, sku, skuX, curY, 1, true);
  curY += 13;

  // Draw Frame Name Centered (Scale 1 Regular)
  if (name) {
    const nameWidth = name.length * 6 * 1;
    const nameX = Math.max(0, Math.floor((widthDots - nameWidth) / 2));
    drawBitmapText(raster, widthBytes, name, nameX, curY, 1, false);
    curY += 12;
  }

  // Draw Price Centered (Scale 1 Bold)
  if (price) {
    const priceWidth = price.length * 7 * 1;
    const priceX = Math.max(0, Math.floor((widthDots - priceWidth) / 2));
    drawBitmapText(raster, widthBytes, price, priceX, curY, 1, true);
    curY += 13;
  }

  const finalHeight = curY + 2;
  const slicedRaster = raster.slice(0, widthBytes * finalHeight);

  const header = Buffer.from([
    0x1B, 0x40, // ESC @ (Initialize)
    0x1D, 0x76, 0x30, 0x00, // GS v 0
    widthBytes & 0xFF, (widthBytes >> 8) & 0xFF,
    finalHeight & 0xFF, (finalHeight >> 8) & 0xFF
  ]);

  const footer = Buffer.from([
    0x1B, 0x64, 0x01, // Feed 1 line (~1mm smaller label)
    0x1D, 0x56, 0x42, 0x00 // Partial cut
  ]);

  return Buffer.concat([header, slicedRaster, footer]);
}

// ── Format Complete 2.5-Inch Thermal Receipt (Matches Reference Image Exactly) ──
function format25InchEscPosReceipt(rawOrder) {
  const order = rawOrder.order || rawOrder;
  const COLS = (config && config.columns) || (typeof PAPER_WIDTH_COLS !== 'undefined' ? PAPER_WIDTH_COLS : 32);
  const chunks = [];

  const writeBytes = (arr) => chunks.push(Buffer.from(arr));
  const writeText = (str) => chunks.push(Buffer.from(str, 'ascii'));

  const divider = '-'.repeat(COLS) + '\n';

  function isWebsiteOrder(o) {
    if (!o) return false;
    const ref = String(o.order_number || o.order_ref || o.id || '').toUpperCase();
    if (ref.includes('-POS-') || ref.startsWith('ORD-POS-') || o.channel_code === 2 || String(o.channel || '').toUpperCase() === 'POS' || String(o.source || '').toLowerCase() === 'instore') {
      return false;
    }
    if (ref.includes('-WEB-') || ref.includes('-ONL-') || ref.startsWith('ORD-WEB-') || o.channel_code === 1 || String(o.channel || '').toUpperCase() === 'WEBSITE' || String(o.channel || '').toUpperCase() === 'ONLINE' || String(o.source || '').toLowerCase() === 'website') {
      return true;
    }
    return false;
  }

  function center(text) {
    const s = String(text || '').trim();
    if (s.length >= COLS) return s.slice(0, COLS) + '\n';
    const pad = Math.max(0, Math.floor((COLS - s.length) / 2));
    return ' '.repeat(pad) + s + '\n';
  }

  function row(left, right) {
    const l = String(left || '');
    const r = String(right || '');
    if (l.length + r.length >= COLS) {
      return l + '\n' + r.padStart(COLS) + '\n';
    }
    const spaces = Math.max(1, COLS - l.length - r.length);
    return l + ' '.repeat(spaces) + r + '\n';
  }

  function wrapTextLines(text, width) {
    const words = String(text || '').trim().split(/\s+/);
    const lines = [];
    let cur = '';
    words.forEach(w => {
      if ((cur ? cur + ' ' + w : w).length <= width) {
        cur = cur ? cur + ' ' + w : w;
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function formatNum(val) {
    const n = Math.round(Number(val) || 0);
    return n.toLocaleString('en-IN');
  }

  function formatDateTime(d) {
    if (!d) return '';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const day = String(dt.getDate()).padStart(2, '0');
      const mon = months[dt.getMonth()];
      const year = dt.getFullYear();
      let hours = dt.getHours();
      const mins = String(dt.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${day} ${mon} ${year} ${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
    } catch (_) {
      return String(d);
    }
  }

  function formatDateOnly(d) {
    if (!d) return '';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${String(dt.getDate()).padStart(2, '0')} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
    } catch (_) {
      return String(d);
    }
  }

  function formatTimeOnly(d) {
    if (!d) return '';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      let hours = dt.getHours();
      const mins = String(dt.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
    } catch (_) {
      return String(d);
    }
  }

  function finRow(lbl, val) {
    const l = String(lbl);
    const v = (val !== null && val !== undefined && val !== '') ? formatNum(val) : '';
    const line = l.padStart(16) + '  ' + v.padStart(8);
    return line.padStart(COLS) + '\n';
  }

  function fmtDio(val) {
    if (val === undefined || val === null || val === '' || val === '--' || val === '---') return '--';
    const n = Number(val);
    if (isNaN(n)) return String(val).slice(0, 6);
    if (n === 0) return '0.00';
    const sign = n > 0 ? '+' : '';
    return sign + n.toFixed(2);
  }

  function fmtAx(val) {
    if (val === undefined || val === null || val === '' || val === '--' || val === '---') return '--';
    return String(val).slice(0, 6);
  }

  // 1. Initialize Printer
  writeBytes([0x1B, 0x40]); // ESC @
  writeBytes([0x1B, 0x74, 0x00]); // Standard ASCII table

  // 2. Centered Logo
  if (logoRasterBuffer && logoRasterBuffer.length > 0) {
    writeBytes([0x1B, 0x61, 0x01]);
    writeBytes(logoRasterBuffer);
  }

  // Shop Header (NOOR OPTIC centered, bold, double size)
  writeBytes([0x1B, 0x61, 0x01]); // Center
  writeBytes([0x1B, 0x45, 0x01]); // Bold ON
  writeBytes([0x1D, 0x21, 0x11]); // Double width & height
  writeText(`${config.storeName || 'NOOR OPTIC'}\n`);
  writeBytes([0x1D, 0x21, 0x00]); // Normal
  writeBytes([0x1B, 0x45, 0x00]); // Bold OFF

  const storeAddress = config.storeAddress || 'Pillar No. 45, Rethibowli';
  const addrLines = wrapTextLines(storeAddress, COLS);
  addrLines.forEach(al => writeText(center(al)));
  writeText(center(`Ph: ${config.storePhone || '+91 98765 43210'}`));

  // 3. Dashed line
  writeBytes([0x1B, 0x61, 0x00]); // Left align
  writeText(divider);

  // 4. Short Invoice No (left) & Date + Time (right)
  const rawRef = String(order.token_number || order.order_number || order.order_ref || order.id || '4866');
  const shortRef = rawRef.includes('-') ? rawRef.split('-').pop() : (rawRef.length > 6 ? rawRef.slice(-4) : rawRef);
  const invNo = 'INV: ' + shortRef;
  const dateStr = formatDateTime(order.created_at || Date.now());
  writeText(row(invNo, dateStr));

  // 5. Dashed line
  writeText(divider);

  // 6. Name, Phone, City, Age
  const custName = String(order.customer_name || 'Walk-in Client').slice(0, 24);
  const custPhone = String(order.customer_phone || '-').slice(0, 20);
  const city = String(order.city || order.client_city || order.customer_city || 'Hyderabad').slice(0, 14);
  const age = (order.customer_age || order.client_age || order.age) ? String(order.customer_age || order.client_age || order.age) : '--';

  writeText(`Name: ${custName}\n`);
  if (custPhone && custPhone !== '-') {
    writeText(`Phone: ${custPhone}\n`);
  }
  writeText(row(`City: ${city}`, `Age: ${age}`));

  // ONLY print Delivery Date on website orders (never on in-store POS bills)
  if (isWebsiteOrder(order)) {
    const deliveryRaw = order.delivery_date || order.deliveryDate || order.pickup_time || order.pickupTime || order.pick_up_time;
    const dDate = deliveryRaw ? formatDateOnly(deliveryRaw) : '--';
    writeText(row('Delivery Date:', dDate));
  }

  // 7. Dashed line
  writeText(divider);

  // 8. Table header: ITEM | QTY | RATE | TOTAL, then dashed line
  const itemColW = Math.max(10, COLS - 17);
  writeText('ITEM'.padEnd(itemColW) + ' ' + 'QTY'.padStart(3) + ' ' + 'RATE'.padStart(5) + ' ' + 'TOTAL'.padStart(6) + '\n');
  writeText(divider);

  // 9. Item rows (item name on left, QTY / RATE / TOTAL right-aligned) - NO SKU LINE!
  let items = order.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (_) { items = []; }
  }
  if (!Array.isArray(items) || items.length === 0) {
    items = [{ product_name: 'Optical Frame', quantity: 1, unit_price_paise: order.total_payable_paise || 0 }];
  }

  const grandTotal = Number(order.total_payable_inr || (order.total_payable_paise ? order.total_payable_paise / 100 : order.grand_total || order.total || 0));
  const discount = Number(order.discount_inr || (order.discount_paise ? order.discount_paise / 100 : order.discount || 0));

  items.forEach(item => {
    const name = String(item.product_name || item.name || item.model || 'Frame');
    const qty = parseInt(item.quantity || 1, 10);
    const unitPrice = (item.unit_price_inr != null) ? Number(item.unit_price_inr)
      : (item.unit_price_paise != null) ? Number(item.unit_price_paise) / 100
      : (item.priceINR != null) ? Number(item.priceINR)
      : (item.unit_price != null) ? Number(item.unit_price) : 0;
    const lineTotal = (item.subtotal_inr != null) ? Number(item.subtotal_inr)
      : (item.subtotal_paise != null) ? Number(item.subtotal_paise) / 100
      : (item.lineTotalINR != null) ? Number(item.lineTotalINR)
      : (unitPrice * qty);

    const colsStr = ' ' + String(qty).padStart(3) + ' ' + formatNum(unitPrice).padStart(5) + ' ' + formatNum(lineTotal).padStart(6) + '\n';

    if (name.length <= itemColW) {
      writeText(name.padEnd(itemColW) + colsStr);
    } else {
      writeText(name + '\n');
      writeText(' '.repeat(itemColW) + colsStr);
    }
  });

  // 10. Dashed line
  writeText(divider);

  // 11. Right-aligned Financial Layout (Image 3 format)
  const second = Number(order.second_payment_inr || (order.second_payment_paise ? order.second_payment_paise / 100 : 0));
  const third = Number(order.third_payment_inr || (order.third_payment_paise ? order.third_payment_paise / 100 : 0));
  const totalPaid = Number(order.amount_paid_inr != null ? order.amount_paid_inr : (order.amount_paid_paise ? order.amount_paid_paise / 100 : 0));
  const advance = Number(order.advance_paid_inr != null ? order.advance_paid_inr : (order.advance_paid_paise ? order.advance_paid_paise / 100 : Math.max(0, totalPaid - second - third)));
  const remaining = Number(order.outstanding_inr != null ? order.outstanding_inr : (order.outstanding_paise != null ? order.outstanding_paise / 100 : Math.max(0, grandTotal - (advance + second + third))));

  writeText(finRow('Total:', grandTotal));
  writeText(finRow('Discount:', discount > 0 ? discount : 0));
  writeText(finRow('Advance:', advance));
  writeText(finRow('2nd Amount:', second > 0 ? second : ''));
  writeText(finRow('3rd Amount:', third > 0 ? third : ''));
  if (Array.isArray(order.payments) && order.payments.length > 3) {
    for (let pi = 3; pi < order.payments.length; pi++) {
      const p = order.payments[pi];
      const pAmt = p.amount_inr != null ? Number(p.amount_inr) : (p.amount_paise ? Number(p.amount_paise) / 100 : 0);
      if (pAmt > 0) {
        writeText(finRow(`${pi + 1}th Amount:`, pAmt));
      }
    }
  }
  writeText(divider);
  writeText(finRow('Remaining:', remaining));
  if (remaining === 0) {
    writeText(center('*** PAID IN FULL ***\n'));
  }

  // Display Customer's Entered UPI UTR Reference if present (For website orders)
  const utrNum = order.claimed_upi_ref || order.claimedUpiRef || order.utr || order.claimed_utr || (order.notes && order.notes.includes('UPI Ref:') ? order.notes.split('UPI Ref:')[1].replace(')', '').trim() : null);
  if (utrNum) {
    writeText(divider);
    writeText(row('UPI Ref / UTR:', utrNum));
  }

  // 12. Dashed line
  writeText(divider);

  // Special website prescription preferences
  if (order.prescription_pref === 'zero-power') {
    writeText(center('ZERO-POWER (PLANO) LENSES'));
    writeText(center('Blue-Cut Anti-Glare'));
    writeText(divider);
  } else if (order.prescription_pref === 'call-optometrist') {
    writeText(center('OPTOMETRIST CALL REQUIRED'));
    if (order.customer_phone) writeText(center(String(order.customer_phone)));
    writeText(divider);
  }

  // 13. Prescriptions Block (Loop over ALL attached prescriptions)
  let allRxList = [];
  if (Array.isArray(order.prescriptions) && order.prescriptions.length > 0) {
    allRxList = order.prescriptions.filter(Boolean);
  } else if (typeof order.prescriptions === 'string' && order.prescriptions.trim().startsWith('[')) {
    try {
      const p = JSON.parse(order.prescriptions);
      if (Array.isArray(p) && p.length > 0) allRxList = p;
    } catch (_) {}
  } else if (order.prescriptions_json) {
    try {
      const p = JSON.parse(order.prescriptions_json);
      if (Array.isArray(p) && p.length > 0) allRxList = p;
    } catch (_) {}
  }
  if (allRxList.length === 0) {
    const rawItems = Array.isArray(order.items) ? order.items : [];
    for (const it of rawItems) {
      if (it) {
        const itemRx = it.prescription || it.rx;
        if (itemRx) {
          if (typeof itemRx === 'string' && itemRx.trim().startsWith('{')) {
            try { allRxList.push(JSON.parse(itemRx)); } catch (_) { allRxList.push(itemRx); }
          } else {
            allRxList.push(itemRx);
          }
        }
      }
    }
  }
  if (allRxList.length === 0) {
    const fallbackRx = order.prescription || order.client_prescription || order.newPrescription;
    if (fallbackRx) {
      if (typeof fallbackRx === 'string' && fallbackRx.trim().startsWith('{')) {
        try { allRxList.push(JSON.parse(fallbackRx)); } catch (_) { allRxList.push(fallbackRx); }
      } else {
        allRxList.push(fallbackRx);
      }
    }
  }

  // Robust fallback: Check if order object itself has diopter fields (od_sph, os_sph, etc.)
  if (allRxList.length === 0 && (order.od_sph != null || order.os_sph != null || order.odSph != null || order.osSph != null || order.prescription_id != null)) {
    allRxList.push({
      prescription_number: order.prescription_number || order.prescription_id || 'RX-ATTACHED',
      od_sph: order.od_sph || order.odSph,
      od_cyl: order.od_cyl || order.odCyl,
      od_axis: order.od_axis != null ? order.od_axis : order.odAxis,
      os_sph: order.os_sph || order.osSph,
      os_cyl: order.os_cyl || order.osCyl,
      os_axis: order.os_axis != null ? order.os_axis : order.osAxis,
      addition: order.addition || order.add,
      ipd_distance: order.ipd_distance || order.pd
    });
  }

  allRxList = allRxList.filter(rx => {
    if (!rx) return false;
    return rx.od_sph != null || rx.odSph != null || rx.os_sph != null || rx.osSph != null || rx.addition != null || rx.add != null || rx.od_cyl != null || rx.odCyl != null || rx.prescription_number;
  });

  if (allRxList.length > 0) {
    allRxList.forEach((rx, idx) => {
      const getRxVal = (keys) => {
        for (const k of keys) {
          if (rx && rx[k] !== undefined && rx[k] !== null && String(rx[k]).trim() !== '' && String(rx[k]).trim() !== '---') return rx[k];
          if (order && order[k] !== undefined && order[k] !== null && String(order[k]).trim() !== '' && String(order[k]).trim() !== '---') return order[k];
        }
        return null;
      };

      const rxNo = getRxVal(['prescription_number', 'prescriptionNumber', 'prescription_id', 'id']) || (order.prescription_number || (idx + 1));
      const odSph = getRxVal(['od_sph', 'odSph']);
      const odCyl = getRxVal(['od_cyl', 'odCyl']);
      const odAxis = getRxVal(['od_axis', 'odAxis']);
      const osSph = getRxVal(['os_sph', 'osSph']);
      const osCyl = getRxVal(['os_cyl', 'osCyl']);
      const osAxis = getRxVal(['os_axis', 'osAxis']);
      const addition = getRxVal(['addition', 'add']);

      // Prescription block without date per user specification
      writeText(`RX# ${rxNo}\n`);
      writeText(' '.repeat(11) + 'SPH'.padStart(7) + 'CYL'.padStart(7) + 'AXIS'.padStart(7) + '\n');
      writeText('OD Right'.padEnd(11) + fmtDio(odSph).padStart(7) + fmtDio(odCyl).padStart(7) + fmtAx(odAxis).padStart(7) + '\n');
      writeText('OS Left'.padEnd(11) + fmtDio(osSph).padStart(7) + fmtDio(osCyl).padStart(7) + fmtAx(osAxis).padStart(7) + '\n');
      if (addition && addition !== '--' && addition !== '---') {
        writeText('Addition'.padEnd(11) + fmtDio(addition).padStart(7) + '\n');
      }
      writeText(divider);
    });
  }

  // 14. "Thanks for Shopping" (centered)
  writeBytes([0x1B, 0x61, 0x01]); // Center
  writeText('Thanks for Shopping\n\n');

  // 15. Centered UPI Payment QR Code
  if (paymentQrRasterBuffer && paymentQrRasterBuffer.length > 0) {
    writeBytes(paymentQrRasterBuffer);
  }

  // 16. Centered UPI ID directly underneath QR
  const upiId = (config && (config.storeUpiId || config.upiId)) || (typeof UPI_ID !== 'undefined' ? UPI_ID : '9182341567@mairtel');
  writeText('\n' + upiId + '\n\n\n');

  // 17. Clean tear feed & paper cut
  writeBytes([0x1D, 0x56, 0x41, 0x03]); // Full cut

  return Buffer.concat(chunks);
}

// ── LIVE PRINT CONTROLLER (Zero Backlog / Instant Hardware Execution) ─────────
async function printLiveOrder(order, source = 'Live') {
  if (!order) return { success: false, error: 'No order provided' };
  const orderRef = String(order.order_number || order.order_ref || order.id || 'ORDER').trim();

  // Deduplicate live orders across sessions (allow explicit manual reprint or staff approval)
  const isDuplicate = source !== 'reprint' && source !== 'staff_approved' && (
    printedOrdersSet.has(orderRef) ||
    (order.id && printedOrdersSet.has(String(order.id))) ||
    (order.order_number && printedOrdersSet.has(String(order.order_number))) ||
    (order.order_ref && printedOrdersSet.has(String(order.order_ref)))
  );

  if (isDuplicate) {
    console.log(`[Live Print] Order #${orderRef} was already printed. Skipping duplicate.`);
    return { success: true, alreadyPrinted: true };
  }

  // ── STRICT GATEWAY: Website orders MUST NEVER auto-print! ──────────────────
  // Website orders print ONLY on explicit staff approval in Admin Dashboard!
  const isWebsite = isWebsiteOrder(order);

  if (isWebsite) {
    const isExplicitStaffPrint = source === 'staff_approved' || source === 'reprint' || source === 'manual';
    if (!isExplicitStaffPrint) {
      console.log(`[Live Print] ⏸️ BLOCKED: Website order #${orderRef} (${source}) held. Website orders print ONLY on explicit staff approval in Admin Dashboard.`);
      return { success: false, held: true, error: 'Website order held pending staff approval' };
    }
  }

  console.log(`[Live Print] 🖨️ Printing Order #${orderRef} (${source})...`);
  try {
    const binary = format25InchEscPosReceipt(order);
    const result = await spoolBytesToPrinter(binary, `Bill-${orderRef}`);
    if (result.success) {
      printedOrdersSet.add(orderRef);
      if (order.id) printedOrdersSet.add(String(order.id));
      if (order.order_number) printedOrdersSet.add(String(order.order_number));
      if (order.order_ref) printedOrdersSet.add(String(order.order_ref));
      savePrintedState();
      console.log(`[Live Print] ✅ SUCCESS: Bill #${orderRef} printed to '${config.printerName}'!`);
      return { success: true, orderNumber: orderRef };
    } else {
      console.error(`[Live Print] ❌ Print spool failed for #${orderRef}:`, result.error);
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.error(`[Live Print] Error formatting/printing #${orderRef}:`, err.message);
    return { success: false, error: err.message };
  }
}

async function printLiveSticker(item, source = 'Sticker') {
  if (!item) return { success: false, error: 'No item provided' };
  const sku = (item.sku || item.product_sku || item.name || 'FRAME').toUpperCase();
  console.log(`[Live Sticker] 🏷️ Printing QR Sticker for ${sku} (${source})...`);
  try {
    const binary = await format25InchEscPosQrSticker(item);
    const result = await spoolBytesToPrinter(binary, `Sticker-${sku}`);
    if (result.success) {
      console.log(`[Live Sticker] ✅ SUCCESS: Sticker ${sku} printed to '${config.printerName}'!`);
      return { success: true, sku };
    } else {
      console.error(`[Live Sticker] ❌ Spool failed for ${sku}:`, result.error);
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.error(`[Live Sticker] Error formatting sticker for ${sku}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ── Cloud Queue Poller (Captures Stickers & Bills from Any Remote PC / Phone) ──
let isPollingQueue = false;
async function pollCloudPrintQueue() {
  if (isPollingQueue) return;
  if (!config.supabaseUrl || !config.supabaseAnonKey) return;
  isPollingQueue = true;

  try {
    const res = await fetch(`${config.supabaseUrl}/rest/v1/customers?client_code=eq.SYS-PRINT-QUEUE&select=notes`, {
      headers: {
        'apikey': config.supabaseAnonKey,
        'Authorization': `Bearer ${config.supabaseAnonKey}`
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0] && data[0].notes) {
        let parsed = null;
        try { parsed = JSON.parse(data[0].notes); } catch (_) {}
        const jobs = Array.isArray(parsed?.jobs) ? parsed.jobs : [];

        for (const job of jobs) {
          if (!job || !job.id) continue;
          const jobIdStr = String(job.id);
          if (processedJobIds.has(jobIdStr)) continue;

          // Only process jobs created within the last 60 minutes
          const jobTime = new Date(job.created_at || Date.now()).getTime();
          if (Date.now() - jobTime > 60 * 60 * 1000) {
            processedJobIds.add(jobIdStr);
            continue;
          }

          if (job.type === 'qr_sticker') {
            const rawItems = Array.isArray(job.items) ? job.items : [job.items || job];
            for (const it of rawItems) {
              const copies = parseInt(it.copies || job.copies || 1, 10);
              for (let c = 0; c < copies; c++) {
                await printLiveSticker(it, 'cloud_queue');
              }
            }
            processedJobIds.add(jobIdStr);
            savePrintedState();
          } else if (job.type === 'receipt') {
            const order = job.order || (job.items && job.items[0] && job.items[0].order) || null;
            if (!order || typeof order !== 'object' || (!order.order_number && !order.order_ref && !order.items)) {
              console.log(`[Cloud Queue] Discarding malformed or invalid receipt job #${jobIdStr}`);
              processedJobIds.add(jobIdStr);
              savePrintedState();
              continue;
            }

            const ref = String(order.order_number || order.order_ref || order.id || '').trim();
            if (printedOrdersSet.has(ref) || (order.id && printedOrdersSet.has(String(order.id))) || (order.order_number && printedOrdersSet.has(String(order.order_number))) || (order.order_ref && printedOrdersSet.has(String(order.order_ref)))) {
              console.log(`[Cloud Queue] Order #${ref} already printed. Skipping duplicate.`);
              processedJobIds.add(jobIdStr);
              savePrintedState();
              continue;
            }

            const isWebQueue = isWebsiteOrder(order);

            // Website orders in cloud queue print only if approved or explicitly sent by staff
            if (isWebQueue && !job.approved && job.source !== 'staff_approved' && job.source !== 'reprint') {
              console.log(`[Cloud Queue] Skipping unapproved website order #${ref}`);
              continue;
            }

            const queueSource = (job.source === 'staff_approved' || job.approved) ? 'staff_approved' : 'cloud_queue';
            const resPrint = await printLiveOrder(order, queueSource);
            if (resPrint.success) {
              processedJobIds.add(jobIdStr);
              savePrintedState();
            }
          }
        }
      }
    }
  } catch (_) {
  } finally {
    isPollingQueue = false;
  }
}

// ── Poller for Recent Unprinted Orders (Zero Clock-Skew Skips) ────────────────
let isCheckingRecent = false;
async function pollRecentUnprintedOrders() {
  if (isCheckingRecent) return;
  if (!config.supabaseUrl || !config.supabaseAnonKey) return;
  isCheckingRecent = true;

  try {
    const sinceIso = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const url = `${config.supabaseUrl}/rest/v1/orders?status=eq.confirmed&created_at=gte.${encodeURIComponent(sinceIso)}&select=*&order=created_at.desc&limit=10`;
    const res = await fetch(url, {
      headers: {
        'apikey': config.supabaseAnonKey,
        'Authorization': `Bearer ${config.supabaseAnonKey}`
      }
    });

    if (res.ok) {
      const orders = await res.json();
      if (Array.isArray(orders)) {
        for (const order of orders.reverse()) {
          const ref = String(order.order_number || order.order_ref || order.id || '').trim();
          if (!ref) continue;
          if (printedOrdersSet.has(ref) || (order.id && printedOrdersSet.has(String(order.id))) || (order.order_number && printedOrdersSet.has(String(order.order_number))) || (order.order_ref && printedOrdersSet.has(String(order.order_ref)))) continue;

          const isWebsite = isWebsiteOrder(order);

          // Strict isolation: Website orders NEVER print via background recent poller!
          // They print ONLY upon owner clicking Approve UPI in Admin Dashboard.
          if (isWebsite) {
            continue;
          }

          console.log(`[Order Sync] Found unprinted order #${ref}. Printing now...`);
          await printLiveOrder(order, 'cloud_sync');
        }
      }
    }
  } catch (_) {
  } finally {
    isCheckingRecent = false;
  }
}

// ── Hot-Update Engine (Protected Local Daemon) ──────────────────────────────
let isCheckingUpdate = false;
async function checkDaemonUpdates() {
  // Automatic file overwrite disabled to protect custom in-store bill formatting
  return;
}

// ── Supabase Realtime Live WebSocket ─────────────────────────────────────────
let realtimeWs = null;
let realtimeReconnectTimer = null;
let realtimeConnected = false;

function connectRealtimeWebSocket() {
  if (typeof WebSocket === 'undefined') {
    try { global.WebSocket = require('ws'); } catch (_) {}
  }
  if (typeof WebSocket === 'undefined') return;
  if (!config.supabaseUrl || !config.supabaseAnonKey) return;

  try {
    const urlObj = new URL(config.supabaseUrl);
    const wsUrl = `wss://${urlObj.host}/realtime/v1/websocket?apikey=${config.supabaseAnonKey}&vsn=1.0.0`;

    realtimeWs = new WebSocket(wsUrl);

    realtimeWs.onopen = () => {
      realtimeConnected = true;
      console.log('[Realtime] ⚡ Connected to Supabase Live Channel.');

      // Subscribe to the orders table for live events
      realtimeWs.send(JSON.stringify({
        topic: 'realtime:public:orders',
        event: 'phx_join',
        payload: {},
        ref: 'live-ord-1'
      }));
    };

    realtimeWs.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.event === 'postgres_changes') {
          const payload = msg.payload || {};
          const record = payload.data?.record || payload.record;
          const eventType = payload.data?.type || payload.type;

          if (!record) return;

          // 1. DEDUPLICATION CHECK
          const orderRef = String(record.order_number || record.order_ref || record.id || '').trim();
          if (printedOrdersSet.has(orderRef) || (record.id && printedOrdersSet.has(String(record.id)))) {
            return;
          }

          // 2. WEBSITE ORDERS: Completely held on Realtime.
          // Website orders print ONLY when cashier explicitly clicks "✓ Approve" in Admin Dashboard!
          const isWebsite = isWebsiteOrder(record);

          if (isWebsite) {
            console.log(`[Realtime] Website order #${orderRef} (${eventType}) received. Held for staff approval.`);
            return;
          }

          // 3. PRINT LIVE VERIFIED / CONFIRMED / IN-STORE ORDERS IMMEDIATELY!
          printLiveOrder(record, `realtime_${String(eventType).toLowerCase()}`);
        }
      } catch (_) {}
    };

    realtimeWs.onerror = () => {
      realtimeConnected = false;
    };

    realtimeWs.onclose = () => {
      realtimeConnected = false;
      clearTimeout(realtimeReconnectTimer);
      realtimeReconnectTimer = setTimeout(connectRealtimeWebSocket, 5000);
    };

    // Heartbeat ping every 25 seconds
    setInterval(() => {
      if (realtimeWs && realtimeWs.readyState === WebSocket.OPEN) {
        realtimeWs.send(JSON.stringify({
          topic: 'phoenix',
          event: 'heartbeat',
          payload: {},
          ref: 'hb'
        }));
      }
    }, 25000);
  } catch (_) {
    realtimeConnected = false;
  }
}

// ── HTTP API Server on Port 5001 ──────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:5001'}`);
  const pathname = parsedUrl.pathname;

  // 1. Instant Bill Print: POST /api/print or POST /api/printer/orders
  if (req.method === 'POST' && (pathname === '/api/print' || pathname === '/api/printer/orders')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const order = payload.order || payload;
        const manualReprint = Boolean(payload.manualReprint);
        const source = payload.source || (manualReprint ? 'reprint' : 'staff_approved');
        const result = await printLiveOrder(order, source);
        res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 2. Optical Temple QR Sticker: POST /api/printer/print-qr-sticker or POST /api/print-sticker
  if (req.method === 'POST' && (pathname === '/api/printer/print-qr-sticker' || pathname === '/api/print-sticker')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const rawItems = Array.isArray(payload.items) ? payload.items : [payload.item || payload];
        const buffers = [];
        for (const it of rawItems) {
          const copies = parseInt(it.copies || payload.copies || 1, 10);
          for (let c = 0; c < copies; c++) {
            const buf = await format25InchEscPosQrSticker(it);
            buffers.push(buf);
          }
        }
        const combined = Buffer.concat(buffers);
        const result = await spoolBytesToPrinter(combined, 'Frame QR Stickers');
        res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: result.success,
          count: rawItems.length,
          message: result.success ? `Printed ${rawItems.length} sticker(s) to ${config.printerName}` : result.error
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 3. Test Slip: POST /api/test-print
  if (req.method === 'POST' && (pathname === '/api/test-print' || pathname === '/api/printer/test')) {
    const testSlip = Buffer.concat([
      Buffer.from([0x1B, 0x40, 0x1B, 0x61, 0x01]), // ESC @, Center
      Buffer.from([0x1B, 0x45, 0x01]), // Bold ON
      Buffer.from('NOOR OPTICS - PRINTER READY\n', 'ascii'),
      Buffer.from([0x1B, 0x45, 0x00]), // Bold OFF
      Buffer.from('--------------------------------\n', 'ascii'),
      Buffer.from(`Printer: ${config.printerName}\n`, 'ascii'),
      Buffer.from('Status:  LIVE PRINTING ACTIVE\n', 'ascii'),
      Buffer.from(`Time:    ${new Date().toLocaleString('en-IN')}\n`, 'ascii'),
      Buffer.from('--------------------------------\n', 'ascii'),
      Buffer.from('Thermal head communication OK!\n\n\n\n', 'ascii'),
      Buffer.from([0x1D, 0x56, 0x41, 0x03]) // Cut
    ]);
    const result = await spoolBytesToPrinter(testSlip, 'Test Receipt');
    res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: result.success,
      message: result.success ? `Test receipt printed to ${config.printerName}!` : result.error
    }));
    return;
  }

  // 4. Daemon Status Badge: GET /api/status
  if (req.method === 'GET' && pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      running: true,
      version: DAEMON_VERSION,
      printer: config.printerName,
      printerConnected: true,
      mode: 'LIVE_AUTONOMOUS',
      totalPrinted: printedOrdersSet.size,
      totalJobs: processedJobIds.size,
      realtimeConnected: realtimeConnected,
      uptimeSeconds: Math.floor((Date.now() - daemonStartTime) / 1000)
    }));
    return;
  }

  // 5. Heartbeat Wakeup: POST /api/wakeup
  if (req.method === 'POST' && pathname === '/api/wakeup') {
    pollRecentUnprintedOrders().catch(() => {});
    pollCloudPrintQueue().catch(() => {});
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Daemon is active and queues checked' }));
    return;
  }

  // 6. Immediate Auto-Update Check / Hot Deploy: POST /api/daemon/update
  if (req.method === 'POST' && (pathname === '/api/daemon/update' || pathname === '/api/daemon/check-update')) {
    checkDaemonUpdates().then(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Update check complete' }));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    });
    return;
  }

  // 7. Explicit Order Reprint: POST /api/printer/orders/:id/reprint
  if (req.method === 'POST' && pathname.includes('/reprint')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const order = payload.order || payload;
        const result = await printLiveOrder(order, 'reprint');
        res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

// ── Startup & Watchdog ────────────────────────────────────────────────────────
if (require.main === module) {
  server.listen(config.port, '0.0.0.0', () => {
    console.log('\n============================================================');
    console.log(`      NOOR OPTICS - INSTANT LIVE POS PRINT DAEMON v${DAEMON_VERSION}`);
    console.log('============================================================');
    console.log(`  🖨️  Printer:       ${config.printerName}`);
    console.log(`  🌐 Local API:     http://127.0.0.1:${config.port}`);
    console.log('  ⚡ Cloud Live:    Supabase Realtime WebSocket');
    console.log('  📦 Cloud Queue:   Active (Polling SYS-PRINT-QUEUE every 2.5s)');
    console.log('  🎯 Mode:          LIVE DUAL-CHANNEL (Direct + Cloud Spooler)');
    console.log('============================================================');
    console.log('[LIVE] Ready! Listening for incoming customer orders & item QR stickers...\n');

    connectRealtimeWebSocket();

    // 1. Initial check for recent unprinted orders (recovers any order placed during restart)
    pollRecentUnprintedOrders();
    setInterval(pollRecentUnprintedOrders, 10000);

    // 2. Continuous cloud queue listener for remote cashier item QRs and bills
    pollCloudPrintQueue();
    setInterval(pollCloudPrintQueue, 2500);

    // 3. Periodic background auto-update check (every 30 minutes)
    setTimeout(checkDaemonUpdates, 15000);
    setInterval(checkDaemonUpdates, 30 * 60 * 1000);
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Daemon] Port ${config.port} is already in use by another instance. Exiting to prevent conflict.`);
      process.exit(0);
    } else {
      console.error('[Daemon] Server error:', err.message);
    }
  });

  process.on('uncaughtException', err => {
    console.error('[Daemon Crash Guard] Uncaught exception:', err?.message || err);
  });

  process.on('unhandledRejection', reason => {
    console.error('[Daemon Crash Guard] Unhandled rejection:', reason);
  });
}

// Export functions for test suites
module.exports = {
  format25InchEscPosReceipt,
  format25InchEscPosQrSticker,
  spoolBytesToPrinter,
  FONT_5X7,
  drawBitmapText
};
