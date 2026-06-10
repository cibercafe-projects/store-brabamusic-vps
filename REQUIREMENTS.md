# REQUIREMENTS — BRABA Loja de Beats

Inventário das funcionalidades **implementadas hoje** (após Sprint 5 + ajustes).
A Fase 1 mockada (`localStorage`, beats fictícios em `src/data/beats.ts`) foi substituída por backend real (Lovable Cloud) a partir da Sprint 1; o que ainda é mock está sinalizado explicitamente.

---

## A. Telas / Rotas

### Públicas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `src/routes/index.tsx` | **Catálogo público real.** Hero + busca, filtros por gênero, produtora e BPM máx, grid responsivo paginado (24/pg). Filtros e busca persistidos na URL via `validateSearch`. Mostra apenas beats com `status = ativo`. |
| `/beat/:slug` | `src/routes/beat.$slug.tsx` | **Detalhe do beat.** Capa real, prévia (signed URL), metadados (BPM, tom, mood, preço), descrição, bloco da produtora e botão **Compartilhar** (Web Share API + fallback clipboard). Sem CTA comercial nesta fase. |
| `/produtores` | `src/routes/produtores.tsx` | Lista produtoras ativas reais (foto, cidade, bio, Instagram, contagem de beats ativos). |
| `/produtora/:slug` | `src/routes/produtora.$slug.tsx` | Página individual da produtora com seus beats ativos. |
| `/produtor/:slug` | `src/routes/produtor.$slug.tsx` | Redirect 301 para `/produtora/:slug` (compat). |
| `/como-funciona` | `src/routes/como-funciona.tsx` | Fluxo MVP em 5 passos + FAQ. |
| `/app` | `src/routes/app.tsx` | Mockup mobile (phone frame). Ainda usa `src/data/beats.ts`. |
| `/meus-interesses` | `src/routes/meus-interesses.tsx` | Placeholder "Em breve" enquanto `FEATURES.interests = false`. |
| `/politica-privacidade`, `/termos-uso` | — | Páginas institucionais. |

### Backoffice administrativo (`/admin/*`)

Protegido por `_protected/route.tsx` (gate de sessão + role `admin`).

| Rota | Descrição |
|------|-----------|
| `/admin/login` | Login e-mail+senha. Bootstrap do primeiro admin se a tabela `user_roles` estiver vazia. |
| `/admin/dashboard` | Métricas: total de produtoras (ativas), total de beats, ativos, vendidos, rascunhos. |
| `/admin/produtoras` | CRUD de produtoras (tabela com busca, filtro de status, ativar/desativar, **excluir** com confirmação — bloqueado se houver beats vinculados). |
| `/admin/beats` | CRUD de beats (busca, filtros por status/produtora, paginação, mudança de status, upload de capa e prévia, contagem de plays na tabela, **excluir** com confirmação). |
| `/admin/leads`, `/admin/configuracoes` | Placeholders. |

---

## B. Backend (Lovable Cloud)

### Tabelas (`public`)

- **`user_roles`** — `(user_id, role app_role)` com unique. Enum `app_role` = `admin`. RLS: o usuário só lê os próprios papéis. Função `has_role(uuid, app_role)` `SECURITY DEFINER`.
- **`producers`** — `slug` único, `nome_artistico`, `instagram`, `spotify`, `cidade`, `bio`, `foto_perfil_path`, `status producer_status (ativa|inativa)`. RLS admin-only.
- **`beats`** — `slug` único, `produtora_id` FK RESTRICT, `nome`, `genero`, `bpm` (40–300), `tom`, `mood`, `preco` ≥ 0, `descricao`, `status beat_status (rascunho|ativo|vendido)`, `capa_path`, `preview_path`, `capa_url`/`preview_url` (legado), `plays_count int default 0`. RLS: SELECT/INSERT/UPDATE/DELETE admin-only via `has_role`.
- RPC **`increment_beat_plays(_beat_id)`** `SECURITY DEFINER` — incremento atômico de `plays_count`, devolve o novo total.

### Storage (buckets privados)

| Bucket | Conteúdo | Acesso |
|--------|----------|--------|
| `producer-avatars` | Fotos das produtoras | Admin: gerenciar. Público: via signed URL gerada server-side. |
| `beat-covers` | Capas dos beats | idem |
| `beat-previews` | Prévias MP3/WAV | idem |

Decisão de segurança: buckets **permanecem privados**; o catálogo público entrega assets via **signed URL** com TTL de 4h gerada em `src/lib/catalog.functions.ts`.

### Server functions

- `src/lib/admin.functions.ts` — `checkAdminRole`, `adminBootstrapNeeded`, `bootstrapFirstAdmin`, `getAdminMetrics`.
- `src/lib/producers.functions.ts` — `listProducers`, `getProducer`, `createProducer`, `updateProducer`, `setProducerStatus`, `deleteProducer`, `getAvatarUploadUrl`.
- `src/lib/beats.functions.ts` — `listBeats`, `getBeat`, `createBeat`, `updateBeat`, `setBeatStatus`, `deleteBeat`, `listProducersForSelect`, `getBeatCoverUploadUrl`, `getBeatPreviewUploadUrl`, `signBeatMedia`.
- `src/lib/catalog.functions.ts` (público, sem auth) — `listPublicBeats`, `getPublicBeatBySlug`, `listPublicProducers`, `getPublicProducerBySlug`, `listPublicFilters`, `incrementBeatPlays`. Projeta apenas colunas seguras (nunca `wav_url` / `stems_url`).

---

## C. Regras de negócio

### C.1 Visibilidade pública

- Apenas beats com `status = 'ativo'` aparecem no catálogo, na busca, em `/beat/:slug` e na página da produtora.
- Apenas produtoras com `status = 'ativa'` aparecem em `/produtores` e `/produtora/:slug`.
- Tentar acessar slug de rascunho/vendido ou produtora inativa → not found.

### C.2 Catálogo e busca

- Busca textual `ILIKE` em `beats.nome`, `beats.genero`, `beats.mood` + match por `produtora_id` (resolvido via `ILIKE` em `producers.nome_artistico`).
- Filtros combináveis: gênero, slug da produtora, `bpmMax`.
- Paginação 24/pg via `range`. Total devolvido por `count: 'exact'`.

### C.3 Player & contagem de plays

- Player popup (`PlayerBar`) com `<audio>` real controlado por ref. Capa real + fallback estilizado.
- Quando o beat não tem prévia, abre com aviso "Sem prévia disponível" e oculta o play.
- **Contagem de plays:** dispara `incrementBeatPlays` no primeiro `play` real do `<audio>` por beat por sessão (deduplicado via `Set` em memória). Exibida em `BeatCard` (▶ + total formatado) e na tabela admin.

### C.4 Compartilhamento

- `/beat/:slug` expõe botão **Compartilhar**: usa `navigator.share` quando disponível, caso contrário copia a URL canônica e mostra toast.

### C.5 Exclusão administrativa

- **Produtora:** soft-block — `deleteProducer` rejeita se existir qualquer beat com `produtora_id` apontando para ela (FK RESTRICT). Em caso de sucesso, remove o avatar do bucket.
- **Beat:** `deleteBeat` apaga o registro e os arquivos correspondentes em `beat-covers` e `beat-previews`.
- Ambas as ações exigem confirmação (`AlertDialog`) e estão restritas a admins.

### C.6 Autenticação

- **Admin:** Supabase Auth (e-mail+senha). E-mail auto-confirmado, HIBP password check ativo. Gate por `has_role(uuid, 'admin')`. Bootstrap do primeiro admin se `user_roles` estiver vazia.
- **Cliente final:** `FEATURES.auth = false`. `requireAuth` é no-op; `AuthModal` não é montado. Sem cadastro público nesta fase.

### C.7 Flags ativas (`src/config/features.ts`)

| Flag | Estado | Efeito |
|------|--------|--------|
| `auth` | `false` | Sem login do cliente final, sem `AuthModal`. |
| `interests` | `false` | Favoritos ocultos; store `useInterests` preservada. |
| `appPromo` | `false` | Sem promoção do app no Header / Home. |

---

## D. Design system

- Tema **dark** roxo BRABA (`#2a1458` → `#4a1f8c`), acentos magenta (`#e94db8`) e verde-limão (`#c8ff3b`).
- Tokens semânticos em `src/styles.css` (`oklch`).
- Tipografia: display graffiti para títulos, Inter para corpo.
- Utilitários: `.glass`, `.glow-magenta`, `.text-gradient`.
- Mobile-first; Header colapsa em `Sheet` (drawer).

---

## E. Segurança

- RLS habilitada em `user_roles`, `producers`, `beats`.
- `GRANT` explícitos em todas as tabelas públicas.
- Catálogo público acessado via `supabaseAdmin` server-side, projetando colunas seguras e filtrando por status.
- Buckets de mídia **privados**; acesso via signed URL (TTL 4h público, 1h admin).
- Auth admin com HIBP password check.
- Findings `beats_producers_no_public_select` e `storage_no_public_read_*` registrados como **by design** no `@security-memory`.

---

## F. O que NÃO está implementado (pós-Sprint 5)

- ❌ Pagamento automatizado (Pix, Stripe, Mercado Pago).
- ❌ Captura de leads / "Tenho interesse" (planejado para Sprint 6).
- ❌ Integração WhatsApp Business API.
- ❌ Envio real de e-mail transacional.
- ❌ Painel do produtor (acesso self-service da própria produtora).
- ❌ Contrato eletrônico para licença Exclusiva.
- ❌ Login do cliente final (passwordless ou senha) — desligado por flag.
- ❌ Sistema de favoritos público — desligado por flag.
- ❌ Sitemap.xml dinâmico, OG image por beat/produtora.
- ❌ Busca full-text (`to_tsvector` + GIN) — hoje usa `ILIKE`.
- ❌ Ordenação configurável no catálogo (preço, BPM, popularidade).

---

## G. Pendências antes do go-live público comercial

1. Substituir `WHATSAPP_NUMBER` placeholder em `src/data/beats.ts` quando reativar CTAs (Sprint 6).
2. Definir política de licenciamento por beat (hoje há apenas o campo `preco` único).
3. Revisar conteúdo jurídico em `/politica-privacidade` e `/termos-uso`.
4. Configurar domínio definitivo `loja.brabamusic.com.br`.
5. Definir estratégia de cache/CDN para signed URLs com TTL curto (ou liberar buckets como públicos).
