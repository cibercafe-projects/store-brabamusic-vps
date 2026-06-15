# Reenvio de Instruções — UX em 1 clique

Refatorar `src/components/purchase/ResendInstructionsCard.tsx` para remover a seleção de canais e o envio via servidor, deixando três ações diretas que usam a mensagem atualmente exibida no textarea.

## Mudanças na UI

- Remover bloco de "Canais" (checkboxes WhatsApp/E-mail) e o botão único "Reenviar instruções".
- Manter o textarea editável da mensagem (continua sendo a fonte da verdade).
- Manter o histórico de reenvios anteriores.
- Adicionar barra com 3 botões lado a lado (em `flex flex-wrap gap-2`), abaixo do textarea:
  1. **📱 Reenviar por WhatsApp** — destaque (`default`/gradient). Desabilitado se `purchase.whatsapp` vazio.
     - Ação: `window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank')`.
  2. **✉️ Reenviar por E-mail** — variante `secondary`. Desabilitado se `purchase.email` vazio.
     - Ação: `window.location.href = `mailto:${email}?subject=${encodeURIComponent('Braba Music - Instruções de Pagamento')}&body=${encodeURIComponent(message)}``. `encodeURIComponent` já converte `\n` em `%0A`.
  3. **📋 Copiar Mensagem** — variante `outline`. Mantém `copyMsg()`, ajustando o toast para "Mensagem copiada com sucesso."

Cada botão, ao ser clicado, também dispara `logFn` (com `canal_whatsapp` ou `canal_email` true conforme a ação; copiar não loga ou loga ambos false — manter o registro só para WhatsApp/E-mail) para preservar o histórico. Após sucesso, invalida `["admin","resend-instructions", purchase.id]`.

## Limpeza

- Remover imports não utilizados: `Checkbox`, `Loader2`, `Send` no botão de envio único (manter `Send` no título do Card).
- Remover estados `email`, `whatsapp`, `noChannel` e a mutation única; substituir por duas chamadas leves a `logFn` (ou uma mutation parametrizada por canal).
- Manter `getPurchaseSettings` e a montagem de `baseMessage` exatamente como hoje (dados da compra, valor, PIX/link, link do comprovante).

## Arquivos

- `src/components/purchase/ResendInstructionsCard.tsx` (única alteração).

Sem mudanças de backend, schema ou outras telas.
