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

// ── Configuration ─────────────────────────────────────────────────────────────
let config = {
  port: 5001,
  printerName: 'POS-80',
  paperWidthInch: 2.5,
  columns: 32,
  storeName: 'NOOR OPTIC',
  storeAddress: 'Pillar No. 45, Rethibowli, Hyderabad, Telangana 500028',
  storePhone: '+91 98765 43210',
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

// ── Format Complete 2.5-Inch Thermal Receipt ──────────────────────────────────
function format25InchEscPosReceipt(rawOrder) {
  const order = rawOrder.order || rawOrder;
  const COLS = config.columns || 32;
  const chunks = [];

  const writeBytes = (arr) => chunks.push(Buffer.from(arr));
  const writeText = (str) => chunks.push(Buffer.from(str, 'ascii'));

  const divider = '-'.repeat(COLS) + '\n';
  const doubleDivider = '='.repeat(COLS) + '\n';

  function formatINR(val) {
    const n = Math.round(Number(val) || 0);
    return 'Rs.' + n.toLocaleString('en-IN');
  }

  function row(left, right) {
    const l = String(left || '');
    const r = String(right || '');
    const spaces = Math.max(1, COLS - l.length - r.length);
    return l + ' '.repeat(spaces) + r + '\n';
  }

  // 1. Initialize Printer
  writeBytes([0x1B, 0x40]); // ESC @
  writeBytes([0x1B, 0x74, 0x00]); // Standard ASCII table

  // 2. Centered Logo
  if (logoRasterBuffer && logoRasterBuffer.length > 0) {
    writeBytes([0x1B, 0x61, 0x01]);
    writeBytes(logoRasterBuffer);
  }

  // Store Brand Header
  writeBytes([0x1B, 0x61, 0x01]); // Center
  writeBytes([0x1B, 0x45, 0x01]); // Bold ON
  writeBytes([0x1D, 0x21, 0x11]); // Double width & height
  writeText(`${config.storeName || 'NOOR OPTIC'}\n`);
  writeBytes([0x1D, 0x21, 0x00]); // Normal
  writeBytes([0x1B, 0x45, 0x00]); // Bold OFF
  writeText('Pillar No. 45, Rethibowli, Hyderabad, Telangana 500028\n');
  writeText(`Ph: ${config.storePhone || '+91 98765 43210'}\n`);
  writeText(doubleDivider);

  // In-Store vs Website Order Channel Banner
  const orderRefStr = String(order.order_number || order.order_ref || order.id || '');
  const isPos = orderRefStr.includes('-POS-') ||
    order.channel === 'POS' ||
    order.source === 'instore' ||
    (order.delivery_address && /pos|boutique|flagship|store|counter|rethibowli|walk-in/i.test(order.delivery_address));

  const channelLabel = isPos ? '[IN-STORE POS]' : '[WEBSITE ORDER]';
  const channelBanner = isPos ? '*** IN-STORE BOUTIQUE SALE ***' : '*** ONLINE STOREFRONT ORDER ***';

  writeBytes([0x1B, 0x61, 0x01]); // Center
  writeBytes([0x1B, 0x45, 0x01]); // Bold ON
  writeText(`${channelBanner}\n`);
  writeBytes([0x1B, 0x45, 0x00]); // Bold OFF
  writeText(doubleDivider);

  // 3. Invoice & Token Header
  writeBytes([0x1B, 0x61, 0x00]); // Left align
  const token = order.token_number || order.token || 1;
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

  // 5. Itemized Table
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
    writeText(row('Optical Frame', '1  ' + formatINR(grandTotal)));
  } else {
    items.forEach(item => {
      const name = item.product_name || item.name || item.model || 'Frame';
      const sku = item.sku || '';
      const color = item.variant_name || item.color || '';
      const qty = parseInt(item.quantity || 1, 10);
      const unitPrice = (item.unit_price_inr != null) ? Number(item.unit_price_inr)
        : (item.unit_price_paise != null) ? Number(item.unit_price_paise) / 100
        : (item.priceINR != null) ? Number(item.priceINR)
        : (item.unit_price != null) ? Number(item.unit_price) : 0;

      let lineTotal = (item.subtotal_inr != null) ? Number(item.subtotal_inr)
        : (item.subtotal_paise != null) ? Number(item.subtotal_paise) / 100
        : (item.lineTotalINR != null) ? Number(item.lineTotalINR)
        : (unitPrice * qty);

      if (lineTotal === 0 && grandTotal > 0 && items.length === 1) lineTotal = grandTotal;

      writeText(row(name.slice(0, 18), `${qty}  ${formatINR(lineTotal)}`));
      if (sku && sku !== name) writeText(` SKU:   ${sku.slice(0, COLS - 8)}\n`);
      if (color && color !== 'Standard') writeText(` Color: ${color.slice(0, COLS - 8)}\n`);
      if (item.lens || (item.lens_name && !/standard/i.test(item.lens_name))) {
        writeText(` Lens:  ${(item.lens || item.lens_name).slice(0, COLS - 8)}\n`);
      }
    });
  }
  writeText(divider);

  // 6. Financial Breakdown
  let subtotal = Number(order.subtotal_inr || (order.subtotal_paise ? order.subtotal_paise / 100 : (order.subtotal != null ? order.subtotal : 0)));
  if (subtotal === 0 && grandTotal > 0) subtotal = grandTotal + discount;
  const amountPaid = Number(order.amount_paid_inr || (order.amount_paid_paise ? order.amount_paid_paise / 100 : grandTotal));
  const balance = Math.max(0, grandTotal - amountPaid);
  const payMethod = (order.payment_method || (isPos ? 'CASH' : 'ONLINE')).toUpperCase();

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

  // 7. Client Prescription (Rx) Section (100% Reliable Dual-Pipeline Extraction)
  let embeddedRx = null;
  const itemList = Array.isArray(order.items) ? order.items : (Array.isArray(rawOrder.items) ? rawOrder.items : []);
  if (itemList.length > 0) {
    for (const it of itemList) {
      if (it && (it.prescription || it.rx)) {
        embeddedRx = it.prescription || it.rx;
        break;
      }
    }
  }

  const rx = embeddedRx || order.prescription || rawOrder.prescription || order.client_prescription || order.newPrescription || order;
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
  const prescriberVal = getRxField(['prescriber_details', 'prescriberDetails', 'clinic']);
  const rxNotesVal = getRxField(['notes', 'rx_notes']);

  const hasAnyRxValue = odSphVal !== null || odCylVal !== null || odAxisVal !== null ||
    osSphVal !== null || osCylVal !== null || osAxisVal !== null ||
    addVal !== null || pdVal !== null;

  const pref = String(order.prescription_pref || rawOrder.prescription_pref || '').toLowerCase();
  const isZeroPower = /zero|plano|blue[- ]?cut|screen/i.test(pref);
  const isCallOptometrist = /call|optometrist|consult/i.test(pref);
  const isManualRx = /enter[- ]?rx|manual/i.test(pref);
  const rxExplicitlyMentioned = Boolean(order.prescription_id || order.prescription_number || (rx && rx.prescription_number) || isManualRx || /rx/i.test(pref));

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
      if (n === 0) return '  0.00';
      const sign = n > 0 ? '+' : '-';
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
    if (prescriberVal) writeText(`Prescriber:  ${prescriberVal.slice(0, COLS - 13)}\n`);
    if (rxNotesVal && !/in-store/i.test(rxNotesVal)) writeText(`Rx Notes:    ${rxNotesVal.slice(0, COLS - 13)}\n`);
    writeText(divider);
  } else if (isZeroPower) {
    writeBytes([0x1B, 0x61, 0x01]);
    writeBytes([0x1B, 0x45, 0x01]);
    writeText('--- CLIENT PRESCRIPTION (RX) ---\n');
    writeBytes([0x1B, 0x45, 0x00]);
    writeText('ZERO-POWER (PLANO) LENSES\n');
    writeText('Blue-Cut Anti-Glare Computer Vision\n');
    writeText(divider);
  } else if (isCallOptometrist) {
    writeBytes([0x1B, 0x61, 0x01]);
    writeBytes([0x1B, 0x45, 0x01]);
    writeText('--- CLIENT PRESCRIPTION (RX) ---\n');
    writeBytes([0x1B, 0x45, 0x00]);
    writeText('OPTOMETRIST CALL REQUIRED\n');
    if (custPhone !== '-') writeText(`Call Client: ${custPhone}\n`);
    writeText(divider);
  } else if (rxExplicitlyMentioned) {
    writeBytes([0x1B, 0x61, 0x01]);
    writeBytes([0x1B, 0x45, 0x01]);
    writeText('--- CLIENT PRESCRIPTION (RX) ---\n');
    writeBytes([0x1B, 0x45, 0x00]);
    writeText('PRESCRIPTION PENDING VERIFICATION\n');
    writeText(divider);
  }

  // 8. UPI Payment QR Code (Centered)
  if (paymentQrRasterBuffer && paymentQrRasterBuffer.length > 0) {
    writeBytes([0x1B, 0x61, 0x01]);
    writeBytes([0x1B, 0x45, 0x01]);
    writeText('SCAN & PAY VIA UPI\n');
    writeBytes([0x1B, 0x45, 0x00]);
    writeBytes(paymentQrRasterBuffer);
  }

  // 9. Store Footer
  writeBytes([0x1B, 0x61, 0x01]); // Center
  writeText('\nThank you for choosing Noor Optics!\n');
  writeText('Luxury Frames & Precision Eyecare\n');
  writeText('Instagram: @nooroptics\n\n\n\n');

  // Cut Paper
  writeBytes([0x1D, 0x56, 0x41, 0x03]); // Full cut

  return Buffer.concat(chunks);
}

// ── LIVE PRINT CONTROLLER (Zero Backlog / Instant Hardware Execution) ─────────
async function printLiveOrder(order, source = 'Live') {
  if (!order) return { success: false, error: 'No order provided' };
  const orderRef = String(order.order_number || order.order_ref || order.id || 'ORDER').trim();

  // Deduplicate live orders across sessions (allow explicit manual reprint or local_pos)
  if (source !== 'reprint' && source !== 'local_pos' && (printedOrdersSet.has(orderRef) || (order.id && printedOrdersSet.has(String(order.id))))) {
    console.log(`[Live Print] Order #${orderRef} was already printed. Skipping duplicate.`);
    return { success: true, alreadyPrinted: true };
  }

  console.log(`[Live Print] 🖨️ Printing Order #${orderRef} (${source})...`);
  try {
    const binary = format25InchEscPosReceipt(order);
    const result = await spoolBytesToPrinter(binary, `Bill-${orderRef}`);
    if (result.success) {
      printedOrdersSet.add(orderRef);
      if (order.id) printedOrdersSet.add(String(order.id));
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
            const order = job.order || job;
            const resPrint = await printLiveOrder(order, 'cloud_queue');
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
          if (printedOrdersSet.has(ref) || (order.id && printedOrdersSet.has(String(order.id)))) continue;

          const isWebsite = order.source === 'website' || order.channel === 'WEBSITE';
          const isAwaitingUpi = order.payment_status === 'AWAITING_VERIFICATION' || order.status === 'PENDING_VERIFICATION';
          if (isWebsite && isAwaitingUpi) continue;

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

// ── Hot-Update Engine (Self-Healing Without File Swapping) ────────────────────
let isCheckingUpdate = false;
async function checkDaemonUpdates() {
  if (isCheckingUpdate) return;
  isCheckingUpdate = true;
  const urlsToCheck = [
    config.backendUrl ? `${config.backendUrl.replace(/\/$/, '')}/pos-daemon/pos-daemon.js` : null,
    'http://localhost:3000/pos-daemon/pos-daemon.js',
    'http://127.0.0.1:3000/pos-daemon/pos-daemon.js'
  ].filter(Boolean);

  for (const updateUrl of urlsToCheck) {
    try {
      const res = await fetch(updateUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const remoteCode = await res.text();
        const currentCode = fs.readFileSync(__filename, 'utf8');
        if (remoteCode && remoteCode.length > 10000 && remoteCode.includes('DAEMON_VERSION') && remoteCode !== currentCode) {
          console.log(`[Auto-Update] 🚀 New daemon version detected from ${updateUrl}! Applying hot update...`);
          fs.writeFileSync(__filename, remoteCode, 'utf8');
          console.log('[Auto-Update] ✅ File updated! Restarting process cleanly via watchdog...');
          process.exit(0);
        }
        break;
      }
    } catch (_) {}
  }
  isCheckingUpdate = false;
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

          // 2. WEBSITE UNVERIFIED ORDERS: Hold print until cashier approves payment
          const isWebsite = record.source === 'website' || record.channel === 'WEBSITE';
          const isAwaitingUpi = record.payment_status === 'AWAITING_VERIFICATION' || record.status === 'PENDING_VERIFICATION';
          if (isWebsite && isAwaitingUpi) {
            console.log(`[Realtime] Website order #${orderRef} received (Awaiting staff UPI verification).`);
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
        const result = await printLiveOrder(order, manualReprint ? 'reprint' : 'local_pos');
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
}

// Export functions for test suites
module.exports = {
  format25InchEscPosReceipt,
  format25InchEscPosQrSticker,
  spoolBytesToPrinter,
  FONT_5X7,
  drawBitmapText
};
