-- Enum
CREATE TYPE public.beat_status AS ENUM ('rascunho', 'ativo', 'vendido');

-- Table
CREATE TABLE public.beats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produtora_id uuid NOT NULL REFERENCES public.producers(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  genero text,
  bpm integer,
  tom text,
  mood text,
  preco numeric(10,2),
  descricao text,
  status public.beat_status NOT NULL DEFAULT 'rascunho',
  capa_url text,
  preview_url text,
  wav_url text,
  stems_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beats_bpm_range CHECK (bpm IS NULL OR (bpm >= 40 AND bpm <= 300)),
  CONSTRAINT beats_preco_nonneg CHECK (preco IS NULL OR preco >= 0)
);

CREATE INDEX beats_produtora_id_idx ON public.beats(produtora_id);
CREATE INDEX beats_status_idx ON public.beats(status);
CREATE INDEX beats_created_at_idx ON public.beats(created_at DESC);
CREATE INDEX beats_nome_idx ON public.beats(nome);

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.beats TO authenticated;
GRANT ALL ON public.beats TO service_role;

-- RLS
ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view beats"
  ON public.beats FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert beats"
  ON public.beats FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update beats"
  ON public.beats FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at (reuses existing public.set_updated_at)
CREATE TRIGGER beats_set_updated_at
  BEFORE UPDATE ON public.beats
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
