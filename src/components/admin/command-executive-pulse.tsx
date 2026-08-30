import {
  ArrowUpRight,
  CircleAlert,
  ListChecks,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import type { AdminExecutiveSnapshot } from "@/features/admin-executive/types";

export function CommandExecutivePulse({
  snapshot,
}: {
  snapshot: AdminExecutiveSnapshot;
}) {
  return (
    <Card
      className={
        snapshot.metrics.criticalUncovered > 0
          ? "border-red-400/40"
          : "border-ur-gold/30"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-xl font-black uppercase">
            Pulso executivo
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Cobertura de funções e execução dos focos prioritários do comando
            único.
          </p>
        </div>
        <Link
          href="/admin/gestao"
          className="text-ur-gold inline-flex items-center gap-2 text-sm font-bold"
        >
          Abrir gestão <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-ur bg-white/[0.03] p-4">
          <UsersRound className="text-ur-gold" size={18} aria-hidden="true" />
          <p className="font-display mt-3 text-2xl font-black">
            {snapshot.metrics.coveredFunctions}/{snapshot.metrics.functions}
          </p>
          <p className="text-xs text-zinc-500 uppercase">Funções cobertas</p>
        </div>
        <div className="rounded-ur bg-white/[0.03] p-4">
          <ListChecks className="text-ur-gold" size={18} aria-hidden="true" />
          <p className="font-display mt-3 text-2xl font-black">
            {snapshot.metrics.activeFocus}/3
          </p>
          <p className="text-xs text-zinc-500 uppercase">Focos em execução</p>
        </div>
        <div className="rounded-ur bg-white/[0.03] p-4">
          <CircleAlert className="text-ur-gold" size={18} aria-hidden="true" />
          <p className="font-display mt-3 text-2xl font-black">
            {snapshot.metrics.blocked + snapshot.metrics.overdue}
          </p>
          <p className="text-xs text-zinc-500 uppercase">Bloqueios + atrasos</p>
        </div>
      </div>
      {snapshot.metrics.criticalUncovered > 0 && (
        <div className="mt-4">
          <Badge>
            {snapshot.metrics.criticalUncovered} função(ões) crítica(s)
            descoberta(s)
          </Badge>
        </div>
      )}
    </Card>
  );
}
