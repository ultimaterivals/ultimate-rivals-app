import { ArrowRight, Coins, CreditCard, Trophy, UsersRound } from "lucide-react";
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
          <p className="font-bold">O vínculo precisa ser concluído pela operação UR.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Nenhum dado esportivo é inventado enquanto o perfil oficial não estiver associado à sua conta.
          </p>
        </Card>
        <AthleteSourceHealth errors={snapshot.sourceErrors} />
      </div>
    );
  }

  const ranking = snapshot.primaryRanking;
  const summary = snapshot.summary;
  const nextOpportunities = (snapshot.opportunities ?? [])
    .filter((item) => item.id !== snapshot.nextReservation?.id)
    .slice(0, 3);

  return (
    <div className="grid gap-9">
      <PageHeader
        eyebrow="Meu jogo"
        title={snapshot.identity.publicName}
        description={`${snapshot.identity.athleteCode}${summary?.level ? ` · ${summary.level}` : ""}${snapshot.teams?.[0] ? ` · ${snapshot.teams[0].name}` : " · Atleta livre"}`}
        action={<Badge>{snapshot.identity.status}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Ranking</p>
            <Trophy className="text-ur-gold" size={17} aria-hidden="true" />
          </div>
          <p className="font-display mt-3 text-3xl font-black">
            {ranking?.currentPosition ? `#${ranking.currentPosition}` : "—"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {ranking ? `${ranking.totalPoints} pts` : "Sem ranking publicado"}
          </p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">UR Coins</p>
            <Coins className="text-ur-gold" size={17} aria-hidden="true" />
          </div>
          <p className="font-display mt-3 text-3xl font-black">
            {summary?.urCoinBalance.toLocaleString("pt-BR") ?? "—"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">saldo atual</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Créditos</p>
            <CreditCard className="text-ur-gold" size={17} aria-hidden="true" />
          </div>
          <p className="font-display mt-3 text-3xl font-black">
            {snapshot.creditBalance === null ? "—" : snapshot.creditBalance}
          </p>
          <p className="mt-2 text-sm text-zinc-500">unidades disponíveis em pacotes ativos</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Jogos</p>
            <UsersRound className="text-ur-gold" size={17} aria-hidden="true" />
          </div>
          <p className="font-display mt-3 text-3xl font-black">{summary?.games ?? "—"}</p>
          <p className="mt-2 text-sm text-zinc-500">histórico consolidado</p>
        </Card>
      </div>

      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-black uppercase">Próximo passo</h2>
            <p className="mt-1 text-sm text-zinc-500">Sua próxima ação dentro do ecossistema.</p>
          </div>
          <Link href="/athlete/agenda" className="text-ur-gold flex items-center gap-1 text-sm font-bold">
            Ver agenda <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        {snapshot.nextReservation ? (
          <AthleteOpportunityCard opportunity={snapshot.nextReservation} />
        ) : (
          <Card>
            <p className="font-bold">Você ainda não possui uma reserva futura.</p>
            <p className="mt-2 text-sm text-zinc-400">Acesse a agenda para encontrar oportunidades disponíveis para sua jornada.</p>
          </Card>
        )}
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-xl font-black uppercase">Sua temporada</h2>
          <p className="mt-1 text-sm text-zinc-500">Histórico esportivo consolidado no sistema.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card><p className="text-xs text-zinc-500 uppercase">Competições</p><p className="font-display mt-2 text-2xl font-black">{summary?.competitions ?? "—"}</p></Card>
          <Card><p className="text-xs text-zinc-500 uppercase">Treinos</p><p className="font-display mt-2 text-2xl font-black">{summary?.trainingAttendance ?? "—"}</p></Card>
          <Card><p className="text-xs text-zinc-500 uppercase">Hunter concluído</p><p className="font-display mt-2 text-2xl font-black">{summary?.hunterCompleted ?? "—"}</p></Card>
          <Card><p className="text-xs text-zinc-500 uppercase">Aproveitamento</p><p className="font-display mt-2 text-2xl font-black">{ranking ? `${ranking.winRate.toFixed(1)}%` : "—"}</p></Card>
        </div>
      </section>

      {nextOpportunities.length > 0 && (
        <section className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xl font-black uppercase">Oportunidades para você</h2>
            <Link href="/athlete/agenda" className="text-ur-gold text-sm font-bold">Ver todas</Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {nextOpportunities.map((opportunity) => <AthleteOpportunityCard key={opportunity.id} opportunity={opportunity} />)}
          </div>
        </section>
      )}

      {snapshot.billing && snapshot.billing.openItems > 0 && (
        <Card className="border-ur-gold/50">
          <p className="font-bold">Financeiro pendente</p>
          <p className="mt-2 text-sm text-zinc-400">
            {snapshot.billing.openItems} item(ns) em aberto · {money.format(snapshot.billing.openAmount)}.
          </p>
        </Card>
      )}

      <AthleteSourceHealth errors={snapshot.sourceErrors} />
    </div>
  );
}
