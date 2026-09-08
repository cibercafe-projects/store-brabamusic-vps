import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendAppEmailSafe, getAdminNotificationEmail } from "@/lib/email/send.server";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role, active")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("active", true)
    .maybeSingle();
  if (error) {
    console.error("[beat-types] role check", error);
    throw new Error("Erro interno. Tente novamente em instantes.");
  }
  if (!data) throw new Error("Acesso negado");
  return supabaseAdmin;
}

const slugRegex = /^[a-z0-9-]{2,60}$/;
const urlOpt = z
  .string()
  .trim()
  .max(500)
  .default("")
  .refine((v) => !v || /^https?:\/\/.+/i.test(v), "URL deve começar com http:// ou https://");

const upsertInput = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1).max(80),
  slug: z.string().trim().regex(slugRegex, "minúsculas, números e hífens"),
  descricao: z.string().trim().max(500).default(""),
  valor_padrao: z.number().min(0).max(99999.99),
  link_pagamento: urlOpt,
  inclui_stems: z.boolean().default(false),
  ativo: z.boolean().default(true),
  ordem: z.number().int().min(0).max(9999).default(0),
  promo_ativa: z.boolean().default(false),
  promo_valor: z.number().min(0).max(99999.99).nullable().default(null),
  promo_link_pagamento: urlOpt,
  promo_inicio_em: z.string().trim().max(40).nullable().default(null),
  promo_expira_em: z.string().trim().max(40).nullable().default(null),
});

export type BeatTypeRow = {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  valor_padrao: number;
  link_pagamento: string;
  inclui_stems: boolean;
  ativo: boolean;
  ordem: number;
  promo_ativa: boolean;
  promo_valor: number | null;
  promo_link_pagamento: string;
  promo_inicio_em: string | null;
  promo_expira_em: string | null;
  created_at: string;
  updated_at: string;
};

export const listBeatTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BeatTypeRow[]> => {
    const admin = await assertAdmin(context.userId);
    const { data, error } = await admin
      .from("beat_types")
      .select("*")
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });
    if (error) {
      console.error("[beat-types.list]", error);
      throw new Error("Erro ao carregar tipos de beat.");
    }
    return (data ?? []).map((r) => ({
      ...r,
      valor_padrao: Number(r.valor_padrao ?? 0),
      promo_valor: r.promo_valor != null ? Number(r.promo_valor) : null,
    })) as BeatTypeRow[];
  });

export const upsertBeatType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertInput.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const row = {
      nome: data.nome,
      slug: data.slug,
      descricao: data.descricao ?? "",
      valor_padrao: data.valor_padrao,
      link_pagamento: data.link_pagamento ?? "",
      inclui_stems: data.inclui_stems,
      ativo: data.ativo,
      ordem: data.ordem,
      promo_ativa: data.promo_ativa,
      promo_valor: data.promo_valor,
      promo_link_pagamento: data.promo_link_pagamento ?? "",
      promo_inicio_em: data.promo_inicio_em,
      promo_expira_em: data.promo_expira_em,
    };

    async function recordHistory(id: string) {
      await admin.from("beat_type_promo_history").insert({
        beat_type_id: id,
        promo_ativa: data.promo_ativa,
        promo_valor: data.promo_valor,
        promo_inicio_em: data.promo_inicio_em,
        promo_expira_em: data.promo_expira_em,
        changed_by: context.userId,
      });
    }

    if (data.id) {
      const { error } = await admin.from("beat_types").update(row).eq("id", data.id);
      if (error) {
        console.error("[beat-types.update]", error);
        throw new Error(
          error.code === "23505" ? "Já existe um tipo com esse slug." : "Erro ao salvar tipo.",
        );
      }
      await recordHistory(data.id);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await admin
      .from("beat_types")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      console.error("[beat-types.insert]", error);
      throw new Error(
        error.code === "23505" ? "Já existe um tipo com esse slug." : "Erro ao criar tipo.",
      );
    }
    await recordHistory(inserted.id);
    return { ok: true, id: inserted.id };
  });

// --- Promoções (cadastro/edição, exclusão, lifecycle) -----------------------

const datetimeOpt = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "Data/hora inválida.");

const promoUpsertInput = z.object({
  id: z.string().uuid(),
  promo_ativa: z.boolean().default(true),
  promo_valor: z.number().min(0.01).max(99999.99),
  promo_link_pagamento: z
    .string()
    .trim()
    .min(1, "Informe o link de pagamento da promoção.")
    .max(500)
    .refine((v) => /^https?:\/\/.+/i.test(v), "URL deve começar com http:// ou https://"),
  promo_descricao: z.string().trim().max(280).nullable().default(null),
  promo_inicio_em: datetimeOpt,
  promo_expira_em: datetimeOpt.nullable().default(null),
});

export type PromoStatus = "vigente" | "futura" | "desligada" | "encerrada";

export type BeatTypePromoRow = {
  id: string;
  nome: string;
  slug: string;
  valor_padrao: number;
  promo_ativa: boolean;
  promo_valor: number | null;
  promo_link_pagamento: string;
  promo_descricao: string | null;
  promo_inicio_em: string | null;
  promo_expira_em: string | null;
  status: PromoStatus;
};

function calcularStatus(promo: {
  promo_ativa: boolean | null | undefined;
  promo_inicio_em: string | null | undefined;
  promo_expira_em: string | null | undefined;
}): PromoStatus {
  const inicio = promo.promo_inicio_em ? new Date(promo.promo_inicio_em) : null;
  const fim = promo.promo_expira_em ? new Date(promo.promo_expira_em) : null;
  const now = new Date();
  if (fim && fim.getTime() <= now.getTime()) return "encerrada";
  if (inicio && inicio.getTime() > now.getTime()) return "futura";
  if (!promo.promo_ativa) return "desligada";
  return "vigente";
}

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBRL(value: number | string | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

/** Lista apenas tipos com promoção cadastrada (existem em `beat_type_promo_history`). */
export const listBeatTypesWithPromo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BeatTypePromoRow[]> => {
    const admin = await assertAdmin(context.userId);
    const { data, error } = await admin
      .from("beat_types")
      .select(
        "id, nome, slug, valor_padrao, promo_ativa, promo_valor, promo_link_pagamento, promo_descricao, promo_inicio_em, promo_expira_em",
      )
      .order("nome", { ascending: true });
    if (error) {
      console.error("[promo.list]", error);
      throw new Error("Erro ao carregar promoções.");
    }
    const all = (data ?? []) as BeatTypePromoRow[];
    if (!all.length) return [];
    const ids = all.map((r) => r.id);
    const { data: histCount, error: histErr } = await admin
      .from("beat_type_promo_history")
      .select("beat_type_id")
      .in("beat_type_id", ids);
    if (histErr) {
      console.error("[promo.list.history]", histErr);
      throw new Error("Erro ao carregar promoções.");
    }
    const has = new Set((histCount ?? []).map((h) => h.beat_type_id as string));
    return all
      .filter((r) => has.has(r.id))
      .map((r) => ({
        ...r,
        valor_padrao: Number(r.valor_padrao),
        promo_valor: r.promo_valor != null ? Number(r.promo_valor) : null,
        status: calcularStatus(r),
      }));
  });

/** Cadastra ou edita a promoção de um tipo. Aplica regras de lifecycle. */
export const upsertBeatTypePromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => promoUpsertInput.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);

    const { data: bt, error: getErr } = await admin
      .from("beat_types")
      .select(
        "nome, valor_padrao, promo_ativa, promo_valor, promo_link_pagamento, promo_descricao, promo_inicio_em, promo_expira_em",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) {
      console.error("[promo.upsert.get]", getErr);
      throw new Error("Erro ao carregar tipo.");
    }
    if (!bt) throw new Error("Tipo não encontrado.");

    const valorCheio = Number(bt.valor_padrao);
    if (!(data.promo_valor < valorCheio)) {
      throw new Error("O valor promocional deve ser menor que o valor cheio do tipo.");
    }
    const inicio = new Date(data.promo_inicio_em);
    if (data.promo_expira_em) {
      const fim = new Date(data.promo_expira_em);
      if (!(fim.getTime() > inicio.getTime())) {
        throw new Error("A data de expiração deve ser posterior à data de início.");
      }
    }

    const now = new Date();
    const expiraAtual = bt.promo_expira_em ? new Date(bt.promo_expira_em) : null;
    const inicioAtual = bt.promo_inicio_em ? new Date(bt.promo_inicio_em) : null;
    const encerrada = expiraAtual && expiraAtual.getTime() <= now.getTime();

    // Regra: pós-término → imutável.
    if (encerrada) {
      throw new Error("Promoção encerrada; não pode ser editada.");
    }

    // Regra: pós-início → só é permitido alterar `promo_expira_em` e `promo_ativa`.
    const isCreating = !bt.promo_inicio_em && !bt.promo_valor;
    if (inicioAtual && inicioAtual.getTime() <= now.getTime() && !isCreating) {
      // Edição pós-início: garantir que apenas expira/ativa mudaram.
      const mesmaBase =
        Number(bt.promo_valor) === data.promo_valor &&
        (bt.promo_link_pagamento ?? "") === data.promo_link_pagamento &&
        new Date(bt.promo_inicio_em!).getTime() === inicio.getTime() &&
        (bt.promo_descricao ?? null) === (data.promo_descricao ?? null);
      if (!mesmaBase) {
        throw new Error(
          "Promoção já iniciou; só é possível editar a data final e ativar/desativar.",
        );
      }
    }

    const { error: updErr } = await admin
      .from("beat_types")
      .update({
        promo_ativa: data.promo_ativa,
        promo_valor: data.promo_valor,
        promo_link_pagamento: data.promo_link_pagamento,
        promo_descricao: data.promo_descricao ?? null,
        promo_inicio_em: inicio.toISOString(),
        promo_expira_em: data.promo_expira_em ? new Date(data.promo_expira_em).toISOString() : null,
        promo_reminder_sent_at: null,
      })
      .eq("id", data.id);
    if (updErr) {
      console.error("[promo.upsert.update]", updErr);
      throw new Error("Erro ao salvar promoção.");
    }

    await admin.from("beat_type_promo_history").insert({
      beat_type_id: data.id,
      promo_ativa: data.promo_ativa,
      promo_valor: data.promo_valor,
      promo_inicio_em: inicio.toISOString(),
      promo_expira_em: data.promo_expira_em ? new Date(data.promo_expira_em).toISOString() : null,
      changed_by: context.userId,
    });

    // E-mail admin (fire-and-forget).
    try {
      const adminEmail = await getAdminNotificationEmail();
      if (adminEmail) {
        await sendAppEmailSafe({
          templateName: "admin-promo-created",
          recipientEmail: adminEmail,
          idempotencyKey: `admin-promo-${data.id}-${inicio.toISOString()}-${Math.floor(now.getTime() / 1000)}`,
          templateData: {
            beatTypeNome: bt.nome,
            valorCheio: valorCheio,
            valorPromo: data.promo_valor,
            promoLinkPagamento: data.promo_link_pagamento,
            promoInicioEm: formatDateBR(inicio.toISOString()),
            promoExpiraEm: data.promo_expira_em ? formatDateBR(data.promo_expira_em) : "—",
            promoDescricao: data.promo_descricao ?? "",
          },
        });
      }
    } catch (e) {
      console.error("[promo.upsert.email]", e);
    }

    return { ok: true };
  });

/** Liga ou desliga a promoção. Bloqueia religar se já encerrada. */
export const toggleBeatTypePromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), promo_ativa: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { data: existing, error: getErr } = await admin
      .from("beat_types")
      .select("promo_ativa, promo_valor, promo_inicio_em, promo_expira_em")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) {
      console.error("[beat-types.toggle.get]", getErr);
      throw new Error("Erro ao carregar tipo.");
    }
    if (!existing) throw new Error("Tipo não encontrado.");
    const now = new Date();
    const expira = existing.promo_expira_em ? new Date(existing.promo_expira_em) : null;
    if (expira && expira.getTime() <= now.getTime()) {
      throw new Error("Promoção encerrada; não pode ser religada.");
    }
    const { error } = await admin
      .from("beat_types")
      .update({ promo_ativa: data.promo_ativa, promo_reminder_sent_at: null })
      .eq("id", data.id);
    if (error) {
      console.error("[beat-types.toggle]", error);
      throw new Error("Erro ao atualizar promoção.");
    }
    await admin.from("beat_type_promo_history").insert({
      beat_type_id: data.id,
      promo_ativa: data.promo_ativa,
      promo_valor: existing.promo_valor as number | null,
      promo_inicio_em: existing.promo_inicio_em,
      promo_expira_em: existing.promo_expira_em,
      changed_by: context.userId,
    });
    return { ok: true };
  });

/** Encerra a promoção imediatamente (`promo_expira_em = now`, `promo_ativa = false`). */
export const termBeatTypePromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { data: existing, error: getErr } = await admin
      .from("beat_types")
      .select("promo_valor, promo_inicio_em, promo_expira_em")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) {
      console.error("[promo.term.get]", getErr);
      throw new Error("Erro ao carregar tipo.");
    }
    if (!existing) throw new Error("Tipo não encontrado.");
    const nowIso = new Date().toISOString();
    const { error } = await admin
      .from("beat_types")
      .update({ promo_ativa: false, promo_expira_em: nowIso, promo_reminder_sent_at: null })
      .eq("id", data.id);
    if (error) {
      console.error("[promo.term]", error);
      throw new Error("Erro ao encerrar promoção.");
    }
    await admin.from("beat_type_promo_history").insert({
      beat_type_id: data.id,
      promo_ativa: false,
      promo_valor: existing.promo_valor as number | null,
      promo_inicio_em: existing.promo_inicio_em,
      promo_expira_em: nowIso,
      changed_by: context.userId,
    });
    return { ok: true };
  });

/** Exclui uma promoção futura não iniciada. Limpa histórico e campos promo. */
export const deleteBeatTypePromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { data: existing, error: getErr } = await admin
      .from("beat_types")
      .select("promo_inicio_em, promo_expira_em, promo_ativa")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) {
      console.error("[promo.delete.get]", getErr);
      throw new Error("Erro ao carregar tipo.");
    }
    if (!existing) throw new Error("Tipo não encontrado.");
    const now = new Date();
    const inicio = existing.promo_inicio_em ? new Date(existing.promo_inicio_em) : null;
    if (!inicio || inicio.getTime() <= now.getTime()) {
      throw new Error("Promoção já iniciou ou expirou; só é possível desligar ou terminar.");
    }
    const { error: clearErr } = await admin
      .from("beat_types")
      .update({
        promo_ativa: false,
        promo_valor: null,
        promo_link_pagamento: "",
        promo_descricao: null,
        promo_inicio_em: null,
        promo_expira_em: null,
        promo_reminder_sent_at: null,
      })
      .eq("id", data.id);
    if (clearErr) {
      console.error("[promo.delete.update]", clearErr);
      throw new Error("Erro ao limpar promoção.");
    }
    const { error: histErr } = await admin
      .from("beat_type_promo_history")
      .delete()
      .eq("beat_type_id", data.id);
    if (histErr) {
      console.error("[promo.delete.history]", histErr);
      throw new Error("Erro ao limpar histórico de promoções.");
    }
    return { ok: true };
  });

export type CanDeleteBeatType = { canDelete: boolean; reason: string };

export const canDeleteBeatType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<CanDeleteBeatType> => {
    const admin = await assertAdmin(context.userId);
    const { count, error } = await admin
      .from("beat_type_promo_history")
      .select("id", { count: "exact", head: true })
      .eq("beat_type_id", data.id);
    if (error) {
      console.error("[promo.canDelete]", error);
      throw new Error("Erro ao verificar histórico de promoções.");
    }
    if ((count ?? 0) > 0) {
      return {
        canDelete: false,
        reason:
          "Este tipo possui promoções registradas (vigentes, futuras ou encerradas). " +
          "Só pode ser removido pelo banco.",
      };
    }
    return { canDelete: true, reason: "" };
  });

export const deleteBeatType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    // Checagem de promoções vinculadas antes de remover.
    const { count, error: histErr } = await admin
      .from("beat_type_promo_history")
      .select("id", { count: "exact", head: true })
      .eq("beat_type_id", data.id);
    if (histErr) {
      console.error("[beat-types.delete.hist]", histErr);
      throw new Error("Erro ao verificar promoções.");
    }
    if ((count ?? 0) > 0) {
      throw new Error(
        "Tipo possui promoções registradas; só pode ser removido pelo banco.",
      );
    }
    const { error } = await admin.from("beat_types").delete().eq("id", data.id);
    if (error) {
      console.error("[beat-types.delete]", error);
      throw new Error(
        error.code === "23503"
          ? "Não é possível remover: existem beats usando este tipo."
          : "Erro ao remover tipo.",
      );
    }
    return { ok: true };
  });

export type BeatTypePromoHistoryRow = {
  id: string;
  promo_ativa: boolean;
  promo_valor: number | null;
  promo_inicio_em: string | null;
  promo_expira_em: string | null;
  changed_at: string;
  changed_by: string | null;
};

export const listBeatTypePromoHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }): Promise<BeatTypePromoHistoryRow[]> => {
    const admin = await assertAdmin(context.userId);
    const { data: rows, error } = await admin
      .from("beat_type_promo_history")
      .select(
        "id, promo_ativa, promo_valor, promo_inicio_em, promo_expira_em, changed_at, changed_by",
      )
      .eq("beat_type_id", data.id)
      .order("changed_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[beat-types.history]", error);
      throw new Error("Erro ao carregar histórico.");
    }
    return (rows ?? []).map((r) => ({
      ...r,
      promo_valor: r.promo_valor != null ? Number(r.promo_valor) : null,
    })) as BeatTypePromoHistoryRow[];
  });

// Re-export helpers used by UI.
export { formatDateBR as formatPromoDateBR, formatBRL as formatPromoBRL };
