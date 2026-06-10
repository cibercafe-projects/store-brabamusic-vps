import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageCircle } from "lucide-react";
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

  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    if (query.data) setWhatsapp(query.data.whatsapp_number ?? "");
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (value: string) => saveFn({ data: { whatsapp_number: value } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast.success("Configurações salvas");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="font-display text-3xl">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Parâmetros operacionais da plataforma.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4 text-accent" /> WhatsApp comercial
          </CardTitle>
          <CardDescription>
            Número usado para abrir conversas a partir do formulário "Tenho interesse" do
            catálogo. Use o formato internacional (ex: <code>5511999998888</code>). Deixe vazio
            para que o WhatsApp peça o número manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {query.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="whatsapp">Número (com DDI)</Label>
                <Input
                  id="whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d+\s()-]/g, ""))}
                  placeholder="+55 11 99999-8888"
                  maxLength={30}
                />
              </div>
              <Button
                onClick={() => mutation.mutate(whatsapp)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
