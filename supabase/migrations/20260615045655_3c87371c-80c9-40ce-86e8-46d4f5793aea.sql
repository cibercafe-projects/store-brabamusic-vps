CREATE TYPE public.beat_tipo AS ENUM ('fechado','aberto');
ALTER TABLE public.beats ADD COLUMN tipo public.beat_tipo NOT NULL DEFAULT 'fechado';
CREATE INDEX beats_tipo_idx ON public.beats(tipo);