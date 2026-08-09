import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Eye,
  Coins,
  HandCoins,
  ListChecks,
  ShieldCheck,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAdminCommandCenter } from "@/server/repositories/wallet-media-reports.repository";

const quickActions: {
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { href: "/admin/preview", label: "Prévia do Atleta", icon: Eye },
  { href: "/admin/ur-play/new", label: "Criar UR Play", icon: CalendarDays },
  { href: "/admin/demand", label: "Abrir Demand", icon: CalendarDays },
  { href: "/admin/acquisition", label: "Ver Acquisition", icon: TrendingUp },
  { href: "/admin/tournaments/new", label: "Criar torneio", icon: Trophy },
  { href: "/admin/payments", label: "Registrar pagamento", icon: HandCoins },
  { href: "/admin/market", label: "Criar oferta Market", icon: Coins },
  { href: "/admin/sponsors", label: "Ativacao sponsor", icon: ShieldCheck },
  { href: "/admin/events", label: "Criar UR Event", icon: CalendarDays },
  { href: "/admin/reports", label: "Abrir relatorios", icon: ListChecks },
  { href: "/ops/ur-play", label: "Court Ops", icon: Trophy },
];

export default async function AdminPage() {
  await requireAnyRole(["admin", "operator"]);
  const command = await getAdminCommandCenter(await createClient());

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Ultimate Rivals · Race Control"
        title="Central de Controle"
        description="Controle operacional da Temporada 1: movimente o ecossistema, valide o impacto e abra o Prévia do Atleta sem trocar de sessão."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="UR Play hoje"
          value={String(command.today.sessions)}
          hint="Sessoes entre 00:00 e 23:59"
          icon={CalendarDays}
        />
        <StatCard
          label="Treinos hoje"
          value={String(command.today.training)}
          hint="Training calendar"
          icon={ListChecks}
        />
        <StatCard
          label="Partidas abertas"
          value={String(command.today.matches)}
          hint="Fila, chamada, em jogo ou revisao"
          icon={Trophy}
        />
        <StatCard
          label="Staff alocado"
          value={String(command.today.staff)}
          hint="Escalas operacionais"
          icon={ShieldCheck}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-ur-gold" aria-hidden="true" />
            <h2 className="font-display text-xl font-black uppercase">
              Pendencias
            </h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <PendingItem label="Pagamentos" value={command.pending.payments} />
            <PendingItem
              label="Deliveries sponsor"
              value={command.pending.sponsorDeliveries}
            />
            <PendingItem
              label="Market redemptions"
              value={command.pending.marketRedemptions}
            />
            <PendingItem
              label="Obrigacoes financeiras"
              value={command.pending.financeObligations}
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-ur-gold" aria-hidden="true" />
            <h2 className="font-display text-xl font-black uppercase">
              Temporada
            </h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <PendingItem
              label="Atletas ativos"
              value={command.season.activeAthletes}
            />
            <PendingItem
              label="Reports temporada"
              value={command.season.reports}
            />
            <PendingItem
              label="Reports equipes"
              value={command.season.teamReports}
            />
            <PendingItem
              label="Reports quadras/sponsors"
              value={
                command.season.venueReports + command.season.sponsorReports
              }
            />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-center gap-3">
            <CalendarDays className="text-ur-gold" aria-hidden="true" />
            <h2 className="font-display text-xl font-black uppercase">
              Demanda
            </h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <PendingItem label="Forming hoje" value={command.demand.forming} />
            <PendingItem
              label="Almost full hoje"
              value={command.demand.almostFull}
            />
            <PendingItem
              label="Confirmadas hoje"
              value={command.demand.confirmed}
            />
            <PendingItem
              label="Second court 7d"
              value={command.demand.secondCourt}
            />
            <PendingItem label="Waitlist 7d" value={command.demand.waitlist} />
            <PendingItem label="Demand 7d" value={command.demand.week.length} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <TrendingUp className="text-ur-gold" aria-hidden="true" />
            <h2 className="font-display text-xl font-black uppercase">
              Growth
            </h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <PendingItem label="Visitors" value={command.growth.visitors} />
            <PendingItem label="Signups" value={command.growth.signups} />
            <PendingItem
              label="First participation"
              value={command.growth.firstParticipation}
            />
            <PendingItem
              label="Second participation"
              value={command.growth.secondParticipation}
            />
            <PendingItem label="Returning" value={command.growth.returning} />
            <div className="rounded-ur border p-4">
              <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                Top source
              </p>
              <strong className="font-display mt-2 block text-3xl">
                {command.growth.topSource}
              </strong>
            </div>
          </div>
        </Card>
      </section>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">
          Quick actions
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="rounded-ur hover:border-ur-gold/40 flex min-h-12 items-center gap-3 border p-4 font-black text-zinc-200 transition-colors hover:text-white"
            >
              <Icon size={18} className="text-ur-gold" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PendingItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-ur border p-4">
      <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
        {label}
      </p>
      <strong className="font-display mt-2 block text-3xl">{value}</strong>
    </div>
  );
}
