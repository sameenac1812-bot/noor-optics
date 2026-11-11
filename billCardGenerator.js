/**
 * billCardGenerator.js – Digital Bill Card & Image Sender for Noor Optics
 * Generates pixel-perfect, high-resolution mobile receipt card images
 * matching the boutique store design with logo, prescription diopters,
 * product breakdown, financial due balance, and instant WhatsApp / Download sharing.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BillCardGenerator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Format currency in Indian Rupees
  function formatMoney(paiseOrInr, isPaise = false) {
    const val = isPaise ? (Number(paiseOrInr || 0) / 100) : Number(paiseOrInr || 0);
    return '₹' + Math.round(val).toLocaleString('en-IN');
  }

  // Format date and time
  function formatDateTime(isoOrStr) {
    if (!isoOrStr) {
      const d = new Date();
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    try {
      const d = new Date(isoOrStr);
      if (isNaN(d.getTime())) return String(isoOrStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (_) {
      return String(isoOrStr);
    }
  }

  // Canvas helper for rounded rectangles across all browser versions
  function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke, strokeColor, fillColor) {
    if (typeof radius === 'number') {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
      radius = Object.assign({ tl: 0, tr: 0, br: 0, bl: 0 }, radius);
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill && fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (stroke && strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
  }

  // Preload logo image
  function loadLogoImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Extract clean bill details from diverse order payloads
  function normalizeOrderData(order, directItems, directRx, storeSettings) {
    order = order || {};
    const globalState = typeof window !== 'undefined' ? window.state : null;
    storeSettings = storeSettings || (globalState && globalState.storeSettings) || {};

    const storeName = storeSettings.store_name || 'NOOR OPTIC';
    const storePhone = storeSettings.store_phone || '+91 93918 93128';
    const storeAddress = storeSettings.store_address || 'Pillar No: 45, Rethibowli, Gudimalkapur, Hyderabad';

    const orderNumber = order.order_number || order.invoice_number || ('INV-NOOR-' + String(order.id || '0001').slice(-6).toUpperCase());
    const createdAt = order.created_at || new Date().toISOString();
    const dateFormatted = formatDateTime(createdAt);

    const customerName = order.customer_name || 'Valued Client';
    const customerPhone = order.customer_phone || '-';
    const customerCity = order.client_city || order.city || 'Hyderabad';
    const customerAge = order.client_age || order.customer_age || '-';

    // Financial calculations
    const totalPaise = (order.total_payable_paise !== undefined && order.total_payable_paise !== null)
      ? Number(order.total_payable_paise)
      : (order.total_payable_inr ? Math.round(Number(order.total_payable_inr) * 100) : 0);

    const subtotalPaise = (order.subtotal_paise !== undefined && order.subtotal_paise !== null)
      ? Number(order.subtotal_paise)
      : totalPaise;

    const discountPaise = (order.discount_paise !== undefined && order.discount_paise !== null)
      ? Number(order.discount_paise)
      : 0;

    const paidPaise = (order.amount_paid_paise !== undefined && order.amount_paid_paise !== null)
      ? Number(order.amount_paid_paise)
      : (order.amount_paid_inr ? Math.round(Number(order.amount_paid_inr) * 100) : 0);

    const advancePaise = (order.advance_paid_paise !== undefined && order.advance_paid_paise !== null)
      ? Number(order.advance_paid_paise)
      : (order.advance_paid_inr ? Math.round(Number(order.advance_paid_inr) * 100) : paidPaise);

    const duePaise = (order.outstanding_paise !== undefined && order.outstanding_paise !== null)
      ? Number(order.outstanding_paise)
      : Math.max(0, totalPaise - paidPaise);

    const isDue = duePaise > 0;

    // Multi-stage payments list
    const paymentsList = [];
    if (Array.isArray(order.payments) && order.payments.length > 0) {
      order.payments.forEach((p, idx) => {
        const amt = p.amount_paise !== undefined ? Number(p.amount_paise) : Math.round(Number(p.amount_inr || p.amount || 0) * 100);
        if (amt > 0) {
          let lbl = p.notes || p.payment_stage || (idx === 0 ? 'Advance Paid' : (idx === 1 ? '2nd Payment' : (idx === 2 ? '3rd Payment' : `${idx + 1}th Payment`)));
          if (idx === 0 && !lbl.toLowerCase().includes('advance')) lbl = 'Advance Paid';
          else if (idx === 1) lbl = '2nd Payment';
          else if (idx === 2) lbl = '3rd Payment';
          paymentsList.push({
            label: lbl,
            amountPaise: amt,
            amountInr: formatMoney(amt, true)
          });
        }
      });
    }

    if (paymentsList.length === 0) {
      const adv = (order.advance_paid_paise !== undefined && order.advance_paid_paise !== null)
        ? Number(order.advance_paid_paise)
        : (order.advance_paid_inr ? Math.round(Number(order.advance_paid_inr) * 100) : 0);
      const sec = (order.second_payment_paise !== undefined && order.second_payment_paise !== null)
        ? Number(order.second_payment_paise)
        : (order.second_payment_inr ? Math.round(Number(order.second_payment_inr) * 100) : 0);
      const thr = (order.third_payment_paise !== undefined && order.third_payment_paise !== null)
        ? Number(order.third_payment_paise)
        : (order.third_payment_inr ? Math.round(Number(order.third_payment_inr) * 100) : 0);

      if (adv > 0) paymentsList.push({ label: 'Advance Paid', amountPaise: adv, amountInr: formatMoney(adv, true) });
      if (sec > 0) paymentsList.push({ label: '2nd Payment', amountPaise: sec, amountInr: formatMoney(sec, true) });
      if (thr > 0) paymentsList.push({ label: '3rd Payment', amountPaise: thr, amountInr: formatMoney(thr, true) });

      if (paymentsList.length === 0 && paidPaise > 0) {
        paymentsList.push({
          label: isDue ? 'Advance Paid' : 'Paid in Full',
          amountPaise: paidPaise,
          amountInr: formatMoney(paidPaise, true)
        });
      }
    }

    // Pickup time
    let pickupFormatted = null;
    if (order.pickup_time) {
      pickupFormatted = formatDateTime(order.pickup_time);
    } else {
      // Default estimation: 3 days from creation
      try {
        const d = new Date(createdAt);
        d.setDate(d.getDate() + 3);
        pickupFormatted = formatDateTime(d);
      } catch (_) {
        pickupFormatted = 'Ready in 3 Business Days';
      }
    }

    // Ensure prescription array is parsed if stored as JSON string
    if (!order.prescriptions && order.prescriptions_json) {
      try {
        const parsed = JSON.parse(order.prescriptions_json);
        if (Array.isArray(parsed) && parsed.length > 0) {
          order.prescriptions = parsed;
        }
      } catch (_) {}
    }

    // Prescription evaluation
    const rxPref = String(order.prescription_pref || '').toLowerCase();
    const hasExplicitZeroPref = rxPref.includes('zero') || rxPref.includes('plano') || rxPref === 'none' || rxPref === 'fashion';

    let rx = directRx || order.prescription || (order.prescriptions && order.prescriptions[0]) || null;
    const hasLinkedRx = Boolean(
      rx ||
      order.prescription_id ||
      (order.prescriptions && order.prescriptions.length > 0) ||
      order.prescriptions_json
    );

    if (!rx && (order.od_sph != null || order.os_sph != null || order.prescription_number || order.prescription_id)) {
      if (hasLinkedRx || !hasExplicitZeroPref) {
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
    }

    const hasRealRx = Boolean(
      rx && (
        rx.od_sph != null || rx.os_sph != null ||
        rx.od_cyl != null || rx.os_cyl != null ||
        rx.prescription_number || rx.prescriptionNumber ||
        rx.addition || rx.ipd_distance
      )
    );

    const isZeroPower = hasExplicitZeroPref && !hasLinkedRx && !hasRealRx;
    if (isZeroPower) {
      rx = null;
    }

    // Items list
    let items = directItems || order.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      items = [{
        product_name: 'Custom Eyewear / Optical Frame',
        quantity: 1,
        unit_price_paise: totalPaise,
        subtotal_paise: totalPaise
      }];
    }

    return {
      storeName,
      storePhone,
      storeAddress,
      orderNumber,
      createdAt,
      dateFormatted,
      customerName,
      customerPhone,
      customerCity,
      customerAge,
      subtotalPaise,
      subtotalInr: formatMoney(subtotalPaise, true),
      discountPaise,
      discountInr: formatMoney(discountPaise, true),
      totalPaise,
      totalInr: formatMoney(totalPaise, true),
      paidPaise,
      paidInr: formatMoney(paidPaise, true),
      advancePaise,
      advanceInr: formatMoney(advancePaise, true),
      duePaise,
      dueInr: formatMoney(duePaise, true),
      isDue,
      paymentsList,
      pickupFormatted,
      isZeroPower,
      rx,
      items
    };
  }

  // Draw the high-resolution canvas matching the user's reference image
  async function generateBillCardCanvas(orderData, scale = 2) {
    const data = normalizeOrderData(orderData.order, orderData.items, orderData.rx, orderData.storeSettings);

    // Compute dynamic canvas height based on items and prescription
    const cardWidth = 440;
    const paddingX = 20;
    const innerWidth = cardWidth - (paddingX * 2);

    let calculatedHeight = 110; // Top logo and title space
    calculatedHeight += 44;     // Navy header pill
    calculatedHeight += (data.pickupFormatted ? 119 : 95);     // Client details box

    if (data.isZeroPower) {
      calculatedHeight += 48;   // Zero power banner
    } else if (data.rx && (data.rx.od_sph != null || data.rx.os_sph != null || data.rx.prescription_number)) {
      calculatedHeight += 115;  // Prescription table
    }

    // Items table height
    calculatedHeight += 38;     // Items header
    calculatedHeight += Math.max(1, data.items.length) * 36; // Rows
    calculatedHeight += 12;

    // Dynamic Summary Box Height
    let sumContentH = 14; // top padding
    sumContentH += 18; // Subtotal
    if (data.discountPaise > 0) {
      sumContentH += 18; // Discount
    }
    sumContentH += 8; // separator
    sumContentH += 22; // Grand Total
    sumContentH += 8; // separator
    sumContentH += Math.max(1, data.paymentsList.length) * 18; // Each payment made
    sumContentH += 8; // separator
    sumContentH += 30; // Remaining Due (REM) bar
    sumContentH += 10; // bottom padding
    const summaryBoxH = sumContentH;

    // Financial summary box + Pick up box
    calculatedHeight += summaryBoxH + 50 + 20;

    // Footer space
    calculatedHeight += 75;

    const canvas = document.createElement('canvas');
    canvas.width = cardWidth * scale;
    canvas.height = calculatedHeight * scale;

    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // 1. Background (Light elegant gray-blue canvas backing)
    ctx.fillStyle = '#F4F7FB';
    ctx.fillRect(0, 0, cardWidth, calculatedHeight);

    // 2. Preload Shop Logo
    let logoImg = await loadLogoImage('/images/bill_logo.png');
    if (!logoImg) logoImg = await loadLogoImage('/images/noor_optic_logo.jpg');

    let currentY = 16;

    // Draw Top Shop Icon / Logo
    if (logoImg) {
      const logoW = 54;
      const logoH = 40;
      const logoX = (cardWidth - logoW) / 2;
      ctx.drawImage(logoImg, logoX, currentY, logoW, logoH);
      currentY += 46;
    } else {
      // Vector Store Icon fallback
      ctx.strokeStyle = '#0C2B4E';
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, (cardWidth - 44) / 2, currentY, 44, 32, 6, false, true, '#0C2B4E');
      currentY += 40;
    }

    // Shop Title: NOOR OPTIC
    ctx.font = 'bold 20px "Plus Jakarta Sans", -apple-system, sans-serif';
    ctx.fillStyle = '#0C2B4E';
    ctx.textAlign = 'center';
    ctx.fillText(data.storeName.toUpperCase(), cardWidth / 2, currentY);
    currentY += 18;

    // 3. Main White Card Container
    const cardTop = currentY;
    const cardHeight = calculatedHeight - cardTop - 16;
    drawRoundedRect(ctx, paddingX, cardTop, innerWidth, cardHeight, 18, true, true, '#DCE6F1', '#FFFFFF');

    // 4. Navy Header Pill Bar inside card
    const navyHeaderH = 44;
    drawRoundedRect(ctx, paddingX, cardTop, innerWidth, navyHeaderH, { tl: 18, tr: 18, br: 0, bl: 0 }, true, false, null, '#0C2B4E');

    // Invoice number on left
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px "Plus Jakarta Sans", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(data.orderNumber, paddingX + 16, cardTop + 27);

    // Date & Time on right
    ctx.textAlign = 'right';
    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText(data.dateFormatted, cardWidth - paddingX - 16, cardTop + 27);

    currentY = cardTop + navyHeaderH + 14;

    // 5. Customer Info Box
    const clientBoxX = paddingX + 14;
    const clientBoxW = innerWidth - 28;
    const clientBoxH = data.pickupFormatted ? 104 : 80;
    drawRoundedRect(ctx, clientBoxX, currentY, clientBoxW, clientBoxH, 10, true, true, '#E2E8F0', '#F8FAFC');

    // Row 1: Name
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#1E293B';
    ctx.fillText('👤  ' + data.customerName, clientBoxX + 12, currentY + 22);

    // Divider line
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(clientBoxX + 10, currentY + 31);
    ctx.lineTo(clientBoxX + clientBoxW - 10, currentY + 31);
    ctx.stroke();

    // Row 2: Phone
    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('📞  ' + data.customerPhone, clientBoxX + 12, currentY + 48);

    // Divider line
    ctx.beginPath();
    ctx.moveTo(clientBoxX + 10, currentY + 56);
    ctx.lineTo(clientBoxX + clientBoxW - 10, currentY + 56);
    ctx.stroke();

    // Row 3: City & Age
    ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('📍  ' + data.customerCity, clientBoxX + 12, currentY + 72);

    ctx.textAlign = 'right';
    ctx.fillText('🪪  Age: ' + data.customerAge, clientBoxX + clientBoxW - 12, currentY + 72);

    // Row 4: Delivery / Pick Up Date (under City column)
    if (data.pickupFormatted) {
      ctx.beginPath();
      ctx.moveTo(clientBoxX + 10, currentY + 80);
      ctx.lineTo(clientBoxX + clientBoxW - 10, currentY + 80);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#0284C7';
      ctx.fillText('📅  Delivery Date: ' + data.pickupFormatted, clientBoxX + 12, currentY + 95);
    }

    currentY += clientBoxH + 14;

    // 6. Optical Prescription Details (if present)
    if (data.isZeroPower) {
      const zpW = clientBoxW;
      const zpH = 36;
      drawRoundedRect(ctx, clientBoxX, currentY, zpW, zpH, 8, true, true, '#CBD5E1', '#F1F5F9');
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('👓  Zero Power (Plano / Blue-Light Screen Filter only)', clientBoxX + (zpW / 2), currentY + 22);
      currentY += zpH + 14;
    } else if (data.rx && (data.rx.od_sph != null || data.rx.os_sph != null || data.rx.prescription_number)) {
      const rxBoxH = 105;
      drawRoundedRect(ctx, clientBoxX, currentY, clientBoxW, rxBoxH, 10, true, true, '#CBD5E1', '#F8FAFC');

      // Title
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#0C2B4E';
      ctx.fillText(data.rx.prescription_number ? 'OPTICAL EYE PRESCRIPTION (' + data.rx.prescription_number + ')' : 'OPTICAL EYE PRESCRIPTION', clientBoxX + 12, currentY + 18);

      if (data.rx.ipd_distance) {
        ctx.textAlign = 'right';
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('IPD: ' + data.rx.ipd_distance + ' mm', clientBoxX + clientBoxW - 12, currentY + 18);
      }

      // Rx Table Header
      const rxHeaderY = currentY + 26;
      drawRoundedRect(ctx, clientBoxX + 8, rxHeaderY, clientBoxW - 16, 20, 4, true, false, null, '#EBF3FB');
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#0C2B4E';
      ctx.textAlign = 'left';
      ctx.fillText('EYE', clientBoxX + 14, rxHeaderY + 14);
      ctx.textAlign = 'center';
      ctx.fillText('SPH', clientBoxX + 110, rxHeaderY + 14);
      ctx.fillText('CYL', clientBoxX + 185, rxHeaderY + 14);
      ctx.fillText('AXIS', clientBoxX + 260, rxHeaderY + 14);
      ctx.fillText('ADD', clientBoxX + 335, rxHeaderY + 14);

      // OD Row
      const odY = rxHeaderY + 36;
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#1E293B';
      ctx.textAlign = 'left';
      ctx.fillText('OD (Right)', clientBoxX + 14, odY);
      ctx.textAlign = 'center';
      ctx.fillText(data.rx.od_sph || '0.00', clientBoxX + 110, odY);
      ctx.fillText(data.rx.od_cyl || '0.00', clientBoxX + 185, odY);
      ctx.fillText(data.rx.od_axis ? (data.rx.od_axis + '°') : '-', clientBoxX + 260, odY);
      ctx.fillText(data.rx.addition || '-', clientBoxX + 335, odY);

      // OS Row
      const osY = odY + 24;
      ctx.fillText('OS (Left)', clientBoxX + 14, osY);
      ctx.textAlign = 'center';
      ctx.fillText(data.rx.os_sph || '0.00', clientBoxX + 110, osY);
      ctx.fillText(data.rx.os_cyl || '0.00', clientBoxX + 185, osY);
      ctx.fillText(data.rx.os_axis ? (data.rx.os_axis + '°') : '-', clientBoxX + 260, osY);
      ctx.fillText(data.rx.addition || '-', clientBoxX + 335, osY);

      currentY += rxBoxH + 14;
    }

    // 7. Products Table
    const tblHeaderH = 30;
    drawRoundedRect(ctx, clientBoxX, currentY, clientBoxW, tblHeaderH, 6, true, false, null, '#EBF3FB');

    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#0C2B4E';
    ctx.textAlign = 'left';
    ctx.fillText('ITEM / DESCRIPTION', clientBoxX + 12, currentY + 19);

    ctx.textAlign = 'center';
    ctx.fillText('QTY', clientBoxX + clientBoxW - 130, currentY + 19);
    ctx.fillText('PRICE', clientBoxX + clientBoxW - 75, currentY + 19);

    ctx.textAlign = 'right';
    ctx.fillText('TOTAL', clientBoxX + clientBoxW - 12, currentY + 19);

    currentY += tblHeaderH + 6;

    // Items List
    data.items.forEach((it) => {
      const itName = it.product_name || it.name || 'Optical Item';
      const itQty = it.quantity || 1;
      const itPrice = it.unit_price_paise ? (it.unit_price_paise / 100) : (it.unit_price_inr || (it.subtotal_paise / 100 / itQty));
      const itTotal = it.subtotal_paise ? (it.subtotal_paise / 100) : (itPrice * itQty);

      ctx.textAlign = 'left';
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#1E293B';

      // Truncate name if too wide
      let dispName = itName;
      if (ctx.measureText(dispName).width > 220) {
        while (ctx.measureText(dispName + '...').width > 220 && dispName.length > 5) {
          dispName = dispName.slice(0, -1);
        }
        dispName += '...';
      }
      ctx.fillText(dispName, clientBoxX + 12, currentY + 18);

      ctx.textAlign = 'center';
      ctx.font = '500 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(String(itQty), clientBoxX + clientBoxW - 130, currentY + 18);
      ctx.fillText(Math.round(itPrice).toLocaleString('en-IN'), clientBoxX + clientBoxW - 75, currentY + 18);

      ctx.textAlign = 'right';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#0C2B4E';
      ctx.fillText(Math.round(itTotal).toLocaleString('en-IN') + '/=', clientBoxX + clientBoxW - 12, currentY + 18);

      // Light underline
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(clientBoxX + 8, currentY + 26);
      ctx.lineTo(clientBoxX + clientBoxW - 8, currentY + 26);
      ctx.stroke();

      currentY += 32;
    });

    currentY += 8;

    // 8. Financial Summary Box + Pick Up Box (Aligned Right, matching user's exact payment breakdown reference)
    const summaryBoxW = 230;
    const summaryBoxX = clientBoxX + clientBoxW - summaryBoxW;

    drawRoundedRect(ctx, summaryBoxX, currentY, summaryBoxW, summaryBoxH, 10, true, true, '#E2E8F0', '#FFFFFF');

    let rowY = currentY + 12;

    // Subtotal Row
    ctx.textAlign = 'left';
    ctx.font = '500 11.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('Subtotal:', summaryBoxX + 12, rowY + 10);

    ctx.textAlign = 'right';
    ctx.font = '600 11.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#1E293B';
    ctx.fillText(data.subtotalInr, summaryBoxX + summaryBoxW - 12, rowY + 10);
    rowY += 18;

    // Discount Row (if any)
    if (data.discountPaise > 0) {
      ctx.textAlign = 'left';
      ctx.font = '500 11.5px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#D97706';
      ctx.fillText('Discount:', summaryBoxX + 12, rowY + 10);

      ctx.textAlign = 'right';
      ctx.font = '600 11.5px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#D97706';
      ctx.fillText('-' + data.discountInr, summaryBoxX + summaryBoxW - 12, rowY + 10);
      rowY += 18;
    }

    // Divider
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(summaryBoxX + 10, rowY + 3);
    ctx.lineTo(summaryBoxX + summaryBoxW - 10, rowY + 3);
    ctx.stroke();
    rowY += 8;

    // Grand Total Row
    ctx.textAlign = 'left';
    ctx.font = 'bold 13.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('Grand Total:', summaryBoxX + 12, rowY + 12);

    ctx.textAlign = 'right';
    ctx.fillText(data.totalInr, summaryBoxX + summaryBoxW - 12, rowY + 12);
    rowY += 22;

    // Divider
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(summaryBoxX + 10, rowY + 3);
    ctx.lineTo(summaryBoxX + summaryBoxW - 10, rowY + 3);
    ctx.stroke();
    rowY += 6;

    // Each Payment Made
    data.paymentsList.forEach(p => {
      ctx.textAlign = 'left';
      ctx.font = 'bold 11.5px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#15803D';
      ctx.fillText(p.label + ':', summaryBoxX + 12, rowY + 10);

      ctx.textAlign = 'right';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#15803D';
      ctx.fillText(p.amountInr, summaryBoxX + summaryBoxW - 12, rowY + 10);
      rowY += 18;
    });

    // Divider
    rowY += 2;
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(summaryBoxX + 10, rowY + 2);
    ctx.lineTo(summaryBoxX + summaryBoxW - 10, rowY + 2);
    ctx.stroke();
    ctx.setLineDash([]);
    rowY += 8;

    // Remaining Due (REM)
    const barY = rowY;
    const barH = 28;
    if (data.isDue) {
      // Solid Red Banner for Due
      drawRoundedRect(ctx, summaryBoxX + 4, barY, summaryBoxW - 8, barH, 6, true, false, null, '#EF4444');
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText('Remaining Due (REM):', summaryBoxX + 10, barY + 18);
      ctx.textAlign = 'right';
      ctx.fillText(data.dueInr, summaryBoxX + summaryBoxW - 10, barY + 18);
    } else {
      // Solid Green Banner for Settled / ₹0
      drawRoundedRect(ctx, summaryBoxX + 4, barY, summaryBoxW - 8, barH, 6, true, false, null, '#10B981');
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText('Remaining Due (REM):', summaryBoxX + 10, barY + 18);
      ctx.textAlign = 'right';
      ctx.fillText('₹0', summaryBoxX + summaryBoxW - 10, barY + 18);
    }

    // Pick Up Box
    const pickUpY = currentY + summaryBoxH + 8;
    const pickUpH = 44;
    drawRoundedRect(ctx, summaryBoxX, pickUpY, summaryBoxW, pickUpH, 8, true, true, '#CBD5E1', '#F8FAFC');

    ctx.textAlign = 'left';
    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#0C2B4E';
    ctx.fillText('📅  Pick Up', summaryBoxX + 10, pickUpY + 17);

    ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#1E293B';
    ctx.fillText(data.pickupFormatted, summaryBoxX + 10, pickUpY + 34);

    currentY = pickUpY + pickUpH + 20;

    // 9. Footer: "Thank You"
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#0C2B4E';
    ctx.fillText('Thank You', cardWidth / 2, currentY);

    ctx.font = '500 10.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(data.storeName + ' • Ph: ' + data.storePhone, cardWidth / 2, currentY + 16);

    ctx.font = '400 9.5px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(data.storeAddress, cardWidth / 2, currentY + 30);

    return canvas;
  }

  // Convert canvas to PNG Blob
  async function generateBillCardBlob(orderData) {
    const canvas = await generateBillCardCanvas(orderData, 2);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve({
          blob,
          canvas,
          dataUrl: canvas.toDataURL('image/png')
        });
      }, 'image/png');
    });
  }

  // Generate responsive HTML view of the bill card
  function renderBillCardHTML(orderData) {
    const data = normalizeOrderData(orderData.order, orderData.items, orderData.rx, orderData.storeSettings);

    const rxHTML = data.isZeroPower
      ? `<div class="bc-zero-power">👓 Zero Power (Plano / Blue-Light Screen Filter only)</div>`
      : (data.rx && (data.rx.od_sph != null || data.rx.os_sph != null || data.rx.prescription_number)
        ? `
          <div class="bc-rx-card">
            <div class="bc-rx-header">
              <span>OPTICAL EYE PRESCRIPTION${data.rx.prescription_number ? ' (' + escapeHtml(data.rx.prescription_number) + ')' : ''}</span>
              ${data.rx.ipd_distance ? `<span>IPD: ${data.rx.ipd_distance} mm</span>` : ''}
            </div>
            <table class="bc-rx-table">
              <thead>
                <tr>
                  <th>EYE</th><th>SPH</th><th>CYL</th><th>AXIS</th><th>ADD</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>OD (Right)</td>
                  <td>${data.rx.od_sph || '0.00'}</td>
                  <td>${data.rx.od_cyl || '0.00'}</td>
                  <td>${data.rx.od_axis ? data.rx.od_axis + '°' : '-'}</td>
                  <td>${data.rx.addition || '-'}</td>
                </tr>
                <tr>
                  <td>OS (Left)</td>
                  <td>${data.rx.os_sph || '0.00'}</td>
                  <td>${data.rx.os_cyl || '0.00'}</td>
                  <td>${data.rx.os_axis ? data.rx.os_axis + '°' : '-'}</td>
                  <td>${data.rx.addition || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `
        : '');

    const itemsRows = data.items.map(it => {
      const itName = it.product_name || it.name || 'Optical Item';
      const itQty = it.quantity || 1;
      const itPrice = it.unit_price_paise ? (it.unit_price_paise / 100) : (it.unit_price_inr || (it.subtotal_paise / 100 / itQty));
      const itTotal = it.subtotal_paise ? (it.subtotal_paise / 100) : (itPrice * itQty);
      return `
        <tr>
          <td class="bc-item-name">${escapeHtml(itName)}</td>
          <td class="bc-text-center">${itQty}</td>
          <td class="bc-text-center">${Math.round(itPrice).toLocaleString('en-IN')}</td>
          <td class="bc-text-right bc-item-total">${Math.round(itTotal).toLocaleString('en-IN')}/=</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="bc-container" id="bc-card-render">
        <div class="bc-store-header">
          <img src="/images/bill_logo.png" onerror="this.style.display='none'" class="bc-logo" alt="Logo" />
          <h2 class="bc-store-title">${escapeHtml(data.storeName.toUpperCase())}</h2>
        </div>

        <div class="bc-card">
          <div class="bc-header-pill">
            <span class="bc-inv-num">${escapeHtml(data.orderNumber)}</span>
            <span class="bc-inv-date">${escapeHtml(data.dateFormatted)}</span>
          </div>

          <div class="bc-client-box">
            <div class="bc-client-row">👤 <strong>${escapeHtml(data.customerName)}</strong></div>
            <div class="bc-client-row">📞 ${escapeHtml(data.customerPhone)}</div>
            <div class="bc-client-split">
              <span>📍 ${escapeHtml(data.customerCity)}</span>
              <span>🪪 Age: ${escapeHtml(String(data.customerAge))}</span>
            </div>
            ${data.pickupFormatted ? `
            <div class="bc-client-row bc-client-delivery" style="border-top:1px solid #E2E8F0; padding-top:4px; margin-top:3px; color:#0284C7; font-weight:700; font-size:0.75rem;">
              <span>📅 <strong>Delivery Date:</strong> ${escapeHtml(data.pickupFormatted)}</span>
            </div>` : ''}
          </div>

          ${rxHTML}

          <table class="bc-items-table">
            <thead>
              <tr>
                <th>ITEM / DESCRIPTION</th>
                <th class="bc-text-center">QTY</th>
                <th class="bc-text-center">PRICE</th>
                <th class="bc-text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="bc-summary-wrap">
            <div class="bc-summary-box">
              <div class="bc-sum-row">
                <span>Subtotal:</span>
                <span>${data.subtotalInr}</span>
              </div>
              ${data.discountPaise > 0 ? `
                <div class="bc-sum-row" style="color:#D97706;">
                  <span>Discount:</span>
                  <span>-${data.discountInr}</span>
                </div>
              ` : ''}
              <div class="bc-sum-row" style="border-top:1px solid #CBD5E1; padding-top:4px; font-weight:800;">
                <span>Grand Total:</span>
                <strong>${data.totalInr}</strong>
              </div>
              ${data.paymentsList.map(p => `
                <div class="bc-sum-row" style="color:#15803D; font-weight:700;">
                  <span>${escapeHtml(p.label)}:</span>
                  <span>${escapeHtml(p.amountInr)}</span>
                </div>
              `).join('')}
              <div class="bc-sum-bar ${data.isDue ? 'bc-bar-due' : 'bc-bar-paid'}">
                <span>Remaining Due (REM):</span>
                <strong>${data.isDue ? data.dueInr : '₹0'}</strong>
              </div>
            </div>

            <div class="bc-pickup-box">
              <div class="bc-pickup-label">📅 Pick Up</div>
              <div class="bc-pickup-date">${escapeHtml(data.pickupFormatted)}</div>
            </div>
          </div>

          <div class="bc-footer">
            <div class="bc-thankyou">Thank You</div>
            <div class="bc-store-sub">${escapeHtml(data.storeName)} • Ph: ${escapeHtml(data.storePhone)}</div>
            <div class="bc-store-addr">${escapeHtml(data.storeAddress)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Helper: Extract clean 10-digit mobile number for clipboard & search
  function extractClientPhoneToCopy(rawPhone) {
    if (!rawPhone) return '';
    const str = String(rawPhone).trim();
    const digits = str.replace(/\D/g, '');
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    if (digits.length > 10) return digits.slice(-10);
    return digits || str;
  }

  // Helper: Cross-browser text copy to system clipboard
  async function copyTextToClipboard(text) {
    if (!text) return false;
    let copied = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (_) {}
    }
    if (!copied && typeof document !== 'undefined') {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        ta.style.opacity = '0';
        ta.setAttribute('readonly', '');
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, 99999);
        copied = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (_) {}
    }
    return copied;
  }

  // 1-Click WhatsApp Send / Copy Image workflow
  async function sendBillCardWhatsApp(orderData) {
    const data = normalizeOrderData(orderData.order, orderData.items, orderData.rx, orderData.storeSettings);
    const cleanPhone = String(data.customerPhone || '').replace(/[^0-9]/g, '');
    const intlPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    // 0. Instantly copy client's phone number to clipboard BEFORE opening send options / share sheet
    const phoneToCopy = extractClientPhoneToCopy(data.customerPhone || orderData?.order?.customer_phone || orderData?.order?.customerPhone || orderData?.order?.phone);
    if (phoneToCopy) {
      try {
        await copyTextToClipboard(phoneToCopy);
        if (typeof window !== 'undefined' && window.showToast) {
          window.showToast(`📋 Copied client phone (${phoneToCopy}) to clipboard!`, 'success');
        }
      } catch (e) {
        console.warn('Failed to copy client phone:', e);
      }
    }

    const { blob } = await generateBillCardBlob(orderData);
    const pngFile = new File([blob], `${data.orderNumber}_Bill.png`, { type: 'image/png' });

    // Text summary accompanying receipt
    const dueText = data.isDue ? `*Remaining Due:* ${data.dueInr}` : `*Status:* Paid in Full ✓`;
    const rxText = data.isZeroPower ? `\n*Prescription:* Zero Power (Blue-Cut)` : (data.rx && (data.rx.od_sph || data.rx.os_sph) ? `\n*Prescription:* Attached ✓` : '');
    const shareText = `Hello ${data.customerName},\nThank you for choosing *${data.storeName}*!\n\nHere is your official digital receipt for Order *#${data.orderNumber}*:\n*Total Amount:* ${data.totalInr}\n*Advance Paid:* ${data.advanceInr}\n${dueText}${rxText}\n*Estimated Ready:* ${data.pickupFormatted}\n\nWe have attached your official bill image below. Please let us know if you need any assistance!`;

    // 1. If mobile or device supports Web Share with files, share directly!
    // (Client phone is already copied to system clipboard before opening native send options)
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pngFile] })) {
      try {
        await navigator.share({
          files: [pngFile],
          title: `Bill #${data.orderNumber}`,
          text: shareText
        });
        if (typeof window !== 'undefined' && window.showToast) {
          window.showToast(`Bill image shared! (Phone ${phoneToCopy || ''} in clipboard)`, 'success');
        }
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // 2. Open WhatsApp Web / App (phone number remains in clipboard for pasting)
    const waUrl = intlPhone
      ? `https://wa.me/${intlPhone}?text=${encodeURIComponent(shareText)}`
      : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
      if (window.showToast) {
        window.showToast(`📋 Phone (${phoneToCopy || cleanPhone}) copied to clipboard & WhatsApp opened!`, 'success');
      }
    }
  }

  // 1-Click Image Download
  async function downloadBillCardPNG(orderData) {
    const data = normalizeOrderData(orderData.order, orderData.items, orderData.rx, orderData.storeSettings);
    const { blob } = await generateBillCardBlob(orderData);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `NoorOptic_Bill_${data.orderNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    if (window.showToast) window.showToast('Receipt image downloaded!', 'success');
  }

  // 1-Click Copy Image to System Clipboard
  async function copyBillCardImageToClipboard(orderData) {
    if (!navigator.clipboard || !window.ClipboardItem) {
      if (window.showToast) window.showToast('Clipboard image copy not supported in this browser.', 'warning');
      return;
    }
    const { blob } = await generateBillCardBlob(orderData);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      if (window.showToast) window.showToast('✅ Bill Image copied to clipboard! Paste anywhere with Ctrl+V.', 'success');
    } catch (err) {
      if (window.showToast) window.showToast('Could not copy image: ' + err.message, 'danger');
    }
  }

  return {
    generateBillCardCanvas,
    generateBillCardBlob,
    renderBillCardHTML,
    sendBillCardWhatsApp,
    downloadBillCardPNG,
    copyBillCardImageToClipboard,
    normalizeOrderData,
    extractClientPhoneToCopy,
    copyTextToClipboard
  };
}));
