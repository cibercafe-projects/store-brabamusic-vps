import { createFileRoute, redirect } from "@tanstack/react-router";

// Compat: rota antiga /produtor/:slug redireciona para /produtora/:slug
export const Route = createFileRoute("/produtor/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/produtora/$slug", params: { slug: params.slug } });
  },
  component: () => null,
});
