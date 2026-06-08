-- Admin-only access to producer-avatars bucket
CREATE POLICY "Admins read producer avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'producer-avatars' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload producer avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'producer-avatars' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update producer avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'producer-avatars' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'producer-avatars' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete producer avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'producer-avatars' AND public.has_role(auth.uid(), 'admin'));