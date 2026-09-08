import * as React from "react";
import { Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, formatBRL, styles } from "./_shared";

interface Props {
  beatTypeNome?: string;
  valorCheio?: number | string;
  valorPromo?: number | string;
  minutosAteInicio?: number;
}

const AdminPromoReminder = ({
  beatTypeNome = "—",
  valorCheio,
  valorPromo,
  minutosAteInicio = 60,
}: Props) => (
  <EmailShell
    preview={`Lembrete: promoção de ${beatTypeNome} começa em ${minutosAteInicio} minutos`}
    heading="Lembrete de promoção"
    subline={`A promoção começa em ${minutosAteInicio} minutos.`}
  >
    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Tipo de beat:</strong> {beatTypeNome}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Valor cheio:</strong> {formatBRL(valorCheio)}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Valor promocional:</strong> {formatBRL(valorPromo)}
      </Text>
      <Text style={{ ...styles.small, margin: "8px 0 0" }}>
        Verifique se o link de pagamento da promoção está correto e se o cadastro
        do beat está ativo.
      </Text>
    </Section>
  </EmailShell>
);

export const template = {
  component: AdminPromoReminder,
  subject: ({ beatTypeNome }: Props) =>
    `[BRABA] Lembrete: ${beatTypeNome ?? "—"} entra em promoção em 1h`,
  displayName: "Admin · Lembrete de promoção",
  previewData: {
    beatTypeNome: "Beat Aberto",
    valorCheio: 200,
    valorPromo: 100,
    minutosAteInicio: 60,
  },
} satisfies TemplateEntry;
