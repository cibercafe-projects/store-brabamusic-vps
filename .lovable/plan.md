## Sprint 11B — Licenciamento Dinâmico na Compra

Ligar os dados jurídicos cadastrados na Sprint 11A ao fluxo de compra: quando o cliente escolhe um beat, o `PurchaseDialog` exibe automaticamente os textos de **Créditos**, **Registro** e **Royalties** da produtora do beat (read-only), pede aceite explícito e registra a evidência do consentimento no banco. Nenhum PDF é gerado nesta sprint.

### Escopo

Somente:
- Nova server function pública para carregar textos jurídicos por `beat_id`.
- Migração adicionando campos de rastreio de aceite em `purchase_requests`.
- UI: nova seção no `PurchaseDialog` + checkbox adicional.
- Persistência do aceite (data, hora, versão, snapshot dos textos + dados do usuário já coletados no form).

Fora de escopo (mantido intacto): geração de PDF, template de e-mail, entregas, admin de compras, catálogo público.

### 1. Banco de dados

Migração em `public.purchase_requests` (todas nullable — não quebra pedidos existentes):

```text
license_accepted        boolean
license_accepted_at     timestamptz
license_version         text        -- ex: "2026-07-01.v1"
license_snapshot        jsonb       -- { nome_civil, nome_artistico_creditos,
                                    --   texto_creditos, texto_registro,
                                    --   texto_royalties, produtora_id,
                                    --   produtora_nome }
```

Sem alteração de RLS/GRANT (tabela já é admin-only para leitura via Data API; server functions usam `supabaseAdmin`).

### 2. Server functions — `src/lib/purchases.functions.ts`

**a) Nova função pública `getBeatLicenseInfo`** (sem middleware — chamada durante compra pública):
- Input: `{ beat_id: uuid }`.
- Usa `supabaseAdmin` internamente para join `beats → producers`.
- Retorna **apenas campos display-safe** (nada de CPF, e-mail comercial ou de royalties):
  ```text
  {
    produtora_nome,
    nome_artistico_creditos,
    texto_creditos,
    texto_registro,
    texto_royalties,
    license_version   // constante do build
  }
  ```
- Retorna `null` para cada texto vazio; frontend mostra fallback.

**b) `createPurchaseRequest` — estender `createSchema`**:
- Adicionar `license_accepted: z.literal(true)` (novo aceite, separado do `termos_aceitos` existente).
- Adicionar `license_version: z.string().max(40)` (enviado pelo client, validado contra a constante atual).
- No handler: recarregar textos da produtora do beat, montar `license_snapshot` no server (fonte da verdade — não confiar em snapshot do client), gravar `license_accepted = true`, `license_accepted_at = now()`.

**c) Constante `CURRENT_LICENSE_VERSION`** em `src/lib/licenses.constants.ts` (novo arquivo): string estável tipo `"2026-07-01.v1"`. Exportada tanto para client (Dialog) quanto server (validação).

### 3. UI — `src/components/purchase/PurchaseDialog.tsx`

Depois da caixa "Beat selecionado" e antes do bloco de forma de pagamento, adicionar **nova seção "Licenciamento da produtora"**:

- `useQuery` chamando `getBeatLicenseInfo({ beat_id })` com `enabled: open`.
- Enquanto carrega: skeleton/spinner curto.
- Se produtora tem textos, renderizar 3 blocos read-only (`<div>`, não Textarea) com título e conteúdo — Créditos, Registro, Royalties. Se algum texto estiver vazio, mostrar "— não informado pela produtora —" em itálico.
- Cabeçalho da seção mostra "prod. {nome_artistico_creditos ?? produtora_nome}".
- Rodapé da seção: checkbox **"Li e concordo com os termos de licenciamento acima"** (`licenseAccepted` state).
- `canSubmit` passa a exigir também `licenseAccepted === true`.
- Se a query falhar ou retornar `null`, permitir compra normalmente com aviso "Licenciamento padrão Braba Music" e ainda exigir o checkbox (fallback seguro).

No `handleSubmit`, passar `license_accepted: true` e `license_version: CURRENT_LICENSE_VERSION` para `createFn`.

O aceite existente ("Li e aceito a Licença de Uso... e Termos de Uso") permanece — são coisas distintas (contrato global vs. licenciamento específico da produtora).

### 4. Rastreio do "usuário"

O "usuário" que aceitou já é capturado no form (nome, e-mail, WhatsApp, Instagram). Todos já persistem em `purchase_requests`. Ao combinar com `license_accepted_at`, `license_version` e `license_snapshot`, temos evidência completa: **quem** aceitou, **quando**, **qual versão** e **o conteúdo exato** dos textos apresentados.

### 5. Teste de aceitação

1. Cadastrar produtora **Ayla** com todos os textos jurídicos (Sprint 11A).
2. Cadastrar produtora **Anônima Beats** só com nome (sem textos).
3. Vincular um beat a cada produtora.
4. Abrir catálogo → clicar em "Comprar" no beat da Ayla → dialog mostra os 3 textos da Ayla; sem aceitar o novo checkbox, botão fica desabilitado; aceitar + preencher form → sucesso.
5. Repetir para o beat da Anônima Beats → dialog mostra a seção com fallback "— não informado pela produtora —" nos três blocos; aceite ainda é exigido.
6. Verificar no banco: `purchase_requests.license_accepted = true`, `license_accepted_at` preenchido, `license_version` = constante atual, `license_snapshot` contendo o texto correto de cada produtora.
7. Confirmar que **nenhum PDF foi gerado** e que o fluxo de entrega / admin continua igual.

### 6. Dívidas e próximos passos (Sprint 11C sugerida)

- Snapshot é a base para o PDF dinâmico: próxima sprint consome `license_snapshot` na geração do PDF de licença.
- Se o admin editar textos jurídicos depois, `CURRENT_LICENSE_VERSION` deve ser bumpado (documentar processo — sem UI de versionamento nesta sprint).
- Nenhuma exibição admin dos dados de aceite ainda; adicionar em uma sprint de auditoria se necessário.
- Relatório `SPRINT_11B_REPORT.md` ao final.