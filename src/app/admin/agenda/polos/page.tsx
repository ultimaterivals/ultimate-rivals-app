import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CircleDot,
  MapPinned,
  SquareStack,
} from "lucide-react";
import { activatePoleRegionAction } from "@/app/admin/agenda/polos/actions";
import { Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminPolesInfrastructureSnapshot } from "@/server/services/admin-poles-infrastructure-service";

type Params = Promise<{ result?: string | string[] }>;
const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const resultMessages: Record<string, string> = {
  activated:
    "Polo ativado como região oficial. Isso não homologa automaticamente locais ou quadras.",
  invalid: "Polo inválido.",
  error: "Não foi possível ativar o polo oficial.",
};

export default async function PolesInfrastructurePage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const result = single(params.result);
  const snapshot = await getAdminPolesInfrastructureSnapshot();

  const metrics = [
    ["Polos", snapshot.metrics.regions, MapPinned],
    ["Regiões ativas", snapshot.metrics.activeRegions, CheckCircle2],
    ["Infra operacional", snapshot.metrics.infrastructureReady, CircleDot],
    ["Locais", snapshot.metrics.venues, Building2],
    ["Quadras", snapshot.metrics.courts, SquareStack],
  ] as const;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Agenda"
        title="Polos e infraestrutura"
        description="O polo representa a região oficial do ecossistema. Local e quadra representam a infraestrutura física. A região pode coletar demanda e organizar atletas sem fingir que uma quadra já está operacional."
      />

      {result && resultMessages[result] && (
        <Card
          className={
            result === "activated" ? "border-ur-gold/30" : "border-red-500/30"
          }
        >
          <p className="text-sm text-zinc-300">{resultMessages[result]}</p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-zinc-500 uppercase">
                {label}
              </p>
              <Icon className="text-ur-gold" size={16} aria-hidden="true" />
            </div>
            <p className="font-display mt-3 text-2xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="border-sky-500/20 bg-sky-500/5">
        <p className="font-bold text-white">Dois gates independentes</p>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-zinc-400 lg:grid-cols-2">
          <div>
            <span className="font-bold text-sky-200">
              1. Polo oficial ativo
            </span>
            <p>
              Libera identidade regional, vínculo de atletas e coleta de
              demanda. Não cria agenda física por conta própria.
            </p>
          </div>
          <div>
            <span className="font-bold text-amber-200">
              2. Infraestrutura operacional
            </span>
            <p>
              Exige local e quadra reais. A confirmação de uma sessão UR Play
              continua bloqueada sem uma quadra válida.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {snapshot.poles.map((pole) => (
          <Card key={pole.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-black text-white uppercase">
                  {pole.name}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {pole.city} · {pole.state}
                </p>
              </div>
              <span
                className={`rounded-full border px-2 py-1 text-[11px] font-bold uppercase ${
                  pole.regionActive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400"
                }`}
              >
                região {pole.regionStatus}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-ur border p-3">
                <p className="text-xs font-bold text-zinc-500 uppercase">
                  Locais
                </p>
                <p className="font-display mt-2 text-xl font-black">
                  {pole.activeVenueCount}/{pole.venueCount}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  ativos / cadastrados
                </p>
              </div>
              <div className="rounded-ur border p-3">
                <p className="text-xs font-bold text-zinc-500 uppercase">
                  Quadras
                </p>
                <p className="font-display mt-2 text-xl font-black">
                  {pole.activeCourtCount}/{pole.courtCount}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  ativas / cadastradas
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-1 text-[11px] font-bold uppercase ${
                  pole.infrastructureReady
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                }`}
              >
                infraestrutura{" "}
                {pole.infrastructureReady ? "pronta" : "pendente"}
              </span>
            </div>

            {!pole.regionActive && (
              <form action={activatePoleRegionAction} className="mt-5">
                <input type="hidden" name="poleId" value={pole.id} />
                <Button type="submit" size="sm" className="w-full">
                  Ativar região oficial
                </Button>
              </form>
            )}

            <div className="mt-5 grid gap-2">
              <Link
                href="/admin/agenda/configuracao"
                className="rounded-ur hover:border-ur-gold border px-3 py-2 text-center text-xs font-bold text-zinc-300 uppercase transition hover:text-white"
              >
                Cadastrar local / quadra
              </Link>
              {pole.venueCount > 0 && pole.courtCount > 0 && (
                <Link
                  href="/admin/agenda/homologacao"
                  className="rounded-ur border border-amber-500/30 px-3 py-2 text-center text-xs font-bold text-amber-200 uppercase transition hover:bg-amber-500/10"
                >
                  Homologar infraestrutura
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>

      {snapshot.sourceErrors.length > 0 && (
        <Card className="border-red-500/30">
          <p className="font-bold">Leitura parcial</p>
          <ul className="mt-2 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
