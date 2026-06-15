# Entrega de arquivos — destaque, ações rápidas e visibilidade do responsável

A base de entrega já existe (`DeliveryDialog`, `deliverPurchase`, tabela `purchase_deliveries` com `enviado_por` e `enviado_em`). Faltam: destaque dos pedidos pendentes, dois botões diretos (WhatsApp + e-mail mailto) seguindo o padrão do `ResendInstructionsCard`, e exibição clara do responsável + data + sucesso.

## 1. Destaque de pedidos pendentes de entrega

**Lista `/admin/compras` (`compras.index.tsx`):**
- Adicionar coluna/visual para pedidos com status `pagamento_confirmado`: linha com borda esquerda accent + badge "Entregar agora" (variant accent). Filtro rápido novo no topo: botão "Pendentes de entrega" que aplica `status=pagamento_confirmado`.
- Ordenação: pendentes de entrega aparecem primeiro quando o filtro for "Todos" (ordenar em memória após a query: `pagamento_confirmado` primeiro, depois `created_at desc`).

**Dashboard admin (`dashboard.tsx`):** já consome `getDeliveryStats` (`pendentes`/`enviados`). Sem mudança necessária além de garantir que o card "Pendentes de entrega" tenha link rápido para `/admin/compras?status=pagamento_confirmado` (search param) — se já estiver, mantém.

## 2. Seção "Entrega de arquivos" — dois botões diretos

Hoje a seção tem um botão único que abre o `DeliveryDialog` (que tem checkboxes de canal + arquivos). Vamos manter o dialog para casos avançados, mas adicionar dois botões diretos no card principal, no mesmo padrão do `ResendInstructionsCard`:

- **Botão "Enviar por WhatsApp"** — chama `deliverPurchase` com todos os arquivos disponíveis selecionados + `canal_whatsapp=true`, `canal_email=false`. Servidor retorna `whatsapp_url` pronta (mensagem com links assinados de 7 dias) e abre em nova aba. Já existe o backend; só consumir.
- **Botão "Enviar por E-mail"** — duas opções:
  - **Padrão (recomendado e meu default):** dispara `deliverPurchase` com `canal_email=true`, `canal_whatsapp=false`. O sistema envia o e-mail transacional `purchase-delivered` (template já configurado, com a mensagem e os links).
  - **Mailto manual:** abre `mailto:` com assunto e corpo pré-preenchido contendo a mensagem padrão (sem links assinados — apenas texto, já que `mailto:` não consegue gerar URLs de 7 dias no momento do clique sem antes chamar o servidor). 
  
  **Plano:** botão único "Enviar por E-mail" usa o **envio transacional** (links assinados garantidos). Acrescento abaixo um link discreto "Abrir no meu e-mail (mailto)" que dispara `deliverPurchase` apenas para registrar entrega + gerar links, e em seguida abre `mailto:` com os links já gerados no corpo. Isso atende "padrão já usado" (mailto) e "link gerado" sem perder os signed URLs.

  Se preferir apenas um botão e simplificar, me avise — meu default é os dois acima (transacional + mailto), espelhando o pattern do `ResendInstructionsCard`.

- **Botão "Mais opções"** — abre o `DeliveryDialog` atual para casos com seleção custom de arquivos / observação interna.

Validações:
- Botões desabilitados se status ≠ `pagamento_confirmado` (ou `arquivos_enviados` para reenvio).
- Desabilita "WhatsApp" se cliente não tem whatsapp; "E-mail" se cliente não tem e-mail; e ambos se beat não tem nenhum arquivo cadastrado.

## 3. Confirmação visual + responsável + data

**Estado pós-entrega no card:**
- Quando `purchase.status === 'arquivos_enviados'`, exibir bloco verde de sucesso no topo do card: ícone `CheckCircle2`, texto **"Arquivos entregues"**, data de `delivered_at` e nome (e-mail) do responsável da **última** entrega.
- Histórico de entregas resumido (últimas 3) abaixo dos botões, com data, canais usados e responsável.

**Backend — enriquecer `listDeliveries`:**
- Hoje retorna `enviado_por` como UUID. Adicionar lookup dos e-mails dos responsáveis via `supabaseAdmin.auth.admin.listUsers()` (ou `getUserById` por id, em paralelo via `Promise.all`) e devolver `enviado_por_email: string | null` para cada linha.
- Custo: poucos itens por compra; sem impacto perceptível.

**Frontend:**
- O hook de histórico já existe (`listDeliveries`). Trazê-lo também no card principal (não apenas no dialog) com `useQuery` em `purchase-deliveries`, e renderizar a linha de destaque do último responsável.
- Após `deliverPurchase` ter sucesso, invalidar `["admin","deliveries",purchase_id]` (já feito no dialog) — replicar no card.

## 4. Migração e schema

Nenhuma migração necessária — `purchase_deliveries.enviado_por`, `enviado_em`, e `purchase_requests.delivered_at` já existem e são preenchidos pelo handler atual.

## Arquivos afetados

- `src/lib/deliveries.functions.ts` — `listDeliveries` retorna `enviado_por_email`; nova `deliverPurchaseQuick` (ou parametrização para chamada simplificada com "todos os arquivos disponíveis"). Reaproveito `deliverPurchase` existente passando o array filtrado pelo client.
- `src/routes/admin/_protected/compras.$id.tsx` — refatora o card "Entrega de arquivos" com os 2 botões + bloco de sucesso + responsável + histórico.
- `src/routes/admin/_protected/compras.index.tsx` — destaque das linhas pendentes + filtro rápido.
- (sem mudanças no `DeliveryDialog` além de continuar funcionando como "Mais opções".)

## Fora de escopo

- Nenhuma mudança no template `purchase-delivered.tsx` (já contém os links e os documentos adicionados na etapa anterior).
- Nenhuma mudança em fluxo de pagamento ou comprovante.
- Sem notificação push/realtime — basta refresh por `useQuery`.
