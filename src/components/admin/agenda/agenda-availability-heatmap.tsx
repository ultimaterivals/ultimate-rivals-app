import type { AdminAgendaSnapshot } from "@/features/admin-agenda/types";
import { Card } from "@/components/ui";

function cellClass(count: number, peak: number) {
  if (count <= 0) return "bg-white/[0.015] text-zinc-700";
  const ratio = peak > 0 ? count / peak : 0;
  if (ratio >= 0.75) return "bg-ur-gold/25 text-ur-gold border-ur-gold/40";
  if (ratio >= 0.4) return "bg-ur-gold/15 text-zinc-200 border-ur-gold/25";
  return "bg-ur-gold/5 text-zinc-400 border-ur-gold/10";
}

export function AgendaAvailabilityHeatmap({
  snapshot,
}: {
  snapshot: AdminAgendaSnapshot;
}) {
  const availability = snapshot.availability;

  if (availability.cells === null) {
    return (
      <Card>
        <p className="font-bold">
          Disponibilidade não instrumentada nesta leitura.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          O Command não atribui demanda estimada quando a fonte de
          disponibilidade não pode ser lida.
        </p>
      </Card>
    );
  }

  if ((availability.windows ?? 0) === 0) {
    return (
      <Card>
        <p className="font-bold">Nenhuma janela recorrente nesta semana.</p>
        <p className="mt-2 text-sm text-zinc-500">
          À medida que os atletas registrarem quando podem jogar, o mapa
          mostrará os melhores horários antes de uma sessão ser aberta.
        </p>
      </Card>
    );
  }

  const byCell = new Map(
    availability.cells.map((cell) => [
      `${cell.date}:${cell.startMinute}`,
      cell,
    ]),
  );
  const slotMinutes = [
    ...new Set(availability.cells.map((cell) => cell.startMinute)),
  ].sort((a, b) => a - b);
  const peak = availability.peakAthletes ?? 0;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Atletas com disponibilidade
          </p>
          <p className="font-display text-ur-gold mt-2 text-2xl font-black">
            {availability.athletes ?? "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Janelas válidas
          </p>
          <p className="font-display mt-2 text-2xl font-black">
            {availability.windows ?? "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Pico simultâneo
          </p>
          <p className="font-display mt-2 text-2xl font-black">
            {availability.peakAthletes ?? "—"}
          </p>
        </Card>
      </div>

      <div className="rounded-ur overflow-x-auto border">
        <table className="w-full min-w-[58rem] border-collapse text-center text-xs">
          <thead className="bg-ur-panel">
            <tr>
              <th className="bg-ur-panel sticky left-0 z-10 px-3 py-3 text-left text-zinc-500">
                Horário
              </th>
              {snapshot.days.map((day) => (
                <th key={day.date} className="px-2 py-3 text-zinc-500">
                  <span className="block font-bold text-zinc-300 capitalize">
                    {day.weekday}
                  </span>
                  <span>{day.shortLabel}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slotMinutes.map((minute) => {
              const first = availability.cells?.find(
                (cell) => cell.startMinute === minute,
              );
              return (
                <tr key={minute} className="border-t">
                  <th className="bg-ur-graphite sticky left-0 z-10 px-3 py-1.5 text-left font-mono text-zinc-500">
                    {first?.startLabel ?? "—"}
                  </th>
                  {snapshot.days.map((day) => {
                    const cell = byCell.get(`${day.date}:${minute}`);
                    const count = cell?.athleteCount ?? 0;
                    const flexible = cell?.flexibleAthletes ?? 0;
                    return (
                      <td key={day.date} className="p-1">
                        <div
                          className={`rounded-ur min-h-10 border px-2 py-1.5 ${cellClass(count, peak)}`}
                          title={`${count} atleta(s) disponíveis${flexible > 0 ? ` · ${flexible} flexível(is) entre polos` : ""}`}
                        >
                          <span className="font-bold">{count || "·"}</span>
                          {flexible > 0 && (
                            <span className="mt-0.5 block text-[0.62rem] opacity-70">
                              {flexible} flex.
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-5 text-zinc-600">
        O mapa conta atletas únicos por bloco de 30 minutos. Quando um polo está
        filtrado, janelas marcadas como “qualquer polo” também entram na leitura
        e aparecem como flexíveis. Disponibilidade não equivale a interesse ou
        reserva.
      </p>
    </div>
  );
}
