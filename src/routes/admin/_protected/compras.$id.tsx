import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  ArrowLeft,
  ExternalLink,
  Download,
  MessageCircle,
  Mail,
  Instagram,
  Save,
  PackageCheck,
  CheckCircle2,
  Settings2,
  History,
} from "lucide-react";
import { toast } from "sonner";
import {
  getPurchase,
  updatePurchaseStatus,
  getReceiptSignedUrl,
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_LIST,
  type PurchaseStatus,
} from "@/lib/purchases.functions";
import { deliverPurchase, listDeliveries } from "@/lib/deliveries.functions";
import { waLink as buildWaLink } from "@/lib/whatsapp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DeliveryDialog } from "@/components/purchase/DeliveryDialog";
import { ResendInstructionsCard } from "@/components/purchase/ResendInstructionsCard";

export const Route = createFileRoute("/admin/_protected/compras/$id")({
  component: PurchaseDetailPage,
});

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

function fmtPrice(v: number | string | null | undefined) {
  if (v == null) return "—";
  const num = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(num)) return "—";
  return `R$ ${num.toFixed(2).replace(".", ",")}`;
}

function PurchaseDetailPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const getFn = useServerFn(getPurchase);
  const updateFn = useServerFn(updatePurchaseStatus);
  const signFn = useServerFn(getReceiptSignedUrl);

  const query = useQuery({
    queryKey: ["admin", "purchase", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const [status, setStatus] = useState<PurchaseStatus>("aguardando_pagamento");
  const [notes, setNotes] = useState("");
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);

  useEffect(() => {
    if (query.data) {
      setStatus(query.data.status as PurchaseStatus);
      setNotes(query.data.admin_notes ?? "");
    }
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateFn({ data: { id, status, admin_notes: notes || null } }),
    onSuccess: () => {
      toast.success("Atualizado");
      queryClient.invalidateQueries({ queryKey: ["admin", "purchase", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "purchases"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "purchase-counts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  async function openReceipt() {
    setLoadingReceipt(true);
    try {
      const r = await signFn({ data: { id } });
      window.open(r.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao abrir.");
    } finally {
      setLoadingReceipt(false);
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-destructive">Erro ao carregar pedido.</p>;
  }

  const p = query.data;
  const beat = p.beat;
  const waNum = (p.whatsapp ?? "").replace(/\D/g, "");
  const waLink = waNum
    ? `https://wa.me/${waNum}?text=${encodeURIComponent(
        `Olá ${p.nome_cliente}, aqui é a Braba Music sobre o beat ${beat?.nome ?? ""}.`,
      )}`
    : "#";
  const mailLink = `mailto:${p.email}?subject=${encodeURIComponent(
    `Braba Music — pedido ${beat?.nome ?? ""}`,
  )}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/compras">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl">{p.nome_cliente}</h1>
            <p className="text-xs text-muted-foreground">
              Criado em {fmtDate(p.created_at)}
            </p>
          </div>
        </div>
        <Badge>{PURCHASE_STATUS_LABELS[p.status as PurchaseStatus]}</Badge>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-medium">{p.nome_cliente}</p>
            </div>
            {p.nome_artistico && (
              <div>
                <p className="text-xs text-muted-foreground">Nome artístico</p>
                <p className="font-medium">{p.nome_artistico}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">E-mail</p>
              <p className="font-medium break-all">{p.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WhatsApp</p>
              <p className="font-medium">{p.whatsapp}</p>
            </div>
            {p.instagram && (
              <div>
                <p className="text-xs text-muted-foreground">Instagram</p>
                <p className="font-medium inline-flex items-center gap-1">
                  <Instagram className="h-3 w-3" /> @{p.instagram}
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button asChild size="sm" variant="outline">
                <a href={waLink} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={mailLink}>
                  <Mail className="h-4 w-4" /> E-mail
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Beat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              {beat?.capa_url && (
                <img
                  src={beat.capa_url}
                  alt={beat.nome}
                  className="h-16 w-16 rounded-md object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="font-display text-lg truncate">{beat?.nome ?? "—"}</p>
                {beat?.produtora?.nome_artistico && (
                  <p className="text-xs text-muted-foreground truncate">
                    prod. {beat.produtora.nome_artistico}
                  </p>
                )}
                {beat?.slug && (
                  <Link
                    to="/beat/$slug"
                    params={{ slug: beat.slug }}
                    target="_blank"
                    className="text-xs text-accent hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Ver no catálogo <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-xl font-bold text-accent">{fmtPrice(p.valor as number | null)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Forma de pagamento</p>
              <p className="font-medium uppercase">{p.forma_pagamento}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Termos aceitos</p>
              <p className="font-medium">{p.termos_aceitos ? "Sim" : "Não"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comprovante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {p.receipt_path ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Enviado em {fmtDate(p.receipt_uploaded_at)}
                </p>
                <div className="flex gap-2">
                  <Button onClick={openReceipt} disabled={loadingReceipt} size="sm">
                    {loadingReceipt ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4" /> Visualizar
                      </>
                    )}
                  </Button>
                  <Button onClick={openReceipt} disabled={loadingReceipt} size="sm" variant="outline">
                    <Download className="h-4 w-4" /> Baixar
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum comprovante enviado ainda.</p>
            )}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <p className="text-xs text-muted-foreground">Link de envio do cliente:</p>
              {(() => {
                const origin =
                  typeof window !== "undefined" && window.location?.origin
                    ? window.location.origin
                    : "https://brababeats.app";
                const fullLink = `${origin}/enviar-comprovante/${p.continuation_token}`;
                return (
                  <div className="flex items-center gap-2">
                    <a
                      href={fullLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] break-all font-mono text-accent underline-offset-2 hover:underline flex-1"
                    >
                      {fullLink}
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(fullLink);
                        toast.success("Link copiado");
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status & notas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PurchaseStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_STATUS_LIST.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PURCHASE_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notas internas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Anotações da equipe..."
              />
            </div>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" /> Salvar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {(p.status === "aguardando_pagamento" || p.status === "comprovante_recebido") && (
          <ResendInstructionsCard
            purchase={{
              id: p.id,
              nome_cliente: p.nome_cliente,
              email: p.email,
              whatsapp: p.whatsapp,
              valor: p.valor as number | string | null,
              continuation_token: p.continuation_token as string,
              forma_pagamento: p.forma_pagamento,
              beat: beat ? { nome: beat.nome } : null,
            }}
          />
        )}

        <DeliveryCard
          purchase={p}
          beat={beat}
          onOpenDialog={() => setDeliveryOpen(true)}
        />
      </div>

      <DeliveryDialog
        open={deliveryOpen}
        onOpenChange={setDeliveryOpen}
        purchase={{
          id: p.id,
          nome_cliente: p.nome_cliente,
          email: p.email,
          whatsapp: p.whatsapp,
          beat: beat
            ? {
                nome: beat.nome,
                wav_path: (beat as { wav_path?: string | null }).wav_path ?? null,
                stems_path: (beat as { stems_path?: string | null }).stems_path ?? null,
                license_path: (beat as { license_path?: string | null }).license_path ?? null,
              }
            : null,
        }}
      />
    </div>
  );
}

type DeliveryCardBeat = {
  nome: string;
  wav_path?: string | null;
  stems_path?: string | null;
  license_path?: string | null;
} | null;

type DeliveryCardPurchase = {
  id: string;
  nome_cliente: string;
  email: string | null;
  whatsapp: string | null;
  status: string;
  delivered_at: string | null;
};

function DeliveryCard({
  purchase,
  beat,
  onOpenDialog,
}: {
  purchase: DeliveryCardPurchase;
  beat: DeliveryCardBeat;
  onOpenDialog: () => void;
}) {
  const qc = useQueryClient();
  const deliverFn = useServerFn(deliverPurchase);
  const listFn = useServerFn(listDeliveries);

  const available = (["wav", "stems", "license"] as const).filter(
    (k) => !!beat?.[`${k}_path` as const],
  );

  const history = useQuery({
    queryKey: ["admin", "deliveries", purchase.id],
    queryFn: () => listFn({ data: { purchase_id: purchase.id } }),
  });

  const [busyChannel, setBusyChannel] = useState<"whatsapp" | "email" | null>(null);

  const canDeliver =
    purchase.status === "pagamento_confirmado" || purchase.status === "arquivos_enviados";
  const isDelivered = purchase.status === "arquivos_enviados";
  const hasFiles = available.length > 0;
  const lastDelivery = history.data?.[0];

  async function trigger(channel: "whatsapp" | "email") {
    if (!hasFiles || !canDeliver) return;
    setBusyChannel(channel);
    try {
      const res = await deliverFn({
        data: {
          purchase_id: purchase.id,
          arquivos: available,
          canal_email: channel === "email",
          canal_whatsapp: channel === "whatsapp",
          email_mode: channel === "email" ? "mailto" : "auto",
          observacao: null,
        },
      });
      if (channel === "whatsapp" && res.whatsapp_url) {
        window.open(res.whatsapp_url, "_blank", "noopener,noreferrer");
        toast.success("Entrega registrada. WhatsApp aberto.");
      } else if (channel === "email" && res.email_mailto_url) {
        window.location.href = res.email_mailto_url;
        toast.success("Entrega registrada. E-mail aberto no seu cliente.");
      } else {
        toast.success("Entrega registrada.");
      }
      qc.invalidateQueries({ queryKey: ["admin", "purchase", purchase.id] });
      qc.invalidateQueries({ queryKey: ["admin", "purchases"] });
      qc.invalidateQueries({ queryKey: ["admin", "purchase-counts"] });
      qc.invalidateQueries({ queryKey: ["admin", "deliveries", purchase.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao entregar.");
    } finally {
      setBusyChannel(null);
    }
  }

  return (
    <Card
      className={`md:col-span-2 ${
        purchase.status === "pagamento_confirmado"
          ? "border-accent ring-2 ring-accent/30"
          : "border-accent/30"
      }`}
    >
      <CardHeader>
        <CardTitle className="text-base inline-flex items-center gap-2">
          <PackageCheck className="h-4 w-4" /> Enviar Arquivos
          {purchase.status === "pagamento_confirmado" && (
            <Badge className="ml-2 bg-accent text-accent-foreground">Pendente de entrega</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {isDelivered && lastDelivery && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="text-sm font-semibold text-emerald-300">Arquivos entregues com sucesso</p>
              <p className="mt-1">
                Em{" "}
                {new Date(lastDelivery.enviado_em).toLocaleString("pt-BR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              {lastDelivery.enviado_por_email && (
                <p>Responsável: {lastDelivery.enviado_por_email}</p>
              )}
              <p className="text-muted-foreground">
                Canais:{" "}
                {[
                  lastDelivery.enviado_email && "E-mail",
                  lastDelivery.enviado_whatsapp && "WhatsApp",
                ]
                  .filter(Boolean)
                  .join(" + ") || "—"}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="font-medium">{purchase.nome_cliente}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Beat</p>
            <p className="font-medium">{beat?.nome ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">E-mail</p>
            <p className="font-medium break-all">{purchase.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">WhatsApp</p>
            <p className="font-medium">{purchase.whatsapp || "—"}</p>
          </div>
        </div>

        <div className="rounded-md border p-3 text-xs space-y-1">
          <p className="text-muted-foreground">Arquivos cadastrados no beat:</p>
          <ul className="space-y-0.5">
            <li>WAV: {beat?.wav_path ? "✅ disponível" : "❌ não cadastrado"}</li>
            <li>STEMS: {beat?.stems_path ? "✅ disponível" : "❌ não cadastrado"}</li>
            <li>Licença: {beat?.license_path ? "✅ disponível" : "❌ não cadastrada"}</li>
          </ul>
        </div>

        {!canDeliver && (
          <p className="text-xs text-muted-foreground">
            Confirme o pagamento antes de entregar os arquivos.
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            onClick={() => trigger("whatsapp")}
            disabled={
              !canDeliver || !hasFiles || !purchase.whatsapp || busyChannel !== null
            }
            className="bg-[#25D366] hover:bg-[#1ebe57] text-white"
          >
            {busyChannel === "whatsapp" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
              </>
            )}
          </Button>
          <Button
            onClick={() => trigger("email")}
            disabled={!canDeliver || !hasFiles || !purchase.email || busyChannel !== null}
            variant="outline"
          >
            {busyChannel === "email" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Mail className="h-4 w-4" /> Enviar por E-mail
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onOpenDialog} disabled={!canDeliver}>
            <Settings2 className="h-4 w-4" /> Mais opções
          </Button>
          {(() => {
            const msg = `Olá ${purchase.nome_cliente}, sua compra do beat *${beat?.nome ?? ""}* foi liberada! — Braba Music`;
            const link = buildWaLink(purchase.whatsapp, msg);
            return link ? (
              <Button asChild variant="ghost" size="sm">
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> Aviso curto
                </a>
              </Button>
            ) : null;
          })()}
        </div>

        {(history.data?.length ?? 0) > 0 && (
          <section className="space-y-1.5 pt-2 border-t border-white/10">
            <p className="text-xs font-semibold inline-flex items-center gap-1">
              <History className="h-3.5 w-3.5" /> Histórico de entregas
            </p>
            <div className="space-y-1 text-xs rounded-md border p-2 max-h-40 overflow-auto">
              {history.data!.slice(0, 5).map((d) => (
                <div key={d.id} className="flex justify-between gap-2">
                  <span>
                    {new Date(d.enviado_em).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <span className="text-muted-foreground truncate">
                    {(d.arquivos as string[]).join(", ")} ·{" "}
                    {[d.enviado_email && "email", d.enviado_whatsapp && "whats"]
                      .filter(Boolean)
                      .join(" + ")}
                    {d.enviado_por_email ? ` · ${d.enviado_por_email}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

