import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify } from "@/lib/slug";

const urlField = z
  .string()
  .trim()
  .max(500)
  .url("URL inválida")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

const beatInputSchema = z.object({
  produtora_id: z.string().uuid("Produtora obrigatória"),
  nome: z.string().trim().min(1, "Obrigatório").max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,80}$/, "Slug inválido")
    .optional(),
  genero: z.string().trim().max(60).optional().transform((v) => v || null),
  bpm: z.number().int().min(40).max(300).optional().nullable(),
  tom: z.string().trim().max(60).optional().transform((v) => v || null),
  mood: z.string().trim().max(60).optional().transform((v) => v || null),
  preco: z.number().min(0).max(99999.99).optional().nullable(),
  descricao: z.string().trim().max(2000).optional().transform((v) => v || null),
  status: z.enum(["rascunho", "ativo", "vendido"]).default("rascunho"),
  capa_url: urlField,
  preview_url: urlField,
  wav_url: urlField,
  stems_url: urlField,
});

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado");
  return supabaseAdmin;
}

async function uniqueSlug(
  supabaseAdmin: Awaited<ReturnType<typeof assertAdmin>>,
  base: string,
  ignoreId?: string,
) {
  let candidate = base || "beat";
  let i = 1;
  for (;;) {
    let q = supabaseAdmin.from("beats").select("id").eq("slug", candidate);
    if (ignoreId) q = q.neq("id", ignoreId);
    const { data, error } = await q.maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;
    i += 1;
    candidate = `${base}-${i}`;
  }
}

async function assertProducerActive(
  supabaseAdmin: Awaited<ReturnType<typeof assertAdmin>>,
  produtoraId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("producers")
    .select("id, status")
    .eq("id", produtoraId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Produtora não encontrada");
  if (data.status !== "ativa") throw new Error("Produtora está inativa");
}

export const listBeats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        search: z.string().trim().max(160).optional(),
        status: z.enum(["rascunho", "ativo", "vendido", "todas"]).default("todas"),
        produtoraId: z.string().uuid().optional(),
        sort: z.enum(["nome", "created_at"]).default("created_at"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabaseAdmin
      .from("beats")
      .select("*", { count: "exact" })
      .order(data.sort, { ascending: data.sort === "nome" })
      .range(from, to);
    if (data.status !== "todas") q = q.eq("status", data.status);
    if (data.produtoraId) q = q.eq("produtora_id", data.produtoraId);
    if (data.search) q = q.ilike("nome", `%${data.search}%`);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((rows ?? []).map((r) => r.produtora_id)));
    let producerMap = new Map<string, { nome_artistico: string }>();
    if (ids.length) {
      const { data: producers, error: pErr } = await supabaseAdmin
        .from("producers")
        .select("id, nome_artistico")
        .in("id", ids);
      if (pErr) throw new Error(pErr.message);
      producerMap = new Map(producers?.map((p) => [p.id, { nome_artistico: p.nome_artistico }]));
    }

    const enriched = (rows ?? []).map((r) => ({
      ...r,
      produtora_nome: producerMap.get(r.produtora_id)?.nome_artistico ?? "—",
    }));
    return { rows: enriched, total: count ?? 0 };
  });

export const getBeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("beats")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Beat não encontrado");
    return row;
  });

export const createBeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => beatInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    await assertProducerActive(supabaseAdmin, data.produtora_id);
    const baseSlug = data.slug || slugify(data.nome);
    const slug = await uniqueSlug(supabaseAdmin, baseSlug);
    const { data: inserted, error } = await supabaseAdmin
      .from("beats")
      .insert({
        produtora_id: data.produtora_id,
        nome: data.nome,
        slug,
        genero: data.genero,
        bpm: data.bpm ?? null,
        tom: data.tom,
        mood: data.mood,
        preco: data.preco ?? null,
        descricao: data.descricao,
        status: data.status,
        capa_url: data.capa_url,
        preview_url: data.preview_url,
        wav_url: data.wav_url,
        stems_url: data.stems_url,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const updateBeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid() }).merge(beatInputSchema.partial()).parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { id, ...rest } = data;
    if (rest.produtora_id) await assertProducerActive(supabaseAdmin, rest.produtora_id);

    const patch = { ...rest } as typeof rest & { slug?: string };
    if (rest.slug !== undefined) {
      const base = rest.slug || (rest.nome ? slugify(rest.nome) : "");
      patch.slug = await uniqueSlug(supabaseAdmin, base, id);
    }

    const { data: updated, error } = await supabaseAdmin
      .from("beats")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const setBeatStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(["rascunho", "ativo", "vendido"]) })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("beats")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listProducersForSelect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("producers")
      .select("id, nome_artistico, status")
      .eq("status", "ativa")
      .order("nome_artistico", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
