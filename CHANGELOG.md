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
