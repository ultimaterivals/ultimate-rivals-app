import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, id, label, children, ...props }, ref) => (
    <label className="grid gap-2 text-sm font-medium" htmlFor={id}>
      {label && <span>{label}</span>}
      <select
        ref={ref}
        id={id}
        className={cn(
          "rounded-ur bg-ur-black min-h-11 cursor-pointer border px-3 text-white",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  ),
);
Select.displayName = "Select";
