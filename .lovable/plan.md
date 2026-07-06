# Sprint — Atualização de textos da página "Como Funciona"

Atualização **exclusivamente textual** de `src/routes/como-funciona.tsx`. Layout, componentes, cores e responsividade permanecem intactos.

## 1. Substituir o array `steps` (6 passos)

Reescrever os 6 itens refletindo o fluxo atual:

1. **Escolha seu Beat** — Navegue pelo catálogo da Braba Beats, ouça a prévia e escolha o beat ideal para o seu projeto musical.
2. **Preencha seus dados** — Nome completo, nome artístico, e-mail, WhatsApp e Instagram (opcional). Usados para contato e envio dos arquivos após a confirmação do pagamento.
3. **Aceite os Termos de Uso** — Leia e aceite os Termos de Uso e Licenciamento: utilização da licença, crédito obrigatório à produtora, registro da obra e orientações sobre royalties.
4. **Preencha o formulário e faça o pagamento** — Escolha a forma de pagamento (Pix ou Link de Pagamento). O sistema gera um link exclusivo para envio do comprovante.
5. **Envie o comprovante** — Upload direto pela plataforma. Depois, avise a equipe Braba pelo WhatsApp (botão na tela) ou aguarde o contato.
6. **Receba seus arquivos** — Após a confirmação, a equipe Braba envia: beat adquirido, stems (quando disponíveis conforme a licença), documento de licenciamento e orientações de créditos da produtora. Contato por WhatsApp e/ou e-mail cadastrados.

## 2. Adicionar seção "Destaques da Plataforma"

Nova seção entre os passos e o FAQ, usando os mesmos utilitários visuais já presentes na página (`glass rounded-2xl`, `font-display`, grid responsivo) — nenhum componente novo, apenas marcação equivalente à já usada. Itens (com ✅):

- Compra 100% online
- Processo simples e intuitivo
- Pagamento via Pix ou Link de Pagamento
- Upload do comprovante diretamente pela plataforma
- Aviso rápido para a equipe via WhatsApp
- Atendimento humanizado pela equipe Braba Music
- Liberação dos arquivos após confirmação do pagamento
- Licenciamento digital com orientações de créditos da produtora

## 3. Atualizar FAQ

Ajustar respostas que citam o fluxo antigo para refletir o atual (Pix / Link de Pagamento, upload pela plataforma, aviso opcional por WhatsApp, entrega com licenciamento + créditos). Perguntas mantidas; textos revisados para consistência com os novos passos.

## 4. Subtítulo (H1 supporting)

Ajuste leve do parágrafo de introdução para: "Do catálogo à entrega dos arquivos — veja como funciona a compra na Braba Beats."

## Fora de escopo
- Nenhuma alteração em `PurchaseDialog`, rotas, backend, estilos globais ou outros arquivos.
- CHANGELOG/documentação de regras de negócio **não** são atualizados (mudança puramente de copy institucional).

## Arquivo alterado
- `src/routes/como-funciona.tsx`
