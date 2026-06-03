# Documentação do Projeto — README + REQUIREMENTS

Vou criar dois arquivos na raiz do projeto consolidando tudo que já foi implementado, com base na análise do código atual (rotas, componentes, stores, dados mock e fluxos).

## Arquivos a criar

### 1. `README.md`
Visão geral do projeto, pensada para quem chega no repositório pela primeira vez.

Seções:
- **Sobre** — Loja de beats do selo BRABA Music, extensão do site em `loja.brabamusic.com.br`, fase 1 (MVP de mockup navegável, sem backend).
- **Stack** — TanStack Start v1 + Vite 7, React 19, Tailwind v4, Zustand (player/auth/interesses), shadcn/ui, lucide-react. Sem Lovable Cloud nesta fase.
- **Estrutura de pastas** — `src/routes`, `src/components`, `src/data`, `src/assets`.
- **Como rodar** — comandos padrão.
- **Status atual** — MVP de telas, dados mock, persistência em localStorage.
- **Próximos passos sugeridos** — backend real (Cloud), gateway de pagamento, integração WhatsApp, áudio real, painel do produtor.

### 2. `REQUIREMENTS.md`
Inventário detalhado das funcionalidades + regras de negócio implementadas hoje.

Seções:

**A. Telas / Rotas implementadas**
- `/` — Home/Catálogo: hero, busca textual, filtros por gênero, slider de BPM, grid de beats.
- `/beat/:slug` — Detalhe do beat: capa grande, waveform fake animado, metadados (BPM, tom, duração, preço), tags de mood, seleção de licença (Lease/Premium/Exclusiva), CTAs (interesse com login, WhatsApp direto, salvar favorito), modal de confirmação de pedido, beats relacionados por gênero.
- `/produtores` — Lista de produtores com avatar iniciais, cidade, contagem de beats, bio, Instagram.
- `/produtor/:slug` — Página individual do produtor com beats dele.
- `/meus-interesses` — Lista de favoritos do usuário, exige login, gera mensagem única de WhatsApp com todos os beats e total estimado.
- `/como-funciona` — 7 passos do fluxo + FAQ (7 perguntas) sobre licenças, pagamento, entrega.
- `/app` — Mockup mobile (phone frame) demonstrando como o catálogo aparece via WebView no app BRABA.

**B. Componentes principais**
- `Header` — sticky com glassmorphism, nav desktop + Sheet mobile (hamburger), badge de contagem de interesses, estado de login, link externo para o site.
- `BeatCard` — capa com hover play, botão favorito (com gate de auth), badges gênero/BPM, preço, CTA "Tenho interesse".
- `PlayerBar` — popup modal centralizado (mudou de bottom-fixed), com capa, waveform fake animado, play/pause, close.
- `AuthModal` — cadastro rápido sem senha (nome + e-mail).

**C. Regras de negócio implementadas**

*Autenticação (mock):*
- Login passwordless: apenas nome + e-mail, salvo em `localStorage` (`braba-user`).
- Pattern `requireAuth(action)`: executa a ação se logado; senão abre modal e executa após login.
- Ações protegidas: salvar nos favoritos, abrir modal "Tenho interesse", visualizar `/meus-interesses`.

*Catálogo:*
- 8 beats mock em `src/data/beats.ts` com slug, título, produtor, gênero, BPM, tom, duração, preço, mood, capa.
- 4 produtores mock.
- Filtros combináveis: gênero (lista fixa), BPM (slider de máximo), busca textual em título/produtor/gênero.

*Licenças (em cada beat):*
- Lease — R$ 199 — MP3+WAV, streams não-comerciais, 1 distribuição, crédito ao produtor.
- Premium — R$ 499 — MP3+WAV+trackouts, streams comerciais ilimitados, DSPs, vídeo-clipe (marcada como POPULAR).
- Exclusiva — R$ 2499 — todos os arquivos+stems, direitos exclusivos, beat sai do catálogo, contrato.

*Interesses (favoritos):*
- Persistidos em `localStorage` (`braba-interests`) como array de slugs.
- Operações: toggle, has, clear.
- Soma de preços calculada na tela `/meus-interesses`.

*Fluxo de compra (7 passos, simulado):*
1. Usuário escuta prévia (sem login).
2. Para favoritar ou pedir, faz cadastro nome+e-mail.
3. Clica "Tenho interesse" → modal confirma beat + licença + dados.
4. Pedido "enviado" gera link `wa.me` com mensagem pré-preenchida OU simula envio de link de pagamento por e-mail.
5. (Manual/offline) Equipe BRABA envia link de pagamento por e-mail.
6. Após pagar, cliente envia comprovante via WhatsApp.
7. Equipe libera o beat por WhatsApp + e-mail.

*WhatsApp:*
- Número placeholder `5500000000000` em `src/data/beats.ts` (`WHATSAPP_NUMBER`).
- Mensagens pré-preenchidas com nome do beat, produtor e licença escolhida.
- Em `/meus-interesses`, mensagem agregada com todos os beats e total.

**D. Design system**
- Tema escuro roxo BRABA, accent magenta + verde-limão, tipografia display (graffiti/handwritten) + Inter.
- Tokens em `src/styles.css` (oklch), utilitários `.glass`, `.glow-magenta`, `.text-gradient`.
- Responsivo mobile-first, header com Sheet drawer no mobile.

**E. O que NÃO está implementado (fora de escopo da fase 1)**
- Backend / banco de dados (sem Lovable Cloud).
- Áudio real (player é visual com waveform fake).
- Pagamento automatizado (Pix/Stripe).
- Envio real de e-mail / integração WhatsApp Business API.
- Painel do produtor / upload de beats.
- Sistema de licenças com contrato eletrônico.
- Autenticação real (sem verificação de e-mail, sem sessão server-side).

## Sem alterações de código de produto

Apenas criação dos dois arquivos de documentação na raiz. Nenhuma rota, componente ou lógica é tocada.