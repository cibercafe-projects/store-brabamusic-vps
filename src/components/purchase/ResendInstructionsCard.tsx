import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Send, MessageCircle, Mail, History, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

  const [email, setEmail] = useState(!noEmail);
  const [whatsapp, setWhatsapp] = useState(!noWhats);
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

  const mutation = useMutation({
    mutationFn: () =>
      logFn({
        data: { id: purchase.id, canal_email: email, canal_whatsapp: whatsapp },
      }),
    onSuccess: () => {
      if (whatsapp && purchase.whatsapp) {
        const wa = purchase.whatsapp.replace(/\D/g, "");
        const url = `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }
      if (email && purchase.email) {
        const subject = `Braba Music — pedido do beat ${beatName}`;
        const mailto = `mailto:${purchase.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        window.location.href = mailto;
      }
      toast.success("Reenvio registrado.");
      qc.invalidateQueries({ queryKey: ["admin", "resend-instructions", purchase.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao registrar."),
  });

  async function copyMsg() {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Mensagem copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  const noChannel = !email && !whatsapp;

  return (
    <Card className="md:col-span-2 border-accent/30">
      <CardHeader>
        <CardTitle className="text-base inline-flex items-center gap-2">
          <Send className="h-4 w-4" /> Reenviar instruções de pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-xs text-muted-foreground">
          Use quando o cliente se perder no fluxo: reenvia a chave de pagamento e o link de
          envio de comprovante para o contato cadastrado.
        </p>

        <div className="space-y-2">
          <Label>Canais</Label>
          <div className="space-y-2 rounded-md border p-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={whatsapp}
                onCheckedChange={(v) => setWhatsapp(!!v)}
                disabled={noWhats}
                className="mt-0.5"
              />
              <span className="flex-1">
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </span>
                <span className="block text-xs text-muted-foreground">
                  {noWhats
                    ? "Cliente não informou WhatsApp."
                    : `Abrirá ${purchase.whatsapp} com a mensagem pronta.`}
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={email}
                onCheckedChange={(v) => setEmail(!!v)}
                disabled={noEmail}
                className="mt-0.5"
              />
              <span className="flex-1">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> E-mail
                </span>
                <span className="block text-xs text-muted-foreground">
                  {noEmail
                    ? "Cliente não informou e-mail."
                    : `Abrirá o cliente de e-mail com destino ${purchase.email}.`}
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="resend-msg">Mensagem (edite se quiser)</Label>
          <Textarea
            id="resend-msg"
            value={custom || baseMessage}
            onChange={(e) => setCustom(e.target.value)}
            rows={8}
            className="text-xs font-mono"
          />
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={copyMsg}>
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
          </div>
        </div>

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

        <div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || noChannel}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" /> Reenviar instruções
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
