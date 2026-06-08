# Sprint 2 — Gestão de Produtoras

## Objetivo

Entregar o primeiro módulo de negócio do backoffice: CRUD completo de Produtoras Parceiras, base obrigatória para o futuro cadastro de Beats.

## Estrutura entregue

### Banco de dados

```
public.producer_status         enum ('ativa','inativa')
public.producers               tabela principal
  id uuid PK
  slug text UNIQUE             usado em URLs públicas (Sprint 3+)
  nome_artistico text NOT NULL
  instagram text               handle normalizado (@xxx)
  spotify text                 handle normalizado (@xxx)
  cidade text
  bio text
  foto_perfil_url text         (reservado para futura URL pública)
  foto_perfil_path text        caminho no bucket privado
  status producer_status DEFAULT 'ativa'
  created_at / updated_at      timestamptz (trigger set_updated_at)

Índices: slug UNIQUE, status, nome_artistico
```

### Storage

- Bucket privado **`producer-avatars`** (workspace bloqueia buckets públicos).
- Policies em `storage.objects`: leitura, upload, update e delete restritos a `has_role(auth.uid(), 'admin')` no bucket.
- URLs assinadas (1h) geradas no backend para exibir as fotos no admin.
- Upload direto do browser via `createSignedUploadUrl`.

### Segurança (RLS)

- RLS habilitada em `public.producers`.
- Policies: SELECT/INSERT/UPDATE só para admins.
- Sem policy de DELETE — desativação é lógica (status='inativa'); apagar registro requer service_role.
- Grant `SELECT, INSERT, UPDATE` para `authenticated`; `ALL` para `service_role`. Sem grant para `anon`.

### Server functions (`src/lib/producers.functions.ts`)

Todas usam `requireSupabaseAuth` + `assertAdmin` (verifica `user_roles` antes de executar).

| Função | Método | Descrição |
|---|---|---|
| `listProducers` | POST | busca + filtro de status + paginação; assina URL da foto |
| `getProducer` | POST | detalhe |
| `createProducer` | POST | valida Zod, gera slug único |
| `updateProducer` | POST | atualiza campos, regenera slug, remove foto antiga |
| `setProducerStatus` | POST | ativar/desativar |
| `getAvatarUploadUrl` | POST | retorna signed upload URL + path |

### UI

- Rota: `/admin/produtoras` (substitui o placeholder da Sprint 1).
- Tabela shadcn com: Foto, Nome, Instagram (link externo), Cidade, Status (badge), Ações.
- Busca por nome (server-side, ilike).
- Filtro de status (todas / ativa / inativa).
- Paginação (20 por página, aparece automaticamente acima de 20).
- Sheet lateral para criar/editar com formulário react-hook-form + zod.
- Avatar uploader com preview, validação de tipo (JPG/PNG/WEBP) e tamanho (≤2MB).
- AlertDialog de confirmação para ativar/desativar.
- Toasts (sonner) em todas as mutations.
- Slug auto-gerado a partir do nome (editável).

## Relacionamentos previstos

Para a Sprint 3, a tabela `beats` deverá ter:

```sql
producer_id uuid NOT NULL REFERENCES public.producers(id) ON DELETE RESTRICT
```

Não criado nesta sprint. A arquitetura atual já suporta o relacionamento (`producers.id` UUID, status para filtrar produtoras ativas no select de beats).

## Como usar

1. Login em `/admin/login`.
2. Acessar **Produtoras** na sidebar.
3. Clicar **Nova produtora** → preencher → salvar.
4. Na linha: **Editar** ou **Desativar/Ativar**.

## Dívidas e atenção

- Bucket é privado por política do workspace. Para o catálogo público (Sprint do catálogo), será necessário ou habilitar buckets públicos, ou montar uma rota pública que retorne signed URL para a foto da produtora ativa.
- Não há reordenação de listas (ordering fixo por `created_at desc`). Pode entrar depois.
- Não há ordenação por colunas clicáveis no header — entra junto com filtros avançados.
- Validação de unicidade de `nome_artistico` no client é só pelo slug; nomes idênticos com slugs diferentes são permitidos (decisão proposital).
- Sem export CSV.

## Sprint 3 — Sugestão de escopo (CRUD Beats)

1. Tabela `public.beats`:
   - `id`, `slug` UNIQUE, `producer_id` FK NOT NULL → `producers.id`, `titulo`, `bpm`, `tom`, `genero`, `tags text[]`, `audio_path`, `audio_duracao_segundos`, `capa_path`, `preco_centavos`, `status` enum (`rascunho`, `publicado`, `arquivado`), `created_at`, `updated_at`.
   - RLS: admin pode tudo; catálogo público filtra `status='publicado'` e `producer.status='ativa'`.
2. Bucket privado `beat-audio` (áudio master) com signed URLs.
3. Bucket privado `beat-covers` para capas.
4. Server fns: `listBeats`, `getBeat`, `createBeat`, `updateBeat`, `setBeatStatus`, signed URL para upload de áudio/capa.
5. UI `/admin/beats`:
   - Tabela com filtro por produtora, status, gênero.
   - Form com select de **produtora ativa** (obrigatório), uploads de áudio e capa, player admin de pré-escuta.
   - Validação: arquivo de áudio MP3/WAV, capa quadrada ≥ 800px.
6. Página de detalhe da produtora no admin com a lista de beats vinculados (read-only).
7. Migração de placeholders em `src/data/beats.ts` para leitura do banco (manter mock como fallback até o catálogo público).

Critério de pronto: admin consegue cadastrar um beat vinculado a uma produtora ativa, com áudio e capa, e visualizá-lo na listagem filtrada por produtora.

---

**Fora do escopo desta sprint e continuam fora:** beats, leads, dashboard real, marketplace, pagamentos, integrações externas, catálogo público de produtoras, gestão de admins.
