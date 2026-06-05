import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout-shell vazio do /admin: não aplica auth nem sidebar.
// O /admin/login fica fora do gate; rotas protegidas vivem em _protected/.
export const Route = createFileRoute("/admin")({
  component: () => <Outlet />,
});
