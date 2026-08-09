import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Ultimate Rivals">
      <span className="relative block h-10 w-16 shrink-0" aria-hidden="true">
        <Image
          src="/brand/ultimate-rivals-logo-official.svg"
          alt=""
          fill
          priority
          sizes="64px"
          className="object-contain"
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
