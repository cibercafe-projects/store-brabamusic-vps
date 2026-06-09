import { useEffect, useRef } from "react";
import { Play, Pause, X, Volume2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { usePlayer } from "./PlayerStore";
import { BeatCoverFallback } from "@/components/admin/beats/BeatCoverFallback";
import { incrementBeatPlays } from "@/lib/catalog.functions";

export function PlayerBar() {
  const { current, playing, toggle, stop, markCounted, counted } = usePlayer();
  const audioRef = useRef<HTMLAudioElement>(null);
  const increment = useServerFn(incrementBeatPlays);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.play().catch(() => {
        // autoplay blocked or media error — keep modal but pause state
      });
    } else {
      a.pause();
    }
  }, [playing, current?.id]);

  if (!current) return null;

  const hasAudio = !!current.preview_url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={stop}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl glass border border-white/10 shadow-2xl"
      >
        <button
          onClick={stop}
          aria-label="Fechar player"
          className="absolute top-3 right-3 z-10 grid place-items-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 flex flex-col items-center gap-5 text-center">
          <div className="h-48 w-48 rounded-xl overflow-hidden shadow-lg">
            {current.capa_url ? (
              <img
                src={current.capa_url}
                alt={current.nome}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <BeatCoverFallback name={current.nome} />
            )}
          </div>
          <div className="min-w-0 w-full">
            <p className="font-display text-2xl truncate">{current.nome}</p>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              prod. {current.produtora_nome}
              {current.bpm ? ` · ${current.bpm} BPM` : ""}
              {current.tom ? ` · ${current.tom}` : ""}
            </p>
          </div>

          {hasAudio ? (
            <audio
              ref={audioRef}
              src={current.preview_url ?? undefined}
              controls
              className="w-full"
              onEnded={() => usePlayer.setState({ playing: false })}
              onPlay={() => usePlayer.setState({ playing: true })}
              onPause={() => usePlayer.setState({ playing: false })}
            />
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Volume2 className="h-4 w-4" /> Sem prévia disponível para este beat.
            </p>
          )}

          {hasAudio && (
            <button
              onClick={toggle}
              aria-label={playing ? "Pausar" : "Tocar"}
              className="grid place-items-center h-16 w-16 rounded-full bg-accent text-accent-foreground glow-magenta"
            >
              {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
