import type { ReactNode } from "react";
import { EmptyState, PageHeader } from "@/components/ui";

export function EntitySection({
  title,
  description,
  form,
  children,
  empty,
}: {
  title: string;
  description: string;
  form: ReactNode;
  children: ReactNode;
  empty: boolean;
}) {
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Domínio central"
        title={title}
        description={description}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section>
          {empty ? (
            <EmptyState
              title="Nenhum registro"
              description="Crie o primeiro registro usando o formulário."
            />
          ) : (
            children
          )}
        </section>
        <aside>
          <h2 className="font-display mb-3 text-xl font-black uppercase">
            Novo registro
          </h2>
          {form}
        </aside>
      </div>
    </div>
  );
}
