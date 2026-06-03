import { Play, Pause, X } from "lucide-react";
import { usePlayer } from "./PlayerStore";

export function PlayerBar() {
  const { current, playing, toggle, stop } = usePlayer();
  if (!current) return null;

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
          className="absolute top-3 right-3 grid place-items-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 flex flex-col items-center gap-5 text-center">
          <img
            src={current.cover}
            alt=""
            className="h-48 w-48 rounded-xl object-cover shadow-lg"
          />
          <div className="min-w-0 w-full">
            <p className="font-display text-2xl truncate">{current.title}</p>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              prod. {current.producer} · {current.bpm} BPM · {current.key}
            </p>
          </div>

          {/* Fake waveform */}
          <div className="flex items-end gap-0.5 h-14 w-full">
            {Array.from({ length: 60 }).map((_, i) => (
              <span
                key={i}
                className={`flex-1 rounded-sm bg-gradient-to-t from-primary to-accent ${playing ? "animate-pulse" : ""}`}
                style={{
                  height: `${20 + Math.abs(Math.sin(i * 0.7)) * 80}%`,
                  animationDelay: `${i * 30}ms`,
                }}
              />
            ))}
          </div>

          <button
            onClick={toggle}
            aria-label={playing ? "Pausar" : "Tocar"}
            className="grid place-items-center h-16 w-16 rounded-full bg-accent text-accent-foreground glow-magenta"
          >
            {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
          </button>
        </div>
      </div>
    </div>
  );
}
