"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function AthleteFirstAccessForm({ token }: { token: string }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("displayName") ?? "").trim();
    const supabase = createClient();

    if (mode === "signup") {
      if (password.length < 8) {
        setError("A senha precisa ter pelo menos 8 caracteres.");
        setPending(false);
        return;
      }
      const next = `/claim?token=${encodeURIComponent(token)}`;
      const emailRedirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: { display_name: displayName || email.split("@")[0] },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        setPending(false);
        return;
      }
      if (data.session) {
        window.location.assign(next);
        return;
      }
      setMessage(
        "Conta criada. Confirme o e-mail recebido e você retornará a este mesmo vínculo para concluir o acesso.",
      );
      setPending(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (loginError) {
      setError("E-mail ou senha inválidos.");
      setPending(false);
      return;
    }
    window.location.assign(`/claim?token=${encodeURIComponent(token)}`);
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-ur grid grid-cols-2 border p-1">
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-ur px-3 py-2 text-sm font-bold transition ${mode === "signup" ? "bg-ur-gold text-black" : "text-zinc-400 hover:bg-white/5"}`}
        >
          Criar conta
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-ur px-3 py-2 text-sm font-bold transition ${mode === "login" ? "bg-ur-gold text-black" : "text-zinc-400 hover:bg-white/5"}`}
        >
          Já tenho conta
        </button>
      </div>

      <form action={submit} className="grid gap-4">
        {mode === "signup" && (
          <Input
            id="displayName"
            name="displayName"
            label="Como quer ser chamado"
            placeholder="Seu nome"
            autoComplete="name"
          />
        )}
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          label="E-mail"
          placeholder="voce@exemplo.com"
          required
        />
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          label="Senha"
          placeholder="Mínimo de 8 caracteres"
          minLength={8}
          required
        />
        {error && (
          <p
            role="alert"
            className="rounded-ur border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-ur border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm leading-6 text-emerald-200">
            {message}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending
            ? "Aguarde…"
            : mode === "signup"
              ? "Criar conta e continuar"
              : "Entrar e continuar"}
        </Button>
      </form>
    </div>
  );
}
