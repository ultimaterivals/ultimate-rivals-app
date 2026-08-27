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
        className="rounded-ur relative grid size-14 shrink-0 place-items-center overflow-hidden bg-black p-1"
        aria-hidden="true"
      >
        <Image
          src="/brand/ur-logo-official.png"
          alt=""
          width={56}
          height={56}
          className="h-full w-full object-contain"
          loading="eager"
          unoptimized
        />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span
            className={cn(
              "font-display block truncate text-lg leading-none font-black tracking-wider uppercase",
            )}
          >
            Ultimate Rivals
          </span>
          {context ? (
            <span className="text-ur-gold mt-1 block truncate text-[.58rem] font-black tracking-[.2em] uppercase">
              {context}
            </span>
          ) : null}
        </span>
      )}
    </div>
  );
}
