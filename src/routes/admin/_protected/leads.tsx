import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Mail, Phone, Instagram, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  listLeads,
  updateLeadStatus,
  deleteLead,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  type LeadStatus,
} from "@/lib/leads.functions";

export const Route = createFileRoute("/admin/_protected/leads")({
  component: LeadsPage,
});

const STATUS_VARIANT: Record<LeadStatus, "default" | "secondary" | "outline" | "destructive"> = {
  novo: "default",
  contatado: "secondary",
  negociacao: "outline",
  pago: "secondary",
  entregue: "secondary",
  perdido: "destructive",
};

function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const listFn = useServerFn(listLeads);
  const updateFn = useServerFn(updateLeadStatus);
  const deleteFn = useServerFn(deleteLead);

  const query = useQuery({
    queryKey: ["admin", "leads", search, statusFilter],
    queryFn: () =>
      listFn({
        data: {
          search: search || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          page: 1,
          pageSize: 100,
        },
      }),
    staleTime: 10_000,
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; status: LeadStatus }) => updateFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "metrics"] });
      toast.success("Status atualizado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "metrics"] });
      toast.success("Lead removido");
      setDeleting(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover"),
  });

  const rows = query.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Interesses recebidos pelo catálogo público e cadastros de clientes do fluxo de compra
          (mesmo que ainda não tenham pago).
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail, telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeadStatus | "all")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_STATUS_LABEL[s]}
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
        <p className="text-sm text-destructive">Erro ao carregar leads.</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum lead encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((lead) => (
            <Card key={lead.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div className="min-w-0">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    {lead.nome}
                    <Badge variant={STATUS_VARIANT[lead.status]}>
                      {LEAD_STATUS_LABEL[lead.status]}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(lead.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={lead.status}
                    onValueChange={(v) =>
                      updateMutation.mutate({ id: lead.id, status: v as LeadStatus })
                    }
                  >
                    <SelectTrigger className="w-[150px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {LEAD_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleting(lead.id)}
                    aria-label="Remover lead"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                  <a
                    href={`mailto:${lead.email}`}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <Mail className="h-3.5 w-3.5" /> {lead.email}
                  </a>
                  <a
                    href={`https://wa.me/${lead.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <Phone className="h-3.5 w-3.5" /> {lead.telefone}
                  </a>
                  {lead.instagram && (
                    <a
                      href={`https://instagram.com/${lead.instagram}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <Instagram className="h-3.5 w-3.5" /> @{lead.instagram}
                    </a>
                  )}
                </div>
                {lead.mensagem && (
                  <p className="text-sm italic text-muted-foreground border-l-2 border-white/10 pl-3">
                    "{lead.mensagem}"
                  </p>
                )}
                {lead.beat && (
                  <div className="text-xs pt-2 border-t border-white/5">
                    Beat:{" "}
                    <Link
                      to="/beat/$slug"
                      params={{ slug: lead.beat.slug }}
                      target="_blank"
                      className="text-accent hover:underline font-medium"
                    >
                      {lead.beat.nome}
                    </Link>
                    {lead.beat.produtora_nome ? (
                      <span className="text-muted-foreground"> — {lead.beat.produtora_nome}</span>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O contato será apagado do banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
