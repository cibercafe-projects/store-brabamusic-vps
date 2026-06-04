import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { FEATURES } from "@/config/features";

export const Route = createFileRoute("/meus-interesses")({ component: Interests });

function Interests() {
  if (!FEATURES.interests) {
    return (
      <div className="mx-auto max-w-xl text-center px-4 py-24">
        <Lock className="mx-auto h-10 w-10 text-accent" />
        <h1 className="mt-6 font-display text-4xl text-gradient">Em breve</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A lista de interesses está temporariamente desativada. Por enquanto, fale direto com a equipe BRABA pelo WhatsApp na página do beat.
        </p>
        <Link to="/" className="mt-8 inline-flex rounded-full bg-accent text-accent-foreground px-6 py-3 font-semibold glow-magenta">
          Ver beats
        </Link>
      </div>
    );
  }

  // Implementação completa preservada para reativação futura via FEATURES.interests.
  return null;
}
