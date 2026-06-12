# Sprint 8A — MVP Operacional de Lançamentos

Objetivo: substituir o Google Forms por um fluxo nativo já nesta semana. Foco em velocidade, simples e operacional.

## 1. Banco de dados (1 migração)

Tabela `releases`:
- Identificação: `email`, `full_name`, `cpf`, `artist_name`
- Lançamento: `release_type` (enum: `single` | `ep` | `album`), `release_name`, `lyrics`, `isrc`, `cover_path`
- Categorização: `genres text[]`, `moods text[]`, `instruments text[]`
- Conteúdo: `technical_sheet`, `royalties`, `about_artist`, `about_release`, `has_videoclip boolean`
- Status: `status` enum (`recebido` default, `em_analise`, `aprovado`, `distribuido`)
- created_at / updated_at + trigger

Tabela `release_audio_files`: `release_id`, `path`, `original_name`, `size_bytes`, `format` (wav|mp3), `order_index`.

Tabela `release_promo_photos`: `release_id`, `path`, `order_index`.

**RLS / GRANTs:**
- `releases`, `release_audio_files`, `release_promo_photos`: SELECT/UPDATE para admin (`has_role('admin')`); INSERT via service_role na server function pública.
- GRANT em todas para `authenticated` e `service_role`. Sem grant para `anon` (envio passa por serverFn com supabaseAdmin após validação).

## 2. Storage

Buckets privados novos:
- `release-covers` (imagens, até 10MB)
- `release-audio` (wav/mp3, até 100MB)
- `release-photos` (imagens, até 10MB, máx 10)

Policies: leitura via signed URL pelo admin; upload via signed URL emitido pela serverFn.

## 3. Formulário público `/enviar-lancamento`

Rota pública nova (`src/routes/enviar-lancamento.tsx`). Campos exatamente conforme o briefing, com:
- Validação Zod no client e no server.
- **Anti-spam**: honeypot + verificação de tempo mínimo de preenchimento (sem dependência externa de captcha).
- Tipo de lançamento:
  - Single → 1 arquivo de áudio
  - EP / Álbum → múltiplos arquivos
- Aceita `.wav` e `.mp3` (até 100MB cada).
- Listas fixas no código (`src/lib/releases.constants.ts`): gêneros, moods, instrumentos.
- Upload via signed URLs (mesmo padrão dos beats).
- Tela de sucesso após envio.

## 4. Server functions (`src/lib/releases.functions.ts`)

- `getReleaseUploadUrl({ kind: 'cover'|'audio'|'photo', ext, contentType })` — pública, valida MIME/extensão.
- `submitRelease({ ...campos, coverPath, audioFiles[], photoPaths[] })` — pública, valida tudo com Zod, anti-spam, insere com `supabaseAdmin`.
- `listReleases()` — protegida (`requireSupabaseAuth` + check admin).
- `getRelease(id)` — protegida; retorna dados + signed URLs para download.
- `updateReleaseStatus(id, status)` — protegida.
- `countNewReleases()` — protegida; conta status = `recebido`.

## 5. Backoffice `/admin/lancamentos`

Novo item no `AppSidebar` ("Lançamentos") com **badge** mostrando contagem de status `recebido` (via `useQuery` em `countNewReleases`, refetch a cada 60s).

- **Listagem** (`src/routes/admin/_protected/lancamentos.tsx`): Data | Artista | Nome do lançamento | Tipo | Status. Filtros por status. Ações por linha: Ver.
- **Detalhe** (`/admin/lancamentos/$id`): mostra todos os dados + capa + lista de áudios com botão "Baixar" (signed URL) + fotos de divulgação. Select para alterar status.

## 6. Entregáveis

- Substituir o Google Forms imediatamente, divulgando `/enviar-lancamento`.
- Backoffice operacional para receber, visualizar, baixar arquivos e mover status.
- Badge de novos lançamentos no menu.

## 7. Fora de escopo (não implementar)

Distribuidoras, royalties automáticos, contratos, automações, envio de e-mail/WhatsApp, login do artista.

## Detalhes técnicos

- Stack: TanStack Start + Supabase (já em uso). Server functions seguindo padrão atual (`*.functions.ts` + `supabaseAdmin` carregado dentro do handler).
- Validação: Zod compartilhada client/server.
- Uploads: `uploadToSignedUrl` (mesmo padrão de `BeatCoverUploader`).
- Anti-spam pragmático: campo honeypot oculto + timestamp; sem dependência externa nesta sprint.
- Relatório: `SPRINT_8A_REPORT.md` + entrada em `CHANGELOG.md`.
