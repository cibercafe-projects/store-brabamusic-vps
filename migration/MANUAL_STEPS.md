# Passos manuais — o que não dá para automatizar

Os scripts em `migration/sql` e `migration/scripts` cobrem schema, dados, permissões e arquivos.
Os itens abaixo precisam ser feitos à mão no ambiente de destino.

---

## 1. Usuários administradores (`auth.users`)

Senhas não são exportáveis e o schema `auth` é gerenciado pelo GoTrue.

1. Liste os admins atuais na origem:
   ```sql
   SELECT ur.user_id, ur.role, ur.is_super, ur.active
   FROM public.user_roles ur ORDER BY ur.is_super DESC;
   ```
   E o e-mail correspondente em `auth.users` (via painel de autenticação).
2. No destino, crie cada usuário **com o mesmo `id` (UUID)** — pelo Studio/Admin API
   (`POST /auth/v1/admin/users` com `id` explícito). Isso mantém `public.user_roles` válido
   sem nenhum ajuste.
3. Se não for possível reaproveitar o UUID, crie o usuário e atualize `user_roles.user_id`.
   Atenção: o super admin é protegido pelo trigger `trg_protect_super_admin` — não é possível
   removê-lo, desativá-lo nem trocar seu papel. Para reapontá-lo, faça o `UPDATE` do `user_id`
   (permitido) ou desabilite o trigger temporariamente com `ALTER TABLE public.user_roles DISABLE TRIGGER trg_protect_super_admin;`.
4. Peça a cada admin para redefinir a senha pelo fluxo de "esqueci minha senha".

---

## 2. Provedor Google (login do admin)

- Criar/reaproveitar o client OAuth no Google Cloud.
- Adicionar `https://api.seudominio.com/auth/v1/callback` como URI de redirecionamento autorizada.
- Configurar `GOTRUE_EXTERNAL_GOOGLE_*` no `.env` do self-host.
- `SITE_URL` e `ADDITIONAL_REDIRECT_URLS` precisam incluir o domínio público do site.

---

## 3. E-mails

- **Autenticação (GoTrue):** configurar SMTP (`SMTP_*`) — sem isso, reset de senha e convites não saem.
- **Transacionais da aplicação:** hoje o envio usa `@lovable.dev/email-js`. No destino é preciso
  trocar por Resend / SES / Postmark / SMTP próprio em `src/lib/email/send.server.ts`.
- **Domínio verificado:** SPF, DKIM e DMARC configurados no DNS.
- **URLs de webhook:** as funções `email_queue_dispatch()` e `email_queue_wake()` foram exportadas
  apontando para o domínio antigo — atualizar conforme `09_post_migration.sql`.

---

## 4. Segredos do Vault

Recriar `email_queue_service_role_key` com a service_role key do novo ambiente
(`09_post_migration.sql`, seção 2). O valor da chave antiga não é exportável.

---

## 5. Build da aplicação

O app é TanStack Start compilado hoje para **Cloudflare Workers** (`wrangler.jsonc`,
`nodejs_compat`, entrypoint `src/server.ts`). Em um VPS não existe Worker:

1. Trocar o alvo de build para **servidor Node** (preset `node-server`), removendo o plugin
   Cloudflare do `vite.config.ts`.
2. Servir o bundle com **PM2**, **systemd** ou container próprio.
3. Manter Nginx/Caddy na frente com TLS.

É ajuste de build e deploy — o código das rotas, server functions e componentes não muda.
Detalhes de infraestrutura em `docs/migracao-vps.md`.

---

## 6. DNS e TLS

- Reduzir o TTL para 300s **antes** do corte.
- Emitir o certificado no novo host antes de apontar o domínio.
- Manter o ambiente antigo intacto por pelo menos 7 dias (rollback).

---

## 7. Verificação final

Além do `verify-migration.ts`, testar manualmente:

- [ ] Abrir um beat público e ouvir a prévia (signed URL).
- [ ] Login de admin (e-mail/senha e Google).
- [ ] Criar uma compra de teste → conferir a reserva do beat exclusivo.
- [ ] Esperar o job `expire-beat-reservations` liberar a reserva.
- [ ] Enviar um comprovante (upload em bucket privado).
- [ ] Disparar um e-mail transacional e conferir `email_send_log`.
- [ ] Contador de visitantes online no dashboard (Realtime ativo).
