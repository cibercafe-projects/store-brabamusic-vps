import { useEffect, useRef, useState } from "react";
import { Play, Pause, X, Volume2, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { usePlayer } from "./PlayerStore";
import { BeatCoverFallback } from "@/components/admin/beats/BeatCoverFallback";
import { incrementBeatPlays } from "@/lib/catalog.functions";

const PREVIEW_LIMIT_SECONDS = 90;
// When (in seconds since start) the tag should play over the beat.
const TAG_MARKS = [5, 25, 45, 65, 87];
const BEAT_VOL_NORMAL = 1;
const BEAT_VOL_DUCKED = 0.35;
const TAG_VOL = 0.95;

function fmt(t: number) {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const s = Math.floor(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function PlayerBar() {
  const { current, playing, toggle, stop, markCounted, counted } = usePlayer();
  const beatRef = useRef<HTMLAudioElement>(null);
  const tagRef = useRef<HTMLAudioElement>(null);
  const firedRef = useRef<Set<number>>(new Set());
  const duckTimerRef = useRef<number | null>(null);
  const increment = useServerFn(incrementBeatPlays);
  const [position, setPosition] = useState(0);

  // Reset per-track state when the beat changes
  useEffect(() => {
    firedRef.current = new Set();
    setPosition(0);
    if (beatRef.current) beatRef.current.currentTime = 0;
  }, [current?.id]);

  // Sync play/pause state with the store
  useEffect(() => {
    const a = beatRef.current;
    if (!a) return;
    if (playing) {
      a.volume = BEAT_VOL_NORMAL;
      a.play().catch(() => {
        usePlayer.setState({ playing: false });
      });
    } else {
      a.pause();
      const tag = tagRef.current;
      if (tag) {
        tag.pause();
        tag.currentTime = 0;
      }
      a.volume = BEAT_VOL_NORMAL;
    }
  }, [playing, current?.id]);

  if (!current) return null;
  const hasAudio = !!current.preview_url;
  const limit = PREVIEW_LIMIT_SECONDS;
  const progress = Math.min(position / limit, 1);

  const playTag = () => {
    const tag = tagRef.current;
    const beat = beatRef.current;
    if (!tag || !beat) return;
    try {
      tag.currentTime = 0;
      tag.volume = TAG_VOL;
      beat.volume = BEAT_VOL_DUCKED;
      void tag.play().catch(() => {});
      if (duckTimerRef.current) window.clearTimeout(duckTimerRef.current);
      duckTimerRef.current = window.setTimeout(() => {
        if (beatRef.current) beatRef.current.volume = BEAT_VOL_NORMAL;
      }, 1400);
    } catch {
      /* ignore */
    }
  };

  const onTimeUpdate = () => {
    const a = beatRef.current;
    if (!a) return;
    const t = a.currentTime;
    setPosition(t);
    for (const mark of TAG_MARKS) {
      if (t >= mark && !firedRef.current.has(mark)) {
        firedRef.current.add(mark);
        playTag();
      }
    }
    if (t >= limit) {
      a.pause();
      a.currentTime = 0;
      firedRef.current = new Set();
      setPosition(0);
      usePlayer.setState({ playing: false });
    }
  };

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = beatRef.current;
    if (!a) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = ratio * limit;
    a.currentTime = target;
    setPosition(target);
    // Reset fired marks that are ahead of the new position so they can trigger again
    const next = new Set<number>();
    for (const m of TAG_MARKS) if (m < target) next.add(m);
    firedRef.current = next;
  };

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
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
              <Play className="h-3 w-3" />
              {(current.plays_count ?? 0).toLocaleString("pt-BR")} reproduções
            </p>
          </div>

          {hasAudio ? (
            <>
              {/* Hidden audio elements — custom controls only, no download shortcut */}
              <audio
                ref={beatRef}
                src={current.preview_url ?? undefined}
                preload="metadata"
                controlsList="nodownload noremoteplayback noplaybackrate"
                // @ts-expect-error non-standard but widely supported attrs
                disablePictureInPicture
                disableRemotePlayback
                onTimeUpdate={onTimeUpdate}
                onEnded={() => {
                  setPosition(0);
                  firedRef.current = new Set();
                  usePlayer.setState({ playing: false });
                }}
                onPlay={() => {
                  usePlayer.setState({ playing: true });
                  if (current && !counted.has(current.id)) {
                    markCounted(current.id);
                    increment({ data: { beatId: current.id } })
                      .then((res) => {
                        const next = res?.plays_count ?? (current.plays_count ?? 0) + 1;
                        usePlayer.setState((s) =>
                          s.current && s.current.id === current.id
                            ? { current: { ...s.current, plays_count: next } }
                            : {},
                        );
                      })
                      .catch(() => {});
                  }
                }}
                onPause={() => usePlayer.setState({ playing: false })}
                className="hidden"
              />
              <audio ref={tagRef} src="/audio/braba-voice-tag.mp3" preload="auto" className="hidden" />

              {/* Custom progress bar */}
              <div className="w-full">
                <div
                  onClick={onSeek}
                  className="h-2 w-full rounded-full bg-white/10 overflow-hidden cursor-pointer"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={limit}
                  aria-valuenow={Math.floor(position)}
                >
                  <div
                    className="h-full bg-accent transition-[width] duration-100"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground tabular-nums">
                  <span>{fmt(position)}</span>
                  <span>{fmt(limit)}</span>
                </div>
              </div>

              <button
                onClick={toggle}
                aria-label={playing ? "Pausar" : "Tocar"}
                className="grid place-items-center h-16 w-16 rounded-full bg-accent text-accent-foreground glow-magenta"
              >
                {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-1" />}
              </button>

              <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-accent" />
                Prévia protegida · {limit}s
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Volume2 className="h-4 w-4" /> Sem prévia disponível para este beat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
