
# Loja de Beats BRABA — Mockup de Telas (loja.brabamusic.com.br)

Vou montar a **ideia visual das telas** (mockups navegáveis, sem backend real) como uma extensão do site brabamusic.com.br, mantendo a identidade urbana: fundo roxo profundo, tipografia graffiti/handwritten nos títulos, sans-serif nos textos, cards translúcidos com glow, acentos em magenta/verde-limão e tigre/spray como elementos gráficos.

## Escopo da Fase 1 (MVP, conforme PDF)

Catálogo de beats com prévia em áudio + fluxo "Tenho Interesse" via WhatsApp/formulário. **Sem checkout automatizado nesta fase** — venda manual por link de pagamento. Estrutura preparada para evoluir.

## Telas a criar

1. **Home / Catálogo (`/`)**
   - Header com logo BRABA + nav (Beats, Produtores, Sobre, App) + botão "Voltar ao site"
   - Hero curto: "BEATS BRABA — escolha seu próximo hit" + busca
   - Filtros: Gênero (Trap, Funk, Drill, Boom Bap...), BPM (slider), Produtor, Preço, Mood
   - Grid de cards de beat: capa, nome, produtor, BPM/tom, gênero, preço, play inline, botão "Tenho Interesse"
   - Player fixo no rodapé (waveform + controles) quando um beat está tocando

2. **Detalhe do Beat (`/beat/:slug`)**
   - Capa grande + waveform interativo
   - Metadados: produtor, BPM, tom, gênero, duração, data
   - Tags / mood
   - Tabela de licenças (indicativa): Lease, Premium, Exclusiva — preço e o que inclui
   - CTAs: "Tenho Interesse (WhatsApp)" + "Pedir por formulário"
   - Beats relacionados

3. **Página do Produtor (`/produtor/:slug`)**
   - Banner + foto + bio curta + redes
   - Estatísticas (nº de beats, gêneros)
   - Grid dos beats dele

4. **Modal "Tenho Interesse"**
   - Resumo do beat + licença escolhida
   - Dois caminhos: botão WhatsApp (mensagem pré-preenchida) ou formulário (nome, @, email, mensagem)
   - Confirmação de envio

5. **Carrinho de Interesses (`/meus-interesses`)**
   - Lista local (localStorage) de beats marcados
   - Botão "Enviar todos via WhatsApp" gerando uma mensagem única

6. **Sobre / Como Funciona (`/como-funciona`)**
   - Os 6 passos do fluxo do PDF, ilustrados
   - FAQ curto sobre licenças, entrega, pagamento (Pix / gateway)

7. **Tela do App — aba "Beats" (preview mobile)**
   - Mockup mobile (frame) mostrando como o catálogo aparece via WebView no app

## Conteúdo de exemplo

8–12 beats fictícios com capas geradas, 3–4 produtores, tudo em dados mock (sem banco). Áudio de prévia: arquivos curtos placeholder (silêncio com waveform animado, ou loops royalty-free se disponíveis — confirmo abaixo).

## Direção visual (herdada do site)

- Fundo: roxo escuro `#2a1458` → `#4a1f8c` com texturas/spray
- Acentos: magenta `#e94db8`, verde-limão `#c8ff3b`
- Tipografia: handwritten/graffiti (Permanent Marker / Rubik Mono) para títulos; Inter para corpo
- Cards: glassmorphism leve com borda gradiente
- Microanimações sutis (hover lift, play pulse)

## Stack técnico

TanStack Start já configurado, rotas separadas por tela, dados mock em `src/data/beats.ts`, sem Lovable Cloud nesta fase (é só mockup de telas).

---

**Antes de implementar, 2 dúvidas rápidas:**
1. Os botões "Tenho Interesse" devem apontar para um número de WhatsApp real seu, ou deixo placeholder `+55 00 00000-0000`?
2. Quer que eu gere capas ilustrativas (IA) para os beats de exemplo, ou prefere placeholders neutros?
