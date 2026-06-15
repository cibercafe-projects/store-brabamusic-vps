# Ajuste no fluxo de compra — Envio das informações para o próprio WhatsApp do cliente

Objetivo: após registrar a compra, o cliente vê uma tela de sucesso com próximos passos e 4 ações, incluindo um botão que abre o WhatsApp **dele mesmo** com a mensagem contendo todos os links da compra.

Sem Twilio, sem WhatsApp API, sem serviços pagos — apenas `wa.me` com o telefone do próprio cliente.

## Arquivo alterado

`src/components/purchase/PurchaseDialog.tsx` (única alteração de código)

### 1. Nova tela de sucesso (substitui o conteúdo atual do step `receipt`)

Atualmente o step `receipt` renderiza diretamente o `ReceiptUploader` + botões "Enviar depois" e "Abrir WhatsApp Braba". Vamos transformá-lo numa tela de sucesso com próximos passos e 4 botões de ação. O upload do comprovante passa a ser acessado pelo botão "Enviar Comprovante", que abre `/enviar-comprovante/{token}` em nova aba (mesma URL já usada hoje no step `later`).

Conteúdo:

```
✅ Compra registrada com sucesso

Próximos passos:
1. Efetue o pagamento.
2. Envie seu comprovante.
3. Aguarde a validação da equipe.
4. Receba seus arquivos.
```

Card resumo (Beat, Valor) reaproveitando o mesmo estilo do step `form`.

### 2. Botões (na ordem)

1. **Pagar Agora** — abre `paymentLink` (de `settings.data.payment_link`) em nova aba. Desabilitado se vazio, com tooltip "Link de pagamento será enviado pelo time Braba".
2. **Enviar Comprovante** — abre `${window.location.origin}/enviar-comprovante/${token}` em nova aba.
3. **Enviar informações para meu WhatsApp** — abre `wa.me` com o telefone que o cliente digitou (`whatsapp` state) e a mensagem dinâmica (ver abaixo).
4. **Copiar Informações** — copia para clipboard o texto consolidado (Beat, Valor, Link de Pagamento, Link de Comprovante).

O botão antigo "Abrir WhatsApp Braba" e o step intermediário `later` são removidos (o link de comprovante já fica acessível pelo botão "Enviar Comprovante" e pelo "Copiar Informações"). O `ReceiptUploader` deixa de ser usado neste dialog.

### 3. Geração do link wa.me (telefone do cliente)

Reaproveitar `digitsOnly()` e `whatsappLink()` já presentes no arquivo. O número usado é `whatsapp` (state preenchido pelo cliente). `digitsOnly` já remove `()`, espaços, `-` e `+`.

### 4. Mensagem enviada

```
Olá!

Parabéns, você acabou de registrar sua compra na Braba Beats.

Beat:
{beatName}

Valor:
{valorFmt}

Link para pagamento:
{paymentLink || "Será enviado pelo time Braba"}

Link para envio do comprovante:
{origin}/enviar-comprovante/{token}

Após o envio do comprovante nossa equipe realizará a validação do pagamento e enviará os arquivos adquiridos.

Braba Music
```

`{origin}` = `window.location.origin` (em SSR não é avaliado, pois o dialog só renderiza no client).

### 5. Texto do "Copiar Informações"

Mesmo conteúdo da mensagem do WhatsApp, em texto plano (sem o "Olá!/Parabéns/Braba Music" se preferir um formato mais enxuto — proposta: manter idêntico para consistência).

## O que NÃO muda

- Server function `createPurchaseRequest`, e-mails transacionais, banco, settings.
- Step `form` permanece igual (sem abertura automática de WhatsApp, conforme ajuste anterior).
- `commercial_whatsapp` / `pix_key` continuam exibidos no step `form`.
- Página `/enviar-comprovante/{token}` (já existente) continua sendo onde o upload real acontece.

## Detalhes técnicos

- Imports a remover: `MessageCircle` se não usar mais — manteremos pois o novo botão "Enviar para meu WhatsApp" usa o ícone. Remover import do `ReceiptUploader`.
- Remover step `"later"` do union `Step` e seu bloco JSX.
- `useEffect` de reset do dialog: remover `setStep("form")` referências a estados não mais usados? Tudo continua válido.
- Tipagem: nenhuma alteração de tipos públicos.
