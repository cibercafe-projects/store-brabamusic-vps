import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { BadgePercent, History, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  toggleBeatTypePromo,
  upsertBeatType,
  listBeatTypePromoHistory,
  type BeatTypeRow,
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

function toIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const schema = z.object({
  promo_ativa: z.boolean(),
  promo_valor: z
    .string()
    .refine((v) => v === "" || !Number.isNaN(Number(v.replace(",", "."))), "Número inválido"),
  promo_link_pagamento: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), "URL http(s) obrigatória"),
  promo_inicio_em: z.string(),
  promo_expira_em: z.string(),
});

type FormValues = z.infer<typeof schema>;

function PromocoesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBeatTypes);
  const [editing, setEditing] = useState<BeatTypeRow | null>(null);

  const query = useQuery({
    queryKey: ["admin", "beat-types"],
    queryFn: () => listFn(),
    staleTime: 15_000,
  });

  const items = query.data ?? [];

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin", "beat-types"] });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Promoções</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Coloque um tipo de beat inteiro em promoção. A promoção só vale enquanto o valor
            promocional for menor que o preço do beat e o período ativo. Desligar ou expirar volta
            ao preço original sem alterar o cadastro de cada beat.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipos de beat</CardTitle>
          <CardDescription>
            Ligue a promoção do tipo, defina o valor e agende o período (início e fim opcionais).
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço padrão</TableHead>
                    <TableHead>Promoção</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <PromoRow key={it.id} item={it} onEdit={setEditing} onChanged={refresh} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <PromoDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            refresh();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function PromoRow({
  item,
  onEdit,
  onChanged,
}: {
  item: BeatTypeRow;
  onEdit: (t: BeatTypeRow) => void;
  onChanged: () => void;
}) {
  const toggle = useServerFn(toggleBeatTypePromo);
  const mut = useMutation({
    mutationFn: (ativa: boolean) => toggle({ data: { id: item.id, promo_ativa: ativa } }),
    onSuccess: () => {
      toast.success(item.promo_ativa ? "Promoção desligada." : "Promoção ligada.");
      onChanged();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao atualizar"),
  });

  const hasPeriodo = !!(item.promo_inicio_em || item.promo_expira_em);
  const ativa =
    item.promo_ativa && item.promo_valor != null && item.promo_valor < item.valor_padrao;

  const periodo = hasPeriodo
    ? [
        item.promo_inicio_em ? toLocalInput(item.promo_inicio_em).replace("T", " ") : "",
        item.promo_expira_em ? toLocalInput(item.promo_expira_em).replace("T", " ") : "",
      ]
        .filter(Boolean)
        .join(" → ")
    : "Sem período";

  return (
    <TableRow>
      <TableCell className="font-medium">{item.nome}</TableCell>
      <TableCell>
        R$ {Number(item.valor_padrao).toFixed(2).replace(".", ",")}
        {item.promo_valor != null && item.promo_valor < item.valor_padrao && (
          <span className="ml-2 text-accent">
            de R$ {Number(item.valor_padrao).toFixed(2).replace(".", ",")} por R${" "}
            {Number(item.promo_valor).toFixed(2).replace(".", ",")}
          </span>
        )}
      </TableCell>
      <TableCell>
        <Switch
          checked={item.promo_ativa}
          onCheckedChange={(v) => mut.mutate(v)}
          disabled={mut.isPending}
          aria-label={`Ligar promoção de ${item.nome}`}
        />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{periodo}</TableCell>
      <TableCell>
        {ativa ? (
          <Badge className="border-transparent bg-green-600 text-white shadow hover:bg-green-600/80">
            <BadgePercent className="h-3 w-3 mr-1" /> Em promoção
          </Badge>
        ) : item.promo_ativa ? (
          <Badge variant="outline">
            <History className="h-3 w-3 mr-1" /> Agendada
          </Badge>
        ) : (
          <Badge variant="secondary">Normal</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="ghost" onClick={() => onEdit(item)} aria-label="Configurar">
          <Pencil className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function PromoDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: BeatTypeRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsert = useServerFn(upsertBeatType);
  const historyFn = useServerFn(listBeatTypePromoHistory);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      promo_ativa: initial.promo_ativa,
      promo_valor: initial.promo_valor != null ? String(initial.promo_valor).replace(".", ",") : "",
      promo_link_pagamento: initial.promo_link_pagamento ?? "",
      promo_inicio_em: toLocalInput(initial.promo_inicio_em),
      promo_expira_em: toLocalInput(initial.promo_expira_em),
    },
  });

  const mut = useMutation({
    mutationFn: (v: FormValues) =>
      upsert({
        data: {
          id: initial.id,
          nome: initial.nome,
          slug: initial.slug,
          descricao: initial.descricao,
          valor_padrao: initial.valor_padrao,
          link_pagamento: initial.link_pagamento,
          inclui_stems: initial.inclui_stems,
          ativo: initial.ativo,
          ordem: initial.ordem,
          promo_ativa: v.promo_ativa,
          promo_valor: v.promo_valor ? Number(String(v.promo_valor).replace(",", ".")) : null,
          promo_link_pagamento: v.promo_link_pagamento || "",
          promo_inicio_em: toIso(v.promo_inicio_em),
          promo_expira_em: toIso(v.promo_expira_em),
        },
      }),
    onSuccess: () => {
      toast.success("Promoção salva.");
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const history = useQuery({
    queryKey: ["admin", "beat-types", initial.id, "promo-history"],
    queryFn: () => historyFn({ data: { id: initial.id } }),
    staleTime: 30_000,
  });

  const promoValor = form.watch("promo_valor");
  const promoAtiva = form.watch("promo_ativa");
  const mostraDePor =
    promoAtiva && promoValor && Number(String(promoValor).replace(",", ".")) < initial.valor_padrao;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Promoção — {initial.nome}</DialogTitle>
        </DialogHeader>
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
                      Vale apenas se o valor promocional for menor que o preço padrão.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                        placeholder={String(initial.valor_padrao).replace(".", ",")}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.replace(/[^\d,.]/g, "").slice(0, 10))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="promo_link_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link promocional</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Usado enquanto a promoção valer. Vazio = link padrão do tipo.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="promo_inicio_em"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>Vazio = já valendo.</FormDescription>
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
                    <FormDescription>Vazio = sem prazo.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {mostraDePor && (
              <p className="rounded-md border border-green-600/40 bg-green-600/10 p-3 text-sm">
                <BadgePercent className="h-4 w-4 inline mr-1 text-green-500" />
                Os beats deste tipo acima de R${" "}
                {Number(String(promoValor).replace(",", ".")).toFixed(2).replace(".", ",")} passarão
                a ser cobrados por este valor enquanto o período estiver ativo.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Fechar
              </Button>
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? "Salvando..." : "Salvar promoção"}
              </Button>
            </DialogFooter>
          </form>
        </Form>

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
                  <TableHead>Status</TableHead>
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
                      {h.promo_inicio_em || h.promo_expira_em
                        ? [
                            h.promo_inicio_em
                              ? toLocalInput(h.promo_inicio_em).replace("T", " ")
                              : "",
                            h.promo_expira_em
                              ? toLocalInput(h.promo_expira_em).replace("T", " ")
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" → ")
                        : "Sem período"}
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
      </DialogContent>
    </Dialog>
  );
}
