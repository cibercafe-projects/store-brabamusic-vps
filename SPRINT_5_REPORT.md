# SPRINT 5 — Catálogo Público Real

## Escopo entregue

Substituição completa dos dados mockados por dados vivos do banco para o catálogo público da Braba Beats. Sem vendas, sem WhatsApp, sem leads, sem pagamentos.

### 1. Server functions públicas (`src/lib/catalog.functions.ts`)

Todas sem `requireSupabaseAuth`. Acessam o banco via `supabaseAdmin` carregado dinamicamente (padrão exigido para SSR de rotas públicas) e devolvem apenas dados seguros para visitantes:

- `listPublicBeats` — lista beats com `status = 'ativo'` (oculta `rascunho` e `vendido`). Suporta paginação (24 por página), busca por nome do beat / produtora / gênero / mood, filtro por gênero, filtro por slug da produtora e limite máximo de BPM.
- `getPublicBeatBySlug` — beat individual ativo + payload da produtora.
- `listPublicProducers` — produtoras ativas com contagem de beats ativos.
- `getPublicProducerBySlug` — produtora + lista de beats ativos dela.
- `listPublicFilters` — gêneros distintos e produtoras com pelo menos um beat ativo (para popular filtros e select de busca).

Imagens (capas e avatares) e prévias (áudio) são entregues como **signed URLs (TTL 4h)** dos buckets `beat-covers`, `producer-avatars` e `beat-previews`. Os campos `capa_url` e `preview_url` legados continuam aceitos como fallback quando não há `*_path` no Storage.

### 2. Catálogo (`/`)

- Loader Tanstack Query alimentando `useSuspenseQuery` (sem `useEffect + fetch`).
- Filtros e busca persistidos em URL (`validateSearch` + `useNavigate`):
  - `q` (busca livre)
  - `genero`
  - `produtora` (slug)
  - `bpmMax`
  - `page`
- Hero + grid 1/2/3/4 colunas responsivo.
- Paginação inferior quando `total > pageSize`.

### 3. Card do beat (`BeatCard`)

Mostra capa real, nome, produtora (com link para `/produtora/:slug`), gênero, BPM e preço formatado. Quando não há capa cadastrada, usa o fallback estilizado `BeatCoverFallback` com o nome do beat. CTA reduzido para **"Ver beat"** — sem botão de compra, interesse ou WhatsApp.

### 4. Player de prévia (`PlayerStore` + `PlayerBar`)

- Store rescrito para operar sobre `PublicBeat` real.
- `PlayerBar` agora usa um `<audio>` real com `ref` controlado pelo estado `playing`, eventos `onPlay/onPause/onEnded` sincronizando o store.
- Capa exibida no modal (com fallback estilizado).
- Quando o beat não tem prévia, o player ainda abre, mas exibe aviso "Sem prévia disponível" e oculta o botão play.

### 5. Página individual `/beat/:slug`

Rota pública alimentada por `getPublicBeatBySlug`. Exibe capa, prévia (play overlay), nome, gênero, BPM, tom, mood, preço, descrição e bloco da produtora com link para a página dela. Layout pronto para receber CTAs comerciais no futuro — atualmente sem nenhum botão de compra.

### 6. Página da produtora `/produtora/:slug`

Rota nova com hero (foto, bio, cidade, badges de gêneros, instagram e spotify) e grid de beats ativos via `BeatCard`. A rota antiga `/produtor/:slug` foi mantida apenas como `redirect` para `/produtora/:slug` por compatibilidade.

### 7. Página `/produtores`

Reescrita para listar produtoras reais (foto, cidade, bio, instagram, contagem de beats ativos). Link para `/produtora/:slug`.

### 8. Performance e robustez

- Imagens com `loading="lazy"`, `width`/`height` definidos e `onError` para sumirem caso o signed URL expire.
- Signed URLs com TTL de 4 horas (vs 1h no admin) para suportar sessões mais longas.
- Paginação no catálogo principal (24 beats por página).
- Loader Suspense para evitar layout shift / spinners duplos.
- Server fns retornam DTOs planos (sem objetos Supabase) — seguros para SSR.

## Pontos de atenção

1. **Signed URLs expiram em 4h.** Se um visitante deixar a aba aberta por mais tempo, capas e previews quebram silenciosamente (o `onError` apenas oculta a imagem; o `<audio>` falha no `play()`). Considerar tornar os buckets `beat-covers` e `producer-avatars` públicos (ou usar CDN com cache) na Sprint 6.
2. **Busca textual usa `ILIKE` simples** em nome / gênero / mood + match exato em `produtora_id`. Para catálogos maiores, evoluir para `to_tsvector` + GIN.
3. **Sem `<head>` dinâmico por beat ainda.** Cada beat/produtora deveria expor `head()` próprio com `og:image = capa_url` para link share decente — recomendado para Sprint 6.
4. **Rota legada `/produtor/:slug`** mantida como redirect; pode ser deletada quando não houver mais links externos apontando para ela.
5. **`BeatCard` quando preview e capa estão ambos vazios** mostra fallback, mas o overlay de play não aparece (sem áudio). Comportamento intencional.
6. **Sem RLS aplicado às rotas públicas** — usamos `supabaseAdmin` (service role) e projetamos colunas com cuidado. Nenhuma coluna sensível (`wav_url`, `stems_url`) é exposta nos endpoints públicos. Validar isso a cada nova coluna adicionada à tabela `beats`.
7. **Dados mock antigos** (`src/data/beats.ts`) permanecem no repositório porque a página `/app` (mockup de tela do app mobile) ainda os usa como ilustração estática. Podem ser removidos quando aquela tela for ligada a dados reais.

## Sugestões para Sprint 6

1. **Botão "Tenho interesse" / Leads.** Captura de e-mail + WhatsApp do interessado, persistida em tabela `leads` com `beat_id`. Painel admin para gestão.
2. **Integração WhatsApp Business Cloud API** para resposta automática + handoff humano.
3. **SEO por rota:** `head()` dinâmico em `/beat/:slug` e `/produtora/:slug` com OG image = capa do beat / foto da produtora.
4. **Buckets públicos + CDN** para capas/avatares (signed URL apenas para áudio premium futuro).
5. **Ordenação configurável** no catálogo (mais recentes, preço, BPM).
6. **Tracking básico** (play count, view count) para alimentar o dashboard admin.
7. **Sitemap.xml dinâmico** com todos os beats ativos e produtoras.

## Critérios de aceite

- [x] Catálogo público alimentado por dados reais.
- [x] Apenas beats com `status = ativo` aparecem.
- [x] Busca por nome / produtora / gênero.
- [x] Filtros por gênero e produtora (BPM opcional implementado).
- [x] Player reproduz prévias reais do Storage.
- [x] Página individual do beat funcional.
- [x] Página da produtora funcional.
- [x] Navegação completa usando dados reais.
- [x] Nenhum botão de compra / WhatsApp / interesse / lead.
