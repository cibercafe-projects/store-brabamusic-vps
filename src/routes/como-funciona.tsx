import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/como-funciona")({ component: Como });

const steps = [
  {
    n: "01",
    t: "Escolha seu Beat",
    d: "Navegue pelo catálogo da Braba Beats, ouça a prévia e escolha o beat ideal para o seu projeto musical.",
  },
  {
    n: "02",
    t: "Preencha seus dados",
    d: "Informe nome completo, nome artístico, e-mail, WhatsApp e Instagram (opcional). Esses dados serão usados para contato e envio dos arquivos após a confirmação do pagamento.",
  },
  {
    n: "03",
    t: "Aceite os Termos de Uso",
    d: "Antes de concluir, leia e aceite os Termos de Uso e Licenciamento — utilização da licença, crédito obrigatório à produtora, registro da obra e orientações sobre royalties.",
  },
  {
    n: "04",
    t: "Preencha o formulário e faça o pagamento",
    d: "Preencha seus dados, aceite os Termos de Uso e escolha a forma de pagamento disponível (Pix ou Link de Pagamento). Após concluir esta etapa, o sistema irá gerar um link exclusivo para envio do comprovante de pagamento.",
  },
  {
    n: "05",
    t: "Envie o comprovante",
    d: "Envie seu comprovante diretamente pela plataforma usando o link gerado automaticamente. Depois, avise a equipe Braba pelo WhatsApp através do botão na tela — ou simplesmente aguarde o contato da equipe.",
  },
  {
    n: "06",
    t: "Receba seus arquivos",
    d: "Após a confirmação do pagamento, a equipe Braba faz a conferência e envia: beat adquirido, stems (quando disponíveis conforme a licença), documento de licenciamento e orientações de créditos da produtora. Todo o contato pode ocorrer por WhatsApp e/ou e-mail cadastrados.",
  },
];

const destaques = [
  "Compra 100% online",
  "Processo simples e intuitivo",
  "Pagamento via Pix ou Link de Pagamento",
  "Upload do comprovante diretamente pela plataforma",
  "Aviso rápido para a equipe via WhatsApp",
  "Atendimento humanizado pela equipe Braba Music",
  "Liberação dos arquivos após confirmação do pagamento",
  "Licenciamento digital com orientações de créditos da produtora",
];

const faqs = [
  {
    q: "Preciso criar conta pra comprar?",
    a: "Não. Os dados necessários (nome completo, nome artístico, e-mail, WhatsApp e Instagram opcional) são pedidos no próprio checkout.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "Você escolhe entre Pix ou Link de Pagamento no checkout. O sistema exibe a chave/link disponível para você concluir o pagamento.",
  },
  {
    q: "Como envio o comprovante?",
    a: "Ao finalizar o checkout, a plataforma gera um link exclusivo para você enviar o comprovante diretamente pelo site — sem precisar mandar por WhatsApp.",
  },
  {
    q: "Preciso avisar a equipe depois do envio?",
    a: "Não é obrigatório. Depois do upload, você pode avisar a equipe Braba pelo botão de WhatsApp que aparece na tela, ou apenas aguardar o contato.",
  },
  {
    q: "Como recebo o beat?",
    a: "Após a Braba confirmar o pagamento, enviamos o beat, os stems (quando incluídos na licença), o documento de licenciamento e as orientações de créditos da produtora — por WhatsApp e/ou e-mail cadastrados.",
  },
  {
    q: "Preciso creditar a produtora?",
    a: "Sim. O crédito à produtora é obrigatório e as orientações de como creditar acompanham a entrega dos arquivos.",
  },
  {
    q: "O beat sai do catálogo se eu comprar exclusiva?",
    a: "Sim. A licença exclusiva remove o beat do catálogo e garante direitos exclusivos sobre ele.",
  },
];

function Como() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-5xl text-gradient">Como funciona</h1>
      <p className="mt-2 text-muted-foreground max-w-2xl">
        Do catálogo à entrega dos arquivos — veja como funciona a compra na Braba Beats.
      </p>

      <ol className="mt-12 grid gap-4 grid-cols-1">
        {steps.map((s) => (
          <li key={s.n} className="glass rounded-2xl p-5 flex gap-4">
            <span className="font-display text-3xl text-accent">{s.n}</span>
            <div>
              <p className="font-display text-xl">{s.t}</p>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-16 font-display text-3xl">Destaques da plataforma</h2>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {destaques.map((d) => (
          <li key={d} className="glass rounded-2xl p-4 flex items-start gap-3">
            <span className="text-accent text-lg leading-none mt-0.5">✅</span>
            <span className="text-sm">{d}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-16 font-display text-3xl">Perguntas frequentes</h2>
      <div className="mt-6 space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="glass rounded-2xl p-5 group">
            <summary className="cursor-pointer font-semibold list-none flex justify-between items-center">
              {f.q}
              <span className="text-accent group-open:rotate-45 transition">+</span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
