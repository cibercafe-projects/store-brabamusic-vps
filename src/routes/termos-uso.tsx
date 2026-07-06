import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Braba Music" },
      {
        name: "description",
        content:
          "Termos de Uso da plataforma Braba Music: condições para navegação, licenciamento e contratação de beats.",
      },
      { property: "og:title", content: "Termos de Uso — Braba Music" },
      {
        property: "og:description",
        content:
          "Termos de Uso da plataforma Braba Music: condições para navegação, licenciamento e contratação de beats.",
      },
    ],
  }),
  component: TermosUsoPage,
});

function TermosUsoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl text-gradient md:text-5xl">
        Termos de Uso
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Última atualização: junho de 2026
      </p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground md:text-base">
        <section>
          <h2 className="font-display text-2xl text-foreground">
            1. Aceitação dos termos
          </h2>
          <p className="mt-3">
            Ao acessar a plataforma Braba Music, você concorda com os termos
            descritos neste documento. Caso não concorde, recomendamos
            interromper o uso da plataforma.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            2. Objeto da plataforma
          </h2>
          <p className="mt-3">
            A Braba Music é uma vitrine digital de beats produzidos por
            mulheres. A plataforma intermedia o contato entre produtoras e
            artistas interessados em licenciar obras musicais.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            3. Licenciamento
          </h2>
          <p className="mt-3">
            Cada beat possui modalidades de licença próprias, com escopo de
            uso, prazo e direitos definidos no momento da contratação. O
            pagamento e a entrega do arquivo master são realizados de forma
            assistida, mediante combinação direta com a equipe Braba.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            4. Uso adequado
          </h2>
          <p className="mt-3">
            É proibido reproduzir, redistribuir, revender ou utilizar
            comercialmente qualquer prévia de áudio disponibilizada na
            plataforma sem a aquisição da licença correspondente. O
            descumprimento sujeita o usuário às sanções legais cabíveis.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            5. Propriedade intelectual
          </h2>
          <p className="mt-3">
            Todo o conteúdo presente na plataforma — incluindo beats, marcas,
            textos, imagens e identidade visual — é protegido por direitos
            autorais e pertence às respectivas produtoras e à Braba Music.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            6. Limitação de responsabilidade
          </h2>
          <p className="mt-3">
            A Braba Music não se responsabiliza pelo uso indevido das obras
            licenciadas após a entrega ao artista, nem por eventuais
            indisponibilidades técnicas momentâneas da plataforma.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl text-foreground">
            7. Contato
          </h2>
          <p className="mt-3">
            Dúvidas sobre estes termos podem ser encaminhadas pela nossa{" "}
            <Link to="/feedback" className="text-primary hover:underline">
              central de ajuda e feedback
            </Link>
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
