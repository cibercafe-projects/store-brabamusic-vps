import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Instagram, Music2 } from "lucide-react";
import { getPublicProducerBySlug } from "@/lib/catalog.functions";
import { BeatCard } from "@/components/BeatCard";

const producerQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public-producer", slug],
    queryFn: () => getPublicProducerBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/produtora/$slug")({
  loader: async ({ params, context }) => {
    const r = await context.queryClient.ensureQueryData(producerQuery(params.slug));
    if (!r) throw notFound();
  },
  component: ProducerPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl text-center py-24 px-4">
      <h1 className="font-display text-4xl">Produtora não encontrada</h1>
      <Link
        to="/produtores"
        className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold"
      >
        Ver todas
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => <p className="p-8 text-center">{error.message}</p>,
});

function ProducerPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(producerQuery(slug));
  if (!data) return null;
  const { produtora, beats } = data;
  const generos = Array.from(new Set(beats.map((b) => b.genero).filter(Boolean) as string[]));

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-background to-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 flex flex-col md:flex-row items-start gap-8">
          <div className="h-32 w-32 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent grid place-items-center font-display text-5xl text-accent-foreground glow-magenta shrink-0">
            {produtora.foto_url ? (
              <img
                src={produtora.foto_url}
                alt={produtora.nome_artistico}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span>
                {produtora.nome_artistico
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)}
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-accent">Produtora BRABA</p>
            <h1 className="mt-2 font-display text-5xl">{produtora.nome_artistico}</h1>
            {produtora.bio && (
              <p className="mt-2 text-muted-foreground max-w-2xl">{produtora.bio}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {produtora.cidade && (
                <span className="glass rounded-full px-3 py-1">{produtora.cidade}</span>
              )}
              <span className="glass rounded-full px-3 py-1">
                {beats.length} {beats.length === 1 ? "beat" : "beats"}
              </span>
              {generos.map((g) => (
                <span key={g} className="glass rounded-full px-3 py-1">
                  {g}
                </span>
              ))}
              {produtora.instagram && (
                <a
                  href={`https://instagram.com/${produtora.instagram.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-accent text-accent-foreground px-3 py-1 font-semibold"
                >
                  <Instagram className="h-3 w-3" /> {produtora.instagram}
                </a>
              )}
              {produtora.spotify && (
                <a
                  href={`https://open.spotify.com/${produtora.spotify.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1"
                >
                  <Music2 className="h-3 w-3" /> Spotify
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <h2 className="font-display text-3xl">Beats de {produtora.nome_artistico}</h2>
        {beats.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">
            Esta produtora ainda não tem beats ativos no catálogo.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {beats.map((b) => (
              <BeatCard key={b.id} beat={b} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
