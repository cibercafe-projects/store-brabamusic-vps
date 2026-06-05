import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/Placeholder";

export const Route = createFileRoute("/_authenticated/admin/produtoras")({
  component: () => (
    <AdminPlaceholder title="Produtoras" description="CRUD de produtoras (Sprint 2)." />
  ),
});
