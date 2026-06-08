## Sprint 2 — Gestão de Produtoras

Módulo administrativo completo para cadastrar, editar, listar e ativar/desativar Produtoras Parceiras. Sem catálogo público, sem beats — apenas fundação.

### 1. Modelagem (tabela `public.producers`)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `slug` | text UNIQUE NOT NULL | gerado do nome, editável |
| `nome_artistico` | text NOT NULL | único obrigatório |
| `instagram` | text NULL | handle (`@fulano`), sem URL |
| `spotify` | text NULL | handle/artist id |
| `cidade` | text NULL |  |
| `bio` | text NULL |  |
| `foto_perfil_url` | text NULL | URL pública do bucket |
| `foto_perfil_path` | text NULL | path no bucket (para delete/replace) |
| `status` | `producer_status` enum NOT NULL DEFAULT `'ativa'` | `'ativa' \| 'inativa'` (desativação lógica, sem delete físico) |
| `created_at` / `updated_at` | timestamptz | trigger `updated_at` |

Índices: `slug` único, `status`, `nome_artistico` (busca).

Preparação Sprint 3: tabela pronta para FK `beats.producer_id → producers.id` (não criada agora). Documentado no relatório.

### 2. Storage

Bucket público `producer-avatars` (via `storage_create_bucket`). Policies em `storage.objects`:
- SELECT público (bucket público).
- INSERT/UPDATE/DELETE só para `has_role(auth.uid(), 'admin')` no bucket `producer-avatars`.

### 3. RLS

Tabela `producers`:
- `GRANT SELECT, INSERT, UPDATE ON public.producers TO authenticated` (sem DELETE — desativação lógica). `GRANT ALL ... TO service_role`.
- Policies: somente admins (via `has_role`) podem SELECT/INSERT/UPDATE. Leitura pública entra na Sprint do catálogo.

### 4. Server functions (`src/lib/producers.functions.ts`)

Todas com `requireSupabaseAuth` + verificação `has_role(admin)` no handler (via `supabaseAdmin` importado dinamicamente):
- `listProducers({ search?, status?, page?, pageSize? })` → `{ rows, total }`.
- `getProducer({ id })`.
- `createProducer(input)` — valida Zod, gera slug único.
- `updateProducer({ id, ...input })`.
- `setProducerStatus({ id, status })`.
- `getAvatarUploadUrl({ producerSlug, contentType })` → URL assinada de upload no bucket (`createSignedUploadUrl`) + path final.
- Após upload, `updateProducer` grava `foto_perfil_url` (publicUrl) + `foto_perfil_path`.

Validação Zod: `nome_artistico` 1–120, `instagram`/`spotify` opcionais regex `^@?[A-Za-z0-9._-]{1,40}$` (armazenado normalizado com `@`), `cidade` ≤ 80, `bio` ≤ 2000, `slug` `^[a-z0-9-]{2,60}$`.

### 5. UI — `/admin/_protected/produtoras`

Substitui o placeholder. Componentes:

- **`ProducersTable`**: Tabela shadcn com colunas Foto (Avatar), Nome Artístico, Instagram (link externo), Cidade, Status (Badge `ativa`/`inativa`), Ações (Editar, Ativar/Desativar).
  - Busca por nome (debounce 300ms, sincronizado em search param `q`).
  - Filtro status (`todas` | `ativa` | `inativa`).
  - Ordenação por `nome_artistico` ou `created_at`.
  - Paginação (20/página) se `total > 20`.
  - Estado vazio com CTA "Nova produtora".
- **Botão "Nova produtora"** no header → abre `Sheet` (slide-over) com `ProducerForm` em modo create.
- **`ProducerForm`** (react-hook-form + zod):
  - Avatar uploader: preview circular, botão "Trocar foto", drag-drop, validação tipo (jpg/png/webp) e tamanho (≤ 2MB). Faz upload imediato após selecionar via `getAvatarUploadUrl` e mostra preview.
  - Campos: Nome Artístico*, Slug (auto-gerado, editável, validação unique on blur), Instagram, Spotify, Cidade, Bio (Textarea), Status (Switch ativa/inativa).
  - Botões: Cancelar / Salvar.
- **Edição**: clique na linha (ou ação Editar) abre o mesmo `Sheet` em modo edit, pré-carregado.
- **Ativar/Desativar**: AlertDialog de confirmação → `setProducerStatus`.
- Toasts (sonner) para sucesso/erro. Invalidação do query key `['admin','producers',...]` após mutations.

Padrão visual: usa tokens existentes do admin (mesmas cores/spacing do `AppSidebar`/dashboard).

### 6. Sidebar

`AppSidebar` já tem item "Produtoras" — apenas garantir `isActive` em `/admin/produtoras`.

### 7. Relatório `SPRINT_2_REPORT.md`

- Estrutura criada (tabela, enum, storage, policies, server fns, rotas).
- Relacionamentos previstos: `beats.producer_id → producers.id` (NOT NULL, ON DELETE RESTRICT) na Sprint 3.
- Recomendações Sprint 3 (CRUD Beats): tabela `beats`, bucket `beat-audio` privado com signed URLs, player admin de pré-escuta, vínculo obrigatório a produtora ativa, tags/gênero/BPM/key, status (rascunho/publicado).
- Atualizar `CHANGELOG.md`.

### Detalhes técnicos

- Storage: `producer-avatars` público. Path por produtora: `producers/{producer_id}/avatar-{timestamp}.{ext}`. Ao trocar, deletar path antigo via `supabaseAdmin.storage.from().remove([oldPath])`.
- Slug: gerador no client (`slugify` simples — minúsculo, remove acentos, troca não-alfanum por `-`). Servidor revalida e, em caso de colisão no `create`, sufixa `-2`, `-3`...
- Instagram/Spotify normalização: trim, remove `https://`, força prefixo `@` quando ausente; aceita vazio.
- Migration única com: enum, tabela, índices, grants, RLS, policies, trigger updated_at. Storage bucket via tool dedicada, policies em migration separada.
- Queries (TanStack Query): `queryKey: ['admin','producers', { q, status, sort, page }]`. Mutations invalidam o prefixo `['admin','producers']`.

### Arquivos a criar/editar

Criar:
- `supabase/migrations/<ts>_producers.sql`
- `supabase/migrations/<ts>_producer_avatars_policies.sql`
- `src/lib/producers.functions.ts`
- `src/components/admin/producers/ProducersTable.tsx`
- `src/components/admin/producers/ProducerForm.tsx`
- `src/components/admin/producers/ProducerAvatarUploader.tsx`
- `src/lib/slug.ts`
- `SPRINT_2_REPORT.md`

Editar:
- `src/routes/admin/_protected/produtoras.tsx` (remove placeholder, monta página)
- `CHANGELOG.md`

### Fora de escopo (Sprint 2)

Catálogo público, beats, leads, dashboard real, gestão de outros admins, reset de senha, integrações externas.
