import { Activity, CalendarDays, UsersRound } from "lucide-react";
import { Badge, Button, Card, PageHeader, StatCard } from "@/components/ui";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  createDemandOpportunityAction,
  createTrainingWindowAction,
} from "@/features/demand/actions";
import { listAdminDemand } from "@/server/repositories/demand.repository";

export default async function AdminDemandPage() {
  await requireAnyRole(["admin", "operator"]);
  const rows = await listAdminDemand(await createClient());
  const today = rows.filter((row) => isWithinDays(row.starts_at, 1));
  const week = rows.filter((row) => isWithinDays(row.starts_at, 7));
  const secondCourt = rows.filter(
    (row) => row.demand_signal === "SECOND_COURT_OPPORTUNITY",
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Admin Demand"
        title="Demanda, formação e capacidade"
        description="Sinais determinísticos para abrir horário, confirmar sessão, acionar segunda quadra ou medir demanda não atendida."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Demanda hoje"
          value={String(today.length)}
          icon={CalendarDays}
        />
        <StatCard label="7 dias" value={String(week.length)} icon={Activity} />
        <StatCard
          label="Segunda quadra"
          value={String(secondCourt.length)}
          hint="Capacidade cheia + excedente"
          icon={UsersRound}
        />
        <StatCard
          label="Unserved demand"
          value={String(
            rows.reduce(
              (sum, row) =>
                sum +
                Number(row.interested_not_served ?? 0) +
                Number(row.waitlisted_not_served ?? 0),
              0,
            ),
          )}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Criar oportunidade
          </h2>
          <form
            action={createDemandOpportunityAction}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <input
              name="title"
              required
              placeholder="UR Play Betim N2"
              className="rounded-ur border bg-black p-3 md:col-span-2"
            />
            <select
              name="opportunityType"
              aria-label="Tipo"
              className="rounded-ur border bg-black p-3"
            >
              <option value="ur_play">UR Play</option>
              <option value="training">Treino</option>
              <option value="scheduled_round">Scheduled Round</option>
              <option value="competition">Competition</option>
              <option value="clinic">Clinic/Event</option>
            </select>
            <select
              name="formatCode"
              aria-label="Formato"
              className="rounded-ur border bg-black p-3"
            >
              <option value="doubles">Duplas</option>
              <option value="fours">Quartetos</option>
            </select>
            <input
              name="startsAt"
              type="datetime-local"
              aria-label="Início"
              className="rounded-ur border bg-black p-3"
            />
            <input
              name="endsAt"
              type="datetime-local"
              aria-label="Fim"
              className="rounded-ur border bg-black p-3"
            />
            <input
              name="level"
              placeholder="n2"
              className="rounded-ur border bg-black p-3"
            />
            <input
              name="categoryCode"
              placeholder="categoria"
              className="rounded-ur border bg-black p-3"
            />
            <input
              name="targetFormations"
              type="number"
              min="1"
              defaultValue="4"
              className="rounded-ur border bg-black p-3"
            />
            <input
              name="maxFormations"
              type="number"
              min="1"
              defaultValue="4"
              className="rounded-ur border bg-black p-3"
            />
            <input
              name="capacityAthletes"
              type="number"
              min="1"
              defaultValue="8"
              className="rounded-ur border bg-black p-3"
            />
            <input
              name="courtCount"
              type="number"
              min="1"
              defaultValue="1"
              className="rounded-ur border bg-black p-3"
            />
            <Button type="submit" className="md:col-span-2">
              Criar demanda
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Treino — coleta de interesse
          </h2>
          <form
            action={createTrainingWindowAction}
            className="mt-4 grid gap-3 md:grid-cols-2"
          >
            <input
              name="title"
              required
              placeholder="Treino UR Betim terça N2"
              className="rounded-ur border bg-black p-3 md:col-span-2"
            />
            <input
              name="dayOfWeek"
              type="number"
              min="0"
              max="6"
              defaultValue="2"
              className="rounded-ur border bg-black p-3"
            />
            <select
              name="timePreference"
              aria-label="Preferência"
              className="rounded-ur border bg-black p-3"
            >
              <option value="morning">Manhã</option>
              <option value="afternoon">Tarde</option>
              <option value="evening">Noite</option>
              <option value="specific">Específico</option>
            </select>
            <input
              name="startsAt"
              type="time"
              className="rounded-ur border bg-black p-3"
            />
            <input
              name="endsAt"
              type="time"
              className="rounded-ur border bg-black p-3"
            />
            <input
              name="level"
              placeholder="n2"
              className="rounded-ur border bg-black p-3"
            />
            <input
              name="minAthletes"
              type="number"
              min="1"
              defaultValue="4"
              className="rounded-ur border bg-black p-3"
            />
            <input
              name="trainingFocus"
              placeholder="Foco técnico opcional"
              className="rounded-ur border bg-black p-3 md:col-span-2"
            />
            <Button type="submit" className="md:col-span-2">
              Abrir coleta
            </Button>
          </form>
        </Card>
      </section>

      <section className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge>{row.demand_signal}</Badge>
                <h2 className="font-display mt-3 text-xl font-black">
                  {row.title}
                </h2>
                <p className="text-sm text-zinc-400">
                  {row.pole_name ?? "Polo a definir"} · {row.level ?? "aberto"}{" "}
                  · {row.format_code ?? "sem formato"} ·{" "}
                  {row.starts_at
                    ? new Date(row.starts_at).toLocaleString("pt-BR")
                    : "sem data"}
                </p>
              </div>
              <strong className="font-display text-3xl">
                {row.ready_formations}/{row.target_formations}
              </strong>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-6">
              <Mini label="Interesse" value={row.interested_count} />
              <Mini label="Reservas" value={row.reserved_count} />
              <Mini label="Espera" value={row.waitlist_count} />
              <Mini label="Capacidade" value={row.capacity_athletes} />
              <Mini label="Não atendida" value={row.interested_not_served} />
              <Mini label="Quadras" value={row.court_count} />
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase">{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function isWithinDays(value: string | null, days: number) {
  if (!value) return false;
  const date = new Date(value).getTime();
  const now = Date.now();
  return date >= now && date <= now + days * 24 * 60 * 60 * 1000;
}
