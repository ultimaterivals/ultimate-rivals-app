import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { activatePoleStackAction } from "@/app/admin/agenda/configuracao/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminOperationalSetupSnapshot } from "@/server/services/admin-operational-setup-service";

export default async function PoleHomologationPage() {
  await requireRole(["admin"]);
  const snapshot = await getAdminOperationalSetupSnapshot();
  const poles = snapshot.poles ?? [];
  const venues = snapshot.venues ?? [];
  const courts = snapshot.courts ?? [];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Gate operacional"
        title="Homologação de Polos"
        description="Ative um polo somente depois de cadastrar ao menos um local com quadra. A homologação ativa o conjunto polo + locais + quadras e libera a criação de oportunidades."
        action={
          <Link
            href="/admin/agenda/configuracao"
            className="rounded-ur flex min-h-11 items-center gap-2 border px-4 text-sm font-bold"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Setup
          </Link>
        }
      />

      {poles.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhum polo cadastrado.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Crie a base no Setup Operacional antes da homologação.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {poles.map((pole) => {
            const poleVenues = venues.filter(
              (venue) => venue.poleId === pole.id,
            );
            const venueIds = new Set(poleVenues.map((venue) => venue.id));
            const poleCourts = courts.filter((court) =>
              venueIds.has(court.venueId),
            );
            const ready = poleVenues.length > 0 && poleCourts.length > 0;
            const active = pole.status === "active";

            return (
              <Card
                key={pole.id}
                className={active ? "border-ur-gold/45" : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{pole.name}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {pole.city}/{pole.state} · {poleVenues.length} local(is) ·{" "}
                      {poleCourts.length} quadra(s)
                    </p>
                  </div>
                  <Badge>{pole.status}</Badge>
                </div>

                <div className="rounded-ur mt-4 border p-3 text-sm text-zinc-500">
                  {active
                    ? "Polo homologado. Já pode receber oportunidades de demanda."
                    : ready
                      ? "Estrutura mínima encontrada. A homologação será auditada e ativará locais e quadras vinculados."
                      : "Gate bloqueado: cadastre ao menos um local com uma quadra antes de ativar."}
                </div>

                {!active && (
                  <form action={activatePoleStackAction} className="mt-4">
                    <input type="hidden" name="poleId" value={pole.id} />
                    <Button type="submit" className="w-full" disabled={!ready}>
                      <ShieldCheck size={16} aria-hidden="true" /> Homologar
                      polo
                    </Button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
