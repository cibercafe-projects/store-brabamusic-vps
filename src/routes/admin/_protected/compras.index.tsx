import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, FileText, ExternalLink } from "lucide-react";
import {
  listPurchases,
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_LIST,
  type PurchaseStatus,
} from "@/lib/purchases.functions";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/_protected/compras/")({
  component: PurchasesListPage,
});

const STATUS_VARIANT: Record<PurchaseStatus, "default" | "secondary" | "outline" | "destructive"> = {
  aguardando_pagamento: "outline",
  comprovante_recebido: "secondary",
  pagamento_confirmado: "default",
  arquivos_enviados: "default",
  cancelado: "destructive",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function fmtPrice(v: number | string | null | undefined) {
  if (v == null) return "—";
  const num = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(num)) return "—";
  return `R$ ${num.toFixed(2).replace(".", ",")}`;
}

function PurchasesListPage() {
  const [status, setStatus] = useState<PurchaseStatus | "all">("all");
  const [search, setSearch] = useState("");
  const listFn = useServerFn(listPurchases);

  const query = useQuery({
    queryKey: ["admin", "purchases", status, search],
    queryFn: () =>
      listFn({
        data: {
          status: status === "all" ? undefined : status,
          search: search.trim() || undefined,
        },
      }),
    staleTime: 15_000,
  });

  // Pendentes de entrega aparecem primeiro quando o filtro é "Todos".
  const rows = (() => {
    const list = query.data ?? [];
    if (status !== "all") return list;
    return [...list].sort((a, b) => {
      const ap = a.status === "pagamento_confirmado" ? 0 : 1;
      const bp = b.status === "pagamento_confirmado" ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return 0;
    });
  })();

  const pendentesCount = (query.data ?? []).filter(
    (p) => p.status === "pagamento_confirmado",
  ).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Compras</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos solicitados via fluxo de compra assistida.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou e-mail..."
            className="pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            setStatus(status === "pagamento_confirmado" ? "all" : "pagamento_confirmado")
          }
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
            status === "pagamento_confirmado"
              ? "bg-accent text-accent-foreground"
              : "border border-accent/40 text-accent hover:bg-accent/10"
          }`}
        >
          Pendentes de entrega
          {pendentesCount > 0 && (
            <span className="rounded-full bg-background/30 px-1.5 text-xs">
              {pendentesCount}
            </span>
          )}
        </button>
        <Select value={status} onValueChange={(v) => setStatus(v as PurchaseStatus | "all")}>
          <SelectTrigger className="w-[240px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {PURCHASE_STATUS_LIST.map((s) => (
              <SelectItem key={s} value={s}>
                {PURCHASE_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Erro ao carregar.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma compra encontrada.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Beat</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Comprovante</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const pending = p.status === "pagamento_confirmado";
                return (
                  <TableRow
                    key={p.id}
                    className={pending ? "bg-accent/5 border-l-4 border-l-accent" : ""}
                  >
                    <TableCell>
                      <div className="font-medium">{p.nome_cliente}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                    </TableCell>
                    <TableCell>
                      {p.beat?.slug ? (
                        <Link
                          to="/beat/$slug"
                          params={{ slug: p.beat.slug }}
                          target="_blank"
                          className="text-accent hover:underline inline-flex items-center gap-1"
                        >
                          {p.beat?.nome ?? "—"} <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        p.beat?.nome ?? "—"
                      )}
                    </TableCell>
                    <TableCell>{fmtPrice(p.valor as number | null)}</TableCell>
                    <TableCell className="uppercase text-xs">
                      {p.forma_pagamento}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[p.status as PurchaseStatus]}>
                        {PURCHASE_STATUS_LABELS[p.status as PurchaseStatus]}
                      </Badge>
                      {pending && (
                        <Badge className="ml-1 bg-accent text-accent-foreground">
                          Entregar agora
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.receipt_path ? (
                        <FileText className="h-4 w-4 text-accent" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{fmtDate(p.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        to="/admin/compras/$id"
                        params={{ id: p.id }}
                        className={`text-xs hover:underline ${pending ? "font-semibold text-accent" : "text-accent"}`}
                      >
                        {pending ? "Entregar →" : "Abrir"}
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
