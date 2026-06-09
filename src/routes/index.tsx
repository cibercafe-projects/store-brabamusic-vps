import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { z } from "zod";
import heroBg from "@/assets/hero-bg.jpg";
import { BeatCard } from "@/components/BeatCard";
import { listPublicBeats, listPublicFilters } from "@/lib/catalog.functions";

const searchSchema = z.object({
  q: z.string().trim().max(160).optional(),
  genero: z.string().trim().max(60).optional(),
  produtora: z.string().trim().max(80).optional(),
  bpmMax: z.coerce.number().int().min(40).max(300).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
});

const beatsQuery = (p: {
  q?: string;
  genero?: string;
  produtora?: string;
  bpmMax?: number;
  page?: number;
}) =>
  queryOptions({
    queryKey: ["public-beats", p],
    queryFn: () =>
      listPublicBeats({
        data: {
          search: p.q || undefined,
          genero: p.genero || undefined,
          produtoraSlug: p.produtora || undefined,
          bpmMax: p.bpmMax,
          page: p.page ?? 1,
          pageSize: 24,
        },
      }),
  });

const filtersQuery = queryOptions({
  queryKey: ["public-filters"],
  queryFn: () => listPublicFilters({ data: undefined as never }),
});

export const Route = createFileRoute("/")({
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(beatsQuery(deps)),
      context.queryClient.ensureQueryData(filtersQuery),
    ]);
  },
  component: Index,
  errorComponent: ({ error }) => (
    <p className="p-8 text-center text-sm text-muted-foreground">{error.message}</p>
  ),
});

function Index() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [qLocal, setQLocal] = useState(search.q ?? "");

  const { data } = useSuspenseQuery(beatsQuery(search));
  const { data: filters } = useSuspenseQuery(filtersQuery);

  const onSearch = (q: string) => {
    setQLocal(q);
    navigate({ search: (prev) => ({ ...prev, q: q || undefined, page: 1 }) });
  };

  const generos = ["Todos", ...filters.generos];
  const activeGenero = search.genero ?? "Todos";
  const bpmMax = search.bpmMax ?? 180;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
          width={1920}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-accent">
            Selo BRABA Music · loja de beats
          </p>
          <h1 className="mt-4 font-display text-5xl md:text-7xl leading-none">
            <span className="text-gradient">ESCOLHE</span> O BEAT.
            <br />
            <span className="text-gradient">ESCREVE</span> A HISTÓRIA.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-muted-foreground">
            Catálogo oficial dos produtores da BRABA. Escute a prévia e conheça o time por trás de
            cada beat.
          </p>

          <div className="mt-8 max-w-xl mx-auto glass rounded-full flex items-center gap-2 px-4 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch(qLocal);
              }}
              onBlur={() => onSearch(qLocal)}
              placeholder="Buscar por nome, produtora ou gênero…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {generos.map((g) => (
              <button
                key={g}
                onClick={() =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      genero: g === "Todos" ? undefined : g,
                      page: 1,
                    }),
                  })
                }
                className={`rounded-full px-4 py-1.5 text-sm border transition ${
                  activeGenero === g
                    ? "bg-accent text-accent-foreground border-accent"
                    : "border-white/15 hover:border-accent/60"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <select
              value={search.produtora ?? ""}
              onChange={(e) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    produtora: e.target.value || undefined,
                    page: 1,
                  }),
                })
              }
              className="bg-transparent border border-white/15 rounded-full px-3 py-1.5 text-xs"
            >
              <option value="">Todas as produtoras</option>
              {filters.produtoras.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.nome_artistico}
                </option>
              ))}
            </select>
            <span>BPM até {bpmMax}</span>
            <input
              type="range"
              min={60}
              max={200}
              value={bpmMax}
              onChange={(e) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    bpmMax: Number(e.target.value),
                    page: 1,
                  }),
                })
              }
              className="accent-[var(--accent)]"
            />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        {data.rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            Nenhum beat com esses filtros. Tente ajustar a busca.
          </p>
        ) : (
          <>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.rows.map((b) => (
                <BeatCard key={b.id} beat={b} />
              ))}
            </div>
            <Pagination total={data.total} page={search.page ?? 1} pageSize={24} />
          </>
        )}
      </section>
    </div>
  );
}

function Pagination({
  total,
  page,
  pageSize,
}: {
  total: number;
  page: number;
  pageSize: number;
}) {
  const navigate = useNavigate({ from: "/" });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <button
        disabled={page <= 1}
        onClick={() =>
          navigate({ search: (prev) => ({ ...prev, page: Math.max(1, page - 1) }) })
        }
        className="rounded-full border border-white/15 px-4 py-1.5 text-sm disabled:opacity-40"
      >
        ← Anterior
      </button>
      <span className="text-xs text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() =>
          navigate({ search: (prev) => ({ ...prev, page: Math.min(totalPages, page + 1) }) })
        }
        className="rounded-full border border-white/15 px-4 py-1.5 text-sm disabled:opacity-40"
      >
        Próxima →
      </button>
    </div>
  );
}
