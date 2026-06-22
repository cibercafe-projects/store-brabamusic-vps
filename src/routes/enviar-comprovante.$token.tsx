import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  getPurchaseByToken,
  getPurchaseSettings,
  getReceiptSignedUrlByToken,
} from "@/lib/purchases.functions";
import { ReceiptUploader } from "@/components/purchase/ReceiptUploader";
import { Button } from "@/components/ui/button";
import { waLink } from "@/lib/whatsapp";

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
  const settingsFn = useServerFn(getPurchaseSettings);
  const receiptUrlFn = useServerFn(getReceiptSignedUrlByToken);
  const [notifying, setNotifying] = useState(false);

  const query = useQuery({
    queryKey: ["purchase-by-token", token],
    queryFn: () => loadFn({ data: { token } }),
    retry: false,
  });

  const settingsQuery = useQuery({
    queryKey: ["purchase-settings"],
    queryFn: () => settingsFn(),
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
  const hasReceipt = !!purchase.receipt_path;
  const commercialWa = settingsQuery.data?.commercial_whatsapp ?? "";

  async function notifyWhatsApp() {
    if (!commercialWa) {
      toast.error("WhatsApp da equipe não configurado.");
      return;
    }
    setNotifying(true);
    try {
      const { url } = await receiptUrlFn({ data: { token } });
      const lines = [
        "🎵 *Comprovante enviado — Braba Music*",
        "",
        `*Cliente:* ${purchase.nome_cliente}`,
        `*Beat:* ${beat?.nome ?? "—"}`,
        beat?.produtora?.nome_artistico ? `*Produtora:* ${beat.produtora.nome_artistico}` : null,
        `*Valor:* ${fmtPrice(purchase.valor)}`,
        `*Forma de pagamento:* ${purchase.forma_pagamento ?? "—"}`,
        "",
        "✅ Acabei de enviar o comprovante de pagamento pelo site.",
        "Por favor, confirmem o recebimento e me enviem os arquivos do beat.",
        "",
        `📎 *Comprovante:* ${url}`,
      ].filter(Boolean) as string[];
      const link = waLink(commercialWa, lines.join("\n"));
      if (!link) {
        toast.error("Número de WhatsApp inválido.");
        return;
      }
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar link.");
    } finally {
      setNotifying(false);
    }
  }

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

      {hasReceipt ? (
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

      {hasReceipt && (
        <div className="mt-6 rounded-2xl border-2 border-[#25D366]/40 bg-[#25D366]/10 p-4 space-y-3">
          <div>
            <p className="font-display text-lg">Agilize sua entrega! 🚀</p>
            <p className="text-xs text-muted-foreground mt-1">
              Avise a equipe Braba pelo WhatsApp para revisarmos seu pagamento e
              enviarmos os arquivos o mais rápido possível.
            </p>
          </div>
          <Button
            type="button"
            onClick={notifyWhatsApp}
            disabled={notifying || !commercialWa}
            className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-black font-semibold"
          >
            {notifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Preparando...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" /> Notificar Braba no WhatsApp
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Vamos abrir o WhatsApp com a mensagem pronta, incluindo o link do
            seu comprovante e o resumo da compra.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground">
        Após enviar o comprovante, aguarde até{" "}
        <span className="font-semibold text-foreground">24h</span> para a revisão,
        aprovação do pagamento e envio dos arquivos adquiridos. Você receberá
        tudo por e-mail e WhatsApp.
      </div>
    </div>
  );
}
