import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Database,
  Gauge,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminEcosystemSnapshot } from "@/server/services/admin-ecosystem-service";

function statusLabel(status: string) {
  if (status === "evidence") return "Com evidência";
  if (status === "no-evidence") return "Sem evidência";
  if (status === "not-instrumented") return "Não instrumentado";
  return "Indisponível";
}

export default async function EcosystemPage() {
  await requireAdminModule("ecosystem");
  const snapshot = await getAdminEcosystemSnapshot();
  const metrics = [
    ["Áreas", snapshot.metrics.totalAreas, ListChecks],
    ["Instrumentadas", snapshot.metrics.instrumentedAreas, Database],
    ["Com evidência", snapshot.metrics.areasWithEvidence, CircleCheck],
    ["Sem evidência", snapshot.metrics.areasWithoutEvidence, CircleAlert],
    ["Não instrumentadas", snapshot.metrics.notInstrumented, CircleDashed],
    [
      "Cobertura",
      snapshot.metrics.evidenceCoveragePercent === null
        ? "—"
        : `${snapshot.metrics.evidenceCoveragePercent}%`,
      Gauge,
    ],
  ] as const;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Gestão"
        title="Saúde do Ecossistema"
        description="Mapa das áreas que sustentam o Ultimate Rivals, medido por evidências reais sempre que o sistema já possui uma fonte confiável."
        action={<Badge>18 áreas</Badge>}
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
            <p className="font-display mt-3 text-2xl font-black">{value}</p>
          </Card>
        ))}
      </div>
      <Card className="border-ur-gold/30">
        <p className="font-bold">
          Cobertura não é uma nota subjetiva de saúde.
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Uma área só aparece como “com evidência” quando existe registro real
          na fonte correspondente. Ausência de dados não é transformada
          artificialmente em 60%, 80% ou 100%.
        </p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.areas.map((area) => {
          const content = (
            <Card
              className={`h-full ${area.status === "no-evidence" ? "border-ur-gold/35" : area.status === "unavailable" ? "border-red-500/40" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-black uppercase">
                    {area.name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    {area.purpose}
                  </p>
                </div>
                {area.href && (
                  <ArrowRight
                    className="text-ur-gold shrink-0"
                    size={16}
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <Badge>{statusLabel(area.status)}</Badge>
                <span className="text-xs text-zinc-600">
                  {area.evidenceCount === null ? "—" : area.evidenceCount}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-zinc-600">
                {area.note}
              </p>
            </Card>
          );
          return area.href ? (
            <Link key={area.id} href={area.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={area.id}>{content}</div>
          );
        })}
      </div>
      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-xl font-black uppercase">
            Ritmo de condução
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            O que precisa ser revisto para conduzir o UR com pouca equipe sem
            depender da memória.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {snapshot.cycles.map((cycle) => (
            <Card key={cycle.cadence}>
              <p className="font-display text-ur-gold text-xl font-black uppercase">
                {cycle.cadence}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{cycle.purpose}</p>
              <ul className="mt-4 grid gap-2 text-sm text-zinc-300">
                {cycle.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-ur-gold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
      {snapshot.sourceErrors.length > 0 && (
        <Card>
          <p className="font-bold">Fontes parcialmente indisponíveis</p>
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
