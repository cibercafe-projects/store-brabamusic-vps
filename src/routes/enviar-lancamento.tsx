import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Upload, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  RELEASE_GENRES,
  RELEASE_MOODS,
  RELEASE_INSTRUMENTS,
  RELEASE_TYPES,
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  MAX_PROMO_PHOTOS,
  type ReleaseType,
} from "@/lib/releases.constants";
import { getReleaseUploadUrl, submitRelease } from "@/lib/releases.functions";

export const Route = createFileRoute("/enviar-lancamento")({
  head: () => ({
    meta: [
      { title: "Enviar lançamento — Braba Music" },
      {
        name: "description",
        content:
          "Envie sua música para ser distribuída pela Braba Music. Single, EP ou Álbum.",
      },
    ],
  }),
  component: SubmitReleasePage,
});

type AudioFile = {
  path: string;
  original_name: string;
  size_bytes: number;
  format: "wav" | "mp3";
};

function extFromName(name: string): string {
  return (name.split(".").pop() || "").toLowerCase();
}

function audioFormat(name: string, type: string): "wav" | "mp3" | null {
  const ext = extFromName(name);
  if (ext === "wav" || type.includes("wav")) return "wav";
  if (ext === "mp3" || type.includes("mpeg") || type.includes("mp3")) return "mp3";
  return null;
}

function SubmitReleasePage() {
  const startedAt = useRef(Date.now()).current;
  const [submitted, setSubmitted] = useState(false);

  // Basic fields
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [artistName, setArtistName] = useState("");
  const [releaseType, setReleaseType] = useState<ReleaseType>("single");
  const [releaseName, setReleaseName] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [isrc, setIsrc] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [technicalSheet, setTechnicalSheet] = useState("");
  const [royalties, setRoyalties] = useState("");
  const [aboutArtist, setAboutArtist] = useState("");
  const [aboutRelease, setAboutRelease] = useState("");
  const [hasVideoclip, setHasVideoclip] = useState<"sim" | "nao">("nao");
  const [website, setWebsite] = useState(""); // honeypot

  // Files
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const [photos, setPhotos] = useState<{ path: string }[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const uploadFn = useServerFn(getReleaseUploadUrl);
  const submitFn = useServerFn(submitRelease);

  const toggle = (arr: string[], v: string, max: number) => {
    if (arr.includes(v)) return arr.filter((x) => x !== v);
    if (arr.length >= max) return arr;
    return [...arr, v];
  };

  async function uploadOne(
    file: File,
    kind: "cover" | "audio" | "photo",
  ): Promise<{ path: string }> {
    const ext = extFromName(file.name);
    const { path, token, bucket } = await uploadFn({
      data: { kind, ext, contentType: file.type || "application/octet-stream" },
    });
    const { error } = await supabase.storage
      .from(bucket)
      .uploadToSignedUrl(path, token, file, {
        contentType: file.type,
        upsert: true,
      });
    if (error) throw error;
    return { path };
  }

  async function handleCover(file: File) {
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Imagem deve ter até 10MB.");
      return;
    }
    setUploadingCover(true);
    try {
      const { path } = await uploadOne(file, "cover");
      setCoverPath(path);
      setCoverPreview(URL.createObjectURL(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload da capa.");
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleAudio(files: FileList) {
    const list = Array.from(files);
    if (releaseType === "single" && list.length + audioFiles.length > 1) {
      toast.error("Single permite apenas 1 arquivo.");
      return;
    }
    setUploadingAudio(true);
    try {
      const uploaded: AudioFile[] = [];
      for (const f of list) {
        const fmt = audioFormat(f.name, f.type);
        if (!fmt) {
          toast.error(`${f.name}: use WAV ou MP3.`);
          continue;
        }
        if (f.size > MAX_AUDIO_BYTES) {
          toast.error(`${f.name}: até 100MB.`);
          continue;
        }
        const { path } = await uploadOne(f, "audio");
        uploaded.push({
          path,
          original_name: f.name,
          size_bytes: f.size,
          format: fmt,
        });
      }
      setAudioFiles((prev) =>
        releaseType === "single" ? uploaded.slice(0, 1) : [...prev, ...uploaded],
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload do áudio.");
    } finally {
      setUploadingAudio(false);
    }
  }

  async function handlePhotos(files: FileList) {
    const list = Array.from(files);
    if (photos.length + list.length > MAX_PROMO_PHOTOS) {
      toast.error(`Máximo de ${MAX_PROMO_PHOTOS} fotos.`);
      return;
    }
    setUploadingPhotos(true);
    try {
      const uploaded: { path: string }[] = [];
      for (const f of list) {
        if (f.size > MAX_IMAGE_BYTES) {
          toast.error(`${f.name}: até 10MB.`);
          continue;
        }
        const { path } = await uploadOne(f, "photo");
        uploaded.push({ path });
      }
      setPhotos((prev) => [...prev, ...uploaded]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload das fotos.");
    } finally {
      setUploadingPhotos(false);
    }
  }

  const mutation = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          email,
          full_name: fullName,
          cpf,
          artist_name: artistName,
          release_type: releaseType,
          release_name: releaseName,
          lyrics,
          isrc,
          cover_path: coverPath!,
          genres,
          moods,
          instruments,
          technical_sheet: technicalSheet,
          royalties,
          about_artist: aboutArtist,
          about_release: aboutRelease,
          has_videoclip: hasVideoclip === "sim",
          audio_files: audioFiles,
          promo_photos: photos,
          website,
          started_at: startedAt,
        },
      }),
    onSuccess: () => {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao enviar."),
  });

  const canSubmit = useMemo(() => {
    if (!coverPath) return false;
    if (audioFiles.length === 0) return false;
    if (releaseType === "single" && audioFiles.length !== 1) return false;
    if (genres.length === 0 || moods.length === 0) return false;
    return true;
  }, [coverPath, audioFiles, releaseType, genres, moods]);

  if (submitted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 mx-auto text-accent" />
          <h1 className="font-display text-3xl">Lançamento enviado!</h1>
          <p className="text-muted-foreground">
            Recebemos seu material. Em breve a equipe Braba entrará em contato.
          </p>
          <Button asChild>
            <Link to="/">Voltar para o catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="font-display text-3xl md:text-4xl">Enviar lançamento</h1>
          <p className="text-muted-foreground">
            Preencha todos os campos para que a Braba Music possa analisar seu material.
          </p>
        </header>

        <form
          className="space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) {
              toast.error("Complete os uploads e selecione gêneros/moods.");
              return;
            }
            mutation.mutate();
          }}
        >
          {/* honeypot */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="hidden"
            aria-hidden
          />

          <Section title="Dados do artista">
            <Field label="E-mail" required>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Nome completo" required>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label="CPF" required>
              <Input
                required
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
            </Field>
            <Field label="Nome artístico" required>
              <Input required value={artistName} onChange={(e) => setArtistName(e.target.value)} />
            </Field>
            <Field label="Sobre o artista" required>
              <Textarea
                required
                rows={4}
                value={aboutArtist}
                onChange={(e) => setAboutArtist(e.target.value)}
              />
            </Field>
          </Section>

          <Section title="Sobre o lançamento">
            <Field label="Tipo de lançamento" required>
              <RadioGroup
                value={releaseType}
                onValueChange={(v) => {
                  setReleaseType(v as ReleaseType);
                  if (v === "single") setAudioFiles((prev) => prev.slice(0, 1));
                }}
                className="flex gap-4"
              >
                {RELEASE_TYPES.map((t) => (
                  <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value={t.value} />
                    {t.label}
                  </label>
                ))}
              </RadioGroup>
            </Field>
            <Field label="Nome da música/lançamento" required>
              <Input required value={releaseName} onChange={(e) => setReleaseName(e.target.value)} />
            </Field>
            <Field label="ISRC" required>
              <Input
                required
                placeholder="BR-XXX-25-00001"
                value={isrc}
                onChange={(e) => setIsrc(e.target.value)}
              />
            </Field>
            <Field label="Letra da música" required>
              <Textarea required rows={6} value={lyrics} onChange={(e) => setLyrics(e.target.value)} />
            </Field>
            <Field label="Sobre a música" required>
              <Textarea
                required
                rows={4}
                value={aboutRelease}
                onChange={(e) => setAboutRelease(e.target.value)}
              />
            </Field>
            <Field label="Ficha técnica" required>
              <Textarea
                required
                rows={4}
                placeholder="Produção, mixagem, masterização, participações..."
                value={technicalSheet}
                onChange={(e) => setTechnicalSheet(e.target.value)}
              />
            </Field>
            <Field label="Royalties" required>
              <Textarea
                required
                rows={3}
                placeholder="Divisão de royalties entre os envolvidos."
                value={royalties}
                onChange={(e) => setRoyalties(e.target.value)}
              />
            </Field>
            <Field label="Possui videoclipe?" required>
              <RadioGroup
                value={hasVideoclip}
                onValueChange={(v) => setHasVideoclip(v as "sim" | "nao")}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="sim" /> Sim
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="nao" /> Não
                </label>
              </RadioGroup>
            </Field>
          </Section>

          <Section title="Categorização">
            <Field label={`Gêneros (${genres.length} selecionados)`} required>
              <ChipGroup
                options={RELEASE_GENRES as readonly string[]}
                selected={genres}
                onToggle={(v) => setGenres((prev) => toggle(prev, v, 10))}
              />
            </Field>
            <Field label={`Mood (${moods.length} selecionados)`} required>
              <ChipGroup
                options={RELEASE_MOODS as readonly string[]}
                selected={moods}
                onToggle={(v) => setMoods((prev) => toggle(prev, v, 10))}
              />
            </Field>
            <Field label={`Instrumentos (${instruments.length} selecionados)`}>
              <ChipGroup
                options={RELEASE_INSTRUMENTS as readonly string[]}
                selected={instruments}
                onToggle={(v) => setInstruments((prev) => toggle(prev, v, 20))}
              />
            </Field>
          </Section>

          <Section title="Arquivos">
            <Field label="Foto de capa (JPG/PNG/WEBP, até 10MB)" required>
              <div className="flex items-center gap-4">
                <div className="h-24 w-24 rounded-md bg-muted overflow-hidden flex items-center justify-center border">
                  {coverPreview ? (
                    <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleCover(f);
                      e.target.value = "";
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" disabled={uploadingCover} asChild>
                    <span>
                      {uploadingCover ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {coverPath ? "Trocar capa" : "Enviar capa"}
                    </span>
                  </Button>
                </label>
              </div>
            </Field>

            <Field
              label={
                releaseType === "single"
                  ? "Arquivo de áudio (WAV ou MP3, até 100MB)"
                  : "Arquivos de áudio (WAV ou MP3, até 100MB cada)"
              }
              required
            >
              <label className="cursor-pointer inline-block">
                <input
                  type="file"
                  accept=".wav,.mp3,audio/wav,audio/mpeg,audio/mp3,audio/x-wav"
                  multiple={releaseType !== "single"}
                  className="hidden"
                  onChange={(e) => {
                    const fs = e.target.files;
                    if (fs && fs.length) void handleAudio(fs);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="outline" size="sm" disabled={uploadingAudio} asChild>
                  <span>
                    {uploadingAudio ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {releaseType === "single" ? "Enviar áudio" : "Adicionar áudio(s)"}
                  </span>
                </Button>
              </label>
              {audioFiles.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {audioFiles.map((a, i) => (
                    <li
                      key={a.path}
                      className="flex items-center justify-between rounded border border-white/10 px-3 py-1.5"
                    >
                      <span className="truncate">
                        {a.original_name}{" "}
                        <span className="text-muted-foreground">
                          ({(a.size_bytes / 1024 / 1024).toFixed(1)}MB · {a.format.toUpperCase()})
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setAudioFiles((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>

            <Field label={`Fotos de divulgação (até ${MAX_PROMO_PHOTOS}, 10MB cada)`}>
              <label className="cursor-pointer inline-block">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const fs = e.target.files;
                    if (fs && fs.length) void handlePhotos(fs);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingPhotos || photos.length >= MAX_PROMO_PHOTOS}
                  asChild
                >
                  <span>
                    {uploadingPhotos ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Adicionar fotos
                  </span>
                </Button>
              </label>
              {photos.length > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {photos.length} foto(s) enviada(s).{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setPhotos([])}
                  >
                    Limpar
                  </button>
                </p>
              )}
            </Field>
          </Section>

          <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" disabled={mutation.isPending || !canSubmit}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar lançamento
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border border-white/10 p-5">
      <h2 className="font-display text-xl">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isOn = selected.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            onClick={() => onToggle(opt)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              isOn
                ? "bg-accent text-accent-foreground border-accent"
                : "border-white/15 hover:bg-white/5"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Checkbox checked={isOn} className="pointer-events-none" />
              {opt}
            </span>
          </button>
        );
      })}
    </div>
  );
}
