import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({
  compact = false,
  context,
}: {
  compact?: boolean;
  context?: string;
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-3"
      aria-label="Ultimate Rivals"
    >
      <span
        className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1.5 ring-1 ring-white/10"
        aria-hidden="true"
      >
        <Image
          src="/brand/ur-logo-official.png"
          alt=""
          width={96}
          height={96}
          className="h-full w-full object-contain"
          priority
        />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span
            className={cn(
              "font-display block truncate text-sm leading-none font-black tracking-[.045em] uppercase sm:text-base",
            )}
          >
            Ultimate Rivals
          </span>
          {context ? (
            <span className="text-ur-gold mt-1 block truncate text-[.58rem] font-black tracking-[.18em] uppercase">
              {context}
            </span>
          ) : null}
        </span>
      )}
    </div>
  );
}
