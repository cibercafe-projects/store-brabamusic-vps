import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Send, MessageCircle, Mail, History } from "lucide-react";
import {
  deliverPurchase,
  listDeliveries,
  DELIVERY_FILE_LABELS,
} from "@/lib/deliveries.functions";

type Kind = "wav" | "stems" | "license";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: {
    id: string;
    nome_cliente: string;
    email: string | null;
    whatsapp: string | null;
    beat: {
      nome: string;
      wav_path: string | null;
      stems_path: string | null;
      license_path: string | null;
    } | null;
  };
};

export function DeliveryDialog({ open, onOpenChange, purchase }: Props) {
  const qc = useQueryClient();
  const deliverFn = useServerFn(deliverPurchase);
  const listFn = useServerFn(listDeliveries);

  const beat = purchase.beat;
  const available: Kind[] = beat
    ? (["wav", "stems", "license"] as const).filter(
        (k) => !!beat[`${k}_path` as const],
      )
    : [];

  const [selected, setSelected] = useState<Set<Kind>>(new Set(available));
  const [email, setEmail] = useState(!!purchase.email);
  const [whatsapp, setWhatsapp] = useState(!!purchase.whatsapp);
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (open) {
      setSelected(new Set(available));
      setEmail(!!purchase.email);
      setWhatsapp(!!purchase.whatsapp);
      setObs("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const history = useQuery({
    queryKey: ["admin", "deliveries", purchase.id],
    queryFn: () => listFn({ data: { purchase_id: purchase.id } }),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      deliverFn({
        data: {
          purchase_id: purchase.id,
          arquivos: Array.from(selected),
          canal_email: email,
          canal_whatsapp: whatsapp,
          observacao: obs || null,
        },
      }),
    onSuccess: (res) => {
      toast.success("Entrega registrada.");
      if (res.whatsapp_url) {
        window.open(res.whatsapp_url, "_blank", "noopener,noreferrer");
      }
      if (res.email_pending) {
        toast.warning("E-mail não pôde ser enviado (cliente sem e-mail ou suprimido).");
      } else if (email) {
        toast.success("E-mail enviado.");
      }
      qc.invalidateQueries({ queryKey: ["admin", "purchase", purchase.id] });
      qc.invalidateQueries({ queryKey: ["admin", "purchases"] });
      qc.invalidateQueries({ queryKey: ["admin", "purchase-counts"] });
      qc.invalidateQueries({ queryKey: ["admin", "deliveries", purchase.id] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao entregar."),
  });

  function toggle(k: Kind) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  const noFiles = available.length === 0;
  const noChannel = !email && !whatsapp;
  const noEmail = !purchase.email;
  const noWhats = !purchase.whatsapp;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Entregar arquivos</DialogTitle>
          <DialogDescription>
            {purchase.nome_cliente} — {beat?.nome ?? "Beat"}
          </DialogDescription>
        </DialogHeader>

        {noFiles ? (
          <Alert variant="destructive">
            <AlertDescription>
              Este beat ainda não possui arquivos privados cadastrados (WAV, STEMS ou Licença).
              Cadastre-os em /admin/beats antes de entregar.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4 text-sm">
            <section className="space-y-2">
              <Label>Arquivos disponíveis</Label>
              <div className="space-y-2 rounded-md border p-3">
                {available.map((k) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selected.has(k)}
                      onCheckedChange={() => toggle(k)}
                    />
                    <span>{DELIVERY_FILE_LABELS[k]}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <Label>Canais de envio</Label>
              <div className="space-y-2 rounded-md border p-3">
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
                        : `E-mail automático será enviado para ${purchase.email} com os links assinados.`}
                    </span>
                  </span>
                </label>
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
                        : `Abrirá ${purchase.whatsapp} com mensagem pronta e links assinados.`}
                    </span>
                  </span>
                </label>
              </div>
            </section>

            <section className="space-y-1.5">
              <Label htmlFor="obs">Observação (opcional)</Label>
              <Textarea
                id="obs"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Nota interna sobre esta entrega..."
              />
            </section>

            {history.data && history.data.length > 0 && (
              <section className="space-y-1.5">
                <Label className="inline-flex items-center gap-1">
                  <History className="h-3.5 w-3.5" /> Entregas anteriores
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
                        {(d.arquivos as string[]).join(", ")} ·{" "}
                        {[d.enviado_email && "email", d.enviado_whatsapp && "whats"]
                          .filter(Boolean)
                          .join(" + ")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending || noFiles || selected.size === 0 || noChannel
            }
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" /> Entregar arquivos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
