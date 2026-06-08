-- Producer status enum
CREATE TYPE public.producer_status AS ENUM ('ativa', 'inativa');

-- Producers table
CREATE TABLE public.producers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome_artistico text NOT NULL,
  instagram text,
  spotify text,
  cidade text,
  bio text,
  foto_perfil_url text,
  foto_perfil_path text,
  status public.producer_status NOT NULL DEFAULT 'ativa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX producers_status_idx ON public.producers(status);
CREATE INDEX producers_nome_artistico_idx ON public.producers(nome_artistico);

-- Grants (only admins use this table — service_role for server fns; authenticated needed only because RLS-gated SELECT may be added later)
GRANT SELECT, INSERT, UPDATE ON public.producers TO authenticated;
GRANT ALL ON public.producers TO service_role;

-- RLS
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view producers"
  ON public.producers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert producers"
  ON public.producers FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update producers"
  ON public.producers FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER producers_set_updated_at
  BEFORE UPDATE ON public.producers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();