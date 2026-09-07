ALTER TABLE public.beat_types
  ADD COLUMN IF NOT EXISTS promo_ativa BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS promo_valor NUMERIC(10,2) NULL,
  ADD COLUMN IF NOT EXISTS promo_link_pagamento TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS promo_inicio_em TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS promo_expira_em TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS public.beat_type_promo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_type_id UUID NOT NULL REFERENCES public.beat_types(id) ON DELETE CASCADE,
  promo_ativa BOOLEAN NOT NULL,
  promo_valor NUMERIC(10,2) NULL,
  promo_inicio_em TIMESTAMPTZ NULL,
  promo_expira_em TIMESTAMPTZ NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID NULL
);

CREATE INDEX IF NOT EXISTS beat_type_promo_history_beat_type_id_idx
  ON public.beat_type_promo_history (beat_type_id, changed_at DESC);

ALTER TABLE public.beat_type_promo_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage beat_type_promo_history" ON public.beat_type_promo_history;
CREATE POLICY "Admins manage beat_type_promo_history"
  ON public.beat_type_promo_history
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));