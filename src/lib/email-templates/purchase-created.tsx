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
  emPromocao?: boolean;
  precoCheio?: number | string | null;
}

const PurchaseCreated = ({
  nome = "",
  beatNome = "—",
  valor,
  formaPagamento = "pix",
  pixKey = "",
  paymentLink = "",
  receiptUrl = "https://loja.brabamusic.com.br",
  emPromocao = false,
  precoCheio,
}: Props) => {
  const hasCheio =
    precoCheio != null && (typeof precoCheio === "number" ? precoCheio > 0 : Number(precoCheio) > 0);
  return (
    <EmailShell
      preview={`Recebemos seu pedido do beat ${beatNome}${emPromocao ? " (em promoção)" : ""}`}
      heading="Recebemos seu pedido 🔥"
      subline={`${nome ? `Olá ${nome}, ` : ""}seu pedido foi registrado e está aguardando o pagamento.`}
    >
      {emPromocao && (
        <Section
          style={{
            ...styles.card,
            borderColor: "#10b981",
            backgroundColor: "#ecfdf5",
          }}
        >
          <Text style={{ ...styles.paragraph, margin: 0, fontWeight: 700, color: "#047857" }}>
            🔥 Este beat está em promoção por tempo limitado
          </Text>
          <Text style={{ ...styles.paragraph, margin: "6px 0 0", color: "#065f46" }}>
            Você está pagando o valor promocional{" "}
            <strong>{formatBRL(valor)}</strong>
            {hasCheio ? (
              <>
                {" "}
                (de{" "}
                <span style={{ textDecoration: "line-through" }}>{formatBRL(precoCheio)}</span>)
              </>
            ) : null}
            .
          </Text>
        </Section>
      )}

      <Section style={styles.card}>
        <Text style={{ ...styles.paragraph, margin: 0 }}>
          <strong>Beat:</strong> {beatNome}
        </Text>
        <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
          <strong>Valor:</strong>{" "}
          {emPromocao && hasCheio ? (
            <>
              {formatBRL(valor)}{" "}
              <span style={{ color: styles.small.color, textDecoration: "line-through" }}>
                (de {formatBRL(precoCheio)})
              </span>
            </>
          ) : (
            formatBRL(valor)
          )}
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
          {emPromocao && (
            <Text style={{ ...styles.small, margin: "8px 0 0" }}>
              Pague o valor promocional <strong>{formatBRL(valor)}</strong> usando esta chave.
            </Text>
          )}
        </Section>
      ) : null}

      {formaPagamento === "link" && paymentLink ? (
        <Section style={styles.card}>
          <Text style={{ ...styles.paragraph, margin: "0 0 8px", fontWeight: 700 }}>
            {emPromocao ? "Pague pelo link da promoção" : "Pague pelo link"}
          </Text>
          <Link href={paymentLink} style={styles.link}>
            {paymentLink}
          </Link>
          {emPromocao && (
            <Text style={{ ...styles.small, margin: "8px 0 0" }}>
              Este é o link de pagamento da promoção ({formatBRL(valor)}). Use-o para concluir
              a compra pelo valor promocional.
            </Text>
          )}
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
};

export const template = {
  component: PurchaseCreated,
  subject: ({ beatNome, emPromocao }: Props) =>
    `Recebemos seu pedido${beatNome ? ` — ${beatNome}` : ""}${emPromocao ? " (em promoção)" : ""}`,
  displayName: "Compra criada (cliente)",
  previewData: {
    nome: "Maria",
    beatNome: "Trap Diamante",
    valor: 250,
    formaPagamento: "pix",
    pixKey: "pagamentos@loja.brabamusic.com.br",
    receiptUrl: "https://loja.brabamusic.com.br/enviar-comprovante/abc-123",
    emPromocao: false,
    precoCheio: null,
  },
} satisfies TemplateEntry;
