# Sprint 1 — Fundação do Backoffice Administrativo

## Objetivo

Entregar a base do `/admin`: rotas, login real, layout próprio com sidebar, proteção por role `admin` e placeholders das telas. **Sem CRUDs.**

## Arquitetura entregue

```
Lovable Cloud (Postgres + Auth)
  ├─ enum public.app_role ('admin')
  ├─ tabela public.user_roles (RLS — usuário lê só os próprios papéis)
  └─ função public.has_role(uuid, app_role) SECURITY DEFINER (somente service_role)

src/routes/
  __root.tsx                    Header/Footer/PlayerBar SÓ fora de /admin
  admin/
    route.tsx                   shell vazio (Outlet)
    index.tsx                   redirect → /admin/dashboard
    login.tsx                   público — login + bootstrap do 1º admin
    _protected/                 pathless layout (gate de sessão + role admin)
      route.tsx                 SidebarProvider + AppSidebar + topbar + Outlet
      dashboard.tsx
      produtoras.tsx
      beats.tsx
      leads.tsx
      configuracoes.tsx
```

## Decisões

1. **`_protected` como pathless layout dentro de `admin/`** — permite que `/admin/login` fique fora do gate sem precisar URL diferente.
2. **Server fn `checkAdminRole` chamada no `beforeLoad` do `_protected`** — RLS bloquearia leitura cruzada, então usa `supabaseAdmin` (service_role) dentro do handler para checar a role do `userId` do token.
3. **Bootstrap do primeiro admin via `bootstrapFirstAdmin`** — quando `user_roles` está vazio, a tela de login vira "Criar primeiro administrador". Após isso, sempre login.
4. **Sessão persistida pelo Supabase Auth** (localStorage). `attachSupabaseAuth` já injeta o bearer em todo serverFn protegido.
5. **Sem signup público, sem reset de senha, sem múltiplos roles.**
6. **Layout admin 100% isolado** do catálogo público (sem Header/Footer/PlayerBar).

## Como acessar

1. Abrir `/admin` (redireciona para `/admin/dashboard` → bloqueado → vai pra `/admin/login`).
2. Primeira vez: criar o primeiro administrador (e-mail + senha ≥ 8 caracteres).
3. Login → cai em `/admin/dashboard`.
4. Sidebar permite navegar entre Dashboard, Produtoras, Beats, Leads, Configurações.
5. "Sair" desloga e volta para o login.

## Segurança

- `user_roles` tem RLS habilitada; usuários autenticados só leem seus próprios papéis.
- `has_role` é `SECURITY DEFINER` mas com `EXECUTE` revogado de `anon`/`authenticated` (só `service_role`).
- A checagem efetiva de "é admin?" acontece exclusivamente em server fn, usando `requireSupabaseAuth` + `supabaseAdmin`.
- HIBP password check habilitado no Auth.

## Dívidas / pontos de atenção

- Página de "Configurações" ainda não move o `CONTACT` do Footer para o banco (herdado da Sprint 0).
- Não existe gestão de outros admins via UI — adição/remoção de admins requer inserir manualmente em `user_roles`.
- Não há reset de senha. Se o admin perder a senha, precisa ser resetada manualmente via Cloud.
- A rota `/admin/login` é pública e indexável; se quiser bloquear SEO, adicionar `noindex`.

## Sprint 2 — Sugestão de escopo (CRUD Produtoras)

1. Tabela `public.producers`:
   - `id`, `slug` (único), `name`, `bio`, `avatar_url`, `active`, `created_at`, `updated_at`.
   - RLS: leitura pública (catálogo); escrita só com `has_role(auth.uid(), 'admin')`.
2. Storage bucket `producer-avatars` (público) com policies para upload por admin.
3. Server fns:
   - `listProducers` (público)
   - `getProducerBySlug` (público)
   - `createProducer`, `updateProducer`, `deleteProducer`, `uploadProducerAvatar` (admin)
4. UI `/admin/produtoras`:
   - Tabela com busca, paginação, status (ativo/inativo).
   - Formulário de criação/edição com upload de avatar, preview, validação Zod, slug auto.
5. Migrar `src/data/beats.ts` (placeholders de produtoras) para leitura via server fn — manter como fallback.
6. Sidebar passa a destacar "Produtoras" como primeira feature ativa.

Critério de pronto: admin consegue criar uma produtora com avatar e ver na página pública `/produtor/$slug`.

---

**Não estavam no escopo desta sprint e continuam fora:** login de cliente, favoritos, marketplace, pagamentos, integrações externas, automações, dashboards reais.
