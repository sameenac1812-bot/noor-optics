-- ==============================================================================
-- NOOR OPTICS — MASTER DUAL-PIPELINE & DURABLE PRINT QUEUE MIGRATION
-- Run this migration in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Ensure UUID extension is active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. ORDERS TABLE ENHANCEMENTS & SOURCE SEPARATION
-- ──────────────────────────────────────────────────────────────────────────────

-- Add source column with check constraint ('website' or 'instore')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'source'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN source TEXT DEFAULT 'website';
    END IF;
END $$;

-- Backfill source column for any existing orders based on order_ref patterns
UPDATE public.orders
SET source = CASE
    WHEN order_ref ILIKE '%-POS-%' OR order_ref ILIKE '%IN-STORE%' OR delivery_address ILIKE '%Pillar No. 45, Rethibowli%' OR delivery_address ILIKE '%In-Store Purchase%' THEN 'instore'
    ELSE 'website'
END
WHERE source IS NULL OR source = '';

-- Add check constraint for source
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_source'
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT chk_orders_source CHECK (source IN ('website', 'instore'));
    END IF;
END $$;

-- Ensure source is NOT NULL
ALTER TABLE public.orders ALTER COLUMN source SET NOT NULL;

-- Add order_number column (unique human-readable identifier)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'order_number'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN order_number TEXT;
    END IF;
END $$;

UPDATE public.orders
SET order_number = order_ref
WHERE order_number IS NULL OR order_number = '';

-- Add unique constraint on order_number
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_orders_order_number'
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT uq_orders_order_number UNIQUE (order_number);
    END IF;
END $$;

-- Add customer and prescription links
DO $$
BEGIN
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
        WHERE table_schema = 'public' AND table_name = 'is_archived' AND column_name = 'is_archived'
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

-- Unique constraint on idempotency_key when provided
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_orders_idempotency_key'
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT uq_orders_idempotency_key UNIQUE (idempotency_key);
    END IF;
END $$;

-- Indexes for lightning queries
CREATE INDEX IF NOT EXISTS idx_orders_source ON public.orders (source);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_prescription_id ON public.orders (prescription_id);
CREATE INDEX IF NOT EXISTS idx_orders_is_archived ON public.orders (is_archived);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. IMMUTABLE SOURCE PROTECTION TRIGGER
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION protect_order_source()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.source IS DISTINCT FROM NEW.source THEN
        RAISE EXCEPTION 'Order source is immutable (attempted to change % to %)', OLD.source, NEW.source;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_order_source ON public.orders;
CREATE TRIGGER trg_protect_order_source
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION protect_order_source();

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. INDEPENDENT DATABASE-BACKED VIEWS FOR ADMIN SECTIONS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.website_orders_view AS
SELECT * FROM public.orders
WHERE source = 'website' AND (is_archived IS FALSE OR is_archived IS NULL);

CREATE OR REPLACE VIEW public.instore_orders_view AS
SELECT * FROM public.orders
WHERE source = 'instore' AND (is_archived IS FALSE OR is_archived IS NULL);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. DURABLE PRINT QUEUE TABLE (print_jobs)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.print_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    print_type TEXT NOT NULL DEFAULT 'receipt',
    printer_id TEXT DEFAULT 'POS-80',
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'printing', 'completed', 'failed', 'uncertain', 'cancelled', 'on_hold')),
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

-- Ensure existing print_jobs tables accept on_hold status
DO $$
BEGIN
    ALTER TABLE public.print_jobs DROP CONSTRAINT IF EXISTS print_jobs_status_check;
    ALTER TABLE public.print_jobs ADD CONSTRAINT print_jobs_status_check 
        CHECK (status IN ('queued', 'claimed', 'printing', 'completed', 'failed', 'uncertain', 'cancelled', 'on_hold'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON public.print_jobs (status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_order_id ON public.print_jobs (order_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_lease ON public.print_jobs (status, lease_expires_at);
CREATE INDEX IF NOT EXISTS idx_print_jobs_created_at ON public.print_jobs (created_at ASC);

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. ATOMIC INITIAL RECEIPT PRINT JOB TRIGGER
-- Guarantees an order is NEVER committed without its initial print job
-- In-store orders: queued immediately for zero-delay counter printing.
-- Website orders: held in 'on_hold' until shop owner verifies UPI payment.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_initial_receipt_print_job()
RETURNS TRIGGER AS $$
BEGIN
    -- For in-store orders: print immediately!
    IF NEW.source = 'instore' THEN
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
    -- For website orders: hold in 'on_hold' until shop owner approves UPI payment!
    ELSIF NEW.source = 'website' THEN
        IF NEW.payment_status = 'VERIFIED' THEN
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
            ON CONFLICT (order_id, print_type)
            DO UPDATE SET status = 'queued', updated_at = NOW();
        ELSE
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
                'on_hold',
                0,
                NOW(),
                NOW()
            )
            ON CONFLICT (order_id, print_type) DO NOTHING;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_initial_print_job ON public.orders;
CREATE TRIGGER trg_order_initial_print_job
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION create_initial_receipt_print_job();

-- Trigger on payment_status update: when shop owner verifies UPI, release receipt to printer
CREATE OR REPLACE FUNCTION on_order_payment_verified_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'VERIFIED' AND (OLD.payment_status IS DISTINCT FROM 'VERIFIED') THEN
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
        ON CONFLICT (order_id, print_type)
        DO UPDATE SET status = 'queued', attempt_count = 0, lease_expires_at = NULL, last_error = NULL, updated_at = NOW();
    ELSIF NEW.payment_status = 'REJECTED' AND (OLD.payment_status IS DISTINCT FROM 'REJECTED') THEN
        UPDATE public.print_jobs
        SET status = 'cancelled', updated_at = NOW()
        WHERE order_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_payment_status_update ON public.orders;
CREATE TRIGGER trg_order_payment_status_update
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION on_order_payment_verified_trigger();

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. SECURE ORDER CREATION FUNCTIONS (Dual Strictly Separated Pipelines)
-- ──────────────────────────────────────────────────────────────────────────────

-- 7A. create_website_order()
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
    -- Idempotency check: if order with this key already exists, return it directly
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT * INTO v_existing_order FROM public.orders WHERE idempotency_key = p_idempotency_key LIMIT 1;
        IF FOUND THEN
            RETURN to_jsonb(v_existing_order);
        END IF;
    END IF;

    -- Clean inputs
    v_clean_phone := COALESCE(NULLIF(regexp_replace(p_customer_phone, '[^0-9+]', '', 'g'), ''), '9999999999');
    v_clean_email := COALESCE(NULLIF(trim(p_customer_email), ''), lower(v_clean_phone) || '@nooroptics.in');
    v_order_number := 'NOOR-WEB-' || v_date_part || '-' || v_rand_part;

    -- Upsert Customer Record
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

    -- Create Prescription if provided
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

    -- Insert Order (source is IMMUTABLY forced to 'website')
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
        'AWAITING_VERIFICATION',
        p_subtotal,
        p_shipping_fee,
        p_grand_total,
        'PENDING_VERIFICATION',
        p_idempotency_key,
        NOW(),
        NOW()
    );

    SELECT * INTO v_existing_order FROM public.orders WHERE id = v_order_id;
    RETURN to_jsonb(v_existing_order);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7B. create_instore_order()
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
    -- Idempotency check
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT * INTO v_existing_order FROM public.orders WHERE idempotency_key = p_idempotency_key LIMIT 1;
        IF FOUND THEN
            RETURN to_jsonb(v_existing_order);
        END IF;
    END IF;

    -- Clean inputs
    v_clean_phone := COALESCE(NULLIF(regexp_replace(p_customer_phone, '[^0-9+]', '', 'g'), ''), '9999999999');
    v_clean_email := COALESCE(NULLIF(trim(p_customer_email), ''), lower(v_clean_phone) || '@nooroptics.in');
    v_order_number := 'NOOR-POS-' || v_date_part || '-' || v_rand_part;

    -- Upsert Customer Record
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

    -- Create Prescription if provided
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

    -- Insert Order (source is IMMUTABLY forced to 'instore')
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

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. PRINT DAEMON CONCURRENCY & LEASE CONTROL FUNCTIONS
-- ──────────────────────────────────────────────────────────────────────────────

-- 8A. claim_next_print_job(worker_id, lease_seconds)
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
    -- Atomically lock the oldest eligible job:
    -- 'queued', OR ('claimed'/'printing' whose lease expired)
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

    -- Update status and lease atomically
    UPDATE public.print_jobs
    SET status = 'claimed',
        attempt_count = public.print_jobs.attempt_count + 1,
        claimed_at = NOW(),
        lease_expires_at = NOW() + (p_lease_seconds || ' seconds')::INTERVAL,
        updated_at = NOW()
    WHERE public.print_jobs.id = v_job_id;

    -- Return job with linked order & prescription details
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

-- 8B. complete_print_job(job_id, spooler_job_id)
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

-- 8C. fail_print_job(job_id, error, mark_uncertain)
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

-- 8D. reprint_order(order_id, requested_by, reason)
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

    -- Reset or re-queue the receipt print job for this order
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

-- 8E. verify_website_order(order_id, notes)
CREATE OR REPLACE FUNCTION verify_website_order(
    p_order_id UUID,
    p_notes TEXT DEFAULT 'Verified by Shop Owner'
)
RETURNS JSONB AS $$
DECLARE
    v_order public.orders%ROWTYPE;
BEGIN
    UPDATE public.orders
    SET
        payment_status = 'VERIFIED',
        status = 'confirmed',
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    -- Release/upsert print job atomically so POS printer immediately starts printing receipt
    INSERT INTO public.print_jobs (
        order_id,
        print_type,
        printer_id,
        status,
        attempt_count,
        created_at,
        updated_at
    ) VALUES (
        p_order_id,
        'receipt',
        'POS-80',
        'queued',
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (order_id, print_type)
    DO UPDATE SET status = 'queued', attempt_count = 0, lease_expires_at = NULL, last_error = NULL, updated_at = NOW();

    RETURN to_jsonb(v_order);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8F. reject_website_order(order_id, reason)
CREATE OR REPLACE FUNCTION reject_website_order(
    p_order_id UUID,
    p_reason TEXT DEFAULT 'Payment rejected'
)
RETURNS JSONB AS $$
DECLARE
    v_order public.orders%ROWTYPE;
BEGIN
    UPDATE public.orders
    SET
        payment_status = 'REJECTED',
        status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id;
    END IF;

    -- Cancel print job atomically
    UPDATE public.print_jobs
    SET status = 'cancelled', updated_at = NOW()
    WHERE order_id = p_order_id;

    RETURN to_jsonb(v_order);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. PERMISSIONS & ROW LEVEL SECURITY (RLS) POLICIES
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view print jobs" ON public.print_jobs;
CREATE POLICY "Public can view print jobs" ON public.print_jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can manage print jobs" ON public.print_jobs;
CREATE POLICY "Public can manage print jobs" ON public.print_jobs FOR ALL USING (true) WITH CHECK (true);

-- Grant execution to anon and authenticated
GRANT EXECUTE ON FUNCTION create_website_order TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_instore_order TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION claim_next_print_job TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION complete_print_job TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fail_print_job TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reprint_order TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION verify_website_order TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION reject_website_order TO anon, authenticated, service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- 10. REALTIME PUBLICATION
-- Enable Realtime replication on print_jobs and orders
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;
    EXCEPTION WHEN duplicate_object THEN
        -- table already in publication
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN duplicate_object THEN
        -- table already in publication
    END;
END $$;



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
(
  'prod-1793606608894', 'meta glasses meta', 'meta glasses', 48000, 48500, 'New Arrival',
  'Rectangular', 'Acetate', 'M', 'Frames', 4.9, 18,
  'data:image/jpeg;base64,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', '[{"name":"Standard","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: meta glasses | Model: meta | Color: black | Size: M', true
),
(
  'prod-noor-01', 'Cartier Panther Gold', 'Cartier', 1461, 1961, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_01.jpg', '[{"name":"Gold","hex":"#D4AF37"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Panther Gold | Color: Gold | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-02', 'Cartier Sunset Rimless', 'Cartier', 1448, 1948, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_02.jpg', '[{"name":"Brown Gradient","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Sunset Rimless | Color: Brown Gradient | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-03', 'Cartier Blue Horizon', 'Cartier', 1456, 1956, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_03.jpg', '[{"name":"Blue Gradient","hex":"#2B4C7E"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Blue Horizon | Color: Blue Gradient | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-04', 'Cartier Hexagon Facet', 'Cartier', 1455, 1955, 'New Arrival',
  'Hex / Geometric', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_04.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Hexagon Facet | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-05', 'Cartier Crystal Rimless', 'Cartier', 1425, 1925, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_05.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Crystal Rimless | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-06', 'Cartier Gold Aviator', 'Cartier', 1433, 1933, 'New Arrival',
  'Aviator', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_06.jpg', '[{"name":"Gold","hex":"#D4AF37"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Gold Aviator | Color: Gold | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-07', 'Cartier Black Panther', 'Cartier', 1456, 1956, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_07.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Black Panther | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-08', 'Cartier Brown Silhouette', 'Cartier', 1432, 1932, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_08.jpg', '[{"name":"Brown Gradient","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Brown Silhouette | Color: Brown Gradient | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-09', 'Cartier Mirage Shield', 'Cartier', 1450, 1950, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_09.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Mirage Shield | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-10', 'Cartier Double Bridge', 'Cartier', 1468, 1968, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_10.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Double Bridge | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-11', 'Cartier Amber Luxe', 'Cartier', 1443, 1943, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_11.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Amber Luxe | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-12', 'Cartier Silver Facet', 'Cartier', 1499, 1999, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_12.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Silver Facet | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-13', 'Cartier Diamond Cut', 'Cartier', 1486, 1986, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_13.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Diamond Cut | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-14', 'Versace Medusa Havana', 'Versace', 1485, 1985, 'New Arrival',
  'Square', 'Hand-Polished Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_14.jpg', '[{"name":"Tortoise Havana","hex":"#6E3E1C"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Versace | Style: Versace Medusa Havana | Color: Tortoise Havana | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-15', 'Versace Crystal Grey', 'Versace', 1415, 1915, 'New Arrival',
  'Square', 'Hand-Polished Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_15.jpg', '[{"name":"Smoked Grey","hex":"#52525B"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Versace | Style: Versace Crystal Grey | Color: Smoked Grey | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-16', 'Versace Bold Square', 'Versace', 1475, 1975, 'New Arrival',
  'Square', 'Hand-Polished Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_16.jpg', '[{"name":"Onyx Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Versace | Style: Versace Bold Square | Color: Onyx Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-17', 'D&G Shield Rimless', 'Dolce & Gabbana', 1479, 1979, 'New Arrival',
  'Hex / Geometric', 'Beta-Titanium & Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_17.jpg', '[{"name":"Dark Gradient","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Dolce & Gabbana | Style: D&G Shield Rimless | Color: Dark Gradient | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-18', 'D&G Gold Baroque', 'Dolce & Gabbana', 1443, 1943, 'New Arrival',
  'Rectangular', 'Beta-Titanium & Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_18.jpg', '[{"name":"Gold & Black","hex":"#D4AF37"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Dolce & Gabbana | Style: D&G Gold Baroque | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-19', 'D&G Black Gradient', 'Dolce & Gabbana', 1407, 1907, 'New Arrival',
  'Rectangular', 'Beta-Titanium & Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_19.jpg', '[{"name":"Dark Gradient","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Dolce & Gabbana | Style: D&G Black Gradient | Color: Dark Gradient | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-20', 'D&G Sunset Pilot', 'Dolce & Gabbana', 1438, 1938, 'New Arrival',
  'Rectangular', 'Beta-Titanium & Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_20.jpg', '[{"name":"Dark Gradient","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Dolce & Gabbana | Style: D&G Sunset Pilot | Color: Dark Gradient | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-21', 'D&G Crystal Smoke', 'Dolce & Gabbana', 1484, 1984, 'New Arrival',
  'Rectangular', 'Beta-Titanium & Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_21.jpg', '[{"name":"Dark Gradient","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Dolce & Gabbana | Style: D&G Crystal Smoke | Color: Dark Gradient | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-22', 'D&G Milan Square', 'Dolce & Gabbana', 1493, 1993, 'New Arrival',
  'Square', 'Beta-Titanium & Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_22.jpg', '[{"name":"Dark Gradient","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Dolce & Gabbana | Style: D&G Milan Square | Color: Dark Gradient | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-23', 'Burberry Check Square', 'Burberry', 1438, 1938, 'New Arrival',
  'Square', 'Italian Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_23.jpg', '[{"name":"Black Check","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Burberry | Style: Burberry Check Square | Color: Black Check | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-24', 'Burberry Classic Noir', 'Burberry', 1499, 1999, 'New Arrival',
  'Rectangular', 'Italian Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_24.jpg', '[{"name":"Black Check","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Burberry | Style: Burberry Classic Noir | Color: Black Check | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-25', 'Burberry Burgundy Chic', 'Burberry', 1429, 1929, 'New Arrival',
  'Rectangular', 'Italian Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_25.jpg', '[{"name":"Burgundy","hex":"#4A1521"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Burberry | Style: Burberry Burgundy Chic | Color: Burgundy | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-26', 'Burberry Urban Grey', 'Burberry', 1448, 1948, 'New Arrival',
  'Rectangular', 'Italian Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_26.jpg', '[{"name":"Translucent Grey","hex":"#71717A"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Burberry | Style: Burberry Urban Grey | Color: Translucent Grey | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-27', 'Cartier Royal Shield', 'Cartier', 1422, 1922, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_27.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Royal Shield | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-28', 'Cartier Octagon Gold', 'Cartier', 1480, 1980, 'New Arrival',
  'Hex / Geometric', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_28.jpg', '[{"name":"Gold","hex":"#D4AF37"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Octagon Gold | Color: Gold | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-29', 'Cartier Champagne Tint', 'Cartier', 1498, 1998, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_29.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Champagne Tint | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-30', 'Burberry Havana Tartan', 'Burberry', 1419, 1919, 'New Arrival',
  'Rectangular', 'Italian Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_30.jpg', '[{"name":"Tartan Havana","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Burberry | Style: Burberry Havana Tartan | Color: Tartan Havana | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-31', 'Cartier Emerald Rimless', 'Cartier', 1461, 1961, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_31.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Emerald Rimless | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-32', 'Cartier Jaguar Noir', 'Cartier', 1461, 1961, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_32.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Jaguar Noir | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-33', 'D&G Olive Gradient', 'Dolce & Gabbana', 1482, 1982, 'New Arrival',
  'Rectangular', 'Beta-Titanium & Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_33.jpg', '[{"name":"Olive Gradient","hex":"#556B2F"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Dolce & Gabbana | Style: D&G Olive Gradient | Color: Olive Gradient | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-34', 'D&G Logo Cutout', 'Dolce & Gabbana', 1459, 1959, 'New Arrival',
  'Rectangular', 'Beta-Titanium & Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_34.jpg', '[{"name":"Dark Gradient","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Dolce & Gabbana | Style: D&G Logo Cutout | Color: Dark Gradient | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-35', 'D&G Blue Marine', 'Dolce & Gabbana', 1439, 1939, 'New Arrival',
  'Rectangular', 'Beta-Titanium & Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_35.jpg', '[{"name":"Ocean Blue","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Dolce & Gabbana | Style: D&G Blue Marine | Color: Ocean Blue | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-36', 'Cartier Gold Studded', 'Cartier', 1408, 1908, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_36.jpg', '[{"name":"Gold","hex":"#D4AF37"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Gold Studded | Color: Gold | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-37', 'Cartier Horizon Gradient', 'Cartier', 1484, 1984, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_37.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Horizon Gradient | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-38', 'D&G Havana Modern', 'Dolce & Gabbana', 1437, 1937, 'New Arrival',
  'Rectangular', 'Beta-Titanium & Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_38.jpg', '[{"name":"Dark Gradient","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Dolce & Gabbana | Style: D&G Havana Modern | Color: Dark Gradient | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-39', 'D&G Gold Filigree', 'Dolce & Gabbana', 1425, 1925, 'New Arrival',
  'Rectangular', 'Beta-Titanium & Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_39.jpg', '[{"name":"Gold & Black","hex":"#D4AF37"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Dolce & Gabbana | Style: D&G Gold Filigree | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-40', 'Cartier Titanium Pilot', 'Cartier', 1424, 1924, 'New Arrival',
  'Aviator', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_40.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Titanium Pilot | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-41', 'Cartier Faceted Smoke', 'Cartier', 1403, 1903, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_41.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Faceted Smoke | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-42', 'Cartier Rose Gold', 'Cartier', 1456, 1956, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_42.jpg', '[{"name":"Gold","hex":"#D4AF37"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Rose Gold | Color: Gold | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-43', 'Cartier Classic Rimless', 'Cartier', 1416, 1916, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_43.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Classic Rimless | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-44', 'Cartier Bronze Shield', 'Cartier', 1441, 1941, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_44.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Bronze Shield | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-45', 'Cartier Platinum Pilot', 'Cartier', 1486, 1986, 'New Arrival',
  'Aviator', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_45.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Platinum Pilot | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-46', 'Cartier Sleek Rimless', 'Cartier', 1414, 1914, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_46.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Sleek Rimless | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-47', 'Cartier Midnight Panther', 'Cartier', 1455, 1955, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_47.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Midnight Panther | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-48', 'Cartier Gold Silhouette', 'Cartier', 1458, 1958, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_48.jpg', '[{"name":"Gold","hex":"#D4AF37"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Gold Silhouette | Color: Gold | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-49', 'Cartier Havana Edge', 'Cartier', 1403, 1903, 'New Arrival',
  'Rectangular', 'Gold-Plated Titanium', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_49.jpg', '[{"name":"Gold & Black","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Cartier | Style: Cartier Havana Edge | Color: Gold & Black | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-50', 'Burberry Optical Square', 'Burberry', 1495, 1995, 'New Arrival',
  'Square', 'Italian Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_50.jpg', '[{"name":"Black Check","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Burberry | Style: Burberry Optical Square | Color: Black Check | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-51', 'Burberry London Rectangle', 'Burberry', 1478, 1978, 'New Arrival',
  'Rectangular', 'Italian Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_51.jpg', '[{"name":"Black Check","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Burberry | Style: Burberry London Rectangle | Color: Black Check | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-52', 'Burberry Vintage Check', 'Burberry', 1474, 1974, 'New Arrival',
  'Rectangular', 'Italian Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_52.jpg', '[{"name":"Black Check","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Burberry | Style: Burberry Vintage Check | Color: Black Check | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-53', 'Burberry Crystal Clear', 'Burberry', 1466, 1966, 'New Arrival',
  'Rectangular', 'Italian Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_53.jpg', '[{"name":"Black Check","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Burberry | Style: Burberry Crystal Clear | Color: Black Check | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-54', 'Burberry Amber Tartan', 'Burberry', 1428, 1928, 'New Arrival',
  'Rectangular', 'Italian Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_54.jpg', '[{"name":"Tartan Havana","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Burberry | Style: Burberry Amber Tartan | Color: Tartan Havana | Authenticity Card & Premium Case Included', true
),
(
  'prod-noor-55', 'Burberry British Modern', 'Burberry', 1425, 1925, 'New Arrival',
  'Rectangular', 'Italian Bio-Acetate', 'Regular', 'Frames', 4.9, 18,
  '/images/frames/frame_55.jpg', '[{"name":"Black Check","hex":"#111111"}]'::jsonb, '{"lens":"53mm","bridge":"18mm","temple":"145mm","weight":"18g"}'::jsonb,
  'Brand: Burberry | Style: Burberry British Modern | Color: Black Check | Authenticity Card & Premium Case Included', true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  collection = EXCLUDED.collection,
  price = EXCLUDED.price,
  original_price = EXCLUDED.original_price,
  image = EXCLUDED.image,
  description = EXCLUDED.description,
  is_active = true;
