/**
 * Server-only helper that enqueues an app email directly via supabaseAdmin,
 * bypassing the /lovable/email/transactional/send HTTP route (which requires a
 * user JWT). This lets us trigger emails from public server fns and from
 * unauthenticated webhook-style flows.
 *
 * Behavior mirrors the scaffolded /send route: suppression check, unsubscribe
 * token reuse/creation, React Email render, pgmq enqueue.
 */
import * as React from "react";
import { render } from "@react-email/components";
import { TEMPLATES } from "@/lib/email-templates/registry";

const SITE_NAME = "BRABA Beats";
const SENDER_DOMAIN = "notify.brababeats.app";
const FROM_DOMAIN = "notify.brababeats.app";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type SendAppEmailInput = {
  templateName: string;
  recipientEmail: string;
  idempotencyKey?: string;
  templateData?: Record<string, unknown>;
};

export type SendAppEmailResult =
  | { ok: true; queued: true; messageId: string }
  | { ok: false; reason: "suppressed" | "template_not_found" | "error"; error?: string };

export async function sendAppEmail(
  input: SendAppEmailInput,
): Promise<SendAppEmailResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const template = TEMPLATES[input.templateName];
  if (!template) {
    console.error("[email.send] template not found", input.templateName);
    return { ok: false, reason: "template_not_found" };
  }

  const recipient = (template.to || input.recipientEmail || "").trim();
  if (!recipient) {
    return { ok: false, reason: "error", error: "missing_recipient" };
  }
  const normalized = recipient.toLowerCase();
  const messageId = crypto.randomUUID();
  const idempotencyKey = input.idempotencyKey || messageId;
  const templateData = input.templateData ?? {};

  // 1. Suppression check
  const { data: suppressed, error: supErr } = await supabaseAdmin
    .from("suppressed_emails")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();
  if (supErr) {
    console.error("[email.send] suppression check failed", supErr);
    return { ok: false, reason: "error", error: supErr.message };
  }
  if (suppressed) {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: recipient,
      status: "suppressed",
    });
    return { ok: false, reason: "suppressed" };
  }

  // 2. Unsubscribe token (one per email, reuse if unused)
  let unsubscribeToken: string | null = null;
  const { data: existing } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalized)
    .maybeSingle();
  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token;
  } else if (!existing) {
    const candidate = generateToken();
    await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .upsert(
        { token: candidate, email: normalized },
        { onConflict: "email", ignoreDuplicates: true },
      );
    const { data: stored } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", normalized)
      .maybeSingle();
    unsubscribeToken = stored?.token ?? candidate;
  } else {
    // token used but recipient not suppressed — safety skip
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: recipient,
      status: "suppressed",
    });
    return { ok: false, reason: "suppressed" };
  }

  // 3. Render
  let html: string;
  let plainText: string;
  try {
    const element = React.createElement(
      template.component as React.ComponentType<Record<string, unknown>>,
      templateData,
    );
    html = await render(element);
    plainText = await render(element, { plainText: true });
  } catch (e) {
    console.error("[email.send] render failed", e);
    return { ok: false, reason: "error", error: "render_failed" };
  }

  const subject =
    typeof template.subject === "function"
      ? template.subject(templateData)
      : template.subject;

  // 4. Enqueue
  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: input.templateName,
    recipient_email: recipient,
    status: "pending",
  });

  const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text: plainText,
      purpose: "transactional",
      label: input.templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqErr) {
    console.error("[email.send] enqueue failed", enqErr);
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: recipient,
      status: "failed",
      error_message: enqErr.message,
    });
    return { ok: false, reason: "error", error: enqErr.message };
  }

  return { ok: true, queued: true, messageId };
}

/** Fire-and-forget wrapper: never throws, just logs. */
export async function sendAppEmailSafe(input: SendAppEmailInput): Promise<void> {
  try {
    const res = await sendAppEmail(input);
    if (!res.ok) {
      console.warn("[email.send] not sent", input.templateName, res);
    }
  } catch (e) {
    console.error("[email.send] unexpected error", input.templateName, e);
  }
}

/** Resolves the admin notification email from app_settings. */
export async function getAdminNotificationEmail(): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "admin_notification_email")
    .maybeSingle();
  const v = (data?.value ?? "").trim();
  return v.length > 0 ? v : null;
}
