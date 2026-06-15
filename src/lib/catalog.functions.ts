import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const COVER_BUCKET = "beat-covers";
const PREVIEW_BUCKET = "beat-previews";
const AVATAR_BUCKET = "producer-avatars";
const SIGN_TTL = 60 * 60 * 4; // 4h

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function sign(
  admin: Awaited<ReturnType<typeof getAdmin>>,
  bucket: string,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, SIGN_TTL);
  if (error) return null;
  return data.signedUrl;
}

const escapeIlike = (s: string) => s.replace(/[%_,()]/g, " ").trim();

const listInput = z
  .object({
    search: z.string().trim().max(160).optional(),
    genero: z.string().trim().max(60).optional(),
    produtoraSlug: z.string().trim().max(80).optional(),
    bpmMin: z.number().int().min(40).max(300).optional(),
    bpmMax: z.number().int().min(40).max(300).optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(48).default(24),
  })
  .default({});

export const listPublicBeats = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let producerFilterId: string | null = null;
    if (data.produtoraSlug) {
      const { data: prod } = await admin
        .from("producers")
        .select("id")
        .eq("slug", data.produtoraSlug)
        .eq("status", "ativa")
        .maybeSingle();
      if (!prod) return { rows: [], total: 0 };
      producerFilterId = prod.id;
    }

    let q = admin
      .from("beats")
      .select(
        "id,slug,nome,genero,bpm,tom,mood,preco,tipo,descricao,capa_url,capa_path,preview_url,preview_path,produtora_id,created_at,plays_count",
        { count: "exact" },
      )
      .eq("status", "ativo")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data.genero) q = q.eq("genero", data.genero);
    if (producerFilterId) q = q.eq("produtora_id", producerFilterId);
    if (data.bpmMin !== undefined) q = q.gte("bpm", data.bpmMin);
    if (data.bpmMax !== undefined) q = q.lte("bpm", data.bpmMax);

    if (data.search) {
      const s = escapeIlike(data.search);
      if (s) {
        const { data: prodMatches } = await admin
          .from("producers")
          .select("id")
          .ilike("nome_artistico", `%${s}%`)
          .eq("status", "ativa");
        const ors = [`nome.ilike.%${s}%`, `genero.ilike.%${s}%`, `mood.ilike.%${s}%`];
        if (prodMatches && prodMatches.length) {
          ors.push(`produtora_id.in.(${prodMatches.map((p) => p.id).join(",")})`);
        }
        q = q.or(ors.join(","));
      }
    }

    const { data: rows, error, count } = await q;
    if (error) { console.error('catalog error', error); throw new Error('Não foi possível carregar o conteúdo. Tente novamente em instantes.'); }

    const ids = Array.from(new Set((rows ?? []).map((r) => r.produtora_id)));
    const prodMap = new Map<string, { nome_artistico: string; slug: string }>();
    if (ids.length) {
      const { data: ps } = await admin
        .from("producers")
        .select("id, nome_artistico, slug")
        .in("id", ids);
      ps?.forEach((p) => prodMap.set(p.id, { nome_artistico: p.nome_artistico, slug: p.slug }));
    }

    const enriched = await Promise.all(
      (rows ?? []).map(async (r) => ({
        id: r.id,
        slug: r.slug,
        nome: r.nome,
        genero: r.genero,
        bpm: r.bpm,
        tom: r.tom,
        mood: r.mood,
        preco: r.preco != null ? Number(r.preco) : null,
        tipo: (r.tipo ?? "fechado") as "fechado" | "aberto",
        descricao: r.descricao,
        produtora_id: r.produtora_id,
        produtora_nome: prodMap.get(r.produtora_id)?.nome_artistico ?? "—",
        produtora_slug: prodMap.get(r.produtora_id)?.slug ?? "",
        capa_url: r.capa_path
          ? await sign(admin, COVER_BUCKET, r.capa_path)
          : (r.capa_url ?? null),
        preview_url: r.preview_path
          ? await sign(admin, PREVIEW_BUCKET, r.preview_path)
          : (r.preview_url ?? null),
        plays_count: r.plays_count ?? 0,
      })),
    );

    return { rows: enriched, total: count ?? 0 };
  });

export const getPublicBeatBySlug = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().trim().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    const { data: row, error } = await admin
      .from("beats")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "ativo")
      .maybeSingle();
    if (error) { console.error('catalog error', error); throw new Error('Não foi possível carregar o conteúdo. Tente novamente em instantes.'); }
    if (!row) return null;

    const { data: prod } = await admin
      .from("producers")
      .select("id, slug, nome_artistico, cidade, bio, instagram, spotify, foto_perfil_path, status")
      .eq("id", row.produtora_id)
      .maybeSingle();

    return {
      beat: {
        id: row.id,
        slug: row.slug,
        nome: row.nome,
        genero: row.genero,
        bpm: row.bpm,
        tom: row.tom,
        mood: row.mood,
        preco: row.preco != null ? Number(row.preco) : null,
        tipo: (row.tipo ?? "fechado") as "fechado" | "aberto",
        descricao: row.descricao,
        produtora_id: row.produtora_id,
        produtora_nome: prod?.nome_artistico ?? "—",
        produtora_slug: prod?.slug ?? "",
        capa_url: row.capa_path
          ? await sign(admin, COVER_BUCKET, row.capa_path)
          : (row.capa_url ?? null),
        preview_url: row.preview_path
          ? await sign(admin, PREVIEW_BUCKET, row.preview_path)
          : (row.preview_url ?? null),
        plays_count: row.plays_count ?? 0,
      },
      produtora: prod
        ? {
            id: prod.id,
            slug: prod.slug,
            nome_artistico: prod.nome_artistico,
            cidade: prod.cidade,
            bio: prod.bio,
            instagram: prod.instagram,
            spotify: prod.spotify,
            foto_url: await sign(admin, AVATAR_BUCKET, prod.foto_perfil_path),
            beats_count: 0,
          }
        : null,
    };
  });

export const listPublicProducers = createServerFn({ method: "POST" }).handler(async () => {
  const admin = await getAdmin();
  const { data: producers, error } = await admin
    .from("producers")
    .select("id, slug, nome_artistico, cidade, bio, instagram, spotify, foto_perfil_path")
    .eq("status", "ativa")
    .order("nome_artistico", { ascending: true });
  if (error) { console.error('catalog error', error); throw new Error('Não foi possível carregar o conteúdo. Tente novamente em instantes.'); }
  const { data: beatRows } = await admin
    .from("beats")
    .select("produtora_id")
    .eq("status", "ativo");
  const counts = new Map<string, number>();
  beatRows?.forEach((b) => counts.set(b.produtora_id, (counts.get(b.produtora_id) ?? 0) + 1));
  return await Promise.all(
    (producers ?? []).map(async (p) => ({
      id: p.id,
      slug: p.slug,
      nome_artistico: p.nome_artistico,
      cidade: p.cidade,
      bio: p.bio,
      instagram: p.instagram,
      spotify: p.spotify,
      foto_url: await sign(admin, AVATAR_BUCKET, p.foto_perfil_path),
      beats_count: counts.get(p.id) ?? 0,
    })),
  );
});

export const getPublicProducerBySlug = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().trim().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    const { data: prod, error } = await admin
      .from("producers")
      .select("id, slug, nome_artistico, cidade, bio, instagram, spotify, foto_perfil_path, status")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) { console.error('catalog error', error); throw new Error('Não foi possível carregar o conteúdo. Tente novamente em instantes.'); }
    if (!prod || prod.status !== "ativa") return null;

    const { data: beats } = await admin
      .from("beats")
      .select(
        "id,slug,nome,genero,bpm,tom,mood,preco,tipo,descricao,capa_url,capa_path,preview_url,preview_path,produtora_id,created_at,plays_count",
      )
      .eq("produtora_id", prod.id)
      .eq("status", "ativo")
      .order("created_at", { ascending: false });

    const enrichedBeats = await Promise.all(
      (beats ?? []).map(async (r) => ({
        id: r.id,
        slug: r.slug,
        nome: r.nome,
        genero: r.genero,
        bpm: r.bpm,
        tom: r.tom,
        mood: r.mood,
        preco: r.preco != null ? Number(r.preco) : null,
        tipo: (r.tipo ?? "fechado") as "fechado" | "aberto",
        descricao: r.descricao,
        produtora_id: r.produtora_id,
        produtora_nome: prod.nome_artistico,
        produtora_slug: prod.slug,
        capa_url: r.capa_path
          ? await sign(admin, COVER_BUCKET, r.capa_path)
          : (r.capa_url ?? null),
        preview_url: r.preview_path
          ? await sign(admin, PREVIEW_BUCKET, r.preview_path)
          : (r.preview_url ?? null),
        plays_count: r.plays_count ?? 0,
      })),
    );

    return {
      produtora: {
        id: prod.id,
        slug: prod.slug,
        nome_artistico: prod.nome_artistico,
        cidade: prod.cidade,
        bio: prod.bio,
        instagram: prod.instagram,
        spotify: prod.spotify,
        foto_url: await sign(admin, AVATAR_BUCKET, prod.foto_perfil_path),
        beats_count: enrichedBeats.length,
      },
      beats: enrichedBeats,
    };
  });

export const listPublicFilters = createServerFn({ method: "POST" }).handler(async () => {
  const admin = await getAdmin();
  const { data: beats } = await admin
    .from("beats")
    .select("genero, produtora_id")
    .eq("status", "ativo");
  const generos = new Set<string>();
  const producerIds = new Set<string>();
  beats?.forEach((b) => {
    if (b.genero) generos.add(b.genero);
    if (b.produtora_id) producerIds.add(b.produtora_id);
  });
  let produtoras: { slug: string; nome_artistico: string }[] = [];
  if (producerIds.size) {
    const { data: ps } = await admin
      .from("producers")
      .select("slug, nome_artistico")
      .in("id", Array.from(producerIds))
      .eq("status", "ativa")
      .order("nome_artistico");
    produtoras = ps ?? [];
  }
  return {
    generos: Array.from(generos).sort(),
    produtoras,
  };
});

export const incrementBeatPlays = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ beatId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    const { data: count, error } = await admin.rpc("increment_beat_plays", {
      _beat_id: data.beatId,
    });
    if (error) return { plays_count: 0 };
    return { plays_count: (count as number) ?? 0 };
  });
