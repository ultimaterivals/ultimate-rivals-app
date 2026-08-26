import { Trophy } from "lucide-react";
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

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Temporada em campo"
        title="Ranking"
        description="Acompanhe a classificação publicada da liga e a sua evolução em quadra."
      />
      <nav
        aria-label="Tipos de ranking"
        className="rounded-ur bg-ur-graphite grid grid-cols-2 gap-2 border border-white/10 p-2 sm:flex"
      >
        {tabs.map(([value, label]) => (
          <Link
            key={value}
            href={`/athlete/ranking?tab=${value}`}
            className={`rounded-ur min-h-11 px-4 py-3 text-center text-sm font-black ${tab === value ? "bg-ur-gold text-ur-black" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
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
              className={`rounded-full border px-3 py-2 text-xs font-bold ${level === value ? "border-ur-gold text-ur-gold" : "border-white/10 text-zinc-400"}`}
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
              className={`rounded-full border px-3 py-2 text-xs font-bold ${category === value ? "border-ur-gold text-ur-gold" : "border-white/10 text-zinc-400"}`}
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
            className={`rounded-full border px-3 py-2 text-xs font-bold ${pole === id ? "border-ur-gold text-ur-gold" : "border-white/10 text-zinc-400"}`}
          >
            {name}
          </Link>
        ))}
      </section>
      {mine ? (
        <Card className="ranking-hero border-ur-gold/35 grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <p className="font-display text-ur-gold text-5xl font-black">
            #{mine.current_position ?? "—"}
          </p>
          <div>
            <p className="text-xs font-black tracking-[.18em] text-zinc-400 uppercase">
              Sua posição
            </p>
            <p className="font-display mt-1 text-2xl font-black">
              {mine.total_points} pts
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {mine.games_played} jogos · {mine.wins} vitórias · {mine.losses}{" "}
              derrotas · {Number(mine.win_rate).toFixed(1)}%
            </p>
          </div>
          {above && (
            <p className="max-w-xs text-sm text-zinc-300">
              Próximo alvo:{" "}
              <strong className="text-ur-gold">
                #{above.current_position}
              </strong>
              . A posição considera vitórias, aproveitamento, pontos e critérios
              de desempate.
            </p>
          )}
        </Card>
      ) : tab === "individual" ? (
        <Card>
          <p className="font-bold">
            Você ainda não tem posição nesta classificação.
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            A tabela geral continua disponível enquanto sua jornada competitiva
            começa.
          </p>
        </Card>
      ) : null}
      {rows.length > 0 ? (
        <>
          <AthleteLeaderboard
            currentAthleteId={viewer.athleteId}
            eyebrow="Top 3 · Classificação oficial"
            title="Ranking geral da liga"
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
                    <Card key={label}>
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
      ) : (
        <Card>
          <Trophy className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">
            Classificação ainda não publicada
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Quando a liga publicar esta tabela, ela aparecerá aqui.
          </p>
        </Card>
      )}
      <AthleteSourceHealth
        errors={[
          ...snapshot.sourceErrors,
          ...(allResult.error ? [allResult.error.message] : []),
        ]}
      />
    </div>
  );
}
