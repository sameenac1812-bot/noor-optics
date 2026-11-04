/**
 * server/pdfInvoice.js – A4 PDF Tax Invoice Generator using PDFKit
 * Generates immutable, high-resolution printable tax invoices.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { getStoreSettings } = require('./printer');

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
 * Generate PDF buffer for an invoice
 */
function generateInvoicePDF(invoice, items, prescription = null) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 45,
      info: {
        Title: `Tax Invoice - ${invoice.invoice_number}`,
        Author: 'Noor Optic'
      }
    });

    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', err => reject(err));

    const storeName = 'NOOR OPTIC';
    const storeAddress = 'Pillar No: 45, Beside HP Petrol Pump, Opposite Subhan Bakery,\nRethibowli, Gudimalkapur, Hyderabad, Telangana 500028';

    // ── Logo & Header ────────────────────────────────────────────────────────
    const possibleLogoPaths = [
      path.join(__dirname, 'logo.jpg'),
      path.join(__dirname, '..', 'images', 'noor_optic_logo.jpg'),
      path.join(process.cwd(), 'server', 'logo.jpg'),
      path.join(process.cwd(), 'images', 'noor_optic_logo.jpg')
    ];
    const logoPath = possibleLogoPaths.find(p => fs.existsSync(p));
    let headerTextX = 45;
    if (logoPath) {
      try {
        doc.image(logoPath, 45, 38, { width: 56 });
        headerTextX = 112;
      } catch (imgErr) {
        console.warn('Could not render logo in PDF:', imgErr.message);
      }
    }

    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#111111')
      .text(storeName, headerTextX, 42);

    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor('#4B5563')
      .text(storeAddress, headerTextX, 70, { width: 235, lineGap: 3 });

    // Invoice Meta Right Aligned
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#111111')
      .text('TAX INVOICE', 350, 42, { align: 'right' });

    doc
      .fontSize(8.5)
      .font('Helvetica')
      .fillColor('#333333')
      .text(`Invoice No: ${invoice.invoice_number}`, 350, 68, { align: 'right' })
      .text(`Date: ${new Date(invoice.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 350, 82, { align: 'right' })
      .text(`Order Ref: ${invoice.order_number || invoice.order_id}`, 350, 96, { align: 'right' });

    doc.moveTo(45, 122).lineTo(550, 122).strokeColor('#E5E7EB').lineWidth(1).stroke();

    // ── Customer Information ────────────────────────────────────────────────
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#111111')
      .text('BILLED TO:', 45, 134);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#444444')
      .text(invoice.customer_name || 'Walk-in Client', 45, 149)
      .text(invoice.customer_phone ? `Phone: ${invoice.customer_phone}` : '', 45, 162)
      .text(invoice.customer_email ? `Email: ${invoice.customer_email}` : '', 45, 175)
      .text(invoice.customer_address ? `Delivery: ${invoice.customer_address}` : '', 45, 188);

    // ── Items Table ─────────────────────────────────────────────────────────
    const tableTop = 215;

    // Header Row
    doc
      .rect(45, tableTop, 505, 22)
      .fillColor('#F9FAFB')
      .fill()
      .strokeColor('#E5E7EB')
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor('#111111')
      .text('#', 55, tableTop + 6)
      .text('ITEM DESCRIPTION', 85, tableTop + 6)
      .text('SKU', 290, tableTop + 6)
      .text('QTY', 370, tableTop + 6, { align: 'center', width: 35 })
      .text('RATE', 415, tableTop + 6, { align: 'right', width: 55 })
      .text('AMOUNT', 485, tableTop + 6, { align: 'right', width: 60 });

    let y = tableTop + 26;

    items.forEach((item, index) => {
      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#333333')
        .text(String(index + 1), 55, y)
        .font('Helvetica-Bold')
        .text(item.product_name, 85, y)
        .font('Helvetica')
        .text(item.sku || 'OPT-FRAME', 290, y)
        .text(String(item.quantity), 370, y, { align: 'center', width: 35 })
        .text(formatINR(item.unit_price_paise), 415, y, { align: 'right', width: 55 })
        .font('Helvetica-Bold')
        .text(formatINR(item.subtotal_paise), 485, y, { align: 'right', width: 60 });

      y += 20;

      // Divider between items
      doc.moveTo(45, y - 4).lineTo(550, y - 4).strokeColor('#F3F4F6').lineWidth(0.5).stroke();
    });

    // ── Totals Calculation ──────────────────────────────────────────────────
    y = Math.max(y + 10, 420);

    // ── Clinical Prescription Box (Left Side opposite Totals, Multi-Rx Supported) ──
    let rxList = [];
    if (Array.isArray(prescription) && prescription.length > 0) {
      rxList = prescription.filter(Boolean);
    } else if (prescription) {
      rxList = [prescription];
    } else if (invoice.prescription) {
      rxList = [invoice.prescription];
    } else if (invoice.snapshot_json) {
      try {
        const snap = JSON.parse(invoice.snapshot_json);
        if (Array.isArray(snap.prescriptions) && snap.prescriptions.length > 0) {
          rxList = snap.prescriptions;
        } else if (snap.prescription) {
          rxList = [snap.prescription];
        }
      } catch (_) {}
    }

    // Filter to prescriptions that contain clinical values
    rxList = rxList.filter(rx => rx && (
      rx.od_sph != null || rx.odSph != null ||
      rx.os_sph != null || rx.osSph != null ||
      rx.prescription_number || rx.prescriptionNumber
    ));

    let rxCurrentY = y;
    const boxHeight = rxList.length > 1 ? 84 : 95;
    rxList.forEach((rx, idx) => {
      if (rxCurrentY + boxHeight > 650) return; // Prevent overflowing terms footer
      const rxBoxTop = rxCurrentY;
      doc.rect(45, rxBoxTop, 275, boxHeight).fillColor('#F8FAFC').fill().strokeColor('#CBD5E1').lineWidth(0.5).stroke();

      const rxTitle = rxList.length > 1
        ? `PRESCRIPTION #${idx + 1}: ${rx.prescription_number || rx.prescriptionNumber || 'ATTACHED RX'}`
        : `CLINICAL PRESCRIPTION: ${rx.prescription_number || rx.prescriptionNumber || 'ATTACHED RX'}`;

      doc.fontSize(8).font('Helvetica-Bold').fillColor('#0F172A').text(rxTitle, 55, rxBoxTop + 6);

      const odSph = rx.od_sph != null ? rx.od_sph : (rx.odSph || '0.00');
      const odCyl = rx.od_cyl != null ? rx.od_cyl : (rx.odCyl || '0.00');
      const odAxis = rx.od_axis != null ? (rx.od_axis + '°') : (rx.odAxis != null ? rx.odAxis + '°' : '-');

      const osSph = rx.os_sph != null ? rx.os_sph : (rx.osSph || '0.00');
      const osCyl = rx.os_cyl != null ? rx.os_cyl : (rx.osCyl || '0.00');
      const osAxis = rx.os_axis != null ? (rx.os_axis + '°') : (rx.osAxis != null ? rx.osAxis + '°' : '-');

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#475569')
        .text('EYE', 55, rxBoxTop + 22)
        .text('SPH', 115, rxBoxTop + 22)
        .text('CYL', 170, rxBoxTop + 22)
        .text('AXIS', 225, rxBoxTop + 22);

      doc.font('Helvetica').fillColor('#1E293B')
        .text('OD (Right)', 55, rxBoxTop + 36)
        .text(odSph, 115, rxBoxTop + 36)
        .text(odCyl, 170, rxBoxTop + 36)
        .text(odAxis, 225, rxBoxTop + 36);

      doc.text('OS (Left)', 55, rxBoxTop + 50)
        .text(osSph, 115, rxBoxTop + 50)
        .text(osCyl, 170, rxBoxTop + 50)
        .text(osAxis, 225, rxBoxTop + 50);

      const addText = (rx.addition || rx.add) ? `ADD: ${rx.addition || rx.add}` : '';
      const ipdText = (rx.ipd_distance || rx.ipdDistance || rx.pd) ? `IPD: ${rx.ipd_distance || rx.ipdDistance || rx.pd}mm` : '';
      const checkedText = (rx.checked_by || rx.checkedBy) ? `By: ${rx.checked_by || rx.checkedBy}` : '';
      const extraRx = [addText, ipdText, checkedText].filter(Boolean).join('  |  ');
      if (extraRx) {
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#64748B').text(extraRx, 55, rxBoxTop + 66);
      }
      rxCurrentY += boxHeight + 6;
    });

    const totalsLeft = 350;
    const totalsWidth = 195;

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#444444')
      .text('Subtotal:', totalsLeft, y)
      .text(formatINR(invoice.subtotal_paise), totalsLeft, y, { align: 'right', width: totalsWidth });

    y += 16;
    if (invoice.discount_paise > 0) {
      doc
        .text('Discount:', totalsLeft, y)
        .text('-' + formatINR(invoice.discount_paise), totalsLeft, y, { align: 'right', width: totalsWidth });
      y += 16;
    }

    // Split GST (CGST 9% + SGST 9%)
    const halfTax = Math.round(invoice.tax_paise / 2);
    doc
      .text('Central GST (CGST 9%):', totalsLeft, y)
      .text(formatINR(halfTax), totalsLeft, y, { align: 'right', width: totalsWidth });
    y += 16;
    doc
      .text('State GST (SGST 9%):', totalsLeft, y)
      .text(formatINR(invoice.tax_paise - halfTax), totalsLeft, y, { align: 'right', width: totalsWidth });
    y += 18;

    doc.moveTo(totalsLeft, y - 4).lineTo(550, y - 4).strokeColor('#111111').lineWidth(1).stroke();

    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#111111')
      .text('GRAND TOTAL:', totalsLeft, y)
      .text(formatINR(invoice.grand_total_paise), totalsLeft, y, { align: 'right', width: totalsWidth });

    y += 20;
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#333333')
      .text(`Payment Mode: ${invoice.payment_method || 'CASH / UPI'}`, totalsLeft, y)
      .text(`Paid: ${formatINR(invoice.amount_paid_paise)}`, totalsLeft, y, { align: 'right', width: totalsWidth });

    // ── Terms & Footer ──────────────────────────────────────────────────────
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#111111')
      .text('WARRANTY & DISPENSING TERMS:', 45, 660);

    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor('#666666')
      .text('1. 2-Year comprehensive warranty covers Japanese titanium hinges and bio-acetate structural integrity.', 45, 672)
      .text('2. 14-Day complimentary optical adaptation guarantee: lens power modifications honored free of charge.', 45, 683)
      .text('3. Lenses custom glazed to individual pupil distance specifications are non-refundable once cut.', 45, 694)
      .text('4. Clean optical lenses using designated microfiber cloth; avoid alcohol or solvent solutions.', 45, 705);

    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text('Noor Optic E-Commerce & Retail Management System · Digitally Certified Tax Invoice', 45, 760, { align: 'center', width: 505 });

    doc.end();
  });
}

module.exports = {
  generateInvoicePDF
};
