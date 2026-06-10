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

export const getAppSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context.userId);
    const { data, error } = await admin
      .from("app_settings")
      .select("key, value");
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
});

export const updateAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsInput.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const cleaned = (data.whatsapp_number ?? "").replace(/[^\d+]/g, "");
    const { error } = await admin
      .from("app_settings")
      .upsert({ key: "whatsapp_number", value: cleaned }, { onConflict: "key" });
    if (error) {
      console.error("[settings.update]", error);
      throw new Error("Erro ao salvar configurações.");
    }
    return { ok: true };
  });
