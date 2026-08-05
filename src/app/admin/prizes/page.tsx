import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listPrizeRepassOperations } from "@/server/repositories/finance.repository";
import { Medal, Trophy, WalletCards } from "lucide-react";

function brl(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

export default async function AdminPrizesPage() {
  const {
    templates,
    templateAllocations,
    repassPlans,
    repassAllocations,
    operations,
  } = await listPrizeRepassOperations(await createClient());

  const prizeReferenceTotal = templateAllocations.reduce(
    (sum, item) => sum + Number(item.amount ?? 0),
    0,
  );
  const repassReferenceTotal = repassAllocations.reduce(
    (sum, item) => sum + Number(item.amount ?? 0),
    0,
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Temporada 1"
        title="Premiações e repasses"
        description="Templates configuráveis, snapshot ao publicar e obrigações operacionais sem executar transferência bancária."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Templates Q1"
          value={String(templates.length)}
          hint="Series, Cup e Legends"
          icon={Trophy}
        />
        <StatCard
          label="Premiação referência"
          value={brl(prizeReferenceTotal)}
          hint="Valores revisáveis por admin"
          icon={Medal}
        />
        <StatCard
          label="Repasse Q1"
          value={brl(repassReferenceTotal)}
          hint="R$5.000 por ranking + elegibilidade"
          icon={WalletCards}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-black uppercase">
                  {template.name}
                </h2>
                <p className="text-sm text-zinc-400">{template.code}</p>
              </div>
              <Badge>{template.product}</Badge>
            </div>
            <div className="mt-4 grid gap-2">
              {templateAllocations
                .filter(
                  (item) =>
                    item.tournament_prize_plan_templates?.code ===
                    template.code,
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className="rounded-ur flex items-center justify-between bg-black/25 p-3 text-sm"
                  >
                    <span className="font-bold">{item.award_label}</span>
                    <span>{brl(item.amount)}</span>
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </section>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">
          Repasse trimestral
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          O Legends é palco de entrega, mas não redefine o ranking trimestral.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {repassAllocations.map((allocation) => (
            <div key={allocation.id} className="rounded-ur border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{allocation.allocation_label}</p>
                  <p className="text-sm text-zinc-400">
                    {allocation.beneficiary_type} #{allocation.rank_position}
                  </p>
                </div>
                <Badge>{allocation.status}</Badge>
              </div>
              <p className="font-display mt-3 text-2xl font-black">
                {brl(allocation.amount)}
              </p>
            </div>
          ))}
        </div>
        {!repassPlans.length && (
          <EmptyState
            title="Sem plano de repasse"
            description="O seed DEV deve criar o plano Q1 de referência."
          />
        )}
      </Card>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">
          Obrigações aplicadas
        </h2>
        {operations.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs tracking-wider text-zinc-500 uppercase">
                <tr>
                  <th className="py-2">Tipo</th>
                  <th>Origem</th>
                  <th>Beneficiário</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {operations.map((item) => (
                  <tr key={item.allocation_id}>
                    <td className="py-3 font-bold">{item.obligation_type}</td>
                    <td>{item.source_name}</td>
                    <td>
                      {item.athlete_name ?? item.team_name ?? "Projetado"}
                    </td>
                    <td>{brl(item.amount)}</td>
                    <td>
                      <Badge>{item.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sem obrigações aplicadas"
            description="Templates e repasses de referência estão prontos; obrigações reais surgem após torneios/ranking homologado."
          />
        )}
      </Card>
    </div>
  );
}
