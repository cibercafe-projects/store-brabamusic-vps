import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Star, Save, MessageCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  getFeedback,
  updateFeedback,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABEL,
  FEEDBACK_TYPE_LABEL,
  FEEDBACK_AREA_LABEL,
  FEEDBACK_ORIGIN_LABEL,
  type FeedbackStatus,
  type FeedbackType,
  type FeedbackArea,
  type FeedbackOrigin,
} from "@/lib/feedback.functions";
import { waLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/admin/_protected/feedback/$id")({
  component: FeedbackDetailPage,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function FeedbackDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getFeedback);
  const updateFn = useServerFn(updateFeedback);

  const query = useQuery({
    queryKey: ["admin", "feedback", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const [status, setStatus] = useState<FeedbackStatus>("novo");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (query.data?.feedback) {
      setStatus(query.data.feedback.status as FeedbackStatus);
      setNotes(query.data.feedback.internal_notes ?? "");
    }
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () => updateFn({ data: { id, status, internal_notes: notes || null } }),
    onSuccess: () => {
      toast.success("Feedback atualizado.");
      qc.invalidateQueries({ queryKey: ["admin", "feedback", id] });
      qc.invalidateQueries({ queryKey: ["admin", "feedback"] });
      qc.invalidateQueries({ queryKey: ["admin", "feedback-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }
  if (query.isError || !query.data) {
    return <div className="text-destructive">Feedback não encontrado.</div>;
  }

  const f = query.data.feedback;
  const p = query.data.purchase;
  const r = query.data.release;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/feedback"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="font-display text-2xl">
                {FEEDBACK_TYPE_LABEL[f.type as FeedbackType]}
                {f.rating && (
                  <span className="ml-3 inline-flex items-center gap-1 text-base align-middle">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    {f.rating}/5
                  </span>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {fmtDate(f.created_at)} · {FEEDBACK_ORIGIN_LABEL[f.origin as FeedbackOrigin]}
                {f.area ? ` · ${FEEDBACK_AREA_LABEL[f.area as FeedbackArea]}` : ""}
              </p>
            </div>
            <Badge variant="secondary">{FEEDBACK_STATUS_LABEL[f.status as FeedbackStatus]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Mensagem</Label>
            <p className="mt-2 whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">
              {f.message}
            </p>
          </div>

          {f.wants_reply && (
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Contato solicitado</Label>
              <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                <div><strong>Nome:</strong> {f.contact_name || "—"}</div>
                <div><strong>E-mail:</strong> {f.contact_email || "—"}</div>
                <div><strong>WhatsApp:</strong> {f.contact_whatsapp || "—"}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {f.contact_whatsapp && waLink(f.contact_whatsapp, "Olá! Sobre o feedback enviado à Braba Beats:") && (
                  <Button asChild size="sm" variant="outline">
                    <a href={waLink(f.contact_whatsapp, "Olá! Sobre o feedback enviado à Braba Beats:")!} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                    </a>
                  </Button>
                )}
                {f.contact_email && (
                  <Button asChild size="sm" variant="outline">
                    <a href={`mailto:${f.contact_email}?subject=Braba Beats — Retorno sobre seu feedback`}>
                      <Mail className="h-4 w-4 mr-1" /> E-mail
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {(p || r) && (
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Referência</Label>
              <div className="mt-2 text-sm">
                {p && (
                  <Link
                    to="/admin/compras/$id"
                    params={{ id: p.id }}
                    className="text-primary hover:underline"
                  >
                    Compra de {p.nome_cliente}{p.beat_nome ? ` — ${p.beat_nome}` : ""}
                  </Link>
                )}
                {r && (
                  <Link
                    to="/admin/lancamentos/$id"
                    params={{ id: r.id }}
                    className="text-primary hover:underline"
                  >
                    Lançamento: {r.release_name} — {r.artist_name}
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Gestão interna</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as FeedbackStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEEDBACK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{FEEDBACK_STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações internas</Label>
            <Textarea
              id="notes"
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas visíveis apenas para o time…"
            />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
