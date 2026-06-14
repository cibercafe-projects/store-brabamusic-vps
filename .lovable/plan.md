# Verificação do estado atual

| Notificação | Status |
|---|---|
| Cliente: confirmação de compra + link de comprovante | ❌ Não implementado |
| Cliente: confirmação de entrega dos arquivos | ⚠️ Parcial — `deliverPurchase` tem `TODO: enviar quando domínio estiver configurado` (e-mail nunca é enviado; WhatsApp só abre `wa.me` em nova aba) |
| Admin Braba: nova compra | ❌ Não implementado |
| Admin Braba: novo comprovante | ❌ Não implementado |
| Admin Braba: novo lançamento | ❌ Não implementado |
| Artista: confirmação de recebimento do lançamento | ❌ Não implementado |
| Artista: mudança de status do lançamento | ❌ Não implementado |
| Reenvio de instruções (`ResendInstructionsCard`) | ⚠️ Só registra no banco, não envia |
| WhatsApp automático (Twilio) | ❌ Não conectado |
| Domínio `notify.brababeats.app` | ✅ Verificado |
| Infra de fila de e-mail (pgmq + cron) | ✅ Pronta |

Resumo: **a infraestrutura está pronta, mas nenhum envio automático está ativo.** Falta scaffolding transacional, templates, gatilhos e Twilio.

# Plano

## 1. Configuração (pré-requisitos)
- Rodar scaffold de e-mail transacional (cria rotas `/lovable/email/transactional/send` + preview + suppression + unsubscribe + página de unsubscribe).
- Adicionar setting `admin_notification_email` em `app_settings` (e campo na tela de Configurações) para definir o destinatário das notificações administrativas.
- Conectar Twilio (connector) — necessário para WhatsApp automático ao cliente. Se o usuário preferir adiar, mantemos WhatsApp manual via `wa.me` e implementamos só e-mail agora.

## 2. Templates de e-mail (em `src/lib/email-templates/`)
Branding consistente com o site (cores, tipografia atuais), sem promoções:

**Cliente (compras)**
- `purchase-created` — "Recebemos seu pedido" com instruções de pagamento (PIX/link) + botão "Enviar comprovante" (link `/enviar-comprovante/{token}`).
- `receipt-received` — "Comprovante recebido, em análise".
- `purchase-delivered` — "Seus arquivos estão prontos" com links assinados (já gerados em `deliverPurchase`).

**Cliente (lançamentos)**
- `release-received` — "Recebemos seu lançamento".
- `release-status-changed` — status legível + observação do admin.

**Admin**
- `admin-new-purchase` — dados do cliente, beat e valor + link para `/admin/compras/{id}`.
- `admin-new-receipt` — aviso de comprovante recebido + link.
- `admin-new-release` — novo lançamento recebido + link.

## 3. Helper de envio
`src/lib/email/send.ts` — wrapper que faz POST para `/lovable/email/transactional/send` com `idempotencyKey` derivada do evento (`purchase-created-{id}`, `release-status-{id}-{status}` etc.) para evitar duplicação em retry.

## 4. WhatsApp (Twilio, se aprovado)
`src/lib/whatsapp/send.server.ts` — POST para gateway Twilio (`/Messages.json`) usando template do conteúdo WhatsApp Business. Apenas notificações ao cliente:
- Confirmação de compra com link do comprovante.
- Aviso quando entrega for feita (links de arquivo).
Admin recebe só por e-mail (já tem painel).

## 5. Gatilhos (server fns existentes)
| Server fn | Adicionar |
|---|---|
| `createPurchaseRequest` | enviar `purchase-created` ao cliente + `admin-new-purchase` ao admin + WhatsApp ao cliente |
| `uploadReceiptByToken` | enviar `receipt-received` ao cliente + `admin-new-receipt` ao admin |
| `deliverPurchase` | enviar `purchase-delivered` (remover TODO) + WhatsApp ao cliente |
| `logResendInstructions` → renomear para `resendPaymentInstructions` | reenviar `purchase-created` por e-mail e/ou WhatsApp de fato |
| `createRelease` (em `releases.functions.ts`) | enviar `release-received` ao artista + `admin-new-release` ao admin |
| `updateReleaseStatus` | enviar `release-status-changed` ao artista |

Cada envio é envolvido em `try/catch` e logado, sem bloquear a operação principal (o registro no banco é a fonte de verdade).

## 6. UI
- Em `Configurações`: campo "E-mail para notificações administrativas".
- `ResendInstructionsCard`: feedback real ("E-mail enviado" / "WhatsApp enviado").
- `DeliveryDialog`: remover aviso "aguardando configuração de domínio".

## Detalhes técnicos
- Todos os envios via fila pgmq (não bloqueiam request).
- `from`: `Braba Beats <noreply@notify.brababeats.app>` (display from root quando habilitado).
- Página `/email/unsubscribe` será criada pelo scaffold.
- Sem anexos: arquivos entregues são links assinados de 7 dias (já implementado).

## Pergunta antes de implementar
Twilio para WhatsApp automático: **conectar agora** (você precisa de uma conta Twilio com WhatsApp habilitado) ou **adiar** e manter só WhatsApp manual (`wa.me`) por enquanto e implementar todos os e-mails agora?
