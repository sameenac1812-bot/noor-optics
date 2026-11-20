const fs = require('fs');
const path = require('path');

const fiberDir = path.join(__dirname, '..', 'noorframepics', 'Fiber Frame , Anti glare lens , rs 599 to 700');
const fFiles = fs.readdirSync(fiberDir)
  .filter(f => f.toLowerCase().endsWith('.jpg'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

function toSeconds(fn) {
  const t = parseInt(fn.replace(/[^\d]/g, '').slice(8));
  return Math.floor(t / 10000) * 3600 + Math.floor((t % 10000) / 100) * 60 + (t % 100);
}

// Known candidate orphans / anomalies:
// Let's test if skipping 8, 21, 32, 161 makes all remaining 188 images pair up into 94 clean pairs!
const skipSet = new Set([8, 21, 32, 161]);
const remaining = [];
for (let i = 0; i < fFiles.length; i++) {
  if (!skipSet.has(i)) {
    remaining.push({ origIdx: i, file: fFiles[i] });
  }
}

console.log(`Remaining images after skipping [8, 21, 32, 161]: ${remaining.length} (expected 188 = 94 pairs)`);

let maxPairDelta = 0;
let badPairs = [];

for (let p = 0; p < remaining.length; p += 2) {
  const front = remaining[p];
  const side = remaining[p + 1];
  const delta = toSeconds(side.file) - toSeconds(front.file);
  if (delta > maxPairDelta) maxPairDelta = delta;
  
  const pairNum = (p / 2) + 1;
  const isBad = delta < 0 || delta > 15;
  if (isBad) {
    badPairs.push({ pairNum, front, side, delta });
  }
  console.log(`Pair #${pairNum.toString().padStart(2)}: orig[#${front.origIdx.toString().padStart(3)}, #${side.origIdx.toString().padStart(3)}] (${front.file} -> ${side.file}) delta: ${delta}s ${isBad ? '⚠️ BAD' : '✓ OK'}`);
}

console.log(`\nMax pair delta: ${maxPairDelta}s`);
console.log(`Bad pairs count: ${badPairs.length}`);
if (badPairs.length > 0) {
  console.log('Bad pairs details:', badPairs);
}
