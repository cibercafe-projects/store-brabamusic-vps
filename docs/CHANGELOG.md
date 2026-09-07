# Changelog

Todas as mudanças relevantes da plataforma são registradas neste arquivo.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

---

## [2026-09-07] — Compartilhamento de beat, pedido pendente e upload de comprovante

### Added
- **Compartilhamento de beat** (`src/routes/beat.$slug.tsx`): o botão
  Compartilhar agora abre um menu com **Copiar link**, **Compartilhar pelo
  sistema** (Web Share, só quando disponível) e **Enviar no WhatsApp**. A URL
  usada é canônica via `getPublicSiteUrl()` (sem depender de
  `window.location.origin`/hash).
- **Meta tags por beat** (`head()` na rota): `title`/`description`, `og:title`,
  `og:description`, `og:type=music.song`, `og:url`, `og:image` (capa do beat ou
  imagem global) e `twitter:*` + `link canonical` — prévia correta no WhatsApp
  e em redes sociais para cada beat.
- **Pedido pendente recuperável** (`src/lib/pending-purchase.ts` novo):
  quando um pedido é criado no `PurchaseDialog`, os dados
  (`continuation_token`, beat, valor) ficam em `sessionStorage`
  (`braba.pending-purchase`, máx. 5). A página do beat exibe um banner
  "Enviar comprovante"/"Dispensar" quando há pedido pendente daquele beat —
  resolve a perda de contexto ao abrir o link de pagamento em aba nova.
- **Upload de comprovante mais robusto** (`ReceiptUploader.tsx`): validação
  antecipada de tamanho base64 (máx. ~8 MB) e mensagens de erro amigáveis para
  falhas de rede/413 (filtra HTML do erro). Envio bem-sucedido limpa a pendência
  do `sessionStorage`.

### Fixed
- Botão Compartilhar "não fazia nada" no desktop (navegadores sem Web Share
  API): agora abre o menu com as opções acima.
- Upload de comprovante pelo **celular** quebrava com erro 413 (HTML no toast)
  porque um único `class` do vhost `loja` não tinha limite de corpo. Adicionado
  `client_max_body_size 15m` no nginx (`/etc/nginx/sites-available/loja.brabamusic.com.br`),
  `nginx -t` OK e reload aplicado.

### Changed
- **Tentativa de correção do mojibake de emoji revertida**: ao forçar
  `charset=utf-8` + `encoding=base64` no `process.ts`, o e-mail inteiro saiu
  corrompido (mojibake geral). Mudança **revertida** — o envio voltou ao
  formato anterior (strings simples) e foi validado com uma compra real de
  produção (e-mail legível). **O mojibake isolado dos emojis (🔥 ✅) no e-mail
  permanece em aberto**; emojis seguem funcionando no WhatsApp/celular.

### Infra
- Limpeza dos dados de teste da produtora **Malana**: removidas as 2 compras
  de teste (Beat Aberto Teste e Beat Fechado Teste), as 4 entregas
  (`purchase_deliveries`), os 2 comprovantes do `purchase-receipts` e as 16
  linhas de `email_send_log` relacionados. Beats `aberto`/`fechado` voltaram
  a `ativo` (sem reserva) — prontos para novo teste de compra.

---

## [2026-09-07] — Cron automático do processador de e-mails

### Added
- **`scripts/process-emails.sh`**: processa a fila `transactional_emails` (e
  `auth_emails`) automaticamente. Lê a service role key **ao vivo** do
  `/opt/apps/braba-music/.env` em cada execução (robusto a rotações de chave),
  faz `POST /lovable/email/queue/process` (Bearer) com 1 retry (3 s) para
  cobrir restart do PM2, e loga apenas eventos/erros em
  `/var/log/braba-email-process.log` (rotação interna, 2000 linhas). Silencioso
  quando a fila está vazia.
- **`/etc/cron.d/braba-email`**: dispara o script de 2 em 2 minutos (raiz/root).
  TTL da fila transacional é 60 min (auth 15 min) — folga ampla; custo nulo
  com fila vazia.

### Validado (produção)
1. Rodada manual com fila vazia → silencioso, exit 0.
2. Guardas de erro: `.env` ausente e chave vazia → `ERRO` no log e exit 1.
3. **Prova E2E automática**: enfileirada mensagem sintética
   (`process-cron-test@invalid.local` via `enqueue_email`); **sem intervenção
   manual**, o cron disparou às 14:50:01 (syslog), o script logou
   `processed=1`, o `email_send_log` registrou `status=sent` e a fila
   esvaziou. Tudo limpo após o teste.

### Infra / aprendizado
- Isenção para quem editar `/etc/cron.d/braba-email`: o arquivo **deve
  terminar com quebra de linha** (cron do Debian descarta a última linha sem
  `\n`) e pedir `systemctl restart cron` para forçar o reload.
- PGMQ nesta versão usa tabelas `pgmq.q_<fila>` / `pgmq.a_<fila>` (não
  `pgmq.<fila>`).

---

## [2026-09-07] — Teste E2E completo do fluxo de compra em produção

Teste manual automatizado via API (reproduzindo as chamadas do browser) do
fluxo de compra de beats, end-to-end, em produção (loja.brabamusic.com.br /
api.loja.brabamusic.com.br). Beat de teste dedicado ("TESTE COMPRA BEAT",
R$ 200, produtora "Gau Beats") e cliente fictício `gizavizion@gmail.com`.

### Validado
1. **Criação da compra** (`createPurchaseRequest`): pedido
   `aguardando_pagamento`, valor R$ 200,00, forma Pix; beat status `reservado`
   (24 h). E-mails `purchase-created` (cliente) e `admin-new-purchase`
   (admin) **enviados** via fila `transactional_emails`.
2. **Envio de comprovante** (`uploadReceiptByToken`, PNG p/ bucket privado):
   status `comprovante_recebido`; e-mails `receipt-received` (cliente) e
   `admin-new-receipt` (admin) **enviados**.
3. **Confirmação de pagamento** (`updatePurchaseStatus`, admin): status
   `pagamento_confirmado`, beat → `vendido`.
4. **Entrega de arquivos** (`deliverPurchase`, admin): status
   `arquivos_enviados`, `purchase_deliveries` registrada (enviado_por,
   recipient, arquivos WAV/STEMS/licença), e-mail `purchase-delivered`
   **enviado** com links assinados (7 dias) de WAV/STEMS + link público da
   licença `/licenca/<token>`. Página `/licenca/<token>` responde 200.
5. **Limpeza**: compras, entregas, comprovante, arquivos e beat de teste
   removidos; usuário admin de teste removido (`auth.users` + `user_roles`);
   `/beat/teste-compra-beat` voltou a 404.

### Infra / aprendizado
- Server functions TanStack são invocáveis via `POST /_serverFn/<hash>`
  (header `x-tsr-serverFn: true`, payload serializado com seroval).
- `SUPABASE_ANON_KEY` não existe no `.env` do app (vazio); a chave ANON real
  usada é `SUPABASE_PUBLISHABLE_KEY`. Para chamadas Gateway diretas, usar a
  `ANON_KEY` do stack (`/opt/supabase-test/supabase/docker/.env`).
- Storage: o endpoint de remoção é `DELETE /storage/v1/object/<bucket>/<path>`
  (nesta versão, `POST /object/remove` não existe).
- O processador de e-mails é o endpoint `/lovable/email/queue/process`
  (Bearer service role); na época do teste o disparo era manual — hoje há o
  cron automático `scripts/process-emails.sh` + `/etc/cron.d/braba-email`
  (2 em 2 minutos), ver seção acima.

---

## [2026-09-07] — Runbook operacional + backup manual de segredos

### Added
- **`docs/PROCESSO-PRODUCAO.md`**: runbook de operação — quando reiniciar o
  servidor (PM2/Docker apenas; reinício do VPS só em emergência), fluxo ideal
  de deploy de nova versão estável (build → PM2 → validar → CHANGELOG → git →
  sincronizar clone), rollback, quando/como atualizar o backup de secrets e
  restauração, além de checklist pós-deploy.
- **`scripts/backup-secrets.sh`**: snapshot manual dos arquivos de segredos e
  ambiente do VPS (`.env` da aplicação, `.env` da stack Supabase, `.env` de
  migração e `~/.git-credentials`) em `/opt/backups/secrets/<AAAAMMDD-HHMMSS>/`,
  com `MANIFEST.txt` (sha256) e verificação de integridade. Rotação mantém as
  30 versões mais recentes. Uso: `bash scripts/backup-secrets.sh` (sem cron).

### Changed
- **Segurança**: `/opt/apps/braba-music/.env` teve a permissão corrigida de
  `644` para `600` (antes legível por qualquer usuário do sistema).

### Infra
- Criada pasta central `/opt/backups/secrets` (`700`, root-only), fora de
  repositórios git.

---

## [2026-09-07] — Autenticação admin: desbloqueio de login + e-mails pt-BR

Rodada focada em destravar o login administrativo após a recriação dos admins
(sem senha) e em traduzir para pt-BR as mensagens de erro e os e-mails de
recuperação gerados pelo GoTrue.

### Added
- **`src/lib/auth-errors.ts`**: helper `translateAuthError` que mapeia as
  mensagens de erro do Supabase/GoTrue (login, recovery, rate limit, SMTP,
  rede) para mensagens em pt-BR. Aplicado em `/admin/login` e
  `/admin/reset-password` (antes o toast mostrava o texto em inglês do GoTrue,
  ex.: "Invalid login credentials").
- **Templates de e-mail de auth em pt-BR**: `recovery.html`, `recovery.txt`,
  `confirmation.html`, `confirmation.txt`, `invite.html`, `invite.txt` nas
  configurações da stack GoTrue. Os e-mails agora têm botão "Redefinir minha
  senha"/"Confirmar meu e-mail", link direto e instrução explícita de que o
  **código numérico não é a senha** (evita a confusão relatada no teste).

### Changed
- **Subjects de e-mail do GoTrue em pt-BR** (variáveis `MAILER_SUBJECTS_*` da
  stack): "Confirme seu e-mail", "Convite para BRABA Music", "Redefinição de
  senha", "Confirme seu novo e-mail", "Seu link de acesso", "Confirme que é
  você".
- **`login.tsx`**: ao pedir recuperação de senha, o toast agora instrui a
  clicar no link do e-mail; adicionada dica visual na página explicando que o
  código numérico serve apenas de verificação e não é senha.
- **`reset-password.tsx`**: tela de "validando o link" agora instrui a abrir
  a página pelo link do e-mail (assunto "Redefinição de senha").

### Infra
- **nginx** (`loja.brabamusic.com.br`): nova `location /mailer/` servindo os
  templates estáticos de e-mail em `/var/www/braba-mailer/templates/` (HTML
  e TXT). Templates acessíveis em `https://loja.brabamusic.com.br/mailer/...`.
- **Stack GoTrue**: variáveis `MAILER_SUBJECTS_*` e `MAILER_TEMPLATES_*`
  mapeadas no `docker-compose.yml`; `GOTRUE_MAILER_EXTERNAL_HOSTS` adicionado
  (silencia o aviso de X-Forwarded-Host nos logs). Container `supabase-auth`
  recriado e saudável.
- **Operacional**: senha de teste definida via Admin API GoTrue para
  `giseletavares@gmail.com` (não armazenada/versionada). Login validado
  (HTTP 200 + token). A senha de teste deve ser trocada pelo usuário após os
  testes.

### Validado
- Build de produção (`NITRO_PRESET=node bun run build`) + PM2 recriado —
  home e `/admin/login` respondem 200.
- `tsc --noEmit` e `eslint` sem erros nos arquivos alterados.
- Login via `POST /token` com a nova senha: HTTP 200 e token emitido.
- Geração de link de recovery via Admin API: 200, com
  `redirect_to=https://loja.brabamusic.com.br/admin/reset-password` e e-mail
  enviado (template customizado carregado sem erro).

### Operacional (fora do repo)
- Backups: `.env.before-ptbr-mailer-*` e `docker-compose.yml.before-ptbr-mailer-*`
  na pasta da stack; templates em `/var/www/braba-mailer/templates/`.

---

## [2026-09-07] — Correção do loop de validação do acesso do admin

Após a rodada de e-mails pt-BR, o admin conseguia redefinir a senha (via link),
mas o dashboard caía em loop com "Não foi possível validar o acesso". Causa
raiz nos logs do GoTrue e no PostgREST: a `SUPABASE_PUBLISHABLE_KEY` usada
no servidor (`.env`) era uma **JWT legada do `supabase-demo`** (iss `supabase-demo`,
2022) que o GoTrue rejeita com 401. O middleware `requireSupabaseAuth`
(`src/integrations/supabase/auth-middleware.ts`) valida o token via
`getClaims/getUser` com essa chave → 401 → `checkAdminRole` falha →
`_protected/route.tsx` exibe o erro e o `useQuery` (retry 2 + refetch) recarrega.

### Fixed
- **Chave ANON do servidor**: `SUPABASE_PUBLISHABLE_KEY` do `.env` agora é a
  mesma chave ANON real do app (`VITE_SUPABASE_PUBLISHABLE_KEY`, iss
  `supabase`). Resolve a pendência antiga de "JWT legado" e destrava todas as
  server functions protegidas (`checkAdminRole`, compras, beats, etc.).
  Validação: `getClaims` com a chave nova → `OK`; com a legada → `401`.
- **Loop de validação**: com a chave correta, o middleware valida o token e o
  role query do admin passa.

### Added
- **`reset-password.tsx`**: alternativa ao link do e-mail — campos
  "E-mail da conta" + "Código de verificação" (6 dígitos) que chamam
  `supabase.auth.verifyOtp({ type: "recovery", token })`. O código enviado no
  e-mail agora é utilizável, sem depender de abrir o link.
- **`auth-errors.ts`**: nova tradução para erros de OTP/expirados ("Código
  inválido ou expirado. Peça um novo link de redefinição.").

### Changed
- **Templates `recovery.html`/`recovery.txt`**: o código de verificação agora
  é apresentado como alternativa ao link (campo "Código de verificação" na
  página), reforçando que o código não é a senha.

### Validado
- `tsc --noEmit`, `eslint` e `prettier` sem erros.
- Build de produção OK; `pm2 restart --update-env`; home, `/admin/login` e
  `/admin/reset-password` respondem 200.
- Validação automatizada (usuário descartável, criado e removido após o teste):
  login OK, `getClaims` com a chave nova retorna `sub`, com a legada → 401.

### Operacional (fora do repo)
- Backup do `.env`: `.env.before-pubkey-fix-20260907-121145`.

---

## [2026-09-06] — Estabilização pós-migração: produção, e-mail e login admin

Rodada final de estabilização do self-host (Supabase em Docker). Corrigiu o
player, destravou os e-mails transacionais e o login administrativo, e expôs o
gateway Supabase em domínio público com TLS. Detalhes completos no relatório
`docs/relatorio-correcoes-self-host-2026-09-05.md` (adendo 2026-09-06).

### Added
- **`src/lib/site-url.ts`**: centraliza `getPublicSiteUrl()`,
  `getSenderDomain()` e `getDefaultFromEmail()` — todos apontando para o novo
  domínio público `https://loja.brabamusic.com.br`.
- **Tratamento global de recuperação de senha** em `src/routes/__root.tsx`: ao
  detectar `PASSWORD_RECOVERY` (o link do e-mail pode redirecionar para a home,
  pois `redirect_to` usa o `SITE_URL`), o admin é levado automaticamente para
  `/admin/reset-password`.

### Changed
- **Player e storage públicos**: o gateway Supabase (Kong, `:8000`) agora é
  exposto via `https://api.loja.brabamusic.com.br` (vhost nginx + Let's
  Encrypt). Signed URLs de preview/entrega passam a apontar para esse domínio,
  fazendo o player tocar e os downloads de WAV funcionarem.
- **Domínio legado `brababeats.app` removido** de `src/` — aplicado em
  `purchases.functions.ts`, `deliveries.functions.ts`,
  `releases.functions.ts`, `send.server.ts`, `transactional/send.ts`, nos
  templates de e-mail e em telas admin (`compras.$id`, `configuracoes`,
  `ResendInstructionsCard`).
- **E-mails transacionais**: `src/routes/lovable/email/queue/process.ts`
  reescrito com **nodemailer** usando SMTP próprio (Hostinger, STARTTLS) no
  lugar do serviço Lovable sem credenciais; dependência
  `@lovable.dev/email-js` removida da fila de atendimento.
- **`/admin/login`**: removido `minLength={8}` do campo de senha — o navegador
  não trava mais tentativas com senhas menores que 8 caracteres (a validação
  real é feita pelo GoTrue).
- `docs/migracao-vps.md`: checklist do item "Usuários admin recriados e login
  validado" marcado como concluído.

### Fixed
- **Player não tocava**: signed URLs apontavam para `127.0.0.1:8000` (a própria
  máquina do visitante). Resolvido com domínio público + rebuild do bundle
  cliente (`VITE_SUPABASE_URL`).
- **Fluxo de compra sem e-mails**: envio usava o serviço do Lovable sem
  credenciais. Agora as filas pgmq (`auth_emails`, `transactional_emails`) são
  drenadas por `process.ts` e enviadas via SMTP Hostinger, com registro em
  `email_send_log`.
- **Admin sem login**: `auth.users` estava vazio com 3 admins órfãos em
  `user_roles` (débito do `migration/MANUAL_STEPS.md` §1). Os 3 usuários foram
  recriados via Admin API GoTrue **com os mesmos `user_id` de origem**
  (`email_confirm=true`, sem senha) e links de recovery de senha enviados aos
  e-mails.
- **Link de recuperação caindo na home**: handler global em `__root.tsx`
  navega para `/admin/reset-password` quando o evento `PASSWORD_RECOVERY` é
  disparado em qualquer página.

### Security
- Nenhuma chave rotacionada: `JWT_SECRET`, `ANON_KEY` e `SERVICE_ROLE_KEY` da
  stack permaneceram intactos. A recriação de admins preservou o papel `super`
  (protegido por trigger) e manteve a integridade de `user_roles` (3/3, 0
  órfãos).

### Infra
- **nginx**: novo vhost `api.loja.brabamusic.com.br` (proxy `127.0.0.1:8000`,
  TLS Certbot com validade até 2026-12-05).
- **DNS**: A record `api.loja.brabamusic.com.br → 2.24.116.175`.
- **Env**: `SUPABASE_URL`/`VITE_SUPABASE_URL` (app) e
  `API_EXTERNAL_URL`/`SITE_URL` (stack) apontando para os domínios públicos;
  `SMTP_*` configurados (app 465 / stack GoTrue 587).
- Backups das configurações anteriores: `.env.before-public-url-smtp-*`,
  `/tmp/opencode/process.ts.before-nodemailer-*`, `.output.before-public-url-*`.

### Docs
- `docs/relatorio-correcoes-self-host-2026-09-05.md`: adendo 2026-09-06 com a
  tabela de correções C/D/E/F, admins recriados, arquivos alterados, validações
  e pendências.

### Pendências conhecidas
- `GOTRUE_MAILER_EXTERNAL_HOSTS` não configurado (apenas suprime aviso no
  log do GoTrue; links já usam os domínios corretos).
- `SUPABASE_PUBLISHABLE_KEY` do app (server) era um JWT legado ≠ `ANON_KEY` da
  stack — **corrigido em 2026-09-07** (alinhada à chave ANON real; ver seção
  "Correção do loop de validação do acesso do admin").
- Backup diário do Postgres (`pg_dump`) ainda não confirmado.

---

## [Semana 2026-06-19] — Lançamentos + Segurança

Ciclo focado em ajustes do cadastro de lançamentos e hardening de segurança
da plataforma.

### Added
- **Data de lançamento sugerida** (`releases.suggested_release_date`):
  campo obrigatório no formulário público `/enviar-lancamento`, posicionado
  como **primeiro campo** da seção "Sobre o lançamento". Editável pelo admin
  em `/admin/lancamentos/$id`.
- **Edição administrativa completa de lançamentos**: o admin agora vê e
  edita todos os campos do cadastro (não apenas o status) direto no painel.
- **Link direto para o lançamento** no botão "Avisar a Administração da
  Braba sobre o seu lançamento" (tela de sucesso de
  `/enviar-lancamento`) — abre WhatsApp já com a URL
  `/admin/lancamentos/$id` no corpo da mensagem.
- **Honeypot + `started_at`** em `createLead` e `createPurchaseRequest`
  (alinhados ao padrão já usado em `submitRelease`).
- **HIBP enabled** no Supabase Auth — senhas comprometidas em vazamentos
  conhecidos são bloqueadas no cadastro/troca de senha.
- Schema `private` no banco, com `is_admin_active` e `is_super_admin`
  movidos para fora do PostgREST.

### Changed
- `getPurchaseByToken` retorna o e-mail **mascarado**
  (`j****@dominio.com`) ao cliente final. Admin continua vendo o e-mail
  completo no painel.
- Policies RLS de `app_settings`, `leads`, `purchase_requests`,
  `purchase_deliveries` e `user_roles` agora chamam `private.is_admin_active`
  / `private.is_super_admin` em vez das versões públicas.
- `InterestForm`, `PurchaseDialog` e o uploader de lançamento passam
  `website` (honeypot) e `started_at` em todas as submissões.

### Removed
- **`getReleaseUploadUrl`** removido de `src/lib/releases.functions.ts` —
  endpoint anônimo emitia signed URLs sem rate-limit e era vetor de abuso
  de storage. Upload de capa/áudio/foto passa exclusivamente pelo fluxo
  autenticado de `submitRelease`.
- `EXECUTE` em `public.is_admin_active` / `public.is_super_admin` para o
  role `authenticated` (deixou de ser sondável via RPC).

### Database
- `ALTER TABLE releases ADD COLUMN suggested_release_date date`.
- `CREATE SCHEMA private` + migração de `is_admin_active` /
  `is_super_admin` para `private.*` com `REVOKE` para `authenticated` e
  `GRANT EXECUTE` apenas para `postgres` / `service_role`.
- Recriação das policies dependentes apontando para `private.*`.

### Docs
- `docs/regras-de-negocio.md` ganhou a seção **7. Segurança e Proteção de
  Dados** e atualizou a seção **4. Envio de Lançamentos** com a data
  sugerida (4.3), edição administrativa (4.4) e o novo passo de
  notificação com link direto (4.5).

---



## [Revisão Fase 1 — Gaps de fluxo] — 2026-06-15

Revisão dos fluxos de Cadastro, Compra, Comprovante e Entrega após Fase 1.

### Added
- Badge âmbar **"Validar comprovante"**, filtro rápido **"Aguardando
  validação"** e ordenação dedicada para pedidos em `comprovante_recebido`
  na lista `/admin/compras`.
- Documentação dos 5 estados de `purchase_requests` em
  `docs/regras-de-negocio.md` (seção 2.4).
- Seção de **Leads unificados** nos docs (regras 2.5 + fluxo 6).

### Changed
- `deliverPurchase` agora valida no back-end que o pedido está em
  `pagamento_confirmado` ou `arquivos_enviados` antes de gerar links/entregar.
- `uploadReceiptByToken` bloqueia upload quando o pedido já está em
  `arquivos_enviados` (além do bloqueio já existente para `cancelado`).
- Botões da seção "Enviar Arquivos" passam a exibir **"Reenviar por
  WhatsApp/E-mail"** quando o pedido já foi entregue.
- Fluxo documentado em `docs/fluxos-do-sistema.md` agora inclui o estado
  intermediário `comprovante_recebido`.

### Removed
- Bloco/Botão **"Avisar imediatamente a Administração"** (WhatsApp comercial)
  da página pública `/enviar-comprovante/:token` — alinhado à regra Fase 1
  de notificações manuais pelo admin.

---


## [Fase 1] — 2026-06-15

Marco operacional: plataforma pronta para a operação oficial da Fase 1
(compra, entrega e lançamentos alinhados ao processo da Braba).

### Added
- **Tipo do Beat** (Aberto / Fechado) com preços padrão (R$ 150 / R$ 100) e
  regras de entrega (WAV+STEMS / WAV) em todo o catálogo, cadastro, card e
  página do beat.
- Campo **Nome Artístico** no checkout, persistido em `purchase_requests` e
  exibido no painel admin.
- Página pública **`/licenca-de-uso`** com o texto integral da Licença de Uso
  dos Beats.
- Aceite combinado de **Licença de Uso dos Beats** + **Termos de Uso da Braba
  Music** no checkout, com links visíveis.
- Botão primário **"ENVIAR COMPROVANTE DE PAGAMENTO"** na confirmação da
  compra.
- Destaque visual de **pedidos pendentes de entrega** no topo da lista, com
  badge "Entregar agora" e filtro rápido "Pendentes de entrega".
- Botões diretos **WhatsApp** e **E-mail** na seção "Enviar Arquivos" do
  pedido, com geração de links assinados (7 dias).
- Registro automático de **data, responsável e canal** a cada entrega; bloco
  verde de confirmação visual quando `status = arquivos_enviados`.
- **Histórico das últimas 5 entregas** por pedido (canal, arquivos, autor).
- Campo obrigatório **Faixa Foco** para EP e Álbum no envio de lançamentos,
  propagado para painel admin e e-mails de notificação.
- Banner inclusivo no topo do catálogo:
  *"Feita por mulheres para artistas mulheres · Inclusiva LGBTQIAPN+"*.

### Changed
- Preço padrão de cadastro de beats agora é **R$ 100,00**.
- Textos do site no feminino: link do menu **"Produtoras"** e descrição
  **"Catálogo oficial das produtoras da BRABA…"**.
- Ação primária do checkout passou de "enviar para WhatsApp" para
  "ENVIAR COMPROVANTE DE PAGAMENTO".
- E-mails de entrega passaram a incluir links da **Licença de Uso** e
  **Termos de Uso**.
- Página individual do beat: badge de tipo (Aberto/Fechado) agora aparece em
  linha própria, separado do nome da produtora.

### Removed
- Aceitação de **MP3** no envio de lançamentos (apenas WAV).
- Bloco **"WhatsApp Comercial: número"** do diálogo de compra.
- Botão de envio automático de informações da compra para o WhatsApp do
  cliente.

### Database
- `ALTER TABLE purchase_requests ADD COLUMN nome_artistico text`.
- `ALTER TABLE releases ADD COLUMN faixa_foco text`.

### Notas
- Notificações ao cliente seguem **manuais** (WhatsApp/E-mail disparados pelo
  admin). Apenas o fluxo de lançamentos possui notificações automáticas
  (recebimento, novo lançamento para admin, mudança de status).

---

## Promoções por Tipo de Beat (`2026-09-07`)

### Added
- Nova página **/admin/promocoes**: toggle liga/desliga por tipo de beat,
  formulário de promoção (`promo_valor`, `promo_link_pagamento`, início e
  expiração) e histórico completo de alterações.
- Colunas de promoção em `beat_types`
  (`promo_ativa`, `promo_valor`, `promo_link_pagamento`, `promo_inicio_em`,
  `promo_expira_em`) + tabela `beat_type_promo_history` (registra cada
  alteração com autor e horário).
- Exibição pública da promoção: card do beat e página do beat mostram selo
  **"Promoção por tempo limitado"** e preço **"de X por Y"** (cheio riscado).
- Compra respeita a promoção: `PurchaseDialog`, pedido gravado e e-mails
  (cliente/admin) usam o **preço efetivo** e o **link de pagamento promocional**.

### Changed
- Preço/link efetivos resolvidos por `src/lib/promo.ts`
  (`resolvePrecoEfetivo`): a promoção vale apenas quando
  `promo_valor < preço cheio` e o beat está dentro do intervalo
  `[promo_inicio_em, promo_expira_em]`. Fora disso ou com tipo parado, o valor
  original é mantido.
- Edição de tipo em **/admin/tipos-beat** preserva os campos de promoção atuais
  (não zera mais a promoção ao editar o tipo).

### Database
- `supabase/migrations/20260907180000_beat_types_promo.sql`:
  - `ALTER TABLE beat_types ADD COLUMN ...` (5 colunas de promoção).
  - `CREATE TABLE beat_type_promo_history` (id, beat_type_id, valores,
    changed_at, changed_by).
  - Índice por `beat_type_id`/`changed_at`.
  - RLS: admins podem inserir/selecionar no histórico.

---

## Melhorias futuras

- **Compactar comprovantes antes de enviar ao banco** (2026-09-07): as fotos de
  comprovante de pagamento (`purchase-receipts`, `storage.objects`) são enviadas
  em base64 cru e, com beats vendidos e imagens grandes, ocupam bastante espaço
  no banco e no storage. Ideia: redimensionar/recomprimir (ex.: JPEG/WebP de no
  máximo ~1000px, qualidade ~70) no cliente antes do upload, mantendo legibilidade
  do comprovante e reduzindo drasticamente o tamanho armazenado. Endpoints de
  upload já limitam a ~8 MB via base64; a compactação reduziria o custo de
  armazenamento e aceleraria o upload no celular.
