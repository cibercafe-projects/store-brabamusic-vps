import { createFileRoute, Link } from "@tanstack/react-router";
import { PRODUCERS, BEATS } from "@/data/beats";
import { Instagram } from "lucide-react";

export const Route = createFileRoute("/produtores")({ component: Producers });

function Producers() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-display text-5xl text-gradient">Produtores</h1>
      <p className="mt-2 text-muted-foreground">A linha de frente da BRABA Music.</p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCERS.map((p) => {
          const count = BEATS.filter((b) => b.producerSlug === p.slug).length;
          return (
            <Link key={p.slug} to="/produtor/$slug" params={{ slug: p.slug }} className="glass rounded-2xl p-6 hover:glow-magenta transition hover:-translate-y-1">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center font-display text-2xl text-accent-foreground">
                {p.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
              </div>
              <h2 className="mt-4 font-display text-2xl">{p.name}</h2>
              <p className="text-xs text-muted-foreground">{p.city} · {count} beats</p>
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{p.bio}</p>
              {p.socials.instagram && (
                <p className="mt-3 inline-flex items-center gap-1 text-xs text-accent">
                  <Instagram className="h-3 w-3" /> {p.socials.instagram}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
