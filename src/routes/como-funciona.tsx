import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/como-funciona")({ component: Como });

const steps = [
  { n: "01", t: "Acessa o catálogo", d: "Loja.brabamusic.com.br ou pela aba Beats no app." },
  { n: "02", t: "Escuta a prévia", d: "Toca o player no card ou na página do beat." },
  { n: "03", t: "Marca interesse", d: "Clica em 'Tenho interesse' ou salva vários na lista." },
  { n: "04", t: "Fala com a equipe", d: "Abre o WhatsApp ou envia o formulário." },
  { n: "05", t: "Recebe o link de pagamento", d: "Pix ou gateway externo, conforme licença." },
  { n: "06", t: "Recebe o beat", d: "Entrega manual dos arquivos (Fase 1 — em breve, automática)." },
];

const faqs = [
  { q: "Quais licenças vocês oferecem?", a: "Lease, Premium e Exclusiva. Cada uma libera diferentes usos comerciais — confira a comparação na página de cada beat." },
  { q: "Como funciona o pagamento?", a: "Nesta fase, é manual: te enviamos um link de Pix ou gateway externo. Em breve, checkout direto pela loja." },
  { q: "Posso usar em clipe / Spotify?", a: "Depende da licença. Premium e Exclusiva liberam distribuição em DSPs e vídeo-clipe." },
  { q: "O beat fica fora do catálogo se eu comprar exclusiva?", a: "Sim. A licença exclusiva remove o beat do catálogo e te dá direitos exclusivos." },
];

function Como() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-5xl text-gradient">Como funciona</h1>
      <p className="mt-2 text-muted-foreground max-w-2xl">Fluxo simples, do catálogo até o beat na sua mão. Fase 1 do projeto Cibercafé.</p>

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
