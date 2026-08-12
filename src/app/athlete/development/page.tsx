import { CheckCircle2, Coins, ShoppingBag, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

export default async function AthleteDevelopmentPage() {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);

  if (!snapshot.identity) {
    return (
      <EmptyState
        title="Perfil esportivo ainda não vinculado"
        description="A evolução aparece depois do vínculo oficial da conta ao atleta."
      />
    );
  }

  const ranking = snapshot.primaryRanking;
  const summary = snapshot.summary;
  const development = snapshot.development;
  const level = summary?.level ?? "Em nivelamento";
  const hasNextActivity = Boolean(snapshot.nextReservation);

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Missões e evolução"
        title="Sua progressão"
        description="Objetivos esportivos e próximos passos derivados do seu estado real no ecossistema. Esta tela não cria pontos, moedas ou conquistas paralelas."
      />

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="ranking-hero border-ur-gold/40 overflow-hidden">
          <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
            Status atual
          </p>
          <strong className="font-display mt-3 block text-5xl uppercase sm:text-7xl">
            {level}
          </strong>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge>Competir</Badge>
            <Badge>Evoluir</Badge>
            <Badge>Conquistar</Badge>
          </div>
        </Card>

        <Card className="border-ur-gold/30">
          <Target className="text-ur-gold" size={28} />
          <p className="mt-4 text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Próxima missão
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {development?.hunterMission ??
              (hasNextActivity
                ? "Chegue preparado para sua próxima atividade"
                : "Encontre sua próxima oportunidade")}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {development?.goal30Days ??
              development?.hunterGoal ??
              (hasNextActivity
                ? "Sua reserva oficial já está registrada. O próximo passo é participar e gerar resultado homologado."
                : "Acesse a Agenda UR e entre novamente no ciclo Jogar → Evoluir → Jogar novamente.")}
          </p>
          <Link
            href="/athlete/agenda"
            className="text-ur-gold mt-4 inline-flex font-black"
          >
            Abrir Agenda UR →
          </Link>
        </Card>
      </section>

      {development && (
        <Card className="border-ur-gold/30">
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Plano oficial de evolução
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {development.hunterMission ?? "Plano em acompanhamento"}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {development.hunterStatus
              ? `Status da missão: ${development.hunterStatus}.`
              : "A operação ainda não publicou uma missão Hunter ativa para este plano."}
          </p>
          {development.priorities.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-3">
              {development.priorities.map((priority) => (
                <li
                  key={priority}
                  className="rounded-ur border border-white/10 p-3 text-sm font-bold"
                >
                  {priority}
                </li>
              ))}
            </ul>
          )}
          {development.reviewAt && (
            <p className="mt-4 text-sm text-zinc-500">
              Revisão publicada para{" "}
              {new Date(development.reviewAt).toLocaleDateString("pt-BR")}.
            </p>
          )}
        </Card>
      )}

      <section className="grid gap-5 lg:grid-cols-4">
        <Card>
          <Trophy className="text-ur-gold" />
          <p className="mt-4 text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Ranking atual
          </p>
          <strong className="font-display mt-2 block text-4xl">
            {ranking?.currentPosition ? `#${ranking.currentPosition}` : "—"}
          </strong>
          <p className="text-sm text-zinc-500">
            {ranking
              ? `${ranking.totalPoints} pontos oficiais`
              : "Aguardando resultados homologados"}
          </p>
        </Card>
        <Card>
          <CheckCircle2 className="text-ur-gold" />
          <p className="mt-4 text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Participação
          </p>
          <strong className="font-display mt-2 block text-4xl">
            {summary?.games ?? 0}
          </strong>
          <p className="text-sm text-zinc-500">
            jogos consolidados no histórico
          </p>
        </Card>
        <Card>
          <Coins className="text-ur-gold" />
          <p className="mt-4 text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            UR Coins
          </p>
          <strong className="font-display mt-2 block text-4xl">
            {summary?.urCoinBalance.toLocaleString("pt-BR") ?? 0}
          </strong>
          <Link
            href="/athlete/wallet"
            className="text-ur-gold mt-2 inline-flex text-sm font-black"
          >
            Abrir Wallet →
          </Link>
        </Card>
        <Card>
          <Target className="text-ur-gold" />
          <p className="mt-4 text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Hunter
          </p>
          <strong className="font-display mt-2 block text-4xl">
            {summary?.hunterCompleted ?? 0}
          </strong>
          <p className="text-sm text-zinc-500">
            registros concluídos publicados
          </p>
        </Card>
      </section>

      <Card>
        <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
          Loop de evolução
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Jogar",
            "Ganhar pontos",
            "Subir no ranking",
            "Cumprir missões",
            "Ganhar UR Coins",
            "Desbloquear e resgatar",
            "Evoluir",
            "Jogar novamente",
          ].map((stage, index) => (
            <div
              key={stage}
              className="rounded-ur border border-white/10 p-4 text-center text-sm font-black"
            >
              <span className="text-ur-gold mr-2">{index + 1}.</span>
              {stage}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/athlete/market"
            className="bg-ur-gold text-ur-black rounded-ur inline-flex min-h-11 items-center gap-2 px-4 text-sm font-black"
          >
            <ShoppingBag size={16} aria-hidden="true" /> Explorar UR Market
          </Link>
          <Link
            href="/athlete/agenda"
            className="rounded-ur inline-flex min-h-11 items-center border px-4 text-sm font-black"
          >
            Voltar ao jogo
          </Link>
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          Missões avançadas, badges e árvores de XP só entram quando houver uma
          fonte oficial; não são simulados nesta V1.
        </p>
      </Card>
    </div>
  );
}
