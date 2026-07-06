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
    console.error("[legal-texts] role check", error);
    throw new Error("Erro interno. Tente novamente em instantes.");
  }
  if (!data) throw new Error("Acesso negado");
  return supabaseAdmin;
}

const KEYS = [
  "legal_text_creditos",
  "legal_text_registro",
  "legal_text_royalties",
] as const;

export const getLegalTexts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context.userId);
    const { data, error } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", KEYS as unknown as string[]);
    if (error) {
      console.error("[legal-texts.get]", error);
      throw new Error("Erro ao carregar textos jurídicos.");
    }
    const map: Record<string, string> = {};
    (data ?? []).forEach((r) => {
      map[r.key] = r.value ?? "";
    });
    return {
      legal_text_creditos: map.legal_text_creditos ?? "",
      legal_text_registro: map.legal_text_registro ?? "",
      legal_text_royalties: map.legal_text_royalties ?? "",
    };
  });

const legalTextsInput = z.object({
  legal_text_creditos: z.string().trim().max(4000).optional().default(""),
  legal_text_registro: z.string().trim().max(4000).optional().default(""),
  legal_text_royalties: z.string().trim().max(4000).optional().default(""),
});

export const updateLegalTexts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => legalTextsInput.parse(input))
  .handler(async ({ context, data }) => {
    const admin = await assertAdmin(context.userId);
    const rows = [
      { key: "legal_text_creditos", value: data.legal_text_creditos ?? "" },
      { key: "legal_text_registro", value: data.legal_text_registro ?? "" },
      { key: "legal_text_royalties", value: data.legal_text_royalties ?? "" },
    ];
    const { error } = await admin
      .from("app_settings")
      .upsert(rows, { onConflict: "key" });
    if (error) {
      console.error("[legal-texts.update]", error);
      throw new Error("Erro ao salvar textos jurídicos.");
    }
    return { ok: true };
  });
