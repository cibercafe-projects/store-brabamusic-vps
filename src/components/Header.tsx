import { Link } from "@tanstack/react-router";
import { ExternalLink, LogOut, User, Menu } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./AuthStore";
import { FEATURES } from "@/config/features";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export function Header() {
  const { user, logout, requireAuth } = useAuth();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Beats", exact: true },
    { to: "/produtores", label: "Produtoras" },
    { to: "/como-funciona", label: "Como funciona" },
  ];

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/10">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-5 md:px-6 py-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="font-display text-2xl text-gradient">BRABA</span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground hidden sm:inline">/ loja de beats</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {navLinks.map(({ to, label, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: !!exact }}
              className="hover:text-accent"
              activeProps={{ className: "text-accent" }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">

          {FEATURES.auth && (
            user ? (
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs">
                <User className="h-3 w-3 text-accent" />
                <span className="max-w-[120px] truncate">{user.name}</span>
                <button onClick={logout} aria-label="Sair" className="text-muted-foreground hover:text-destructive">
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => requireAuth(() => {})}
                className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs hover:border-accent"
              >
                <User className="h-3 w-3" /> Entrar
              </button>
            )
          )}

          <a href="https://brabamusic.com.br" target="_blank" rel="noreferrer" className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            site <ExternalLink className="h-3 w-3" />
          </a>

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden inline-flex items-center justify-center rounded-full border border-white/15 p-2" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 border-l border-white/10 bg-background/95 backdrop-blur-xl">
              <div className="mt-8 flex flex-col gap-4">
                {navLinks.map(({ to, label, exact }) => (
                  <SheetClose asChild key={to}>
                    <Link
                      to={to}
                      activeOptions={{ exact: !!exact }}
                      className="text-lg font-medium hover:text-accent transition-colors"
                      activeProps={{ className: "text-accent" }}
                      onClick={() => setOpen(false)}
                    >
                      {label}
                    </Link>
                  </SheetClose>
                ))}
                <hr className="border-white/10 my-2" />
                {FEATURES.auth && (
                  user ? (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-accent" />
                      <span>{user.name}</span>
                      <button onClick={() => { logout(); setOpen(false); }} className="ml-auto text-muted-foreground hover:text-destructive text-xs">
                        Sair
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { requireAuth(() => {}); setOpen(false); }}
                      className="inline-flex items-center gap-2 text-sm hover:text-accent"
                    >
                      <User className="h-4 w-4" /> Entrar
                    </button>
                  )
                )}
                <a href="https://brabamusic.com.br" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-2">
                  site <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
