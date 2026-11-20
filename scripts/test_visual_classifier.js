const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(__dirname, '..', 'scratch', 'contact_sheet');

async function analyzeThumb(thumbPath) {
  // Load 120x80 thumbnail raw RGB buffer
  const { data, info } = await sharp(thumbPath)
    .resize(120, 80, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // 1. Detect background color from corners
  let bgR = 0, bgG = 0, bgB = 0;
  const cornerCoords = [
    [5, 5], [w - 6, 5], [5, 15], [w - 6, 15],
    [10, 5], [w - 11, 5]
  ];
  cornerCoords.forEach(([cx, cy]) => {
    const idx = (cy * w + cx) * 3;
    bgR += data[idx];
    bgG += data[idx + 1];
    bgB += data[idx + 2];
  });
  bgR /= cornerCoords.length;
  bgG /= cornerCoords.length;
  bgB /= cornerCoords.length;

  // 2. Identify foreground pixels (frame)
  // Distance from background in RGB space
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let fgCount = 0;
  let leftCount = 0, rightCount = 0;
  let sumX = 0, sumY = 0;

  // Exclude bottom 20% to avoid table reflection
  const searchMaxY = Math.floor(h * 0.82);
  const searchMinY = Math.floor(h * 0.15);

  const mask = new Uint8Array(w * h);

  // Collect frame colors
  const fgColors = [];

  for (let y = searchMinY; y < searchMaxY; y++) {
    for (let x = 5; x < w - 5; x++) {
      const idx = (y * w + x) * 3;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const diff = Math.sqrt(
        (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
      );

      // Frame pixel threshold
      if (diff > 35) {
        mask[y * w + x] = 1;
        fgCount++;
        sumX += x;
        sumY += y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        if (x < w / 2) leftCount++;
        else rightCount++;

        fgColors.push({ r, g, b });
      }
    }
  }

  if (fgCount < 120) {
    return { type: 'BLANK', confidence: 0.99, fgCount };
  }

  const cx = sumX / fgCount;
  const cy = sumY / fgCount;
  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const aspect = boxW / boxH;

  // Compute horizontal symmetry of the mask inside bounding box
  let symOverlap = 0;
  let symTotal = 0;
  const midX = Math.round(cx);

  for (let y = minY; y <= maxY; y++) {
    for (let dx = 1; dx <= Math.min(midX - minX, maxX - midX); dx++) {
      const leftVal = mask[y * w + (midX - dx)];
      const rightVal = mask[y * w + (midX + dx)];
      if (leftVal || rightVal) {
        symTotal++;
        if (leftVal && rightVal) symOverlap++;
      }
    }
  }

  const symmetry = symTotal > 0 ? (symOverlap / symTotal) : 0;
  const lrRatio = leftCount > 0 && rightCount > 0 ? Math.min(leftCount, rightCount) / Math.max(leftCount, rightCount) : 0;

  // Dominant frame color detection
  let avgR = 0, avgG = 0, avgB = 0;
  fgColors.forEach(c => {
    avgR += c.r;
    avgG += c.g;
    avgB += c.b;
  });
  avgR /= fgColors.length;
  avgG /= fgColors.length;
  avgB /= fgColors.length;

  let colorName = 'Black';
  const brightness = (avgR * 0.299 + avgG * 0.587 + avgB * 0.114);
  const maxChannel = Math.max(avgR, avgG, avgB);
  const minChannel = Math.min(avgR, avgG, avgB);
  const saturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;

  if (brightness > 195) {
    colorName = 'Transparent / Clear';
  } else if (brightness < 65) {
    colorName = 'Black';
  } else if (saturation < 0.15) {
    if (brightness > 130) colorName = 'Silver';
    else if (brightness > 85) colorName = 'Gunmetal';
    else colorName = 'Grey';
  } else if (avgR > avgG && avgR > avgB) {
    if (avgG > avgB && (avgR - avgB) > 30) {
      if (brightness > 140) colorName = 'Gold';
      else colorName = 'Tortoise / Brown';
    } else {
      colorName = 'Burgundy / Wine';
    }
  } else if (avgB > avgR && avgB > avgG) {
    colorName = 'Navy Blue';
  } else if (avgG > avgR && avgG > avgB) {
    colorName = 'Olive Green';
  }

  // Front vs Side decision
  // In front view: aspect is wide, symmetry is high, lrRatio is balanced (> 0.65)
  // In side view: temple arm creates strong asymmetry, lrRatio is low (< 0.6), symmetry is low
  let type = 'FRONT';
  if (lrRatio < 0.62 || symmetry < 0.32 || aspect < 1.7) {
    type = 'SIDE';
  }

  return {
    type,
    aspect: aspect.toFixed(2),
    symmetry: symmetry.toFixed(2),
    lrRatio: lrRatio.toFixed(2),
    boxW, boxH,
    fgCount,
    colorName,
    avgColor: `rgb(${Math.round(avgR)},${Math.round(avgG)},${Math.round(avgB)})`
  };
}

async function testAll() {
  console.log('Testing Fiber thumbs...');
  const fiberResults = [];
  for (let i = 0; i < 192; i++) {
    const thumbName = `fiber_${i.toString().padStart(3, '0')}.jpg`;
    const res = await analyzeThumb(path.join(outDir, thumbName));
    fiberResults.push({ i, ...res });
  }

  // Print summary of fiber types
  console.log('Fiber counts by type:');
  const counts = {};
  fiberResults.forEach(r => counts[r.type] = (counts[r.type] || 0) + 1);
  console.log(counts);

  // Check alternating sequence
  console.log('\n--- Fiber Sequence Anomalies (where pattern is not Front -> Side) ---');
  for (let i = 0; i < fiberResults.length; i++) {
    const r = fiberResults[i];
    console.log(`#${i.toString().padStart(3)}: ${r.type.padEnd(5)} | sym: ${r.symmetry || '-'} | lr: ${r.lrRatio || '-'} | asp: ${r.aspect || '-'} | fg: ${r.fgCount} | col: ${r.colorName || '-'}`);
  }
}

testAll().catch(console.error);
