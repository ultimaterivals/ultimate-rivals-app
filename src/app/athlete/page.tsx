import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Medal,
  Shield,
  Sparkles,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, EmptyState } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { nextPositionTarget } from "@/server/services/ranking-classification.service";
import {
  formatAthleteLevel,
  getAthleteDashboard,
  rankingTargetLabel,
} from "@/server/services/athlete-experience.service";

const date = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
const time = (value: string) =>
  new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
const related = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

export default async function AthletePage() {
  const identity = await requireRole("athlete");
  const data = await getAthleteDashboard(await createClient(), identity.userId);
  if (!data) notFound();
  const level = formatAthleteLevel(data.level);
  const ranking = data.ranking.current;
  const target = ranking
    ? nextPositionTarget(ranking, data.ranking.peers)
    : null;
  const targetLabel = rankingTargetLabel(ranking?.current_position, target);
  const month = data.ranking.monthly;
  const next = data.nextRegistration;
  const last = data.lastMatch;

  return (
    <div className="mx-auto grid max-w-7xl gap-5 sm:gap-7">
      <section className="flex items-center gap-4 py-1">
        <div
          className="bg-ur-gold text-ur-black flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-black"
          aria-hidden="true"
        >
          {data.athlete.public_name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            {data.athlete.athlete_code}
          </p>
          <h1 className="font-display truncate text-3xl font-black tracking-tight uppercase sm:text-4xl">
            {data.athlete.public_name}
          </h1>
          <p className="text-sm font-bold text-zinc-400">
            {level.short} <span aria-hidden="true">Â·</span> {level.name}{" "}
            {data.team ? `Â· ${data.team.name}` : ""}
          </p>
        </div>
      </section>

      {data.currentMatch && (
        <Card
          className="border-ur-gold overflow-hidden bg-[#19160d] p-0"
          data-testid="current-match-card"
        >
          <div className="bg-ur-gold text-ur-black flex items-center justify-between px-5 py-3 text-xs font-black tracking-[.15em] uppercase">
            <span>
              {data.reserveState
                ? "VocÃª foi convocado"
                : data.currentMatch.status === "called"
                  ? "VocÃª foi chamado"
                  : data.currentMatch.status === "in_progress"
                    ? "Partida em andamento"
                    : "Sua prÃ³xima partida"}
            </span>
            <span>
              {data.reserveState
                ? "RESERVA"
                : data.currentMatch.status.replaceAll("_", " ")}
            </span>
          </div>
          <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                <MapPin size={16} aria-hidden="true" />{" "}
                {data.currentMatch.courtName ?? "Quadra a confirmar"}
              </p>
              <div className="mt-4 grid gap-2 text-lg font-black sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <span>
                  {data.currentMatch.sides[0]?.athletes
                    .map((athlete) => athlete.name)
                    .join(" / ") || "Lado A"}
                </span>
                <span className="text-ur-gold text-sm">VS</span>
                <span>
                  {data.currentMatch.sides[1]?.athletes
                    .map((athlete) => athlete.name)
                    .join(" / ") || "Lado B"}
                </span>
              </div>
            </div>
            <Link
              href={`/athlete/matches/${data.currentMatch.id}`}
              className="bg-ur-gold text-ur-black flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-black"
            >
              ABRIR PARTIDA <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.85fr)]">
        <div className="grid gap-5">
          {ranking ? (
            <Card className="ranking-hero border-ur-gold/50 overflow-hidden p-6 sm:p-8">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
                    Ranking {level.short}
                  </p>
                  <strong className="font-display block text-[clamp(5rem,22vw,9rem)] leading-[.86] tracking-[-.05em]">
                    #{String(ranking.current_position).padStart(2, "0")}
                  </strong>
                </div>
                <Trophy
                  className="text-ur-gold/70"
                  size={32}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-5">
                <div>
                  <p className="text-ur-gold text-3xl font-black">
                    {Number(ranking.total_points).toLocaleString("pt-BR")} PTS
                  </p>
                  <p className="mt-1 text-sm font-bold text-zinc-400">
                    {ranking.position_change > 0
                      ? `â†‘ ${ranking.position_change} posiÃ§Ãµes`
                      : ranking.position_change < 0
                        ? `â†“ ${Math.abs(ranking.position_change)} posiÃ§Ãµes`
                        : "PosiÃ§Ã£o estÃ¡vel"}
                  </p>
                </div>
                {targetLabel && (
                  <p className="flex items-center gap-2 text-sm font-black">
                    <Target
                      className="text-ur-gold"
                      size={18}
                      aria-hidden="true"
                    />{" "}
                    {targetLabel}
                  </p>
                )}
              </div>
              <Link
                href="/athlete/ranking"
                className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-2 font-black text-zinc-200 hover:text-white"
              >
                VER DISPUTA <ArrowRight size={16} />
              </Link>
            </Card>
          ) : (
            <EmptyState
              title="Seu ranking comeÃ§a apÃ³s sua primeira pontuaÃ§Ã£o homologada"
              description="Jogue um UR Play e acompanhe sua entrada na classificaÃ§Ã£o oficial."
              action={
                <Link
                  href="/athlete/ur-play"
                  className="bg-ur-gold text-ur-black inline-flex min-h-11 items-center rounded-lg px-4 font-black"
                >
                  ENCONTRAR UR PLAY
                </Link>
              }
            />
          )}

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
                  Este mÃªs
                </p>
                <h2 className="font-display mt-1 text-2xl font-black uppercase">
                  Performance recente
                </h2>
              </div>
              <Activity className="text-ur-gold" aria-hidden="true" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
              {[
                ["Jogos", month?.games_played ?? 0],
                ["VitÃ³rias", month?.wins ?? 0],
                [
                  "Aproveitamento",
                  `${Number(month?.win_rate ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`,
                ],
                ["Pontos ganhos", `+${month?.total_points ?? 0}`],
                ["Aces", month?.aces ?? 0],
                ["Ataques", month?.attacks ?? 0],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[.68rem] font-bold text-zinc-500 uppercase">
                    {label}
                  </p>
                  <strong className="mt-1 block text-2xl">{value}</strong>
                </div>
              ))}
            </div>
            <Link
              href="/athlete/performance"
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-black text-zinc-300 hover:text-white"
            >
              ABRIR PERFORMANCE <ArrowRight size={16} />
            </Link>
          </Card>
        </div>

        <div className="grid content-start gap-5">
          {next ? (
            <Card className="border-ur-gold/30">
              <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
                {next.registration_status === "waitlisted"
                  ? "Lista de espera"
                  : "PrÃ³ximo UR Play"}
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="border-ur-gold/40 min-w-16 rounded-lg border p-3 text-center">
                  <strong className="block text-2xl">
                    {date(next.session!.starts_at).split(" ")[0]}
                  </strong>
                  <span className="text-xs font-bold text-zinc-400 uppercase">
                    {date(next.session!.starts_at)
                      .split(" ")
                      .slice(1)
                      .join(" ")}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-black">{next.session!.name}</h2>
                  <p className="text-sm text-zinc-400">
                    {time(next.session!.starts_at)}{" "}
                    <span aria-hidden="true">Â·</span>{" "}
                    {related(next.session!.venues)?.name ?? "Local a confirmar"}
                  </p>
                </div>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm font-black">
                <Check className="text-ur-gold" size={18} />{" "}
                {next.registration_status === "waitlisted"
                  ? `LISTA DE ESPERA #${next.waitlist_position}`
                  : "CONFIRMADO"}
              </p>
              <Link
                href={`/athlete/ur-play/${next.session!.id}`}
                className="mt-4 flex min-h-11 items-center gap-2 font-black"
              >
                VER SESSÃƒO <ArrowRight size={16} />
              </Link>
            </Card>
          ) : (
            <Card>
              <CalendarDays className="text-ur-gold" />
              <h2 className="mt-3 text-xl font-black">PrÃ³ximas sessÃµes</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Encontre seu prÃ³ximo UR Play.
              </p>
              <Link
                href="/athlete/ur-play"
                className="bg-ur-gold text-ur-black mt-4 inline-flex min-h-11 items-center rounded-lg px-4 font-black"
              >
                VER UR PLAY
              </Link>
            </Card>
          )}

          {data.season && (
            <Card>
              <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
                {data.season.name}
              </p>
              <h2 className="mt-2 text-xl font-black">
                {new Date(data.season.starts_at)
                  .toLocaleDateString("pt-BR", { month: "long" })
                  .toUpperCase()}{" "}
                â€”{" "}
                {new Date(data.season.ends_at)
                  .toLocaleDateString("pt-BR", { month: "long" })
                  .toUpperCase()}
              </h2>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="bg-ur-gold h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(8, (((data.currentCycle?.cycle_number ?? 1) - 0.5) / Math.max(1, data.season.season_cycles.length)) * 100))}%`,
                  }}
                />
              </div>
              <div className="mt-3 flex justify-between text-xs font-bold text-zinc-400">
                <span>
                  Ciclo atual: {data.currentCycle?.name ?? "A definir"}
                </span>
                <span>
                  MÃªs {data.currentCycle?.cycle_number ?? 1} de{" "}
                  {Math.max(1, data.season.season_cycles.length)}
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>

      {last ? (
        <Card>
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
                Ãšltimo jogo <span aria-hidden="true">Â·</span>{" "}
                {date(last.playedAt)}
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-4">
                <h2
                  className={`font-display text-3xl font-black ${last.resultStatus === "homologated" && last.won ? "text-ur-gold" : ""}`}
                >
                  {last.resultStatus === "homologated"
                    ? last.won
                      ? "VITÃ“RIA"
                      : "DERROTA"
                    : "RESULTADO EM REVISÃƒO"}
                </h2>
                <strong className="text-3xl">
                  {last.scoreA} Ã— {last.scoreB}
                </strong>
                {last.points !== null && (
                  <strong className="text-ur-gold">+{last.points} PTS</strong>
                )}
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                {last.statistics.aces} aces <span aria-hidden="true">Â·</span>{" "}
                {last.statistics.attacks} ataques
              </p>
            </div>
            <Link
              href={`/athlete/matches/${last.id}`}
              className="flex min-h-11 items-center gap-2 font-black"
            >
              VER DETALHES <ArrowRight size={16} />
            </Link>
          </div>
        </Card>
      ) : (
        <EmptyState
          title="Ainda sem jogos"
          description="Seu histÃ³rico comeÃ§a no primeiro UR Play."
          action={
            <Link href="/athlete/ur-play" className="text-ur-gold font-black">
              ENCONTRAR UR PLAY
            </Link>
          }
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <Shield className="text-ur-gold" aria-hidden="true" />
          <p className="mt-3 text-xs font-black text-zinc-500 uppercase">
            Minha equipe
          </p>
          <h2 className="mt-1 text-2xl font-black">
            {data.team?.name ?? "Sem equipe"}
          </h2>
          {data.team ? (
            <>
              <p className="mt-3 text-sm text-zinc-400">
                Ranking #{data.team.ranking?.current_position ?? "â€”"}{" "}
                <span aria-hidden="true">Â·</span>{" "}
                {data.team.ranking?.total_points ?? 0} pts
              </p>
              {data.team.contribution !== null && (
                <p className="text-sm text-zinc-400">
                  Minha contribuiÃ§Ã£o: {data.team.contribution} pts
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              VocÃª ainda nÃ£o representa uma equipe. Continue construindo sua
              trajetÃ³ria.
            </p>
          )}
        </Card>
        <Card>
          <MapPin className="text-ur-gold" aria-hidden="true" />
          <p className="mt-3 text-xs font-black text-zinc-500 uppercase">
            Meu polo
          </p>
          <h2 className="mt-1 text-2xl font-black">
            {data.pole?.name ?? "Sem polo"}
          </h2>
          {data.pole && (
            <p className="mt-3 text-sm text-zinc-400">
              Ranking de polos #{data.pole.ranking?.current_position ?? "â€”"}
            </p>
          )}
        </Card>
        <Card>
          <UsersRound className="text-ur-gold" aria-hidden="true" />
          <p className="mt-3 text-xs font-black text-zinc-500 uppercase">
            Minhas formaÃ§Ãµes
          </p>
          {data.formations.length ? (
            <div className="mt-3 grid gap-3">
              {data.formations.map((formation) => (
                <div key={formation.id} className="border-t pt-3">
                  <strong>
                    {formation.name ??
                      `${formation.format?.name} ${formation.level.toUpperCase()}`}
                  </strong>
                  <p className="text-sm text-zinc-400">
                    {String(formation.role).toUpperCase()}{" "}
                    {formation.ranking?.current_position
                      ? `Â· #${formation.ranking.current_position}`
                      : "Â· Ainda sem ranking qualificado"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              Nenhuma formaÃ§Ã£o ativa.
            </p>
          )}
        </Card>
      </div>

      <section className="grid gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
              O que mudou
            </p>
            <h2 className="font-display text-2xl font-black uppercase">
              Sua atividade
            </h2>
          </div>
          <Link
            href="/athlete/notifications"
            className="min-h-11 py-3 text-sm font-black text-zinc-400 hover:text-white"
          >
            VER TODAS
          </Link>
        </div>
        {data.activity.length ? (
          <div className="grid gap-2">
            {data.activity.slice(0, 5).map((event) => (
              <Link
                key={event.key}
                href={event.href}
                className="rounded-ur bg-ur-graphite hover:border-ur-gold/40 flex min-h-16 items-center gap-4 border p-4 transition-colors"
              >
                <span className="bg-ur-gold/10 text-ur-gold flex size-10 shrink-0 items-center justify-center rounded-full">
                  {event.unread ? <Sparkles size={18} /> : <Clock3 size={18} />}
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
          <p className="text-sm text-zinc-500">
            Seus acontecimentos esportivos aparecerÃ£o aqui.
          </p>
        )}
      </section>

      <Card className="border-ur-gold/20 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Medal className="text-ur-gold shrink-0" />
          <div>
            <h2 className="font-black">PrÃ³ximo degrau</h2>
            <p className="text-sm text-zinc-400">
              Acompanhe avaliaÃ§Ãµes, feedbacks e proteÃ§Ãµes da sua evoluÃ§Ã£o.
            </p>
          </div>
        </div>
        <Link
          href="/athlete/development"
          className="flex min-h-11 items-center gap-2 font-black"
        >
          VER DESENVOLVIMENTO <ArrowRight size={16} />
        </Link>
      </Card>
    </div>
  );
}
