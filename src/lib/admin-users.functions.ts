import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AdminClient = Awaited<ReturnType<typeof getClient>>;

async function getClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertSuperAdmin(userId: string): Promise<AdminClient> {
  const supabaseAdmin = await getClient();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role, is_super, active")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !data.active || !data.is_super) {
    throw new Error("Acesso restrito ao super administrador");
  }
  return supabaseAdmin;
}

async function getEmailMap(supabaseAdmin: AdminClient, ids: string[]) {
  const map = new Map<string, string | null>();
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      map.set(id, data?.user?.email ?? null);
    }),
  );
  return map;
}

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await assertSuperAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, role, is_super, active, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const emails = await getEmailMap(
      supabaseAdmin,
      rows.map((r) => r.user_id),
    );
    return rows.map((r) => ({
      ...r,
      email: emails.get(r.user_id) ?? null,
      is_self: r.user_id === context.userId,
    }));
  });

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email().max(255),
        password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertSuperAdmin(context.userId);
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Falha ao criar usuário");
    }
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin", is_super: false, active: true });
    if (roleErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(roleErr.message);
    }
    return { ok: true };
  });

export const updateAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        email: z.string().email().max(255).optional(),
        password: z.string().min(8).max(72).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const supabaseAdmin = await assertSuperAdmin(context.userId);
    const updates: { email?: string; password?: string } = {};
    if (data.email) updates.email = data.email;
    if (data.password) updates.password = data.password;
    if (Object.keys(updates).length === 0) return { ok: true };
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, updates);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAdminUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) {
      throw new Error("Você não pode desativar a si mesmo");
    }
    const supabaseAdmin = await assertSuperAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .update({ active: data.active })
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) {
      throw new Error("Você não pode remover a si mesmo");
    }
    const supabaseAdmin = await assertSuperAdmin(context.userId);
    // Trigger no banco bloqueia remoção de super admin.
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (roleErr) throw new Error(roleErr.message);
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (authErr) throw new Error(authErr.message);
    return { ok: true };
  });
