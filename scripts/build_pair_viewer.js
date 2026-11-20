const fs = require('fs');
const path = require('path');

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

// Generate HTML with all consecutive items
let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Frame Pairs Visual Inspector</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 20px; }
h1, h2 { color: #38bdf8; }
.section { margin-bottom: 40px; }
.pair-row { display: flex; align-items: center; background: #1e293b; border-radius: 8px; margin-bottom: 12px; padding: 10px; gap: 15px; border: 1px solid #334155; }
.pair-row.warning { border-color: #f59e0b; background: #292524; }
.pair-row.orphan { border-color: #ef4444; background: #3b0764; }
.img-box { text-align: center; width: 220px; }
.img-box img { width: 200px; height: 140px; object-fit: contain; background: #fff; border-radius: 4px; }
.img-box .caption { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.pair-info { flex: 1; font-size: 13px; line-height: 1.5; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
.badge.fiber { background: #0284c7; color: #fff; }
.badge.metal { background: #d97706; color: #fff; }
.badge.warn { background: #ea580c; color: #fff; }
</style></head><body>
<h1>Noor Opticals – Frame Pairs Visual Inspector</h1>
<p>Verifying all front-and-side image pairs against original photos.</p>
`;

// Metal section
html += `<div class="section"><h2>Metal Frames (Folder: Metal Frame , Blue cut lens , rs 999 to 1200) – 84 Images = 42 Pairs</h2>`;
for (let i = 0; i < mFiles.length; i += 2) {
  const f1 = mFiles[i];
  const f2 = mFiles[i + 1];
  const delta = toSeconds(f2) - toSeconds(f1);
  const pairNum = (i / 2) + 1;
  const isWarn = delta > 25 || delta < 0;
  html += `
    <div class="pair-row ${isWarn ? 'warning' : ''}">
      <div style="width: 70px; font-weight: bold; color: #38bdf8;">Pair #${pairNum}</div>
      <div class="img-box">
        <img src="contact_sheet/metal_${i.toString().padStart(3, '0')}.jpg" loading="lazy">
        <div class="caption">FRONT (#${i}): ${f1}</div>
      </div>
      <div class="img-box">
        <img src="contact_sheet/metal_${(i + 1).toString().padStart(3, '0')}.jpg" loading="lazy">
        <div class="caption">SIDE (#${i + 1}): ${f2}</div>
      </div>
      <div class="pair-info">
        <span class="badge metal">Metal ₹999</span> ${isWarn ? '<span class="badge warn">Delta ' + delta + 's</span>' : '<span style="color:#10b981;">Delta: ' + delta + 's</span>'}<br>
        <strong>Front:</strong> ${f1}<br>
        <strong>Side:</strong> ${f2}
      </div>
    </div>
  `;
}
html += `</div>`;

// Fiber section
html += `<div class="section"><h2>Fiber Frames (Folder: Fiber Frame , Anti glare lens , rs 599 to 700) – 192 Images</h2>`;
html += `<p>All 192 items sequentially indexed with thumbnails:</p>`;
for (let i = 0; i < fFiles.length; i++) {
  const f = fFiles[i];
  const nextDelta = i < fFiles.length - 1 ? (toSeconds(fFiles[i + 1]) - toSeconds(f)) : 0;
  const prevDelta = i > 0 ? (toSeconds(f) - toSeconds(fFiles[i - 1])) : 0;
  html += `
    <div class="pair-row" id="fiber-row-${i}">
      <div style="width: 50px; font-weight: bold;">#${i}</div>
      <div class="img-box">
        <img src="contact_sheet/fiber_${i.toString().padStart(3, '0')}.jpg" loading="lazy">
        <div class="caption">${f}</div>
      </div>
      <div class="pair-info">
        <span class="badge fiber">Fiber</span> Prev delta: ${prevDelta}s | Next delta: ${nextDelta}s<br>
        Filename: ${f}
      </div>
    </div>
  `;
}
html += `</div></body></html>`;

fs.writeFileSync(path.join(__dirname, '..', 'scratch', 'verify_pairs.html'), html);
console.log('Saved scratch/verify_pairs.html');
