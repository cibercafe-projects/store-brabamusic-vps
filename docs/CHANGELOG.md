# Changelog

Todas as mudanças relevantes da plataforma são registradas neste arquivo.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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
