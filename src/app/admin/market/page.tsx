import { revalidatePath } from "next/cache";
import { Gift, Package, Ticket } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function brl(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

async function fulfillRedemption(formData: FormData) {
  "use server";

  await requireRole(["admin"]);
  const redemptionId = String(formData.get("redemptionId") ?? "");
  if (!redemptionId) return;

  const client = await createClient();
  const { error } = await client
    .from("market_redemptions")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
    })
    .eq("id", redemptionId)
    .in("status", ["reserved", "available"]);

  if (error) throw error;

  revalidatePath("/admin/market");
  revalidatePath("/athlete/market");
}

export default async function AdminMarketPage() {
  await requireRole(["admin"]);
  const client = await createClient();

  const [
    { data: offers, error: offersError },
    { data: redemptions, error: redemptionsError },
  ] = await Promise.all([
    client
      .from("market_offers")
      .select("id,name,status,accepts_brl,brl_amount,accepts_urc,urc_amount")
      .order("created_at", { ascending: false }),
    client
      .from("market_redemptions")
      .select(
        "id,offer_id,athlete_id,status,redemption_code,reserved_at,redeemed_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  if (offersError) throw offersError;
  if (redemptionsError) throw redemptionsError;

  const marketOffers = offers ?? [];
  const marketRedemptions = redemptions ?? [];
  const athleteIds = Array.from(
    new Set(marketRedemptions.map((redemption) => redemption.athlete_id)),
  );
  const { data: athletes, error: athletesError } = athleteIds.length
    ? await client
        .from("athletes")
        .select("id,public_name")
        .in("id", athleteIds)
    : { data: [], error: null };

  if (athletesError) throw athletesError;

  const offerNames = new Map(
    marketOffers.map((offer) => [offer.id, offer.name] as const),
  );
  const athleteNames = new Map(
    (athletes ?? []).map((athlete) => [athlete.id, athlete.public_name] as const),
  );
  const pending = marketRedemptions.filter((redemption) =>
    ["reserved", "available"].includes(redemption.status),
  ).length;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Negócio · UR Market"
        title="Operação de resgates"
        description="Acompanhe ofertas publicadas e conclua a entrega dos benefícios reservados pelos atletas. O Command opera; o App reflete o resultado."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Ofertas"
          value={String(marketOffers.length)}
          hint="Catálogo configurado"
          icon={Gift}
        />
        <StatCard
          label="Resgates"
          value={String(marketRedemptions.length)}
          hint="Histórico privado"
          icon={Ticket}
        />
        <StatCard
          label="A entregar"
          value={String(pending)}
          hint="Reservados/disponíveis"
          icon={Package}
        />
      </div>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">Ofertas</h2>
        {marketOffers.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {marketOffers.map((offer) => (
              <div key={offer.id} className="rounded-ur border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold">{offer.name}</p>
                  <Badge>{offer.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-zinc-400">
                  {offer.accepts_urc
                    ? `${offer.urc_amount ?? 0} URC`
                    : "sem URC"}
                  {offer.accepts_urc && offer.accepts_brl ? " · " : ""}
                  {offer.accepts_brl ? brl(offer.brl_amount) : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sem ofertas"
            description="Quando uma oferta for publicada no backend, ela aparecerá no Command e no App do atleta."
          />
        )}
      </Card>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">Resgates</h2>
        {marketRedemptions.length ? (
          <div className="mt-4 grid gap-3">
            {marketRedemptions.map((redemption) => {
              const actionable = ["reserved", "available"].includes(
                redemption.status,
              );
              const offerName = offerNames.get(redemption.offer_id);
              const athleteName = athleteNames.get(redemption.athlete_id);

              return (
                <div key={redemption.id} className="rounded-ur border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        {offerName ?? "Oferta UR Market"}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {athleteName ?? "Atleta"} · {redemption.status}
                      </p>
                      <p className="mt-1 font-mono text-xs text-zinc-500">
                        {redemption.redemption_code}
                      </p>
                    </div>
                    <Badge>{redemption.status}</Badge>
                  </div>

                  {actionable ? (
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
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Sem resgates"
            description="Os resgates aparecem aqui quando atletas usam UR Coins em ofertas válidas."
          />
        )}
      </Card>
    </div>
  );
}
