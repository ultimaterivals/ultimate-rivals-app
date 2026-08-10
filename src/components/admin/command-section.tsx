import type { ReactNode } from "react";

function toSectionId(title: string) {
  return `command-section-${title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

export function CommandSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const sectionId = toSectionId(title);

  return (
    <section className="grid gap-4" aria-labelledby={sectionId}>
      <div>
        <h2
          id={sectionId}
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
