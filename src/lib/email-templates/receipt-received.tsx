import * as React from "react";
import { Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, styles } from "./_shared";

interface Props {
  nome?: string;
  beatNome?: string;
}

const ReceiptReceived = ({ nome = "", beatNome = "—" }: Props) => (
  <EmailShell
    preview="Recebemos seu comprovante"
    heading="Comprovante recebido ✅"
    subline={`${nome ? `Olá ${nome}, ` : ""}recebemos seu comprovante e ele está em análise.`}
  >
    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Beat:</strong> {beatNome}
      </Text>
    </Section>

    <Text style={styles.paragraph}>
      Vamos confirmar o pagamento em até algumas horas (normalmente bem mais rápido).
      Assim que estiver tudo certo, você recebe um e-mail com os links dos arquivos.
    </Text>
    <Text style={styles.paragraph}>Obrigado por comprar com a BRABA! 🔥</Text>
  </EmailShell>
);

export const template = {
  component: ReceiptReceived,
  subject: "Comprovante recebido — em análise",
  displayName: "Comprovante recebido (cliente)",
  previewData: { nome: "Maria", beatNome: "Trap Diamante" },
} satisfies TemplateEntry;
