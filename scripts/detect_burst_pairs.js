const fs = require('fs');
const path = require('path');

const fiberDir = path.join(__dirname, '..', 'noorframepics', 'Fiber Frame , Anti glare lens , rs 599 to 700');
const metalDir = path.join(__dirname, '..', 'noorframepics', 'Metal Frame , Blue cut lens , rs 999 to 1200');

function toSeconds(fn) {
  const t = parseInt(fn.replace(/[^\d]/g, '').slice(8));
  return Math.floor(t / 10000) * 3600 + Math.floor((t % 10000) / 100) * 60 + (t % 100);
}

function analyzeFolder(dirName, label) {
  const files = fs.readdirSync(dirName)
    .filter(f => f.toLowerCase().endsWith('.jpg'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  console.log(`\n=================== ${label} (${files.length} images) ===================`);
  
  const events = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const prevDelta = i > 0 ? (toSeconds(f) - toSeconds(files[i - 1])) : 999;
    const nextDelta = i < files.length - 1 ? (toSeconds(files[i + 1]) - toSeconds(f)) : 999;
    events.push({ i, f, prevDelta, nextDelta });
  }

  // Find bursts: where nextDelta <= 7s
  // If nextDelta <= 7s and prevDelta > 7s -> Start of pair (Front)
  // If prevDelta <= 7s and nextDelta > 7s -> End of pair (Side)
  // If prevDelta > 7s and nextDelta > 7s -> Isolated / Orphan!
  // If prevDelta <= 7s and nextDelta <= 7s -> Triple burst (burst of 3 or more shots)!
  
  const pairs = [];
  const orphans = [];
  const triples = [];

  let p = 0;
  while (p < files.length) {
    const cur = events[p];
    if (cur.nextDelta <= 7) {
      // Check if it's a 2-shot burst or 3-shot burst
      const next = events[p + 1];
      if (next && next.nextDelta <= 7) {
        // Triple!
        triples.push({ start: p, files: [cur.f, next.f, events[p + 2].f] });
        p += 2; // investigate
      } else {
        pairs.push({ frontIdx: p, sideIdx: p + 1, front: cur.f, side: next.f, delta: cur.nextDelta });
        p += 2;
      }
    } else {
      orphans.push({ idx: p, file: cur.f, prevDelta: cur.prevDelta, nextDelta: cur.nextDelta });
      p += 1;
    }
  }

  console.log(`Detected Pairs (delta <= 7s): ${pairs.length}`);
  console.log(`Detected Isolated / Orphans (gap on both sides): ${orphans.length}`);
  orphans.forEach(o => console.log(`  Orphan #${o.idx}: ${o.file} (prev: ${o.prevDelta}s, next: ${o.nextDelta}s)`));
  console.log(`Detected Triple / Multi-bursts: ${triples.length}`);
  triples.forEach(t => console.log(`  Triple at #${t.start}:`, t.files));

  return { files, pairs, orphans, triples };
}

analyzeFolder(metalDir, 'METAL');
analyzeFolder(fiberDir, 'FIBER');
