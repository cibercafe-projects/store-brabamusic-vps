import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/Placeholder";

export const Route = createFileRoute("/admin/_protected/beats")({
  component: () => (
    <AdminPlaceholder title="Beats" description="CRUD de beats com upload (Sprint 3)." />
  ),
});
