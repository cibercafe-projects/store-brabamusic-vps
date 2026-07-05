
ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS beat_type_id uuid REFERENCES public.beat_types(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS beats_beat_type_id_idx ON public.beats(beat_type_id);

-- Backfill from legacy tipo enum → beat_types.slug
UPDATE public.beats b
SET beat_type_id = bt.id
FROM public.beat_types bt
WHERE b.beat_type_id IS NULL
  AND bt.slug = b.tipo::text;
