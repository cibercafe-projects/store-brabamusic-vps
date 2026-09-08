-- Mantém no histórico todos os dados da promoção (link de pagamento e descrição),
-- para que campanhas encerradas continuem visíveis com os mesmos valores que tinham.
ALTER TABLE public.beat_type_promo_history
  ADD COLUMN IF NOT EXISTS promo_link_pagamento TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS promo_descricao TEXT NULL;
