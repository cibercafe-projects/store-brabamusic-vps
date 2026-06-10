import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const LEAD_STATUSES = [
  "novo",
  "contatado",
  "negociacao",
  "pago",
  "entregue",
  "perdido",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  contatado: "Contatado",
  negociacao: "Em negociação",
  pago: "Pago",
  entregue: "Entregue",
  perdido: "Perdido",
};

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
    console.error("[leads] role check", error);
    throw new Error("Erro interno. Tente novamente em instantes.");
  }
  if (!data) throw new Error("Acesso negado");
  return admin;
}

const sanitize = (v: string | undefined | null) =>
  (v ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim();

const leadInput = z.object({
  beat_id: z.string().uuid("Beat inválido"),
  nome: z
    .string()
    .trim()
    .min(2, "Informe seu nome")
    .max(120, "Nome muito longo"),
  email: z.string().trim().email("E-mail inválido").max(255),
  telefone: z
    .string()
    .trim()
    .min(8, "Telefone inválido")
    .max(40, "Telefone muito longo"),
  instagram: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? v.replace(/^@/, "") : null)),
  mensagem: z
    .string()
    .trim()
    .max(1000, "Mensagem muito longa")
    .optional()
    .transform((v) => (v ? v : null)),
});

export const createLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => leadInput.parse(input))
  .handler(async ({ data }) => {
    const admin = await getAdmin();

    // Beat tem que existir e estar ativo
    const { data: beat, error: beatErr } = await admin
      .from("beats")
      .select("id, nome, slug, status, produtora_id")
      .eq("id", data.beat_id)
      .maybeSingle();
    if (beatErr) {
      console.error("[leads.create] beat lookup", beatErr);
      throw new Error("Não foi possível registrar seu interesse. Tente novamente.");
    }
    if (!beat || beat.status !== "ativo") {
      throw new Error("Este beat não está mais disponível.");
    }

    const { data: prod } = await admin
      .from("producers")
      .select("nome_artistico")
      .eq("id", beat.produtora_id)
      .maybeSingle();

    const payload = {
      beat_id: data.beat_id,
      nome: sanitize(data.nome),
      email: sanitize(data.email).toLowerCase(),
      telefone: sanitize(data.telefone),
      instagram: data.instagram ? sanitize(data.instagram) : null,
      mensagem: data.mensagem ? sanitize(data.mensagem) : null,
    };

    const { data: inserted, error } = await admin
      .from("leads")
      .insert(payload)
      .select("id")
      .single();
    if (error) {
      console.error("[leads.create] insert", error);
      throw new Error("Não foi possível registrar seu interesse. Tente novamente.");
    }

    const { data: settingsRow } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "whatsapp_number")
      .maybeSingle();

    return {
      leadId: inserted.id,
      whatsappNumber: settingsRow?.value || null,
      beat: { nome: beat.nome, slug: beat.slug },
      produtora: prod?.nome_artistico ?? null,
    };
  });

const listInput = z
  .object({
    search: z.string().trim().max(160).optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(50),
  })
  .default({});

export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = admin
      .from("leads")
      .select("id, beat_id, nome, email, telefone, instagram, mensagem, status, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (data.status) q = q.eq("status", data.status);
    if (data.search) {
      const s = data.search.replace(/[%_,()]/g, " ").trim();
      if (s) q = q.or(`nome.ilike.%${s}%,email.ilike.%${s}%,telefone.ilike.%${s}%,instagram.ilike.%${s}%`);
    }

    const { data: rows, error, count } = await q;
    if (error) {
      console.error("[leads.list]", error);
      throw new Error("Erro ao carregar leads.");
    }

    const beatIds = Array.from(new Set((rows ?? []).map((r) => r.beat_id)));
    const beatMap = new Map<
      string,
      { id: string; nome: string; slug: string; produtora_nome: string | null }
    >();
    if (beatIds.length) {
      const { data: beats } = await admin
        .from("beats")
        .select("id, nome, slug, produtora_id")
        .in("id", beatIds);
      const prodIds = Array.from(new Set((beats ?? []).map((b) => b.produtora_id)));
      const prodMap = new Map<string, string>();
      if (prodIds.length) {
        const { data: prods } = await admin
          .from("producers")
          .select("id, nome_artistico")
          .in("id", prodIds);
        prods?.forEach((p) => prodMap.set(p.id, p.nome_artistico));
      }
      beats?.forEach((b) =>
        beatMap.set(b.id, {
          id: b.id,
          nome: b.nome,
          slug: b.slug,
          produtora_nome: prodMap.get(b.produtora_id) ?? null,
        }),
      );
    }

    return {
      rows: (rows ?? []).map((r) => ({ ...r, beat: beatMap.get(r.beat_id) ?? null })),
      total: count ?? 0,
    };
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(LEAD_STATUSES) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { error } = await admin
      .from("leads")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) {
      console.error("[leads.update]", error);
      throw new Error("Erro ao atualizar status.");
    }
    return { ok: true };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { error } = await admin.from("leads").delete().eq("id", data.id);
    if (error) {
      console.error("[leads.delete]", error);
      throw new Error("Erro ao remover lead.");
    }
    return { ok: true };
  });
