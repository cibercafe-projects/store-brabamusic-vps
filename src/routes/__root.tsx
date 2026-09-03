import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PlayerBar } from "@/components/PlayerBar";
import { Toaster } from "@/components/ui/sonner";
import { usePresence } from "@/hooks/usePresence";
import { FEATURES } from "@/config/features";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-gradient">404</h1>
        <p className="mt-4 text-muted-foreground">Esse beat não existe (ainda).</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold">Voltar ao catálogo</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl">Algo deu ruim</h1>
        <p className="mt-2 text-sm text-muted-foreground">Não foi possível carregar esta página agora. Tente novamente em instantes.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-full bg-primary px-4 py-2 text-sm font-semibold"
        >
          Tentar de novo
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "BRABA Beats — Loja de beats do selo BRABA Music" },
      { name: "description", content: "Catálogo de beats do selo BRABA Music. Trap, funk, drill, boom bap e mais. Escute, escolha sua licença e fale com o produtor." },
      { property: "og:title", content: "BRABA Beats — Loja de beats do selo BRABA Music" },
      { property: "og:description", content: "Catálogo de beats do selo BRABA Music. Trap, funk, drill, boom bap e mais. Escute, escolha sua licença e fale com o produtor." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "BRABA Beats — Loja de beats do selo BRABA Music" },
      { name: "twitter:description", content: "Catálogo de beats do selo BRABA Music. Trap, funk, drill, boom bap e mais. Escute, escolha sua licença e fale com o produtor." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/07435e01-cc15-410a-bc90-917055cb21f3" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/07435e01-cc15-410a-bc90-917055cb21f3" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Permanent+Marker&family=Rubik+Mono+One&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = pathname.startsWith("/admin");
  const maintenanceLocked =
    FEATURES.maintenance && !isAdmin && pathname !== "/manutencao";
  usePresence();

  if (maintenanceLocked) {
    return (
      <QueryClientProvider client={queryClient}>
        <MaintenanceScreen />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {isAdmin ? (
        <Outlet />
      ) : (
        <>
          <Header />
          <main>
            <Outlet />
          </main>
          <Footer />
          <PlayerBar />
        </>
      )}
      <Toaster />
    </QueryClientProvider>
  );
}
