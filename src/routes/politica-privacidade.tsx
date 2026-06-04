import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/politica-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Braba Music" },
      {
        name: "description",
        content:
          "Política de Privacidade da Braba Music: como coletamos, usamos e protegemos seus dados.",
      },
      { property: "og:title", content: "Política de Privacidade — Braba Music" },
      {
        property: "og:description",
        content:
          "Política de Privacidade da Braba Music: como coletamos, usamos e protegemos seus dados.",
      },
    ],
  }),
  component: PoliticaPrivacidadePage,
});

function PoliticaPrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl text-gradient md:text-5xl">
        Política de Privacidade
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última atualização: junho de 2026
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground md:text-base">
        <section>
          <h2 className="font-display text-2xl text-foreground">1. Quem somos</h2>
          <p className="mt-3">
            A Braba Music é uma plataforma de divulgação e comercialização de
            beats produzidos por mulheres. Esta política descreve, de forma
            simples e transparente, como tratamos os dados que você compartilha
            ao navegar e interagir com a plataforma.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            2. Dados que coletamos
          </h2>
          <p className="mt-3">
            Podemos coletar informações de contato (nome, e-mail, WhatsApp)
            quando você manifesta interesse em um beat, além de dados de
            navegação anônimos (páginas visitadas, dispositivo, origem do
            acesso) para fins estatísticos e de melhoria do serviço.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            3. Como utilizamos
          </h2>
          <p className="mt-3">
            Usamos seus dados exclusivamente para responder seu contato,
            viabilizar a negociação e entrega das licenças adquiridas e
            aprimorar a experiência na plataforma. Não vendemos nem
            compartilhamos seus dados com terceiros para fins de marketing.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            4. Cookies
          </h2>
          <p className="mt-3">
            Podemos utilizar cookies essenciais e de análise para entender o
            uso da plataforma. Você pode desativá-los a qualquer momento nas
            configurações do seu navegador.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            5. Seus direitos
          </h2>
          <p className="mt-3">
            Em conformidade com a LGPD (Lei nº 13.709/2018), você pode
            solicitar a qualquer momento o acesso, correção ou exclusão dos
            seus dados pessoais. Para isso, entre em contato pelo e-mail{" "}
            <a
              href="mailto:contato@brabamusic.com.br"
              className="text-primary hover:underline"
            >
              contato@brabamusic.com.br
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            6. Alterações
          </h2>
          <p className="mt-3">
            Esta política pode ser atualizada periodicamente. Recomendamos
            consultá-la regularmente para se manter informado sobre eventuais
            mudanças.
          </p>
        </section>
      </div>

      <div className="mt-12">
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Voltar para o catálogo
        </Link>
      </div>
    </div>
  );
}
