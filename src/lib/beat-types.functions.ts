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
  /** id do beat_type (chave estável para as ações do admin). */
  id: string;
  /** id da linha do histórico que originou esta campanha. */
  campaign_id: string;
  /** Início da campanha (chave de agrupamento). */
  campaign_inicio_em: string;
  /** true quando esta campanha é a que está atualmente gravada em beat_types. */
  is_current: boolean;
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

/** Lista todas as campanhas de promoção por tipo de beat.
 *  Retorna uma linha por campanha (agrupada por `promo_inicio_em` no histórico),
 *  incluindo as encerradas, para preservar a memória visual do que já rolou.
 *  A campanha atual (refletida em `beat_types`) recebe `is_current = true`.
 */
export const listBeatTypesWithPromo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BeatTypePromoRow[]> => {
    const admin = await assertAdmin(context.userId);

    const { data: types, error: typesErr } = await admin
      .from("beat_types")
      .select(
        "id, nome, slug, valor_padrao, promo_ativa, promo_valor, promo_link_pagamento, promo_descricao, promo_inicio_em, promo_expira_em",
      )
      .order("nome", { ascending: true });
    if (typesErr) {
      console.error("[promo.list.types]", typesErr);
      throw new Error("Erro ao carregar promoções.");
    }
    const allTypes = types ?? [];
    if (!allTypes.length) return [];

    const ids = allTypes.map((r) => r.id);
    const { data: historyRows, error: histErr } = await admin
      .from("beat_type_promo_history")
      .select(
        "id, beat_type_id, promo_ativa, promo_valor, promo_link_pagamento, promo_descricao, promo_inicio_em, promo_expira_em, changed_at",
      )
      .in("beat_type_id", ids)
      .order("changed_at", { ascending: false });
    if (histErr) {
      console.error("[promo.list.history]", histErr);
      throw new Error("Erro ao carregar promoções.");
    }

    // Agrupa o histórico por (beat_type_id, promo_inicio_em) e guarda apenas
    // a entrada mais recente de cada campanha.
    type Campaign = {
      historyId: string;
      ativa: boolean;
      valor: number | null;
      link: string;
      descricao: string | null;
      inicio: string;
      expira: string | null;
    };
    const campaignsByType = new Map<string, Map<string, Campaign>>();
    for (const h of historyRows ?? []) {
      if (!h.promo_inicio_em) continue;
      let perType = campaignsByType.get(h.beat_type_id);
      if (!perType) {
        perType = new Map();
        campaignsByType.set(h.beat_type_id, perType);
      }
      if (perType.has(h.promo_inicio_em)) continue; // já temos a mais recente
      perType.set(h.promo_inicio_em, {
        historyId: h.id,
        ativa: !!h.promo_ativa,
        valor: h.promo_valor != null ? Number(h.promo_valor) : null,
        link: h.promo_link_pagamento ?? "",
        descricao: h.promo_descricao ?? null,
        inicio: h.promo_inicio_em,
        expira: h.promo_expira_em ?? null,
      });
    }

    const rows: BeatTypePromoRow[] = [];
    for (const t of allTypes) {
      const campaigns = campaignsByType.get(t.id);
      if (!campaigns || campaigns.size === 0) continue;

      const sortedCampaigns = Array.from(campaigns.entries()).sort(([a], [b]) =>
        b.localeCompare(a),
      );

      for (const [inicio, c] of sortedCampaigns) {
        const isCurrent = t.promo_inicio_em === inicio;
        const promo_ativa = isCurrent ? !!t.promo_ativa : c.ativa;
        const promo_valor =
          isCurrent
            ? t.promo_valor != null
              ? Number(t.promo_valor)
              : null
            : c.valor;
        const promo_link_pagamento = isCurrent
          ? t.promo_link_pagamento ?? ""
          : c.link;
        const promo_descricao = isCurrent ? (t.promo_descricao ?? null) : c.descricao;
        const promo_inicio_em = inicio;
        const promo_expira_em = isCurrent ? (t.promo_expira_em ?? null) : c.expira;
        const status = calcularStatus({
          promo_ativa,
          promo_inicio_em,
          promo_expira_em,
        });
        rows.push({
          id: t.id,
          campaign_id: c.historyId,
          campaign_inicio_em: inicio,
          is_current: isCurrent,
          nome: t.nome,
          slug: t.slug,
          valor_padrao: Number(t.valor_padrao),
          promo_ativa,
          promo_valor,
          promo_link_pagamento,
          promo_descricao,
          promo_inicio_em,
          promo_expira_em,
          status,
        });
      }
    }
    return rows;
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

    // Detecta se este upsert representa um NOVO ciclo (inicio muda) ou edicao
    // do ciclo atual. Se for novo ciclo, valida sobreposicao com outras
    // campanhas ativas/futuras para o mesmo tipo de beat.
    const isCreating = !bt.promo_inicio_em && !bt.promo_valor;
    const isNewCampaign =
      isCreating ||
      !bt.promo_inicio_em ||
      new Date(bt.promo_inicio_em).getTime() !== inicio.getTime();

    if (!encerrada && inicioAtual && inicioAtual.getTime() <= now.getTime() && !isCreating) {
      // Editando ciclo que ja iniciou: so expira/ativa podem mudar.
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

    if (isNewCampaign) {
      // Busca todas as campanhas anteriores (historico + estado atual em beat_types)
      // e bloqueia se a nova sobrepoe alguma que esteja ativa ou agendada.
      const { data: historyRows, error: histErr } = await admin
        .from("beat_type_promo_history")
        .select("promo_ativa, promo_inicio_em, promo_expira_em, changed_at")
        .eq("beat_type_id", data.id)
        .order("changed_at", { ascending: false });
      if (histErr) {
        console.error("[promo.upsert.history]", histErr);
        throw new Error("Erro ao verificar histórico de promoções.");
      }

      // Agrupa por promo_inicio_em, mantendo a entrada mais recente por campanha.
      const latestByCampaign = new Map<
        string,
        { ativa: boolean; inicio: string; expira: string | null }
      >();
      for (const h of historyRows ?? []) {
        if (!h.promo_inicio_em) continue;
        if (latestByCampaign.has(h.promo_inicio_em)) continue;
        latestByCampaign.set(h.promo_inicio_em, {
          ativa: !!h.promo_ativa,
          inicio: h.promo_inicio_em,
          expira: h.promo_expira_em ?? null,
        });
      }

      // Garante que o estado atual de beat_types tambem conta (caso tenha sido
      // resetado manualmente, ou se a unica fonte for a propria tabela).
      if (bt.promo_inicio_em && !latestByCampaign.has(bt.promo_inicio_em)) {
        latestByCampaign.set(bt.promo_inicio_em, {
          ativa: !!bt.promo_ativa,
          inicio: bt.promo_inicio_em,
          expira: bt.promo_expira_em ?? null,
        });
      }

      const newInicioMs = inicio.getTime();
      const newExpiraMs = data.promo_expira_em
        ? new Date(data.promo_expira_em).getTime()
        : Number.POSITIVE_INFINITY;

      for (const [, c] of latestByCampaign) {
        // Ignora o proprio inicio novo (mesma campanha re-editada dentro do
        // mesmo fluxo).
        if (new Date(c.inicio).getTime() === newInicioMs) continue;

        // Bloqueia apenas campanhas que ainda estao ativas/por vir.
        if (!c.ativa) continue;
        const cExpiraMs = c.expira
          ? new Date(c.expira).getTime()
          : Number.POSITIVE_INFINITY;
        if (cExpiraMs <= now.getTime()) continue; // ja encerrada por tempo

        const cInicioMs = new Date(c.inicio).getTime();
        const overlap = cInicioMs < newExpiraMs && newInicioMs < cExpiraMs;
        if (overlap) {
          throw new Error(
            `Já existe uma promoção ativa ou agendada para este tipo de beat no período ` +
              `${formatDateBR(c.inicio)} → ${c.expira ? formatDateBR(c.expira) : "sem término"}. ` +
              `Encerre-a antes de cadastrar uma nova no mesmo intervalo.`,
          );
        }
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
      promo_link_pagamento: data.promo_link_pagamento,
      promo_descricao: data.promo_descricao ?? null,
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
      .select("promo_ativa, promo_valor, promo_link_pagamento, promo_descricao, promo_inicio_em, promo_expira_em")
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
      promo_link_pagamento: existing.promo_link_pagamento ?? "",
      promo_descricao: existing.promo_descricao ?? null,
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
      .select("promo_valor, promo_link_pagamento, promo_descricao, promo_inicio_em, promo_expira_em")
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
      promo_link_pagamento: existing.promo_link_pagamento ?? "",
      promo_descricao: existing.promo_descricao ?? null,
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
