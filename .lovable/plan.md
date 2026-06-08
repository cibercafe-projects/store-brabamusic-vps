## Sprint 3 — Gestão de Beats

Módulo administrativo de Beats. Toda Beat pertence obrigatoriamente a uma Produtora ativa cadastrada na Sprint 2. Sem catálogo público, sem uploads, sem pagamentos — apenas fundação sólida.

### 1. Modelagem — tabela `public.beats`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `produtora_id` | uuid NOT NULL | FK → `producers(id)` ON DELETE RESTRICT |
| `nome` | text NOT NULL | 1–160 |
| `slug` | text UNIQUE NOT NULL | auto-gerado, editável |
| `genero` | text NULL | ex.: trap, drill, funk |
| `bpm` | int NULL | 40–300 (CHECK imutável, ok) |
| `tom` | text NULL | ex.: `C minor`, `F#` |
| `mood` | text NULL | ex.: dark, melódico |
| `preco` | numeric(10,2) NULL | ≥ 0 |
| `descricao` | text NULL | ≤ 2000 |
| `status` | `beat_status` enum NOT NULL DEFAULT `'rascunho'` | `ativo` \| `vendido` \| `rascunho` |
| `capa_url` | text NULL | URL simples (placeholder p/ uploads Sprint 4) |
| `preview_url` | text NULL | idem |
| `wav_url` | text NULL | idem |
| `stems_url` | text NULL | idem |
| `created_at` / `updated_at` | timestamptz | trigger `set_updated_at` |

Enum novo: `beat_status` (`ativo`, `vendido`, `rascunho`).

Índices: `slug` único, `produtora_id`, `status`, `created_at desc`, `nome` (busca).

Regras de status (documentadas; aplicação na UI):
- `rascunho`: padrão ao criar; fora de catálogo futuro.
- `ativo`: visível no catálogo público (Sprint futura).
- `vendido`: marcado quando concluída venda; será ocultado do catálogo.

Sem delete físico. Validação `produtora_id` deve referenciar produtora `ativa` (server fn checa antes de insert/update).

### 2. RLS e grants

```sql
GRANT SELECT, INSERT, UPDATE ON public.beats TO authenticated;
GRANT ALL ON public.beats TO service_role;
-- sem GRANT anon (catálogo público vem depois com server fn admin-elevada)
```

Policies idênticas ao padrão Sprint 2: somente `has_role(auth.uid(),'admin')` para SELECT/INSERT/UPDATE. Sem DELETE.

### 3. Server functions — `src/lib/beats.functions.ts`

Todas com `requireSupabaseAuth` + checagem `has_role(admin)` via `supabaseAdmin` importado dinamicamente (mesmo padrão de `producers.functions.ts`).

- `listBeats({ search?, status?, produtoraId?, sort?, page?, pageSize? })` → `{ rows, total }`. Join leve com produtoras (nome_artistico, foto_perfil_url) — feito via segunda query por ids ou via select com `producers(nome_artistico, foto_perfil_url)` se RLS permitir; preferir buscar produtoras separadamente e mapear em memória para evitar dependências de join.
- `getBeat({ id })`.
- `createBeat(input)` — valida Zod, exige `produtora_id` de produtora `ativa`, gera slug único (`-2`, `-3`... em colisão).
- `updateBeat({ id, ...input })` — mesma validação.
- `setBeatStatus({ id, status })` — `ativo` \| `vendido` \| `rascunho`.
- `listProducersForSelect()` — lista produtoras `ativa` (id, nome_artistico) para o select do formulário.

Zod:
- `nome`: 1–160
- `slug`: `^[a-z0-9-]{2,80}$`
- `genero`/`tom`/`mood`: ≤ 60
- `bpm`: int 40–300 opcional
- `preco`: number ≥ 0, ≤ 99999.99, opcional
- `descricao`: ≤ 2000
- `*_url`: `z.string().url().max(500)` opcional (aceita vazio → null)

### 4. UI — `/admin/_protected/beats`

Substitui o placeholder. Componentes:

- **`BeatsTable`** (shadcn Table):
  - Colunas: Capa (Avatar 40px, fallback ícone), Nome, Produtora (nome_artistico), Gênero, Preço (formatado BRL), Status (Badge variantes por status), Ações (Editar, Status menu).
  - Busca por nome (debounce 300ms, query param `q`).
  - Filtro `status` (`todas` | `ativo` | `vendido` | `rascunho`).
  - Filtro `produtoraId` (Select alimentado por `listProducersForSelect`).
  - Ordenação por `created_at` ou `nome`.
  - Paginação 20/página.
  - Estado vazio com CTA "Novo beat" (desabilitado com aviso se não houver produtora ativa).

- **Header**: botão "Novo beat" → abre `Sheet` com `BeatForm` em modo create. Se zero produtoras ativas, exibir Alert com link para `/admin/produtoras`.

- **`BeatForm`** (react-hook-form + zod):
  - Produtora* (Select com produtoras ativas)
  - Nome do Beat* (Input)
  - Slug (auto-gerado de `nome`, editável)
  - Gênero, Tom, Mood (Input)
  - BPM (Input number)
  - Preço (Input number, step 0.01)
  - Descrição (Textarea)
  - Status (Select: rascunho/ativo/vendido — default rascunho no create)
  - URLs: Capa, Preview, WAV, Stems (Inputs simples, placeholder "https://..." — mensagem informativa "Uploads reais virão na Sprint 4")
  - Botões: Cancelar / Salvar

- **Alterar status**: menu de Ações com Dropdown ("Marcar como ativo / vendido / rascunho") + `AlertDialog` de confirmação quando indo para `vendido`.

- **Toasts** (sonner) + invalidação `['admin','beats',...]` após mutations.

### 5. Sidebar

`AppSidebar` já possui item "Beats" — apenas garantir destaque ativo em `/admin/beats`.

### 6. Relatório `SPRINT_3_REPORT.md`

- Modelagem criada (tabela, enum, índices, FK).
- Relacionamento `beats.produtora_id → producers.id` (RESTRICT).
- Server fns, rotas, UI.
- Recomendações Sprint 4:
  - Storage privado `beat-audio` (preview público com signed URL curto, WAV/stems privados liberados após venda).
  - Storage público `beat-covers`.
  - Player admin de pré-escuta.
  - Catálogo público (server fn admin-elevada com projeção segura, filtros status='ativo').
  - Dashboard com métricas (totais por status, por produtora, novos por período).
- Atualizar `CHANGELOG.md`.

### Arquivos

Criar:
- `supabase/migrations/<ts>_beats.sql` (enum, tabela, FK, índices, grants, RLS, policies, trigger updated_at)
- `src/lib/beats.functions.ts`
- `src/components/admin/beats/BeatsTable.tsx`
- `src/components/admin/beats/BeatForm.tsx`
- `SPRINT_3_REPORT.md`

Editar:
- `src/routes/admin/_protected/beats.tsx` (remove placeholder, monta página)
- `CHANGELOG.md`
- `.lovable/plan.md`

### Fora de escopo (Sprint 3)

Catálogo público, uploads reais (capa/preview/WAV/stems ficam como URL texto), player de áudio, pagamentos, entrega de arquivos, favoritos, automações, dashboard real, integração com app cliente.
