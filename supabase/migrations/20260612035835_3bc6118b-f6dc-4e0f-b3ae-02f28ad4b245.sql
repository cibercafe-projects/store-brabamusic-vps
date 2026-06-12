
ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS lyrics_drive_url text;

ALTER TABLE public.releases
  ALTER COLUMN lyrics DROP NOT NULL;
