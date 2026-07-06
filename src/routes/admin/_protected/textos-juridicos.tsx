import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getLegalTexts, updateLegalTexts } from "@/lib/legal-texts.functions";

export const Route = createFileRoute("/admin/_protected/textos-juridicos")({
  component: LegalTextsPage,
});

function LegalTextsPage() {
  const queryClient = useQueryClient();
  const loadFn = useServerFn(getLegalTexts);
  const saveFn = useServerFn(updateLegalTexts);

  const query = useQuery({
    queryKey: ["admin", "legal-texts"],
    queryFn: () => loadFn(),
    staleTime: 30_000,
  });

  const [form, setForm] = useState({
    legal_text_creditos: "",
    legal_text_registro: "",
    legal_text_royalties: "",
  });

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "legal-texts"] });
      toast.success("Textos jurídicos salvos");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="font-display text-3xl">Textos Jurídicos</h1>
        <p className="text-sm text-muted-foreground">
          Textos padrão aplicados automaticamente a todas as licenças geradas. Alterações
          valem para novas compras — licenças já emitidas mantêm o texto congelado na época.
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
                <FileText className="h-4 w-4 text-accent" /> Créditos
              </CardTitle>
              <CardDescription>
                Como a produtora deve ser creditada nas plataformas e materiais promocionais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="creditos">Texto</Label>
                <Textarea
                  id="creditos"
                  rows={5}
                  value={form.legal_text_creditos}
                  onChange={(e) => update("legal_text_creditos", e.target.value)}
                  maxLength={4000}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-accent" /> Registro da Obra e do Fonograma
              </CardTitle>
              <CardDescription>
                Orientação sobre o registro da obra musical e do fonograma.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="registro">Texto</Label>
                <Textarea
                  id="registro"
                  rows={5}
                  value={form.legal_text_registro}
                  onChange={(e) => update("legal_text_registro", e.target.value)}
                  maxLength={4000}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-accent" /> Divisão de Royalties e Cadastro de Participação
              </CardTitle>
              <CardDescription>
                Orientação para divisão de royalties, splits e participação autoral.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="royalties">Texto</Label>
                <Textarea
                  id="royalties"
                  rows={5}
                  value={form.legal_text_royalties}
                  onChange={(e) => update("legal_text_royalties", e.target.value)}
                  maxLength={4000}
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
              "Salvar textos jurídicos"
            )}
          </Button>
        </>
      )}
    </div>
  );
}
