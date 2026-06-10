import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createLead } from "@/lib/leads.functions";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  telefone: z
    .string()
    .trim()
    .min(8, "Telefone inválido")
    .max(40)
    .regex(/^[+0-9 ()-]+$/, "Telefone inválido"),
  instagram: z.string().trim().max(80).optional(),
  mensagem: z.string().trim().max(1000).optional(),
});

type FormState = z.infer<typeof schema>;

function buildWhatsappLink(
  number: string | null,
  beatName: string,
  produtora: string | null,
  values: FormState,
) {
  const cleanedNumber = (number ?? "").replace(/[^\d]/g, "");
  const lines = [
    "Olá! Tenho interesse no beat:",
    `🎵 ${beatName}${produtora ? ` — prod. ${produtora}` : ""}`,
    "",
    `Nome: ${values.nome}`,
    `Email: ${values.email}`,
    `Telefone: ${values.telefone}`,
  ];
  if (values.instagram) lines.push(`Instagram: @${values.instagram.replace(/^@/, "")}`);
  if (values.mensagem) lines.push("", `Mensagem: ${values.mensagem}`);
  const text = encodeURIComponent(lines.join("\n"));
  if (cleanedNumber) {
    return `https://wa.me/${cleanedNumber}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

export function InterestForm({
  beatId,
  beatName,
  produtora,
  open,
  onOpenChange,
}: {
  beatId: string;
  beatName: string;
  produtora: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [values, setValues] = useState<FormState>({
    nome: "",
    email: "",
    telefone: "",
    instagram: "",
    mensagem: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const submitFn = useServerFn(createLead);
  const mutation = useMutation({
    mutationFn: (payload: FormState) =>
      submitFn({
        data: {
          beat_id: beatId,
          nome: payload.nome,
          email: payload.email,
          telefone: payload.telefone,
          instagram: payload.instagram || undefined,
          mensagem: payload.mensagem || undefined,
        },
      }),
  });

  function update<K extends keyof FormState>(key: K, v: FormState[K]) {
    setValues((p) => ({ ...p, [key]: v }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      parsed.error.issues.forEach((i) => {
        const f = i.path[0] as keyof FormState;
        fieldErrors[f] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }
    try {
      const result = await mutation.mutateAsync(parsed.data);
      toast.success("Interesse registrado! Continuando no WhatsApp...");
      const url = buildWhatsappLink(
        result.whatsappNumber,
        result.beat.nome,
        result.produtora,
        parsed.data,
      );
      window.open(url, "_blank", "noopener,noreferrer");
      onOpenChange(false);
      setValues({ nome: "", email: "", telefone: "", instagram: "", mensagem: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tenho interesse</DialogTitle>
          <DialogDescription>
            Beat: <span className="font-medium text-foreground">{beatName}</span>
            {produtora ? <> · prod. {produtora}</> : null}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="lead-nome">Nome *</Label>
            <Input
              id="lead-nome"
              value={values.nome}
              onChange={(e) => update("nome", e.target.value)}
              maxLength={120}
              autoComplete="name"
              required
            />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="lead-email">E-mail *</Label>
            <Input
              id="lead-email"
              type="email"
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              maxLength={255}
              autoComplete="email"
              required
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="lead-telefone">Telefone (WhatsApp) *</Label>
            <Input
              id="lead-telefone"
              inputMode="tel"
              value={values.telefone}
              onChange={(e) => update("telefone", e.target.value)}
              placeholder="(11) 99999-9999"
              maxLength={40}
              autoComplete="tel"
              required
            />
            {errors.telefone && (
              <p className="text-xs text-destructive">{errors.telefone}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="lead-instagram">Instagram</Label>
            <Input
              id="lead-instagram"
              value={values.instagram}
              onChange={(e) => update("instagram", e.target.value.replace(/^@/, ""))}
              placeholder="seu_user"
              maxLength={80}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lead-mensagem">Mensagem</Label>
            <Textarea
              id="lead-mensagem"
              value={values.mensagem}
              onChange={(e) => update("mensagem", e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Conte rapidamente o que você quer fazer com o beat (opcional)"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                "Enviar e abrir WhatsApp"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
