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
            Ultimate Rivals
          </p>
          <h1 className="font-display mt-3 text-3xl font-black uppercase">
            Bem-vindo de volta
          </h1>
          <p className="mt-2 mb-7 text-sm leading-6 text-zinc-400">
            Entre para continuar sua temporada.
          </p>
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
