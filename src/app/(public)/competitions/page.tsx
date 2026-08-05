import { Trophy } from "lucide-react";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listPublicTournaments } from "@/server/repositories/tournaments.repository";
import { productLabel } from "@/lib/validation/tournament";

export default async function PublicCompetitionsPage() {
  const rows = await listPublicTournaments(await createClient());
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        eyebrow="Calendario competitivo"
        title="Competicoes"
        description="UR Series, UR Cup e UR Legends com tabela, resultados e classificacao publica."
      />
      {rows.length ? (
        <div className="grid gap-4">
          {rows.map((tournament) => (
            <Link
              key={tournament.id}
              href={`/competitions/${tournament.public_slug}`}
            >
              <Card className="hover:border-ur-gold/40 transition-colors">
                <p className="text-ur-gold flex items-center gap-2 text-xs font-black uppercase">
                  <Trophy size={15} />
                  {productLabel(tournament.product)}
                </p>
                <h2 className="text-2xl font-black">{tournament.name}</h2>
                <p className="text-sm text-zinc-400">
                  {tournament.pole_name ?? "Sede a definir"} ·{" "}
                  {tournament.status}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Calendario em preparacao"
          description="As competicoes publicadas aparecerao aqui sem PII."
        />
      )}
    </div>
  );
}
