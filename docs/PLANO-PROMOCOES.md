# Plano — Promoções por Tipo de Beat (Melhorias)

Data: 2026-09-08
Status: em execução
Build: a partir do commit `8609fbc`

## Contexto

A feature de promoções por tipo de beat foi entregue no commit `8609fbc`
(modelo inicial: 1 promo por tipo, toggle on/off, histórico, exibição
pública com selo e preço riscado). Este plano documenta a **segunda
rodada de melhorias**, negociada com a usuária Gisele, que adiciona:

- integridade de vínculo promo↔tipo (não excluir tipo com promo
  cadastrada);
- janela unificada de cadastro/edição;
- lifecycle completo da promoção (futura → vigente → desligada →
  encerrada) com regras de edição por estado;
- campo `promo_descricao` e banner público animado;
- e-mail ao admin quando uma promoção é cadastrada;
- lembrete automático por e-mail 1h antes do início.

## Decisões consolidadas

1. **Modelo A1**: uma promoção vigente (ou futura) por tipo de beat.
2. **Janela unificada** de cadastro/edição (dialog único).
3. **`promo_link_pagamento` obrigatório** no cadastro (link/pix do valor
   temporário).
4. **`promo_inicio_em` obrigatório** (datetime-local com hora e minutos).
5. **`promo_expira_em` opcional** (campo existe, pode ficar vazio; edita-se
   depois quando soubermos a data).
6. **Validação no server fn**: `promo_valor < valor_padrao` (rejeita salvar).
7. **Lifecycle (sem estado "Pausada")**:
   - **Futura não iniciada**: editar todos os campos + **Excluir**.
   - **Vigente**: editar só `promo_expira_em`. **Desligar** ou **Terminar**.
   - **Desligada (ainda na janela)**: editar só `promo_expira_em`.
     **Religar** ou **Terminar**.
   - **Encerrada**: read-only. **Não pode religar.**
8. **Exclusão** só em futura não iniciada; apaga o histórico junto (o tipo
   deixa de aparecer em `/admin/promocoes`).
9. **Integridade**: tipo de beat com qualquer linha em
   `beat_type_promo_history` não pode ser excluído pela UI
   (`canDeleteBeatType`).
10. **Scheduler**: `setInterval` dentro do app Node + flag
    `promo_reminder_sent_at` em `beat_types` (resetada em edições).
11. **Banner público** aparece na home e na página do beat quando há
    promoção ativa. Animação marquee. Campo `promo_descricao` opcional.

## Lifecycle (matriz)

| Estado | Condição | Ações |
|---|---|---|
| **Futura não iniciada** | `now < promo_inicio_em` ∧ `promo_ativa=true` | Editar todos os campos, **Excluir** |
| **Vigente** | `promo_inicio_em ≤ now` ∧ (`promo_expira_em=null` ∨ `now ≤ promo_expira_em`) ∧ `promo_ativa=true` | Editar só `promo_expira_em`, **Desligar**, **Terminar** |
| **Desligada** | `promo_ativa=false` ∧ (`promo_expira_em=null` ∨ `now ≤ promo_expira_em`) | Editar só `promo_expira_em`, **Religar**, **Terminar** |
| **Encerrada** | `promo_expira_em ≤ now` | Read-only. Sem ações |

## Banco

Nova migration `supabase/migrations/20260908120000_beat_types_promo_descricao.sql`:

```sql
ALTER TABLE public.beat_types
  ADD COLUMN IF NOT EXISTS promo_descricao text,
  ADD COLUMN IF NOT EXISTS promo_reminder_sent_at timestamptz;

COMMENT ON COLUMN public.beat_types.promo_descricao
  IS 'Texto exibido no banner público da promoção.';
COMMENT ON COLUMN public.beat_types.promo_reminder_sent_at
  IS 'Quando o lembrete de 1h antes foi enviado (reseta em edições).';
```

## Server fns (`src/lib/beat-types.functions.ts`)

| Função | Comportamento |
|---|---|
| `upsertBeatTypePromo(input)` | Substitui `toggleBeatTypePromo`. Valida `promo_valor < valor_padrao`, `promo_link_pagamento` obrigatório, `promo_inicio_em` obrigatório, `promo_expira_em` opcional. Bloqueio pós-término (read-only). Bloqueio parcial pós-início (só `promo_expira_em` + `promo_ativa`). Grava `beat_types` + `beat_type_promo_history`. Envia e-mail admin (`admin-promo-created` ou `admin-promo-updated`). Reseta `promo_reminder_sent_at`. |
| `deleteBeatTypePromo(id)` | Valida `now < promo_inicio_em`. Limpa os 5 campos promo do `beat_types` e **deleta** linhas de `beat_type_promo_history` desse tipo. |
| `termBeatTypePromo(id)` | Define `promo_expira_em = now()` e `promo_ativa = false`. Insere histórico. Vai pra "Encerrada". |
| `toggleBeatTypePromoActive(id, ativa)` | Bloqueia religar pós-término. Flip `promo_ativa`. Insere histórico. |
| `canDeleteBeatType(id)` | Retorna `{canDelete, reason}`. `false` se há linhas em `beat_type_promo_history`. |
| `listBeatTypesWithPromo()` | Lista tipos com histórico + status calculado (Vigente/Futura/Desligada/Encerrada). |

## Cron / scheduler

Arquivo novo: `src/lib/promo-reminders.server.ts`.

- Função `runPromoReminders()`:
  1. Busca tipos com `promo_ativa=true` ∧ `promo_inicio_em > now()`
     ∧ `promo_inicio_em ≤ now() + interval '1 hour'`
     ∧ `promo_reminder_sent_at IS NULL`.
  2. Para cada um, envia e-mail `admin-promo-reminder`.
  3. Marca `promo_reminder_sent_at = now()`.
- `setInterval(runPromoReminders, 5 * 60 * 1000)` (5 minutos).
- Primeira execução após 30s do startup.
- Carregado via import no `src/server.ts`.

## Templates de e-mail

- `admin-promo-created`: tipo, valor cheio → promo, link, início, expiração,
  descrição.
- `admin-promo-updated`: mesmo conteúdo + nota "Promoção atualizada".
- `admin-promo-reminder`: "Promoção do tipo X começa em 1h — Y → Z".

Templates adicionados como arquivos `.html` (e metadados se houver) na
estrutura existente de templates.

## UI — `/admin/promocoes`

- Header: botão **"Cadastrar promoção"**.
- Tabela com badges:
  - 🟢 **Vigente**
  - 🔵 **Futura**
  - 🟡 **Desligada**
  - ⚪ **Encerrada**
- Ações por status conforme lifecycle.
- Dialog unificado com campos:
  - Tipo (select; tipos já com promo ficam disabled)
  - Valor promocional (R$)
  - Link de pagamento da promoção (URL)
  - Início (datetime-local, obrigatório)
  - Fim (datetime-local, opcional)
  - Descrição (textarea, opcional)
- Campos `disabled` conforme estado.
- Confirmações (AlertDialog) para Excluir/Desligar/Terminar/Religar.

## UI — `/admin/tipos-beat`

- Antes da confirmação de exclusão: `canDeleteBeatType(id)` → alerta se
  bloqueado, com instrução para remover via banco.

## UI — pública

### Banner

- Aparece na **home** (`src/routes/index.tsx`) e na **página do beat**
  (`src/routes/beat.$slug.tsx`) quando o beat daquele tipo está em
  promoção ativa.
- Conteúdo: `promo_descricao` (se vazia, texto genérico
  "Promoção por tempo limitado!").
- Animação marquee no desktop, estática no mobile.
- Cor de destaque (accent/verde).

### `BeatCard`

- Selo "Promoção" (já existe).
- Tooltip ou badge menor com `promo_descricao` (opcional).

## Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/20260908120000_beat_types_promo_descricao.sql` | Nova migration |
| `src/integrations/supabase/types.ts` | Tipos: `promo_descricao`, `promo_reminder_sent_at` |
| `src/lib/promo.ts` | Adicionar `promo_descricao` em `PromoInfo` |
| `src/lib/beat-types.functions.ts` | Refatorar toggle → upsert + delete/term/toggle/canDelete/list; e-mail admin |
| `src/lib/promo-reminders.server.ts` | Job lembrete 1h antes |
| `src/server.ts` | Carregar job no startup |
| `src/routes/admin/_protected/promocoes.tsx` | Dialog unificado, descrição, datetime-local |
| `src/routes/admin/_protected/tipos-beat.tsx` | Checagem `canDeleteBeatType` |
| `src/routes/index.tsx` | Banner de promoção |
| `src/routes/beat.$slug.tsx` | Banner de promoção |
| `src/components/BeatCard.tsx` | Tooltip com descrição |
| Templates de e-mail | `admin-promo-created`, `admin-promo-updated`, `admin-promo-reminder` |
| `docs/CHANGELOG.md` | Nova seção da rodada |

## Validação

- `npx tsc --noEmit` deve passar.
- ESLint: sem novos erros não-prettier (baseline prettier suja mantida).
- Build: `NITRO_PRESET=node bun run build`.
- Restart PM2 (`--update-env`).
- Smoke test em `/admin/promocoes` (200).
- E2E completo:
  1. Cadastrar promo futura (com descrição).
  2. Verificar e-mail admin.
  3. Editar campos permitidos.
  4. Avançar `promo_inicio_em` para o passado → Vigente.
  5. Tentar editar valor (deve falhar) — só `promo_expira_em` permitido.
  6. Desligar → Desligada.
  7. Religar → Vigente.
  8. Terminar → Encerrada (read-only).
  9. Verificar banner público (home + beat) com descrição animada.
  10. Verificar lembrete (forçando `promo_inicio_em = now() + 30min`).
  11. Verificar `canDeleteBeatType` bloqueando exclusão de tipo com histórico.

## Commit

Mensagem:

```
feat(admin): promoções — lifecycle editável, banner público, e-mail admin e lembrete 1h
```

Push para `origin/main`.
