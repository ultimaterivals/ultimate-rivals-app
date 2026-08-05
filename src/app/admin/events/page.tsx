import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listPartnerEvents } from "@/server/repositories/partner-market.repository";
import { CalendarDays, ShieldCheck } from "lucide-react";

export default async function AdminEventsPage() {
  const events = await listPartnerEvents(await createClient());

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="UR Events"
        title="Eventos de quadra"
        description="Eventos operados pelo UR para parceiros, reutilizando calendar, staff, checklists, venue, finance e media."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="Eventos"
          value={String(events.length)}
          hint="Partner events"
          icon={CalendarDays}
        />
        <StatCard
          label="Ranking por padrão"
          value="Não"
          hint="Somente Competition Engine oficial pode pontuar"
          icon={ShieldCheck}
        />
      </div>
      <Card>
        <h2 className="font-display text-xl font-black uppercase">Operação</h2>
        {events.length ? (
          <div className="mt-4 grid gap-3">
            {events.map((event) => (
              <div key={event.id} className="rounded-ur border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{event.name}</p>
                    <p className="text-sm text-zinc-400">
                      {event.venue_name} • {event.event_type}
                    </p>
                  </div>
                  <Badge>{event.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sem partner events"
            description="Eventos internos, clínicas, corporativos e desafios aparecerão aqui."
          />
        )}
      </Card>
    </div>
  );
}
