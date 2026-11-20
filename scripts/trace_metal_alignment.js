const fs = require('fs');
const path = require('path');

const metalDir = path.join(__dirname, '..', 'noorframepics', 'Metal Frame , Blue cut lens , rs 999 to 1200');
const mFiles = fs.readdirSync(metalDir)
  .filter(f => f.toLowerCase().endsWith('.jpg'))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

function toSeconds(fn) {
  const t = parseInt(fn.replace(/[^\d]/g, '').slice(8));
  return Math.floor(t / 10000) * 3600 + Math.floor((t % 10000) / 100) * 60 + (t % 100);
}

console.log('Total metal files:', mFiles.length);

// Let's trace deltas between consecutive files in Metal
for (let i = 0; i < mFiles.length - 1; i++) {
  const d = toSeconds(mFiles[i + 1]) - toSeconds(mFiles[i]);
  console.log(`#${i.toString().padStart(2)} -> #${(i + 1).toString().padStart(2)}: ${mFiles[i]} -> ${mFiles[i + 1]} (${d}s) ${d <= 15 ? '[BURST ' + d + 's]' : '[GAP ' + d + 's]'}`);
}
