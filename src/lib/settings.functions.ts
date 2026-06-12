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
    console.error("[settings] role check", error);
    throw new Error("Erro interno. Tente novamente em instantes.");
  }
  if (!data) throw new Error("Acesso negado");
  return supabaseAdmin;
}

const KEYS = [
  "whatsapp_number",
  "pix_key",
  "payment_link",
  "commercial_whatsapp",
] as const;

export const getAppSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context.userId);
    const { data, error } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", KEYS as unknown as string[]);
    if (error) {
      console.error("[settings.get]", error);
      throw new Error("Erro ao carregar configurações.");
    }
    const map: Record<string, string> = {};
    (data ?? []).forEach((r) => {
      map[r.key] = r.value ?? "";
    });
    return {
      whatsapp_number: map.whatsapp_number ?? "",
      pix_key: map.pix_key ?? "",
      payment_link: map.payment_link ?? "",
      commercial_whatsapp: map.commercial_whatsapp ?? "",
    };
  });

const settingsInput = z.object({
  whatsapp_number: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9 ()-]*$/, "Apenas dígitos, +, espaços, () e -")
    .optional()
    .default(""),
  pix_key: z.string().trim().max(160).optional().default(""),
  payment_link: z
    .string()
    .trim()
    .max(500)
    .optional()
    .default("")
    .refine((v) => !v || /^https?:\/\//.test(v), "Use uma URL http(s)://"),
  commercial_whatsapp: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9 ()-]*$/, "Apenas dígitos, +, espaços, () e -")
    .optional()
    .default(""),
});

export const updateAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsInput.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const cleanedWa = (data.whatsapp_number ?? "").replace(/[^\d+]/g, "");
    const cleanedCommercial = (data.commercial_whatsapp ?? "").replace(/[^\d+]/g, "");
    const rows = [
      { key: "whatsapp_number", value: cleanedWa },
      { key: "pix_key", value: data.pix_key ?? "" },
      { key: "payment_link", value: data.payment_link ?? "" },
      { key: "commercial_whatsapp", value: cleanedCommercial },
    ];
    const { error } = await admin
      .from("app_settings")
      .upsert(rows, { onConflict: "key" });
    if (error) {
      console.error("[settings.update]", error);
      throw new Error("Erro ao salvar configurações.");
    }
    return { ok: true };
  });
