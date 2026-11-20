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

const bursts = [];
for (let i = 0; i < fFiles.length - 1; i++) {
  const d = toSeconds(fFiles[i + 1]) - toSeconds(fFiles[i]);
  bursts.push({ idx: i, f1: fFiles[i], f2: fFiles[i + 1], d, isBurst: d <= 5 });
}

console.log('Total files:', fFiles.length);
bursts.forEach(b => {
  if (b.d <= 5) {
    console.log(`Burst at ${b.idx}: ${b.f1} -> ${b.f2} (${b.d}s) [idx parity: ${b.idx % 2 === 0 ? 'EVEN' : 'ODD'}]`);
  } else {
    // Gap
    if (b.d < 15) {
      console.log(`Small gap at ${b.idx}: ${b.f1} -> ${b.f2} (${b.d}s)`);
    } else {
      console.log(`Large gap at ${b.idx}: ${b.f1} -> ${b.f2} (${b.d}s)`);
    }
  }
});
