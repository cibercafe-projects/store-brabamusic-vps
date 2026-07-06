import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { createProducer, updateProducer } from "@/lib/producers.functions";
import { slugify } from "@/lib/slug";
import { ProducerAvatarUploader } from "./ProducerAvatarUploader";

function formatCpf(v: string | null | undefined): string {
  if (!v) return "";
  const d = v.replace(/\D+/g, "").slice(0, 11);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);
  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "-" + p4;
  return out;
}

const handle = z
  .string()
  .trim()
  .max(60)
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || /^@?[A-Za-z0-9._-]{1,40}$/.test(v), "Use apenas letras, números, . _ -");

const optStr = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const optEmail = z
  .string()
  .trim()
  .max(255)
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Email inválido");

const optCpf = z
  .string()
  .trim()
  .max(20)
  .optional()
  .or(z.literal(""))
  .refine((v) => {
    if (!v) return true;
    return v.replace(/\D+/g, "").length === 11;
  }, "CPF deve ter 11 dígitos");

const schema = z.object({
  nome_artistico: z.string().trim().min(1, "Obrigatório").max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,60}$/, "minúsculas, números e hífens")
    .optional()
    .or(z.literal("")),
  instagram: handle,
  spotify: handle,
  cidade: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["ativa", "inativa"]),
  nome_civil: optStr(160),
  cpf: optCpf,
  nome_artistico_creditos: optStr(160),
  email_comercial: optEmail,
  email_royalties: optEmail,
});

type FormValues = z.infer<typeof schema>;

export type ProducerFormInitial = {
  id?: string;
  nome_artistico?: string;
  slug?: string;
  instagram?: string | null;
  spotify?: string | null;
  cidade?: string | null;
  bio?: string | null;
  status?: "ativa" | "inativa";
  foto_perfil_path?: string | null;
  foto_perfil_signed_url?: string | null;
  nome_civil?: string | null;
  cpf?: string | null;
  nome_artistico_creditos?: string | null;
  email_comercial?: string | null;
  email_royalties?: string | null;
};

type Props = {
  initial?: ProducerFormInitial;
  onDone: () => void;
};

export function ProducerForm({ initial, onDone }: Props) {
  const qc = useQueryClient();
  const create = useServerFn(createProducer);
  const update = useServerFn(updateProducer);
  const isEdit = !!initial?.id;

  const [avatarPath, setAvatarPath] = useState<string | null>(initial?.foto_perfil_path ?? null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initial?.foto_perfil_signed_url ?? null,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome_artistico: initial?.nome_artistico ?? "",
      slug: initial?.slug ?? "",
      instagram: initial?.instagram ?? "",
      spotify: initial?.spotify ?? "",
      cidade: initial?.cidade ?? "",
      bio: initial?.bio ?? "",
      status: initial?.status ?? "ativa",
      nome_civil: initial?.nome_civil ?? "",
      cpf: formatCpf(initial?.cpf ?? ""),
      nome_artistico_creditos: initial?.nome_artistico_creditos ?? "",
      email_comercial: initial?.email_comercial ?? "",
      email_royalties: initial?.email_royalties ?? "",
    },
  });

  // Auto-gera slug a partir do nome se o campo slug ainda estiver vazio
  const nome = form.watch("nome_artistico");
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
        nome_artistico: values.nome_artistico,
        slug: values.slug || undefined,
        instagram: values.instagram || "",
        spotify: values.spotify || "",
        cidade: values.cidade || "",
        bio: values.bio || "",
        status: values.status,
        foto_perfil_path: avatarPath,
        nome_civil: values.nome_civil || "",
        cpf: values.cpf || "",
        nome_artistico_creditos: values.nome_artistico_creditos || "",
        email_comercial: values.email_comercial || "",
        email_royalties: values.email_royalties || "",
        texto_creditos: values.texto_creditos || "",
        texto_registro: values.texto_registro || "",
        texto_royalties: values.texto_royalties || "",
      };
      if (isEdit && initial?.id) {
        return update({ data: { id: initial.id, ...payload } });
      }
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Produtora atualizada." : "Produtora criada.");
      qc.invalidateQueries({ queryKey: ["admin", "producers"] });
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        className="space-y-5 pb-6"
      >
        <ProducerAvatarUploader
          previewUrl={avatarPreview}
          producerId={initial?.id}
          onUploaded={(path, preview) => {
            setAvatarPath(path);
            setAvatarPreview(preview);
          }}
        />

        <FormField
          control={form.control}
          name="nome_artistico"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome artístico *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: DJ Braba" />
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
                <Input {...field} placeholder="dj-braba" />
              </FormControl>
              <FormDescription>Usado em URLs públicas (Sprint 3+).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="@djbraba" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="spotify"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Spotify</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="@djbraba" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="cidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl>
                <Input {...field} placeholder="São Paulo" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} placeholder="Breve descrição da produtora..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label>Status: {field.value === "ativa" ? "Ativa" : "Inativa"}</Label>
                <FormDescription>Inativa fica oculta do catálogo futuro.</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value === "ativa"}
                  onCheckedChange={(v) => field.onChange(v ? "ativa" : "inativa")}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-4 rounded-md border p-4">
          <div>
            <h3 className="text-sm font-semibold">Informações Jurídicas</h3>
            <p className="text-xs text-muted-foreground">
              Usado para créditos, registro e royalties. Preencha quando disponível.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nome_civil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome civil</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome completo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(formatCpf(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="nome_artistico_creditos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome artístico para créditos</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Como deve aparecer nos créditos" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email_comercial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email comercial</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} placeholder="comercial@exemplo.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email_royalties"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de royalties</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} placeholder="royalties@exemplo.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="texto_creditos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Texto de créditos</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} placeholder="Texto padrão de créditos..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="texto_registro"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Texto de registro</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} placeholder="Texto padrão de registro..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="texto_royalties"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Texto de royalties</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} placeholder="Texto padrão de royalties..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>



        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : isEdit ? "Salvar" : "Criar produtora"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
