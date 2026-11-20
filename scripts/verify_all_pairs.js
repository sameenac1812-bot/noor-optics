const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const fiberDir = path.join(__dirname, '..', 'noorframepics', 'Fiber Frame , Anti glare lens , rs 599 to 700');
const metalDir = path.join(__dirname, '..', 'noorframepics', 'Metal Frame , Blue cut lens , rs 999 to 1200');

const fFiles = fs.readdirSync(fiberDir)
  .filter(f => f.toLowerCase().endsWith('.jpg'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

const mFiles = fs.readdirSync(metalDir)
  .filter(f => f.toLowerCase().endsWith('.jpg'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

function toSeconds(fn) {
  const t = parseInt(fn.replace(/[^\d]/g, '').slice(8));
  return Math.floor(t / 10000) * 3600 + Math.floor((t % 10000) / 100) * 60 + (t % 100);
}

// 1. Metal pairs: all 42 pairs are (2*i, 2*i + 1)
const metalPairs = [];
for (let i = 0; i < mFiles.length; i += 2) {
  const f1 = mFiles[i];
  const f2 = mFiles[i + 1];
  metalPairs.push({
    material: 'Metal',
    price: 999,
    frontFile: f1,
    sideFile: f2,
    frontSrc: path.join(metalDir, f1),
    sideSrc: path.join(metalDir, f2),
    fIndex: i,
    sIndex: i + 1,
    delta: toSeconds(f2) - toSeconds(f1)
  });
}

// 2. Fiber pairs:
// 0..31: 16 pairs (i, i+1) for i = 0, 2, ..., 30
// 32: orphan
// 33..160: 64 pairs (i, i+1) for i = 33, 35, ..., 159
// 161: blank
// 162..191: 15 pairs (i, i+1) for i = 162, 164, ..., 190
const fiberPairs = [];
const reviewList = [];

for (let i = 0; i <= 30; i += 2) {
  const f1 = fFiles[i];
  const f2 = fFiles[i + 1];
  fiberPairs.push({
    material: 'Fiber',
    price: 599,
    frontFile: f1,
    sideFile: f2,
    frontSrc: path.join(fiberDir, f1),
    sideSrc: path.join(fiberDir, f2),
    fIndex: i,
    sIndex: i + 1,
    delta: toSeconds(f2) - toSeconds(f1)
  });
}

// Orphan at 32
reviewList.push({
  index: 32,
  file: fFiles[32],
  material: 'Fiber',
  reason: 'Orphan front view image without corresponding side view photo.'
});

for (let i = 33; i <= 159; i += 2) {
  const f1 = fFiles[i];
  const f2 = fFiles[i + 1];
  fiberPairs.push({
    material: 'Fiber',
    price: 599,
    frontFile: f1,
    sideFile: f2,
    frontSrc: path.join(fiberDir, f1),
    sideSrc: path.join(fiberDir, f2),
    fIndex: i,
    sIndex: i + 1,
    delta: toSeconds(f2) - toSeconds(f1)
  });
}

// Blank at 161
reviewList.push({
  index: 161,
  file: fFiles[161],
  material: 'Fiber',
  reason: 'Empty table / blank background shot with no glasses present.'
});

for (let i = 162; i <= 190; i += 2) {
  const f1 = fFiles[i];
  const f2 = fFiles[i + 1];
  fiberPairs.push({
    material: 'Fiber',
    price: 599,
    frontFile: f1,
    sideFile: f2,
    frontSrc: path.join(fiberDir, f1),
    sideSrc: path.join(fiberDir, f2),
    fIndex: i,
    sIndex: i + 1,
    delta: toSeconds(f2) - toSeconds(f1)
  });
}

console.log(`Fiber pairs: ${fiberPairs.length} (expected 95)`);
console.log(`Metal pairs: ${metalPairs.length} (expected 42)`);
console.log(`Total verified pairs: ${fiberPairs.length + metalPairs.length} (expected 137)`);
console.log(`Review list items: ${reviewList.length}`);
console.log(reviewList);

// Check max time deltas within pairs
const allPairs = [...fiberPairs, ...metalPairs];
const highDeltaPairs = allPairs.filter(p => p.delta < 0 || p.delta > 20);
console.log(`Pairs with delta > 20s: ${highDeltaPairs.length}`);
highDeltaPairs.forEach(p => {
  console.log(`High delta: ${p.material} #${p.fIndex}+#${p.sIndex} (${p.frontFile} -> ${p.sideFile}): ${p.delta}s`);
});
