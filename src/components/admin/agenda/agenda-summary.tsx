import { AlertTriangle, CalendarDays, ClipboardCheck, ListPlus, TicketCheck, UsersRound } from "lucide-react";
import type { AgendaMetrics } from "@/features/admin-agenda/types";
import { Card } from "@/components/ui";

const cards = [
  ["Eventos", "events", CalendarDays],
  ["Interessados", "interested", UsersRound],
  ["Reservas", "reservations", TicketCheck],
  ["Lista de espera", "waitlist", ListPlus],
  ["Conflitos", "conflicts", AlertTriangle],
  ["Checklist aberto", "openChecklistItems", ClipboardCheck],
] as const;

export function AgendaSummary({ metrics }: { metrics: AgendaMetrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map(([label, key, Icon]) => (
        <Card key={key} className="min-h-28">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">{label}</p>
            <Icon className="text-ur-gold" size={16} aria-hidden="true" />
          </div>
          <p className="font-display mt-3 text-2xl font-black">
            {metrics[key] === null ? "—" : metrics[key].toLocaleString("pt-BR")}
          </p>
        </Card>
      ))}
    </div>
  );
}
