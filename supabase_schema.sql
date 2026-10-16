-- ══════════════════════════════════════════════════════════════════
-- Restaurant Menu & Order Management – Supabase Schema
-- Run this in your Supabase project: SQL Editor -> New Query -> Run
-- ══════════════════════════════════════════════════════════════════

-- 1. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  table_number TEXT,
  service_mode TEXT DEFAULT 'dine-in',
  payment_method TEXT DEFAULT 'cash',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  special_instructions TEXT,
  status TEXT DEFAULT 'placed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordering by creation time
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 2. Create Menu Data Table for Cloud Sync
CREATE TABLE IF NOT EXISTS public.menu_data (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Configure Row Level Security (RLS)
-- Allow public anon read and write access for customers and restaurant staff
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access on orders" ON public.orders;
CREATE POLICY "Public access on orders" ON public.orders
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on menu_data" ON public.menu_data;
CREATE POLICY "Public access on menu_data" ON public.menu_data
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 4. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_data;
