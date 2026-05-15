import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Play, Pause, MessageCircle, Mail, Check } from "lucide-react";
import { BEATS, LICENSES, WHATSAPP_NUMBER, type Beat } from "@/data/beats";
import { usePlayer, useInterests } from "@/components/PlayerStore";
import { BeatCard } from "@/components/BeatCard";

export const Route = createFileRoute("/beat/$slug")({
  component: BeatDetail,
  loader: ({ params }): { beat: Beat } => {
    const beat = BEATS.find((b) => b.slug === params.slug);
    if (!beat) throw notFound();
    return { beat };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl text-center py-24 px-4">
      <h1 className="font-display text-4xl">Beat não encontrado</h1>
      <Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold">Voltar ao catálogo</Link>
    </div>
  ),
  errorComponent: ({ error }) => <p className="p-8 text-center">{error.message}</p>,
});

function BeatDetail() {
  const { beat } = Route.useLoaderData();
  const { current, playing, play } = usePlayer();
  const interests = useInterests();
  const isPlaying = current?.slug === beat.slug && playing;
  const [license, setLicense] = useState(LICENSES[1].name);
  const [showForm, setShowForm] = useState(false);

  const related = BEATS.filter((b) => b.slug !== beat.slug && b.genre === beat.genre).slice(0, 4);

  const wppMsg = encodeURIComponent(
    `Olá BRABA! Tenho interesse no beat *${beat.title}* (prod. ${beat.producer}) — licença *${license}*. Pode me passar o link de pagamento?`
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="relative rounded-3xl overflow-hidden glass">
            <img src={beat.cover} alt={beat.title} width={800} height={800} className="w-full aspect-square object-cover" />
            <button
              onClick={() => play(beat)}
              className="absolute inset-0 grid place-items-center bg-black/30 hover:bg-black/40 transition"
            >
              <span className="grid place-items-center h-20 w-20 rounded-full bg-accent text-accent-foreground glow-magenta">
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
              </span>
            </button>
          </div>
          {/* Waveform fake */}
          <div className="mt-4 glass rounded-2xl p-4 flex items-end gap-0.5 h-20">
            {Array.from({ length: 80 }).map((_, i) => (
              <span key={i} className="flex-1 rounded-sm bg-gradient-to-t from-primary to-accent" style={{ height: `${20 + Math.abs(Math.sin(i * 0.4)) * 80}%` }} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">{beat.genre}</p>
          <h1 className="mt-2 font-display text-5xl text-gradient">{beat.title}</h1>
          <Link to="/produtor/$slug" params={{ slug: beat.producerSlug }} className="mt-1 inline-block text-muted-foreground hover:text-foreground">
            prod. {beat.producer}
          </Link>

          <dl className="mt-6 grid grid-cols-4 gap-3 text-sm">
            {[
              ["BPM", beat.bpm],
              ["Tom", beat.key],
              ["Duração", beat.duration],
              ["Preço base", `R$ ${beat.price}`],
            ].map(([k, v]) => (
              <div key={k as string} className="glass rounded-xl p-3">
                <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</dt>
                <dd className="mt-1 font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            {beat.mood.map((m: string) => <span key={m} className="rounded-full border border-white/15 px-3 py-1 text-xs">#{m}</span>)}
          </div>

          {/* Licenças */}
          <h2 className="mt-10 font-display text-2xl">Licenças</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {LICENSES.map((l) => (
              <button
                key={l.name}
                onClick={() => setLicense(l.name)}
                className={`text-left rounded-2xl p-4 border transition ${
                  license === l.name ? "border-accent bg-accent/10" : "border-white/10 glass hover:border-white/30"
                } ${l.highlight ? "relative" : ""}`}
              >
                {l.highlight && <span className="absolute -top-2 right-3 rounded-full bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5">POPULAR</span>}
                <p className="font-display text-xl">{l.name}</p>
                <p className="mt-1 text-2xl font-bold text-accent">R$ {l.price}</p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {l.includes.map((it) => <li key={it} className="flex gap-2"><Check className="h-3 w-3 text-accent shrink-0 mt-0.5" />{it}</li>)}
                </ul>
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${wppMsg}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-5 py-3 font-semibold glow-magenta hover:opacity-90"
            >
              <MessageCircle className="h-5 w-5" /> Tenho interesse — WhatsApp
            </a>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold hover:bg-primary/80"
            >
              <Mail className="h-5 w-5" /> Pedir por formulário
            </button>
            <button
              onClick={() => interests.toggle(beat.slug)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 font-semibold hover:border-accent"
            >
              {interests.has(beat.slug) ? "Remover dos interesses" : "Salvar nos interesses"}
            </button>
          </div>
        </div>
      </div>

      {/* Relacionados */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-3xl">Beats parecidos</h2>
          <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((b) => <BeatCard key={b.slug} beat={b} />)}
          </div>
        </section>
      )}

      {showForm && <FormModal beatTitle={beat.title} license={license} onClose={() => setShowForm(false)} />}
    </div>
  );
}

function FormModal({ beatTitle, license, onClose }: { beatTitle: string; license: string; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass rounded-2xl p-6 border-white/20">
        {sent ? (
          <div className="text-center py-6">
            <div className="mx-auto h-12 w-12 rounded-full bg-accent grid place-items-center"><Check className="h-6 w-6 text-accent-foreground" /></div>
            <h3 className="mt-4 font-display text-2xl">Recebido!</h3>
            <p className="mt-2 text-sm text-muted-foreground">Nossa equipe vai te chamar em até 24h com o link de pagamento.</p>
            <button onClick={onClose} className="mt-6 rounded-full bg-primary px-4 py-2 text-sm font-semibold">Fechar</button>
          </div>
        ) : (
          <>
            <h3 className="font-display text-2xl">Pedido de interesse</h3>
            <p className="text-xs text-muted-foreground mt-1">Beat: {beatTitle} · Licença: {license}</p>
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="mt-4 space-y-3">
              <input required placeholder="Seu nome / nome artístico" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-accent" />
              <input required type="email" placeholder="Email" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-accent" />
              <input placeholder="@instagram (opcional)" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-accent" />
              <textarea rows={3} placeholder="Mensagem (opcional)" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-accent" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm hover:bg-white/10">Cancelar</button>
                <button type="submit" className="rounded-full bg-accent text-accent-foreground px-4 py-2 text-sm font-semibold">Enviar</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
