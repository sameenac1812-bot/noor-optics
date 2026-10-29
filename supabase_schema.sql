-- ==============================================================================
-- NOOR OPTICS – SUPABASE DATABASE SCHEMA & SEED DATA
-- Scandinavian Luxury Eyewear E-Commerce Architecture
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. Products Table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    collection TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    original_price NUMERIC(10,2),
    badge TEXT,
    shape TEXT NOT NULL,
    material TEXT NOT NULL,
    fit TEXT NOT NULL,
    category TEXT DEFAULT 'Optical',
    rating NUMERIC(3,2) DEFAULT 4.9,
    reviews_count INTEGER DEFAULT 50,
    image TEXT NOT NULL,
    colors JSONB NOT NULL DEFAULT '[]'::jsonb,
    dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Index for searching and filtering
CREATE INDEX IF NOT EXISTS idx_products_shape ON public.products (shape);
CREATE INDEX IF NOT EXISTS idx_products_material ON public.products (material);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products (price);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);

-- ── 3. Orders Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_ref TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    city TEXT NOT NULL,
    pin_code TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    prescription_pref TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    shipping_fee NUMERIC(10,2) DEFAULT 0,
    grand_total NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_order_ref ON public.orders (order_ref);

-- ── 4. Newsletter Subscribers Table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    subscribed_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- ── 5. Row Level Security (RLS) Policies ──────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Products: Anyone can read active products
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
    ON public.products FOR SELECT
    USING (is_active = TRUE);

-- Orders: Anyone can submit a new customer order
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders"
    ON public.orders FOR INSERT
    WITH CHECK (true);

-- Orders: Customers can view their own order by order_ref
DROP POLICY IF EXISTS "Public can view own order by ref" ON public.orders;
CREATE POLICY "Public can view own order by ref"
    ON public.orders FOR SELECT
    USING (true);

-- Orders: Allow deletion from admin portal
DROP POLICY IF EXISTS "Public can delete orders" ON public.orders;
CREATE POLICY "Public can delete orders"
    ON public.orders FOR DELETE
    USING (true);

-- Orders: Allow status updates
DROP POLICY IF EXISTS "Public can update orders" ON public.orders;
CREATE POLICY "Public can update orders"
    ON public.orders FOR UPDATE
    USING (true);

-- Newsletter: Anyone can subscribe
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Public can subscribe to newsletter"
    ON public.newsletter_subscribers FOR INSERT
    WITH CHECK (true);

-- ── 6. Seed Eyewear Sample Catalog ───────────────────────────────────────────
INSERT INTO public.products (
    id, name, collection, price, original_price, badge, shape, material, fit, category, rating, reviews_count, image, colors, dimensions, description
) VALUES
(
    'noor-01',
    'The Stockholm Noir',
    'Nordic Minimalist',
    3499,
    4299,
    'Bestseller',
    'Rectangular',
    'Japanese Titanium',
    'Regular',
    'Optical',
    4.9,
    142,
    'images/stockholm_noir.jpg',
    '[{"name": "Matte Black", "hex": "#1A1A1A"}, {"name": "Gunmetal", "hex": "#4A4D52"}, {"name": "Brushed Silver", "hex": "#D1D5DB"}]'::jsonb,
    '{"lens": "52mm", "bridge": "18mm", "temple": "145mm", "weight": "14g"}'::jsonb,
    'An architectural masterpiece engineered from aerospace-grade Japanese titanium. Featherweight rectangular profile with custom barrel hinges and medical-grade silicone nose pads for effortless all-day wear.'
),
(
    'noor-02',
    'The Copenhagen Round',
    'Atelier Heritage',
    3899,
    4799,
    'New Arrival',
    'Round',
    'Italian Bio-Acetate',
    'Narrow',
    'Optical',
    5.0,
    88,
    'images/copenhagen_round.jpg',
    '[{"name": "Dark Havana", "hex": "#5C3A21"}, {"name": "Classic Tortoise", "hex": "#8A5A36"}, {"name": "Onyx Black", "hex": "#151515"}]'::jsonb,
    '{"lens": "48mm", "bridge": "21mm", "temple": "142mm", "weight": "19g"}'::jsonb,
    'Timeless mid-century round silhouette featuring hand-beveled Italian bio-acetate and our signature keyhole bridge. Finished with hand-riveted hinges and wire-core temple detailing.'
),
(
    'noor-03',
    'The Oslo Crystal',
    'Nordic Minimalist',
    3299,
    3999,
    'Bestseller',
    'Square',
    'Handcrafted Bio-Acetate',
    'Regular',
    'Optical',
    4.8,
    115,
    'images/oslo_crystal.jpg',
    '[{"name": "Crystal Clear", "hex": "#F0F2F5"}, {"name": "Champagne Tint", "hex": "#E8DEC8"}, {"name": "Ice Grey", "hex": "#D5DADE"}]'::jsonb,
    '{"lens": "50mm", "bridge": "19mm", "temple": "145mm", "weight": "18g"}'::jsonb,
    'Luminous transparent bio-acetate celebrating light refraction. Gentle softened square geometry engineered to flatter diverse face structures.'
),
(
    'noor-04',
    'The Kyoto Havana',
    'Atelier Heritage',
    4199,
    4999,
    'Signature',
    'Round',
    'Japanese Acetate',
    'Regular',
    'Optical',
    4.9,
    94,
    'images/kyoto_havana.jpg',
    '[{"name": "Amber Havana", "hex": "#7A4A28"}, {"name": "Honey Amber", "hex": "#B87333"}, {"name": "Smoked Chestnut", "hex": "#402B1E"}]'::jsonb,
    '{"lens": "49mm", "bridge": "20mm", "temple": "144mm", "weight": "17g"}'::jsonb,
    'Warm organic tortoise tones cured for six months to ensure depth of luster. Japanese precision hinges with laser-etched temple core wires.'
),
(
    'noor-05',
    'The Milan Aureum',
    'Luxe Titanium',
    4799,
    5699,
    'Limited Edition',
    'Geometric',
    'Beta-Titanium & 18K Gold Finish',
    'Narrow',
    'Optical',
    5.0,
    62,
    'images/milan_aureum.jpg',
    '[{"name": "18K Gold Plated", "hex": "#D4AF37"}, {"name": "Rose Gold", "hex": "#C59B8B"}, {"name": "Palladium Silver", "hex": "#E5E5E5"}]'::jsonb,
    '{"lens": "51mm", "bridge": "19mm", "temple": "142mm", "weight": "11g"}'::jsonb,
    'Ultra-slender beta-titanium wireframe sculpted with subtle octagonal facets. Triple-coated with micron-level 18K gold plating for hypoallergenic refinement.'
),
(
    'noor-06',
    'The Zurich Titanium',
    'Luxe Titanium',
    5299,
    6299,
    'Masterpiece',
    'Rectangular',
    'Pure Japanese Titanium',
    'Wide',
    'Optical',
    5.0,
    49,
    'images/zurich_titanium.jpg',
    '[{"name": "Brushed Gunmetal", "hex": "#3D4148"}, {"name": "Satin Platinum", "hex": "#C8CBD0"}, {"name": "Matte Obsidian", "hex": "#1E1E22"}]'::jsonb,
    '{"lens": "55mm", "bridge": "17mm", "temple": "148mm", "weight": "10g"}'::jsonb,
    'Weighing a mere 10 grams, the Zurich Rimless embodies Swiss minimalism. Direct screwless lens mounting with seamless flexibility and unyielding durability.'
),
(
    'noor-07',
    'The Berlin Hex',
    'Urban Modernist',
    3699,
    4499,
    'Trending',
    'Geometric',
    'Surgical Stainless Steel',
    'Regular',
    'Optical',
    4.7,
    76,
    'images/berlin_hex.jpg',
    '[{"name": "Matte Graphite", "hex": "#2C2E33"}, {"name": "Raw Steel", "hex": "#9AA0A6"}, {"name": "Copper Bronze", "hex": "#8C583E"}]'::jsonb,
    '{"lens": "51mm", "bridge": "20mm", "temple": "145mm", "weight": "15g"}'::jsonb,
    'Geometric hexagonal frame inspired by Bauhaus architecture. Cut from a single sheet of surgical stainless steel with zero solder points.'
),
(
    'noor-08',
    'The Helsinki Quad',
    'Nordic Minimalist',
    3599,
    4399,
    'Bestseller',
    'Square',
    'Italian Bio-Acetate',
    'Wide',
    'Optical',
    4.8,
    108,
    'images/helsinki_quad.jpg',
    '[{"name": "Deep Midnight Blue", "hex": "#1B2838"}, {"name": "Jet Black", "hex": "#111111"}, {"name": "Forest Moss", "hex": "#334135"}]'::jsonb,
    '{"lens": "53mm", "bridge": "19mm", "temple": "146mm", "weight": "21g"}'::jsonb,
    'Bold modern square frame featuring rich deep tones and hand-sculpted temple profiles. Fitted with durable 5-barrel German OBE hinges.'
),
(
    'noor-09',
    'The Reykjavik Pilot',
    'Aviation Series',
    4499,
    5399,
    'Iconic',
    'Aviator',
    'Aerospace Titanium',
    'Wide',
    'Optical',
    4.9,
    83,
    'images/reykjavik_pilot.jpg',
    '[{"name": "Antiqued Bronze", "hex": "#5E4834"}, {"name": "Stealth Black", "hex": "#212124"}, {"name": "Titanium Grey", "hex": "#6E7179"}]'::jsonb,
    '{"lens": "56mm", "bridge": "16mm", "temple": "145mm", "weight": "15g"}'::jsonb,
    'An editorial interpretation of the legendary aviator silhouette. Refined double-bridge architecture fabricated from aerospace titanium wire.'
),
(
    'noor-10',
    'The Vienna Silhouette',
    'Atelier Heritage',
    3999,
    4799,
    'Editorial Choice',
    'Cat-Eye',
    'Ultra-Light Bio-Acetate',
    'Narrow',
    'Optical',
    4.9,
    91,
    'images/vienna_silhouette.jpg',
    '[{"name": "Tortoiseshell & Amber", "hex": "#6E3E1C"}, {"name": "Gloss Noir", "hex": "#191919"}, {"name": "Champagne Rose", "hex": "#D9B8B0"}]'::jsonb,
    '{"lens": "51mm", "bridge": "17mm", "temple": "140mm", "weight": "16g"}'::jsonb,
    'Subtle feminine lift with soft cat-eye geometry. Hand-polished to an enamel shine with subtle gold temple accents.'
),
(
    'noor-11',
    'The Amber Arch',
    'Atelier Heritage',
    4299,
    5199,
    'New Arrival',
    'Round',
    'Italian Mazzucchelli Acetate',
    'Regular',
    'Optical',
    4.8,
    57,
    'images/amber_arch.jpg',
    '[{"name": "Mazzucchelli Honey", "hex": "#C68B45"}, {"name": "Whiskey Smoke", "hex": "#5A3825"}, {"name": "Rich Caramel", "hex": "#9B6438"}]'::jsonb,
    '{"lens": "49mm", "bridge": "21mm", "temple": "145mm", "weight": "19g"}'::jsonb,
    'Distinctive crown-panto rounded shape with an architectural flat top bridge. Handcrafted from authentic Italian Mazzucchelli 1849 bio-acetate.'
),
(
    'noor-12',
    'The Tokyo Steel',
    'Urban Modernist',
    3799,
    4599,
    'Trending',
    'Square',
    'Brushed Stainless Steel',
    'Regular',
    'Optical',
    4.7,
    64,
    'images/tokyo_steel.jpg',
    '[{"name": "Brushed Silver", "hex": "#B8BCC2"}, {"name": "Anodized Black", "hex": "#1C1C1E"}, {"name": "Steel Blue", "hex": "#3E4C5E"}]'::jsonb,
    '{"lens": "52mm", "bridge": "18mm", "temple": "146mm", "weight": "16g"}'::jsonb,
    'Precision-milled square frame featuring textured linear brushing across the brow. Industrial minimalism paired with flexible silicone comfort pads.'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    badge = EXCLUDED.badge,
    image = EXCLUDED.image,
    colors = EXCLUDED.colors,
    dimensions = EXCLUDED.dimensions,
    description = EXCLUDED.description;

-- ── 7. Customers Table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    client_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    age INTEGER,
    dob DATE,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT DEFAULT 'Bengaluru',
    pin_code TEXT,
    notes TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_reason TEXT,
    total_spent_paise BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_client_code ON public.customers (client_code);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);

-- ── 8. Prescriptions Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id TEXT PRIMARY KEY,
    prescription_number TEXT UNIQUE NOT NULL,
    client_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    prescription_date DATE DEFAULT CURRENT_DATE,
    prescription_type TEXT DEFAULT 'SPECTACLE',
    od_sph NUMERIC(4,2) DEFAULT 0.00,
    od_cyl NUMERIC(4,2) DEFAULT 0.00,
    od_axis INTEGER,
    od_va TEXT,
    os_sph NUMERIC(4,2) DEFAULT 0.00,
    os_cyl NUMERIC(4,2) DEFAULT 0.00,
    os_axis INTEGER,
    os_va TEXT,
    addition NUMERIC(4,2),
    pd NUMERIC(4,1),
    r_pd NUMERIC(4,1),
    l_pd NUMERIC(4,1),
    lens_type TEXT,
    lens_material TEXT,
    coatings TEXT,
    notes TEXT,
    checked_by TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_client_id ON public.prescriptions (client_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_rx_number ON public.prescriptions (prescription_number);

-- ── 9. Row Level Security Policies for Customers and Prescriptions ────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view customers" ON public.customers;
CREATE POLICY "Public can view customers" ON public.customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert customers" ON public.customers;
CREATE POLICY "Public can insert customers" ON public.customers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update customers" ON public.customers;
CREATE POLICY "Public can update customers" ON public.customers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public can delete customers" ON public.customers;
CREATE POLICY "Public can delete customers" ON public.customers FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public can view prescriptions" ON public.prescriptions;
CREATE POLICY "Public can view prescriptions" ON public.prescriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert prescriptions" ON public.prescriptions;
CREATE POLICY "Public can insert prescriptions" ON public.prescriptions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update prescriptions" ON public.prescriptions;
CREATE POLICY "Public can update prescriptions" ON public.prescriptions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public can delete prescriptions" ON public.prescriptions;
CREATE POLICY "Public can delete prescriptions" ON public.prescriptions FOR DELETE USING (true);
