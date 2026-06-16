import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  deleteBeat,
  listBeats,
  listProducersForSelect,
  setBeatStatus,
} from "@/lib/beats.functions";
import { BeatForm, type BeatFormInitial } from "@/components/admin/beats/BeatForm";
import { BeatCoverFallback } from "@/components/admin/beats/BeatCoverFallback";

export const Route = createFileRoute("/admin/_protected/beats")({
  component: BeatsPage,
});

type Row = Awaited<ReturnType<typeof listBeats>>["rows"][number];
type BeatStatus = "rascunho" | "ativo" | "vendido";

const statusLabel: Record<BeatStatus, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  vendido: "Vendido",
};

const statusVariant: Record<BeatStatus, "default" | "secondary" | "outline"> = {
  ativo: "default",
  rascunho: "outline",
  vendido: "secondary",
};

const extFromPath = (p: string | null | undefined) => {
  if (!p) return null;
  const clean = p.split("?")[0];
  const base = clean.substring(clean.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  if (dot < 0) return null;
  return base.slice(dot + 1).toLowerCase();
};

function FileChip({
  label,
  path,
}: {
  label: string;
  path: string | null | undefined;
}) {
  const ext = extFromPath(path);
  if (ext) {
    return (
      <Badge variant="secondary" className="text-[10px] uppercase">
        {label} · {ext}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] text-muted-foreground">
      {label} · pendente
    </Badge>
  );
}

const formatPrice = (v: number | string | null | undefined) => {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
};

function BeatsPage() {
  const list = useServerFn(listBeats);
  const listProducers = useServerFn(listProducersForSelect);
  const changeStatus = useServerFn(setBeatStatus);
  const removeBeat = useServerFn(deleteBeat);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"todas" | BeatStatus>("todas");
  const [produtoraId, setProdutoraId] = useState<string>("todas");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<BeatFormInitial | undefined>(undefined);
  const [sellConfirm, setSellConfirm] = useState<Row | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Row | null>(null);

  const producersQuery = useQuery({
    queryKey: ["admin", "producers", "select"],
    queryFn: () => listProducers(),
    staleTime: 30_000,
  });

  const query = useQuery({
    queryKey: ["admin", "beats", { search, status, produtoraId, page, pageSize }],
    queryFn: () =>
      list({
        data: {
          search: search || undefined,
          status,
          produtoraId: produtoraId === "todas" ? undefined : produtoraId,
          page,
          pageSize,
          sort: "created_at",
        },
      }),
  });

  const totalPages = useMemo(
    () => (query.data ? Math.max(1, Math.ceil(query.data.total / pageSize)) : 1),
    [query.data],
  );

  const mutateStatus = useMutation({
    mutationFn: async (input: { id: string; status: BeatStatus }) =>
      changeStatus({ data: input }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["admin", "beats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
    onSettled: () => setSellConfirm(null),
  });

  const mutateDelete = useMutation({
    mutationFn: async (id: string) => removeBeat({ data: { id } }),
    onSuccess: () => {
      toast.success("Beat removido.");
      qc.invalidateQueries({ queryKey: ["admin", "beats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao remover"),
    onSettled: () => setDeleteConfirm(null),
  });

  const producers = producersQuery.data ?? [];
  const noProducers = !producersQuery.isLoading && producers.length === 0;

  const openCreate = () => {
    setEditing(undefined);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Beats</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo administrativo de beats vinculados a produtoras.
          </p>
        </div>
        <Button onClick={openCreate} disabled={noProducers}>
          <Plus className="h-4 w-4" />
          Novo beat
        </Button>
      </header>

      {noProducers && (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Nenhuma produtora ativa. Cadastre uma em{" "}
          <a className="underline" href="/admin/produtoras">
            /admin/produtoras
          </a>{" "}
          antes de criar um beat.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Buscar por nome do beat..."
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
            <SelectItem value="todas">Todos status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="vendido">Vendido</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={produtoraId}
          onValueChange={(v) => {
            setPage(1);
            setProdutoraId(v);
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Produtora" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas produtoras</SelectItem>
            {producers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome_artistico}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[64px]">Capa</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Produtora</TableHead>
              <TableHead>Gênero</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Plays</TableHead>
              <TableHead>Arquivos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <Loader2 className="inline h-4 w-4 animate-spin" /> Carregando...
                </TableCell>
              </TableRow>
            ) : query.data?.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  Nenhum beat cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              query.data?.rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="h-10 w-10 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                      {b.capa_signed_url || b.capa_url ? (
                        <img
                          src={(b.capa_signed_url ?? b.capa_url) as string}
                          alt={b.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <BeatCoverFallback name={b.nome} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{b.nome}</TableCell>
                  <TableCell>{b.produtora_nome}</TableCell>
                  <TableCell>
                    {b.genero ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{formatPrice(b.preco)}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm tabular-nums">
                      <Headphones className="h-3.5 w-3.5 text-muted-foreground" />
                      {((b as { plays_count?: number }).plays_count ?? 0).toLocaleString("pt-BR")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      <FileChip label="WAV" path={(b as { wav_path?: string | null }).wav_path} />
                      {(b as { tipo?: string }).tipo === "aberto" && (
                        <>
                          <FileChip label="Stems" path={(b as { stems_path?: string | null }).stems_path} />
                          <FileChip label="Licença" path={(b as { license_path?: string | null }).license_path} />
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[b.status as BeatStatus]}>
                      {statusLabel[b.status as BeatStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing({
                          id: b.id,
                          produtora_id: b.produtora_id,
                          nome: b.nome,
                          slug: b.slug,
                          genero: b.genero,
                          bpm: b.bpm,
                          tom: b.tom,
                          mood: b.mood,
                          preco: b.preco,
                          descricao: b.descricao,
                          status: b.status as BeatStatus,
                          capa_url: b.capa_url,
                          capa_path: b.capa_path,
                          capa_signed_url: b.capa_signed_url,
                          preview_url: b.preview_url,
                          preview_path: b.preview_path,
                          preview_signed_url: b.preview_signed_url,
                          wav_url: b.wav_url,
                          stems_url: b.stems_url,
                        });
                        setSheetOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Alterar status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={b.status === "ativo"}
                          onClick={() =>
                            mutateStatus.mutate({ id: b.id, status: "ativo" })
                          }
                        >
                          Marcar como ativo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={b.status === "rascunho"}
                          onClick={() =>
                            mutateStatus.mutate({ id: b.id, status: "rascunho" })
                          }
                        >
                          Voltar para rascunho
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={b.status === "vendido"}
                          onClick={() => setSellConfirm(b)}
                        >
                          Marcar como vendido
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteConfirm(b)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir beat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
            {query.data.total} beats · página {page} de {totalPages}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar beat" : "Novo beat"}</DialogTitle>
            <DialogDescription>Campos com * são obrigatórios.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <BeatForm initial={editing} onDone={() => setSheetOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!sellConfirm} onOpenChange={(o) => !o && setSellConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar beat como vendido?</AlertDialogTitle>
            <AlertDialogDescription>
              Beats vendidos serão ocultados do catálogo público no futuro. O registro permanece no
              sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                sellConfirm && mutateStatus.mutate({ id: sellConfirm.id, status: "vendido" })
              }
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir beat?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O beat{" "}
              <strong>{deleteConfirm?.nome}</strong> e seus arquivos de capa e prévia
              serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && mutateDelete.mutate(deleteConfirm.id)}
              disabled={mutateDelete.isPending}
            >
              {mutateDelete.isPending ? "Excluindo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
