import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  Coins,
  Lock,
  MapPin,
  Medal,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AthleteAvatar } from "@/components/athlete/athlete-avatar";
import { Badge, Card, EmptyState } from "@/components/ui";
import {
  EngagementClick,
  EngagementViewEvent,
} from "@/features/engagement/engagement-client";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listAthleteCompetitions } from "@/server/repositories/tournaments.repository";
import { nextPositionTarget } from "@/server/services/ranking-classification.service";
import {
  formatAthleteLevel,
  getAthleteDashboard,
  getAthleteSeasonStages,
  rankingTargetLabel,
} from "@/server/services/athlete-experience.service";

const date = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      })
    : "data a definir";

const time = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const stageTone = (status: string) => {
  if (status === "completed") return "border-emerald-500/40 bg-emerald-500/10";
  if (["active", "registered", "available"].includes(status))
    return "border-ur-gold/60 bg-ur-gold/10";
  return "border-white/10 bg-black/20";
};

export default async function AthletePage() {
  const identity = await requireRole("athlete");
  const client = await createClient();
  const data = await getAthleteDashboard(client, identity.userId);
  if (!data) notFound();

  const competitions = await listAthleteCompetitions(client, data.athlete.id);
  const stages = getAthleteSeasonStages({
    hasRanking: Boolean(data.ranking.current),
    matchCount: data.matches.length,
    hasUpcomingUrPlay: Boolean(data.nextRegistration),
    seasonStatus: data.season?.status ?? null,
    competitions,
  });
  const completedStages = stages.filter((stage) => stage.status === "completed").length;
  const campaignProgress = Math.round((completedStages / stages.length) * 100);
  const currentStage =
    stages.find((stage) =>
      ["active", "registered", "available"].includes(stage.status),
    ) ?? stages[0]!;

  const level = formatAthleteLevel(data.level);
  const ranking = data.ranking.current;
  const target = ranking
    ? nextPositionTarget(ranking, data.ranking.peers)
    : null;
  const targetLabel = rankingTargetLabel(ranking?.current_position, target);
  const next = data.nextRegistration;
  const walletBalance = data.wallet.projection?.balance ?? 0;
  const nearestRivals = ranking
    ? data.ranking.peers.filter((peer) => {
        const distance =
          Number(peer.current_position ?? 0) -
          Number(ranking.current_position ?? 0);
        return distance >= -2 && distance <= 2 && distance !== 0;
      })
    : [];

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <EngagementViewEvent
        eventName="athlete_home_viewed"
        athleteId={data.athlete.id}
        objectType="athlete"
        objectId={data.athlete.id}
        metadata={{ route: "/athlete", source: "season_hub" }}
        dedupKey={`athlete-home:${data.athlete.id}`}
      />
      <EngagementViewEvent
        eventName="season_hub_viewed"
        athleteId={data.athlete.id}
        objectType="season"
        objectId={data.season?.id ?? null}
        metadata={{
          route: "/athlete",
          source: "season_hub",
          season_id: data.season?.id ?? null,
          pole_id: data.pole?.id ?? null,
          level: data.level,
        }}
        dedupKey={`season-hub:${data.athlete.id}:${data.season?.id ?? "none"}`}
      />

      <section className="ranking-hero border-ur-gold/50 rounded-ur overflow-hidden border p-5 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <AthleteAvatar
            publicName={data.athlete.public_name}
            imageUrl={data.athlete.avatarSignedUrl}
            size="xl"
            priority
          />
          <div className="min-w-0">
            <p className="text-ur-gold text-xs font-black tracking-[.24em] uppercase">
              Ultimate Rivals · Player Hub
            </p>
            <h1 className="font-display mt-2 text-4xl font-black tracking-tight uppercase sm:text-6xl">
              {data.athlete.public_name}
            </h1>
            <p className="mt-3 flex flex-wrap gap-2 text-sm font-bold text-zinc-300">
              <Badge>{data.athlete.athlete_code}</Badge>
              <Badge>{level.short}</Badge>
              {data.team && <Badge>{data.team.name}</Badge>}
              {data.pole && <Badge>{data.pole.name}</Badge>}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-72 lg:grid-cols-1">
            <Metric
              label="Posição individual"
              value={ranking ? `#${ranking.current_position}` : "—"}
              hint={ranking ? `${ranking.total_points} pts` : "Sem ranking"}
            />
            <Metric
              label="Campanha"
              value={`${campaignProgress}%`}
              hint={`${currentStage.label} · ${String(currentStage.status).replaceAll("_", " ")}`}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="border-ur-gold/40">
          <EngagementViewEvent
            eventName="next_action_viewed"
            athleteId={data.athlete.id}
            objectType="next_action"
            metadata={{
              action_type: data.nextAction.type,
              route: "/athlete",
              season_id: data.season?.id ?? null,
              pole_id: data.pole?.id ?? null,
              ...data.nextAction.context,
            }}
            dedupKey={`next-action:${data.athlete.id}:${data.nextAction.type}`}
          />
          <p className="text-ur-gold text-xs font-black tracking-[.22em] uppercase">
            Objetivo atual
          </p>
          <h2 className="mt-2 text-3xl font-black">{data.nextAction.title}</h2>
          <p className="mt-2 text-zinc-400">{data.nextAction.description}</p>
          <EngagementClick
            eventName="next_action_clicked"
            athleteId={data.athlete.id}
            objectType="next_action"
            metadata={{
              action_type: data.nextAction.type,
              route: "/athlete",
              destination: data.nextAction.href,
              season_id: data.season?.id ?? null,
              pole_id: data.pole?.id ?? null,
            }}
          >
            <Link
              href={data.nextAction.href}
              className="bg-ur-gold text-ur-black rounded-ur mt-5 inline-flex min-h-12 items-center gap-2 px-5 font-black"
            >
              {data.nextAction.cta} <ArrowRight size={17} />
            </Link>
          </EngagementClick>
        </Card>

        <Card>
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Economia do jogador
          </p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <strong className="font-display text-ur-gold text-5xl">
                {walletBalance}
              </strong>
              <p className="font-bold text-zinc-400">UR Coins disponíveis</p>
            </div>
            <Coins className="text-ur-gold" size={36} />
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Ranking mede desempenho. UR Coins movimentam recompensas, produtos e utilidades do ecossistema.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href="/athlete/wallet" className="inline-flex font-black">
              Ver carteira
            </Link>
            <Link href="/athlete/market" className="text-ur-gold inline-flex font-black">
              Entrar no Market →
            </Link>
          </div>
        </Card>
      </section>

      <section className="overflow-hidden rounded-ur border border-white/10 bg-black/20 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
              Mapa da campanha
            </p>
            <h2 className="font-display text-2xl font-black uppercase">
              {data.season?.name ?? "Temporada 1"}
            </h2>
          </div>
          <Link href="/athlete/season" className="text-ur-gold font-black">
            Abrir campanha →
          </Link>
        </div>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="bg-ur-gold h-full rounded-full"
            style={{ width: `${campaignProgress}%` }}
            aria-label={`Progresso da campanha ${campaignProgress}%`}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {stages.map((stage, index) => {
            const isOpen = ["active", "registered", "available", "completed"].includes(
              stage.status,
            );
            return (
              <Link
                key={stage.code}
                href={stage.href}
                className={`rounded-ur border p-3 transition-transform hover:-translate-y-0.5 ${stageTone(stage.status)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-zinc-500">0{index + 1}</span>
                  {stage.status === "completed" ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : isOpen ? (
                    <Sparkles size={16} className="text-ur-gold" />
                  ) : (
                    <Lock size={15} className="text-zinc-600" />
                  )}
                </div>
                <strong className="mt-5 block">{stage.label}</strong>
                <span className="mt-1 block text-xs capitalize text-zinc-500">
                  {stage.status.replaceAll("_", " ")}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
                Onde estou
              </p>
              <h2 className="font-display text-2xl font-black uppercase">
                Ranking como competição viva
              </h2>
            </div>
            <Trophy className="text-ur-gold" />
          </div>
          {ranking ? (
            <div className="mt-5 grid gap-4 md:grid-cols-[auto_1fr]">
              <div>
                <strong className="font-display text-8xl">
                  #{ranking.current_position}
                </strong>
                <p className="text-ur-gold text-2xl font-black">
                  {Number(ranking.total_points).toLocaleString("pt-BR")} PTS
                </p>
                {targetLabel && (
                  <p className="mt-2 flex items-center gap-2 text-sm font-black">
                    <Target size={16} className="text-ur-gold" />
                    {targetLabel}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <h3 className="font-black">Rivais próximos</h3>
                {nearestRivals.length ? (
                  nearestRivals.map((peer) => (
                    <div
                      key={`${peer.current_position}-${peer.display_name}`}
                      className="rounded-ur flex items-center justify-between border border-white/10 p-3"
                    >
                      <span>
                        #{peer.current_position} · {peer.display_name}
                      </span>
                      <strong className="text-ur-gold">
                        {peer.total_points} pts
                      </strong>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">
                    Sem rivais próximos neste recorte.
                  </p>
                )}
                <Link href="/athlete/ranking" className="text-ur-gold mt-2 font-black">
                  Abrir ranking completo →
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Seu ranking aparecerá após resultados homologados."
              description="Nenhuma pontuação fictícia foi criada para preencher este espaço."
            />
          )}
        </Card>

        <Card className="overflow-hidden">
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Próxima arena
          </p>
          <div className="mt-3 flex min-h-32 items-center justify-center rounded-ur border border-dashed border-white/10 bg-black/20">
            <div className="text-center">
              <MapPin className="text-ur-gold mx-auto" size={30} />
              <p className="mt-2 text-xs font-black tracking-[.15em] text-zinc-600 uppercase">
                espaço de foto da arena
              </p>
            </div>
          </div>
          {next?.session ? (
            <div className="mt-4">
              <h2 className="text-2xl font-black">{next.session.name}</h2>
              <p className="mt-2 text-sm text-zinc-400">
                {date(next.session.starts_at)} · {time(next.session.starts_at)}
              </p>
              <Badge>{next.registration_status}</Badge>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Você ainda não tem uma vaga reservada.
            </p>
          )}
          <Link href="/athlete/arenas" className="text-ur-gold mt-5 inline-flex font-black">
            Explorar Arenas UR →
          </Link>
        </Card>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Seu mundo UR
          </p>
          <h2 className="font-display text-2xl font-black uppercase">
            Áreas de progressão
          </h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <Card className="border-ur-gold/30">
            <Medal className="text-ur-gold" />
            <h3 className="mt-3 text-xl font-black">Campanha da temporada</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Seu caminho oficial de Início até a Virada, com bloqueios e liberações derivados de dados reais.
            </p>
            <Link href="/athlete/season" className="mt-4 inline-flex font-black">
              Continuar campanha
            </Link>
          </Card>
          <Card>
            <Target className="text-ur-gold" />
            <h3 className="mt-3 text-xl font-black">Missões e evolução</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Hunter, metas de desenvolvimento, treinos, feedbacks e conquistas homologadas.
            </p>
            <Link href="/athlete/development" className="mt-4 inline-flex font-black">
              Abrir missões
            </Link>
          </Card>
          <Card>
            <MapPin className="text-ur-gold" />
            <h3 className="mt-3 text-xl font-black">Arenas UR</h3>
            <p className="mt-2 text-sm text-zinc-400">
              {data.pole
                ? `${data.pole.name}${data.pole.city ? ` · ${data.pole.city}` : ""}`
                : "Seu polo principal ainda não está definido."}
            </p>
            <Link href="/athlete/arenas" className="mt-4 inline-flex font-black">
              Explorar arenas
            </Link>
          </Card>
          <Card>
            <Clapperboard className="text-ur-gold" />
            <h3 className="mt-3 text-xl font-black">Destaques</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Momentos publicados, mídia liberada e narrativa oficial da temporada.
            </p>
            <Link href="/athlete/highlights" className="mt-4 inline-flex font-black">
              Ver destaques
            </Link>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <UsersRound className="text-ur-gold" />
          <h2 className="mt-3 text-xl font-black">Formações e equipe</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {data.formations.length
              ? `${data.formations.length} formação(ões) ativa(s).`
              : "Nenhuma formação ativa ainda."}
          </p>
          <Link href="/athlete/agenda" className="mt-4 inline-flex font-black">
            Procurar parceiros
          </Link>
        </Card>
        <Card className="border-ur-gold/30">
          <Coins className="text-ur-gold" />
          <h2 className="mt-3 text-xl font-black">UR Market</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Use seu saldo real de UR Coins em produtos, serviços e recompensas disponíveis no ecossistema.
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link href="/athlete/market" className="text-ur-gold inline-flex font-black">
              Explorar Market →
            </Link>
            <Link href="/athlete/wallet" className="inline-flex font-black">
              Ver saldo
            </Link>
          </div>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
              A temporada está viva
            </p>
            <h2 className="font-display text-2xl font-black uppercase">
              Acontecimentos
            </h2>
          </div>
          <Link href="/athlete/notifications" className="font-black">
            Ver inbox
          </Link>
        </div>
        {data.activity.length ? (
          <div className="grid gap-2">
            {data.activity.slice(0, 6).map((event) => (
              <Link
                key={event.key}
                href={event.href}
                className="rounded-ur bg-ur-graphite hover:border-ur-gold/40 flex min-h-16 items-center gap-4 border p-4 transition-colors"
              >
                <span className="bg-ur-gold/10 text-ur-gold flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Sparkles size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block">{event.title}</strong>
                  <span className="line-clamp-1 text-sm text-zinc-400">
                    {event.detail}
                  </span>
                </span>
                <ArrowRight className="text-zinc-600" size={17} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sem acontecimentos por enquanto"
            description="Ranking, reservas, convites, resultados e notificações reais aparecerão aqui."
            action={
              <Link href="/athlete/agenda" className="text-ur-gold font-black">
                Explorar agenda
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-ur border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
        {label}
      </p>
      <strong className="font-display mt-1 block text-3xl">{value}</strong>
      <p className="text-sm text-zinc-400">{hint}</p>
    </div>
  );
}
