import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Music,
  Inbox,
  Settings,
  LogOut,
  ShieldCheck,
  Disc3,
  ShoppingCart,
  Tags,
  FileText,
  MessageSquare,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { checkAdminRole } from "@/lib/admin.functions";
import { countNewReleases } from "@/lib/releases.functions";

const items = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Produtoras", url: "/admin/produtoras", icon: Users },
  { title: "Beats", url: "/admin/beats", icon: Music },
  { title: "Leads", url: "/admin/leads", icon: Inbox },
  { title: "Lançamentos", url: "/admin/lancamentos", icon: Disc3 },
  { title: "Compras", url: "/admin/compras", icon: ShoppingCart },
  { title: "Tipos de Beat", url: "/admin/tipos-beat", icon: Tags },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
  { title: "Textos Jurídicos", url: "/admin/textos-juridicos", icon: FileText },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const checkRole = useServerFn(checkAdminRole);
  const countNewFn = useServerFn(countNewReleases);

  const roleQuery = useQuery({
    queryKey: ["admin-role"],
    queryFn: () => checkRole(),
    staleTime: 60_000,
  });

  const newReleasesQuery = useQuery({
    queryKey: ["admin", "releases-new-count"],
    queryFn: () => countNewFn(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  async function handleLogout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-4">
        <span className="font-display text-xl text-gradient">BRABA Admin</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const badge =
                  item.url === "/admin/lancamentos" && (newReleasesQuery.data?.count ?? 0) > 0
                    ? newReleasesQuery.data!.count
                    : null;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.title}</span>
                        {badge !== null && (
                          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-semibold px-1.5">
                            {badge}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {roleQuery.data?.isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin/usuarios")}>
                    <Link to="/admin/usuarios" className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
