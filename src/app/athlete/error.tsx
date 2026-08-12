"use client";

import { useEffect } from "react";
import { Button, Card, PageHeader } from "@/components/ui";

export default function AthleteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <PageHeader
        eyebrow="App do Atleta"
        title="Não foi possível carregar sua jornada"
        description="Nenhum dado esportivo foi alterado. Tente carregar novamente."
      />
      <Card className="border-red-500/30">
        <Button type="button" onClick={reset}>
          Tentar novamente
        </Button>
      </Card>
    </div>
  );
}
