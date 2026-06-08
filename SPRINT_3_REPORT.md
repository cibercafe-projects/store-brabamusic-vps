# Sprint 3 — Gestão de Beats

## Modelagem criada

### Enum
- `public.beat_status`: `rascunho` | `ativo` | `vendido`

### Tabela `public.beats`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `produtora_id` | uuid NOT NULL | FK → `producers(id)` ON DELETE RESTRICT |
| `nome` | text NOT NULL | obrigatório |
| `slug` | text UNIQUE NOT NULL | auto-gerado, editável |
| `genero` | text NULL |  |
| `bpm` | int NULL | CHECK 40–300 |
| `tom` | text NULL |  |
| `mood` | text NULL |  |
| `preco` | numeric(10,2) NULL | CHECK ≥ 0 |
| `descricao` | text NULL |  |
| `status` | beat_status NOT NULL | default `rascunho` |
| `capa_url` / `preview_url` / `wav_url` / `stems_url` | text NULL | placeholders p/ upload Sprint 4 |
| `created_at` / `updated_at` | timestamptz | trigger `set_updated_at` |

### Índices
- `beats_slug_key` (unique)
- `beats_produtora_id_idx`
- `beats_status_idx`
- `beats_created_at_idx` (DESC)
- `beats_nome_idx`

### Segurança (RLS)
- `GRANT SELECT, INSERT, UPDATE` para `authenticated`; `GRANT ALL` para `service_role`.
- Sem DELETE — desativação lógica via status.
- Policies: SELECT/INSERT/UPDATE apenas para admins (`has_role(auth.uid(),'admin')`).

## Relacionamento com produtoras

```
Producer (1) ────< (N) Beat
            produtora_id (NOT NULL, ON DELETE RESTRICT)
```

Regras adicionais aplicadas no servidor (server fns):
- `createBeat` e `updateBeat` validam que a `produtora_id` referencia uma produtora com `status = 'ativa'`.
- Não é possível remover uma produtora que possua beats (RESTRICT).

## Server functions — `src/lib/beats.functions.ts`
- `listBeats({ search, status, produtoraId, sort, page, pageSize })`
- `getBeat({ id })`
- `createBeat(input)`
- `updateBeat({ id, ...input })`
- `setBeatStatus({ id, status })`
- `listProducersForSelect()` — produtoras ativas

Todas exigem auth (`requireSupabaseAuth`) + checagem `has_role('admin')`.

## UI administrativa
- Rota: `/admin/beats`
- Lista com colunas: capa, nome, produtora, gênero, preço (BRL), status, ações
- Busca por nome (debounce nativo do input + invalidação por queryKey)
- Filtros: status e produtora
- Paginação 20/página
- Sheet de criação/edição com `BeatForm` (react-hook-form + zod)
- Dropdown de ações para mudar status (rascunho/ativo/vendido)
- AlertDialog de confirmação ao marcar como `vendido`

## Sugestões para Sprint 4

### Uploads reais
- Storage público `beat-covers` (capas, 2MB max).
- Storage privado `beat-audio` (preview público via signed URL curta; WAV/stems liberados após venda).
- Reutilizar padrão `getAvatarUploadUrl` de produtoras (signed upload URL + path).
- Substituir campos URL livres do `BeatForm` por uploaders dedicados.

### Player administrativo
- Componente de pré-escuta usando `preview_url` (signed URL).
- Waveform leve opcional (wavesurfer.js) — avaliar custo de bundle.

### Catálogo público
- Rota pública `/beats` + `/beat/$slug` (atualmente já existe `routes/beat.$slug.tsx` legado).
- Server fn pública `listPublicBeats` admin-elevada via `supabaseAdmin`, projetando apenas campos seguros e filtrando `status = 'ativo'` + `producer.status = 'ativa'`.
- Não adicionar policy `TO anon` na tabela — manter acesso público somente via server fn.

### Dashboard
- Métricas: total de beats por status, top produtoras, novos por período.
- Server fn `getAdminMetrics` (read-only, admin).

### Outras melhorias
- Tags (array text) para beats.
- Versionamento de preços/histórico.
- Soft delete dedicado (`deleted_at`) caso o produto precise de uma 4ª categoria além de status.
- Auditoria mínima (`updated_by`).

## Fora do escopo desta sprint
Catálogo público, uploads reais, player de áudio, pagamentos, entrega automática, favoritos, automações, integração com app cliente, dashboard real.
