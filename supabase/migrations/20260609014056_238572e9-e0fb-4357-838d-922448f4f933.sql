
ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS plays_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_beat_plays(_beat_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.beats
     SET plays_count = plays_count + 1
   WHERE id = _beat_id AND status = 'ativo'
   RETURNING plays_count INTO new_count;
  RETURN COALESCE(new_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_beat_plays(uuid) TO anon, authenticated, service_role;
