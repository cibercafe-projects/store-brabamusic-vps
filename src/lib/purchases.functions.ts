import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendAppEmailSafe, getAdminNotificationEmail } from "@/lib/email/send.server";

const PUBLIC_SITE_URL = "https://brababeats.app";

const PURCHASE_STATUSES = [
  "aguardando_pagamento",
  "comprovante_recebido",
  "pagamento_confirmado",
  "arquivos_enviados",
  "cancelado",
] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

const RECEIPT_BUCKET = "purchase-receipts";
const MAX_RECEIPT_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_RECEIPT_TYPES = ["image/jpeg", "image/png", "application/pdf"];

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
    console.error("[purchases] role check", error);
    throw new Error("Erro interno. Tente novamente.");
  }
  if (!data) throw new Error("Acesso negado");
  return supabaseAdmin;
}

// ===== Public: settings =====
export const getPurchaseSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("key, value")
    .in("key", ["pix_key", "payment_link", "commercial_whatsapp"]);
  if (error) {
    console.error("[purchases.settings]", error);
    throw new Error("Erro ao carregar dados de pagamento.");
  }
  const map: Record<string, string> = {};
  (data ?? []).forEach((r) => {
    map[r.key] = r.value ?? "";
  });
  return {
    pix_key: map.pix_key ?? "",
    payment_link: map.payment_link ?? "",
    commercial_whatsapp: map.commercial_whatsapp ?? "+5511913401000",
  };
});

// ===== Public: create purchase =====
const createSchema = z.object({
  beat_id: z.string().uuid("Beat inválido"),
  nome_cliente: z.string().trim().min(2, "Nome obrigatório").max(160),
  nome_artistico: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .nullable(),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(255),
  whatsapp: z
    .string()
    .trim()
    .min(8, "WhatsApp obrigatório")
    .max(30)
    .regex(/^[+0-9 ()-]+$/, "Apenas dígitos, +, espaços, () e -"),
  instagram: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v ? v.replace(/^@/, "") : null))
    .nullable(),
  forma_pagamento: z.enum(["pix", "link"]),
  termos_aceitos: z.literal(true, { errorMap: () => ({ message: "Aceite os termos para continuar." }) }),
});

export const createPurchaseRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: beat, error: beatErr } = await supabaseAdmin
      .from("beats")
      .select("id, nome, preco, status")
      .eq("id", data.beat_id)
      .maybeSingle();
    if (beatErr) {
      console.error("[purchases.create] beat lookup", beatErr);
      throw new Error("Erro ao localizar beat.");
    }
    if (!beat || beat.status !== "ativo") {
      throw new Error("Beat indisponível para compra.");
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("purchase_requests")
      .insert({
        beat_id: data.beat_id,
        nome_cliente: data.nome_cliente,
        nome_artistico: data.nome_artistico,
        email: data.email,
        whatsapp: data.whatsapp,
        instagram: data.instagram,
        forma_pagamento: data.forma_pagamento,
        termos_aceitos: data.termos_aceitos,
        valor: beat.preco,
        status: "aguardando_pagamento",
      })
      .select("id, continuation_token")
      .single();

    if (error || !inserted) {
      console.error("[purchases.create]", error);
      throw new Error("Erro ao registrar pedido.");
    }

    // Notificações (não bloqueiam a resposta) -----------------------------------
    try {
      const [settingsRows, adminEmail] = await Promise.all([
        supabaseAdmin
          .from("app_settings")
          .select("key, value")
          .in("key", ["pix_key", "payment_link"]),
        getAdminNotificationEmail(),
      ]);
      const settingsMap: Record<string, string> = {};
      (settingsRows.data ?? []).forEach((r) => {
        settingsMap[r.key] = r.value ?? "";
      });
      const receiptUrl = `${PUBLIC_SITE_URL}/enviar-comprovante/${inserted.continuation_token}`;

      // Cliente
      await sendAppEmailSafe({
        templateName: "purchase-created",
        recipientEmail: data.email,
        idempotencyKey: `purchase-created-${inserted.id}`,
        templateData: {
          nome: data.nome_cliente,
          nomeArtistico: data.nome_artistico ?? "",
          beatNome: beat.nome,
          valor: beat.preco,
          formaPagamento: data.forma_pagamento,
          pixKey: settingsMap.pix_key ?? "",
          paymentLink: settingsMap.payment_link ?? "",
          receiptUrl,
        },
      });

      // Admin
      if (adminEmail) {
        await sendAppEmailSafe({
          templateName: "admin-new-purchase",
          recipientEmail: adminEmail,
          idempotencyKey: `admin-new-purchase-${inserted.id}`,
          templateData: {
            nomeCliente: data.nome_cliente,
            nomeArtistico: data.nome_artistico ?? "",
            email: data.email,
            whatsapp: data.whatsapp,
            beatNome: beat.nome,
            valor: beat.preco,
            formaPagamento: data.forma_pagamento,
            adminUrl: `${PUBLIC_SITE_URL}/admin/compras/${inserted.id}`,
          },
        });
      }
    } catch (e) {
      console.error("[purchases.create] notify", e);
    }

    return {
      id: inserted.id,
      continuation_token: inserted.continuation_token as string,
    };
  });

// ===== Public: lookup by token =====
const tokenSchema = z.object({ token: z.string().uuid("Link inválido") });

export const getPurchaseByToken = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("purchase_requests")
      .select(
        "id, nome_cliente, email, valor, status, receipt_path, forma_pagamento, created_at, beat:beats(id, nome, slug, capa_url, produtora:producers(nome_artistico))",
      )
      .eq("continuation_token", data.token)
      .maybeSingle();
    if (error) {
      console.error("[purchases.byToken]", error);
      throw new Error("Erro ao localizar pedido.");
    }
    if (!row) throw new Error("Pedido não encontrado.");
    return row;
  });

// ===== Public: upload receipt by token =====
const uploadSchema = z.object({
  token: z.string().uuid(),
  filename: z.string().trim().min(1).max(200),
  content_type: z.string().trim().min(1).max(100),
  data_base64: z.string().min(8),
});

export const uploadReceiptByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => uploadSchema.parse(input))
  .handler(async ({ data }) => {
    if (!ALLOWED_RECEIPT_TYPES.includes(data.content_type)) {
      throw new Error("Formato não suportado. Use JPG, PNG ou PDF.");
    }
    const bytes = Buffer.from(data.data_base64, "base64");
    if (bytes.byteLength === 0) throw new Error("Arquivo vazio.");
    if (bytes.byteLength > MAX_RECEIPT_BYTES) {
      throw new Error("Arquivo muito grande (máx. 8 MB).");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: lookupErr } = await supabaseAdmin
      .from("purchase_requests")
      .select(
        "id, status, receipt_path, nome_cliente, email, beat:beats(nome)",
      )
      .eq("continuation_token", data.token)
      .maybeSingle();
    if (lookupErr) {
      console.error("[purchases.upload] lookup", lookupErr);
      throw new Error("Erro ao localizar pedido.");
    }
    if (!row) throw new Error("Pedido não encontrado.");
    if (row.status === "cancelado") throw new Error("Este pedido foi cancelado.");
    if (row.status === "arquivos_enviados") {
      throw new Error(
        "Este pedido já foi concluído. Se precisar de ajuda, fale com a equipe Braba.",
      );
    }

    const ext = data.filename.includes(".")
      ? data.filename.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
      : data.content_type === "application/pdf"
        ? "pdf"
        : data.content_type === "image/png"
          ? "png"
          : "jpg";
    const path = `${row.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(RECEIPT_BUCKET)
      .upload(path, bytes, {
        contentType: data.content_type,
        upsert: false,
      });
    if (uploadErr) {
      console.error("[purchases.upload] storage", uploadErr);
      throw new Error("Erro ao enviar comprovante.");
    }

    // remove previous receipt if any
    if (row.receipt_path) {
      await supabaseAdmin.storage.from(RECEIPT_BUCKET).remove([row.receipt_path]);
    }

    const newStatus =
      row.status === "aguardando_pagamento" ? "comprovante_recebido" : row.status;

    const { error: updateErr } = await supabaseAdmin
      .from("purchase_requests")
      .update({
        receipt_path: path,
        receipt_uploaded_at: new Date().toISOString(),
        status: newStatus,
      })
      .eq("id", row.id);
    if (updateErr) {
      console.error("[purchases.upload] update", updateErr);
      throw new Error("Erro ao salvar comprovante.");
    }

    // Notificações ---------------------------------------------------------
    try {
      const beatNome = (row.beat as { nome?: string } | null)?.nome ?? "—";
      if (row.email) {
        await sendAppEmailSafe({
          templateName: "receipt-received",
          recipientEmail: row.email,
          idempotencyKey: `receipt-received-${row.id}-${path}`,
          templateData: { nome: row.nome_cliente, beatNome },
        });
      }
      const adminEmail = await getAdminNotificationEmail();
      if (adminEmail) {
        await sendAppEmailSafe({
          templateName: "admin-new-receipt",
          recipientEmail: adminEmail,
          idempotencyKey: `admin-new-receipt-${row.id}-${path}`,
          templateData: {
            nomeCliente: row.nome_cliente,
            beatNome,
            adminUrl: `${PUBLIC_SITE_URL}/admin/compras/${row.id}`,
          },
        });
      }
    } catch (e) {
      console.error("[purchases.upload] notify", e);
    }

    return { ok: true };
  });

// ===== Admin =====
const adminListSchema = z.object({
  status: z.enum(PURCHASE_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
});

export const listPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => adminListSchema.parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    let q = admin
      .from("purchase_requests")
      .select(
        "id, nome_cliente, email, whatsapp, status, valor, receipt_path, created_at, forma_pagamento, beat:beats(id, nome, slug)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`nome_cliente.ilike.${s},email.ilike.${s}`);
    }
    const { data: rows, error } = await q;
    if (error) {
      console.error("[purchases.list]", error);
      throw new Error("Erro ao carregar compras.");
    }
    return rows ?? [];
  });

const idSchema = z.object({ id: z.string().uuid() });

export const getPurchase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { data: row, error } = await admin
      .from("purchase_requests")
      .select(
        "*, beat:beats(id, nome, slug, capa_url, preco, wav_path, stems_path, license_path, produtora:producers(id, nome_artistico, slug))",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) {
      console.error("[purchases.get]", error);
      throw new Error("Erro ao carregar compra.");
    }
    if (!row) throw new Error("Compra não encontrada.");
    return row;
  });

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(PURCHASE_STATUSES),
  admin_notes: z.string().trim().max(1000).optional().nullable(),
});

export const updatePurchaseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const patch: { status: PurchaseStatus; admin_notes?: string | null } = {
      status: data.status,
    };
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await admin
      .from("purchase_requests")
      .update(patch)
      .eq("id", data.id);
    if (error) {
      console.error("[purchases.updateStatus]", error);
      throw new Error("Erro ao atualizar status.");
    }
    return { ok: true };
  });

export const getReceiptSignedUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { data: row, error } = await admin
      .from("purchase_requests")
      .select("receipt_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row?.receipt_path) {
      throw new Error("Comprovante não encontrado.");
    }
    const { data: signed, error: signErr } = await admin.storage
      .from(RECEIPT_BUCKET)
      .createSignedUrl(row.receipt_path, 60 * 10);
    if (signErr || !signed?.signedUrl) {
      console.error("[purchases.signed]", signErr);
      throw new Error("Erro ao gerar link do comprovante.");
    }
    return { url: signed.signedUrl };
  });

export const getPurchaseDashboardCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context.userId);
    const { data, error } = await admin
      .from("purchase_requests")
      .select("status");
    if (error) {
      console.error("[purchases.counts]", error);
      throw new Error("Erro ao carregar métricas.");
    }
    const counts: Record<PurchaseStatus, number> = {
      aguardando_pagamento: 0,
      comprovante_recebido: 0,
      pagamento_confirmado: 0,
      arquivos_enviados: 0,
      cancelado: 0,
    };
    (data ?? []).forEach((r) => {
      const s = r.status as PurchaseStatus;
      if (s in counts) counts[s] += 1;
    });
    return {
      total: (data ?? []).length,
      ...counts,
    };
  });

const resendSchema = z.object({
  id: z.string().uuid(),
  canal_email: z.boolean(),
  canal_whatsapp: z.boolean(),
});

export const logResendInstructions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resendSchema.parse(input))
  .handler(async ({ context, data }) => {
    if (!data.canal_email && !data.canal_whatsapp) {
      throw new Error("Selecione ao menos um canal.");
    }
    const admin = await assertAdmin(context.userId);

    // Reenvio real do e-mail de instruções (WhatsApp continua manual via wa.me no cliente).
    let emailSent = false;
    if (data.canal_email) {
      const { data: row } = await admin
        .from("purchase_requests")
        .select(
          "id, email, nome_cliente, valor, forma_pagamento, continuation_token, beat:beats(nome)",
        )
        .eq("id", data.id)
        .maybeSingle();
      if (row?.email) {
        const { data: settingsRows } = await admin
          .from("app_settings")
          .select("key, value")
          .in("key", ["pix_key", "payment_link"]);
        const map: Record<string, string> = {};
        (settingsRows ?? []).forEach((r) => {
          map[r.key] = r.value ?? "";
        });
        const result = await sendAppEmailSafe({
          templateName: "purchase-created",
          recipientEmail: row.email,
          idempotencyKey: `purchase-created-resend-${row.id}-${Date.now()}`,
          templateData: {
            nome: row.nome_cliente,
            beatNome: (row.beat as { nome?: string } | null)?.nome ?? "—",
            valor: row.valor,
            formaPagamento: row.forma_pagamento,
            pixKey: map.pix_key ?? "",
            paymentLink: map.payment_link ?? "",
            receiptUrl: `${PUBLIC_SITE_URL}/enviar-comprovante/${row.continuation_token}`,
          },
        });
        emailSent = true;
        void result;
      }
    }

    const { error } = await admin.from("purchase_deliveries").insert({
      purchase_id: data.id,
      tipo: "instrucoes_pagamento",
      arquivos: [],
      enviado_email: data.canal_email && emailSent,
      enviado_whatsapp: data.canal_whatsapp,
      enviado_por: context.userId,
    });
    if (error) {
      console.error("[purchases.resend]", error);
      throw new Error("Erro ao registrar reenvio.");
    }
    return { ok: true, email_sent: emailSent };
  });

export const listResendInstructions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { data: rows, error } = await admin
      .from("purchase_deliveries")
      .select("id, enviado_em, enviado_email, enviado_whatsapp")
      .eq("purchase_id", data.id)
      .eq("tipo", "instrucoes_pagamento")
      .order("enviado_em", { ascending: false })
      .limit(20);
    if (error) {
      console.error("[purchases.listResend]", error);
      throw new Error("Erro ao carregar histórico.");
    }
    return rows ?? [];
  });

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  comprovante_recebido: "Comprovante recebido",
  pagamento_confirmado: "Pagamento confirmado",
  arquivos_enviados: "Arquivos enviados",
  cancelado: "Cancelado",
};

export const PURCHASE_STATUS_LIST = PURCHASE_STATUSES;
