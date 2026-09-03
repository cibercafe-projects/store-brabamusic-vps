import { Wrench, ShieldCheck, Clock } from "lucide-react";

/**
 * Tela de manutenção exibida ao público durante janelas de migração.
 * Não faz nenhuma chamada ao banco — é 100% estática e segura.
 */
export function MaintenanceScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Wrench className="h-8 w-8" aria-hidden="true" />
        </div>

        <h1 className="mt-6 font-display text-3xl text-gradient">
          Estamos em manutenção
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          O <strong>BRABA Beats</strong> está passando por uma atualização
          técnica programada para deixar a plataforma mais rápida e segura.
          O catálogo volta ao ar em breve.
        </p>

        <div className="mt-8 space-y-3 text-left">
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Seus dados e compras estão preservados. Nenhuma informação foi perdida.
            </p>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Negociações em andamento continuam normalmente pelo WhatsApp com a
              equipe BRABA Music.
            </p>
          </div>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Obrigado pela paciência — voltamos já, já. 🎧
        </p>
      </div>
    </div>
  );
}
