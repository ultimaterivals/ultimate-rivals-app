import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, label, error, ...props }, ref) => (
    <label className="grid gap-2 text-sm font-medium" htmlFor={id}>
      {label && <span>{label}</span>}
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "rounded-ur bg-ur-black focus:border-ur-gold min-h-11 border px-3 text-white placeholder:text-zinc-500 hover:border-zinc-500",
          className,
        )}
        {...props}
      />
      {error && (
        <span id={`${id}-error`} className="text-sm text-red-400">
          {error}
        </span>
      )}
    </label>
  ),
);
Input.displayName = "Input";
