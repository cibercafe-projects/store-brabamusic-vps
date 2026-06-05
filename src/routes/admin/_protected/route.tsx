import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { checkAdminRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/_protected")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/admin/login" });
    try {
      const { isAdmin } = await checkAdminRole();
      if (!isAdmin) {
        await supabase.auth.signOut();
        throw redirect({ to: "/admin/login" });
      }
    } catch (e) {
      if ((e as { isRedirect?: boolean })?.isRedirect) throw e;
      throw redirect({ to: "/admin/login" });
    }
    return { user: data.user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-white/10 px-4">
            <SidebarTrigger />
            <span className="ml-4 text-sm text-muted-foreground">Backoffice Braba Music</span>
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
