import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, styles } from "./_shared";

interface Props {
  nomeCliente?: string;
  beatNome?: string;
  adminUrl?: string;
}

const AdminNewReceipt = ({
  nomeCliente = "—",
  beatNome = "—",
  adminUrl = "https://brababeats.app/admin/compras",
}: Props) => (
  <EmailShell
    preview={`Novo comprovante: ${nomeCliente} (${beatNome})`}
    heading="Novo comprovante recebido"
    subline="Confira no painel e confirme o pagamento."
  >
    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Cliente:</strong> {nomeCliente}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Beat:</strong> {beatNome}
      </Text>
    </Section>

    <Section style={{ textAlign: "center", margin: "24px 0" }}>
      <Button href={adminUrl} style={styles.button}>
        Abrir compra
      </Button>
    </Section>
  </EmailShell>
);

export const template = {
  component: AdminNewReceipt,
  subject: ({ nomeCliente }: Props) =>
    `[BRABA] Novo comprovante: ${nomeCliente ?? "—"}`,
  displayName: "Admin · Novo comprovante",
  previewData: {
    nomeCliente: "Maria",
    beatNome: "Trap Diamante",
    adminUrl: "https://brababeats.app/admin/compras/abc-123",
  },
} satisfies TemplateEntry;
