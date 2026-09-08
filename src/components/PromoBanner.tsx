import * as React from "react";
import { BadgePercent } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * Faixa animada exibida quando há promoção ativa em pelo menos um tipo de beat
 * cujo catálogo inclui o contexto atual (home → qualquer tipo; página do beat →
 * apenas o tipo daquele beat).
 *
 * Texto padrão: "Promoção por tempo limitado!". Se o cadastro da promoção
 * fornecer `promoDescricao`, ela é exibida com prioridade.
 */
export type PromoBannerItem = {
  promoDescricao: string | null;
  beatSlug?: string;
};

export function PromoBanner({ items }: { items: PromoBannerItem[] }) {
  const vigentes = items.filter((i) => !!i.promoDescricao);
  if (!vigentes.length) return null;

  const texto =
    vigentes.map((i) => i.promoDescricao ?? "").filter(Boolean).join(" · ") ||
    "Promoção por tempo limitado!";

  const href = vigentes[0]?.beatSlug
    ? `/beat/${vigentes[0].beatSlug}`
    : "/";

  return (
    <Link
      to={href}
      aria-label="Ver promoção"
      className="block w-full overflow-hidden bg-gradient-to-r from-green-700 via-emerald-600 to-green-700 text-white"
    >
      <div className="relative">
        <div className="flex items-center gap-2 px-4 py-2 whitespace-nowrap text-sm font-semibold animate-[marquee_22s_linear_infinite] hover:[animation-play-state:paused]">
          <BadgePercent className="h-4 w-4 shrink-0" />
          <span className="mx-6">{texto}</span>
          <BadgePercent className="h-4 w-4 shrink-0" />
          <span className="mx-6">{texto}</span>
          <BadgePercent className="h-4 w-4 shrink-0" />
          <span className="mx-6">{texto}</span>
          <BadgePercent className="h-4 w-4 shrink-0" />
          <span className="mx-6">{texto}</span>
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-promo-marquee] { animation: none !important; }
        }
      `}</style>
    </Link>
  );
}
