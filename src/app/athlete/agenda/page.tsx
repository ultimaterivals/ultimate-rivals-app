import { CalendarClock, ChevronRight, Clock3, MapPin, UsersRound } from "lucide-react";
import Link from "next/link";
import { AthleteAvailabilityForm } from "@/components/athlete/athlete-availability-form";
import { AthleteOpportunityCard } from "@/components/athlete/athlete-opportunity-card";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Card } from "@/components/ui";
import { AGENDA_TIME_ZONE } from "@/features/admin-agenda/config";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteAvailabilitySnapshot } from "@/server/services/athlete-availability-service";
import { getAthleteSeasonContextSnapshot } from "@/server/services/athlete-season-context-service";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

type Params = Promise<{
  success?: string | string[];
  error?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: AGENDA_TIME_ZONE,
  weekday: "long",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const successMessages: Record<string, string> = {
  interest_saved: "Interesse registrado. Isso ainda não é uma reserva.",
  interest_removed: "Interesse retirado.",
  reserved: "Reserva confirmada pelo sistema.",
  waitlisted: "Você entrou na lista de espera. Nenhum crédito foi reservado agora.",
  cancelled: "Reserva cancelada conforme o retorno do sistema.",
  cancelled_consumed:
    "Reserva cancelada fora da janela gratuita. O crédito foi consumido conforme a regra da sessão.",
};

const errorMessages: Record<string, string> = {
  invalid_request: "A solicitação enviada é inválida.",
  ATHLETE_PROFILE_REQUIRED: "Seu cadastro esportivo ainda não está vinculado à conta.",
  OPPORTUNITY_NOT_FOUND: "Essa oportunidade não está mais disponível.",
  OPPORTUNITY_NOT_ACCEPTING_INTEREST:
    "Essa oportunidade não está mais recebendo manifestações de interesse.",
  OPPORTUNITY_ALREADY_STARTED: "A atividade já começou.",
  INVALID_INTEREST_MODE: "O tipo de interesse informado não é válido.",
  OPPORTUNITY_NOT_RESERVABLE: "As reservas dessa atividade ainda não estão abertas.",
  OPPORTUNITY_ALREADY_STARTED_OR_UNSCHEDULED:
    "Essa atividade não possui uma janela válida para reserva.",
  NO_AVAILABLE_CREDITS: "Você não possui crédito disponível para confirmar essa vaga.",
  RESERVATION_NOT_FOUND: "A reserva não foi encontrada.",
  RESERVATION_ACCESS_DENIED: "Essa reserva não pertence à sua conta.",
  RESERVATION_ALREADY_CONSUMED:
    "Essa participação já foi consumida e não pode ser cancelada.",
  RESERVATION_CREDIT_HOLD_NOT_FOUND:
    "Não encontramos o crédito vinculado à reserva. A operação foi bloqueada para evitar saldo incorreto.",
  transaction_failed: "Não foi possível concluir a operação. Nenhum saldo deve ser alterado.",
};

function reservationLabel(status: string | null | undefined) {
  switch (status) {
    case "reserved":
    case "confirmed":
      return "Reserva confirmada";
    case "waitlisted":
      return "Lista de espera";
    case "checked_in":
      return "Check-in realizado";
    case "consumed":
      return "Participação concluída";
    case "no_show":
      return "Ausência registrada";
    default:
      return null;
  }
}

export default async function AthleteAgendaPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const viewer = await requireAthleteViewer();
  const [snapshot, availability, season, params] = await Promise.all([
    getAthleteSnapshotForViewer(viewer),
    getAthleteAvailabilitySnapshot(
      viewer.isPreview ? { athleteId: viewer.athleteId } : { userId: viewer.userId },
    ),
    getAthleteSeasonContextSnapshot(),
    searchParams,
  ]);

  const success = single(params.success);
  const error = single(params.error);
  const next = snapshot.nextReservation;
  const opportunities = snapshot.opportunities ?? [];
  const creditsKnown = snapshot.creditBalance !== null;

  return (
    <div className="mx-auto grid max-w-7xl gap-10 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-ur-gold/30 bg-[radial-gradient(circle_at_top_right,rgba(212,168,59,.14),transparent_42%),linear-gradient(145deg,#111,#080808)] p-6 sm:p-8 lg:p-10">
        <p className="text-[.65rem] font-black tracking-[.24em] text-ur-gold uppercase">
          Jogar · {season.phaseLabel}
        </p>
        <div className="mt-3 grid gap-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <h1 className="font-display text-5xl font-black tracking-tight uppercase sm:text-6xl">
              Entre em quadra
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Escolha seu próximo jogo, acompanhe sua reserva e mantenha sua disponibilidade atualizada. Interesse, reserva, lista de espera, check-in e participação continuam sendo estados diferentes.
            </p>
          </div>
          <div className="grid gap-2 text-sm text-zinc-400 sm:grid-cols-2 lg:grid-cols-1">
            <Link href="#oportunidades" className="flex min-h-12 items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] px-4 font-black text-white">
              Oportunidades para jogar <ChevronRight size={18} aria-hidden="true" />
            </Link>
            <Link href="#disponibilidade" className="flex min-h-12 items-center justify-between rounded-2xl border border-white/10 bg-white/[.02] px-4 font-black">
              Quando você pode jogar <ChevronRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {viewer.isPreview ? (
        <Card className="border-ur-gold/35 bg-ur-gold/[.035]">
          <p className="text-sm font-bold text-ur-gold">
            Prévia somente leitura. Interesse, reserva, cancelamento e alterações de disponibilidade estão desabilitados.
          </p>
        </Card>
      ) : null}

      {success && !viewer.isPreview ? (
        <Card className="border-ur-gold/35">
          <p className="text-sm font-bold text-ur-gold">
            {successMessages[success] ?? "Jornada de jogo atualizada."}
          </p>
        </Card>
      ) : null}

      {error && !viewer.isPreview ? (
        <Card className="border-red-500/40">
          <p className="text-sm font-bold text-red-300">
            {errorMessages[error] ?? errorMessages.transaction_failed}
          </p>
        </Card>
      ) : null}

      {next ? (
        <section className="grid gap-4" aria-labelledby="next-game-title">
          <div>
            <p className="text-[.64rem] font-black tracking-[.2em] text-ur-gold uppercase">Seu próximo jogo</p>
            <h2 id="next-game-title" className="font-display mt-1 text-3xl font-black uppercase sm:text-4xl">
              {next.title}
            </h2>
          </div>
          <div className="grid gap-5 rounded-[1.8rem] border border-ur-gold/30 bg-ur-gold/[.03] p-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
              {next.startsAt ? (
                <p className="flex items-center gap-2"><CalendarClock size={17} className="text-ur-gold" aria-hidden="true" />{dateFormatter.format(new Date(next.startsAt))}</p>
              ) : null}
              <p className="flex items-center gap-2"><MapPin size={17} className="text-ur-gold" aria-hidden="true" />{[next.poleName, next.venueName].filter(Boolean).join(" · ") || "Local ainda não publicado"}</p>
              {next.formatCode ? <p className="flex items-center gap-2"><UsersRound size={17} className="text-ur-gold" aria-hidden="true" />{next.formatCode}</p> : null}
              <p className="flex items-center gap-2 font-black text-ur-gold"><Clock3 size={17} aria-hidden="true" />{reservationLabel(next.personalReservationStatus) ?? "Estado disponível na agenda"}</p>
            </div>
            <Link href="#oportunidades" className="inline-flex min-h-12 items-center justify-center rounded-full bg-ur-gold px-5 text-sm font-black text-black">
              Ver detalhes
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-[1.75rem] border border-white/8 bg-white/[.02] p-6">
          <p className="text-[.64rem] font-black tracking-[.2em] text-zinc-500 uppercase">Seu próximo jogo</p>
          <h2 className="font-display mt-2 text-2xl font-black uppercase">Nenhum compromisso confirmado</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Isso não significa que não existam oportunidades. Consulte as atividades abertas abaixo e acompanhe o estado real de cada inscrição.
          </p>
        </section>
      )}

      <section id="oportunidades" className="scroll-mt-28 grid gap-5" aria-labelledby="opportunities-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[.64rem] font-black tracking-[.2em] text-ur-gold uppercase">Agora</p>
            <h2 id="opportunities-title" className="font-display mt-1 text-3xl font-black uppercase">Oportunidades para jogar</h2>
          </div>
          <span className="text-xs font-black text-zinc-600">{opportunities.length} publicada(s)</span>
        </div>

        {!snapshot.identity ? (
          <Card>
            <p className="font-bold">Perfil de atleta ainda não vinculado.</p>
            <p className="mt-2 text-sm text-zinc-500">As ações de jogo ficam disponíveis somente depois do vínculo com seu cadastro esportivo oficial.</p>
          </Card>
        ) : opportunities.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {opportunities.map((opportunity) => (
              <AthleteOpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                availableCredits={snapshot.creditBalance}
                readOnly={viewer.isPreview}
              />
            ))}
          </div>
        ) : (
          <Card>
            <p className="font-bold">Nenhuma oportunidade aberta no momento.</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Quando uma nova atividade for publicada para sua jornada, ela aparecerá aqui. Sua disponibilidade ajuda o planejamento, mas não cria vaga nem reserva automática.
            </p>
          </Card>
        )}

        {!creditsKnown ? (
          <p className="text-xs leading-5 text-zinc-600">
            A fonte de créditos está indisponível. O App não assume saldo zero e o estado econômico não é usado como informação confiável até a fonte responder.
          </p>
        ) : null}
      </section>

      <section id="disponibilidade" className="scroll-mt-28 grid gap-5" aria-labelledby="availability-title">
        <div>
          <p className="text-[.64rem] font-black tracking-[.2em] text-ur-gold uppercase">Planejamento</p>
          <h2 id="availability-title" className="font-display mt-1 text-3xl font-black uppercase">Quando você pode jogar?</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
            Registre suas janelas recorrentes. Disponibilidade é preferência operacional: não garante sessão, não reserva vaga, não consome crédito e não confirma participação.
          </p>
        </div>

        {!availability.athleteId ? (
          <Card><p className="text-sm text-zinc-500">A disponibilidade será liberada depois que sua conta estiver vinculada ao cadastro oficial de atleta.</p></Card>
        ) : viewer.isPreview ? (
          availability.windows.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availability.windows.map((window) => (
                <Card key={window.id}>
                  <p className="font-black">Dia {window.dayOfWeek}</p>
                  <p className="mt-2 text-lg font-black">{window.startsAt.slice(0, 5)}–{window.endsAt.slice(0, 5)}</p>
                  <p className="mt-2 text-sm text-zinc-500">{window.poleName ?? "Qualquer polo"}</p>
                </Card>
              ))}
            </div>
          ) : (
            <Card><p className="text-sm text-zinc-500">Nenhuma janela de disponibilidade ativa cadastrada.</p></Card>
          )
        ) : (
          <AthleteAvailabilityForm snapshot={availability} />
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/athlete/arenas" className="rounded-[1.5rem] border border-white/8 bg-white/[.02] p-5">
          <MapPin className="text-ur-gold" size={20} aria-hidden="true" />
          <p className="mt-4 font-display text-xl font-black uppercase">Arenas da sua jornada</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Veja somente locais associados a oportunidades oficiais e mídia publicada.</p>
        </Link>
        <Link href="/athlete/results" className="rounded-[1.5rem] border border-white/8 bg-white/[.02] p-5">
          <CalendarClock className="text-ur-gold" size={20} aria-hidden="true" />
          <p className="mt-4 font-display text-xl font-black uppercase">Jogos que já aconteceram</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Resultados e histórico homologado continuam separados da jornada de entrada em quadra.</p>
        </Link>
      </section>

      <AthleteSourceHealth errors={[...snapshot.sourceErrors, ...availability.sourceErrors]} />
    </div>
  );
}
