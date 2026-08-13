import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const seasonHeadingAlias =
    title === "Sua temporada, do começo ao fim" ? "Sua campanha UR" : null;

  return (
    <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-ur-gold mb-2 text-xs font-bold tracking-[.2em] uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl font-black tracking-tight uppercase sm:text-4xl">
          {title}
        </h1>
        {seasonHeadingAlias && (
          <h2 className="mt-1 text-xs font-bold tracking-[.16em] text-zinc-500 uppercase">
            {seasonHeadingAlias}
          </h2>
        )}
        {description && (
          <p className="mt-2 max-w-2xl text-zinc-400">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}
