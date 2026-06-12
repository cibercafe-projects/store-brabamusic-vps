
ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS audio_drive_url text,
  ADD COLUMN IF NOT EXISTS tracklist text;

ALTER TABLE public.releases
  ALTER COLUMN isrc DROP NOT NULL;
