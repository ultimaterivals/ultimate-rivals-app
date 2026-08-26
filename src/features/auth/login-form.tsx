"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Button, Input } from "@/components/ui";

const initialState: LoginState = {};
export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  return (
    <form action={action} className="grid gap-5">
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
        autoComplete="current-password"
        label="Senha"
        placeholder="Mínimo de 8 caracteres"
        minLength={8}
        required
      />
      {state.error && (
        <p
          role="alert"
          className="rounded-ur border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <Link
        href="/forgot-password"
        className="text-center text-sm font-medium text-zinc-400 hover:text-white"
      >
        Esqueci minha senha
      </Link>
    </form>
  );
}
