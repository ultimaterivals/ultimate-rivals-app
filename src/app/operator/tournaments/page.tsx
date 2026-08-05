import { Card, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listTournaments } from "@/server/repositories/tournaments.repository";
import { productLabel } from "@/lib/validation/tournament";

export default async function OperatorTournamentsPage() {
  const rows = await listTournaments(await createClient());
  const active = rows.filter((row) =>
    ["scheduled", "in_progress", "completed"].includes(row.status),
  );
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operacao"
        title="Torneios"
        description="Check-in, chamada de partida, scoring e envio para review dentro do escopo operacional."
      />
      {active.length ? (
        <div className="grid gap-4">
          {active.map((tournament) => (
            <Card key={tournament.id}>
              <p className="text-ur-gold text-xs font-black uppercase">
                {productLabel(tournament.product)} · {tournament.status}
              </p>
              <h2 className="text-2xl font-black">{tournament.name}</h2>
              <p className="text-sm text-zinc-400">
                Operador pode chamar partidas, registrar sets/rallies e enviar
                review. Seeding, elegibilidade, campeao e ledger ficam
                bloqueados.
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum torneio operacional"
          description="Torneios aparecerao aqui quando estiverem scheduled ou in_progress."
        />
      )}
    </div>
  );
}
