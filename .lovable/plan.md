# Compra e checkout — nome artístico, dois documentos e botão de comprovante

Três frentes na janela de compra (`PurchaseDialog`) + um campo novo no pedido + uma página nova de licença + ajuste no e-mail de entrega.

## 1. Banco — novo campo "Nome Artístico"

Migration:

- `ALTER TABLE public.purchase_requests ADD COLUMN nome_artistico text;` (nullable — pedidos antigos não têm).

GRANTs/RLS já cobrem (apenas admin lê/escreve via service role + RLS atual).

## 2. Página nova `/licenca-de-uso`

Criar `src/routes/licenca-de-uso.tsx` no mesmo padrão visual de `termos-uso.tsx`, com `head()` próprio (title, description, OG). Conteúdo: descrição das licenças oferecidas (Lease / Premium / Exclusiva), usos liberados/proibidos por modalidade, prazo de entrega, política de revenda e atribuição.

**Pergunta aberta:** preciso do texto final da Licença de Uso. Se não enviar agora, eu publico um rascunho padrão com as três modalidades já mencionadas em `como-funciona.tsx` (Lease, Premium, Exclusiva) e você ajusta depois — sem mudança de código.

## 3. `PurchaseDialog` — checkout

### 3.1 Formulário
- Novo input **"Nome artístico"** (opcional, máx. 120 chars), entre "Nome completo" e "E-mail".
- Estado `nomeArtistico` + reset no `useEffect`.
- Enviar `nome_artistico` no payload do `createPurchaseRequest`.

### 3.2 Aceite de documentos
Substituir o bloco atual de aceite (uma checkbox + link único de "Termos de Uso") por:

- Texto introdutório curto: "Antes de finalizar, leia e aceite os documentos abaixo. Eles também serão enviados por e-mail junto com os arquivos do beat."
- **Dois itens em lista**, cada um com nome + link "Abrir" (target="_blank") apontando para `/licenca-de-uso` e `/termos-uso`.
- **Uma única checkbox** "Li e aceito a Licença de Uso dos Beats e os Termos de Uso da Braba Music." (mantém um único `aceito` no estado, evita complexidade desnecessária).

### 3.3 Tela de sucesso (step "receipt")
- **Remover** o botão "Enviar informações para meu WhatsApp" (e a função `whatsappLink`, se ficar órfã).
- **Renomear** o botão "Enviar Comprovante" → **"ENVIAR COMPROVANTE DE PAGAMENTO"** (texto em caixa alta, mantém `Upload` icon). Promover esse botão a destaque principal: estilo `bg-accent text-accent-foreground` (mesma cor de "Pagar Agora"), e o "Pagar Agora" passa a `variant="outline"`. **OU** manter o "Pagar Agora" como ação principal — me diga qual prefere; meu default é "ENVIAR COMPROVANTE" como principal (alinha com a remoção do WhatsApp e o foco do passo).
- Manter os botões "Pagar Agora" e "Copiar Informações".
- Remover do passo-a-passo o item "Avise a administração da Braba pelo WhatsApp" (que sumiu junto com o botão).

## 4. Server function `createPurchaseRequest` (`src/lib/purchases.functions.ts`)

- Adicionar `nome_artistico: z.string().trim().max(120).optional().transform(v => v || null).nullable()` ao `createSchema`.
- Persistir `nome_artistico: data.nome_artistico` no `insert`.
- Passar `nomeArtistico` para os templates `purchase-created` e `admin-new-purchase` (campo opcional; nada quebra se ausente).

## 5. E-mail de entrega — anexar os documentos

Quando o admin entrega o beat, o e-mail `purchase-delivered` deve incluir referência aos dois documentos.

- `src/lib/email-templates/purchase-delivered.tsx`: adicionar parágrafo final com dois links: **Licença de Uso dos Beats** → `${siteUrl}/licenca-de-uso` e **Termos de Uso** → `${siteUrl}/termos-uso`. Sem anexos físicos (mais simples, sem complicação de bundle e MIME no worker — links públicos cumprem o requisito de "enviados ao cliente").
- Se preferir PDF anexo no futuro, fica registrado como follow-up.

## 6. UI das compras no admin (mínimo)

`src/routes/admin/_protected/compras.$id.tsx`: exibir o **Nome artístico** (quando preenchido) logo abaixo do nome do cliente, sem outras mudanças de layout.

## Fora de escopo

- Sem mudanças no fluxo de pagamento (PIX/link continuam iguais).
- Sem mudanças no `enviar-comprovante.$token.tsx`.
- Sem anexos físicos no e-mail — apenas links para as páginas hospedadas.
- Sem alteração do número comercial exibido no rodapé do modal (continua útil como contato).
