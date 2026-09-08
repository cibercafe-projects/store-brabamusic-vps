-- Promoções por tipo de beat: descrição pública e flag de lembrete 1h
-- Migration rodada manualmente em produção via docker exec (não usar supabase db push
-- enquanto não houver CLI configurada no ambiente).

ALTER TABLE public.beat_types
  ADD COLUMN IF NOT EXISTS promo_descricao text,
  ADD COLUMN IF NOT EXISTS promo_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.beat_types.promo_descricao
  IS 'Texto exibido no banner público da promoção (opcional).';

COMMENT ON COLUMN public.beat_types.promo_reminder_sent_at
  IS 'Quando o lembrete de 1h antes foi enviado ao admin. Resetado em edições da promoção.';
