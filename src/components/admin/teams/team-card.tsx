import { MapPin, Shield, Trophy, UsersRound } from "lucide-react";
import type { AdminTeamRow } from "@/features/admin-teams/types";
import { Badge, Card } from "@/components/ui";

export function TeamCard({ team }: { team: AdminTeamRow }) {
  return (
    <Card className="grid gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-xl font-black uppercase">{team.name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500"><MapPin size={14} aria-hidden="true" />{team.poleName ?? "Polo a definir"}</p>
        </div>
        <Badge>{team.status}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-ur border p-2"><UsersRound className="text-ur-gold mx-auto" size={15} aria-hidden="true" /><p className="font-display mt-1 text-xl font-black">{team.activeAthletes}</p><p className="text-[0.62rem] text-zinc-600 uppercase">Atletas</p></div>
        <div className="rounded-ur border p-2"><Shield className="text-ur-gold mx-auto" size={15} aria-hidden="true" /><p className="font-display mt-1 text-xl font-black">{team.rosterCount}</p><p className="text-[0.62rem] text-zinc-600 uppercase">Formações</p></div>
        <div className="rounded-ur border p-2"><Trophy className="text-ur-gold mx-auto" size={15} aria-hidden="true" /><p className="font-display mt-1 text-xl font-black">{team.tournamentRegistrations}</p><p className="text-[0.62rem] text-zinc-600 uppercase">Inscrições</p></div>
      </div>
      <div>
        <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Duplas oficiais por categoria</p>
        {team.doubles.length === 0 ? <p className="mt-3 text-sm text-zinc-500">Categorias ainda não configuradas.</p> : <div className="mt-3 grid gap-2">{team.doubles.map((category) => {
          const full = category.registeredDoubles >= category.limit;
          return <div key={category.categoryId} className="flex items-center justify-between gap-3 rounded-ur border bg-white/[0.02] px-3 py-2"><div><p className="text-sm font-bold">{category.categoryName}</p><p className="text-xs text-zinc-600">{category.activeDoubles} ativa(s)</p></div><p className={`font-display text-xl font-black ${full ? "text-ur-gold" : ""}`}>{category.registeredDoubles}/{category.limit}</p></div>;
        })}</div>}
      </div>
    </Card>
  );
}
