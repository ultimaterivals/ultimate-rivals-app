import type { Metadata } from "next";
import { BrandMark } from "@/components/layout/brand-mark";
import { Card } from "@/components/ui";
import { PasswordRecoveryForm } from "@/features/auth/password-recovery-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
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
            Acesso seguro
          </p>
          <h1 className="font-display mt-3 text-3xl font-black uppercase">
            Recuperar senha
          </h1>
          <p className="mt-2 mb-7 text-sm leading-6 text-zinc-400">
            Informe o e-mail cadastrado para receber um link de recuperação.
          </p>
          <PasswordRecoveryForm />
        </Card>
      </div>
    </main>
  );
}
