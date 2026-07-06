import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Printer, Loader2 } from "lucide-react";
import { getPurchaseLicenseByToken } from "@/lib/purchases.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/licenca/$token")({
  component: PublicLicensePage,
  head: () => ({
    meta: [
      { title: "Licença de Uso — Braba Music" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function fmtPrice(v: number | string | null | undefined) {
  if (v == null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

type LicenseSnapshot = {
  produtora_nome?: string | null;
  nome_civil?: string | null;
  nome_artistico_creditos?: string | null;
  texto_creditos?: string | null;
  texto_registro?: string | null;
  texto_royalties?: string | null;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="license-section">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function PublicLicensePage() {
  const { token } = Route.useParams();
  const fn = useServerFn(getPurchaseLicenseByToken);
  const q = useQuery({
    queryKey: ["public-license", token],
    queryFn: () => fn({ data: { token } }),
    retry: false,
  });

  if (q.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando licença...
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-destructive">Licença não encontrada.</p>
      </div>
    );
  }

  const p = q.data;
  const beat = p.beat as { nome: string; slug: string | null; produtora: {
    nome_artistico: string | null;
    nome_artistico_creditos: string | null;
  } | null } | null;
  const snap = (p.license_snapshot as LicenseSnapshot | null) ?? {};
  const producer = beat?.produtora;

  const creditos = snap.texto_creditos ?? "—";
  const registro = snap.texto_registro ?? "—";
  const royalties = snap.texto_royalties ?? "—";
  const nomeArtisticoCreditos =
    snap.nome_artistico_creditos ??
    producer?.nome_artistico_creditos ??
    producer?.nome_artistico ??
    "—";
  const nomeCivil = snap.nome_civil ?? "—";
  const produtoraNome =
    snap.produtora_nome ?? producer?.nome_artistico ?? "—";

  return (
    <div className="min-h-screen bg-neutral-100 py-8 px-4">
      <div className="max-w-3xl mx-auto license-root">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; }
            .license-doc { box-shadow: none !important; border: 0 !important; padding: 0 !important; }
          }
          .license-doc { background: white; color: #111; padding: 40px 48px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .license-doc h1 { font-size: 22px; margin-bottom: 4px; font-weight: 700; }
          .license-doc h2 { font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #555; margin-bottom: 8px; font-weight: 700; }
          .license-doc .license-section { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e5e5; }
          .license-doc .license-section:first-of-type { border-top: 0; padding-top: 0; }
          .license-doc .license-section > div { font-size: 14px; line-height: 1.55; white-space: pre-wrap; }
          .license-doc dl { display: grid; grid-template-columns: 180px 1fr; gap: 6px 16px; font-size: 14px; }
          .license-doc dt { color: #666; }
          .license-doc dd { margin: 0; font-weight: 500; }
          .license-doc .meta-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
          .license-doc .meta-top .doc-id { font-family: ui-monospace, monospace; font-size: 11px; color: #666; text-align: right; }
          .license-doc .aceite-box { margin-top: 8px; padding: 12px 14px; background: #f5f5f5; border-left: 3px solid #111; font-size: 13px; }
        `}</style>

        <div className="no-print flex items-center justify-end mb-4">
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
          </Button>
        </div>

        <article className="license-doc">
          <div className="meta-top">
            <div>
              <h1>Licença de Uso de Obra Musical</h1>
              <p style={{ fontSize: 13, color: "#555", margin: 0 }}>
                Documento gerado automaticamente pela Braba Music
              </p>
            </div>
            <div className="doc-id">
              <div>Pedido</div>
              <div>{p.id}</div>
            </div>
          </div>

          <Section title="Compra">
            <dl>
              <dt>Data do pedido</dt>
              <dd>{fmtDate(p.created_at)}</dd>
              <dt>Status</dt>
              <dd>{p.status}</dd>
              <dt>Valor</dt>
              <dd>{fmtPrice(p.valor as number | null)}</dd>
              <dt>Forma de pagamento</dt>
              <dd style={{ textTransform: "uppercase" }}>{p.forma_pagamento}</dd>
            </dl>
          </Section>

          <Section title="Dados do Cliente">
            <dl>
              <dt>Nome civil</dt>
              <dd>{p.nome_cliente}</dd>
              {p.nome_artistico && (<><dt>Nome artístico</dt><dd>{p.nome_artistico}</dd></>)}
              <dt>E-mail</dt>
              <dd>{p.email}</dd>
              <dt>WhatsApp</dt>
              <dd>{p.whatsapp}</dd>
              {p.instagram && (<><dt>Instagram</dt><dd>@{p.instagram}</dd></>)}
            </dl>
          </Section>

          <Section title="Beat / Obra Licenciada">
            <dl>
              <dt>Título</dt>
              <dd>{beat?.nome ?? "—"}</dd>
              {beat?.slug && (<><dt>Slug</dt><dd>{beat.slug}</dd></>)}
            </dl>
          </Section>

          <Section title="Produtora">
            <dl>
              <dt>Produtora</dt>
              <dd>{produtoraNome}</dd>
              <dt>Nome civil</dt>
              <dd>{nomeCivil}</dd>
              <dt>Nome para créditos</dt>
              <dd>{nomeArtisticoCreditos}</dd>
            </dl>
          </Section>

          <Section title="Licença">
            <p style={{ margin: 0 }}>
              A Produtora concede ao Cliente identificado acima licença de uso da
              obra musical (beat) descrita nesta compra, nos termos abaixo
              registrados. Esta licença foi aceita eletronicamente pelo Cliente
              no momento da compra.
            </p>
            {p.license_version && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "#666" }}>
                Versão do licenciamento: <strong>{p.license_version}</strong>
              </p>
            )}
          </Section>

          <Section title="Créditos">{creditos}</Section>
          <Section title="Registro">{registro}</Section>
          <Section title="Royalties">{royalties}</Section>

          <Section title="Aceite">
            <div className="aceite-box">
              <div>
                <strong>Declaração:</strong> O Cliente declarou ter lido e
                concordado com o Licenciamento, Créditos e Registro da Obra.
              </div>
              <dl style={{ marginTop: 10 }}>
                <dt>Aceito?</dt>
                <dd>{p.license_accepted ? "Sim" : "Não"}</dd>
                <dt>Data / hora</dt>
                <dd>{fmtDate(p.license_accepted_at)}</dd>
                <dt>Versão</dt>
                <dd>{p.license_version ?? "—"}</dd>
                <dt>Pedido</dt>
                <dd style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                  {p.id}
                </dd>
                <dt>Termos da plataforma</dt>
                <dd>{p.termos_aceitos ? "Aceitos" : "Não"}</dd>
              </dl>
            </div>
          </Section>
        </article>
      </div>
    </div>
  );
}
