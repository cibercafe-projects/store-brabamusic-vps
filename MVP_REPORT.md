# Braba Music — Relatório Final do MVP

## Funcionalidades implementadas (Sprints 0–10)

**Catálogo público**
- Home, listagem de beats com filtros (gênero, mood, BPM, preço), página individual `/beat/$slug` com player.
- Páginas de produtoras (`/produtoras`, `/produtora/$slug`).
- Páginas institucionais (Como funciona, Termos, Privacidade).

**Player e interesse**
- PlayerBar global com fila e auto-play.
- Form de interesse + contagem de plays.

**Auth e backoffice**
- Login admin com `user_roles` (`admin` / `is_super`), proteção via `_authenticated`.
- Sidebar admin (Dashboard, Produtoras, Beats, Leads, Lançamentos, Compras, Usuários, Configurações).

**Produtoras / Beats**
- CRUD completo, avatar e capa em buckets privados com signed URLs, preview de áudio.

**Leads**
- Captura via interesse, kanban-like com mudança de status (novo → contato → negociação → pago/entregue/perdido).

**Lançamentos**
- Form público `/enviar-lancamento` com capa, áudios (WAV/MP3) e fotos de divulgação como links externos para download em ZIP, letra também por link.
- Backoffice `/admin/lancamentos`.

**Fluxo comercial (Sprint 9)**
- Botão COMPRAR em beats; `PurchaseDialog` em 3 passos (pagamento PIX/Link, dados, termos).
- Token único para `/enviar-comprovante/$token`.
- Bucket privado `purchase-receipts`.
- Backoffice `/admin/compras` com filtros, detalhe, signed URL para comprovante, troca de status, WhatsApp/e-mail.

**Entrega pós-pagamento (Sprint 10)**
- Arquivos privados WAV / STEMS / Licença por beat.
- `DeliveryDialog` com canais e-mail + WhatsApp, signed URLs 7d.
- Tabela `purchase_deliveries` com histórico.
- Atualização automática para `arquivos_enviados`.

## Arquitetura atual

- **Frontend / Server**: TanStack Start v1 + React 19 + Vite 7. Roteamento file-based em `src/routes/`. Server logic via `createServerFn` em `src/lib/*.functions.ts`. Worker (Cloudflare) com nodejs_compat.
- **Backend (Lovable Cloud / Supabase)**: Postgres com RLS, Auth (e-mail/senha + Google), Storage (10 buckets privados), service-role só no server.
- **Dados**: `producers`, `beats`, `releases`, `release_audio_files`, `release_promo_photos`, `leads`, `app_settings`, `purchase_requests`, `purchase_deliveries`, `user_roles`.
- **Storage**: `producer-avatars`, `beat-covers`, `beat-previews`, `beat-wav`, `beat-stems`, `beat-licenses`, `release-covers`, `release-audio`, `release-photos`, `purchase-receipts` — todos privados, acesso via signed URLs.
- **UI**: shadcn/ui + Tailwind, design system em `src/styles.css`.
- **Domínios**: `brababeats.app` (custom) + `store-brabamusic.lovable.app`.

## Pontos de evolução para Fase 2

1. **Pagamento automatizado**: integração PIX (Mercado Pago / OpenPix) ou Stripe com webhook confirmando `pagamento_confirmado`.
2. **Entrega automática**: ao receber webhook de pagamento, disparar `deliverPurchase` sem intervenção do admin.
3. **E-mail transacional**: configurar domínio e ativar template `beat-delivery` (já preparado no fluxo).
4. **Licenciamento dinâmico**: gerar PDF de licença personalizado por compra (nome do cliente, data, escopo) em vez de arquivo único.
5. **Área do comprador**: login do cliente para baixar arquivos sem depender de links assinados expirando.
6. **Marketplace de produtoras**: dashboard por produtora, split de receita, relatórios mensais.
7. **Antifraude**: limite de tentativas, validação de comprovante via OCR/Open Banking.
8. **Analytics**: plays únicos, conversão por beat, funil de compra detalhado, integração GA4/Meta.
9. **App mobile (PWA)**: cache offline da preview, push notifications.
10. **SEO / Conteúdo**: sitemap dinâmico, blog, schema.org `MusicRecording`.

## Recomendações operacionais

- **Backups**: ativar Point-In-Time Recovery do Postgres antes de operar com volume real; export semanal automático.
- **Monitoramento**: acompanhar `email_send_log` (após configurar domínio), `purchase_requests` em `aguardando_pagamento > 48h` e `pagamento_confirmado` sem entrega > 24h.
- **Rotação de chaves**: rotacionar `SUPABASE_SERVICE_ROLE_KEY` e `LOVABLE_API_KEY` a cada 90 dias; redeployar.
- **Política de retenção**: comprovantes (`purchase-receipts`) → manter 5 anos (obrigação fiscal). Arquivos privados de beat → enquanto produto ativo.
- **Auditoria**: revisar `purchase_deliveries` mensalmente para validar SLA de entrega; manter `admin_notes` preenchido.
- **Segurança**:
  - Confirmar RLS em todas as tabelas novas antes de cada release.
  - Nunca expor signed URLs em logs; TTL atual 7 dias é adequado, reduzir para 48h em Fase 2.
  - Habilitar 2FA para todos os admins.
- **Suporte**: criar canal único WhatsApp Business para `commercial_whatsapp` configurado em `app_settings`.
- **Domínio de e-mail**: prioridade alta para Fase 2 — habilita confirmação de compra, comprovante recebido e entrega de arquivos por e-mail.
- **Performance**: monitorar custo de signed URL generation se volume crescer; considerar cache de 6h em URLs ainda válidas.

---
MVP completo: catálogo → compra → comprovante → confirmação → entrega → venda concluída. Pronto para validação real com a operação Braba Music.
