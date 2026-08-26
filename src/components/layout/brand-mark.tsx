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
        className="ur-brand-panel rounded-ur relative grid size-11 shrink-0 place-items-center overflow-hidden border border-white/15 bg-white p-1.5"
        aria-hidden="true"
      >
        <span className="bg-ur-gold absolute inset-x-0 bottom-0 h-1" />
        <Image
          src="/brand/ur-logo-official.png"
          alt=""
          width={44}
          height={44}
          className="h-full w-full object-contain"
          loading="eager"
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
