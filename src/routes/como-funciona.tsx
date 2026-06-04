import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/como-funciona")({ component: Como });

const steps = [
  { n: "01", t: "Acessa o catálogo", d: "Navega pela loja em loja.brabamusic.com.br sem precisar de cadastro." },
  { n: "02", t: "Escuta a prévia", d: "Toca o player no card ou na página do beat. Tudo aberto pra visitante." },
  { n: "03", t: "Manda interesse no WhatsApp", d: "Na página do beat, clica em 'Tenho interesse' e cai direto no WhatsApp da equipe BRABA com a mensagem pronta." },
  { n: "04", t: "Pagamento manual", d: "A equipe envia link de Pix ou dados de pagamento conforme a licença escolhida." },
  { n: "05", t: "Entrega manual", d: "Confirmado o pagamento, o beat é enviado pelo WhatsApp e/ou e-mail com link pra download (WAV + stems conforme a licença)." },
];

const faqs = [
  { q: "Preciso criar conta pra comprar?", a: "Não. Por enquanto o atendimento é todo manual via WhatsApp. Você escolhe o beat, fala com a equipe e fecha por lá." },
  { q: "Quais licenças vocês oferecem?", a: "Lease, Premium e Exclusiva. Cada uma libera diferentes usos comerciais — confira a comparação na página de cada beat." },
  { q: "Como funciona o pagamento?", a: "Combinamos no WhatsApp — Pix ou link de pagamento, conforme a licença. Sem gateway automatizado nesta fase." },
  { q: "Como recebo o beat?", a: "Após confirmar o pagamento, enviamos o link de download pelo WhatsApp e/ou e-mail." },
  { q: "Posso usar em clipe / Spotify?", a: "Depende da licença. Premium e Exclusiva liberam distribuição em DSPs e vídeo-clipe." },
  { q: "O beat fica fora do catálogo se eu comprar exclusiva?", a: "Sim. A licença exclusiva remove o beat do catálogo e te dá direitos exclusivos." },
];

function Como() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-5xl text-gradient">Como funciona</h1>
      <p className="mt-2 text-muted-foreground max-w-2xl">
        Fluxo simples e direto: catálogo → interesse no WhatsApp → pagamento manual → entrega manual.
      </p>

      <ol className="mt-12 grid gap-4 md:grid-cols-2">
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
