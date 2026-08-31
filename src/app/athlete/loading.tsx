import { Card } from "@/components/ui";

export default function AthleteLoading() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6" aria-busy="true">
      <div className="athlete-stage min-h-56 animate-pulse" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="min-h-48 animate-pulse" />
        <Card className="min-h-48 animate-pulse" />
      </div>
      <p className="sr-only">Carregando sua jornada no Ultimate Rivals.</p>
    </div>
  );
}
