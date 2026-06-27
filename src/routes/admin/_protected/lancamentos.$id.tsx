import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, CalendarDays, Download, ExternalLink, Image as ImageIcon, Loader2, MessageCircle, Music, Pencil, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRelease, updateReleaseStatus, updateReleaseDate, updateRelease } from "@/lib/releases.functions";
import {
  RELEASE_STATUSES,
  RELEASE_STATUS_LABEL,
  RELEASE_TYPE_LABEL,
  RELEASE_TYPES,
  type ReleaseStatus,
  type ReleaseType,
} from "@/lib/releases.constants";
import { waLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/admin/_protected/lancamentos/$id")({
  component: LancamentoDetail,
});

type Draft = {
  full_name: string;
  cpf: string;
  email: string;
  whatsapp: string;
  artist_name: string;
  about_artist: string;
  release_type: ReleaseType;
  release_name: string;
  isrc: string;
  has_videoclip: boolean;
  ai_on_cover: boolean;
  ai_on_music: boolean;
  ai_music_details: string;
  tracklist: string;
  faixa_foco: string;
  about_release: string;
  cover_drive_url: string;
  audio_drive_url: string;
  lyrics_drive_url: string;
  photos_drive_url: string;
  genres: string;
  moods: string;
  instruments: string;
  technical_sheet: string;
  royalties: string;
};

function toDraft(r: Record<string, unknown>): Draft {
  const g = (k: string) => (r[k] as string | null | undefined) ?? "";
  const arr = (k: string) => ((r[k] as string[] | null | undefined) ?? []).join(", ");
  return {
    full_name: g("full_name"),
    cpf: g("cpf"),
    email: g("email"),
    whatsapp: g("whatsapp"),
    artist_name: g("artist_name"),
    about_artist: g("about_artist"),
    release_type: (r.release_type as ReleaseType) ?? "single",
    release_name: g("release_name"),
    isrc: g("isrc"),
    has_videoclip: Boolean(r.has_videoclip),
    ai_on_cover: Boolean(r.ai_on_cover),
    ai_on_music: Boolean(r.ai_on_music),
    ai_music_details: g("ai_music_details"),
    tracklist: g("tracklist"),
    faixa_foco: g("faixa_foco"),
    about_release: g("about_release"),
    cover_drive_url: g("cover_drive_url"),
    audio_drive_url: g("audio_drive_url"),
    lyrics_drive_url: g("lyrics_drive_url"),
    photos_drive_url: g("photos_drive_url"),
    genres: arr("genres"),
    moods: arr("moods"),
    instruments: arr("instruments"),
    technical_sheet: g("technical_sheet"),
    royalties: g("royalties"),
  };
}

const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function LancamentoDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const getFn = useServerFn(getRelease);
  const updateFn = useServerFn(updateReleaseStatus);
  const updateDateFn = useServerFn(updateReleaseDate);
  const updateReleaseFn = useServerFn(updateRelease);

  const query = useQuery({
    queryKey: ["admin", "release", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const updateMutation = useMutation({
    mutationFn: (status: ReleaseStatus) => updateFn({ data: { id, status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "release", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "releases"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "releases-new-count"] });
      toast.success("Status atualizado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const [dateDraft, setDateDraft] = useState("");
  const currentDate = (query.data as { suggested_release_date?: string | null } | undefined)?.suggested_release_date ?? "";
  useEffect(() => {
    setDateDraft(currentDate ?? "");
  }, [currentDate]);

  const dateMutation = useMutation({
    mutationFn: (d: string) => updateDateFn({ data: { id, suggested_release_date: d } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "release", id] });
      toast.success("Data de lançamento atualizada");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const initialDraft = useMemo(
    () => (query.data ? toDraft(query.data as unknown as Record<string, unknown>) : null),
    [query.data],
  );
  useEffect(() => {
    if (!editing && initialDraft) setDraft(initialDraft);
  }, [editing, initialDraft]);

  const saveMutation = useMutation({
    mutationFn: (d: Draft) =>
      updateReleaseFn({
        data: {
          id,
          full_name: d.full_name,
          cpf: d.cpf,
          email: d.email,
          whatsapp: d.whatsapp,
          artist_name: d.artist_name,
          about_artist: d.about_artist,
          release_type: d.release_type,
          release_name: d.release_name,
          isrc: d.isrc,
          has_videoclip: d.has_videoclip,
          ai_on_cover: d.ai_on_cover,
          ai_on_music: d.ai_on_music,
          ai_music_details: d.ai_music_details,
          tracklist: d.tracklist,
          faixa_foco: d.faixa_foco,
          about_release: d.about_release,
          cover_drive_url: d.cover_drive_url,
          audio_drive_url: d.audio_drive_url,
          lyrics_drive_url: d.lyrics_drive_url,
          photos_drive_url: d.photos_drive_url,
          genres: splitList(d.genres),
          moods: splitList(d.moods),
          instruments: splitList(d.instruments),
          technical_sheet: d.technical_sheet,
          royalties: d.royalties,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "release", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "releases"] });
      toast.success("Lançamento atualizado");
      setEditing(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-destructive">Não foi possível carregar.</p>;
  }

  const r = query.data;
  const d = draft;
  const setField = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((prev) => (prev ? { ...prev, [k]: v } : prev));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/lancamentos">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge>{RELEASE_TYPE_LABEL[r.release_type]}</Badge>
          <Select
            value={r.status}
            onValueChange={(v) => updateMutation.mutate(v as ReleaseStatus)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELEASE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {RELEASE_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editing ? (
            <>
              <Button
                size="sm"
                onClick={() => d && saveMutation.mutate(d)}
                disabled={saveMutation.isPending}
                className="gap-1"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar alterações
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(initialDraft);
                  setEditing(false);
                }}
              >
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1">
              <Pencil className="h-4 w-4" /> Editar lançamento
            </Button>
          )}
        </div>
      </div>

      {(() => {
        const artistWa = (r as { whatsapp?: string }).whatsapp || "";
        const baseMsg =
          r.status === "aprovado"
            ? `Olá ${r.artist_name}! Seu lançamento *${r.release_name}* foi aprovado. Avisando que foi aprovado e em breve estaremos em contato para o planejamento do lançamento. — Braba Music`
            : `Olá ${r.artist_name}! Atualização do seu lançamento *${r.release_name}*: status agora é *${RELEASE_STATUS_LABEL[r.status]}*. — Braba Music`;
        const link = waLink(artistWa, baseMsg);
        return (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="text-sm">
              <p className="font-semibold">Avisar artista pelo WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                Mensagem pré-preenchida com base no status atual ({RELEASE_STATUS_LABEL[r.status]}).
              </p>
            </div>
            {link ? (
              <Button asChild className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:opacity-95">
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> Avisar artista por WhatsApp
                </a>
              </Button>
            ) : (
              <Button disabled variant="outline" title="Artista não informou WhatsApp">
                <MessageCircle className="h-4 w-4" /> WhatsApp indisponível
              </Button>
            )}
          </div>
        );
      })()}

      <header className="flex gap-6 items-start">
        {r.cover_url && (
          <img
            src={r.cover_url}
            alt={r.release_name}
            className="h-32 w-32 rounded-lg object-cover border border-white/10"
          />
        )}
        <div className="flex-1">
          {editing && d ? (
            <div className="space-y-2">
              <Input
                value={d.release_name}
                onChange={(e) => setField("release_name", e.target.value)}
                placeholder="Nome do lançamento"
                className="text-2xl font-display"
              />
              <Input
                value={d.artist_name}
                onChange={(e) => setField("artist_name", e.target.value)}
                placeholder="Nome artístico"
              />
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl">{r.release_name}</h1>
              <p className="text-muted-foreground">{r.artist_name}</p>
            </>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Enviado em {new Date(r.created_at).toLocaleString("pt-BR")}
          </p>
          {r.cover_drive_url && !editing && (
            <Button asChild size="lg" className="mt-3 gap-2 font-semibold shadow-lg shadow-primary/30">
              <a href={r.cover_drive_url} target="_blank" rel="noopener noreferrer">
                <ImageIcon className="h-4 w-4" />
                Abrir capa no Drive
                <ExternalLink className="h-4 w-4 opacity-70" />
              </a>
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title="Dados do artista">
          <EditableInfo editing={editing} label="Nome completo" value={r.full_name}
            draft={d?.full_name ?? ""} onChange={(v) => setField("full_name", v)} />
          <EditableInfo editing={editing} label="CPF" value={r.cpf}
            draft={d?.cpf ?? ""} onChange={(v) => setField("cpf", v)} />
          <EditableInfo editing={editing} label="E-mail" value={r.email}
            draft={d?.email ?? ""} onChange={(v) => setField("email", v)} />
          <EditableInfo editing={editing} label="WhatsApp" value={(r as { whatsapp?: string }).whatsapp || "—"}
            draft={d?.whatsapp ?? ""} onChange={(v) => setField("whatsapp", v)} />
          <EditableInfo editing={editing} label="Nome artístico" value={r.artist_name}
            draft={d?.artist_name ?? ""} onChange={(v) => setField("artist_name", v)} />
          <EditableBlock editing={editing} label="Sobre o artista" value={r.about_artist}
            draft={d?.about_artist ?? ""} onChange={(v) => setField("about_artist", v)} />
        </InfoCard>

        <InfoCard title="Sobre o lançamento">
          {editing && d ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tipo</p>
              <Select value={d.release_type} onValueChange={(v) => setField("release_type", v as ReleaseType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELEASE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Info label="Tipo" value={RELEASE_TYPE_LABEL[r.release_type]} />
          )}
          <EditableInfo editing={editing} label="ISRC" value={r.isrc || "—"}
            draft={d?.isrc ?? ""} onChange={(v) => setField("isrc", v)} />
          {editing && d ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Videoclipe</p>
              <Select
                value={d.has_videoclip ? "sim" : "nao"}
                onValueChange={(v) => setField("has_videoclip", v === "sim")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Info label="Videoclipe" value={r.has_videoclip ? "Sim" : "Não"} />
          )}
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>
                Data de lançamento {currentDate ? "(sugerida pelo artista)" : "(não informada pelo artista)"}
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateDraft}
                onChange={(e) => setDateDraft(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => dateMutation.mutate(dateDraft)}
                disabled={dateMutation.isPending || dateDraft === (currentDate ?? "")}
                className="gap-1"
              >
                {dateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
          {editing && d ? (
            <EditableInfo editing={editing} label="Áudio no Google Drive (URL)" value={r.audio_drive_url || "—"}
              draft={d.audio_drive_url} onChange={(v) => setField("audio_drive_url", v)} />
          ) : r.audio_drive_url ? (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
              <p className="text-xs text-muted-foreground mb-2">Áudio no Google Drive</p>
              <Button asChild size="lg" className="w-full gap-2 font-semibold shadow-lg shadow-primary/30">
                <a href={r.audio_drive_url} target="_blank" rel="noopener noreferrer">
                  <Music className="h-4 w-4" />
                  Abrir áudio no Drive
                  <ExternalLink className="h-4 w-4 opacity-70" />
                </a>
              </Button>
            </div>
          ) : null}
          {editing && d ? (
            <EditableInfo editing={editing} label="Capa no Google Drive (URL)" value={r.cover_drive_url || "—"}
              draft={d.cover_drive_url} onChange={(v) => setField("cover_drive_url", v)} />
          ) : null}
          <EditableBlock editing={editing} label="Lista de músicas" value={r.tracklist || "—"}
            draft={d?.tracklist ?? ""} onChange={(v) => setField("tracklist", v)} />
          <EditableInfo editing={editing} label="Faixa foco"
            value={(r as { faixa_foco?: string | null }).faixa_foco || "—"}
            draft={d?.faixa_foco ?? ""} onChange={(v) => setField("faixa_foco", v)} />
          <EditableBlock editing={editing} label="Sobre o lançamento" value={r.about_release}
            draft={d?.about_release ?? ""} onChange={(v) => setField("about_release", v)} />
        </InfoCard>

        <InfoCard title="Categorização">
          <EditableInfo editing={editing} label="Gêneros (separe por vírgula)" value={r.genres.join(", ") || "—"}
            draft={d?.genres ?? ""} onChange={(v) => setField("genres", v)} />
          <EditableInfo editing={editing} label="Mood (separe por vírgula)" value={r.moods.join(", ") || "—"}
            draft={d?.moods ?? ""} onChange={(v) => setField("moods", v)} />
          <EditableInfo editing={editing} label="Instrumentos (separe por vírgula)" value={r.instruments.join(", ") || "—"}
            draft={d?.instruments ?? ""} onChange={(v) => setField("instruments", v)} />
        </InfoCard>

        <InfoCard title="Royalties / Ficha técnica">
          <EditableBlock editing={editing} label="Ficha técnica" value={r.technical_sheet}
            draft={d?.technical_sheet ?? ""} onChange={(v) => setField("technical_sheet", v)} />
          <EditableBlock editing={editing} label="Royalties" value={r.royalties}
            draft={d?.royalties ?? ""} onChange={(v) => setField("royalties", v)} />
        </InfoCard>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Letra(s)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {editing && d ? (
              <EditableInfo editing={editing} label="Letras .zip no Drive (URL)" value={r.lyrics_drive_url || "—"}
                draft={d.lyrics_drive_url} onChange={(v) => setField("lyrics_drive_url", v)} />
            ) : (
              <>
                {r.lyrics_drive_url && (
                  <Button asChild size="lg" className="gap-2 font-semibold shadow-lg shadow-primary/30">
                    <a href={r.lyrics_drive_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                      Baixar .zip das letras no Drive
                      <ExternalLink className="h-4 w-4 opacity-70" />
                    </a>
                  </Button>
                )}
                {r.lyrics && (
                  <pre className="whitespace-pre-wrap text-sm font-sans">{r.lyrics}</pre>
                )}
                {!r.lyrics_drive_url && !r.lyrics && (
                  <p className="text-sm text-muted-foreground">Nenhuma letra enviada.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {r.audio_files.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Arquivos de áudio antigos ({r.audio_files.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {r.audio_files.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded border border-white/10 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.original_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(a.size_bytes / 1024 / 1024).toFixed(1)} MB · {a.format.toUpperCase()}
                    </p>
                  </div>
                  {a.signed_url && (
                    <Button asChild size="sm" variant="outline">
                      <a href={a.signed_url} download={a.original_name}>
                        <Download className="h-4 w-4" />
                        Baixar
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Fotos de divulgação</CardTitle>
          </CardHeader>
          <CardContent>
            {editing && d ? (
              <EditableInfo editing={editing} label="Fotos no Drive (URL)" value={r.photos_drive_url || "—"}
                draft={d.photos_drive_url} onChange={(v) => setField("photos_drive_url", v)} />
            ) : r.photos_drive_url ? (
              <Button asChild size="lg" className="gap-2 font-semibold shadow-lg shadow-primary/30">
                <a href={r.photos_drive_url} target="_blank" rel="noopener noreferrer">
                  <ImageIcon className="h-4 w-4" />
                  Abrir fotos no Drive
                  <ExternalLink className="h-4 w-4 opacity-70" />
                </a>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma URL de fotos.</p>
            )}
          </CardContent>
        </Card>

        {r.promo_photos.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Fotos antigas ({r.promo_photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {r.promo_photos.map(
                  (p) =>
                    p.signed_url && (
                      <a
                        key={p.id}
                        href={p.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square overflow-hidden rounded border border-white/10"
                      >
                        <img
                          src={p.signed_url}
                          alt=""
                          className="h-full w-full object-cover hover:scale-105 transition"
                        />
                      </a>
                    ),
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">{children}</CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function EditableInfo({
  editing,
  label,
  value,
  draft,
  onChange,
}: {
  editing: boolean;
  label: string;
  value: string;
  draft: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {editing ? (
        <Input value={draft} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p>{value}</p>
      )}
    </div>
  );
}

function EditableBlock({
  editing,
  label,
  value,
  draft,
  onChange,
}: {
  editing: boolean;
  label: string;
  value: string;
  draft: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {editing ? (
        <Textarea
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[100px]"
        />
      ) : (
        <p className="whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}
