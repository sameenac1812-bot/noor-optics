const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(__dirname, '..', 'scratch', 'contact_sheet');

async function detectView(thumbPath) {
  // 120x80 grayscale
  const { data, info } = await sharp(thumbPath)
    .resize(120, 80, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // Background intensity (top 15 rows)
  let bg = 0;
  for (let y = 2; y < 15; y++) {
    for (let x = 10; x < w - 10; x++) {
      bg += data[y * w + x];
    }
  }
  bg /= (13 * (w - 20));

  // Check if blank
  let totalDiff = 0;
  for (let y = 20; y < 70; y++) {
    for (let x = 15; x < w - 15; x++) {
      totalDiff += Math.abs(data[y * w + x] - bg);
    }
  }
  if (totalDiff < 15000) {
    return { type: 'BLANK', score: 0 };
  }

  // Profile along the main glasses horizontal band: y = 35 to 65
  // For each column x from 15 to 105, find the maximum edge/contrast
  const colContrast = new Float32Array(w);
  for (let x = 10; x < w - 10; x++) {
    let maxGrad = 0;
    for (let y = 30; y < 65; y++) {
      const g = Math.abs(data[(y + 1) * w + x] - data[(y - 1) * w + x]) +
                Math.abs(data[y * w + (x + 1)] - data[y * w + (x - 1)]);
      if (g > maxGrad) maxGrad = g;
    }
    colContrast[x] = maxGrad;
  }

  // Measure symmetry of colContrast around center (x = 60)
  let symDiff = 0;
  let symSum = 0;
  for (let dx = 1; dx < 45; dx++) {
    const left = colContrast[60 - dx];
    const right = colContrast[60 + dx];
    symDiff += Math.abs(left - right);
    symSum += (left + right);
  }

  const asymRatio = symSum > 0 ? (symDiff / symSum) : 1;

  // Measure left mass vs right mass
  let leftMass = 0, rightMass = 0;
  for (let x = 15; x < 60; x++) leftMass += colContrast[x];
  for (let x = 60; x < 105; x++) rightMass += colContrast[x];
  const massRatio = Math.min(leftMass, rightMass) / Math.max(leftMass, rightMass);

  // In FRONT shot: massRatio > 0.70 and asymRatio < 0.35
  // In SIDE shot: massRatio is lower and asymRatio is higher
  const isFront = (massRatio >= 0.72 && asymRatio <= 0.32);

  return {
    type: isFront ? 'FRONT' : 'SIDE',
    massRatio: Number(massRatio.toFixed(2)),
    asymRatio: Number(asymRatio.toFixed(2))
  };
}

module.exports = { detectView };

if (require.main === module) {
  (async () => {
    console.log('Testing known samples:');
    const tests = [
      { f: 'metal_024.jpg', exp: 'FRONT' },
      { f: 'metal_025.jpg', exp: 'SIDE' },
      { f: 'metal_026.jpg', exp: 'FRONT' },
      { f: 'metal_027.jpg', exp: 'FRONT' },
      { f: 'metal_028.jpg', exp: 'SIDE' },
      { f: 'metal_029.jpg', exp: 'FRONT' },
      { f: 'metal_030.jpg', exp: 'SIDE' },
      { f: 'fiber_006.jpg', exp: 'FRONT' },
      { f: 'fiber_007.jpg', exp: 'SIDE' },
      { f: 'fiber_008.jpg', exp: 'FRONT' },
      { f: 'fiber_009.jpg', exp: 'FRONT' },
      { f: 'fiber_010.jpg', exp: 'SIDE' },
      { f: 'fiber_011.jpg', exp: 'FRONT' },
      { f: 'fiber_012.jpg', exp: 'SIDE' },
      { f: 'fiber_021.jpg', exp: 'FRONT' },
      { f: 'fiber_022.jpg', exp: 'FRONT' },
      { f: 'fiber_023.jpg', exp: 'SIDE' },
      { f: 'fiber_032.jpg', exp: 'FRONT' },
      { f: 'fiber_161.jpg', exp: 'BLANK' }
    ];

    for (const t of tests) {
      const res = await detectView(path.join(outDir, t.f));
      const match = res.type === t.exp;
      console.log(`${t.f.padEnd(16)} | exp: ${t.exp.padEnd(5)} | got: ${res.type.padEnd(5)} | mass: ${res.massRatio} | asym: ${res.asymRatio} -> ${match ? 'PASS' : 'FAIL'}`);
    }
  })();
}
