const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const fiberDir = path.resolve('noorframepics/Fiber Frame , Anti glare lens , rs 599 to 700');
const metalDir = path.resolve('noorframepics/Metal Frame , Blue cut lens , rs 999 to 1200');

async function checkFolder(dir, label) {
  const files = fs.readdirSync(dir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  console.log(`\n=================== ${label} (${files.length} files = ${files.length/2} pairs) ===================`);
  
  for (let i = 0; i < Math.min(files.length, 12); i += 2) {
    const f1 = files[i];
    const f2 = files[i+1];
    const m1 = await sharp(path.join(dir, f1)).metadata();
    const m2 = await sharp(path.join(dir, f2)).metadata();
    console.log(`Pair ${i/2 + 1}:`);
    console.log(`  Front (${f1}): ${m1.width}x${m1.height}, format=${m1.format}`);
    console.log(`  Side  (${f2}): ${m2.width}x${m2.height}, format=${m2.format}`);
  }
}

async function run() {
  await checkFolder(fiberDir, 'FIBER FRAMES');
  await checkFolder(metalDir, 'METAL FRAMES');
}
run();
