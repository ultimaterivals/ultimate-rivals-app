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
import type { SeasonStageState } from "@/server/services/athlete-season-context-service";
import { getAthleteSeasonContextSnapshot } from "@/server/services/athlete-season-context-service";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

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
    body: "Acompanhe seu nível, participação, posição e os critérios publicados. O App mostra o que já foi cumprido somente quando essa regra estiver disponível de forma oficial.",
    icon: Medal,
  },
  {
    title: "Como funcionam as equipes",
    body: "Sua jornada pode ser individual e coletiva. Quando houver vínculo oficial, seus resultados também passam a fazer parte da história da equipe.",
    icon: UsersRound,
  },
  {
    title: "O que são UR Coins",
    body: "UR Coins pertencem à economia do ecossistema e são separadas dos pontos de ranking. O saldo pode ser usado nas oportunidades disponíveis no UR Market.",
    icon: Coins,
  },
  {
    title: "O que acontece no fim",
    body: "A Virada encerra o trimestre, consolida a história da temporada e prepara o próximo ciclo competitivo.",
    icon: Sparkles,
  },
] as const;

const stageDetails = {
  opening: {
    audience: "Atletas entrando ou se consolidando na temporada.",
    criteria:
      "Cadastro, contexto competitivo, disponibilidade e entrada nas atividades oficiais quando publicadas.",
    reward: "Entrada oficial na campanha e construção da base competitiva.",
  },
  ur_play_ranking: {
    audience:
      "Atletas elegíveis às atividades publicadas da modalidade e categoria.",
    criteria:
      "Participações e resultados homologados alimentam a carreira e o ranking conforme as regras oficiais.",
    reward:
      "Ranking, dados competitivos e benefícios que tenham regra oficial vigente.",
  },
  series: {
    audience: "Faixas e níveis definidos pelo regulamento vigente da etapa.",
    criteria:
      "Classificação conforme critérios oficiais publicados. O App não antecipa elegibilidade sem regra canônica.",
    reward: "Campeão R$ 800 · Vice R$ 400 · 3º R$ 300 · MVP R$ 500.",
  },
  cup: {
    audience:
      "Classificados e equipes elegíveis conforme o ciclo competitivo.",
    criteria:
      "Ranking, equipe, polo e demais critérios somente quando publicados oficialmente.",
    reward: "Campeão R$ 1.200 · Vice R$ 800 · 3º R$ 500 · MVP R$ 700.",
  },
  legends: {
    audience: "Top atletas elegíveis por polo e nível conforme a temporada.",
    criteria:
      "Ranking e critérios técnicos/competitivos publicados para a etapa.",
    reward: "Campeão R$ 800 · Vice R$ 400 · 3º R$ 300 · MVP R$ 500.",
  },
  turnover: {
    audience:
      "Atletas e equipes alcançados pelos reconhecimentos oficiais do ciclo.",
    criteria:
      "Fechamento e homologação do trimestre conforme ranking, categoria, nível e regras publicadas.",
    reward:
      "Equipes N3: 1º R$ 1.500 · 2º R$ 1.000 · 3º R$ 800. Melhor atleta do ranking: R$ 1.000.",
  },
} as const;

function StageIcon({ state }: { state: SeasonStageState }) {
  if (state === "active") {
    return <CircleDot size={18} aria-hidden="true" />;
  }
  if (state === "next") {
    return <Flag size={18} aria-hidden="true" />;
  }
  return <LockKeyhole size={17} aria-hidden="true" />;
}

function stateLabel(state: SeasonStageState) {
  if (state === "active") return "Em disputa agora";
  if (state === "next") return "Próxima etapa";
  return "Ainda não liberado";
}

function situationCopy(state: SeasonStageState) {
  if (state === "active") {
    return "Você está dentro desta parte da campanha. Continue gerando participação e resultado oficial.";
  }
  if (state === "next") {
    return "Sua elegibilidade ainda não é declarada pelo App. Ela só aparecerá quando os critérios oficiais estiverem publicados e calculáveis.";
  }
  return "Esta etapa ainda não está aberta para avaliação de elegibilidade.";
}

function missingCopy(state: SeasonStageState) {
  if (state === "active") {
    return "Jogar, acompanhar homologações e manter sua posição competitiva em movimento.";
  }
  return "Aguardar a publicação oficial dos critérios da etapa. Nenhum percentual de classificação é estimado.";
}

function formatOfficialDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default async function AthleteSeasonPage() {
  const viewer = await requireAthleteViewer();
  const [snapshot, season] = await Promise.all([
    getAthleteSnapshotForViewer(viewer),
    getAthleteSeasonContextSnapshot(),
  ]);

  const ranking = snapshot.primaryRanking;
  const summary = snapshot.summary;
  const next = snapshot.nextReservation;
  const development = snapshot.development;
  const seasonStartsAt = formatOfficialDate(season.startsAt);
  const seasonEndsAt = formatOfficialDate(season.endsAt);

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
        eyebrow={season.title}
        title="Sua temporada, do começo ao fim"
        description="Abertura → UR Play + Ranking → UR Series → UR Cup → UR Legends → Virada. Cada etapa pertence à mesma campanha competitiva."
        action={ranking?.level ? <Badge>{ranking.level}</Badge> : undefined}
      />

      {season.source === "fallback" ? (
        <Card className="border-amber-400/30 bg-amber-400/[.04]">
          <p className="text-xs font-black tracking-[.18em] text-amber-300 uppercase">
            Contexto parcial
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            O calendário canônico da temporada não está disponível neste
            momento. O App preserva o mapa estrutural sem inventar datas,
            elegibilidade ou progresso.
          </p>
        </Card>
      ) : null}

      <section className="ranking-hero border-ur-gold/40 rounded-ur border p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-ur-gold text-xs font-black tracking-[.22em] uppercase">
              Sua campanha
            </p>
            <h2 className="font-display mt-2 text-3xl font-black uppercase sm:text-4xl">
              Você está na fase de {season.phaseLabel}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Jogue, gere histórico oficial, acompanhe o ranking e veja aqui o
              que está em disputa. Critérios futuros só aparecem como cumpridos
              quando houver regra oficial calculável.
            </p>
            {seasonStartsAt || seasonEndsAt ? (
              <p className="mt-3 text-xs font-bold text-zinc-500">
                {seasonStartsAt ? `Início oficial: ${seasonStartsAt}` : null}
                {seasonStartsAt && seasonEndsAt ? " · " : null}
                {seasonEndsAt ? `Fim oficial: ${seasonEndsAt}` : null}
              </p>
            ) : null}
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
            <h2 className="mt-2 text-2xl font-black">
              {personalNextStep.title}
            </h2>
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
            Caminho competitivo
          </p>
          <h2
            id="season-roadmap-title"
            className="font-display mt-1 text-3xl font-black uppercase"
          >
            O que é, quem entra e o que está em disputa
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Premiações conhecidas da Temporada 1 ficam visíveis como objetivo
            esportivo. Elas não significam valor ganho, homologado ou recebido.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {season.stages.map((stage, index) => {
            const details = stageDetails[stage.code];
            const stageStartsAt = formatOfficialDate(stage.startsAt);
            const stageEndsAt = formatOfficialDate(stage.endsAt);

            return (
              <Card
                key={stage.code}
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
                        className={`text-[.65rem] font-black uppercase ${
                          stage.state === "active"
                            ? "text-ur-gold"
                            : "text-zinc-500"
                        }`}
                      >
                        {stateLabel(stage.state)}
                      </span>
                    </div>

                    <h3 className="mt-1 text-xl font-black">{stage.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {stage.description}
                    </p>

                    <dl className="mt-5 grid gap-4 border-t border-white/10 pt-4">
                      <div>
                        <dt className="text-[.65rem] font-black tracking-[.14em] text-zinc-500 uppercase">
                          Quem participa
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-zinc-300">
                          {details.audience}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[.65rem] font-black tracking-[.14em] text-zinc-500 uppercase">
                          Critérios
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-zinc-300">
                          {details.criteria}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[.65rem] font-black tracking-[.14em] text-zinc-500 uppercase">
                          Sua situação
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-zinc-300">
                          {situationCopy(stage.state)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[.65rem] font-black tracking-[.14em] text-zinc-500 uppercase">
                          O que falta
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-zinc-300">
                          {missingCopy(stage.state)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[.65rem] font-black tracking-[.14em] text-zinc-500 uppercase">
                          Premiação ou benefício conhecido
                        </dt>
                        <dd className="text-ur-gold mt-1 text-sm font-bold leading-6">
                          {details.reward}
                        </dd>
                      </div>
                    </dl>

                    {stageStartsAt || stageEndsAt ? (
                      <p className="mt-4 text-xs font-bold text-zinc-500">
                        {stageStartsAt
                          ? `Início oficial: ${stageStartsAt}`
                          : null}
                        {stageStartsAt && stageEndsAt ? " · " : null}
                        {stageEndsAt ? `Fim oficial: ${stageEndsAt}` : null}
                      </p>
                    ) : (
                      <p className="mt-4 text-xs text-zinc-600">
                        Data oficial ainda não publicada no contexto canônico.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
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
            O essencial para participar sem precisar decorar regulamentos.
            Quando uma regra específica afetar você, o App deve mostrar isso no
            momento certo.
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
            O UR Play é a porta de entrada recorrente. É onde sua temporada
            ganha resultados e continuidade.
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
            O ranking mostra como seus resultados se transformam em posição
            dentro da competição.
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
            Nivelamento, missões oficiais e marcos ajudam você a entender como
            sua jornada está avançando.
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
              Jogue, acompanhe sua evolução e volte ao App para descobrir o
              próximo passo. Datas, critérios e elegibilidade só são tratados
              como oficiais quando existirem na fonte canônica.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
