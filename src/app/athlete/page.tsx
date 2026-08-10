import {
  ArrowRight,
  CalendarDays,
  Coins,
  CreditCard,
  MapPin,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { AthleteOpportunityCard } from "@/components/athlete/athlete-opportunity-card";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAthletePortalSnapshot } from "@/server/services/athlete-portal-service";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function movementLabel(movement: string | null | undefined) {
  if (movement === "up") return "Subindo";
  if (movement === "down") return "Em disputa";
  return "Posição estável";
}

export default async function AthletePage() {
  const user = await requireRole(["athlete"]);
  const snapshot = await getAthletePortalSnapshot({ userId: user.userId });

  if (!snapshot.identity) {
    return (
      <div className="grid gap-8">
        <PageHeader
          eyebrow="Meu jogo"
          title="Perfil esportivo ainda não vinculado"
          description="Sua conta está autenticada, mas ainda não encontramos um registro de atleta ligado a ela."
        />
        <Card>
          <p className="font-bold">
            O vínculo precisa ser concluído pela operação UR.
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Nenhum dado esportivo é inventado enquanto o perfil oficial não
            estiver associado à sua conta.
          </p>
        </Card>
        <AthleteSourceHealth errors={snapshot.sourceErrors} />
      </div>
    );
  }

  const ranking = snapshot.primaryRanking;
  const summary = snapshot.summary;
  const nextReservation = snapshot.nextReservation;
  const nextOpportunities = (snapshot.opportunities ?? [])
    .filter((item) => item.id !== nextReservation?.id)
    .slice(0, 3);
  const team = snapshot.teams?.[0] ?? null;
  const nextAction = nextReservation
    ? {
        eyebrow: "Próxima atividade",
        title: nextReservation.title,
        description: `${nextReservation.poleName ?? "Polo UR"}${nextReservation.venueName ? ` · ${nextReservation.venueName}` : ""}`,
        href: "/athlete/agenda",
        cta: "Abrir atividade",
      }
    : {
        eyebrow: "Objetivo atual",
        title: "Entre no próximo jogo",
        description:
          "Confira as oportunidades abertas e escolha onde sua próxima evolução começa.",
        href: "/athlete/agenda",
        cta: "Explorar agenda",
      };

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <section className="ranking-hero border-ur-gold/50 rounded-ur overflow-hidden border p-5 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-ur-gold text-xs font-black tracking-[.24em] uppercase">
              Ultimate Rivals · Player Hub
            </p>
            <h1 className="font-display mt-2 text-4xl font-black tracking-tight uppercase sm:text-6xl">
              {snapshot.identity.publicName}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>{snapshot.identity.athleteCode}</Badge>
              {summary?.level && <Badge>{summary.level}</Badge>}
              {team && <Badge>{team.name}</Badge>}
              <Badge>{snapshot.identity.status}</Badge>
            </div>
          </div>

          <div className="grid min-w-64 grid-cols-2 gap-3">
            <div className="rounded-ur border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                Ranking
              </p>
              <p className="font-display mt-2 text-4xl font-black">
                {ranking?.currentPosition ? `#${ranking.currentPosition}` : "—"}
              </p>
              <p className="text-ur-gold mt-1 text-xs font-bold">
                {ranking ? `${ranking.totalPoints} pts` : "Sem ranking"}
              </p>
            </div>
            <div className="rounded-ur border border-white/10 bg-black/30 p-4">
              <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                UR Coins
              </p>
              <p className="font-display text-ur-gold mt-2 text-4xl font-black">
                {summary?.urCoinBalance.toLocaleString("pt-BR") ?? "—"}
              </p>
              <p className="mt-1 text-xs font-bold text-zinc-500">saldo atual</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="border-ur-gold/40">
          <p className="text-ur-gold text-xs font-black tracking-[.22em] uppercase">
            {nextAction.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-black">{nextAction.title}</h2>
          <p className="mt-2 max-w-2xl text-zinc-400">
            {nextAction.description}
          </p>
          <Link
            href={nextAction.href}
            className="bg-ur-gold text-ur-black rounded-ur mt-5 inline-flex min-h-12 items-center gap-2 px-5 font-black"
          >
            {nextAction.cta} <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
                Economia do jogador
              </p>
              <strong className="font-display text-ur-gold mt-2 block text-5xl">
                {summary?.urCoinBalance.toLocaleString("pt-BR") ?? "—"}
              </strong>
              <p className="font-bold text-zinc-400">UR Coins disponíveis</p>
            </div>
            <Coins className="text-ur-gold" size={36} aria-hidden="true" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <div>
              <p className="text-xs text-zinc-600 uppercase">Créditos livres</p>
              <p className="mt-1 text-xl font-black">
                {snapshot.creditBalance ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 uppercase">Reservados</p>
              <p className="mt-1 text-xl font-black">
                {snapshot.creditReserved ?? "—"}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Jogos
            </p>
            <UsersRound className="text-ur-gold" size={17} aria-hidden="true" />
          </div>
          <p className="font-display mt-3 text-3xl font-black">
            {summary?.games ?? "—"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">histórico consolidado</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Aproveitamento
            </p>
            <Trophy className="text-ur-gold" size={17} aria-hidden="true" />
          </div>
          <p className="font-display mt-3 text-3xl font-black">
            {ranking ? `${ranking.winRate.toFixed(1)}%` : "—"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {movementLabel(ranking?.movement)}
          </p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Competições
            </p>
            <Target className="text-ur-gold" size={17} aria-hidden="true" />
          </div>
          <p className="font-display mt-3 text-3xl font-black">
            {summary?.competitions ?? "—"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">temporada oficial</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Hunter
            </p>
            <Sparkles className="text-ur-gold" size={17} aria-hidden="true" />
          </div>
          <p className="font-display mt-3 text-3xl font-black">
            {summary?.hunterCompleted ?? "—"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">marcos concluídos</p>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
                Onde estou
              </p>
              <h2 className="font-display text-2xl font-black uppercase">
                Ranking como competição viva
              </h2>
            </div>
            <Trophy className="text-ur-gold" aria-hidden="true" />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
            <div>
              <strong className="font-display text-7xl">
                {ranking?.currentPosition ? `#${ranking.currentPosition}` : "—"}
              </strong>
              <p className="text-ur-gold text-xl font-black">
                {ranking ? `${ranking.totalPoints} PTS` : "Aguardando resultados"}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-sm text-zinc-500">
                {ranking?.gamesPlayed ?? 0} jogos · {ranking?.wins ?? 0} vitórias ·{" "}
                {ranking?.losses ?? 0} derrotas
              </p>
              <Link
                href="/athlete/ranking"
                className="text-ur-gold mt-3 inline-flex items-center gap-1 font-black"
              >
                Abrir ranking <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Próxima arena
          </p>
          <div className="mt-3 flex min-h-28 items-center justify-center rounded-ur border border-dashed border-white/10 bg-black/20">
            <MapPin className="text-ur-gold" size={30} aria-hidden="true" />
          </div>
          {nextReservation ? (
            <div className="mt-4">
              <h2 className="text-xl font-black">{nextReservation.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">
                {nextReservation.venueName ?? nextReservation.poleName ?? "Arena UR"}
              </p>
              <Badge>{nextReservation.personalReservationStatus ?? "confirmado"}</Badge>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Reserve sua próxima atividade para definir a próxima arena.
            </p>
          )}
          <Link
            href="/athlete/agenda"
            className="text-ur-gold mt-5 inline-flex font-black"
          >
            Ver agenda UR →
          </Link>
        </Card>
      </section>

      {nextReservation && (
        <section className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
                Sua agenda
              </p>
              <h2 className="font-display text-2xl font-black uppercase">
                Próximo compromisso
              </h2>
            </div>
            <CalendarDays className="text-ur-gold" aria-hidden="true" />
          </div>
          <AthleteOpportunityCard
            opportunity={nextReservation}
            availableCredits={snapshot.creditBalance ?? 0}
          />
        </section>
      )}

      {nextOpportunities.length > 0 && (
        <section className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
                Próximas disputas
              </p>
              <h2 className="font-display text-2xl font-black uppercase">
                Oportunidades para você
              </h2>
            </div>
            <Link href="/athlete/agenda" className="text-ur-gold font-black">
              Ver todas
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {nextOpportunities.map((opportunity) => (
              <AthleteOpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                availableCredits={snapshot.creditBalance ?? 0}
              />
            ))}
          </div>
        </section>
      )}

      {snapshot.billing && snapshot.billing.openItems > 0 && (
        <Card className="border-ur-gold/50">
          <div className="flex items-start gap-3">
            <CreditCard className="text-ur-gold mt-0.5" size={18} aria-hidden="true" />
            <div>
              <p className="font-bold">Financeiro pendente</p>
              <p className="mt-1 text-sm text-zinc-400">
                {snapshot.billing.openItems} item(ns) em aberto ·{" "}
                {money.format(snapshot.billing.openAmount)}.
              </p>
            </div>
          </div>
        </Card>
      )}

      <AthleteSourceHealth errors={snapshot.sourceErrors} />
    </div>
  );
}
