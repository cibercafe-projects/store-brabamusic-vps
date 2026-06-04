
# Sprint 0 — Limpeza de escopo do MVP

Princípio: **nada é deletado**. Tudo que sai do MVP é desativado por uma única flag central, ou comentado/ocultado na UI, mantendo arquivos, stores e rotas no projeto para reaproveitamento futuro.

## 1. Flag central de features

Criar `src/config/features.ts`:

```ts
export const FEATURES = {
  auth: false,          // AuthModal, login passwordless, requireAuth
  interests: false,     // favoritos, contador, página "Meus Interesses"
  appPromo: false,      // links/menu/rota do app
};
```

Toda desativação abaixo lê desta flag — reativar no futuro = trocar `false` por `true`.

## 2. Autenticação de cliente (desativar do fluxo)

- `src/components/AuthStore.tsx`: manter intacto.
- `src/components/AuthModal.tsx`: manter, mas no `__root.tsx` **não renderizar** quando `!FEATURES.auth` (hoje nem está montado — apenas garantir que continue assim).
- `src/components/AuthStore.tsx` → ajustar `requireAuth` para, quando `!FEATURES.auth`, executar a ação direto sem abrir modal. Assim qualquer chamada existente continua funcionando para visitante.
- `Header.tsx`: ocultar bloco "Entrar" / avatar do usuário / botão logout quando `!FEATURES.auth` (tanto desktop quanto Sheet mobile). Código permanece, envolto em condicional.

## 3. Favoritos / Interesses (ocultar da UI)

- `BeatCard.tsx`: esconder o botão de coração (`Heart`) quando `!FEATURES.interests`. Lógica do `useInterests` permanece.
- `Header.tsx`: esconder o link "Interesses" + badge de contador quando `!FEATURES.interests`. Remover apenas a entrada visual; rota continua existindo.
- `meus-interesses.tsx`: manter o arquivo. No componente, quando `!FEATURES.interests`, renderizar um placeholder simples ("Em breve") ou redirecionar para `/`. Sem deletar a rota.
- `PlayerStore.tsx` (`useInterests`): mantido.

## 4. Fluxos dependentes de login

- Como `requireAuth` agora é no-op quando auth está desligado, qualquer CTA que dependia dele (ex. favoritar, "Tenho interesse") passa a funcionar para visitante.
- Garantir que `/meus-interesses` não exibe o bloqueio "Faz login pra ver" (já tratado pelo passo 3).
- `beat.$slug.tsx`: revisar CTAs e remover qualquer gate de login visual (mantendo código condicional via flag).

## 5. Integração com app

- Rota `src/routes/app.tsx`: mantida.
- `Header.tsx` / `index.tsx` / `como-funciona.tsx`: ocultar links e menções ao app quando `!FEATURES.appPromo`. Conteúdo permanece nos arquivos.

## 6. Página "Como funciona"

Reescrever apenas o conteúdo de `src/routes/como-funciona.tsx` para refletir o fluxo MVP:

```
01 Catálogo  →  02 Interesse (WhatsApp)  →  03 Pagamento manual  →  04 Entrega manual
```

- Passos: Acessa catálogo → Escolhe beat → Clica em "Tenho interesse" e fala no WhatsApp → Recebe link/Pix manual → Recebe beat por WhatsApp/e-mail.
- FAQ: remover perguntas sobre cadastro/senha; manter licenças, pagamento, entrega, exclusividade.

## 7. O que permanece ativo

Home, catálogo, busca, filtros, página de beat, página de produtora, player (modal), design system, navegação principal, link externo para `brabamusic.com.br`.

## 8. Entregável: relatório `SPRINT_0_REPORT.md`

Arquivo novo na raiz com:
- **Desativadas (flag off):** auth, interests, appPromo.
- **Ocultadas na UI:** botão favoritar, contador interesses, link Interesses, link/menu App, bloco login no header, gate de login em `/meus-interesses`.
- **Mantidas:** catálogo, busca, filtros, beat, produtora, player, design system.
- **Dependências identificadas:** `requireAuth` usado em `BeatCard`; `useInterests` usado em `Header`, `BeatCard`, `meus-interesses`; rota `/app` referenciada em Header/menu.
- **Impactos futuros:** reativar = flipar flag + revalidar copy de "Como funciona"; revisar telemetria; conferir SEO de rotas ocultas (não linkadas, mas indexáveis — considerar `noindex` nas ocultas se necessário).

## 9. Estrutura sugerida para Sprint 1 — Backoffice

```
src/routes/admin/
  _layout.tsx           guard de admin + shell (sidebar)
  login.tsx             login admin (e-mail+senha, Lovable Cloud)
  index.tsx             dashboard (KPIs: leads, beats ativos, conversões)
  produtoras.tsx        CRUD produtoras
  produtoras.$id.tsx
  beats.tsx             CRUD beats (upload preview/master, licenças, preço)
  beats.$id.tsx
  leads.tsx             lista de interesses recebidos via WhatsApp/forms
  leads.$id.tsx         detalhe + status (novo, em negociação, pago, entregue)
  configuracoes.tsx     WhatsApp number, e-mails, licenças padrão, copy
```

Backend: ativar Lovable Cloud (auth + tabelas `producers`, `beats`, `licenses`, `leads`, `admin_users` com `user_roles` separado). Storage para áudio/cover. Server functions para CRUD com `requireSupabaseAuth` + check de role `admin`.

## Resumo técnico das mudanças desta sprint

- **Criar:** `src/config/features.ts`, `SPRINT_0_REPORT.md`.
- **Editar:** `AuthStore.tsx` (requireAuth no-op via flag), `Header.tsx` (ocultar Entrar / Interesses / App), `BeatCard.tsx` (ocultar coração), `meus-interesses.tsx` (placeholder quando desativado), `beat.$slug.tsx` (remover gates visuais), `como-funciona.tsx` (novo copy do fluxo MVP), `index.tsx` (remover menções ao app, se houver).
- **Não tocar:** `AuthModal.tsx`, `PlayerStore.tsx`, `app.tsx`, rotas existentes, design tokens.
