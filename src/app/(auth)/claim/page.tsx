import type { Metadata } from "next";
import { BrandMark } from "@/components/layout/brand-mark";
import { Card } from "@/components/ui";
import { AthleteFirstAccessForm } from "@/features/auth/athlete-first-access-form";
import { getSessionIdentity } from "@/lib/auth/session";
import { ClaimAthleteForm } from "./claim-form";

export const metadata: Metadata = { title: "Primeiro acesso" };

type Params = Promise<{ token?: string | string[] }>;
const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const params = await searchParams;
  const token = (single(params.token) ?? "").trim();
  const validToken = /^[0-9a-f]{64}$/i.test(token);
  const identity = validToken ? await getSessionIdentity() : null;
  const administrativeRole =
    identity && !["public", "athlete"].includes(identity.role);

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="bg-ur-gold absolute inset-x-0 top-0 h-1" />
      <div className="bg-ur-gold/5 absolute -top-40 right-[-10rem] size-96 rounded-full blur-3xl" />
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>
        <Card className="p-6 sm:p-8">
          <p className="text-ur-gold text-xs font-bold tracking-[.2em] uppercase">
            Portal do Atleta
          </p>
          <h1 className="font-display mt-3 text-3xl font-black uppercase">
            Primeiro acesso
          </h1>
          <p className="mt-2 mb-7 text-sm leading-6 text-zinc-400">
            Este vínculo associa sua conta ao histórico esportivo já existente
            no Ultimate Rivals.
          </p>

          {!validToken ? (
            <div className="rounded-ur border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
              O link de primeiro acesso é inválido. Solicite um novo convite à
              organização do UR.
            </div>
          ) : administrativeRole ? (
            <div className="grid gap-3">
              <div className="rounded-ur border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                Você está autenticado com uma conta administrativa. Para
                proteger as permissões do sistema, esse tipo de conta não pode
                assumir um cadastro de atleta.
              </div>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-ur min-h-11 w-full border px-4 text-sm font-bold text-zinc-300 transition hover:bg-white/5"
                >
                  Sair e usar outra conta
                </button>
              </form>
            </div>
          ) : identity ? (
            <ClaimAthleteForm token={token} />
          ) : (
            <AthleteFirstAccessForm token={token} />
          )}
        </Card>
        <p className="mt-5 text-center text-xs leading-5 text-zinc-600">
          O convite é individual, temporário e de uso único. O token original
          não é armazenado no banco.
        </p>
      </div>
    </main>
  );
}
