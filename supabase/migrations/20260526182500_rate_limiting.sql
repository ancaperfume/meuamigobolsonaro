-- Add ip_address column to public.orders if it doesn't exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ip_address TEXT;
CREATE INDEX IF NOT EXISTS orders_ip_address_idx ON public.orders(ip_address);

-- Create generations tracking table
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generations_ip_idx ON public.generations(ip_address);
CREATE INDEX IF NOT EXISTS generations_created_at_idx ON public.generations(created_at);

GRANT ALL ON public.generations TO service_role;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
