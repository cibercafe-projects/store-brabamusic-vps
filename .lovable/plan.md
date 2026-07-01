## Sprint 11A — Situação atual e entrega restante

A modelagem e o CRUD desta sprint **já foram implementados** na iteração anterior. Verificação rápida do estado atual:

- Migração aplicada em `public.producers` com as 8 colunas: `nome_civil`, `cpf`, `nome_artistico_creditos`, `email_comercial`, `email_royalties`, `texto_creditos`, `texto_registro`, `texto_royalties` (todas `text`, nullable, sem default).
- `src/lib/producers.functions.ts` — schema Zod expandido (CPF normalizado para 11 dígitos, emails validados, textos até 4000 chars, "" → null). `createProducer` e `updateProducer` persistem os novos campos.
- `src/components/admin/producers/ProducerForm.tsx` — nova seção "Informações Jurídicas" com todos os campos, máscara `000.000.000-00` no CPF e helper `formatCpf`.
- `src/routes/admin/_protected/produtoras.tsx` — botão Editar hidrata `ProducerFormInitial` com os novos campos.
- Nada de fluxo de compra, PDF, entregas ou documentos foi tocado.
- `tsgo --noEmit` passou sem erros.

### O que falta nesta sprint

Apenas a entrega documental: gerar o **relatório da sprint**.

### Plano

Criar `SPRINT_11A_REPORT.md` na raiz (mesma convenção dos relatórios anteriores — `SPRINT_10_REPORT.md`, etc.) contendo:

1. **Objetivo** — expandir cadastro de produtoras com seção jurídica, base para o licenciamento automático futuro.
2. **Entregas**
   - Banco: 8 colunas novas em `producers`, todas opcionais, sem alteração de RLS/GRANT (tabela já é admin-only).
   - Server functions: validação Zod dos novos campos, CPF normalizado, emails validados, persistência em create/update.
   - UI: nova seção "Informações Jurídicas" no `Sheet` de produtora, com máscara de CPF e textareas para os textos padrão.
   - Página `/admin/produtoras`: hidratação dos campos em modo edição.
3. **Fora do escopo (mantido intacto)**: compras, PDFs, entregas, documentos, catálogo público, emails automáticos.
4. **Testes de aceitação** — criar Ayla (todos os campos), criar Anônima Beats (mínimo + parciais), reabrir em modo edição e confirmar persistência.
5. **Dívidas / notas**
   - CPF só valida quantidade de dígitos; validação de dígito verificador fica para futura sprint se necessário.
   - Sem UNIQUE em CPF (produtoras podem ficar sem preencher).
   - Campos ainda não expostos em nenhuma tela pública nem em geração de documentos — próxima sprint (11B) deverá consumir esses dados no licenciamento automático.
6. **Próximos passos sugeridos (Sprint 11B)** — usar os textos e dados jurídicos na geração dinâmica do PDF de licença e substituir os campos hoje hardcoded.

Nenhuma outra alteração de código será feita nesta sprint.