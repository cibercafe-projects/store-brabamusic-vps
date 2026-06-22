import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { listReleases } from "@/lib/releases.functions";
import {
  RELEASE_STATUSES,
  RELEASE_STATUS_LABEL,
  RELEASE_TYPE_LABEL,
  type ReleaseStatus,
} from "@/lib/releases.constants";

export const Route = createFileRoute("/admin/_protected/lancamentos/")({
  component: LancamentosPage,
});

const STATUS_VARIANT: Record<ReleaseStatus, "default" | "secondary" | "outline"> = {
  recebido: "default",
  em_analise: "secondary",
  aprovado: "outline",
  distribuido: "secondary",
};

function LancamentosPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReleaseStatus | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const listFn = useServerFn(listReleases);

  const query = useQuery({
    queryKey: ["admin", "releases", search, statusFilter, page],
    queryFn: () =>
      listFn({
        data: {
          search: search || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          page,
          pageSize,
        },
      }),
    staleTime: 10_000,
  });

  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Lançamentos</h1>
        <p className="text-sm text-muted-foreground">
          Materiais enviados por artistas para distribuição.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por artista, lançamento ou e-mail..."
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setPage(1);
            setStatusFilter(v as ReleaseStatus | "all");
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {RELEASE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {RELEASE_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum lançamento encontrado.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Artista</TableHead>
                  <TableHead>Lançamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium">{r.artist_name}</TableCell>
                    <TableCell>{r.release_name}</TableCell>
                    <TableCell>{RELEASE_TYPE_LABEL[r.release_type]}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status]}>
                        {RELEASE_STATUS_LABEL[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          to="/admin/lancamentos/$id"
                          params={{ id: r.id }}
                          aria-label="Ver lançamento"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} lançamentos · página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
