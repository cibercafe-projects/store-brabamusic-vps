## Sprint 10 — Entrega de Arquivos Pós-Pagamento

Fecha o ciclo comercial: admin associa arquivos privados ao beat, confirma pagamento e entrega WAV / STEMS / Licença por e-mail e/ou WhatsApp, com histórico e atualização automática de status.

### 1. Arquivos privados do beat

**Migração** adiciona em `public.beats`:
- `wav_path text`, `stems_path text`, `license_path text` (nullable)
- Mantém `wav_url`/`stems_url` legados; passamos a usar `*_path` + signed URLs.

**Buckets privados novos** (via tool de storage): `beat-wav`, `beat-stems`, `beat-licenses`. Sem policies públicas — leitura/escrita só via `supabaseAdmin`.

**Admin BeatForm**: três novos uploaders (reaproveitando padrão do `BeatPreviewUploader`) com server fns `uploadBeatPrivateFile` / `deleteBeatPrivateFile` (admin-only, validam mime e tamanho — WAV até 200MB, ZIP até 500MB, PDF até 20MB).

### 2-4. Backoffice de compras + dialog de entrega

`/admin/compras/$id`: novo card **"Entrega de Arquivos"** com cliente, beat, e-mail, WhatsApp, status atual, lista de arquivos disponíveis (WAV / STEMS / Licença, com aviso quando faltam no cadastro do beat) e botão **ENTREGAR ARQUIVOS** habilitado só com `status = pagamento_confirmado` (ou re-entrega quando `arquivos_enviados`).

**`DeliveryDialog`** (novo): mostra arquivos disponíveis (checkbox por arquivo), canais Email/WhatsApp pré-marcados conforme o que o comprador informou, campo de observação opcional. Submit chama `deliverPurchase`.

### 5. E-mail

**Pré-requisito**: nenhum domínio de e-mail configurado hoje. Antes de implementar o template, exibo o setup dialog para o admin verificar/configurar o domínio:

```
<presentation-actions>
<presentation-open-email-setup>Configurar domínio de e-mail</presentation-open-email-setup>
</presentation-actions>
```

Depois disso, rodo `setup_email_infra` + `scaffold_transactional_email` e crio o template `beat-delivery` (React Email) com nome do beat, mensagem de agradecimento e links assinados (validade 7 dias) para cada arquivo entregue. O envio usa o helper `sendTransactionalEmail` com `idempotencyKey = delivery-${deliveryId}`.

Se o domínio ainda não estiver pronto na hora da entrega, a server fn registra o canal e-mail como `pendente`, retorna aviso para o admin e o card mostra "Aguardando configuração de e-mail".

### 6-7. WhatsApp + entrega dupla

Server fn `deliverPurchase` retorna um `whatsapp_url` (`https://wa.me/<num>?text=...`) com a mensagem padrão (nome do beat + lista de links assinados marcados). O dialog abre automaticamente em nova aba quando WhatsApp foi escolhido. Os dois canais podem ser usados simultaneamente.

### 8-10. Tabela `purchase_deliveries` + status

**Migração**:
```sql
create table public.purchase_deliveries (
  id uuid pk,
  purchase_id uuid → purchase_requests on delete cascade,
  enviado_email boolean not null default false,
  enviado_whatsapp boolean not null default false,
  arquivos jsonb not null,        -- ['wav','stems','license']
  enviado_em timestamptz not null default now(),
  enviado_por uuid references auth.users,
  observacao text,
  created_at timestamptz not null default now()
);
```
RLS habilitada; acesso só via service role (server fns admin). Inclui GRANTs corretos (`service_role` ALL).

Após registro bem-sucedido, `deliverPurchase` atualiza `purchase_requests.status = 'arquivos_enviados'` e registra `delivered_at`.

### 11. Dashboard

Em `dashboard.tsx`, ampliar o bloco "Compras":
- **Pendentes de envio** (status `pagamento_confirmado`)
- **Arquivos enviados** (já existe)
- **Compras concluídas** = `arquivos_enviados`

Função `getPurchaseDashboardCounts` ganha esses campos.

### Segurança

- Buckets `beat-wav` / `beat-stems` / `beat-licenses` permanecem privados.
- Server fn `getDeliverySignedUrls` exige admin via `has_role`.
- Links nos e-mails/WhatsApp são signed URLs (7d). Nada é exposto diretamente.

### Arquivos a criar/editar

**Criar**
- Migração: colunas em `beats`, tabela `purchase_deliveries`, buckets privados.
- `src/lib/deliveries.functions.ts` (`deliverPurchase`, `listDeliveries`, `getDeliverySignedUrls`).
- `src/components/admin/beats/BeatPrivateFileUploader.tsx`.
- `src/components/purchase/DeliveryDialog.tsx`.
- `src/lib/email-templates/beat-delivery.tsx` (depois do scaffold).

**Editar**
- `src/lib/beats.functions.ts` — upload/remove privados, retornar novos paths.
- `src/components/admin/beats/BeatForm.tsx` — 3 uploaders.
- `src/lib/purchases.functions.ts` — incluir comprador completo + flags de arquivos disponíveis; `getPurchaseDashboardCounts` com novos contadores.
- `src/routes/admin/_protected/compras.$id.tsx` — bloco de entrega + botão + dialog.
- `src/routes/admin/_protected/dashboard.tsx` — novos cards.

### Entregável extra: Relatório final do MVP

Criar `SPRINT_10_REPORT.md` + `MVP_REPORT.md` na raiz com:
- Funcionalidades implementadas (Sprints 0-10).
- Arquitetura atual (TanStack Start + Cloud, server fns, storage buckets, RLS, e-mails).
- Pontos de evolução para Fase 2 (gateway PIX/Stripe, entrega automática, licenciamento, dashboards de receita, área do comprador, antifraude).
- Recomendações operacionais (backup, monitoramento de e-mails, rotação de chaves, política de retenção de comprovantes).

### Pergunta antes de implementar

**Domínio de e-mail**: você quer configurar agora o domínio (necessário para o canal de e-mail funcionar) ou prefere que eu siga apenas com WhatsApp habilitado e deixe o e-mail como "pendente de configuração" no dialog?
