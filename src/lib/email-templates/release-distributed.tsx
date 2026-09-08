import * as React from "react";
import { Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, styles } from "./_shared";

interface Props {
  artistName?: string;
  releaseName?: string;
}

const ReleaseDistributed = ({
  artistName = "",
  releaseName = "—",
}: Props) => (
  <EmailShell
    preview={`Lançamento ${releaseName} distribuído`}
    heading="Seu lançamento foi distribuído"
    subline={artistName ? `${artistName}, está no ar:` : "Está no ar:"}
  >
    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Obra:</strong> {releaseName}
      </Text>
    </Section>

    <Text style={styles.paragraph}>
      A obra já foi enviada para as plataformas digitais e em breve estará
      disponível nos streamings.
    </Text>

    <Text style={styles.paragraph}>
      Qualquer dúvida, é só responder este e-mail.
    </Text>
  </EmailShell>
);

export const template = {
  component: ReleaseDistributed,
  subject: ({ releaseName }: Props) =>
    `Lançamento distribuído${releaseName ? ` — ${releaseName}` : ""}`,
  displayName: "Lançamento distribuído (artista)",
  previewData: {
    artistName: "MC Exemplo",
    releaseName: "Madrugada",
  },
} satisfies TemplateEntry;
