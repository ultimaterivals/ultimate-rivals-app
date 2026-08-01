import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-ur bg-ur-graphite border p-5 shadow-[0_16px_40px_rgba(0,0,0,.25)]",
        className,
      )}
      {...props}
    />
  );
}
