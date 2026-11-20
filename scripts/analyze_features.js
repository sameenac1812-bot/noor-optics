const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(__dirname, '..', 'scratch', 'contact_sheet');

async function analyzeImage(thumbPath) {
  const { data, info } = await sharp(thumbPath)
    .resize(100, 60, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const channels = info.channels; // 3 for RGB

  // 1. Detect background
  let bgR = 0, bgG = 0, bgB = 0;
  let bgPoints = [[5, 5], [w - 6, 5], [5, 15], [w - 6, 15], [50, 5]];
  bgPoints.forEach(([x, y]) => {
    const idx = (y * w + x) * channels;
    bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
  });
  bgR /= bgPoints.length; bgG /= bgPoints.length; bgB /= bgPoints.length;

  // 2. Grayscale gradients & edge detection
  let leftGrad = 0, rightGrad = 0, totalGrad = 0;
  let fgPixels = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  let minX = w, maxX = 0, minY = h, maxY = 0;

  for (let y = 8; y < h - 8; y++) {
    for (let x = 6; x < w - 6; x++) {
      const idx = (y * w + x) * channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const diffBg = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

      // Gradient
      const idxX = (y * w + (x + 1)) * channels;
      const idxY = ((y + 1) * w + x) * channels;
      const gx = Math.abs(data[idxX] - r) + Math.abs(data[idxX + 1] - g) + Math.abs(data[idxX + 2] - b);
      const gy = Math.abs(data[idxY] - r) + Math.abs(data[idxY + 1] - g) + Math.abs(data[idxY + 2] - b);
      const gTot = gx + gy;

      if (gTot > 30 || diffBg > 35) {
        totalGrad += gTot;
        if (x < w / 2) leftGrad += gTot;
        else rightGrad += gTot;

        fgPixels++;
        sumR += r; sumG += g; sumB += b;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (totalGrad < 800 || fgPixels < 50) {
    return { isBlank: true, type: 'BLANK' };
  }

  const avgR = sumR / fgPixels;
  const avgG = sumG / fgPixels;
  const avgB = sumB / fgPixels;

  const boxW = Math.max(1, maxX - minX + 1);
  const boxH = Math.max(1, maxY - minY + 1);
  const aspect = boxW / boxH;

  const lrBalance = (leftGrad > 0 && rightGrad > 0)
    ? Math.min(leftGrad, rightGrad) / Math.max(leftGrad, rightGrad)
    : 0;

  // Color naming
  const brightness = (avgR * 0.299 + avgG * 0.587 + avgB * 0.114);
  const maxCh = Math.max(avgR, avgG, avgB);
  const minCh = Math.min(avgR, avgG, avgB);
  const sat = maxCh > 0 ? (maxCh - minCh) / maxCh : 0;

  let color = 'Black';
  if (brightness > 200) color = 'Transparent';
  else if (brightness < 70) color = 'Black';
  else if (sat < 0.16) {
    if (brightness > 140) color = 'Silver';
    else if (brightness > 95) color = 'Gunmetal';
    else color = 'Grey';
  } else if (avgR > avgG && avgR > avgB) {
    if (avgG > avgB && (avgR - avgB) > 25) {
      if (brightness > 140) color = 'Gold';
      else color = 'Brown / Tortoise';
    } else {
      color = 'Burgundy';
    }
  } else if (avgB > avgR && avgB > avgG) {
    color = 'Blue';
  } else if (avgG > avgR && avgG > avgB) {
    color = 'Green';
  }

  return {
    isBlank: false,
    lrBalance: Number(lrBalance.toFixed(2)),
    aspect: Number(aspect.toFixed(2)),
    boxW, boxH,
    totalGrad,
    color,
    rgb: [Math.round(avgR), Math.round(avgG), Math.round(avgB)]
  };
}

module.exports = { analyzeImage };

if (require.main === module) {
  (async () => {
    console.log('Testing images 0 to 40 in Fiber...');
    for (let i = 0; i <= 40; i++) {
      const fn = `fiber_${i.toString().padStart(3, '0')}.jpg`;
      const res = await analyzeImage(path.join(outDir, fn));
      console.log(`#${i.toString().padStart(2)}: ${res.isBlank ? 'BLANK' : `lr: ${res.lrBalance} | asp: ${res.aspect} | col: ${res.color}`}`);
    }
  })();
}
