"use client";

import { AlertTriangle } from "lucide-react";

export default function AthleteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center">
      <AlertTriangle className="text-ur-gold" size={36} />
      <h1 className="font-display mt-5 text-3xl font-black uppercase">
        Sua experiÃªncia nÃ£o carregou
      </h1>
      <p className="mt-2 text-zinc-400">
        NÃ£o foi possÃ­vel buscar seus dados agora. Sua conta e seus resultados
        continuam seguros.
      </p>
      <button
        onClick={reset}
        className="bg-ur-gold text-ur-black mt-6 min-h-11 cursor-pointer rounded-lg px-5 font-black"
      >
        TENTAR NOVAMENTE
      </button>
    </div>
  );
}
