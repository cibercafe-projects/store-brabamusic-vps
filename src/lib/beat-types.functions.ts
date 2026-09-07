import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const deleteBeatType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
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

const toggleInput = z.object({
  id: z.string().uuid(),
  promo_ativa: z.boolean(),
});

export const toggleBeatTypePromo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => toggleInput.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { data: existing, error: getErr } = await admin
      .from("beat_types")
      .select("promo_ativa, promo_valor, promo_link_pagamento, promo_inicio_em, promo_expira_em")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) {
      console.error("[beat-types.toggle.get]", getErr);
      throw new Error("Erro ao carregar tipo.");
    }
    if (!existing) throw new Error("Tipo não encontrado.");
    const { error } = await admin
      .from("beat_types")
      .update({ promo_ativa: data.promo_ativa })
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
  .handler(async ({ context, data }) => {
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
