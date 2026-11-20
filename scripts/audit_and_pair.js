const fs = require('fs');
const path = require('path');
const { extractFeatures } = require('./extract_features');

const fiberDir = path.join(__dirname, '..', 'noorframepics', 'Fiber Frame , Anti glare lens , rs 599 to 700');
const metalDir = path.join(__dirname, '..', 'noorframepics', 'Metal Frame , Blue cut lens , rs 999 to 1200');

function toSeconds(fn) {
  const t = parseInt(fn.replace(/[^\d]/g, '').slice(8));
  return Math.floor(t / 10000) * 3600 + Math.floor((t % 10000) / 100) * 60 + (t % 100);
}

async function auditFolder(dirPath, material, fixedPrice, startId) {
  const files = fs.readdirSync(dirPath)
    .filter(f => f.toLowerCase().endsWith('.jpg'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  console.log(`\nAuditing ${material} (${files.length} files)...`);
  const features = [];
  for (let i = 0; i < files.length; i++) {
    const feat = await extractFeatures(path.join(dirPath, files[i]));
    features.push({
      idx: i,
      file: files[i],
      sec: toSeconds(files[i]),
      ...feat
    });
  }

  const pairs = [];
  const review = [];
  let currentId = startId;

  let i = 0;
  while (i < files.length) {
    const cur = features[i];
    
    // Check if blank
    if (cur.isBlank) {
      review.push({
        index: i,
        file: cur.file,
        reason: 'Blank / empty photo without frame'
      });
      i++;
      continue;
    }

    if (i === files.length - 1) {
      // Last image alone
      review.push({
        index: i,
        file: cur.file,
        reason: 'Unpaired trailing single image at end of folder'
      });
      i++;
      continue;
    }

    const next = features[i + 1];
    const delta = next.sec - cur.sec;

    // Check if cur and next form a natural pair
    // A pair has: delta >= 0 and delta <= 20s (most <= 7s)
    // and next is not blank
    // and if there's a third image within 3s, check which one is the side shot
    if (!next.isBlank && delta >= 0 && delta <= 25) {
      // Potential pair!
      // Check if next is a side view or if next is another front shot
      // Let's check color distance
      const colorDist = Math.sqrt(
        (cur.rgb[0] - next.rgb[0])**2 +
        (cur.rgb[1] - next.rgb[1])**2 +
        (cur.rgb[2] - next.rgb[2])**2
      );

      // If next is another front shot of a different frame (delta > 8s and different color or both high symmetry)
      // Check if i+2 is the actual side of next or cur
      if (delta > 8 && colorDist > 50) {
        // Suspicious long delta and different color - might be orphan front shot
        console.log(`[Warning] Suspicious gap/color between #${i} (${cur.file}, ${cur.color}) and #${i+1} (${next.file}, ${next.color}): delta=${delta}s, dist=${colorDist.toFixed(1)}`);
      }

      const id = String(currentId++);
      // Build short description: color + shape + material
      // e.g. "1001 Black Rectangle Metal Frame"
      const name = `${id} ${cur.color} ${cur.shape} ${material} Frame`;

      pairs.push({
        id,
        name,
        shape: cur.shape,
        material,
        color: cur.color,
        price: fixedPrice,
        size: 'Medium',
        confidence: cur.confidence,
        frontFile: cur.file,
        sideFile: next.file,
        frontIdx: i,
        sideIdx: i + 1,
        delta,
        frontPath: path.join(dirPath, cur.file),
        sidePath: path.join(dirPath, next.file)
      });

      i += 2;
    } else {
      // Isolated shot / orphan
      review.push({
        index: i,
        file: cur.file,
        reason: `Isolated image with no pair within 25s (delta to next: ${delta}s)`
      });
      i++;
    }
  }

  console.log(`Found ${pairs.length} pairs and ${review.length} review items in ${material}.`);
  return { pairs, review, nextId: currentId };
}

async function run() {
  const metalRes = await auditFolder(metalDir, 'Metal', 999, 1001);
  const fiberRes = await auditFolder(fiberDir, 'Fiber', 599, metalRes.nextId);

  console.log('\n================ AUDIT SUMMARY ================');
  console.log(`Total Pairs: ${metalRes.pairs.length + fiberRes.pairs.length} (Metal: ${metalRes.pairs.length}, Fiber: ${fiberRes.pairs.length})`);
  console.log(`Total Review Items: ${metalRes.review.length + fiberRes.review.length}`);
  console.log('Metal Review:', metalRes.review);
  console.log('Fiber Review:', fiberRes.review);
}

run().catch(console.error);
