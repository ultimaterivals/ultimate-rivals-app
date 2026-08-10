import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Repeat2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminIntelligenceSnapshot } from "@/server/services/admin-intelligence-service";

function metric(value: number | null) {
  return value === null ? "—" : value.toLocaleString("pt-BR");
}
export default async function IntelligencePage() {
  await requireAdminModule("intelligence");
  const snapshot = await getAdminIntelligenceSnapshot();
  const metrics = [
    ["Origens", snapshot.metrics.trackedSources, BrainCircuit],
    ["Cadastros", snapshot.metrics.signups, UserPlus],
    ["1ª participação", snapshot.metrics.firstParticipation, UsersRound],
    ["2ª participação", snapshot.metrics.secondParticipation, Repeat2],
    ["Ativos 30d", snapshot.metrics.active30d, Activity],
    ["Em risco", snapshot.metrics.atRisk, Activity],
  ] as const;
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Gestão"
        title="Inteligência UR"
        description="Aquisição, ativação, retenção e demanda transformadas em sinais explicáveis para decisão."
        action={<Badge>Sem caixa-preta</Badge>}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-zinc-500 uppercase">
                {label}
              </p>
              <Icon className="text-ur-gold" size={16} aria-hidden="true" />
            </div>
            <p className="font-display mt-3 text-2xl font-black">
              {metric(value)}
            </p>
          </Card>
        ))}
      </div>
      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-xl font-black uppercase">
            O que os dados indicam
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Cada recomendação informa a evidência que a gerou.
          </p>
        </div>
        {snapshot.insights.length === 0 ? (
          <Card>
            <p className="text-sm text-zinc-400">
              Ainda não existem dados suficientes para gerar recomendações
              operacionais.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {snapshot.insights.map((insight) => (
              <Link key={insight.id} href={insight.href}>
                <Card className="group border-ur-gold/25 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge>{insight.type}</Badge>
                      <p className="mt-3 font-bold">{insight.title}</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        {insight.detail}
                      </p>
                    </div>
                    <ArrowRight
                      className="text-ur-gold shrink-0 transition-transform group-hover:translate-x-0.5"
                      size={16}
                      aria-hidden="true"
                    />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="grid gap-4">
        <h2 className="font-display text-xl font-black uppercase">
          Aquisição por origem
        </h2>
        {snapshot.sources && snapshot.sources.length > 0 ? (
          <div className="rounded-ur overflow-x-auto border">
            <table className="w-full min-w-[64rem] text-left text-sm">
              <thead className="bg-ur-panel text-[0.68rem] tracking-wider text-zinc-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Cadastros</th>
                  <th className="px-4 py-3">Interesses</th>
                  <th className="px-4 py-3">Reservas</th>
                  <th className="px-4 py-3">1ª</th>
                  <th className="px-4 py-3">2ª</th>
                  <th className="px-4 py-3">Cadastro→1ª</th>
                  <th className="px-4 py-3">1ª→2ª</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {snapshot.sources.map((source) => (
                  <tr key={source.source} className="bg-ur-graphite/50">
                    <td className="px-4 py-3 font-bold">{source.source}</td>
                    <td className="px-4 py-3">{source.signups}</td>
                    <td className="px-4 py-3">{source.interests}</td>
                    <td className="px-4 py-3">{source.reservations}</td>
                    <td className="px-4 py-3">{source.firstParticipation}</td>
                    <td className="px-4 py-3">{source.secondParticipation}</td>
                    <td className="px-4 py-3">
                      {source.signupToFirstRate === null
                        ? "—"
                        : `${source.signupToFirstRate}%`}
                    </td>
                    <td className="text-ur-gold px-4 py-3 font-bold">
                      {source.firstToSecondRate === null
                        ? "—"
                        : `${source.firstToSecondRate}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card>
            <p className="text-sm text-zinc-400">
              Nenhuma origem de aquisição registrada.
            </p>
          </Card>
        )}
      </section>
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
