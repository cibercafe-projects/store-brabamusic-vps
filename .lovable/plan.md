## Alterações

### 1. `src/routes/enviar-comprovante.$token.tsx`
- Renomear o botão final de `Falar no WhatsApp ({commercialWa})` para **`Avisar a Administração da Braba sobre o seu pagamento`** (mantendo o ícone `MessageCircle` e o link `wa.me` para o número comercial).
- Atualizar o texto introdutório / adicionar bloco informativo logo após o card de "Comprovante já enviado!" (ou abaixo do uploader) com a mensagem:
  > "Após avisar a administração, aguarde até **24h** para a revisão do comprovante, aprovação do pagamento e envio dos arquivos adquiridos."
- Ajustar o `text` da mensagem `wa.me` para algo como:
  > "Olá! Sou {nome}. Acabei de enviar o comprovante do beat {beat}. Aguardo a validação e o envio dos arquivos."

### 2. `src/components/purchase/PurchaseDialog.tsx` (tela de sucesso, lista "Próximos passos")
Atualizar a lista para refletir o novo fluxo e o prazo:
1. Efetue o pagamento.
2. Envie seu comprovante no link.
3. Avise a administração da Braba pelo WhatsApp.
4. Aguarde até 24h para validação e envio dos arquivos.

### O que NÃO muda
- Server functions, e-mails, banco de dados, upload de comprovante.
- Número de WhatsApp comercial (continua vindo de `settings.commercial_whatsapp`).
- Demais botões e fluxo de compra.
