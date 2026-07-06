import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FEEDBACK_TYPES = [
  "sugestao",
  "problema",
  "duvida",
  "suporte",
  "elogio",
] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_TYPE_LABEL: Record<FeedbackType, string> = {
  sugestao: "Sugestão",
  problema: "Problema",
  duvida: "Dúvida",
  suporte: "Suporte",
  elogio: "Elogio",
};

export const FEEDBACK_AREAS = [
  "catalogo",
  "compra",
  "pagamento",
  "comprovante",
  "entrega",
  "lancamentos",
  "backoffice",
  "outro",
] as const;
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number];

export const FEEDBACK_AREA_LABEL: Record<FeedbackArea, string> = {
  catalogo: "Catálogo",
  compra: "Compra",
  pagamento: "Pagamento",
  comprovante: "Comprovante",
  entrega: "Entrega",
  lancamentos: "Lançamentos",
  backoffice: "Backoffice",
  outro: "Outro",
};

export const FEEDBACK_ORIGINS = ["geral", "pos_compra", "pos_lancamento"] as const;
export type FeedbackOrigin = (typeof FEEDBACK_ORIGINS)[number];

export const FEEDBACK_ORIGIN_LABEL: Record<FeedbackOrigin, string> = {
  geral: "Geral",
  pos_compra: "Pós-compra",
  pos_lancamento: "Pós-lançamento",
};

export const FEEDBACK_STATUSES = [
  "novo",
  "em_analise",
  "respondido",
  "resolvido",
  "arquivado",
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  respondido: "Respondido",
  resolvido: "Resolvido",
  arquivado: "Arquivado",
};

const sanitize = (v: string | undefined | null) =>
  (v ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim();

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
    console.error("[feedback] role check", error);
    throw new Error("Erro interno. Tente novamente em instantes.");
  }
  if (!data) throw new Error("Acesso negado");
  return admin;
}

const submitInput = z
  .object({
    rating: z.number().int().min(1).max(5).optional().nullable(),
    type: z.enum(FEEDBACK_TYPES),
    area: z.enum(FEEDBACK_AREAS).optional().nullable(),
    message: z.string().trim().min(3, "Descreva sua mensagem").max(4000),
    wants_reply: z.boolean().default(false),
    contact_name: z.string().trim().max(120).optional().nullable(),
    contact_email: z.string().trim().max(255).optional().nullable(),
    contact_whatsapp: z.string().trim().max(40).optional().nullable(),
    purchase_request_id: z.string().uuid().optional().nullable(),
    release_id: z.string().uuid().optional().nullable(),
    origin: z.enum(FEEDBACK_ORIGINS).default("geral"),
    website: z.string().max(0).optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.wants_reply) {
      const hasEmail =
        v.contact_email && v.contact_email.trim().length > 0 && v.contact_email.includes("@");
      const hasWpp = v.contact_whatsapp && v.contact_whatsapp.trim().length >= 8;
      if (!hasEmail && !hasWpp) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Informe e-mail ou WhatsApp para receber retorno.",
          path: ["contact_email"],
        });
      }
    }
  });

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitInput.parse(input))
  .handler(async ({ data }) => {
    if (data.website && data.website.length > 0) throw new Error("Falha na validação.");
    const admin = await getAdmin();
    const payload = {
      rating: data.rating ?? null,
      type: data.type,
      area: data.area ?? null,
      message: sanitize(data.message),
      wants_reply: data.wants_reply,
      contact_name: data.contact_name ? sanitize(data.contact_name) : null,
      contact_email: data.contact_email ? sanitize(data.contact_email).toLowerCase() : null,
      contact_whatsapp: data.contact_whatsapp ? sanitize(data.contact_whatsapp) : null,
      purchase_request_id: data.purchase_request_id ?? null,
      release_id: data.release_id ?? null,
      origin: data.origin,
    };
    const { data: inserted, error } = await admin
      .from("feedback")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      console.error("[feedback.submit]", error);
      throw new Error("Não foi possível registrar seu feedback. Tente novamente.");
    }
    return { id: inserted.id };
  });

const listInput = z
  .object({
    status: z.enum(FEEDBACK_STATUSES).optional(),
    type: z.enum(FEEDBACK_TYPES).optional(),
    origin: z.enum(FEEDBACK_ORIGINS).optional(),
    search: z.string().trim().max(160).optional(),
  })
  .default({});

export const listFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    let q = admin
      .from("feedback")
      .select(
        "id, created_at, rating, type, area, message, wants_reply, contact_name, contact_email, contact_whatsapp, origin, status, purchase_request_id, release_id",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status) q = q.eq("status", data.status);
    if (data.type) q = q.eq("type", data.type);
    if (data.origin) q = q.eq("origin", data.origin);
    if (data.search) {
      const s = data.search.replace(/[%_,()]/g, " ").trim();
      if (s)
        q = q.or(
          `message.ilike.%${s}%,contact_name.ilike.%${s}%,contact_email.ilike.%${s}%`,
        );
    }
    const { data: rows, error } = await q;
    if (error) {
      console.error("[feedback.list]", error);
      throw new Error("Erro ao carregar feedbacks.");
    }
    return { items: rows ?? [] };
  });

const getInput = z.object({ id: z.string().uuid() });

export const getFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => getInput.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { data: row, error } = await admin
      .from("feedback")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) {
      console.error("[feedback.get]", error);
      throw new Error("Erro ao carregar feedback.");
    }
    if (!row) throw new Error("Feedback não encontrado");

    let purchase: { id: string; nome_cliente: string; beat_nome: string | null } | null = null;
    if (row.purchase_request_id) {
      const { data: p } = await admin
        .from("purchase_requests")
        .select("id, nome_cliente, beats!purchase_requests_beat_id_fkey(nome)")
        .eq("id", row.purchase_request_id)
        .maybeSingle();
      if (p) {
        const beat = Array.isArray(p.beats) ? p.beats[0] : p.beats;
        purchase = {
          id: p.id,
          nome_cliente: p.nome_cliente,
          beat_nome: beat?.nome ?? null,
        };
      }
    }
    let release: { id: string; release_name: string; artist_name: string } | null = null;
    if (row.release_id) {
      const { data: r } = await admin
        .from("releases")
        .select("id, release_name, artist_name")
        .eq("id", row.release_id)
        .maybeSingle();
      if (r) release = r;
    }
    return { feedback: row, purchase, release };
  });

const updateInput = z.object({
  id: z.string().uuid(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  internal_notes: z.string().max(4000).optional().nullable(),
});

export const updateFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const patch: { status?: FeedbackStatus; internal_notes?: string | null } = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.internal_notes !== undefined) patch.internal_notes = data.internal_notes;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await admin.from("feedback").update(patch).eq("id", data.id);
    if (error) {
      console.error("[feedback.update]", error);
      throw new Error("Erro ao atualizar feedback.");
    }
    return { ok: true };
  });

export const getFeedbackStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context.userId);
    const { data: rows, error } = await admin
      .from("feedback")
      .select("status, type, rating");
    if (error) {
      console.error("[feedback.stats]", error);
      throw new Error("Erro ao carregar métricas.");
    }
    const all = rows ?? [];
    const total = all.length;
    const pendentes = all.filter((r) => r.status === "novo" || r.status === "em_analise").length;
    const respondidos = all.filter(
      (r) => r.status === "respondido" || r.status === "resolvido",
    ).length;
    const problemas = all.filter(
      (r) => r.type === "problema" && r.status !== "arquivado" && r.status !== "resolvido",
    ).length;
    const withRating = all.filter((r): r is typeof r & { rating: number } => typeof r.rating === "number");
    const media = withRating.length
      ? withRating.reduce((s, r) => s + r.rating, 0) / withRating.length
      : 0;
    return {
      total,
      pendentes,
      respondidos,
      problemas,
      notaMedia: Number(media.toFixed(2)),
      novos: all.filter((r) => r.status === "novo").length,
    };
  });
