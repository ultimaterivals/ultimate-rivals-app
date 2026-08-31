import { ArrowUpRight, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { AthleteLeaderboard } from "@/components/athlete/athlete-leaderboard";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

const tabs = [
  ["individual", "Individual"],
  ["doubles", "Duplas"],
  ["team", "Equipes"],
  ["pole", "Polos"],
] as const;
type RankingType = (typeof tabs)[number][0];
type Params = Promise<{
  tab?: string;
  level?: string;
  category?: string;
  pole?: string;
}>;

function option(value: string | undefined, values: readonly (string | null)[]) {
  return value && values.includes(value) ? value : undefined;
}

function pointsDifference(
  a: number | null | undefined,
  b: number | null | undefined,
) {
  if (typeof a !== "number" || typeof b !== "number") return null;
  return Math.max(0, a - b);
}

export default async function AthleteRankingPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);
  const params = await searchParams;
  const tab = tabs.some(([value]) => value === params.tab)
    ? (params.tab as RankingType)
    : "individual";
  const client = await createClient();
  const allResult = await client
    .from("public_rankings")
    .select(
      "id,ranking_type,entity_id,display_name,level,category_code,format_code,total_points,games_played,wins,losses,win_rate,current_position,previous_position,position_change,movement,pole_id,pole_name,avatar_url,aces,attacks,blocks,defenses,assists",
    )
    .eq("ranking_type", tab)
    .is("cycle_id", null)
    .order("current_position", { ascending: true })
    .limit(100);
  const all = allResult.data ?? [];
  const level = option(
    params.level,
    all.map((row) => row.level),
  );
  const category = option(
    params.category,
    all.map((row) => row.category_code),
  );
  const pole = option(
    params.pole,
    all.map((row) => row.pole_id),
  );
  const rows = all.filter(
    (row) =>
      (!level || row.level === level) &&
      (!category || row.category_code === category) &&
      (!pole || row.pole_id === pole),
  );
  const mine = rows.find((row) => row.entity_id === viewer.athleteId) ?? null;
  const above = mine?.current_position
    ? rows.find((row) => row.current_position === mine.current_position - 1)
    : null;
  const leader =
    rows.find((row) => row.current_position === 1) ?? rows[0] ?? null;
  const gapToAbove = above
    ? pointsDifference(above.total_points, mine?.total_points)
    : null;
  const gapToLeader = leader
    ? pointsDifference(leader.total_points, mine?.total_points)
    : null;
  const leaderStats =
    tab === "individual"
      ? ([
          [
            "Líder de aces",
            rows
              .filter((row) => row.aces > 0)
              .sort((a, b) => b.aces - a.aces)[0],
            "aces",
          ],
          [
            "Líder de ataques",
            rows
              .filter((row) => row.attacks > 0)
              .sort((a, b) => b.attacks - a.attacks)[0],
            "attacks",
          ],
        ] as const)
      : [];
  const leaderboardTitle =
    tab === "doubles"
      ? "Ranking de duplas"
      : tab === "team"
        ? "Corrida das equipes"
        : tab === "pole"
          ? "Disputa entre polos"
          : "Ranking geral da liga";
  const leaderboardEyebrow =
    tab === "doubles"
      ? "Formações oficiais · Duplas"
      : "Classificação oficial da temporada";

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Sua corrida na temporada"
        title="Ranking"
        description="Veja sua posição, quem está à sua frente e como a disputa oficial está se movendo."
      />

      <nav
        aria-label="Tipos de ranking"
        className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-[#0b0b0b] p-2 sm:flex"
      >
        {tabs.map(([value, label]) => (
          <Link
            key={value}
            href={`/athlete/ranking?tab=${value}`}
            className={`min-h-11 rounded-2xl px-4 py-3 text-center text-sm font-black transition-colors ${tab === value ? "bg-ur-gold text-ur-black" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <section aria-label="Filtros do ranking" className="flex flex-wrap gap-2">
        {[...new Set(all.map((row) => row.level).filter(Boolean))].map(
          (value) => (
            <Link
              key={value}
              href={`/athlete/ranking?tab=${tab}&level=${level === value ? "" : value}`}
              className={`rounded-full border px-3 py-2 text-xs font-bold ${level === value ? "border-ur-gold bg-ur-gold/10 text-ur-gold" : "border-white/10 text-zinc-400"}`}
            >
              {value}
            </Link>
          ),
        )}
        {[...new Set(all.map((row) => row.category_code).filter(Boolean))].map(
          (value) => (
            <Link
              key={value}
              href={`/athlete/ranking?tab=${tab}&category=${category === value ? "" : value}`}
              className={`rounded-full border px-3 py-2 text-xs font-bold ${category === value ? "border-ur-gold bg-ur-gold/10 text-ur-gold" : "border-white/10 text-zinc-400"}`}
            >
              {value}
            </Link>
          ),
        )}
        {[
          ...new Map(
            all
              .filter((row) => row.pole_id && row.pole_name)
              .map((row) => [row.pole_id, row.pole_name]),
          ).entries(),
        ].map(([id, name]) => (
          <Link
            key={id}
            href={`/athlete/ranking?tab=${tab}&pole=${pole === id ? "" : id}`}
            className={`rounded-full border px-3 py-2 text-xs font-bold ${pole === id ? "border-ur-gold bg-ur-gold/10 text-ur-gold" : "border-white/10 text-zinc-400"}`}
          >
            {name}
          </Link>
        ))}
      </section>

      {allResult.error ? (
        <Card className="border-amber-400/20 bg-amber-400/[.04]">
          <p className="text-xs font-black tracking-[.18em] text-amber-300 uppercase">
            Fonte temporariamente indisponível
          </p>
          <h2 className="mt-2 text-xl font-black">
            Não foi possível carregar a classificação.
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Nenhuma posição ou ausência de ranking será inferida enquanto a
            fonte oficial não responder.
          </p>
        </Card>
      ) : mine ? (
        <section aria-labelledby="my-ranking-title" className="athlete-stage">
          <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,.85fr)] lg:items-end lg:px-8 lg:py-8">
            <div>
              <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
                Sua posição agora
              </p>
              <div className="mt-3 flex items-end gap-4">
                <p className="font-display text-7xl leading-none font-black text-white sm:text-8xl">
                  #{mine.current_position ?? "—"}
                </p>
                <div className="pb-1">
                  <p
                    id="my-ranking-title"
                    className="font-display text-ur-gold text-2xl font-black"
                  >
                    {mine.total_points} pts
                  </p>
                  <p className="mt-1 text-xs font-bold text-zinc-500 uppercase">
                    classificação publicada
                  </p>
                </div>
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-300">
                {mine.games_played} jogos · {mine.wins} vitórias · {mine.losses}{" "}
                derrotas · {Number(mine.win_rate).toFixed(1)}% de aproveitamento
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {above ? (
                <div className="athlete-panel bg-black/30 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[.62rem] font-black tracking-[.18em] text-zinc-500 uppercase">
                        À sua frente
                      </p>
                      <p className="mt-1 font-black">
                        #{above.current_position} · {above.display_name}
                      </p>
                    </div>
                    <Target
                      size={18}
                      className="text-ur-gold"
                      aria-hidden="true"
                    />
                  </div>
                  {gapToAbove !== null ? (
                    <p className="mt-3 text-sm text-zinc-300">
                      Diferença de pontos:{" "}
                      <strong className="text-ur-gold">{gapToAbove}</strong>
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="athlete-panel athlete-panel-gold p-4">
                  <p className="text-ur-gold text-[.62rem] font-black tracking-[.18em] uppercase">
                    Posição de referência
                  </p>
                  <p className="mt-2 font-black">
                    Você está no topo desta classificação publicada.
                  </p>
                </div>
              )}

              {leader && mine.current_position !== 1 ? (
                <div className="athlete-panel bg-black/30 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[.62rem] font-black tracking-[.18em] text-zinc-500 uppercase">
                        Líder da disputa
                      </p>
                      <p className="mt-1 font-black">
                        #1 · {leader.display_name}
                      </p>
                    </div>
                    <ArrowUpRight
                      size={18}
                      className="text-zinc-500"
                      aria-hidden="true"
                    />
                  </div>
                  {gapToLeader !== null ? (
                    <p className="mt-3 text-sm text-zinc-300">
                      Diferença de pontos: <strong>{gapToLeader}</strong>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div className="border-t border-white/10 px-5 py-3 text-xs text-zinc-500 sm:px-7 lg:px-8">
            Pontos ajudam a mostrar a distância competitiva, mas empates e
            posições continuam sujeitos aos critérios oficiais de desempate.
          </div>
        </section>
      ) : tab === "individual" ? (
        <Card>
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Ranking geral da liga
          </p>
          <h2 className="mt-2 text-xl font-black">
            Você ainda não tem posição nesta classificação.
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            A classificação geral continua visível abaixo. O app não cria uma
            posição até ela existir na fonte oficial.
          </p>
        </Card>
      ) : null}

      {!allResult.error && rows.length > 0 ? (
        <>
          <p className="text-xs font-black tracking-[.18em] text-zinc-600 uppercase">
            Top 3 e classificação completa
          </p>
          <AthleteLeaderboard
            currentAthleteId={viewer.athleteId}
            eyebrow={leaderboardEyebrow}
            title={leaderboardTitle}
            rows={rows.map((row) => ({
              id: row.id,
              entityId: row.entity_id,
              displayName: row.display_name,
              avatarUrl: row.avatar_url,
              position: row.current_position,
              positionChange: row.position_change,
              points: row.total_points,
              byline: [
                row.level,
                row.category_code,
                row.format_code,
                row.pole_name,
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
          {leaderStats.some(([, row]) => row) && (
            <section
              className="grid gap-3 sm:grid-cols-2"
              aria-label="Destaques oficiais"
            >
              {leaderStats.map(
                ([label, row, field]) =>
                  row && (
                    <Card key={label} className="bg-[#0c0c0c]">
                      <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                        Destaque oficial
                      </p>
                      <p className="mt-2 font-bold">{label}</p>
                      <p className="text-ur-gold mt-1 text-xl font-black">
                        {row.display_name} · {row[field]}
                      </p>
                    </Card>
                  ),
              )}
            </section>
          )}
        </>
      ) : !allResult.error ? (
        <Card>
          <Trophy className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">
            Classificação ainda não publicada
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Quando existir uma tabela oficial para este recorte, ela aparecerá
            aqui.
          </p>
        </Card>
      ) : null}

      <AthleteSourceHealth
        errors={[
          ...snapshot.sourceErrors,
          ...(allResult.error ? [allResult.error.message] : []),
        ]}
      />
    </div>
  );
}
