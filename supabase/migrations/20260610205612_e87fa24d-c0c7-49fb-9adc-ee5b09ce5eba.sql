-- Enum de status do lead
CREATE TYPE public.lead_status AS ENUM ('novo','contatado','negociacao','pago','entregue','perdido');

-- Tabela de leads
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL,
  instagram text,
  mensagem text,
  status public.lead_status NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX leads_beat_id_idx ON public.leads(beat_id);
CREATE INDEX leads_status_idx ON public.leads(status);
CREATE INDEX leads_created_at_idx ON public.leads(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
-- Sem grant para anon: inserções públicas passam pela server fn (service_role).

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins ativos gerenciam leads"
  ON public.leads
  FOR ALL
  TO authenticated
  USING (public.is_admin_active(auth.uid()))
  WITH CHECK (public.is_admin_active(auth.uid()));

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabela singleton-like de configurações
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins ativos gerenciam configurações"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin_active(auth.uid()))
  WITH CHECK (public.is_admin_active(auth.uid()));

CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Valor padrão (placeholder) para o WhatsApp.
INSERT INTO public.app_settings(key, value) VALUES ('whatsapp_number', '') ON CONFLICT DO NOTHING;