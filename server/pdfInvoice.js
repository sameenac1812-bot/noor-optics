/**
 * server/pdfInvoice.js – A4 PDF Tax Invoice Generator using PDFKit
 * Generates immutable, high-resolution printable tax invoices.
 */

'use strict';

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
function generateInvoicePDF(invoice, items) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 45,
      info: {
        Title: `Tax Invoice - ${invoice.invoice_number}`,
        Author: 'Noor Optics Flagship Boutique'
      }
    });

    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', err => reject(err));

    const settings = getStoreSettings();
    const storeName = settings.store_name || 'NOOR OPTICS';
    const storeAddress = settings.store_address || '104, 100ft Road, Indiranagar, Bengaluru - 560038';
    const storePhone = settings.store_phone || '+91 98765 43210';
    const storeEmail = settings.store_email || 'concierge@nooroptics.com';
    const storeGstin = settings.store_gstin || '29AAAAA0000A1Z5';

    // ── Header ──────────────────────────────────────────────────────────────
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#111111')
      .text(storeName.toUpperCase(), 45, 45);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555555')
      .text('Curated Scandinavian Eyewear & Vision Care Flagship', 45, 72)
      .text(storeAddress, 45, 85)
      .text(`Phone: ${storePhone}  |  Email: ${storeEmail}`, 45, 98)
      .text(`GSTIN: ${storeGstin}`, 45, 111);

    // Invoice Meta Right Aligned
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor('#111111')
      .text('TAX INVOICE', 350, 45, { align: 'right' });

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#333333')
      .text(`Invoice No: ${invoice.invoice_number}`, 350, 72, { align: 'right' })
      .text(`Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 350, 85, { align: 'right' })
      .text(`Order Ref: ${invoice.order_id}`, 350, 98, { align: 'right' });

    // Payment Status Stamp Box
    const isPaid = invoice.payment_status === 'VERIFIED';
    const stampColor = isPaid ? '#059669' : '#D97706';
    const stampText = isPaid ? 'PAYMENT VERIFIED / PAID' : 'PAYMENT PENDING VERIFICATION';

    doc
      .rect(385, 115, 165, 20)
      .fillColor(isPaid ? '#ECFDF5' : '#FEF3C7')
      .fill()
      .strokeColor(stampColor)
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(8.5)
      .font('Helvetica-Bold')
      .fillColor(stampColor)
      .text(stampText, 385, 120, { width: 165, align: 'center' });

    doc.moveTo(45, 145).lineTo(550, 145).strokeColor('#E5E7EB').lineWidth(1).stroke();

    // ── Customer Information ────────────────────────────────────────────────
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#111111')
      .text('BILLED TO:', 45, 155);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#444444')
      .text(invoice.customer_name || 'Walk-in Client', 45, 170)
      .text(invoice.customer_phone ? `Phone: ${invoice.customer_phone}` : '', 45, 183)
      .text(invoice.customer_email ? `Email: ${invoice.customer_email}` : '', 45, 196)
      .text(invoice.customer_address ? `Delivery: ${invoice.customer_address}` : '', 45, 209);

    // ── Items Table ─────────────────────────────────────────────────────────
    const tableTop = 235;

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
      .text('Noor Optics E-Commerce & Retail Management System · Digitally Certified Tax Invoice', 45, 760, { align: 'center', width: 505 });

    doc.end();
  });
}

module.exports = {
  generateInvoicePDF
};
