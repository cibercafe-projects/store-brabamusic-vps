
-- Add is_super and active columns to user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS is_super boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Helper: is the user an active admin (regular or super)
CREATE OR REPLACE FUNCTION public.is_admin_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND active = true
  )
$$;

-- Helper: is the user an active super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND is_super = true
      AND active = true
  )
$$;

-- Update has_role to respect active flag (keeps backwards compatibility)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND active = true
  )
$$;

-- Promote the first admin to super_admin (technical owner)
UPDATE public.user_roles
   SET is_super = true
 WHERE id = (
   SELECT id FROM public.user_roles
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1
 );

-- Allow super_admins to manage user_roles via RLS (server still uses service role)
DROP POLICY IF EXISTS "Super admins manage user_roles" ON public.user_roles;
CREATE POLICY "Super admins manage user_roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Trigger: protect super admin from being removed, deactivated or demoted
CREATE OR REPLACE FUNCTION public.protect_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_super = true THEN
      RAISE EXCEPTION 'Super admin não pode ser removido';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_super = true AND NEW.is_super = false THEN
      RAISE EXCEPTION 'Super admin não pode perder o privilégio';
    END IF;
    IF OLD.is_super = true AND NEW.active = false THEN
      RAISE EXCEPTION 'Super admin não pode ser desativado';
    END IF;
    IF OLD.is_super = true AND NEW.role <> OLD.role THEN
      RAISE EXCEPTION 'Super admin não pode ter o papel alterado';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_super_admin ON public.user_roles;
CREATE TRIGGER trg_protect_super_admin
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin();
