## Ajustes no formulário `/enviar-lancamento`

### 1. ISRC — opcional
- Remover obrigatoriedade no Zod (`isrc: z.string().trim().regex(isrcRegex).max(20).optional().or(z.literal(""))`).
- Label muda para "ISRC (opcional)" e remove asterisco.
- Texto auxiliar: "Se ainda não tiver, deixe em branco — geramos/atribuímos depois."
- Para EP/Álbum, vira "ISRCs (opcional)" — textarea livre, 1 por linha.

### 2. Upload de áudio → URL do Google Drive
- Remover totalmente os componentes de upload de áudio, o bucket `release-audio` deixa de ser usado pelo form (mantido no storage, sem mudança).
- Novo campo único: **"Link do Google Drive com a(s) música(s) *"** — `audio_drive_url`, tipo URL.
  - Validação: precisa ser uma URL `drive.google.com` ou `docs.google.com`.
  - Texto auxiliar: "Pode ser uma pasta com 1 ou várias faixas. Garanta que o link esteja como 'Qualquer pessoa com o link pode visualizar'."
- Server function: remover `audio_files[]` do schema; adicionar `audio_drive_url` em `releases` (nova coluna `audio_drive_url text`).
- `release_audio_files` deixa de ser populada pelo form (tabela permanece para histórico, sem alteração de schema).

### 3. Lógica Single vs EP/Álbum (campos adaptativos)
Renderização condicional baseada em `release_type`:

**Single (1 música):**
- "Nome da música *" (`release_name`)
- "Letra da música *" (`lyrics`) — textarea
- "ISRC (opcional)" — input único
- "Sobre a música *" (`about_release`)
- "Ficha técnica *" (`technical_sheet`) — "Quem produziu, mixou, masterizou esta música"

**EP / Álbum (várias músicas):**
- "Nome do EP/Álbum *" (`release_name`) — nome do projeto
- "Lista de músicas *" (`tracklist`) — textarea grande, placeholder "Uma música por linha, na ordem do projeto. Ex:\n1. Intro\n2. Faixa título\n3. ..."
  - Helper: "Liste todas as faixas que estão no link do Drive, na ordem oficial."
- "Letras *" (`lyrics`) — textarea grande, helper: "Cole as letras separando por faixa (ex: '## Faixa 1 - Nome' antes de cada letra)."
- "ISRCs (opcional)" — textarea, 1 por linha.
- "Sobre o EP/Álbum *" (`about_release`)
- "Ficha técnica *" — "Produção, mix e master de todas as faixas."

Os labels/legendas dos demais campos comuns (gêneros, moods, instrumentos, royalties, sobre o artista, fotos, capa) ficam iguais, mas com microcopy ajustada para refletir "projeto" em vez de "música" quando EP/Álbum.

### 4. Schema do banco (1 migração nova)
- `ALTER TABLE public.releases ADD COLUMN audio_drive_url text;`
- `ALTER TABLE public.releases ALTER COLUMN isrc DROP NOT NULL;` (se for NOT NULL hoje — confirmar; se já é nullable, pular).
- Sem mudar `release_audio_files` / `release_promo_photos`.

### 5. Server function `submitRelease`
- Trocar `audio_files` por `audio_drive_url` no schema Zod e no insert.
- ISRC: aceitar vazio/`null`.
- Validar URL do Drive no servidor (mesma regex do client).

### 6. Detalhe admin `/admin/lancamentos/$id`
- Substituir bloco "Áudios" por "Link do Google Drive": botão "Abrir no Drive" (link externo, target=_blank, rel=noopener).
- Mostrar tracklist (quando preenchida) em bloco separado para EP/Álbum.
- Esconder "Áudios" antigos quando não houver `release_audio_files` (registros novos não terão).

### 7. Fora de escopo
- Não baixar arquivos do Drive automaticamente.
- Não validar permissão pública do link.
- Não migrar releases antigos.

### Arquivos
- Migração SQL nova.
- `src/lib/releases.functions.ts` — schema + insert.
- `src/lib/releases.constants.ts` — helper de regex Drive.
- `src/routes/enviar-lancamento.tsx` — UI condicional, novo campo, novo tracklist.
- `src/routes/admin/_protected/lancamentos.$id.tsx` — mostrar link Drive + tracklist.
- `CHANGELOG.md`.
