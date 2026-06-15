import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify } from "@/lib/slug";

const COVER_BUCKET = "beat-covers";
const PREVIEW_BUCKET = "beat-previews";
const WAV_BUCKET = "beat-wav";
const STEMS_BUCKET = "beat-stems";
const LICENSE_BUCKET = "beat-licenses";

export const BEAT_PRIVATE_BUCKETS = {
  wav: WAV_BUCKET,
  stems: STEMS_BUCKET,
  license: LICENSE_BUCKET,
} as const;
export type BeatPrivateKind = keyof typeof BEAT_PRIVATE_BUCKETS;

const urlField = z
  .string()
  .trim()
  .max(500)
  .url("URL inválida")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

const pathField = z.string().trim().max(300).optional().nullable();

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
  tipo: z.enum(["fechado", "aberto"]).default("fechado"),
  descricao: z.string().trim().max(2000).optional().transform((v) => v || null),
  status: z.enum(["rascunho", "ativo", "vendido"]).default("rascunho"),
  capa_url: urlField,
  capa_path: pathField,
  preview_url: urlField,
  preview_path: pathField,
  wav_url: urlField,
  stems_url: urlField,
  wav_path: pathField,
  stems_path: pathField,
  license_path: pathField,
});

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role, active")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("active", true)
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

async function signFromBucket(
  supabaseAdmin: Awaited<ReturnType<typeof assertAdmin>>,
  bucket: string,
  path: string | null,
  ttl = 60 * 60,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, ttl);
  if (error) return null;
  return data.signedUrl;
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

    const enriched = await Promise.all(
      (rows ?? []).map(async (r) => ({
        ...r,
        produtora_nome: producerMap.get(r.produtora_id)?.nome_artistico ?? "—",
        capa_signed_url: await signFromBucket(supabaseAdmin, COVER_BUCKET, r.capa_path),
        preview_signed_url: await signFromBucket(supabaseAdmin, PREVIEW_BUCKET, r.preview_path),
      })),
    );
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
    return {
      ...row,
      capa_signed_url: await signFromBucket(supabaseAdmin, COVER_BUCKET, row.capa_path),
      preview_signed_url: await signFromBucket(supabaseAdmin, PREVIEW_BUCKET, row.preview_path),
    };
  });

async function removeIfChanged(
  supabaseAdmin: Awaited<ReturnType<typeof assertAdmin>>,
  bucket: string,
  oldPath: string | null | undefined,
  newPath: string | null | undefined,
) {
  if (oldPath && oldPath !== newPath) {
    await supabaseAdmin.storage.from(bucket).remove([oldPath]);
  }
}

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
        preco: data.preco ?? (data.tipo === "aberto" ? 150 : 100),
        tipo: data.tipo,
        descricao: data.descricao,
        status: data.status,
        capa_url: data.capa_url,
        capa_path: data.capa_path ?? null,
        preview_url: data.preview_url,
        preview_path: data.preview_path ?? null,
        wav_url: data.wav_url,
        stems_url: data.stems_url,
        wav_path: data.wav_path ?? null,
        stems_path: data.stems_path ?? null,
        license_path: data.license_path ?? null,
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

    const privateFields = ["capa_path", "preview_path", "wav_path", "stems_path", "license_path"] as const;
    const anyPrivateChanged = privateFields.some((f) => rest[f] !== undefined);
    if (anyPrivateChanged) {
      const { data: existing } = await supabaseAdmin
        .from("beats")
        .select("capa_path, preview_path, wav_path, stems_path, license_path")
        .eq("id", id)
        .maybeSingle();
      const bucketMap: Record<(typeof privateFields)[number], string> = {
        capa_path: COVER_BUCKET,
        preview_path: PREVIEW_BUCKET,
        wav_path: WAV_BUCKET,
        stems_path: STEMS_BUCKET,
        license_path: LICENSE_BUCKET,
      };
      for (const f of privateFields) {
        if (rest[f] !== undefined) {
          await removeIfChanged(supabaseAdmin, bucketMap[f], existing?.[f], rest[f]);
        }
      }
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

export const deleteBeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);

    const { data: existing, error: getErr } = await supabaseAdmin
      .from("beats")
      .select("capa_path, preview_path")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);

    const { error } = await supabaseAdmin.from("beats").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    if (existing?.capa_path) {
      await supabaseAdmin.storage.from(COVER_BUCKET).remove([existing.capa_path]);
    }
    if (existing?.preview_path) {
      await supabaseAdmin.storage.from(PREVIEW_BUCKET).remove([existing.preview_path]);
    }
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

export const getBeatCoverUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        ext: z.enum(["jpg", "jpeg", "png", "webp"]),
        beatId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const folder = data.beatId ?? "new";
    const path = `beats/${folder}/cover-${Date.now()}.${data.ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from(COVER_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token };
  });

export const getBeatPreviewUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        contentType: z.enum(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave"]),
        ext: z.enum(["mp3", "wav"]),
        beatId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const folder = data.beatId ?? "new";
    const path = `beats/${folder}/preview-${Date.now()}.${data.ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from(PREVIEW_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token };
  });

// ===== Arquivos privados do beat (WAV / STEMS / Licença) =====
const privateKindSchema = z.enum(["wav", "stems", "license"]);

const PRIVATE_RULES: Record<
  BeatPrivateKind,
  { bucket: string; exts: readonly string[]; maxBytes: number }
> = {
  wav: { bucket: WAV_BUCKET, exts: ["wav"], maxBytes: 250 * 1024 * 1024 },
  stems: { bucket: STEMS_BUCKET, exts: ["zip"], maxBytes: 500 * 1024 * 1024 },
  license: { bucket: LICENSE_BUCKET, exts: ["pdf"], maxBytes: 20 * 1024 * 1024 },
};

export const getBeatPrivateUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        kind: privateKindSchema,
        ext: z.string().trim().toLowerCase().max(8),
        beatId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const rule = PRIVATE_RULES[data.kind];
    if (!rule.exts.includes(data.ext)) {
      throw new Error(`Extensão inválida. Use: ${rule.exts.join(", ")}`);
    }
    const folder = data.beatId ?? "new";
    const path = `beats/${folder}/${data.kind}-${Date.now()}.${data.ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from(rule.bucket)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, bucket: rule.bucket };
  });

export const removeBeatPrivateFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        beatId: z.string().uuid(),
        kind: privateKindSchema,
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const col = `${data.kind}_path` as const;
    const { data: row } = await supabaseAdmin
      .from("beats")
      .select(col)
      .eq("id", data.beatId)
      .maybeSingle();
    const oldPath = (row as Record<string, string | null> | null)?.[col] ?? null;
    if (oldPath) {
      await supabaseAdmin.storage.from(PRIVATE_RULES[data.kind].bucket).remove([oldPath]);
    }
    const patch = { [col]: null } as unknown as { wav_path?: null; stems_path?: null; license_path?: null };
    const { error } = await supabaseAdmin
      .from("beats")
      .update(patch)
      .eq("id", data.beatId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const signBeatMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        capa_path: z.string().max(300).optional().nullable(),
        preview_path: z.string().max(300).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    return {
      capa_signed_url: await signFromBucket(supabaseAdmin, COVER_BUCKET, data.capa_path ?? null),
      preview_signed_url: await signFromBucket(
        supabaseAdmin,
        PREVIEW_BUCKET,
        data.preview_path ?? null,
      ),
    };
  });

export const getAdminMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const [
      producersTotal,
      producersActive,
      beatsTotal,
      beatsAtivos,
      beatsVendidos,
      beatsRascunho,
      leadsTotal,
      leadsNovos,
      leadsNegociacao,
      leadsConvertidos,
    ] = await Promise.all([
      supabaseAdmin.from("producers").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("producers")
        .select("id", { count: "exact", head: true })
        .eq("status", "ativa"),
      supabaseAdmin.from("beats").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("beats")
        .select("id", { count: "exact", head: true })
        .eq("status", "ativo"),
      supabaseAdmin
        .from("beats")
        .select("id", { count: "exact", head: true })
        .eq("status", "vendido"),
      supabaseAdmin
        .from("beats")
        .select("id", { count: "exact", head: true })
        .eq("status", "rascunho"),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "novo"),
      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "negociacao"),
      supabaseAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .in("status", ["pago", "entregue"]),
    ]);
    return {
      produtorasTotal: producersTotal.count ?? 0,
      produtorasAtivas: producersActive.count ?? 0,
      beatsTotal: beatsTotal.count ?? 0,
      beatsAtivos: beatsAtivos.count ?? 0,
      beatsVendidos: beatsVendidos.count ?? 0,
      beatsRascunho: beatsRascunho.count ?? 0,
      leadsTotal: leadsTotal.count ?? 0,
      leadsNovos: leadsNovos.count ?? 0,
      leadsNegociacao: leadsNegociacao.count ?? 0,
      leadsConvertidos: leadsConvertidos.count ?? 0,
    };
  });

