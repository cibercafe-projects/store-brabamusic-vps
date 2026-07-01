# Sprint 11A — Modelagem Jurídica das Produtoras

## Objetivo

Expandir o cadastro de Produtoras com uma seção **Informações Jurídicas**, estruturando a base de dados que será consumida futuramente pelo licenciamento automático (geração dinâmica de PDFs, créditos, registro e royalties).

Nesta sprint **não** foram alterados: fluxo de compra, geração de documentos/PDFs, entregas, catálogo público ou e-mails automáticos.

## Entregas

### Banco de dados

Migração adicionando 8 colunas em `public.producers` (todas `text`, nullable, sem default — não quebra produtoras existentes):

| Coluna | Uso |
|---|---|
| `nome_civil` | Nome civil completo do titular |
| `cpf` | Armazenado apenas com dígitos (11) |
| `nome_artistico_creditos` | Nome como deve aparecer em créditos |
| `email_comercial` | Contato comercial |
| `email_royalties` | Contato para royalties |
| `texto_creditos` | Texto padrão de créditos |
| `texto_registro` | Texto padrão de registro |
| `texto_royalties` | Texto padrão de royalties |

- Sem UNIQUE em `cpf` (múltiplas produtoras podem ficar sem preencher).
- RLS e GRANTs **inalterados** — tabela continua admin-only.

### Server functions — `src/lib/producers.functions.ts`

`producerInputSchema` estendido com validação Zod:
- Textos livres: `nome_civil` (≤160), `nome_artistico_creditos` (≤160), `texto_creditos/registro/royalties` (≤4000). `""` → `null`.
- `cpf`: aceita entrada com máscara, normaliza para 11 dígitos, rejeita quantidades inválidas.
- `email_comercial` / `email_royalties`: validação de formato, opcionais.

`createProducer` e `updateProducer` persistem os novos campos. `listProducers` e `getProducer` já usavam `select("*")`, então os campos passaram automaticamente para o frontend sem outras alterações.

### UI

`src/components/admin/producers/ProducerForm.tsx`:
- Nova seção **"Informações Jurídicas"** dentro do `Sheet`, com título e descrição.
- Grid responsivo para Nome civil / CPF, e Email Comercial / Email Royalties.
- Máscara `000.000.000-00` aplicada em tempo real via helper `formatCpf`.
- Textareas (`rows=3`) para os três textos padrão.
- Schema local do form espelha a validação do server (CPF, emails, tamanhos).

`src/routes/admin/_protected/produtoras.tsx`:
- Botão **Editar** hidrata `ProducerFormInitial` com os novos campos, garantindo que o form volte preenchido em modo edição.

## Fora do escopo (intocado)

- `src/lib/purchases.functions.ts`, `deliveries.functions.ts`, `releases.functions.ts` — nenhuma alteração.
- Nenhum PDF, template de e-mail, catálogo público ou fluxo de entrega foi modificado.

## Testes de aceitação

1. Login em `/admin/produtoras`.
2. **Nova produtora → Ayla** — preencher todos os campos jurídicos → Salvar → sucesso.
3. **Nova produtora → Anônima Beats** — preencher só o mínimo obrigatório + alguns campos jurídicos parciais → Salvar → sucesso.
4. Reabrir cada uma em **Editar** — todos os valores voltam preenchidos, inclusive CPF com máscara.
5. Fluxo de compra e listagens públicas continuam com o comportamento anterior.

## Dívidas e atenção

- **CPF**: valida apenas quantidade de dígitos. Validação de dígito verificador (algoritmo oficial) fica para uma futura sprint se necessário.
- **Unicidade de CPF**: não imposta. Se a regra de negócio exigir, adicionar UNIQUE parcial `WHERE cpf IS NOT NULL` em sprint futura.
- **Sem migração de dados legados**: produtoras existentes ficam com os novos campos em `NULL` até edição manual.

## Próximos passos sugeridos (Sprint 11B)

1. Consumir os campos jurídicos na geração dinâmica do PDF de licença, substituindo trechos hoje hardcoded.
2. Fallback claro no PDF quando um campo obrigatório da produtora estiver vazio (bloquear licenciamento ou marcar como pendente).
3. Alertas no admin quando uma produtora com beats vendáveis estiver sem os campos jurídicos preenchidos.

**Critério de pronto (Sprint 11A):** admin consegue cadastrar/editar produtoras com todos os campos jurídicos, dados persistem no banco, e nenhum fluxo existente foi alterado. ✅
