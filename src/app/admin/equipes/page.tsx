import {
  CalendarClock,
  Layers3,
  Link2,
  Plus,
  Shield,
  UserPlus,
  UsersRound,
  Warehouse,
} from "lucide-react";
import {
  createTeamAction,
  linkFormationToTeamAction,
} from "@/app/admin/equipes/actions";
import { TeamCard } from "@/components/admin/teams/team-card";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { fetchAdminTeamsRepositoryData } from "@/server/repositories/admin-teams-repository";
import { getAdminTeamsSnapshot } from "@/server/services/admin-teams-service";

export default async function TeamsPage() {
  await requireAdminModule("teams");
  const [snapshot, raw] = await Promise.all([
    getAdminTeamsSnapshot(),
    fetchAdminTeamsRepositoryData(),
  ]);
  const metrics = [
    ["Equipes", snapshot.metrics.officialTeams, Shield],
    ["Atletas vinculados", snapshot.metrics.activeAthletes, UsersRound],
    ["Duplas registradas", snapshot.metrics.registeredDoubles, Layers3],
    ["Vagas de duplas", snapshot.metrics.openDoubleSlots, Warehouse],
    ["Atletas livres", snapshot.metrics.freeAgents, UserPlus],
  ] as const;
  const doublesFormatIds = new Set(
    (raw.formats ?? [])
      .filter((format) => format.code === "doubles")
      .map((format) => format.id),
  );
  const categoryNames = new Map(
    (raw.categories ?? []).map((category) => [category.id, category.name]),
  );
  const poleNames = new Map(
    (raw.poles ?? []).map((pole) => [pole.id, pole.name]),
  );
  const activeTeams = snapshot.teams.filter((team) => team.status === "active");
  const unlinkedFormations = (raw.formations ?? []).filter(
    (formation) =>
      formation.team_id === null && doublesFormatIds.has(formation.format_id),
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Esportivo"
        title="Equipes Oficiais"
        description="Cadastre equipes, acompanhe sua estrutura e homologue quais duplas passam a representá-las durante a temporada."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-zinc-500 uppercase">
                {label}
              </p>
              <Icon className="text-ur-gold" size={16} aria-hidden="true" />
            </div>
            <p className="font-display mt-3 text-2xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="border-ur-gold/30">
        <div className="flex items-start gap-3">
          <CalendarClock
            className="text-ur-gold mt-0.5 shrink-0"
            size={18}
            aria-hidden="true"
          />
          <div>
            <p className="font-bold">Vínculo com efeito temporal</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              A dupla só representa a equipe a partir da data efetiva
              homologada. Vincular hoje não transforma automaticamente jogos
              anteriores em pontos da equipe.
            </p>
          </div>
        </div>
      </Card>

      <section className="grid gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.16em] text-zinc-500 uppercase">
            Cadastro controlado
          </p>
          <h2 className="font-display mt-1 text-2xl font-black uppercase">
            Nova equipe
          </h2>
        </div>
        <Card className="border-ur-gold/20">
          {(raw.poles ?? []).length === 0 ? (
            <div>
              <p className="font-bold">Nenhum polo disponível.</p>
              <p className="mt-2 text-sm text-zinc-500">
                Uma equipe precisa nascer vinculada a um polo oficial.
              </p>
            </div>
          ) : (
            <form
              action={createTeamAction}
              className="grid gap-3 md:grid-cols-2"
            >
              <label className="grid gap-1.5 text-xs font-bold text-zinc-500 uppercase">
                Nome da equipe
                <input
                  type="text"
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Ex.: Rivals BH"
                  className="rounded-ur border bg-black/20 px-3 py-2.5 text-sm text-zinc-200"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-zinc-500 uppercase">
                Nome curto
                <input
                  type="text"
                  name="shortName"
                  maxLength={40}
                  placeholder="Opcional"
                  className="rounded-ur border bg-black/20 px-3 py-2.5 text-sm text-zinc-200"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-zinc-500 uppercase md:col-span-2">
                Polo principal
                <select
                  name="primaryPoleId"
                  required
                  defaultValue=""
                  className="rounded-ur border bg-black/20 px-3 py-2.5 text-sm text-zinc-200"
                >
                  <option value="" disabled>
                    Selecione o polo
                  </option>
                  {(raw.poles ?? []).map((pole) => (
                    <option key={pole.id} value={pole.id}>
                      {pole.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2">
                <p className="mb-3 text-xs leading-5 text-zinc-500">
                  A equipe é criada como rascunho. Cadastro não filia atletas,
                  não altera jogos anteriores e não gera pontos de ranking.
                </p>
                <button
                  type="submit"
                  className="bg-ur-gold text-ur-black rounded-ur inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-black"
                >
                  <Plus size={16} aria-hidden="true" />
                  Cadastrar equipe
                </button>
              </div>
            </form>
          )}
        </Card>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.16em] text-zinc-500 uppercase">
              Filiação competitiva
            </p>
            <h2 className="font-display mt-1 text-2xl font-black uppercase">
              Formações sem equipe
            </h2>
          </div>
          <Badge>{unlinkedFormations.length} pendente(s)</Badge>
        </div>

        {unlinkedFormations.length === 0 ? (
          <Card>
            <p className="font-bold">Nenhuma formação aguarda vínculo.</p>
            <p className="mt-2 text-sm text-zinc-500">
              Novas duplas independentes aparecerão aqui quando estiverem aptas
              a ser filiadas a uma equipe.
            </p>
          </Card>
        ) : activeTeams.length === 0 ? (
          <Card>
            <p className="font-bold">
              Não há equipe ativa para receber duplas.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Cadastre e homologue uma equipe antes de efetivar qualquer
              vínculo.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {unlinkedFormations.map((formation) => (
              <Card
                key={formation.id}
                className="grid gap-4 xl:grid-cols-[1fr_2fr]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-xl font-black uppercase">
                      {formation.display_name}
                    </p>
                    {formation.level && <Badge>{formation.level}</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-zinc-500">
                    {formation.category_id
                      ? (categoryNames.get(formation.category_id) ??
                        "Categoria")
                      : "Categoria a confirmar"}
                    {formation.pole_id
                      ? ` · ${poleNames.get(formation.pole_id) ?? "Polo"}`
                      : ""}
                  </p>
                </div>

                <form
                  action={linkFormationToTeamAction}
                  className="grid gap-3 md:grid-cols-2"
                >
                  <input
                    type="hidden"
                    name="formationId"
                    value={formation.id}
                  />
                  <label className="grid gap-1.5 text-xs font-bold text-zinc-500 uppercase">
                    Equipe
                    <select
                      name="teamId"
                      required
                      defaultValue=""
                      className="rounded-ur border bg-black/20 px-3 py-2.5 text-sm text-zinc-200"
                    >
                      <option value="" disabled>
                        Selecione a equipe
                      </option>
                      {activeTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold text-zinc-500 uppercase">
                    Data efetiva
                    <input
                      type="datetime-local"
                      name="effectiveAt"
                      required
                      className="rounded-ur border bg-black/20 px-3 py-2.5 text-sm text-zinc-200"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold text-zinc-500 uppercase md:col-span-2">
                    Fonte / justificativa do vínculo
                    <input
                      type="text"
                      name="reason"
                      required
                      minLength={4}
                      maxLength={500}
                      placeholder="Ex.: filiação confirmada pelas duas atletas"
                      className="rounded-ur border bg-black/20 px-3 py-2.5 text-sm text-zinc-200"
                    />
                  </label>
                  <button
                    type="submit"
                    className="bg-ur-gold text-ur-black rounded-ur inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-black md:col-span-2"
                  >
                    <Link2 size={16} aria-hidden="true" />
                    Homologar vínculo com equipe
                  </button>
                </form>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card className="border-ur-gold/30">
        <p className="font-bold">Regra estrutural protegida no banco</p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          O backend impede mais de 5 duplas por equipe/categoria/temporada. Uma
          dupla ativa exige exatamente 2 titulares e não aceita reserva próprio.
        </p>
      </Card>

      {snapshot.teams.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhuma Equipe Oficial cadastrada.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Equipes cadastradas aparecerão aqui com sua situação e ocupação por
            categoria.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshot.teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
      {[...snapshot.sourceErrors, ...raw.errors].length > 0 && (
        <Card>
          <p className="font-bold">Leitura parcial</p>
          <ul className="mt-2 text-sm text-zinc-500">
            {[...new Set([...snapshot.sourceErrors, ...raw.errors])].map(
              (error) => (
                <li key={error}>{error}</li>
              ),
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}
