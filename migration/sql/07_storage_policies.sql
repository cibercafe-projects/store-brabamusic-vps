-- Braba Beats — export de migração
-- Gerado automaticamente. Não editar à mão.

-- 07_storage_policies.sql — policies em storage.objects

DROP POLICY IF EXISTS "Admins delete producer avatars" ON storage.objects;
CREATE POLICY "Admins delete producer avatars" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'producer-avatars'::text) AND has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins delete release-audio" ON storage.objects;
CREATE POLICY "Admins delete release-audio" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'release-audio'::text) AND private.is_admin_active(auth.uid())));
DROP POLICY IF EXISTS "Admins delete release-covers" ON storage.objects;
CREATE POLICY "Admins delete release-covers" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'release-covers'::text) AND private.is_admin_active(auth.uid())));
DROP POLICY IF EXISTS "Admins delete release-photos" ON storage.objects;
CREATE POLICY "Admins delete release-photos" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'release-photos'::text) AND private.is_admin_active(auth.uid())));
DROP POLICY IF EXISTS "Admins insert release-audio" ON storage.objects;
CREATE POLICY "Admins insert release-audio" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'release-audio'::text) AND private.is_admin_active(auth.uid())));
DROP POLICY IF EXISTS "Admins insert release-covers" ON storage.objects;
CREATE POLICY "Admins insert release-covers" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'release-covers'::text) AND private.is_admin_active(auth.uid())));
DROP POLICY IF EXISTS "Admins insert release-photos" ON storage.objects;
CREATE POLICY "Admins insert release-photos" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'release-photos'::text) AND private.is_admin_active(auth.uid())));
DROP POLICY IF EXISTS "Admins manage beat-covers" ON storage.objects;
CREATE POLICY "Admins manage beat-covers" ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING (((bucket_id = 'beat-covers'::text) AND has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((bucket_id = 'beat-covers'::text) AND has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins manage beat-previews" ON storage.objects;
CREATE POLICY "Admins manage beat-previews" ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING (((bucket_id = 'beat-previews'::text) AND has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((bucket_id = 'beat-previews'::text) AND has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins read producer avatars" ON storage.objects;
CREATE POLICY "Admins read producer avatars" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'producer-avatars'::text) AND has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins read release-audio" ON storage.objects;
CREATE POLICY "Admins read release-audio" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'release-audio'::text) AND private.is_admin_active(auth.uid())));
DROP POLICY IF EXISTS "Admins read release-covers" ON storage.objects;
CREATE POLICY "Admins read release-covers" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'release-covers'::text) AND private.is_admin_active(auth.uid())));
DROP POLICY IF EXISTS "Admins read release-photos" ON storage.objects;
CREATE POLICY "Admins read release-photos" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'release-photos'::text) AND private.is_admin_active(auth.uid())));
DROP POLICY IF EXISTS "Admins update producer avatars" ON storage.objects;
CREATE POLICY "Admins update producer avatars" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'producer-avatars'::text) AND has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((bucket_id = 'producer-avatars'::text) AND has_role(auth.uid(), 'admin'::app_role)));
DROP POLICY IF EXISTS "Admins update release-audio" ON storage.objects;
CREATE POLICY "Admins update release-audio" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'release-audio'::text) AND private.is_admin_active(auth.uid())))
  WITH CHECK (((bucket_id = 'release-audio'::text) AND private.is_admin_active(auth.uid())));
DROP POLICY IF EXISTS "Admins update release-covers" ON storage.objects;
CREATE POLICY "Admins update release-covers" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'release-covers'::text) AND private.is_admin_active(auth.uid())))
  WITH CHECK (((bucket_id = 'release-covers'::text) AND private.is_admin_active(auth.uid())));
DROP POLICY IF EXISTS "Admins update release-photos" ON storage.objects;
CREATE POLICY "Admins update release-photos" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'release-photos'::text) AND private.is_admin_active(auth.uid())))
  WITH CHECK (((bucket_id = 'release-photos'::text) AND private.is_admin_active(auth.uid())));
DROP POLICY IF EXISTS "Admins upload producer avatars" ON storage.objects;
CREATE POLICY "Admins upload producer avatars" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'producer-avatars'::text) AND has_role(auth.uid(), 'admin'::app_role)));
