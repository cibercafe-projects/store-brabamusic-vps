
## Objetivo

Proteger as prévias no player público: nenhum beat toca inteiro, e uma voice tag "BRABA Beats" toca por cima em intervalos regulares. O usuário legítimo ainda escuta com qualidade suficiente para decidir a compra; quem tentar gravar leva um arquivo cortado e marcado.

## O que muda para o visitante

- O player continua abrindo do mesmo jeito (modal com capa, título, produtor).
- Toca no máximo **90 segundos** do beat, começando do início.
- Uma voz curta ("BRABA Beats") entra sobreposta ao beat:
  - Aos ~5 segundos do início.
  - Depois a cada ~20 segundos.
  - E sempre nos últimos 3s antes do corte.
- Aparece um selinho discreto no player: "Prévia protegida · 90s".
- Sem `<audio controls>` nativo (evita botão "baixar" do menu do navegador). Controles ficam só: play/pause, barra de progresso do trecho de 90s, tempo restante.

## O que muda para o admin

Nada no fluxo de upload. Continua enviando o beat completo como hoje — o corte e a tag são aplicados **em tempo real, no navegador**, em cima do `preview_url` já existente.

## Arquivo de voice tag

Gero uma vez, via Lovable AI TTS (`openai/gpt-4o-mini-tts`, voz `alloy`, instruções curtas para soar firme/urbano), e salvo como arquivo estático em `public/audio/braba-voice-tag.mp3` (~1s de duração, texto: "BRABA Beats"). Fica versionado no repo; se quiserem trocar depois, é só substituir o arquivo. Não precisa gerar por request — é sempre a mesma tag.

## Detalhes técnicos

- `PlayerBar` deixa de usar `<audio controls>` e passa a usar **Web Audio API**:
  - `AudioContext` + dois `MediaElementAudioSourceNode` (beat + tag) roteados para `destination`.
  - Beat toca via `<audio>` invisível com `currentTime` limitado a 90s (listener em `timeupdate` pausa ao atingir o limite).
  - Um `setInterval` agenda `tag.play()` nos instantes definidos, com `tag.volume = 0.9` e `beat.volume` momentaneamente reduzido para 0.55 durante a tag (ducking simples).
  - `controlsList="nodownload noremoteplayback"`, `disablePictureInPicture`, `disableRemotePlayback` no elemento oculto — não elimina download determinado, mas remove os atalhos óbvios.
- Botão play/pause customizado (já existe visualmente, só passa a controlar via Web Audio).
- Barra de progresso simples com `<progress>` mostrando `currentTime / min(duration, 90)`.
- Contagem de plays (`incrementBeatPlays`) continua disparando no primeiro `play` — lógica atual preservada.
- `usePlayer` store: sem mudanças de API pública. `playing`/`current`/`stop`/`toggle` continuam iguais.

## Limitações honestas (para alinhar expectativa)

Nenhuma proteção client-side é inquebrável — quem gravar o áudio de saída do sistema ainda consegue capturar. O objetivo aqui é:
1. Cortar valor: só 90s no ar.
2. Marcar autoria: tag sobreposta fica gravada em qualquer captura.
3. Remover atalhos: sem botão de download nativo, sem URL fácil de copiar no DevTools *pra usuário casual* (o `preview_url` do Supabase continua acessível para quem inspecionar rede — se quiserem eliminar isso depois, é outro trabalho: proxy autenticado + URL assinada de curta duração).

## Arquivos afetados

- `public/audio/braba-voice-tag.mp3` — novo (gerado uma vez via TTS).
- `src/components/PlayerBar.tsx` — reescrito para Web Audio + corte 90s + overlay de tag + controles customizados.
- `src/components/PlayerStore.tsx` — sem mudança de API (pode receber ajuste mínimo se precisar expor `duration`/`position`, mas mantenho local ao `PlayerBar` se possível).

## Fora do escopo (posso fazer depois se pedir)

- Watermark inaudível (esteganografia).
- URLs assinadas com expiração curta para o preview.
- Preview pré-renderizada no upload (arquivo cortado + com tag salvo no storage).
