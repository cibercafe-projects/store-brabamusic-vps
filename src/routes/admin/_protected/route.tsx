import { useEffect } from "react";
import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { checkAdminRole } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/_protected")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/admin/login" });
    return { user: data.user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const checkRole = useServerFn(checkAdminRole);
  const roleQuery = useQuery({
    queryKey: ["admin-role"],
    queryFn: () => checkRole(),
    retry: 2,
    retryDelay: 500,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!roleQuery.data || roleQuery.data.isAdmin) return;
    supabase.auth.signOut().finally(() => {
      navigate({ to: "/admin/login", replace: true });
    });
  }, [navigate, roleQuery.data]);

  if (roleQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Validando acesso...
        </div>
      </div>
    );
  }

  if (roleQuery.isError) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <div>
            <h1 className="font-display text-2xl">Não foi possível validar o acesso</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sua sessão pode estar expirando. Tente novamente ou entre no admin de novo.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button onClick={() => roleQuery.refetch()}>Tentar novamente</Button>
            <Button variant="outline" onClick={() => navigate({ to: "/admin/login", replace: true })}>
              Ir para login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!roleQuery.data?.isAdmin) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Redirecionando...
        </div>
      </div>
    );
  }

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
