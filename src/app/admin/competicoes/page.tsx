import {
  CalendarCheck,
  ClipboardCheck,
  ListChecks,
  Trophy,
  UsersRound,
} from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminCompetitionsSnapshot } from "@/server/services/admin-competitions-service";

const date = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function CompetitionsPage() {
  await requireAdminModule("competitions");
  const snapshot = await getAdminCompetitionsSnapshot();
  const metrics = [
    ["Competições", snapshot.metrics.competitions, Trophy],
    ["Publicadas", snapshot.metrics.published, CalendarCheck],
    ["Inscrições", snapshot.metrics.registrations, UsersRound],
    ["Partidas", snapshot.metrics.matches, ListChecks],
    ["Gates 100%", snapshot.metrics.gatesReady, ClipboardCheck],
  ] as const;
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Esportivo"
        title="Competições"
        description="Series, Cup e Legends acompanhadas por evidências operacionais, inscrições, partidas, staff e premiação."
        action={<Badge>Competition Gates</Badge>}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-zinc-500 uppercase">
                {label}
              </p>
              <Icon className="text-ur-gold" size={16} aria-hidden="true" />
            </div>
            <p className="font-display mt-3 text-2xl font-black">{value}</p>
          </Card>
        ))}
      </div>
      {snapshot.competitions.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhuma competição cadastrada.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Quando Series, Cup ou Legends forem criadas no calendário
            competitivo, seus Gates aparecerão aqui.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshot.competitions.map((competition) => (
            <Card
              key={competition.id}
              className={
                competition.readiness < 70 ? "border-ur-gold/40" : undefined
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xl font-black uppercase">
                    {competition.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {competition.product} ·{" "}
                    {date.format(new Date(competition.startsAt))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-ur-gold text-3xl font-black">
                    {competition.readiness}%
                  </p>
                  <p className="text-[0.62rem] text-zinc-600 uppercase">
                    Readiness
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {competition.gate.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-ur flex items-center justify-between gap-3 border px-3 py-2 ${item.complete ? "bg-white/[0.02]" : "border-ur-gold/40 bg-ur-gold/[0.04]"}`}
                  >
                    <div>
                      <p className="text-sm font-bold">{item.label}</p>
                      <p className="text-xs text-zinc-600">{item.detail}</p>
                    </div>
                    <Badge>{item.complete ? "OK" : "Pendente"}</Badge>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-500">
                <span>{competition.divisions} divisões</span>
                <span>·</span>
                <span>{competition.registrations} inscrições</span>
                <span>·</span>
                <span>{competition.eligibleRegistrations} elegíveis</span>
                <span>·</span>
                <span>{competition.matches} partidas</span>
              </div>
            </Card>
          ))}
        </div>
      )}
      {snapshot.sourceErrors.length > 0 && (
        <Card>
          <p className="font-bold">Leitura parcial</p>
          <ul className="mt-2 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
