import { ArrowDown, ArrowUp, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function RankingMovement({
  movement,
  change,
  compact = false,
}: {
  movement: string;
  change: number | null;
  compact?: boolean;
}) {
  const config = {
    up: {
      Icon: ArrowUp,
      label: `${Math.abs(change ?? 0)} posições`,
      className: "text-emerald-400",
    },
    down: {
      Icon: ArrowDown,
      label: `${Math.abs(change ?? 0)} posições`,
      className: "text-red-400",
    },
    stable: { Icon: Minus, label: "Estável", className: "text-zinc-400" },
    new: { Icon: Sparkles, label: "NOVO", className: "text-ur-gold" },
  }[movement] ?? { Icon: Minus, label: "Estável", className: "text-zinc-400" };
  return (
    <span
      aria-label={`Movimento: ${config.label}`}
      className={cn(
        "inline-flex items-center gap-1 font-bold",
        config.className,
        compact && "text-xs",
      )}
    >
      <config.Icon size={compact ? 14 : 18} aria-hidden="true" />
      {config.label}
    </span>
  );
}
