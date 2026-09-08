#!/usr/bin/env node
/**
 * Envia e-mail de orientações iniciais para todas as administradoras ativas
 * (role='admin', active=true em public.user_roles).
 *
 * Usa o mesmo pipeline dos outros e-mails: insere em email_send_log (status=pending)
 * e enfileira na fila `transactional_emails` via RPC enqueue_email.
 *
 * Idempotência: idempotencyKey determinístico por admin/mês, então rodar duas
 * vezes no mesmo mês não duplica o envio (PG_SQL UNIQUE idx).
 *
 * Uso:
 *   cd /opt/apps/braba-music
 *   set -a; source .env; set +a
 *   bun scripts/send-admin-orientacoes.ts            # envia
 *   bun scripts/send-admin-orientacoes.ts --dry-run  # só lista destinatários
 */
import { createClient } from "@supabase/supabase-js";
import * as React from "react";
import { render } from "@react-email/components";
import { TEMPLATES } from "../src/lib/email-templates/registry";
import { getSenderDomain, getDefaultFromEmail } from "../src/lib/site-url";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicSiteUrl =
  process.env.PUBLIC_SITE_URL ?? "https://loja.brabamusic.com.br";
const suporteEmail = process.env.SUPPORT_EMAIL ?? "loja@brabamusic.com.br";

if (!supabaseUrl || !serviceKey) {
  console.error(
    "[orientacoes] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios",
  );
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

// Dados da promoção ativa — espelham o cadastro atual em beat_types.
const PROMOCAO = {
  tipo: "Beat Aberto",
  valorCheio: 200,
  valorPromo: 100,
  inicioEm: "06/09/2026 21:00",
  expiraEm: "Sem data definida por enquanto",
  descricao: "Beat Aberto por metade do preço! Aproveite por tempo limitado.",
  link: "https://mpago.la/2btPnWY",
};

const SITE_NAME = "BRABA Beats";
const SENDER_DOMAIN = getSenderDomain();
const FROM_DOMAIN = getDefaultFromEmail();

const mes = new Date().toISOString().slice(0, 7); // YYYY-MM

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// === 1. Buscar admins ativos ===
// PostgREST só expõe schema public, então usamos uma RPC SECURITY DEFINER
// (`public.list_admin_emails`) que faz o JOIN com auth.users internamente.
type AdminEmailRow = { id: string; email: string };

const { data: adminsRows, error: adminsErr } = await supabase.rpc(
  "list_admin_emails",
);

if (adminsErr) {
  console.error("[orientacoes] erro ao listar admins:", adminsErr.message);
  process.exit(1);
}

const admins: { id: string; email: string }[] = (
  (adminsRows ?? []) as AdminEmailRow[]
)
  .map((r) => ({ id: r.id, email: (r.email ?? "").toLowerCase() }))
  .filter((a) => !!a.email);

console.log(`[orientacoes] admins encontrados: ${admins.length}`);
for (const a of admins) console.log(`  - ${a.email}`);

if (DRY_RUN) {
  console.log("[orientacoes] dry-run OK; nenhuma mensagem enviada.");
  process.exit(0);
}

// === 2. Renderizar template e enviar para cada admin ===
const template = TEMPLATES["admin-orientacoes"];
if (!template) {
  console.error("[orientacoes] template admin-orientacoes não registrado");
  process.exit(1);
}

let sent = 0;
let skipped = 0;
let errors = 0;

for (const admin of admins) {
  const adminNome = admin.email.split("@")[0];
  const templateData = {
    adminNome,
    loginUrl: `${publicSiteUrl}/admin/login`,
    resetUrl: `${publicSiteUrl}/admin/reset-password`,
    adminUrl: `${publicSiteUrl}/admin`,
    promocaoTipo: PROMOCAO.tipo,
    promocaoValorCheio: PROMOCAO.valorCheio,
    promocaoValorPromo: PROMOCAO.valorPromo,
    promocaoInicioEm: PROMOCAO.inicioEm,
    promocaoExpiraEm: PROMOCAO.expiraEm,
    promocaoDescricao: PROMOCAO.descricao,
    promocaoLink: PROMOCAO.link,
    suporteEmail,
  };

  // Renderiza o HTML do React Email.
  const element = React.createElement(
    template.component as React.ComponentType<Record<string, unknown>>,
    templateData,
  );
  const html = await render(element);
  const plainText = await render(element, { plainText: true });
  const subject =
    typeof template.subject === "function"
      ? template.subject(templateData)
      : template.subject;

  const messageId = crypto.randomUUID();
  const recipient = admin.email.toLowerCase();

  // 1. Suppression check
  const { data: suppressed } = await supabase
    .from("suppressed_emails")
    .select("id")
    .eq("email", recipient)
    .maybeSingle();
  if (suppressed) {
    console.log(`[orientacoes] ${recipient} suprimido; pulando.`);
    skipped++;
    continue;
  }

  // 2. Idempotência via log (mesma message_id nunca reenvia).
  // Verificamos pelo template + recipient dentro do mês atual.
  const { data: dup } = await supabase
    .from("email_send_log")
    .select("id, status")
    .eq("template_name", "admin-orientacoes")
    .eq("recipient_email", recipient)
    .gte("created_at", `${mes}-01T00:00:00Z`)
    .maybeSingle();
  if (dup) {
    console.log(
      `[orientacoes] ${recipient} já recebeu em ${mes} (status=${dup.status}); pulando.`,
    );
    skipped++;
    continue;
  }

  // 3. Insert no log (pending) — o worker lê daqui.
  const { error: logErr } = await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: "admin-orientacoes",
    recipient_email: recipient,
    status: "pending",
    metadata: { source: "scripts/send-admin-orientacoes", ...templateData },
  });
  if (logErr) {
    console.error(`[orientacoes] ${recipient} log insert falhou:`, logErr.message);
    errors++;
    continue;
  }

  // 4. Enfileira na fila pgmq (worker processa e envia via SMTP).
  const { error: enqErr } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text: plainText,
    },
  });
  if (enqErr) {
    console.error(`[orientacoes] ${recipient} enqueue falhou:`, enqErr.message);
    errors++;
    continue;
  }

  console.log(`[orientacoes] enfileirado: ${recipient} — "${subject}"`);
  sent++;
}

console.log(
  `\n[orientacoes] resultado: ${sent} enfileirado(s), ${skipped} pulado(s), ${errors} erro(s).`,
);
process.exit(errors > 0 ? 1 : 0);
