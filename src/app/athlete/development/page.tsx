import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

type TechnicalSummaryRow = {
  aces: number | null;
  attacks: number | null;
  blocks: number | null;
  defenses: number | null;
  assists: number | null;
};

function formatReviewDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default async function AthleteDevelopmentPage() {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const [snapshot, technicalResult] = await Promise.all([
    getAthleteSnapshotForViewer(viewer),
    client
      .from("match_technical_summary")
      .select("aces,attacks,blocks,defenses,assists")
      .eq("athlete_id", viewer.athleteId),
  ]);

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
  const development = snapshot.development;
  const nextActivity = snapshot.nextReservation;
  const publishedLevel =
    development?.levelSnapshot ?? ranking?.level ?? summary?.level ?? null;
  const games = ranking?.gamesPlayed ?? summary?.games ?? 0;
  const wins = ranking?.wins ?? 0;
  const losses = ranking?.losses ?? 0;
  const winRate = ranking?.winRate ?? null;
  const technicalRows = (technicalResult.data ?? []) as TechnicalSummaryRow[];
  const hasTechnicalData = technicalRows.length > 0 && !technicalResult.error;
  const technicalTotals = technicalRows.reduce(
    (total, row) => ({
      aces: total.aces + Number(row.aces ?? 0),
      attacks: total.attacks + Number(row.attacks ?? 0),
      blocks: total.blocks + Number(row.blocks ?? 0),
      defenses: total.defenses + Number(row.defenses ?? 0),
      assists: total.assists + Number(row.assists ?? 0),
    }),
    { aces: 0, attacks: 0, blocks: 0, defenses: 0, assists: 0 },
  );

  const milestones = [
    games > 0
      ? `${games} ${games === 1 ? "jogo oficial registrado" : "jogos oficiais registrados"}`
      : null,
    wins > 0
      ? `${wins} ${wins === 1 ? "vitória homologada" : "vitórias homologadas"}`
      : null,
    ranking?.currentPosition
      ? `Posição #${ranking.currentPosition} no ranking atual`
      : null,
    hasTechnicalData ? "Estatísticas técnicas registradas no app" : null,
  ].filter(Boolean) as string[];

  const nextStep = nextActivity
    ? {
        title: nextActivity.title,
        description: `${nextActivity.poleName ?? "Polo UR"}${nextActivity.venueName ? ` · ${nextActivity.venueName}` : ""}`,
        href: "/athlete/agenda",
        cta: "Abrir atividade",
      }
    : {
        title: "Encontre seu próximo jogo",
        description:
          "Sem uma atividade confirmada agora. A próxima evidência esportiva nasce quando você volta à quadra.",
        href: "/athlete/agenda",
        cta: "Ver onde jogar",
      };

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Evolução esportiva"
        title="Como seu jogo está avançando"
        description="Sua evolução comum é construída com nível publicado, resultados homologados, estatísticas existentes e próximos passos reais. Hunter permanece uma área separada e opcional."
        action={publishedLevel ? <Badge>{publishedLevel}</Badge> : undefined}
      />

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="ranking-hero border-ur-gold/40 overflow-hidden">
          <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
            Nível e nivelamento
          </p>
          <strong className="font-display mt-3 block text-5xl uppercase sm:text-7xl">
            {publishedLevel ?? "Sem nível publicado"}
          </strong>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            {publishedLevel
              ? "Este é o nível esportivo atualmente publicado nas fontes oficiais disponíveis ao atleta."
              : "Seu nivelamento ainda não possui um nível publicado no contrato atual. O App não cria nota ou classificação provisória para preencher essa ausência."}
          </p>
        </Card>

        <Card className="border-ur-gold/30">
          <Target className="text-ur-gold" size={28} aria-hidden="true" />
          <p className="mt-4 text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Próximo passo esportivo
          </p>
          <h2 className="mt-2 text-2xl font-black">{nextStep.title}</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {nextStep.description}
          </p>
          <Link
            href={nextStep.href}
            className="text-ur-gold mt-4 inline-flex items-center gap-2 font-black"
          >
            {nextStep.cta} <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </Card>
      </section>

      <section aria-labelledby="performance-title" className="grid gap-4">
        <div>
          <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
            Evidência competitiva
          </p>
          <h2
            id="performance-title"
            className="font-display mt-1 text-3xl font-black uppercase"
          >
            Seu momento em números
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Apenas dados já publicados pelas fontes esportivas do sistema. Nada
            aqui é convertido em score, radar ou diagnóstico automático.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Card>
            <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
              Jogos
            </p>
            <strong className="font-display mt-2 block text-4xl">
              {games}
            </strong>
          </Card>
          <Card>
            <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
              Vitórias
            </p>
            <strong className="font-display mt-2 block text-4xl">{wins}</strong>
          </Card>
          <Card>
            <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
              Derrotas
            </p>
            <strong className="font-display mt-2 block text-4xl">
              {losses}
            </strong>
          </Card>
          <Card>
            <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
              Aproveitamento
            </p>
            <strong className="font-display mt-2 block text-4xl">
              {winRate === null ? "—" : `${winRate.toFixed(0)}%`}
            </strong>
          </Card>
          <Card>
            <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
              Ranking
            </p>
            <strong className="font-display mt-2 block text-4xl">
              {ranking?.currentPosition ? `#${ranking.currentPosition}` : "—"}
            </strong>
          </Card>
        </div>
      </section>

      <Card className="border-white/10">
        <div className="flex items-start gap-4">
          <Activity className="text-ur-gold shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
              Estatísticas técnicas existentes
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Ações registradas nas partidas do app
            </h2>
            {technicalResult.error ? (
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                A fonte de estatísticas técnicas não respondeu. O App não trata
                indisponibilidade como zero.
              </p>
            ) : hasTechnicalData ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ["Aces", technicalTotals.aces],
                  ["Ataques", technicalTotals.attacks],
                  ["Bloqueios", technicalTotals.blocks],
                  ["Defesas", technicalTotals.defenses],
                  ["Assistências", technicalTotals.assists],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-ur border border-white/10 p-4"
                  >
                    <p className="text-xs font-black tracking-[.14em] text-zinc-500 uppercase">
                      {label}
                    </p>
                    <strong className="font-display mt-1 block text-3xl">
                      {value}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Nenhuma estatística técnica foi publicada para suas partidas
                atuais. A ausência não é preenchida com estimativa.
              </p>
            )}
          </div>
        </div>
      </Card>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Prioridades e revisão
          </p>
          <h2 className="mt-2 text-2xl font-black">
            O que a operação publicou para acompanhar
          </h2>
          {development?.priorities.length ? (
            <ul className="mt-4 grid gap-2">
              {development.priorities.map((priority) => (
                <li
                  key={priority}
                  className="rounded-ur flex items-start gap-3 border border-white/10 p-3 text-sm font-bold"
                >
                  <CheckCircle2
                    className="text-ur-gold mt-0.5 shrink-0"
                    size={16}
                    aria-hidden="true"
                  />
                  {priority}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Nenhuma prioridade esportiva foi publicada para este momento.
            </p>
          )}
          {development?.reviewAt ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
              <CalendarDays size={16} aria-hidden="true" /> Próxima revisão
              publicada: {formatReviewDate(development.reviewAt)}.
            </p>
          ) : null}
        </Card>

        <Card>
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Marcos verificáveis
          </p>
          <h2 className="mt-2 text-2xl font-black">O que já está comprovado</h2>
          {milestones.length > 0 ? (
            <ul className="mt-4 grid gap-2">
              {milestones.map((milestone) => (
                <li
                  key={milestone}
                  className="rounded-ur flex items-start gap-3 border border-white/10 p-3 text-sm font-bold"
                >
                  <Trophy
                    className="text-ur-gold mt-0.5 shrink-0"
                    size={16}
                    aria-hidden="true"
                  />
                  {milestone}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Seus primeiros marcos aparecem quando houver jogo, vitória,
              ranking ou estatística oficialmente registrada.
            </p>
          )}
        </Card>
      </section>

      <Card className="border-amber-400/20 bg-amber-400/[.035]">
        <p className="text-xs font-black tracking-[.18em] text-amber-300 uppercase">
          Evolução temporal
        </p>
        <h2 className="mt-2 text-2xl font-black">
          Série histórica ainda não publicada
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          O read-model atual não entrega uma série temporal confiável para
          comparar evolução técnica ao longo de ciclos. Por isso, o App não
          desenha gráfico, percentual de melhora ou tendência artificial.
        </p>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Jogar",
            body: "Volte à quadra para gerar novas evidências esportivas.",
            href: "/athlete/agenda",
            cta: "Ver oportunidades",
          },
          {
            title: "Ranking",
            body: "Veja como resultados homologados se transformam em posição competitiva.",
            href: "/athlete/ranking",
            cta: "Abrir ranking",
          },
          {
            title: "Temporada",
            body: "Entenda em qual etapa da campanha você está e o que vem depois.",
            href: "/athlete/season",
            cta: "Ver temporada",
          },
        ].map((item) => (
          <Card key={item.title}>
            <h2 className="text-xl font-black">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{item.body}</p>
            <Link
              href={item.href}
              className="text-ur-gold mt-4 inline-flex items-center gap-2 font-black"
            >
              {item.cta} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </Card>
        ))}
      </section>

      <Card className="border-ur-gold/25">
        <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
          Quer ir além da evolução esportiva comum?
        </p>
        <h2 className="mt-2 text-2xl font-black">Conheça o Hunter</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Hunter é a escola de desenvolvimento opt-in do Ultimate Rivals. Ela é
          separada desta página e não altera sua capacidade de competir
          normalmente no UR Play.
        </p>
        <Link
          href="/athlete/hunter"
          className="text-ur-gold mt-4 inline-flex items-center gap-2 font-black"
        >
          Conhecer Hunter <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </Card>
    </div>
  );
}
