import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Cancelar inscrição — BRABA Beats" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type State =
  | { kind: "loading" }
  | { kind: "valid"; email: string }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "success" }
  | { kind: "error"; message: string };

function UnsubscribePage() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          setState({ kind: "invalid" });
          return;
        }
        if (json.used_at) {
          setState({ kind: "already" });
        } else if (json.email) {
          setState({ kind: "valid", email: json.email });
        } else {
          setState({ kind: "invalid" });
        }
      })
      .catch(() => setState({ kind: "error", message: "Erro de conexão." }));
  }, []);

  async function confirm() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;
    setSubmitting(true);
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (r.ok) setState({ kind: "success" });
      else setState({ kind: "error", message: "Não foi possível processar." });
    } catch {
      setState({ kind: "error", message: "Erro de conexão." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-4 rounded-2xl border border-border bg-card/60 p-8">
        <h1 className="font-display text-3xl text-gradient">BRABA Beats</h1>

        {state.kind === "loading" && (
          <p className="text-sm text-muted-foreground">Verificando link…</p>
        )}

        {state.kind === "invalid" && (
          <>
            <h2 className="text-xl font-semibold">Link inválido</h2>
            <p className="text-sm text-muted-foreground">
              Este link de cancelamento não é válido ou já expirou.
            </p>
          </>
        )}

        {state.kind === "already" && (
          <>
            <h2 className="text-xl font-semibold">Você já cancelou</h2>
            <p className="text-sm text-muted-foreground">
              Esse e-mail já está removido da nossa lista de envios.
            </p>
          </>
        )}

        {state.kind === "valid" && (
          <>
            <h2 className="text-xl font-semibold">Cancelar e-mails?</h2>
            <p className="text-sm text-muted-foreground">
              Vamos parar de enviar e-mails para <strong>{state.email}</strong>.
            </p>
            <button
              onClick={confirm}
              disabled={submitting}
              className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {submitting ? "Processando…" : "Confirmar cancelamento"}
            </button>
          </>
        )}

        {state.kind === "success" && (
          <>
            <h2 className="text-xl font-semibold">Pronto ✅</h2>
            <p className="text-sm text-muted-foreground">
              Você não receberá mais e-mails da BRABA Beats.
            </p>
          </>
        )}

        {state.kind === "error" && (
          <>
            <h2 className="text-xl font-semibold">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground">{state.message}</p>
          </>
        )}
      </div>
    </div>
  );
}
