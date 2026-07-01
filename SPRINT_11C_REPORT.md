# Sprint 11C — Documento Jurídico (HTML)

## Entregue

- Nova rota `/admin/compras/:id/licenca` (`src/routes/admin/_protected/compras.$id.licenca.tsx`) exibe o documento de licença em HTML pronto para leitura e impressão.
- Botão **Ver licença** adicionado no header da página de detalhes da compra (`compras.$id.tsx`).
- Botão **Imprimir** dispara `window.print()`; CSS `@media print` esconde a barra de ações e remove sombras.

## Estrutura do documento (na ordem do briefing)

1. Compra — data, status, valor, forma de pagamento
2. Dados do Cliente — nome civil, artístico, e-mail, WhatsApp, Instagram
3. Beat — título, slug
4. Produtora — nome, nome civil, nome para créditos
5. Licença — texto padrão + versão do licenciamento
6. Créditos — `license_snapshot.texto_creditos`
7. Royalties — `license_snapshot.texto_royalties`
8. Registro — `license_snapshot.texto_registro`
9. Aceite — `license_accepted`, `license_accepted_at`, `license_version`, id do pedido, termos da plataforma

Fonte da verdade dos textos jurídicos é o `license_snapshot` gravado no momento da compra (Sprint 11B). Se estiver ausente, cai no dado atual da produtora ligada ao beat.

## Fora de escopo (mantido)

- PDF (será próximo passo — o HTML já foi feito com layout imprimível para facilitar migração)
- E-mail automático do documento
- Assinatura digital / hash de integridade

## Teste

1. Abrir `/admin/compras`, entrar em qualquer compra recente.
2. Clicar em **Ver licença** no topo.
3. Documento renderiza com todas as seções.
4. Botão **Imprimir** abre o diálogo de impressão do navegador com layout limpo.

## Próximos passos sugeridos (11D)

- Geração de PDF a partir do mesmo HTML (server-side ou browser).
- Anexar automaticamente no envio de arquivos.
- Link público (com token) para o cliente baixar sua própria licença.
