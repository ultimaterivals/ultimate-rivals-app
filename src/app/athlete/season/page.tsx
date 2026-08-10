import {
  ArrowRight,
  CalendarDays,
  Medal,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

export default async function AthleteSeasonPage() {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);
  const ranking = snapshot.primaryRanking;
  const summary = snapshot.summary;
  const next = snapshot.nextReservation;

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Temporada"
        title="Sua campanha UR"
        description="Acompanhe sua posição, participação e o próximo movimento dentro da temporada."
        action={ranking?.level ? <Badge>{ranking.level}</Badge> : undefined}
      />

      <section className="ranking-hero border-ur-gold/40 rounded-ur border p-5 sm:p-7">
        <p className="text-ur-gold text-xs font-black tracking-[.22em] uppercase">
          Campanha ativa
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs text-zinc-500 uppercase">Posição</p>
            <p className="font-display mt-1 text-5xl font-black">
              {ranking?.currentPosition ? `#${ranking.currentPosition}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">Pontos</p>
            <p className="font-display mt-1 text-5xl font-black">
              {ranking?.totalPoints ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">Jogos</p>
            <p className="font-display mt-1 text-5xl font-black">
              {summary?.games ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 uppercase">Aproveitamento</p>
            <p className="font-display mt-1 text-5xl font-black">
              {ranking ? `${ranking.winRate.toFixed(0)}%` : "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-ur-gold/30">
          <Medal className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">UR Play</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Jogue, registre resultados oficiais e construa sua campanha.
          </p>
          <Link
            href="/athlete/agenda"
            className="text-ur-gold mt-5 inline-flex items-center gap-1 font-black"
          >
            Entrar no próximo jogo <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </Card>

        <Card>
          <Trophy className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Ranking</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Sua classificação responde somente a resultados e pontos oficiais.
          </p>
          <Link
            href="/athlete/ranking"
            className="text-ur-gold mt-5 inline-flex items-center gap-1 font-black"
          >
            Ver classificação <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </Card>

        <Card>
          <Sparkles className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Evolução</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Seu nível e seus marcos evoluem com participação e desempenho reais.
          </p>
          <p className="mt-5 text-sm font-black text-zinc-300">
            {summary?.level ?? "Nível em avaliação"}
          </p>
        </Card>
      </section>

      <Card className="border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
              Próximo marco
            </p>
            <h2 className="mt-2 text-2xl font-black">
              {next?.title ?? "Encontre sua próxima atividade"}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {next
                ? `${next.poleName ?? "Polo UR"}${next.venueName ? ` · ${next.venueName}` : ""}`
                : "A agenda mostra somente oportunidades disponíveis para sua jornada."}
            </p>
          </div>
          <CalendarDays className="text-ur-gold" aria-hidden="true" />
        </div>
        <Link
          href="/athlete/agenda"
          className="bg-ur-gold text-ur-black rounded-ur mt-5 inline-flex min-h-11 items-center px-4 font-black"
        >
          Abrir agenda
        </Link>
      </Card>
    </div>
  );
}
