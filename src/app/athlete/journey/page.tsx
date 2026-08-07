import { Check, CircleDot, Flag, Medal } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  formatAthleteLevel,
  getAthleteDashboard,
} from "@/server/services/athlete-experience.service";

export default async function AthleteJourneyPage() {
  const identity = await requireRole("athlete");
  const data = await getAthleteDashboard(await createClient(), identity.userId);
  if (!data) notFound();
  const events = [
    {
      key: "joined",
      date: data.athlete.created_at,
      title: "Entrou no Ultimate Rivals",
      detail: "Início da sua identidade esportiva oficial.",
      icon: Flag,
    },
    ...[...data.development.levels].reverse().map((level) => ({
      key: `level-${level.starts_at}`,
      date: level.starts_at,
      title: `${formatAthleteLevel(level.level).short} · ${formatAthleteLevel(level.level).name}`,
      detail: level.reason ?? "Nível homologado pela operação.",
      icon: Medal,
    })),
    ...data.matches
      .filter((match) => match.resultStatus === "homologated")
      .slice(-1)
      .map((match) => ({
        key: `match-${match.id}`,
        date: match.playedAt,
        title: "Primeiro jogo homologado",
        detail: `${match.formatName} · ${match.level?.toUpperCase()}`,
        icon: Check,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="mx-auto grid max-w-4xl gap-7">
      <PageHeader
        eyebrow="Minha carreira"
        title="Jornada"
        description="Marcos reais da sua evolução no Ultimate Rivals. Nenhuma conquista é criada sem evidência homologada."
      />
      <Card className="border-ur-gold/30">
        <p className="text-xs font-black text-zinc-500 uppercase">
          Nível atual
        </p>
        <strong className="text-ur-gold font-display mt-2 block text-5xl uppercase">
          {formatAthleteLevel(data.level).short}{" "}
          <span className="text-white">
            {formatAthleteLevel(data.level).name}
          </span>
        </strong>
      </Card>
      <ol className="relative ml-5 border-l border-zinc-700 pl-7">
        {events.map((event, index) => {
          const Icon = event.icon;
          return (
            <li key={event.key} className="relative pb-10 last:pb-0">
              <span className="bg-ur-black border-ur-gold absolute -left-[2.75rem] flex size-8 items-center justify-center rounded-full border">
                <Icon className="text-ur-gold" size={15} />
              </span>
              <p className="text-xs font-bold text-zinc-500 uppercase">
                {new Date(event.date).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <h2 className="mt-1 text-xl font-black uppercase">
                {event.title}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">{event.detail}</p>
              {index === events.length - 1 && (
                <p className="text-ur-gold mt-3 flex items-center gap-2 text-xs font-black">
                  <CircleDot size={14} /> VOCÊ ESTÁ AQUI
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
