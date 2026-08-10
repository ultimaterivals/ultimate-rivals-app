import { Card } from "@/components/ui";

export function CommandStatusCard({
  label,
  value = "—",
  hint,
}: {
  label: string;
  value?: string;
  hint: string;
}) {
  return (
    <Card className="min-h-32">
      <p className="text-xs font-bold tracking-[0.16em] text-zinc-500 uppercase">
        {label}
      </p>
      <p className="font-display mt-3 text-3xl font-black tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-sm text-zinc-500">{hint}</p>
    </Card>
  );
}
