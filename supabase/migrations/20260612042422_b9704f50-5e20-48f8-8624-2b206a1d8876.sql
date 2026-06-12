
-- Sprint 10: arquivos privados do beat + tabela de entregas

-- Beats: novos paths privados
ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS wav_path text,
  ADD COLUMN IF NOT EXISTS stems_path text,
  ADD COLUMN IF NOT EXISTS license_path text;

-- purchase_requests: marca quando entrega foi feita
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Tabela de entregas
CREATE TABLE IF NOT EXISTS public.purchase_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  enviado_email boolean NOT NULL DEFAULT false,
  enviado_whatsapp boolean NOT NULL DEFAULT false,
  arquivos jsonb NOT NULL DEFAULT '[]'::jsonb,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  enviado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.purchase_deliveries TO service_role;

ALTER TABLE public.purchase_deliveries ENABLE ROW LEVEL SECURITY;

-- Sem policies públicas: acesso somente via service_role (server functions admin).

CREATE INDEX IF NOT EXISTS purchase_deliveries_purchase_idx
  ON public.purchase_deliveries(purchase_id);
CREATE INDEX IF NOT EXISTS purchase_deliveries_enviado_em_idx
  ON public.purchase_deliveries(enviado_em DESC);
