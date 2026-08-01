import type { Metadata } from "next";
import { BrandMark } from "@/components/layout/brand-mark";
import { Card } from "@/components/ui";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };
export default function LoginPage() {
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
        </Card>
        <p className="mt-5 text-center text-xs text-zinc-600">
          Ambiente em fundação — acesso restrito
        </p>
      </div>
    </main>
  );
}
