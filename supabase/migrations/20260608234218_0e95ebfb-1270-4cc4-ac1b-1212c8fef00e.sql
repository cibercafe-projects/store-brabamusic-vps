
-- Add path columns for beat media
ALTER TABLE public.beats
  ADD COLUMN IF NOT EXISTS capa_path text,
  ADD COLUMN IF NOT EXISTS preview_path text;

-- RLS policies for beat-covers and beat-previews (admin only manage; reads via signed URLs)
CREATE POLICY "Admins manage beat-covers"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'beat-covers' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'beat-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage beat-previews"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'beat-previews' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'beat-previews' AND public.has_role(auth.uid(), 'admin'));
