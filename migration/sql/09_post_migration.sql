-- Braba Beats — export de migração
-- 09_post_migration.sql — ajustes finais no banco de DESTINO
--
-- Este arquivo NÃO é automático: substitua os valores marcados com <<< >>> antes de rodar.

-- =========================================================
-- 1) Filas pgmq usadas pelo sistema de e-mails
-- =========================================================
SELECT pgmq.create('auth_emails')            WHERE to_regclass('pgmq.q_auth_emails') IS NULL;
SELECT pgmq.create('transactional_emails')   WHERE to_regclass('pgmq.q_transactional_emails') IS NULL;
SELECT pgmq.create('auth_emails_dlq')          WHERE to_regclass('pgmq.q_auth_emails_dlq') IS NULL;
SELECT pgmq.create('transactional_emails_dlq') WHERE to_regclass('pgmq.q_transactional_emails_dlq') IS NULL;

-- =========================================================
-- 2) Segredo do vault usado pelo processador da fila
--    (o valor é a service_role key do NOVO ambiente)
-- =========================================================
SELECT vault.create_secret(
  '<<<SERVICE_ROLE_KEY_DO_NOVO_AMBIENTE>>>',
  'email_queue_service_role_key',
  'Chave usada pelas funções de fila para chamar o endpoint de processamento'
)
WHERE NOT EXISTS (
  SELECT 1 FROM vault.secrets WHERE name = 'email_queue_service_role_key'
);

-- =========================================================
-- 3) URLs de webhook dentro das funções de fila
--    As funções email_queue_dispatch() e email_queue_wake() foram exportadas
--    apontando para o domínio ANTIGO. Atualize as duas para o novo domínio.
-- =========================================================
-- Substitua manualmente em 03_functions_triggers.sql, ou rode:
--
--   SELECT pg_get_functiondef('public.email_queue_dispatch'::regproc);
--   SELECT pg_get_functiondef('public.email_queue_wake'::regproc);
--
-- e recrie as duas funções trocando
--   https://project--<id-antigo>.lovable.app/lovable/email/queue/process
-- por
--   https://<<<SEU_DOMINIO>>>/lovable/email/queue/process
--
-- Conferência rápida das URLs remanescentes:
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%lovable.app%';

-- =========================================================
-- 4) Trigger de wake da fila (recriado por 03, confira que existe)
-- =========================================================
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE NOT tgisinternal AND tgname ILIKE '%email%';

-- =========================================================
-- 5) Sanidade final
-- =========================================================
SELECT 'tabelas' AS item, count(*) FROM pg_tables WHERE schemaname = 'public'
UNION ALL SELECT 'funcoes', count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'
UNION ALL SELECT 'policies', count(*) FROM pg_policies WHERE schemaname = 'public'
UNION ALL SELECT 'buckets', count(*) FROM storage.buckets
UNION ALL SELECT 'enums', count(DISTINCT t.typname) FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public';
