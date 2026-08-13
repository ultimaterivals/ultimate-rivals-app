import {
  CheckCircle2,
  MapPin,
  Shield,
  Trophy,
  UsersRound,
} from "lucide-react";
import { activateTeamAction } from "@/app/admin/equipes/actions";
import { Badge, Card } from "@/components/ui";
import type { AdminTeamRow } from "@/features/admin-teams/types";

export function TeamCard({ team }: { team: AdminTeamRow }) {
  return (
    <Card className="grid gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xl font-black uppercase">
            {team.name}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
            <MapPin size={14} aria-hidden="true" />
            {team.poleName ?? "Polo a definir"}
          </p>
        </div>
        <Badge>{team.status}</Badge>
      </div>

      {team.status === "draft" && (
        <form action={activateTeamAction} className="grid gap-2">
          <input type="hidden" name="teamId" value={team.id} />
          <p className="text-xs leading-5 text-zinc-500">
            Homologar torna a equipe apta a receber vínculos competitivos. Esta
            ação não filia atletas nem altera jogos anteriores.
          </p>
          <button
            type="submit"
            className="bg-ur-gold text-ur-black rounded-ur inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-black"
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            Homologar equipe
          </button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-ur border p-2">
          <UsersRound
            className="text-ur-gold mx-auto"
            size={15}
            aria-hidden="true"
          />
          <p className="font-display mt-1 text-xl font-black">
            {team.activeAthletes}
          </p>
          <p className="text-[0.62rem] text-zinc-600 uppercase">Atletas</p>
        </div>
        <div className="rounded-ur border p-2">
          <Shield
            className="text-ur-gold mx-auto"
            size={15}
            aria-hidden="true"
          />
          <p className="font-display mt-1 text-xl font-black">
            {team.rosterCount}
          </p>
          <p className="text-[0.62rem] text-zinc-600 uppercase">Formações</p>
        </div>
        <div className="rounded-ur border p-2">
          <Trophy
            className="text-ur-gold mx-auto"
            size={15}
            aria-hidden="true"
          />
          <p className="font-display mt-1 text-xl font-black">
            {team.tournamentRegistrations}
          </p>
          <p className="text-[0.62rem] text-zinc-600 uppercase">Inscrições</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
          Duplas oficiais por categoria
        </p>
        {team.doubles.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            Categorias ainda não configuradas.
          </p>
        ) : (
          <div className="mt-3 grid gap-2">
            {team.doubles.map((category) => {
              const full = category.registeredDoubles >= category.limit;
              return (
                <div
                  key={category.categoryId}
                  className="rounded-ur flex items-center justify-between gap-3 border bg-white/[0.02] px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-bold">{category.categoryName}</p>
                    <p className="text-xs text-zinc-600">
                      {category.activeDoubles} ativa(s)
                    </p>
                  </div>
                  <p
                    className={`font-display text-xl font-black ${full ? "text-ur-gold" : ""}`}
                  >
                    {category.registeredDoubles}/{category.limit}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
