import { notFound } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { RankingPodium } from "@/components/ranking/ranking-podium";
import { RankingTable } from "@/components/ranking/ranking-table";
import { PageHeader } from "@/components/ui";
import { EngagementViewEvent } from "@/features/engagement/engagement-client";
import { createClient } from "@/lib/supabase/server";
import {
  listRankings,
  type RankingType,
} from "@/server/repositories/rankings.repository";

const map: Record<string, { type: RankingType; label: string }> = {
  individual: { type: "individual", label: "Ranking individual" },
  teams: { type: "team", label: "Ranking de equipes" },
  poles: { type: "pole", label: "Ranking de polos" },
  doubles: { type: "doubles", label: "Ranking de duplas" },
  fours: { type: "fours", label: "Ranking de quartetos" },
};

export default async function PublicRankingTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const key = (await params).type;
  const value = map[key];
  if (!value) notFound();
  const rows = (await listRankings(await createClient(), {
    type: value.type,
    limit: 100,
  })) as Array<Record<string, unknown>>;
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-5 py-6 sm:px-8">
      <EngagementViewEvent
        eventName="ranking_viewed"
        objectType="ranking"
        metadata={{
          ranking_scope: value.type,
          route: `/rankings/${key}`,
          source: "public_ranking",
        }}
        dedupKey={`ranking-viewed:${value.type}:${key}`}
      />
      <header className="mb-12 flex items-center justify-between">
        <BrandMark />
        <Link href="/rankings" className="font-bold">
          Todos os rankings
        </Link>
      </header>
      <PageHeader
        eyebrow="Classificação pública"
        title={value.label}
        description="Somente nome esportivo, contexto competitivo e estatísticas homologadas. Nenhum dado administrativo é publicado."
      />
      <div className="mt-8 grid gap-8">
        {value.type === "individual" && (
          <RankingPodium
            rows={rows}
            context={{ type: value.type, route: `/rankings/${key}` }}
          />
        )}
        <RankingTable
          rows={
            value.type === "individual"
              ? rows.filter((row) => Number(row.current_position ?? 0) > 3)
              : rows
          }
          publicProfiles={value.type === "individual"}
        />
      </div>
    </main>
  );
}
