import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { BEATS, GENRES } from "@/data/beats";
import { BeatCard } from "@/components/BeatCard";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const [genre, setGenre] = useState<string>("Todos");
  const [q, setQ] = useState("");
  const [bpm, setBpm] = useState<[number, number]>([60, 180]);

  const filtered = BEATS.filter((b) => {
    if (genre !== "Todos" && !b.genre.toLowerCase().includes(genre.toLowerCase())) return false;
    if (b.bpm < bpm[0] || b.bpm > bpm[1]) return false;
    if (q && !`${b.title} ${b.producer} ${b.genre}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <img src={heroBg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" width={1920} height={1024} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">Selo BRABA Music · loja de beats</p>
          <h1 className="mt-4 font-display text-5xl md:text-7xl leading-none">
            <span className="text-gradient">ESCOLHE</span> O BEAT.<br />
            <span className="text-gradient">ESCREVE</span> A HISTÓRIA.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-muted-foreground">
            Catálogo oficial dos produtores da BRABA. Escuta a prévia, marca interesse e fecha direto com a equipe via WhatsApp ou Pix.
          </p>

          <div className="mt-8 max-w-xl mx-auto glass rounded-full flex items-center gap-2 px-4 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, produtor ou gênero…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`rounded-full px-4 py-1.5 text-sm border transition ${
                  genre === g ? "bg-accent text-accent-foreground border-accent" : "border-white/15 hover:border-accent/60"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span>BPM {bpm[0]}–{bpm[1]}</span>
            <input type="range" min={60} max={180} value={bpm[1]} onChange={(e) => setBpm([60, +e.target.value])} className="accent-[var(--accent)]" />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((b) => <BeatCard key={b.slug} beat={b} />)}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-16">Nenhum beat com esses filtros. Solta os ajustes ai.</p>
        )}
      </section>
    </div>
  );
}
