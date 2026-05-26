
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT NOT NULL UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  character TEXT NOT NULL,
  bumps JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_url TEXT,
  nexuspag_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX orders_external_id_idx ON public.orders(external_id);
CREATE INDEX orders_status_idx ON public.orders(status);

GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- No policies: anon/authenticated cannot read or write. Only service_role (used by server functions / webhook) can access.
