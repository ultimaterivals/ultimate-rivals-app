from pathlib import Path

path = Path("src/app/admin/agenda/confirmacao/page.tsx")
text = path.read_text()

replacements = [
    (
        'import { ArrowLeft, CalendarCheck2, ShieldCheck } from "lucide-react";',
        'import { ArrowLeft, CalendarCheck2, CheckCircle2, CircleAlert } from "lucide-react";',
    ),
    (
        'import {\n  confirmUrPlayOpportunityAction,\n  homologateSeasonAction,\n} from "@/app/admin/agenda/confirmacao/actions";',
        'import { confirmUrPlayOpportunityAction } from "@/app/admin/agenda/confirmacao/actions";',
    ),
    (
        'import { getAdminOperationalSetupSnapshot } from "@/server/services/admin-operational-setup-service";\n',
        'import { getAdminOperationalSetupSnapshot } from "@/server/services/admin-operational-setup-service";\nimport { getAdminQuarterSeasonSnapshot } from "@/server/services/admin-quarter-season-service";\n',
    ),
    (
        '  const [setup, confirmation, params] = await Promise.all([\n    getAdminOperationalSetupSnapshot(),\n    getAdminSessionConfirmationSnapshot(),\n    searchParams,\n  ]);',
        '  const [setup, quarter, confirmation, params] = await Promise.all([\n    getAdminOperationalSetupSnapshot(),\n    getAdminQuarterSeasonSnapshot(),\n    getAdminSessionConfirmationSnapshot(),\n    searchParams,\n  ]);',
    ),
    (
        '  const seasons = setup.seasons ?? [];\n  const cycles = setup.cycles ?? [];\n  const poles = setup.poles ?? [];\n  const venues = setup.venues ?? [];\n  const courts = setup.courts ?? [];\n  const opportunities = confirmation.opportunities ?? [];\n  const readySeasons = seasons.filter((season) =>\n    ["registration", "active"].includes(season.status),\n  );',
        '  const cycles = setup.cycles ?? [];\n  const poles = setup.poles ?? [];\n  const venues = setup.venues ?? [];\n  const courts = setup.courts ?? [];\n  const opportunities = confirmation.opportunities ?? [];\n  const season = quarter.currentSeason;\n  const seasonReady = Boolean(\n    season?.structureReady && ["registration", "active"].includes(season.status),\n  );\n  const readySeasonIds = new Set(seasonReady && season ? [season.id] : []);',
    ),
]

for old, new in replacements:
    if text.count(old) != 1:
        raise SystemExit(f"expected exactly one replacement for: {old[:80]!r}")
    text = text.replace(old, new)

# Remove the stale success card from the pre-C27 season homologation flow.
start = text.find('      {success === "season_homologated" && (')
if start >= 0:
    end = text.find("      {error && (", start)
    if end < 0:
        raise SystemExit("could not locate end of stale success card")
    text = text[:start] + text[end:]

# Replace the old user-facing three-cycle season block with the W1-W13 source of truth.
start_marker = '''      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-xl font-black uppercase">
            Temporadas
          </h2>'''
next_marker = '''      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-xl font-black uppercase">
            Demandas aguardando confirmação
          </h2>'''
start = text.find(start_marker)
end = text.find(next_marker)
if start < 0 or end < 0 or end <= start:
    raise SystemExit("could not locate legacy season section")

replacement = '''      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-xl font-black uppercase">
            Temporada operacional
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            W1–W13 são a estrutura oficial. Esta tela apenas confirma sessões
            dentro de uma temporada já homologada.
          </p>
        </div>
        {!season ? (
          <Card>
            <div className="flex items-start gap-3">
              <CircleAlert
                className="mt-0.5 text-amber-300"
                size={18}
                aria-hidden="true"
              />
              <div>
                <p className="font-bold">Nenhuma temporada trimestral criada.</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Crie e homologue W1–W13 antes de converter uma oportunidade em
                  sessão oficial.
                </p>
                <Link
                  href="/admin/agenda/temporada"
                  className="text-ur-gold mt-3 inline-block text-sm font-bold"
                >
                  Abrir temporada 13 semanas →
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <Card
            className={
              seasonReady ? "border-emerald-500/25" : "border-amber-500/25"
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {seasonReady ? (
                  <CheckCircle2
                    className="mt-0.5 text-emerald-400"
                    size={18}
                    aria-hidden="true"
                  />
                ) : (
                  <CircleAlert
                    className="mt-0.5 text-amber-300"
                    size={18}
                    aria-hidden="true"
                  />
                )}
                <div>
                  <p className="font-bold">{season.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {season.weeks.length}/13 semanas · status {season.status}
                    {season.currentWeek
                      ? ` · W${season.currentWeek.weekNumber} ${season.currentWeek.name}`
                      : ""}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    Os 3 macro-ciclos existem somente para compatibilidade técnica
                    ao vincular a sessão.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{seasonReady ? "homologada" : "pendente"}</Badge>
                <Link
                  href={`/admin/agenda/temporada?season=${season.id}`}
                  className="rounded-ur border px-3 py-2 text-xs font-bold text-zinc-300"
                >
                  Revisar temporada
                </Link>
              </div>
            </div>
          </Card>
        )}
      </section>

'''
text = text[:start] + replacement + text[end:]

old_cycle_filter = '''              const validCycles = cycles.filter((cycle) => {
                const season = readySeasons.find(
                  (item) => item.id === cycle.seasonId,
                );
                return (
                  season &&
                  ["planned", "active"].includes(cycle.status) &&'''
new_cycle_filter = '''              const validCycles = cycles.filter((cycle) => {
                return (
                  readySeasonIds.has(cycle.seasonId) &&
                  ["planned", "active"].includes(cycle.status) &&'''
if text.count(old_cycle_filter) != 1:
    raise SystemExit("could not locate valid cycle filter")
text = text.replace(old_cycle_filter, new_cycle_filter)

old_option = '''                            {validCycles.map((cycle) => {
                              const season = readySeasons.find(
                                (item) => item.id === cycle.seasonId,
                              );
                              return (
                                <option key={cycle.id} value={cycle.id}>
                                  {season?.name ?? "Temporada"} · C
                                  {cycle.cycleNumber} · {cycle.name}
                                </option>
                              );
                            })}'''
new_option = '''                            {validCycles.map((cycle) => (
                              <option key={cycle.id} value={cycle.id}>
                                {season?.name ?? "Temporada"} · {cycle.name}
                              </option>
                            ))}'''
if text.count(old_option) != 1:
    raise SystemExit("could not locate macro option block")
text = text.replace(old_option, new_option)

text = text.replace(
    "Nenhum ciclo homologado cobre integralmente esta data.\n                          Ajuste a temporada/ciclos antes de confirmar.",
    "Nenhum macro interno compatível cobre integralmente esta data. Revise a temporada de 13 semanas antes de confirmar.",
    1,
)
text = text.replace("Temporada / ciclo", "Macro interno compatível", 1)

stale_errors = [
    '  SEASON_NOT_FOUND: "Temporada não encontrada.",\n',
    '  SEASON_NOT_HOMOLOGATABLE: "A temporada não está em estado homologável.",\n',
    '  SEASON_REQUIRES_THREE_CYCLES:\n    "A temporada precisa ter exatamente três ciclos.",\n',
    '  INVALID_SEASON_CYCLE_PERIOD: "Existe ciclo fora do período da temporada.",\n',
    '  SEASON_CYCLES_OVERLAP: "Os ciclos da temporada estão sobrepostos.",\n',
]
for stale in stale_errors:
    text = text.replace(stale, "")

text = text.replace(
    '  SEASON_CYCLE_NOT_FOUND: "Ciclo não encontrado para a temporada.",',
    '  SEASON_CYCLE_NOT_FOUND: "Macro interno compatível não encontrado para a temporada.",',
)
text = text.replace(
    '  SEASON_CYCLE_NOT_READY: "O ciclo ainda não pode receber sessões.",',
    '  SEASON_CYCLE_NOT_READY: "O macro interno ainda não pode receber sessões.",',
)
text = text.replace(
    '  OPPORTUNITY_OUTSIDE_CYCLE:\n    "O UR Play precisa ficar integralmente dentro do ciclo selecionado.",',
    '  OPPORTUNITY_OUTSIDE_CYCLE:\n    "O UR Play precisa ficar integralmente dentro do macro interno compatível.",',
)

# `success` remains part of Params for backwards-compatible URLs but is not rendered.
text = text.replace("  const success = single(params.success);\n", "")

path.write_text(text)
