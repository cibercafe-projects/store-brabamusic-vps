import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  RELEASE_STATUSES,
  RELEASE_STATUS_LABEL,
  MAX_PROMO_PHOTOS,
  type ReleaseStatus,
  type ReleaseType,
} from "@/lib/releases.constants";
import { sendAppEmailSafe, getAdminNotificationEmail } from "@/lib/email/send.server";

const PUBLIC_SITE_URL = "https://brababeats.app";

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

// Upload de arquivos públicos foi removido: o formulário usa Google Drive URLs.
// Mantemos somente o fluxo admin para assinar URLs de leitura via signFromBucket.



// ---------- Submit (public) ----------

const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
const driveUrlRegex = /^https?:\/\/(drive|docs)\.google\.com\//i;

const submitSchema = z
  .object({
    email: z.string().trim().email("E-mail inválido").max(255),
    full_name: z.string().trim().min(3).max(160),
    cpf: z.string().trim().regex(cpfRegex, "CPF inválido"),
    whatsapp: z
      .string()
      .trim()
      .min(8, "WhatsApp obrigatório")
      .max(20, "WhatsApp inválido"),
    artist_name: z.string().trim().min(2).max(160),
    release_type: z.enum(["single", "ep", "album"]),
    release_name: z.string().trim().min(1).max(200),
    tracklist: z.string().trim().max(5000).optional().default(""),
    lyrics: z.string().trim().max(20000).optional().default(""),
    lyrics_drive_url: z
      .string()
      .trim()
      .url("Informe uma URL válida")
      .max(500)
      .regex(driveUrlRegex, "Use um link do Google Drive"),
    isrc: z.string().trim().max(2000).optional().default(""),
    audio_drive_url: z
      .string()
      .trim()
      .url("Informe uma URL válida")
      .max(500)
      .regex(driveUrlRegex, "Use um link do Google Drive"),
    cover_drive_url: z
      .string()
      .trim()
      .url("Informe uma URL válida")
      .max(500)
      .regex(driveUrlRegex, "Use um link do Google Drive"),
    photos_drive_url: z
      .string()
      .trim()
      .max(500)
      .optional()
      .default("")
      .refine((v) => !v || driveUrlRegex.test(v), "Use um link do Google Drive"),
    genres: z.array(z.string().max(60)).min(1, "Selecione ao menos 1 gênero").max(10),
    moods: z.array(z.string().max(60)).min(1, "Selecione ao menos 1 mood").max(10),
    instruments: z.array(z.string().max(60)).max(20).default([]),
    technical_sheet: z.string().trim().min(1).max(5000),
    royalties: z.string().trim().min(1).max(2000),
    about_artist: z.string().trim().min(1).max(5000),
    about_release: z.string().trim().min(1).max(5000),
    has_videoclip: z.boolean(),
    ai_on_cover: z.boolean().default(false),
    ai_on_music: z.boolean().default(false),
    ai_music_details: z.string().trim().max(2000).optional().default(""),
    faixa_foco: z.string().trim().max(200).optional().default(""),
    suggested_release_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de lançamento obrigatória"),
    // anti-spam
    website: z.string().max(0, "Bot").optional().default(""),
    started_at: z.number().int().positive(),
  })
  .refine(
    (v) => (v.release_type === "single" ? true : v.tracklist.length > 0),
    { message: "Liste as músicas do EP/Álbum.", path: ["tracklist"] },
  )
  .refine(
    (v) => (v.release_type === "single" ? true : v.faixa_foco.length > 0),
    { message: "Informe a faixa foco do EP/Álbum.", path: ["faixa_foco"] },
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
        whatsapp: data.whatsapp.replace(/[^\d+]/g, ""),
        artist_name: data.artist_name,
        release_type: data.release_type,
        release_name: data.release_name,
        tracklist: data.tracklist || null,
        lyrics: data.lyrics || null,
        lyrics_drive_url: data.lyrics_drive_url,
        isrc: data.isrc ? data.isrc.toUpperCase() : null,
        audio_drive_url: data.audio_drive_url,
        cover_drive_url: data.cover_drive_url,
        photos_drive_url: data.photos_drive_url || null,
        genres: data.genres,
        moods: data.moods,
        instruments: data.instruments,
        technical_sheet: data.technical_sheet,
        royalties: data.royalties,
        about_artist: data.about_artist,
        about_release: data.about_release,
        has_videoclip: data.has_videoclip,
        faixa_foco: data.faixa_foco || null,
        suggested_release_date: data.suggested_release_date || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[releases.submit]", error);
      throw new Error("Não foi possível registrar o lançamento. Tente novamente.");
    }

    // Notificações
    try {
      await sendAppEmailSafe({
        templateName: "release-received",
        recipientEmail: data.email.toLowerCase(),
        idempotencyKey: `release-received-${inserted.id}`,
        templateData: {
          artistName: data.artist_name,
          releaseName: data.release_name,
          releaseType: data.release_type,
          faixaFoco: data.faixa_foco || "",
        },
      });
      const adminEmail = await getAdminNotificationEmail();
      if (adminEmail) {
        await sendAppEmailSafe({
          templateName: "admin-new-release",
          recipientEmail: adminEmail,
          idempotencyKey: `admin-new-release-${inserted.id}`,
          templateData: {
            artistName: data.artist_name,
            releaseName: data.release_name,
            releaseType: data.release_type,
            faixaFoco: data.faixa_foco || "",
            email: data.email,
            adminUrl: `${PUBLIC_SITE_URL}/admin/lancamentos/${inserted.id}`,
          },
        });
      }
    } catch (e) {
      console.error("[releases.submit] notify", e);
    }

    return { ok: true, releaseId: inserted.id };
  });

// ---------- Admin ----------

export const listReleases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.enum(RELEASE_STATUSES).optional(),
        search: z.string().trim().max(160).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
      .default({ page: 1, pageSize: 20 })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = admin
      .from("releases")
      .select(
        "id, created_at, artist_name, release_name, release_type, status, email",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);
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
    const { data: existing } = await admin
      .from("releases")
      .select("status, email, artist_name, release_name")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await admin
      .from("releases")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (existing && existing.status !== data.status && existing.email) {
      try {
        await sendAppEmailSafe({
          templateName: "release-status-changed",
          recipientEmail: existing.email,
          idempotencyKey: `release-status-${data.id}-${data.status}`,
          templateData: {
            artistName: existing.artist_name,
            releaseName: existing.release_name,
            status: data.status,
            statusLabel: RELEASE_STATUS_LABEL[data.status],
          },
        });
      } catch (e) {
        console.error("[releases.updateStatus] notify", e);
      }
    }
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

export const updateReleaseDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        suggested_release_date: z
          .string()
          .trim()
          .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida"),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { error } = await admin
      .from("releases")
      .update({ suggested_release_date: data.suggested_release_date || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const optionalStr = (max: number) =>
  z.string().trim().max(max).optional();
const optionalDrive = z
  .string()
  .trim()
  .max(500)
  .optional()
  .refine((v) => !v || driveUrlRegex.test(v), "Use um link do Google Drive");

const updateSchema = z.object({
  id: z.string().uuid(),
  full_name: optionalStr(160),
  cpf: optionalStr(20),
  email: z.string().trim().email().max(255).optional(),
  whatsapp: optionalStr(20),
  artist_name: optionalStr(160),
  about_artist: optionalStr(5000),
  release_type: z.enum(["single", "ep", "album"]).optional(),
  release_name: optionalStr(200),
  isrc: optionalStr(2000),
  has_videoclip: z.boolean().optional(),
  tracklist: optionalStr(5000),
  faixa_foco: optionalStr(200),
  about_release: optionalStr(5000),
  cover_drive_url: optionalDrive,
  audio_drive_url: optionalDrive,
  lyrics_drive_url: optionalDrive,
  photos_drive_url: optionalDrive,
  genres: z.array(z.string().max(60)).max(20).optional(),
  moods: z.array(z.string().max(60)).max(20).optional(),
  instruments: z.array(z.string().max(60)).max(30).optional(),
  technical_sheet: optionalStr(5000),
  royalties: optionalStr(2000),
});

export const updateRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { id, ...rest } = data;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined) continue;
      patch[k] = v;
    }
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await admin
      .from("releases")
      .update(patch as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type { ReleaseStatus, ReleaseType };

