import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, MessageCircle, Mail, History, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  logResendInstructions,
  listResendInstructions,
  getPurchaseSettings,
} from "@/lib/purchases.functions";

type Props = {
  purchase: {
    id: string;
    nome_cliente: string;
    email: string | null;
    whatsapp: string | null;
    valor: number | string | null;
    continuation_token: string;
    forma_pagamento: string;
    beat: { nome?: string | null } | null;
  };
};

function fmtPrice(v: number | string | null | undefined) {
  if (v == null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

export function ResendInstructionsCard({ purchase }: Props) {
  const qc = useQueryClient();
  const logFn = useServerFn(logResendInstructions);
  const listFn = useServerFn(listResendInstructions);
  const settingsFn = useServerFn(getPurchaseSettings);

  const settings = useQuery({
    queryKey: ["purchase-settings"],
    queryFn: () => settingsFn(),
    staleTime: 60_000,
  });

  const history = useQuery({
    queryKey: ["admin", "resend-instructions", purchase.id],
    queryFn: () => listFn({ data: { id: purchase.id } }),
  });

  const noEmail = !purchase.email;
  const noWhats = !purchase.whatsapp;

  const [custom, setCustom] = useState("");

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://brababeats.app";
  const link = `${origin}/enviar-comprovante/${purchase.continuation_token}`;
  const pix = settings.data?.pix_key ?? "";
  const paymentLink = settings.data?.payment_link ?? "";
  const beatName = purchase.beat?.nome ?? "—";

  const baseMessage = [
    `Olá ${purchase.nome_cliente}! Aqui é a Braba Music.`,
    `Seu pedido do beat "${beatName}" está aguardando pagamento.`,
    "",
    `Valor: ${fmtPrice(purchase.valor)}`,
    purchase.forma_pagamento === "pix" && pix ? `PIX: ${pix}` : null,
    purchase.forma_pagamento === "link" && paymentLink
      ? `Link de pagamento: ${paymentLink}`
      : null,
    "",
    "Após pagar, envie o comprovante neste link:",
    link,
    "",
    "Qualquer dúvida, é só responder por aqui. 💜",
  ]
    .filter(Boolean)
    .join("\n");

  const message = custom.trim() ? custom : baseMessage;

  useEffect(() => {
    setCustom("");
  }, [purchase.id]);

  const logMutation = useMutation({
    mutationFn: (channel: "whatsapp" | "email") =>
      logFn({
        data: {
          id: purchase.id,
          canal_email: channel === "email",
          canal_whatsapp: channel === "whatsapp",
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "resend-instructions", purchase.id] });
    },
  });

  function handleWhatsapp() {
    if (!purchase.whatsapp) return;
    const wa = purchase.whatsapp.replace(/\D/g, "");
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    logMutation.mutate("whatsapp");
  }

  function handleEmail() {
    if (!purchase.email) return;
    const subject = encodeURIComponent("Braba Music - Instruções de Pagamento");
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${purchase.email}?subject=${subject}&body=${body}`;
    logMutation.mutate("email");
  }

  async function copyMsg() {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Mensagem copiada com sucesso.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <Card className="md:col-span-2 border-accent/30">
      <CardHeader>
        <CardTitle className="text-base inline-flex items-center gap-2">
          <Send className="h-4 w-4" /> Reenviar instruções de pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-xs text-muted-foreground">
          Use quando o cliente se perder no fluxo: a mensagem abaixo contém os dados da
          compra, valor, pagamento e o link para envio do comprovante. Edite se quiser —
          os botões usam exatamente a versão exibida.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="resend-msg">Mensagem (edite se quiser)</Label>
          <Textarea
            id="resend-msg"
            value={custom || baseMessage}
            onChange={(e) => setCustom(e.target.value)}
            rows={8}
            className="text-xs font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleWhatsapp}
            disabled={noWhats}
            className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" /> Reenviar por WhatsApp
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleEmail}
            disabled={noEmail}
          >
            <Mail className="h-4 w-4" /> Reenviar por E-mail
          </Button>
          <Button type="button" variant="outline" onClick={copyMsg}>
            <Copy className="h-4 w-4" /> Copiar Mensagem
          </Button>
        </div>

        {(noWhats || noEmail) && (
          <p className="text-xs text-muted-foreground">
            {noWhats && "Cliente não informou WhatsApp. "}
            {noEmail && "Cliente não informou e-mail."}
          </p>
        )}

        {history.data && history.data.length > 0 && (
          <div className="space-y-1.5">
            <Label className="inline-flex items-center gap-1">
              <History className="h-3.5 w-3.5" /> Reenvios anteriores
            </Label>
            <div className="space-y-1 text-xs rounded-md border p-2 max-h-32 overflow-auto">
              {history.data.map((d) => (
                <div key={d.id} className="flex justify-between gap-2">
                  <span>
                    {new Date(d.enviado_em).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className="text-muted-foreground">
                    {[d.enviado_whatsapp && "whats", d.enviado_email && "email"]
                      .filter(Boolean)
                      .join(" + ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
