CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  character TEXT NOT NULL,
  bumps JSONB DEFAULT '{}'::jsonb,
  generated_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ip_address TEXT,
  nexuspag_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_external_id_idx ON public.orders(external_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_ip_address_idx ON public.orders(ip_address);
