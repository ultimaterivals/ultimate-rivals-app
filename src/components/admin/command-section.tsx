import type { ReactNode } from "react";

export function CommandSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4" aria-labelledby={`section-${title}`}>
      <div>
        <h2
          id={`section-${title}`}
          className="font-display text-xl font-black tracking-tight uppercase"
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
