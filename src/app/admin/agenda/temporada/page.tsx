import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import {
  createQuarterSeasonAction,
  homologateQuarterSeasonAction,
} from "@/app/admin/agenda/temporada/actions";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminQuarterSeasonSnapshot } from "@/server/services/admin-quarter-season-service";

type Params = Promise<{
  season?: string | string[];
  success?: string | string[];
  error?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const successMessages: Record<string, string> = {
  season_created:
    "Temporada criada com 13 semanas oficiais e 3 macro-ciclos internos de compatibilidade.",
  season_homologated:
    "Temporada homologada. A semana atual passa a ser calculada pelo calendário oficial.",
};

const errorMessages: Record<string, string> = {
  invalid_request: "Revise nome, código e data inicial.",
  invalid_confirmation: "Digite HOMOLOGAR para confirmar a ativação institucional.",
  ADMIN_REQUIRED: "Essa operação exige perfil administrador.",
  INVALID_SEASON_NAME: "Nome de temporada inválido.",
  INVALID_SEASON_CODE:
    "Código inválido. Use letras minúsculas, números e hífens.",
  INVALID_SEASON_START: "Informe uma data inicial válida.",
  SEASON_CODE_EXISTS: "Já existe uma temporada com esse código.",
  SEASON_NOT_FOUND: "A temporada selecionada não existe mais.",
  SEASON_NOT_HOMOLOGATABLE:
    "A temporada não está em um estado que permita homologação.",
  SEASON_REQUIRES_THIRTEEN_WEEKS:
    "Gate bloqueado: a temporada precisa ter exatamente 13 semanas oficiais.",
  INVALID_SEASON_WEEK_PERIOD:
    "Uma ou mais semanas estão fora do período oficial da temporada.",
  SEASON_WEEKS_OVERLAP: "Há sobreposição entre semanas da temporada.",
  SEASON_WEEKS_NOT_CONTIGUOUS:
    "As 13 semanas precisam formar um calendário contínuo, sem lacunas.",
  SEASON_REQUIRES_THREE_COMPATIBILITY_CYCLES:
    "A camada de compatibilidade ainda exige 3 macro-ciclos internos.",
  INVALID_SEASON_CYCLE_PERIOD:
    "Um macro-ciclo interno está fora do período da temporada.",
  SEASON_CYCLES_OVERLAP: "Há sobreposição entre os macro-ciclos internos.",
  operation_failed:
    "A operação foi bloqueada. Nenhuma temporada deve ser criada parcialmente.",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export default async function QuarterSeasonPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireRole(["admin"]);
  const [snapshot, params] = await Promise.all([
    getAdminQuarterSeasonSnapshot(),
    searchParams,
  ]);
  const requestedSeasonId = single(params.season);
  const success = single(params.success);
  const error = single(params.error);
  const season =
    snapshot.seasons.find((item) => item.id === requestedSeasonId) ??
    snapshot.currentSeason;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Temporada"
        title="13 semanas oficiais"
        description="A semana é a unidade operacional do trimestre. O sistema gera o calendário completo a partir de uma única data inicial e mantém os 3 macro-ciclos antigos apenas como compatibilidade técnica."
        action={
          <Link
            href="/admin/agenda"
            className="rounded-ur flex min-h-11 items-center gap-2 border px-4 text-sm font-bold"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Agenda
          </Link>
        }
      />

      {success && successMessages[success] && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm font-bold text-emerald-200">
            {successMessages[success]}
          </p>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm font-bold text-red-200">
            {errorMessages[error] ?? errorMessages.operation_failed}
          </p>
        </Card>
      )}

      <Card className="border-ur-gold/25">
        <div className="flex items-start gap-3">
          <CalendarDays
            className="text-ur-gold mt-0.5 shrink-0"
            size={20}
            aria-hidden="true"
          />
          <div>
            <p className="font-bold">Regra operacional</p>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-zinc-500">
              A criação trimestral não pede data final, 13 semanas diferentes ou
              três ciclos manuais. Você define nome, código e primeiro dia. O
              sistema calcula W1–W13, posiciona Series, Cup, Legends e Virada e
              cria a compatibilidade interna necessária para os módulos antigos.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <Badge>1 · Criar</Badge>
          <h2 className="font-display mt-3 text-xl font-black uppercase">
            Nova temporada trimestral
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Nenhuma temporada é ativada automaticamente. Ela nasce em rascunho
            e só entra em operação após homologação explícita.
          </p>

          <form action={createQuarterSeasonAction} className="mt-5 grid gap-4">
            <Input id="quarter-name" name="name" label="Nome" required />
            <Input
              id="quarter-code"
              name="code"
              label="Código"
              placeholder="temporada-1"
              pattern="[a-z0-9][a-z0-9-]{1,31}"
              required
            />
            <Input
              id="quarter-start"
              name="startsOn"
              label="Primeiro dia da Semana 1"
              type="date"
              required
            />
            <Button type="submit">Gerar temporada de 13 semanas</Button>
          </form>
        </Card>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge>2 · Revisar e homologar</Badge>
              <h2 className="font-display mt-3 text-xl font-black uppercase">
                Gate da temporada
              </h2>
            </div>
            {season && <Badge>{season.status}</Badge>}
          </div>

          {snapshot.seasons.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {snapshot.seasons.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/agenda/temporada?season=${item.id}`}
                  className={`rounded-ur border px-3 py-2 text-xs font-bold ${season?.id === item.id ? "border-ur-gold text-ur-gold" : "text-zinc-500"}`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          )}

          {!season ? (
            <div className="rounded-ur mt-5 border border-dashed p-5 text-sm text-zinc-500">
              Nenhuma temporada trimestral foi criada ainda.
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-ur border p-3">
                  <p className="text-[10px] font-bold tracking-wider text-zinc-600 uppercase">
                    Semanas
                  </p>
                  <p className="font-display mt-2 text-2xl font-black">
                    {season.weeks.length}/13
                  </p>
                </div>
                <div className="rounded-ur border p-3">
                  <p className="text-[10px] font-bold tracking-wider text-zinc-600 uppercase">
                    Compatibilidade
                  </p>
                  <p className="font-display mt-2 text-2xl font-black">
                    {season.compatibilityCycles.length}/3
                  </p>
                </div>
                <div className="rounded-ur border p-3">
                  <p className="text-[10px] font-bold tracking-wider text-zinc-600 uppercase">
                    Semana atual
                  </p>
                  <p className="font-display mt-2 text-2xl font-black">
                    {season.currentWeek
                      ? `W${season.currentWeek.weekNumber}`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-ur border p-4 text-sm">
                <p className="font-bold">{season.name}</p>
                <p className="mt-1 text-zinc-500">
                  {dateFormatter.format(new Date(season.startsAt))} →{" "}
                  {dateFormatter.format(new Date(season.endsAt))}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {season.structureReady ? (
                    <>
                      <CheckCircle2
                        className="text-emerald-400"
                        size={16}
                        aria-hidden="true"
                      />
                      <span className="text-emerald-200">
                        Estrutura completa para homologação.
                      </span>
                    </>
                  ) : (
                    <>
                      <CircleAlert
                        className="text-amber-300"
                        size={16}
                        aria-hidden="true"
                      />
                      <span className="text-amber-200">
                        Estrutura incompleta. Homologação deve ser bloqueada.
                      </span>
                    </>
                  )}
                </div>
              </div>

              {season.status === "draft" ? (
                <form action={homologateQuarterSeasonAction} className="grid gap-3">
                  <input type="hidden" name="seasonId" value={season.id} />
                  <label className="grid gap-2 text-xs font-bold text-zinc-500 uppercase">
                    Confirmação institucional
                    <input
                      name="confirmation"
                      required
                      autoComplete="off"
                      placeholder="Digite HOMOLOGAR"
                      className="rounded-ur min-h-11 border bg-black/30 px-3 text-sm text-white"
                    />
                  </label>
                  <Button type="submit" disabled={!season.structureReady}>
                    Homologar temporada
                  </Button>
                </form>
              ) : (
                <div className="rounded-ur flex items-start gap-3 border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <CheckCircle2
                    className="mt-0.5 shrink-0 text-emerald-400"
                    size={18}
                    aria-hidden="true"
                  />
                  <p className="text-sm text-emerald-200">
                    Temporada homologada. O calendário oficial pode alimentar
                    Agenda, Command Center e UR Play.
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {season && season.weeks.length > 0 && (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-xl font-black uppercase">
                Timeline oficial
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Uma semana, um objetivo central e um gate de execução.
              </p>
            </div>
            <Badge>13 semanas</Badge>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {season.weeks.map((week) => {
              const active = season.currentWeek?.id === week.id;
              return (
                <div
                  key={week.id}
                  className={`rounded-ur border p-4 ${active ? "border-ur-gold/60 bg-ur-gold/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-ur-gold text-ur-black rounded-ur grid size-10 shrink-0 place-items-center font-black">
                        {week.weekNumber}
                      </div>
                      <div>
                        <p className="font-bold">{week.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {week.phase} · {week.primaryProduct ?? "Operação"}
                        </p>
                      </div>
                    </div>
                    <Badge>{active ? "agora" : week.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-500">
                    {week.objective}
                  </p>
                  <p className="mt-3 text-xs text-zinc-600">
                    {dateFormatter.format(new Date(week.startsAt))} →{" "}
                    {dateFormatter.format(new Date(week.endsAt))}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {season && (
        <Card>
          <div className="flex items-start gap-3">
            <LockKeyhole
              className="text-ur-gold mt-0.5 shrink-0"
              size={18}
              aria-hidden="true"
            />
            <div>
              <p className="font-bold">Macro-ciclos são internos</p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Os três registros abaixo existem apenas para compatibilidade com
                sessões e módulos legados. Eles não substituem W1–W13 no produto,
                no calendário ou na comunicação da temporada.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {season.compatibilityCycles.map((cycle) => (
                  <Badge key={cycle.id}>{cycle.name}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {snapshot.sourceErrors.length > 0 && (
        <Card className="border-red-500/30">
          <p className="font-bold text-red-200">Leitura parcial</p>
          <ul className="mt-2 grid gap-1 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((sourceError) => (
              <li key={sourceError}>{sourceError}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
