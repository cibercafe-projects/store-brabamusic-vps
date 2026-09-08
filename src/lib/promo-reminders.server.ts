/**
 * Job de lembretes de promoções por tipo de beat.
 *
 * Roda a cada 5 minutos dentro do processo Nitro (PM2). Procura promoções com
 * início entre agora e agora+1h que ainda não tiveram lembrete enviado, dispara
 * e-mail ao admin e marca `promo_reminder_sent_at = now()`.
 *
 * O import deste arquivo é o que ativa o scheduler (side-effect). Carregado
 * por `src/server.ts`.
 *
 * Exporta `ensurePromoReminderJob()` como âncora para o bundler (evita tree-shake
 * do side-effect em builds de produção).
 */
import { sendAppEmailSafe, getAdminNotificationEmail } from "@/lib/email/send.server";

const INTERVAL_MS = 5 * 60 * 1000;
const INITIAL_DELAY_MS = 30 * 1000;
const REMINDER_WINDOW_HOURS = 1;

type PromoReminderRow = {
  id: string;
  nome: string;
  valor_padrao: number | string;
  promo_valor: number | string | null;
  promo_inicio_em: string | null;
};

function formatBRL(value: number | string | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

async function runPromoReminders(): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

    const { data: rows, error } = await supabaseAdmin
      .from("beat_types")
      .select("id, nome, valor_padrao, promo_valor, promo_inicio_em")
      .eq("promo_ativa", true)
      .not("promo_inicio_em", "is", null)
      .gte("promo_inicio_em", now.toISOString())
      .lte("promo_inicio_em", windowEnd.toISOString())
      .is("promo_reminder_sent_at", null);

    if (error) {
      console.error("[promo-reminders] query", error);
      return;
    }

    const typed = (rows ?? []) as PromoReminderRow[];
    if (!typed.length) return;

    const adminEmail = await getAdminNotificationEmail();
    if (!adminEmail) {
      console.warn("[promo-reminders] sem e-mail de admin configurado; nada a fazer.");
      return;
    }

    for (const row of typed) {
      const minutos = Math.max(
        1,
        Math.round((new Date(row.promo_inicio_em!).getTime() - now.getTime()) / 60000),
      );
      try {
        await sendAppEmailSafe({
          templateName: "admin-promo-reminder",
          recipientEmail: adminEmail,
          idempotencyKey: `admin-promo-reminder-${row.id}-${row.promo_inicio_em}`,
          templateData: {
            beatTypeNome: row.nome,
            valorCheio: row.valor_padrao,
            valorPromo: row.promo_valor,
            minutosAteInicio: minutos,
          },
        });
        await supabaseAdmin
          .from("beat_types")
          .update({ promo_reminder_sent_at: new Date().toISOString() })
          .eq("id", row.id);
      } catch (err) {
        console.error("[promo-reminders] erro ao enviar lembrete", row.id, err);
      }
    }
  } catch (err) {
    console.error("[promo-reminders] erro inesperado", err);
  }
}

/** Âncora para o bundler; também roda o job uma vez para uso em testes. */
export function ensurePromoReminderJob(): Promise<void> {
  return runPromoReminders();
}

// Boot do scheduler (uma vez por processo).
if (typeof globalThis !== "undefined") {
  const g = globalThis as { __brabaPromoRemindersBooted?: boolean };
  if (!g.__brabaPromoRemindersBooted) {
    g.__brabaPromoRemindersBooted = true;
    console.log("[promo-reminders] scheduler iniciado");
    setTimeout(() => {
      void runPromoReminders();
    }, INITIAL_DELAY_MS);
    setInterval(() => {
      void runPromoReminders();
    }, INTERVAL_MS);
  }
}
