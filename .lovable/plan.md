# Reserva Automática de Beats Exclusivos

Adicionar reserva temporária (24h) ao criar uma compra, liberar automaticamente na expiração/cancelamento, marcar como vendido na confirmação de pagamento. Implementação minimamente invasiva usando os campos sugeridos no próprio beat.

## FASE 1 — Modelo de dados

Migração:
- Adicionar valor `reservado` ao enum `beat_status` (já existem `rascunho`, `ativo`, `vendido`; mapeamento: `ativo` = Disponível, `reservado` = Reservado, `vendido` = Vendido — `rascunho` continua para beats não publicados).
- Adicionar colunas em `public.beats`:
  - `reserved_at timestamptz null`
  - `reservation_expires_at timestamptz null`
  - `reserved_purchase_id uuid null references purchase_requests(id) on delete set null`
- Índice: `create index on beats (status, reservation_expires_at)` para expiração eficiente.

## FASE 2 — Reserva na criação da compra

Em `createPurchaseRequest` (src/lib/purchases.functions.ts):
- Após validar `beat.status === 'ativo'`, executar UPDATE atômico condicional:
  ```
  UPDATE beats SET status='reservado', reserved_at=now(),
    reservation_expires_at=now()+interval '24 hours',
    reserved_purchase_id=<novo id>
  WHERE id=? AND status='ativo'
  ```
- Reordenar: inserir `purchase_requests` primeiro, então executar o UPDATE condicional; se `rowCount=0`, apagar o purchase recém-criado e lançar "Beat indisponível para compra" (previne corrida entre dois checkouts simultâneos).

## FASE 3 — Catálogo público

`src/lib/catalog.functions.ts`: filtros existentes `.eq("status","ativo")` já excluem `reservado` e `vendido` automaticamente. Auditar todos os fetchers públicos (listBeats, getBeat por slug, produtora pages) para confirmar que continuam usando `= 'ativo'` — nenhuma mudança de código esperada.

## FASE 4 — Confirmação de pagamento → Vendido

Em `updatePurchaseStatus`:
- Ao mudar status para `pagamento_confirmado` ou `arquivos_enviados`: UPDATE do beat vinculado para `status='vendido'`, limpar `reserved_at`/`reservation_expires_at` (manter `reserved_purchase_id` como histórico).

## FASE 5 — Cancelamento → Disponível

Em `updatePurchaseStatus`, ao mudar para `cancelado`:
- Se o beat atualmente aponta para essa compra (`reserved_purchase_id = purchase.id` e `status='reservado'`), reverter para `status='ativo'`, limpar `reserved_at`, `reservation_expires_at`, `reserved_purchase_id`.
- Se o beat já está `vendido`, não alterar (admin precisa agir explicitamente pelo botão manual da Fase 7).

## FASE 6 — Expiração automática (cron)

Função SQL `public.expire_beat_reservations()` (SECURITY DEFINER):
```
UPDATE beats SET status='ativo', reserved_at=null,
  reservation_expires_at=null, reserved_purchase_id=null
WHERE status='reservado' AND reservation_expires_at < now();
```
Agendar via `pg_cron` a cada 5 minutos (chamada SQL direta, sem HTTP — Opção 1 do padrão de scheduled jobs). Registrar via `supabase--insert` após a migração.

## FASE 7 — Backoffice

`src/routes/admin/_protected/beats.tsx` + `BeatForm`:
- Badge de status agora inclui "Reservado" (amarelo).
- Quando `status='reservado'`, mostrar bloco informativo: cliente (via `reserved_purchase_id → purchase_requests.nome_cliente`), `reserved_at`, `reservation_expires_at`, contador "expira em Xh Ym" (client-side).
- Botão de ação **Liberar Beat** no dropdown/detalhe → nova server fn `releaseBeatReservation({ id })` que reverte para `ativo` e limpa campos de reserva. Confirmação via AlertDialog.
- `listBeats` passa a selecionar as novas colunas + join leve com purchase para nome do cliente.

## FASE 8 — Página pública do beat

`src/routes/beat.$slug.tsx` / fetcher em `catalog.functions.ts`:
- Se o beat não é `ativo` (ou seja, reservado/vendido/rascunho), retornar `notFound()` já não basta pois queremos mensagem amigável. Ajustar o fetcher público para também retornar beats `reservado`/`vendido` mas com flag `available=false`.
- Na página: se `available=false`, ocultar CTA "Comprar" e mostrar card:
  > "Este beat não está mais disponível para compra."
  > + botão "Voltar ao Catálogo".
- Backend defense-in-depth: `createPurchaseRequest` já rejeita não-ativos (Fase 2).

## Fora do escopo

Pagamento, upload de comprovante, licenciamento, dashboard, lançamentos, notificações — inalterados. Sem novas tabelas.

## Detalhes técnicos

**Arquivos afetados:**
- Migração nova: enum + colunas + índice + função `expire_beat_reservations`.
- `supabase--insert` separado: `cron.schedule('expire-beat-reservations','*/5 * * * *', $$select public.expire_beat_reservations()$$)`.
- `src/lib/purchases.functions.ts`: reserva atômica em `createPurchaseRequest`; transições em `updatePurchaseStatus`.
- `src/lib/beats.functions.ts`: nova `releaseBeatReservation`; incluir novas colunas/join em `listBeats`; permitir `reservado` no schema Zod de listagem.
- `src/lib/catalog.functions.ts`: expor `available` flag em `getBeatBySlug`; listas públicas mantêm `= 'ativo'`.
- `src/routes/beat.$slug.tsx`: UI de indisponível.
- `src/routes/admin/_protected/beats.tsx`: badge "Reservado", bloco de info de reserva, ação "Liberar Beat".
- `src/integrations/supabase/types.ts`: regenerado após migração.
- `CHANGELOG.md`, `docs/regras-de-negocio.md`: documentar reserva automática.

**Ordem de execução:** migração → `supabase--insert` do cron → código (server fns → UI) → docs.

## Critérios de aceitação (mapeamento)

| Critério | Fase |
|---|---|
| Todos os beats têm controle de disponibilidade | 1 |
| Primeira compra reserva por 24h | 2 |
| Não permite 2ª compra em reservado/vendido | 2 + 8 |
| Pagamento confirmado → Vendido | 4 |
| Reservas expiradas liberadas automaticamente | 6 |
| Admin pode liberar manualmente | 7 |
