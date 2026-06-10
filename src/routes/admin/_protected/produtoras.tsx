import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Plus,
  Search,
  Pencil,
  Power,
  PowerOff,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listProducers, setProducerStatus, deleteProducer } from "@/lib/producers.functions";
import { ProducerForm, type ProducerFormInitial } from "@/components/admin/producers/ProducerForm";

export const Route = createFileRoute("/admin/_protected/produtoras")({
  component: ProdutorasPage,
});

type Row = Awaited<ReturnType<typeof listProducers>>["rows"][number];

function ProdutorasPage() {
  const list = useServerFn(listProducers);
  const toggleStatus = useServerFn(setProducerStatus);
  const removeProducer = useServerFn(deleteProducer);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"todas" | "ativa" | "inativa">("todas");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ProducerFormInitial | undefined>(undefined);
  const [statusConfirm, setStatusConfirm] = useState<Row | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Row | null>(null);

  const query = useQuery({
    queryKey: ["admin", "producers", { search, status, page, pageSize }],
    queryFn: () =>
      list({ data: { search: search || undefined, status, page, pageSize, sort: "created_at" } }),
  });

  const totalPages = useMemo(
    () => (query.data ? Math.max(1, Math.ceil(query.data.total / pageSize)) : 1),
    [query.data],
  );

  const mutateStatus = useMutation({
    mutationFn: async (p: Row) =>
      toggleStatus({
        data: { id: p.id, status: p.status === "ativa" ? "inativa" : "ativa" },
      }),
    onSuccess: (_d, p) => {
      toast.success(p.status === "ativa" ? "Produtora desativada." : "Produtora ativada.");
      qc.invalidateQueries({ queryKey: ["admin", "producers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
    onSettled: () => setStatusConfirm(null),
  });

  const mutateDelete = useMutation({
    mutationFn: async (p: Row) => removeProducer({ data: { id: p.id } }),
    onSuccess: () => {
      toast.success("Produtora excluída.");
      qc.invalidateQueries({ queryKey: ["admin", "producers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao excluir"),
    onSettled: () => setDeleteConfirm(null),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Produtoras</h1>
          <p className="text-sm text-muted-foreground">
            Gestão das produtoras parceiras do selo.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setSheetOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nova produtora
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Buscar por nome artístico..."
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setPage(1);
            setStatus(v as typeof status);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="ativa">Ativas</SelectItem>
            <SelectItem value="inativa">Inativas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[64px]">Foto</TableHead>
              <TableHead>Nome artístico</TableHead>
              <TableHead>Instagram</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="inline h-4 w-4 animate-spin" /> Carregando...
                </TableCell>
              </TableRow>
            ) : query.data?.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhuma produtora cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              query.data?.rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      {p.foto_perfil_signed_url ? (
                        <AvatarImage src={p.foto_perfil_signed_url} alt={p.nome_artistico} />
                      ) : null}
                      <AvatarFallback>
                        {p.nome_artistico.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{p.nome_artistico}</TableCell>
                  <TableCell>
                    {p.instagram ? (
                      <a
                        href={`https://instagram.com/${p.instagram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm hover:underline"
                      >
                        {p.instagram}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{p.cidade ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "ativa" ? "default" : "secondary"}>
                      {p.status === "ativa" ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing({
                          id: p.id,
                          nome_artistico: p.nome_artistico,
                          slug: p.slug,
                          instagram: p.instagram,
                          spotify: p.spotify,
                          cidade: p.cidade,
                          bio: p.bio,
                          status: p.status,
                          foto_perfil_path: p.foto_perfil_path,
                          foto_perfil_signed_url: p.foto_perfil_signed_url,
                        });
                        setSheetOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setStatusConfirm(p)}>
                      {p.status === "ativa" ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                      {p.status === "ativa" ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(p)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {query.data && query.data.total > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {query.data.total} produtoras · página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar produtora" : "Nova produtora"}</DialogTitle>
            <DialogDescription>
              Campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ProducerForm initial={editing} onDone={() => setSheetOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!statusConfirm} onOpenChange={(o) => !o && setStatusConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusConfirm?.status === "ativa" ? "Desativar produtora?" : "Ativar produtora?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusConfirm?.status === "ativa"
                ? "A produtora ficará oculta do catálogo futuro, mas o registro permanece no sistema."
                : "A produtora voltará a estar disponível para vínculo com beats."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusConfirm && mutateStatus.mutate(statusConfirm)}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
