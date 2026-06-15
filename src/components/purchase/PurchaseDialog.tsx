import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Copy, ExternalLink, MessageCircle, CheckCircle2, ArrowRight, CreditCard, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getPurchaseSettings, createPurchaseRequest } from "@/lib/purchases.functions";

type Method = "pix" | "link";
type Step = "form" | "receipt";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beatId: string;
  beatName: string;
  produtora?: string | null;
  preco?: number | null;
}

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

function whatsappLink(numberRaw: string, message: string) {
  const num = digitsOnly(numberRaw);
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function PurchaseDialog({
  open,
  onOpenChange,
  beatId,
  beatName,
  produtora,
  preco,
}: Props) {
  const [step, setStep] = useState<Step>("form");
  const [method, setMethod] = useState<Method>("pix");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [aceito, setAceito] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const loadSettings = useServerFn(getPurchaseSettings);
  const createFn = useServerFn(createPurchaseRequest);

  const settings = useQuery({
    queryKey: ["purchase-settings"],
    queryFn: () => loadSettings(),
    staleTime: 60_000,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setStep("form");
      setMethod("pix");
      setNome("");
      setEmail("");
      setWhatsapp("");
      setInstagram("");
      setAceito(false);
      setSubmitting(false);
      setToken(null);
    }
  }, [open]);

  const commercialWa = settings.data?.commercial_whatsapp ?? "+5511913401000";
  const pixKey = settings.data?.pix_key ?? "";
  const paymentLink = settings.data?.payment_link ?? "";

  const valorFmt = useMemo(
    () => (preco != null ? `R$ ${preco.toFixed(2).replace(".", ",")}` : "—"),
    [preco],
  );

  const canSubmit =
    nome.trim().length >= 2 &&
    /.+@.+\..+/.test(email) &&
    digitsOnly(whatsapp).length >= 8 &&
    aceito &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await createFn({
        data: {
          beat_id: beatId,
          nome_cliente: nome.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          instagram: instagram.trim() || undefined,
          forma_pagamento: method,
          termos_aceitos: true,
        },
      });
      setToken(res.continuation_token);
      setStep("receipt");
      toast.success("Pedido registrado!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  function copy(value: string, label: string) {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copiado!`))
      .catch(() => toast.error("Não foi possível copiar."));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Comprar beat</DialogTitle>
              <DialogDescription>
                Preencha seus dados, escolha a forma de pagamento e envie o comprovante.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Beat selecionado
                </p>
                <p className="font-display text-lg mt-1">{beatName}</p>
                {produtora && (
                  <p className="text-xs text-muted-foreground">prod. {produtora}</p>
                )}
                <p className="mt-2 text-2xl font-bold text-accent">{valorFmt}</p>
              </div>

              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <RadioGroup
                  value={method}
                  onValueChange={(v) => setMethod(v as Method)}
                  className="grid grid-cols-2 gap-3"
                >
                  <label
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${
                      method === "pix" ? "border-accent bg-accent/10" : "border-white/10"
                    }`}
                  >
                    <RadioGroupItem value="pix" id="pm-pix" />
                    <span className="text-sm font-medium">PIX</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${
                      method === "link" ? "border-accent bg-accent/10" : "border-white/10"
                    }`}
                  >
                    <RadioGroupItem value="link" id="pm-link" />
                    <span className="text-sm font-medium">Link de pagamento</span>
                  </label>
                </RadioGroup>

                {settings.isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Carregando dados...
                  </div>
                ) : method === "pix" ? (
                  pixKey ? (
                    <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Chave PIX
                        </p>
                        <p className="text-sm font-mono truncate">{pixKey}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copy(pixKey, "Chave PIX")}
                      >
                        <Copy className="h-3 w-3" /> Copiar
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      A chave PIX será informada pelo time Braba via WhatsApp.
                    </p>
                  )
                ) : paymentLink ? (
                  <a
                    href={paymentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-accent hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Abrir link de pagamento
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    O link será enviado pelo time Braba após o registro.
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-nome">Nome completo *</Label>
                  <Input
                    id="p-nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    maxLength={160}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-email">E-mail *</Label>
                  <Input
                    id="p-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-wa">WhatsApp *</Label>
                  <Input
                    id="p-wa"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d+\s()-]/g, ""))}
                    placeholder="+55 11 99999-9999"
                    maxLength={30}
                    autoComplete="tel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-ig">Instagram (opcional)</Label>
                  <Input
                    id="p-ig"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@seu_user"
                    maxLength={80}
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={aceito}
                  onCheckedChange={(v) => setAceito(v === true)}
                  className="mt-0.5"
                />
                <span>
                  Li e aceito os{" "}
                  <Link
                    to="/termos-uso"
                    target="_blank"
                    className="text-accent hover:underline"
                  >
                    Termos de Uso
                  </Link>{" "}
                  da Braba Music.
                </span>
              </label>

              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
                <span className="text-muted-foreground">WhatsApp Comercial: </span>
                <span className="font-semibold">{commercialWa}</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Registrando...
                  </>
                ) : (
                  <>
                    Continuar <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "receipt" && token && (() => {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const receiptUrl = `${origin}/enviar-comprovante/${token}`;
          const paymentLineForMsg = paymentLink || "Será enviado pelo time Braba";
          const message = `Olá!

Parabéns, você acabou de registrar sua compra na Braba Beats.

Beat:
${beatName}

Valor:
${valorFmt}

Link para pagamento:
${paymentLineForMsg}

Link para envio do comprovante:
${receiptUrl}

Após o envio do comprovante nossa equipe realizará a validação do pagamento e enviará os arquivos adquiridos.

Braba Music`;
          const copyText = `Beat: ${beatName}
Valor: ${valorFmt}
Link para pagamento: ${paymentLineForMsg}
Link para envio do comprovante: ${receiptUrl}`;
          const waUrl = whatsappLink(whatsapp, message);
          return (
            <>
              <DialogHeader>
                <DialogTitle>Compra registrada com sucesso</DialogTitle>
                <DialogDescription>
                  Salve os links abaixo para concluir seu pedido.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <p className="text-sm">Pedido criado com sucesso!</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Beat
                  </p>
                  <p className="font-display text-lg mt-1">{beatName}</p>
                  <p className="mt-2 text-2xl font-bold text-accent">{valorFmt}</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold mb-2">Próximos passos:</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Efetue o pagamento.</li>
                    <li>Envie seu comprovante.</li>
                    <li>Aguarde a validação da equipe.</li>
                    <li>Receba seus arquivos.</li>
                  </ol>
                </div>

                <div className="grid gap-2">
                  <Button
                    onClick={() => {
                      if (!paymentLink) {
                        toast.info("O link de pagamento será enviado pelo time Braba.");
                        return;
                      }
                      window.open(paymentLink, "_blank", "noopener,noreferrer");
                    }}
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4" /> Pagar Agora
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(receiptUrl, "_blank", "noopener,noreferrer")}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4" /> Enviar Comprovante
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(waUrl, "_blank", "noopener,noreferrer")}
                    className="w-full"
                  >
                    <MessageCircle className="h-4 w-4" /> Enviar informações para meu WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copy(copyText, "Informações da compra")}
                    className="w-full"
                  >
                    <Copy className="h-4 w-4" /> Copiar Informações
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
