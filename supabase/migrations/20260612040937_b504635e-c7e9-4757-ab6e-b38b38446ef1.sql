
-- Enum for status
DO $$ BEGIN
  CREATE TYPE public.purchase_status AS ENUM (
    'aguardando_pagamento',
    'comprovante_recebido',
    'pagamento_confirmado',
    'arquivos_enviados',
    'cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.purchase_payment_method AS ENUM ('pix', 'link');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE RESTRICT,
  nome_cliente text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  instagram text,
  forma_pagamento public.purchase_payment_method NOT NULL,
  termos_aceitos boolean NOT NULL DEFAULT false,
  valor numeric(10,2),
  status public.purchase_status NOT NULL DEFAULT 'aguardando_pagamento',
  receipt_path text,
  receipt_uploaded_at timestamptz,
  continuation_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.purchase_requests TO service_role;

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

-- No public/authenticated policies — all access via server functions with service role.

CREATE INDEX IF NOT EXISTS purchase_requests_beat_id_idx ON public.purchase_requests(beat_id);
CREATE INDEX IF NOT EXISTS purchase_requests_status_idx ON public.purchase_requests(status);
CREATE INDEX IF NOT EXISTS purchase_requests_created_at_idx ON public.purchase_requests(created_at DESC);

CREATE TRIGGER purchase_requests_set_updated_at
BEFORE UPDATE ON public.purchase_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('pix_key', ''),
  ('payment_link', ''),
  ('commercial_whatsapp', '+5511913401000')
ON CONFLICT (key) DO NOTHING;
