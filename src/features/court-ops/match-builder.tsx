"use client";

import { useMemo, useState } from "react";
import { Button, Card } from "@/components/ui";
import { createMatchAction } from "@/features/court-ops/actions";
import { restWarning, validMixedComposition } from "@/lib/validation/court-ops";

type Candidate = {
  athleteId: string;
  code: string;
  name: string;
  gender: string;
  level: string;
  team: string;
  gamesPlayed: number;
  waitMinutes: number;
  lastMatchEndedAt: string | null;
};
type Option = { id: string; code: string; name: string };
type Court = { id: string; name: string };
type RosterMember = {
  athlete_id: string;
  role: "starter" | "reserve";
  status: string;
};
type Roster = {
  id: string;
  name: string | null;
  teamName: string;
  formatId: string;
  categoryId: string;
  level: string;
  members: RosterMember[];
};

function SelectedAthlete({ athlete }: { athlete?: Candidate }) {
  if (!athlete) return null;
  return (
    <p className="mt-1 text-xs text-zinc-400">
      {athlete.code} · {athlete.level.toUpperCase()} · {athlete.team} ·{" "}
      {athlete.gender} · {athlete.gamesPlayed} jogos · espera{" "}
      {athlete.waitMinutes} min
    </p>
  );
}

function AthleteSelect({
  label,
  name,
  value,
  candidates,
  selectedIds,
  required,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  candidates: Candidate[];
  selectedIds: Set<string>;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const athlete = candidates.find((candidate) => candidate.athleteId === value);
  return (
    <label className="rounded-ur block border border-zinc-800 p-3">
      <span className="text-xs font-black tracking-wide text-zinc-400 uppercase">
        {label}
      </span>
      <select
        name={name}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-ur mt-2 block w-full border bg-black p-3"
      >
        <option value="">Selecionar atleta</option>
        {candidates.map((candidate) => (
          <option
            key={candidate.athleteId}
            value={candidate.athleteId}
            disabled={
              selectedIds.has(candidate.athleteId) &&
              candidate.athleteId !== value
            }
          >
            {candidate.code} · {candidate.name}
          </option>
        ))}
      </select>
      <SelectedAthlete athlete={athlete} />
    </label>
  );
}

export function MatchBuilder({
  sessionId,
  initialCourtId,
  minRestMinutes,
  candidates,
  formats,
  categories,
  courts,
  rosters,
}: {
  sessionId: string;
  initialCourtId?: string;
  minRestMinutes: number | null;
  candidates: Candidate[];
  formats: Option[];
  categories: Option[];
  courts: Court[];
  rosters: Roster[];
}) {
  const initialFormat =
      formats.find((format) => format.code === "doubles") ?? formats[0],
    initialCategory = categories[0];
  const [formatId, setFormatId] = useState(initialFormat?.id ?? ""),
    [categoryId, setCategoryId] = useState(initialCategory?.id ?? ""),
    [level, setLevel] = useState("n2"),
    [sideA, setSideA] = useState<string[]>(Array(2).fill("")),
    [sideB, setSideB] = useState<string[]>(Array(2).fill("")),
    [sideAReserves, setSideAReserves] = useState<string[]>([]),
    [sideBReserves, setSideBReserves] = useState<string[]>([]),
    [sideARosterId, setSideARosterId] = useState(""),
    [sideBRosterId, setSideBRosterId] = useState("");
  const format = formats.find((option) => option.id === formatId),
    category = categories.find((option) => option.id === categoryId),
    isFours = format?.code === "fours",
    selected = [...sideA, ...sideB, ...sideAReserves, ...sideBReserves].filter(
      Boolean,
    ),
    selectedIds = new Set(selected),
    duplicates = selected.length !== selectedIds.size,
    applicableRosters = rosters.filter(
      (roster) =>
        roster.formatId === formatId &&
        roster.categoryId === categoryId &&
        roster.level === level,
    );

  const criticalWarnings = useMemo(() => {
    const warnings: string[] = [];
    const required = isFours ? 4 : 2;
    if (
      sideA.filter(Boolean).length !== required ||
      sideB.filter(Boolean).length !== required
    )
      warnings.push("Preencha todos os titulares dos dois lados.");
    if (duplicates) warnings.push("O mesmo atleta não pode ocupar dois slots.");
    if (category?.code === "mixed") {
      for (const [label, side] of [
        ["A", sideA],
        ["B", sideB],
      ] as const) {
        const genders = side
          .map(
            (id) =>
              candidates.find((candidate) => candidate.athleteId === id)
                ?.gender,
          )
          .filter((gender): gender is string => Boolean(gender));
        if (
          genders.length === required &&
          !validMixedComposition(format?.code ?? "", genders)
        )
          warnings.push(`Lado ${label}: composição mixed inválida.`);
      }
    }
    return warnings;
  }, [
    candidates,
    category?.code,
    duplicates,
    format?.code,
    isFours,
    sideA,
    sideB,
  ]);

  const restWarnings = selected
    .map((id) => candidates.find((candidate) => candidate.athleteId === id))
    .filter(
      (candidate): candidate is Candidate =>
        Boolean(candidate) &&
        restWarning(candidate?.lastMatchEndedAt ?? null, minRestMinutes),
    );

  function changeFormat(id: string) {
    const nextFormat = formats.find((option) => option.id === id);
    const size = nextFormat?.code === "fours" ? 4 : 2;
    setFormatId(id);
    setSideA(Array(size).fill(""));
    setSideB(Array(size).fill(""));
    setSideAReserves([]);
    setSideBReserves([]);
    setSideARosterId("");
    setSideBRosterId("");
  }

  function setSlot(side: "A" | "B", index: number, athleteId: string) {
    const setter = side === "A" ? setSideA : setSideB;
    setter((current) =>
      current.map((value, slot) => (slot === index ? athleteId : value)),
    );
  }

  function setReserve(side: "A" | "B", index: number, athleteId: string) {
    const setter = side === "A" ? setSideAReserves : setSideBReserves;
    setter((current) =>
      current.map((value, slot) => (slot === index ? athleteId : value)),
    );
  }

  function loadRoster(side: "A" | "B", rosterId: string) {
    const roster = rosters.find((option) => option.id === rosterId);
    const availableIds = new Set(
      candidates.map((candidate) => candidate.athleteId),
    );
    const starters =
      roster?.members
        .filter(
          (member) => member.role === "starter" && member.status === "active",
        )
        .map((member) => member.athlete_id)
        .filter((id) => availableIds.has(id)) ?? [];
    const reserves =
      roster?.members
        .filter(
          (member) => member.role === "reserve" && member.status === "active",
        )
        .map((member) => member.athlete_id)
        .filter((id) => availableIds.has(id)) ?? [];
    if (side === "A") {
      setSideARosterId(rosterId);
      setSideA(
        [
          ...starters.slice(0, isFours ? 4 : 2),
          ...Array(isFours ? 4 : 2).fill(""),
        ].slice(0, isFours ? 4 : 2),
      );
      setSideAReserves(isFours ? reserves.slice(0, 3) : []);
    } else {
      setSideBRosterId(rosterId);
      setSideB(
        [
          ...starters.slice(0, isFours ? 4 : 2),
          ...Array(isFours ? 4 : 2).fill(""),
        ].slice(0, isFours ? 4 : 2),
      );
      setSideBReserves(isFours ? reserves.slice(0, 3) : []);
    }
  }

  return (
    <form action={createMatchAction} className="grid gap-5">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="sideARosterId" value={sideARosterId} />
      <input type="hidden" name="sideBRosterId" value={sideBRosterId} />
      <Card className="grid gap-4 md:grid-cols-3">
        <label>
          Formato
          <select
            name="formatId"
            value={formatId}
            onChange={(event) => changeFormat(event.target.value)}
            className="rounded-ur block w-full border bg-black p-3"
          >
            {formats.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Categoria
          <select
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="rounded-ur block w-full border bg-black p-3"
          >
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nível
          <select
            name="level"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className="rounded-ur block w-full border bg-black p-3"
          >
            <option value="leveling">Nivelamento</option>
            <option value="n3">N3</option>
            <option value="n2">N2</option>
            <option value="n1">N1</option>
          </select>
        </label>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        {(["A", "B"] as const).map((side) => {
          const starters = side === "A" ? sideA : sideB;
          const reserves = side === "A" ? sideAReserves : sideBReserves;
          return (
            <Card key={side} className="grid gap-4">
              <div>
                <p className="text-ur-gold text-lg font-black">LADO {side}</p>
                <p className="text-xs text-zinc-500 uppercase">Em quadra</p>
              </div>
              {isFours && applicableRosters.length > 0 && (
                <label>
                  Formação oficial
                  <select
                    value={side === "A" ? sideARosterId : sideBRosterId}
                    onChange={(event) => loadRoster(side, event.target.value)}
                    className="rounded-ur block w-full border bg-black p-3"
                  >
                    <option value="">Formação temporária do UR Play</option>
                    {applicableRosters.map((roster) => (
                      <option key={roster.id} value={roster.id}>
                        {roster.teamName} · {roster.name ?? "Quarteto oficial"}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {starters.map((athleteId, index) => (
                <AthleteSelect
                  key={`${side}-starter-${index}`}
                  label={`LADO ${side} · atleta ${index + 1}`}
                  name={`side${side}`}
                  value={athleteId}
                  candidates={candidates}
                  selectedIds={selectedIds}
                  required
                  onChange={(id) => setSlot(side, index, id)}
                />
              ))}
              {isFours && (
                <details
                  className="rounded-ur border border-zinc-800 p-3"
                  open={reserves.length > 0}
                >
                  <summary className="cursor-pointer font-black">
                    BANCO · {reserves.length}/3 reservas
                  </summary>
                  <div className="mt-3 grid gap-3">
                    {reserves.map((athleteId, index) => (
                      <AthleteSelect
                        key={`${side}-reserve-${index}`}
                        label={`LADO ${side} · reserva R${index + 1}`}
                        name={`side${side}Reserves`}
                        value={athleteId}
                        candidates={candidates}
                        selectedIds={selectedIds}
                        onChange={(id) => setReserve(side, index, id)}
                      />
                    ))}
                    {reserves.length < 3 && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          side === "A"
                            ? setSideAReserves((current) => [...current, ""])
                            : setSideBReserves((current) => [...current, ""])
                        }
                      >
                        ADICIONAR RESERVA
                      </Button>
                    )}
                  </div>
                </details>
              )}
            </Card>
          );
        })}
      </div>

      {(criticalWarnings.length > 0 || restWarnings.length > 0) && (
        <Card
          className={
            criticalWarnings.length ? "border-red-500" : "border-amber-500"
          }
        >
          {criticalWarnings.map((warning) => (
            <p key={warning} className="text-red-300">
              {warning}
            </p>
          ))}
          {restWarnings.map((athlete) => (
            <p key={athlete.athleteId} className="text-amber-300">
              Descanso curto: {athlete.name}
            </p>
          ))}
        </Card>
      )}
      <Card>
        <label>
          Quadra livre
          <select
            name="courtId"
            defaultValue={initialCourtId}
            required
            className="rounded-ur block w-full border bg-black p-3"
          >
            <option value="">Selecionar quadra</option>
            {courts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </label>
      </Card>
      <Button
        type="submit"
        disabled={criticalWarnings.length > 0 || courts.length === 0}
        className="min-h-14 w-full"
      >
        CRIAR JOGO NA FILA
      </Button>
    </form>
  );
}
