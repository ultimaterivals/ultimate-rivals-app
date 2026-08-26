"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import {
  readRecoveryError,
  readRecoveryTokens,
} from "@/lib/auth/password-recovery";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const [recoveryState, setRecoveryState] = useState<
    "checking" | "ready" | "invalid"
  >("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    const client = createClient();
    supabaseRef.current = client;

    const { data: listener } = client.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;
        if (event === "PASSWORD_RECOVERY" || session) {
          setRecoveryState("ready");
        }
      },
    );

    async function confirmRecoverySession() {
      const providerError = readRecoveryError(window.location.hash);
      if (providerError) {
        if (active) setRecoveryState("invalid");
        return;
      }

      const tokens = readRecoveryTokens(window.location.hash);
      const result = tokens
        ? await client.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          })
        : await client.auth.getSession();

      if (tokens) {
        window.history.replaceState(null, "", window.location.pathname);
      }

      if (!active) return;
      setRecoveryState(
        result.data.session && !result.error ? "ready" : "invalid",
      );
    }

    void confirmRecoverySession();

    return () => {
      active = false;
      supabaseRef.current = null;
      listener.subscription.unsubscribe();
    };
  }, []);

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
    const supabase = supabaseRef.current;
    if (!supabase) {
      setError("A sessão ainda está sendo validada. Tente novamente.");
      return;
    }

    setPending(true);
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

  if (recoveryState === "checking") {
    return (
      <p
        role="status"
        className="rounded-ur border border-white/10 bg-white/5 p-4 text-sm leading-6 text-zinc-300"
      >
        Validando seu link seguro…
      </p>
    );
  }

  if (recoveryState === "invalid") {
    return (
      <div className="grid gap-5">
        <p
          role="alert"
          className="rounded-ur border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100"
        >
          Este link expirou, já foi usado ou não abriu com todos os dados de
          segurança. Solicite um novo link abaixo.
        </p>
        <Link
          href="/forgot-password"
          className="rounded-ur bg-ur-gold text-ur-black hover:bg-ur-gold-strong inline-flex min-h-11 items-center justify-center px-5 text-sm font-bold tracking-wider uppercase"
        >
          Enviar novo link
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
