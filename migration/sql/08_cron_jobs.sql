-- Braba Beats — export de migração
-- 08_cron_jobs.sql — agendamentos pg_cron
--
-- Rodar como superusuário, DEPOIS de 03_functions_triggers.sql.
-- Requer a extensão pg_cron instalada (ver 01_extensions.sql).

-- 1) Expiração automática das reservas de beats exclusivos (a cada 5 minutos).
--    Libera beats com status 'reservado' cuja reserva já venceu.
SELECT cron.unschedule('expire-beat-reservations')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-beat-reservations');

SELECT cron.schedule(
  'expire-beat-reservations',
  '*/5 * * * *',
  $$ SELECT public.expire_beat_reservations(); $$
);

-- 2) Processamento da fila de e-mails.
--    NÃO precisa ser criado manualmente: a função public.email_queue_wake()
--    agenda o job 'process-email-queue' (a cada 5 segundos) no primeiro enfileiramento
--    e a public.email_queue_dispatch() o remove quando as filas esvaziam.
--    A linha abaixo só é útil se você quiser deixá-lo armado desde o início:
--
-- SELECT cron.schedule(
--   'process-email-queue',
--   '5 seconds',
--   $$ SELECT public.email_queue_dispatch(); $$
-- );

-- Conferência
-- SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;
