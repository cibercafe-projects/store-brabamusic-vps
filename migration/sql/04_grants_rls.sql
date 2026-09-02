-- Braba Beats — export de migração
-- Gerado automaticamente. Não editar à mão.

-- 04_grants_rls.sql — privilégios da Data API, RLS e policies

-- Privilégios de tabela

-- Privilégios de função
GRANT EXECUTE ON FUNCTION public.delete_email(queue_name text, message_id bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_wake() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(queue_name text, payload jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_beat_reservations() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_beat_plays(_beat_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.protect_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.protect_super_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;

-- RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beat_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_promo_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins ativos gerenciam configurações" ON public.app_settings;
CREATE POLICY "Admins ativos gerenciam configurações" ON public.app_settings AS PERMISSIVE FOR ALL TO authenticated
  USING (private.is_admin_active(auth.uid()))
  WITH CHECK (private.is_admin_active(auth.uid()));
DROP POLICY IF EXISTS "Admins manage beat_types" ON public.beat_types;
CREATE POLICY "Admins manage beat_types" ON public.beat_types AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can delete beats" ON public.beats;
CREATE POLICY "Admins can delete beats" ON public.beats AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can insert beats" ON public.beats;
CREATE POLICY "Admins can insert beats" ON public.beats AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can update beats" ON public.beats;
CREATE POLICY "Admins can update beats" ON public.beats AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can view beats" ON public.beats;
CREATE POLICY "Admins can view beats" ON public.beats AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Service role can insert send log" ON public.email_send_log;
CREATE POLICY "Service role can insert send log" ON public.email_send_log AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can read send log" ON public.email_send_log;
CREATE POLICY "Service role can read send log" ON public.email_send_log AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can update send log" ON public.email_send_log;
CREATE POLICY "Service role can update send log" ON public.email_send_log AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can manage send state" ON public.email_send_state;
CREATE POLICY "Service role can manage send state" ON public.email_send_state AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can insert tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can insert tokens" ON public.email_unsubscribe_tokens AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can mark tokens as used" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can mark tokens as used" ON public.email_unsubscribe_tokens AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can read tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can read tokens" ON public.email_unsubscribe_tokens AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Admins can update feedback" ON public.feedback;
CREATE POLICY "Admins can update feedback" ON public.feedback AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can view feedback" ON public.feedback;
CREATE POLICY "Admins can view feedback" ON public.feedback AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback" ON public.feedback AS PERMISSIVE FOR INSERT TO anon, authenticated
  WITH CHECK (((status = 'novo'::feedback_status) AND (internal_notes IS NULL) AND ((char_length(message) >= 3) AND (char_length(message) <= 4000))));
DROP POLICY IF EXISTS "Admins ativos gerenciam leads" ON public.leads;
CREATE POLICY "Admins ativos gerenciam leads" ON public.leads AS PERMISSIVE FOR ALL TO authenticated
  USING (private.is_admin_active(auth.uid()))
  WITH CHECK (private.is_admin_active(auth.uid()));
DROP POLICY IF EXISTS "Admins can insert producers" ON public.producers;
CREATE POLICY "Admins can insert producers" ON public.producers AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can update producers" ON public.producers;
CREATE POLICY "Admins can update producers" ON public.producers AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can view producers" ON public.producers;
CREATE POLICY "Admins can view producers" ON public.producers AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins manage purchase_deliveries" ON public.purchase_deliveries;
CREATE POLICY "Admins manage purchase_deliveries" ON public.purchase_deliveries AS PERMISSIVE FOR ALL TO authenticated
  USING (private.is_admin_active(auth.uid()))
  WITH CHECK (private.is_admin_active(auth.uid()));
DROP POLICY IF EXISTS "Admins manage purchase_requests" ON public.purchase_requests;
CREATE POLICY "Admins manage purchase_requests" ON public.purchase_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (private.is_admin_active(auth.uid()))
  WITH CHECK (private.is_admin_active(auth.uid()));
DROP POLICY IF EXISTS "Admins gerenciam audio releases" ON public.release_audio_files;
CREATE POLICY "Admins gerenciam audio releases" ON public.release_audio_files AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins gerenciam fotos releases" ON public.release_promo_photos;
CREATE POLICY "Admins gerenciam fotos releases" ON public.release_promo_photos AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins gerenciam releases" ON public.releases;
CREATE POLICY "Admins gerenciam releases" ON public.releases AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Service role can insert suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can insert suppressed emails" ON public.suppressed_emails AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Service role can read suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can read suppressed emails" ON public.suppressed_emails AS PERMISSIVE FOR SELECT TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Super admins manage user_roles" ON public.user_roles;
CREATE POLICY "Super admins manage user_roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));
