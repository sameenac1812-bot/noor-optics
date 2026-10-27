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
  const storeAddress = settings.store_address || 'Indiranagar 100ft Road, Bengaluru';
  const storePhone = settings.store_phone || '+91 98765 43210';
  const storeGstin = settings.store_gstin || '29AAAAA0000A1Z5';
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
    <div class="brand-title">${storeName}</div>
    <div class="brand-sub">Curated Scandinavian Eyewear</div>
    <div style="font-size:9px;">${storeAddress}</div>
    <div style="font-size:9px;">Ph: ${storePhone}</div>
    ${storeGstin ? `<div style="font-size:9px;">GSTIN: ${storeGstin}</div>` : ''}
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
  <div class="totals-row" style="font-size:9.5px;">
    <span>Tax (GST 18% Incl):</span>
    <span>${formatINR(order.tax_paise)}</span>
  </div>

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
  enqueuePrintJob,
  processPrintJob,
  getStoreSettings
};
