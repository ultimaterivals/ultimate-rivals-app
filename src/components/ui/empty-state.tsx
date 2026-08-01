import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-ur bg-ur-graphite/50 border border-dashed px-6 py-12 text-center">
      <h3 className="font-display text-xl font-black uppercase">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
