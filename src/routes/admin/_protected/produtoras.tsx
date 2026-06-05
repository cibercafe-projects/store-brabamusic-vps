import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/Placeholder";

export const Route = createFileRoute("/admin/_protected/produtoras")({
  component: () => (
    <AdminPlaceholder title="Produtoras" description="CRUD de produtoras (Sprint 2)." />
  ),
});
