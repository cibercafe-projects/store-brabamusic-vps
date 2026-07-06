# Changelog

Histórico de alterações da plataforma **BRABA Beats** (`loja.brabamusic.com.br`).

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/). Versionamento por **sprint**, com as seções:

- **Added** — arquivos/funcionalidades novos
- **Changed** — alterações em código existente
- **Deactivated** — features desligadas via flag (código preservado)
- **Hidden** — elementos ocultados da UI (código preservado)
- **Preserved** — ativos intencionalmente mantidos para reaproveitamento
- **Docs** — documentação criada ou atualizada

---

## Sprint 13 — Textos Jurídicos globais

### Added

- **Nova aba "Textos Jurídicos"** em `/admin/textos-juridicos` (sidebar,
  ícone `FileText`), com 3 campos editáveis (Créditos, Registro da Obra e
  do Fonograma, Divisão de Royalties e Cadastro de Participação),
  persistidos em `app_settings` sob as chaves `legal_text_creditos`,
  `legal_text_registro`, `legal_text_royalties`.
- **Server functions** `getLegalTexts` / `updateLegalTexts` em
  `src/lib/legal-texts.functions.ts` (admin-only via `requireSupabaseAuth`).
- **Seed inicial** dos 3 textos padrão via migração
  (`INSERT ... ON CONFLICT DO NOTHING`).

### Changed

- **`createPurchaseRequest`** agora lê `legal_text_creditos/registro/royalties`
  de `app_settings` e congela os três textos vigentes no
  `license_snapshot` no momento da compra (mesma mecânica anterior, só
  muda a **fonte**). Licenças já emitidas continuam intactas.
- **`getBeatLicenseInfo`** passa a devolver os 3 textos jurídicos a partir
  de `app_settings` em vez de campos da produtora — o modal de compra
  continua exibindo o texto vigente sem mudança visual.
- **Cadastro de Produtoras** (`ProducerForm`, `producers.functions.ts`,
  rota `/admin/produtoras`): removidos os 3 campos `texto_creditos`,
  `texto_registro`, `texto_royalties`. A produtora segue com seus dados
  próprios (nome civil, CPF, nome para créditos, e-mails, etc.).
- **Páginas de licença** (`/licenca/$token` e
  `/admin/compras/$id/licenca`): removido o fallback para os campos da
  produtora; o `license_snapshot` é a única fonte para os 3 textos.

### Docs

- `docs/regras-de-negocio.md` §2.2 reescrita explicando a origem global
  dos textos jurídicos e o congelamento em `license_snapshot`.

### Preserved

- Colunas `producers.texto_creditos`, `producers.texto_registro`,
  `producers.texto_royalties` **permanecem no banco** para preservar
  dados históricos. Removidas em sprint futura de limpeza, mesma
  abordagem já adotada com `beats.tipo`.

---

## Sprint 12 — Tipos de Beat Configuráveis

### Added

- **Tabela `public.beat_types`** (`nome`, `slug` único, `descricao`,
  `valor_padrao`, `link_pagamento`, `inclui_stems`, `ativo`, `ordem`) com
  RLS: leitura para autenticados, gestão restrita a admins ativos. Seed
  inicial `fechado` (R$ 100 · WAV) e `aberto` (R$ 200 · WAV + Stems), com
  link inicial copiado do antigo `app_settings.payment_link`.
- **Rota `/admin/tipos-beat`** — CRUD completo (criar, editar, ativar,
  desativar, reordenar) no sidebar de Configurações.
- **FK `beats.beat_type_id`** referenciando `beat_types(id)` + backfill do
  legado `beats.tipo` (`aberto`/`fechado`) por slug.
- **Helper único `resolveBeatPayment(beat)`** em `src/lib/purchases.functions.ts`
  — fonte única de `{ valor, paymentLink, tipoNome, incluiStems }` para
  compra, WhatsApp, e-mail, popup e reenvio de instruções.
- Server fns em `src/lib/beat-types.functions.ts` e
  `listBeatTypesForBeatForm` em `src/lib/beats.functions.ts`.

### Changed

- **BeatForm** — Select "Tipo do beat" agora carrega opções ativas de
  `beat_types`. Ao selecionar/trocar tipo, o campo **Preço (R$)** é
  autopreenchido com `valor_padrao` (editável). Uploaders de STEMS e
  Licença aparecem apenas quando o tipo tem `inclui_stems = true`.
- **Fluxo de compra** (`startPurchase`, `getPurchaseSettings`,
  `resendPurchaseInstructions`) lê link e valor exclusivamente do tipo do
  beat. `app_settings.payment_link` deixou de ser lido pelo app (coluna
  mantida como legado).
- **Exibição pública** — `BeatCard` e `/beat/$slug` mostram o nome
  dinâmico do tipo (`tipo_nome`) em vez de rótulos hardcoded
  "Aberto"/"Fechado". `catalog.functions` passa a expor `tipo_nome` e
  `inclui_stems`.
- **Painel admin** (`/admin/beats`) — chips de download de STEMS e
  Licença agora dependem apenas da presença do arquivo, não do enum
  legado `tipo`.
- **Defaults de preço** em `beats.functions.ts` — quando `preco` vem
  vazio, usa `valor_padrao` do tipo (fallback 100/200 só se o tipo não
  tiver valor).

### Docs

- `docs/regras-de-negocio.md` §1.1 — reescrita para descrever tipos
  configuráveis (nome, valor, link, `inclui_stems`, ativo, ordem).

### Preserved

- Enum `beat_tipo` e coluna `beats.tipo` permanecem no banco como legado
  (deprecated). Código continua gravando `tipo` derivado de
  `inclui_stems` para compatibilidade. Remoção física fica para uma
  sprint futura após observação em produção.
- Coluna `app_settings.payment_link` mantida no schema — não é mais lida.

---

## Sprint 8A — MVP de Lançamentos

### Added

- **Tabelas `releases`, `release_audio_files`, `release_promo_photos`** com enums `release_type` (single/ep/album), `release_status` (recebido/em_analise/aprovado/distribuido) e `release_audio_format` (wav/mp3). RLS: somente admins; envio público via server fn com `supabaseAdmin`.
- **Buckets privados** `release-covers`, `release-audio` (até 100MB), `release-photos` (até 10 fotos, 10MB cada).
- **Rota pública `/enviar-lancamento`** — formulário nativo substituindo o Google Forms. Tipo de lançamento (Single = 1 áudio; EP/Álbum = múltiplos), gêneros/mood/instrumentos com listas fixas, capa, ISRC, letra, ficha técnica, royalties, sobre artista/música, videoclipe. Anti-spam por honeypot + tempo mínimo de preenchimento.
- **`/admin/lancamentos`** — listagem (data, artista, lançamento, tipo, status) com filtro/busca.
- **`/admin/lancamentos/$id`** — detalhe completo, alteração de status, download de áudios via signed URL, galeria de fotos de divulgação.
- **Badge no menu lateral** indicando lançamentos com status `recebido` (refetch a cada 60s).
- `src/lib/releases.constants.ts`, `src/lib/releases.functions.ts`.

---

## Sprint 7 — Fluxo Comercial e Gestão de Leads

### Added

- **Tabela `public.leads`** com campos `beat_id` (FK → `beats`, `ON DELETE CASCADE`), `nome`, `email`, `telefone`, `instagram`, `mensagem`, `status` (enum `lead_status`: `novo`, `contatado`, `negociacao`, `pago`, `entregue`, `perdido`). Índices em `beat_id`, `status` e `created_at DESC`. RLS: somente admins ativos (`is_admin_active`) gerenciam; inserções públicas passam pela server fn (`supabaseAdmin`), sem grant a `anon`.
- **Tabela `public.app_settings`** (chave/valor) com seed `whatsapp_number=''`. RLS restrita a admins ativos. Usada hoje para o número de WhatsApp comercial; preparada para crescer.
- **Server functions** em `src/lib/leads.functions.ts`:
  - `createLead` (público, sem auth) — valida com Zod, garante beat `ativo`, insere e devolve `{ leadId, whatsappNumber, beat, produtora }` para montar o link do WhatsApp no cliente.
  - `listLeads`, `updateLeadStatus`, `deleteLead` (admin) — busca textual em nome/e-mail/telefone/Instagram + filtro por status, com join leve em beat/produtora.
- **Server functions** em `src/lib/settings.functions.ts`: `getAppSettings`, `updateAppSettings` (admin only). Sanitiza o número de WhatsApp para apenas dígitos e `+` antes de gravar.
- **Componente reutilizável** `src/components/InterestForm.tsx` — `Dialog` shadcn com Nome*, E-mail*, Telefone*, Instagram, Mensagem, validação Zod no cliente, `useMutation` de TanStack Query e abertura do WhatsApp (`wa.me/{numero}?text=...`) após sucesso. Mensagem pré-preenchida com beat, produtora e dados do lead. Se o admin ainda não configurou o número, abre `wa.me/?text=...` para o usuário escolher.
- **Botão "Tenho interesse"** nos cards do catálogo (`BeatCard`) e na página individual do beat (`/beat/:slug`) — abre o `InterestForm` sem sair da página.
- **Backoffice `/admin/leads`** (substitui o placeholder): cards listando leads, busca por nome/e-mail/telefone/Instagram, filtro por status, alteração inline de status (`Select`), link para o beat relacionado (abre em nova aba), atalhos `mailto:` / `wa.me` / Instagram e remoção com `AlertDialog`.
- **Backoffice `/admin/configuracoes`** (substitui o placeholder): edição do número de WhatsApp comercial.
- **Dashboard** ganhou seção **"Funil comercial"** com 4 métricas: Total de Leads, Leads Novos, Em Negociação e Convertidos (pagos + entregues). `getAdminMetrics` foi estendido para incluir as agregações.

### Changed

- `getAdminMetrics` em `src/lib/beats.functions.ts` agora também retorna `leadsTotal`, `leadsNovos`, `leadsNegociacao`, `leadsConvertidos` — todas com queries `head: true` em paralelo (`Promise.all`).
- `BeatCard.tsx` reorganiza o rodapé: preço à esquerda, "Ver" + "Interesse" à direita (preserva o link existente para a página do beat).
- `src/routes/beat.$slug.tsx` agora destaca o CTA "Tenho interesse" ao lado de "Compartilhar".

### Notes

- Pagamento online, Mercado Pago, Stripe, checkout, entrega automática e contratos automáticos **não foram implementados** — venda continua manual via WhatsApp, conforme escopo da sprint.

---

## Sprint 6 — Governança Administrativa



### Added

- **Módulo de usuários administrativos** (`/admin/usuarios`): listagem, criação, edição (e-mail / senha), ativação/desativação e remoção de administradores. Acessível **somente para o super administrador** (item no menu lateral só aparece para ele e a rota mostra "Acesso restrito" para demais admins).
- **Server functions** em `src/lib/admin-users.functions.ts`: `listAdminUsers`, `createAdminUser`, `updateAdminUser`, `setAdminUserActive`, `deleteAdminUser`. Todas com guard `assertSuperAdmin` e uso da Auth Admin API via `supabaseAdmin`.
- **Níveis administrativos**: `admin` (gerencia produtoras, beats, dashboard) e **super_admin** (acrescenta gestão de usuários). Modelado por colunas booleanas `is_super` e `active` em `public.user_roles` — sem mexer no enum `app_role` (evita migração destrutiva).
- **Funções `is_super_admin(uuid)`** e **`is_admin_active(uuid)`** (`SECURITY DEFINER`) para uso em policies e checagens server-side.
- **Trigger `protect_super_admin`** em `public.user_roles` bloqueia:
  - `DELETE` de super admin,
  - rebaixamento (`is_super` `true` → `false`),
  - desativação (`active` `true` → `false`) de super admin,
  - troca de `role` de super admin.
- **Auto-promoção do dono técnico**: primeiro registro de admin existente foi promovido a super_admin pela migração; `bootstrapFirstAdmin` agora cria o primeiro admin já como super.
- **`checkAdminRole`** retorna `{ isAdmin, isSuperAdmin }` para condicionalmente exibir UI sensível.

### Changed

- `has_role(uuid, app_role)` agora exige `active = true` — usuários desativados perdem acesso imediato a produtoras/beats (RLS).
- `assertAdmin` em `producers.functions.ts` e `beats.functions.ts` passa a filtrar `active = true`.
- `AppSidebar` consulta `checkAdminRole` e renderiza o item **Usuários** apenas quando `isSuperAdmin === true`.

### Notes

- Exclusão de beats e produtoras (com confirmação e bloqueio por FK em produtoras com beats) já entregue no Pós-Sprint 5 — Sprint 6 apenas formaliza os requisitos no fluxo de governança.

---

## Pós-Sprint 5 — Ajustes & Hardening

### Added

- **Compartilhar beat** — `src/routes/beat.$slug.tsx` ganhou botão "Compartilhar" usando Web Share API com fallback para `navigator.clipboard` (copia URL canônica do beat). Toast de feedback.
- **Contador de plays por beat:**
  - Migração: coluna `beats.plays_count integer not null default 0` + RPC `public.increment_beat_plays(_beat_id uuid)` `SECURITY DEFINER` (incrementa atômico e devolve o novo total).
  - `incrementBeatPlays` em `src/lib/catalog.functions.ts` chama a RPC.
  - `PlayerStore` mantém `Set<string>` de beats já contados na sessão (evita inflar o contador em re-toques).
  - `PlayerBar` dispara o incremento ao primeiro `play` real do `<audio>` por beat.
  - `BeatCard` mostra o ícone ▶ + total formatado.
  - Admin (`/admin/beats`) exibe a coluna "Plays" na tabela de cadastro.
- **Exclusão de produtora** — `deleteProducer` em `src/lib/producers.functions.ts`. Bloqueia se houver beats vinculados (FK RESTRICT) e remove o avatar do bucket `producer-avatars`. Ação "Excluir" com `AlertDialog` em `/admin/produtoras`.
- **Exclusão de beat** — `deleteBeat` em `src/lib/beats.functions.ts`. Remove capa (`beat-covers`) e prévia (`beat-previews`) do Storage e apaga o registro. Item "Excluir beat" no dropdown de ações em `/admin/beats` com confirmação.
- Migração: nova policy `DELETE` em `public.beats` restrita a admins (`has_role(auth.uid(), 'admin')`).

### Security

- Findings `beats_producers_no_public_select` e `storage_no_public_read_beat_previews_covers` marcados como **ignored / by design** no scanner: o catálogo público é mediado server-side via `supabaseAdmin` em `catalog.functions.ts` (filtra `status = 'ativo'` e projeta apenas colunas seguras) e a mídia é entregue por **signed URL** (TTL 4h). Buckets seguem privados intencionalmente.
- `@security-memory` atualizado para refletir essa decisão.

---

## Sprint 5 — Catálogo Público Real

### Added

- `src/lib/catalog.functions.ts` — server functions públicas (sem auth) para o catálogo: `listPublicBeats`, `getPublicBeatBySlug`, `listPublicProducers`, `getPublicProducerBySlug`, `listPublicFilters`. Assinam capas / previews / avatares via signed URL (TTL 4h).
- `src/lib/catalog.types.ts` — tipos `PublicBeat` e `PublicProducer` compartilhados.
- `src/routes/produtora.$slug.tsx` — nova rota pública da produtora (foto, bio, redes, beats ativos).
- `SPRINT_5_REPORT.md`.

### Changed

- `src/routes/index.tsx` — catálogo agora consome `listPublicBeats`. Filtros (gênero, produtora, BPM máx) e busca persistidos em URL via `validateSearch`. Paginação no rodapé.
- `src/routes/beat.$slug.tsx` — alimentado por `getPublicBeatBySlug`. Sem CTAs comerciais (compra, WhatsApp, interesse) — layout pronto para Sprint 6.
- `src/routes/produtores.tsx` — lista produtoras reais com foto e contagem de beats ativos. Links agora apontam para `/produtora/:slug`.
- `src/routes/produtor.$slug.tsx` — convertida em `redirect` para `/produtora/:slug` (compat).
- `src/components/BeatCard.tsx` — aceita `PublicBeat`. Cobertura usa `BeatCoverFallback` quando ausente. CTA reduzido a "Ver beat".
- `src/components/PlayerBar.tsx` — `<audio>` real controlado por ref. Capa real + fallback. Mensagem amigável quando o beat não tem prévia.
- `src/components/PlayerStore.tsx` — store reescrito para `PublicBeat` (id-based). `useInterests` mantido como legado (feature flag off).

### Hidden

- Botões de compra, "Tenho interesse", WhatsApp e formulário de e-mail removidos do catálogo público. Reaparecerão na Sprint 6.

### Preserved

- `src/data/beats.ts` mantido — a tela `/app` (mockup do aplicativo) ainda usa como ilustração estática.
- `src/routes/meus-interesses.tsx` permanece desligado via `FEATURES.interests`.

### Docs

- `SPRINT_5_REPORT.md` com escopo, pontos de atenção e roadmap da Sprint 6.

---



## Sprint 4 — Infraestrutura de Mídia & Dashboard

### Added

- **Storage de capas** — bucket privado `beat-covers` (RLS admin-only). Server fn `getBeatCoverUploadUrl` (signed upload URL). Componente `src/components/admin/beats/BeatCoverUploader.tsx` com validação (jpg/jpeg/png/webp ≤ 5MB) e preview imediato. Nova coluna `beats.capa_path`; a capa anterior é removida do bucket ao trocar.
- **Storage de previews** — bucket privado `beat-previews` (RLS admin-only). Server fn `getBeatPreviewUploadUrl`. Componente `src/components/admin/beats/BeatPreviewUploader.tsx` (MP3/WAV ≤ 30MB, `<audio>` de teste). Nova coluna `beats.preview_path`; prévia anterior removida ao trocar.
- **Dashboard admin** — `/admin/dashboard` consome `getAdminMetrics`: total de produtoras (e ativas), total de beats, beats ativos, vendidos e rascunhos. Estrutura preparada para receber métricas de vendas/leads.
- **`BeatCoverFallback`** — fallback visual estilizado para beats sem capa, reaproveitado em `BeatCard`, `PlayerBar` e detalhe.
- `SPRINT_4_REPORT.md`.

### Changed

- `listBeats` / `getBeat` (admin) passaram a retornar `capa_signed_url` e `preview_signed_url` (TTL 1h).
- Server fn auxiliar `signBeatMedia` para reassinar paths sob demanda.
- `BeatForm` integrado aos novos uploaders.

### Preserved

- Colunas legadas `beats.capa_url` / `beats.preview_url` mantidas como fallback para importações externas.

### Docs

- `SPRINT_4_REPORT.md` com modelagem, segurança de Storage e sugestões para Sprint 5.

---

## Sprint 3 — Gestão de Beats

### Added

- Migração SQL:
  - Enum `public.beat_status` (`rascunho`, `ativo`, `vendido`).
  - Tabela `public.beats` (produtora_id FK RESTRICT, nome, slug único, genero, bpm, tom, mood, preco, descricao, status, capa_url, preview_url, wav_url, stems_url, timestamps).
  - Índices em `slug`, `produtora_id`, `status`, `created_at`, `nome`.
  - CHECKs: BPM 40–300, preço ≥ 0.
  - Trigger `set_updated_at` em `beats`.
  - RLS: SELECT/INSERT/UPDATE restritos a admins via `has_role`. Sem DELETE.
- `src/lib/beats.functions.ts` — server fns: `listBeats`, `getBeat`, `createBeat`, `updateBeat`, `setBeatStatus`, `listProducersForSelect`. Validação de produtora ativa em create/update.
- `src/components/admin/beats/BeatForm.tsx` — formulário react-hook-form + zod, com select de produtora ativa e campos URL placeholder.
- Página `/admin/beats` reescrita: tabela com capa, nome, produtora, gênero, preço, status, busca, filtros por status e produtora, paginação, sheet de criação/edição, dropdown de mudança de status com confirmação para "vendido".

### Docs

- `SPRINT_3_REPORT.md` — relatório da sprint com modelagem, relacionamento e sugestões para Sprint 4.

---

## Sprint 2 — Gestão de Produtoras


### Added

- Migração SQL:
  - Enum `public.producer_status` (`ativa`, `inativa`).
  - Tabela `public.producers` (slug único, nome_artistico, instagram, spotify, cidade, bio, foto_perfil_path, status, timestamps).
  - Índices em `slug`, `status` e `nome_artistico`.
  - Trigger `set_updated_at` em `producers`.
  - RLS: SELECT/INSERT/UPDATE restritos a admins via `has_role`. Sem DELETE (desativação lógica).
- Storage:
  - Bucket privado `producer-avatars`.
  - Policies admin-only para leitura/upload/update/delete em `storage.objects`.
- `src/lib/producers.functions.ts` — server fns: `listProducers`, `getProducer`, `createProducer`, `updateProducer`, `setProducerStatus`, `getAvatarUploadUrl`.
- `src/lib/slug.ts` — utilitário `slugify`.
- `src/components/admin/producers/ProducerForm.tsx` — formulário react-hook-form + zod.
- `src/components/admin/producers/ProducerAvatarUploader.tsx` — upload via signed URL.
- Página `/admin/produtoras` reescrita: tabela com busca, filtro de status, paginação, sheet de criação/edição e confirmação de ativação/desativação.

### Docs

- `SPRINT_2_REPORT.md` — relatório da sprint com estrutura, segurança, dívidas e proposta para Sprint 3 (CRUD Beats).

---

## Sprint 1 — Fundação do Backoffice Administrativo

### Added

- **Lovable Cloud** habilitado (backend gerenciado: Auth + Postgres).
- Migração SQL:
  - Enum `public.app_role` (apenas `admin` por enquanto).
  - Tabela `public.user_roles` (com RLS — usuário só lê seus próprios papéis).
  - Função `public.has_role(uuid, app_role)` `SECURITY DEFINER` restrita a `service_role`.
- `src/lib/admin.functions.ts` — server fns: `checkAdminRole`, `adminBootstrapNeeded`, `bootstrapFirstAdmin` (cria o primeiro admin se ainda não existir nenhum).
- `src/components/admin/AppSidebar.tsx` — sidebar do backoffice (shadcn).
- `src/components/admin/Placeholder.tsx` — componente "Tela em desenvolvimento".
- Rotas administrativas:
  - `src/routes/admin/route.tsx` — shell vazio (apenas `<Outlet />`).
  - `src/routes/admin/index.tsx` — redireciona `/admin` → `/admin/dashboard`.
  - `src/routes/admin/login.tsx` — login Admin (e-mail+senha) com bootstrap do primeiro admin.
  - `src/routes/admin/_protected/route.tsx` — layout protegido (gate de sessão + role `admin`) com sidebar e topbar.
  - `src/routes/admin/_protected/{dashboard,produtoras,beats,leads,configuracoes}.tsx` — placeholders.
- Auth configurada: e-mail confirmado automaticamente, HIBP password check ativo.
- `Toaster` (sonner) montado globalmente em `__root.tsx`.

### Changed

- `src/routes/__root.tsx` — `Header`, `Footer` e `PlayerBar` agora só renderizam **fora** de `/admin`. Backoffice tem layout totalmente isolado.

### Docs

- `SPRINT_1_REPORT.md` — arquitetura, decisões, dívidas e roadmap da Sprint 2.
- `.lovable/plan.md` — escopo da Sprint 1.

---



## Sprint 0 — Limpeza de escopo e preparação do MVP

> Princípio da sprint: **nada foi deletado**. Tudo que sai do MVP foi desativado por flag central ou ocultado condicionalmente na UI.

### Added

- `src/config/features.ts` — flags centrais do MVP:
  - `auth: false` — login passwordless do cliente
  - `interests: false` — favoritos / "Meus interesses"
  - `appPromo: false` — promoção e links do aplicativo
- `SPRINT_0_REPORT.md` — relatório completo de auditoria da sprint.
- `README.md` — visão geral do projeto, stack e como rodar.
- `REQUIREMENTS.md` — inventário detalhado das funcionalidades da Fase 1.

### Added (adicional — Footer)

- `src/components/Footer.tsx` — rodapé global com seção CTA ("🎵 Procurando o beat ideal?"), grid de 4 colunas (Braba Music / Navegação / Contato / Plataforma) e barra inferior de copyright.
- `src/routes/__root.tsx` — montagem do `<Footer />` entre `<main>` e `<PlayerBar />`.
- Placeholders configuráveis de contato (Instagram, WhatsApp, e-mail) centralizados no topo do componente — serão movidos para o backoffice na Sprint 1.
- Sem novas flags; nada desativado ou oculto por este adicional.

### Added (adicional — Páginas institucionais)

- `src/routes/politica-privacidade.tsx` — página padrão de Política de Privacidade (LGPD, cookies, direitos do titular, contato).
- `src/routes/termos-uso.tsx` — página padrão de Termos de Uso (aceitação, licenciamento, uso adequado, propriedade intelectual).
- `src/components/Footer.tsx` — links "Política de Privacidade" e "Termos de Uso" agora apontam para as novas rotas via `<Link>`; link "Suporte" reaproveita o WhatsApp comercial (`CONTACT.whatsapp`).
- Conteúdo textual é genérico/padrão — deve ser revisado pelo jurídico antes do go-live.

### Changed

- `src/components/AuthStore.tsx` — `requireAuth()` virou *no-op* quando `FEATURES.auth = false` (executa a ação direto, sem abrir `AuthModal`).
- `src/routes/como-funciona.tsx` — reescrito para o fluxo MVP de 5 passos: **Catálogo → Prévia → WhatsApp → Pagamento manual → Entrega manual**. FAQ ajustado (removidas menções a cadastro/senha).
- `src/routes/beat.$slug.tsx` — CTA principal agora é **"Tenho interesse — falar no WhatsApp"** (link direto). Botões dependentes de auth/interests só aparecem com as flags ligadas.
- `src/routes/meus-interesses.tsx` — exibe placeholder **"Em breve"** + CTA de voltar ao catálogo quando `FEATURES.interests = false`.
- `src/components/Header.tsx` — renderização condicional dos blocos de auth, interesses e app.
- `src/components/BeatCard.tsx` — botão de favoritar (coração) renderizado apenas com `FEATURES.interests`.

### Deactivated (flag off)

| Feature | Flag | Comportamento atual |
|---|---|---|
| Login passwordless do cliente | `FEATURES.auth` | `requireAuth` no-op; `AuthModal` não montado. |
| Favoritos / Interesses | `FEATURES.interests` | UI escondida; store `useInterests` intacta. |
| Promoção do app | `FEATURES.appPromo` | Sem links no Header / Home / Como funciona. |

### Hidden (UI)

- Bloco **Entrar / avatar / logout** no `Header` (desktop e mobile).
- Link **Interesses** + badge de contador no `Header`.
- Botão de **coração** (favoritar) em `BeatCard`.
- Links e menções ao **app** no Header, Home e Como funciona.
- Gate visual de login em `/meus-interesses` e nas CTAs de beat.

### Preserved (não deletado, pronto para reativar)

- `src/components/AuthModal.tsx`
- `src/components/AuthStore.tsx` (apenas `requireAuth` agora respeita a flag)
- `src/components/PlayerStore.tsx` — `useInterests` intacto
- Rotas `/app` e `/meus-interesses` (acessíveis por URL direta)
- Persistência `localStorage`: `braba-user`, `braba-interests`

### Docs

- Plano da sprint em `.lovable/plan.md`.
- Relatório completo em `SPRINT_0_REPORT.md` (dependências, impactos futuros, sugestão de Sprint 1).
- Inventário de funcionalidades em `REQUIREMENTS.md`.

---

## Próximos passos — Sprint 1 (planejada)

**Backoffice Administrativo** com Lovable Cloud:

- Auth admin (e-mail + senha) com `user_roles` separada e `has_role()` security definer.
- Rotas em `src/routes/admin/`: `login`, dashboard, CRUD de produtoras/beats, leads, configurações.
- Tabelas: `producers`, `beats`, `licenses`, `leads`, `user_roles`.
- Storage: buckets `covers` e `previews` (públicos), `masters` (privado, signed URL).
- Catálogo público passa a ler do banco em vez de `src/data/beats.ts` (mantido como seed).

Detalhes completos em `SPRINT_0_REPORT.md` → seção "Sugestão de estrutura — Sprint 1".
