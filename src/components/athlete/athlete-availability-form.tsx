import { CalendarRange, Clock3, MapPin, Trash2 } from "lucide-react";
import type { AthleteAvailabilitySnapshot } from "@/features/athlete-availability/types";
import { Button, Card, Select } from "@/components/ui";
import {
  createAvailabilityWindow,
  deleteAvailabilityWindow,
} from "@/app/athlete/disponibilidade/actions";

const days = [
  [1, "Segunda"],
  [2, "Terça"],
  [3, "Quarta"],
  [4, "Quinta"],
  [5, "Sexta"],
  [6, "Sábado"],
  [0, "Domingo"],
] as const;

const dayNames = new Map<number, string>(days);

const formatNames: Record<string, string> = {
  doubles: "Duplas",
  fours: "Quartetos",
};

const categoryNames: Record<string, string> = {
  female: "Feminino",
  male: "Masculino",
  mixed: "Misto",
};

function timeOptions() {
  const values: string[] = [];
  for (let minutes = 6 * 60; minutes < 24 * 60; minutes += 30) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    values.push(
      `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
  }
  return values;
}

const startTimes = timeOptions();
const endTimes = [...startTimes.slice(1), "00:00"];

function displayTime(value: string) {
  if (value.startsWith("24:")) return "00:00";
  return value.slice(0, 5);
}

export function AthleteAvailabilityForm({
  snapshot,
}: {
  snapshot: AthleteAvailabilitySnapshot;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <Card>
        <div className="flex items-start gap-3">
          <CalendarRange
            className="text-ur-gold mt-0.5"
            size={20}
            aria-hidden="true"
          />
          <div>
            <p className="font-bold">Adicionar disponibilidade</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Isso informa quando você normalmente pode jogar. Não cria reserva
              e não consome crédito.
            </p>
          </div>
        </div>

        <form action={createAvailabilityWindow} className="mt-6 grid gap-5">
          <input type="hidden" name="modality" value="beach_volleyball" />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Dia
              <Select name="dayOfWeek" defaultValue="4">
                {days.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Polo preferido
              <Select name="poleId" defaultValue="">
                <option value="">Qualquer polo</option>
                {snapshot.poles.map((pole) => (
                  <option key={pole.id} value={pole.id}>
                    {pole.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold tracking-wider text-zinc-500 uppercase">
              De
              <Select name="startsAt" defaultValue="18:00">
                {startTimes.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Até
              <Select name="endsAt" defaultValue="22:00">
                {endTimes.map((time) => (
                  <option key={time} value={time}>
                    {time === "00:00" ? "00:00 (fim do dia)" : time}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Formatos
            </legend>
            <div className="flex flex-wrap gap-2">
              {[
                ["doubles", "Duplas"],
                ["fours", "Quartetos"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="rounded-ur flex min-h-11 items-center gap-2 border px-3 text-sm"
                >
                  <input
                    type="checkbox"
                    name="formatCodes"
                    value={value}
                    defaultChecked={value === "doubles"}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Categorias
            </legend>
            <div className="flex flex-wrap gap-2">
              {[
                ["female", "Feminino"],
                ["male", "Masculino"],
                ["mixed", "Misto"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="rounded-ur flex min-h-11 items-center gap-2 border px-3 text-sm"
                >
                  <input type="checkbox" name="categoryCodes" value={value} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <Button type="submit">Salvar disponibilidade</Button>
        </form>
      </Card>

      <div className="grid content-start gap-3">
        <div>
          <p className="font-display text-xl font-black uppercase">
            Sua semana
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Janelas recorrentes usadas para alinhar demanda, treinos e UR Play.
          </p>
        </div>

        {snapshot.windows.length === 0 ? (
          <Card>
            <p className="font-bold">Nenhuma disponibilidade registrada.</p>
            <p className="mt-2 text-sm text-zinc-500">
              Adicione ao menos uma janela para registrar quando você
              normalmente pode jogar.
            </p>
          </Card>
        ) : (
          snapshot.windows.map((window) => (
            <Card key={window.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold">
                    {dayNames.get(window.dayOfWeek) ??
                      `Dia ${window.dayOfWeek}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Clock3 size={14} aria-hidden="true" />
                      {displayTime(window.startsAt)}–
                      {displayTime(window.endsAt)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} aria-hidden="true" />
                      {window.poleName ?? "Qualquer polo"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">
                    {window.formatCodes
                      .map((code) => formatNames[code] ?? code)
                      .join(" / ") || "Qualquer formato"}
                    {" · "}
                    {window.categoryCodes
                      .map((code) => categoryNames[code] ?? code)
                      .join(" / ") || "Qualquer categoria"}
                  </p>
                </div>
                <form action={deleteAvailabilityWindow}>
                  <input type="hidden" name="id" value={window.id} />
                  <button
                    type="submit"
                    aria-label={`Remover disponibilidade de ${dayNames.get(window.dayOfWeek) ?? "dia"}`}
                    className="rounded-ur flex min-h-11 min-w-11 items-center justify-center border text-zinc-500 hover:bg-white/5 hover:text-white"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </form>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
