-- Função RPC para listar e-mails de admins ativos (usada pelo script
-- scripts/send-admin-orientacoes.ts). SECURITY DEFINER porque PostgREST só
-- expõe o schema public.

CREATE OR REPLACE FUNCTION public.list_admin_emails()
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ur.user_id, au.email::text
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  WHERE ur.active = true
    AND ur.role = 'admin';
$$;

REVOKE ALL ON FUNCTION public.list_admin_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_admin_emails() TO service_role;
