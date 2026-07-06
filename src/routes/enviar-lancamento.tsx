import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  RELEASE_GENRES,
  RELEASE_MOODS,
  RELEASE_INSTRUMENTS,
  RELEASE_TYPES,
  type ReleaseType,
} from "@/lib/releases.constants";
import { submitRelease } from "@/lib/releases.functions";
import { waLink } from "@/lib/whatsapp";
import { useQuery } from "@tanstack/react-query";
import { getPurchaseSettings } from "@/lib/purchases.functions";

export const Route = createFileRoute("/enviar-lancamento")({
  head: () => ({
    meta: [
      { title: "Enviar lançamento — Braba Music" },
      {
        name: "description",
        content:
          "Envie seu lançamento (single, EP ou álbum) para a Braba Music.",
      },
    ],
  }),
  component: SubmitReleasePage,
});

const DRIVE_RE = /^https?:\/\/(drive|docs)\.google\.com\//i;

function SubmitReleasePage() {
  const startedAt = useRef(Date.now()).current;
  const [submitted, setSubmitted] = useState(false);
  const [releaseId, setReleaseId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [artistName, setArtistName] = useState("");
  const [releaseType, setReleaseType] = useState<ReleaseType>("single");
  const [releaseName, setReleaseName] = useState("");
  const [tracklist, setTracklist] = useState("");
  const [faixaFoco, setFaixaFoco] = useState("");
  const [lyricsDriveUrl, setLyricsDriveUrl] = useState("");
  const [isrc, setIsrc] = useState("");
  const [audioDriveUrl, setAudioDriveUrl] = useState("");
  const [coverDriveUrl, setCoverDriveUrl] = useState("");
  const [photosDriveUrl, setPhotosDriveUrl] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [technicalSheet, setTechnicalSheet] = useState("");
  const [royalties, setRoyalties] = useState("");
  const [aboutArtist, setAboutArtist] = useState("");
  const [aboutRelease, setAboutRelease] = useState("");
  const [hasVideoclip, setHasVideoclip] = useState<"sim" | "nao">("nao");
  const [aiOnCover, setAiOnCover] = useState<"sim" | "nao">("nao");
  const [aiOnMusic, setAiOnMusic] = useState<"sim" | "nao">("nao");
  const [aiMusicDetails, setAiMusicDetails] = useState("");
  const [suggestedReleaseDate, setSuggestedReleaseDate] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const submitFn = useServerFn(submitRelease);

  const isMulti = releaseType !== "single";

  const toggle = (arr: string[], v: string, max: number) => {
    if (arr.includes(v)) return arr.filter((x) => x !== v);
    if (arr.length >= max) return arr;
    return [...arr, v];
  };

  const mutation = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          email,
          full_name: fullName,
          cpf,
          whatsapp,
          artist_name: artistName,
          release_type: releaseType,
          release_name: releaseName,
          tracklist: isMulti ? tracklist : "",
          lyrics: "",
          lyrics_drive_url: lyricsDriveUrl.trim(),
          isrc,
          audio_drive_url: audioDriveUrl.trim(),
          cover_drive_url: coverDriveUrl.trim(),
          photos_drive_url: photosDriveUrl.trim(),
          genres,
          moods,
          instruments,
          technical_sheet: technicalSheet,
          royalties,
          about_artist: aboutArtist,
          about_release: aboutRelease,
          has_videoclip: hasVideoclip === "sim",
          ai_on_cover: aiOnCover === "sim",
          ai_on_music: aiOnMusic === "sim",
          ai_music_details: aiOnMusic === "sim" ? aiMusicDetails.trim() : "",
          faixa_foco: isMulti ? faixaFoco.trim() : "",
          suggested_release_date: suggestedReleaseDate || "",
          website,
          started_at: startedAt,
        },
      }),
    onSuccess: (res) => {
      setReleaseId((res as { releaseId?: string })?.releaseId ?? null);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao enviar."),
  });

  const canSubmit = useMemo(() => {
    if (!DRIVE_RE.test(coverDriveUrl.trim())) return false;
    if (!DRIVE_RE.test(audioDriveUrl.trim())) return false;
    if (!DRIVE_RE.test(lyricsDriveUrl.trim())) return false;
    if (photosDriveUrl.trim() && !DRIVE_RE.test(photosDriveUrl.trim())) return false;
    if (genres.length === 0 || moods.length === 0) return false;
    if (isMulti && tracklist.trim().length === 0) return false;
    if (isMulti && faixaFoco.trim().length === 0) return false;
    if (whatsapp.replace(/\D/g, "").length < 8) return false;
    if (!suggestedReleaseDate) return false;
    if (aiOnMusic === "sim" && aiMusicDetails.trim().length === 0) return false;
    return true;
  }, [coverDriveUrl, audioDriveUrl, lyricsDriveUrl, photosDriveUrl, genres, moods, isMulti, tracklist, faixaFoco, whatsapp, suggestedReleaseDate, aiOnMusic, aiMusicDetails]);

  const settings = useQuery({
    queryKey: ["purchase-settings"],
    queryFn: () => getPurchaseSettings(),
    staleTime: 5 * 60 * 1000,
  });
  const commercialWa = settings.data?.commercial_whatsapp ?? "+5511913401000";

  if (submitted) {
    const tipoLabel = releaseType === "ep" ? "EP" : releaseType === "album" ? "Álbum" : "Single";
    const releaseUrl =
      releaseId && typeof window !== "undefined"
        ? `${window.location.origin}/admin/lancamentos/${releaseId}`
        : "";
    const msg = `Olá! Acabei de enviar meu lançamento *${releaseName}* (${tipoLabel}) — artista *${artistName}*.${releaseUrl ? `\n\nLink do lançamento: ${releaseUrl}` : ""}\n\nAguardo o retorno da equipe Braba.`;
    const adminWa = waLink(commercialWa, msg);
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 mx-auto text-accent" />
          <h1 className="font-display text-3xl">Lançamento enviado!</h1>
          <p className="text-muted-foreground">
            Recebemos seu material. Para acelerar a análise, avise a administração da Braba pelo WhatsApp.
          </p>
          {adminWa && (
            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg hover:opacity-95"
            >
              <a href={adminWa} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" />
                Avisar a Administração da Braba sobre meu lançamento
              </a>
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Após o aviso, aguarde até 24h para a equipe analisar e retornar.
          </p>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            <p>Como foi sua experiência enviando seu lançamento?</p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to="/feedback" search={{ origin: "pos_lancamento" }}>
                Enviar feedback
              </Link>
            </Button>
          </div>
          <Button asChild variant="ghost">
            <Link to="/">Voltar para o catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  const projectWord = isMulti
    ? releaseType === "ep"
      ? "EP"
      : "álbum"
    : "música";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="font-display text-3xl md:text-4xl">Enviar lançamento</h1>
          <p className="text-muted-foreground">
            Preencha os campos abaixo para que a Braba Music possa analisar seu material.
          </p>
        </header>

        <form
          className="space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) {
              toast.error("Complete a capa, o link do Drive e selecione gêneros/moods.");
              return;
            }
            mutation.mutate();
          }}
        >
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
            <Field label="WhatsApp (com DDI)" required>
              <Input
                required
                placeholder="+55 11 91234-5678"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d+\s()-]/g, ""))}
              />
              <p className="text-xs text-muted-foreground">
                Usaremos para te avisar sobre o status do lançamento.
              </p>
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
            <Field label="Data de lançamento" required>
              <Input
                type="date"
                required
                value={suggestedReleaseDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setSuggestedReleaseDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Sugestão de data para o lançamento. A equipe Braba pode ajustar conforme o planejamento.
              </p>
            </Field>

            <Field label="Tipo de lançamento" required>
              <RadioGroup
                value={releaseType}
                onValueChange={(v) => setReleaseType(v as ReleaseType)}
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

            <Field
              label={isMulti ? `Nome do ${projectWord}` : "Nome da música"}
              required
            >
              <Input
                required
                value={releaseName}
                onChange={(e) => setReleaseName(e.target.value)}
                placeholder={isMulti ? `Nome do ${projectWord}` : "Nome da música"}
              />
            </Field>

            {isMulti && (
              <Field label={`Lista de músicas do ${projectWord}`} required>
                <Textarea
                  required
                  rows={6}
                  placeholder={"Uma música por linha, na ordem oficial:\n1. Intro\n2. Faixa título\n3. ..."}
                  value={tracklist}
                  onChange={(e) => setTracklist(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Liste todas as faixas que estão no link do Drive, na ordem do projeto.
                </p>
              </Field>
            )}

            {isMulti && (
              <Field label="Faixa Foco" required>
                <Input
                  required
                  value={faixaFoco}
                  onChange={(e) => setFaixaFoco(e.target.value)}
                  placeholder="Nome exato da faixa principal"
                />
                <p className="text-xs text-muted-foreground">
                  Música principal para divulgação e distribuição.
                </p>
              </Field>
            )}

            <Field
              label={isMulti ? "Link do Google Drive (pasta com as músicas)" : "Link do Google Drive da música"}
              required
            >
              <Input
                required
                type="url"
                placeholder="https://drive.google.com/..."
                value={audioDriveUrl}
                onChange={(e) => setAudioDriveUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {isMulti
                  ? "Cole o link de uma pasta do Drive com todas as faixas (apenas WAV). "
                  : "Cole o link do arquivo no Drive (apenas WAV). "}
                Garanta que o link esteja como <strong>“Qualquer pessoa com o link pode visualizar”</strong>.
              </p>
            </Field>

            <Field
              label={
                isMulti
                  ? "Link do Google Drive (.zip com as letras)"
                  : "Link do Google Drive (.zip com a letra)"
              }
              required
            >
              <Input
                required
                type="url"
                placeholder="https://drive.google.com/..."
                value={lyricsDriveUrl}
                onChange={(e) => setLyricsDriveUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {isMulti
                  ? "Envie um arquivo .zip contendo um documento por faixa (PDF, DOC, DOCX ou TXT)."
                  : "Envie um arquivo .zip contendo o documento com a letra (PDF, DOC, DOCX ou TXT)."}{" "}
                Marque o link como <strong>“Qualquer pessoa com o link pode visualizar”</strong>.
              </p>
            </Field>

            <Field label={isMulti ? "ISRCs (opcional)" : "ISRC (opcional)"}>
              {isMulti ? (
                <Textarea
                  rows={4}
                  placeholder="Um ISRC por linha, na ordem das faixas (deixe em branco se ainda não tiver)."
                  value={isrc}
                  onChange={(e) => setIsrc(e.target.value)}
                />
              ) : (
                <Input
                  placeholder="BR-XXX-25-00001"
                  value={isrc}
                  onChange={(e) => setIsrc(e.target.value)}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Se ainda não tiver, deixe em branco — atribuímos depois.
              </p>
            </Field>

            <Field label={isMulti ? `Sobre o ${projectWord}` : "Sobre a música"} required>
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
                placeholder={
                  isMulti
                    ? "Produção, mixagem, masterização e participações de cada faixa."
                    : "Produção, mixagem, masterização, participações..."
                }
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

            <Field label={isMulti ? `Possui videoclipe(s)?` : "Possui videoclipe?"} required>
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

          <Section title="Uso de Inteligência Artificial (IA)">
            <p className="text-xs text-muted-foreground">
              Precisamos saber se houve uso de IA na criação da capa ou das músicas para
              cumprir as exigências das plataformas de streaming (Spotify, Apple Music,
              Deezer, etc.). Seja transparente — isso não impede o lançamento, mas a
              omissão pode causar a remoção do conteúdo.
            </p>

            <Field label="Foi utilizada IA na criação da capa?" required>
              <RadioGroup
                value={aiOnCover}
                onValueChange={(v) => setAiOnCover(v as "sim" | "nao")}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="sim" /> Sim
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="nao" /> Não
                </label>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Considere "Sim" se a arte foi gerada ou editada significativamente por
                ferramentas de IA (Midjourney, DALL·E, Stable Diffusion, etc.).
              </p>
            </Field>

            <Field label="Foi utilizada IA na criação das músicas?" required>
              <RadioGroup
                value={aiOnMusic}
                onValueChange={(v) => setAiOnMusic(v as "sim" | "nao")}
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

            {aiOnMusic === "sim" && (
              <Field label="Como a IA foi utilizada nas músicas?" required>
                <Textarea
                  required
                  rows={4}
                  value={aiMusicDetails}
                  onChange={(e) => setAiMusicDetails(e.target.value)}
                  placeholder={
                    "Explique em detalhes, por exemplo:\n- Apenas no instrumental (beat gerado por IA)\n- Na voz (vocais sintetizados ou clonados)\n- Em ambos (instrumental + voz)\n- Em letras/composição\nInforme também as ferramentas usadas (Suno, Udio, ElevenLabs, etc.)."
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Seja específico: se foi só no instrumental, só na voz, em ambos, ou em
                  qualquer outra parte do processo. Liste as ferramentas utilizadas.
                </p>
              </Field>
            )}
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

          <Section title="Imagens">
            <Field label="Link do Google Drive da capa" required>
              <Input
                required
                type="url"
                placeholder="https://drive.google.com/..."
                value={coverDriveUrl}
                onChange={(e) => setCoverDriveUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cole o link da arte de capa no Drive (JPG/PNG/WEBP). Marque como{" "}
                <strong>“Qualquer pessoa com o link pode visualizar”</strong>.
              </p>
            </Field>

            <Field label="Link do Google Drive das fotos de divulgação (opcional)">
              <Input
                type="url"
                placeholder="https://drive.google.com/..."
                value={photosDriveUrl}
                onChange={(e) => setPhotosDriveUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Pasta do Drive com as fotos de divulgação. Deixe em branco se não tiver.
              </p>
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
              <span
                aria-hidden
                className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border ${
                  isOn
                    ? "bg-accent-foreground/20 border-accent-foreground/40"
                    : "border-white/30"
                }`}
              >
                {isOn && (
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {opt}
            </span>
          </button>
        );
      })}
    </div>
  );
}
