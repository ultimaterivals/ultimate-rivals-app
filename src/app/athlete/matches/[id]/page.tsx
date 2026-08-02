import { ArrowLeft, MapPin, ShieldCheck, Swords } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  getAthleteId,
  listAthleteMatches,
} from "@/server/services/athlete-experience.service";

export default async function AthleteMatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const identity = await requireRole("athlete");
  const client = await createClient();
  const athleteId = await getAthleteId(client, identity.userId);
  if (!athleteId) notFound();
  const match = (await listAthleteMatches(client, athleteId)).find(
    (item) => item.id === id,
  );
  if (!match) notFound();
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <Link
        href="/athlete/matches"
        className="flex min-h-11 w-fit items-center gap-2 text-sm font-black text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={17} /> VOLTAR AOS JOGOS
      </Link>
      <PageHeader
        eyebrow={match.matchCode}
        title={
          match.resultStatus === "homologated"
            ? match.won
              ? "VitÃ³ria"
              : "Partida homologada"
            : match.status === "in_progress"
              ? "Partida em andamento"
              : "Resultado em revisÃ£o"
        }
        description={`${match.sessionName ?? "UR Play"} Â· ${new Date(match.playedAt).toLocaleDateString("pt-BR")}`}
      />
      <Card className="border-ur-gold/40 text-center">
        <p className="text-xs font-black text-zinc-500 uppercase">Placar</p>
        <strong className="font-display mt-2 block text-7xl">
          {match.scoreA ?? "â€”"} <span className="text-ur-gold">Ã—</span>{" "}
          {match.scoreB ?? "â€”"}
        </strong>
        {match.resultStatus !== "homologated" && (
          <p className="mt-3 font-bold text-amber-300">
            RESULTADO EM REVISÃƒO Â· PONTOS AINDA NÃƒO EXIBIDOS
          </p>
        )}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {match.sides.map((side) => (
          <Card
            key={side.id}
            className={side.id === match.ownSideId ? "border-ur-gold/50" : ""}
          >
            <p className="text-xs font-black text-zinc-500 uppercase">
              Lado {side.side}
              {side.id === match.ownSideId ? " Â· Seu lado" : ""}
            </p>
            <h2 className="mt-3 text-xl font-black">
              {side.label ??
                side.athletes.map((athlete) => athlete.name).join(" / ")}
            </h2>
            <div className="mt-4 grid gap-2">
              {side.athletes.map((athlete) => (
                <p key={athlete.id} className="border-t pt-2 text-sm">
                  {athlete.name}
                  {athlete.id === athleteId ? " (vocÃª)" : ""}{" "}
                  <span className="text-zinc-500">Â· {athlete.role}</span>
                </p>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <MapPin className="text-ur-gold" />
          <p className="mt-3 text-xs text-zinc-500 uppercase">Quadra</p>
          <strong>{match.courtName ?? "A confirmar"}</strong>
        </Card>
        <Card>
          <Swords className="text-ur-gold" />
          <p className="mt-3 text-xs text-zinc-500 uppercase">Formato</p>
          <strong>
            {match.formatName} Â· {match.categoryName}
          </strong>
        </Card>
        <Card>
          <ShieldCheck className="text-ur-gold" />
          <p className="mt-3 text-xs text-zinc-500 uppercase">
            NÃ­vel da partida
          </p>
          <strong>{match.level?.toUpperCase()}</strong>
        </Card>
      </div>
      <Card>
        <h2 className="text-xl font-black">MINHA PERFORMANCE</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {Object.entries(match.statistics).map(([label, value]) => (
            <div key={label}>
              <p className="text-[.68rem] text-zinc-500 uppercase">{label}</p>
              <strong className="text-2xl">{value}</strong>
            </div>
          ))}
        </div>
      </Card>
      {match.resultStatus === "homologated" && (
        <Card className="border-ur-gold/30">
          <h2 className="text-xl font-black">PONTUAÃ‡ÃƒO</h2>
          {match.ledger.length ? (
            <div className="mt-4 divide-y">
              {match.ledger.map((line, index) => (
                <div
                  key={`${line.label}-${index}`}
                  className="flex justify-between py-3"
                >
                  <span className="capitalize">{line.label}</span>
                  <strong
                    className={
                      line.points >= 0 ? "text-ur-gold" : "text-red-300"
                    }
                  >
                    {line.points >= 0 ? "+" : ""}
                    {line.points}
                  </strong>
                </div>
              ))}
              <div className="flex justify-between pt-4 text-xl font-black">
                <span>TOTAL</span>
                <span className="text-ur-gold">+{match.points ?? 0}</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Nenhuma transaÃ§Ã£o de ranking aplicÃ¡vel a esta partida.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
