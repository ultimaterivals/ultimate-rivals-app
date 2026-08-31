import { Coins, CreditCard, LockKeyhole, WalletCards } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

export default async function AthleteWalletPage() {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);
  const balance = snapshot.summary?.urCoinBalance ?? 0;

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Wallet URC"
        title="Sua economia no ecossistema"
        description="UR Coins e créditos são saldos diferentes. O App apenas lê os registros oficiais e nunca recalcula a economia localmente."
      />

      <section className="athlete-stage p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-ur-gold text-xs font-black tracking-[.22em] uppercase">
              Saldo disponível
            </p>
            <p className="font-display text-ur-gold mt-2 text-6xl font-black sm:text-7xl">
              {balance.toLocaleString("pt-BR")}
            </p>
            <p className="mt-1 font-bold text-zinc-400">UR Coins</p>
          </div>
          <Coins className="text-ur-gold" size={46} aria-hidden="true" />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <WalletCards className="text-ur-gold" aria-hidden="true" />
          <p className="mt-3 text-xs font-bold tracking-wider text-zinc-500 uppercase">
            UR Coins
          </p>
          <p className="font-display mt-2 text-3xl font-black">
            {balance.toLocaleString("pt-BR")}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            moeda do ecossistema para utilidades e resgates autorizados
          </p>
        </Card>
        <Card>
          <CreditCard className="text-ur-gold" aria-hidden="true" />
          <p className="mt-3 text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Créditos disponíveis
          </p>
          <p className="font-display mt-2 text-3xl font-black">
            {snapshot.creditBalance ?? "—"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            unidades para atividades em pacotes ativos
          </p>
        </Card>
        <Card>
          <LockKeyhole className="text-ur-gold" aria-hidden="true" />
          <p className="mt-3 text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Créditos reservados
          </p>
          <p className="font-display mt-2 text-3xl font-black">
            {snapshot.creditReserved ?? "—"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            holds vinculados a reservas oficiais
          </p>
        </Card>
      </section>

      <Card>
        <h2 className="text-xl font-black">Regra econômica</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Pontos de ranking medem desempenho esportivo. UR Coins representam a
          economia de recompensas. Créditos representam direito de participação
          em atividades. Os três saldos permanecem separados.
        </p>
      </Card>
    </div>
  );
}
