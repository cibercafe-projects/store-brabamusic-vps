
CREATE TYPE public.feedback_type AS ENUM ('sugestao','problema','duvida','suporte','elogio');
CREATE TYPE public.feedback_area AS ENUM ('catalogo','compra','pagamento','comprovante','entrega','lancamentos','backoffice','outro');
CREATE TYPE public.feedback_origin AS ENUM ('geral','pos_compra','pos_lancamento');
CREATE TYPE public.feedback_status AS ENUM ('novo','em_analise','respondido','resolvido','arquivado');

CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating SMALLINT CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  type public.feedback_type NOT NULL,
  area public.feedback_area,
  message TEXT NOT NULL,
  wants_reply BOOLEAN NOT NULL DEFAULT false,
  contact_name TEXT,
  contact_email TEXT,
  contact_whatsapp TEXT,
  purchase_request_id UUID REFERENCES public.purchase_requests(id) ON DELETE SET NULL,
  release_id UUID REFERENCES public.releases(id) ON DELETE SET NULL,
  origin public.feedback_origin NOT NULL DEFAULT 'geral',
  status public.feedback_status NOT NULL DEFAULT 'novo',
  internal_notes TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_created_at ON public.feedback (created_at DESC);
CREATE INDEX idx_feedback_status ON public.feedback (status);
CREATE INDEX idx_feedback_type ON public.feedback (type);

GRANT INSERT ON public.feedback TO anon, authenticated;
GRANT SELECT, UPDATE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'novo'
    AND internal_notes IS NULL
    AND char_length(message) BETWEEN 3 AND 4000
  );

CREATE POLICY "Admins can view feedback"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update feedback"
  ON public.feedback FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
