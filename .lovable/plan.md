## Plano de hardening de segurança

### Diagnóstico

Rodei o scanner de segurança e o linter do banco, revisei todas as `server functions` (`src/lib/*.functions.ts`), políticas RLS e GRANTs. A postura é boa em geral (RLS ativo em todas as tabelas, nenhum GRANT para `anon`, todas as leituras públicas passam por server functions com validação Zod), mas há lacunas relevantes.

### Achados

**Críticos / médios**

1. **Upload anônimo abusável (`getReleaseUploadUrl`)** — emite signed URLs para `release-covers`, `release-audio` e `release-photos` sem autenticação, sem honeypot e sem rate-limit. Permite a um bot consumir storage/banda à vontade.
2. **Formulários públicos sem anti-bot** — `createLead` e `createPurchaseRequest` não exigem `started_at`/honeypot (só `submitRelease` tem). Vetor de spam que injeta PII (nome, e-mail, telefone, instagram) nas tabelas `leads` e `purchase_requests`.
3. **PII desnecessário em retorno público (`getPurchaseByToken`)** — devolve `email` completo. Basta uma versão mascarada (`f***@dominio.com`) para confirmar ao cliente que abriu o link correto.
4. **SECURITY DEFINER expostos pelo PostgREST (linter WARN x2)** — `public.is_admin_active(uuid)` e `public.is_super_admin(uuid)` têm `EXECUTE` para `authenticated`, então qualquer usuário logado pode chamar via RPC e sondar se um `user_id` é admin. Vamos mover para um schema `private` (não exposto pela Data API) e ajustar as policies que os usam.
5. **Proteção contra senhas vazadas (HIBP)** — não está ativada no Auth. Habilitar via `configure_auth`.

**Boas práticas / verificações**

6. `bootstrapFirstAdmin` é público mas só funciona enquanto não existir admin — manter, mas adicionar log de auditoria.
7. Confirmar que CPF (`releases.cpf`) e `continuation_token` não são logados nem retornados fora do admin.
8. Garantir que o e-mail enviado ao WhatsApp com `Link do lançamento: /admin/lancamentos/<id>` permanece exigindo login admin (já exige — sem mudança).

### Mudanças a implementar

**Banco (uma migration)**

- Criar schema `private`. Mover `is_admin_active` e `is_super_admin` para `private.*`, `REVOKE ALL ... FROM PUBLIC, authenticated`, `GRANT EXECUTE TO postgres, service_role`.
- Atualizar policies que referenciam essas funções para chamarem `private.is_admin_active(...)` / `private.is_super_admin(...)`:
  - `app_settings`, `leads`, `purchase_deliveries`, `purchase_requests` (usam `is_admin_active`)
  - `user_roles` (usa `is_super_admin`)
- Manter `public.has_role` como está (já não tem grant para `authenticated`).

**Auth**

- `supabase--configure_auth` → `password_hibp_enabled: true`.

**Server functions**

- `src/lib/releases.functions.ts` (`getReleaseUploadUrl`): exigir `started_at` (≥4s) e honeypot `website` (igual a `submitRelease`); validar `contentType` vs `ext` já existe.
- `src/lib/leads.functions.ts` (`createLead`): adicionar campos `started_at` + honeypot `website`, com mesma checagem mínima de 4s.
- `src/lib/purchases.functions.ts` (`createPurchaseRequest`): mesmo padrão honeypot + `started_at`.
- `src/lib/purchases.functions.ts` (`getPurchaseByToken`): mascarar `email` no retorno (`f***@dominio.com`).

**Frontend (acompanhar mudanças de schema das mutations)**

- `src/routes/enviar-lancamento.tsx`: já envia `started_at`/`website`; só ajustar a chamada de upload para passar `started_at`/`website` (a `submitRelease` já passa).
- `src/components/InterestForm.tsx` (lead) e `src/components/purchase/PurchaseDialog.tsx`: incluir hidden input honeypot `website` e `startedAt` (capturado no mount).
- `src/routes/enviar-comprovante.$token.tsx` / consumidores de `getPurchaseByToken`: usar `email` já mascarado (campo continua string).

### Detalhes técnicos

- Não vou criar GRANTs novos para `anon` — todo acesso público continua via service_role em server functions (intencional).
- O schema `private` não é exposto pelo PostgREST porque não está em `db.schemas`; policies podem referenciá-lo (RLS resolve sob `SECURITY DEFINER` independente do `search_path` do cliente).
- Os honeypots usam o mesmo padrão já validado em `submitRelease` (`website: z.string().max(0)` + `started_at: z.number().int().positive()` com `MIN_SUBMIT_SECONDS = 4`).
- Para o e-mail mascarado: manter `email` original na tabela; mascarar somente no DTO de `getPurchaseByToken`.
- Após aplicar, re-rodo `security--run_security_scan` e `supabase--linter` para confirmar que os 2 WARNs desaparecem.

### O que NÃO vou mexer

- Estrutura de RLS das tabelas (já correta).
- `src/integrations/supabase/*` (arquivos gerados).
- Buckets de Storage e suas políticas (todos privados, acesso via signed URL — ok).
- Fluxos funcionais (login, compra, lançamento) — só endurecimento.