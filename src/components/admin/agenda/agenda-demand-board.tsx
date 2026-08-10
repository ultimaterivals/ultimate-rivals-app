import { ArrowUpRight, UsersRound } from "lucide-react";
import type { AdminAgendaSnapshot } from "@/features/admin-agenda/types";
import { Badge, Card } from "@/components/ui";

const signalOrder: Record<string, number> = {
  SECOND_COURT_OPPORTUNITY: 0,
  READY_TO_OPEN: 1,
  ALMOST_FULL: 2,
  SESSION_CONFIRMED: 3,
  FORMING: 4,
  LOW_DEMAND: 5,
};

export function AgendaDemandBoard({
  snapshot,
}: {
  snapshot: AdminAgendaSnapshot;
}) {
  if (!snapshot.demand) {
    return (
      <Card>
        <p className="text-sm text-zinc-400">Fonte de demanda indisponível.</p>
      </Card>
    );
  }

  const items = [...snapshot.demand].sort(
    (a, b) =>
      (signalOrder[a.signal ?? ""] ?? 99) - (signalOrder[b.signal ?? ""] ?? 99),
  );

  if (items.length === 0) {
    return (
      <Card>
        <p className="text-sm text-zinc-400">
          Nenhuma oportunidade de demanda registrada nesta semana.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card
          key={item.id}
          data-testid={`demand-${item.id}`}
          className={item.reservedCount > 0 ? "border-ur-gold/50" : ""}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold">{item.title}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {[item.poleName, item.categoryCode, item.level, item.formatCode]
                  .filter(Boolean)
                  .join(" · ") || "Segmentação ainda não definida"}
              </p>
            </div>
            <ArrowUpRight
              className="text-ur-gold shrink-0"
              size={16}
              aria-hidden="true"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{item.signal ?? item.status}</Badge>
            {item.reservedCount > 0 && (
              <Badge>{item.reservedCount} reservas</Badge>
            )}
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="font-display text-xl font-black">
                {item.interestedCount}
              </p>
              <p className="text-[0.65rem] text-zinc-600 uppercase">
                Interesse
              </p>
            </div>
            <div>
              <p className="font-display text-xl font-black">
                {item.readyFormations}/{item.targetFormations}
              </p>
              <p className="text-[0.65rem] text-zinc-600 uppercase">
                Formações
              </p>
            </div>
            <div>
              <p className="font-display text-xl font-black">
                {item.reservedCount}
              </p>
              <p className="text-[0.65rem] text-zinc-600 uppercase">Reservas</p>
            </div>
            <div>
              <p className="font-display text-xl font-black">
                {item.waitlistCount}
              </p>
              <p className="text-[0.65rem] text-zinc-600 uppercase">Espera</p>
            </div>
          </div>
          {item.signal === "SECOND_COURT_OPPORTUNITY" && (
            <p className="text-ur-gold mt-4 flex items-center gap-2 text-xs font-bold">
              <UsersRound size={14} aria-hidden="true" /> Demanda indica
              oportunidade de expansão
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
