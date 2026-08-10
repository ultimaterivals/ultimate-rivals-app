import { AthleteOpportunityCard } from "@/components/athlete/athlete-opportunity-card";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAthletePortalSnapshot } from "@/server/services/athlete-portal-service";

export default async function AthleteAgendaPage() {
  const user = await requireRole(["athlete"]);
  const snapshot = await getAthletePortalSnapshot({ userId: user.userId });

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Meu jogo"
        title="Agenda"
        description="Oportunidades futuras e o estado das suas reservas e interesses. Interesse e reserva são tratados separadamente."
      />

      {!snapshot.identity ? (
        <Card>
          <p className="text-sm text-zinc-400">
            Perfil de atleta ainda não vinculado à conta.
          </p>
        </Card>
      ) : snapshot.opportunities && snapshot.opportunities.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.opportunities.map((opportunity) => (
            <AthleteOpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
            />
          ))}
        </div>
      ) : (
        <Card>
          <p className="font-bold">Nenhuma oportunidade futura disponível.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Novos UR Plays, treinos e eventos aparecerão aqui quando forem
            publicados.
          </p>
        </Card>
      )}

      <AthleteSourceHealth errors={snapshot.sourceErrors} />
    </div>
  );
}
