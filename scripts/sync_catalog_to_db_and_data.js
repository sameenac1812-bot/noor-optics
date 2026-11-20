const fs = require('fs');
const path = require('path');
const { db } = require('../server/db');

const manifestPath = path.join(__dirname, '..', 'frames-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const products = manifest.products;

console.log(`Syncing ${products.length} products to SQLite and data.js...`);

// 1. Clear old mock products
db.transaction(() => {
  db.prepare('DELETE FROM inventory_balances').run();
  db.prepare('DELETE FROM product_images').run();
  db.prepare('DELETE FROM product_variants').run();
  db.prepare('DELETE FROM products').run();
})();

console.log('Cleared old products from SQLite.');

function getColorHex(color) {
  const c = color.toLowerCase();
  if (c.includes('black')) return '#1A1A1A';
  if (c.includes('gold')) return '#D4AF37';
  if (c.includes('silver')) return '#C0C0C0';
  if (c.includes('gunmetal')) return '#4A4A4A';
  if (c.includes('rose gold')) return '#B76E79';
  if (c.includes('clear')) return '#E5E7EB';
  if (c.includes('brown') || c.includes('tortoise')) return '#654321';
  if (c.includes('blue')) return '#1E3A8A';
  if (c.includes('green')) return '#2D5A27';
  if (c.includes('burgundy')) return '#800020';
  return '#333333';
}

const insertProduct = db.prepare(`
  INSERT INTO products (
    id, sku, name, brand, shape, material, fit, category,
    selling_price_paise, original_price_paise, purchase_cost_paise,
    tax_rate_percent, supplier_id, reorder_threshold, image_url,
    description, is_active, created_at, updated_at, gender, frame_size
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, datetime('now'), datetime('now'), ?, ?
  )
`);

const insertVariant = db.prepare(`
  INSERT INTO product_variants (
    id, product_id, sku, barcode, color_name, color_hex,
    lens_type, dimensions_json, additional_price_paise, is_active, created_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, 0, 1, datetime('now')
  )
`);

const insertImage = db.prepare(`
  INSERT INTO product_images (
    id, product_id, image_url, is_primary, alt_text
  ) VALUES (?, ?, ?, ?, ?)
`);

const insertInventory = db.prepare(`
  INSERT INTO inventory_balances (
    id, variant_id, location_id, available_qty, reserved_qty, updated_at
  ) VALUES (?, ?, 'loc-main', 5, 0, datetime('now'))
`);

const syncTransaction = db.transaction((items) => {
  for (const item of items) {
    const prodId = `prod-noor-${item.id}`;
    const sku = `NOOR-${item.id}`;
    const sellingPaise = item.price * 100;
    const origPaise = (item.price === 599 ? 999 : 1499) * 100;

    insertProduct.run(
      prodId, sku, item.name, 'Noor Optics', item.shape, item.material,
      'Regular', 'Eyeglasses', sellingPaise, origPaise, 25000,
      18, 'sup-1', 3, item.images[0],
      `${item.name}. Genuine lightweight ${item.material.toLowerCase()} construction with high-durability hinge mechanism. Available at Noor Optics Boutique.`,
      1, 'Unisex', 'Medium'
    );

    const variantId = `var-noor-${item.id}-01`;
    insertVariant.run(
      variantId, prodId, `${sku}-V1`, sku, item.color, getColorHex(item.color),
      'Zero-Power Blue-Cut Lens',
      JSON.stringify({ lens: '52mm', bridge: '18mm', temple: '142mm', weight: item.material === 'Metal' ? '18g' : '15g' })
    );

    insertImage.run(`img-${item.id}-1`, prodId, item.images[0], 1, item.alt_front);
    insertImage.run(`img-${item.id}-2`, prodId, item.images[1], 0, item.alt_side);

    insertInventory.run(`inv-noor-${item.id}`, variantId);
  }
});

syncTransaction(products);
console.log(`Inserted ${products.length} products into SQLite database.`);

// 2. Update data.js
const catalogJsPath = path.join(__dirname, '..', 'data.js');
let dataContent = fs.readFileSync(catalogJsPath, 'utf-8');

const clientCatalog = products.map(item => {
  const origPrice = item.price === 599 ? 999 : 1499;
  return {
    id: `prod-noor-${item.id}`,
    sku: `NOOR-${item.id}`,
    name: item.name,
    brand: 'Noor Optics',
    gender: 'Unisex',
    collection: `${item.material} Heritage Collection`,
    price: item.price,
    originalPrice: origPrice,
    badge: item.id === '1001' ? 'Bestseller' : (item.id === '1002' ? 'New Arrival' : ''),
    shape: item.shape,
    material: item.material,
    fit: 'Regular',
    frame_size: 'Medium',
    size: 'Medium',
    rimStyle: item.rimStyle,
    category: 'Eyeglasses',
    rating: '4.9',
    reviewsCount: 38 + (parseInt(item.id) % 40),
    image: item.images[0],
    imageUrl: `/${item.images[0]}`,
    images: item.images.map(img => `/${img}`),
    colors: [
      {
        name: item.color,
        hex: getColorHex(item.color)
      }
    ],
    dimensions: {
      lens: '52mm',
      bridge: '18mm',
      temple: '142mm',
      weight: item.material === 'Metal' ? '18g' : '15g'
    },
    description: `${item.name}. Genuine lightweight ${item.material.toLowerCase()} construction with high-durability hinge mechanism. Available at Noor Optics Boutique.`,
    stock: 5,
    total_stock: 5,
    available_qty: 5,
    inStock: true
  };
});

// Replace EYEWEAR_CATALOG in data.js
const catalogRegex = /const EYEWEAR_CATALOG\s*=\s*\[[\s\S]*?\];/;
const newCatalogBlock = `const EYEWEAR_CATALOG = ${JSON.stringify(clientCatalog, null, 2)};`;

if (catalogRegex.test(dataContent)) {
  dataContent = dataContent.replace(catalogRegex, newCatalogBlock);
  fs.writeFileSync(catalogJsPath, dataContent, 'utf-8');
  console.log(`Updated data.js with ${clientCatalog.length} products.`);
} else {
  console.error('Could not find EYEWEAR_CATALOG in data.js');
}
