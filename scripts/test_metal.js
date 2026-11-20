const path = require('path');
const { analyzeImage } = require('./analyze_features.js');
const outDir = path.join(__dirname, '..', 'scratch', 'contact_sheet');

async function testMetal() {
  console.log('Testing all 42 Metal pairs (84 images)...');
  let cleanPairs = 0;
  for (let i = 0; i < 84; i += 2) {
    const fn1 = `metal_${i.toString().padStart(3, '0')}.jpg`;
    const fn2 = `metal_${(i + 1).toString().padStart(3, '0')}.jpg`;
    const res1 = await analyzeImage(path.join(outDir, fn1));
    const res2 = await analyzeImage(path.join(outDir, fn2));
    const isFront1 = res1.lrBalance >= 0.70;
    const isSide2 = res2.lrBalance <= 0.85;
    console.log(`Metal Pair #${(i/2)+1}: #${i}(lr=${res1.lrBalance}, col=${res1.color}) + #${i+1}(lr=${res2.lrBalance}, col=${res2.color}) -> ${isFront1 && isSide2 ? 'OK' : 'CHECK'}`);
    if (isFront1 && isSide2) cleanPairs++;
  }
  console.log(`Clean Metal pairs: ${cleanPairs} / 42`);
}
testMetal();
