# Sprint Go Live — Tipos de Beat Configuráveis

Vamos entregar em **7 fases, uma por vez, com aprovação entre cada uma**. Cada fase é pequena, testável e não quebra o que já existe. Este documento é o plano macro; cada fase terá seu próprio plano detalhado antes de executar.

## Estratégia geral

- Introduzir tabela `beat_types` como fonte única de: nome exibido, valor padrão, link de pagamento, "entrega inclui stems".
- Manter a coluna atual `beats.tipo` (enum `aberto`/`fechado`) durante toda a migração como **fallback**, e adicionar `beats.beat_type_id` (FK). Backfill preenche os dois lados. Só removemos o enum depois que todo o código estiver lendo pela FK — provavelmente em uma fase futura fora deste sprint.
- Toda leitura de "link de pagamento" e "preço padrão" passa a ir por **um único helper** (`getBeatPayment(beat)`), eliminando `if tipo == "aberto"`.
- O campo global `app_settings.payment_link` continua existindo como fallback legado até a Fase 5 concluir, e depois é aposentado (mantido no schema, deixa de ser lido).

## Fases

### Fase 1 — Cadastro de Tipos de Beat (backoffice)
- Migration cria `public.beat_types` (id, nome, slug único, descricao, valor_padrao numeric, link_pagamento text, inclui_stems bool, ativo bool, ordem int, timestamps) + GRANTs + RLS (admin gerencia, leitura autenticada).
- Seed: `Beat Fechado` (R$100, inclui_stems=false, slug=`fechado`) e `Beat Aberto` (R$200, inclui_stems=true, slug=`aberto`). Link inicial copiado de `app_settings.payment_link` para os dois; admin edita depois.
- Nova rota `/admin/_protected/tipos-beat` com listagem + form (criar/editar/ativar/desativar/reordenar). Item no sidebar dentro de "Configurações".
- Server fns em `src/lib/beat-types.functions.ts`.
- **Não toca em beats/compras/exibição ainda.**

### Fase 2 — FK no Beat
- Migration adiciona `beats.beat_type_id uuid references beat_types(id)`; backfill por `tipo` → slug; **não** dropar `tipo` ainda.
- `BeatForm`: substitui o Select "Tipo" atual por um Select carregado de `beat_types` (só ativos). Ao salvar, grava `beat_type_id`; grava `tipo` legado derivado de `inclui_stems` para compatibilidade.
- Sem mudança na compra ainda.

### Fase 3 — Fluxo de Compra usa o link do tipo
- Criar helper único `resolveBeatPayment(beat)` server-side: retorna `{ valor, paymentLink, tipoNome, inclui_stems }` lendo por `beat_type_id`; fallback para `app_settings.payment_link` só se o tipo não tiver link.
- `startPurchase`, `getPurchaseSettings`, `resendPurchaseInstructions` passam a usar o helper (hoje leem `app_settings.payment_link` direto).

### Fase 4 — Exibição pública
- `BeatCard` e `/beat/$slug` mostram `beat_type.nome` (dinâmico) em vez de "Aberto/Fechado" hardcoded. `catalog.functions` retorna `tipo_nome` e `inclui_stems`.

### Fase 5 — Mensagens (WhatsApp, e-mail, popup, reenvio, copiar)
- Todos os pontos que hoje montam texto com `payment_link` passam pelo helper. Confirmar: `PurchaseDialog`, e-mail `purchase-created`, `ResendInstructionsCard`, WhatsApp deeplink.
- Após esta fase, `app_settings.payment_link` deixa de ser lido (mantido no banco por segurança).

### Fase 6 — Preço padrão automático e editável
- No `BeatForm`, ao trocar o tipo, autopreencher `preco` com `valor_padrao` do tipo (permanece editável). Remover os defaults hardcoded (`150`/`100`) em `beats.functions.ts` — passa a usar `valor_padrao` do tipo quando `preco` vier vazio.

### Fase 7 — Limpeza arquitetural
- Varredura por `=== "aberto"` / `=== "fechado"` em src/. Substituir usos remanescentes (uploader de stems no `BeatForm`, badges, cópias de rótulo) por `inclui_stems` / `tipo_nome` vindos do tipo.
- Atualizar `catalog.types.ts` e types Supabase.
- Enum `beat_tipo` e coluna `beats.tipo` permanecem no banco (deprecated) — remoção fica para uma sprint futura de cleanup depois de observação em produção.

## Fora de escopo (não mexemos)
Compras, comprovantes, dashboard, lançamentos, uploads, segurança, entrega de arquivos, licença jurídica (Sprint 11).

## Casos de teste (final da sprint)
1. Beat Fechado → R$100 + link do tipo Fechado nas mensagens.
2. Beat Aberto → R$200 + link do tipo Aberto.
3. Criar tipo "Exclusive License" (R$500, link novo), associar a um beat → fluxo completo sem alterar código.

## Ritmo
Peço aprovação após cada fase. Antes de executar cada uma, envio um **plano detalhado** com SQL exato, arquivos tocados e como testar. Começo pela Fase 1 assim que aprovar este plano macro.
