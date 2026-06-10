import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Plus, Power, PowerOff, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  setAdminUserActive,
  updateAdminUser,
} from "@/lib/admin-users.functions";
import { checkAdminRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/_protected/usuarios")({
  component: UsuariosPage,
});

type Row = Awaited<ReturnType<typeof listAdminUsers>>[number];

function UsuariosPage() {
  const list = useServerFn(listAdminUsers);
  const create = useServerFn(createAdminUser);
  const update = useServerFn(updateAdminUser);
  const setActive = useServerFn(setAdminUserActive);
  const remove = useServerFn(deleteAdminUser);
  const checkRole = useServerFn(checkAdminRole);
  const qc = useQueryClient();

  const roleQuery = useQuery({
    queryKey: ["admin-role"],
    queryFn: () => checkRole(),
    staleTime: 60_000,
  });

  const query = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list(),
    enabled: roleQuery.data?.isSuperAdmin === true,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Row | null>(null);

  function openCreate() {
    setEditing(null);
    setEmail("");
    setPassword("");
    setOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    setEmail(row.email ?? "");
    setPassword("");
    setOpen(true);
  }

  const mutateSave = useMutation({
    mutationFn: async () => {
      if (editing) {
        await update({ data: { userId: editing.user_id, email, password: password || undefined } });
      } else {
        await create({ data: { email, password } });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Usuário atualizado" : "Administrador criado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutateActive = useMutation({
    mutationFn: (vars: { userId: string; active: boolean }) =>
      setActive({ data: vars }) as Promise<unknown>,
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mutateDelete = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }) as Promise<unknown>,
    onSuccess: () => {
      toast.success("Administrador removido");
      setDeleteConfirm(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (roleQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!roleQuery.data?.isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto mt-12 rounded-lg border border-white/10 p-8 text-center">
        <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Apenas o super administrador pode gerenciar usuários administrativos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display">Usuários administrativos</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de administradores da plataforma.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo admin
        </Button>
      </header>

      <div className="rounded-lg border border-white/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {query.data?.map((row) => {
              const protectedRow = row.is_super;
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.email ?? "—"}
                    {row.is_self && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        você
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.is_super ? (
                      <Badge className="bg-gradient-to-r from-amber-500 to-pink-500 text-white">
                        super_admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">admin</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.active ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                        ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-500/40 text-red-400">
                        inativo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(row)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!protectedRow && !row.is_self && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            mutateActive.mutate({ userId: row.user_id, active: !row.active })
                          }
                          title={row.active ? "Desativar" : "Ativar"}
                        >
                          {row.active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {!protectedRow && !row.is_self && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(row)}
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {query.data && query.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum administrador cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar administrador" : "Novo administrador"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize o e-mail e/ou redefina a senha."
                : "Será criado com papel admin (não super)."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutateSave.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{editing ? "Nova senha (opcional)" : "Senha"}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required={!editing}
                placeholder={editing ? "Deixe em branco para manter" : "Mínimo 8 caracteres"}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutateSave.isPending}>
                {mutateSave.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(o) => !o && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover administrador?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário <strong>{deleteConfirm?.email}</strong> perderá acesso e será removido
              permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && mutateDelete.mutate(deleteConfirm.user_id)}
              disabled={mutateDelete.isPending}
            >
              {mutateDelete.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
