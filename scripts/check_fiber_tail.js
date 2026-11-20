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

console.log('Tracing Fiber from index 76 to 191:');
for (let i = 76; i < fFiles.length - 1; i++) {
  const d = toSeconds(fFiles[i + 1]) - toSeconds(fFiles[i]);
  console.log(`#${i.toString().padStart(3)} -> #${(i + 1).toString().padStart(3)} : ${d}s ${d <= 5 ? '[BURST]' : '[GAP ' + d + 's]'}`);
}
