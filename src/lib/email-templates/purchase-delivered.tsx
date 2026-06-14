import * as React from "react";
import { Link, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, styles } from "./_shared";

interface FileLink {
  label: string;
  url: string;
}

interface Props {
  nome?: string;
  beatNome?: string;
  links?: FileLink[];
  observacao?: string;
}

const PurchaseDelivered = ({
  nome = "",
  beatNome = "—",
  links = [],
  observacao = "",
}: Props) => (
  <EmailShell
    preview={`Seus arquivos do beat ${beatNome} estão prontos`}
    heading="Seus arquivos estão prontos 🎁"
    subline={`${nome ? `${nome}, ` : ""}pagamento confirmado. Os links abaixo são válidos por 7 dias.`}
  >
    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Beat:</strong> {beatNome}
      </Text>
    </Section>

    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: "0 0 8px", fontWeight: 700 }}>
        Arquivos
      </Text>
      {links.length === 0 ? (
        <Text style={styles.small}>—</Text>
      ) : (
        links.map((l) => (
          <Text key={l.label} style={{ ...styles.paragraph, margin: "4px 0" }}>
            • <strong>{l.label}:</strong>{" "}
            <Link href={l.url} style={styles.link}>
              baixar
            </Link>
          </Text>
        ))
      )}
    </Section>

    {observacao ? (
      <Section style={styles.card}>
        <Text style={{ ...styles.paragraph, margin: 0 }}>{observacao}</Text>
      </Section>
    ) : null}

    <Text style={styles.paragraph}>
      Salve os arquivos em um lugar seguro. Se algum link expirar, é só responder este
      e-mail que reenviamos.
    </Text>
  </EmailShell>
);

export const template = {
  component: PurchaseDelivered,
  subject: ({ beatNome }: Props) =>
    `Seus arquivos estão prontos${beatNome ? ` — ${beatNome}` : ""}`,
  displayName: "Entrega de arquivos (cliente)",
  previewData: {
    nome: "Maria",
    beatNome: "Trap Diamante",
    links: [
      { label: "WAV Master", url: "https://example.com/wav" },
      { label: "STEMS", url: "https://example.com/stems" },
      { label: "Licença (PDF)", url: "https://example.com/license" },
    ],
  },
} satisfies TemplateEntry;
