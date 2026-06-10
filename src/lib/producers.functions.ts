import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify } from "@/lib/slug";

const BUCKET = "producer-avatars";

const handleSchema = z
  .string()
  .trim()
  .max(60)
  .regex(/^@?[A-Za-z0-9._-]{1,40}$/u, "Formato inválido")
  .optional()
  .or(z.literal(""))
  .transform((v) => {
    if (!v) return null;
    const cleaned = v.replace(/^https?:\/\/[^/]+\//i, "").replace(/^@/, "");
    return "@" + cleaned;
  });

const producerInputSchema = z.object({
  nome_artistico: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,60}$/, "Slug inválido")
    .optional(),
  instagram: handleSchema,
  spotify: handleSchema,
  cidade: z.string().trim().max(80).optional().transform((v) => v || null),
  bio: z.string().trim().max(2000).optional().transform((v) => v || null),
  status: z.enum(["ativa", "inativa"]).default("ativa"),
  foto_perfil_path: z.string().max(300).optional().nullable(),
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

async function uniqueSlug(supabaseAdmin: Awaited<ReturnType<typeof assertAdmin>>, base: string, ignoreId?: string) {
  let candidate = base || "produtora";
  let i = 1;
  for (;;) {
    let q = supabaseAdmin.from("producers").select("id").eq("slug", candidate);
    if (ignoreId) q = q.neq("id", ignoreId);
    const { data, error } = await q.maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;
    i += 1;
    candidate = `${base}-${i}`;
  }
}

async function signAvatar(
  supabaseAdmin: Awaited<ReturnType<typeof assertAdmin>>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export const listProducers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        search: z.string().trim().max(120).optional(),
        status: z.enum(["ativa", "inativa", "todas"]).default("todas"),
        sort: z.enum(["nome_artistico", "created_at"]).default("created_at"),
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
      .from("producers")
      .select("*", { count: "exact" })
      .order(data.sort, { ascending: data.sort === "nome_artistico" })
      .range(from, to);
    if (data.status !== "todas") q = q.eq("status", data.status);
    if (data.search) q = q.ilike("nome_artistico", `%${data.search}%`);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    const withSigned = await Promise.all(
      (rows ?? []).map(async (r) => ({
        ...r,
        foto_perfil_signed_url: await signAvatar(supabaseAdmin, r.foto_perfil_path),
      })),
    );
    return { rows: withSigned, total: count ?? 0 };
  });

export const getProducer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("producers")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Produtora não encontrada");
    return { ...row, foto_perfil_signed_url: await signAvatar(supabaseAdmin, row.foto_perfil_path) };
  });

export const createProducer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => producerInputSchema.parse(input))
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const baseSlug = data.slug || slugify(data.nome_artistico);
    const slug = await uniqueSlug(supabaseAdmin, baseSlug);
    const { data: inserted, error } = await supabaseAdmin
      .from("producers")
      .insert({
        nome_artistico: data.nome_artistico,
        slug,
        instagram: data.instagram,
        spotify: data.spotify,
        cidade: data.cidade,
        bio: data.bio,
        status: data.status,
        foto_perfil_path: data.foto_perfil_path ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const updateProducer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid() })
      .merge(producerInputSchema.partial())
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { id, ...rest } = data;

    const patch = { ...rest } as typeof rest & { slug?: string };
    if (rest.slug !== undefined) {
      const base = rest.slug || (rest.nome_artistico ? slugify(rest.nome_artistico) : "");
      patch.slug = await uniqueSlug(supabaseAdmin, base, id);
    }

    // Apaga foto antiga se path mudou
    if (rest.foto_perfil_path !== undefined) {
      const { data: existing } = await supabaseAdmin
        .from("producers")
        .select("foto_perfil_path")
        .eq("id", id)
        .maybeSingle();
      const old = existing?.foto_perfil_path;
      if (old && old !== rest.foto_perfil_path) {
        await supabaseAdmin.storage.from(BUCKET).remove([old]);
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from("producers")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const setProducerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), status: z.enum(["ativa", "inativa"]) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("producers")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProducer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);

    const { count: beatsCount, error: countErr } = await supabaseAdmin
      .from("beats")
      .select("id", { count: "exact", head: true })
      .eq("produtora_id", data.id);
    if (countErr) throw new Error(countErr.message);
    if ((beatsCount ?? 0) > 0) {
      throw new Error(
        `Não é possível excluir: a produtora possui ${beatsCount} beat(s) vinculado(s). Remova ou reatribua os beats antes.`,
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("producers")
      .select("foto_perfil_path")
      .eq("id", data.id)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("producers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    if (existing?.foto_perfil_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([existing.foto_perfil_path]);
    }

    return { ok: true };
  });

export const getAvatarUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        ext: z.enum(["jpg", "jpeg", "png", "webp"]),
        producerId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const folder = data.producerId ?? "new";
    const path = `producers/${folder}/avatar-${Date.now()}.${data.ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });
