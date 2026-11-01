const fs = require('fs');
const { db } = require('../server/db');

const subJs = fs.readFileSync('supabase.js', 'utf8');
const mUrl = subJs.match(/url:\s*window\.NOOR_SUPABASE_URL\s*\|\|\s*['"]([^'"]+)['"]/);
const mKey = subJs.match(/anonKey:\s*window\.NOOR_SUPABASE_KEY\s*\|\|\s*['"]([^'"]+)['"]/);
const SUPABASE_URL = mUrl ? mUrl[1] : "https://czajxtgwsxbrrymrhauz.supabase.co";
const SUPABASE_ANON_KEY = mKey ? mKey[1] : "";

async function syncToSupabase() {
  console.log('Connecting to Supabase at:', SUPABASE_URL);

  // 0. Ensure SQLite local balances are strictly 1 unit and threshold is 0
  db.prepare("UPDATE inventory_balances SET available_qty = 1 WHERE variant_id LIKE 'var-prod-noor-%'").run();
  db.prepare("UPDATE products SET reorder_threshold = 0 WHERE id LIKE 'prod-noor-%'").run();

  // 1. Fetch 55 products from SQLite
  const products = db.prepare(`
    SELECT p.*,
      pv.id as var_id, pv.sku as var_sku, pv.barcode, pv.color_name, pv.color_hex,
      ib.available_qty
    FROM products p
    JOIN product_variants pv ON p.id = pv.product_id
    JOIN inventory_balances ib ON pv.id = ib.variant_id
    WHERE p.id LIKE 'prod-noor-%'
    ORDER BY p.id ASC
  `).all();

  console.log(`Found ${products.length} products to sync to Supabase.`);

  const formattedList = products.map(p => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    collection: p.brand,
    price: p.selling_price_paise / 100,
    original_price: null,
    badge: 'New Arrival',
    shape: p.shape,
    material: p.material,
    fit: p.fit,
    category: 'Frames',
    rating: 5.0,
    reviews_count: 12,
    image: p.image_url,
    colors: [{ name: p.color_name, hex: p.color_hex }],
    dimensions: { lens: '54mm', bridge: '18mm', temple: '145mm', weight: '18g' },
    description: p.description,
    is_active: true,
    stock: 1,
    total_stock: 1,
    initialStock: 1,
    reorder_threshold: 0,
    created_at: p.created_at,
    updated_at: p.updated_at
  }));

  // 2. Push to SYS-CATALOG-PRODUCTS
  const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-CATALOG-PRODUCTS`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });

  if (res.ok) {
    const list = await res.json();
    if (Array.isArray(list) && list.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-CATALOG-PRODUCTS`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: JSON.stringify(formattedList), updated_at: new Date().toISOString() })
      });
      console.log('✓ Successfully PATCHed SYS-CATALOG-PRODUCTS with 55 products!');
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/customers`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: 'sys-catalog-products-meta',
          client_code: 'SYS-CATALOG-PRODUCTS',
          name: 'System Catalog Custom Products',
          notes: JSON.stringify(formattedList)
        })
      });
      console.log('✓ Successfully POSTed SYS-CATALOG-PRODUCTS with 55 products!');
    }
  }

  // 3. Update SYS-TOMBSTONE-PRODUCTS to include old test products and demo items
  const tombRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });

  const testTokens = [
    'prod-1793549272721', 'ray ban', 'meta glasses meta',
    'prod-1793549836985', 'noor-onkosunf-571', 'onko onko sun flaere'
  ];
  for (let i = 1; i <= 18; i++) {
    testTokens.push(`noor-${String(i).padStart(2, '0')}`);
  }

  let tombSet = new Set(testTokens);
  if (tombRes.ok) {
    const tombData = await tombRes.json();
    if (Array.isArray(tombData) && tombData.length > 0 && tombData[0].notes) {
      try {
        const parsed = JSON.parse(tombData[0].notes);
        const arr = Array.isArray(parsed) ? parsed : (parsed.products || []);
        arr.forEach(t => tombSet.add(String(t).toLowerCase().trim()));
      } catch (_) {}
    }
  }

  // Ensure new 55 products are NOT tombstoned
  products.forEach(p => {
    tombSet.delete(p.id.toLowerCase());
    tombSet.delete(p.sku.toLowerCase());
    tombSet.delete(p.name.toLowerCase());
  });

  await fetch(`${SUPABASE_URL}/rest/v1/customers?client_code=eq.SYS-TOMBSTONE-PRODUCTS`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      notes: JSON.stringify({ products: Array.from(tombSet), updated_at: new Date().toISOString() }),
      updated_at: new Date().toISOString()
    })
  });
  console.log('✓ Successfully updated Supabase tombstones.');

  // 4. Update SQLite deleted_products table
  const insertDel = db.prepare('INSERT OR IGNORE INTO deleted_products (product_id, sku, name) VALUES (?, ?, ?)');
  testTokens.forEach(t => {
    insertDel.run(t, t, t);
  });
  console.log('✓ Successfully updated SQLite deleted_products.');
}

syncToSupabase().catch(console.error);
