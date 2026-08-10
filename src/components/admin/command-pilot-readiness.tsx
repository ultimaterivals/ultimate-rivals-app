import Link from "next/link";
import { CheckCircle2, CircleAlert, LockKeyhole, Rocket } from "lucide-react";
import type {
  AdminPilotReadinessSnapshot,
  PilotReadinessGate,
} from "@/features/admin-pilot-readiness/types";
import { Badge, Card } from "@/components/ui";

function gateClass(gate: PilotReadinessGate) {
  if (gate.state === "ready")
    return "border-emerald-500/25 bg-emerald-500/5";
  if (gate.state === "attention")
    return "border-amber-500/25 bg-amber-500/5";
  return "border-red-500/25 bg-red-500/5";
}

export function CommandPilotReadiness({
  snapshot,
}: {
  snapshot: AdminPilotReadinessSnapshot;
}) {
  return (
    <Card
      className={
        snapshot.status === "go"
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-ur-gold/25"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {snapshot.status === "go" ? (
              <Rocket className="text-emerald-300" size={20} aria-hidden="true" />
            ) : (
              <LockKeyhole className="text-ur-gold" size={20} aria-hidden="true" />
            )}
            <p className="font-display text-2xl font-black uppercase">
              Gate do primeiro UR Play real
            </p>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Este gate não mede intenção. Ele só libera GO quando atletas,
            infraestrutura, sessão, motor esportivo e fontes críticas estão realmente
            prontos para uma execução de ponta a ponta.
          </p>
        </div>
        <div className="text-right">
          <Badge>{snapshot.status === "go" ? "GO" : "NO-GO"}</Badge>
          <p className="font-display mt-2 text-3xl font-black">
            {snapshot.readyGates}/{snapshot.totalGates}
          </p>
          <p className="text-[10px] font-bold text-zinc-600 uppercase">gates prontos</p>
        </div>
      </div>

      {snapshot.currentWave && (
        <div className="mt-5 rounded-ur border px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase">Onda em foco</p>
              <p className="mt-1 font-bold text-white">{snapshot.currentWave.name}</p>
            </div>
            <p className="text-xs text-zinc-500">
              {snapshot.currentWave.selectedCount}/{snapshot.currentWave.targetSize} selecionados · {snapshot.currentWave.readyCount} prontos
            </p>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {snapshot.gates.map((gate) => (
          <Link key={gate.key} href={gate.href} className="group block">
            <div className={`rounded-ur h-full border p-4 transition group-hover:-translate-y-0.5 ${gateClass(gate)}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black text-white uppercase">{gate.label}</p>
                {gate.state === "ready" ? (
                  <CheckCircle2 className="text-emerald-300" size={16} aria-hidden="true" />
                ) : (
                  <CircleAlert
                    className={gate.state === "attention" ? "text-amber-300" : "text-red-300"}
                    size={16}
                    aria-hidden="true"
                  />
                )}
              </div>
              <p className="mt-3 text-xs leading-5 text-zinc-400">{gate.detail}</p>
              <p className="text-ur-gold mt-3 text-[10px] font-black uppercase">
                {gate.actionLabel} →
              </p>
            </div>
          </Link>
        ))}
      </div>

      {snapshot.nextAction && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div>
            <p className="text-[10px] font-bold text-zinc-600 uppercase">Próxima ação</p>
            <p className="mt-1 text-sm font-bold text-white">{snapshot.nextAction.label}</p>
          </div>
          <Link
            href={snapshot.nextAction.href}
            className="bg-ur-gold rounded-ur px-4 py-2 text-xs font-black text-black uppercase"
          >
            {snapshot.nextAction.actionLabel}
          </Link>
        </div>
      )}
    </Card>
  );
}
