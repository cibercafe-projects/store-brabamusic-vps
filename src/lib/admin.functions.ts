import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Verifica se o usuário autenticado tem role `admin`. */
export const checkAdminRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role, is_super, active")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const isAdmin = !!data && data.active === true;
    return {
      isAdmin,
      isSuperAdmin: isAdmin && data?.is_super === true,
    };
  });

/**
 * Bootstrap do primeiro admin: cria usuário + role admin.
 * Só funciona se ainda NÃO existir nenhum admin no sistema.
 */
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email().max(255),
        password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) {
      console.error("[bootstrapFirstAdmin] count error", countErr);
      throw new Error("Erro interno. Tente novamente em instantes.");
    }
    if ((count ?? 0) > 0) {
      throw new Error("Um administrador já foi configurado. Use o login.");
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      console.error("[bootstrapFirstAdmin] create user error", createErr);
      throw new Error("Não foi possível criar o administrador. Tente novamente.");
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin", is_super: true, active: true });
    if (roleErr) {
      console.error("[bootstrapFirstAdmin] role insert error", roleErr);
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Não foi possível concluir a configuração inicial. Tente novamente.");
    }

    return { ok: true };
  });

/** Retorna true se ainda não há nenhum admin (libera tela de bootstrap). */
export const adminBootstrapNeeded = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) {
    console.error("[adminBootstrapNeeded] count error", error);
    throw new Error("Erro interno. Tente novamente em instantes.");
  }
  return { needed: (count ?? 0) === 0 };
});

