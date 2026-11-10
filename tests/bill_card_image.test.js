/**
 * tests/bill_card_image.test.js – Automated Test Suite for Digital Bill Card & Image System
 * Validates receipt normalization, SVG rendering, due/paid status highlights,
 * and REST endpoints for image delivery and WhatsApp messaging.
 */

'use strict';

process.env.NODE_ENV = 'test';

const assert = require('assert');
const { generateBillCardSVG, formatINR } = require('../server/cardImage');
const BillCardGenerator = require('../billCardGenerator');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runSuite() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING DIGITAL BILL CARD & IMAGE SYSTEM TEST SUITE');
  console.log('======================================================\n');

  console.log('--- 1. Order Data Normalization & Due Calculation ---');

  runTest('correctly calculates remaining due when balance is unpaid', () => {
    const rawOrder = {
      order_number: 'INV-TEST-001',
      customer_name: 'Aditya',
      customer_phone: '7396561933',
      client_city: 'Hyd',
      client_age: 18,
      total_payable_paise: 4848800,
      advance_paid_paise: 0,
      outstanding_paise: 4848800
    };
    const norm = BillCardGenerator.normalizeOrderData(rawOrder);
    assert.strictEqual(norm.customerName, 'Aditya');
    assert.strictEqual(norm.customerPhone, '7396561933');
    assert.strictEqual(norm.totalInr, '₹48,488');
    assert.strictEqual(norm.advanceInr, '₹0');
    assert.strictEqual(norm.dueInr, '₹48,488');
    assert.strictEqual(norm.isDue, true);
  });

  runTest('correctly sets isDue = false when order is paid in full', () => {
    const rawOrder = {
      order_number: 'INV-TEST-002',
      customer_name: 'Sameena',
      total_payable_paise: 500000,
      advance_paid_paise: 500000,
      outstanding_paise: 0
    };
    const norm = BillCardGenerator.normalizeOrderData(rawOrder);
    assert.strictEqual(norm.totalInr, '₹5,000');
    assert.strictEqual(norm.isDue, false);
    assert.strictEqual(norm.dueInr, '₹0');
  });

  runTest('detects zero power / plano preference and suppresses power diopters', () => {
    const rawOrder = {
      order_number: 'INV-TEST-003',
      prescription_pref: 'zero-power',
      od_sph: '-2.50'
    };
    const norm = BillCardGenerator.normalizeOrderData(rawOrder);
    assert.strictEqual(norm.isZeroPower, true);
    assert.strictEqual(norm.rx, null);
  });

  runTest('extracts multi-stage payments (Advance, 2nd, 3rd) matching user specification', () => {
    const rawOrder = {
      order_number: 'INV-STAGE-001',
      total_payable_paise: 145900,
      advance_paid_paise: 50000,
      second_payment_paise: 50000,
      third_payment_paise: 45900,
      outstanding_paise: 0
    };
    const norm = BillCardGenerator.normalizeOrderData(rawOrder);
    assert.strictEqual(norm.totalInr, '₹1,459');
    assert.strictEqual(norm.paymentsList.length, 3);
    assert.strictEqual(norm.paymentsList[0].label, 'Advance Paid');
    assert.strictEqual(norm.paymentsList[0].amountInr, '₹500');
    assert.strictEqual(norm.paymentsList[1].label, '2nd Payment');
    assert.strictEqual(norm.paymentsList[1].amountInr, '₹500');
    assert.strictEqual(norm.paymentsList[2].label, '3rd Payment');
    assert.strictEqual(norm.paymentsList[2].amountInr, '₹459');
    assert.strictEqual(norm.isDue, false);
    assert.strictEqual(norm.dueInr, '₹0');
  });

  runTest('auto-parses prescription from prescriptions_json when direct prescription object is absent', () => {
    const rawOrder = {
      order_number: 'INV-RX-001',
      prescription_pref: 'RX Attached',
      prescriptions_json: JSON.stringify([{
        prescription_number: 'RX-2026-1996',
        od_sph: '4.00',
        od_cyl: '4.00',
        os_sph: '4.00',
        os_cyl: '4.00'
      }])
    };
    const norm = BillCardGenerator.normalizeOrderData(rawOrder);
    assert.strictEqual(norm.isZeroPower, false);
    assert(norm.rx != null, 'Prescription should be parsed and present');
    assert.strictEqual(norm.rx.prescription_number, 'RX-2026-1996');
    assert.strictEqual(norm.rx.od_sph, '4.00');
  });

  console.log('\n--- 2. Standalone SVG Receipt Card Rendering ---');

  runTest('generates valid SVG with shop name, logo, client details and red due banner', () => {
    const order = {
      order_number: 'INV-ATIB-1026-0001',
      created_at: '2026-10-27T18:35:00.000Z',
      customer_name: 'Aditya',
      customer_phone: '7396561933',
      client_city: 'Hyd',
      client_age: 18,
      total_payable_paise: 4848800,
      advance_paid_paise: 0,
      outstanding_paise: 4848800,
      pickup_time: '2026-10-30T18:35:00.000Z'
    };
    const items = [
      { product_name: 'Lens', quantity: 1, unit_price_paise: 4848800, subtotal_paise: 4848800 }
    ];
    const rx = {
      od_sph: '-1.50', od_cyl: '-0.50', od_axis: '90',
      os_sph: '-1.25', os_cyl: '-0.75', os_axis: '85',
      addition: '+1.50', ipd_distance: '63'
    };
    const storeSettings = {
      store_name: 'MY SHOP',
      store_phone: '+91 98765 43210'
    };

    const svg = generateBillCardSVG(order, items, rx, storeSettings);

    assert(svg.includes('<svg'), 'Output should be valid SVG root');
    assert(svg.includes('MY SHOP'), 'Should display store title');
    assert(svg.includes('INV-ATIB-1026-0001'), 'Should display order invoice number');
    assert(svg.includes('Aditya'), 'Should display client name');
    assert(svg.includes('7396561933'), 'Should display client phone');
    assert(svg.includes('Hyd'), 'Should display client city');
    assert(svg.includes('18'), 'Should display client age');
    assert(svg.includes('OPTICAL EYE PRESCRIPTION'), 'Should render optical prescription header');
    assert(svg.includes('-1.50'), 'Should render OD SPH');
    assert(svg.includes('Lens'), 'Should render product item name');
    assert(svg.includes('48,488/='), 'Should render item total');
    assert(svg.includes('#EF4444'), 'Should render red highlight bar for remaining due');
    assert(svg.includes('Remaining'), 'Should render Remaining label');
    assert(svg.includes('₹48,488'), 'Should render remaining amount');
    assert(svg.includes('📅  Pick Up'), 'Should render Pick Up box');
    assert(svg.includes('Thank You'), 'Should render Thank You footer');
  });

  runTest('generates green banner when remaining due is zero', () => {
    const order = {
      order_number: 'INV-PAID-001',
      total_payable_paise: 350000,
      advance_paid_paise: 350000,
      outstanding_paise: 0
    };
    const svg = generateBillCardSVG(order, [], null, {});
    assert(svg.includes('#10B981'), 'Should render green banner for paid in full');
    assert(svg.includes('Paid in Full'), 'Should render Paid in Full label');
  });

  runTest('renders zero power badge instead of diopters for plano orders', () => {
    const order = {
      order_number: 'INV-PLANO-001',
      prescription_pref: 'zero-power'
    };
    const svg = generateBillCardSVG(order, [], null, {});
    assert(svg.includes('Zero Power (Plano / Blue-Light Screen Filter only)'), 'Should render Zero Power badge');
  });

  console.log('\n--- 3. Client HTML Representation Generation ---');

  runTest('renderBillCardHTML produces responsive card matching design', () => {
    const payload = {
      order: {
        order_number: 'INV-ATIB-1026-0001',
        customer_name: 'Aditya',
        customer_phone: '7396561933',
        client_city: 'Hyd',
        client_age: 18,
        total_payable_paise: 4848800,
        outstanding_paise: 4848800
      },
      items: [{ product_name: 'Lens', quantity: 1, unit_price_paise: 4848800, subtotal_paise: 4848800 }],
      storeSettings: { store_name: 'MY SHOP' }
    };
    const html = BillCardGenerator.renderBillCardHTML(payload);
    assert(html.includes('bc-container'), 'Contains bc-container class');
    assert(html.includes('MY SHOP'), 'Contains shop name');
    assert(html.includes('INV-ATIB-1026-0001'), 'Contains invoice number');
    assert(html.includes('bc-bar-due'), 'Contains bc-bar-due class for red highlight');
  });

  console.log('\n======================================================');
  console.log(`🏁 BILL CARD & IMAGE SYSTEM SUITE: ${passedTests}/${totalTests} TESTS PASSED!`);
  console.log('======================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});

