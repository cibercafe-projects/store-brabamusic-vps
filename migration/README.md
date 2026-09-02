# Migração completa — Braba Beats

Pacote versionado com **tudo que é necessário** para recriar o sistema em outro ambiente
(Supabase externo ou Supabase self-hosted num VPS).

Requisitos de infraestrutura do VPS: ver [`docs/migracao-vps.md`](../docs/migracao-vps.md).
Passos que não dá para automatizar: ver [`MANUAL_STEPS.md`](./MANUAL_STEPS.md).

---

## Conteúdo

```text
migration/
  README.md                     este guia
  MANUAL_STEPS.md               usuários admin, Google OAuth, SMTP, DNS/TLS, build
  sql/
    01_extensions.sql           extensões Postgres exigidas
    02_schema.sql               14 ENUMs, 16 tabelas, PKs, FKs, índices
    03_functions_triggers.sql   11 funções + triggers
    04_grants_rls.sql           GRANTs da Data API, RLS e todas as policies
    05_data.sql                 dados atuais (ordem pai-primeiro)
    06_storage_buckets.sql      os 10 buckets privados
    07_storage_policies.sql     policies de storage.objects
    08_cron_jobs.sql            agendamentos pg_cron
    09_post_migration.sql       filas pgmq, vault, URLs de webhook, sanidade
  scripts/
    export-database.py          regera 01–07 a partir do banco atual
    migrate-storage.ts          copia os arquivos dos buckets (retomável)
    verify-migration.ts         compara origem x destino
  env/.env.example              todas as variáveis necessárias
```

Os arquivos SQL são **gerados** — não edite à mão. Para atualizar, rode o exportador.

---

## Ordem de execução

Conectado ao banco de **destino**, como superusuário (`postgres`):

```bash
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f migration/sql/01_extensions.sql
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f migration/sql/02_schema.sql
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f migration/sql/03_functions_triggers.sql
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f migration/sql/04_grants_rls.sql
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f migration/sql/05_data.sql
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f migration/sql/06_storage_buckets.sql
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f migration/sql/07_storage_policies.sql
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f migration/sql/08_cron_jobs.sql
# 09 exige edição manual antes de rodar
```

Depois, os arquivos:

```bash
cp migration/env/.env.example .env.migration   # preencher
set -a && source .env.migration && set +a
bun add @supabase/supabase-js
bun migration/scripts/migrate-storage.ts
bun migration/scripts/verify-migration.ts
```

Por fim, siga `MANUAL_STEPS.md` (admins, Google, SMTP, build Node, DNS).

---

## Detalhes importantes

**Dados.** `05_data.sql` usa `session_replication_role = replica` para ignorar a ordem das FKs
durante a carga e restaura `origin` no final. Todos os `INSERT` usam `ON CONFLICT DO NOTHING`,
então o script pode ser rodado de novo com segurança.

**Storage.** Os 10 buckets são **privados**; o app serve tudo por signed URL. O caminho de cada
objeto está gravado nas tabelas (`capa_path`, `preview_path`, `wav_path`, `stems_path`,
`license_path`, `receipt_path`, `foto_perfil_path`, `release_*`), por isso o script preserva o
path exatamente. Se um path mudar, o arquivo deixa de ser encontrado.

**Fila de e-mails.** Depende de `pgmq` + `pg_cron` + `pg_net` + `vault`. As funções
`email_queue_dispatch()` e `email_queue_wake()` contêm a URL do endpoint de processamento
(`/lovable/email/queue/process`) — precisa ser trocada para o novo domínio.

**Reservas de beats.** `expire_beat_reservations()` roda a cada 5 minutos via `pg_cron`;
sem esse job, beats exclusivos ficam presos no status `reservado`.

**Autenticação.** Nada do schema `auth` é exportado. Ver `MANUAL_STEPS.md`.

**Segredos.** Nenhuma chave entra no repositório — só nomes, em `env/.env.example`.

---

## Regerar os scripts

O exportador roda contra o banco atual usando `psql` (somente leitura) e reescreve
`sql/01`–`sql/07`. Os arquivos `08` e `09` são mantidos à mão.

```bash
python3 migration/scripts/export-database.py
```

Requer as variáveis `PG*` apontando para o banco de origem. Rode sempre antes de uma
migração real, para que os dados e o schema estejam atualizados.
