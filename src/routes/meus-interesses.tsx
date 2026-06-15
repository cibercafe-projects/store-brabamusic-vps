import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/meus-interesses")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
