import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Ultimate Rivals">
      <span
        className="rounded-ur grid size-11 shrink-0 place-items-center bg-white p-1.5 shadow-sm"
        aria-hidden="true"
      >
        <Image
          src="/brand/ur-logo-official.png"
          alt=""
          width={44}
          height={44}
          className="h-full w-full object-contain"
          priority
        />
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
