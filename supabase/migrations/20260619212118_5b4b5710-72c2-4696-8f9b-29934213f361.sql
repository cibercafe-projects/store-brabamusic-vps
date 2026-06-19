
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.is_admin_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND active = true
  )
$$;
REVOKE ALL ON FUNCTION private.is_admin_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin_active(uuid) TO postgres, service_role;

CREATE OR REPLACE FUNCTION private.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND is_super = true
      AND active = true
  )
$$;
REVOKE ALL ON FUNCTION private.is_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_super_admin(uuid) TO postgres, service_role;

-- Public table policies
DROP POLICY IF EXISTS "Admins ativos gerenciam configurações" ON public.app_settings;
CREATE POLICY "Admins ativos gerenciam configurações" ON public.app_settings
  FOR ALL TO authenticated
  USING (private.is_admin_active(auth.uid()))
  WITH CHECK (private.is_admin_active(auth.uid()));

DROP POLICY IF EXISTS "Admins ativos gerenciam leads" ON public.leads;
CREATE POLICY "Admins ativos gerenciam leads" ON public.leads
  FOR ALL TO authenticated
  USING (private.is_admin_active(auth.uid()))
  WITH CHECK (private.is_admin_active(auth.uid()));

DROP POLICY IF EXISTS "Admins manage purchase_deliveries" ON public.purchase_deliveries;
CREATE POLICY "Admins manage purchase_deliveries" ON public.purchase_deliveries
  FOR ALL TO authenticated
  USING (private.is_admin_active(auth.uid()))
  WITH CHECK (private.is_admin_active(auth.uid()));

DROP POLICY IF EXISTS "Admins manage purchase_requests" ON public.purchase_requests;
CREATE POLICY "Admins manage purchase_requests" ON public.purchase_requests
  FOR ALL TO authenticated
  USING (private.is_admin_active(auth.uid()))
  WITH CHECK (private.is_admin_active(auth.uid()));

DROP POLICY IF EXISTS "Super admins manage user_roles" ON public.user_roles;
CREATE POLICY "Super admins manage user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_super_admin(auth.uid()));

-- Storage policies that referenced public.is_admin_active
DROP POLICY IF EXISTS "Admins read release-covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins insert release-covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins update release-covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete release-covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins read release-audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins insert release-audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins update release-audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete release-audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins read release-photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins insert release-photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins update release-photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete release-photos" ON storage.objects;

CREATE POLICY "Admins read release-covers" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'release-covers' AND private.is_admin_active(auth.uid()));
CREATE POLICY "Admins insert release-covers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'release-covers' AND private.is_admin_active(auth.uid()));
CREATE POLICY "Admins update release-covers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'release-covers' AND private.is_admin_active(auth.uid()))
  WITH CHECK (bucket_id = 'release-covers' AND private.is_admin_active(auth.uid()));
CREATE POLICY "Admins delete release-covers" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'release-covers' AND private.is_admin_active(auth.uid()));

CREATE POLICY "Admins read release-audio" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'release-audio' AND private.is_admin_active(auth.uid()));
CREATE POLICY "Admins insert release-audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'release-audio' AND private.is_admin_active(auth.uid()));
CREATE POLICY "Admins update release-audio" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'release-audio' AND private.is_admin_active(auth.uid()))
  WITH CHECK (bucket_id = 'release-audio' AND private.is_admin_active(auth.uid()));
CREATE POLICY "Admins delete release-audio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'release-audio' AND private.is_admin_active(auth.uid()));

CREATE POLICY "Admins read release-photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'release-photos' AND private.is_admin_active(auth.uid()));
CREATE POLICY "Admins insert release-photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'release-photos' AND private.is_admin_active(auth.uid()));
CREATE POLICY "Admins update release-photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'release-photos' AND private.is_admin_active(auth.uid()))
  WITH CHECK (bucket_id = 'release-photos' AND private.is_admin_active(auth.uid()));
CREATE POLICY "Admins delete release-photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'release-photos' AND private.is_admin_active(auth.uid()));

DROP FUNCTION IF EXISTS public.is_admin_active(uuid);
DROP FUNCTION IF EXISTS public.is_super_admin(uuid);
