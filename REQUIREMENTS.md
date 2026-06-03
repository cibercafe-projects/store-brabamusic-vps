# REQUIREMENTS — BRABA Loja de Beats (Fase 1)

Inventário completo das funcionalidades e regras de negócio **implementadas hoje** no MVP. Tudo o que está aqui já roda no preview; itens não implementados estão listados na seção final.

---

## A. Telas / Rotas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `src/routes/index.tsx` | **Home / Catálogo.** Hero com headline + busca, filtros por gênero e BPM, grid responsivo de beats. |
| `/beat/:slug` | `src/routes/beat.$slug.tsx` | **Detalhe do beat.** Capa grande, waveform fake animado, metadados (BPM, tom, duração, preço), tags de mood, seletor de licença, CTAs (interesse, WhatsApp, favoritar), modal de confirmação, beats relacionados. |
| `/produtores` | `src/routes/produtores.tsx` | Grid de produtores com avatar de iniciais, cidade, contagem de beats, bio curta, Instagram. |
| `/produtor/:slug` | `src/routes/produtor.$slug.tsx` | Página individual do produtor com seus beats. |
| `/meus-interesses` | `src/routes/meus-interesses.tsx` | Lista de favoritos. **Exige login.** Gera mensagem única de WhatsApp com todos os beats + total estimado. |
| `/como-funciona` | `src/routes/como-funciona.tsx` | 7 passos do fluxo de compra + FAQ com 7 perguntas. |
| `/app` | `src/routes/app.tsx` | Mockup mobile (phone frame) demonstrando o catálogo via WebView no app BRABA. |

---

## B. Componentes principais

- **`Header`** — sticky, glassmorphism, nav desktop + drawer mobile (Sheet/hamburger). Badge com contagem de interesses, estado de login (nome + logout), link externo para `brabamusic.com.br`.
- **`BeatCard`** — capa com hover-play, botão favorito (com gate de auth), badges de gênero/BPM, preço destacado, CTA "Tenho interesse".
- **`PlayerBar`** — popup **modal centralizado** (anteriormente era barra inferior fixa), com capa, waveform fake animado, controle play/pause e botão de fechar.
- **`AuthModal`** — cadastro rápido passwordless (nome + e-mail), com texto explicando o uso do e-mail.

---

## C. Regras de negócio

### C.1 Autenticação (mock, client-side)

- Login **passwordless**: apenas `name` + `email`.
- Persistido em `localStorage` sob a chave `braba-user`.
- Pattern `requireAuth(action)` na store (`AuthStore.tsx`):
  - se já há usuário → executa `action()` imediatamente;
  - senão → abre `AuthModal` e enfileira `action` para rodar após login.
- **Ações protegidas por auth:**
  - Salvar/remover beat dos interesses (favoritos).
  - Abrir modal "Tenho interesse" na página de detalhe do beat.
  - Acessar `/meus-interesses` (tela bloqueada com CTA de login se deslogado).
- Logout limpa a chave do `localStorage`.

### C.2 Catálogo

- **8 beats** mock em `src/data/beats.ts`. Cada beat tem: `slug`, `title`, `producerSlug`, `producer`, `genre`, `bpm`, `key`, `duration`, `price`, `mood[]`, `cover`.
- **4 produtores** mock: DJ NYX, MC PROD, KIRA BEATS, 808 FAVELA — com cidade, bio, Instagram.
- **Filtros combináveis** na home:
  - Gênero (lista fixa: Todos, Trap, Funk, Funk 150, Drill, Boom Bap, Melodic Trap, Phonk) — match por `includes` (ex: "Funk" pega "Funk" e "Funk 150").
  - BPM máximo via slider (60–180).
  - Busca textual em título + produtor + gênero (case-insensitive).
- **Beats relacionados** na página de detalhe: até 4 beats do mesmo gênero, excluindo o atual.

### C.3 Licenças

Definidas em `LICENSES` (`src/data/beats.ts`). Preços indicativos.

| Licença | Preço base | Inclui |
|---------|-----------|--------|
| **Lease** | R$ 199 | MP3 + WAV · Streams ilimitados (não-comercial) · 1 distribuição · Crédito ao produtor |
| **Premium** ⭐ | R$ 499 | MP3 + WAV + Trackouts · Streams comerciais ilimitados · Distribuição em DSPs · Vídeo-clipe permitido |
| **Exclusiva** | R$ 2.499 | Todos os arquivos + stems · Direitos exclusivos · Beat removido do catálogo · Contrato registrado |

A licença **Premium** é marcada como POPULAR (destaque visual). A seleção da licença é refletida na mensagem de WhatsApp e no modal de confirmação.

### C.4 Interesses (favoritos)

- Store Zustand `useInterests` em `PlayerStore.tsx`.
- Persistência em `localStorage` sob a chave `braba-interests` (array de slugs).
- Operações: `toggle(slug)`, `has(slug)`, `clear()`.
- Em `/meus-interesses`:
  - Soma automática dos preços base.
  - Botão "Enviar tudo via WhatsApp" gera uma mensagem consolidada com nome do cliente, e-mail e lista completa.
  - Botão "Limpar lista".

### C.5 Fluxo de compra (7 passos, simulado)

Documentado em `/como-funciona` e implementado parcialmente nas telas:

1. **Acessa o catálogo** — `loja.brabamusic.com.br` ou aba Beats do app.
2. **Escuta a prévia** — sem login.
3. **Cadastro rápido (sem senha)** — nome + e-mail, gatilhado ao favoritar ou pedir.
4. **Marca interesse** — botão no card ou agrupado em `/meus-interesses`.
5. **Recebe link de pagamento por e-mail** — Pix ou gateway externo (manual nesta fase).
6. **Envia comprovante via WhatsApp** — após pagar.
7. **Recebe o beat** — link de download por WhatsApp + e-mail.

O modal de confirmação na página do beat simula visualmente o passo 4→5, mostrando para qual e-mail será enviado o link.

### C.6 WhatsApp

- Número placeholder em `WHATSAPP_NUMBER = "5500000000000"` (`src/data/beats.ts`) — **trocar pelo número real antes de publicar**.
- Mensagens pré-preenchidas via `encodeURIComponent`:
  - **Beat individual:** `"Olá BRABA! Tenho interesse no beat *[título]* (prod. [produtor]) — licença *[licença]*. Pode me passar o link de pagamento?"`
  - **Lista de interesses:** identificação do cliente + lista de beats com preço + pedido de links.

---

## D. Design system

- Tema **dark** com base roxa BRABA (`#2a1458` → `#4a1f8c`), acentos magenta (`#e94db8`) e verde-limão (`#c8ff3b`).
- Tipografia: **display** graffiti/handwritten para títulos, **Inter** para corpo.
- Tokens semânticos em `src/styles.css` no formato `oklch` (`--background`, `--primary`, `--accent`, etc.).
- Utilitários customizados: `.glass` (glassmorphism), `.glow-magenta` (shadow neon), `.text-gradient`.
- **Responsivo mobile-first.** Header colapsa em drawer no mobile (`Sheet`).
- Microinterações: hover-lift nos cards, pulse no botão de play, waveform animado.

---

## E. Persistência

| Chave | Conteúdo | Local |
|-------|----------|-------|
| `braba-user` | `{ name, email }` do usuário logado | `localStorage` |
| `braba-interests` | Array de slugs de beats favoritados | `localStorage` |

Nada é enviado a servidor nesta fase.

---

## F. O que **NÃO** está implementado (fora de escopo da Fase 1)

- ❌ Backend / banco de dados (sem Lovable Cloud / Supabase).
- ❌ Áudio real — o player é puramente visual com waveform fake animado.
- ❌ Pagamento automatizado (Pix instantâneo, Stripe, Mercado Pago).
- ❌ Envio real de e-mail transacional.
- ❌ Integração com WhatsApp Business API — só link `wa.me` com texto pré-preenchido.
- ❌ Painel administrativo / dashboard do produtor.
- ❌ Upload de beats / gestão de catálogo.
- ❌ Contrato eletrônico para licença Exclusiva.
- ❌ Verificação de e-mail / autenticação real (qualquer string é aceita no cadastro).
- ❌ Sessão server-side, recuperação de cadastro entre dispositivos.
- ❌ Sistema de cupons, promoções, bundles.
- ❌ Histórico de pedidos do cliente.
- ❌ SEO avançado (sitemap, JSON-LD por beat) — só meta básico.

---

## G. Pendências conhecidas antes de ir ao ar

1. Substituir `WHATSAPP_NUMBER` placeholder pelo número real da equipe.
2. Substituir capas geradas por capas reais (ou validar uso das atuais).
3. Trocar dados mock de produtores/beats pelo catálogo real.
4. Definir preços finais de cada licença por beat (hoje todos compartilham os mesmos 3 níveis fixos).
5. Configurar subdomínio `loja.brabamusic.com.br` apontando para o deploy.
