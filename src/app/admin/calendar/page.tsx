import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import {
  listCalendarOperations,
  listCalendarReferenceData,
} from "@/server/repositories/calendar.repository";

const eventTypes = [
  "ur_play",
  "training",
  "hunter",
  "series",
  "cup",
  "legends",
  "clinic",
  "partner_event",
  "special_event",
];

const statuses = [
  "draft",
  "planned",
  "published",
  "registration_open",
  "in_progress",
  "completed",
  "cancelled",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function weekdayLabel(value: number) {
  return ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][
    value
  ];
}

function joinedPoleName(value: unknown) {
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined;
    return first?.name ?? "Polo";
  }
  return (value as { name?: string } | null)?.name ?? "Polo";
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const client = await createClient();
  const view = query.view ?? "operations";
  const now = new Date();
  const from =
    query.from ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to =
    query.to ??
    new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59).toISOString();
  const [events, reference] = await Promise.all([
    listCalendarOperations(client, {
      poleId: query.pole,
      eventType: query.type,
      status: query.status,
      from,
      to,
    }),
    listCalendarReferenceData(client),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Temporada 1"
        title="Calendário mestre"
        description="Month, week, day e operations compartilham o mesmo calendário operacional. Datas são filtradas por período, sem hardcode de edições."
        action={
          <Link
            href="/admin/ur-play/new"
            className="rounded-ur bg-ur-gold text-ur-black px-4 py-3 text-sm font-black"
          >
            Criar sessão
          </Link>
        }
      />

      <Card>
        <form className="grid gap-3 md:grid-cols-5">
          <select
            name="view"
            defaultValue={view}
            className="rounded-ur border bg-black p-3"
          >
            {["month", "week", "day", "operations"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            name="pole"
            defaultValue={query.pole ?? ""}
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todos os polos</option>
            {reference.poles.map((pole) => (
              <option key={pole.id} value={pole.id}>
                {pole.name}
              </option>
            ))}
          </select>
          <select
            name="type"
            defaultValue={query.type ?? ""}
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todos os tipos</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={query.status ?? ""}
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todos os status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button className="rounded-ur bg-white px-4 py-3 font-black text-black">
            Filtrar
          </button>
        </form>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-3">
          <h2 className="text-xl font-black uppercase">
            Visão {view} · {events.length} evento(s)
          </h2>
          {events.length === 0 && (
            <Card>
              <p className="font-bold">Nenhum evento no período filtrado.</p>
              <p className="mt-2 text-sm text-zinc-400">
                Use os templates Q1 como base operacional para gerar sessões UR
                Play, treinos, Hunter ou torneios.
              </p>
            </Card>
          )}
          {events.map((event) => (
            <Card key={event.id} className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{event.event_type}</Badge>
                <Badge className="border-white/20 bg-white/10 text-white">
                  {event.status}
                </Badge>
                {event.conflict_count > 0 && (
                  <Badge className="border-red-400/40 bg-red-500/10 text-red-300">
                    {event.conflict_count} conflito(s)
                  </Badge>
                )}
              </div>
              <div>
                <h3 className="text-lg font-black">{event.name}</h3>
                <p className="text-sm text-zinc-400">
                  {formatDate(event.starts_at)} → {formatDate(event.ends_at)}
                </p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-4">
                <span>Polo: {event.pole_name ?? "—"}</span>
                <span>Venue: {event.venue_name ?? "—"}</span>
                <span>
                  Quadras: {event.assigned_courts}/
                  {event.court_count_target ?? "?"}
                </span>
                <span>Checklist aberto: {event.open_checklist_items}</span>
              </div>
            </Card>
          ))}
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <h2 className="text-xl font-black uppercase">Conflitos</h2>
            {reference.conflicts.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-400">
                Nenhum conflito de quadra ou staff detectado.
              </p>
            ) : (
              <div className="mt-3 grid gap-2">
                {reference.conflicts.map((conflict, index) => (
                  <p
                    key={`${conflict.calendar_event_id}-${index}`}
                    className="text-sm text-amber-300"
                  >
                    {conflict.conflict_type}: {conflict.detail}
                  </p>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-black uppercase">Templates Q1</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Base recorrente configurável para UR Play scheduled_rounds.
            </p>
            <div className="mt-3 grid gap-2">
              {reference.templates.map((template) => (
                <div key={template.id} className="border-t py-2 text-sm">
                  <p className="font-bold">
                    {joinedPoleName(template.poles)} ·{" "}
                    {weekdayLabel(template.weekday)}
                  </p>
                  <p className="text-zinc-400">
                    {template.starts_at.slice(0, 5)}–
                    {template.ends_at.slice(0, 5)} · {template.competition_mode}{" "}
                    · {template.target_courts} quadra(s)
                  </p>
                  {template.alternates_friday && (
                    <p className="text-ur-gold text-xs font-bold">
                      sexta alternada
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </section>
    </div>
  );
}
