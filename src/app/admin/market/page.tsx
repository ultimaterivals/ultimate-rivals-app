import { revalidatePath } from "next/cache";
import { Badge, Button, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listMarketAdmin } from "@/server/repositories/partner-market.repository";
import { Gift, Package, Ticket } from "lucide-react";

function brl(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

async function fulfillRedemption(formData: FormData) {
  "use server";

  await requireRole("admin");
  const redemptionId = String(formData.get("redemptionId") ?? "");
  if (!redemptionId) return;

  const client = await createClient();
  const { error } = await client
    .from("market_redemptions")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
    .eq("id", redemptionId)
    .in("status", ["reserved", "available"]);
  if (error) throw error;

  revalidatePath("/admin/market");
  revalidatePath("/admin/studio");
}

export default async function AdminMarketPage() {
  await requireRole("admin");
  const { partners, items, offers, redemptions } = await listMarketAdmin(
    await createClient(),
  );

  const pending = redemptions.filter((redemption) =>
    ["reserved", "available"].includes(redemption.status),
  ).length;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="UR Market"
        title="Market MVP"
        description="Parceiros, itens, ofertas BRL/URC e resgates privados por atleta. Reservas podem ser concluídas pela operação quando o benefício for entregue."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Parceiros"
          value={String(partners.length)}
          hint="Categorias Q1"
          icon={Package}
        />
        <StatCard
          label="Ofertas"
          value={String(offers.length)}
          hint="BRL e/ou URC"
          icon={Gift}
        />
        <StatCard
          label="Resgates"
          value={String(redemptions.length)}
          hint="Histórico privado"
          icon={Ticket}
        />
        <StatCard
          label="A entregar"
          value={String(pending)}
          hint="Reservados/disponíveis"
          icon={Ticket}
        />
      </div>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">Ofertas</h2>
        {offers.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {offers.map((offer) => (
              <div key={offer.id} className="rounded-ur border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{offer.name}</p>
                    <p className="text-sm text-zinc-400">
                      {offer.market_items?.name}
                    </p>
                  </div>
                  <Badge>{offer.status}</Badge>
                </div>
                <p className="mt-3 text-sm">
                  {offer.accepts_brl ? brl(offer.brl_amount) : "sem BRL"}
                  {offer.accepts_urc ? ` + ${offer.urc_amount} URC` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sem ofertas"
            description="Cadastre e publique ofertas para disponibilizá-las no aplicativo do atleta."
          />
        )}
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-black uppercase">Itens</h2>
          <div className="mt-4 grid gap-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-ur border p-4">
                <p className="font-bold">{item.name}</p>
                <p className="text-sm text-zinc-400">
                  {item.category} • {item.item_type}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Resgates
          </h2>
          {redemptions.length ? (
            <div className="mt-4 grid gap-3">
              {redemptions.map((redemption) => {
                const actionable = ["reserved", "available"].includes(
                  redemption.status,
                );
                return (
                  <div key={redemption.id} className="rounded-ur border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{redemption.market_offers?.name}</p>
                        <p className="text-sm text-zinc-400">
                          {redemption.athletes?.public_name} • {redemption.status}
                        </p>
                        <p className="mt-1 font-mono text-xs text-zinc-500">
                          {redemption.redemption_code}
                        </p>
                      </div>
                      <Badge>{redemption.status}</Badge>
                    </div>
                    {actionable && (
                      <form action={fulfillRedemption} className="mt-4">
                        <input
                          type="hidden"
                          name="redemptionId"
                          value={redemption.id}
                        />
                        <Button type="submit" className="w-full">
                          Marcar benefício como entregue
                        </Button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Sem resgates"
              description="Resgates aparecem aqui quando atletas utilizam ofertas."
            />
          )}
        </Card>
      </section>
    </div>
  );
}
