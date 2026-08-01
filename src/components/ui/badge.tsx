import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "border-ur-gold/40 bg-ur-gold/10 text-ur-gold inline-flex rounded-full border px-2.5 py-1 text-xs font-bold tracking-wider uppercase",
        className,
      )}
      {...props}
    />
  );
}
