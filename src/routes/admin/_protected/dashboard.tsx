import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/Placeholder";

export const Route = createFileRoute("/admin/_protected/dashboard")({
  component: () => (
    <AdminPlaceholder title="Dashboard" description="KPIs de leads, beats ativos e conversões." />
  ),
});
