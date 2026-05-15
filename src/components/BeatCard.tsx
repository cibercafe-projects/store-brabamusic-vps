import { Link } from "@tanstack/react-router";
import { Play, Pause, Heart } from "lucide-react";
import type { Beat } from "@/data/beats";
import { usePlayer, useInterests } from "./PlayerStore";
import { useAuth } from "./AuthStore";

export function BeatCard({ beat }: { beat: Beat }) {
  const { current, playing, play } = usePlayer();
  const interests = useInterests();
  const { requireAuth } = useAuth();
  const isCurrent = current?.slug === beat.slug;
  const isPlaying = isCurrent && playing;
  const liked = interests.has(beat.slug);

  return (
    <article className="group glass rounded-2xl overflow-hidden hover:glow-magenta transition-all duration-300 hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden">
        <img src={beat.cover} alt={beat.title} loading="lazy" width={512} height={512} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <button
          onClick={() => play(beat)}
          aria-label={isPlaying ? "Pausar" : "Tocar prévia"}
          className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="grid place-items-center h-14 w-14 rounded-full bg-accent text-accent-foreground glow-magenta">
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </span>
        </button>
        <button
          onClick={() => requireAuth(() => interests.toggle(beat.slug))}
          aria-label="Adicionar aos interesses"
          className="absolute top-3 right-3 grid place-items-center h-9 w-9 rounded-full bg-black/50 backdrop-blur hover:bg-primary"
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-accent text-accent" : "text-white"}`} />
        </button>
        <div className="absolute bottom-3 left-3 flex gap-2">
          <span className="rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] uppercase tracking-wider">{beat.genre}</span>
          <span className="rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px]">{beat.bpm} BPM</span>
        </div>
      </div>
      <div className="p-4">
        <Link to="/beat/$slug" params={{ slug: beat.slug }} className="block">
          <h3 className="font-display text-xl leading-tight hover:text-accent transition">{beat.title}</h3>
        </Link>
        <Link to="/produtor/$slug" params={{ slug: beat.producerSlug }} className="text-xs text-muted-foreground hover:text-foreground">
          prod. {beat.producer}
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-accent">R$ {beat.price}</span>
          <Link to="/beat/$slug" params={{ slug: beat.slug }} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/80">
            Tenho interesse
          </Link>
        </div>
      </div>
    </article>
  );
}
