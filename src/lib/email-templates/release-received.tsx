import * as React from "react";
import { Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, styles } from "./_shared";

interface Props {
  artistName?: string;
  releaseName?: string;
  releaseType?: string;
}

const TYPE_LABEL: Record<string, string> = {
  single: "Single",
  ep: "EP",
  album: "Álbum",
};

const ReleaseReceived = ({
  artistName = "",
  releaseName = "—",
  releaseType = "single",
}: Props) => (
  <EmailShell
    preview="Recebemos seu lançamento"
    heading="Recebemos seu lançamento 🎶"
    subline={`${artistName ? `${artistName}, ` : ""}obrigado por enviar para a BRABA Music.`}
  >
    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Obra:</strong> {releaseName}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Tipo:</strong> {TYPE_LABEL[releaseType] ?? releaseType}
      </Text>
    </Section>

    <Text style={styles.paragraph}>
      Nosso time vai analisar e te retornar por aqui em breve. Você receberá um novo
      e-mail sempre que o status mudar.
    </Text>
  </EmailShell>
);

export const template = {
  component: ReleaseReceived,
  subject: ({ releaseName }: Props) =>
    `Recebemos seu lançamento${releaseName ? ` — ${releaseName}` : ""}`,
  displayName: "Lançamento recebido (artista)",
  previewData: {
    artistName: "MC Exemplo",
    releaseName: "Madrugada",
    releaseType: "single",
  },
} satisfies TemplateEntry;
