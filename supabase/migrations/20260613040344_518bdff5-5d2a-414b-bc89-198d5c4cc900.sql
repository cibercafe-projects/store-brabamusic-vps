
-- 1) Pin search_path on SECURITY DEFINER email queue helpers and lock down EXECUTE
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- Also lock down trigger/utility SECURITY DEFINER-ish helpers from anon EXECUTE
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.protect_super_admin() FROM PUBLIC, anon;

-- 2) Admin-only RLS policies for purchase_requests and purchase_deliveries.
-- All app access goes through server functions using the service_role, which bypasses RLS.
-- These policies ensure no anon/authenticated user can reach the data directly via the Data API.
CREATE POLICY "Admins manage purchase_requests"
  ON public.purchase_requests
  FOR ALL
  TO authenticated
  USING (public.is_admin_active(auth.uid()))
  WITH CHECK (public.is_admin_active(auth.uid()));

CREATE POLICY "Admins manage purchase_deliveries"
  ON public.purchase_deliveries
  FOR ALL
  TO authenticated
  USING (public.is_admin_active(auth.uid()))
  WITH CHECK (public.is_admin_active(auth.uid()));
