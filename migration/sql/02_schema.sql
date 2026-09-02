-- Braba Beats — export de migração
-- Gerado automaticamente. Não editar à mão.

-- 02_schema.sql — tipos, tabelas, chaves e índices

SET search_path = public;

-- ============ ENUMS ============
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.beat_status AS ENUM ('rascunho', 'ativo', 'vendido', 'reservado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.beat_tipo AS ENUM ('fechado', 'aberto'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.feedback_area AS ENUM ('catalogo', 'compra', 'pagamento', 'comprovante', 'entrega', 'lancamentos', 'backoffice', 'outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.feedback_origin AS ENUM ('geral', 'pos_compra', 'pos_lancamento'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.feedback_status AS ENUM ('novo', 'em_analise', 'respondido', 'resolvido', 'arquivado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.feedback_type AS ENUM ('sugestao', 'problema', 'duvida', 'suporte', 'elogio'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.lead_status AS ENUM ('novo', 'contatado', 'negociacao', 'pago', 'entregue', 'perdido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.producer_status AS ENUM ('ativa', 'inativa'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.purchase_payment_method AS ENUM ('pix', 'link'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.purchase_status AS ENUM ('aguardando_pagamento', 'comprovante_recebido', 'pagamento_confirmado', 'arquivos_enviados', 'cancelado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.release_audio_format AS ENUM ('wav', 'mp3'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.release_status AS ENUM ('recebido', 'em_analise', 'aprovado', 'distribuido'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.release_type AS ENUM ('single', 'ep', 'album'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ TABELAS ============

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text NOT NULL,
  value text,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.beat_types (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  slug text NOT NULL,
  descricao text DEFAULT ''::text NOT NULL,
  valor_padrao numeric(10,2) DEFAULT 0 NOT NULL,
  link_pagamento text DEFAULT ''::text NOT NULL,
  inclui_stems boolean DEFAULT false NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  ordem integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.beats (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  produtora_id uuid NOT NULL,
  nome text NOT NULL,
  slug text NOT NULL,
  genero text,
  bpm integer,
  tom text,
  mood text,
  preco numeric(10,2),
  descricao text,
  status beat_status DEFAULT 'rascunho'::beat_status NOT NULL,
  capa_url text,
  preview_url text,
  wav_url text,
  stems_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  capa_path text,
  preview_path text,
  plays_count integer DEFAULT 0 NOT NULL,
  wav_path text,
  stems_path text,
  license_path text,
  tipo beat_tipo DEFAULT 'fechado'::beat_tipo NOT NULL,
  beat_type_id uuid,
  reserved_at timestamp with time zone,
  reservation_expires_at timestamp with time zone,
  reserved_purchase_id uuid
);

CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  message_id text,
  template_name text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL,
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.email_send_state (
  id integer DEFAULT 1 NOT NULL,
  retry_after_until timestamp with time zone,
  batch_size integer DEFAULT 10 NOT NULL,
  send_delay_ms integer DEFAULT 200 NOT NULL,
  auth_email_ttl_minutes integer DEFAULT 15 NOT NULL,
  transactional_email_ttl_minutes integer DEFAULT 60 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  token text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  used_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  rating smallint,
  type feedback_type NOT NULL,
  area feedback_area,
  message text NOT NULL,
  wants_reply boolean DEFAULT false NOT NULL,
  contact_name text,
  contact_email text,
  contact_whatsapp text,
  purchase_request_id uuid,
  release_id uuid,
  origin feedback_origin DEFAULT 'geral'::feedback_origin NOT NULL,
  status feedback_status DEFAULT 'novo'::feedback_status NOT NULL,
  internal_notes text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  beat_id uuid NOT NULL,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL,
  instagram text,
  mensagem text,
  status lead_status DEFAULT 'novo'::lead_status NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.producers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  nome_artistico text NOT NULL,
  instagram text,
  spotify text,
  cidade text,
  bio text,
  foto_perfil_url text,
  foto_perfil_path text,
  status producer_status DEFAULT 'ativa'::producer_status NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  nome_civil text,
  cpf text,
  nome_artistico_creditos text,
  email_comercial text,
  email_royalties text,
  texto_creditos text,
  texto_registro text,
  texto_royalties text
);

CREATE TABLE IF NOT EXISTS public.purchase_deliveries (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  purchase_id uuid NOT NULL,
  enviado_email boolean DEFAULT false NOT NULL,
  enviado_whatsapp boolean DEFAULT false NOT NULL,
  arquivos jsonb DEFAULT '[]'::jsonb NOT NULL,
  enviado_em timestamp with time zone DEFAULT now() NOT NULL,
  enviado_por uuid,
  observacao text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  tipo text DEFAULT 'entrega_arquivos'::text NOT NULL,
  recipient_email text,
  recipient_whatsapp text
);

CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  beat_id uuid NOT NULL,
  nome_cliente text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  instagram text,
  forma_pagamento purchase_payment_method NOT NULL,
  termos_aceitos boolean DEFAULT false NOT NULL,
  valor numeric(10,2),
  status purchase_status DEFAULT 'aguardando_pagamento'::purchase_status NOT NULL,
  receipt_path text,
  receipt_uploaded_at timestamp with time zone,
  continuation_token uuid DEFAULT gen_random_uuid() NOT NULL,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  delivered_at timestamp with time zone,
  nome_artistico text,
  license_accepted boolean,
  license_accepted_at timestamp with time zone,
  license_version text,
  license_snapshot jsonb,
  archived_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.release_audio_files (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  release_id uuid NOT NULL,
  path text NOT NULL,
  original_name text NOT NULL,
  size_bytes bigint NOT NULL,
  format release_audio_format NOT NULL,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.release_promo_photos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  release_id uuid NOT NULL,
  path text NOT NULL,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.releases (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  cpf text NOT NULL,
  artist_name text NOT NULL,
  release_type release_type NOT NULL,
  release_name text NOT NULL,
  lyrics text,
  isrc text,
  cover_path text,
  genres text[] DEFAULT '{}'::text[] NOT NULL,
  moods text[] DEFAULT '{}'::text[] NOT NULL,
  instruments text[] DEFAULT '{}'::text[] NOT NULL,
  technical_sheet text NOT NULL,
  royalties text NOT NULL,
  about_artist text NOT NULL,
  about_release text NOT NULL,
  has_videoclip boolean DEFAULT false NOT NULL,
  status release_status DEFAULT 'recebido'::release_status NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  audio_drive_url text,
  tracklist text,
  cover_drive_url text,
  photos_drive_url text,
  lyrics_drive_url text,
  whatsapp text DEFAULT ''::text NOT NULL,
  faixa_foco text,
  suggested_release_date date,
  ai_on_cover boolean DEFAULT false NOT NULL,
  ai_on_music boolean DEFAULT false NOT NULL,
  ai_music_details text
);

CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  reason text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  is_super boolean DEFAULT false NOT NULL,
  active boolean DEFAULT true NOT NULL
);

-- ============ CHAVES PRIMÁRIAS / UNIQUE / CHECK ============
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);
ALTER TABLE public.beat_types ADD CONSTRAINT beat_types_pkey PRIMARY KEY (id);
ALTER TABLE public.beats ADD CONSTRAINT beats_pkey PRIMARY KEY (id);
ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_pkey PRIMARY KEY (id);
ALTER TABLE public.email_send_state ADD CONSTRAINT email_send_state_pkey PRIMARY KEY (id);
ALTER TABLE public.email_unsubscribe_tokens ADD CONSTRAINT email_unsubscribe_tokens_pkey PRIMARY KEY (id);
ALTER TABLE public.feedback ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.leads ADD CONSTRAINT leads_pkey PRIMARY KEY (id);
ALTER TABLE public.producers ADD CONSTRAINT producers_pkey PRIMARY KEY (id);
ALTER TABLE public.purchase_deliveries ADD CONSTRAINT purchase_deliveries_pkey PRIMARY KEY (id);
ALTER TABLE public.purchase_requests ADD CONSTRAINT purchase_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.release_audio_files ADD CONSTRAINT release_audio_files_pkey PRIMARY KEY (id);
ALTER TABLE public.release_promo_photos ADD CONSTRAINT release_promo_photos_pkey PRIMARY KEY (id);
ALTER TABLE public.releases ADD CONSTRAINT releases_pkey PRIMARY KEY (id);
ALTER TABLE public.suppressed_emails ADD CONSTRAINT suppressed_emails_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.beat_types ADD CONSTRAINT beat_types_slug_key UNIQUE (slug);
ALTER TABLE public.beats ADD CONSTRAINT beats_slug_key UNIQUE (slug);
ALTER TABLE public.email_unsubscribe_tokens ADD CONSTRAINT email_unsubscribe_tokens_email_key UNIQUE (email);
ALTER TABLE public.email_unsubscribe_tokens ADD CONSTRAINT email_unsubscribe_tokens_token_key UNIQUE (token);
ALTER TABLE public.producers ADD CONSTRAINT producers_slug_key UNIQUE (slug);
ALTER TABLE public.purchase_requests ADD CONSTRAINT purchase_requests_continuation_token_key UNIQUE (continuation_token);
ALTER TABLE public.suppressed_emails ADD CONSTRAINT suppressed_emails_email_key UNIQUE (email);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.beats ADD CONSTRAINT beats_bpm_range CHECK (((bpm IS NULL) OR ((bpm >= 40) AND (bpm <= 300))));
ALTER TABLE public.beats ADD CONSTRAINT beats_preco_nonneg CHECK (((preco IS NULL) OR (preco >= (0)::numeric)));
ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'suppressed'::text, 'failed'::text, 'bounced'::text, 'complained'::text, 'dlq'::text])));
ALTER TABLE public.email_send_state ADD CONSTRAINT email_send_state_id_check CHECK ((id = 1));
ALTER TABLE public.feedback ADD CONSTRAINT feedback_rating_check CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 5))));
ALTER TABLE public.suppressed_emails ADD CONSTRAINT suppressed_emails_reason_check CHECK ((reason = ANY (ARRAY['unsubscribe'::text, 'bounce'::text, 'complaint'::text])));

-- ============ CHAVES ESTRANGEIRAS ============
ALTER TABLE public.beats ADD CONSTRAINT beats_beat_type_id_fkey FOREIGN KEY (beat_type_id) REFERENCES beat_types(id) ON DELETE RESTRICT;
ALTER TABLE public.beats ADD CONSTRAINT beats_produtora_id_fkey FOREIGN KEY (produtora_id) REFERENCES producers(id) ON DELETE RESTRICT;
ALTER TABLE public.beats ADD CONSTRAINT beats_reserved_purchase_id_fkey FOREIGN KEY (reserved_purchase_id) REFERENCES purchase_requests(id) ON DELETE SET NULL;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_purchase_request_id_fkey FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE SET NULL;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_release_id_fkey FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD CONSTRAINT leads_beat_id_fkey FOREIGN KEY (beat_id) REFERENCES beats(id) ON DELETE CASCADE;
ALTER TABLE public.purchase_deliveries ADD CONSTRAINT purchase_deliveries_enviado_por_fkey FOREIGN KEY (enviado_por) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_deliveries ADD CONSTRAINT purchase_deliveries_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES purchase_requests(id) ON DELETE CASCADE;
ALTER TABLE public.purchase_requests ADD CONSTRAINT purchase_requests_beat_id_fkey FOREIGN KEY (beat_id) REFERENCES beats(id) ON DELETE RESTRICT;
ALTER TABLE public.release_audio_files ADD CONSTRAINT release_audio_files_release_id_fkey FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE;
ALTER TABLE public.release_promo_photos ADD CONSTRAINT release_promo_photos_release_id_fkey FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============ ÍNDICES ============
CREATE INDEX IF NOT EXISTS beats_beat_type_id_idx ON public.beats USING btree (beat_type_id);
CREATE INDEX IF NOT EXISTS beats_created_at_idx ON public.beats USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS beats_nome_idx ON public.beats USING btree (nome);
CREATE INDEX IF NOT EXISTS beats_produtora_id_idx ON public.beats USING btree (produtora_id);
CREATE INDEX IF NOT EXISTS beats_status_expires_idx ON public.beats USING btree (status, reservation_expires_at);
CREATE INDEX IF NOT EXISTS beats_status_idx ON public.beats USING btree (status);
CREATE INDEX IF NOT EXISTS beats_tipo_idx ON public.beats USING btree (tipo);
CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log USING btree (message_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique ON public.email_send_log USING btree (message_id) WHERE (status = 'sent'::text);
CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log USING btree (recipient_email);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens USING btree (token);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback USING btree (status);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback USING btree (type);
CREATE INDEX IF NOT EXISTS leads_beat_id_idx ON public.leads USING btree (beat_id);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads USING btree (status);
CREATE INDEX IF NOT EXISTS producers_nome_artistico_idx ON public.producers USING btree (nome_artistico);
CREATE INDEX IF NOT EXISTS producers_status_idx ON public.producers USING btree (status);
CREATE INDEX IF NOT EXISTS purchase_deliveries_enviado_em_idx ON public.purchase_deliveries USING btree (enviado_em DESC);
CREATE INDEX IF NOT EXISTS purchase_deliveries_purchase_idx ON public.purchase_deliveries USING btree (purchase_id);
CREATE INDEX IF NOT EXISTS purchase_deliveries_tipo_idx ON public.purchase_deliveries USING btree (purchase_id, tipo);
CREATE INDEX IF NOT EXISTS purchase_requests_archived_at_idx ON public.purchase_requests USING btree (archived_at) WHERE (archived_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS purchase_requests_beat_id_idx ON public.purchase_requests USING btree (beat_id);
CREATE INDEX IF NOT EXISTS purchase_requests_created_at_idx ON public.purchase_requests USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS purchase_requests_status_idx ON public.purchase_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_release_audio_release ON public.release_audio_files USING btree (release_id);
CREATE INDEX IF NOT EXISTS idx_release_photos_release ON public.release_promo_photos USING btree (release_id);
CREATE INDEX IF NOT EXISTS idx_releases_created_at ON public.releases USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_releases_status ON public.releases USING btree (status);
CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails USING btree (email);
