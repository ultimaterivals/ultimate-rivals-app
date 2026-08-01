import { cn } from "@/lib/utils";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Ultimate Rivals">
      <span
        className="border-ur-gold font-display text-ur-gold grid size-10 place-items-center border-2 text-lg font-black"
        aria-hidden="true"
      >
        UR
      </span>
      {!compact && (
        <span
          className={cn(
            "font-display text-lg font-black tracking-wider uppercase",
          )}
        >
          Ultimate Rivals
        </span>
      )}
    </div>
  );
}
