import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getTournament } from "@/server/repositories/tournaments.repository";
import { productLabel } from "@/lib/validation/tournament";

const tabs = [
  "overview",
  "divisions",
  "registrations",
  "eligibility",
  "seeding",
  "schedule",
  "live",
  "standings",
  "results",
  "financial readiness",
];

type DivisionView = {
  id: string;
  level?: string | null;
  format?: string | null;
  competitive_formats?: { name?: string | null } | null;
  competitive_categories?: { name?: string | null } | null;
  tournament_registrations?: unknown[] | null;
};

export default async function AdminTournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await getTournament(await createClient(), id);
  if (!tournament) notFound();
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={productLabel(tournament.product)}
        title={tournament.name}
        description={`${tournament.status} · ${tournament.poles?.name ?? "Sede a definir"}`}
      />
      <nav className="flex gap-2 overflow-x-auto" aria-label="Torneio">
        {tabs.map((tab) => (
          <span
            key={tab}
            className="rounded-ur border px-3 py-2 text-xs font-black text-zinc-400 uppercase"
          >
            {tab}
          </span>
        ))}
      </nav>
      <div className="grid gap-4 lg:grid-cols-2">
        {((tournament.tournament_divisions ?? []) as DivisionView[]).map(
          (division) => (
            <Card key={division.id}>
              <p className="text-ur-gold text-xs font-black uppercase">
                {division.level?.toUpperCase()} ·{" "}
                {division.format ?? "formato pendente"}
              </p>
              <h2 className="mt-2 text-xl font-black">
                {division.competitive_formats?.name} ·{" "}
                {division.competitive_categories?.name}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Inscricoes: {division.tournament_registrations?.length ?? 0}.
                Standings oficiais usam somente partidas homologadas.
              </p>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}
