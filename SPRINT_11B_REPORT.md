# Sprint 11B — Licenciamento Dinâmico na Compra

## Objetivo

Consumir os dados jurídicos da Sprint 11A no fluxo de compra: quando o cliente escolhe um beat, o `PurchaseDialog` carrega automaticamente os textos de **Créditos**, **Registro** e **Royalties** da produtora do beat (read-only), exige aceite explícito e persiste evidência do consentimento no banco. **Nenhum PDF é gerado** nesta sprint.

## Entregas

### Banco

Migração em `public.purchase_requests` (todas nullable — pedidos existentes intactos):

| Coluna | Tipo | Uso |
|---|---|---|
| `license_accepted` | boolean | Flag de aceite dos termos da produtora |
| `license_accepted_at` | timestamptz | Data e hora do aceite |
| `license_version` | text | Versão dos termos exibidos (`CURRENT_LICENSE_VERSION`) |
| `license_snapshot` | jsonb | Fotografia dos textos exibidos + dados da produtora + `captured_at` |

RLS/GRANT inalterados — server functions usam `supabaseAdmin`.

### Constante compartilhada

Novo `src/lib/licenses.constants.ts` exporta `CURRENT_LICENSE_VERSION = "2026-07-01.v1"`. Bump manual quando os textos padrão ou a estrutura de exibição mudarem.

### Server functions (`src/lib/purchases.functions.ts`)

- **`getBeatLicenseInfo` (nova, pública)**: recebe `{ beat_id }`, faz join `beats → producers` e devolve só campos display-safe: `produtora_nome`, `nome_artistico_creditos`, `texto_creditos`, `texto_registro`, `texto_royalties`, `license_version`. **Não expõe** CPF, e-mail comercial nem e-mail de royalties.
- **`createPurchaseRequest` (estendida)**:
  - Schema agora exige `license_accepted: literal(true)` e `license_version: string(1..40)`.
  - Handler carrega os textos da produtora na query do beat, monta o `license_snapshot` no server (fonte da verdade — client não pode falsificar) e grava `license_accepted = true`, `license_accepted_at = now()`, `license_version`, `license_snapshot` no insert.

### UI (`src/components/purchase/PurchaseDialog.tsx`)

- Novo `useQuery(["beat-license", beatId])` chamando `getBeatLicenseInfo` quando o dialog abre.
- Nova seção **"Licenciamento da produtora"** logo abaixo do card "Beat selecionado", exibindo:
  - Header com "prod. {nome_artistico_creditos ?? produtora_nome}".
  - Três blocos read-only (Créditos, Registro, Royalties) com `whitespace-pre-wrap`.
  - Fallback em itálico "— não informado pela produtora —" para textos vazios.
  - Spinner enquanto carrega.
  - Checkbox **"Li e concordo com os termos de licenciamento acima da produtora"**.
- `canSubmit` passa a exigir também `licenseAccepted === true`. Reset no fechamento do dialog.
- No submit, envia `license_accepted: true` + `license_version: CURRENT_LICENSE_VERSION`.

O aceite existente ("Licença de Uso dos Beats" + "Termos de Uso da Braba Music") **permanece intocado** — são camadas distintas: contrato global da plataforma × licenciamento específico daquela produtora.

## Rastreio "quem, quando, versão, usuário"

- **Quem**: `nome_cliente`, `nome_artistico`, `email`, `whatsapp`, `instagram` já persistidos no pedido.
- **Quando**: `license_accepted_at` (server-side, `now()`).
- **Versão**: `license_version` (validada no server).
- **Conteúdo exato**: `license_snapshot` jsonb, capturado no server no momento do insert.

## Fora do escopo (intocado)

- Geração de PDF, templates de e-mail, entregas, admin de compras, catálogo público, `PurchaseDialog` "receipt step".

## Testes de aceitação

1. Cadastrar produtora **Ayla** com todos os textos jurídicos preenchidos.
2. Cadastrar produtora **Anônima Beats** sem textos (só nome).
3. Vincular um beat a cada produtora.
4. Abrir catálogo → clicar Comprar no beat da Ayla → dialog exibe os 3 textos da Ayla; sem marcar o novo checkbox o botão fica desabilitado; marcar tudo e enviar → pedido criado.
5. Repetir para o beat da Anônima Beats → seção mostra "— não informado pela produtora —" em cada bloco; aceite ainda é obrigatório.
6. Consultar `purchase_requests`: `license_accepted = true`, `license_accepted_at` preenchido, `license_version` = `"2026-07-01.v1"`, `license_snapshot` com os textos corretos por produtora.
7. Nenhum PDF gerado; fluxo de entrega/admin inalterado.

## Dívidas e próximos passos (Sprint 11C sugerida)

- Consumir `license_snapshot` na geração dinâmica do PDF de licença (substituir trechos hardcoded).
- Exibir os dados de aceite na tela admin de detalhe da compra (auditoria).
- Considerar bump automático de `license_version` quando o admin editar textos jurídicos de uma produtora.
- Adicionar UNIQUE parcial em `producers.cpf WHERE cpf IS NOT NULL` caso o negócio exija.

**Critério de pronto (Sprint 11B):** o dialog carrega e exibe textos da produtora do beat, exige aceite, persiste snapshot + timestamp + versão, e nenhum fluxo existente foi alterado. ✅
