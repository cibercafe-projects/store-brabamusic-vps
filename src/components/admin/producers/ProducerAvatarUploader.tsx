import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { getAvatarUploadUrl } from "@/lib/producers.functions";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  previewUrl: string | null;
  producerId?: string;
  onUploaded: (path: string, previewUrl: string) => void;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"] as const;

export function ProducerAvatarUploader({ previewUrl, producerId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
      toast.error("Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter até 2MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = (["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg") as
        | "jpg"
        | "jpeg"
        | "png"
        | "webp";
      const { path, token } = await getAvatarUploadUrl({
        data: {
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
          ext: safeExt,
          producerId,
        },
      });
      const { error } = await supabase.storage
        .from("producer-avatars")
        .uploadToSignedUrl(path, token, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const localPreview = URL.createObjectURL(file);
      onUploaded(path, localPreview);
      toast.success("Foto enviada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20">
        {previewUrl ? <AvatarImage src={previewUrl} alt="Foto de perfil" /> : null}
        <AvatarFallback>?</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {previewUrl ? "Trocar foto" : "Enviar foto"}
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP. Até 2MB.</p>
      </div>
    </div>
  );
}
