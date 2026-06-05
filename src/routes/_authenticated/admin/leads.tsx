import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/Placeholder";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  component: () => (
    <AdminPlaceholder title="Leads" description="Lista de interesses recebidos." />
  ),
});
