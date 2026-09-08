import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, formatBRL, styles, colors } from "./_shared";

interface Props {
  beatTypeNome?: string;
  valorCheio?: number | string;
  valorPromo?: number | string;
  promoLinkPagamento?: string;
  promoInicioEm?: string;
  promoExpiraEm?: string;
  promoDescricao?: string;
  adminUrl?: string;
}

const AdminPromoCreated = ({
  beatTypeNome = "—",
  valorCheio,
  valorPromo,
  promoLinkPagamento = "—",
  promoInicioEm = "—",
  promoExpiraEm = "—",
  promoDescricao,
  adminUrl = "https://loja.brabamusic.com.br/admin/promocoes",
}: Props) => (
  <EmailShell
    preview={`Promoção cadastrada: ${beatTypeNome} por ${formatBRL(valorPromo)}`}
    heading="Promoção cadastrada"
    subline="Uma nova promoção foi configurada para um tipo de beat."
  >
    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Tipo de beat:</strong> {beatTypeNome}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Valor cheio:</strong>{" "}
        <span
          style={{
            textDecoration: "line-through",
            color: colors.muted,
          }}
        >
          {formatBRL(valorCheio)}
        </span>
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Valor promocional:</strong> {formatBRL(valorPromo)}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Início:</strong> {promoInicioEm}
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        <strong>Expira em:</strong> {promoExpiraEm}
      </Text>
      {promoDescricao ? (
        <Text style={{ ...styles.paragraph, margin: "8px 0 0" }}>
          <strong>Descrição:</strong> {promoDescricao}
        </Text>
      ) : null}
      <Text style={{ ...styles.paragraph, margin: "8px 0 0" }}>
        <strong>Link de pagamento da promoção:</strong>{" "}
        <a href={promoLinkPagamento} style={styles.link}>
          {promoLinkPagamento}
        </a>
      </Text>
    </Section>

    <Section style={{ textAlign: "center", margin: "24px 0" }}>
      <Button href={adminUrl} style={styles.button}>
        Ver promoções
      </Button>
    </Section>
  </EmailShell>
);

export const template = {
  component: AdminPromoCreated,
  subject: ({ beatTypeNome, valorPromo }: Props) =>
    `[BRABA] Promoção cadastrada: ${beatTypeNome ?? "—"} por ${formatBRL(valorPromo)}`,
  displayName: "Admin · Promoção cadastrada",
  previewData: {
    beatTypeNome: "Beat Aberto",
    valorCheio: 200,
    valorPromo: 100,
    promoLinkPagamento: "https://mpago.la/exemplo",
    promoInicioEm: "08/09/2026 10:00",
    promoExpiraEm: "10/09/2026 23:59",
    promoDescricao: "Beat Aberto por metade do preço!",
    adminUrl: "https://loja.brabamusic.com.br/admin/promocoes",
  },
} satisfies TemplateEntry;
