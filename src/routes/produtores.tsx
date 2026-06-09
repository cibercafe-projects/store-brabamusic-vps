import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Instagram } from "lucide-react";
import { listPublicProducers } from "@/lib/catalog.functions";

const producersQuery = queryOptions({
  queryKey: ["public-producers"],
  queryFn: () => listPublicProducers({ data: undefined as never }),
});

export const Route = createFileRoute("/produtores")({
  loader: ({ context }) => context.queryClient.ensureQueryData(producersQuery),
  component: Producers,
  errorComponent: ({ error }) => (
    <p className="p-8 text-center text-sm text-muted-foreground">{error.message}</p>
  ),
});

function Producers() {
  const { data: producers } = useSuspenseQuery(producersQuery);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-5xl text-gradient">Produtoras</h1>
      <p className="mt-2 text-muted-foreground">A linha de frente da BRABA Music.</p>

      {producers.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          Nenhuma produtora cadastrada ainda.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {producers.map((p) => (
            <Link
              key={p.slug}
              to="/produtora/$slug"
              params={{ slug: p.slug }}
              className="glass rounded-2xl p-6 hover:glow-magenta transition hover:-translate-y-1"
            >
              <div className="h-20 w-20 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent grid place-items-center font-display text-2xl text-accent-foreground">
                {p.foto_url ? (
                  <img
                    src={p.foto_url}
                    alt={p.nome_artistico}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span>
                    {p.nome_artistico
                      .split(" ")
                      .map((s) => s[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                )}
              </div>
              <h2 className="mt-4 font-display text-2xl">{p.nome_artistico}</h2>
              <p className="text-xs text-muted-foreground">
                {p.cidade ?? "—"} · {p.beats_count} {p.beats_count === 1 ? "beat" : "beats"}
              </p>
              {p.bio && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{p.bio}</p>
              )}
              {p.instagram && (
                <p className="mt-3 inline-flex items-center gap-1 text-xs text-accent">
                  <Instagram className="h-3 w-3" /> {p.instagram}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
