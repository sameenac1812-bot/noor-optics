/**
 * server/cardImage.js – Server-side SVG Receipt Card Generator
 * Produces crisp, stand-alone vector image receipts with embedded shop logo,
 * optical prescriptions, itemized products, and due balance highlight.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Format INR currency
function formatINR(paise) {
  const inr = Math.round(Number(paise || 0) / 100);
  return '₹' + inr.toLocaleString('en-IN');
}

// Format Date & Time
function formatDateTime(dateStr) {
  if (!dateStr) {
    const d = new Date();
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (_) {
    return String(dateStr);
  }
}

// Escape XML / SVG special characters
function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Cache base64 logo
let cachedLogoDataUri = null;
function getLogoDataUri() {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const candidates = [
    path.join(__dirname, '..', 'images', 'bill_logo.png'),
    path.join(__dirname, 'logo.jpg'),
    path.join(__dirname, '..', 'images', 'noor_optic_logo.jpg')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const ext = path.extname(p).toLowerCase() === '.png' ? 'png' : 'jpeg';
        const b64 = fs.readFileSync(p).toString('base64');
        cachedLogoDataUri = `data:image/${ext};base64,${b64}`;
        return cachedLogoDataUri;
      } catch (_) {}
    }
  }
  return null;
}

/**
 * Generate high-resolution standalone SVG bill card image
 */
function generateBillCardSVG(order, items = [], prescription = null, storeSettings = {}) {
  order = order || {};
  const storeName = storeSettings.store_name || 'NOOR OPTIC';
  const storePhone = storeSettings.store_phone || '+91 93918 93128';
  const storeAddress = 'Pillar No: 45, Rethibowli, Gudimalkapur, Hyderabad';

  const orderNumber = order.order_number || order.invoice_number || ('INV-NOOR-' + String(order.id || '0001').slice(-6).toUpperCase());
  const dateStr = formatDateTime(order.created_at);

  const custName = order.customer_name || 'Valued Client';
  const custPhone = order.customer_phone || '-';
  const custCity = order.client_city || order.city || 'Hyderabad';
  const custAge = order.client_age || order.customer_age || '-';

  const totalPaise = order.total_payable_paise !== undefined ? Number(order.total_payable_paise) : (Number(order.total_payable_inr || 0) * 100);
  const subtotalPaise = order.subtotal_paise !== undefined ? Number(order.subtotal_paise) : totalPaise;
  const discountPaise = order.discount_paise !== undefined ? Number(order.discount_paise) : 0;
  const paidPaise = order.amount_paid_paise !== undefined ? Number(order.amount_paid_paise) : (Number(order.amount_paid_inr || 0) * 100);
  const advancePaise = order.advance_paid_paise !== undefined ? Number(order.advance_paid_paise) : (Number(order.advance_paid_inr || 0) * 100);
  const duePaise = order.outstanding_paise !== undefined ? Number(order.outstanding_paise) : Math.max(0, totalPaise - paidPaise);
  const isDue = duePaise > 0;

  // Payments List
  const paymentsList = [];
  if (Array.isArray(order.payments) && order.payments.length > 0) {
    order.payments.forEach((p, idx) => {
      const amt = p.amount_paise !== undefined ? Number(p.amount_paise) : Math.round(Number(p.amount_inr || p.amount || 0) * 100);
      if (amt > 0) {
        let lbl = p.notes || p.payment_stage || (idx === 0 ? 'Advance Paid' : (idx === 1 ? '2nd Payment' : (idx === 2 ? '3rd Payment' : `${idx + 1}th Payment`)));
        if (idx === 0 && !lbl.toLowerCase().includes('advance')) lbl = 'Advance Paid';
        else if (idx === 1) lbl = '2nd Payment';
        else if (idx === 2) lbl = '3rd Payment';
        paymentsList.push({ label: lbl, amountPaise: amt });
      }
    });
  }
  if (paymentsList.length === 0) {
    const adv = order.advance_paid_paise !== undefined ? Number(order.advance_paid_paise) : (order.advance_paid_inr ? Math.round(Number(order.advance_paid_inr) * 100) : 0);
    const sec = order.second_payment_paise !== undefined ? Number(order.second_payment_paise) : (order.second_payment_inr ? Math.round(Number(order.second_payment_inr) * 100) : 0);
    const thr = order.third_payment_paise !== undefined ? Number(order.third_payment_paise) : (order.third_payment_inr ? Math.round(Number(order.third_payment_inr) * 100) : 0);

    if (adv > 0) paymentsList.push({ label: 'Advance Paid', amountPaise: adv });
    if (sec > 0) paymentsList.push({ label: '2nd Payment', amountPaise: sec });
    if (thr > 0) paymentsList.push({ label: '3rd Payment', amountPaise: thr });

    if (paymentsList.length === 0 && paidPaise > 0) {
      paymentsList.push({ label: isDue ? 'Advance Paid' : 'Paid in Full', amountPaise: paidPaise });
    }
  }

  // Pickup estimation
  let pickupStr = null;
  if (order.pickup_time) {
    pickupStr = formatDateTime(order.pickup_time);
  } else {
    try {
      const d = new Date(order.created_at || Date.now());
      d.setDate(d.getDate() + 3);
      pickupStr = formatDateTime(d);
    } catch (_) {
      pickupStr = 'Ready in 3 Business Days';
    }
  }

  // Ensure prescription array is parsed if stored as JSON string
  if (!order.prescriptions && order.prescriptions_json) {
    try {
      const parsed = JSON.parse(order.prescriptions_json);
      if (Array.isArray(parsed) && parsed.length > 0) order.prescriptions = parsed;
    } catch (_) {}
  }

  // Prescription
  const rxPref = String(order.prescription_pref || '').toLowerCase();
  const isZeroPower = rxPref.includes('zero') || rxPref.includes('plano') || rxPref === 'none' || rxPref === 'fashion';
  let rx = isZeroPower ? null : (prescription || order.prescription || (order.prescriptions && order.prescriptions[0]));
  if (!rx && !isZeroPower && (order.od_sph != null || order.os_sph != null || order.prescription_number || order.prescription_id)) {
    rx = {
      id: order.prescription_id,
      prescription_number: order.prescription_number,
      od_sph: order.od_sph,
      od_cyl: order.od_cyl,
      od_axis: order.od_axis,
      os_sph: order.os_sph,
      os_cyl: order.os_cyl,
      os_axis: order.os_axis,
      addition: order.addition,
      ipd_distance: order.ipd_distance,
      checked_by: order.rx_checked_by || order.checked_by
    };
  }

  // Normalise items
  if (!items || items.length === 0) {
    items = [{
      product_name: 'Custom Eyewear / Optical Frame',
      quantity: 1,
      unit_price_paise: totalPaise,
      subtotal_paise: totalPaise
    }];
  }

  // Calculate layout heights
  const width = 440;
  const padding = 20;
  const innerW = width - (padding * 2);

  let currentY = 16;
  const logoUri = getLogoDataUri();

  // Summary box height calculation
  let sumH = 14 + 18; // top padding + subtotal
  if (discountPaise > 0) sumH += 18; // discount
  sumH += 8 + 22 + 8; // divider + grand total + divider
  sumH += Math.max(1, paymentsList.length) * 18; // payments
  sumH += 8 + 30 + 10; // divider + remaining bar + bottom padding

  // Dynamic elements positioning
  let dynamicHeight = 110 + 44 + (pickupStr ? 110 : 90); // Top + Navy pill + Client box
  if (isZeroPower) {
    dynamicHeight += 44;
  } else if (rx && (rx.od_sph != null || rx.os_sph != null || rx.prescription_number)) {
    dynamicHeight += 115;
  }
  dynamicHeight += 38 + (items.length * 36) + sumH + 48 + 75; // items + summary + pickup + footer

  let svgParts = [];

  // SVG Wrapper with Google Font embedded
  svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${dynamicHeight}" viewBox="0 0 ${width} ${dynamicHeight}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&amp;display=swap');
      text { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; }
    </style>
  </defs>
  <!-- Background -->
  <rect width="${width}" height="${dynamicHeight}" fill="#F4F7FB" rx="20"/>
`);

  // Shop Logo
  if (logoUri) {
    svgParts.push(`  <image href="${logoUri}" x="${(width - 56) / 2}" y="${currentY}" width="56" height="42" preserveAspectRatio="xMidYMid meet"/>`);
    currentY += 46;
  } else {
    currentY += 10;
  }

  // Shop Name
  svgParts.push(`  <text x="${width / 2}" y="${currentY + 16}" font-size="20" font-weight="900" fill="#0C2B4E" text-anchor="middle" letter-spacing="1.5">${escapeXml(storeName.toUpperCase())}</text>`);
  currentY += 24;

  // Main Card Body
  const cardTop = currentY;
  const cardH = dynamicHeight - cardTop - 16;
  svgParts.push(`  <rect x="${padding}" y="${cardTop}" width="${innerW}" height="${cardH}" fill="#FFFFFF" stroke="#DCE6F1" stroke-width="1.5" rx="18"/>`);

  // Navy Top Pill
  svgParts.push(`  <path d="M ${padding + 18} ${cardTop} L ${padding + innerW - 18} ${cardTop} Q ${padding + innerW} ${cardTop} ${padding + innerW} ${cardTop + 18} L ${padding + innerW} ${cardTop + 44} L ${padding} ${cardTop + 44} L ${padding} ${cardTop + 18} Q ${padding} ${cardTop} ${padding + 18} ${cardTop} Z" fill="#0C2B4E"/>`);
  svgParts.push(`  <text x="${padding + 16}" y="${cardTop + 27}" font-size="13" font-weight="800" font-family="monospace" fill="#FFFFFF">${escapeXml(orderNumber)}</text>`);
  svgParts.push(`  <text x="${width - padding - 16}" y="${cardTop + 27}" font-size="12" font-weight="500" fill="#E2E8F0" text-anchor="end">${escapeXml(dateStr)}</text>`);

  currentY = cardTop + 44 + 14;

  // Customer Details Box
  const clientBoxX = padding + 14;
  const clientBoxW = innerW - 28;
  const clientBoxH = pickupStr ? 96 : 78;
  svgParts.push(`  <rect x="${clientBoxX}" y="${currentY}" width="${clientBoxW}" height="${clientBoxH}" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="1" rx="10"/>`);
  svgParts.push(`  <text x="${clientBoxX + 12}" y="${currentY + 22}" font-size="13" font-weight="700" fill="#1E293B">👤 ${escapeXml(custName)}</text>`);
  svgParts.push(`  <line x1="${clientBoxX + 10}" y1="${currentY + 31}" x2="${clientBoxX + clientBoxW - 10}" y2="${currentY + 31}" stroke="#E2E8F0" stroke-width="1"/>`);
  svgParts.push(`  <text x="${clientBoxX + 12}" y="${currentY + 48}" font-size="12" font-weight="500" fill="#334155">📞 ${escapeXml(custPhone)}</text>`);
  svgParts.push(`  <line x1="${clientBoxX + 10}" y1="${currentY + 56}" x2="${clientBoxX + clientBoxW - 10}" y2="${currentY + 56}" stroke="#E2E8F0" stroke-width="1"/>`);
  svgParts.push(`  <text x="${clientBoxX + 12}" y="${currentY + 71}" font-size="12" font-weight="500" fill="#475569">📍 ${escapeXml(custCity)}</text>`);
  svgParts.push(`  <text x="${clientBoxX + clientBoxW - 12}" y="${currentY + 71}" font-size="12" font-weight="500" fill="#475569" text-anchor="end">🪪 Age: ${escapeXml(String(custAge))}</text>`);
  if (pickupStr) {
    svgParts.push(`  <line x1="${clientBoxX + 10}" y1="${currentY + 77}" x2="${clientBoxX + clientBoxW - 10}" y2="${currentY + 77}" stroke="#E2E8F0" stroke-width="1"/>`);
    svgParts.push(`  <text x="${clientBoxX + 12}" y="${currentY + 90}" font-size="11" font-weight="700" fill="#0284C7">📅 Delivery Date: ${escapeXml(pickupStr)}</text>`);
  }

  currentY += clientBoxH + 14;

  // Optical Prescription Box
  if (isZeroPower) {
    svgParts.push(`  <rect x="${clientBoxX}" y="${currentY}" width="${clientBoxW}" height="34" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="1" rx="8"/>`);
    svgParts.push(`  <text x="${clientBoxX + (clientBoxW / 2)}" y="${currentY + 22}" font-size="12" font-weight="700" fill="#334155" text-anchor="middle">👓 Zero Power (Plano / Blue-Light Screen Filter only)</text>`);
    currentY += 34 + 14;
  } else if (rx && (rx.od_sph != null || rx.os_sph != null)) {
    const rxBoxH = 105;
    svgParts.push(`  <rect x="${clientBoxX}" y="${currentY}" width="${clientBoxW}" height="${rxBoxH}" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1" rx="10"/>`);
    svgParts.push(`  <text x="${clientBoxX + 12}" y="${currentY + 18}" font-size="11" font-weight="800" fill="#0C2B4E" letter-spacing="0.5">OPTICAL EYE PRESCRIPTION${rx.prescription_number ? ' (' + escapeXml(rx.prescription_number) + ')' : ''}</text>`);
    if (rx.ipd_distance) {
      svgParts.push(`  <text x="${clientBoxX + clientBoxW - 12}" y="${currentY + 18}" font-size="11" font-weight="600" fill="#475569" text-anchor="end">IPD: ${escapeXml(String(rx.ipd_distance))} mm</text>`);
    }

    const rxHdrY = currentY + 26;
    svgParts.push(`  <rect x="${clientBoxX + 8}" y="${rxHdrY}" width="${clientBoxW - 16}" height="20" fill="#EBF3FB" rx="4"/>`);
    svgParts.push(`  <text x="${clientBoxX + 14}" y="${rxHdrY + 14}" font-size="10" font-weight="800" fill="#0C2B4E">EYE</text>`);
    svgParts.push(`  <text x="${clientBoxX + 110}" y="${rxHdrY + 14}" font-size="10" font-weight="800" fill="#0C2B4E" text-anchor="middle">SPH</text>`);
    svgParts.push(`  <text x="${clientBoxX + 185}" y="${rxHdrY + 14}" font-size="10" font-weight="800" fill="#0C2B4E" text-anchor="middle">CYL</text>`);
    svgParts.push(`  <text x="${clientBoxX + 260}" y="${rxHdrY + 14}" font-size="10" font-weight="800" fill="#0C2B4E" text-anchor="middle">AXIS</text>`);
    svgParts.push(`  <text x="${clientBoxX + 335}" y="${rxHdrY + 14}" font-size="10" font-weight="800" fill="#0C2B4E" text-anchor="middle">ADD</text>`);

    // OD
    const odY = rxHdrY + 36;
    svgParts.push(`  <text x="${clientBoxX + 14}" y="${odY}" font-size="11" font-weight="600" fill="#1E293B">OD (Right)</text>`);
    svgParts.push(`  <text x="${clientBoxX + 110}" y="${odY}" font-size="11" font-weight="600" fill="#1E293B" text-anchor="middle">${escapeXml(rx.od_sph || '0.00')}</text>`);
    svgParts.push(`  <text x="${clientBoxX + 185}" y="${odY}" font-size="11" font-weight="600" fill="#1E293B" text-anchor="middle">${escapeXml(rx.od_cyl || '0.00')}</text>`);
    svgParts.push(`  <text x="${clientBoxX + 260}" y="${odY}" font-size="11" font-weight="600" fill="#1E293B" text-anchor="middle">${escapeXml(rx.od_axis ? rx.od_axis + '°' : '-')}</text>`);
    svgParts.push(`  <text x="${clientBoxX + 335}" y="${odY}" font-size="11" font-weight="600" fill="#1E293B" text-anchor="middle">${escapeXml(rx.addition || '-')}</text>`);

    // OS
    const osY = odY + 24;
    svgParts.push(`  <text x="${clientBoxX + 14}" y="${osY}" font-size="11" font-weight="600" fill="#1E293B">OS (Left)</text>`);
    svgParts.push(`  <text x="${clientBoxX + 110}" y="${osY}" font-size="11" font-weight="600" fill="#1E293B" text-anchor="middle">${escapeXml(rx.os_sph || '0.00')}</text>`);
    svgParts.push(`  <text x="${clientBoxX + 185}" y="${osY}" font-size="11" font-weight="600" fill="#1E293B" text-anchor="middle">${escapeXml(rx.os_cyl || '0.00')}</text>`);
    svgParts.push(`  <text x="${clientBoxX + 260}" y="${osY}" font-size="11" font-weight="600" fill="#1E293B" text-anchor="middle">${escapeXml(rx.os_axis ? rx.os_axis + '°' : '-')}</text>`);
    svgParts.push(`  <text x="${clientBoxX + 335}" y="${osY}" font-size="11" font-weight="600" fill="#1E293B" text-anchor="middle">${escapeXml(rx.addition || '-')}</text>`);

    currentY += rxBoxH + 14;
  }

  // Items Table Header
  svgParts.push(`  <rect x="${clientBoxX}" y="${currentY}" width="${clientBoxW}" height="28" fill="#EBF3FB" rx="6"/>`);
  svgParts.push(`  <text x="${clientBoxX + 12}" y="${currentY + 18}" font-size="11" font-weight="800" fill="#0C2B4E">ITEM / DESCRIPTION</text>`);
  svgParts.push(`  <text x="${clientBoxX + clientBoxW - 130}" y="${currentY + 18}" font-size="11" font-weight="800" fill="#0C2B4E" text-anchor="middle">QTY</text>`);
  svgParts.push(`  <text x="${clientBoxX + clientBoxW - 75}" y="${currentY + 18}" font-size="11" font-weight="800" fill="#0C2B4E" text-anchor="middle">PRICE</text>`);
  svgParts.push(`  <text x="${clientBoxX + clientBoxW - 12}" y="${currentY + 18}" font-size="11" font-weight="800" fill="#0C2B4E" text-anchor="end">TOTAL</text>`);

  currentY += 28 + 6;

  // Item Rows
  items.forEach(it => {
    const itName = it.product_name || it.name || 'Optical Item';
    const itQty = it.quantity || 1;
    const itPrice = it.unit_price_paise ? (it.unit_price_paise / 100) : (it.unit_price_inr || (it.subtotal_paise / 100 / itQty));
    const itTotal = it.subtotal_paise ? (it.subtotal_paise / 100) : (itPrice * itQty);

    const truncName = itName.length > 25 ? (itName.slice(0, 24) + '...') : itName;

    svgParts.push(`  <text x="${clientBoxX + 12}" y="${currentY + 18}" font-size="12" font-weight="600" fill="#1E293B">${escapeXml(truncName)}</text>`);
    svgParts.push(`  <text x="${clientBoxX + clientBoxW - 130}" y="${currentY + 18}" font-size="12" font-weight="500" fill="#475569" text-anchor="middle">${itQty}</text>`);
    svgParts.push(`  <text x="${clientBoxX + clientBoxW - 75}" y="${currentY + 18}" font-size="12" font-weight="500" fill="#475569" text-anchor="middle">${Math.round(itPrice).toLocaleString('en-IN')}</text>`);
    svgParts.push(`  <text x="${clientBoxX + clientBoxW - 12}" y="${currentY + 18}" font-size="12" font-weight="800" fill="#0C2B4E" text-anchor="end">${Math.round(itTotal).toLocaleString('en-IN')}/=</text>`);
    svgParts.push(`  <line x1="${clientBoxX + 8}" y1="${currentY + 26}" x2="${clientBoxX + clientBoxW - 8}" y2="${currentY + 26}" stroke="#F1F5F9" stroke-width="1"/>`);

    currentY += 32;
  });

  currentY += 8;

  // Summary Box (Right Aligned, matching reference payment breakdown)
  const sumW = 224;
  const sumX = clientBoxX + clientBoxW - sumW;

  svgParts.push(`  <rect x="${sumX}" y="${currentY}" width="${sumW}" height="${sumH}" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1" rx="10"/>`);
  let sumRowY = currentY + 12;

  // Subtotal
  svgParts.push(`  <text x="${sumX + 12}" y="${sumRowY + 10}" font-size="11.5" font-weight="500" fill="#475569">Subtotal:</text>`);
  svgParts.push(`  <text x="${sumX + sumW - 12}" y="${sumRowY + 10}" font-size="11.5" font-weight="600" fill="#1E293B" text-anchor="end">${formatINR(subtotalPaise)}</text>`);
  sumRowY += 18;

  // Discount (if any)
  if (discountPaise > 0) {
    svgParts.push(`  <text x="${sumX + 12}" y="${sumRowY + 10}" font-size="11.5" font-weight="500" fill="#D97706">Discount:</text>`);
    svgParts.push(`  <text x="${sumX + sumW - 12}" y="${sumRowY + 10}" font-size="11.5" font-weight="600" fill="#D97706" text-anchor="end">-${formatINR(discountPaise)}</text>`);
    sumRowY += 18;
  }

  // Divider
  svgParts.push(`  <line x1="${sumX + 10}" y1="${sumRowY + 3}" x2="${sumX + sumW - 10}" y2="${sumRowY + 3}" stroke="#E2E8F0" stroke-width="1"/>`);
  sumRowY += 8;

  // Grand Total
  svgParts.push(`  <text x="${sumX + 12}" y="${sumRowY + 12}" font-size="13.5" font-weight="800" fill="#0F172A">Grand Total:</text>`);
  svgParts.push(`  <text x="${sumX + sumW - 12}" y="${sumRowY + 12}" font-size="13.5" font-weight="800" fill="#0F172A" text-anchor="end">${formatINR(totalPaise)}</text>`);
  sumRowY += 22;

  // Divider
  svgParts.push(`  <line x1="${sumX + 10}" y1="${sumRowY + 3}" x2="${sumX + sumW - 10}" y2="${sumRowY + 3}" stroke="#F1F5F9" stroke-width="1"/>`);
  sumRowY += 6;

  // Each Payment Made
  paymentsList.forEach(p => {
    svgParts.push(`  <text x="${sumX + 12}" y="${sumRowY + 10}" font-size="11.5" font-weight="700" fill="#15803D">${escapeXml(p.label)}:</text>`);
    svgParts.push(`  <text x="${sumX + sumW - 12}" y="${sumRowY + 10}" font-size="12" font-weight="700" fill="#15803D" text-anchor="end">${formatINR(p.amountPaise)}</text>`);
    sumRowY += 18;
  });

  // Divider
  svgParts.push(`  <line x1="${sumX + 10}" y1="${sumRowY + 4}" x2="${sumX + sumW - 10}" y2="${sumRowY + 4}" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="3,3"/>`);
  sumRowY += 10;

  // Remaining Due (REM)
  const barY = sumRowY;
  const barH = 28;
  if (isDue) {
    svgParts.push(`  <rect x="${sumX + 4}" y="${barY}" width="${sumW - 8}" height="${barH}" fill="#EF4444" rx="6"/>`);
    svgParts.push(`  <text x="${sumX + 12}" y="${barY + 18}" font-size="12" font-weight="800" fill="#FFFFFF">Remaining Due (REM):</text>`);
    svgParts.push(`  <text x="${sumX + sumW - 12}" y="${barY + 18}" font-size="12" font-weight="800" fill="#FFFFFF" text-anchor="end">${formatINR(duePaise)}</text>`);
  } else {
    svgParts.push(`  <rect x="${sumX + 4}" y="${barY}" width="${sumW - 8}" height="${barH}" fill="#10B981" rx="6"/>`);
    svgParts.push(`  <text x="${sumX + 12}" y="${barY + 18}" font-size="12" font-weight="800" fill="#FFFFFF">Remaining Due (REM):</text>`);
    svgParts.push(`  <text x="${sumX + sumW - 12}" y="${barY + 18}" font-size="12" font-weight="800" fill="#FFFFFF" text-anchor="end">₹0 (Paid in Full)</text>`);
  }

  // Pick Up Box
  const pickY = currentY + sumH + 8;
  const pickH = 44;
  svgParts.push(`  <rect x="${sumX}" y="${pickY}" width="${sumW}" height="${pickH}" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1" rx="8"/>`);
  svgParts.push(`  <text x="${sumX + 10}" y="${pickY + 17}" font-size="11" font-weight="800" fill="#0C2B4E">📅  Pick Up</text>`);
  svgParts.push(`  <text x="${sumX + 10}" y="${pickY + 34}" font-size="11" font-weight="700" fill="#1E293B">${escapeXml(pickupStr)}</text>`);

  currentY = pickY + pickH + 22;

  // Footer
  svgParts.push(`  <text x="${width / 2}" y="${currentY}" font-size="15" font-weight="900" fill="#0C2B4E" text-anchor="middle">Thank You</text>`);
  svgParts.push(`  <text x="${width / 2}" y="${currentY + 16}" font-size="10.5" font-weight="600" fill="#64748B" text-anchor="middle">${escapeXml(storeName)} • Ph: ${escapeXml(storePhone)}</text>`);
  svgParts.push(`  <text x="${width / 2}" y="${currentY + 29}" font-size="9.5" font-weight="400" fill="#94A3B8" text-anchor="middle">${escapeXml(storeAddress)}</text>`);

  svgParts.push(`</svg>`);

  return svgParts.join('\n');
}

module.exports = {
  generateBillCardSVG,
  formatINR,
  formatDateTime
};

