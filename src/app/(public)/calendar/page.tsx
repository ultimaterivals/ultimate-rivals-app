import { CalendarDays, MapPin, Trophy } from "lucide-react";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listPublicCalendarEvents } from "@/server/repositories/public-experience.repository";

const dateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });

const eventLabel: Record<string, string> = {
  cup: "UR Cup",
  hunter: "Hunter",
  legends: "UR Legends",
  partner_event: "UR Event",
  series: "UR Series",
  special_event: "Especial",
  training: "Treino",
  ur_play: "UR Play",
  clinic: "Clinic",
};

export default async function PublicCalendarPage() {
  const events = await listPublicCalendarEvents(await createClient());

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-5 py-8 sm:px-8">
      <PageHeader
        eyebrow="Agenda publica"
        title="Calendario Ultimate Rivals"
        description="Sessoes, treinos, competicoes e eventos publicados. Dados privados de atletas, pagamentos e operacao interna nao aparecem aqui."
      />

      <div className="mt-8 grid gap-4">
        {events.length ? (
          events.map((event) => (
            <Card key={event.id} className="hover:border-ur-gold/40">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <Badge>
                    {eventLabel[event.event_type] ?? event.event_type}
                  </Badge>
                  <h2 className="mt-3 text-2xl font-black">{event.name}</h2>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={16} aria-hidden="true" />
                      {dateTime(event.starts_at)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={16} aria-hidden="true" />
                      {event.venue_name ?? event.pole_name ?? "Local a definir"}
                    </span>
                  </p>
                </div>
                <div className="rounded-ur border px-4 py-3 text-sm font-black text-zinc-300 uppercase">
                  {event.status.replaceAll("_", " ")}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            title="Calendario publico em preparacao"
            description="Quando eventos publicados existirem no DEV, eles aparecerao aqui em ordem cronologica."
            action={
              <Link
                href="/competitions"
                className="text-ur-gold inline-flex min-h-11 items-center gap-2 font-black"
              >
                Ver competicoes <Trophy size={16} aria-hidden="true" />
              </Link>
            }
          />
        )}
      </div>
    </main>
  );
}
