import * as React from "react";
import { Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, styles } from "./_shared";

interface Props {
  artistName?: string;
  releaseName?: string;
  status?: string;
  statusLabel?: string;
}

const ReleaseStatusChanged = ({
  artistName = "",
  releaseName = "—",
  statusLabel = "atualizado",
}: Props) => (
  <EmailShell
    preview={`Atualização do lançamento ${releaseName}`}
    heading="Atualização do seu lançamento"
    subline={artistName ? `Olá ${artistName},` : ""}
  >
    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Obra:</strong> {releaseName}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Novo status:</strong> {statusLabel}
      </Text>
    </Section>

    <Text style={styles.paragraph}>
      Se precisar de qualquer coisa, é só responder este e-mail.
    </Text>
  </EmailShell>
);

export const template = {
  component: ReleaseStatusChanged,
  subject: ({ statusLabel, releaseName }: Props) =>
    `Lançamento ${releaseName ?? ""}: ${statusLabel ?? "atualizado"}`.trim(),
  displayName: "Status do lançamento alterado (artista)",
  previewData: {
    artistName: "MC Exemplo",
    releaseName: "Madrugada",
    statusLabel: "Aprovado",
  },
} satisfies TemplateEntry;
