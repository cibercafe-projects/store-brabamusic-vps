import { createFileRoute } from "@tanstack/react-router";
import { BEATS } from "@/data/beats";
import { Play, Search, Home, Music, User, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/app")({ component: AppPreview });

function AppPreview() {
  const beats = BEATS.slice(0, 4);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-5xl text-gradient">No app BRABA</h1>
      <p className="mt-2 text-muted-foreground max-w-2xl">
        O mesmo catálogo aparece na nova aba <span className="text-accent">"Beats"</span> dentro do aplicativo da BRABA Music — via WebView nesta fase, e nativo na evolução.
      </p>

      <div className="mt-12 flex justify-center">
        {/* Phone frame */}
        <div className="relative w-[320px] h-[660px] rounded-[3rem] border-[10px] border-zinc-800 bg-background shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-zinc-800 rounded-b-2xl z-10" />
          <div className="h-full overflow-y-auto pt-8">
            {/* App header */}
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="font-display text-xl text-gradient">BRABA</span>
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            {/* Tabs */}
            <div className="px-4 flex gap-2 overflow-x-auto text-xs">
              {["Início", "Artistas", "Beats", "Eventos"].map((t) => (
                <span key={t} className={`shrink-0 rounded-full px-3 py-1 border ${t === "Beats" ? "bg-accent text-accent-foreground border-accent" : "border-white/10 text-muted-foreground"}`}>{t}</span>
              ))}
            </div>
            {/* Featured */}
            <div className="px-4 mt-4">
              <p className="text-[10px] uppercase tracking-widest text-accent">Destaque</p>
              <div className="mt-2 relative rounded-xl overflow-hidden">
                <img src={beats[0].cover} alt="" className="w-full aspect-[16/9] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent grid place-items-end p-3">
                  <div className="w-full flex justify-between items-end">
                    <div>
                      <p className="font-display text-sm">{beats[0].title}</p>
                      <p className="text-[10px] text-muted-foreground">prod. {beats[0].producer}</p>
                    </div>
                    <span className="grid place-items-center h-9 w-9 rounded-full bg-accent text-accent-foreground"><Play className="h-4 w-4 ml-0.5" /></span>
                  </div>
                </div>
              </div>
            </div>
            {/* Grid mini */}
            <div className="px-4 mt-5">
              <p className="text-[10px] uppercase tracking-widest text-accent">Catálogo</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {beats.slice(1).map((b) => (
                  <div key={b.slug} className="rounded-xl overflow-hidden glass">
                    <img src={b.cover} alt="" className="w-full aspect-square object-cover" />
                    <div className="p-2">
                      <p className="text-xs font-semibold truncate">{b.title}</p>
                      <p className="text-[10px] text-accent">R$ {b.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-20" />
            {/* Bottom nav */}
            <div className="absolute bottom-0 left-0 right-0 glass border-t border-white/10 px-6 py-2 flex justify-between text-[10px]">
              {[
                { i: Home, l: "Início" },
                { i: Music, l: "Beats", active: true },
                { i: ShoppingBag, l: "Loja" },
                { i: User, l: "Perfil" },
              ].map(({ i: Icon, l, active }) => (
                <div key={l} className={`flex flex-col items-center gap-0.5 ${active ? "text-accent" : "text-muted-foreground"}`}>
                  <Icon className="h-4 w-4" />
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Mockup ilustrativo · catálogo único compartilhado entre site (loja.brabamusic.com.br) e app via WebView.
      </p>
    </div>
  );
}
