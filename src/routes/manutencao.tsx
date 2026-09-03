import { createFileRoute } from "@tanstack/react-router";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";

export const Route = createFileRoute("/manutencao")({
  head: () => ({
    meta: [
      { title: "Manutenção programada — BRABA Beats" },
      {
        name: "description",
        content:
          "O BRABA Beats está em manutenção técnica programada. O catálogo de beats volta ao ar em breve.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Manutenção programada — BRABA Beats" },
      {
        property: "og:description",
        content:
          "O BRABA Beats está em manutenção técnica programada. O catálogo de beats volta ao ar em breve.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MaintenanceScreen,
});
