import { CircleAlert } from "lucide-react";
import { Card } from "@/components/ui";

export function AthleteSourceHealth({ errors }: { errors: readonly string[] }) {
  if (errors.length === 0) return null;
  return (
    <Card>
      <div className="flex items-start gap-3">
        <CircleAlert
          className="text-ur-gold mt-0.5"
          size={18}
          aria-hidden="true"
        />
        <div>
          <p className="font-bold">
            Algumas informações ainda não puderam ser carregadas
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Atualize a página em alguns instantes. Se o problema continuar,
            envie uma mensagem em Feedback e suporte.
          </p>
        </div>
      </div>
    </Card>
  );
}
