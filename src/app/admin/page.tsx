import { ArrowUpRight, DatabaseZap } from "lucide-react";
import Link from "next/link";
import { CommandLaunchDesk } from "@/components/admin/command-launch-desk";
import { CommandPilotReadiness } from "@/components/admin/command-pilot-readiness";
import { CommandSection } from "@/components/admin/command-section";
import { CommandTodayControlRoom } from "@/components/admin/command-today-control-room";
import {
  CommandActions,
  CommandAttention,
  CommandDemand,
  CommandFunnelPanel,
  CommandMetricGrid,
  CommandUpcoming,
} from "@/components/admin/command-live-panels";
import { Badge, Card, PageHeader } from "@/components/ui";
import {
  adminPortalRoles,
  getAdminModulesForRole,
} from "@/lib/auth/admin-modules";
import { requireRole } from "@/lib/auth/session";
import { getAdminCommandSnapshot } from "@/server/services/admin-command-service";
import { getAdminPilotReadinessSnapshot } from "@/server/services/admin-pilot-readiness-service";

export default async function AdminPage() {
  const user = await requireRole(adminPortalRoles);
  const [snapshot, pilotReadiness, modules] = await Promise.all([
    getAdminCommandSnapshot(),
    user.role === "admin"
      ? getAdminPilotReadinessSnapshot()
      : Promise.resolve(null),
    Promise.resolve(
      getAdminModulesForRole(user.role).filter(
        (item) => item.key !== "command",
      ),
    ),
  ]);

  const sourceBadge =
    snapshot.status === "partial"
      ? "Dados parciais"
      : snapshot.status === "empty"
        ? "Base conectada · sem registros"
        : "Dados reais";

  return (
    <div className="grid gap-10">
      <PageHeader
        eyebrow="UR Operating System"
        title="Command Center"
        description="Visão central para conduzir a temporada, operação esportiva e negócio do Ultimate Rivals."
        action={<Badge>{sourceBadge}</Badge>}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <DatabaseZap className="text-ur-gold" size={16} aria-hidden="true" />
        <span>
          {snapshot.season
            ? `${snapshot.season.name} · ${snapshot.season.status}`
            : "Nenhuma temporada operacional encontrada"}
        </span>
        {snapshot.sourceErrors.length > 0 && (
          <span>
            · {snapshot.sourceErrors.length} fonte(s) com falha de leitura
          </span>
        )}
      </div>

      <CommandTodayControlRoom snapshot={snapshot} />

      {pilotReadiness && <CommandLaunchDesk snapshot={pilotReadiness} />}

      <CommandSection
        title="O que está acontecendo"
        description="Indicadores lidos do Supabase com a sessão autenticada do usuário."
      >
        <CommandMetricGrid snapshot={snapshot} />
      </CommandSection>

      {pilotReadiness && (
        <CommandSection
          title="Gate de implantação"
          description="Auditoria detalhada do que ainda impede o primeiro UR Play real de ponta a ponta."
        >
          <CommandPilotReadiness snapshot={pilotReadiness} />
        </CommandSection>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <CommandAttention snapshot={snapshot} />
        <CommandActions snapshot={snapshot} />
      </div>

      <CommandUpcoming snapshot={snapshot} />
      <CommandDemand snapshot={snapshot} />
      <CommandFunnelPanel snapshot={snapshot} />

      {snapshot.sourceErrors.length > 0 && (
        <CommandSection title="Saúde das fontes">
          <Card>
            <p className="font-bold">
              Algumas leituras não puderam ser concluídas
            </p>
            <ul className="mt-3 grid gap-2 text-sm text-zinc-500">
              {snapshot.sourceErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </Card>
        </CommandSection>
      )}

      <CommandSection
        title="Mapa do ecossistema"
        description="Atalhos para os módulos administrativos liberados para o seu perfil."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((item) => (
            <Link key={item.key} href={item.href} className="group block">
              <Card className="h-full transition-transform group-hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-xl font-black uppercase">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {item.description}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="text-ur-gold shrink-0"
                    size={18}
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-5">
                  <Badge>Fundação</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </CommandSection>
    </div>
  );
}
