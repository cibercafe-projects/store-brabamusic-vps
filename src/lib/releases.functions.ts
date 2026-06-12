import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  RELEASE_STATUSES,
  MAX_PROMO_PHOTOS,
  type ReleaseStatus,
  type ReleaseType,
} from "@/lib/releases.constants";

const COVER_BUCKET = "release-covers";
const AUDIO_BUCKET = "release-audio";
const PHOTOS_BUCKET = "release-photos";

const MIN_SUBMIT_SECONDS = 4; // anti-bot

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(userId: string) {
  const admin = await getAdmin();
  const { data, error } = await admin
    .from("user_roles")
    .select("role, active")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("active", true)
    .maybeSingle();
  if (error) {
    console.error("[releases] role check", error);
    throw new Error("Erro interno. Tente novamente.");
  }
  if (!data) throw new Error("Acesso negado");
  return admin;
}

async function signFromBucket(
  admin: Awaited<ReturnType<typeof getAdmin>>,
  bucket: string,
  path: string | null,
  ttl = 60 * 60,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, ttl);
  if (error) return null;
  return data.signedUrl;
}

// ---------- Upload URLs (public) ----------

const uploadKinds = z.enum(["cover", "audio", "photo"]);

const IMAGE_CT = ["image/jpeg", "image/png", "image/webp"] as const;
const AUDIO_CT = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
] as const;

export const getReleaseUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        kind: uploadKinds,
        ext: z.enum(["jpg", "jpeg", "png", "webp", "wav", "mp3"]),
        contentType: z.string().min(3).max(80),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    let bucket: string;
    if (data.kind === "cover" || data.kind === "photo") {
      if (!IMAGE_CT.includes(data.contentType as (typeof IMAGE_CT)[number]))
        throw new Error("Tipo de imagem inválido.");
      if (!["jpg", "jpeg", "png", "webp"].includes(data.ext))
        throw new Error("Extensão de imagem inválida.");
      bucket = data.kind === "cover" ? COVER_BUCKET : PHOTOS_BUCKET;
    } else {
      if (!AUDIO_CT.includes(data.contentType as (typeof AUDIO_CT)[number]))
        throw new Error("Tipo de áudio inválido.");
      if (!["wav", "mp3"].includes(data.ext)) throw new Error("Use WAV ou MP3.");
      bucket = AUDIO_BUCKET;
    }
    const admin = await getAdmin();
    const folder = new Date().toISOString().slice(0, 10);
    const path = `incoming/${folder}/${crypto.randomUUID()}.${data.ext}`;
    const { data: signed, error } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, bucket };
  });

// ---------- Submit (public) ----------

const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
const isrcRegex = /^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/i;

const audioFileSchema = z.object({
  path: z.string().min(3).max(300),
  original_name: z.string().min(1).max(200),
  size_bytes: z.number().int().min(1).max(150 * 1024 * 1024),
  format: z.enum(["wav", "mp3"]),
});

const submitSchema = z
  .object({
    email: z.string().trim().email("E-mail inválido").max(255),
    full_name: z.string().trim().min(3).max(160),
    cpf: z.string().trim().regex(cpfRegex, "CPF inválido"),
    artist_name: z.string().trim().min(2).max(160),
    release_type: z.enum(["single", "ep", "album"]),
    release_name: z.string().trim().min(1).max(200),
    lyrics: z.string().trim().min(1).max(10000),
    isrc: z.string().trim().regex(isrcRegex, "ISRC inválido").max(20),
    cover_path: z.string().min(3).max(300),
    genres: z.array(z.string().max(60)).min(1, "Selecione ao menos 1 gênero").max(10),
    moods: z.array(z.string().max(60)).min(1, "Selecione ao menos 1 mood").max(10),
    instruments: z.array(z.string().max(60)).max(20).default([]),
    technical_sheet: z.string().trim().min(1).max(5000),
    royalties: z.string().trim().min(1).max(2000),
    about_artist: z.string().trim().min(1).max(5000),
    about_release: z.string().trim().min(1).max(5000),
    has_videoclip: z.boolean(),
    audio_files: z.array(audioFileSchema).min(1).max(30),
    promo_photos: z
      .array(z.object({ path: z.string().min(3).max(300) }))
      .max(MAX_PROMO_PHOTOS)
      .default([]),
    // anti-spam
    website: z.string().max(0, "Bot").optional().default(""),
    started_at: z.number().int().positive(),
  })
  .refine(
    (v) =>
      v.release_type === "single"
        ? v.audio_files.length === 1
        : v.audio_files.length >= 1,
    { message: "Single deve ter exatamente 1 arquivo de áudio.", path: ["audio_files"] },
  );

export const submitRelease = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    // anti-spam
    if (data.website && data.website.length > 0) throw new Error("Falha na validação.");
    const elapsed = (Date.now() - data.started_at) / 1000;
    if (elapsed < MIN_SUBMIT_SECONDS) {
      throw new Error("Formulário enviado rápido demais. Tente novamente.");
    }

    const admin = await getAdmin();

    const { data: inserted, error } = await admin
      .from("releases")
      .insert({
        email: data.email.toLowerCase(),
        full_name: data.full_name,
        cpf: data.cpf,
        artist_name: data.artist_name,
        release_type: data.release_type,
        release_name: data.release_name,
        lyrics: data.lyrics,
        isrc: data.isrc.toUpperCase(),
        cover_path: data.cover_path,
        genres: data.genres,
        moods: data.moods,
        instruments: data.instruments,
        technical_sheet: data.technical_sheet,
        royalties: data.royalties,
        about_artist: data.about_artist,
        about_release: data.about_release,
        has_videoclip: data.has_videoclip,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[releases.submit]", error);
      throw new Error("Não foi possível registrar o lançamento. Tente novamente.");
    }

    const releaseId = inserted.id;

    if (data.audio_files.length) {
      const { error: aErr } = await admin.from("release_audio_files").insert(
        data.audio_files.map((f, i) => ({
          release_id: releaseId,
          path: f.path,
          original_name: f.original_name,
          size_bytes: f.size_bytes,
          format: f.format,
          order_index: i,
        })),
      );
      if (aErr) console.error("[releases.audio]", aErr);
    }

    if (data.promo_photos.length) {
      const { error: pErr } = await admin.from("release_promo_photos").insert(
        data.promo_photos.map((f, i) => ({
          release_id: releaseId,
          path: f.path,
          order_index: i,
        })),
      );
      if (pErr) console.error("[releases.photos]", pErr);
    }

    return { ok: true, releaseId };
  });

// ---------- Admin ----------

export const listReleases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(RELEASE_STATUSES).optional(),
        search: z.string().trim().max(160).optional(),
      })
      .default({})
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    let q = admin
      .from("releases")
      .select(
        "id, created_at, artist_name, release_name, release_type, status, email",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) {
      const s = data.search.replace(/[%_,()]/g, " ").trim();
      if (s) q = q.or(`artist_name.ilike.%${s}%,release_name.ilike.%${s}%,email.ilike.%${s}%`);
    }
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const getRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { data: row, error } = await admin
      .from("releases")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Lançamento não encontrado");

    const [{ data: audios }, { data: photos }] = await Promise.all([
      admin
        .from("release_audio_files")
        .select("*")
        .eq("release_id", data.id)
        .order("order_index", { ascending: true }),
      admin
        .from("release_promo_photos")
        .select("*")
        .eq("release_id", data.id)
        .order("order_index", { ascending: true }),
    ]);

    const cover_url = await signFromBucket(admin, COVER_BUCKET, row.cover_path);
    const audio_files = await Promise.all(
      (audios ?? []).map(async (a) => ({
        ...a,
        signed_url: await signFromBucket(admin, AUDIO_BUCKET, a.path, 60 * 60 * 2),
      })),
    );
    const promo_photos = await Promise.all(
      (photos ?? []).map(async (p) => ({
        ...p,
        signed_url: await signFromBucket(admin, PHOTOS_BUCKET, p.path),
      })),
    );

    return { ...row, cover_url, audio_files, promo_photos };
  });

export const updateReleaseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(RELEASE_STATUSES) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { error } = await admin
      .from("releases")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const countNewReleases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context.userId);
    const { count } = await admin
      .from("releases")
      .select("id", { count: "exact", head: true })
      .eq("status", "recebido");
    return { count: count ?? 0 };
  });

export type { ReleaseStatus, ReleaseType };
