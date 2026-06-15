
# Revisão dos fluxos — Compra, Comprovante e Entrega

Fiz uma varredura nos arquivos canônicos do fluxo (`purchases.functions.ts`, `deliveries.functions.ts`, `PurchaseDialog.tsx`, `enviar-comprovante.$token.tsx`, `compras.index.tsx`, `compras.$id.tsx`) e cruzei com `docs/regras-de-negocio.md` e `docs/fluxos-do-sistema.md`. Encontrei 8 gaps — 4 funcionais (corrigir) e 4 de documentação/UX (alinhar).

---

## Gaps funcionais (a corrigir)

### G1. Status `comprovante_recebido` existe no código mas está fora do fluxo documentado
O banco/código tem 5 status: `aguardando_pagamento → comprovante_recebido → pagamento_confirmado → arquivos_enviados → cancelado`. A documentação só lista 4 (pula `comprovante_recebido`). Resultado: admin não sabe se deve operar nele.

**Correção:** atualizar `docs/regras-de-negocio.md` e `docs/fluxos-do-sistema.md` com o estado intermediário e quem transita.

### G2. Pedido com comprovante recém-enviado não fica em destaque na listagem
Em `compras.index.tsx` o badge "Entregar agora", a borda lateral e o filtro "Pendentes" só consideram `pagamento_confirmado`. Quando o cliente envia o comprovante (status vira `comprovante_recebido`), o pedido cai no meio da lista sem alerta — admin pode esquecer de validar.

**Correção:** adicionar um segundo destaque visual e contador "Aguardando validação" para `comprovante_recebido` (badge âmbar + ordenação no topo, abaixo dos `pagamento_confirmado`).

### G3. `deliverPurchase` não valida o status antes de entregar
A função aceita entregar arquivos mesmo com status `aguardando_pagamento` ou `comprovante_recebido` — o front bloqueia, mas o backend não. Risco: bypass acidental por chamada direta.

**Correção:** em `src/lib/deliveries.functions.ts`, exigir `status in ('pagamento_confirmado', 'arquivos_enviados')` antes de gerar links/registrar entrega.

### G4. Página pública de envio do comprovante ainda usa "WhatsApp comercial"
`enviar-comprovante.$token.tsx` mostra o botão "Avisar imediatamente a Administração da Braba" apontando para `commercial_whatsapp`. Isso contraria a regra Fase 1 ("notificações de compra são manuais pelo admin" e "bloco de WhatsApp comercial removido do diálogo de compra") e cria expectativa de atendimento humano imediato.

**Correção:** remover o botão WhatsApp da página de comprovante. Deixar apenas o upload + bloco "Aguarde até 24h". O envio do comprovante já dispara e-mail automático para o admin (`admin-new-receipt`).

---

## Gaps de UX/documentação (alinhar)

### G5. Sem notificação ao cliente quando admin confirma o pagamento
Hoje o cliente só recebe e-mail quando o admin **entrega** os arquivos (`purchase-delivered`). Não há sinal entre "comprovante recebido" e "arquivos enviados". Em casos onde a entrega demora (>2h), o cliente fica sem update.

**Decisão necessária:** quer um e-mail automático "Pagamento confirmado — preparando seus arquivos" disparado quando admin muda status para `pagamento_confirmado`? Ou mantém só a entrega final?

### G6. `continuation_token` é eterno
O token de envio de comprovante nunca expira. Risco baixo (escopo só do próprio pedido), mas eventualmente um link antigo pode ser reaberto e re-enviar comprovante em pedido já entregue.

**Correção sugerida:** bloquear upload quando `status in ('arquivos_enviados', 'cancelado')` (já bloqueia `cancelado`; falta `arquivos_enviados`). Sem expiração temporal — apenas por estado.

### G7. Sem botão para "reenviar arquivos" quando links de 7 dias expirarem
Hoje só dá pra reentregar via diálogo "Mais opções". Se cliente perde os links após 7 dias, o admin precisa abrir o diálogo completo.

**Correção sugerida:** habilitar os botões rápidos WhatsApp/E-mail também quando `status = arquivos_enviados` (já permitido na lógica de `canDeliver`), e renomeá-los para "Reenviar arquivos" quando já entregue. Pequeno ajuste de label apenas.

### G8. Documentação não reflete unificação dos Leads nem o status `comprovante_recebido`
`docs/fluxos-do-sistema.md` ainda mostra fluxo antigo; sem referência a Leads unificados (interesse + compras).

**Correção:** atualizar os dois docs e adicionar entrada no `docs/CHANGELOG.md`.

---

## Plano de execução

1. **Backend / lógica**
   - `src/lib/deliveries.functions.ts`: validar status (G3); permitir reentrega já está ok.
   - `src/lib/purchases.functions.ts → uploadReceiptByToken`: bloquear upload se `status = 'arquivos_enviados'` (G6).

2. **Frontend**
   - `src/routes/admin/_protected/compras.index.tsx`: badge "Aguardando validação" + contador + ordenação para `comprovante_recebido` (G2).
   - `src/routes/admin/_protected/compras.$id.tsx` (DeliveryCard): label dinâmico "Reenviar" quando já entregue (G7).
   - `src/routes/enviar-comprovante.$token.tsx`: remover bloco WhatsApp comercial (G4).

3. **Documentação**
   - `docs/regras-de-negocio.md`: nova seção 2.4 estados + nota Leads unificados (G1, G8).
   - `docs/fluxos-do-sistema.md`: redesenhar diagramas com `comprovante_recebido` + ações do admin (G1, G8).
   - `docs/CHANGELOG.md`: entrada "Revisão Fase 1 — gaps".

4. **G5 (e-mail de pagamento confirmado)** — aguardando sua decisão antes de implementar.

---

## Pergunta para fechar o escopo

**G5 — quer que o sistema envie automaticamente um e-mail "Pagamento confirmado" para o cliente quando o admin trocar o status para `pagamento_confirmado` (antes da entrega de arquivos)?**
- Sim → crio template `payment-confirmed` e disparo no `updatePurchaseStatus`.
- Não → mantém só o e-mail de entrega final (`purchase-delivered`).
