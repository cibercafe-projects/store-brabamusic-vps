import { Link } from "@tanstack/react-router";
import { ShoppingBag, ExternalLink, LogOut, User } from "lucide-react";
import { useInterests } from "./PlayerStore";
import { useAuth } from "./AuthStore";

export function Header() {
  const count = useInterests((s) => s.items.length);
  const { user, logout, requireAuth } = useAuth();
  return (
    <header className="sticky top-0 z-40 glass border-b border-white/10">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl text-gradient">BRABA</span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">/ loja de beats</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link to="/" activeOptions={{ exact: true }} className="hover:text-accent" activeProps={{ className: "text-accent" }}>Beats</Link>
          <Link to="/produtores" className="hover:text-accent" activeProps={{ className: "text-accent" }}>Produtores</Link>
          <Link to="/como-funciona" className="hover:text-accent" activeProps={{ className: "text-accent" }}>Como funciona</Link>
          <Link to="/app" className="hover:text-accent" activeProps={{ className: "text-accent" }}>No app</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/meus-interesses" className="relative inline-flex items-center gap-2 rounded-full bg-primary/20 hover:bg-primary/30 px-3 py-2 text-sm border border-primary/40">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Interesses</span>
            {count > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs font-bold grid place-items-center">{count}</span>
            )}
          </Link>
          {user ? (
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
          )}
          <a href="https://brabamusic.com.br" target="_blank" rel="noreferrer" className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            site <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </header>
  );
}
