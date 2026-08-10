import { ArrowLeft, RadioTower } from "lucide-react";
import Link from "next/link";
import { createDemandOpportunityAction } from "@/app/admin/agenda/nova-oportunidade/actions";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminOperationalSetupSnapshot } from "@/server/services/admin-operational-setup-service";

type Params = Promise<{ error?: string | string[] }>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const errorMessages: Record<string, string> = {
  invalid_request: "Revise os campos enviados.",
  INVALID_OPPORTUNITY_TYPE: "Tipo de oportunidade inválido.",
  INVALID_OPPORTUNITY_TITLE: "Título inválido.",
  INVALID_OPPORTUNITY_PERIOD: "O período informado é inválido.",
  OPPORTUNITY_MUST_BE_FUTURE: "A oportunidade precisa estar no futuro.",
  INVALID_FORMAT_CODE: "Formato inválido.",
  INVALID_CATEGORY_CODE: "Categoria inválida.",
  INVALID_FORMATION_TARGET: "A meta/máximo de formações é inválida.",
  INVALID_OPPORTUNITY_CAPACITY: "Capacidade de atletas inválida.",
  INVALID_COURT_COUNT: "Quantidade de quadras inválida.",
  INVALID_TRAINING_MINIMUM: "Mínimo de atletas para treino inválido.",
  POLE_NOT_FOUND: "O polo selecionado não existe.",
  POLE_NOT_ACTIVE: "O polo precisa ser homologado antes de abrir demanda.",
  VENUE_NOT_FOUND: "O local selecionado não existe.",
  VENUE_POLE_MISMATCH: "O local não pertence ao polo selecionado.",
  VENUE_NOT_ACTIVE: "O local ainda não está ativo.",
  COURT_REQUIRES_VENUE: "Selecione o local antes de selecionar a quadra.",
  COURT_NOT_FOUND: "A quadra selecionada não existe.",
  COURT_VENUE_MISMATCH: "A quadra não pertence ao local selecionado.",
  COURT_NOT_ACTIVE: "A quadra ainda não está ativa.",
  opportunity_failed:
    "A criação foi bloqueada; nenhum registro parcial deve existir.",
};

export default async function NewOpportunityPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireRole(["admin"]);
  const [snapshot, params] = await Promise.all([
    getAdminOperationalSetupSnapshot(),
    searchParams,
  ]);
  const error = single(params.error);
  const poles = (snapshot.poles ?? []).filter(
    (pole) => pole.status === "active",
  );
  const poleIds = new Set(poles.map((pole) => pole.id));
  const venues = (snapshot.venues ?? []).filter(
    (venue) => venue.status === "active" && poleIds.has(venue.poleId),
  );
  const venueIds = new Set(venues.map((venue) => venue.id));
  const courts = (snapshot.courts ?? []).filter(
    (court) => court.status === "active" && venueIds.has(court.venueId),
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Demanda"
        title="Nova oportunidade"
        description="Abra uma janela de interesse antes de confirmar uma sessão. A criação não reserva vaga, não segura crédito e começa em coleta de interesse."
        action={
          <Link
            href="/admin/agenda"
            className="rounded-ur flex min-h-11 items-center gap-2 border px-4 text-sm font-bold"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Agenda
          </Link>
        }
      />

      {error && (
        <Card className="border-red-500/40">
          <p className="text-sm font-bold text-red-300">
            {errorMessages[error] ?? errorMessages.opportunity_failed}
          </p>
        </Card>
      )}

      <Card className="border-ur-gold/25">
        <div className="flex items-start gap-3">
          <RadioTower
            className="text-ur-gold mt-0.5"
            size={20}
            aria-hidden="true"
          />
          <div>
            <p className="font-bold">Disponibilidade → interesse → reserva</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Esta tela cria somente a segunda etapa: uma oportunidade oficial
              para medir interesse. A confirmação da sessão e abertura de
              reservas será outro gate operacional.
            </p>
          </div>
        </div>
      </Card>

      {poles.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhum polo homologado.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Complete o Setup e homologue o conjunto polo + local + quadra antes
            de abrir uma oportunidade.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/agenda/configuracao"
              className="rounded-ur min-h-11 border px-4 py-3 text-sm font-bold"
            >
              Abrir Setup
            </Link>
            <Link
              href="/admin/agenda/homologacao"
              className="rounded-ur min-h-11 border px-4 py-3 text-sm font-bold"
            >
              Homologar polos
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <form action={createDemandOpportunityAction} className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Tipo
                <select
                  name="opportunityType"
                  defaultValue="ur_play"
                  className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
                >
                  <option value="ur_play">UR Play</option>
                  <option value="training">Treino</option>
                </select>
              </label>
              <Input
                id="opportunity-title"
                name="title"
                label="Título"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="opportunity-start"
                name="startsAt"
                type="datetime-local"
                label="Início"
                required
              />
              <Input
                id="opportunity-end"
                name="endsAt"
                type="datetime-local"
                label="Fim"
                required
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium">
                Polo homologado
                <select
                  name="poleId"
                  className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
                  required
                >
                  {poles.map((pole) => (
                    <option key={pole.id} value={pole.id}>
                      {pole.name} · {pole.city}/{pole.state}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Local (opcional)
                <select
                  name="venueId"
                  defaultValue=""
                  className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
                >
                  <option value="">Definir depois</option>
                  {venues.map((venue) => {
                    const pole = poles.find((item) => item.id === venue.poleId);
                    return (
                      <option key={venue.id} value={venue.id}>
                        {venue.name} · {pole?.name ?? "polo"}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Quadra (opcional)
                <select
                  name="courtId"
                  defaultValue=""
                  className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
                >
                  <option value="">Definir depois</option>
                  {courts.map((court) => {
                    const venue = venues.find(
                      (item) => item.id === court.venueId,
                    );
                    return (
                      <option key={court.id} value={court.id}>
                        {court.name} · {venue?.name ?? "local"}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium">
                Nível
                <select
                  name="level"
                  defaultValue=""
                  className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
                >
                  <option value="">Aberto</option>
                  <option value="leveling">Em nivelamento</option>
                  <option value="n3">N3</option>
                  <option value="n2">N2</option>
                  <option value="n1">N1</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Formato
                <select
                  name="formatCode"
                  defaultValue="doubles"
                  className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
                >
                  <option value="">Aberto</option>
                  <option value="doubles">Duplas</option>
                  <option value="fours">Quartetos</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Categoria
                <select
                  name="categoryCode"
                  defaultValue=""
                  className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
                >
                  <option value="">Aberta</option>
                  <option value="female">Feminino</option>
                  <option value="male">Masculino</option>
                  <option value="mixed">Misto</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                id="target-formations"
                name="targetFormations"
                type="number"
                min={1}
                max={24}
                defaultValue={4}
                label="Meta formações"
                required
              />
              <Input
                id="max-formations"
                name="maxFormations"
                type="number"
                min={1}
                max={24}
                defaultValue={4}
                label="Máx. formações"
                required
              />
              <Input
                id="capacity-athletes"
                name="capacityAthletes"
                type="number"
                min={2}
                max={96}
                defaultValue={8}
                label="Capacidade atletas"
                required
              />
              <Input
                id="court-count"
                name="courtCount"
                type="number"
                min={1}
                max={8}
                defaultValue={1}
                label="Qtd. quadras"
                required
              />
              <Input
                id="training-min-athletes"
                name="trainingMinAthletes"
                type="number"
                min={1}
                max={96}
                label="Mín. treino (opc.)"
              />
            </div>

            <div className="rounded-ur border p-4 text-sm leading-6 text-zinc-500">
              Ao salvar, a oportunidade entra em{" "}
              <strong>coleta de interesse</strong>. Atletas podem sinalizar
              intenção, mas ainda não conseguem reservar vaga nem gastar
              crédito.
            </div>

            <Button type="submit">Abrir coleta de interesse</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
