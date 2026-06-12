
-- Storage policies for release buckets: only active admins can access via Storage API.
-- Public submissions and admin downloads continue to work via service_role + signed URLs.

DO $$
DECLARE
  b text;
BEGIN
  FOREACH b IN ARRAY ARRAY['release-covers','release-audio','release-photos'] LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Admins read %1$s" ON storage.objects;
      CREATE POLICY "Admins read %1$s"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = %1$L AND public.is_admin_active(auth.uid()));

      DROP POLICY IF EXISTS "Admins insert %1$s" ON storage.objects;
      CREATE POLICY "Admins insert %1$s"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = %1$L AND public.is_admin_active(auth.uid()));

      DROP POLICY IF EXISTS "Admins update %1$s" ON storage.objects;
      CREATE POLICY "Admins update %1$s"
        ON storage.objects FOR UPDATE
        TO authenticated
        USING (bucket_id = %1$L AND public.is_admin_active(auth.uid()))
        WITH CHECK (bucket_id = %1$L AND public.is_admin_active(auth.uid()));

      DROP POLICY IF EXISTS "Admins delete %1$s" ON storage.objects;
      CREATE POLICY "Admins delete %1$s"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = %1$L AND public.is_admin_active(auth.uid()));
    $f$, b);
  END LOOP;
END $$;
