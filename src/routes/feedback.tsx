import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Loader2, Star, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  submitFeedback,
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABEL,
  FEEDBACK_AREAS,
  FEEDBACK_AREA_LABEL,
  FEEDBACK_ORIGINS,
  type FeedbackType,
  type FeedbackArea,
  type FeedbackOrigin,
} from "@/lib/feedback.functions";

const search = z.object({
  type: z.enum(FEEDBACK_TYPES).optional(),
  area: z.enum(FEEDBACK_AREAS).optional(),
  origin: z.enum(FEEDBACK_ORIGINS).optional(),
  purchase: z.string().uuid().optional(),
  release: z.string().uuid().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export const Route = createFileRoute("/feedback")({
  validateSearch: (s) => search.parse(s),
  component: FeedbackPage,
  head: () => ({
    meta: [
      { title: "Ajuda e Feedback — Braba Beats" },
      {
        name: "description",
        content:
          "Envie sugestões, dúvidas, elogios ou reporte problemas para a equipe Braba Beats.",
      },
      { property: "og:title", content: "Ajuda e Feedback — Braba Beats" },
      {
        property: "og:description",
        content:
          "Sua opinião ajuda a Braba Beats a evoluir. Fale com a nossa equipe.",
      },
    ],
  }),
});

function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value ?? 0;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(value === n ? null : n)}
          className="p-1 transition-transform hover:scale-110"
        >
          <Star
            className={`h-8 w-8 ${
              n <= active
                ? "fill-primary text-primary"
                : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
      {value ? (
        <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>
      ) : null}
    </div>
  );
}

function FeedbackPage() {
  const sp = useSearch({ from: "/feedback" });
  const submitFn = useServerFn(submitFeedback);

  const [rating, setRating] = useState<number | null>(sp.rating ?? null);
  const [type, setType] = useState<FeedbackType>(sp.type ?? "sugestao");
  const [area, setArea] = useState<FeedbackArea | "">(sp.area ?? "");
  const [message, setMessage] = useState("");
  const [wantsReply, setWantsReply] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wpp, setWpp] = useState("");
  const [done, setDone] = useState(false);

  const origin: FeedbackOrigin =
    sp.origin ?? (sp.purchase ? "pos_compra" : sp.release ? "pos_lancamento" : "geral");

  const mutation = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          rating,
          type,
          area: area || null,
          message,
          wants_reply: wantsReply,
          contact_name: name || null,
          contact_email: email || null,
          contact_whatsapp: wpp || null,
          purchase_request_id: sp.purchase ?? null,
          release_id: sp.release ?? null,
          origin,
          website: "",
        },
      }),
    onSuccess: () => {
      setDone(true);
      toast.success("Feedback enviado. Obrigada!");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao enviar."),
  });

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
        <h1 className="mt-6 font-display text-3xl text-gradient">Feedback enviado!</h1>
        <p className="mt-3 text-muted-foreground">
          Obrigada por compartilhar sua experiência com a Braba Beats.
          {wantsReply ? " Nossa equipe entrará em contato em breve." : ""}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/">Voltar ao catálogo</Link>
          </Button>
          <Button onClick={() => { setDone(false); setMessage(""); setRating(null); }}>
            Enviar outro feedback
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <h1 className="mt-4 font-display text-4xl text-gradient md:text-5xl">
          Ajuda e Feedback
        </h1>
        <p className="mt-3 text-muted-foreground">
          Sugestões, dúvidas, elogios ou problemas — sua opinião ajuda a Braba Beats a evoluir.
        </p>
        {(sp.purchase || sp.release) && (
          <Badge variant="secondary" className="mt-3">
            {sp.purchase ? "Referente à sua compra" : "Referente ao seu lançamento"}
          </Badge>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (message.trim().length < 3) {
            toast.error("Descreva sua mensagem.");
            return;
          }
          mutation.mutate();
        }}
        className="glass rounded-2xl p-6 space-y-6"
      >
        <div className="space-y-2">
          <Label>Como foi sua experiência?</Label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as FeedbackType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {FEEDBACK_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="area">Área (opcional)</Label>
            <Select value={area || "__none"} onValueChange={(v) => setArea(v === "__none" ? "" : (v as FeedbackArea))}>
              <SelectTrigger id="area">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Nenhuma —</SelectItem>
                {FEEDBACK_AREAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {FEEDBACK_AREA_LABEL[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Conte sua experiência *</Label>
          <Textarea
            id="message"
            rows={6}
            maxLength={4000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="O que gostaríamos de saber…"
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="reply"
            checked={wantsReply}
            onCheckedChange={(v) => setWantsReply(v === true)}
          />
          <Label htmlFor="reply" className="cursor-pointer">
            Quero receber resposta
          </Label>
        </div>

        {wantsReply && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wpp">WhatsApp</Label>
              <Input id="wpp" value={wpp} onChange={(e) => setWpp(e.target.value)} />
            </div>
            <p className="md:col-span-2 text-xs text-muted-foreground">
              Informe pelo menos um: e-mail ou WhatsApp.
            </p>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando…
            </>
          ) : (
            "Enviar feedback"
          )}
        </Button>
      </form>
    </div>
  );
}
