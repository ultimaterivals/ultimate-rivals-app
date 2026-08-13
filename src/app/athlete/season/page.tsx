import {
  ArrowRight,
  CalendarDays,
  Check,
  CircleDot,
  Coins,
  Flag,
  LockKeyhole,
  Medal,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

const seasonStages = [
  {
    name: "Abertura",
    period: "Agosto",
    state: "active",
    description:
      "Entrada de atletas, nivelamento, disponibilidade e formação da base competitiva.",
  },
  {
    name: "UR Play + Ranking",
    period: "Agosto–Outubro",
    state: "active",
    description:
      "Os jogos da temporada constroem resultados, estatísticas e classificação.",
  },
  {
    name: "UR Series",
    period: "Próxima etapa",
    state: "next",
    description:
      "Etapa competitiva para atletas e formações elegíveis conforme a temporada.",
  },
  {
    name: "UR Cup",
    period: "Fase decisiva",
    state: "locked",
    description:
      "Competição superior da temporada. A abertura depende dos critérios publicados.",
  },
  {
    name: "UR Legends",
    period: "Fase decisiva",
    state: "locked",
    description:
      "Palco de destaque dos atletas elegíveis ao fechamento competitivo do ciclo.",
  },
  {
    name: "Virada de Ranking",
    period: "Final do trimestre",
    state: "locked",
    description:
      "Fechamento da temporada, reconhecimento dos resultados e início do próximo ciclo.",
  },
] as const;

const guideCards = [
  {
    title: "Como funciona a temporada",
    body: "Você entra pelo UR Play, gera histórico, acompanha o ranking e avança pelas etapas que forem abertas durante o trimestre.",
    icon: Flag,
  },
  {
    title: "Como funciona o ranking",
    body: "Resultados e ações válidas formam sua classificação. Vitórias, aproveitamento, pontos e critérios oficiais definem a ordem.",
    icon: Trophy,
  },
  {
    title: "Como chegar às próximas etapas",
    body: "Acompanhe seu nível, participação, posição e os critérios publicados. O App mostra o que já foi cumprido e o que ainda falta.",
    icon: Medal,
  },
  {
    title: "Como funcionam as equipes",
    body: "Sua jornada pode ser individual e coletiva. Quando houver vínculo, seus resultados também passam a fazer parte da história da equipe.",
    icon: UsersRound,
  },
  {
    title: "O que são UR Coins",
    body: "UR Coins pertencem à economia do ecossistema e são separadas dos pontos de ranking. O saldo pode ser usado nas oportunidades disponíveis no UR Market.",
    icon: Coins,
  },
  {
    title: "O que acontece no fim",
    body: "A Virada de Ranking encerra o trimestre, consolida a história da temporada e prepara o próximo ciclo competitivo.",
    icon: Sparkles,
  },
] as const;

function StageIcon({ state }: { state: "active" | "next" | "locked" }) {
  if (state === "active") return <CircleDot size={18} aria-hidden="true" />;
  if (state === "next") return <Flag size={18} aria-hidden="true" />;
  return <LockKeyhole size={17} aria-hidden="true" />;
}

function stateLabel(state: "active" | "next" | "locked") {
  if (state === "active") return "Em andamento";
  if (state === "next") return "Próxima etapa";
  return "Ainda não liberado";
}

export default async function AthleteSeasonPage() {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);
  const ranking = snapshot.primaryRanking;
  const summary = snapshot.summary;
  const next = snapshot.nextReservation;
  const development = snapshot.development;

  const personalNextStep = next
    ? {
        title: next.title,
        description: `${next.poleName ?? "Polo UR"}${next.venueName ? ` · ${next.venueName}` : ""}`,
        href: "/athlete/agenda",
        cta: "Abrir atividade",
      }
    : development?.hunterMission
      ? {
          title: development.hunterMission,
          description:
            development.goal30Days ??
            development.hunterGoal ??
            "Continue sua evolução dentro da temporada.",
          href: "/athlete/development",
          cta: "Ver evolução",
        }
      : {
          title: "Entre no próximo UR Play",
          description:
            "Sua próxima participação cria mais histórico para sua campanha e mantém você dentro do ritmo da temporada.",
          href: "/athlete/agenda",
          cta: "Ver oportunidades",
        };

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Temporada 1 · Agosto–Outubro 2026"
        title="Sua temporada, do começo ao fim"
        description="Você não está entrando em jogos isolados. Cada participação faz parte de um trimestre com evolução, ranking, etapas competitivas e um fechamento oficial."
        action={ranking?.level ? <Badge>{ranking.level}</Badge> : undefined}
      />

      <section className="ranking-hero border-ur-gold/40 rounded-ur border p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-ur-gold text-xs font-black tracking-[.22em] uppercase">
              Sua campanha
            </p>
            <h2 className="font-display mt-2 text-3xl font-black uppercase sm:text-4xl">
              Você está na fase de abertura + UR Play
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Este é o momento de jogar, gerar histórico, concluir seu nivelamento e acompanhar a formação do ranking. As próximas etapas aparecem aqui conforme forem liberadas.
            </p>
          </div>
          <Badge>Temporada em andamento</Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <Card className="border-ur-gold/25">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
              Seu próximo passo
            </p>
            <h2 className="mt-2 text-2xl font-black">{personalNextStep.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              {personalNextStep.description}
            </p>
          </div>
          <CalendarDays className="text-ur-gold" aria-hidden="true" />
        </div>
        <Link
          href={personalNextStep.href}
          className="bg-ur-gold text-ur-black rounded-ur mt-5 inline-flex min-h-11 items-center gap-2 px-4 font-black"
        >
          {personalNextStep.cta} <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </Card>

      <section aria-labelledby="season-roadmap-title" className="grid gap-4">
        <div>
          <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
            O trimestre
          </p>
          <h2
            id="season-roadmap-title"
            className="font-display mt-1 text-3xl font-black uppercase"
          >
            Entenda onde estamos e o que vem depois
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            As etapas fazem parte da mesma temporada. Nem todas precisam estar liberadas agora: o App vai mostrar quando cada uma estiver disponível e quais critérios passam a valer.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {seasonStages.map((stage, index) => (
            <Card
              key={stage.name}
              className={
                stage.state === "active"
                  ? "border-ur-gold/50 bg-ur-gold/[.035]"
                  : stage.state === "next"
                    ? "border-white/20"
                    : "border-white/10"
              }
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${
                    stage.state === "active"
                      ? "border-ur-gold/50 bg-ur-gold/10 text-ur-gold"
                      : stage.state === "next"
                        ? "border-white/20 text-zinc-300"
                        : "border-white/10 text-zinc-600"
                  }`}
                >
                  <StageIcon state={stage.state} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                      Etapa {index + 1} · {stage.period}
                    </p>
                    <span
                      className={`text-[.65rem] font-black uppercase ${stage.state === "active" ? "text-ur-gold" : "text-zinc-500"}`}
                    >
                      {stateLabel(stage.state)}
                    </span>
                  </div>
                  <h3 className="mt-1 text-xl font-black">{stage.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {stage.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="season-guide-title" className="grid gap-4">
        <div>
          <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
            Entenda o UR
          </p>
          <h2
            id="season-guide-title"
            className="font-display mt-1 text-3xl font-black uppercase"
          >
            Guia rápido da sua jornada
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            O essencial para participar sem precisar decorar regulamentos. Quando uma regra específica afetar você, o App deve mostrar isso no momento certo.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {guideCards.map(({ title, body, icon: Icon }) => (
            <Card key={title}>
              <Icon className="text-ur-gold" size={22} aria-hidden="true" />
              <h3 className="mt-3 text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-ur-gold/30">
          <Medal className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Jogue</h2>
          <p className="mt-2 text-sm text-zinc-400">
            O UR Play é a porta de entrada recorrente. É onde sua temporada ganha resultados e continuidade.
          </p>
          <Link
            href="/athlete/agenda"
            className="text-ur-gold mt-5 inline-flex items-center gap-1 font-black"
          >
            Encontrar UR Play <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </Card>

        <Card>
          <Trophy className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Acompanhe</h2>
          <p className="mt-2 text-sm text-zinc-400">
            O ranking mostra como seus resultados se transformam em posição dentro da competição.
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
          <h2 className="mt-3 text-xl font-black">Evolua</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Nivelamento, missões oficiais e marcos ajudam você a entender como sua jornada está avançando.
          </p>
          <Link
            href="/athlete/development"
            className="text-ur-gold mt-5 inline-flex items-center gap-1 font-black"
          >
            Ver evolução <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </Card>
      </section>

      <Card className="border-white/10">
        <div className="flex items-start gap-4">
          <span className="bg-ur-gold/10 text-ur-gold flex size-10 shrink-0 items-center justify-center rounded-full">
            <Check size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
              O que você precisa lembrar
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Você faz parte de uma temporada, não de um jogo isolado.
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Jogue, acompanhe sua evolução e volte ao App para descobrir o próximo passo. O calendário, os critérios e as etapas serão comunicados aqui à medida que a temporada avança.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
