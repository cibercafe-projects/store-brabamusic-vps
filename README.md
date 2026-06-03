# BRABA — Loja de Beats

Catálogo online de beats do selo **BRABA Music**, pensado como uma extensão do site oficial em `loja.brabamusic.com.br`. Esta é a **Fase 1 (MVP)** do projeto: um mockup navegável, com dados mock e persistência em `localStorage`, sem backend real.

> **URL de preview:** https://store-brabamusic.lovable.app

---

## Sobre

A loja é um catálogo de beats com prévia, sistema de favoritos ("interesses") e fluxo manual de venda — o pagamento e a entrega do beat são feitos fora da aplicação, via e-mail e WhatsApp, pela equipe BRABA. O cadastro do cliente é passwordless (apenas nome + e-mail) para receber o link de pagamento e, depois, o link de download do beat.

A mesma vitrine é projetada para aparecer também dentro do app BRABA, em uma aba **Beats**, via WebView nesta fase.

---

## Stack

- **TanStack Start v1** (file-based routing, SSR-ready) + **Vite 7**
- **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (tokens semânticos em `src/styles.css`, formato `oklch`)
- **Zustand** — stores de player, auth e interesses
- **shadcn/ui** — componentes base (Sheet, Dialog, etc.)
- **lucide-react** — ícones
- Sem **Lovable Cloud** nesta fase (sem banco, sem auth real, sem edge functions)

---

## Estrutura

```
src/
├── routes/             # Rotas (file-based)
│   ├── __root.tsx
│   ├── index.tsx              # / — catálogo
│   ├── beat.$slug.tsx         # /beat/:slug
│   ├── produtores.tsx         # /produtores
│   ├── produtor.$slug.tsx     # /produtor/:slug
│   ├── meus-interesses.tsx    # /meus-interesses
│   ├── como-funciona.tsx      # /como-funciona
│   └── app.tsx                # /app (mockup mobile)
├── components/
│   ├── Header.tsx
│   ├── BeatCard.tsx
│   ├── PlayerBar.tsx          # modal popup centralizado
│   ├── PlayerStore.tsx        # zustand: player + interesses
│   ├── AuthModal.tsx
│   ├── AuthStore.tsx
│   └── ui/                    # shadcn
├── data/
│   └── beats.ts               # mock: beats, produtores, licenças
├── assets/                    # capas dos beats (geradas)
└── styles.css                 # tokens do design system
```

---

## Como rodar

```bash
bun install
bun dev
```

Acesse `http://localhost:5173`.

---

## Status atual

- ✅ Catálogo navegável com 8 beats e 4 produtores fictícios
- ✅ Filtros (gênero, BPM, busca textual)
- ✅ Player visual com waveform animado (sem áudio real)
- ✅ Sistema de favoritos persistido em `localStorage`
- ✅ Cadastro rápido sem senha (nome + e-mail)
- ✅ 3 níveis de licença (Lease / Premium / Exclusiva)
- ✅ CTAs para WhatsApp com mensagem pré-preenchida
- ✅ Página de FAQ + fluxo "Como funciona" em 7 passos
- ✅ Mockup do app mobile (phone frame)
- ✅ Header responsivo com drawer mobile

Veja o detalhamento completo em [REQUIREMENTS.md](./REQUIREMENTS.md).

---

## Próximos passos sugeridos (Fase 2+)

- Habilitar **Lovable Cloud** para auth real, banco e storage de áudio
- Áudio real com player funcional (HLS ou MP3 + waveform real)
- Gateway de pagamento (Pix automatizado, Stripe ou Mercado Pago)
- Integração com WhatsApp Business API para envio automático
- Painel do produtor (upload de beats, métricas)
- Contrato eletrônico para licença Exclusiva
- Sistema de cupons e promoções

---

Feito com 💜 pela equipe BRABA Music.
