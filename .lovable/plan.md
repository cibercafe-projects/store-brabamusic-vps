## Sprint 11A — Modelagem Jurídica das Produtoras

Adicionar uma seção "Informações Jurídicas" no cadastro de produtoras, sem tocar em fluxo de compra, geração de documentos ou telas públicas.

### Escopo

Somente:
- Migração de banco (novos campos em `producers`)
- Server functions de produtoras (validação e persistência)
- Formulário admin de produtora (nova seção no Sheet)

Fora de escopo (explicitamente): telas de compra, geração de PDF/documentos, catálogo público, e-mails automáticos.

### 1. Banco de dados

Migração adicionando colunas em `public.producers` (todas nullable, sem default, para não quebrar produtoras existentes):

```text
nome_civil               text
cpf                      text        -- armazenado só com dígitos
nome_artistico_creditos  text
email_comercial          text
email_royalties          text
texto_creditos           text
texto_registro           text
texto_royalties          text
```

Sem constraints UNIQUE — CPF pode ficar em branco em várias linhas. Sem alteração de RLS/GRANT (a tabela já é admin-only, políticas continuam valendo). Sem trigger novo.

### 2. Server functions (`src/lib/producers.functions.ts`)

Estender `producerInputSchema` (usado tanto em `createProducer` quanto no `.partial()` do `updateProducer`) com os novos campos:

- Strings livres com `.trim().max(...)` e transformação `"" → null`:
  - `nome_civil` (max 160)
  - `nome_artistico_creditos` (max 160)
  - `texto_creditos`, `texto_registro`, `texto_royalties` (max 4000 cada)
- `cpf`: aceita entrada com ou sem máscara; regex normaliza para 11 dígitos ou `null`; validação leve de formato (11 dígitos). Sem validação de dígito verificador nesta sprint.
- `email_comercial`, `email_royalties`: `.email().max(255)` opcional, `"" → null`.

Persistir os campos no `insert` do `createProducer` e no `patch` do `updateProducer`. `listProducers` e `getProducer` já usam `select("*")`, então os campos passam automaticamente para o frontend.

Nenhuma outra função (`beats`, `purchases`, `releases`) é alterada.

### 3. UI — `src/components/admin/producers/ProducerForm.tsx`

Estender o schema Zod local do form com os mesmos campos (mesmas regras de validação e mensagens em pt-BR).

Adicionar bloco visual **"Informações Jurídicas"** depois da seção de status, com título e descrição curta ("Usado para créditos, registro e royalties. Preencha quando disponível."):

- Grid 2 colunas (md+): Nome Civil | CPF (com máscara de exibição `000.000.000-00`, mas envio só dos dígitos)
- Nome Artístico para Créditos (linha única)
- Grid 2 colunas: Email Comercial | Email Royalties
- Textarea (rows=3): Texto de Créditos
- Textarea (rows=3): Texto de Registro
- Textarea (rows=3): Texto de Royalties

`defaultValues` carregam do `initial` (`ProducerFormInitial` ganha os novos campos opcionais). Payload de submit inclui os novos campos, com strings vazias enviadas como `""` (o schema server transforma em `null`).

### 4. Tipagem

`src/integrations/supabase/types.ts` é auto-gerado — será atualizado após a migração ser aprovada. Depois disso, ajustar `ProducerFormInitial` e qualquer cast local necessário.

### 5. Teste de aceitação

1. Abrir `/admin/produtoras`
2. Criar "Ayla" com todos os campos jurídicos preenchidos → salvar
3. Criar "Anônima Beats" preenchendo só o mínimo (nome artístico) + alguns campos jurídicos vazios → salvar
4. Reabrir cada uma em modo edição → todos os campos vêm preenchidos corretamente
5. Nenhuma tela de compra, catálogo público ou geração de documento muda de comportamento
