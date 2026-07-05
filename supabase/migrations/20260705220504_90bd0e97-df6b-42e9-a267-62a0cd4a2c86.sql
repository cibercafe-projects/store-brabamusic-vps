
CREATE TABLE public.beat_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  descricao text NOT NULL DEFAULT '',
  valor_padrao numeric(10,2) NOT NULL DEFAULT 0,
  link_pagamento text NOT NULL DEFAULT '',
  inclui_stems boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.beat_types TO authenticated;
GRANT ALL ON public.beat_types TO service_role;

ALTER TABLE public.beat_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage beat_types"
  ON public.beat_types FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_beat_types_updated_at
  BEFORE UPDATE ON public.beat_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed inicial: copia link de pagamento global existente
INSERT INTO public.beat_types (nome, slug, descricao, valor_padrao, link_pagamento, inclui_stems, ativo, ordem)
VALUES
  (
    'Beat Fechado',
    'fechado',
    'Entrega apenas WAV master.',
    100.00,
    COALESCE((SELECT value FROM public.app_settings WHERE key = 'payment_link'), ''),
    false,
    true,
    1
  ),
  (
    'Beat Aberto',
    'aberto',
    'Entrega WAV master + stems.',
    200.00,
    COALESCE((SELECT value FROM public.app_settings WHERE key = 'payment_link'), ''),
    true,
    true,
    2
  );
