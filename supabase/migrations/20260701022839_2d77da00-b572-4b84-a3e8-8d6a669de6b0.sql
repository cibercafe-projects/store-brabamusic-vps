ALTER TABLE public.purchase_requests
  ADD COLUMN license_accepted boolean,
  ADD COLUMN license_accepted_at timestamptz,
  ADD COLUMN license_version text,
  ADD COLUMN license_snapshot jsonb;