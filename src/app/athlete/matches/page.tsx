import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  getAthleteId,
  listAthleteMatches,
} from "@/server/services/athlete-experience.service";

export default async function AthleteMatchesPage() {
  const identity = await requireRole("athlete");
  const client = await createClient();
  const athleteId = await getAthleteId(client, identity.userId);
  if (!athleteId) notFound();
  const matches = await listAthleteMatches(client, athleteId);
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        eyebrow="Minha carreira"
        title="HistÃ³rico de jogos"
        description="Resultados, estatÃ­sticas e pontuaÃ§Ãµes das suas partidas."
      />
      {matches.length ? (
        <div className="grid gap-3">
          {matches.map((match) => (
            <Link
              key={match.id}
              href={`/athlete/matches/${match.id}`}
              className="cursor-pointer"
            >
              <Card className="hover:border-ur-gold/40 grid gap-4 transition-colors sm:grid-cols-[7rem_1fr_auto] sm:items-center">
                <div>
                  <p className="text-ur-gold text-xs font-black uppercase">
                    {new Date(match.playedAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                  <p className="text-xs text-zinc-500">{match.sessionName}</p>
                </div>
                <div>
                  <strong
                    className={
                      match.resultStatus === "homologated" && match.won
                        ? "text-ur-gold"
                        : ""
                    }
                  >
                    {match.resultStatus === "homologated"
                      ? match.won
                        ? "VITÃ“RIA"
                        : "DERROTA"
                      : match.status === "in_progress"
                        ? "EM ANDAMENTO"
                        : "RESULTADO EM REVISÃƒO"}
                  </strong>
                  <p className="mt-1 text-2xl font-black">
                    {match.scoreA ?? "â€”"} Ã— {match.scoreB ?? "â€”"}
                  </p>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    {match.level?.toUpperCase()} Â· {match.formatName} Â·{" "}
                    {match.categoryName}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  {match.points !== null && (
                    <strong className="text-ur-gold">
                      +{match.points} PTS
                    </strong>
                  )}
                  <ArrowRight className="text-zinc-600" size={18} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Ainda sem jogos"
          description="Seu histÃ³rico comeÃ§a no primeiro UR Play."
          action={
            <Link
              href="/athlete/ur-play"
              className="bg-ur-gold text-ur-black inline-flex min-h-11 items-center gap-2 rounded-lg px-4 font-black"
            >
              <CalendarDays size={18} /> ENCONTRAR UR PLAY
            </Link>
          }
        />
      )}
    </div>
  );
}
