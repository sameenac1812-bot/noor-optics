const fs = require('fs');
const path = require('path');
const db = require('better-sqlite3')('data/noor_optics.db');

console.log('--- PRODUCTS TABLE INFO ---');
console.log(db.prepare("PRAGMA table_info(products)").all());

console.log('--- PRODUCT_IMAGES TABLE INFO ---');
console.log(db.prepare("PRAGMA table_info(product_images)").all());

console.log('--- PRODUCT_VARIANTS TABLE INFO ---');
console.log(db.prepare("PRAGMA table_info(product_variants)").all());

console.log('--- PRODUCTS SAMPLE ---');
const sample = db.prepare('SELECT * FROM products LIMIT 2').all();
console.log(sample);

const fiberDir = path.resolve('noorframepics/Fiber Frame , Anti glare lens , rs 599 to 700');
const metalDir = path.resolve('noorframepics/Metal Frame , Blue cut lens , rs 999 to 1200');

function getSampleFiles(dir) {
  return fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).slice(0, 10);
}

console.log('Fiber sample files:', getSampleFiles(fiberDir));
console.log('Metal sample files:', getSampleFiles(metalDir));
