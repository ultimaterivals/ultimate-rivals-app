import { AthleteOpportunityCard } from "@/components/athlete/athlete-opportunity-card";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAthletePortalSnapshot } from "@/server/services/athlete-portal-service";

type Params = Promise<{
  success?: string | string[];
  error?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const successMessages: Record<string, string> = {
  interest_saved: "Interesse registrado. Isso ainda não é uma reserva.",
  interest_removed: "Interesse retirado.",
  reserved: "Vaga reservada e 1 crédito colocado em reserva.",
  waitlisted:
    "Você entrou na lista de espera. Nenhum crédito foi reservado agora.",
  cancelled: "Reserva cancelada. Quando aplicável, o crédito foi devolvido.",
  cancelled_consumed:
    "Reserva cancelada fora da janela gratuita. O crédito foi consumido conforme a regra da sessão.",
};

const errorMessages: Record<string, string> = {
  invalid_request: "A solicitação enviada é inválida.",
  ATHLETE_PROFILE_REQUIRED:
    "Seu cadastro esportivo ainda não está vinculado à conta.",
  OPPORTUNITY_NOT_FOUND: "Essa oportunidade não está mais disponível.",
  OPPORTUNITY_NOT_ACCEPTING_INTEREST:
    "Essa oportunidade não está mais recebendo manifestações de interesse.",
  OPPORTUNITY_ALREADY_STARTED: "A atividade já começou.",
  INVALID_INTEREST_MODE: "O tipo de interesse informado não é válido.",
  OPPORTUNITY_NOT_RESERVABLE:
    "As reservas dessa atividade ainda não estão abertas.",
  OPPORTUNITY_ALREADY_STARTED_OR_UNSCHEDULED:
    "Essa atividade não possui uma janela válida para reserva.",
  NO_AVAILABLE_CREDITS:
    "Você não possui crédito disponível para confirmar essa vaga.",
  RESERVATION_NOT_FOUND: "A reserva não foi encontrada.",
  RESERVATION_ACCESS_DENIED: "Essa reserva não pertence à sua conta.",
  RESERVATION_ALREADY_CONSUMED:
    "Essa participação já foi consumida e não pode ser cancelada.",
  RESERVATION_CREDIT_HOLD_NOT_FOUND:
    "Não encontramos o crédito vinculado à reserva. A operação foi bloqueada para evitar saldo incorreto.",
  transaction_failed:
    "Não foi possível concluir a operação. Nenhum saldo deve ser alterado.",
};

export default async function AthleteAgendaPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const user = await requireRole(["athlete"]);
  const [snapshot, params] = await Promise.all([
    getAthletePortalSnapshot({ userId: user.userId }),
    searchParams,
  ]);
  const success = single(params.success);
  const error = single(params.error);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Meu jogo"
        title="Agenda"
        description="Demonstre interesse, reserve vagas e acompanhe lista de espera. Disponibilidade, interesse e reserva continuam sendo estados diferentes."
      />

      {success && (
        <Card className="border-ur-gold/40">
          <p className="text-ur-gold text-sm font-bold">
            {successMessages[success] ?? "Agenda atualizada."}
          </p>
        </Card>
      )}

      {error && (
        <Card className="border-red-500/40">
          <p className="text-sm font-bold text-red-300">
            {errorMessages[error] ?? errorMessages.transaction_failed}
          </p>
        </Card>
      )}

      {snapshot.identity && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Créditos disponíveis
            </p>
            <p className="font-display text-ur-gold mt-2 text-2xl font-black">
              {snapshot.creditBalance ?? "—"}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Em reservas
            </p>
            <p className="font-display mt-2 text-2xl font-black">
              {snapshot.creditReserved ?? "—"}
            </p>
          </Card>
          <Card>
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Consumidos
            </p>
            <p className="font-display mt-2 text-2xl font-black">
              {snapshot.creditConsumed ?? "—"}
            </p>
          </Card>
        </div>
      )}

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
              availableCredits={snapshot.creditBalance ?? 0}
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
