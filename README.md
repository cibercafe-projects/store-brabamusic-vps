# BRABA — Loja de Beats

Catálogo online de beats do selo **BRABA Music**, com backoffice administrativo e vitrine pública alimentada por dados reais (Lovable Cloud). Hospedado em `loja.brabamusic.com.br`.

> **Preview:** https://store-brabamusic.lovable.app

---

## Sobre

Catálogo público de beats do selo **BRABA Music**, com backoffice administrativo completo (produtoras, beats, upload de mídia, dashboard) e vitrine pública alimentada por dados reais do **Lovable Cloud**.

A primeira fase mockada (`localStorage` + dados fictícios) foi substituída a partir da Sprint 1 por backend real. A fase atual (pós-Sprint 5) entrega o **catálogo público real** — sem CTAs comerciais ainda; vendas / leads / WhatsApp entram na Sprint 6.

---

## Stack

- **TanStack Start v1** (file-based routing, SSR) + **Vite 7**
- **React 19** + **TypeScript** strict
- **Tailwind CSS v4** (tokens semânticos `oklch` em `src/styles.css`)
- **shadcn/ui** + **lucide-react**
- **Zustand** — player + interesses (legado)
- **TanStack Query** — loaders com `ensureQueryData` + `useSuspenseQuery`
- **Lovable Cloud** (Supabase gerenciado) — Auth, Postgres com RLS, Storage privado
- Server logic via `createServerFn` (`@tanstack/react-start`)

---

## Estrutura

```
src/
├── routes/
│   ├── __root.tsx
│   ├── index.tsx                  # / — catálogo público real
│   ├── beat.$slug.tsx             # /beat/:slug (com botão Compartilhar)
│   ├── produtores.tsx             # /produtores
│   ├── produtora.$slug.tsx        # /produtora/:slug
│   ├── produtor.$slug.tsx         # redirect 301 → /produtora/:slug
│   ├── como-funciona.tsx
│   ├── app.tsx                    # mockup mobile (ainda mock)
│   └── admin/
│       ├── login.tsx
│       └── _protected/
│           ├── dashboard.tsx
│           ├── produtoras.tsx     # CRUD + excluir
│           ├── beats.tsx          # CRUD + upload + excluir + plays
│           ├── leads.tsx
│           └── configuracoes.tsx
├── components/
│   ├── Header.tsx, Footer.tsx, BeatCard.tsx, PlayerBar.tsx
│   ├── PlayerStore.tsx            # player + contagem de plays
│   └── admin/                     # forms, uploaders, sidebar
├── lib/
│   ├── catalog.functions.ts       # server fns públicas (catálogo + plays)
│   ├── beats.functions.ts         # admin: CRUD + storage + delete
│   ├── producers.functions.ts     # admin: CRUD + delete
│   └── admin.functions.ts         # auth admin + métricas
├── config/features.ts             # feature flags (auth/interests/appPromo)
└── styles.css
supabase/migrations/               # schema, RLS, RPCs, buckets
```

---

## Como rodar

```bash
bun install
bun dev
```

Acesse `http://localhost:5173`. O backoffice fica em `/admin`.

---

## Status atual (pós-Sprint 5)

- ✅ Backoffice administrativo (auth, dashboard, CRUD de produtoras e beats)
- ✅ Upload real de capas, prévias e avatares (Storage privado + signed URL)
- ✅ Catálogo público alimentado por dados reais
- ✅ Filtros (gênero, produtora, BPM) e busca persistidos em URL
- ✅ Player com `<audio>` real + contagem de plays por beat
- ✅ Página individual do beat com botão Compartilhar
- ✅ Página individual da produtora
- ✅ Exclusão de produtoras e beats no admin (com confirmação e limpeza de Storage)
- 🚧 CTAs comerciais (interesse, WhatsApp, pagamento) — planejado para Sprint 6

Veja [REQUIREMENTS.md](./REQUIREMENTS.md) e os relatórios `SPRINT_*.md`.

---

## Próximos passos sugeridos (Sprint 6+)

- Botão "Tenho interesse" + tabela `leads`
- Integração WhatsApp Business Cloud API
- SEO por rota (`head()` dinâmico, OG image por beat)
- Sitemap.xml dinâmico
- Ordenação configurável no catálogo
- Avaliar tornar buckets `beat-covers` e `producer-avatars` públicos (CDN)

---

Feito com 💜 pela equipe BRABA Music.
