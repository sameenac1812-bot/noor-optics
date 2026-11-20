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

const outDir = path.join(__dirname, '..', 'scratch', 'contact_sheet');
fs.mkdirSync(outDir, { recursive: true });

async function generateSheet(files, srcDir, name) {
  console.log(`Generating contact sheet for ${name} (${files.length} images)...`);
  let html = `<!DOCTYPE html><html><head><title>${name}</title>
<style>
body { font-family: sans-serif; background: #f0f0f0; margin: 10px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.card { background: #fff; padding: 6px; border-radius: 6px; font-size: 11px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.card img { width: 100%; height: 160px; object-fit: contain; background: #fafafa; }
.card.burst { border-left: 4px solid #10b981; }
.card.gap { border-left: 4px solid #f59e0b; }
.meta { margin-top: 4px; line-height: 1.3; }
</style></head><body><h1>${name} (${files.length} images)</h1><div class="grid">`;

  for (let i = 0; i < files.length; i++) {
    const fn = files[i];
    const thumbName = `${name}_${i.toString().padStart(3, '0')}.jpg`;
    const thumbPath = path.join(outDir, thumbName);
    
    if (!fs.existsSync(thumbPath)) {
      await sharp(path.join(srcDir, fn))
        .resize(300, 220, { fit: 'inside' })
        .jpeg({ quality: 75 })
        .toFile(thumbPath);
    }

    const prevDelta = i > 0 ? (toSeconds(fn) - toSeconds(files[i - 1])) : 0;
    const nextDelta = i < files.length - 1 ? (toSeconds(files[i + 1]) - toSeconds(fn)) : 0;
    const isBurst = nextDelta <= 5 && nextDelta > 0;

    html += `
      <div class="card ${isBurst ? 'burst' : 'gap'}">
        <img src="${thumbName}" loading="lazy" />
        <div class="meta">
          <strong>#${i}</strong>: ${fn}<br>
          Prev: ${prevDelta}s | Next: ${nextDelta}s
        </div>
      </div>
    `;
  }

  html += `</div></body></html>`;
  fs.writeFileSync(path.join(outDir, `${name}.html`), html);
  console.log(`Saved ${name}.html`);
}

async function main() {
  await generateSheet(fFiles, fiberDir, 'fiber');
  await generateSheet(mFiles, metalDir, 'metal');
  console.log('Done generating contact sheets.');
}

main().catch(console.error);
