import * as React from "react";
import { Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, styles } from "./_shared";

interface Props {
  artistName?: string;
  releaseName?: string;
}

const ReleaseApproved = ({
  artistName = "",
  releaseName = "—",
}: Props) => (
  <EmailShell
    preview={`Lançamento ${releaseName} aprovado`}
    heading="Seu lançamento foi aprovado"
    subline={artistName ? `${artistName}, boa notícia:` : "Boa notícia:"}
  >
    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Obra:</strong> {releaseName}
      </Text>
    </Section>

    <Text style={styles.paragraph}>
      Vamos iniciar a distribuição em breve. Você receberá um novo e-mail quando o
      lançamento estiver nas plataformas.
    </Text>

    <Text style={styles.paragraph}>
      Se precisar de algo, é só responder este e-mail.
    </Text>
  </EmailShell>
);

export const template = {
  component: ReleaseApproved,
  subject: ({ releaseName }: Props) =>
    `Lançamento aprovado${releaseName ? ` — ${releaseName}` : ""}`,
  displayName: "Lançamento aprovado (artista)",
  previewData: {
    artistName: "MC Exemplo",
    releaseName: "Madrugada",
  },
} satisfies TemplateEntry;
