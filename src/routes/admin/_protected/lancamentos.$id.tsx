import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Download, ExternalLink, Image as ImageIcon, Loader2, MessageCircle, Music } from "lucide-react";
import { toast } from "sonner";
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
import { getRelease, updateReleaseStatus } from "@/lib/releases.functions";
import {
  RELEASE_STATUSES,
  RELEASE_STATUS_LABEL,
  RELEASE_TYPE_LABEL,
  type ReleaseStatus,
} from "@/lib/releases.constants";
import { waLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/admin/_protected/lancamentos/$id")({
  component: LancamentoDetail,
});

function LancamentoDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const getFn = useServerFn(getRelease);
  const updateFn = useServerFn(updateReleaseStatus);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/lancamentos">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </Button>
        <div className="flex items-center gap-3">
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
        <div>
          <h1 className="font-display text-3xl">{r.release_name}</h1>
          <p className="text-muted-foreground">{r.artist_name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Enviado em {new Date(r.created_at).toLocaleString("pt-BR")}
          </p>
          {r.cover_drive_url && (
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
          <Info label="Nome completo" value={r.full_name} />
          <Info label="CPF" value={r.cpf} />
          <Info label="E-mail" value={r.email} />
          <Info label="WhatsApp" value={(r as { whatsapp?: string }).whatsapp || "—"} />
          <Info label="Nome artístico" value={r.artist_name} />
          <Block label="Sobre o artista" value={r.about_artist} />
        </InfoCard>

        <InfoCard title="Sobre o lançamento">
          <Info label="Tipo" value={RELEASE_TYPE_LABEL[r.release_type]} />
          <Info label="ISRC" value={r.isrc || "—"} />
          <Info label="Videoclipe" value={r.has_videoclip ? "Sim" : "Não"} />
          {r.audio_drive_url && (
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
          )}
          {r.tracklist && <Block label="Lista de músicas" value={r.tracklist} />}
          {(r as { faixa_foco?: string | null }).faixa_foco && (
            <Info label="Faixa foco" value={(r as { faixa_foco?: string | null }).faixa_foco!} />
          )}
          <Block label="Sobre o lançamento" value={r.about_release} />
        </InfoCard>

        <InfoCard title="Categorização">
          <Info label="Gêneros" value={r.genres.join(", ") || "—"} />
          <Info label="Mood" value={r.moods.join(", ") || "—"} />
          <Info label="Instrumentos" value={r.instruments.join(", ") || "—"} />
        </InfoCard>

        <InfoCard title="Royalties / Ficha técnica">
          <Block label="Ficha técnica" value={r.technical_sheet} />
          <Block label="Royalties" value={r.royalties} />
        </InfoCard>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Letra(s)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {r.lyrics_drive_url && (
              <Button asChild size="sm" variant="outline">
                <a href={r.lyrics_drive_url} target="_blank" rel="noopener noreferrer">
                  Baixar .zip no Drive
                </a>
              </Button>
            )}
            {r.lyrics && (
              <pre className="whitespace-pre-wrap text-sm font-sans">{r.lyrics}</pre>
            )}
            {!r.lyrics_drive_url && !r.lyrics && (
              <p className="text-sm text-muted-foreground">Nenhuma letra enviada.</p>
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

        {r.photos_drive_url && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Fotos de divulgação</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline">
                <a href={r.photos_drive_url} target="_blank" rel="noopener noreferrer">
                  Abrir fotos no Drive
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

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

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}
