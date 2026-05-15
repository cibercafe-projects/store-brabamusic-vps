import { Play, Pause, X } from "lucide-react";
import { usePlayer } from "./PlayerStore";

export function PlayerBar() {
  const { current, playing, toggle, stop } = usePlayer();
  if (!current) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10">
      <div className="mx-auto max-w-7xl flex items-center gap-4 px-4 py-3">
        <img src={current.cover} alt="" className="h-12 w-12 rounded-md object-cover" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-base truncate">{current.title}</p>
          <p className="text-xs text-muted-foreground truncate">prod. {current.producer} · {current.bpm} BPM · {current.key}</p>
        </div>
        {/* Fake waveform */}
        <div className="hidden md:flex items-end gap-0.5 h-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className={`w-1 rounded-sm bg-gradient-to-t from-primary to-accent ${playing ? "animate-pulse" : ""}`}
              style={{ height: `${20 + Math.abs(Math.sin(i * 0.7)) * 80}%`, animationDelay: `${i * 30}ms` }}
            />
          ))}
        </div>
        <button
          onClick={toggle}
          aria-label={playing ? "Pausar" : "Tocar"}
          className="grid place-items-center h-11 w-11 rounded-full bg-accent text-accent-foreground glow-magenta"
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>
        <button onClick={stop} aria-label="Fechar player" className="grid place-items-center h-9 w-9 rounded-full bg-white/10 hover:bg-white/20">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
