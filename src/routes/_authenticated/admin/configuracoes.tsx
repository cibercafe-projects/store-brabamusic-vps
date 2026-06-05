import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/Placeholder";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  component: () => (
    <AdminPlaceholder
      title="Configurações"
      description="WhatsApp, e-mails da equipe, contatos do rodapé."
    />
  ),
});
