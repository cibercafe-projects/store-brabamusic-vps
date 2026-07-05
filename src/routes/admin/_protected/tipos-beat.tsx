import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  listBeatTypes,
  upsertBeatType,
  deleteBeatType,
  type BeatTypeRow,
} from "@/lib/beat-types.functions";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/admin/_protected/tipos-beat")({
  component: TiposBeatPage,
});

const schema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, "Obrigatório").max(80),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,60}$/, "minúsculas, números e hífens"),
  descricao: z.string().trim().max(500).optional().or(z.literal("")),
  valor_padrao: z
    .string()
    .min(1, "Obrigatório")
    .refine((v) => !Number.isNaN(Number(v.replace(",", "."))), "Número inválido"),
  link_pagamento: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), "URL http(s) obrigatória"),
  inclui_stems: z.boolean(),
  ativo: z.boolean(),
  ordem: z
    .string()
    .refine((v) => v === "" || Number.isInteger(Number(v)), "Número inteiro"),
});

type FormValues = z.infer<typeof schema>;

function TiposBeatPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBeatTypes);
  const [editing, setEditing] = useState<BeatTypeRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<BeatTypeRow | null>(null);

  const query = useQuery({
    queryKey: ["admin", "beat-types"],
    queryFn: () => listFn(),
    staleTime: 15_000,
  });

  const items = query.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Tipos de Beat</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Configure os tipos disponíveis, valor padrão e link de pagamento. Cada beat vai
            referenciar um tipo, e o sistema usa automaticamente o valor e o link cadastrados aqui.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Novo tipo
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipos cadastrados</CardTitle>
          <CardDescription>
            Apenas tipos ativos aparecem no cadastro de beats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum tipo cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Valor padrão</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.ordem}</TableCell>
                      <TableCell className="font-medium">{it.nome}</TableCell>
                      <TableCell className="font-mono text-xs">{it.slug}</TableCell>
                      <TableCell>
                        R$ {Number(it.valor_padrao).toFixed(2).replace(".", ",")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={it.inclui_stems ? "default" : "secondary"}>
                          {it.inclui_stems ? "WAV + Stems" : "WAV"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {it.link_pagamento ? (
                          <a
                            href={it.link_pagamento}
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent underline text-xs"
                          >
                            {it.link_pagamento}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={it.ativo ? "default" : "outline"}>
                          {it.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(it)}
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmDelete(it)}
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BeatTypeDialog
        open={creating || !!editing}
        initial={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "beat-types"] })}
      />

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover tipo?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.nome}" será removido. Se houver beats usando este tipo, a remoção
              será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <DeleteAction
              row={confirmDelete}
              onDone={() => {
                setConfirmDelete(null);
                qc.invalidateQueries({ queryKey: ["admin", "beat-types"] });
              }}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DeleteAction({ row, onDone }: { row: BeatTypeRow | null; onDone: () => void }) {
  const del = useServerFn(deleteBeatType);
  const mut = useMutation({
    mutationFn: () => del({ data: { id: row!.id } }),
    onSuccess: () => {
      toast.success("Tipo removido.");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover"),
  });
  return (
    <AlertDialogAction
      onClick={(e) => {
        e.preventDefault();
        if (row) mut.mutate();
      }}
      disabled={mut.isPending}
    >
      {mut.isPending ? "Removendo..." : "Remover"}
    </AlertDialogAction>
  );
}

function BeatTypeDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: BeatTypeRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsert = useServerFn(upsertBeatType);
  const isEdit = !!initial;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      id: initial?.id,
      nome: initial?.nome ?? "",
      slug: initial?.slug ?? "",
      descricao: initial?.descricao ?? "",
      valor_padrao:
        initial?.valor_padrao != null
          ? String(initial.valor_padrao).replace(".", ",")
          : "100,00",
      link_pagamento: initial?.link_pagamento ?? "",
      inclui_stems: initial?.inclui_stems ?? false,
      ativo: initial?.ativo ?? true,
      ordem: initial?.ordem != null ? String(initial.ordem) : "0",
    },
  });

  const mut = useMutation({
    mutationFn: (v: FormValues) =>
      upsert({
        data: {
          id: v.id,
          nome: v.nome,
          slug: v.slug,
          descricao: v.descricao || "",
          valor_padrao: Number(String(v.valor_padrao).replace(",", ".")),
          link_pagamento: v.link_pagamento || "",
          inclui_stems: v.inclui_stems,
          ativo: v.ativo,
          ordem: Number(v.ordem || "0"),
        },
      }),
    onSuccess: () => {
      toast.success(isEdit ? "Tipo atualizado." : "Tipo criado.");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const nome = form.watch("nome");
  const slug = form.watch("slug");
  function onNomeBlur() {
    if (!isEdit && !slug && nome) {
      form.setValue("slug", slugify(nome), { shouldValidate: true });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar tipo" : "Novo tipo de beat"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mut.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} onBlur={onNomeBlur} placeholder="Ex: Beat Fechado" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="fechado" />
                  </FormControl>
                  <FormDescription>Identificador técnico único.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="valor_padrao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor padrão (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.replace(/[^\d,.]/g, ""))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ordem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="link_pagamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link de pagamento</FormLabel>
                  <FormControl>
                    <Input type="url" {...field} placeholder="https://..." />
                  </FormControl>
                  <FormDescription>
                    Enviado ao cliente no fluxo de compra deste tipo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="inclui_stems"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <FormLabel>Entrega inclui stems</FormLabel>
                      <FormDescription>WAV + stems (aberto).</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <FormLabel>Ativo</FormLabel>
                      <FormDescription>Disponível no cadastro.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
