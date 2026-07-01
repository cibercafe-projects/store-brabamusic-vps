import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BEAT_PRIVATE_BUCKETS, type BeatPrivateKind } from "@/lib/beats.functions";
import { sendAppEmail } from "@/lib/email/send.server";

const FILE_KINDS = ["wav", "stems", "license"] as const;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
const PUBLIC_SITE_URL = "https://brababeats.app";


async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role, active")
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado");
  return supabaseAdmin;
}

const deliverSchema = z.object({
  purchase_id: z.string().uuid(),
  arquivos: z.array(z.enum(FILE_KINDS)).min(1, "Selecione pelo menos um arquivo."),
  canal_email: z.boolean(),
  canal_whatsapp: z.boolean(),
  email_mode: z.enum(["auto", "mailto"]).optional().default("auto"),
  observacao: z.string().trim().max(1000).optional().nullable(),
});

type FileLink = { kind: BeatPrivateKind; label: string; url: string };

const LABEL: Record<BeatPrivateKind, string> = {
  wav: "WAV Master",
  stems: "STEMS",
  license: "Licença",
};


export const deliverPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deliverSchema.parse(input))
  .handler(async ({ context, data }) => {
    if (!data.canal_email && !data.canal_whatsapp) {
      throw new Error("Selecione ao menos um canal de envio.");
    }
    const admin = await assertAdmin(context.userId);

    const { data: purchase, error: pErr } = await admin
      .from("purchase_requests")
      .select(
        "id, status, nome_cliente, email, whatsapp, continuation_token, beat:beats(id, nome, wav_path, stems_path, license_path)",
      )
      .eq("id", data.purchase_id)
      .maybeSingle();
    if (pErr || !purchase) throw new Error("Compra não encontrada.");
    if (purchase.status === "cancelado") throw new Error("Compra cancelada.");
    if (
      purchase.status !== "pagamento_confirmado" &&
      purchase.status !== "arquivos_enviados"
    ) {
      throw new Error(
        "Confirme o pagamento antes de entregar os arquivos.",
      );
    }

    const beat = purchase.beat as {
      id: string;
      nome: string;
      wav_path: string | null;
      stems_path: string | null;
      license_path: string | null;
    } | null;
    if (!beat) throw new Error("Beat associado não encontrado.");

    // Sprint 11D: sempre incluir a licença na entrega.
    const arquivos = Array.from(new Set<(typeof FILE_KINDS)[number]>([...data.arquivos, "license"]));

    // Gera links (7 dias para arquivos privados; link público para licença HTML quando não há PDF).
    const links: FileLink[] = [];
    for (const kind of arquivos) {
      if (kind === "license" && !beat.license_path) {
        // Fallback: documento HTML público via token.
        links.push({
          kind,
          label: "Licença (documento online)",
          url: `${PUBLIC_SITE_URL}/licenca/${purchase.continuation_token}`,
        });
        continue;
      }
      const path = beat[`${kind}_path` as const];
      if (!path) {
        throw new Error(`Arquivo ${LABEL[kind]} não cadastrado no beat.`);
      }
      const bucket = BEAT_PRIVATE_BUCKETS[kind];
      const { data: signed, error } = await admin.storage
        .from(bucket)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error || !signed?.signedUrl) {
        console.error("[deliveries.sign]", error);
        throw new Error(`Erro ao gerar link de ${LABEL[kind]}.`);
      }
      links.push({
        kind,
        label: kind === "license" ? "Licença (PDF)" : LABEL[kind],
        url: signed.signedUrl,
      });
    }


    // Email: envia transacional só quando email_mode = 'auto'.
    let emailSent = false;
    let emailMailtoUrl: string | null = null;
    if (data.canal_email && purchase.email) {
      if (data.email_mode === "mailto") {
        const body = buildEmailBody(purchase.nome_cliente, beat.nome, links, data.observacao);
        const subject = `Braba Music — arquivos do beat ${beat.nome}`;
        emailMailtoUrl = `mailto:${encodeURIComponent(purchase.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        emailSent = true; // entrega manual marcada como enviada
      } else {
        const res = await sendAppEmail({
          templateName: "purchase-delivered",
          recipientEmail: purchase.email,
          idempotencyKey: `purchase-delivered-${purchase.id}-${Date.now()}`,
          templateData: {
            nome: purchase.nome_cliente,
            beatNome: beat.nome,
            links: links.map((l) => ({ label: l.label, url: l.url })),
            observacao: data.observacao ?? "",
          },
        });
        emailSent = res.ok;
      }
    }
    const emailPending = data.canal_email && !emailSent;

    const whatsappText = data.canal_whatsapp
      ? buildWhatsappMessage(purchase.nome_cliente, beat.nome, links)
      : null;
    const whatsappUrl =
      data.canal_whatsapp && purchase.whatsapp
        ? `https://wa.me/${purchase.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappText ?? "")}`
        : null;

    // Registra a entrega (Sprint 11D: guarda também o destinatário usado).
    const { data: delivery, error: insErr } = await admin
      .from("purchase_deliveries")
      .insert({
        purchase_id: purchase.id,
        enviado_email: data.canal_email && emailSent,
        enviado_whatsapp: !!data.canal_whatsapp,
        arquivos,
        enviado_por: context.userId,
        observacao: data.observacao ?? null,
        recipient_email: data.canal_email ? purchase.email : null,
        recipient_whatsapp: data.canal_whatsapp ? purchase.whatsapp : null,
      })
      .select("id, enviado_em")
      .single();
    if (insErr || !delivery) {
      console.error("[deliveries.insert]", insErr);
      throw new Error("Erro ao registrar entrega.");
    }


    // Atualiza status da compra
    const { error: updErr } = await admin
      .from("purchase_requests")
      .update({
        status: "arquivos_enviados",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", purchase.id);
    if (updErr) console.error("[deliveries.updateStatus]", updErr);

    return {
      delivery_id: delivery.id,
      enviado_em: delivery.enviado_em,
      whatsapp_url: whatsappUrl,
      email_mailto_url: emailMailtoUrl,
      email_pending: emailPending,
      links,
    };
  });

function buildEmailBody(nome: string, beatNome: string, links: FileLink[], obs?: string | null): string {
  const lines = [
    `Olá ${nome}!`,
    "",
    "Seu pagamento foi confirmado. Segue o material do beat adquirido:",
    "",
    `Beat: ${beatNome}`,
    "",
    "Arquivos (links válidos por 7 dias):",
    ...links.map((l) => `- ${l.label}: ${l.url}`),
  ];
  if (obs) {
    lines.push("", `Observação: ${obs}`);
  }
  lines.push("", "Documentos:", "- Licença de Uso dos Beats: https://brababeats.app/licenca-de-uso", "- Termos de Uso: https://brababeats.app/termos-uso", "", "Obrigado por comprar na Braba Music!", "— Braba Music");
  return lines.join("\n");
}

function buildWhatsappMessage(nome: string, beatNome: string, links: FileLink[]): string {
  const lines = [
    `Olá ${nome}!`,
    "",
    "Seu pagamento foi confirmado. Segue o material do beat adquirido:",
    "",
    `🎵 ${beatNome}`,
    "",
    "Arquivos (links válidos por 7 dias):",
    ...links.map((l) => `• ${l.label}: ${l.url}`),
    "",
    "Obrigado por comprar na Braba Music! 🔥",
  ];
  return lines.join("\n");
}

export const listDeliveries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ purchase_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const { data: rows, error } = await admin
      .from("purchase_deliveries")
      .select("id, enviado_email, enviado_whatsapp, arquivos, enviado_em, observacao, enviado_por")
      .eq("purchase_id", data.purchase_id)
      .order("enviado_em", { ascending: false });
    if (error) throw new Error(error.message);

    const userIds = Array.from(
      new Set((rows ?? []).map((r) => r.enviado_por).filter((v): v is string => !!v)),
    );
    const emailMap = new Map<string, string>();
    await Promise.all(
      userIds.map(async (uid) => {
        try {
          const { data: u } = await admin.auth.admin.getUserById(uid);
          if (u?.user?.email) emailMap.set(uid, u.user.email);
        } catch (e) {
          console.error("[deliveries.responsavel]", uid, e);
        }
      }),
    );

    return (rows ?? []).map((r) => ({
      ...r,
      enviado_por_email: r.enviado_por ? emailMap.get(r.enviado_por) ?? null : null,
    }));
  });

export const getDeliveryStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context.userId);
    const { data, error } = await admin
      .from("purchase_requests")
      .select("status");
    if (error) throw new Error(error.message);
    let pendentes = 0;
    let enviados = 0;
    (data ?? []).forEach((r) => {
      if (r.status === "pagamento_confirmado") pendentes += 1;
      if (r.status === "arquivos_enviados") enviados += 1;
    });
    return { pendentes, enviados, concluidas: enviados };
  });

export const DELIVERY_FILE_LABELS = LABEL;
