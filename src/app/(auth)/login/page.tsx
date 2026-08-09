import type { Metadata } from "next";
import { BrandMark } from "@/components/layout/brand-mark";
import { Card } from "@/components/ui";
import { LoginForm } from "@/features/auth/login-form";
import {
  loginAsTestAdmin,
  loginAsTestAthlete,
} from "@/features/auth/actions";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  const testAccessEnabled =
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_TEST_LOGIN === "true";

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="bg-ur-gold absolute inset-x-0 top-0 h-1" />
      <div className="bg-ur-gold/5 absolute -top-40 right-[-10rem] size-96 rounded-full blur-3xl" />
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>
        <Card className="p-6 sm:p-8">
          <p className="text-ur-gold text-xs font-bold tracking-[.2em] uppercase">
            Acesso oficial
          </p>
          <h1 className="font-display mt-3 text-3xl font-black uppercase">
            Entre na arena
          </h1>
          <p className="mt-2 mb-7 text-sm leading-6 text-zinc-400">
            Use suas credenciais para acessar o portal correspondente ao seu
            papel.
          </p>
          <LoginForm />

          {testAccessEnabled && (
            <div className="mt-7 border-t border-zinc-800 pt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-ur-gold text-xs font-bold tracking-[.16em] uppercase">
                  Acesso de teste
                </p>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-2 py-1 text-[10px] font-bold tracking-wider text-amber-200 uppercase">
                  Somente DEV
                </span>
              </div>
              <p className="mb-4 text-xs leading-5 text-zinc-500">
                Acesse instantaneamente as duas experiências para validar o
                produto sem alternar credenciais manualmente.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <form action={loginAsTestAdmin}>
                  <button
                    type="submit"
                    className="border-ur-gold/30 bg-ur-gold/10 text-ur-gold hover:bg-ur-gold/15 w-full rounded-md border px-4 py-3 text-xs font-black tracking-wider uppercase transition"
                  >
                    Entrar como Admin
                  </button>
                </form>
                <form action={loginAsTestAthlete}>
                  <button
                    type="submit"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-xs font-black tracking-wider text-zinc-200 uppercase transition hover:border-zinc-500"
                  >
                    Entrar como Atleta
                  </button>
                </form>
              </div>
            </div>
          )}
        </Card>
        <p className="mt-5 text-center text-xs text-zinc-600">
          Plataforma oficial Ultimate Rivals
        </p>
      </div>
    </main>
  );
}
