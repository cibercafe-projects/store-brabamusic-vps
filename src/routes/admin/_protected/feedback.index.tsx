import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Star, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listFeedback,
  FEEDBACK_STATUSES,
  FEEDBACK_STATUS_LABEL,
  FEEDBACK_TYPES,
  FEEDBACK_TYPE_LABEL,
  FEEDBACK_ORIGINS,
  FEEDBACK_ORIGIN_LABEL,
  type FeedbackStatus,
  type FeedbackType,
  type FeedbackOrigin,
} from "@/lib/feedback.functions";

export const Route = createFileRoute("/admin/_protected/feedback/")({
  component: FeedbackListPage,
});

const STATUS_VARIANT: Record<FeedbackStatus, "default" | "secondary" | "outline" | "destructive"> = {
  novo: "default",
  em_analise: "secondary",
  respondido: "secondary",
  resolvido: "outline",
  arquivado: "outline",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function FeedbackListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FeedbackStatus | "all">("all");
  const [type, setType] = useState<FeedbackType | "all">("all");
  const [origin, setOrigin] = useState<FeedbackOrigin | "all">("all");

  const listFn = useServerFn(listFeedback);
  const query = useQuery({
    queryKey: ["admin", "feedback", { search, status, type, origin }],
    queryFn: () =>
      listFn({
        data: {
          search: search || undefined,
          status: status === "all" ? undefined : status,
          type: type === "all" ? undefined : type,
          origin: origin === "all" ? undefined : origin,
        },
      }),
    staleTime: 15_000,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Ajuda e Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Sugestões, problemas, dúvidas, suporte e elogios enviados pelos usuários.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="pl-8"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as FeedbackStatus | "all")}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {FEEDBACK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{FEEDBACK_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={(v) => setType(v as FeedbackType | "all")}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {FEEDBACK_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{FEEDBACK_TYPE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={origin} onValueChange={(v) => setOrigin(v as FeedbackOrigin | "all")}>
            <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {FEEDBACK_ORIGINS.map((o) => (
                <SelectItem key={o} value={o}>{FEEDBACK_ORIGIN_LABEL[o]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {query.isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : query.isError ? (
            <div className="p-6 text-sm text-destructive">Falha ao carregar feedbacks.</div>
          ) : !query.data?.items.length ? (
            <div className="flex flex-col items-center justify-center gap-2 p-12 text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-50" />
              <p className="text-sm">Nenhum feedback encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {fmtDate(f.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{FEEDBACK_TYPE_LABEL[f.type as FeedbackType]}</Badge>
                    </TableCell>
                    <TableCell>
                      {f.rating ? (
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                          {f.rating}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {FEEDBACK_ORIGIN_LABEL[f.origin as FeedbackOrigin]}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-2 text-sm">{f.message}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[f.status as FeedbackStatus]}>
                        {FEEDBACK_STATUS_LABEL[f.status as FeedbackStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/admin/feedback/$id" params={{ id: f.id }}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
