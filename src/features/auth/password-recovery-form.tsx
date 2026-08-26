"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecoveryForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/confirm?next=/update-password`;
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo,
      },
    );

    setPending(false);
    if (recoveryError) {
      setError(
        "Não foi possível enviar o link agora. Tente novamente em instantes.",
      );
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="grid gap-5">
        <p
          role="status"
          className="rounded-ur border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200"
        >
          Se o e-mail estiver cadastrado, você receberá um link seguro para
          definir uma nova senha. Verifique também a caixa de spam.
        </p>
        <Link
          href="/login"
          className="text-ur-gold hover:text-ur-gold-strong text-center text-sm font-bold"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <Input
        id="recovery-email"
        name="email"
        type="email"
        autoComplete="email"
        label="E-mail"
        placeholder="voce@exemplo.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
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
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar link de recuperação"}
      </Button>
      <Link
        href="/login"
        className="text-center text-sm font-medium text-zinc-400 hover:text-white"
      >
        Voltar para o login
      </Link>
    </form>
  );
}
