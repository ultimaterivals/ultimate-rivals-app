import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listSponsorOperations } from "@/server/repositories/partner-market.repository";
import { Handshake, PackageCheck, ReceiptText } from "lucide-react";

function brl(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

export default async function AdminSponsorsPage() {
  const { sponsors, agreements, assets, deliveries, shares } =
    await listSponsorOperations(await createClient());

  const allocatedShare = shares.reduce(
    (sum, item) => sum + Number(item.allocated_amount ?? 0),
    0,
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Patrocinadores"
        title="Operação de sponsors"
        description="Agreements, ativos, ativações, entregas e projeção da regra de 20% para quadras."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Sponsors"
          value={String(sponsors.length)}
          hint="Sem PII desnecessária"
          icon={Handshake}
        />
        <StatCard
          label="Agreements"
          value={String(agreements.length)}
          hint="Cash/barter/mixed"
          icon={ReceiptText}
        />
        <StatCard
          label="Share projetado"
          value={brl(allocatedShare)}
          hint="Nunca acima de 20%"
          icon={PackageCheck}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Sponsors
          </h2>
          {sponsors.length ? (
            <div className="mt-4 grid gap-3">
              {sponsors.map((sponsor) => (
                <div key={sponsor.sponsor_id} className="rounded-ur border p-4">
                  <div className="flex justify-between gap-3">
                    <p className="font-bold">{sponsor.name}</p>
                    <Badge>{sponsor.status}</Badge>
                  </div>
                  <p className="text-sm text-zinc-400">
                    {sponsor.agreements} agreement(s) •{" "}
                    {sponsor.planned_deliveries} entrega(s) planejada(s)
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem sponsors"
              description="Sponsors fictícios/DEV ou reais futuros aparecerão aqui."
            />
          )}
        </Card>

        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Entregas
          </h2>
          {deliveries.length ? (
            <div className="mt-4 grid gap-3">
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="rounded-ur border p-4">
                  <p className="font-bold">{delivery.description}</p>
                  <p className="text-sm text-zinc-400">
                    {delivery.sponsorship_agreements?.name} • {delivery.status}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem deliveries"
              description="Planned/delivered/waived/cancelled serão acompanhados aqui."
            />
          )}
        </Card>
      </section>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">
          Regra de 20%
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Apenas sponsorship cash/mixed marcado como elegível gera share; o
          banco bloqueia soma acima de 20%.
        </p>
        <div className="mt-4 grid gap-3">
          {shares.map((share) => (
            <div key={share.agreement_id} className="rounded-ur border p-4">
              <p className="font-bold">{share.agreement_name}</p>
              <p className="text-sm text-zinc-400">
                {share.sponsor_name} • {share.allocated_percent}% •{" "}
                {brl(share.allocated_amount)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-zinc-500">
        Ativos configurados: {assets.length}
      </p>
    </div>
  );
}
