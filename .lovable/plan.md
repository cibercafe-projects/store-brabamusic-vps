## Sprint 9 — Fluxo de Compra Assistida

Implementação completa do fluxo comercial de compra de beats, **sem gateway de pagamento**. Tudo é confirmado manualmente pela equipe Braba.

### Decisões

- Sem login para o comprador (público), igual ao envio de lançamento.
- Token único (`continuation_token` UUID) para envio posterior do comprovante via link.
- Comprovante salvo em bucket privado `purchase-receipts`, acessado por server functions com `supabaseAdmin` (signed URLs).
- Notificações por e-mail via Lovable Emails (app email transacional) — exigirá configurar domínio de e-mail. WhatsApp via `wa.me` link aberto no navegador.
- Configurações (chave PIX, link de pagamento, WhatsApp comercial) gerenciadas em `app_settings` (já existente), com novas chaves.

### Banco de dados (migração)

Tabela `public.purchase_requests`:
- `id uuid pk`
- `beat_id uuid → beats`
- `nome_cliente`, `email`, `whatsapp`, `instagram` (nullable)
- `forma_pagamento` enum `pix | link`
- `termos_aceitos boolean`
- `valor numeric(10,2)` (snapshot do preço)
- `status` enum `aguardando_pagamento | comprovante_recebido | pagamento_confirmado | arquivos_enviados | cancelado`
- `receipt_path text` (nullable)
- `continuation_token uuid unique`
- `admin_notes text`
- `created_at`, `updated_at`

RLS: nenhuma policy pública. Toda escrita/leitura via server fn com `supabaseAdmin` (após validação). GRANT só `service_role`.

Novas chaves em `app_settings`: `pix_key`, `payment_link`, `commercial_whatsapp` (default `+5511913401000`).

Bucket privado `purchase-receipts`.

### Server functions

`src/lib/purchases.functions.ts`:
- `getPurchaseSettings` (pública) → retorna `pix_key`, `payment_link`, `commercial_whatsapp`.
- `createPurchaseRequest` (pública) → valida Zod, insere registro, gera token, dispara e-mail, retorna `{ id, continuation_token }`.
- `uploadReceipt` (pública, recebe token + base64) → valida tipo/tamanho, sobe no bucket via admin, marca status `comprovante_recebido`.
- `getPurchaseByToken` (pública) → resumo para a página `/enviar-comprovante/:token`.
- Admin: `listPurchases`, `getPurchase`, `updatePurchaseStatus`, `getReceiptSignedUrl` (com `requireSupabaseAuth` + check admin).
- `getPurchaseDashboardCounts` para dashboard.

### Frontend público

- **Botão COMPRAR** em `BeatCard.tsx` e `src/routes/beat.$slug.tsx`.
- **`PurchaseDialog`** (novo componente) com etapas:
  1. Resumo (nome, produtora, valor) + escolha PIX/Link + dados do PIX/link + WhatsApp comercial.
  2. Form comprador + checkbox termos (link para `/termos-uso`).
  3. Submit → recebe token, abre etapa "Envio do Comprovante" com upload imediato OU "Enviar depois".
  4. Após submeter, abre `wa.me/5511913401000?text=...` em nova aba.
- **Página `/enviar-comprovante/$token`**: mostra resumo + upload (reaproveita componente).

### E-mail

- Verificar se há domínio de e-mail configurado. Se não houver, mostrar o setup dialog e parar. (O remetente real será o domínio verificado; usaremos "Braba Music" como display name e mencionaremos `braba.ent@gmail.com` como contato no corpo do e-mail, já que envios diretos por essa conta Gmail não são suportados pelo Lovable Emails.)
- Após domínio + infra prontos, scaffold de app email + template `purchase-confirmation` com beat, valor, link `/enviar-comprovante/:token`.

### Backoffice

- Item "Compras" na sidebar (ícone `ShoppingCart`).
- `/admin/compras` (lista com filtros por status, busca por cliente/beat).
- `/admin/compras/$id` (detalhe): visualizar/baixar comprovante (signed URL), trocar status, botões WhatsApp (`wa.me`) e e-mail (`mailto:`).
- `/admin/configuracoes`: adicionar campos PIX, link de pagamento, WhatsApp comercial.
- Dashboard: 4 cards novos (solicitadas, comprovantes pendentes, pagamentos confirmados, arquivos enviados).

### Arquivos a criar/editar

**Criar**
- `supabase/migrations/<ts>_purchase_requests.sql`
- `src/lib/purchases.functions.ts`
- `src/components/purchase/PurchaseDialog.tsx`
- `src/components/purchase/ReceiptUploader.tsx`
- `src/routes/enviar-comprovante.$token.tsx`
- `src/routes/admin/_protected/compras.index.tsx`
- `src/routes/admin/_protected/compras.$id.tsx`

**Editar**
- `src/components/BeatCard.tsx`, `src/routes/beat.$slug.tsx` — botão Comprar
- `src/components/admin/AppSidebar.tsx` — item Compras
- `src/lib/settings.functions.ts` — novos campos
- `src/routes/admin/_protected/configuracoes.tsx` — novos inputs
- `src/routes/admin/_protected/dashboard.tsx` — novos cards

### Observação sobre o remetente

`braba.ent@gmail.com` é Gmail e não pode ser usado como `From:` no Lovable Emails. Os e-mails sairão do domínio verificado (`notify.<seu-domínio>`) com "Braba Music" no nome do remetente, e mencionaremos `braba.ent@gmail.com` como contato dentro do conteúdo. Se preferir manter Gmail literal, precisaríamos do conector Gmail (compras enviadas a partir da sua caixa) — me avise.
