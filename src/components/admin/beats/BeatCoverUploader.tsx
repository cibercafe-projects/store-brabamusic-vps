import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getBeatCoverUploadUrl } from "@/lib/beats.functions";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  previewUrl: string | null;
  beatId?: string;
  onUploaded: (path: string, previewUrl: string) => void;
  onClear?: () => void;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"] as const;

export function BeatCoverUploader({ previewUrl, beatId, onUploaded, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
      toast.error("Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter até 5MB.");
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
      const { path, token } = await getBeatCoverUploadUrl({
        data: {
          contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
          ext: safeExt,
          beatId,
        },
      });
      const { error } = await supabase.storage
        .from("beat-covers")
        .uploadToSignedUrl(path, token, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const localPreview = URL.createObjectURL(file);
      onUploaded(path, localPreview);
      toast.success("Capa enviada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-24 w-24 rounded-md bg-muted overflow-hidden flex items-center justify-center border">
        {previewUrl ? (
          <img src={previewUrl} alt="Capa" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
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
        <div className="flex gap-2">
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
            {previewUrl ? "Trocar capa" : "Enviar capa"}
          </Button>
          {previewUrl && onClear ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4" />
              Remover
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP. Até 5MB.</p>
      </div>
    </div>
  );
}
