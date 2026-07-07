import { Link } from "@tanstack/react-router";
import { Instagram, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Placeholders configuráveis — virão do backoffice na Sprint 1
const CONTACT = {
  instagram: "https://www.instagram.com/braba.music/",
  whatsapp: "https://wa.me/5511913401000",
  email: "contato@brabamusic.com.br",
};

const linkClass =
  "text-sm text-muted-foreground transition-colors hover:text-primary hover:[text-shadow:0_0_8px_var(--magenta)]";

export function Footer() {
  return (
    <footer className="mt-24">
      {/* CTA acima do rodapé */}
      <section className="px-4">
        <div className="mx-auto max-w-7xl">
          <div className="glass glow-magenta rounded-2xl border-t border-primary/30 px-6 py-16 text-center">
            <h2 className="font-display text-3xl text-gradient md:text-5xl">
              🎵 Procurando o beat ideal?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
              Explore o catálogo da Braba Music e conecte-se com produtoras independentes.
            </p>
            <Button asChild size="lg" className="mt-8 rounded-full">
              <Link to="/">Explorar Beats</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <div className="mt-16 border-t border-primary/20 bg-gradient-to-b from-transparent to-background/80 px-4 pb-8 pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
            {/* Coluna 1 — BRABA MUSIC */}
            <div>
              <h3 className="font-display text-2xl text-gradient">BRABA MUSIC</h3>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Loja de Beats produzidos por mulheres para artistas que buscam identidade,
                autenticidade e profissionalismo.
              </p>
            </div>

            {/* Coluna 2 — Navegação */}
            <div>
              <h4 className="font-display text-lg text-foreground">Navegação</h4>
              <ul className="mt-4 space-y-2">
                <li><Link to="/" className={linkClass}>Beats</Link></li>
                <li><Link to="/produtores" className={linkClass}>Produtoras</Link></li>
                <li><Link to="/como-funciona" className={linkClass}>Como Funciona</Link></li>
              </ul>
            </div>

            {/* Coluna 3 — Contato */}
            <div>
              <h4 className="font-display text-lg text-foreground">Contato</h4>
              <ul className="mt-4 space-y-3">
                <li><a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-2`}><Instagram className="size-4" /> Instagram Braba Music</a></li>
                
                <li><Link to="/feedback" className={linkClass}>Ajuda e Feedback</Link></li>
                <li><Link to="/feedback" search={{ type: "problema" }} className={linkClass}>Reportar problema</Link></li>
                <li><Link to="/feedback" search={{ type: "suporte" }} className={linkClass}>Suporte</Link></li>
              </ul>
            </div>

            {/* Coluna 4 — Plataforma */}
            <div>
              <h4 className="font-display text-lg text-foreground">Plataforma</h4>
              <ul className="mt-4 space-y-2">
                <li><Link to="/politica-privacidade" className={linkClass}>Política de Privacidade</Link></li>
                <li><Link to="/termos-uso" className={linkClass}>Termos de Uso</Link></li>
                <li>
                  <a
                    href={CONTACT.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    Suporte
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Barra inferior */}
          <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-muted-foreground md:flex-row">
            <p>
              <Link
                to="/admin/login"
                aria-label="Acesso administrativo"
                title="Acesso administrativo"
                className="cursor-default select-none opacity-60 hover:opacity-100"
              >
                ©
              </Link>{" "}
              2026 Braba Music. Todos os direitos reservados.
            </p>
            <p>Desenvolvido por Cibercafé Studio.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
