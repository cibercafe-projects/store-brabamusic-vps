import { Link } from "@tanstack/react-router";
import { Play, Pause, Headphones } from "lucide-react";
import { usePlayer } from "./PlayerStore";
import { BeatCoverFallback } from "@/components/admin/beats/BeatCoverFallback";
import type { PublicBeat } from "@/lib/catalog.types";

export function BeatCard({ beat }: { beat: PublicBeat }) {
  const { current, playing, play } = usePlayer();
  const isCurrent = current?.id === beat.id;
  const isPlaying = isCurrent && playing;
  const hasPreview = !!beat.preview_url;

  return (
    <article className="group glass rounded-2xl overflow-hidden hover:glow-magenta transition-all duration-300 hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden">
        {beat.capa_url ? (
          <img
            src={beat.capa_url}
            alt={beat.nome}
            loading="lazy"
            width={512}
            height={512}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <BeatCoverFallback name={beat.nome} />
        )}
        {hasPreview && (
          <button
            onClick={() => play(beat)}
            aria-label={isPlaying ? "Pausar" : "Tocar prévia"}
            className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <span className="grid place-items-center h-14 w-14 rounded-full bg-accent text-accent-foreground glow-magenta">
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            </span>
          </button>
        )}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
          {beat.genero && (
            <span className="rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] uppercase tracking-wider">
              {beat.genero}
            </span>
          )}
          {beat.bpm && (
            <span className="rounded-full bg-black/60 backdrop-blur px-2 py-0.5 text-[10px]">
              {beat.bpm} BPM
            </span>
          )}
        </div>
        <span
          title={`${beat.plays_count} reproduções`}
          className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur px-2 py-1 text-[10px] flex items-center gap-1"
        >
          <Headphones className="h-3 w-3" />
          {(beat.plays_count ?? 0).toLocaleString("pt-BR")}
        </span>
      </div>
      <div className="p-4">
        <Link to="/beat/$slug" params={{ slug: beat.slug }} className="block">
          <h3 className="font-display text-xl leading-tight hover:text-accent transition truncate">
            {beat.nome}
          </h3>
        </Link>
        {beat.produtora_slug ? (
          <Link
            to="/produtora/$slug"
            params={{ slug: beat.produtora_slug }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            prod. {beat.produtora_nome}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">prod. {beat.produtora_nome}</span>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-accent">
            {beat.preco != null ? `R$ ${beat.preco.toFixed(2).replace(".", ",")}` : "—"}
          </span>
          <Link
            to="/beat/$slug"
            params={{ slug: beat.slug }}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/80"
          >
            Ver beat
          </Link>
        </div>
      </div>
    </article>
  );
}
