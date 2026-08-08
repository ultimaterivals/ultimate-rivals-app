import Link from "next/link";
import { AthleteAvatar } from "@/components/athlete/athlete-avatar";
import { Card } from "@/components/ui";
import {
  EngagementClick,
  EngagementViewEvent,
} from "@/features/engagement/engagement-client";

type RankingRow = Record<string, unknown>;

function position(row: RankingRow) {
  return Number(row.current_position ?? 0);
}

function name(row: RankingRow) {
  return String(row.display_name ?? "Atleta");
}

function points(row: RankingRow) {
  return Number(row.total_points ?? 0).toLocaleString("pt-BR");
}

function profileHref(row: RankingRow) {
  const code = String(row.entity_code ?? "");
  return code ? `/athletes/${code}` : null;
}

export function RankingPodium({
  rows,
  context,
}: {
  rows: RankingRow[];
  context: {
    type: string;
    route: string;
    seasonId?: string | null;
    level?: string | null;
    poleId?: string | null;
    category?: string | null;
    format?: string | null;
  };
}) {
  const top = rows.slice(0, 3);
  if (!top.length) return null;
  const first = top.find((row) => position(row) === 1) ?? top[0]!;
  const second = top.find((row) => position(row) === 2);
  const third = top.find((row) => position(row) === 3);
  return (
    <section className="grid gap-4">
      <EngagementViewEvent
        eventName="ranking_podium_viewed"
        objectType="ranking"
        metadata={{
          ranking_scope: context.type,
          route: context.route,
          season_id: context.seasonId ?? null,
          level: context.level ?? null,
          pole_id: context.poleId ?? null,
          category: context.category ?? null,
          format: context.format ?? null,
        }}
        dedupKey={`podium:${context.route}:${context.type}:${top.map((row) => row.id).join(",")}`}
      />
      <div className="grid gap-4 md:grid-cols-[.85fr_1.15fr_.85fr] md:items-end">
        {second ? <PodiumCard row={second} tone="secondary" /> : <div />}
        <PodiumCard row={first} tone="primary" />
        {third ? <PodiumCard row={third} tone="tertiary" /> : <div />}
      </div>
    </section>
  );
}

function PodiumCard({
  row,
  tone,
}: {
  row: RankingRow;
  tone: "primary" | "secondary" | "tertiary";
}) {
  const href = profileHref(row);
  const body = (
    <Card
      className={
        tone === "primary"
          ? "ranking-hero border-ur-gold/70 p-6 text-center shadow-[0_20px_80px_rgba(244,196,48,.12)]"
          : "border-white/10 p-5 text-center"
      }
    >
      <p className="text-ur-gold font-display text-5xl font-black">
        #{position(row)}
      </p>
      <div className="mt-4 flex justify-center">
        <AthleteAvatar
          publicName={name(row)}
          imageUrl={String(row.avatar_signed_url ?? "") || null}
          size={tone === "primary" ? "xl" : "lg"}
          priority={tone === "primary"}
        />
      </div>
      <h2 className="mt-4 text-xl font-black">{name(row)}</h2>
      <p className="text-ur-gold mt-1 text-2xl font-black">{points(row)} PTS</p>
      <p className="mt-2 text-xs text-zinc-500">
        {[row.level && String(row.level).toUpperCase(), row.team_name, row.pole_name]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </Card>
  );
  if (!href) return body;
  return (
    <EngagementClick
      eventName="ranking_athlete_clicked"
      athleteId={String(row.entity_id)}
      objectType="athlete"
      objectId={String(row.entity_id)}
      metadata={{
        route: "/rankings",
        ranking_position: position(row),
        is_top_3: true,
        source: "ranking_podium",
      }}
    >
      <Link href={href} className="block focus-visible:rounded-ur">
        {body}
      </Link>
    </EngagementClick>
  );
}
