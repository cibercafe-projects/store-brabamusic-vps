
ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS cover_drive_url text,
  ADD COLUMN IF NOT EXISTS photos_drive_url text;

ALTER TABLE public.releases
  ALTER COLUMN cover_path DROP NOT NULL;
