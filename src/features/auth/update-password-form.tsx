"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(
        "O link expirou ou não é válido. Solicite uma nova recuperação de senha.",
      );
      return;
    }

    await supabase.auth.signOut();
    setUpdated(true);
  }

  if (updated) {
    return (
      <div className="grid gap-5">
        <p
          role="status"
          className="rounded-ur border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200"
        >
          Senha atualizada com sucesso. Entre novamente com sua nova senha.
        </p>
        <Link
          href="/login"
          className="rounded-ur bg-ur-gold text-ur-black hover:bg-ur-gold-strong inline-flex min-h-11 items-center justify-center px-5 text-sm font-bold tracking-wider uppercase"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <Input
        id="new-password"
        name="password"
        type="password"
        autoComplete="new-password"
        label="Nova senha"
        placeholder="Mínimo de 8 caracteres"
        minLength={8}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />
      <Input
        id="confirm-password"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        label="Confirmar nova senha"
        placeholder="Digite a senha novamente"
        minLength={8}
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
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
        {pending ? "Atualizando…" : "Definir nova senha"}
      </Button>
    </form>
  );
}
