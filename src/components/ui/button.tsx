import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
};
export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        "rounded-ur inline-flex cursor-pointer items-center justify-center text-sm font-bold tracking-wider uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" && "min-h-11 px-5",
        size === "sm" && "min-h-9 px-3 text-xs",
        variant === "primary" &&
          "bg-ur-gold text-ur-black hover:bg-ur-gold-strong",
        variant === "secondary" &&
          "border-ur-line bg-ur-panel hover:border-ur-gold border text-white",
        variant === "ghost" && "text-white hover:bg-white/10",
        className,
      )}
      {...props}
    />
  );
}
