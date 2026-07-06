# Sprint — Central de Ajuda e Feedback

Novo módulo para coleta de feedback (sugestões, problemas, dúvidas, suporte, elogios) integrado ao fluxo público e ao Backoffice. Sem envio de e-mails automáticos, sem integrações externas.

## 1. Backend (Lovable Cloud)

### Nova tabela `public.feedback`
Campos principais:
- `rating` (1–5, opcional para tipos não-avaliação)
- `type` (enum: `sugestao`, `problema`, `duvida`, `suporte`, `elogio`)
- `area` (enum opcional: `catalogo`, `compra`, `pagamento`, `comprovante`, `entrega`, `lancamentos`, `backoffice`, `outro`)
- `message` (texto obrigatório)
- `wants_reply` (bool)
- `contact_name`, `contact_email`, `contact_whatsapp` (opcionais; obrigatórios se `wants_reply=true`)
- `purchase_request_id` (FK opcional → `purchase_requests`)
- `release_id` (FK opcional → `releases`)
- `origin` (enum: `geral`, `pos_compra`, `pos_lancamento`)
- `status` (enum: `novo`, `em_analise`, `respondido`, `resolvido`, `arquivado`, default `novo`)
- `internal_notes` (texto, admin-only)
- `created_at`, `updated_at`

### RLS + GRANTS
- `INSERT` liberado para `anon` e `authenticated` (formulário público)
- `SELECT / UPDATE` restrito a admins ativos (`has_role(auth.uid(),'admin')`)
- Trigger `set_updated_at`

### Server functions (`src/lib/feedback.functions.ts`)
- `submitFeedback` — público (sem `requireSupabaseAuth`), valida com Zod, insere via cliente publishable server-side
- `listFeedback` — admin, filtros por status/tipo/origem
- `getFeedback` — admin, detalhe
- `updateFeedbackStatus` — admin, status + `internal_notes`
- `getFeedbackStats` — admin (total, pendentes, respondidos, nota média, problemas reportados)

## 2. Frontend público

### `/feedback` (nova rota `src/routes/feedback.tsx`)
Formulário único:
- Pergunta inicial "Como foi sua experiência?" → 5 estrelas (opcional se tipo ≠ elogio/avaliação)
- Select **Tipo**
- Select **Área** (opcional)
- Textarea **Conte sua experiência**
- Checkbox **Quero receber resposta** → revela Nome / Email / WhatsApp
- Suporta querystring `?purchase=<id>` e `?release=<id>` para associação automática (mostra badge "Referente ao pedido #XXXX" / "Lançamento X")
- Head SEO específico

### Rodapé (`src/components/Footer.tsx`)
Nova coluna/links "Ajuda e Feedback":
- Enviar Feedback → `/feedback`
- Reportar Problema → `/feedback?type=problema`
- Suporte → `/feedback?type=suporte`
- FAQ → mantém link para `/como-funciona#faq` (já existente)

### Integração pós-fluxo
- **Pós-compra** (`PurchaseDialog` / `DeliveryDialog` quando status = `arquivos_enviados`): card "Como foi sua experiência?" com 5 estrelas → CTA para `/feedback?purchase=<id>&origin=pos_compra&rating=<n>`
- **Pós-lançamento** (rota pública de status do lançamento após `publicado`): card equivalente → `/feedback?release=<id>&origin=pos_lancamento`

## 3. Backoffice

### Novo item de menu "Feedback" (`src/components/admin/AppSidebar.tsx`)
Ícone `MessageSquare`, badge com contagem de status `novo`.

### `/admin/feedback` (lista) — `src/routes/admin/_protected/feedback.index.tsx`
Tabela: Data · Tipo · Avaliação · Origem (Geral/Compra #/Lançamento) · Status · Ação (ver).
Filtros: status, tipo, origem, período.

### `/admin/feedback/$id` (detalhe) — `src/routes/admin/_protected/feedback.$id.tsx`
- Todos os campos do feedback
- Link para compra/lançamento associado (se houver)
- Select para alterar status
- Textarea de observações internas
- Botões WhatsApp/Email para contato quando `wants_reply=true`

### Dashboard (`/admin/dashboard`)
Cards adicionais:
- Total de Feedbacks
- Pendentes (`novo` + `em_analise`)
- Respondidos
- Nota Média
- Problemas Reportados

## 4. Documentação

- `CHANGELOG.md` — nova entrada "Central de Ajuda e Feedback"
- `docs/regras-de-negocio.md` — nova seção "Feedback" (fluxo, status, associação automática, sem e-mails automáticos)

## Fora de escopo
- Nenhum e-mail automático (nem cliente, nem admin)
- Nenhuma integração externa
- Nenhuma FAQ nova (mantém a de `/como-funciona`)
- Sem respostas do admin diretamente pela plataforma (contato via WhatsApp/Email externos)

## Arquivos novos
- `supabase/migrations/<timestamp>_feedback.sql`
- `src/lib/feedback.functions.ts`
- `src/routes/feedback.tsx`
- `src/routes/admin/_protected/feedback.index.tsx`
- `src/routes/admin/_protected/feedback.$id.tsx`

## Arquivos alterados
- `src/components/Footer.tsx` (links Ajuda e Feedback)
- `src/components/admin/AppSidebar.tsx` (menu + badge)
- `src/routes/admin/_protected/dashboard.tsx` (novos cards)
- `src/components/purchase/DeliveryDialog.tsx` (CTA pós-compra)
- Rota pública de status de lançamento (CTA pós-lançamento)
- `CHANGELOG.md`, `docs/regras-de-negocio.md`
