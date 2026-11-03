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

-- Products: Anyone can read active products & admin can manage products
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products"
    ON public.products FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Public can manage products" ON public.products;
CREATE POLICY "Public can manage products"
    ON public.products FOR ALL
    USING (true)
    WITH CHECK (true);

-- Prescriptions: Anyone can submit an Rx during checkout or admin
DROP POLICY IF EXISTS "Public can insert prescriptions" ON public.prescriptions;
CREATE POLICY "Public can insert prescriptions"
    ON public.prescriptions FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view prescriptions" ON public.prescriptions;
CREATE POLICY "Public can view prescriptions"
    ON public.prescriptions FOR SELECT
    USING (true);

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

-- ── 10. Orders Table Source Enhancements & Separation ──────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'source'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN source TEXT DEFAULT 'website';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'order_number'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN order_number TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'prescription_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN prescription_id TEXT REFERENCES public.prescriptions(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'customer_age'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN customer_age INTEGER;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'VERIFIED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'idempotency_key'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN idempotency_key TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'token_number'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN token_number INTEGER;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'is_archived'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'archived_at'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN archived_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'archived_reason'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN archived_reason TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());
    END IF;
END $$;

UPDATE public.orders
SET source = CASE
    WHEN order_ref ILIKE '%-POS-%' OR order_ref ILIKE '%IN-STORE%' OR delivery_address ILIKE '%Pillar No. 45, Rethibowli%' OR delivery_address ILIKE '%In-Store Purchase%' THEN 'instore'
    ELSE 'website'
END
WHERE source IS NULL OR source = '';

UPDATE public.orders
SET order_number = order_ref
WHERE order_number IS NULL OR order_number = '';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_source') THEN
        ALTER TABLE public.orders ADD CONSTRAINT chk_orders_source CHECK (source IN ('website', 'instore'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_orders_order_number') THEN
        ALTER TABLE public.orders ADD CONSTRAINT uq_orders_order_number UNIQUE (order_number);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_orders_idempotency_key') THEN
        ALTER TABLE public.orders ADD CONSTRAINT uq_orders_idempotency_key UNIQUE (idempotency_key);
    END IF;
END $$;

ALTER TABLE public.orders ALTER COLUMN source SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders (source);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_is_archived ON public.orders (is_archived);

-- ── 11. Immutable Source Protection Trigger ───────────────────────────────────
CREATE OR REPLACE FUNCTION protect_order_source()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.source IS DISTINCT FROM NEW.source THEN
        RAISE EXCEPTION 'Order source is immutable (cannot change % to %)', OLD.source, NEW.source;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_order_source ON public.orders;
CREATE TRIGGER trg_protect_order_source
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION protect_order_source();

-- ── 12. Independent Database-Backed Views ──────────────────────────────────────
CREATE OR REPLACE VIEW public.website_orders_view AS
SELECT * FROM public.orders
WHERE source = 'website' AND (is_archived IS FALSE OR is_archived IS NULL);

CREATE OR REPLACE VIEW public.instore_orders_view AS
SELECT * FROM public.orders
WHERE source = 'instore' AND (is_archived IS FALSE OR is_archived IS NULL);

-- ── 13. Durable Print Jobs Queue ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.print_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    print_type TEXT NOT NULL DEFAULT 'receipt',
    printer_id TEXT DEFAULT 'POS-80',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'printing', 'completed', 'failed', 'uncertain', 'cancelled')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    claimed_at TIMESTAMPTZ,
    lease_expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_error TEXT,
    spooler_job_id TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_order_print_type UNIQUE (order_id, print_type)
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON public.print_jobs (status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_order_id ON public.print_jobs (order_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_lease ON public.print_jobs (status, lease_expires_at);

-- ── 14. Initial Print Job Creation Trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION create_initial_receipt_print_job()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.print_jobs (
        order_id,
        print_type,
        printer_id,
        status,
        attempt_count,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        'receipt',
        'POS-80',
        'queued',
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (order_id, print_type) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_initial_print_job ON public.orders;
CREATE TRIGGER trg_order_initial_print_job
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION create_initial_receipt_print_job();

-- ── 15. Secure Dual Pipeline Order Creation Functions ─────────────────────────
CREATE OR REPLACE FUNCTION create_website_order(
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT DEFAULT NULL,
    p_delivery_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT 'Hyderabad',
    p_pin_code TEXT DEFAULT '500028',
    p_items JSONB DEFAULT '[]'::jsonb,
    p_prescription_pref TEXT DEFAULT 'Standard',
    p_payment_method TEXT DEFAULT 'UPI',
    p_subtotal NUMERIC DEFAULT 0,
    p_shipping_fee NUMERIC DEFAULT 0,
    p_grand_total NUMERIC DEFAULT 0,
    p_prescription JSONB DEFAULT NULL,
    p_customer_age INTEGER DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID := uuid_generate_v4();
    v_order_number TEXT;
    v_customer_id TEXT;
    v_rx_id TEXT := NULL;
    v_clean_phone TEXT;
    v_clean_email TEXT;
    v_date_part TEXT := to_char(NOW(), 'YYYYMMDD');
    v_rand_part TEXT := floor(random() * (9999 - 1000 + 1) + 1000)::TEXT;
    v_existing_order public.orders%ROWTYPE;
BEGIN
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT * INTO v_existing_order FROM public.orders WHERE idempotency_key = p_idempotency_key LIMIT 1;
        IF FOUND THEN
            RETURN to_jsonb(v_existing_order);
        END IF;
    END IF;

    v_clean_phone := COALESCE(NULLIF(regexp_replace(p_customer_phone, '[^0-9+]', '', 'g'), ''), '9999999999');
    v_clean_email := COALESCE(NULLIF(trim(p_customer_email), ''), lower(v_clean_phone) || '@nooroptics.in');
    v_order_number := 'NOOR-WEB-' || v_date_part || '-' || v_rand_part;

    v_customer_id := 'cust-phone-' || regexp_replace(v_clean_phone, '[^0-9]', '', 'g');
    INSERT INTO public.customers (
        id, client_code, name, phone, email, age, address, city, pin_code, updated_at
    ) VALUES (
        v_customer_id,
        'CUST-' || upper(substr(md5(v_clean_phone), 1, 6)),
        trim(p_customer_name),
        v_clean_phone,
        v_clean_email,
        p_customer_age,
        COALESCE(p_delivery_address, 'Online Storefront Delivery'),
        COALESCE(p_city, 'Hyderabad'),
        COALESCE(p_pin_code, '500028'),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = COALESCE(EXCLUDED.email, customers.email),
        address = COALESCE(EXCLUDED.address, customers.address),
        city = COALESCE(EXCLUDED.city, customers.city),
        pin_code = COALESCE(EXCLUDED.pin_code, customers.pin_code),
        age = COALESCE(EXCLUDED.age, customers.age),
        updated_at = NOW();

    IF p_prescription IS NOT NULL AND (p_prescription->>'od_sph' IS NOT NULL OR p_prescription->>'os_sph' IS NOT NULL) THEN
        v_rx_id := 'rx-web-' || v_order_number;
        INSERT INTO public.prescriptions (
            id, prescription_number, client_id, client_name, client_phone,
            prescription_date, prescription_type,
            od_sph, od_cyl, od_axis,
            os_sph, os_cyl, os_axis,
            addition, pd, notes, checked_by, updated_at
        ) VALUES (
            v_rx_id,
            'RX-' || v_order_number,
            v_customer_id,
            trim(p_customer_name),
            v_clean_phone,
            CURRENT_DATE,
            'SPECTACLE',
            COALESCE((p_prescription->>'od_sph')::NUMERIC, 0.00),
            COALESCE((p_prescription->>'od_cyl')::NUMERIC, 0.00),
            NULLIF(p_prescription->>'od_axis', '')::INTEGER,
            COALESCE((p_prescription->>'os_sph')::NUMERIC, 0.00),
            COALESCE((p_prescription->>'os_cyl')::NUMERIC, 0.00),
            NULLIF(p_prescription->>'os_axis', '')::INTEGER,
            NULLIF(p_prescription->>'addition', '')::NUMERIC,
            NULLIF(COALESCE(p_prescription->>'pd', p_prescription->>'ipd_distance'), '')::NUMERIC,
            COALESCE(p_prescription->>'notes', 'Online Storefront Rx Submission'),
            COALESCE(p_prescription->>'prescriber_details', 'Website Customer'),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    INSERT INTO public.orders (
        id,
        order_ref,
        order_number,
        source,
        customer_id,
        prescription_id,
        customer_name,
        customer_email,
        customer_phone,
        customer_age,
        delivery_address,
        city,
        pin_code,
        items,
        prescription_pref,
        payment_method,
        payment_status,
        subtotal,
        shipping_fee,
        grand_total,
        status,
        idempotency_key,
        created_at,
        updated_at
    ) VALUES (
        v_order_id,
        v_order_number,
        v_order_number,
        'website',
        v_customer_id,
        v_rx_id,
        trim(p_customer_name),
        v_clean_email,
        v_clean_phone,
        p_customer_age,
        COALESCE(p_delivery_address, 'Online Storefront Delivery'),
        COALESCE(p_city, 'Hyderabad'),
        COALESCE(p_pin_code, '500028'),
        p_items,
        COALESCE(p_prescription_pref, 'Standard'),
        upper(p_payment_method),
        'VERIFIED',
        p_subtotal,
        p_shipping_fee,
        p_grand_total,
        'confirmed',
        p_idempotency_key,
        NOW(),
        NOW()
    );

    SELECT * INTO v_existing_order FROM public.orders WHERE id = v_order_id;
    RETURN to_jsonb(v_existing_order);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_instore_order(
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT DEFAULT NULL,
    p_delivery_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT 'Hyderabad',
    p_pin_code TEXT DEFAULT '500028',
    p_items JSONB DEFAULT '[]'::jsonb,
    p_prescription_pref TEXT DEFAULT 'In-Store Exam',
    p_payment_method TEXT DEFAULT 'CASH',
    p_subtotal NUMERIC DEFAULT 0,
    p_shipping_fee NUMERIC DEFAULT 0,
    p_grand_total NUMERIC DEFAULT 0,
    p_prescription JSONB DEFAULT NULL,
    p_customer_age INTEGER DEFAULT NULL,
    p_token_number INTEGER DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID := uuid_generate_v4();
    v_order_number TEXT;
    v_customer_id TEXT;
    v_rx_id TEXT := NULL;
    v_clean_phone TEXT;
    v_clean_email TEXT;
    v_date_part TEXT := to_char(NOW(), 'YYYYMMDD');
    v_rand_part TEXT := floor(random() * (9999 - 1000 + 1) + 1000)::TEXT;
    v_existing_order public.orders%ROWTYPE;
BEGIN
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT * INTO v_existing_order FROM public.orders WHERE idempotency_key = p_idempotency_key LIMIT 1;
        IF FOUND THEN
            RETURN to_jsonb(v_existing_order);
        END IF;
    END IF;

    v_clean_phone := COALESCE(NULLIF(regexp_replace(p_customer_phone, '[^0-9+]', '', 'g'), ''), '9999999999');
    v_clean_email := COALESCE(NULLIF(trim(p_customer_email), ''), lower(v_clean_phone) || '@nooroptics.in');
    v_order_number := 'NOOR-POS-' || v_date_part || '-' || v_rand_part;

    v_customer_id := 'cust-phone-' || regexp_replace(v_clean_phone, '[^0-9]', '', 'g');
    INSERT INTO public.customers (
        id, client_code, name, phone, email, age, address, city, pin_code, updated_at
    ) VALUES (
        v_customer_id,
        'CUST-' || upper(substr(md5(v_clean_phone), 1, 6)),
        trim(p_customer_name),
        v_clean_phone,
        v_clean_email,
        p_customer_age,
        COALESCE(p_delivery_address, 'Pillar No. 45, Rethibowli, Hyderabad'),
        COALESCE(p_city, 'Hyderabad'),
        COALESCE(p_pin_code, '500028'),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = COALESCE(EXCLUDED.email, customers.email),
        address = COALESCE(EXCLUDED.address, customers.address),
        city = COALESCE(EXCLUDED.city, customers.city),
        pin_code = COALESCE(EXCLUDED.pin_code, customers.pin_code),
        age = COALESCE(EXCLUDED.age, customers.age),
        updated_at = NOW();

    IF p_prescription IS NOT NULL AND (p_prescription->>'od_sph' IS NOT NULL OR p_prescription->>'os_sph' IS NOT NULL) THEN
        v_rx_id := 'rx-pos-' || v_order_number;
        INSERT INTO public.prescriptions (
            id, prescription_number, client_id, client_name, client_phone,
            prescription_date, prescription_type,
            od_sph, od_cyl, od_axis,
            os_sph, os_cyl, os_axis,
            addition, pd, notes, checked_by, updated_at
        ) VALUES (
            v_rx_id,
            'RX-' || v_order_number,
            v_customer_id,
            trim(p_customer_name),
            v_clean_phone,
            CURRENT_DATE,
            'SPECTACLE',
            COALESCE((p_prescription->>'od_sph')::NUMERIC, 0.00),
            COALESCE((p_prescription->>'od_cyl')::NUMERIC, 0.00),
            NULLIF(p_prescription->>'od_axis', '')::INTEGER,
            COALESCE((p_prescription->>'os_sph')::NUMERIC, 0.00),
            COALESCE((p_prescription->>'os_cyl')::NUMERIC, 0.00),
            NULLIF(p_prescription->>'os_axis', '')::INTEGER,
            NULLIF(p_prescription->>'addition', '')::NUMERIC,
            NULLIF(COALESCE(p_prescription->>'pd', p_prescription->>'ipd_distance'), '')::NUMERIC,
            COALESCE(p_prescription->>'notes', 'In-Store Optometrist Clinical Rx'),
            COALESCE(p_prescription->>'checked_by', 'In-Store Staff Optometrist'),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    INSERT INTO public.orders (
        id,
        order_ref,
        order_number,
        source,
        customer_id,
        prescription_id,
        customer_name,
        customer_email,
        customer_phone,
        customer_age,
        delivery_address,
        city,
        pin_code,
        items,
        prescription_pref,
        payment_method,
        payment_status,
        subtotal,
        shipping_fee,
        grand_total,
        status,
        token_number,
        idempotency_key,
        created_at,
        updated_at
    ) VALUES (
        v_order_id,
        v_order_number,
        v_order_number,
        'instore',
        v_customer_id,
        v_rx_id,
        trim(p_customer_name),
        v_clean_email,
        v_clean_phone,
        p_customer_age,
        COALESCE(p_delivery_address, 'Pillar No. 45, Rethibowli, Hyderabad (In-Store POS)'),
        COALESCE(p_city, 'Hyderabad'),
        COALESCE(p_pin_code, '500028'),
        p_items,
        COALESCE(p_prescription_pref, 'In-Store Exam'),
        upper(p_payment_method),
        'VERIFIED',
        p_subtotal,
        p_shipping_fee,
        p_grand_total,
        'confirmed',
        p_token_number,
        p_idempotency_key,
        NOW(),
        NOW()
    );

    SELECT * INTO v_existing_order FROM public.orders WHERE id = v_order_id;
    RETURN to_jsonb(v_existing_order);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 16. Print Daemon Claim, Completion, Failure & Reprint Functions ───────────
CREATE OR REPLACE FUNCTION claim_next_print_job(
    p_worker_id TEXT DEFAULT 'daemon-worker-1',
    p_lease_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
    id UUID,
    order_id UUID,
    print_type TEXT,
    printer_id TEXT,
    status TEXT,
    attempt_count INTEGER,
    claimed_at TIMESTAMPTZ,
    lease_expires_at TIMESTAMPTZ,
    order_ref TEXT,
    order_number TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    delivery_address TEXT,
    city TEXT,
    pin_code TEXT,
    items JSONB,
    prescription_pref TEXT,
    payment_method TEXT,
    subtotal NUMERIC,
    shipping_fee NUMERIC,
    grand_total NUMERIC,
    order_source TEXT,
    order_created_at TIMESTAMPTZ,
    prescription_data JSONB
) AS $$
DECLARE
    v_job_id UUID;
BEGIN
    SELECT pj.id INTO v_job_id
    FROM public.print_jobs pj
    WHERE pj.status = 'queued'
       OR (pj.status IN ('claimed', 'printing') AND pj.lease_expires_at < NOW())
    ORDER BY pj.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_job_id IS NULL THEN
        RETURN;
    END IF;

    UPDATE public.print_jobs
    SET status = 'claimed',
        attempt_count = attempt_count + 1,
        claimed_at = NOW(),
        lease_expires_at = NOW() + (p_lease_seconds || ' seconds')::INTERVAL,
        updated_at = NOW()
    WHERE public.print_jobs.id = v_job_id;

    RETURN QUERY
    SELECT
        pj.id,
        pj.order_id,
        pj.print_type,
        pj.printer_id,
        pj.status,
        pj.attempt_count,
        pj.claimed_at,
        pj.lease_expires_at,
        o.order_ref,
        COALESCE(o.order_number, o.order_ref) AS order_number,
        o.customer_name,
        o.customer_phone,
        o.customer_email,
        o.delivery_address,
        o.city,
        o.pin_code,
        o.items,
        o.prescription_pref,
        o.payment_method,
        o.subtotal,
        o.shipping_fee,
        o.grand_total,
        o.source AS order_source,
        o.created_at AS order_created_at,
        to_jsonb(pr.*) AS prescription_data
    FROM public.print_jobs pj
    JOIN public.orders o ON pj.order_id = o.id
    LEFT JOIN public.prescriptions pr ON o.prescription_id = pr.id
    WHERE pj.id = v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION complete_print_job(
    p_job_id UUID,
    p_spooler_job_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.print_jobs
    SET status = 'completed',
        completed_at = NOW(),
        spooler_job_id = COALESCE(p_spooler_job_id, spooler_job_id),
        lease_expires_at = NULL,
        updated_at = NOW()
    WHERE id = p_job_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION fail_print_job(
    p_job_id UUID,
    p_error TEXT,
    p_mark_uncertain BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.print_jobs
    SET status = CASE WHEN p_mark_uncertain IS TRUE THEN 'uncertain' ELSE 'failed' END,
        last_error = p_error,
        lease_expires_at = NULL,
        updated_at = NOW()
    WHERE id = p_job_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reprint_order(
    p_order_id UUID,
    p_requested_by TEXT DEFAULT 'Staff Cashier',
    p_reason TEXT DEFAULT 'Customer request'
)
RETURNS JSONB AS $$
DECLARE
    v_job_id UUID := uuid_generate_v4();
    v_order public.orders%ROWTYPE;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    UPDATE public.print_jobs
    SET status = 'queued',
        attempt_count = 0,
        claimed_at = NULL,
        lease_expires_at = NULL,
        completed_at = NULL,
        last_error = 'Reprint requested by ' || p_requested_by || ': ' || p_reason,
        updated_at = NOW()
    WHERE order_id = p_order_id AND print_type = 'receipt';

    IF NOT FOUND THEN
        INSERT INTO public.print_jobs (
            id, order_id, print_type, printer_id, status, last_error, created_at, updated_at
        ) VALUES (
            v_job_id, p_order_id, 'receipt', 'POS-80', 'queued',
            'Reprint requested by ' || p_requested_by || ': ' || p_reason,
            NOW(), NOW()
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'reprinted_by', p_requested_by);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 17. Permissions & Realtime Replication ────────────────────────────────────
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view print jobs" ON public.print_jobs;
CREATE POLICY "Public can view print jobs" ON public.print_jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can manage print jobs" ON public.print_jobs;
CREATE POLICY "Public can manage print jobs" ON public.print_jobs FOR ALL USING (true) WITH CHECK (true);

GRANT EXECUTE ON FUNCTION create_website_order TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_instore_order TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION claim_next_print_job TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION complete_print_job TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fail_print_job TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reprint_order TO anon, authenticated, service_role;

DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
    EXCEPTION WHEN duplicate_object THEN
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN duplicate_object THEN
    END;
END $$;

