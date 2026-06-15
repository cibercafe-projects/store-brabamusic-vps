# Envio de lançamentos — apenas WAV + Faixa Foco

## 1. Aceitar apenas WAV (remover MP3)

**`src/lib/releases.functions.ts`**
- `AUDIO_CT`: remover `audio/mpeg`, `audio/mp3`; manter apenas variantes WAV (`audio/wav`, `audio/x-wav`, `audio/wave`, `audio/vnd.wave`).
- `getReleaseUploadUrl`: schema `ext` deixa de aceitar `"mp3"`; mensagem passa a "Use WAV.".

**`src/routes/enviar-lancamento.tsx`**
- Texto de ajuda do campo de áudio: trocar "WAV ou MP3" por **"apenas WAV"** nos dois textos (single e EP/álbum).

> Observação: o envio é via link do Google Drive (não há upload direto no formulário público). O ajuste no `getReleaseUploadUrl` cobre fluxos administrativos que ainda usem upload assinado.

## 2. Campo "Faixa Foco" obrigatório para EP e Álbum

### Banco
Migração adicionando coluna opcional na tabela `releases`:
- `faixa_foco text` (nullable — singles não usam).

### Backend (`src/lib/releases.functions.ts`)
- `submitSchema`: adicionar `faixa_foco: z.string().trim().max(200).optional().default("")`.
- Novo `.refine`: quando `release_type ∈ {ep, album}`, `faixa_foco` deve ter ao menos 1 caractere — mensagem "Informe a faixa foco do EP/Álbum." em `path: ["faixa_foco"]`.
- Insert em `releases`: gravar `faixa_foco: data.faixa_foco || null`.
- `getRelease` (admin): incluir `faixa_foco` no select.

### Formulário público (`src/routes/enviar-lancamento.tsx`)
- Novo state `faixaFoco`.
- Quando `isMulti` (EP/Álbum), renderizar campo **"Faixa Foco"** (Input obrigatório) logo após a tracklist, com texto auxiliar: *"Música principal para divulgação e distribuição."*
- Incluir no payload `submitFn`.
- `canSubmit`: exigir `faixaFoco.trim().length > 0` quando `isMulti`.

### Painel admin (`src/routes/admin/_protected/lancamentos.$id.tsx`)
- Exibir a "Faixa Foco" no bloco de informações do lançamento quando presente.

### E-mails
- `admin-new-release` e `release-received`: incluir linha "Faixa foco: X" quando aplicável (apenas EP/Álbum). Passar `faixaFoco` em `templateData`.

## Arquivos
- migração SQL (nova)
- `src/lib/releases.functions.ts`
- `src/routes/enviar-lancamento.tsx`
- `src/routes/admin/_protected/lancamentos.$id.tsx`
- `src/lib/email-templates/admin-new-release.tsx`
- `src/lib/email-templates/release-received.tsx`
