ALTER TABLE public.purchase_deliveries
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS recipient_whatsapp TEXT;