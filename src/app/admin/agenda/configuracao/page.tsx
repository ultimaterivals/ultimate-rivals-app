import { ArrowLeft, DatabaseZap, MapPinned, Settings2 } from "lucide-react";
import Link from "next/link";
import {
  configureCycleAction,
  createPoleAction,
  createSeasonAction,
  createVenueWithCourtAction,
} from "@/app/admin/agenda/configuracao/actions";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminOperationalSetupSnapshot } from "@/server/services/admin-operational-setup-service";

type Params = Promise<{
  success?: string | string[];
  error?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const successMessages: Record<string, string> = {
  season_created:
    "Temporada criada em rascunho. Os três ciclos-base foram gerados automaticamente pelo banco.",
  cycle_configured: "Ciclo configurado e mantido em estado planejado.",
  pole_created: "Polo criado em rascunho.",
  venue_created: "Local e primeira quadra criados em rascunho.",
};

const errorMessages: Record<string, string> = {
  invalid_request: "Revise os campos enviados.",
  ADMIN_REQUIRED: "Essa configuração exige perfil administrador.",
  INVALID_SEASON_NAME: "Nome de temporada inválido.",
  INVALID_SEASON_CODE:
    "Código inválido. Use letras minúsculas, números e hífens.",
  INVALID_SEASON_PERIOD: "O período da temporada é inválido.",
  INCOMPLETE_REGISTRATION_PERIOD:
    "Preencha início e fim das inscrições, ou deixe os dois vazios.",
  INVALID_REGISTRATION_PERIOD: "O período de inscrições é inválido.",
  INVALID_RANKING_CUTOFF:
    "O corte do ranking precisa estar dentro da temporada.",
  SEASON_NOT_FOUND: "A temporada selecionada não existe mais.",
  INVALID_CYCLE_NUMBER: "O ciclo deve estar entre 1 e 3.",
  INVALID_CYCLE_NAME: "Nome do ciclo inválido.",
  INVALID_CYCLE_PERIOD: "O período do ciclo é inválido.",
  CYCLE_OUTSIDE_SEASON: "O ciclo precisa ficar totalmente dentro da temporada.",
  INVALID_POLE_NAME: "Nome do polo inválido.",
  INVALID_POLE_SLUG: "Slug inválido. Use letras minúsculas, números e hífens.",
  INVALID_POLE_CITY: "Cidade do polo inválida.",
  INVALID_POLE_STATE: "UF do polo inválida.",
  POLE_NOT_FOUND: "O polo selecionado não existe mais.",
  INVALID_VENUE_NAME: "Nome do local inválido.",
  INVALID_COURT_NAME: "Nome da quadra inválido.",
  INVALID_VENUE_STATE: "UF do local inválida.",
  setup_failed:
    "A operação foi bloqueada. Nenhum dado deve ser criado parcialmente.",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function OperationalSetupPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireRole(["admin"]);
  const [snapshot, params] = await Promise.all([
    getAdminOperationalSetupSnapshot(),
    searchParams,
  ]);
  const success = single(params.success);
  const error = single(params.error);
  const seasons = snapshot.seasons ?? [];
  const cycles = snapshot.cycles ?? [];
  const poles = snapshot.poles ?? [];
  const venues = snapshot.venues ?? [];
  const courts = snapshot.courts ?? [];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Administração"
        title="Setup Operacional"
        description="Crie a infraestrutura mínima da temporada em ordem controlada. Nada é ativado automaticamente: temporada, polos, locais e quadras nascem em rascunho/planejado."
        action={
          <Link
            href="/admin/agenda"
            className="rounded-ur flex min-h-11 items-center gap-2 border px-4 text-sm font-bold"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Agenda
          </Link>
        }
      />

      {success && (
        <Card className="border-ur-gold/40">
          <p className="text-ur-gold text-sm font-bold">
            {successMessages[success] ?? "Configuração atualizada."}
          </p>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/40">
          <p className="text-sm font-bold text-red-300">
            {errorMessages[error] ?? errorMessages.setup_failed}
          </p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Temporadas", seasons.length],
          ["Ciclos", cycles.length],
          ["Polos", poles.length],
          ["Locais", venues.length],
          ["Quadras", courts.length],
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              {label}
            </p>
            <p className="font-display mt-2 text-3xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="border-ur-gold/25">
        <div className="flex items-start gap-3">
          <Settings2
            className="text-ur-gold mt-0.5"
            size={20}
            aria-hidden="true"
          />
          <div>
            <p className="font-bold">Ordem recomendada</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              1. Temporada → 2. revisar/configurar os 3 ciclos → 3. polos → 4.
              locais + primeira quadra → 5. somente depois abrir oportunidades,
              eventos e sessões UR Play.
            </p>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-5">
            <Badge>1 · Temporada</Badge>
            <h2 className="font-display mt-3 text-xl font-black uppercase">
              Criar temporada em rascunho
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              O banco gera automaticamente três ciclos-base. Datas abaixo são
              interpretadas no horário de São Paulo.
            </p>
          </div>
          <form action={createSeasonAction} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="season-name" name="name" label="Nome" required />
              <Input
                id="season-code"
                name="code"
                label="Código"
                placeholder="temporada-1"
                pattern="[a-z0-9][a-z0-9-]{1,31}"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="season-start"
                name="startsAt"
                label="Início"
                type="datetime-local"
                required
              />
              <Input
                id="season-end"
                name="endsAt"
                label="Fim"
                type="datetime-local"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="registration-start"
                name="registrationStartsAt"
                label="Abertura das inscrições (opcional)"
                type="datetime-local"
              />
              <Input
                id="registration-end"
                name="registrationEndsAt"
                label="Fechamento das inscrições (opcional)"
                type="datetime-local"
              />
            </div>
            <Input
              id="ranking-cutoff"
              name="rankingCutoffAt"
              label="Corte final do ranking (opcional)"
              type="datetime-local"
            />
            <Button type="submit">Criar temporada</Button>
          </form>
        </Card>

        <Card>
          <div className="mb-5">
            <Badge>2 · Ciclos</Badge>
            <h2 className="font-display mt-3 text-xl font-black uppercase">
              Configurar ciclo existente
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              A criação da temporada gera ciclos 1, 2 e 3. Este formulário
              ajusta nome e período sem duplicar registros.
            </p>
          </div>
          {seasons.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Crie a temporada antes de configurar ciclos.
            </p>
          ) : (
            <form action={configureCycleAction} className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Temporada
                <select
                  name="seasonId"
                  className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
                  required
                >
                  {seasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                <label className="grid gap-2 text-sm font-medium">
                  Número
                  <select
                    name="cycleNumber"
                    className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
                    defaultValue="1"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </label>
                <Input id="cycle-name" name="name" label="Nome" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="cycle-start"
                  name="startsAt"
                  label="Início"
                  type="datetime-local"
                  required
                />
                <Input
                  id="cycle-end"
                  name="endsAt"
                  label="Fim"
                  type="datetime-local"
                  required
                />
              </div>
              <Button type="submit">Configurar ciclo</Button>
            </form>
          )}
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-5">
            <Badge>3 · Polos</Badge>
            <h2 className="font-display mt-3 text-xl font-black uppercase">
              Criar polo
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              O polo nasce em rascunho; ativação fica para um gate posterior.
            </p>
          </div>
          <form action={createPoleAction} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="pole-name" name="name" label="Nome" required />
              <Input
                id="pole-slug"
                name="slug"
                label="Slug"
                placeholder="contagem"
                pattern="[a-z0-9][a-z0-9-]{1,63}"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
              <Input id="pole-city" name="city" label="Cidade" required />
              <Input
                id="pole-state"
                name="state"
                label="UF"
                maxLength={2}
                required
              />
            </div>
            <Button type="submit">Criar polo</Button>
          </form>
        </Card>

        <Card>
          <div className="mb-5">
            <Badge>4 · Local e quadra</Badge>
            <h2 className="font-display mt-3 text-xl font-black uppercase">
              Criar local + primeira quadra
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Nesta primeira versão, a quadra é criada explicitamente como Vôlei
              de Praia, modalidade já existente no schema atual.
            </p>
          </div>
          {poles.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Crie pelo menos um polo antes de cadastrar um local.
            </p>
          ) : (
            <form action={createVenueWithCourtAction} className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Polo
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
              <Input
                id="venue-name"
                name="venueName"
                label="Nome do local"
                required
              />
              <Input
                id="venue-address"
                name="addressLine"
                label="Endereço (opcional)"
              />
              <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
                <Input
                  id="venue-city"
                  name="city"
                  label="Cidade (vazio = herda do polo)"
                />
                <Input id="venue-state" name="state" label="UF" maxLength={2} />
              </div>
              <Input
                id="court-name"
                name="courtName"
                label="Nome da primeira quadra"
                placeholder="Quadra 1"
                required
              />
              <Button type="submit">Criar local e quadra</Button>
            </form>
          )}
        </Card>
      </section>

      {(seasons.length > 0 || poles.length > 0 || venues.length > 0) && (
        <section className="grid gap-4">
          <div className="flex items-center gap-3">
            <MapPinned className="text-ur-gold" size={20} aria-hidden="true" />
            <div>
              <h2 className="font-display text-xl font-black uppercase">
                Base cadastrada
              </h2>
              <p className="text-sm text-zinc-500">
                Apenas entidades reais já gravadas aparecem abaixo.
              </p>
            </div>
          </div>

          {seasons.map((season) => (
            <Card key={season.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{season.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {season.code} ·{" "}
                    {dateFormatter.format(new Date(season.startsAt))} →{" "}
                    {dateFormatter.format(new Date(season.endsAt))}
                  </p>
                </div>
                <Badge>{season.status}</Badge>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {cycles
                  .filter((cycle) => cycle.seasonId === season.id)
                  .sort((a, b) => a.cycleNumber - b.cycleNumber)
                  .map((cycle) => (
                    <div key={cycle.id} className="rounded-ur border p-3">
                      <p className="text-xs font-bold text-zinc-500 uppercase">
                        Ciclo {cycle.cycleNumber}
                      </p>
                      <p className="mt-1 font-bold">{cycle.name}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {cycle.status}
                      </p>
                    </div>
                  ))}
              </div>
            </Card>
          ))}

          {poles.map((pole) => (
            <Card key={pole.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{pole.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {pole.city}/{pole.state} · {pole.slug}
                  </p>
                </div>
                <Badge>{pole.status}</Badge>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {venues
                  .filter((venue) => venue.poleId === pole.id)
                  .map((venue) => {
                    const venueCourts = courts.filter(
                      (court) => court.venueId === venue.id,
                    );
                    return (
                      <div key={venue.id} className="rounded-ur border p-3">
                        <p className="font-bold">{venue.name}</p>
                        <p className="mt-1 text-xs text-zinc-600">
                          {venue.city}/{venue.state} · {venueCourts.length}{" "}
                          quadra(s)
                        </p>
                      </div>
                    );
                  })}
              </div>
            </Card>
          ))}
        </section>
      )}

      {snapshot.sourceErrors.length > 0 && (
        <Card>
          <div className="flex items-start gap-3">
            <DatabaseZap
              className="text-ur-gold mt-0.5"
              size={18}
              aria-hidden="true"
            />
            <div>
              <p className="font-bold">Leitura parcial do Setup</p>
              <ul className="mt-2 grid gap-1 text-sm text-zinc-500">
                {snapshot.sourceErrors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
