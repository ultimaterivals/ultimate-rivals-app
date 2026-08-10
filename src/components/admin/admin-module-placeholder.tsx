import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";

export function AdminModulePlaceholder({
  title,
  description,
  nextItems,
}: {
  title: string;
  description: string;
  nextItems: readonly string[];
}) {
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="UR Operating System"
        title={title}
        description={description}
        action={<Badge>Fundação C0</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <Card>
          <p className="text-xs font-bold tracking-[0.16em] text-zinc-500 uppercase">
            Estado do módulo
          </p>
          <div className="mt-4 flex items-start gap-3">
            <CheckCircle2 className="text-ur-gold mt-0.5" size={20} aria-hidden="true" />
            <div>
              <p className="font-bold">Fundação preparada</p>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Rota, acesso e navegação estão prontos. Dados operacionais reais serão
                conectados nas próximas sprints, sem preencher a interface com números fictícios.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-xs font-bold tracking-[0.16em] text-zinc-500 uppercase">
            Próxima implementação
          </p>
          <ul className="mt-4 grid gap-3 text-sm text-zinc-300">
            {nextItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <ArrowRight className="text-ur-gold mt-0.5 shrink-0" size={16} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
