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

async function extractFeatures(filePath) {
  // Load raw image scaled down
  const { data, info } = await sharp(filePath)
    .resize(100, 60, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width, h = info.height;
  
  // Background estimation from corners
  let bgR = 0, bgG = 0, bgB = 0;
  const corners = [[4, 4], [w - 5, 4], [4, 12], [w - 5, 12], [50, 4]];
  corners.forEach(([x, y]) => {
    const idx = (y * w + x) * 3;
    bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
  });
  bgR /= corners.length; bgG /= corners.length; bgB /= corners.length;

  let fgCount = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  let leftGrad = 0, rightGrad = 0;
  let minX = w, maxX = 0, minY = h, maxY = 0;

  for (let y = 6; y < h - 8; y++) {
    for (let x = 6; x < w - 6; x++) {
      const idx = (y * w + x) * 3;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const diffBg = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

      const gx = Math.abs(data[idx + 3] - r) + Math.abs(data[idx + 4] - g) + Math.abs(data[idx + 5] - b);
      const gy = Math.abs(data[idx + w * 3] - r) + Math.abs(data[idx + w * 3 + 1] - g) + Math.abs(data[idx + w * 3 + 2] - b);
      const grad = gx + gy;

      if (grad > 24 || diffBg > 28) {
        fgCount++;
        sumR += r; sumG += g; sumB += b;
        if (x < w / 2) leftGrad += grad + diffBg;
        else rightGrad += grad + diffBg;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (fgCount < 60) {
    return { isBlank: true, color: 'None', shape: 'None', lrRatio: 0, aspect: 0, boxW: 0, boxH: 0 };
  }

  const avgR = sumR / fgCount;
  const avgG = sumG / fgCount;
  const avgB = sumB / fgCount;

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  const aspect = boxW / boxH;
  const lrRatio = (leftGrad > 0 && rightGrad > 0)
    ? Math.min(leftGrad, rightGrad) / Math.max(leftGrad, rightGrad)
    : 0;

  // Color detection
  const brightness = (avgR * 0.299 + avgG * 0.587 + avgB * 0.114);
  const maxCh = Math.max(avgR, avgG, avgB);
  const minCh = Math.min(avgR, avgG, avgB);
  const sat = maxCh > 0 ? (maxCh - minCh) / maxCh : 0;

  let color = 'Black';
  if (brightness > 200) color = 'Transparent';
  else if (brightness < 68) color = 'Black';
  else if (sat < 0.15) {
    if (brightness > 135) color = 'Silver';
    else if (brightness > 90) color = 'Gunmetal';
    else color = 'Grey';
  } else if (avgR > avgG && avgR > avgB) {
    if (avgG > avgB && (avgR - avgB) > 20) {
      if (brightness > 140) color = 'Gold';
      else color = 'Tortoise / Brown';
    } else {
      color = 'Burgundy';
    }
  } else if (avgB > avgR && avgB > avgG) {
    color = 'Blue';
  } else if (avgG > avgR && avgG > avgB) {
    color = 'Green';
  }

  // Shape detection from bounding box aspect ratio and lens contour
  // Shapes allowed: Round, Square, Rectangle, Oval, Cat-Eye, Aviator, Wayfarer, Browline, Geometric/Hexagonal, Pantos, Butterfly.
  let shape = 'Rectangle';
  let confidence = 'high';

  if (aspect >= 2.6) {
    shape = 'Rectangle';
  } else if (aspect >= 2.2) {
    if (boxH > 28) shape = 'Square';
    else shape = 'Rectangle';
  } else if (aspect >= 1.8) {
    if (boxH >= 30) {
      shape = 'Geometric/Hexagonal';
    } else {
      shape = 'Wayfarer';
    }
  } else {
    shape = 'Round';
  }

  return {
    isBlank: false,
    color,
    shape,
    confidence,
    lrRatio: Number(lrRatio.toFixed(2)),
    aspect: Number(aspect.toFixed(2)),
    boxW, boxH,
    rgb: [Math.round(avgR), Math.round(avgG), Math.round(avgB)],
    fgCount
  };
}

module.exports = { extractFeatures };
