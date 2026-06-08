import { useRef, useState } from "react";
import { Loader2, Music2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getBeatPreviewUploadUrl } from "@/lib/beats.functions";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  previewUrl: string | null;
  beatId?: string;
  onUploaded: (path: string, previewUrl: string) => void;
  onClear?: () => void;
};

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
] as const;

type AcceptedType = (typeof ACCEPTED_TYPES)[number];

export function BeatPreviewUploader({ previewUrl, beatId, onUploaded, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    const lower = file.name.toLowerCase();
    const isMp3 = lower.endsWith(".mp3");
    const isWav = lower.endsWith(".wav");
    if (!isMp3 && !isWav) {
      toast.error("Use MP3 ou WAV.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error("Áudio deve ter até 30MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = isMp3 ? "mp3" : "wav";
      const contentType: AcceptedType = (
        ACCEPTED_TYPES.includes(file.type as AcceptedType)
          ? file.type
          : isMp3
            ? "audio/mpeg"
            : "audio/wav"
      ) as AcceptedType;
      const { path, token } = await getBeatPreviewUploadUrl({
        data: { contentType, ext, beatId },
      });
      const { error } = await supabase.storage
        .from("beat-previews")
        .uploadToSignedUrl(path, token, file, { contentType, upsert: true });
      if (error) throw error;
      const localPreview = URL.createObjectURL(file);
      onUploaded(path, localPreview);
      toast.success("Preview enviado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-md border bg-muted">
          <Music2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
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
            {previewUrl ? "Trocar preview" : "Enviar preview"}
          </Button>
          {previewUrl && onClear ? (
            <Button type="button" variant="ghost" size="sm" onClick={onClear}>
              <X className="h-4 w-4" />
              Remover
            </Button>
          ) : null}
        </div>
      </div>
      {previewUrl ? (
        <audio src={previewUrl} controls className="w-full" preload="metadata" />
      ) : null}
      <p className="text-xs text-muted-foreground">MP3 ou WAV. Até 30MB.</p>
    </div>
  );
}
