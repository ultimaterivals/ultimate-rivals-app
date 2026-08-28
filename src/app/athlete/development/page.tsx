import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { Badge, Card, EmptyState } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

export default async function AthleteDevelopmentPage() {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);

  if (!snapshot.identity) {
    return (
      <EmptyState
        title="Perfil esportivo ainda não vinculado"
        description="Assim que seu perfil estiver pronto, sua evolução aparece aqui."
      />
    );
  }

  const ranking = snapshot.primaryRanking;
  const summary = snapshot.summary;
  const nextReservation = snapshot.nextReservation;
  const development = snapshot.development;
  const level = summary?.level ?? "Em nivelamento";

  return (
    <div className="mx-auto grid max-w-6xl gap-7 pb-4">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(212,168,59,.12),transparent_38%),linear-gradient(145deg,#141414,#090909_58%)] p-5 sm:p-8">
        <p className="text-ur-gold text-[.65rem] font-black tracking-[.22em] uppercase">
          Sua evolução
        </p>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="font-display text-4xl leading-none font-black uppercase sm:text-5xl">
              Sua carreira está em movimento.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Acompanhe somente aquilo que já foi registrado na sua jornada:
              nível, participação, ranking e próximos marcos publicados pela
              operação UR.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="min-w-28 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
              <p className="text-[.6rem] font-black tracking-[.16em] text-zinc-500 uppercase">
                Nível
              </p>
              <p className="font-display mt-2 text-2xl font-black uppercase">
                {level}
              </p>
            </div>
            <div className="min-w-28 rounded-[1.2rem] border border-white/10 bg-black/30 p-4">
              <p className="text-[.6rem] font-black tracking-[.16em] text-zinc-500 uppercase">
                Ranking
              </p>
              <p className="font-display text-ur-gold mt-2 text-3xl font-black">
                {ranking?.currentPosition ? `#${ranking.currentPosition}` : "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.35rem] border border-white/10 bg-white/[.025] p-4">
          <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
            Jogos
          </p>
          <p className="font-display mt-2 text-4xl font-black">
            {summary?.games ?? 0}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            registrados na sua jornada
          </p>
        </div>
        <div className="rounded-[1.35rem] border border-white/10 bg-white/[.025] p-4">
          <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
            Pontos
          </p>
          <p className="font-display mt-2 text-4xl font-black">
            {ranking?.totalPoints ?? 0}
          </p>
          <p className="mt-1 text-sm text-zinc-500">ranking oficial</p>
        </div>
        <div className="rounded-[1.35rem] border border-white/10 bg-white/[.025] p-4">
          <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
            Aproveitamento
          </p>
          <p className="font-display mt-2 text-4xl font-black">
            {ranking ? `${ranking.winRate.toFixed(1)}%` : "—"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">resultados homologados</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="border-ur-gold/25 from-ur-gold/[.06] rounded-[1.55rem] border bg-gradient-to-br to-transparent p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-ur-gold text-[.65rem] font-black tracking-[.2em] uppercase">
                Próximo passo
              </p>
              <h2 className="font-display mt-2 text-3xl font-black uppercase">
                {nextReservation
                  ? "Transforme sua próxima presença em evolução"
                  : "Volte para o ciclo de jogo"}
              </h2>
            </div>
            <Target
              className="text-ur-gold shrink-0"
              size={27}
              aria-hidden="true"
            />
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            {nextReservation
              ? `${nextReservation.title} já faz parte da sua agenda. Jogue, gere resultado oficial e continue construindo seu histórico.`
              : "Sua evolução esportiva precisa de novas evidências reais. Encontre uma oportunidade elegível na Agenda UR e continue sua temporada."}
          </p>
          <Link
            href="/athlete/agenda"
            className="rounded-ur bg-ur-gold text-ur-black mt-5 inline-flex min-h-11 items-center gap-2 px-4 text-sm font-black"
          >
            <CalendarDays size={16} aria-hidden="true" /> Abrir Agenda UR
          </Link>
        </div>

        <div className="rounded-[1.55rem] border border-white/10 bg-white/[.025] p-5 sm:p-6">
          <p className="text-[.65rem] font-black tracking-[.2em] text-zinc-500 uppercase">
            Seu momento
          </p>
          <h2 className="font-display mt-2 text-3xl font-black uppercase">
            {level}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{ranking?.gamesPlayed ?? summary?.games ?? 0} jogos</Badge>
            {ranking ? <Badge>{ranking.wins} vitórias</Badge> : null}
            {ranking?.currentPosition ? (
              <Badge>#{ranking.currentPosition} ranking</Badge>
            ) : null}
          </div>
          <Link
            href="/athlete/ranking"
            className="text-ur-gold mt-5 inline-flex items-center gap-2 text-sm font-black"
          >
            Ver classificação <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {development?.priorities.length ? (
        <section className="rounded-[1.55rem] border border-white/10 bg-[#0b0b0b] p-5 sm:p-6">
          <p className="text-[.65rem] font-black tracking-[.2em] text-zinc-500 uppercase">
            Prioridades publicadas
          </p>
          <h2 className="font-display mt-2 text-3xl font-black uppercase">
            Foco atual
          </h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {development.priorities.map((priority) => (
              <div
                key={priority}
                className="rounded-ur flex items-start gap-3 border border-white/10 p-4 text-sm font-bold text-zinc-300"
              >
                <CheckCircle2
                  className="text-ur-gold mt-0.5 shrink-0"
                  size={16}
                  aria-hidden="true"
                />
                {priority}
              </div>
            ))}
          </div>
          {development.reviewAt ? (
            <p className="mt-4 text-xs font-bold text-zinc-500">
              Próxima revisão registrada:{" "}
              {new Date(development.reviewAt).toLocaleDateString("pt-BR")}.
            </p>
          ) : null}
        </section>
      ) : null}

      <Card className="border-ur-gold/20">
        <div className="flex items-start gap-4">
          <span className="bg-ur-gold/10 text-ur-gold grid size-11 shrink-0 place-items-center rounded-full">
            <Trophy size={21} aria-hidden="true" />
          </span>
          <div>
            <p className="text-ur-gold text-[.65rem] font-black tracking-[.2em] uppercase">
              Quer ir além?
            </p>
            <h2 className="mt-2 text-2xl font-black">Conheça o Hunter</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Hunter é um programa separado e voluntário de desenvolvimento para
              atletas que querem aprofundar mentalidade, leitura de jogo, tomada
              de decisão, liderança e consistência.
            </p>
            <Link
              href="/athlete/hunter"
              className="text-ur-gold mt-4 inline-flex items-center gap-2 font-black"
            >
              Entrar no espaço Hunter{" "}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
