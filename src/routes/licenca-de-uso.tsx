import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/licenca-de-uso")({
  head: () => ({
    meta: [
      { title: "Licença de Uso dos Beats — Braba Music" },
      {
        name: "description",
        content:
          "Licença de Uso dos Beats da Braba Music: modalidades, usos liberados, prazos e regras de atribuição.",
      },
      { property: "og:title", content: "Licença de Uso dos Beats — Braba Music" },
      {
        property: "og:description",
        content:
          "Licença de Uso dos Beats da Braba Music: modalidades, usos liberados, prazos e regras de atribuição.",
      },
    ],
  }),
  component: LicencaUsoPage,
});

function LicencaUsoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl text-gradient md:text-5xl">
        Licença de Uso dos Beats
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última atualização: junho de 2026
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground md:text-base">
        <section>
          <h2 className="font-display text-2xl text-foreground">
            1. Objeto da licença
          </h2>
          <p className="mt-3">
            Ao adquirir um beat na Braba Music, o cliente recebe o direito de
            uso da obra musical conforme a modalidade contratada e o tipo do
            beat (Aberto ou Fechado). Esta licença não transfere a titularidade
            dos direitos autorais, que permanecem com a produtora e com a
            Braba Music.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            2. Tipos de beat
          </h2>
          <p className="mt-3">
            <strong className="text-foreground">Beat Fechado:</strong> entrega
            do arquivo WAV master, sem stems separados.
          </p>
          <p className="mt-3">
            <strong className="text-foreground">Beat Aberto:</strong> entrega
            do arquivo WAV master acompanhado dos stems (faixas separadas),
            permitindo mixagem personalizada.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            3. Usos liberados
          </h2>
          <p className="mt-3">
            O cliente pode utilizar o beat licenciado em composições próprias
            distribuídas em plataformas de streaming, redes sociais,
            videoclipes e apresentações ao vivo, observados os limites da
            modalidade contratada e a creditação obrigatória descrita abaixo.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            4. Usos não permitidos
          </h2>
          <p className="mt-3">
            É vedado revender, redistribuir, sublicenciar ou disponibilizar o
            beat — em sua forma original ou modificada — como produto isolado,
            sample pack, kit ou biblioteca. Também é proibido registrar a obra
            instrumental em seu próprio nome em sociedades de gestão coletiva
            ou plataformas de monetização de música, sem a anuência expressa
            da Braba Music.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            5. Creditação
          </h2>
          <p className="mt-3">
            Em toda publicação que utilize o beat, o cliente deve atribuir a
            produção à produtora responsável, no formato “prod. [nome da
            produtora]”, e mencionar a Braba Music sempre que possível.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            6. Prazo e entrega
          </h2>
          <p className="mt-3">
            Após a confirmação do pagamento, a entrega dos arquivos é
            realizada pela equipe Braba em até 24 horas úteis, por e-mail e/ou
            WhatsApp.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            7. Descumprimento
          </h2>
          <p className="mt-3">
            O descumprimento desta licença autoriza a Braba Music e a
            produtora a tomar as medidas legais cabíveis, incluindo a remoção
            do conteúdo e cobrança de indenização.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            8. Contato
          </h2>
          <p className="mt-3">
            Dúvidas sobre esta licença podem ser encaminhadas para{" "}
            <a
              href="mailto:contato@brabamusic.com.br"
              className="text-primary hover:underline"
            >
              contato@brabamusic.com.br
            </a>
            .
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
