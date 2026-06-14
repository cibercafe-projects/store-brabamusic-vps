import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, formatBRL, styles } from "./_shared";

interface Props {
  nomeCliente?: string;
  email?: string;
  whatsapp?: string;
  beatNome?: string;
  valor?: number | string;
  formaPagamento?: string;
  adminUrl?: string;
}

const AdminNewPurchase = ({
  nomeCliente = "—",
  email = "—",
  whatsapp = "—",
  beatNome = "—",
  valor,
  formaPagamento = "—",
  adminUrl = "https://brababeats.app/admin/compras",
}: Props) => (
  <EmailShell
    preview={`Nova compra: ${beatNome} por ${nomeCliente}`}
    heading="Nova compra recebida"
    subline="Pedido aguardando pagamento."
  >
    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Cliente:</strong> {nomeCliente}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>E-mail:</strong> {email}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>WhatsApp:</strong> {whatsapp}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Beat:</strong> {beatNome}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Valor:</strong> {formatBRL(valor)} ({formaPagamento})
      </Text>
    </Section>

    <Section style={{ textAlign: "center", margin: "24px 0" }}>
      <Button href={adminUrl} style={styles.button}>
        Ver no painel
      </Button>
    </Section>
  </EmailShell>
);

export const template = {
  component: AdminNewPurchase,
  subject: ({ beatNome, nomeCliente }: Props) =>
    `[BRABA] Nova compra: ${beatNome ?? "—"} (${nomeCliente ?? "—"})`,
  displayName: "Admin · Nova compra",
  previewData: {
    nomeCliente: "Maria",
    email: "maria@example.com",
    whatsapp: "+55 11 99999-8888",
    beatNome: "Trap Diamante",
    valor: 250,
    formaPagamento: "pix",
    adminUrl: "https://brababeats.app/admin/compras/abc-123",
  },
} satisfies TemplateEntry;
