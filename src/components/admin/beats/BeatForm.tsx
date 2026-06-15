import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createBeat,
  listProducersForSelect,
  updateBeat,
} from "@/lib/beats.functions";
import { slugify } from "@/lib/slug";
import { BeatCoverUploader } from "./BeatCoverUploader";
import { BeatPreviewUploader } from "./BeatPreviewUploader";
import { BeatPrivateFileUploader } from "./BeatPrivateFileUploader";

const urlOpt = z
  .string()
  .trim()
  .max(500)
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || /^https?:\/\/.+/i.test(v), "URL deve começar com http:// ou https://");

const schema = z.object({
  produtora_id: z.string().uuid("Selecione uma produtora"),
  nome: z.string().trim().min(1, "Obrigatório").max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,80}$/, "minúsculas, números e hífens")
    .optional()
    .or(z.literal("")),
  genero: z.string().trim().max(60).optional().or(z.literal("")),
  bpm: z.string().optional().or(z.literal("")),
  tom: z.string().trim().max(60).optional().or(z.literal("")),
  mood: z.string().trim().max(60).optional().or(z.literal("")),
  preco: z.string().optional().or(z.literal("")),
  tipo: z.enum(["fechado", "aberto"]),
  descricao: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["rascunho", "ativo", "vendido"]),
  capa_path: z.string().max(300).optional().or(z.literal("")),
  preview_path: z.string().max(300).optional().or(z.literal("")),
  wav_url: urlOpt,
  stems_url: urlOpt,
  wav_path: z.string().max(300).optional().or(z.literal("")),
  stems_path: z.string().max(300).optional().or(z.literal("")),
  license_path: z.string().max(300).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export type BeatFormInitial = {
  id?: string;
  produtora_id?: string;
  nome?: string;
  slug?: string;
  genero?: string | null;
  bpm?: number | null;
  tom?: string | null;
  mood?: string | null;
  preco?: number | string | null;
  tipo?: "fechado" | "aberto";
  descricao?: string | null;
  status?: "rascunho" | "ativo" | "vendido";
  capa_url?: string | null;
  capa_path?: string | null;
  capa_signed_url?: string | null;
  preview_url?: string | null;
  preview_path?: string | null;
  preview_signed_url?: string | null;
  wav_url?: string | null;
  stems_url?: string | null;
  wav_path?: string | null;
  stems_path?: string | null;
  license_path?: string | null;
};

type Props = {
  initial?: BeatFormInitial;
  onDone: () => void;
};

export function BeatForm({ initial, onDone }: Props) {
  const qc = useQueryClient();
  const create = useServerFn(createBeat);
  const update = useServerFn(updateBeat);
  const listProducers = useServerFn(listProducersForSelect);
  const isEdit = !!initial?.id;

  const [coverPreview, setCoverPreview] = useState<string | null>(
    initial?.capa_signed_url ?? initial?.capa_url ?? null,
  );
  const [audioPreview, setAudioPreview] = useState<string | null>(
    initial?.preview_signed_url ?? initial?.preview_url ?? null,
  );

  const producersQuery = useQuery({
    queryKey: ["admin", "producers", "select"],
    queryFn: () => listProducers(),
    staleTime: 30_000,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      produtora_id: initial?.produtora_id ?? "",
      nome: initial?.nome ?? "",
      slug: initial?.slug ?? "",
      genero: initial?.genero ?? "",
      bpm: initial?.bpm != null ? String(initial.bpm) : "",
      tom: initial?.tom ?? "",
      mood: initial?.mood ?? "",
      preco:
        initial?.preco != null
          ? String(initial.preco).replace(".", ",")
          : "100,00",
      tipo: initial?.tipo ?? "fechado",
      descricao: initial?.descricao ?? "",
      status: initial?.status ?? "rascunho",
      capa_path: initial?.capa_path ?? "",
      preview_path: initial?.preview_path ?? "",
      wav_url: initial?.wav_url ?? "",
      stems_url: initial?.stems_url ?? "",
      wav_path: initial?.wav_path ?? "",
      stems_path: initial?.stems_path ?? "",
      license_path: initial?.license_path ?? "",
    },
  });

  const nome = form.watch("nome");
  const slug = form.watch("slug");
  useEffect(() => {
    if (!isEdit && !slug && nome) {
      form.setValue("slug", slugify(nome), { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        produtora_id: values.produtora_id,
        nome: values.nome,
        slug: values.slug || undefined,
        genero: values.genero || "",
        bpm: values.bpm ? Number(values.bpm) : null,
        tom: values.tom || "",
        mood: values.mood || "",
        preco: values.preco ? Number(String(values.preco).replace(",", ".")) : null,
        tipo: values.tipo,
        descricao: values.descricao || "",
        status: values.status,
        capa_url: "",
        capa_path: values.capa_path || null,
        preview_url: "",
        preview_path: values.preview_path || null,
        wav_url: values.wav_url || "",
        stems_url: values.stems_url || "",
        wav_path: values.wav_path || null,
        stems_path: values.stems_path || null,
        license_path: values.license_path || null,
      };
      if (isEdit && initial?.id) {
        return update({ data: { id: initial.id, ...payload } });
      }
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Beat atualizado." : "Beat criado.");
      qc.invalidateQueries({ queryKey: ["admin", "beats"] });
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const producers = producersQuery.data ?? [];
  const noProducers = !producersQuery.isLoading && producers.length === 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-5 pb-6">
        {noProducers && (
          <Alert>
            <AlertDescription>
              Nenhuma produtora ativa cadastrada. Cadastre uma em /admin/produtoras antes de criar
              um beat.
            </AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="produtora_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produtora *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma produtora" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {producers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_artistico}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do beat *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: Trap da Rua" />
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
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input {...field} placeholder="trap-da-rua" />
              </FormControl>
              <FormDescription>Usado em URLs públicas (Sprint 5+).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="genero"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gênero</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Trap, Drill, Funk..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mood</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Dark, melódico..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bpm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BPM</FormLabel>
                <FormControl>
                  <Input type="number" min={40} max={300} {...field} placeholder="140" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tom</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="C minor" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preco"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    inputMode="decimal"
                    {...field}
                    placeholder="199,99"
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="vendido">Vendido</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} placeholder="Breve descrição do beat..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 rounded-md border p-4">
          <div>
            <p className="text-sm font-medium mb-2">Capa</p>
            <BeatCoverUploader
              previewUrl={coverPreview}
              beatId={initial?.id}
              beatName={nome}
              onUploaded={(path, url) => {
                form.setValue("capa_path", path, { shouldDirty: true });
                setCoverPreview(url);
              }}
              onClear={() => {
                form.setValue("capa_path", "", { shouldDirty: true });
                setCoverPreview(null);
              }}
            />
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Preview de áudio</p>
            <BeatPreviewUploader
              previewUrl={audioPreview}
              beatId={initial?.id}
              onUploaded={(path, url) => {
                form.setValue("preview_path", path, { shouldDirty: true });
                setAudioPreview(url);
              }}
              onClear={() => {
                form.setValue("preview_path", "", { shouldDirty: true });
                setAudioPreview(null);
              }}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-md border p-4">
          <div>
            <p className="text-sm font-medium">Arquivos privados para entrega</p>
            <p className="text-xs text-muted-foreground">
              Enviados apenas ao comprador após confirmação do pagamento. Links assinados, válidos
              por 7 dias.
            </p>
          </div>
          {(["wav", "stems", "license"] as const).map((kind) => (
            <BeatPrivateFileUploader
              key={kind}
              kind={kind}
              beatId={initial?.id}
              path={form.watch(`${kind}_path` as const) || null}
              onUploaded={(path) =>
                form.setValue(`${kind}_path` as const, path, { shouldDirty: true })
              }
              onClear={() =>
                form.setValue(`${kind}_path` as const, "", { shouldDirty: true })
              }
            />
          ))}
        </div>


        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending || noProducers}>
            {mutation.isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar beat"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
