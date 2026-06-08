# Sprint 4 - Infraestrutura de Mídia e Dashboard

## Entregas

### Fase 1 — Upload de Capas
- Bucket privado `beat-covers` (RLS: somente admins gerenciam).
- Server fn `getBeatCoverUploadUrl` cria signed upload URL.
- Componente `BeatCoverUploader`: validação de tipo (jpg/jpeg/png/webp), tamanho (≤5MB), preview imediato.
- Coluna `beats.capa_path` armazena o path no bucket; capa antiga é removida ao trocar.

### Fase 2 — Upload de Previews
- Bucket privado `beat-previews` (RLS: somente admins gerenciam).
- Server fn `getBeatPreviewUploadUrl` cria signed upload URL.
- Componente `BeatPreviewUploader`: aceita MP3/WAV (≤30MB), player `<audio>` para preview.
- Coluna `beats.preview_path` armazena o path; preview antigo removido ao trocar.

### Fase 3 — Dashboard
Rota `/admin/dashboard` com `getAdminMetrics`:
- Total Produtoras (e quantas ativas)
- Total Beats
- Beats Ativos
- Beats Vendidos
- Rascunhos

Arquitetura preparada para acrescentar métricas (vendas, leads, conversão) somando ao retorno do server fn.

### Fase 4 — Preparação para Catálogo
- `listBeats` / `getBeat` retornam `capa_signed_url` e `preview_signed_url` (TTL 1h).
- Server fn auxiliar `signBeatMedia` pode reassinar paths sob demanda.
- Dados continuam normalizados (`produtora_id` FK, slug único por beat) prontos para consumo público na próxima sprint.

## Modelagem

`public.beats`
- Adicionado: `capa_path text`, `preview_path text`.
- Campos `capa_url` / `preview_url` mantidos para compatibilidade com importações externas (atualmente preenchidos vazios pelos uploads).

Buckets (storage.objects RLS):
- `beat-covers` — admins manage (USING + WITH CHECK has_role(admin)).
- `beat-previews` — admins manage (USING + WITH CHECK has_role(admin)).

## Sugestões para Sprint 5
1. **Catálogo público** (`/beats`, `/beat/$slug`, `/produtor/$slug`) lendo via server fns + `supabaseAdmin` com signed URLs cacheadas.
2. **Player global** consumindo `preview_signed_url`.
3. **OG/Twitter image** por beat usando a capa.
4. **Filtros públicos** por gênero/mood/BPM (índices já em `nome`, `status`, `created_at`).
5. **Telemetria** (plays, views) — começar com tabela `beat_events` para alimentar métricas no dashboard.
