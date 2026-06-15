import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, KeyRound, Link as LinkIcon, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getAppSettings, updateAppSettings } from "@/lib/settings.functions";

export const Route = createFileRoute("/admin/_protected/configuracoes")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getAppSettings);
  const saveFn = useServerFn(updateAppSettings);

  const query = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => loadFn(),
    staleTime: 30_000,
  });

  const [form, setForm] = useState({
    whatsapp_number: "",
    pix_key: "",
    payment_link: "",
    commercial_whatsapp: "",
    admin_notification_email: "",
  });

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-settings"] });
      toast.success("Configurações salvas");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-display text-3xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Parâmetros operacionais da plataforma.
        </p>
      </header>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : (
        <>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4 text-accent" /> WhatsApp Comercial (fluxo de compra)
              </CardTitle>
              <CardDescription>
                Número exibido no modal de compra e usado no botão "Falar com a Braba".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="comm">Número (com DDI)</Label>
                <Input
                  id="comm"
                  value={form.commercial_whatsapp}
                  onChange={(e) =>
                    update("commercial_whatsapp", e.target.value.replace(/[^\d+\s()-]/g, ""))
                  }
                  placeholder="+5511913401000"
                  maxLength={30}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4 text-accent" /> Chave PIX
              </CardTitle>
              <CardDescription>
                Exibida ao cliente no modal de compra quando ele escolhe PIX.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pix">Chave</Label>
                <Input
                  id="pix"
                  value={form.pix_key}
                  onChange={(e) => update("pix_key", e.target.value)}
                  placeholder="CPF, e-mail, telefone ou aleatória"
                  maxLength={160}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LinkIcon className="h-4 w-4 text-accent" /> Link de pagamento
              </CardTitle>
              <CardDescription>
                Link externo (ex: cobrança bancária, Pix Copia&Cola, etc.) exibido como alternativa ao PIX.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="link">URL</Label>
                <Input
                  id="link"
                  type="url"
                  value={form.payment_link}
                  onChange={(e) => update("payment_link", e.target.value)}
                  placeholder="https://..."
                  maxLength={500}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-accent" /> E-mail para notificações administrativas
              </CardTitle>
              <CardDescription>
                Destinatário das notificações automáticas: novas compras, comprovantes recebidos e novos lançamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="admin-email">E-mail</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={form.admin_notification_email}
                  onChange={(e) => update("admin_notification_email", e.target.value)}
                  placeholder="admin@brababeats.app"
                  maxLength={255}
                />
              </div>
            </CardContent>
          </Card>


          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            size="lg"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              "Salvar tudo"
            )}
          </Button>
        </>
      )}
    </div>
  );
}
