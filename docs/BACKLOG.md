# BACKLOG — BRABA Music

Pendências, melhorias e itens ainda não entregues. O que já foi
entregue/alterado fica em [`CHANGELOG.md`](./CHANGELOG.md).

## Legenda

- 🔴 Crítico (bloqueia operação)
- 🟡 Importante
- 🟢 Melhoria / desejável
- 🚧 Em andamento

---

## 🚧 Em andamento

_(nenhum item no momento — adicione aqui o que estiver sendo tocado agora)_

## 🔴 Crítico

- Backup diário do Postgres (`pg_dump`) com restore testado
- Pagamento automatizado (Pix / Stripe / Mercado Pago com webhook)
- Testar Auth, PostgreSQL e Storage individualmente no VPS novo
- Revisar histórico público do Git por credenciais antigas e revogar/rotacionar

## 🟡 Importante

- Compactar comprovantes no cliente antes do upload (JPEG/WebP ~1000px, q~70)
- Mojibake de emoji (🔥 ✅) nos e-mails transacionais
- Ativar envio por e-mail do `deliverPurchase` (TODO em `purchases.functions.ts`)
- Captura de leads / "Tenho interesse" — consolidar com o que já existe em `/admin/leads`
- Contrato eletrônico para licença Exclusiva
- Busca full-text no catálogo (`to_tsvector` + GIN; hoje usa `ILIKE`)
- Política de licenciamento por beat (hoje há apenas `preco` único)
- Revisar conteúdo jurídico em `/politica-privacidade` e `/termos-uso`
- Estratégia de cache/CDN para signed URLs (ou liberar buckets como públicos)
- Entrega automática ao receber webhook de pagamento (`deliverPurchase` sem admin)
- Backup do Storage (rustfs/S3) com retenção e restore testado
- Monitoramento (pm2/nginx, disco, memória, HTTP, uptime externo)
- PITR do Postgres antes de operar com volume real
- Alerta de `purchase_requests` em `aguardando_pagamento > 48h`
- Alerta de `pagamento_confirmado` sem entrega > 24h
- Habilitar 2FA para todos os admins

## 🟢 Melhoria / desejável

- `GOTRUE_MAILER_EXTERNAL_HOSTS` na stack (silencia aviso no log do GoTrue)
- Integração WhatsApp Business API
- Painel do produtor (self-service da própria produtora)
- Login do cliente final (passwordless ou senha) — desligado por flag
- Sistema de favoritos público — desligado por flag
- Sitemap.xml dinâmico, OG image por beat/produtora
- Ordenação configurável no catálogo (preço, BPM, popularidade)
- Substituir `WHATSAPP_NUMBER` placeholder em `src/data/beats.ts` (ao reativar CTAs)
- Licenciamento dinâmico (PDF por compra com nome/data/escopo)
- Área do comprador (login p/ baixar sem link assinado expirando)
- Marketplace de produtoras (dashboard, split de receita, relatórios)
- Antifraude (limite tentativas, OCR/Open Banking de comprovante)
- Analytics (plays únicos, funil de compra, GA4/Meta)
- App mobile (PWA offline preview, push notifications)
- SEO conteúdo (sitemap, blog, schema.org `MusicRecording`)
- Rotação de chaves (`SUPABASE_SERVICE_ROLE_KEY` etc.) a cada 90 dias
- Política de retenção (comprovantes 5 anos, arquivos privados enquanto beat ativo)
- TTL de signed URL baixar de 7d → 48h em Fase 2
- Canal único WhatsApp Business configurado em `app_settings`

---

## Origem dos itens

- `docs/CHANGELOG.md` · `## Melhorias futuras`
- `docs/CHANGELOG.md` · `### Pendências conhecidas` (entrada `[2026-09-06]`)
- `docs/CHANGELOG.md` · mojibake de emoji (entrada `[2026-09-07] compartilhamento`)
- `REQUIREMENTS.md` §F (pós-Sprint 5) e §G (pré-go-live)
- `MVP_REPORT.md` §Pontos de evolução para Fase 2 e §Recomendações operacionais
- `docs/relatorio-migracao-braba-music.md` §8 (pós-migração)
- `SPRINT_10_REPORT.md` §E-mail (TODO em `deliverPurchase`)
