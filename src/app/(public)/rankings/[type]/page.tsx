import { notFound } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { RankingTable } from "@/components/ranking/ranking-table";
import { PageHeader } from "@/components/ui";
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
  const rows = await listRankings(await createClient(), {
    type: value.type,
    limit: 100,
  });
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-5 py-6 sm:px-8">
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
      <div className="mt-8">
        <RankingTable
          rows={rows as Array<Record<string, unknown>>}
          publicProfiles={value.type === "individual"}
        />
      </div>
    </main>
  );
}
