import { DatabaseZap } from "lucide-react";
import { AgendaDemandBoard } from "@/components/admin/agenda/agenda-demand-board";
import { AgendaMobileList } from "@/components/admin/agenda/agenda-mobile-list";
import { AgendaSummary } from "@/components/admin/agenda/agenda-summary";
import {
  AgendaToolbar,
  AgendaPoleFilters,
} from "@/components/admin/agenda/agenda-toolbar";
import { AgendaWeekGrid } from "@/components/admin/agenda/agenda-week-grid";
import { CommandSection } from "@/components/admin/command-section";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminAgendaSnapshot } from "@/server/services/admin-agenda-service";

type AgendaSearchParams = Promise<{
  week?: string | string[];
  pole?: string | string[];
  start?: string | string[];
  end?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numeric(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: AgendaSearchParams;
}) {
  await requireAdminModule("agenda");
  const params = await searchParams;
  const snapshot = await getAdminAgendaSnapshot({
    week: single(params.week),
    pole: single(params.pole),
    startHour: numeric(single(params.start)),
    endHour: numeric(single(params.end)),
  });

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Operação"
        title="Agenda e Demanda"
        description="Visão semanal das operações, disponibilidade de capacidade e sinais reais de interesse entre 06:00 e 00:00."
        action={<Badge>Dados reais</Badge>}
      />

      <AgendaSummary metrics={snapshot.metrics} />
      <AgendaToolbar snapshot={snapshot} />
      <AgendaPoleFilters snapshot={snapshot} />

      <CommandSection
        title="Semana operacional"
        description="A grade usa blocos de 30 minutos. Sessões com reservas ganham destaque; conflitos e pendências ficam visíveis no próprio calendário."
      >
        <AgendaWeekGrid snapshot={snapshot} />
        <AgendaMobileList snapshot={snapshot} />
      </CommandSection>

      <CommandSection
        title="Demanda da semana"
        description="Interesse não é reserva. Este quadro mostra formação de demanda, reservas confirmadas e lista de espera separadamente."
      >
        <AgendaDemandBoard snapshot={snapshot} />
      </CommandSection>

      {snapshot.sourceErrors.length > 0 && (
        <CommandSection title="Saúde das fontes">
          <Card>
            <div className="flex items-start gap-3">
              <DatabaseZap
                className="text-ur-gold mt-0.5"
                size={18}
                aria-hidden="true"
              />
              <div>
                <p className="font-bold">Leitura parcial da agenda</p>
                <ul className="mt-2 grid gap-1 text-sm text-zinc-500">
                  {snapshot.sourceErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </CommandSection>
      )}
    </div>
  );
}
