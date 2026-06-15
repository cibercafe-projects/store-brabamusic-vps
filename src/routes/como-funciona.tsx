import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/como-funciona")({ component: Como });

const steps = [
  { n: "01", t: "Acessa o catálogo", d: "Navega pela loja em brababeats.app sem precisar de cadastro." },
  { n: "02", t: "Escuta a prévia", d: "Toca o player no card ou na página do beat. Tudo aberto pra visitante." },
  { n: "03", t: "Clica em COMPRAR", d: "Escolhe a licença (Lease, Premium ou Exclusiva) e preenche nome, e-mail e WhatsApp." },
  { n: "04", t: "Recebe as instruções", d: "O link de pagamento (Pix ou checkout) chega por WhatsApp e e-mail, junto com o link pra enviar o comprovante." },
  { n: "05", t: "Envia o comprovante", d: "Direto pelo link gerado na compra — upload rápido, sem precisar voltar pro WhatsApp." },
  { n: "06", t: "Recebe os arquivos", d: "Confirmado o pagamento, a equipe Braba entrega WAV e stems (conforme a licença) por WhatsApp e e-mail." },
];

const faqs = [
  { q: "Preciso criar conta pra comprar?", a: "Não. Os dados necessários (nome, e-mail e WhatsApp) são pedidos no próprio checkout." },
  { q: "Quais licenças vocês oferecem?", a: "Lease, Premium e Exclusiva. Cada uma libera diferentes usos comerciais — confira a comparação na página de cada beat." },
  { q: "Como funciona o pagamento?", a: "Por enquanto é manual: enviamos um link de Pix ou checkout depois que você fecha a compra. Sem gateway automatizado nesta fase." },
  { q: "Como envio o comprovante?", a: "Cada compra gera um link exclusivo pra upload do comprovante. O link chega por WhatsApp e e-mail logo após o checkout." },
  { q: "Como recebo o beat?", a: "Após a Braba confirmar o pagamento, enviamos o link de download pelo WhatsApp e pelo e-mail cadastrados na compra." },
  { q: "Posso usar em clipe / Spotify?", a: "Depende da licença. Premium e Exclusiva liberam distribuição em DSPs e vídeo-clipe." },
  { q: "O beat sai do catálogo se eu comprar exclusiva?", a: "Sim. A licença exclusiva remove o beat do catálogo e te dá direitos exclusivos sobre ele." },
];

function Como() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-5xl text-gradient">Como funciona</h1>
      <p className="mt-2 text-muted-foreground max-w-2xl">
        Catálogo → compra com licença → pagamento → entrega dos arquivos.
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
