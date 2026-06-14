/**
 * Shared style tokens and layout primitives for BRABA Beats email templates.
 * Body background MUST be #ffffff (provider best practice for transactional).
 * Brand accents pick up the magenta/deep-purple from the app's design tokens.
 */
import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export const colors = {
  bg: "#ffffff",
  surface: "#faf5ff",
  text: "#1a1322",
  muted: "#6b6478",
  brand: "#e91e63",
  brandDeep: "#2c1b4d",
  border: "#ecdff5",
};

const main = {
  backgroundColor: colors.bg,
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  color: colors.text,
  margin: 0,
  padding: 0,
};
const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px 24px",
};
const header = {
  paddingBottom: "16px",
  borderBottom: `2px solid ${colors.brand}`,
  marginBottom: "24px",
};
const brandText = {
  margin: 0,
  fontFamily: "Helvetica, Arial, sans-serif",
  fontWeight: 800 as const,
  fontSize: "22px",
  letterSpacing: "1px",
  color: colors.brandDeep,
};
const brandSub = {
  margin: "2px 0 0",
  fontSize: "11px",
  letterSpacing: "2px",
  color: colors.brand,
  textTransform: "uppercase" as const,
  fontWeight: 700 as const,
};
const footer = {
  marginTop: "32px",
  paddingTop: "16px",
  borderTop: `1px solid ${colors.border}`,
  fontSize: "11px",
  color: colors.muted,
  lineHeight: "1.6",
};

export const styles = {
  main,
  container,
  heading: {
    fontSize: "22px",
    fontWeight: 700 as const,
    margin: "0 0 12px",
    color: colors.brandDeep,
  },
  paragraph: {
    fontSize: "14px",
    lineHeight: "1.6",
    margin: "0 0 12px",
    color: colors.text,
  },
  small: {
    fontSize: "12px",
    color: colors.muted,
    margin: "0 0 8px",
  },
  card: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    padding: "16px 18px",
    margin: "16px 0",
  },
  button: {
    backgroundColor: colors.brand,
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "999px",
    textDecoration: "none",
    display: "inline-block",
    fontWeight: 700 as const,
    fontSize: "14px",
  },
  link: { color: colors.brand, textDecoration: "underline" },
  hr: { border: "none", borderTop: `1px solid ${colors.border}`, margin: "20px 0" },
};

type ShellProps = {
  preview: string;
  heading?: string;
  subline?: string;
  children: React.ReactNode;
};

export function EmailShell({ preview, heading, subline, children }: ShellProps) {
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brandText}>BRABA BEATS</Text>
            <Text style={brandSub}>Selo BRABA Music</Text>
          </Section>
          {heading ? <Heading style={styles.heading}>{heading}</Heading> : null}
          {subline ? <Text style={styles.small}>{subline}</Text> : null}
          {children}
          <Hr style={styles.hr} />
          <Text style={footer}>
            BRABA Music · São Paulo, Brasil
            <br />
            Este e-mail foi enviado porque você iniciou um pedido ou enviou um lançamento.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function formatBRL(value: number | string | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}
