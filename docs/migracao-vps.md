# Migração para VPS Dedicado — Requisitos (self-host completo)

Documento de referência para hospedar o sistema **Braba Beats** inteiro (aplicação + banco + auth + storage) em um VPS próprio, fora do Lovable Cloud.

Escopo escolhido: **tudo no VPS**, com Supabase self-hosted via Docker.

> Este documento é apenas de requisitos e planejamento. Nenhuma alteração de código foi feita.

---

## 1. Dimensionamento do servidor

| Cenário | vCPU | RAM | Disco | Observação |
|---|---|---|---|---|
| **Recomendado** | 4 | 8 GB | 100 GB SSD NVMe | Confortável para app + Postgres + Storage + Realtime |
| Mínimo viável | 2 | 4 GB | 50 GB SSD | Só para validação; risco de OOM em picos e uploads grandes |
| Crescimento (fase 2) | 8 | 16 GB | 250 GB+ | Se o catálogo de WAV/STEMS crescer muito |

**Disco:** o banco em si é pequeno (poucas centenas de MB hoje). O que cresce é o Storage — arquivos WAV, STEMS, capas, prévias, fotos de divulgação e comprovantes. Um beat completo (WAV + STEMS) pode passar de 500 MB. Planeje disco com folga e escolha um provedor que permita expandir o volume sem recriar a máquina.

**Rede:** as prévias de áudio são servidas em streaming e consomem banda de forma consistente.
- Link de 1 Gbps.
- Evite planos com franquia mensal baixa de tráfego.
- Fortemente recomendado colocar **Cloudflare** (ou outra CDN) na frente para cache de estáticos, TLS e mitigação de abuso.

---

## 2. Sistema operacional e pacotes base

- **Ubuntu Server 22.04 LTS ou 24.04 LTS** (x86_64).
- **Docker Engine** + **Docker Compose v2**.
- **Node.js 20+** (ou **Bun**) para o build da aplicação.
- **Nginx** ou **Caddy** como proxy reverso, com TLS via **Let's Encrypt** (o Caddy automatiza a renovação).
- **Git**, **ufw** (firewall), **fail2ban**.
- Swap de 2–4 GB configurado (proteção contra picos de memória do Postgres).

Portas expostas para a internet: apenas **80** e **443**. SSH restrito (porta alternativa e/ou IP allowlist). Postgres **nunca** exposto publicamente.

---

## 3. Stack self-hosted do backend

Usar o `docker-compose` oficial do Supabase self-host, que sobe:

| Serviço | Para que o Braba Beats usa |
|---|---|
| **Postgres** | Todas as 16 tabelas, RLS, funções e triggers |
| **GoTrue (Auth)** | Login dos admins (e-mail/senha + Google) |
| **PostgREST** | Data API consumida pelo app |
| **Storage API** | Os 10 buckets privados e as signed URLs |
| **Realtime** | Contador de visitantes online no dashboard |
| **Kong** | Gateway/roteamento dos serviços acima |
| **Studio** (opcional) | Painel de administração do banco |

### Extensões Postgres obrigatórias

| Extensão | Motivo no projeto |
|---|---|
| `pgcrypto` | Geração de UUIDs e hashes |
| `uuid-ossp` | Geração de UUIDs (legado do schema) |
| `pg_cron` | Expiração automática das reservas de beats (`expire_beat_reservations`, a cada 5 min) e disparo da fila de e-mails |
| `pg_net` | Chamadas HTTP do banco para os endpoints da fila de e-mails |
| `pgmq` | Filas `q_auth_emails` e `q_transactional_emails` |
| `vault` | Armazenamento cifrado da chave usada pelo processador da fila |

> A imagem oficial do Supabase self-host já traz essas extensões; basta habilitá-las com `CREATE EXTENSION`.

---

## 4. Adaptação necessária na aplicação

**Ponto mais importante da migração.** Hoje o app é TanStack Start compilado para **Cloudflare Workers** (`wrangler.jsonc` + `nodejs_compat`, entrypoint `src/server.ts`). Em um VPS não existe Worker.

O que muda:
1. Trocar o alvo de build de Cloudflare para **servidor Node** (preset `node-server` do Nitro), removendo o plugin do Cloudflare do `vite.config.ts`.
2. Rodar o servidor gerado com **PM2** ou **systemd**, ou empacotar em container próprio no mesmo compose.
3. Manter o proxy reverso na frente (TLS, gzip/brotli, headers de cache).

Isso é ajuste de configuração de build e deploy — **não é reescrita da aplicação**. O código das rotas, server functions e componentes permanece o mesmo.

### Variáveis de ambiente necessárias

Servidor (nunca expostas ao navegador):
```
SUPABASE_URL=https://api.seudominio.com
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_PROJECT_ID=...
```

Cliente (embutidas no bundle):
```
VITE_SUPABASE_URL=https://api.seudominio.com
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

### E-mails transacionais

O envio hoje usa o serviço de e-mail do Lovable (`@lovable.dev/email-js`). No VPS isso precisa ser substituído por um provedor próprio — **Resend**, **Amazon SES**, **Postmark** ou SMTP dedicado — com:
- Domínio verificado (SPF, DKIM, DMARC).
- Atualização das URLs de webhook das funções `email_queue_dispatch` e `email_queue_wake`, que hoje apontam para o domínio do Lovable.

O GoTrue também precisa de SMTP configurado para os e-mails de autenticação (reset de senha, confirmação).

---

## 5. Migração de dados e arquivos

Os scripts estão versionados em [`migration/`](../migration/README.md) e devem ser executados nesta ordem:

1. `migration/sql/01_extensions.sql` — extensões Postgres exigidas.
2. `migration/sql/02_schema.sql` — 14 ENUMs, 16 tabelas, chaves e índices.
3. `migration/sql/03_functions_triggers.sql` — 11 funções e triggers.
4. `migration/sql/04_grants_rls.sql` — GRANTs, RLS e todas as policies.
5. `migration/sql/05_data.sql` — dados em ordem pai-primeiro (`session_replication_role = replica`).
6. `migration/sql/06_storage_buckets.sql` — os 10 buckets privados.
7. `migration/sql/07_storage_policies.sql` — policies de `storage.objects`.
8. `migration/sql/08_cron_jobs.sql` — agendamentos `pg_cron`.
9. `migration/sql/09_post_migration.sql` — filas pgmq, vault e URLs de webhook (edição manual).

Arquivos e verificação: `migration/scripts/migrate-storage.ts` e `migration/scripts/verify-migration.ts`.
Passos manuais (admins, Google, SMTP, DNS): `migration/MANUAL_STEPS.md`.


Depois:
- **Usuários admin**: recriar manualmente em `auth.users` e revincular em `public.user_roles` mantendo o mesmo `user_id`. O super admin é protegido por trigger.
- **Arquivos do Storage**: transferir os objetos preservando exatamente os caminhos (as URLs assinadas dependem do path). Buckets: `beat-covers`, `beat-previews`, `beat-wav`, `beat-stems`, `beat-licenses`, `producer-avatars`, `purchase-receipts`, `release-covers`, `release-audio`, `release-photos`.
- **Jobs `pg_cron`**: reagendar a expiração de reservas (5 min) e o `process-email-queue`.
- **Webhooks**: atualizar as URLs dentro das funções de fila para o novo domínio.
- **Vault**: recriar o segredo `email_queue_service_role_key`.
- **Auth**: reconfigurar o provedor Google (client ID/secret e URLs de callback do novo domínio).

Validação pós-migração: contar registros por tabela, abrir um beat público, testar login admin, gerar uma signed URL, criar uma compra de teste e confirmar a reserva/expiração.

---

## 6. Operação contínua

**Backups**
- Dump diário do Postgres (`pg_dump`) com retenção de 30 dias.
- Sincronização dos buckets para storage externo (S3, R2 ou Backblaze) — o VPS não pode ser a única cópia dos WAV/STEMS.
- Teste de restauração pelo menos uma vez por trimestre.

**Monitoramento**
- Uso de disco (alerta em 75%), memória, conexões do Postgres.
- Logs do proxy reverso e do container do app.
- Uptime externo (UptimeRobot ou similar) no domínio público.

**Segurança**
- Firewall liberando só 80/443; SSH por chave, sem senha, root desabilitado.
- Atualizações de segurança automáticas do sistema.
- TLS com renovação automática.
- Segredos apenas em arquivos `.env` fora do repositório, com permissão restrita.
- Buckets permanecem privados; acesso somente por signed URL.

---

## 7. Checklist antes do corte de DNS

- [ ] VPS provisionado no tamanho recomendado, com swap e firewall.
- [ ] Docker + Supabase self-host rodando e saudável.
- [ ] Todas as extensões Postgres habilitadas.
- [ ] Schema, funções, RLS e policies aplicados sem erro.
- [ ] Dados importados e conferidos por contagem de registros.
- [ ] Arquivos do Storage transferidos e signed URL testada.
- [ ] Usuários admin recriados e login validado.
- [ ] Build da aplicação com alvo Node funcionando em produção.
- [ ] Proxy reverso com TLS válido no domínio.
- [ ] Provedor de e-mail configurado, domínio verificado e envio testado.
- [ ] Jobs `pg_cron` reagendados e verificados.
- [ ] Backup automático rodando e restauração testada.
- [ ] Janela de manutenção definida e comunicada.
- [ ] Plano de rollback: TTL do DNS reduzido para 300s antes do corte, ambiente antigo mantido intacto por 7 dias.

---

## Resumo executivo

O mínimo que o VPS precisa ter: **Ubuntu LTS, 4 vCPU, 8 GB de RAM, 100 GB de SSD, Docker e um domínio com TLS**. O trabalho técnico se concentra em três frentes: subir o Supabase self-hosted com as extensões corretas, trocar o alvo de build de Cloudflare Workers para Node, e substituir o serviço de e-mail do Lovable por um provedor próprio.
