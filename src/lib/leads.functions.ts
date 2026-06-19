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

const MIN_SUBMIT_SECONDS = 3;

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
  // anti-spam
  website: z.string().max(0, "Bot").optional().default(""),
  started_at: z.number().int().positive().optional(),
});

export const createLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => leadInput.parse(input))
  .handler(async ({ data }) => {
    if (data.website && data.website.length > 0) throw new Error("Falha na validação.");
    if (data.started_at) {
      const elapsed = (Date.now() - data.started_at) / 1000;
      if (elapsed < MIN_SUBMIT_SECONDS) {
        throw new Error("Formulário enviado rápido demais. Tente novamente.");
      }
    }

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

const PURCHASE_STATUS_TO_LEAD: Record<string, LeadStatus> = {
  aguardando_pagamento: "novo",
  pagamento_confirmado: "pago",
  arquivos_enviados: "entregue",
  cancelado: "perdido",
};

export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listInput.parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);

    // ---------- Leads ----------
    let leadsQ = admin
      .from("leads")
      .select("id, beat_id, nome, email, telefone, instagram, mensagem, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status) leadsQ = leadsQ.eq("status", data.status);
    if (data.search) {
      const s = data.search.replace(/[%_,()]/g, " ").trim();
      if (s)
        leadsQ = leadsQ.or(
          `nome.ilike.%${s}%,email.ilike.%${s}%,telefone.ilike.%${s}%,instagram.ilike.%${s}%`,
        );
    }
    const { data: leadRows, error: leadsErr } = await leadsQ;
    if (leadsErr) {
      console.error("[leads.list] leads", leadsErr);
      throw new Error("Erro ao carregar leads.");
    }

    // ---------- Cadastros vindos de compras ----------
    let purchasesQ = admin
      .from("purchase_requests")
      .select(
        "id, beat_id, nome_cliente, nome_artistico, email, whatsapp, instagram, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.search) {
      const s = data.search.replace(/[%_,()]/g, " ").trim();
      if (s)
        purchasesQ = purchasesQ.or(
          `nome_cliente.ilike.%${s}%,nome_artistico.ilike.%${s}%,email.ilike.%${s}%,whatsapp.ilike.%${s}%,instagram.ilike.%${s}%`,
        );
    }
    const { data: purchaseRows, error: purchasesErr } = await purchasesQ;
    if (purchasesErr) {
      console.error("[leads.list] purchases", purchasesErr);
    }

    type Row = {
      id: string;
      source: "lead" | "compra";
      beat_id: string;
      nome: string;
      email: string;
      telefone: string;
      instagram: string | null;
      mensagem: string | null;
      status: LeadStatus;
      created_at: string;
      purchase_id?: string;
    };

    const leadItems: Row[] = (leadRows ?? []).map((r) => ({
      id: r.id,
      source: "lead",
      beat_id: r.beat_id,
      nome: r.nome,
      email: r.email,
      telefone: r.telefone,
      instagram: r.instagram,
      mensagem: r.mensagem,
      status: r.status as LeadStatus,
      created_at: r.created_at,
    }));

    const purchaseItems: Row[] = (purchaseRows ?? [])
      .map((r) => {
        const mapped = PURCHASE_STATUS_TO_LEAD[r.status as string] ?? "novo";
        return {
          id: `purchase:${r.id}`,
          source: "compra" as const,
          beat_id: r.beat_id,
          nome: r.nome_artistico
            ? `${r.nome_cliente} (${r.nome_artistico})`
            : r.nome_cliente,
          email: r.email,
          telefone: r.whatsapp,
          instagram: r.instagram,
          mensagem: null,
          status: mapped,
          created_at: r.created_at,
          purchase_id: r.id,
        };
      })
      .filter((r) => !data.status || r.status === data.status);

    const merged = [...leadItems, ...purchaseItems].sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1,
    );

    // Paginação em memória após merge
    const from = (data.page - 1) * data.pageSize;
    const paged = merged.slice(from, from + data.pageSize);

    // Lookup de beats / produtoras
    const beatIds = Array.from(new Set(paged.map((r) => r.beat_id)));
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
      rows: paged.map((r) => ({ ...r, beat: beatMap.get(r.beat_id) ?? null })),
      total: merged.length,
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
