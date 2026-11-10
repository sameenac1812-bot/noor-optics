/**
 * tests/find_your_fit.test.js
 * Unit and integration tests for Noor Optics 'Find Your Fit'
 * Geometric math, continuous 0-1 scoring, size bands with +/- 4mm overlap,
 * quality warnings, and catalog recommendations.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../find-your-fit/config.json'), 'utf8'));
const meshMath = require('../find-your-fit/mesh-math');
const { EYEWEAR_CATALOG } = require('../data');

console.log('\n======================================================');
console.log('🧪 RUNNING "FIND YOUR FIT" GEOMETRIC & CATALOG TEST SUITE');
console.log('======================================================\n');

let totalTests = 0;
let passedTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// ── 1. Basic Geometry & Pose Math ──────────────────────────────────────────
console.log('--- 1. Geometric Math & Pose Estimation ---');

it('calculates Euclidean 2D distance correctly', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 3, y: 4 };
  assert.strictEqual(meshMath.distance(p1, p2), 5);
});

it('calculates 3-point angle correctly', () => {
  const p1 = { x: 0, y: 1 };
  const vertex = { x: 0, y: 0 };
  const p3 = { x: 1, y: 0 };
  const deg = meshMath.angleBetween(p1, vertex, p3);
  assert.strictEqual(Math.round(deg), 90);
});

it('detects head roll, yaw, and pitch from landmarks', () => {
  // Synthetic front-facing face
  const landmarks = {};
  landmarks[meshMath.LANDMARKS.NOSE_TIP] = { x: 0.50, y: 0.50, z: -0.05 };
  landmarks[meshMath.LANDMARKS.EYE_OUTER_LEFT] = { x: 0.65, y: 0.40, z: 0 };
  landmarks[meshMath.LANDMARKS.EYE_OUTER_RIGHT] = { x: 0.35, y: 0.40, z: 0 };
  landmarks[meshMath.LANDMARKS.FOREHEAD_TOP] = { x: 0.50, y: 0.20, z: 0 };
  landmarks[meshMath.LANDMARKS.CHIN] = { x: 0.50, y: 0.80, z: 0 };

  const pose = meshMath.estimateHeadPose(landmarks, 640, 480);
  assert.strictEqual(pose.isValid, true);
  assert.ok(Math.abs(pose.roll) < 1.0, 'Frontal face should have ~0 roll');
  assert.ok(Math.abs(pose.yaw) < 2.0, 'Frontal face should have ~0 yaw');
});

// ── 2. Iris Scale Calibration ──────────────────────────────────────────────
console.log('\n--- 2. Iris Calibration & Scale Calculation ---');

it('calibrates millimeter-per-pixel from iris landmarks', () => {
  const landmarks = {};
  // Place irises with 33.4 px horizontal diameter
  // 33.4 px on 640 width = ~0.052 normalized
  landmarks[meshMath.LANDMARKS.RIGHT_IRIS_RIGHT] = { x: 0.40, y: 0.40 };
  landmarks[meshMath.LANDMARKS.RIGHT_IRIS_LEFT] = { x: 0.35, y: 0.40 };
  landmarks[meshMath.LANDMARKS.LEFT_IRIS_RIGHT] = { x: 0.65, y: 0.40 };
  landmarks[meshMath.LANDMARKS.LEFT_IRIS_LEFT] = { x: 0.60, y: 0.40 };

  const scale = meshMath.computeIrisCalibration(landmarks, config, 640, 480);
  assert.strictEqual(scale.isValid, true);
  assert.ok(scale.mmPerPixel > 0.2 && scale.mmPerPixel < 0.6);
  // (0.05 * 640 = 32px) -> 11.7mm / 32px = ~0.365 mm/px
  assert.ok(Math.abs(scale.mmPerPixel - (11.7 / 32)) < 0.05);
});

// ── 3. Outlier Rejection & Multi-Frame Median ───────────────────────────────
console.log('\n--- 3. Outlier Rejection & Multi-Frame Buffer ---');

it('filters outliers using IQR and computes correct median', () => {
  // Normal values around 130mm, plus extreme outliers (200mm, 50mm)
  const noisy = [129, 131, 130, 130.5, 129.5, 131.2, 200, 50, 130.1, 129.8];
  const med = meshMath.computeMedianWithIQR(noisy);
  assert.ok(med >= 129.5 && med <= 130.5, `Median was ${med}, expected ~130 without outliers`);
});

// ── 4. Quality Warnings: Hair & Glasses ─────────────────────────────────────
console.log('\n--- 4. Quality Warnings ---');

it('triggers warning when hair covers forehead', () => {
  const landmarks = {};
  landmarks[meshMath.LANDMARKS.FOREHEAD_TOP] = { x: 0.50, y: 0.20, z: 0, visibility: 0.15 };
  landmarks[meshMath.LANDMARKS.CHIN] = { x: 0.50, y: 0.80, z: 0 };
  landmarks[meshMath.LANDMARKS.CHEEKBONE_RIGHT] = { x: 0.30, y: 0.50 };
  landmarks[meshMath.LANDMARKS.CHEEKBONE_LEFT] = { x: 0.70, y: 0.50 };
  landmarks[meshMath.LANDMARKS.JAW_RIGHT] = { x: 0.35, y: 0.70 };
  landmarks[meshMath.LANDMARKS.JAW_LEFT] = { x: 0.65, y: 0.70 };
  landmarks[meshMath.LANDMARKS.TEMPLE_RIGHT] = { x: 0.35, y: 0.30 };
  landmarks[meshMath.LANDMARKS.TEMPLE_LEFT] = { x: 0.65, y: 0.30 };
  landmarks[meshMath.LANDMARKS.NOSE_TIP] = { x: 0.50, y: 0.50 };
  landmarks[meshMath.LANDMARKS.EYE_OUTER_RIGHT] = { x: 0.35, y: 0.40 };
  landmarks[meshMath.LANDMARKS.EYE_OUTER_LEFT] = { x: 0.65, y: 0.40 };
  landmarks[meshMath.LANDMARKS.RIGHT_IRIS_RIGHT] = { x: 0.40, y: 0.40 };
  landmarks[meshMath.LANDMARKS.RIGHT_IRIS_LEFT] = { x: 0.35, y: 0.40 };
  landmarks[meshMath.LANDMARKS.LEFT_IRIS_RIGHT] = { x: 0.65, y: 0.40 };
  landmarks[meshMath.LANDMARKS.LEFT_IRIS_LEFT] = { x: 0.60, y: 0.40 };

  const q = meshMath.evaluateFrameQuality(landmarks, config, 640, 480);
  const hairWarn = q.warnings.find(w => w.type === 'hair');
  assert.ok(hairWarn != null, 'Hair warning should be flagged');
  assert.ok(hairWarn.message.includes('Hair detected'));
});

// ── 5. Continuous 0-1 Shape Classification (Zero Gaps) ─────────────────────
console.log('\n--- 5. Continuous 0-1 Shape Classification ---');

it('correctly scores an Oval face fixture as primary shape', () => {
  const ovalRatios = {
    lengthToWidth: 1.45,
    jawToCheekbone: 0.74,
    foreheadToCheekbone: 0.82,
    foreheadToJaw: 1.10,
    jawAngleDeg: 136.0
  };
  const res = meshMath.classifyFaceShape(ovalRatios, config);
  assert.strictEqual(res.primaryShape, 'Oval');
  assert.ok(res.primaryScore > 0.85, `Expected high Oval score, got ${res.primaryScore}`);
});

it('correctly scores a Round face fixture as primary shape', () => {
  const roundRatios = {
    lengthToWidth: 1.15,
    jawToCheekbone: 0.78,
    foreheadToCheekbone: 0.82,
    foreheadToJaw: 1.05,
    jawAngleDeg: 142.0
  };
  const res = meshMath.classifyFaceShape(roundRatios, config);
  assert.strictEqual(res.primaryShape, 'Round');
  assert.ok(res.primaryScore > 0.85);
});

it('correctly scores a Square face fixture as primary shape', () => {
  const squareRatios = {
    lengthToWidth: 1.17,
    jawToCheekbone: 0.88,
    foreheadToCheekbone: 0.88,
    foreheadToJaw: 1.00,
    jawAngleDeg: 120.0
  };
  const res = meshMath.classifyFaceShape(squareRatios, config);
  assert.strictEqual(res.primaryShape, 'Square');
  assert.ok(res.primaryScore > 0.85);
});

it('correctly scores a Heart face fixture as primary shape', () => {
  const heartRatios = {
    lengthToWidth: 1.35,
    jawToCheekbone: 0.65,
    foreheadToCheekbone: 0.88,
    foreheadToJaw: 1.35,
    jawAngleDeg: 126.0
  };
  const res = meshMath.classifyFaceShape(heartRatios, config);
  assert.strictEqual(res.primaryShape, 'Heart');
  assert.ok(res.primaryScore > 0.85);
});

it('correctly scores an Oblong face fixture as primary shape', () => {
  const oblongRatios = {
    lengthToWidth: 1.74,
    jawToCheekbone: 0.80,
    foreheadToCheekbone: 0.84,
    foreheadToJaw: 1.05,
    jawAngleDeg: 128.0
  };
  const res = meshMath.classifyFaceShape(oblongRatios, config);
  assert.strictEqual(res.primaryShape, 'Oblong');
  assert.ok(res.primaryScore > 0.85);
});

it('detects borderline cases and surfaces top 2 shapes when delta <= 10%', () => {
  // Ratios halfway between Round and Oval
  const borderlineRatios = {
    lengthToWidth: 1.28,
    jawToCheekbone: 0.76,
    foreheadToCheekbone: 0.82,
    foreheadToJaw: 1.08,
    jawAngleDeg: 139.0
  };
  const res = meshMath.classifyFaceShape(borderlineRatios, config);
  assert.ok(res.isBorderline, 'Should flag as borderline');
  assert.ok(res.delta <= 0.10, `Delta was ${res.delta}`);
  assert.ok(['Round', 'Oval'].includes(res.primaryShape));
  assert.ok(['Round', 'Oval'].includes(res.secondaryShape));
});

// ── 6. Size Classification & +/- 4mm Boundary Zones ────────────────────────
console.log('\n--- 6. Size Bands & +/- 4mm Overlap ---');

it('classifies width < 122 mm strictly as Small', () => {
  const res = meshMath.classifyFaceSize(118, config);
  assert.strictEqual(res.sizeCategory, 'Small');
  assert.strictEqual(res.isBoundary, false);
  assert.deepStrictEqual(res.matchedFits, ['Narrow']);
});

it('classifies width in 122-130 mm as Small / Medium boundary match', () => {
  const res1 = meshMath.classifyFaceSize(124, config);
  assert.strictEqual(res1.sizeCategory, 'Small / Medium');
  assert.strictEqual(res1.isBoundary, true);
  assert.ok(res1.matchedFits.includes('Narrow') && res1.matchedFits.includes('Regular'));

  const res2 = meshMath.classifyFaceSize(128, config);
  assert.strictEqual(res2.sizeCategory, 'Small / Medium');
  assert.strictEqual(res2.isBoundary, true);
});

it('classifies width in 130-132 mm strictly as Medium', () => {
  const res = meshMath.classifyFaceSize(131, config);
  assert.strictEqual(res.sizeCategory, 'Medium');
  assert.strictEqual(res.isBoundary, false);
  assert.deepStrictEqual(res.matchedFits, ['Regular', 'M']);
});

it('classifies width in 132-140 mm as Medium / Large boundary match', () => {
  const res = meshMath.classifyFaceSize(135, config);
  assert.strictEqual(res.sizeCategory, 'Medium / Large');
  assert.strictEqual(res.isBoundary, true);
  assert.ok(res.matchedFits.includes('Regular') && res.matchedFits.includes('Wide'));
});

it('classifies width > 140 mm strictly as Large', () => {
  const res = meshMath.classifyFaceSize(144, config);
  assert.strictEqual(res.sizeCategory, 'Large');
  assert.strictEqual(res.isBoundary, false);
  assert.deepStrictEqual(res.matchedFits, ['Wide']);
});

// ── 7. Catalog Frame Recommendation Engine & Fallbacks ─────────────────────
console.log('\n--- 7. Catalog Recommendations & Fallbacks ---');

it('matches exact shapes from data.js (e.g. Hex / Geometric, Square, Round)', () => {
  const sizeClass = meshMath.classifyFaceSize(131, config);
  const recs = meshMath.recommendFrames(EYEWEAR_CATALOG, 'Round', sizeClass, config);
  assert.ok(recs.length >= 6, `Expected at least 6 recommendations, got ${recs.length}`);

  // For Round, primary is Rectangular / Square
  const hasSquareOrRect = recs.some(r => r.shape === 'Rectangular' || r.shape === 'Square' || r.shape === 'Hex / Geometric');
  assert.ok(hasSquareOrRect, 'Should recommend angular shapes for Round face');
});

it('strictly enforces in-stock check when stock field is present', () => {
  const syntheticCatalog = [
    { id: 'f-1', name: 'In Stock Frame', shape: 'Round', fit: 'Regular', stock: 2 },
    { id: 'f-2', name: 'Out of Stock Frame', shape: 'Round', fit: 'Regular', stock: 0 },
    { id: 'f-3', name: 'Implicit Stock Frame', shape: 'Round', fit: 'Regular' }
  ];
  const sizeClass = meshMath.classifyFaceSize(131, config);
  const recs = meshMath.recommendFrames(syntheticCatalog, 'Square', sizeClass, config);

  const outOfStockItem = recs.find(r => r.id === 'f-2');
  assert.strictEqual(outOfStockItem, undefined, 'Out of stock items (stock: 0) must never be recommended');
  const inStockItem = recs.find(r => r.id === 'f-1');
  assert.ok(inStockItem != null, 'In stock items must be recommended');
});

it('guarantees at least 6 frames by expanding to complementary styles if needed', () => {
  // Test across all 6 shapes with actual catalog
  const shapes = ['Oval', 'Round', 'Square', 'Heart', 'Diamond', 'Oblong'];
  const sizeClass = meshMath.classifyFaceSize(130, config);

  shapes.forEach(shape => {
    const recs = meshMath.recommendFrames(EYEWEAR_CATALOG, shape, sizeClass, config);
    assert.ok(recs.length >= 6, `Shape ${shape} should yield at least 6 frames, got ${recs.length}`);
  });
});

console.log(`\n======================================================`);
console.log(`🏁 FIND YOUR FIT SUITE: ${passedTests}/${totalTests} TESTS PASSED!`);
console.log(`======================================================\n`);

