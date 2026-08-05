import { TrendingUp, UsersRound } from "lucide-react";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { computeFunnel } from "@/lib/validation/demand";
import { listAdminAcquisition } from "@/server/repositories/demand.repository";

export default async function AdminAcquisitionPage() {
  await requireRole("admin");
  const rows = await listAdminAcquisition(await createClient());
  const totals = rows.reduce(
    (acc, row) => ({
      visitors: acc.visitors + Number(row.visitors ?? 0),
      signups: acc.signups + Number(row.signups ?? 0),
      interests: acc.interests + Number(row.interests ?? 0),
      reservations: acc.reservations + Number(row.reservations ?? 0),
      firstParticipations:
        acc.firstParticipations + Number(row.first_participation ?? 0),
      secondParticipations:
        acc.secondParticipations + Number(row.second_participation ?? 0),
      returning: acc.returning + Number(row.returning ?? 0),
    }),
    {
      visitors: 0,
      signups: 0,
      interests: 0,
      reservations: 0,
      firstParticipations: 0,
      secondParticipations: 0,
      returning: 0,
    },
  );
  const funnel = computeFunnel({
    visitors: totals.visitors,
    signups: totals.signups,
    profiles: totals.signups,
    interests: totals.interests,
    reservations: totals.reservations,
    checkins: totals.firstParticipations,
    firstParticipations: totals.firstParticipations,
    secondParticipations: totals.secondParticipations,
  });

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Admin Acquisition"
        title="Aquisição first-party"
        description="Origem, funil e retenção sem pixel externo, fingerprinting, raw IP ou GPS."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Visitors"
          value={String(totals.visitors)}
          icon={UsersRound}
        />
        <StatCard label="Signups" value={String(totals.signups)} />
        <StatCard label="Reservations" value={String(totals.reservations)} />
        <StatCard
          label="Returning"
          value={String(totals.returning)}
          icon={TrendingUp}
        />
      </div>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">Funil</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Funnel label="Visit → signup" value={funnel.visitToSignup} />
          <Funnel label="Signup → interest" value={funnel.signupToInterest} />
          <Funnel
            label="Interest → reservation"
            value={funnel.interestToReservation}
          />
          <Funnel
            label="Reservation → check-in"
            value={funnel.reservationToCheckin}
          />
          <Funnel
            label="Check-in → first"
            value={funnel.checkinToFirstParticipation}
          />
          <Funnel
            label="First → second"
            value={funnel.firstToSecondParticipation}
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">
          Fontes e campanhas
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs text-zinc-500 uppercase">
              <tr>
                <th className="py-2">Source</th>
                <th>Visitors</th>
                <th>Signups</th>
                <th>Interests</th>
                <th>Reservations</th>
                <th>First</th>
                <th>Second</th>
                <th>Returning</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.source} className="border-t border-zinc-900">
                  <td className="py-3 font-bold">{row.source}</td>
                  <td>{row.visitors}</td>
                  <td>{row.signups}</td>
                  <td>{row.interests}</td>
                  <td>{row.reservations}</td>
                  <td>{row.first_participation}</td>
                  <td>{row.second_participation}</td>
                  <td>{row.returning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Funnel({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-ur border border-zinc-800 p-4">
      <p className="text-xs text-zinc-500 uppercase">{label}</p>
      <strong className="font-display text-2xl">
        {Math.round(value * 100)}%
      </strong>
    </div>
  );
}
