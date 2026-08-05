import { notFound } from "next/navigation";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listAthleteCompetitions } from "@/server/repositories/tournaments.repository";
import { getAthleteId } from "@/server/services/athlete-experience.service";
import { productLabel } from "@/lib/validation/tournament";

export default async function AthleteCompetitionsPage() {
  const identity = await requireRole("athlete");
  const client = await createClient();
  const athleteId = await getAthleteId(client, identity.userId);
  if (!athleteId) notFound();
  const rows = await listAthleteCompetitions(client, athleteId);
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        eyebrow="Competicoes"
        title="Minha temporada competitiva"
        description="Proximas, classificado, inscrito, convocado e historico."
      />
      {rows.length ? (
        <div className="grid gap-4">
          {rows.map((row) => {
            const registration = row.tournament_registrations;
            const division = registration?.tournament_divisions;
            const tournament = division?.tournaments;
            return (
              <Card key={row.id}>
                <p className="text-ur-gold text-xs font-black uppercase">
                  {tournament ? productLabel(tournament.product) : "Competicao"}{" "}
                  · {row.eligibility_status}
                </p>
                <h2 className="text-2xl font-black">
                  {tournament?.name ?? "Torneio"}
                </h2>
                <p className="text-sm text-zinc-400">
                  {division?.level?.toUpperCase()} ·{" "}
                  {division?.format ?? "formato pendente"} · inscricao{" "}
                  {registration?.status ?? "pendente"} · pagamento{" "}
                  {registration?.payment_status ?? "pendente"}
                </p>
                {row.eligibility_reasons?.length ? (
                  <p className="mt-2 text-sm text-zinc-500">
                    Motivos: {row.eligibility_reasons.join(", ")}
                  </p>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma competicao vinculada"
          description="Inscricoes e convocacoes oficiais aparecerao aqui sem expor dados privados."
        />
      )}
    </div>
  );
}
