import type { LucideIcon } from "lucide-react";
import { Card } from "./card";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            {label}
          </p>
          <p className="font-display mt-2 text-3xl font-black">{value}</p>
          {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
        </div>
        {Icon && <Icon className="text-ur-gold" aria-hidden="true" />}
      </div>
    </Card>
  );
}
