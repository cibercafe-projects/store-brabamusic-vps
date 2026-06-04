# Changelog

Histórico de alterações da plataforma **BRABA Beats** (`loja.brabamusic.com.br`).

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/). Versionamento por **sprint**, com as seções:

- **Added** — arquivos/funcionalidades novos
- **Changed** — alterações em código existente
- **Deactivated** — features desligadas via flag (código preservado)
- **Hidden** — elementos ocultados da UI (código preservado)
- **Preserved** — ativos intencionalmente mantidos para reaproveitamento
- **Docs** — documentação criada ou atualizada

---

## Sprint 0 — Limpeza de escopo e preparação do MVP

> Princípio da sprint: **nada foi deletado**. Tudo que sai do MVP foi desativado por flag central ou ocultado condicionalmente na UI.

### Added

- `src/config/features.ts` — flags centrais do MVP:
  - `auth: false` — login passwordless do cliente
  - `interests: false` — favoritos / "Meus interesses"
  - `appPromo: false` — promoção e links do aplicativo
- `SPRINT_0_REPORT.md` — relatório completo de auditoria da sprint.
- `README.md` — visão geral do projeto, stack e como rodar.
- `REQUIREMENTS.md` — inventário detalhado das funcionalidades da Fase 1.

### Changed

- `src/components/AuthStore.tsx` — `requireAuth()` virou *no-op* quando `FEATURES.auth = false` (executa a ação direto, sem abrir `AuthModal`).
- `src/routes/como-funciona.tsx` — reescrito para o fluxo MVP de 5 passos: **Catálogo → Prévia → WhatsApp → Pagamento manual → Entrega manual**. FAQ ajustado (removidas menções a cadastro/senha).
- `src/routes/beat.$slug.tsx` — CTA principal agora é **"Tenho interesse — falar no WhatsApp"** (link direto). Botões dependentes de auth/interests só aparecem com as flags ligadas.
- `src/routes/meus-interesses.tsx` — exibe placeholder **"Em breve"** + CTA de voltar ao catálogo quando `FEATURES.interests = false`.
- `src/components/Header.tsx` — renderização condicional dos blocos de auth, interesses e app.
- `src/components/BeatCard.tsx` — botão de favoritar (coração) renderizado apenas com `FEATURES.interests`.

### Deactivated (flag off)

| Feature | Flag | Comportamento atual |
|---|---|---|
| Login passwordless do cliente | `FEATURES.auth` | `requireAuth` no-op; `AuthModal` não montado. |
| Favoritos / Interesses | `FEATURES.interests` | UI escondida; store `useInterests` intacta. |
| Promoção do app | `FEATURES.appPromo` | Sem links no Header / Home / Como funciona. |

### Hidden (UI)

- Bloco **Entrar / avatar / logout** no `Header` (desktop e mobile).
- Link **Interesses** + badge de contador no `Header`.
- Botão de **coração** (favoritar) em `BeatCard`.
- Links e menções ao **app** no Header, Home e Como funciona.
- Gate visual de login em `/meus-interesses` e nas CTAs de beat.

### Preserved (não deletado, pronto para reativar)

- `src/components/AuthModal.tsx`
- `src/components/AuthStore.tsx` (apenas `requireAuth` agora respeita a flag)
- `src/components/PlayerStore.tsx` — `useInterests` intacto
- Rotas `/app` e `/meus-interesses` (acessíveis por URL direta)
- Persistência `localStorage`: `braba-user`, `braba-interests`

### Docs

- Plano da sprint em `.lovable/plan.md`.
- Relatório completo em `SPRINT_0_REPORT.md` (dependências, impactos futuros, sugestão de Sprint 1).
- Inventário de funcionalidades em `REQUIREMENTS.md`.

---

## Próximos passos — Sprint 1 (planejada)

**Backoffice Administrativo** com Lovable Cloud:

- Auth admin (e-mail + senha) com `user_roles` separada e `has_role()` security definer.
- Rotas em `src/routes/admin/`: `login`, dashboard, CRUD de produtoras/beats, leads, configurações.
- Tabelas: `producers`, `beats`, `licenses`, `leads`, `user_roles`.
- Storage: buckets `covers` e `previews` (públicos), `masters` (privado, signed URL).
- Catálogo público passa a ler do banco em vez de `src/data/beats.ts` (mantido como seed).

Detalhes completos em `SPRINT_0_REPORT.md` → seção "Sugestão de estrutura — Sprint 1".
