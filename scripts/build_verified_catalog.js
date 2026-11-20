const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const fiberDir = path.join(__dirname, '..', 'noorframepics', 'Fiber Frame , Anti glare lens , rs 599 to 700');
const metalDir = path.join(__dirname, '..', 'noorframepics', 'Metal Frame , Blue cut lens , rs 999 to 1200');
const outDir = path.join(__dirname, '..', 'images', 'frames');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function toSec(fn) {
  const t = parseInt(fn.replace(/[^\d]/g, '').slice(8));
  return Math.floor(t / 10000) * 3600 + Math.floor((t % 10000) / 100) * 60 + (t % 100);
}

// 1. Audit Metal files
const metalFiles = fs.readdirSync(metalDir)
  .filter(f => f.toLowerCase().endsWith('.jpg'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

// Metal orphans: metal_026 (IMG20261120153143.jpg) and metal_035 (IMG20261120153310.jpg)
const metalSkip = new Set([26, 35]);
const metalPairs = [];
const metalReview = [
  {
    index: 26,
    file: metalFiles[26],
    material: 'Metal',
    reason: 'Orphan single front view of Titex gunmetal hexagonal frame without side view',
    confidence: 'needs review'
  },
  {
    index: 35,
    file: metalFiles[35],
    material: 'Metal',
    reason: 'Orphan single front view of Titex frame with barcode tag without side view (66s gap to next)',
    confidence: 'needs review'
  }
];

const validMetal = metalFiles.map((f, i) => ({ i, f, sec: toSec(f), fullPath: path.join(metalDir, f) })).filter(x => !metalSkip.has(x.i));
for (let p = 0; p < validMetal.length; p += 2) {
  metalPairs.push({
    material: 'Metal',
    price: 999,
    frontFile: validMetal[p].f,
    frontPath: validMetal[p].fullPath,
    frontIdx: validMetal[p].i,
    sideFile: validMetal[p+1].f,
    sidePath: validMetal[p+1].fullPath,
    sideIdx: validMetal[p+1].i,
    deltaSec: validMetal[p+1].sec - validMetal[p].sec
  });
}

// 2. Audit Fiber files
const fiberFiles = fs.readdirSync(fiberDir)
  .filter(f => f.toLowerCase().endsWith('.jpg'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

const fiberSkip = new Set([8, 21, 32, 63, 64, 65, 146, 161]);
const fiberPairs = [];
const fiberReview = [
  {
    index: 8,
    file: fiberFiles[8],
    material: 'Fiber',
    reason: 'Orphan single front view of Wonder Craft olive/clear frame without side view',
    confidence: 'needs review'
  },
  {
    index: 21,
    file: fiberFiles[21],
    material: 'Fiber',
    reason: 'Orphan single front view of Spice black geometric frame without side view',
    confidence: 'needs review'
  },
  {
    index: 32,
    file: fiberFiles[32],
    material: 'Fiber',
    reason: 'Orphan single front view of RPM transparent grey frame without side view',
    confidence: 'needs review'
  },
  {
    index: 63,
    file: fiberFiles[63],
    material: 'Fiber',
    reason: 'Orphan single front view of i-deal eye black rectangle frame without side view',
    confidence: 'needs review'
  },
  {
    index: 64,
    file: fiberFiles[64],
    material: 'Fiber',
    reason: 'Orphan single front view of Hope black rectangle frame without side view',
    confidence: 'needs review'
  },
  {
    index: 65,
    file: fiberFiles[65],
    material: 'Fiber',
    reason: 'Orphan single front view of Tom Hardy white frame without side view',
    confidence: 'needs review'
  },
  {
    index: 146,
    file: fiberFiles[146],
    material: 'Fiber',
    reason: 'Orphan single front view of i-deal eye transparent pink frame without side view',
    confidence: 'needs review'
  },
  {
    index: 161,
    file: fiberFiles[161],
    material: 'Fiber',
    reason: 'Blank accidental photo of empty table surface (no frame)',
    confidence: 'needs review'
  }
];

const validFiber = fiberFiles.map((f, i) => ({ i, f, sec: toSec(f), fullPath: path.join(fiberDir, f) })).filter(x => !fiberSkip.has(x.i));
for (let p = 0; p < validFiber.length; p += 2) {
  fiberPairs.push({
    material: 'Fiber',
    price: 599,
    frontFile: validFiber[p].f,
    frontPath: validFiber[p].fullPath,
    frontIdx: validFiber[p].i,
    sideFile: validFiber[p+1].f,
    sidePath: validFiber[p+1].fullPath,
    sideIdx: validFiber[p+1].i,
    deltaSec: validFiber[p+1].sec - validFiber[p].sec
  });
}

console.log(`Audited Pairs: Metal=${metalPairs.length}, Fiber=${fiberPairs.length}. Total=${metalPairs.length + fiberPairs.length}`);
console.log(`Audited Review Items: Metal=${metalReview.length}, Fiber=${fiberReview.length}. Total=${metalReview.length + fiberReview.length}`);

// Visual classifier for front view
async function classifyFrame(filePath, material) {
  const { data, info } = await sharp(filePath)
    .resize(120, 80, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width, h = info.height;
  
  // Background estimation from 8 perimeter points
  let bgR = 0, bgG = 0, bgB = 0;
  const corners = [
    [5, 5], [w - 6, 5], [5, 15], [w - 6, 15],
    [5, h - 6], [w - 6, h - 6], [w / 2, 5], [w / 2, h - 6]
  ];
  corners.forEach(([x, y]) => {
    const idx = (Math.floor(y) * w + Math.floor(x)) * 3;
    bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
  });
  bgR /= corners.length; bgG /= corners.length; bgB /= corners.length;

  let fgCount = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let topRowFg = 0, midRowFg = 0, botRowFg = 0;
  let bridgeFg = 0;

  for (let y = 8; y < h - 10; y++) {
    for (let x = 8; x < w - 8; x++) {
      const idx = (y * w + x) * 3;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const diffBg = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

      if (diffBg > 42) {
        fgCount++;
        sumR += r; sumG += g; sumB += b;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        if (y < h * 0.38) topRowFg++;
        else if (y < h * 0.62) midRowFg++;
        else botRowFg++;

        // Bridge check (around center x)
        if (x >= w * 0.44 && x <= w * 0.56 && y >= h * 0.35 && y <= h * 0.50) {
          bridgeFg++;
        }
      }
    }
  }

  const boxW = Math.max(1, maxX - minX);
  const boxH = Math.max(1, maxY - minY);
  const aspect = boxW / boxH;

  const avgR = fgCount > 0 ? sumR / fgCount : bgR;
  const avgG = fgCount > 0 ? sumG / fgCount : bgG;
  const avgB = fgCount > 0 ? sumB / fgCount : bgB;
  const brightness = (avgR + avgG + avgB) / 3;

  // Color determination
  let color = 'Black';
  if (brightness < 60) {
    color = 'Matte Black';
  } else if (brightness > 185) {
    color = 'Crystal Clear';
  } else if (material === 'Metal' && avgR > 140 && avgG > 125 && avgB < 115) {
    color = 'Gold';
  } else if (material === 'Metal' && avgR > 130 && avgG < 110 && avgB < 110) {
    color = 'Rose Gold';
  } else if (material === 'Metal' && Math.abs(avgR - avgG) < 12 && Math.abs(avgG - avgB) < 12) {
    color = brightness < 90 ? 'Gunmetal' : 'Silver';
  } else if (avgR > avgB + 20 && avgG > avgB + 10) {
    color = 'Tortoise / Brown';
  } else if (avgB > avgR + 15 && avgB > avgG + 10) {
    color = 'Deep Blue';
  } else if (avgG > avgR + 10 && avgG > avgB + 10) {
    color = 'Olive Green';
  } else if (avgR > avgG + 25 && avgR > avgB + 20) {
    color = 'Burgundy';
  } else if (brightness > 150) {
    color = 'Translucent Grey';
  } else {
    color = 'Classic Black';
  }

  // Shape determination
  // Valid shapes: Round, Square, Rectangle, Oval, Cat-Eye, Aviator, Wayfarer, Browline, Geometric/Hexagonal, Pantos, Butterfly
  let shape = 'Rectangle';
  let confidence = 'high';

  // Check for Aviator (double bar / brow bar)
  if (material === 'Metal' && topRowFg > botRowFg * 1.5 && aspect < 2.5 && aspect > 1.8) {
    shape = 'Aviator';
  } else if (aspect >= 2.65) {
    shape = 'Rectangle';
  } else if (aspect >= 2.25) {
    if (boxH > 32) shape = 'Square';
    else shape = 'Rectangle';
  } else if (aspect >= 1.85) {
    if (topRowFg > botRowFg * 1.35) {
      shape = 'Browline';
    } else if (boxH >= 34) {
      shape = 'Geometric/Hexagonal';
    } else {
      shape = 'Wayfarer';
    }
  } else if (aspect >= 1.45) {
    if (boxH >= 35) {
      shape = 'Round';
    } else {
      shape = 'Oval';
    }
  } else {
    shape = 'Round';
  }

  // Rim style
  let rimStyle = 'Full-rim';
  if (material === 'Metal') {
    if (botRowFg < topRowFg * 0.4) rimStyle = 'Half-rim';
    else if (fgCount < 300) rimStyle = 'Rimless';
  }

  return {
    color,
    shape,
    rimStyle,
    confidence,
    aspect: Number(aspect.toFixed(2)),
    brightness: Math.round(brightness)
  };
}

async function smartCropAndResize(inputPath, outputPath) {
  const meta = await sharp(inputPath).metadata();
  const w = meta.width;
  const h = meta.height;

  // 4:3 target aspect ratio with balanced studio framing
  let cropW = w;
  let cropH = Math.round(w * 0.75);
  if (cropH > h) {
    cropH = h;
    cropW = Math.round(h * (4 / 3));
  }
  let left = Math.max(0, Math.round((w - cropW) / 2));
  // Position vertically around 0.78 to give balanced studio clearance above and subtle reflection below
  let top = Math.round((h - cropH) * 0.78);
  if (top < 0) top = 0;
  if (top + cropH > h) top = h - cropH;
  if (left + cropW > w) left = w - cropW;

  await sharp(inputPath)
    .extract({ left: Math.floor(left), top: Math.floor(top), width: Math.floor(cropW), height: Math.floor(cropH) })
    .resize(900, 675, { fit: 'fill' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(outputPath);
}

async function processAll() {
  const allListings = [];
  let currentId = 1001;

  console.log('\n--- Processing Metal Frames (41 pairs) ---');
  for (let i = 0; i < metalPairs.length; i++) {
    const pair = metalPairs[i];
    const id = String(currentId++);
    const frontOut = `frames/${id}-front.jpg`;
    const sideOut = `frames/${id}-side.jpg`;

    // Smart crop and resize front & side
    await smartCropAndResize(pair.frontPath, path.join(outDir, `${id}-front.jpg`));
    await smartCropAndResize(pair.sidePath, path.join(outDir, `${id}-side.jpg`));

    const cls = await classifyFrame(pair.frontPath, 'Metal');
    const name = `${id} ${cls.color} ${cls.shape} Metal Frame`;

    allListings.push({
      id,
      name,
      shape: cls.shape,
      material: 'Metal',
      color: cls.color,
      price: 999,
      size: 'Medium',
      rimStyle: cls.rimStyle,
      confidence: cls.confidence,
      frontFile: pair.frontFile,
      sideFile: pair.sideFile,
      images: [
        `images/${frontOut}`,
        `images/${sideOut}`
      ],
      alt_front: `${name} - Front View`,
      alt_side: `${name} - Side View`,
      sourceIndex: { front: pair.frontIdx, side: pair.sideIdx, deltaSec: pair.deltaSec }
    });
  }

  console.log('\n--- Processing Fiber Frames (92 pairs) ---');
  for (let i = 0; i < fiberPairs.length; i++) {
    const pair = fiberPairs[i];
    const id = String(currentId++);
    const frontOut = `frames/${id}-front.jpg`;
    const sideOut = `frames/${id}-side.jpg`;

    // Smart crop and resize front & side
    await smartCropAndResize(pair.frontPath, path.join(outDir, `${id}-front.jpg`));
    await smartCropAndResize(pair.sidePath, path.join(outDir, `${id}-side.jpg`));

    const cls = await classifyFrame(pair.frontPath, 'Fiber');
    const name = `${id} ${cls.color} ${cls.shape} Fiber Frame`;

    allListings.push({
      id,
      name,
      shape: cls.shape,
      material: 'Fiber',
      color: cls.color,
      price: 599,
      size: 'Medium',
      rimStyle: cls.rimStyle,
      confidence: cls.confidence,
      frontFile: pair.frontFile,
      sideFile: pair.sideFile,
      images: [
        `images/${frontOut}`,
        `images/${sideOut}`
      ],
      alt_front: `${name} - Front View`,
      alt_side: `${name} - Side View`,
      sourceIndex: { front: pair.frontIdx, side: pair.sideIdx, deltaSec: pair.deltaSec }
    });
  }

  console.log(`\nGenerated ${allListings.length} total product listings.`);

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalFrames: allListings.length,
    metalCount: metalPairs.length,
    fiberCount: fiberPairs.length,
    pricingRules: {
      Metal: 999,
      Fiber: 599
    },
    sizeRule: 'Medium (all frames)',
    products: allListings,
    needsReview: [
      ...metalReview,
      ...fiberReview
    ]
  };

  const manifestPath = path.join(__dirname, '..', 'frames-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Saved manifest to ${manifestPath}`);
}

processAll().catch(err => {
  console.error('Processing failed:', err);
  process.exit(1);
});
