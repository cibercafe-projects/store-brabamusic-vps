import { useRef, useState } from "react";
import { FileArchive, FileAudio, FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getBeatPrivateUploadUrl, type BeatPrivateKind } from "@/lib/beats.functions";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  kind: BeatPrivateKind;
  path: string | null;
  beatId?: string;
  onUploaded: (path: string) => void;
  onClear?: () => void;
};

const META: Record<
  BeatPrivateKind,
  { label: string; accept: string; exts: string[]; hint: string; Icon: typeof FileAudio }
> = {
  wav: {
    label: "Áudio Master",
    accept: ".wav,.mp3,audio/wav,audio/x-wav,audio/mpeg",
    exts: ["wav", "mp3"],
    hint: "Arquivo .wav ou .mp3 até 250MB",
    Icon: FileAudio,
  },
  stems: {
    label: "STEMS (ZIP ou RAR)",
    accept: ".zip,.rar,application/zip,application/x-zip-compressed,application/vnd.rar,application/x-rar-compressed",
    exts: ["zip", "rar"],
    hint: "Pacote .zip ou .rar até 500MB",
    Icon: FileArchive,
  },
  license: {
    label: "Documento",
    accept: ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    exts: ["pdf", "doc", "docx"],
    hint: "PDF/DOC opcional até 20MB",
    Icon: FileText,
  },
};

export function BeatPrivateFileUploader({ kind, path, beatId, onUploaded, onClear }: Props) {
  const meta = META[kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!meta.exts.includes(ext)) {
      toast.error(`Use ${meta.exts.join(", ").toUpperCase()}.`);
      return;
    }
    setUploading(true);
    try {
      const { path: newPath, token, bucket } = await getBeatPrivateUploadUrl({
        data: { kind, ext, beatId },
      });
      const { error } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(newPath, token, file, { upsert: true });
      if (error) throw error;
      onUploaded(newPath);
      toast.success(`${meta.label} enviado.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  }

  const Icon = meta.Icon;
  const filename = path ? path.split("/").pop() : null;

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-md border bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{meta.label}</p>
          {filename ? (
            <p className="text-xs text-muted-foreground truncate font-mono">{filename}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{meta.hint}</p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={meta.accept}
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
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {path ? "Trocar" : "Enviar"}
        </Button>
        {path && onClear ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={uploading}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
