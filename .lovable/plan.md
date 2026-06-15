# Ajustes no catálogo de beats

Três frentes, todas em frontend + um pequeno update de dados.

## 1. Remover o fluxo "Tenho Interesse"

A entrada principal passa a ser o botão **COMPRAR** (já existe em todo lugar).

- `src/components/BeatCard.tsx` — remover o botão "Interesse" (e o `useState interestOpen`), o `<InterestForm/>` e o import. O card fica com **Ver** + **COMPRAR**.
- `src/routes/beat.$slug.tsx` — remover o botão "Tenho interesse", o `<InterestForm/>`, o `interestOpen` e o import `MessageCircle`/`InterestForm`. Sobram **COMPRAR** e **Compartilhar**.
- `src/components/Header.tsx` — remover o bloco `FEATURES.interests && <Link/>` (já estava off por flag) e o import `ShoppingBag` se ficar órfão.
- `src/routes/meus-interesses.tsx` — substituir por um redirect simples para `/` (mantém a rota viva para qualquer link antigo, mas sem UI de "em breve").
- `src/config/features.ts` — remover a flag `interests` (não é mais usada).
- **Arquivos preservados** (não deletar, podem voltar): `src/components/InterestForm.tsx`, `src/lib/leads.functions.ts`, tabela `leads` e a configuração de WhatsApp do form em `admin/configuracoes` (continua útil para o admin como número-padrão de contato).

## 2. Página "Como funciona"

`src/routes/como-funciona.tsx` hoje descreve o fluxo antigo (WhatsApp manual + "Tenho interesse"). Reescrever para o fluxo atual de compra:

Passos:
1. **Acessa o catálogo** — navega pela loja sem precisar de cadastro.
2. **Escuta a prévia** — player no card ou na página do beat.
3. **Clica em COMPRAR** — escolhe a licença (Lease, Premium ou Exclusiva) e preenche nome, e-mail e WhatsApp.
4. **Recebe as instruções de pagamento** — link de Pix/pagamento chega por WhatsApp e e-mail, junto com o link para enviar o comprovante.
5. **Envia o comprovante** — pelo link gerado na compra (upload direto, sem precisar voltar pro WhatsApp).
6. **Recebe os arquivos** — a equipe confirma o pagamento e entrega os arquivos (WAV + stems conforme a licença) por WhatsApp e e-mail.

FAQ atualizada nos mesmos pontos:
- Cadastro: continua opcional, dados pedidos no checkout.
- Licenças: Lease, Premium, Exclusiva — comparativo na página do beat.
- Pagamento: Pix / link, manual nesta fase.
- Entrega: link de download por WhatsApp e e-mail após confirmação.
- Clipe / DSPs: Premium e Exclusiva liberam.
- Exclusiva: remove o beat do catálogo.

Subtítulo no topo passa a ser: "Catálogo → compra com licença → pagamento → entrega dos arquivos."

## 3. Produtoras — textos no feminino

Atualizar `public.producers.bio` via migration (1 produtora ativa, 1 inativa):

- **Anonima Beats** — bio atual já está no feminino e ok. Sugestão de pequena revisão: "Beatmaker e produtora musical, atua desde 2020 no desenvolvimento de artistas independentes. Cria beats autorais, produz e direciona artisticamente, transformando referências em projetos com identidade própria."
- **Gizzabell** — bio atual é só "Afrobeats". Sugestão: "Produtora e beatmaker focada em Afrobeats, baseada em Florianópolis. Cria instrumentais com pegada dançante e identidade afro-contemporânea."

Se preferir reescrever esses textos antes da migration, me passe a versão final e eu uso ela.

## Detalhes técnicos

- Nenhuma mudança em schema/RLS/backend além do `UPDATE` em `producers.bio`.
- `leads` e `InterestForm` ficam no repo (zero risco, fácil reativar).
- Sem mudanças em rotas — `/meus-interesses` vira redirect (`throw redirect({ to: '/' })` no `beforeLoad`).
- Build deve continuar passando: ao remover imports órfãos, conferir `MessageCircle`, `InterestForm`, `ShoppingBag`, `FEATURES`.
