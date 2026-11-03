const fs = require('fs');
const { db } = require('../server/db');

const rows = db.prepare(`
  SELECT p.*,
    pv.id as var_id, pv.sku as var_sku, pv.color_name, pv.color_hex,
    COALESCE(ib.available_qty, 1) as available_qty
  FROM products p
  LEFT JOIN product_variants pv ON p.id = pv.product_id
  LEFT JOIN inventory_balances ib ON pv.id = ib.variant_id
  ORDER BY p.id ASC
`).all();

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
      colors: JSON.stringify([{ name: r.color_name || 'Standard', hex: r.color_hex || '#111111' }]),
      dimensions: JSON.stringify({ lens: '53mm', bridge: '18mm', temple: '145mm', weight: '18g' }),
      description: r.description || `Brand: ${r.brand} | Model: ${r.name}`,
      is_active: true
    });
  }
}

const list = Array.from(productsMap.values());

let sql = `

-- ──────────────────────────────────────────────────────────────────────────────
-- 11. CATALOG CLEANUP & SEED REAL 55 LUXURY OPTICAL FRAMES
-- Purge obsolete Scandinavian demo template frames and sync 55 luxury frames
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can manage products" ON public.products;
CREATE POLICY "Public can manage products" ON public.products FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.products TO anon, authenticated, service_role;

-- Delete legacy Scandinavian demo frames
DELETE FROM public.products 
WHERE id ~* '^noor-(0[1-9]|1[0-8])$' 
   OR name ILIKE '%helsinki%' 
   OR name ILIKE '%berlin hex%' 
   OR name ILIKE '%zurich titanium%' 
   OR name ILIKE '%milan aureum%' 
   OR name ILIKE '%stockholm noir%' 
   OR name ILIKE '%copenhagen round%' 
   OR name ILIKE '%oslo crystal%' 
   OR name ILIKE '%kyoto havana%' 
   OR name ILIKE '%reykjavik%' 
   OR name ILIKE '%vienna silhouette%';

-- Upsert all 55 real luxury frames (Cartier, Burberry, Dolce & Gabbana...)
INSERT INTO public.products (
  id, name, collection, price, original_price, badge, shape, material, fit, category,
  rating, reviews_count, image, colors, dimensions, description, is_active
) VALUES
`;

const valueRows = list.map(p => {
  const esc = (s) => (s ? `'${String(s).replace(/'/g, "''")}'` : 'NULL');
  return `(
  ${esc(p.id)}, ${esc(p.name)}, ${esc(p.collection)}, ${p.price}, ${p.original_price}, ${esc(p.badge)},
  ${esc(p.shape)}, ${esc(p.material)}, ${esc(p.fit)}, ${esc(p.category)}, ${p.rating}, ${p.reviews_count},
  ${esc(p.image)}, '${p.colors.replace(/'/g, "''")}'::jsonb, '${p.dimensions.replace(/'/g, "''")}'::jsonb,
  ${esc(p.description)}, true
)`;
}).join(',\n');

sql += valueRows + `\nON CONFLICT (id) DO UPDATE SET\n` +
  `  name = EXCLUDED.name,\n` +
  `  collection = EXCLUDED.collection,\n` +
  `  price = EXCLUDED.price,\n` +
  `  original_price = EXCLUDED.original_price,\n` +
  `  image = EXCLUDED.image,\n` +
  `  description = EXCLUDED.description,\n` +
  `  is_active = true;\n`;

fs.appendFileSync('supabase_migration_dual_pipeline_print_queue.sql', sql, 'utf8');
console.log(`Appended ${list.length} luxury products to supabase_migration_dual_pipeline_print_queue.sql`);

