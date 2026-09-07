import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminBootstrapNeeded, bootstrapFirstAdmin } from "@/lib/admin.functions";
import { translateAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const checkBootstrap = useServerFn(adminBootstrapNeeded);
  const bootstrap = useServerFn(bootstrapFirstAdmin);

  const { data: bootstrapState } = useQuery({
    queryKey: ["admin-bootstrap-needed"],
    queryFn: () => checkBootstrap(),
  });

  const needsBootstrap = bootstrapState?.needed ?? false;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);

  async function handleForgotPassword() {
    if (!email) {
      toast.error("Informe seu e-mail acima para receber o link de recuperação.");
      return;
    }
    setRecovering(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      if (error) throw error;
      toast.success(
        "Enviamos um link de redefinição para seu e-mail. Clique no link (começa com Redefinição de senha) para definir sua nova senha.",
      );
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setRecovering(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (needsBootstrap) {
        await bootstrap({ data: { email, password } });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Administrador criado com sucesso!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/admin/dashboard", replace: true });
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-2xl text-gradient">
            {needsBootstrap ? "Criar primeiro administrador" : "Login Admin"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={needsBootstrap ? "new-password" : "current-password"}
              />
              {needsBootstrap && (
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Aguarde..." : needsBootstrap ? "Criar admin" : "Entrar"}
            </Button>
            {!needsBootstrap && (
              <>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={recovering}
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 w-full text-center"
                >
                  {recovering ? "Enviando..." : "Esqueci minha senha"}
                </button>
                <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                  Ao pedir a recuperação, <strong>clique no link do e-mail</strong> para definir uma
                  nova senha. O código numérico do e-mail serve apenas de verificação e{" "}
                  <strong>não é uma senha</strong>.
                </p>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
