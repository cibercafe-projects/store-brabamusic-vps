
-- Enums
CREATE TYPE public.release_type AS ENUM ('single', 'ep', 'album');
CREATE TYPE public.release_status AS ENUM ('recebido', 'em_analise', 'aprovado', 'distribuido');
CREATE TYPE public.release_audio_format AS ENUM ('wav', 'mp3');

-- releases
CREATE TABLE public.releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  release_type public.release_type NOT NULL,
  release_name TEXT NOT NULL,
  lyrics TEXT NOT NULL,
  isrc TEXT NOT NULL,
  cover_path TEXT NOT NULL,
  genres TEXT[] NOT NULL DEFAULT '{}',
  moods TEXT[] NOT NULL DEFAULT '{}',
  instruments TEXT[] NOT NULL DEFAULT '{}',
  technical_sheet TEXT NOT NULL,
  royalties TEXT NOT NULL,
  about_artist TEXT NOT NULL,
  about_release TEXT NOT NULL,
  has_videoclip BOOLEAN NOT NULL DEFAULT false,
  status public.release_status NOT NULL DEFAULT 'recebido',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.releases TO authenticated;
GRANT ALL ON public.releases TO service_role;

ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam releases"
  ON public.releases FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_releases_updated_at
  BEFORE UPDATE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_releases_status ON public.releases(status);
CREATE INDEX idx_releases_created_at ON public.releases(created_at DESC);

-- release_audio_files
CREATE TABLE public.release_audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  format public.release_audio_format NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_audio_files TO authenticated;
GRANT ALL ON public.release_audio_files TO service_role;

ALTER TABLE public.release_audio_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam audio releases"
  ON public.release_audio_files FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_release_audio_release ON public.release_audio_files(release_id);

-- release_promo_photos
CREATE TABLE public.release_promo_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_promo_photos TO authenticated;
GRANT ALL ON public.release_promo_photos TO service_role;

ALTER TABLE public.release_promo_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam fotos releases"
  ON public.release_promo_photos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_release_photos_release ON public.release_promo_photos(release_id);
