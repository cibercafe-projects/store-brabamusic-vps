import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Trash2, Lock } from "lucide-react";
import { BEATS, WHATSAPP_NUMBER } from "@/data/beats";
import { useInterests } from "@/components/PlayerStore";
import { useAuth } from "@/components/AuthStore";
import { BeatCard } from "@/components/BeatCard";

export const Route = createFileRoute("/meus-interesses")({ component: Interests });

function Interests() {
  const { items, clear } = useInterests();
  const { user, requireAuth } = useAuth();
  const beats = BEATS.filter((b) => items.includes(b.slug));

  if (!user) {
    return (
      <div className="mx-auto max-w-xl text-center px-4 py-24">
        <Lock className="mx-auto h-10 w-10 text-accent" />
        <h1 className="mt-6 font-display text-4xl text-gradient">Faz login pra ver seus interesses</h1>
        <p className="mt-3 text-sm text-muted-foreground">É só nome e e-mail. Sem senha. A gente usa pra te enviar o link de pagamento e o beat depois.</p>
        <button
          onClick={() => requireAuth(() => {})}
          className="mt-8 inline-flex rounded-full bg-accent text-accent-foreground px-6 py-3 font-semibold glow-magenta"
        >
          Entrar
        </button>
      </div>
    );
  }

  const wppMsg = encodeURIComponent(
    `Olá BRABA! Aqui é ${user.name} (${user.email}). Tenho interesse nesses beats:\n\n${beats.map((b) => `• ${b.title} (prod. ${b.producer}) — R$ ${b.price}`).join("\n")}\n\nPodem me enviar os links de pagamento?`
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-5xl text-gradient">Meus interesses</h1>
      <p className="mt-2 text-muted-foreground">Beats que você marcou. Mande tudo de uma vez para a equipe BRABA.</p>

      {beats.length === 0 ? (
        <div className="mt-16 text-center glass rounded-2xl py-16">
          <p className="text-muted-foreground">Sua lista tá vazia. Volta no catálogo e pega uns beats.</p>
          <Link to="/" className="mt-6 inline-flex rounded-full bg-accent text-accent-foreground px-5 py-2.5 font-semibold">Ver beats</Link>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${wppMsg}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-5 py-3 font-semibold glow-magenta"
            >
              <MessageCircle className="h-5 w-5" /> Enviar tudo via WhatsApp
            </a>
            <button onClick={clear} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 hover:border-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" /> Limpar lista
            </button>
            <span className="ml-auto self-center text-sm text-muted-foreground">
              Total estimado: <span className="text-accent font-bold">R$ {beats.reduce((s, b) => s + b.price, 0)}</span>
            </span>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {beats.map((b) => <BeatCard key={b.slug} beat={b} />)}
          </div>
        </>
      )}
    </div>
  );
}
