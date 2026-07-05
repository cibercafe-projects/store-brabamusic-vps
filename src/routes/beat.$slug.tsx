import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Play, Pause, Instagram, Music2, Share2, Check, ArrowLeft, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getPublicBeatBySlug } from "@/lib/catalog.functions";
import { usePlayer } from "@/components/PlayerStore";
import { BeatCoverFallback } from "@/components/admin/beats/BeatCoverFallback";
import { PurchaseDialog } from "@/components/purchase/PurchaseDialog";


const beatQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public-beat", slug],
    queryFn: async () => {
      const r = await getPublicBeatBySlug({ data: { slug } });
      return r;
    },
  });

export const Route = createFileRoute("/beat/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(beatQuery(params.slug));
    if (!data) throw notFound();
  },
  component: BeatDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl text-center py-24 px-4">
      <h1 className="font-display text-4xl">Beat não encontrado</h1>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold"
      >
        Voltar ao catálogo
      </Link>
    </div>
  ),
  errorComponent: () => <p className="p-8 text-center">Não foi possível carregar este beat agora. Tente novamente em instantes.</p>,
});

function BeatDetail() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(beatQuery(slug));
  if (!data) return null;
  const { beat, produtora } = data;

  const { current, playing, play } = usePlayer();
  const isPlaying = current?.id === beat.id && playing;
  const hasPreview = !!beat.preview_url;
  const [copied, setCopied] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);



  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: `${beat.nome} — Braba Beats`,
      text: produtora
        ? `Ouça "${beat.nome}" prod. ${produtora.nome_artistico} na Braba Beats`
        : `Ouça "${beat.nome}" na Braba Beats`,
      url,
    };
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const router = useRouter();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10 hover:border-accent transition"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <Link
          to="/"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Ir ao catálogo
        </Link>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="relative rounded-3xl overflow-hidden glass aspect-square">
            {beat.capa_url ? (
              <img
                src={beat.capa_url}
                alt={beat.nome}
                width={800}
                height={800}
                className="w-full h-full object-cover"
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
                className="absolute inset-0 grid place-items-center bg-black/30 hover:bg-black/40 transition"
                aria-label={isPlaying ? "Pausar prévia" : "Tocar prévia"}
              >
                <span className="grid place-items-center h-20 w-20 rounded-full bg-accent text-accent-foreground glow-magenta">
                  {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
                </span>
              </button>
            )}
          </div>
          {!hasPreview && (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              Sem prévia disponível.
            </p>
          )}
        </div>

        <div>
          {beat.genero && (
            <p className="text-xs uppercase tracking-[0.3em] text-accent">{beat.genero}</p>
          )}
          <h1 className="mt-2 font-display text-5xl text-gradient">{beat.nome}</h1>
          {produtora && (
            <Link
              to="/produtora/$slug"
              params={{ slug: produtora.slug }}
              className="mt-1 inline-block text-muted-foreground hover:text-foreground"
            >
              prod. {produtora.nome_artistico}
            </Link>
          )}

          <div className="mt-3 flex w-fit items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
            {beat.tipo_nome} · {beat.inclui_stems ? "WAV + Stems" : "WAV"}
          </div>

          <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              ["BPM", beat.bpm ?? "—"],
              ["Tom", beat.tom ?? "—"],
              ["Mood", beat.mood ?? "—"],
              [
                "Preço",
                beat.preco != null ? `R$ ${beat.preco.toFixed(2).replace(".", ",")}` : "—",
              ],
            ].map(([k, v]) => (
              <div key={k as string} className="glass rounded-xl p-3">
                <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {k}
                </dt>
                <dd className="mt-1 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setPurchaseOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground glow-magenta px-6 py-3 text-sm font-bold hover:opacity-90 transition"
            >
              <ShoppingCart className="h-4 w-4" /> COMPRAR
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10 hover:border-accent transition"
              aria-label="Compartilhar beat"
            >
              {copied ? <Check className="h-4 w-4 text-accent" /> : <Share2 className="h-4 w-4" />}
              {copied ? "Link copiado" : "Compartilhar"}
            </button>
          </div>

          <PurchaseDialog
            open={purchaseOpen}
            onOpenChange={setPurchaseOpen}
            beatId={beat.id}
            beatName={beat.nome}
            produtora={produtora?.nome_artistico ?? null}
            preco={beat.preco}
          />



          {beat.descricao && (
            <div className="mt-8">
              <h2 className="font-display text-2xl">Sobre o beat</h2>
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-line">
                {beat.descricao}
              </p>
            </div>
          )}

          {produtora && (
            <div className="mt-10 glass rounded-2xl p-5 flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent grid place-items-center font-display text-xl text-accent-foreground shrink-0">
                {produtora.foto_url ? (
                  <img
                    src={produtora.foto_url}
                    alt={produtora.nome_artistico}
                    className="h-full w-full object-cover"
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
              <div className="min-w-0 flex-1">
                <Link
                  to="/produtora/$slug"
                  params={{ slug: produtora.slug }}
                  className="font-display text-xl hover:text-accent"
                >
                  {produtora.nome_artistico}
                </Link>
                <p className="text-xs text-muted-foreground truncate">{produtora.cidade ?? ""}</p>
                <div className="mt-2 flex gap-3 text-xs">
                  {produtora.instagram && (
                    <a
                      href={`https://instagram.com/${produtora.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-accent"
                    >
                      <Instagram className="h-3 w-3" /> {produtora.instagram}
                    </a>
                  )}
                  {produtora.spotify && (
                    <a
                      href={`https://open.spotify.com/${produtora.spotify.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-accent"
                    >
                      <Music2 className="h-3 w-3" /> Spotify
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
