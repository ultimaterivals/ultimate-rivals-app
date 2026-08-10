import { ArrowUpRight, Settings2 } from "lucide-react";
import Link from "next/link";
import { CommandSection } from "@/components/admin/command-section";
import { CommandStatusCard } from "@/components/admin/command-status-card";
import { Badge, Card, PageHeader } from "@/components/ui";
import {
  adminPortalRoles,
  getAdminModulesForRole,
} from "@/lib/auth/admin-modules";
import { requireRole } from "@/lib/auth/session";

const implementationActions = [
  "Validar navegação administrativa",
  "Homologar perfis de acesso",
  "Preparar integração executiva da Sprint C1",
] as const;

export default async function AdminPage() {
  const user = await requireRole(adminPortalRoles);
  const modules = getAdminModulesForRole(user.role).filter(
    (module) => module.key !== "command",
  );

  return (
    <div className="grid gap-10">
      <PageHeader
        eyebrow="UR Operating System"
        title="Command Center"
        description="Visão central para conduzir a temporada, operação esportiva e negócio do Ultimate Rivals."
        action={<Badge>Fundação C0</Badge>}
      />

      <CommandSection
        title="O que está acontecendo"
        description="A estrutura está pronta. A Sprint C1 conectará os indicadores às views administrativas reais do Supabase."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CommandStatusCard label="Hoje" hint="Aguardando integração C1" />
          <CommandStatusCard
            label="Próximos 7 dias"
            hint="Aguardando integração C1"
          />
          <CommandStatusCard
            label="Atletas ativos"
            hint="Aguardando integração C1"
          />
          <CommandStatusCard label="Receita" hint="Aguardando integração C1" />
        </div>
      </CommandSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <CommandSection title="O que exige atenção">
          <Card className="min-h-44">
            <p className="font-bold">Nenhum alerta operacional carregado</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
              Alertas serão derivados de agenda, demanda, atletas, financeiro e
              gates competitivos na Sprint C1. Nesta fundação não exibimos
              alertas simulados.
            </p>
          </Card>
        </CommandSection>

        <CommandSection title="O que fazer agora">
          <Card className="min-h-44">
            <div className="mb-4 flex items-center gap-2">
              <Settings2
                className="text-ur-gold"
                size={18}
                aria-hidden="true"
              />
              <Badge>Configuração</Badge>
            </div>
            <ol className="grid gap-3 text-sm text-zinc-300">
              {implementationActions.map((action, index) => (
                <li key={action} className="flex gap-3">
                  <span className="text-ur-gold font-bold">0{index + 1}</span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </Card>
        </CommandSection>
      </div>

      <CommandSection
        title="Mapa do ecossistema"
        description="Atalhos para os módulos administrativos liberados para o seu perfil."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <Link key={module.key} href={module.href} className="group block">
              <Card className="h-full transition-transform group-hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-xl font-black uppercase">
                      {module.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {module.description}
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
