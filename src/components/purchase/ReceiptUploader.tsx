import { useRef, useState } from "react";
import { Loader2, Upload, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { uploadReceiptByToken } from "@/lib/purchases.functions";
import { removePendingPurchase } from "@/lib/pending-purchase";
import { Button } from "@/components/ui/button";

const ALLOWED = ["image/jpeg", "image/png", "application/pdf"];
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_BYTES * 1.4);

function friendlyUploadError(e: unknown): string {
  if (!(e instanceof Error)) return "Não foi possível enviar o comprovante. Tente novamente.";
  const msg = e.message ?? "";
  if (/413|request entity too large|payload too large/i.test(msg)) {
    return "Arquivo muito grande para envio pelo celular. Tente uma foto menor (máx. 8 MB).";
  }
  if (/<[^>]+>/.test(msg)) {
    return "Não foi possível enviar o comprovante. Tente novamente em instantes.";
  }
  return msg.trim() || "Não foi possível enviar o comprovante. Tente novamente.";
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export function ReceiptUploader({ token, onSuccess }: { token: string; onSuccess?: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState(false);
  const uploadFn = useServerFn(uploadReceiptByToken);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Use JPG, PNG ou PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo muito grande (máx. 8 MB).");
      return;
    }
    setUploading(true);
    try {
      const data_base64 = await toBase64(file);
      if (data_base64.length > MAX_BASE64_LENGTH) {
        toast.error(
          "Arquivo muito grande para envio pelo celular. Tente uma foto menor (máx. 8 MB).",
        );
        return;
      }
      await uploadFn({
        data: {
          token,
          filename: file.name,
          content_type: file.type,
          data_base64,
        },
      });
      setSent(true);
      removePendingPurchase(token);
      toast.success("Comprovante enviado!");
      onSuccess?.();
    } catch (e) {
      toast.error(friendlyUploadError(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
          </>
        ) : sent ? (
          <>
            <FileCheck2 className="h-4 w-4" /> Enviar outro
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> Selecionar comprovante
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Formatos aceitos: JPG, PNG ou PDF (máx. 8 MB).
      </p>
    </div>
  );
}
