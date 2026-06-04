# Sprint 0 — Relatório de limpeza de escopo

Princípio: nada foi deletado. Tudo que sai do MVP foi desativado via flag central (`src/config/features.ts`) ou ocultado condicionalmente na UI. Arquivos, stores, rotas e tipos permanecem no projeto para reaproveitamento nas próximas sprints.

## Flag central

`src/config/features.ts`:

```ts
export const FEATURES = {
  auth: false,       // login passwordless do cliente
  interests: false,  // favoritos / "Meus interesses"
  appPromo: false,   // links/menu do aplicativo
};
```

Reativar uma feature = trocar `false` por `true`.

## Funcionalidades DESATIVADAS (flag off)

| Feature | Flag | Comportamento atual |
|---|---|---|
| Login passwordless do cliente | `FEATURES.auth` | `requireAuth()` virou no-op: executa a ação direto, sem abrir `AuthModal`. `AuthStore`, `AuthModal` e persistência `braba-user` permanecem no código. |
| Favoritos / Interesses | `FEATURES.interests` | UI escondida. `useInterests` (Zustand) e `localStorage` `braba-interests` permanecem. |
| Promoção do app | `FEATURES.appPromo` | Sem links no Header / Home / Como funciona. Rota `/app` mantida. |

## Ocultações na UI

- **`Header.tsx`** — bloco "Entrar" / avatar / logout (auth), botão "Interesses" + badge contador (interests). Links de nav e botão "site" externo mantidos.
- **`BeatCard.tsx`** — botão de coração de favoritar ocultado quando `!FEATURES.interests`.
- **`beat.$slug.tsx`** — CTA principal virou "Tenho interesse — falar no WhatsApp" (link direto). Botões "Receber link de pagamento por e-mail" e "Salvar nos interesses" só aparecem com as respectivas flags ligadas.
- **`meus-interesses.tsx`** — exibe placeholder "Em breve" + CTA de voltar pro catálogo. Rota não foi removida.
- **`como-funciona.tsx`** — copy reescrito pro fluxo MVP de 5 passos (Catálogo → Prévia → WhatsApp → Pagamento manual → Entrega manual). FAQ ajustado: removidas menções a cadastro/senha.

## Funcionalidades MANTIDAS (ativas)

- Home + hero + busca + filtros (gênero/BPM).
- Catálogo de beats (grid responsivo).
- Página de Beat (`/beat/$slug`) com prévia, licenças, CTAs.
- Página de Produtores (`/produtores`) e Produtor individual (`/produtor/$slug`).
- Player de áudio (modal centralizado).
- Página "Como funciona" (com novo conteúdo).
- Design system completo (tokens em `src/styles.css`, glassmorphism, tipografia graffiti, paleta magenta/lime).
- Navegação principal, footer/site externo `brabamusic.com.br`.

## Arquivos preservados (não tocados, prontos pra reativação)

- `src/components/AuthModal.tsx`
- `src/components/AuthStore.tsx` (apenas `requireAuth` agora respeita a flag)
- `src/components/PlayerStore.tsx` (`useInterests` intacto)
- `src/routes/app.tsx`
- `src/routes/meus-interesses.tsx` (conteúdo original substituído por placeholder; lógica pode voltar atrás da flag)

## Dependências identificadas

- `requireAuth` é importado em `BeatCard.tsx` e `beat.$slug.tsx` — segue funcionando como wrapper transparente.
- `useInterests` é importado em `Header.tsx`, `BeatCard.tsx`, `beat.$slug.tsx` — store continua existindo, só a UI consumidora foi ocultada.
- Rota `/app` continua registrada em `routeTree.gen.ts`; é acessível por URL direta, apenas não tem entrada de menu.
- Rota `/meus-interesses` idem — acessível por URL direta, mostra placeholder.

## Possíveis impactos futuros

1. **SEO**: `/meus-interesses` e `/app` continuam indexáveis. Se incomodar, adicionar `noindex` no `head()` dessas rotas enquanto estiverem ocultas.
2. **Reativação**: ao ligar `FEATURES.auth = true`, revisar copy de "Como funciona" (FAQ atual diz que não precisa de cadastro).
3. **Analytics**: eventos de favoritar / login não vão disparar enquanto as flags estiverem off — considerar isso ao planejar telemetria.
4. **Testes**: nenhum teste automatizado existe ainda; quando criar, parametrizar por `FEATURES` para cobrir on/off.

---

## Sugestão de estrutura — Sprint 1 (Backoffice Administrativo)

Backend: ativar **Lovable Cloud** (Supabase gerenciado) — auth de admin (e-mail+senha), Storage para áudio/cover, server functions com `requireSupabaseAuth` + checagem de role `admin` via tabela `user_roles` separada.

### Rotas administrativas

```
src/routes/admin/
  _layout.tsx           guard de admin + shell (sidebar + topbar)
  login.tsx             login admin (e-mail + senha)
  index.tsx             dashboard (KPIs: leads, beats ativos, conversões)
  produtoras.tsx        lista CRUD de produtoras
  produtoras.$id.tsx    edição de produtora
  beats.tsx             lista CRUD de beats
  beats.$id.tsx         edição de beat (upload preview/master, licenças, preço, mood, BPM)
  leads.tsx             lista de interesses recebidos (WhatsApp / form)
  leads.$id.tsx         detalhe do lead + status (novo, em negociação, pago, entregue)
  configuracoes.tsx     número de WhatsApp, e-mails da equipe, licenças padrão, copy
```

### Tabelas sugeridas (Lovable Cloud)

- `producers` — id, slug, name, bio, avatar_url, created_at
- `beats` — id, slug, title, producer_id (FK), genre, bpm, key_signature, duration, price, cover_url, preview_url, master_url, mood (jsonb), active, created_at
- `licenses` — id, beat_id (FK) ou globais; name, price, includes (jsonb), highlight
- `leads` — id, beat_id (FK nullable), license, contact (email/whatsapp), source, status, notes, created_at
- `admin_users` + `user_roles` — separada, com enum `app_role` (admin, editor) e função `has_role()` security definer
- Storage buckets: `covers` (público), `previews` (público), `masters` (privado, signed URL na entrega)

### Server functions principais

- CRUD de produtoras / beats / licenças (admin only)
- Listagem pública (`getCatalog`, `getBeatBySlug`, `getProducerBySlug`) sem auth
- Registro de lead (`createLead`) público com rate-limit + validação Zod
- Atualização de status de lead (admin only)
- Geração de URL assinada de master (admin only, expira em 24h)

### Critérios de pronto Sprint 1

- Admin consegue cadastrar uma produtora, criar um beat com upload e ver no catálogo público.
- Catálogo público lê do banco em vez de `src/data/beats.ts` (manter arquivo como seed/fallback).
- Lead vindo do botão "Tenho interesse" (WhatsApp click) é registrado opcionalmente via webhook ou form alternativo para alimentar `leads.tsx`.
