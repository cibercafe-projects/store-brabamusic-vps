# Tipo do beat (Aberto / Fechado) + novos preços padrão

Adicionar a noção de **tipo** ao beat, com defaults de preço e de entrega associados, sem mexer no fluxo de pagamento/entrega existente.

## 1. Banco

Migration:

- `CREATE TYPE public.beat_tipo AS ENUM ('fechado','aberto');`
- `ALTER TABLE public.beats ADD COLUMN tipo public.beat_tipo NOT NULL DEFAULT 'fechado';`
- Backfill: beats existentes ficam como `'fechado'` (default cobre).
- Index opcional `beats_tipo_idx` (barato, ajuda filtros futuros).

Regras de negócio (semântica do tipo, aplicadas na UI):
- **Fechado** — entrega só WAV. Preço padrão sugerido **R$ 100,00**.
- **Aberto** — entrega WAV + STEMS. Preço padrão sugerido **R$ 150,00**.

RLS / GRANTs do `beats` já cobrem a nova coluna (sem mudança).

## 2. Cadastro de beats (`src/components/admin/beats/BeatForm.tsx`)

- Adicionar `tipo: z.enum(['fechado','aberto'])` no schema (default `'fechado'`).
- Novo `<Select>` "Tipo do beat" com opções **Fechado (WAV)** e **Aberto (WAV + STEMS)**, posicionado antes de "Preço".
- Default do campo **preço** muda de `"199,99"` para `"100,00"`.
- Ao trocar o tipo, se o preço atual estiver vazio ou for igual ao default do tipo anterior (100 ↔ 150), atualizar automaticamente para o default do novo tipo. Edição manual do preço não é sobrescrita.
- Help text no bloco "Arquivos privados": exibir um aviso suave quando `tipo = fechado` mas houver `stems_path` (e vice-versa: `tipo = aberto` sem `stems_path`). Sem bloquear o submit.
- Persistir `tipo` no payload de `createBeat` / `updateBeat`.

## 3. Server functions (`src/lib/beats.functions.ts`)

- Acrescentar `tipo: z.enum(['fechado','aberto']).default('fechado')` nos schemas de create/update.
- Passar `tipo` no insert/update do Supabase.
- Default do preço no insert continua nullable, mas quando o admin não informar e o tipo for conhecido, gravamos o valor sugerido (100 ou 150).

## 4. Exibição pública (opcional, dentro do escopo da seção)

- `src/lib/catalog.types.ts` + `src/lib/catalog.functions.ts`: incluir `tipo` no `PublicBeat` (select já lista os campos um a um).
- `src/components/BeatCard.tsx` e `src/routes/beat.$slug.tsx`: badge discreto **"Aberto · WAV + Stems"** ou **"Fechado · WAV"** ao lado de gênero/BPM. Sem mudança de layout.

## 5. Entrega (`DeliveryDialog`)

Sem mudança de lógica — o admin continua escolhendo manualmente. Apenas exibir o tipo no cabeçalho do dialog ("Beat: Trap da Rua · Aberto") para evitar entrega errada. A seleção inicial de arquivos continua sendo "tudo que tem path", o que casa naturalmente com a regra (beat fechado não terá `stems_path`).

## 6. Tipos gerados

Após a migration, `src/integrations/supabase/types.ts` é regerado e ganha o enum + a coluna automaticamente. Nada a editar à mão.

## Fora de escopo

- Não alterar `purchase_requests`, e-mails transacionais nem fluxo de comprovante.
- Não migrar/relistar beats existentes para "Aberto" — fica como `'fechado'` até o admin editar.
- Não criar tabela de preços por tipo; valores ficam por beat (a coluna `preco` continua a fonte da verdade).
