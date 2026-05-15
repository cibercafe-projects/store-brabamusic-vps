import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { PRODUCERS, BEATS, type Producer, type Beat } from "@/data/beats";
import { BeatCard } from "@/components/BeatCard";

export const Route = createFileRoute("/produtor/$slug")({
  component: ProducerPage,
  loader: ({ params }): { producer: Producer; beats: Beat[] } => {
    const producer = PRODUCERS.find((p) => p.slug === params.slug);
    if (!producer) throw notFound();
    const beats = BEATS.filter((b) => b.producerSlug === producer.slug);
    return { producer, beats };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl text-center py-24 px-4">
      <h1 className="font-display text-4xl">Produtor não encontrado</h1>
      <Link to="/produtores" className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold">Ver todos</Link>
    </div>
  ),
  errorComponent: ({ error }) => <p className="p-8 text-center">{error.message}</p>,
});

function ProducerPage() {
  const { producer, beats } = Route.useLoaderData() as { producer: Producer; beats: Beat[] };
  const genres: string[] = Array.from(new Set(beats.map((b: Beat) => b.genre)));

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-background to-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 flex flex-col md:flex-row items-start gap-8">
          <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center font-display text-5xl text-accent-foreground glow-magenta shrink-0">
            {producer.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-accent">Produtor BRABA</p>
            <h1 className="mt-2 font-display text-5xl">{producer.name}</h1>
            <p className="mt-2 text-muted-foreground max-w-2xl">{producer.bio}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="glass rounded-full px-3 py-1">{producer.city}</span>
              <span className="glass rounded-full px-3 py-1">{beats.length} beats</span>
              {genres.map((g) => <span key={g} className="glass rounded-full px-3 py-1">{g}</span>)}
              {producer.socials.instagram && (
                <a href={`https://instagram.com/${producer.socials.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-accent text-accent-foreground px-3 py-1 font-semibold">
                  <Instagram className="h-3 w-3" /> {producer.socials.instagram}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="font-display text-3xl">Beats de {producer.name}</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {beats.map((b) => <BeatCard key={b.slug} beat={b} />)}
        </div>
      </section>
    </div>
  );
}
