import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { EmailShell, formatBRL, styles } from "./_shared";

interface Props {
  adminNome?: string;
  loginUrl?: string;
  resetUrl?: string;
  adminUrl?: string;
  promocaoTipo?: string;
  promocaoValorCheio?: number | string;
  promocaoValorPromo?: number | string;
  promocaoInicioEm?: string;
  promocaoExpiraEm?: string;
  promocaoDescricao?: string;
  promocaoLink?: string;
  suporteEmail?: string;
}

const AdminOrientacoes = ({
  adminNome = "Administradora",
  loginUrl = "https://loja.brabamusic.com.br/admin/login",
  resetUrl = "https://loja.brabamusic.com.br/admin/reset-password",
  adminUrl = "https://loja.brabamusic.com.br/admin",
  promocaoTipo = "Beat Aberto",
  promocaoValorCheio,
  promocaoValorPromo,
  promocaoInicioEm = "06/09/2026 21:00",
  promocaoExpiraEm = "Sem data definida por enquanto",
  promocaoDescricao = "Beat Aberto por metade do preço! Aproveite por tempo limitado.",
  promocaoLink,
  suporteEmail = "loja@brabamusic.com.br",
}: Props) => (
  <EmailShell
    preview={`Como acessar seu painel + promoção ativa do ${promocaoTipo}`}
    heading="Seu painel BRABA está te esperando"
    subline="Confirma abaixo o acesso, a promoção em vigor e como a plataforma funciona."
  >
    <Text style={styles.paragraph}>Olá, {adminNome}! 👋</Text>
    <Text style={styles.paragraph}>
      Passamos aqui pra te lembrar três coisas que vão te ajudar a tocar a loja com
      tranquilidade: (1) como entrar de novo no painel, (2) a promoção que está ativa
      agora e (3) o básico de como a plataforma funciona pra você.
    </Text>

    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>1) Entrar no painel</strong>
      </Text>
      <Text style={{ ...styles.paragraph, margin: "6px 0 0" }}>
        Acesse <a href={loginUrl} style={styles.link}>{loginUrl}</a> com o e-mail
        que você recebeu este aviso e a senha que você cadastrou. Se não lembra a
        senha, é só clicar em <strong>"Esqueci minha senha"</strong> na tela de
        login ou ir direto em{" "}
        <a href={resetUrl} style={styles.link}>{resetUrl}</a> — você recebe um
        link por e-mail pra redefinir.
      </Text>
    </Section>

    <Section
      style={{
        ...styles.card,
        backgroundColor: "#ecfdf5",
        border: `1px solid #34d399`,
      }}
    >
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>2) Promoção ativa agora</strong>
      </Text>
      <Text style={{ ...styles.paragraph, margin: "6px 0 0" }}>
        O tipo <strong>{promocaoTipo}</strong> está em promoção por tempo limitado.
      </Text>
      <Text style={{ ...styles.paragraph, margin: "6px 0 0" }}>
        De <span style={{ textDecoration: "line-through" }}>{formatBRL(promocaoValorCheio)}</span> por{" "}
        <strong style={{ color: "#047857" }}>{formatBRL(promocaoValorPromo)}</strong>
      </Text>
      <Text style={{ ...styles.paragraph, margin: "6px 0 0" }}>
        <strong>Início:</strong> {promocaoInicioEm}
        <br />
        <strong>Término:</strong> {promocaoExpiraEm}
      </Text>
      {promocaoDescricao ? (
        <Text style={{ ...styles.paragraph, margin: "8px 0 0" }}>
          <em>{promocaoDescricao}</em>
        </Text>
      ) : null}
      {promocaoLink ? (
        <Text style={{ ...styles.small, margin: "10px 0 0" }}>
          <strong>Link de pagamento da promoção:</strong>{" "}
          <a href={promocaoLink} style={styles.link}>
            {promocaoLink}
          </a>
        </Text>
      ) : null}
      <Text style={{ ...styles.small, margin: "8px 0 0" }}>
        Você pode ajustar a data de término em{" "}
        <a href={`${adminUrl}/promocoes`} style={styles.link}>
          /admin/promocoes
        </a>{" "}
        quando souber até quando a campanha vai rodar.
      </Text>
    </Section>

    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>3) Como a plataforma funciona — o básico do dia a dia</strong>
      </Text>
      <Text style={{ ...styles.paragraph, margin: "8px 0 0" }}>
        • <strong>Beats</strong> (/admin/beats): você cadastra e mantém os beats
        ativos. Cada beat precisa de capa, prévia, WAV (e opcionalmente stems e
        licença).
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        • <strong>Tipos de Beat</strong> (/admin/tipos-beat): "Aberto" e
        "Fechado" definem preço padrão, link de pagamento e se inclui stems.
        Promoções ficam separadas, em <strong>/admin/promocoes</strong>.
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        • <strong>Compras</strong> (/admin/compras): você acompanha os pedidos
        (pagamento pendente → comprovante → entrega dos arquivos).
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        • <strong>Lançamentos</strong> (/admin/lancamentos): pedidos que os
        artistas enviam pra você (link de pagamento e arquivos opcionais).
      </Text>
      <Text style={{ ...styles.paragraph, margin: "8px 0 0" }}>
        <strong>Fluxo de uma venda, em ordem:</strong>
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        1. Cliente escolhe o beat e clica em <strong>Comprar</strong>.
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        2. Sistema gera um pedido com link de pagamento e token de retorno.
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        3. Cliente paga e envia o comprovante pelo link que recebeu.
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        4. Você confirma o pagamento e dispara a entrega dos arquivos.
      </Text>
      <Text style={{ ...styles.paragraph, margin: "4px 0 0" }}>
        5. O beat vira <strong>vendido</strong> e sai do catálogo público.
      </Text>
    </Section>

    <Section style={styles.card}>
      <Text style={{ ...styles.paragraph, margin: 0 }}>
        <strong>Promoção na prática</strong>
      </Text>
      <Text style={{ ...styles.paragraph, margin: "6px 0 0" }}>
        A promoção roda no <strong>tipo inteiro</strong>, não em um beat só.
        Enquanto estiver ativa, todos os beats daquele tipo aparecem com selo de
        promoção, preço riscado e link de pagamento específico. Cadastros,
        edições e término são feitos por você em{" "}
        <a href={`${adminUrl}/promocoes`} style={styles.link}>
          /admin/promocoes
        </a>
        .
      </Text>
    </Section>

    <Text style={styles.paragraph}>
      Dúvidas? É só responder este e-mail ou chamar a gente em{" "}
      <a href={`mailto:${suporteEmail}`} style={styles.link}>
        {suporteEmail}
      </a>
      .
    </Text>
    <Text style={styles.paragraph}>
      Vamos juntas! 💜
      <br />
      Time BRABA
    </Text>

    <Section style={{ textAlign: "center", margin: "24px 0 0" }}>
      <Button href={adminUrl} style={styles.button}>
        Ir para o painel
      </Button>
    </Section>
  </EmailShell>
);

export const template = {
  component: AdminOrientacoes,
  subject: ({ promocaoTipo }: Props) =>
    `[BRABA] Como acessar seu painel + promoção ativa do ${promocaoTipo ?? "Beat Aberto"}`,
  displayName: "Admin · Orientações iniciais + promoção",
  previewData: {
    adminNome: "Andressa",
    promocaoTipo: "Beat Aberto",
    promocaoValorCheio: 200,
    promocaoValorPromo: 100,
    promocaoInicioEm: "06/09/2026 21:00",
    promocaoExpiraEm: "Sem data definida por enquanto",
    promocaoDescricao: "Beat Aberto por metade do preço! Aproveite por tempo limitado.",
    promocaoLink: "https://mpago.la/2btPnWY",
  },
} satisfies TemplateEntry;
