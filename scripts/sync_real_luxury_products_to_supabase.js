const { db } = require('../server/db');

const SUPABASE_URL = "https://czajxtgwsxbrrymrhauz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk";

async function main() {
  console.log('--- 1. Deleting old dummy Scandinavian frames from Supabase products table ---');
  // Delete where id starts with noor-
  for (let i = 1; i <= 18; i++) {
    const id = `noor-${String(i).padStart(2, '0')}`;
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    console.log(`Deleted ${id}:`, delRes.status);
  }

  console.log('\n--- 2. Fetching real luxury inventory (55 frames) from SQLite ---');
  const rows = db.prepare(`
    SELECT p.*,
      pv.id as var_id, pv.sku as var_sku, pv.color_name, pv.color_hex,
      COALESCE(ib.available_qty, 1) as available_qty
    FROM products p
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN inventory_balances ib ON pv.id = ib.variant_id
    ORDER BY p.id ASC
  `).all();

  // Deduplicate products
  const productsMap = new Map();
  for (const r of rows) {
    if (!productsMap.has(r.id)) {
      productsMap.set(r.id, {
        id: r.id,
        name: r.name,
        collection: r.brand || 'Luxury Eyewear',
        price: r.selling_price_paise ? r.selling_price_paise / 100 : 1499,
        original_price: (r.selling_price_paise ? r.selling_price_paise / 100 : 1499) + 500,
        badge: 'New Arrival',
        shape: r.shape || 'Rectangular',
        material: r.material || 'Premium Optical Titanium',
        fit: r.fit || 'Regular',
        category: 'Frames',
        rating: 4.9,
        reviews_count: 18,
        image: r.image_url || 'images/frames/frame_01.jpg',
        colors: [{ name: r.color_name || 'Standard', hex: r.color_hex || '#111111' }],
        dimensions: { lens: '53mm', bridge: '18mm', temple: '145mm', weight: '18g' },
        description: r.description || `Brand: ${r.brand} | Model: ${r.name}`,
        is_active: true,
        created_at: r.created_at || new Date().toISOString()
      });
    }
  }

  const luxuryProducts = Array.from(productsMap.values());
  console.log(`Prepared ${luxuryProducts.length} luxury products to upload to Supabase.`);

  console.log('\n--- 3. Uploading real luxury frames to Supabase products table ---');
  for (const prod of luxuryProducts) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(prod)
    });
    if (res.ok) {
      console.log(`✓ Uploaded: ${prod.name} (${prod.id})`);
    } else {
      console.warn(`✗ Failed ${prod.name}:`, res.status, await res.text());
    }
  }

  console.log('\n--- 4. Verifying final Supabase products count ---');
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,collection&is_active=eq.true`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  if (checkRes.ok) {
    const list = await checkRes.json();
    console.log(`Supabase now has ${list.length} active luxury products!`);
    console.log('Sample:', list.slice(0, 5));
  }
}

main().catch(console.error);

