ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS ai_on_cover boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_on_music boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_music_details text;