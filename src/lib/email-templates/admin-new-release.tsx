import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, styles } from "./_shared";

interface Props {
  artistName?: string;
  releaseName?: string;
  releaseType?: string;
  email?: string;
  adminUrl?: string;
}

const TYPE_LABEL: Record<string, string> = {
  single: "Single",
  ep: "EP",
  album: "Álbum",
};

const AdminNewRelease = ({
  artistName = "—",
  releaseName = "—",
  releaseType = "single",
  email = "—",
  adminUrl = "https://brababeats.app/admin/lancamentos",
}: Props) => (
  <EmailShell
    preview={`Novo lançamento: ${releaseName} (${artistName})`}
    heading="Novo lançamento recebido"
    subline="Analise no painel e atualize o status."
  >
    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Artista:</strong> {artistName}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Obra:</strong> {releaseName}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Tipo:</strong> {TYPE_LABEL[releaseType] ?? releaseType}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>E-mail:</strong> {email}
      </Text>
    </Section>

    <Section style={{ textAlign: "center", margin: "24px 0" }}>
      <Button href={adminUrl} style={styles.button}>
        Abrir lançamento
      </Button>
    </Section>
  </EmailShell>
);

export const template = {
  component: AdminNewRelease,
  subject: ({ artistName, releaseName }: Props) =>
    `[BRABA] Novo lançamento: ${releaseName ?? "—"} (${artistName ?? "—"})`,
  displayName: "Admin · Novo lançamento",
  previewData: {
    artistName: "MC Exemplo",
    releaseName: "Madrugada",
    releaseType: "single",
    email: "mc@example.com",
    adminUrl: "https://brababeats.app/admin/lancamentos/abc-123",
  },
} satisfies TemplateEntry;
