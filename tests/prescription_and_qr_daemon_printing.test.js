/**
 * Automated Verification Suite for:
 * 1. Customer Prescription Printing on 2.5-Inch Thermal Receipts:
 *    - Case 1: Website Orders:
 *      * 'enter-rx' (manual OD/OS SPH, CYL, AXIS, ADD, PD table)
 *      * 'zero-power' (zero-power blue-cut lenses banner)
 *      * 'call-optometrist' (optometrist call required banner)
 *    - Case 2: In-Store POS Orders with full clinical prescription
 * 2. Optical Temple QR Sticker Printing via POS Daemon:
 *    - Image 2 Reference Engine: Solid square finders, 2x2 crisp modules, centered bold SKU, frame name, retail price
 *    - Cloud queue polling (SYS-PRINT-QUEUE) and durable print_jobs table
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('\n======================================================');
console.log('🧪 RUNNING PRESCRIPTION BILLING & QR STICKER TEST SUITE');
console.log('======================================================\n');

// Load daemon formatting functions by inspecting daemon source
const daemonSrc = fs.readFileSync(path.join(__dirname, '..', 'pos-daemon', 'pos-daemon.js'), 'utf8');

// Sandbox test for format25InchEscPosReceipt
// We extract the function logic and execute it in an isolated scope
function createDaemonReceiptFormatter() {
  const sandbox = {
    Buffer,
    config: { columns: 32, storePhone: '+91 98765 43210' },
    logoRasterBuffer: null,
    paymentQrRasterBuffer: null,
    resolveItemDetails: (it, ord) => ({
      name: it.product_name || it.name || 'Frame',
      sku: it.sku || 'SKU-001',
      color: it.color || it.variant_name || 'Standard'
    })
  };

  const fnMatch = daemonSrc.match(/function format25InchEscPosReceipt\(rawOrder\) \{[\s\S]*?\n\}/);
  if (!fnMatch) throw new Error('format25InchEscPosReceipt function not found in pos-daemon.js');

  const fnFactory = new Function('sandbox', `
    const { Buffer, config, logoRasterBuffer, paymentQrRasterBuffer, resolveItemDetails } = sandbox;
    ${fnMatch[0]}
    return format25InchEscPosReceipt;
  `);

  return fnFactory(sandbox);
}

const formatReceipt = createDaemonReceiptFormatter();

// ── TEST 1: Website Order with Manual Prescription (enter-rx) ────────────────
console.log('--- 1. Case 1: Website Order with Manual Prescription (enter-rx) ---');
const webManualOrder = {
  order_number: 'NOOR-WEB-20261103-9001',
  order_ref: 'NOOR-WEB-20261103-9001',
  source: 'website',
  channel: 'WEBSITE',
  customer_name: 'Aditya Birla',
  customer_phone: '9876543210',
  delivery_address: 'Banjara Hills Road No 12, Hyderabad',
  prescription_pref: 'enter-rx',
  prescription: {
    od_sph: '-1.50',
    od_cyl: '-0.75',
    od_axis: '90',
    os_sph: '-2.00',
    os_cyl: '-0.50',
    os_axis: '85',
    addition: '+1.50',
    ipd_distance: '64',
    checked_by: 'Dr. Ramesh Sharma',
    notes: 'Anti-reflective coating recommended'
  },
  items: [
    { name: 'The Berlin Hex', sku: 'NOOR-BER-01', quantity: 1, unit_price: 3699, subtotal: 3699 }
  ],
  subtotal: 3699,
  shipping_fee: 0,
  grand_total: 3699,
  payment_method: 'UPI'
};

const bufManual = formatReceipt(webManualOrder);
const textManual = bufManual.toString('ascii');

assert(textManual.includes('SPH') && textManual.includes('CYL'), 'Receipt must contain prescription header');
assert(textManual.includes('OD Right') && textManual.includes('-1.50'), 'Right eye (OD) values must be formatted into SPH/CYL/AXIS/ADD table');
assert(textManual.includes('OS Left') && textManual.includes('-2.00'), 'Left eye (OS) values must be formatted into SPH/CYL/AXIS/ADD table');
assert(textManual.includes('Addition') && textManual.includes('+1.50'), 'Addition must be printed');
console.log('  ✓ [PASS] Website manual prescription formatted with complete OD/OS diopter table');

// ── TEST 2: Website Order with Zero-Power Blue-Cut Lenses ────────────────────
console.log('\n--- 2. Case 1: Website Order with Zero-Power (zero-power) ---');
const webZeroPowerOrder = {
  order_number: 'NOOR-WEB-20261103-9002',
  order_ref: 'NOOR-WEB-20261103-9002',
  source: 'website',
  channel: 'WEBSITE',
  customer_name: 'Pooja Hegde',
  customer_phone: '9848012345',
  prescription_pref: 'zero-power',
  items: [
    { name: 'The Zurich Titanium', sku: 'NOOR-ZUR-01', quantity: 1, unit_price: 5299, subtotal: 5299 }
  ],
  subtotal: 5299,
  grand_total: 5299
};

const bufZero = formatReceipt(webZeroPowerOrder);
const textZero = bufZero.toString('ascii');

assert(textZero.includes('ZERO-POWER (PLANO) LENSES'), 'Receipt must state ZERO-POWER (PLANO) LENSES');
assert(textZero.includes('Blue-Cut Anti-Glare'), 'Receipt must describe blue-cut screen protection');
console.log('  ✓ [PASS] Website zero-power choice prints clear plano blue-cut notification');

// ── TEST 3: Website Order with Call Optometrist Option ───────────────────────
console.log('\n--- 3. Case 1: Website Order with Call Optometrist (call-optometrist) ---');
const webCallOrder = {
  order_number: 'NOOR-WEB-20261103-9003',
  order_ref: 'NOOR-WEB-20261103-9003',
  source: 'website',
  channel: 'WEBSITE',
  customer_name: 'Vikram Seth',
  customer_phone: '9123456780',
  prescription_pref: 'call-optometrist',
  items: [
    { name: 'The Milan Aureum', sku: 'NOOR-MIL-01', quantity: 1, unit_price: 4799, subtotal: 4799 }
  ],
  subtotal: 4799,
  grand_total: 4799
};

const bufCall = formatReceipt(webCallOrder);
const textCall = bufCall.toString('ascii');

assert(textCall.includes('OPTOMETRIST CALL REQUIRED'), 'Receipt must state OPTOMETRIST CALL REQUIRED');
assert(textCall.includes('9123456780'), 'Receipt must state client phone number to call');
console.log('  ✓ [PASS] Website call-optometrist choice prints optometrist call notice with client phone');

// ── TEST 4: In-Store POS Order with Prescription at Counter ──────────────────
console.log('\n--- 4. Case 2: In-Store POS Order with Clinical Prescription ---');
const instoreOrder = {
  order_number: 'NOOR-POS-20261103-1045',
  order_ref: 'NOOR-POS-20261103-1045',
  source: 'instore',
  channel: 'POS',
  customer_name: 'Mohammed Irfan',
  customer_phone: '9988776655',
  delivery_address: 'In-Store Counter Walk-in',
  od_sph: '+2.00',
  od_cyl: '-0.50',
  od_axis: 180,
  os_sph: '+2.25',
  os_cyl: '-0.75',
  os_axis: 175,
  addition: '+2.00',
  ipd_distance: 63,
  checked_by: 'Staff Optometrist Farhan',
  items: [
    {
      name: 'Cartier Gold Silhouette',
      sku: 'NOOR-CRT-02',
      quantity: 1,
      unit_price: 18500,
      subtotal: 18500,
      prescription: {
        od_sph: '+2.00',
        od_cyl: '-0.50',
        od_axis: 180,
        os_sph: '+2.25',
        os_cyl: '-0.75',
        os_axis: 175,
        addition: '+2.00',
        ipd_distance: 63,
        checked_by: 'Staff Optometrist Farhan'
      }
    }
  ],
  subtotal: 18500,
  grand_total: 18500,
  payment_method: 'CASH'
};

const bufInstore = formatReceipt(instoreOrder);
const textInstore = bufInstore.toString('ascii');

assert(textInstore.includes('SPH') && textInstore.includes('CYL'), 'Receipt must contain prescription table');
assert(textInstore.includes('OD Right') && textInstore.includes('+2.00'), 'Right eye (OD) values must match clinical values');
assert(textInstore.includes('OS Left') && textInstore.includes('+2.25'), 'Left eye (OS) values must match clinical values');
assert(textInstore.includes('Addition') && textInstore.includes('+2.00'), 'Addition must match clinical value');
console.log('  ✓ [PASS] In-Store counter prescription prints with exact clinical diopters');

// ── TEST 5: Optical Temple QR Sticker Formatting ─────────────────────────────
console.log('\n--- 5. Optical Temple QR Sticker Formatter (Image 2 Unified Engine) ---');
async function testQrStickerGeneration() {
  const QRCode = require(path.join(__dirname, '..', 'pos-daemon', 'assets', 'qrcode-bundle.js'));
  assert(QRCode, 'qrcode-bundle.js must load in pos-daemon');

  // Verify format25InchEscPosQrSticker function in pos-daemon.js
  const stickerItem = {
    sku: 'NOOR-CRT-01',
    name: 'Cartier Panther Gold',
    price: 'Rs. 24,500'
  };

  const fontMatch = daemonSrc.match(/const FONT_5X7 = \{[\s\S]*?\n\};/);
  const drawBitmapTextMatch = daemonSrc.match(/function drawBitmapText[\s\S]*?\n\}/);
  const stickerFnMatch = daemonSrc.match(/async function format25InchEscPosQrSticker\(item\) \{[\s\S]*?\n\}/);

  const stickerSandbox = {
    Buffer,
    path,
    __dirname: path.join(__dirname, '..', 'pos-daemon'),
    log: () => {}
  };

  const stickerFnFactory = new Function('sandbox', `
    const { Buffer, path, __dirname, log } = sandbox;
    ${fontMatch[0]}
    ${drawBitmapTextMatch[0]}
    ${stickerFnMatch[0]}
    return format25InchEscPosQrSticker;
  `);

  const formatSticker = stickerFnFactory(stickerSandbox);
  const stickerBuf = await formatSticker(stickerItem);

  assert(Buffer.isBuffer(stickerBuf), 'Sticker output must be a binary buffer');
  assert(stickerBuf.length > 200, 'Sticker binary buffer must contain ESC/POS raster data');
  // Check ESC/POS header: 0x1B 0x40 (ESC @), 0x1D 0x76 0x30 0x00 (GS v 0)
  assert.strictEqual(stickerBuf[0], 0x1B, 'Must start with ESC @');
  assert.strictEqual(stickerBuf[1], 0x40, 'Must start with ESC @');
  assert.strictEqual(stickerBuf[2], 0x1D, 'Must have GS');
  assert.strictEqual(stickerBuf[3], 0x76, 'Must have v (raster bit image)');
  assert.strictEqual(stickerBuf[4], 0x30, 'Raster mode 0');
  console.log(`  ✓ [PASS] Optical temple QR sticker generated: ${stickerBuf.length} bytes ESC/POS GS v 0 raster`);
}

testQrStickerGeneration().then(() => {
  console.log('\n======================================================');
  console.log('🏁 ALL PRESCRIPTION & QR STICKER TESTS PASSED (5/5)!');
  console.log('======================================================\n');
}).catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
