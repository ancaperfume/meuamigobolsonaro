-- Add columns to generations table for admin panel logging
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS character TEXT;
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'generated';

CREATE INDEX IF NOT EXISTS generations_character_idx ON public.generations(character);
CREATE INDEX IF NOT EXISTS generations_status_idx ON public.generations(status);
