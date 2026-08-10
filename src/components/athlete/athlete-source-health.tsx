import { DatabaseZap } from "lucide-react";
import { Card } from "@/components/ui";

export function AthleteSourceHealth({ errors }: { errors: readonly string[] }) {
  if (errors.length === 0) return null;
  return (
    <Card>
      <div className="flex items-start gap-3">
        <DatabaseZap
          className="text-ur-gold mt-0.5"
          size={18}
          aria-hidden="true"
        />
        <div>
          <p className="font-bold">
            Algumas informações ainda não puderam ser carregadas
          </p>
          <ul className="mt-2 grid gap-1 text-sm text-zinc-500">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
