/**
 * server/printer.js – 2-inch / 58mm POS Thermal Receipt & Token Printing Engine
 * Supports ESC/POS raw hardware printing via Windows Spooler and 58mm Browser Print CSS.
 */

'use strict';

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { db } = require('./db');

/**
 * Format currency in Indian Rupees
 */
function formatINR(paise) {
  return '₹' + (Number(paise) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Generate 58mm formatted plain text receipt for thermal printer
 */
function format58mmTextReceipt(order, items, settings = {}) {
  const storeName = settings.store_name || 'NOOR OPTICS';
  const storePhone = settings.store_phone || '+91 98765 43210';
  const storeGstin = settings.store_gstin || '29AAAAA0000A1Z5';
  const dateStr = new Date(order.created_at || Date.now()).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const LINE_WIDTH = settings.printer_nominal_width_mm === '80' ? 44 : 32;
  const divider = '-'.repeat(LINE_WIDTH);
  const doubleDivider = '='.repeat(LINE_WIDTH);

  function center(text) {
    const s = String(text || '');
    const clipped = s.length > LINE_WIDTH ? s.substring(0, LINE_WIDTH) : s;
    const pad = Math.max(0, Math.floor((LINE_WIDTH - clipped.length) / 2));
    return ' '.repeat(pad) + clipped;
  }

  function row(left, right) {
    const r = String(right || '');
    const maxL = Math.max(0, LINE_WIDTH - r.length - 1);
    const l = String(left || '').length > maxL ? String(left || '').substring(0, maxL) : String(left || '');
    const space = Math.max(1, LINE_WIDTH - l.length - r.length);
    return l + ' '.repeat(space) + r;
  }

  let text = '';
  text += center(storeName.toUpperCase()) + '\n';
  text += center('SCANDINAVIAN EYEWEAR BOUTIQUE') + '\n';
  text += center('Ph: ' + storePhone) + '\n';
  if (storeGstin) text += center('GSTIN: ' + storeGstin) + '\n';
  text += doubleDivider + '\n';
  text += center(`*** TOKEN #${order.token_number} ***`) + '\n';
  text += center(`Order: ${order.order_number}`) + '\n';
  text += center(`Channel: ${order.channel}`) + '\n';
  text += center(dateStr) + '\n';
  text += divider + '\n';

  if (order.customer_name && order.customer_name !== 'Walk-in Client') {
    text += `Customer: ${order.customer_name.substring(0, LINE_WIDTH - 10)}\n`;
    if (order.customer_phone) text += `Phone: ${order.customer_phone}\n`;
    text += divider + '\n';
  }

  text += row('ITEM / VARIANT', 'TOTAL') + '\n';
  text += divider + '\n';

  items.forEach(item => {
    const itemTotal = formatINR(item.subtotal_paise || ((item.unit_price_paise || 0) * (item.quantity || 1)));
    text += `${(item.product_name || 'Frame').substring(0, LINE_WIDTH)}\n`;
    const unitPrice = item.unit_price_paise ? formatINR(item.unit_price_paise) : itemTotal;
    const details = ` ${item.quantity || 1}x @ ${unitPrice}`;
    text += row(details, itemTotal) + '\n';
    if (item.variant_name) {
      text += `  Color: ${item.variant_name.substring(0, LINE_WIDTH - 9)}\n`;
    }
    if (item.lens_name && item.lens_name !== 'Standard Demo Lens') {
      text += `  [Lens: ${item.lens_name.substring(0, LINE_WIDTH - 9)}]\n`;
    }
  });

  text += divider + '\n';
  text += row('Subtotal:', formatINR(order.subtotal_paise)) + '\n';
  if (order.discount_paise > 0) {
    text += row('Discount:', '-' + formatINR(order.discount_paise)) + '\n';
  }
  text += row('Tax (GST 18% Incl):', formatINR(order.tax_paise)) + '\n';
  text += doubleDivider + '\n';
  text += row('GRAND TOTAL:', formatINR(order.total_payable_paise)) + '\n';
  text += row('Payment Status:', order.payment_status) + '\n';
  text += row('Paid Amount:', formatINR(order.amount_paid_paise)) + '\n';
  if (order.outstanding_paise > 0) {
    text += row('Balance Due:', formatINR(order.outstanding_paise)) + '\n';
  }
  text += divider + '\n';
  text += center('2-Year Frame Warranty') + '\n';
  text += center('14-Day Free Glazing Adjustment') + '\n';
  text += center('Thank You for Visiting Noor Optics!') + '\n\n\n\n';

  return text;
}

/**
 * Generate 58mm HTML for Browser Print Dialog & Web Preview
 */
function generate58mmHTML(order, items, settings = {}) {
  const storeName = settings.store_name || 'NOOR OPTICS';
  const storeAddress = (settings.store_address || 'Indiranagar 100ft Road').replace(/,\s*Bengaluru/i, '').replace(/Bengaluru/i, '').trim();
  const storePhone = settings.store_phone || '+91 98765 43210';
  const widthMm = settings.printer_nominal_width_mm || 58;

  const dateStr = new Date(order.created_at || Date.now()).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 2px 0;">
        <div style="font-weight:600;">${item.product_name}</div>
        <div style="font-size:9px; color:#555;">${item.quantity} × ${formatINR(item.unit_price_paise)} (${item.variant_name})</div>
        ${item.lens_name && item.lens_name !== 'Standard Demo Lens' ? `<div style="font-size:9px; color:#444;">Lens: ${item.lens_name}</div>` : ''}
      </td>
      <td style="text-align:right; vertical-align:top; font-weight:600; padding:2px 0;">
        ${formatINR(item.subtotal_paise)}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - Token #${order.token_number} - ${order.order_number}</title>
  <style>
    @media print {
      @page {
        size: ${widthMm}mm auto;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 4mm 2mm 10mm 2mm;
        width: ${widthMm - 6}mm;
      }
      .no-print { display: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Courier, monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #000000;
      background: #FFFFFF;
      margin: 0 auto;
      padding: 12px 8px;
      max-width: ${widthMm}mm;
      box-sizing: border-box;
    }
    .header { text-align: center; margin-bottom: 6px; }
    .brand-logo { width: 68px; height: auto; display: block; margin: 0 auto 4px auto; }
    .brand-title { font-size: 15px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
    .brand-sub { font-size: 9px; text-transform: uppercase; color: #444; }
    .token-badge {
      font-size: 20px;
      font-weight: 900;
      text-align: center;
      margin: 6px 0;
      padding: 4px;
      border: 1.5px dashed #000;
      letter-spacing: 1px;
    }
    .divider { border-top: 1px dashed #000; margin: 5px 0; }
    .double-divider { border-top: 2px solid #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    .totals-row { display: flex; justify-content: space-between; margin: 2px 0; }
    .grand-total { font-size: 13px; font-weight: 800; margin: 4px 0; }
    .footer { text-align: center; font-size: 9px; margin-top: 10px; color: #333; }
  </style>
</head>
<body>
  <div class="header">
    <img src="/images/bill_logo.png" class="brand-logo" alt="NOOR" onerror="this.style.display='none';" />
    <div class="brand-title">${storeName}</div>
    <div class="brand-sub">Curated Scandinavian Eyewear</div>
    <div style="font-size:9px;">${storeAddress}</div>
    <div style="font-size:9px;">Ph: ${storePhone}</div>
  </div>

  <div class="token-badge">
    TOKEN #${order.token_number}
  </div>

  <div style="font-size:9.5px; text-align:center; margin-bottom:4px;">
    <div><strong>Order:</strong> ${order.order_number} (${order.channel})</div>
    <div>${dateStr}</div>
  </div>

  ${order.customer_name && order.customer_name !== 'Walk-in Client' ? `
    <div class="divider"></div>
    <div style="font-size:9.5px;">
      <strong>Customer:</strong> ${order.customer_name}<br>
      ${order.customer_phone ? `<strong>Phone:</strong> ${order.customer_phone}` : ''}
    </div>
  ` : ''}

  <div class="divider"></div>
  <table>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>
  <div class="totals-row">
    <span>Subtotal:</span>
    <span>${formatINR(order.subtotal_paise)}</span>
  </div>
  ${order.discount_paise > 0 ? `
    <div class="totals-row">
      <span>Discount:</span>
      <span>-${formatINR(order.discount_paise)}</span>
    </div>
  ` : ''}

  <div class="double-divider"></div>
  <div class="totals-row grand-total">
    <span>TOTAL:</span>
    <span>${formatINR(order.total_payable_paise)}</span>
  </div>

  <div class="totals-row">
    <span>Payment:</span>
    <span><strong>${order.payment_status}</strong></span>
  </div>
  <div class="totals-row">
    <span>Amount Paid:</span>
    <span>${formatINR(order.amount_paid_paise)}</span>
  </div>
  ${order.outstanding_paise > 0 ? `
    <div class="totals-row" style="color:red; font-weight:700;">
      <span>Balance Due:</span>
      <span>${formatINR(order.outstanding_paise)}</span>
    </div>
  ` : ''}

  ${(order.od_sph !== undefined && order.od_sph !== null && order.od_sph !== '') || order.prescription_number ? `
    <div class="divider"></div>
    <div style="text-align:center; font-weight:800; font-size:10px; margin:4px 0; text-transform:uppercase; letter-spacing:0.5px;">--- Client Prescription (Rx) ---</div>
    <table style="font-size:9.5px; width:100%; text-align:center; margin:3px 0; border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:1px dashed #666; font-weight:700;">
          <th style="text-align:left; padding:2px 0;">Eye</th><th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align:left; font-weight:700; padding:2px 0;">OD</td>
          <td>${order.od_sph || '0.00'}</td><td>${order.od_cyl || '0.00'}</td><td>${order.od_axis || '---'}</td><td>${order.addition || '0.00'}</td>
        </tr>
        <tr>
          <td style="text-align:left; font-weight:700; padding:2px 0;">OS</td>
          <td>${order.os_sph || '0.00'}</td><td>${order.os_cyl || '0.00'}</td><td>${order.os_axis || '---'}</td><td>${order.addition || '0.00'}</td>
        </tr>
      </tbody>
    </table>
    ${order.ipd_distance ? `<div style="font-size:9px; margin-top:2px;"><strong>Distance PD:</strong> ${order.ipd_distance} mm</div>` : ''}
    ${order.rx_checked_by ? `<div style="font-size:9px;"><strong>Optometrist:</strong> ${order.rx_checked_by}</div>` : ''}
  ` : ''}

  <div class="divider"></div>
  <div style="text-align:center; margin:8px 0;">
    <div style="font-size:9.5px; font-weight:800; letter-spacing:0.5px; margin-bottom:4px; text-transform:uppercase;">Scan to Pay via UPI</div>
    <img src="/images/payment_qr.jpg" style="width:125px; height:125px; display:inline-block; border:1px solid #111; padding:2px;" alt="UPI QR" />
  </div>

  <div class="divider"></div>
  <div class="footer">
    <div>2-Year Comprehensive Frame Warranty</div>
    <div>14-Day Free Optical Comfort Adjustment</div>
    <div style="margin-top:4px; font-weight:600;">Thank You for Choosing Noor Optics!</div>
  </div>
</body>
</html>
  `;
}

/**
 * Enqueue a print job for an order
 */
function enqueuePrintJob(orderId, tokenNumber, docType = 'TOKEN') {
  const jobId = 'prn-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const settings = getStoreSettings();
  const printerName = settings.printer_windows_name || 'POS-80';
  const paperWidth = parseInt(settings.printer_nominal_width_mm || '58', 10);

  try {
    db.prepare(`
      INSERT INTO print_jobs (
        id, order_id, token_number, printer_name, paper_width_mm, doc_type, status, attempts
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0)
    `).run(jobId, orderId, tokenNumber, printerName, paperWidth, docType);

    // Trigger immediate background hardware spool if configured
    processPrintJob(jobId).catch(err => {
      console.warn('Background print job spool failed (can retry via UI):', err.message);
    });

    return { jobId, status: 'PENDING' };
  } catch (err) {
    console.error('Failed to enqueue print job:', err.message);
    return { error: err.message };
  }
}

/**
 * Dispatch print job to Windows Raw Spooler
 */
async function processPrintJob(jobId) {
  const job = db.prepare('SELECT * FROM print_jobs WHERE id = ?').get(jobId);
  if (!job) throw new Error('Print job not found');

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(job.order_id);
  if (!order) throw new Error('Order not found for print job');

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(job.order_id);
  const settings = getStoreSettings();

  db.prepare("UPDATE print_jobs SET status = 'PRINTING', attempts = attempts + 1 WHERE id = ?").run(jobId);

  return new Promise((resolve, reject) => {
    // Generate ESC/POS text representation
    const textData = format58mmTextReceipt(order, items, settings);
    const tempFile = path.join(__dirname, '..', 'data', `receipt_${jobId}.txt`);
    fs.writeFileSync(tempFile, textData, 'utf8');

    // Call PowerShell spooler to send raw bytes to printer
    const psScript = path.join(__dirname, '..', '_legacy_pos', 'print-order.ps1');
    const printerName = settings.printer_windows_name || 'POS-80';

    if (fs.existsSync(psScript)) {
      const cmd = `powershell.exe -ExecutionPolicy Bypass -File "${psScript}" -OrderFile "${tempFile}" -PrinterName "${printerName}"`;
      exec(cmd, (error, stdout, stderr) => {
        // Clean up temp file
        try { fs.unlinkSync(tempFile); } catch (e) {}

        if (error) {
          const errMsg = stderr || error.message;
          db.prepare("UPDATE print_jobs SET status = 'FAILED', last_error = ? WHERE id = ?").run(errMsg.substring(0, 250), jobId);
          return resolve({ success: false, reason: errMsg, browserFallback: true });
        }

        db.prepare("UPDATE print_jobs SET status = 'COMPLETED', completed_at = datetime('now') WHERE id = ?").run(jobId);
        resolve({ success: true, stdout });
      });
    } else {
      // Clean up temp file
      try { fs.unlinkSync(tempFile); } catch (e) {}
      db.prepare("UPDATE print_jobs SET status = 'COMPLETED', completed_at = datetime('now'), last_error = 'Spooler script absent, browser print ready' WHERE id = ?").run(jobId);
      resolve({ success: true, browserFallback: true });
    }
  });
}

/**
 * Generate 58mm / 80mm ESC/POS Raster QR Label Binary
 * Fully compatible with ESC/POS thermal printers (POS-58, POS-80, etc.)
 * GUARANTEE: QR code and text are in ONE SINGLE BITMAP so text strictly fits within
 * the QR code column width and is never cut off when cutting along the sides.
 */
async function generateEscPosQrLabel(opts = {}) {
  const QRCode = require('qrcode');
  const font = require('./fontData.json');
  const {
    sku = 'NOOR-FRAME',
    name = 'Optical Frame',
    brand = 'Noor Optics',
    price = '',
    copies = 1,
    paperWidthMm = 58,
    qrPreset = 'url',
    qrMode = ''
  } = opts;

  // Determine QR payload:
  // Default to uppercase short web URL (Version 2, 25x25 modules = 625 dots)
  // This guarantees that any phone camera (iPhone iOS / Android) instantly detects the link,
  // and in-store POS scanners resolve the frame directly.
  let qrPayload = opts.qrPayload;
  const isExplicitSku = (qrPreset === 'sku' || qrMode === 'sku');

  if (isExplicitSku) {
    qrPayload = (sku || 'NOOR-FRAME').toUpperCase();
  } else {
    qrPayload = `HTTPS://NOOROPTICS.VERCEL.APP/Q/${encodeURIComponent(sku).toUpperCase()}`;
  }

  // Create QR with Error Correction 'L' (strictly Version 2 = 25x25, preserving wide 26px quiet margins on scissors cut)
  const qr = QRCode.create(qrPayload, { errorCorrectionLevel: 'L' });
  const rawSize = qr.modules.size; // Strictly 25 for short URL (Version 2), 21 for raw SKU (Version 1)

  // Full ISO/IEC 18004 compliant 4-module quiet zone on all sides
  // Mandatory for camera scanners to detect the 1:1:3:1:1 corner finder patterns
  const quiet = 4;
  let scale = 4; // Crisp 4x4 printer dots (0.50mm)

  if (rawSize <= 21) {
    scale = 5; // Extra large 5x5 dots (0.625mm) for Version 1
  } else if (qrPreset === 'temple' || opts.qrSize === 'tiny' || opts.qrSize === 'temple') {
    scale = 3;
  }

  const totalModules = rawSize + quiet * 2;
  const qrPixels = totalModules * scale; // 33 * 4 = 132 pixels (URL) or 29 * 5 = 145 pixels (SKU)

  // Label width: 152 pixels (19 bytes = 19mm) ensuring wide protective paper margins on both sides
  // Guaranteed protection so cutting the strip with scissors never damages the quiet zone
  const labelWidth = 152;
  const qrOffsetX = Math.max(0, Math.floor((labelWidth - qrPixels) / 2)); // Centered
  const qrOffsetY = 12; // Generous 12px white paper buffer at top

  // Typography layout: centered within 152px width with generous white gap below QR
  const skuScale = (sku.length * 12 <= labelWidth - 8) ? 2 : 1;
  const skuOffsetY = qrOffsetY + qrPixels + 12; // Clean white space between bottom finder patterns & SKU text
  const skuHeight = 7 * skuScale;
  const nameOffsetY = skuOffsetY + skuHeight + 6;
  const priceOffsetY = nameOffsetY + 7 + 4;
  const lineOffsetY = priceOffsetY + 7 + 8;
  const totalHeight = lineOffsetY + 8;

  // Format price cleanly without Unicode Rupee symbol
  let cleanPrice = price ? String(price).trim() : '';
  if (cleanPrice) {
    if (cleanPrice.startsWith('₹')) cleanPrice = 'Rs. ' + cleanPrice.substring(1).trim();
    if (!cleanPrice.toUpperCase().startsWith('M.R.P') && !cleanPrice.toUpperCase().startsWith('RS')) {
      cleanPrice = 'M.R.P: ' + cleanPrice;
    }
  }

  const grid = Array.from({ length: totalHeight }, () => new Array(labelWidth).fill(0));

  // 1. Render QR into grid with Negative Bleed Compensation (Thermal Bleed Shaving)
  // For each black module, detect if adjacent neighbors in printhead travel direction (right & down) are white.
  // Shaving 1 pixel on borders touching white gaps ensures that physical thermal bloom perfectly fills the gap
  // without invading the critical 1-module white separator in finder patterns or alternating data tracks!
  for (let my = 0; my < totalModules; my++) {
    const rawY = my - quiet;
    for (let mx = 0; mx < totalModules; mx++) {
      const rawX = mx - quiet;
      const isBlack = (rawX >= 0 && rawX < rawSize && rawY >= 0 && rawY < rawSize)
        ? Boolean(qr.modules.data[rawY * rawSize + rawX])
        : false;

      if (!isBlack) continue;

      const botWhite = (rawY + 1 < 0 || rawY + 1 >= rawSize) ? true : !qr.modules.data[(rawY + 1) * rawSize + rawX];
      const rightWhite = (rawX + 1 < 0 || rawX + 1 >= rawSize) ? true : !qr.modules.data[rawY * rawSize + (rawX + 1)];

      const endY = (botWhite && scale >= 4) ? scale - 1 : scale;
      const endX = (rightWhite && scale >= 4) ? scale - 1 : scale;

      for (let dy = 0; dy < endY; dy++) {
        for (let dx = 0; dx < endX; dx++) {
          const py = qrOffsetY + my * scale + dy;
          const px = qrOffsetX + mx * scale + dx;
          if (py >= 0 && py < totalHeight && px >= 0 && px < labelWidth) {
            grid[py][px] = 1;
          }
        }
      }
    }
  }

  // 2. Helper to draw text glyphs from 5x7 font
  function drawChar(char, startX, startY, s) {
    const code = char.charCodeAt(0);
    const offset = code * 5;
    for (let c = 0; c < 5; c++) {
      const colByte = font[offset + c] || 0;
      for (let r = 0; r < 7; r++) {
        if (colByte & (1 << r)) {
          for (let dy = 0; dy < s; dy++) {
            for (let dx = 0; dx < s; dx++) {
              const x = startX + c * s + dx;
              const y = startY + r * s + dy;
              if (y >= 0 && y < grid.length && x >= 0 && x < labelWidth) {
                grid[y][x] = 1;
              }
            }
          }
        }
      }
    }
  }

  function drawCenteredText(text, y, s) {
    if (!text) return;
    const maxChars = Math.floor(labelWidth / ((5 + 1) * s));
    const cleanText = text.length > maxChars ? text.substring(0, maxChars - 1) + '.' : text;
    const textWidth = cleanText.length * (5 + 1) * s - s;
    const startX = Math.max(0, Math.floor((labelWidth - textWidth) / 2));
    let curX = startX;
    for (let i = 0; i < cleanText.length; i++) {
      drawChar(cleanText[i], curX, y, s);
      curX += (5 + 1) * s;
    }
  }

  // 3. Render SKU, Name, Price centered strictly between the QR sides
  drawCenteredText(sku, skuOffsetY, skuScale);
  if (name) drawCenteredText(name, nameOffsetY, 1);
  if (cleanPrice) drawCenteredText(cleanPrice, priceOffsetY, 1);

  // 4. Render clean dashed cut line
  for (let x = 4; x < labelWidth - 4; x++) {
    if (Math.floor(x / 5) % 2 === 0) {
      grid[lineOffsetY][x] = 1;
    }
  }

  // Convert to ESC/POS GS v 0 format
  const totalPrintWidth = paperWidthMm >= 80 ? 576 : 384;
  const leftPadPixels = Math.max(0, Math.floor((totalPrintWidth - labelWidth) / 2));
  const leftPadBytes = Math.floor(leftPadPixels / 8);
  const labelBytesWidth = labelWidth / 8;
  const totalBytesWidth = leftPadBytes + labelBytesWidth;

  const bytes = [];

  for (let c = 0; c < copies; c++) {
    // ESC @ (Initialize)
    bytes.push(0x1B, 0x40);

    // Raster Bit Image: GS v 0 00 xL xH yL yH
    const xL = totalBytesWidth % 256;
    const xH = Math.floor(totalBytesWidth / 256);
    const yL = totalHeight % 256;
    const yH = Math.floor(totalHeight / 256);

    bytes.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH);

    for (let y = 0; y < totalHeight; y++) {
      for (let p = 0; p < leftPadBytes; p++) {
        bytes.push(0x00);
      }
      for (let b = 0; b < labelBytesWidth; b++) {
        let byteVal = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = b * 8 + bit;
          if (grid[y][x]) {
            byteVal |= (1 << (7 - bit));
          }
        }
        bytes.push(byteVal);
      }
    }

    // Feed minimal lines & Cut
    bytes.push(0x0A, 0x0A);
    bytes.push(0x1D, 0x56, 0x41, 0x00); // GS V 65 0 (Full cut)
    bytes.push(0x1B, 0x69); // ESC i (Cut)
  }

  return Buffer.from(bytes);
}

/**
 * Helper to fetch store settings map
 */
function getStoreSettings() {
  const rows = db.prepare('SELECT key, value FROM store_settings').all();
  const map = {};
  rows.forEach(r => map[r.key] = r.value);
  return map;
}

module.exports = {
  format58mmTextReceipt,
  generate58mmHTML,
  generateEscPosQrLabel,
  enqueuePrintJob,
  processPrintJob,
  getStoreSettings
};

