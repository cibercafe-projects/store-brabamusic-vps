# Relatório de Correções — Self-Host (2026-09-05)

Relatório das verificações, causas e correções aplicadas para estabilizar a produção do projeto **Braba Music** após a migração para o Supabase self-hosted (Docker local).

> Este relatório documenta **apenas o que foi feito nesta demanda**, indicando causas técnicas, correções aplicadas, validações e réus de revisão. Nenhum segredo é exibido fora de hashes parciais.

---

## Resumo executivo

A produção apresentava dois bloqueios ativos após o self-host:

1. **Supavisor (pooler) e Realtime** não conseguiam conectar ao Postgres — log de `password authentication failed for user "supabase_admin"`, containers ficavam em `health: starting`.
2. **Aplicação** retornava **500** na home com erro `catalog error { message: 'Unauthorized' }` no PM2.

Após as correções, o estado provado foi: **home `HTTP 200`** com catálogo renderizando dados reais, **supavisor e realtime `healthy`**, **REST 200** e **dados intactos** (beats=45, producers=3, releases=7, storage.objects=139).

Nenhuma chave foi rotacionada/gerada. `JWT_SECRET` e `ANON_KEY` permaneceram intactos.

---

## 1. Problemas verificados, causas e correções

| # | Problema | Causa raiz | Correção aplicada | Resultado |
|---|---|---|---|---|
| A | Supavisor/Realtime: `password authentication failed for "supabase_admin"` | Senha da role `supabase_admin` ≠ `POSTGRES_PASSWORD` do `.env` da stack; ambos conectam via rede (scram) | `ALTER USER supabase_admin` alinhado ao `POSTGRES_PASSWORD` + restart | pooler/realtime `healthy`, 0 erros de senha |
| B | Aplicação: home **500** / `catalog error: Unauthorized` | `SUPABASE_SERVICE_ROLE_KEY` do `.env` raiz era a chave `supabase-demo` inválida; o catálogo usa a service role key | Atualizar a linha da service role no `.env` raiz (valor da stack) + `pm2 restart --update-env` | home **200**, catálogo real, 0 `catalog error` |

---

### 1.1 Problema A — Supavisor/Realtime não autenticavam

**Sintoma**
- `docker logs supabase-pooler`: `FATAL 28P01 (invalid_password) password authentication failed for user "supabase_admin"` (repetido em `db_conn_1`/`db_conn_2`).
- Containers de `supabase-pooler` e `realtime-dev.supabase-realtime` ficavam em `health: starting` sem estabilizar.

**Causa raiz**
- No `docker-compose.yml` da stack:
  - **supavisor** usa `DATABASE_URL: ecto://supabase_admin:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/_supabase`.
  - **realtime** usa `DB_USER: supabase_admin` e `DB_PASSWORD: ${POSTGRES_PASSWORD}`.
- O `pg_hba.conf` do banco aceita `trust` apenas para conexões locais (`127.0.0.1/32`), mas qualquer conexão vinda de **outro container pela rede** cai na regra `host all all all scram-sha-256` — ou seja, a senha é de fato validada.
- A senha armazenada para a role `supabase_admin` **não era igual** ao `POSTGRES_PASSWORD` do `.env`. Teste de autenticação scram feito a partir de um container na mesma rede da stack confirmou: `password authentication failed for user "supabase_admin"`.
- Nota de diagnóstico: testes de conexão feitos **dentro** do container do banco em `127.0.0.1` davam "ok" por causa da regra `trust` local — um falso-positivo que escondia o problema real.

**Correção aplicada (Etapa 1)**
1. Backup da config: `cp .env .env.before-supabase-admin-sync-<timestamp>` (pasta da stack).
2. Pré-checagem read-only: banco saudável, role `supabase_admin` presente, dados intactos.
3. `ALTER USER supabase_admin WITH PASSWORD = <POSTGRES_PASSWORD>` (encryption `scram-sha-256`), com o valor injetado via variável psql — sem exibir o segredo.
4. Verificação: nova senha autentica via rede (scram) a partir de outro container; dados intactos.
5. `docker compose restart realtime supavisor`.
6. Validação: ambos `healthy`; 0 erros de `invalid_password`/`password authentication failed` nos logs após estabilizar.

---

### 1.2 Problema B — Aplicação: home 500 / `catalog error: Unauthorized`

**Sintoma**
- `pm2 logs braba-music` repetindo `catalog error { message: 'Unauthorized' }`.
- `curl http://localhost:3000/` retornava **500**.
- Anteriormente, o erro aparecia como `PGRST301 (None of the keys was able to decode the JWT)`, coerente com o uso de uma chave inválida.

**Causa raiz**
- O catálogo público é servido por server functions que usam o cliente administrador em `src/integrations/supabase/client.server.ts`, que lê:
  - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do ambiente do processo.
- O `start-production.sh` carrega o `/opt/apps/braba-music/.env` (raiz) via `source` e repassa ao processo do PM2. Esse arquivo continha a **chave `supabase-demo`** na variável `SUPABASE_SERVICE_ROLE_KEY` — uma chave JWT de exemplo inválida — enquanto a chave real estava no `.env` da stack e em `migration/env/.env`.
- PostgREST, ao receber essa chave inválida como `Bearer`/`apikey`, respondia `Unauthorized` → a server function lançava o erro → home **500**.
- Fator operacional: a aplicação **não usa `dotenv`**; as variáveis chegam ao processo via `source` + `--update-env` do PM2. Portanto, editar o `.env` sozinho não basta — é preciso reiniciar o PM2 recarregando o ambiente.

**Correção aplicada (Etapa 2)**
1. Backup do app: `cp .env .env.before-service-role-sync-<timestamp>`.
2. Atualizada **somente** a linha `SUPABASE_SERVICE_ROLE_KEY` do `.env` raiz com o valor de `SERVICE_ROLE_KEY` da stack — leitura direta dos arquivos, confirmada por hash parcial (`dev`), preservando o formato da linha. As demais variáveis (`SUPABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) ficaram intactas.
3. Recarga do ambiente e restart:
   ```
   set -a; source /opt/apps/braba-music/.env; set +a
   pm2 restart braba-music --update-env && pm2 save
   ```
4. Verificação: o novo processo do PM2 carregou a `SUPABASE_SERVICE_ROLE_KEY` correta (hash `fa9c06596ed8402c`, igual à da stack).

---

## 2. Validação final consolidada

| Verificação | Antes | Depois |
|---|---|---|
| Home `/` da aplicação | **500** | **200** (catálogo renderizando dados) |
| `catalog error` no PM2 | presente | **0** após o restart |
| REST gateway `/rest/v1/beats` (service role da stack) | — | **200** |
| `supabase-pooler` (supavisor) | `health: starting` | **healthy** |
| `realtime-dev.supabase-realtime` | `health: starting` | **healthy** |
| auth / rest / storage / meta / database / features / envoy | healthy | healthy (mantidos) |
| `beats` | 45 | 45 |
| `producers` | 3 | 3 |
| `releases` | 7 | 7 |
| `storage.objects` | 139 | 139 |

---

## 3. Comandos e verificações read-only utilizados (sem expor segredos)

- Inspeção do `pg_hba.conf` — identificou `trust` só no local e `scram-sha-256` na rede.
- Teste de autenticação scram a partir de um container na mesma rede do banco (confirmou a senha divergente e, depois, a correção).
- Comparação de chaves por hash `sha256(...)[:16]` entre os `.env` (stack, aplicação, migração) — apenas hashes parciais, nunca os valores.
- Contagem de registros por tabela e `storage.objects` para validar integridade dos dados.
- `pm2 restart braba-music --update-env` seguido de `pm2 save` para recarga do ambiente (a app não usa `dotenv`).

---

## 4. O que NÃO foi alterado / está fora do escopo

- **Nenhuma rotação ou geração de chaves.** `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` da stack permaneceram intactos.
- Não foi tocado em: `postgres`/configuração do banco além da senha da role `supabase_admin`, `pgbouncer`, `supabase_functions_admin`, Nginx, SSL/TLS, DNS, firewall.
- Nenhum volume foi removido; nenhum banco foi recriado; nenhum dado foi apagado.
- Apenas a variável `SUPABASE_SERVICE_ROLE_KEY` do `.env` raiz da aplicação foi atualizada; as demais variáveis foram preservadas.

---

## 5. Sinalizações para revisão futura (fora do escopo desta demanda)

1. **`SUPABASE_PUBLISHABLE_KEY` do app é um JWT legado.** A stack self-host usa uma chave opaque (`sb_publi...`). Não afeta a rota pública `/` (já corrigida), mas pode impactar o middleware de auth de administrador (`requireSupabaseAuth`) e fluxos de sessão. Recomenda-se revisar e alinhar.
2. **Pendências de versionamento.** Durante o levantamento foram observadas mudanças ainda não commitadas (fora do escopo desta correção):
   - `src/config/features.ts` — `maintenance` alternou entre `true`/`false` (backup `features.ts.backup-2026-09-03`).
   - `migration/sql/03_functions_triggers.sql` — URLs de webhook da fila de e-mail já apontam para `https://loja.brabamusic.com.br/lovable/email/queue/process` (alteração feita em etapa anterior; backup `.sql.backup`).
   - `.gitignore` — duplicação/reforço de entradas (`.env`, `.output/`, logs).
   - Remoção/renomeação de arquivos de `.lovable/` e `migration/*.md` de requisitos/plano, e backups locais não rastreados.
   - Recomenda-se uma revisão de `git status` e definição do que deve ser versionado antes de um próximo commit.

---

## 6. Arquivos de backup gerados nesta demanda

- Stack: `/opt/supabase-test/supabase/docker/.env.before-supabase-admin-sync-20260905-151729`
- Aplicação: `/opt/apps/braba-music/.env.before-service-role-sync-20260905-151851`

---

## Adendo — 2026-09-06: player, compras, e-mail e login admin

### Contexto
Após a estabilização inicial, ainda havia dois bloqueios funcionais: o **player não tocava** (signed URLs geradas com base `127.0.0.1:8000` apontando para a própria máquina do visitante) e o **fluxo de compra** dependia de e-mails que não saíam (o envio usava o serviço Lovable sem credenciais) e de links com o domínio legado `brababeats.app`.

### Correções aplicadas

| # | Problema | Correção | Resultado |
|---|---|---|---|
| C | Signed URLs de preview/storage apontavam para `127.0.0.1:8000` | Expôs o gateway Supabase (Kong, `:8000`) publicamente via **`api.loja.brabamusic.com.br`** (A `2.24.116.175`), vhost nginx + Let's Encrypt; atualizou `SUPABASE_URL`/`VITE_SUPABASE_URL` (app) e `API_EXTERNAL_URL`/`SITE_URL` (stack); rebuild + PM2 restart | Signed URL `https://api.loja.../storage/v1/...` com download WAV **200** (RIFF válido); bundle sem `localhost` |
| D | Domínio legado `brababeats.app` hardcoded | Criado `src/lib/site-url.ts` (`getPublicSiteUrl`, `getSenderDomain`, `getDefaultFromEmail`); aplicado em `purchases/deliveries/releases.functions.ts`, `send.server.ts`, `transactional/send.ts`, templates de e-mail e telas | `0` ocorrências de `brababeats.app` em `src/` |
| E | E-mails transacionais não saíam (`@lovable.dev/email-js` sem credenciais) | `process.ts` reescrito com **nodemailer** usando SMTP próprio **Hostinger** (`smtp.hostinger.com:587` STARTTLS; GoTrue `net/smtp` não suporta 465); dependência `@lovable.dev/email-js` removida | Envio de teste ponta a ponta: fila `transactional_emails` drenada, status **`sent`** em `email_send_log` |
| F | Login admin bloqueado: `auth.users` vazio (`user_roles` com 3 admin órfãos, débito do `migration/MANUAL_STEPS.md` §1) | Recriados os 3 admin em `auth.users` via **Admin API GoTrue** (`POST /admin/users`) **com os mesmos `user_id` de origem** (`email_confirm=true`, sem senha); disparado `POST /recover` para cada e-mail (SMTP GoTrue configurado) | `auth.users` 3 registros, JOIN `user_roles` 3/3, **0 órfãos**, super admin preservado; links de recovery montados no domínio público (`https://api.loja.../auth/v1/verify?...`); login por senha + `auth.getClaims` validados com issuer `https://api.loja.brabamusic.com.br/auth/v1` |

### Administradores recriados (papéis de `public.user_roles` preservados)
| user_id | e-mail |
|---|---|
| `c451ce55-7e9c-4fb7-8633-59b55cbebfc8` | giseletavares@gmail.com (super) |
| `d05f304b-013f-4066-a8d4-5d85e19d079f` | andressaversa@brabamusic.com |
| `a9e91977-4195-439e-a474-3565e2581e95` | braba.ent@gmail.com |

Senhas não foram exportadas: cada admin deve definir a própria senha pelo link de "esqueci minha senha" já enviado a estes e-mails (ou usar a tela `/admin/login`).

### Arquivos e infra alterados nesta rodada
- `/etc/nginx/sites-available/api.loja.brabamusic.com.br` (novo vhost, proxy `127.0.0.1:8000`, TLS Certbot).
- `/opt/apps/braba-music/.env` e `/opt/supabase-test/supabase/docker/.env` — URLs públicas, `SMTP_*` e `PUBLIC_SITE_URL`.
- `src/lib/site-url.ts`, `src/routes/lovable/email/queue/process.ts` (nodemailer), funções e templates de e-mail; `bun.lockb`/`package.json` (nodememailer, remoção de email-js).
- Backups: `.env.before-public-url-smtp-20260905-184412` (app e stack), `/tmp/opencode/process.ts.before-nodemailer-20260905-184412`, `.output.before-public-url-20260906-114511`.

### Validações registradas
- Home `200` via `https://loja.brabamusic.com.br`; `beat/trench` `200`; bundle cliente aponta para `api.loja.brabamusic.com.br` (sem `localhost:8000`).
- Signed URL pública de preview WAV: HTTP 200, `audio/wav`, header RIFF.
- `POST /lovable/email/queue/process` processou a fila: `{"processed":1}` e `email_send_log` com status `sent`.
- Logs de `supabase-auth`: `user_signedup` nas 3 criações e `user_recovery_requested` nos 3 recoveries, todos 200, sem erros SMTP.

### Pendências conhecidas
- **`GOTRUE_MAILER_EXTERNAL_HOSTS`** configurado em 2026-09-07
  (`loja.brabamusic.com.br,api.loja.brabamusic.com.br`) — aviso de
  X-Forwarded-Host eliminado dos logs do GoTrue.
- **`SUPABASE_PUBLISHABLE_KEY`** do app (server-side) segue sendo um JWT legado ≠ `ANON_KEY` da stack; apontado no relatório original como revisão recomendada (fora do escopo desta rodada).
- **Backup de segredos/ambiente** agora é coberto por `scripts/backup-secrets.sh` (snapshots manuais em `/opt/backups/secrets/`, rotação de 30 versões) — ver seção `[2026-09-07]` do `docs/CHANGELOG.md`. O backup automático do Postgres (`pg_dump` diário) continua como item de operação contínua ainda não confirmado.

---

## Adendo — 2026-09-07: autenticação admin (login + recuperação de senha)

### Contexto
Após a recriação dos admins em `auth.users` **sem senha** (adendo 2026-09-06),
o admin super (`giseletavares@gmail.com`) não conseguia logar: a senha antiga
não existia no novo registro, o e-mail de recuperação chegava **em inglês**
("Reset your password") e o usuário confundia o **código numérico de 6 dígitos**
(OTP do GoTrue) com a senha — digitá-lo no login gerava "invalid login
credentials" (em inglês).

### Causas raiz
| Sintoma | Causa |
|---|---|
| Login rejeitado com a senha antiga | Admin recriado sem senha; senha antiga não foi preservada |
| "invalid login credentials" em inglês no toast | Mensagem do GoTrue exibida sem tradução (`login.tsx` mostrava `err.message`) |
| E-mail "Reset your password" em inglês | GoTrue usa templates padrão (EN); nenhum subject/template pt-BR configurado |
| Confusão do código de 6 dígitos | Template default não diferenciava código OTP de senha |

### Correções aplicadas
1. **Desbloqueio**: senha de teste definida via Admin API GoTrue
   (`PUT /admin/users/{id}` com `SERVICE_ROLE_KEY`); login validado
   (HTTP 200, token emitido, `last_sign_in_at` preenchido).
2. **E-mails de auth pt-BR**: criados templates `recovery`/`confirmation`/
   `invite` (HTML+TXT) em `/var/www/braba-mailer/templates/`, servidos por
   nginx em `https://loja.brabamusic.com.br/mailer/`; subjects
   (`MAILER_SUBJECTS_*`) e templates (`MAILER_TEMPLATES_*`) mapeados no
   `docker-compose.yml`; `GOTRUE_MAILER_EXTERNAL_HOSTS` adicionado
   (aviso de X-Forwarded-Host eliminado). Container `supabase-auth` recriado.
3. **Tradução de erros**: novo `src/lib/auth-errors.ts` (`translateAuthError`)
   aplicado em `/admin/login` e `/admin/reset-password` — cobre "invalid login
   credentials", e-mail não confirmado, rate limit, SMTP, rede etc.
4. **UX do reset**: instruções na tela de login e de reset deixando claro que
   o código numérico não é a senha e que é preciso clicar no link do e-mail.

### Validações
- `POST /token` com a nova senha → HTTP 200 + token (público).
- `generate_link` (recovery) → HTTP 200, `redirect_to=/admin/reset-password`,
  envio sem erro de template.
- Build `NITRO_PRESET=node` + PM2 recriado; home e `/admin/login` 200.
- `tsc --noEmit` e `eslint` sem erros nos arquivos alterados.

### Pendências/avisos
- A senha de teste NÃO deve ser versionada e deve ser trocada pelo usuário
  (via recovery ou painel) após concluir os testes.
- `SUPABASE_PUBLISHABLE_KEY` do app foi alinhada em 2026-09-07 (ver adendo
  abaixo): agora é a mesma chave ANON real (`iss supabase`) da stack —
  pendência de JWT legado encerrada.

---

## Adendo — 2026-09-07 (à tarde): loop de validação do acesso do admin

### Sintoma
Após redefinir a senha (fluxo que passou a funcionar de manhã), o dashboard do
admin caía em "Não foi possível validar o acesso" e ficava em loop de recarga.

### Causa raiz
A `SUPABASE_PUBLISHABLE_KEY` do servidor (`.env` da aplicação) era uma **JWT
legada do `supabase-demo`** (`iss: supabase-demo`, emitida em 2022) — não é o
segredo desta stack. O middleware `requireSupabaseAuth`
(`src/integrations/supabase/auth-middleware.ts`) valida o token do usuário com
essa chave (`getClaims` → fallback `getUser`); o GoTrue rejeita a `apikey`
desconhecida com 401 → middleware lança "Unauthorized: Invalid token" →
`checkAdminRole` falha → `_protected/route.tsx` mostra o erro e o `useQuery`
(retry 2 + refetch) recarrega → loop.

Evidência: query no PostgREST com a chave legada = **HTTP 401**; com a chave
ANON real (`VITE_SUPABASE_PUBLISHABLE_KEY`) = **HTTP 200**. Validação manual
automatizada (usuário descartável): `getClaims` com a chave nova → `OK`
(`sub` retornado); com a legada → `401` "Unauthorized".

### Correções
1. **`.env`**: `SUPABASE_PUBLISHABLE_KEY` = chave ANON real da stack (mesma da
   `VITE_SUPABASE_PUBLISHABLE_KEY`). Backup: `.env.before-pubkey-fix-20260907-121145`.
   `pm2 restart --update-env` (sem rebuild).
2. **`reset-password.tsx`**: alternativa ao link — campos "E-mail da conta" +
   "Código de verificação" (6 dígitos) usando `verifyOtp({ type: "recovery",
   token })`. O código do e-mail agora é utilizável, não só o link.
3. **`auth-errors.ts`**: tradução para erro de OTP inválido/expirado.
4. **Templates `recovery.html`/`recovery.txt`**: código apresentado como
   alternativa ao link.

### Validações
- `tsc --noEmit`, `eslint`, `prettier` OK; build de produção OK.
- Home, `/admin/login` e `/admin/reset-password` → 200 após restart.
- Teste com usuário descartável (criado e removido): login OK; `getClaims`
  com a chave nova → `OK`; com a legada → `401`.

---

## Adendo — 2026-09-07 (fim de tarde): teste E2E do fluxo de compra em produção

Teste de ponta a ponta do fluxo de compra de beats em produção, automatizado
via API (reproduzindo byte a byte as chamadas dos server functions TanStack
que o browser faz). Beat de teste dedicado ("TESTE COMPRA BEAT", R$ 200,00,
produtora "Gau Beats", tipo fechado) + cliente fictício `gizavizion@gmail.com`.

### Etapas e resultados
| Etapa | Ação | Resultado |
|---|---|---|
| 2.1 Compra | `createPurchaseRequest` (Pix) | `aguardando_pagamento`; beat `reservado` (24 h); e-mails `purchase-created` (cliente) e `admin-new-purchase` (admin) **sent** |
| 2.2 Comprovante | `uploadReceiptByToken` (PNG p/ bucket privado) | `comprovante_recebido`; e-mails `receipt-received` e `admin-new-receipt` **sent** |
| 2.3 Confirmação | `updatePurchaseStatus` (admin) | `pagamento_confirmado`; beat → `vendido` |
| 2.3 Entrega | `deliverPurchase` (admin) | `arquivos_enviados`; `purchase_deliveries` registrada; e-mail `purchase-delivered` **sent** com links assinados (7 dias) WAV/STEMS + licença online |
| 2.4 Licença | `GET /licenca/<token>` | HTTP 200; compra entregue com `license_version` 2026-07-01.v1 |

### Conclusão
Fluxo de compra completo **funcional** em produção: compra → comprovante →
confirmação → entrega com e-mails transacionais em todos os marcos (status
`sent` no `email_send_log`, fila `transactional_emails` vazia após processar).

### Limpeza realizada
Todos os artefatos do teste foram removidos: `purchase_requests`,
`purchase_deliveries`, comprovante e arquivos do storage, beat de teste
(linha + objetos nos 4 buckets), logs de e-mail do teste e o usuário admin de
teste criado para simular a sessão (`auth.users` + `user_roles`).
`/beat/teste-compra-beat` voltou a responder 404.

### Infra descoberta durante o teste
- Server functions TanStack: `POST /_serverFn/<hash>` com header
  `x-tsr-serverFn: true` e payload seroval; GET envia `payload` na query.
- Sessões admin testáveis: criar usuário via `POST /auth/v1/admin/users`
  (email_confirm true) + linha em `user_roles` (role admin) + password grant.
- `SUPABASE_ANON_KEY` não definida no `.env` do app (vazio); usar a `ANON_KEY`
  do `/opt/supabase-test/supabase/docker/.env` em chamadas diretas ao Gateway.
- Remoção de objeto de storage nesta versão: `DELETE /storage/v1/object/<bucket>/<path>`
  (`POST /object/remove` inexistente).
- Envio de e-mails: fila `transactional_emails` é processada por
  `POST /lovable/email/queue/process` (Bearer service role); **não há cron** no
  host, o disparo é manual.

---

## Adendo — 2026-09-07 (noite): cron automático do processador de e-mails

Automatizado o disparo do processador de e-mails, que até então era manual.

### Implementado
- **`scripts/process-emails.sh`** (root `700`, sem segredos no arquivo): lê
  `SUPABASE_SERVICE_ROLE_KEY` **ao vivo** do `.env` da app a cada execução
  (natural a rotações de chave), `POST /lovable/email/queue/process` (Bearer)
  com 1 retry (3 s, janela de restart do PM2). Loga só eventos/erros em
  `/var/log/braba-email-process.log` (`640`, rotação interna 2000 linhas);
  silencioso com fila vazia.
- **`/etc/cron.d/braba-email`** (`644`, root): dispara o script de **2 em 2
  minutos**. TTL da fila transacional é 60 min (auth 15 min) — folga ampla.

### Validação (produção)
1. Fila vazia → rodada manual silenciosa (exit 0).
2. Guardas: `.env` ausente e chave vazia → `ERRO` no log + exit 1.
3. **Prova E2E automática** (mensagem sintética `process-cron-test@invalid.local`
   via `enqueue_email`): no tick das 14:50:01 o cron disparou o script (syslog
   `CMD`), o endpoint processou (`processed=1` no log), `email_send_log`
   registrou `sent` e a fila esvaziou — **sem intervenção manual**. Todas as
   linhas de teste removidas ao final (log e fila zerados).

### Aprendizado / pegadinha
- Arquivo `/etc/cron.d/*` **precisa terminar com quebra de linha**: sem `\n`,
  o cron do Debian descarta a última linha (job ficou invisível até corrigir).
  Aplicar `systemctl restart cron` após editar para forçar reload.
- PGMQ desta versão usa tabelas `pgmq.q_<fila>` / `pgmq.a_<fila>` (não
  `pgmq.<fila>`).

---

*Relatório original gerado em 2026-09-05; adendos registrados em 2026-09-06 (estabilização pós-migração), 2026-09-07 (autenticação admin — manhã e tarde), 2026-09-07 (teste E2E do fluxo de compra) e 2026-09-07 (cron automático do processador de e-mails).*
