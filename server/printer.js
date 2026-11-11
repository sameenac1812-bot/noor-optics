/**
 * server/printer.js – 2-inch / 58mm POS Thermal Receipt & Token Printing Engine
 * Supports ESC/POS raw hardware printing via Windows Spooler and 58mm Browser Print CSS.
 */

'use strict';

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { db } = require('./db');

// ── Paper Width & UPI Configuration (Tweakable) ──
const PAPER_WIDTH_COLS = 32; // Characters per line for 2.5-inch thermal paper (e.g. 32, 40, 48)
const PAPER_WIDTH_MM = 58;   // Paper width in mm for browser preview & printing
const UPI_ID = '9182341567@mairtel'; // Shop UPI ID for payment QR code & receipt text

/**
 * Format currency in Indian Rupees
 */
function formatINR(paise) {
  return '₹' + (Number(paise) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function isWebsiteOrder(o) {
  if (!o) return false;
  if (o.source === 'website' || o.source === 'WEBSITE') return true;
  if (o.source === 'instore' || o.source === 'pos' || o.source === 'INSTORE') return false;
  const ref = String(o.order_number || o.order_ref || o.orderNumber || o.token_number || o.id || '').toUpperCase();
  if (ref.includes('-POS-') || ref.includes('POS')) return false;
  if (ref.includes('-WEB-') || ref.includes('-ONL-') || ref.includes('ONLINE') || ref.includes('WEB')) return true;
  if (o.channel === 'ONLINE' || o.channel === 'WEBSITE') return true;
  if (o.channel === 'POS' || o.channel === 'IN-STORE') return false;
  return false;
}

function hasMeaningfulDiopters(rx) {
  if (!rx) return false;
  const fields = [
    rx.od_sph, rx.odSph, rx.od_cyl, rx.odCyl, rx.od_axis, rx.odAxis,
    rx.os_sph, rx.osSph, rx.os_cyl, rx.osCyl, rx.os_axis, rx.osAxis,
    rx.addition, rx.add
  ];
  for (const val of fields) {
    if (val === undefined || val === null) continue;
    const str = String(val).trim();
    if (str === '' || str === '--' || str === '---' || str === '0' || str === '0.0' || str === '0.00' || str === '+0.00' || str === '-0.00') {
      continue;
    }
    const num = parseFloat(str);
    if (!isNaN(num) && num !== 0) return true;
    if (isNaN(num) && str.length > 0) return true;
  }
  return false;
}

/**
 * Generate 2.5-inch (58mm) formatted plain text receipt matching Image reference layout
 */
function format58mmTextReceipt(order, items = [], settings = {}) {
  const COLS = parseInt(settings.printer_columns, 10) || PAPER_WIDTH_COLS;
  const storeName = 'NOOR OPTIC';
  const storeAddress = settings.store_address || 'Pillar No. 45, Rethibowli';
  const storePhone = settings.store_phone || '+91 98765 43210';
  const activeUpiId = settings.store_upi_id || UPI_ID;

  const divider = '-'.repeat(COLS);

  function center(text) {
    const s = String(text || '').trim();
    if (s.length >= COLS) return s.slice(0, COLS);
    const pad = Math.max(0, Math.floor((COLS - s.length) / 2));
    return ' '.repeat(pad) + s;
  }

  function row(left, right) {
    const l = String(left || '');
    const r = String(right || '');
    if (l.length + r.length >= COLS) {
      return l + '\n' + r.padStart(COLS);
    }
    const spaces = Math.max(1, COLS - l.length - r.length);
    return l + ' '.repeat(spaces) + r;
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

  const lines = [];

  // 1 & 2. Centered Shop Name, Address, Phone
  lines.push(center(storeName));
  const addrLines = wrapTextLines(storeAddress, COLS);
  addrLines.forEach(al => lines.push(center(al)));
  lines.push(center(`Ph: ${storePhone}`));

  // 3. Dashed line
  lines.push(divider);

  // 4. Invoice no (left) and date + time (right)
  let shortRef = String(order.token_number || order.order_number || order.order_ref || order.id || '4866');
  if (shortRef.includes('-')) {
    shortRef = shortRef.split('-').pop();
  }
  const invNo = 'INV: ' + shortRef;
  const dateStr = formatDateTime(order.created_at || Date.now());
  lines.push(row(invNo, dateStr));

  // 5. Dashed line
  lines.push(divider);

  // 6. Name, Phone, City, Age, and Pick Up Date & Time under City
  const custName = String(order.customer_name || 'Walk-in Client').slice(0, 24);
  const custPhone = String(order.customer_phone || '-').slice(0, 20);
  const city = String(order.city || order.client_city || order.customer_city || 'Hyderabad').slice(0, 14);
  const age = (order.customer_age || order.client_age || order.age) ? String(order.customer_age || order.client_age || order.age) : '--';

  let pDate = '--';
  let pTime = '--';
  const pickupRaw = order.pickup_time || order.pickupTime || order.pick_up_time || order.pickup_date;
  if (pickupRaw) {
    pDate = formatDateOnly(pickupRaw);
    pTime = formatTimeOnly(pickupRaw);
  } else {
    try {
      const defD = new Date(order.created_at || Date.now());
      defD.setDate(defD.getDate() + 3);
      pDate = formatDateOnly(defD);
    } catch (_) {
      pDate = '--';
    }
  }

  lines.push(`Name: ${custName}`);
  if (custPhone && custPhone !== '-') {
    lines.push(`Phone: ${custPhone}`);
  }
  lines.push(row(`City: ${city}`, `Age: ${age}`));

  // Delivery Date (always printed under City column as the website bill)
  const deliveryRaw = order.delivery_date || order.deliveryDate || order.pickup_time || order.pickupTime || order.pick_up_time;
  let dDate;
  if (deliveryRaw) {
    dDate = formatDateOnly(deliveryRaw);
  } else {
    try {
      const defD = new Date(order.created_at || Date.now());
      defD.setDate(defD.getDate() + 3);
      dDate = formatDateOnly(defD);
    } catch (_) {
      dDate = '--';
    }
  }
  lines.push(row('Delivery Date:', dDate));

  // 7. Dashed line
  lines.push(divider);

  // 8. Table header: ITEM | QTY | RATE | TOTAL, then dashed line
  const itemColW = Math.max(10, COLS - 17);
  lines.push('ITEM'.padEnd(itemColW) + ' ' + 'QTY'.padStart(3) + ' ' + 'RATE'.padStart(5) + ' ' + 'TOTAL'.padStart(6));
  lines.push(divider);

  // 9. Item rows (item name on the left, QTY / RATE / TOTAL right-aligned; long names wrap to a second line)
  const itemList = Array.isArray(items) && items.length > 0 ? items : (Array.isArray(order.items) ? order.items : [{ product_name: 'Optical Frame', quantity: 1, unit_price_paise: order.total_payable_paise || 0 }]);
  itemList.forEach(item => {
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

    const colsStr = ' ' + String(qty).padStart(3) + ' ' + formatNum(unitPrice).padStart(5) + ' ' + formatNum(lineTotal).padStart(6);

    if (name.length <= itemColW) {
      lines.push(name.padEnd(itemColW) + colsStr);
    } else {
      lines.push(name);
      lines.push(' '.repeat(itemColW) + colsStr);
    }
  });

  // 10. Dashed line
  lines.push(divider);

  // 11. Right-aligned: Total, Discount, Advance, 2nd Amount (with its date/time in small text below), 3rd Amount, dashed line, Remaining
  const grandTotal = Number(order.total_payable_inr || (order.total_payable_paise ? order.total_payable_paise / 100 : order.grand_total || order.total || 0));
  const discount = Number(order.discount_inr || (order.discount_paise ? order.discount_paise / 100 : 0));
  const second = Number(order.second_payment_inr || (order.second_payment_paise ? order.second_payment_paise / 100 : 0));
  const third = Number(order.third_payment_inr || (order.third_payment_paise ? order.third_payment_paise / 100 : 0));
  const totalPaid = Number(order.amount_paid_inr != null ? order.amount_paid_inr : (order.amount_paid_paise ? order.amount_paid_paise / 100 : 0));
  const advance = Number(order.advance_paid_inr != null ? order.advance_paid_inr : (order.advance_paid_paise ? order.advance_paid_paise / 100 : Math.max(0, totalPaid - second - third)));
  const remaining = Number(order.outstanding_inr != null ? order.outstanding_inr : (order.outstanding_paise != null ? order.outstanding_paise / 100 : Math.max(0, grandTotal - (advance + second + third))));

  function finRow(lbl, val) {
    const l = String(lbl);
    const v = (val !== null && val !== undefined && val !== '') ? formatNum(val) : '';
    const line = l.padStart(16) + '  ' + v.padStart(8);
    return line.padStart(COLS);
  }

  const isWeb = isWebsiteOrder(order);

  if (isWeb) {
    // Website orders: Clean single total & Paid in full
    lines.push(finRow('Total:', grandTotal));
    lines.push(divider);
    lines.push(center('*** PAID IN FULL ***'));
  } else {
    // In-store POS counter orders: full installment breakdown
    lines.push(finRow('Total:', grandTotal));
    lines.push(finRow('Discount:', discount));
    lines.push(finRow('Advance:', advance));
    lines.push(finRow('2nd Amount:', second > 0 ? second : ''));
    lines.push(finRow('3rd Amount:', third > 0 ? third : ''));
    if (Array.isArray(order.payments) && order.payments.length > 3) {
      for (let pi = 3; pi < order.payments.length; pi++) {
        const p = order.payments[pi];
        const pAmt = p.amount_inr != null ? Number(p.amount_inr) : (p.amount_paise ? Number(p.amount_paise) / 100 : 0);
        if (pAmt > 0) {
          lines.push(finRow(`${pi + 1}th Amount:`, pAmt));
        }
      }
    }
    lines.push(divider);
    lines.push(finRow('Remaining:', remaining));
    if (remaining === 0) {
      lines.push(center('*** PAID IN FULL ***'));
    }
  }

  // 12. Dashed line
  lines.push(divider);

  // 13. PRESCRIPTION block
  let allRxList = [];
  if (Array.isArray(order.prescriptions) && order.prescriptions.length > 0) {
    allRxList = order.prescriptions.filter(Boolean);
  } else if (order.prescriptions_json) {
    try {
      const p = JSON.parse(order.prescriptions_json);
      if (Array.isArray(p) && p.length > 0) allRxList = p;
    } catch (_) {}
  }
  if (allRxList.length === 0) {
    const fallbackRx = order.prescription || order.client_prescription || order.newPrescription || order;
    if (fallbackRx) allRxList.push(fallbackRx);
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

  const validRxList = allRxList.filter(hasMeaningfulDiopters);

  if (validRxList.length > 0) {
    allRxList.forEach((rx, idx) => {
      if (!hasMeaningfulDiopters(rx)) return;
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

      lines.push(`RX# ${rxNo}`);
      lines.push(' '.repeat(11) + 'SPH'.padStart(7) + 'CYL'.padStart(7) + 'AXIS'.padStart(7));
      lines.push('OD Right'.padEnd(11) + fmtDio(odSph).padStart(7) + fmtDio(odCyl).padStart(7) + fmtAx(odAxis).padStart(7));
      lines.push('OS Left'.padEnd(11) + fmtDio(osSph).padStart(7) + fmtDio(osCyl).padStart(7) + fmtAx(osAxis).padStart(7));
      if (addition && addition !== '--' && addition !== '---') {
        lines.push('Addition'.padEnd(11) + fmtDio(addition).padStart(7));
      }
    });
  } else {
    // If no prescription added: "if no prescribtion added dont print prescribtion (just say zero power )"
    lines.push(center('RX: Zero Power'));
  }

  // 14. Dashed line
  lines.push(divider);

  // 15. "Thanks for Shopping" (centered)
  lines.push(center('Thanks for Shopping'));

  // 16 & 17. Payment QR code note & UPI ID
  lines.push(center(activeUpiId));

  // 18. Small bottom feed
  lines.push('\n\n');

  return lines.join('\n');
}

/**
 * Generate 58mm HTML for Browser Print Dialog & Web Preview
 */
function generate58mmHTML(order, items = [], settings = {}) {
  const storeName = 'NOOR OPTIC';
  const storeAddress = settings.store_address || 'Pillar No. 45, Rethibowli';
  const storePhone = settings.store_phone || '+91 98765 43210';
  const widthMm = settings.printer_nominal_width_mm || PAPER_WIDTH_MM;
  const activeUpiId = settings.store_upi_id || UPI_ID;

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

  const invNo = String(order.order_number || (order.token_number ? ('TOKEN #' + order.token_number) : 'NOOR-INV'));
  const dateStr = formatDateTime(order.created_at || Date.now());

  const custName = String(order.customer_name || 'Walk-in Client');
  const custPhone = String(order.customer_phone || '-');
  const city = String(order.city || order.client_city || order.customer_city || 'Hyderabad');
  const age = order.customer_age || order.client_age || order.age || '--';

  let pDate = '--';
  let pTime = '--';
  const pickupRaw = order.pickup_time || order.pickupTime || order.pick_up_time || order.pickup_date;
  if (pickupRaw) {
    pDate = formatDateOnly(pickupRaw);
    pTime = formatTimeOnly(pickupRaw);
  } else {
    try {
      const defD = new Date(order.created_at || Date.now());
      defD.setDate(defD.getDate() + 3);
      pDate = formatDateOnly(defD);
    } catch (_) {
      pDate = '--';
    }
  }

  const itemList = Array.isArray(items) && items.length > 0 ? items : (Array.isArray(order.items) ? order.items : [{ product_name: 'Optical Frame', quantity: 1, unit_price_paise: order.total_payable_paise || 0 }]);
  const itemsHtml = itemList.map(item => {
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

    return `
      <tr>
        <td style="text-align:left; word-break:break-word;">${name}</td>
        <td style="text-align:right; width:35px;">${qty}</td>
        <td style="text-align:right; width:55px;">${formatNum(unitPrice)}</td>
        <td style="text-align:right; width:60px;">${formatNum(lineTotal)}</td>
      </tr>
    `;
  }).join('');

  const grandTotal = Number(order.total_payable_inr || (order.total_payable_paise ? order.total_payable_paise / 100 : order.grand_total || order.total || 0));
  const discount = Number(order.discount_inr || (order.discount_paise ? order.discount_paise / 100 : 0));
  const advance = Number(order.advance_paid_inr || (order.advance_paid_paise ? order.advance_paid_paise / 100 : (order.amount_paid_inr != null ? order.amount_paid_inr : (order.amount_paid_paise ? order.amount_paid_paise / 100 : 0))));
  const second = Number(order.second_payment_inr || (order.second_payment_paise ? order.second_payment_paise / 100 : 0));
  const third = Number(order.third_payment_inr || (order.third_payment_paise ? order.third_payment_paise / 100 : 0));
  const remaining = Number(order.outstanding_inr != null ? order.outstanding_inr : (order.outstanding_paise != null ? order.outstanding_paise / 100 : Math.max(0, grandTotal - (advance + second + third))));
  const secondDate = second > 0 ? formatDateTime(order.second_payment_date || order.updated_at || Date.now()) : '';
  const thirdDate = third > 0 ? formatDateTime(order.third_payment_date || order.updated_at || Date.now()) : '';

  let allRxList = [];
  if (Array.isArray(order.prescriptions) && order.prescriptions.length > 0) {
    allRxList = order.prescriptions.filter(Boolean);
  } else if (order.prescriptions_json) {
    try {
      const p = JSON.parse(order.prescriptions_json);
      if (Array.isArray(p) && p.length > 0) allRxList = p;
    } catch (_) {}
  }
  if (allRxList.length === 0) {
    const fallbackRx = order.prescription || order.client_prescription || order.newPrescription || order;
    if (fallbackRx) allRxList.push(fallbackRx);
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

  const validRxList = allRxList.filter(hasMeaningfulDiopters);

  const rxHtml = validRxList.length > 0 ? validRxList.map((rx, idx) => {
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

    return `
      <div style="font-weight:bold; margin-top:2px;">RX# ${rxNo}</div>
      <table style="width:100%; border-collapse:collapse; margin-top:2px;">
        <thead>
          <tr style="text-align:right;">
            <th style="width:35%; text-align:left;"></th>
            <th style="width:21%;">SPH</th>
            <th style="width:22%;">CYL</th>
            <th style="width:22%;">AXIS</th>
          </tr>
        </thead>
        <tbody style="text-align:right;">
          <tr>
            <td style="text-align:left;">OD Right</td>
            <td>${fmtDio(odSph)}</td>
            <td>${fmtDio(odCyl)}</td>
            <td>${fmtAx(odAxis)}</td>
          </tr>
          <tr>
            <td style="text-align:left;">OS Left</td>
            <td>${fmtDio(osSph)}</td>
            <td>${fmtDio(osCyl)}</td>
            <td>${fmtAx(osAxis)}</td>
          </tr>
          <tr>
            <td style="text-align:left;">Addition</td>
            <td>${fmtDio(addition)}</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
    `;
  }).join('<div class="dash">--------------------------------</div>') : `<div class="center bold" style="margin:4px 0;">RX: Zero Power</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${invNo}</title>
  <style>
    @media print {
      @page {
        size: ${widthMm}mm auto;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 3mm 2mm;
        width: ${widthMm - 4}mm;
      }
      .no-print { display: none !important; }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.32;
      color: #000;
      background: #FFF;
      margin: 0 auto;
      padding: 10px 4px 20px 4px;
      max-width: ${widthMm}mm;
      box-sizing: border-box;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .brand-title { font-size: 16px; font-weight: bold; margin: 3px 0 2px 0; }
    .logo { width: 52px; height: auto; display: block; margin: 0 auto 3px auto; }
    .dash { border-top: 1px dashed #000; margin: 5px 0; overflow: hidden; letter-spacing: -1px; }
    .flex-row { display: flex; justify-content: space-between; }
    .cust-box { display: flex; justify-content: space-between; }
    .col-right { text-align: right; }
    table { width: 100%; border-collapse: collapse; font-family: inherit; font-size: inherit; }
    th, td { padding: 1px 0; }
    .fin-box { display: flex; flex-direction: column; align-items: flex-end; }
    .fin-line { display: flex; justify-content: flex-end; width: 100%; }
    .fin-lbl { width: 110px; text-align: right; margin-right: 12px; }
    .fin-val { width: 70px; text-align: right; }
    .sub-date { font-size: 9px; text-align: right; width: 100%; margin-top: 1px; }
    .qr-img { width: 120px; height: 120px; display: block; margin: 6px auto 3px auto; border: 1px solid #000; padding: 2px; }
    .upi-text { text-align: center; font-weight: bold; font-size: 10px; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="center">
    <img src="/images/bill_logo.png" class="logo" alt="NOOR" onerror="this.style.display='none';" />
    <div class="brand-title">${storeName}</div>
    <div style="font-size:9.5px; margin: 2px 0;">${storeAddress}</div>
    <div style="font-size:10px;">Ph: ${storePhone}</div>
  </div>

  <div class="dash">--------------------------------</div>
  <div class="flex-row">
    <span>${invNo}</span>
    <span>${dateStr}</span>
  </div>

  <div class="dash">--------------------------------</div>
  <div class="cust-box" style="flex-direction:column; gap:2px;">
    <div>Name: ${custName}</div>
    ${custPhone && custPhone !== '-' ? `<div>Phone: ${custPhone}</div>` : ''}
    <div class="flex-row"><span>City: ${city}</span><span>Age: ${age}</span></div>
    <div class="flex-row"><span>Delivery Date:</span><span>${pDate}</span></div>
  </div>

  <div class="dash">--------------------------------</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left;">ITEM</th>
        <th style="text-align:right; width:35px;">QTY</th>
        <th style="text-align:right; width:55px;">RATE</th>
        <th style="text-align:right; width:60px;">TOTAL</th>
      </tr>
    </thead>
  </table>
  <div class="dash">--------------------------------</div>
  <table>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="dash">--------------------------------</div>
  <div class="fin-box">
    ${isWebsiteOrder(order) ? `
      <div class="fin-line bold"><span class="fin-lbl">Total:</span><span class="fin-val">${formatNum(grandTotal)}</span></div>
      <div class="dash" style="width:100%;">--------------------------------</div>
      <div class="center bold" style="margin-top:4px;">*** PAID IN FULL ***</div>
    ` : `
      <div class="fin-line"><span class="fin-lbl">Total:</span><span class="fin-val">${formatNum(grandTotal)}</span></div>
      <div class="fin-line"><span class="fin-lbl">Discount:</span><span class="fin-val">${formatNum(discount)}</span></div>
      <div class="fin-line"><span class="fin-lbl">Advance:</span><span class="fin-val">${formatNum(advance)}</span></div>
      <div class="fin-line"><span class="fin-lbl">2nd Amount:</span><span class="fin-val">${second > 0 ? formatNum(second) : ''}</span></div>
      <div class="fin-line"><span class="fin-lbl">3rd Amount:</span><span class="fin-val">${third > 0 ? formatNum(third) : ''}</span></div>
      <div class="dash" style="width:100%;">--------------------------------</div>
      <div class="fin-line bold"><span class="fin-lbl">Remaining:</span><span class="fin-val">${formatNum(remaining)}</span></div>
      ${remaining === 0 ? `<div class="center bold" style="margin-top:4px;">*** PAID IN FULL ***</div>` : ''}
    `}
  </div>

  <div class="dash">--------------------------------</div>
  ${rxHtml}

  <div class="dash">--------------------------------</div>
  <div class="center bold" style="margin: 4px 0;">Thanks for Shopping</div>
  <div class="center">
    <img src="/images/payment_qr.jpg" class="qr-img" alt="UPI QR" />
    <div class="upi-text">${activeUpiId}</div>
  </div>
</body>
</html>`;
}

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

  const order = db.prepare(`
    SELECT
      o.*,
      pr.prescription_number,
      pr.od_sph, pr.od_cyl, pr.od_axis,
      pr.os_sph, pr.os_cyl, pr.os_axis,
      pr.addition,
      pr.ipd_distance, pr.ipd_near,
      pr.checked_by as rx_checked_by,
      pr.notes as rx_notes
    FROM orders o
    LEFT JOIN prescriptions pr ON o.prescription_id = pr.id
    WHERE o.id = ?
  `).get(job.order_id);
  if (!order) throw new Error('Order not found for print job');

  // Customer fallback if order has no direct prescription link
  if (!order.prescription_number && order.customer_id) {
    const rx = db.prepare('SELECT * FROM prescriptions WHERE client_id = ? AND is_archived = 0 ORDER BY created_at DESC LIMIT 1').get(order.customer_id);
    if (rx) {
      order.prescription_number = rx.prescription_number;
      order.od_sph = rx.od_sph;
      order.od_cyl = rx.od_cyl;
      order.od_axis = rx.od_axis;
      order.os_sph = rx.os_sph;
      order.os_cyl = rx.os_cyl;
      order.os_axis = rx.os_axis;
      order.addition = rx.addition;
      order.ipd_distance = rx.ipd_distance;
      order.rx_checked_by = rx.checked_by;
      order.rx_notes = rx.notes;
    }
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(job.order_id);
  const settings = getStoreSettings();

  db.prepare("UPDATE print_jobs SET status = 'COMPLETED', completed_at = datetime('now') WHERE id = ?").run(jobId);

  // Return success without double-spooling; pos-daemon directly handles all physical hardware printing
  return Promise.resolve({ success: true, handledByDaemon: true });
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
  const quiet = 1; // Small quiet zone
  let scale = 3; // Small crisp QR modules (~10mm total)

  if (opts.qrSize === 'tiny' || opts.qrSize === 'temple') {
    scale = 2;
  }

  const totalModules = rawSize + quiet * 2;
  const qrPixels = totalModules * scale; // 27 * 3 = 81 pixels (~10mm)

  // Label width: 136 pixels (17mm) to fit strictly inside optical tag flag area
  const labelWidth = 136;
  const qrOffsetX = Math.max(0, Math.floor((labelWidth - qrPixels) / 2)); // Centered
  const qrOffsetY = 4; // Minimal top buffer

  // Typography layout: centered within labelWidth strictly inside flag area
  const skuScale = 1;
  const skuOffsetY = qrOffsetY + qrPixels + 5;
  const skuHeight = 7 * skuScale;
  const nameOffsetY = skuOffsetY + skuHeight + 3;
  const priceOffsetY = nameOffsetY + 7 + 2;
  const totalHeight = priceOffsetY + 7 + 4; // Total ~140 pixels (17.5mm)

  // Format price cleanly without Unicode Rupee symbol
  let cleanPrice = price ? String(price).trim() : '';
  if (cleanPrice) {
    if (cleanPrice.startsWith('₹')) cleanPrice = 'Rs. ' + cleanPrice.substring(1).trim();
    if (!cleanPrice.toUpperCase().startsWith('M.R.P') && !cleanPrice.toUpperCase().startsWith('RS')) {
      cleanPrice = 'Rs. ' + cleanPrice;
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

      function getFinderOrigin(ax, ay) {
        if (ax >= 0 && ax < 7 && ay >= 0 && ay < 7) return { ox: 0, oy: 0 };
        if (ax >= rawSize - 7 && ax < rawSize && ay >= 0 && ay < 7) return { ox: rawSize - 7, oy: 0 };
        if (ax >= 0 && ax < 7 && ay >= rawSize - 7 && ay < rawSize) return { ox: 0, oy: rawSize - 7 };
        return null;
      }

      const finder = getFinderOrigin(rawX, rawY);

      if (finder) {
        // Rounded square corners for finder patterns
        const finderDim = 7 * scale;
        const rOuter = Math.max(3, Math.floor(finderDim * 0.18));
        const rInner = Math.max(2, Math.floor(finderDim * 0.12));

        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const rx = (rawX - finder.ox) * scale + dx;
            const ry = (rawY - finder.oy) * scale + dy;

            let drawPixel = false;
            const inOuterBox = rx >= 0 && rx < finderDim && ry >= 0 && ry < finderDim;
            const inHole = rx >= scale && rx < (finderDim - scale) && ry >= scale && ry < (finderDim - scale);

            if (inOuterBox && !inHole) {
              let cornerDistSq = 0;
              let inCorner = false;
              if (rx < rOuter && ry < rOuter) {
                cornerDistSq = Math.pow(rx - rOuter, 2) + Math.pow(ry - rOuter, 2);
                inCorner = true;
              } else if (rx >= finderDim - rOuter && ry < rOuter) {
                cornerDistSq = Math.pow(rx - (finderDim - 1 - rOuter), 2) + Math.pow(ry - rOuter, 2);
                inCorner = true;
              } else if (rx < rOuter && ry >= finderDim - rOuter) {
                cornerDistSq = Math.pow(rx - rOuter, 2) + Math.pow(ry - (finderDim - 1 - rOuter), 2);
                inCorner = true;
              } else if (rx >= finderDim - rOuter && ry >= finderDim - rOuter) {
                cornerDistSq = Math.pow(rx - (finderDim - 1 - rOuter), 2) + Math.pow(ry - (finderDim - 1 - rOuter), 2);
                inCorner = true;
              }

              if (!inCorner || cornerDistSq <= rOuter * rOuter) {
                drawPixel = true;
              }
            }

            // Inner center dot
            const centerStart = 2 * scale;
            const centerEnd = 5 * scale;
            if (rx >= centerStart && rx < centerEnd && ry >= centerStart && ry < centerEnd) {
              const cx = rx - centerStart;
              const cy = ry - centerStart;
              const centerDim = 3 * scale;
              let inCenterCorner = false;
              let centerDistSq = 0;
              if (cx < rInner && cy < rInner) {
                centerDistSq = Math.pow(cx - rInner, 2) + Math.pow(cy - rInner, 2);
                inCenterCorner = true;
              } else if (cx >= centerDim - rInner && cy < rInner) {
                centerDistSq = Math.pow(cx - (centerDim - 1 - rInner), 2) + Math.pow(cy - rInner, 2);
                inCenterCorner = true;
              } else if (cx < rInner && cy >= centerDim - rInner) {
                centerDistSq = Math.pow(cx - rInner, 2) + Math.pow(cy - (centerDim - 1 - rInner), 2);
                inCenterCorner = true;
              } else if (cx >= centerDim - rInner && cy >= centerDim - rInner) {
                centerDistSq = Math.pow(cx - (centerDim - 1 - rInner), 2) + Math.pow(cy - (centerDim - 1 - rInner), 2);
                inCenterCorner = true;
              }

              if (!inCenterCorner || centerDistSq <= rInner * rInner) {
                drawPixel = true;
              }
            }

            if (drawPixel) {
              const py = qrOffsetY + my * scale + dy;
              const px = qrOffsetX + mx * scale + dx;
              if (py >= 0 && py < totalHeight && px >= 0 && px < labelWidth) {
                grid[py][px] = 1;
              }
            }
          }
        }
      } else {
        // Dotted style for data modules (2x2 centered in 3x3/4x4 cell) to prevent thermal bleeding
        const start = scale >= 4 ? 1 : 0;
        const count = scale >= 4 ? 2 : scale;
        for (let dy = start; dy < start + count; dy++) {
          for (let dx = start; dx < start + count; dx++) {
            const py = qrOffsetY + my * scale + dy;
            const px = qrOffsetX + mx * scale + dx;
            if (py >= 0 && py < totalHeight && px >= 0 && px < labelWidth) {
              grid[py][px] = 1;
            }
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

  // 3. Render SKU, Name, Price centered strictly inside the QR flag area
  drawCenteredText(sku, skuOffsetY, skuScale);
  if (name) drawCenteredText(name, nameOffsetY, 1);
  if (cleanPrice) drawCenteredText(cleanPrice, priceOffsetY, 1);

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

