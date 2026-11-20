const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(__dirname, '..', 'scratch', 'contact_sheet');

async function getEdgeEnergy(thumbPath) {
  // Compute Sobel or edge filter on 100x60 grayscale image
  const { data, info } = await sharp(thumbPath)
    .resize(100, 60, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;

  // Compute horizontal and vertical gradients in center 80% region
  let edgeSum = 0;
  let leftEdge = 0, rightEdge = 0;
  const minX = 10, maxX = 90, minY = 10, maxY = 50;

  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const idx = y * w + x;
      const gx = Math.abs(data[idx + 1] - data[idx - 1]);
      const gy = Math.abs(data[(y + 1) * w + x] - data[(y - 1) * w + x]);
      const grad = gx + gy;

      if (grad > 20) {
        edgeSum += grad;
        if (x < 50) leftEdge += grad;
        else rightEdge += grad;
      }
    }
  }

  const lrBalance = (leftEdge > 0 && rightEdge > 0)
    ? Math.min(leftEdge, rightEdge) / Math.max(leftEdge, rightEdge)
    : 0;

  return {
    edgeSum,
    leftEdge,
    rightEdge,
    lrBalance: lrBalance.toFixed(2),
    isBlank: edgeSum < 1500
  };
}

async function run() {
  console.log('Testing all 192 fiber images edge energy:');
  const blanks = [];
  for (let i = 0; i < 192; i++) {
    const thumbName = `fiber_${i.toString().padStart(3, '0')}.jpg`;
    const res = await getEdgeEnergy(path.join(outDir, thumbName));
    if (res.isBlank) {
      blanks.push({ i, ...res });
    }
  }
  console.log('Detected Blank images:', blanks);
}

run().catch(console.error);
