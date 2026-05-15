import { useState } from "react";
import { Mail, User, Check } from "lucide-react";
import { useAuth } from "./AuthStore";

export function AuthModal() {
  const { modalOpen, closeModal, login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  if (!modalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass rounded-2xl p-6 border border-white/20">
        <p className="text-xs uppercase tracking-[0.3em] text-accent">Identifica-te</p>
        <h3 className="mt-2 font-display text-3xl">Cadastro rápido</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Sem senha. É só pra equipe BRABA te enviar o <strong>link de pagamento</strong> e depois
          o <strong>link do beat</strong> por e-mail e WhatsApp.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && email.trim()) login({ name: name.trim(), email: email.trim() });
          }}
          className="mt-5 space-y-3"
        >
          <label className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 focus-within:border-accent">
            <User className="h-4 w-4 text-muted-foreground" />
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome ou nome artístico"
              className="flex-1 bg-transparent py-2 text-sm outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 focus-within:border-accent">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="flex-1 bg-transparent py-2 text-sm outline-none"
            />
          </label>

          <p className="text-[11px] text-muted-foreground flex gap-2">
            <Check className="h-3 w-3 text-accent shrink-0 mt-0.5" />
            Usamos seu e-mail só pra enviar pagamento e beats. Sem spam.
          </p>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={closeModal} className="rounded-full px-4 py-2 text-sm hover:bg-white/10">
              Agora não
            </button>
            <button type="submit" className="rounded-full bg-accent text-accent-foreground px-5 py-2 text-sm font-semibold glow-magenta">
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
