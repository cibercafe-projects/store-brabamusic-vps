# Promoções por Tipo de Beat

Permite colocar um tipo de beat inteiro em promoção (ex.: Beat Aberto de R$ 200 por R$ 100)
sem alterar o preço cadastrado de cada beat.

## Como funciona

Cada registro em `public.beat_types` tem quatro campos de promoção:

| Campo | Descrição |
| --- | --- |
| `promo_ativa` | Liga/desliga a promoção do tipo |
| `promo_valor` | Valor cobrado enquanto a promoção estiver vigente |
| `promo_link_pagamento` | Link de pagamento que cobra exatamente o valor promocional |
| `promo_expira_em` | Data/hora de término (vazio = sem prazo) |

A promoção é considerada **vigente** quando `promo_ativa = true`, existe `promo_valor` e
`promo_expira_em` está no futuro (ou vazio). Fora disso, o sistema volta sozinho ao preço
e ao link normais — não é preciso rodar nada manualmente.

## Preço efetivo

A regra fica centralizada em `src/lib/promo.ts` (`resolvePrecoEfetivo`), usada por:

- `src/lib/catalog.functions.ts` — catálogo, página do beat e página da produtora
- `src/lib/purchases.functions.ts` — valor e link enviados no fluxo de compra

Ordem de resolução:

1. Preço cheio = `beats.preco` ou, se vazio, `beat_types.valor_padrao`
2. Se a promoção estiver vigente e o valor promocional for menor que o cheio,
   passa a valer `promo_valor` + `promo_link_pagamento`
3. O preço cheio continua sendo exibido riscado ("de R$ 200 por R$ 100")

## Exibição no site

- Card do beat: selo verde **Promoção** e preço cheio riscado ao lado do promocional
- Página do beat: faixa "Promoção por tempo limitado" e mesmo formato de preço
- Backoffice → Tipos de Beat: coluna de valor mostra o preço cheio riscado e o promocional

## Compras já criadas

Nada muda para compras existentes. Cada pedido guarda valor e snapshot de licença no
momento da criação (`purchase_requests.valor` e `license_snapshot`), então promoções
futuras não alteram contratos passados.

## Checklist ao criar uma promoção

1. Criar no Mercado Pago um link que cobre exatamente o valor promocional
2. Backoffice → Tipos de Beat → editar o tipo → ligar **Promoção ativa**
3. Preencher valor, link e (opcional) data de término
4. Conferir no catálogo se o "de/por" aparece correto
5. Ao terminar, desligar a promoção ou deixar a data expirar
