import {
  ArrowUpRight,
  CircleDollarSign,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { CommandSection } from "@/components/admin/command-section";
import { Badge, Card } from "@/components/ui";
import { getAdminFinanceSnapshot } from "@/server/services/admin-finance-service";
import { getAdminUrPlaySnapshot } from "@/server/services/admin-ur-play-service";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export async function CommandSessionMarginControl() {
  const [finance, urPlay] = await Promise.all([
    getAdminFinanceSnapshot(),
    getAdminUrPlaySnapshot(),
  ]);

  const sessionNames = new Map(
    urPlay.sessions.map((session) => [session.id, session.name]),
  );
  const sessionEvents = (finance.events ?? []).filter(
    (event) => event.sessionId !== null,
  );
  const negativeSessions = sessionEvents.filter(
    (event) => event.verifiedMargin < 0,
  );
  const totalVerifiedRevenue = sessionEvents.reduce(
    (total, event) => total + event.verifiedRevenue,
    0,
  );
  const totalVerifiedExpense = sessionEvents.reduce(
    (total, event) => total + event.verifiedExpense,
    0,
  );
  const totalVerifiedMargin = sessionEvents.reduce(
    (total, event) => total + event.verifiedMargin,
    0,
  );
  const marginRate =
    totalVerifiedRevenue > 0
      ? Math.round((totalVerifiedMargin / totalVerifiedRevenue) * 100)
      : null;
  const sourceErrors = [
    ...new Set([...finance.sourceErrors, ...urPlay.sourceErrors]),
  ];

  return (
    <CommandSection
      title="Economia das sessões"
      description="Camada executiva adicional sobre o Financeiro existente. Receita, despesa e margem continuam vindo da fonte financeira oficial; o Command apenas relaciona os lançamentos às sessões UR Play."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
            Receita verificada
          </p>
          <p className="font-display mt-2 text-3xl font-black text-white">
            {money.format(totalVerifiedRevenue)}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Somente eventos financeiros vinculados a sessões UR Play.
          </p>
        </Card>
        <Card>
          <p className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
            Despesa verificada
          </p>
          <p className="font-display mt-2 text-3xl font-black text-white">
            {money.format(totalVerifiedExpense)}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Custos efetivamente verificados nas mesmas sessões.
          </p>
        </Card>
        <Card
          className={
            totalVerifiedMargin < 0
              ? "border-red-500/35 bg-red-500/5"
              : "border-emerald-500/25"
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
                Margem verificada
              </p>
              <p className="font-display mt-2 text-3xl font-black text-white">
                {money.format(totalVerifiedMargin)}
              </p>
            </div>
            {totalVerifiedMargin < 0 ? (
              <TrendingDown
                className="text-red-300"
                size={20}
                aria-hidden="true"
              />
            ) : (
              <TrendingUp
                className="text-emerald-400"
                size={20}
                aria-hidden="true"
              />
            )}
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {marginRate === null
              ? "Sem receita verificada suficiente para calcular taxa de margem."
              : `${marginRate}% de margem sobre a receita verificada das sessões.`}
          </p>
        </Card>
        <Card
          className={
            negativeSessions.length > 0
              ? "border-amber-500/30 bg-amber-500/5"
              : undefined
          }
        >
          <p className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
            Sessões negativas
          </p>
          <p className="font-display mt-2 text-3xl font-black text-white">
            {negativeSessions.length}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Sessões com margem verificada abaixo de zero na fonte financeira.
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CircleDollarSign
                className="text-ur-gold"
                size={18}
                aria-hidden="true"
              />
              <p className="font-display text-xl font-black text-white uppercase">
                Margem por sessão
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Verificado e projetado permanecem separados. Esta lista não estima
              custos ausentes e não trata projeção como realizado.
            </p>
          </div>
          <Link
            href="/admin/financeiro"
            className="text-ur-gold inline-flex items-center gap-1 text-sm font-bold"
          >
            Abrir Financeiro <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-5 grid gap-2">
          {sessionEvents.length === 0 ? (
            <div className="rounded-ur border border-dashed p-4 text-sm text-zinc-500">
              Nenhum evento financeiro vinculado a sessão UR Play foi
              encontrado.
            </div>
          ) : (
            sessionEvents.slice(0, 8).map((event, index) => (
              <div
                key={`${event.sessionId}-${index}`}
                className="rounded-ur grid gap-3 border p-4 lg:grid-cols-[1fr_repeat(3,minmax(110px,auto))] lg:items-center"
              >
                <div>
                  <p className="font-bold text-white">
                    {sessionNames.get(event.sessionId ?? "") ??
                      "Sessão UR Play"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>Verificado</Badge>
                    {event.projectedRevenue !== event.verifiedRevenue && (
                      <Badge>Possui projeção</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase">
                    Receita
                  </p>
                  <p className="mt-1 font-bold">
                    {money.format(event.verifiedRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase">
                    Despesa
                  </p>
                  <p className="mt-1 font-bold">
                    {money.format(event.verifiedExpense)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase">
                    Margem
                  </p>
                  <p
                    className={
                      event.verifiedMargin < 0
                        ? "mt-1 font-bold text-red-300"
                        : "mt-1 font-bold text-emerald-300"
                    }
                  >
                    {money.format(event.verifiedMargin)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {sourceErrors.length > 0 && (
          <p className="mt-4 text-xs text-amber-300">
            Leitura parcial: {sourceErrors.length} fonte(s) com falha. Nenhum
            valor ausente foi estimado.
          </p>
        )}
      </Card>
    </CommandSection>
  );
}
