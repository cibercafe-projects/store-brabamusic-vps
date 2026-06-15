## Ajustes na tela de comprovante enviado

**Arquivo:** `src/routes/enviar-comprovante.$token.tsx`

### Mudanças

1. **Reordenar** os blocos após o card "Comprovante já enviado!":
   - 1º: Botão "Avisar a Administração" (movido para cima)
   - 2º: Aviso "Após avisar a administração, aguarde até 24h..."

2. **Renomear o botão** de:
   - "Avisar a Administração da Braba sobre o seu pagamento"
   - para: **"Avisar imediatamente a Administração da Braba sobre o seu pagamento"**

3. **Destacar mais o botão** (CTA principal):
   - Trocar o estilo atual (outline/translúcido) por um botão sólido com a cor primária da marca (gradiente rosa/magenta consistente com o restante da página)
   - Aumentar padding vertical, peso da fonte (bold) e tamanho do ícone
   - Manter o link `wa.me` e a mensagem já configurada (nome, beat, "Aguardo a validação e o envio dos arquivos")
   - Continuar visível após cliques (não desabilitar) — usuário pode clicar sempre

### O que NÃO muda

- Lógica de envio do comprovante
- Mensagem do WhatsApp (`wa.me`)
- Demais textos, card do beat, botão "Enviar outro"
- Server functions, e-mails e banco de dados
