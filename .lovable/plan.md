## Objetivo

Criar um arquivo `CHANGELOG.md` na raiz do projeto para registrar o histórico de alterações por sprint, começando pela Sprint 0.

## Arquivo a criar

`CHANGELOG.md` — formato baseado em [Keep a Changelog](https://keepachangelog.com/), versionamento por sprint.

## Conteúdo proposto

Estrutura:

- Cabeçalho explicando o propósito e convenção (Sprint N — data, seções `Added` / `Changed` / `Deactivated` / `Hidden` / `Preserved` / `Docs`).
- Entrada **Sprint 0 — Limpeza de escopo e preparação do MVP** consolidando o que já está em `SPRINT_0_REPORT.md` e `.lovable/plan.md`:
  - **Added**: `src/config/features.ts` (flags `auth`, `interests`, `appPromo`), `SPRINT_0_REPORT.md`, `README.md`, `REQUIREMENTS.md`.
  - **Changed**: `AuthStore.requireAuth` virou no-op quando `FEATURES.auth = false`; `como-funciona.tsx` reescrito para fluxo MVP de 5 passos (Catálogo → Prévia → WhatsApp → Pagamento manual → Entrega manual); `beat.$slug.tsx` com CTA principal de WhatsApp; `meus-interesses.tsx` exibindo placeholder "Em breve".
  - **Deactivated (flag off)**: login passwordless, favoritos/interesses, promoção do app.
  - **Hidden (UI)**: bloco Entrar/avatar no `Header`, link Interesses + badge, botão de coração em `BeatCard`, links/menções ao app, gates de login.
  - **Preserved (não deletado)**: `AuthModal.tsx`, `AuthStore.tsx`, `PlayerStore.useInterests`, rotas `/app` e `/meus-interesses`, persistência `braba-user` e `braba-interests`.
  - **Docs**: referência a `SPRINT_0_REPORT.md` para o relatório completo e a `.lovable/plan.md` para o plano original.
- Seção **Próximos passos** apontando para a estrutura sugerida da Sprint 1 (backoffice admin com Lovable Cloud).

## Fora de escopo

- Nenhuma alteração de código de aplicação.
- Não reescrever `SPRINT_0_REPORT.md` nem `README.md` — o changelog apenas referencia.
- Não criar entradas para sprints futuras (apenas Sprint 0).