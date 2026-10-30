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
  storeName: 'NOOR OPTICS',
  storeTagline: 'Scandinavian Eyewear Boutique',
  storeAddress: 'Indiranagar 100ft Road, Bengaluru',
  storePhone: '+91 98765 43210',
  storeGstin: '29AAAAA0000A1Z5',
  orderFreshnessMinutes: 30,
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
      } catch (e) {}
      return posMatch;
    }
  } catch (e) {}
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
  } catch (e) {}
}

// ── Spool Raw Bytes via worker-printer.ps1 ────────────────────────────────────
function spoolBytesToPrinter(buffer, docName = 'Customer Bill') {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(LOGS_DIR, `spool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.bin`);
    fs.writeFileSync(tempFile, buffer);

    const cmd = `powershell.exe -ExecutionPolicy Bypass -NoProfile -File "${WORKER_SCRIPT}" -FilePath "${tempFile}" -PrinterName "${config.printerName}" -DocName "${docName}"`;
    exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
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

  // 1b. Print Noor Glasses Logo at Top of Bill
  if (logoRasterBuffer && logoRasterBuffer.length > 0) {
    writeBytes([0x1B, 0x61, 0x01]); // Center
    writeBytes(logoRasterBuffer);
    writeBytes([0x1B, 0x64, 0x01]); // Feed 1 line
  }

  // 2. Store Header (Centered, Bold, NO City, NO GSTIN)
  writeBytes([0x1B, 0x61, 0x01]); // Center
  writeBytes([0x1B, 0x45, 0x01]); // Bold ON
  writeBytes([0x1D, 0x21, 0x01]); // Double height
  writeText(`${config.storeName}\n`);
  writeBytes([0x1D, 0x21, 0x00]); // Normal size
  writeBytes([0x1B, 0x45, 0x00]); // Bold OFF
  writeText(`${config.storeTagline}\n`);
  const cleanAddress = (config.storeAddress || 'Indiranagar 100ft Road').replace(/,\s*Bengaluru/i, '').replace(/Bengaluru/i, '').trim();
  if (cleanAddress) writeText(`${cleanAddress}\n`);
  writeText(`Ph: ${config.storePhone}\n`);
  // GSTIN REMOVED as requested
  writeText(doubleDivider);

  // 3. Invoice & Token Header
  writeBytes([0x1B, 0x61, 0x00]); // Left align
  const token = order.token_number || order.token || 1;
  const channel = (order.channel || 'IN-STORE').toUpperCase();
  writeText(row(`TOKEN #${token}`, `[${channel}]`));
  writeText(row('Invoice:', order.order_number || order.order_ref || 'NOOR-INV'));
  const dateStr = order.created_at ? new Date(order.created_at).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  }) : new Date().toLocaleString('en-IN');
  writeText(row('Date:', dateStr));
  writeText(divider);

  // 4. Customer Information (NO CITY as requested)
  const custName = order.customer_name || 'Walk-in Client';
  const custPhone = order.customer_phone || '-';
  writeText(`Client: ${custName.slice(0, COLS - 8)}\n`);
  if (custPhone !== '-') writeText(`Phone:  ${custPhone}\n`);
  writeText(divider);

  // 5. Itemized Frame & Products Table
  writeText(row('ITEM / SPEC', 'QTY  AMOUNT'));
  writeText(divider);

  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length === 0) {
    writeText(row('Optical Frame', '1  ' + formatINR(order.total_payable_inr || order.grand_total || (order.total_payable_paise ? order.total_payable_paise / 100 : 0))));
  } else {
    items.forEach(item => {
      const name = item.product_name || item.name || item.model || 'Optical Frame';
      const qty = parseInt(item.quantity || 1, 10);
      const unitPrice = item.unit_price_inr ? item.unit_price_inr : (item.unit_price_paise ? item.unit_price_paise / 100 : (item.unitPrice || item.unit_price || 0));
      const lineTotal = item.subtotal_inr ? item.subtotal_inr : (item.subtotal_paise ? item.subtotal_paise / 100 : (item.subtotal || unitPrice * qty));

      writeText(row(name.slice(0, 18), `${qty}  ${formatINR(lineTotal)}`));
      if (item.variant_name || item.color) {
        writeText(` Color: ${(item.variant_name || item.color).slice(0, COLS - 9)}\n`);
      }
      if (item.lens || (item.lens_name && !/standard/i.test(item.lens_name))) {
        writeText(` Lens: ${(item.lens || item.lens_name).slice(0, COLS - 8)}\n`);
      }
    });
  }
  writeText(divider);

  // 6. Financial Breakdown (NO GST / NO GSTIN / NO TAX line as requested)
  const subtotal = order.subtotal_inr || (order.subtotal_paise ? order.subtotal_paise / 100 : order.subtotal || 0);
  const discount = order.discount_inr || (order.discount_paise ? order.discount_paise / 100 : order.discount || 0);
  const grandTotal = order.total_payable_inr || (order.total_payable_paise ? order.total_payable_paise / 100 : order.grand_total || subtotal);
  const amountPaid = order.amount_paid_inr || (order.amount_paid_paise ? order.amount_paid_paise / 100 : grandTotal);
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
  const odSphVal = rx.od_sph !== undefined && rx.od_sph !== null && rx.od_sph !== '' ? rx.od_sph : (rx.odSph !== undefined && rx.odSph !== null && rx.odSph !== '' ? rx.odSph : (order.od_sph || order.odSph));
  const osSphVal = rx.os_sph !== undefined && rx.os_sph !== null && rx.os_sph !== '' ? rx.os_sph : (rx.osSph !== undefined && rx.osSph !== null && rx.osSph !== '' ? rx.osSph : (order.os_sph || order.osSph));

  const hasRx = (odSphVal !== undefined && odSphVal !== null && odSphVal !== '') ||
                (osSphVal !== undefined && osSphVal !== null && osSphVal !== '') ||
                Boolean(rx.prescription_number || order.prescription_number || order.prescription_id) ||
                (order.prescription_pref && /rx/i.test(order.prescription_pref));

  if (hasRx) {
    writeBytes([0x1B, 0x61, 0x01]); // Center
    writeBytes([0x1B, 0x45, 0x01]); // Bold ON
    writeText('--- CLIENT PRESCRIPTION (RX) ---\n');
    writeBytes([0x1B, 0x45, 0x00]); // Bold OFF
    writeBytes([0x1B, 0x61, 0x00]); // Left

    function fmtRx(val) {
      if (val === undefined || val === null || val === '') return '  --- ';
      const n = Number(val);
      if (isNaN(n)) return String(val).padStart(6);
      const sign = n > 0 ? '+' : (n < 0 ? '-' : ' ');
      return sign + Math.abs(n).toFixed(2);
    }
    function fmtAx(val) {
      if (val === undefined || val === null || val === '') return '---';
      return String(val).padStart(3);
    }

    writeText('Eye    SPH    CYL   AXIS   ADD  \n');
    const odSph = fmtRx(odSphVal);
    const odCyl = fmtRx(rx.od_cyl !== undefined && rx.od_cyl !== null ? rx.od_cyl : (rx.odCyl !== undefined ? rx.odCyl : order.od_cyl));
    const odAx = fmtAx(rx.od_axis !== undefined && rx.od_axis !== null ? rx.od_axis : (rx.odAxis !== undefined ? rx.odAxis : order.od_axis));
    const add = fmtRx(rx.addition !== undefined && rx.addition !== null ? rx.addition : order.addition);
    writeText(`OD   ${odSph}  ${odCyl}   ${odAx}  ${add}\n`);

    const osSph = fmtRx(osSphVal);
    const osCyl = fmtRx(rx.os_cyl !== undefined && rx.os_cyl !== null ? rx.os_cyl : (rx.osCyl !== undefined ? rx.osCyl : order.os_cyl));
    const osAx = fmtAx(rx.os_axis !== undefined && rx.os_axis !== null ? rx.os_axis : (rx.osAxis !== undefined ? rx.osAxis : order.os_axis));
    writeText(`OS   ${osSph}  ${osCyl}   ${osAx}  ${add}\n`);

    const pdVal = rx.ipd_distance || rx.ipdDistance || rx.pd || order.ipd_distance || order.pd;
    if (pdVal) {
      writeText(`Distance PD: ${pdVal} mm\n`);
    }
    const docVal = rx.checked_by || rx.checkedBy || rx.rx_checked_by || order.rx_checked_by || order.checked_by;
    if (docVal) {
      writeText(`Optometrist: ${docVal}\n`);
    }
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

// ── 5x7 Font Table for Crisp Monochrome Raster Text ────────────────────────
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

function drawBitmapText(raster, widthBytes, text, startX, startY, scale = 1) {
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
            }
          }
        }
      }
    }
    curX += (5 + 1) * scale;
  }
}

// ── Format Optical Frame QR Sticker (Unified 384-Dot Raster Image) ───────────
async function format25InchEscPosQrSticker(item) {
  // 1. Check if client sent pre-computed 384-dot unified raster
  if (item.stickerRasterBase64) {
    try {
      const rasterBuf = Buffer.from(item.stickerRasterBase64, 'base64');
      if (rasterBuf && rasterBuf.length > 50) {
        return Buffer.concat([
          Buffer.from([0x1B, 0x40]), // ESC @ Reset
          rasterBuf,
          Buffer.from([0x1B, 0x64, 0x02]), // Feed 2 lines
          Buffer.from([0x1D, 0x56, 0x42, 0x00]) // Partial cut
        ]);
      }
    } catch (_) {}
  }

  // 2. Fallback: Build unified 384-dot monochrome ESC/POS raster directly
  let QRCode;
  try { QRCode = require('qrcode'); } catch (e) { QRCode = null; }
  const sku = (item.sku || 'NOOR-FRAME').toUpperCase();
  const name = (item.name || '').slice(0, 20);
  let price = item.price ? String(item.price).trim() : '';
  if (price.startsWith('₹')) price = 'Rs. ' + price.substring(1).trim();
  if (price && !price.toUpperCase().startsWith('RS') && !price.toUpperCase().startsWith('M.R.P')) {
    price = 'Rs. ' + price;
  }
  const qrUrl = `HTTPS://NOOROPTICS.VERCEL.APP/Q/${encodeURIComponent(sku)}`;

  const widthDots = 384;
  const widthBytes = 48; // 384 / 8 = 48 bytes per line
  let qrSize = 0;
  let qrMatrix = null;

  if (QRCode) {
    try {
      const qr = QRCode.create(qrUrl, { errorCorrectionLevel: 'M' });
      qrMatrix = qr;
      qrSize = qr.modules.size;
    } catch (e) {
      log(`QRCode generation note: ${e.message}`, 'WARN');
    }
  }

  const qrScale = 3;
  const qrQuiet = 2;
  const qrModules = (qrSize > 0) ? (qrSize + qrQuiet * 2) : 29;
  const qrPix = qrModules * qrScale; // e.g. 29 * 3 = 87 dots

  // Total height: QR (87) + SKU (16) + Name (14) + Price (16) + margins = 160 dots
  const totalHeight = qrPix + 70;
  const raster = Buffer.alloc(widthBytes * totalHeight, 0);

  // Center QR horizontally
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
          for (let dy = 0; dy < qrScale; dy++) {
            for (let dx = 0; dx < qrScale; dx++) {
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

  // Draw SKU Centered under QR
  let curY = qrStartY + qrPix + 4;
  const skuWidth = sku.length * 6 * 2;
  const skuX = Math.max(0, Math.floor((widthDots - skuWidth) / 2));
  drawBitmapText(raster, widthBytes, sku, skuX, curY, 2);
  curY += 18;

  // Draw Frame Name Centered
  if (name) {
    const nameWidth = name.length * 6 * 1;
    const nameX = Math.max(0, Math.floor((widthDots - nameWidth) / 2));
    drawBitmapText(raster, widthBytes, name, nameX, curY, 1);
    curY += 13;
  }

  // Draw Price Centered
  if (price) {
    const priceWidth = price.length * 6 * 2;
    const priceX = Math.max(0, Math.floor((widthDots - priceWidth) / 2));
    drawBitmapText(raster, widthBytes, price, priceX, curY, 2);
    curY += 18;
  }

  // Build ESC/POS GS v 0 1-bit raster binary
  const finalHeight = Math.max(120, curY + 6);
  const slicedRaster = raster.slice(0, widthBytes * finalHeight);

  const header = Buffer.from([
    0x1B, 0x40, // ESC @ (Initialize)
    0x1D, 0x76, 0x30, 0x00, // GS v 0
    widthBytes & 0xFF, (widthBytes >> 8) & 0xFF,
    finalHeight & 0xFF, (finalHeight >> 8) & 0xFF
  ]);

  const footer = Buffer.from([
    0x1B, 0x64, 0x02, // Feed 2 lines
    0x1D, 0x56, 0x42, 0x00 // Partial cut
  ]);

  return Buffer.concat([header, slicedRaster, footer]);
}

// ── Process Print Order ───────────────────────────────────────────────────────
async function processPrintOrder(order, isManualReprint = false) {
  const orderRef = order.order_number || order.order_ref || order.id;
  if (!orderRef) return { success: false, error: 'Missing order reference' };

  // Check duplicate prevention
  if (!isManualReprint && printedHistory[orderRef]) {
    log(`Duplicate print skipped for order ${orderRef} (Already printed at ${printedHistory[orderRef]})`);
    return { success: true, skippedDuplicate: true, orderNumber: orderRef, printedAt: printedHistory[orderRef] };
  }

  log(`Preparing 2.5-inch Customer Bill for order #${orderRef}...`);
  const receiptBinary = format25InchEscPosReceipt(order);
  const result = await spoolBytesToPrinter(receiptBinary, `Bill-${orderRef}`);

  if (result.success) {
    printedHistory[orderRef] = new Date().toISOString();
    savePrintedHistory();
    return { success: true, orderNumber: orderRef, printedAt: printedHistory[orderRef] };
  } else {
    return { success: false, error: result.error, orderNumber: orderRef };
  }
}

// ── Cloud Order Listener (Real-Time Website Order Ingestion) ──────────────────
async function pollCloudOrders() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) return;
  try {
    const res = await fetch(`${config.supabaseUrl}/rest/v1/orders?select=*&order=created_at.desc&limit=15`, {
      headers: {
        'apikey': config.supabaseAnonKey,
        'Authorization': `Bearer ${config.supabaseAnonKey}`
      }
    });

    if (!res.ok) {
      state.cloudConnected = false;
      return;
    }

    state.cloudConnected = true;
    const orders = await res.json();
    if (!Array.isArray(orders)) return;

    const now = Date.now();
    const freshnessMs = (config.orderFreshnessMinutes || 30) * 60 * 1000;

    for (const o of orders) {
      const ref = o.order_ref;
      if (!ref || /TEST/i.test(ref)) continue;
      if (printedHistory[ref]) continue;

      // Check freshness window (never print historical backlog on restart)
      const orderTime = o.created_at ? new Date(o.created_at).getTime() : 0;
      if (orderTime && (now - orderTime > freshnessMs)) {
        // Mark as recorded so it doesn't prompt again
        printedHistory[ref] = 'SKIPPED_STALE';
        continue;
      }

      log(`[Cloud Event] Detected newly confirmed website order #${ref}! Triggering automatic print...`);

      // Extract prescription from items or query Supabase prescriptions table by phone
      if (!o.prescription && Array.isArray(o.items) && o.items[0]?.prescription) {
        o.prescription = o.items[0].prescription;
      }
      if (!o.prescription && o.customer_phone) {
        try {
          const rxRes = await fetch(`${config.supabaseUrl}/rest/v1/prescriptions?client_phone=eq.${encodeURIComponent(String(o.customer_phone).trim())}&order=created_at.desc&limit=1`, {
            headers: { 'apikey': config.supabaseAnonKey, 'Authorization': `Bearer ${config.supabaseAnonKey}` }
          });
          if (rxRes.ok) {
            const rxData = await rxRes.json();
            if (Array.isArray(rxData) && rxData.length > 0) o.prescription = rxData[0];
          }
        } catch (_) {}
      }

      await processPrintOrder(o);
    }
    savePrintedHistory();
  } catch (err) {
    state.cloudConnected = false;
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
    try { notesObj = JSON.parse(recs[0].notes); } catch (_) {}
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
      }).catch(() => {});
    }
  } catch (_) {}
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
      try { printers = JSON.parse(stdout); } catch (e) {}
      if (!Array.isArray(printers)) printers = printers ? [printers] : [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, printers }));
    });
    return;
  }

  // 3. POST /api/print (In-Store Checkout or Manual Reprint)
  if (req.method === 'POST' && url.pathname === '/api/print') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const isManual = Boolean(payload.manualReprint);
        const result = await processPrintOrder(payload.order || payload, isManual);
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

  // Start Cloud Listener Loop (every 5 seconds)
  setInterval(pollCloudOrders, 5000);
  pollCloudOrders();

  // Start Cloud Print Queue Worker (every 3 seconds)
  setInterval(pollCloudPrintQueue, 3000);
  pollCloudPrintQueue();
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

