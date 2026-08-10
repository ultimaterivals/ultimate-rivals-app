import { AlertTriangle, Shield, UserRound } from "lucide-react";
import type { AdminAthleteRow } from "@/features/admin-athletes/types";
import { Badge, Card } from "@/components/ui";

function lifecycle(row: AdminAthleteRow) {
  if (!row.firstParticipationAt) return "Novo";
  if (!row.secondParticipationAt) return "Ativar 2ª";
  if (
    row.daysSinceLastParticipation !== null &&
    row.daysSinceLastParticipation > 30
  )
    return "Inativo";
  if (
    row.daysSinceLastParticipation !== null &&
    row.daysSinceLastParticipation >= 14
  )
    return "Em risco";
  if (row.returningAthlete) return "Recorrente";
  return row.active30d ? "Ativo" : "Histórico";
}

export function AthleteTable({ rows }: { rows: readonly AdminAthleteRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-zinc-400">
          Nenhum atleta corresponde aos filtros atuais.
        </p>
      </Card>
    );
  }

  return (
    <div className="rounded-ur overflow-x-auto border">
      <table className="w-full min-w-[64rem] text-left text-sm">
        <thead className="bg-ur-panel text-[0.68rem] tracking-wider text-zinc-500 uppercase">
          <tr>
            <th className="px-4 py-3">Atleta</th>
            <th className="px-4 py-3">Polo</th>
            <th className="px-4 py-3">Nível</th>
            <th className="px-4 py-3">Ciclo</th>
            <th className="px-4 py-3">30d</th>
            <th className="px-4 py-3">Última participação</th>
            <th className="px-4 py-3">Equipe</th>
            <th className="px-4 py-3">Origem</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr
              key={row.id}
              className="bg-ur-graphite/50 hover:bg-white/[0.025]"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <UserRound
                    className="text-ur-gold"
                    size={16}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-bold">{row.publicName}</p>
                    <p className="text-xs text-zinc-600">{row.athleteCode}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-400">{row.poleName ?? "—"}</td>
              <td className="px-4 py-3">
                {row.level ? <Badge>{row.level}</Badge> : "—"}
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-2">
                  {lifecycle(row) === "Em risco" && (
                    <AlertTriangle
                      className="text-ur-gold"
                      size={14}
                      aria-hidden="true"
                    />
                  )}
                  <Badge>{lifecycle(row)}</Badge>
                </span>
              </td>
              <td className="px-4 py-3 font-bold">{row.participations30d}</td>
              <td className="px-4 py-3 text-zinc-400">
                {row.daysSinceLastParticipation === null
                  ? "—"
                  : row.daysSinceLastParticipation === 0
                    ? "Hoje"
                    : `${row.daysSinceLastParticipation}d`}
              </td>
              <td className="px-4 py-3">
                {row.teamNames.length > 0 ? (
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <Shield size={14} aria-hidden="true" />
                    {row.teamNames.join(", ")}
                  </span>
                ) : (
                  <span className="text-ur-gold font-bold">Atleta livre</span>
                )}
              </td>
              <td className="px-4 py-3 text-zinc-500">{row.source ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
