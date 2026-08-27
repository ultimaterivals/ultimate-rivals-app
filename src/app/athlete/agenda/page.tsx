import Link from "next/link";
import { AthleteOpportunityCard } from "@/components/athlete/athlete-opportunity-card";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteSeasonContextSnapshot } from "@/server/services/athlete-season-context-service";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

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

const agendaStates = [
  ["Interesse", "Sinaliza intenção. Não confirma vaga e não reserva crédito."],
  [
    "Reserva",
    "Confirma a vaga quando disponível e coloca 1 crédito em reserva.",
  ],
  [
    "Lista de espera",
    "Aguarda liberação de vaga. Não reserva crédito enquanto você estiver na lista.",
  ],
  [
    "Check-in",
    "Registra sua chegada à atividade. Não substitui o resultado final de participação.",
  ],
  [
    "Participação",
    "É o estado concluído da atividade, separado das etapas anteriores.",
  ],
] as const;

export default async function AthleteAgendaPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const viewer = await requireAthleteViewer();
  const [snapshot, season, params] = await Promise.all([
    getAthleteSnapshotForViewer(viewer),
    getAthleteSeasonContextSnapshot(),
    searchParams,
  ]);
  const success = single(params.success);
  const error = single(params.error);
  const opportunityCount = snapshot.opportunities?.length ?? 0;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Temporada 1 · Meu jogo"
        title="Agenda"
        description="Encontre onde jogar nesta fase. Veja os próximos UR Plays e eventos, manifeste interesse quando fizer sentido e reserve somente quando a vaga estiver aberta para confirmação."
      />

      <Card className="border-ur-gold/30 bg-ur-gold/[.035]">
        <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
          Fase atual · {season.phaseLabel}
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-black">
              Encontre onde jogar nesta fase
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
              A Agenda mostra oportunidades publicadas para a temporada.
              Interesse, reserva, lista de espera, check-in e participação são
              estados diferentes e não devem ser tratados como equivalentes.
            </p>
          </div>
          <Link
            href="/athlete/season"
            className="text-ur-gold inline-flex min-h-11 items-center font-black"
          >
            Entender a temporada →
          </Link>
        </div>
      </Card>

      <Card>
        <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
          Do interesse à participação
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {agendaStates.map(([label, description]) => (
            <div key={label} className="rounded-ur border border-white/10 p-4">
              <p className="font-black">{label}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {viewer.isPreview && (
        <Card className="border-ur-gold/40">
          <p className="text-ur-gold text-sm font-bold">
            Prévia somente leitura: interesse, reserva e cancelamento estão
            desabilitados.
          </p>
        </Card>
      )}

      {success && !viewer.isPreview && (
        <Card className="border-ur-gold/40">
          <p className="text-ur-gold text-sm font-bold">
            {successMessages[success] ?? "Agenda atualizada."}
          </p>
        </Card>
      )}

      {error && !viewer.isPreview && (
        <Card className="border-red-500/40">
          <p className="text-sm font-bold text-red-300">
            {errorMessages[error] ?? errorMessages.transaction_failed}
          </p>
        </Card>
      )}

      {snapshot.identity && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Card>
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Oportunidades abertas
            </p>
            <p className="font-display text-ur-gold mt-2 text-2xl font-black">
              {opportunityCount}
            </p>
          </Card>
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
              Créditos utilizados
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
        <section className="grid gap-4" aria-labelledby="agenda-opportunities">
          <div>
            <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
              Próximas oportunidades
            </p>
            <h2 id="agenda-opportunities" className="mt-1 text-2xl font-black">
              Escolha onde continuar sua campanha
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.opportunities.map((opportunity) => (
              <AthleteOpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                availableCredits={snapshot.creditBalance ?? 0}
                readOnly={viewer.isPreview}
              />
            ))}
          </div>
        </section>
      ) : (
        <Card>
          <p className="font-bold">Nenhuma oportunidade futura disponível.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Novos UR Plays, treinos e eventos aparecerão aqui quando forem
            publicados. Você pode manter sua disponibilidade atualizada para o
            planejamento operacional, mas isso não cria vaga nem recomendação
            automática.
          </p>
          <Link
            href="/athlete/disponibilidade"
            className="text-ur-gold mt-4 inline-flex font-black"
          >
            Atualizar disponibilidade →
          </Link>
        </Card>
      )}

      <AthleteSourceHealth errors={snapshot.sourceErrors} />
    </div>
  );
}
