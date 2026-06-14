import * as React from "react";
import { Button, Link, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, formatBRL, styles } from "./_shared";

interface Props {
  nome?: string;
  beatNome?: string;
  valor?: number | string;
  formaPagamento?: "pix" | "link";
  pixKey?: string;
  paymentLink?: string;
  receiptUrl?: string;
}

const PurchaseCreated = ({
  nome = "",
  beatNome = "—",
  valor,
  formaPagamento = "pix",
  pixKey = "",
  paymentLink = "",
  receiptUrl = "https://brababeats.app",
}: Props) => (
  <EmailShell
    preview={`Recebemos seu pedido do beat ${beatNome}`}
    heading="Recebemos seu pedido 🔥"
    subline={`${nome ? `Olá ${nome}, ` : ""}seu pedido foi registrado e está aguardando o pagamento.`}
  >
    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Beat:</strong> {beatNome}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Valor:</strong> {formatBRL(valor)}
      </Text>
    </Section>

    {formaPagamento === "pix" && pixKey ? (
      <Section style={styles.card}>
        <Text style={{ ...styles.paragraph, margin: 0, fontWeight: 700 }}>
          Pagamento via PIX
        </Text>
        <Text style={{ ...styles.paragraph, margin: "6px 0 0", wordBreak: "break-all" }}>
          Chave: <strong>{pixKey}</strong>
        </Text>
      </Section>
    ) : null}

    {formaPagamento === "link" && paymentLink ? (
      <Section style={styles.card}>
        <Text style={{ ...styles.paragraph, margin: "0 0 8px", fontWeight: 700 }}>
          Pague pelo link
        </Text>
        <Link href={paymentLink} style={styles.link}>
          {paymentLink}
        </Link>
      </Section>
    ) : null}

    <Text style={styles.paragraph}>
      Após o pagamento, envie seu comprovante pelo botão abaixo. Liberamos os arquivos
      logo após a confirmação.
    </Text>

    <Section style={{ textAlign: "center", margin: "24px 0" }}>
      <Button href={receiptUrl} style={styles.button}>
        Enviar comprovante
      </Button>
    </Section>

    <Text style={styles.small}>
      Ou copie o link: <Link href={receiptUrl} style={styles.link}>{receiptUrl}</Link>
    </Text>
  </EmailShell>
);

export const template = {
  component: PurchaseCreated,
  subject: ({ beatNome }: Props) =>
    `Recebemos seu pedido${beatNome ? ` — ${beatNome}` : ""}`,
  displayName: "Compra criada (cliente)",
  previewData: {
    nome: "Maria",
    beatNome: "Trap Diamante",
    valor: 250,
    formaPagamento: "pix",
    pixKey: "pagamentos@brababeats.app",
    receiptUrl: "https://brababeats.app/enviar-comprovante/abc-123",
  },
} satisfies TemplateEntry;
