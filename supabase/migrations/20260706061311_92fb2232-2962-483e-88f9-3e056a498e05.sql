-- Add 'reservado' to beat_status enum and reservation fields
ALTER TYPE public.beat_status ADD VALUE IF NOT EXISTS 'reservado';

ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reservation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS reserved_purchase_id uuid REFERENCES public.purchase_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS beats_status_expires_idx
  ON public.beats (status, reservation_expires_at);

CREATE OR REPLACE FUNCTION public.expire_beat_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH updated AS (
    UPDATE public.beats
       SET status = 'ativo',
           reserved_at = NULL,
           reservation_expires_at = NULL,
           reserved_purchase_id = NULL
     WHERE status = 'reservado'
       AND reservation_expires_at IS NOT NULL
       AND reservation_expires_at < now()
    RETURNING 1
  )
  SELECT count(*)::int INTO n FROM updated;
  RETURN COALESCE(n, 0);
END;
$$;