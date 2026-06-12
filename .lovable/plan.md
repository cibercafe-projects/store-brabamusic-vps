## Objetivo

Na tela de detalhe de uma compra (`/admin/compras/$id`), adicionar a opção de reenviar para o cliente as informações de pagamento (PIX/dados) + o link de envio de comprovante (`/enviar-comprovante/{token}`), via WhatsApp e/ou E-mail. Útil quando o cliente se perde no fluxo após criar o pedido.

## Onde aparece

Novo card "Reenviar instruções" no detalhe da compra, visível enquanto o status for `aguardando_pagamento` ou `comprovante_enviado` (ou seja, antes da confirmação). Fica próximo ao card "Comprovante".

Conteúdo do card:
- Resumo: nome do cliente, e-mail, WhatsApp.
- Pré-visualização da mensagem que será enviada (beat, valor, chave PIX vinda de `app_settings`, link de continuação).
- Checkboxes: "Enviar por WhatsApp" (marcado se houver `whatsapp`), "Enviar por E-mail" (marcado se houver `email` — desabilitado com aviso "pendente de configuração de domínio" enquanto não houver domínio verificado, mesmo padrão da entrega de arquivos).
- Botão "Reenviar instruções".

## Comportamento

- WhatsApp: gera `https://wa.me/<num>?text=<mensagem pré-preenchida>` e abre em nova aba (mesmo padrão do `DeliveryDialog` — não envia automático, abre o WhatsApp Web do admin com o número do cliente já preenchido).
- E-mail: por ora, abre `mailto:` com assunto e corpo pré-preenchidos (consistente com o estado atual de "domínio pendente"). Quando o domínio for verificado depois, trocamos por envio transacional real sem mudar a UI.
- Registrar histórico: gravar uma linha na tabela `purchase_deliveries` reaproveitando-a como log genérico (tipo `instrucoes_pagamento`), OU criar `purchase_reminders` (ver Detalhes técnicos). Mostrar no card "Última instrução enviada em ...".

## Mensagem padrão

```
Olá {nome_cliente}! Aqui é a Braba Music.
Seu pedido do beat "{beat_nome}" está aguardando pagamento.

Valor: R$ {valor}
PIX: {pix_key} ({pix_owner})

Após pagar, envie o comprovante neste link:
{site}/enviar-comprovante/{token}

Qualquer dúvida, é só responder por aqui.
```

## Detalhes técnicos

- Novo server fn `resendPurchaseInstructions` em `src/lib/purchases.functions.ts`:
  - input: `{ id, channels: { whatsapp: boolean, email: boolean } }`.
  - `requireSupabaseAuth` + checagem `has_role('admin')`.
  - Carrega purchase + beat + `app_settings` (pix, site_url, commercial_whatsapp).
  - Monta mensagem, retorna `{ whatsapp_url, mailto_url, message }` para o client abrir.
  - Insere log em `purchase_deliveries` com novo campo `tipo` (`entrega_arquivos` | `instrucoes_pagamento`) — migration adiciona coluna `tipo text not null default 'entrega_arquivos'` e índice por `purchase_id, tipo`.
- Novo componente `ResendInstructionsCard.tsx` em `src/components/purchase/` consumido por `compras.$id.tsx`.
- Sem dependência de domínio de e-mail nesta sprint — `mailto:` é suficiente e não exige infra.
- Sem alteração no fluxo de cliente nem na tela pública `/enviar-comprovante/$token`.

## Arquivos

Criar:
- `src/components/purchase/ResendInstructionsCard.tsx`
- `supabase/migrations/<ts>_purchase_deliveries_tipo.sql` (add coluna `tipo`)

Editar:
- `src/lib/purchases.functions.ts` (nova fn + leitura do histórico já filtrando por tipo se necessário)
- `src/routes/admin/_protected/compras.$id.tsx` (montar o novo card)

## Fora do escopo

- Envio transacional real de e-mail (depende de domínio verificado).
- Envio automático de WhatsApp (sempre via wa.me, manual).
- Lembretes automáticos por cron.
