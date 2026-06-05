
# Sprint 1 — Fundação do Backoffice Administrativo

## Objetivo

Entregar a base do `/admin`: rotas, login real, layout próprio com sidebar, proteção por role `admin` e placeholders. **Sem CRUDs.**

---

## Fase 1 — Análise da estrutura atual

- **Rotas**: arquivo-base TanStack Start em `src/routes/` (catálogo público + `politica-privacidade`, `termos-uso`). Nenhum grupo `_authenticated`.
- **Layout**: `__root.tsx` renderiza `Header + main + Footer + PlayerBar` globalmente — precisa ser ajustado para **não** envolver `/admin`.
- **Auth atual**: `AuthStore` (Zustand + localStorage, cliente passwordless) está **desligado por flag** (`FEATURES.auth=false`). É de uso futuro do cliente final, **não serve para admin** e fica intocado.
- **Stores**: Zustand já em uso (`AuthStore`, `PlayerStore`).
- **UI**: shadcn completo, incluindo `sidebar.tsx`. Reutilizável.
- **Conflitos com público**: nenhum, desde que o admin tenha seu próprio layout isolado e o `__root` deixe de aplicar Header/Footer no subtree `/admin`.

## Arquitetura proposta

```text
Lovable Cloud (Supabase) → Auth (e-mail+senha) + tabela user_roles
                          ↓
src/routes/
  __root.tsx              (Header/Footer só fora de /admin)
  _authenticated/
    route.tsx             (gate gerenciado pela integração — ssr:false, redirect → /admin/login)
    admin/
      route.tsx           (layout admin: SidebarProvider + AppSidebar + topbar + Outlet — gate de role admin)
      index.tsx           (redirect → /admin/dashboard)
      dashboard.tsx       ("Tela em desenvolvimento")
      produtoras.tsx      ("Tela em desenvolvimento")
      beats.tsx           ("Tela em desenvolvimento")
      leads.tsx           ("Tela em desenvolvimento")
      configuracoes.tsx   ("Tela em desenvolvimento")
  admin.login.tsx         (público — formulário e-mail+senha, redireciona pra /admin/dashboard)
```

Chave: `_authenticated/` é o gate de sessão (gerenciado pela integração Supabase do Lovable). **O subtree `admin/` adiciona um gate adicional de role `admin`** via server fn `requireAdmin`.

---

## Fase 2 — Backend (Lovable Cloud)

Habilitar **Lovable Cloud**. Migração:

- Enum `app_role` (`admin`).
- Tabela `user_roles (id, user_id, role)` com GRANTs e RLS (usuário lê só as próprias linhas; service_role faz tudo).
- Função `has_role(_user_id uuid, _role app_role) returns boolean` security definer.
- Seed: criar 1 usuário admin (e-mail/senha definidos pelo usuário via tela de signup interna ou inserido manualmente). **Vou pedir o e-mail do admin na hora de aplicar.**

## Fase 3 — Auth admin

- **Login**: `src/routes/admin.login.tsx` (público) → `supabase.auth.signInWithPassword`. Se já autenticado e admin, redireciona pra `/admin/dashboard`.
- **Logout**: botão na sidebar → `supabase.auth.signOut()` + `queryClient.clear()` + `navigate('/admin/login')`.
- **Sessão**: persistida pelo cliente Supabase (localStorage).
- **Sem signup, sem reset, sem múltiplos roles** — só `admin`.

## Fase 4 — Layout admin (`_authenticated/admin/route.tsx`)

- `SidebarProvider` + `AppSidebar` (shadcn) + topbar com `SidebarTrigger` + `<Outlet />`.
- Sidebar: Dashboard, Produtoras, Beats, Leads, Configurações, Sair.
- Identidade visual atual (tokens em `styles.css`, neon/cyberpunk) — mas **isolado**: sem `Header` público, sem `Footer`, sem `PlayerBar`.

## Fase 5 — Proteção de rotas

- `_authenticated/route.tsx` (gerenciado): redireciona pra `/admin/login` se sem sessão.
- `_authenticated/admin/route.tsx`: chama server fn `checkAdminRole` (com `requireSupabaseAuth` + `has_role(userId,'admin')`). Se não for admin → `redirect('/admin/login')` com toast.
- Ajustar `__root.tsx`: detectar se a rota atual começa com `/admin` e omitir `Header`/`Footer`/`PlayerBar` (condicional via `useRouterState`).

## Fase 6 — Placeholders

Cada página admin renderiza um `Card` simples com título e texto "Tela em desenvolvimento — Sprint 2+".

---

## Detalhes técnicos

- Server fn `checkAdminRole` em `src/lib/admin.functions.ts` (usa `requireSupabaseAuth`, retorna `{ isAdmin: boolean }`).
- `AppSidebar` em `src/components/admin/AppSidebar.tsx` com `useRouterState` para active state.
- `__root.tsx`: `const isAdmin = pathname.startsWith('/admin')` → renderiza `<Outlet />` puro quando true.
- `attachSupabaseAuth` já é registrado automaticamente pela integração; verificar `src/start.ts`.
- **Não tocar** em `FEATURES`, `AuthStore`, catálogo público.

## Documentação

- `CHANGELOG.md`: nova seção `## Sprint 1 — Fundação Admin`.
- `SPRINT_1_REPORT.md`: arquitetura, decisões, dívidas e roadmap Sprint 2 (CRUD Produtoras: schema `producers`, upload de avatar no Storage, formulário, listagem, RLS).
- `.lovable/plan.md`: substituir pelo escopo desta sprint.

## Fora de escopo

CRUDs, upload, dashboard real, gestão de usuários admin, reset de senha, signup público, qualquer feature de cliente final.

## Entregáveis verificáveis

1. Acessar `/admin` → redireciona pra `/admin/login`.
2. Login com credencial admin → cai em `/admin/dashboard`.
3. Sidebar navega entre as 5 telas (todas mostram placeholder).
4. Botão "Sair" desloga e volta pra login.
5. Usuário sem role `admin` é bloqueado mesmo logado.
6. Rotas públicas (`/`, `/beat/...`, etc.) continuam funcionando idênticas, com Header/Footer.
