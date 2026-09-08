import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  BadgePercent,
  History,
  Loader2,
  Pencil,
  Plus,
  PowerOff,
  Power,
  StopCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  listBeatTypesWithPromo,
  listBeatTypes,
  upsertBeatTypePromo,
  toggleBeatTypePromo,
  termBeatTypePromo,
  deleteBeatTypePromo,
  listBeatTypePromoHistory,
  type BeatTypePromoRow,
  type BeatTypeRow,
  type PromoStatus,
  formatPromoDateBR,
  formatPromoBRL,
} from "@/lib/beat-types.functions";

export const Route = createFileRoute("/admin/_protected/promocoes")({
  component: PromocoesPage,
});

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local: string | null | undefined): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function StatusBadge({ status }: { status: PromoStatus }) {
  if (status === "vigente") {
    return (
      <Badge className="border-transparent bg-green-600 text-white shadow hover:bg-green-600/80">
        <BadgePercent className="h-3 w-3 mr-1" /> Em promoção
      </Badge>
    );
  }
  if (status === "futura") {
    return (
      <Badge className="border-transparent bg-blue-600 text-white shadow hover:bg-blue-600/80">
        Futura
      </Badge>
    );
  }
  if (status === "desligada") {
    return (
      <Badge className="border-transparent bg-yellow-600 text-white shadow hover:bg-yellow-600/80">
        Desligada
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="opacity-70">
      Encerrada
    </Badge>
  );
}

type EditState =
  | { mode: "create"; type: BeatTypeRow }
  | { mode: "edit"; type: BeatTypePromoRow };

function PromocoesPage() {
  const qc = useQueryClient();
  const listPromoFn = useServerFn(listBeatTypesWithPromo);
  const listAllFn = useServerFn(listBeatTypes);

  const [dialogState, setDialogState] = useState<EditState | null>(null);
  const [confirm, setConfirm] = useState<
    | null
    | { kind: "delete"; id: string; nome: string }
    | { kind: "term"; id: string; nome: string }
    | { kind: "toggle"; id: string; nome: string; ativa: boolean }
  >(null);

  const query = useQuery({
    queryKey: ["admin", "beat-types-with-promo"],
    queryFn: () => listPromoFn(),
    staleTime: 15_000,
  });

  const allQuery = useQuery({
    queryKey: ["admin", "beat-types"],
    queryFn: () => listAllFn(),
    staleTime: 15_000,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin", "beat-types-with-promo"] });
    qc.invalidateQueries({ queryKey: ["admin", "beat-types"] });
  }

  const promos = query.data ?? [];
  const allTypes = allQuery.data ?? [];

  const availableForCreate = useMemo(() => {
    const taken = new Set(promos.map((p) => p.id));
    return allTypes.filter((t) => !taken.has(t.id));
  }, [allTypes, promos]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Promoções</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Coloque um tipo de beat inteiro em promoção. A promoção só vale enquanto o valor
            promocional for menor que o preço cheio e dentro do período agendado. Desligar ou
            expirar volta ao preço original sem alterar o cadastro de cada beat.
          </p>
        </div>
        <Button
          onClick={() => {
            if (!availableForCreate.length) {
              toast.info("Todos os tipos já possuem promoção cadastrada.");
              return;
            }
            setDialogState({ mode: "create", type: availableForCreate[0] });
          }}
          disabled={!allQuery.data || availableForCreate.length === 0}
        >
          <Plus className="h-4 w-4 mr-1" /> Cadastrar promoção
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Promoções cadastradas</CardTitle>
          <CardDescription>
            Apenas tipos de beat com promoção registrada aparecem aqui. Promoções encerradas ficam
            em modo leitura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : promos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma promoção cadastrada. Use o botão acima para criar uma.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor cheio</TableHead>
                    <TableHead>Valor promo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promos.map((it) => (
                    <PromoRow
                      key={it.id}
                      item={it}
                      onEdit={(p) => setDialogState({ mode: "edit", type: p })}
                      onConfirmDelete={(p) =>
                        setConfirm({ kind: "delete", id: p.id, nome: p.nome })
                      }
                      onConfirmTerm={(p) =>
                        setConfirm({ kind: "term", id: p.id, nome: p.nome })
                      }
                      onToggle={(p, ativa) =>
                        setConfirm({ kind: "toggle", id: p.id, nome: p.nome, ativa })
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {dialogState && (
        <PromoDialog
          state={dialogState}
          allTypes={allTypes}
          takenIds={new Set(promos.map((p) => p.id))}
          onClose={() => setDialogState(null)}
          onSaved={() => {
            refresh();
            setDialogState(null);
          }}
        />
      )}

      <ConfirmAction
        confirm={confirm}
        onCancel={() => setConfirm(null)}
        onDone={() => {
          setConfirm(null);
          refresh();
        }}
      />
    </div>
  );
}

function PromoRow({
  item,
  onEdit,
  onConfirmDelete,
  onConfirmTerm,
  onToggle,
}: {
  item: BeatTypePromoRow;
  onEdit: (t: BeatTypePromoRow) => void;
  onConfirmDelete: (t: BeatTypePromoRow) => void;
  onConfirmTerm: (t: BeatTypePromoRow) => void;
  onToggle: (t: BeatTypePromoRow, ativa: boolean) => void;
}) {
  const periodo = [item.promo_inicio_em, item.promo_expira_em]
    .map((d) => (d ? toLocalInput(d).replace("T", " ") : ""))
    .filter(Boolean)
    .join(" → ");

  const encerrada = item.status === "encerrada";
  const futura = item.status === "futura";

  return (
    <TableRow>
      <TableCell className="font-medium">{item.nome}</TableCell>
      <TableCell>R$ {Number(item.valor_padrao).toFixed(2).replace(".", ",")}</TableCell>
      <TableCell className="text-accent font-semibold">
        {item.promo_valor != null
          ? `R$ ${Number(item.promo_valor).toFixed(2).replace(".", ",")}`
          : "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{periodo || "—"}</TableCell>
      <TableCell>
        <StatusBadge status={item.status} />
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex flex-wrap gap-1 justify-end">
          {!encerrada && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(item)}
              aria-label="Editar"
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {!encerrada && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggle(item, !item.promo_ativa)}
              aria-label={item.promo_ativa ? "Desligar" : "Religar"}
              title={item.promo_ativa ? "Desligar" : "Religar"}
            >
              {item.promo_ativa ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            </Button>
          )}
          {!encerrada && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onConfirmTerm(item)}
              aria-label="Terminar agora"
              title="Terminar agora"
            >
              <StopCircle className="h-4 w-4" />
            </Button>
          )}
          {futura && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onConfirmDelete(item)}
              aria-label="Excluir promoção"
              title="Excluir promoção"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function PromoDialog({
  state,
  allTypes,
  takenIds,
  onClose,
  onSaved,
}: {
  state: EditState;
  allTypes: BeatTypeRow[];
  takenIds: Set<string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsert = useServerFn(upsertBeatTypePromo);
  const historyFn = useServerFn(listBeatTypePromoHistory);

  const initial = state.type;
  const isEdit = state.mode === "edit";
  const editRow = isEdit ? (state.type as BeatTypePromoRow) : null;

  const [tipoId, setTipoId] = useState<string>(
    isEdit ? editRow!.id : (state as { mode: "create"; type: BeatTypeRow }).type.id,
  );

  const selectedType = useMemo(() => {
    if (isEdit) return editRow!;
    return allTypes.find((t) => t.id === tipoId) ?? null;
  }, [isEdit, editRow, allTypes, tipoId]);

  const valorCheio = isEdit ? Number(editRow!.valor_padrao) : Number(selectedType?.valor_padrao ?? 0);

  // Regras do lifecycle: campos bloqueados conforme estado.
  const inicioAtual = isEdit && editRow!.promo_inicio_em ? new Date(editRow!.promo_inicio_em) : null;
  const expiraAtual = isEdit && editRow!.promo_expira_em ? new Date(editRow!.promo_expira_em) : null;
  const now = new Date();
  const encerrada = isEdit && !!expiraAtual && expiraAtual.getTime() <= now.getTime();
  const iniciada = !!inicioAtual && inicioAtual.getTime() <= now.getTime();

  const readOnlyFields = encerrada || (iniciada && isEdit);
  // Após início, só `promo_expira_em` e `promo_ativa` podem mudar.
  const fixedAfterStart = iniciada && isEdit;

  const schema = z
    .object({
      promo_ativa: z.boolean(),
      promo_valor: z
        .string()
        .min(1, "Informe o valor promocional.")
        .refine(
          (v) => !Number.isNaN(Number(v.replace(",", "."))),
          "Número inválido",
        )
        .refine(
          (v) => Number(v.replace(",", ".")) < valorCheio,
          "Deve ser menor que o valor cheio.",
        ),
      promo_link_pagamento: z
        .string()
        .trim()
        .min(1, "Informe o link de pagamento da promoção.")
        .max(500)
        .refine((v) => /^https?:\/\/.+/i.test(v), "URL deve começar com http(s)://"),
      promo_descricao: z.string().trim().max(280).default(""),
      promo_inicio_em: z.string().min(1, "Informe a data/hora de início."),
      promo_expira_em: z.string().optional(),
    })
    .refine(
      (v) => {
        if (!v.promo_expira_em) return true;
        const ini = new Date(v.promo_inicio_em);
        const fim = new Date(v.promo_expira_em);
        return fim.getTime() > ini.getTime();
      },
      { message: "Término deve ser após o início.", path: ["promo_expira_em"] },
    );
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(schema) as never,
    values: isEdit
      ? {
          promo_ativa: editRow!.promo_ativa,
          promo_valor:
            editRow!.promo_valor != null
              ? String(editRow!.promo_valor).replace(".", ",")
              : "",
          promo_link_pagamento: editRow!.promo_link_pagamento ?? "",
          promo_descricao: editRow!.promo_descricao ?? "",
          promo_inicio_em: toLocalInput(editRow!.promo_inicio_em),
          promo_expira_em: toLocalInput(editRow!.promo_expira_em),
        }
      : {
          promo_ativa: true,
          promo_valor: "",
          promo_link_pagamento: "",
          promo_descricao: "",
          promo_inicio_em: "",
          promo_expira_em: "",
        },
  });

  const mut = useMutation({
    mutationFn: (v: FormValues) =>
      upsert({
        data: {
          id: tipoId,
          promo_ativa: v.promo_ativa,
          promo_valor: Number(String(v.promo_valor).replace(",", ".")),
          promo_link_pagamento: v.promo_link_pagamento,
          promo_descricao: v.promo_descricao || null,
          promo_inicio_em: toIso(v.promo_inicio_em) ?? "",
          promo_expira_em: toIso(v.promo_expira_em),
        },
      }),
    onSuccess: () => {
      toast.success(isEdit ? "Promoção atualizada." : "Promoção cadastrada.");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const history = useQuery({
    queryKey: ["admin", "beat-types", tipoId, "promo-history"],
    queryFn: () => historyFn({ data: { id: tipoId } }),
    enabled: isEdit,
    staleTime: 30_000,
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Editar promoção — ${editRow!.nome}` : "Cadastrar promoção"}
          </DialogTitle>
          <DialogDescription>
            {encerrada
              ? "Esta promoção está encerrada e não pode mais ser editada."
              : fixedAfterStart
                ? "Promoção já iniciou; apenas a data final e ativar/desativar podem ser alterados."
                : "Defina valor, link de pagamento, data de início e término (opcional)."}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de beat</label>
            <Select value={tipoId} onValueChange={setTipoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {allTypes.map((t) => (
                  <SelectItem
                    key={t.id}
                    value={t.id}
                    disabled={takenIds.has(t.id) && t.id !== tipoId}
                  >
                    {t.nome}
                    {takenIds.has(t.id) ? " (já possui)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mut.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="promo_ativa"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <FormLabel>Promoção ativa</FormLabel>
                    <FormDescription>
                      Quando ligada e dentro do período, a promoção se aplica.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={readOnlyFields && !fixedAfterStart}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="promo_valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor promocional (R$)</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        placeholder={String(valorCheio).replace(".", ",")}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.replace(/[^\d,.]/g, "").slice(0, 10))
                        }
                        disabled={readOnlyFields}
                      />
                    </FormControl>
                    <FormDescription>Deve ser menor que R$ {formatPromoBRL(valorCheio)}.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="promo_link_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link de pagamento da promoção</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://mpago.la/..."
                        {...field}
                        disabled={readOnlyFields}
                      />
                    </FormControl>
                    <FormDescription>Link/pix do valor temporário.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="promo_descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Texto exibido no banner público da promoção."
                      rows={2}
                      maxLength={280}
                      {...field}
                      disabled={readOnlyFields}
                    />
                  </FormControl>
                  <FormDescription>Máx. 280 caracteres.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="promo_inicio_em"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} disabled={readOnlyFields} />
                    </FormControl>
                    <FormDescription>Obrigatório.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="promo_expira_em"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>Opcional. Quando souber, edite.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Fechar
              </Button>
              <Button type="submit" disabled={mut.isPending || readOnlyFields}>
                {mut.isPending ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {isEdit && (
          <div className="mt-6 border-t pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <History className="h-4 w-4" /> Histórico
            </h3>
            {history.isLoading ? (
              <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
            ) : history.data && history.data.length > 0 ? (
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Período</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.data.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(h.changed_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {h.promo_ativa ? (
                          <Badge className="border-transparent bg-green-600 text-white">Ativa</Badge>
                        ) : (
                          <Badge variant="secondary">Desligada</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {h.promo_valor != null
                          ? `R$ ${h.promo_valor.toFixed(2).replace(".", ",")}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[h.promo_inicio_em, h.promo_expira_em]
                          .map((d) => (d ? toLocalInput(d).replace("T", " ") : ""))
                          .filter(Boolean)
                          .join(" → ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhuma alteração registrada ainda.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmAction({
  confirm,
  onCancel,
  onDone,
}: {
  confirm:
    | null
    | { kind: "delete"; id: string; nome: string }
    | { kind: "term"; id: string; nome: string }
    | { kind: "toggle"; id: string; nome: string; ativa: boolean };
  onCancel: () => void;
  onDone: () => void;
}) {
  const toggleFn = useServerFn(toggleBeatTypePromo);
  const termFn = useServerFn(termBeatTypePromo);
  const deleteFn = useServerFn(deleteBeatTypePromo);

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; ativa: boolean }) =>
      toggleFn({ data: { id: v.id, promo_ativa: v.ativa } }),
    onSuccess: (_d, v) => {
      toast.success(v.ativa ? "Promoção ligada." : "Promoção desligada.");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar"),
  });

  const termMut = useMutation({
    mutationFn: (id: string) => termFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Promoção encerrada.");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao encerrar"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Promoção excluída.");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  if (!confirm) return null;

  if (confirm.kind === "delete") {
    return (
      <AlertDialog open onOpenChange={(o) => !o && onCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir promoção?</AlertDialogTitle>
            <AlertDialogDescription>
              A promoção de <strong>{confirm.nome}</strong> ainda não iniciou. Excluir agora
              remove o cadastro da promoção e todo o histórico dela. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMut.mutate(confirm.id)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (confirm.kind === "term") {
    return (
      <AlertDialog open onOpenChange={(o) => !o && onCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminar promoção agora?</AlertDialogTitle>
            <AlertDialogDescription>
              A promoção de <strong>{confirm.nome}</strong> será encerrada imediatamente
              (data final = agora) e não poderá mais ser editada ou religada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => termMut.mutate(confirm.id)} disabled={termMut.isPending}>
              {termMut.isPending ? "Encerrando..." : "Terminar agora"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // toggle
  return (
    <AlertDialog open onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {confirm.ativa ? "Religar promoção?" : "Desligar promoção?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {confirm.ativa
              ? `A promoção de ${confirm.nome} voltará a ser aplicada (dentro do período configurado).`
              : `A promoção de ${confirm.nome} será desligada. O cadastro e o histórico permanecem; você pode religar a qualquer momento enquanto não estiver encerrada.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => toggleMut.mutate({ id: confirm.id, ativa: confirm.ativa })}
            disabled={toggleMut.isPending}
          >
            {toggleMut.isPending ? "Atualizando..." : confirm.ativa ? "Religar" : "Desligar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
