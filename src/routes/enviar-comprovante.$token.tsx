import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { getPurchaseByToken, getPurchaseSettings } from "@/lib/purchases.functions";
import { ReceiptUploader } from "@/components/purchase/ReceiptUploader";

export const Route = createFileRoute("/enviar-comprovante/$token")({
  component: SendReceiptPage,
});

function fmtPrice(v: number | string | null | undefined) {
  if (v == null) return "—";
  const num = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(num)) return "—";
  return `R$ ${num.toFixed(2).replace(".", ",")}`;
}

function SendReceiptPage() {
  const { token } = Route.useParams();
  const loadFn = useServerFn(getPurchaseByToken);
  const loadSettings = useServerFn(getPurchaseSettings);

  const query = useQuery({
    queryKey: ["purchase-by-token", token],
    queryFn: () => loadFn({ data: { token } }),
    retry: false,
  });

  const settings = useQuery({
    queryKey: ["purchase-settings"],
    queryFn: () => loadSettings(),
    staleTime: 60_000,
  });

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl">Link inválido</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Este link não é válido ou expirou. Confira no e-mail/WhatsApp que recebeu.
        </p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold">
          Voltar ao catálogo
        </Link>
      </div>
    );
  }

  const purchase = query.data;
  const beat = purchase.beat;
  const commercialWa = settings.data?.commercial_whatsapp ?? "+5511913401000";
  const waLink = `https://wa.me/${commercialWa.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Olá! Sou ${purchase.nome_cliente}.\nAcabei de enviar o comprovante do beat: ${beat?.nome ?? ""}.\nAguardo a validação e o envio dos arquivos.`,
  )}`;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl text-gradient">Envio do Comprovante</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Envie agora seu comprovante de pagamento para a equipe Braba.
      </p>

      <div className="mt-6 rounded-2xl glass p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Beat</p>
        <p className="font-display text-lg">{beat?.nome}</p>
        {beat?.produtora?.nome_artistico && (
          <p className="text-xs text-muted-foreground">
            prod. {beat.produtora.nome_artistico}
          </p>
        )}
        <p className="text-xl font-bold text-accent">{fmtPrice(purchase.valor)}</p>
        <div className="text-xs text-muted-foreground">
          Cliente: <span className="text-foreground">{purchase.nome_cliente}</span>
        </div>
      </div>

      {purchase.receipt_path ? (
        <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-accent" />
          <div className="text-sm">
            <p className="font-semibold">Comprovante já enviado!</p>
            <p className="text-xs text-muted-foreground">
              Você pode enviar novamente se precisar atualizar.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <ReceiptUploader
          token={token}
          onSuccess={() => query.refetch()}
        />
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
        Após avisar a administração, aguarde até <span className="font-semibold text-foreground">24h</span> para a revisão do comprovante, aprovação do pagamento e envio dos arquivos adquiridos.
      </div>

      <a
        href={waLink}
        target="_blank"
        rel="noreferrer"
        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 text-center"
      >
        <MessageCircle className="h-4 w-4" /> Avisar a Administração da Braba sobre o seu pagamento
      </a>
    </div>
  );
}

