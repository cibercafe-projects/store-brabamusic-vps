# Migração completa — versionar tudo no repositório

O plano de migração existe: `docs/migracao-vps.md` (requisitos de VPS e self-host) e o plano arquivado em `.lovable/plan/`. Os scripts SQL gerados na época estão em `/mnt/documents/migration/` — **fora do repositório**, portanto não vão para o Git e já estão defasados em relação ao banco atual.

Esta etapa coloca tudo dentro do projeto, versionado, e completa o que falta para uma migração de 100%.

## O que será criado

Nova pasta `migration/` na raiz do projeto, versionada pelo Git:

```text
migration/
  README.md                   guia passo a passo da execução
  sql/
    01_extensions.sql         extensões exigidas pelo projeto
    02_schema.sql             14 ENUMs, 16 tabelas, PKs, FKs, índices
    03_functions_triggers.sql 11 funções + triggers (set_updated_at, protect_super_admin, fila de e-mail, reservas)
    04_grants_rls.sql         GRANTs + RLS + todas as policies
    05_data.sql               dados atuais, em ordem pai-primeiro
    06_storage_buckets.sql    os 10 buckets privados
    07_storage_policies.sql   policies de storage.objects
    08_cron_jobs.sql          agendamentos pg_cron (expiração de reservas, fila de e-mails)
    09_post_migration.sql     ajustes finais: URLs de webhook, segredo do vault, sequências
  scripts/
    export-data.ts            regera 05_data.sql a partir do banco atual
    migrate-storage.ts        copia os arquivos dos 10 buckets para o destino
    verify-migration.ts       compara contagem de registros e arquivos origem x destino
  env/
    .env.example              todas as variáveis necessárias (servidor e VITE_)
  MANUAL_STEPS.md             o que não dá para script: usuários admin, Google OAuth, DNS/TLS, SMTP
```

## Escopo de cada parte

**Banco de dados.** Os scripts são regerados agora, refletindo o estado atual (inclui `beat_types`, `feedback`, campos de reserva em `beats`, `archived_at` em `purchase_requests`, `license_snapshot`). Ordem de execução documentada e idempotente onde possível.

**Storage.** Os 10 buckets são privados e os caminhos precisam ser preservados exatamente (as signed URLs dependem do path). O script de migração lista, baixa e reenvia preservando path, com log e retomada em caso de falha.

**Autenticação.** Usuários de `auth.users` não são exportáveis com senha. `MANUAL_STEPS.md` descreve recriar os admins mantendo o mesmo `user_id` para que `public.user_roles` continue válido, incluindo o super admin protegido por trigger.

**Aplicação.** O README documenta a troca do alvo de build (Cloudflare Workers → Node) e a lista completa de variáveis de ambiente, sem alterar o código agora — a mudança de build fica para uma etapa própria, com plano separado.

**Verificação.** `verify-migration.ts` roda contra origem e destino e emite um relatório: contagem por tabela, contagem de objetos por bucket, existência das funções, triggers, policies e jobs de cron.

## Observações técnicas

- Nada no banco atual é alterado: a geração é somente leitura.
- Segredos não entram no repositório — apenas `.env.example` com nomes.
- O `03_data.sql` usa `session_replication_role = replica` para contornar a ordem das FKs, com restauração ao final.
- O segredo `email_queue_service_role_key` do vault e as URLs dentro de `email_queue_dispatch` / `email_queue_wake` apontam para o domínio atual e precisam ser reescritos no destino — coberto por `09_post_migration.sql`.
- Os arquivos antigos em `/mnt/documents/migration/` são descartados após a regeração.
